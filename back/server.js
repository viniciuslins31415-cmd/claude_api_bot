import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") })

dotenv.config();

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

// ── Endpoint padrão (sem streaming) ──────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, model = "claude-sonnet-4-20250514", system } = req.body;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: system || "Você é um assistente prestativo.",
      messages,
    });

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Endpoint com streaming (Server-Sent Events) ───────────────────────────────
app.post("/api/chat/stream", async (req, res) => {
  const { messages, model = "claude-sonnet-4-20250514", system } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await client.messages.stream({
      model,
      max_tokens: 4096,
      system: system || "Você é um assistente prestativo.",
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ delta: { text: event.delta.text } })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend rodando em http://localhost:${PORT}`));