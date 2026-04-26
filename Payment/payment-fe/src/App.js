import React, { useState, useEffect } from "react";

function App() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultCode = params.get("resultCode");

    if (resultCode === "0") {
      setMessage("✅ Thanh toán thành công!");
    } else if (resultCode) {
      setMessage("❌ Thanh toán thất bại hoặc bị hủy.");
    }
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch("http://localhost:5000/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "10",
          vehicleId: "car_10",
          amount: 200000
        })
      });

      const data = await res.json();
      console.log("🔥 FE RESPONSE:", data);

      if (data.payUrl) {
        window.location.href = data.payUrl;
      } else {
        alert("Lỗi tạo link thanh toán");
      }
    } catch (err) {
      console.error(err);
      alert("Không thể kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 50, fontFamily: "Arial" }}>
      <h1>🚗 Đặt xe du lịch</h1>

      {message && <h2 style={{ color: message.includes("thành công") ? "green" : "red" }}>{message}</h2>}

      <button
        onClick={handlePayment}
        disabled={loading}
        style={{ padding: "15px 30px", fontSize: "18px" }}
      >
        {loading ? "Đang xử lý..." : "Thanh toán MoMo"}
      </button>

      <p style={{ marginTop: 20 }}>
      </p>
    </div>
  );
}

export default App;