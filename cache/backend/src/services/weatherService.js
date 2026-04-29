import { withCache } from "../cache/cacheWrapper.js";
import { weatherKey } from "../utils/keyBuilder.js";

export async function getWeather(location) {
  return await withCache({
    key: weatherKey(location),
    ttl: 1800,

    fetcher: async () => {
      return {
        location,
        weather: "rain",
        temp: 28,
      };
    },
  });
}