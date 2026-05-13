const { json } = require("express");
const pool = require("../config/db");

async function saveVehiclePreferences(req, res) {
  try {
    const { user_id, car, motorbike } = req.body;
    
    const payload1 = { "car": car };
    const payload2 = { "motorbike": motorbike }

    await pool.query(
      `INSERT INTO user_vehicle_preferences (user_id, car_preferences, motorbike_preferences, car_tags, motorbike_tags)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, JSON.stringify(car), JSON.stringify(motorbike), JSON.stringify(payload1), JSON.stringify(payload2)]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { saveVehiclePreferences };