// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { initDB } = require("./config/db");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", paymentRoutes);

initDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server runs at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ Server failed to start due to DB error");
  process.exit(1);
});