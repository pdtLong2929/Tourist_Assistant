const pool = require("../config/db");
const { mapPreferences } = require("../services/mappingService");

async function savePreferences(req, res) {
  try {
    const { user_id, preferences } = req.body;

    const mapped = mapPreferences(preferences);
    
    const payload = { preferred_destination_tags: mapped };

    await pool.query(
      `INSERT INTO user_preferences (user_id, raw_preferences, mapped_vector)
       VALUES ($1, $2, $3)`,
      [user_id, JSON.stringify(preferences), JSON.stringify(payload)]
    );

    res.json({ success: true, mapped_vector: payload });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { savePreferences };
