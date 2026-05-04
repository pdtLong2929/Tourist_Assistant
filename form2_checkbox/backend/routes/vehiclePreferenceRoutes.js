const express = require("express");
const router = express.Router();
const { saveVehiclePreferences } = require("../controllers/vehiclePreferenceController");

router.post("/vehiclePreferences", saveVehiclePreferences);

module.exports = router;