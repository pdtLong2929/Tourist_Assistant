import { recommendVehicle } from "../services/vehicleService.js";

export async function getVehicleSuggestion(req, res) {
  const {
    distance = 5,
    weather = "sunny",
    location = "hcm",
  } = req.query;

  const result = await recommendVehicle({
    distance: Number(distance),
    weather,
    location,
  });

  res.json(result);
}