// config/db.js
const { Pool } = require("pg");


// Tạo kết nối database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432", 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Khởi tạo/ tạo bảng mới nếu chưa có
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        vehicle_id VARCHAR(50) NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        momo_order_id VARCHAR(100) UNIQUE NOT NULL,     
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_momo_order_id ON bookings(momo_order_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);`);

    console.log("✅ Database ready - Table bookings have been created/updated.");
  } catch (err) {
    console.error("❌ DB initialization error:", err);
    process.exit(1);   
  }
};

module.exports = { pool, initDB };