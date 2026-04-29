import express from "express";
import { connectRedis } from "./config/redis.js";

// Test
import vehicleRoutes from "./routes/vehicleRoutes.js";
import weatherRoutes from "./routes/weatherRoutes.js";
import llmRoutes from "./routes/llmRoutes.js";

const app = express();

app.use(express.json());

app.use("/api", vehicleRoutes);
app.use("/api", weatherRoutes);
app.use("/api", llmRoutes);

await connectRedis();

export default app;