import express from "express";
import { askAI } from "../controllers/llmController.js";

const router = express.Router();

/**
 * POST /api/llm
 * Body:
 * {
 *   "prompt": "Đi Đà Lạt nên đi xe gì?",
 *   "model": "ollama"
 * }
 */
router.post("/llm", askAI);

export default router;