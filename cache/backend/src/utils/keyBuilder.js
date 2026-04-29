import crypto from "crypto";

function hash(text) {
  return crypto
    .createHash("md5")
    .update(String(text))
    .digest("hex");
}

export function vehicleKey({
  distance,
  weather,
  location,
}) {
  return `vehicle:${distance}:${weather}:${location}`;
}

export function weatherKey(location) {
  return `weather:${location}`;
}

export function llmKey({
  prompt,
  model = "default",
}) {
  return `llm:${model}:${hash(prompt)}`;
}