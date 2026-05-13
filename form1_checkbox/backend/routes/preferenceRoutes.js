const express = require("express");
const router = express.Router();
const { savePreferences } = require("../controllers/preferenceController");

router.post("/preferences", savePreferences);

module.exports = router;