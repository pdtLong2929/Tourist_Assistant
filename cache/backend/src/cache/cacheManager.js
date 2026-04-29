import { getRedis, setRedis } from "./redisCache.js";
import { getMemory, setMemory } from "./memoryCache.js";

export async function getCache(key) {
  try {
    const redisData = await getRedis(key);

    if (redisData) {
      return redisData;
    }
  } catch (err) {
    console.log("⚠ Redis fail → fallback memory");
  }

  return getMemory(key);
}

export async function setCache(key, value, ttl = 60) {
  try {
    await setRedis(key, value, ttl);
  } catch (err) {
    console.log("⚠ Redis fail → save memory");
    setMemory(key, value, ttl * 1000);
  }
}