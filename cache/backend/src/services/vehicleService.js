import { withCache } from "../cache/cacheWrapper.js";
import { vehicleKey } from "../utils/keyBuilder.js";

export async function recommendVehicle({
  distance,
  weather,
  location,
}) {
  return await withCache({
    key: vehicleKey({
      distance,
      weather,
      location,
    }),

    ttl: 600,

    fetcher: async () => {
      let vehicle = "xe máy";

      if (weather === "rain") {
        vehicle = "grab";
      }

      if (distance > 15) {
        vehicle = "ô tô";
      }

      return {
        distance,
        weather,
        location,
        vehicle,
        createdAt: new Date(),
      };
    },
  });
}