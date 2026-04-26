// controllers/paymentController.js
const { pool } = require("../config/db");
const { createMomoPayment } = require("../services/momoService");


// API tạo thanh toán
exports.createPayment = async (req, res) => {
  try {
    const { userId, vehicleId, amount } = req.body;   // Lấy dữ liệu từ request

    // Xác nhận: Kiểm tra thiếu trường hoặc amount <= 0 => không hợp lệ
    if (!userId || !vehicleId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Missing information or invalid amount." });
    }

    // Tạo momoOrderId dựa vào thời gian hiện tại và số ngẫu nhiên -> không bị trùng
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const momoOrderId = `BOOK_${timestamp}_${random}`;

    // Lưu vào DB
    const insertResult = await pool.query(
      `INSERT INTO bookings (user_id, vehicle_id, amount, momo_order_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [userId, vehicleId, amount, momoOrderId]
    );

    const bookingId = insertResult.rows[0].id;

    // Tạo link thanh toán MoMo
    const payUrl = await createMomoPayment(amount, momoOrderId);

    console.log(`✅ Tạo payment thành công - momoOrderId: ${momoOrderId}`);

    res.json({ 
      success: true,
      payUrl, 
      bookingId,
      momoOrderId 
    });

  } catch (err) {
    console.error("❌ Create payment error:", err.message);
    res.status(500).json({ 
      success: false,
      error: "Error creating payment link. Please try again later." 
    });
  }
};

// API callback (IPN từ Momo)
exports.callback = async (req, res) => {
  try {
    console.log("📨 MoMo IPN received:", req.body);   

    const { orderId, resultCode, amount: momoAmount } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    const newStatus = (resultCode === 0) ? 'paid' : 'failed';

    const updateResult = await pool.query(
      `UPDATE bookings 
       SET status = $1, 
           updated_at = NOW() 
       WHERE momo_order_id = $2 
       RETURNING id, user_id, vehicle_id, amount, status`,
      [newStatus, orderId]
    );

    if (updateResult.rowCount === 0) {
      console.warn(`⚠️ The callback for orderId does not exist: ${orderId}`);
      return res.json({ message: "OK" }); 
    }

    const booking = updateResult.rows[0];

    // Kiểm tra amount khớp (an toàn hơn)
    if (parseInt(momoAmount) !== parseInt(booking.amount)) {
      console.warn(`⚠️ Amount does not match for the order. ${orderId}`);
    }

    console.log(`✅ Update booking ${booking.id} → ${newStatus}`);

    res.json({ message: "OK" });

  } catch (err) {
    console.error("❌ Callback error:", err);
    res.json({ message: "OK" }); 
  }
};

