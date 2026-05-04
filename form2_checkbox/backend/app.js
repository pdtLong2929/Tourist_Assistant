const express = require("express");
const cors    = require("cors");
const path    = require("path");
require("dotenv").config();

const vehiclePreferenceRoutes    = require("./routes/vehiclePreferenceRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// API routes
app.use("/api", vehiclePreferenceRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`✓ Server running on http://localhost:${process.env.PORT || 3000}`);
});
