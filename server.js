// server.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY manquante dans les variables d'environnement.");
  process.exit(1);
}

app.use(express.json({ limit: "2mb" }));

// CORS (utile pour tests navigateur type Hoppscotch)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Healthcheck
app.get("/", (_req, res) => {
  res.send("Vapi OpenAI proxy is running.");
});

// Vapi -> OpenAI (stream SSE)
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const payload = req.body || {};

    if (!Array.isArray(payload.messages)) {
      return res.status(400).json({
        error: { message: "'messages' doit être un tableau." },
      });
    }

    // Champs autorisés par OpenAI chat/completions
    const ALLOWED = new Set([
      "model",
      "messages",
      "temperature",
      "top_p",
      "max_tokens",
      "presence_penalty",
      "frequency_penalty",
      "stop",
      "n",
      "user",
      "response_format",
      "tools",
      "tool_choice",
      "seed",
      "logprobs",
      "top_logprobs",
      "metadata",
    ]);

    // Petits mappings si Vapi envoie des variantes
    if (payload.maxTokens !== undefined && payload.max_tokens === undefined) {
      payload.max_tokens = payload.maxTokens;
    }

    // Nettoyage du body (on enlève assistant/call/timestamp/etc.)
    const cleaned = {};
    for (const [k, v] of Object.entries(payload)) {
      if (ALLOWED.has(k)) cleaned[k] = v;
    }

    // Fix metadata: OpenAI veut des strings
    if (cleaned.metadata && typeof cleaned.metadata === "object") {
      const fixed = {};
      for (const [k, v] of Object.entries(cleaned.metadata)) {
        fixed[k] = String(v);
      }
      cleaned.metadata = fixed;
    }

    // Forcer stream pour Vapi
    const bodyForOpenAI = {
      ...cleaned,
      model: cleaned.model || "gpt-4.1-mini",
      messages: cleaned.messages,
      stream: true,
    };

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(bodyForOpenAI),
      }
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text().catch(() => "");
      console.error("Erreur OpenAI:", openaiResponse.status, errText);
      return res.status(openaiResponse.status).send(errText || "OpenAI error");
    }

    // Passthrough SSE (OpenAI -> Vapi)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    openaiResponse.body.on("data", (chunk) => res.write(chunk));
    openaiResponse.body.on("end", () => res.end());
    openaiResponse.body.on("error", (err) => {
      console.error("Erreur stream OpenAI:", err);
      res.end();
    });
  } catch (error) {
    console.error("Erreur proxy:", error);
    res.status(500).json({ error: "Proxy error", detail: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
