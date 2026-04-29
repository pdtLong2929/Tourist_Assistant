import { getCache, setCache } from "./cacheManager.js";

export async function withCache({
  key,
  ttl = 60,
  fetcher,
}) {
  const cached = await getCache(key);

  if (cached) {
    console.log(`🚀 CACHE HIT → ${key}`);
    return {
      data: cached,
      cached: true,
    };
  }

  console.log(`🌐 CACHE MISS → ${key}`);

  const freshData = await fetcher();

  await setCache(key, freshData, ttl);

  return {
    data: freshData,
    cached: false,
  };
}