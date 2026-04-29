import ollama from "ollama";
import { withCache } from "../cache/cacheWrapper.js";
import { llmKey } from "../utils/keyBuilder.js";

export async function askLLM({
  prompt,
  model = "llama3:latest", // model thật trong Ollama
}) {
  return await withCache({
    key: llmKey({
      prompt,
      model,
    }),

    ttl: 3600, // cache 1 tiếng

    fetcher: async () => {
      try {
        // gọi thật tới Ollama local API
        const response = await ollama.chat({
          model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        return {
          model,
          answer: response.message.content,
        };
      } catch (error) {
        console.error("Lỗi gọi Ollama:", error.message);

        return {
          model,
          answer: "Không thể lấy phản hồi từ AI",
          error: error.message,
        };
      }
    },
  });
}