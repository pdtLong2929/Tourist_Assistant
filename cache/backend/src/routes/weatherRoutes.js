import express from "express";
import { getWeatherInfo } from "../controllers/weatherController.js";

const router = express.Router();

/**
 * GET /api/weather?location=hcm
 */
router.get("/weather", getWeatherInfo);

export default router;