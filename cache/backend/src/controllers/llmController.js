import { askLLM } from "../services/llmService.js";

export async function askAI(req, res) {
  try {
    const {
      prompt,
      model = "ollama",
    } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({
        error: "prompt là bắt buộc",
      });
    }

    const result = await askLLM({
      prompt: prompt.trim(),
      model,
    });

    return res.json(result);
  } catch (err) {
    console.error("[LLM Controller]", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
}