import express from "express";
import { getVehicleSuggestion } from "../controllers/vehicleController.js";

const router = express.Router();

router.get("/vehicle", getVehicleSuggestion);

export default router;