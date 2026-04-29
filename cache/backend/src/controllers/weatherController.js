import { getWeather } from "../services/weatherService.js";

export async function getWeatherInfo(req, res) {
  try {
    const { location = "hcm" } = req.query;

    const result = await getWeather(location);

    return res.json(result);
  } catch (err) {
    console.error("[Weather Controller]", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
}