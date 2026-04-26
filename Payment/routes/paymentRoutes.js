// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();

const { createPayment, callback } = require("../controllers/paymentController");  

router.post("/payment", createPayment);
router.post("/payment/callback", callback);

module.exports = router;