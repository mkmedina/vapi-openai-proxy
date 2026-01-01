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

// Middleware JSON
app.use(express.json());

// CORS simple pour tests depuis le navigateur (Hoppscotch)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Endpoint attendu par Vapi : OpenAI-compatible en STREAM
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const payload = req.body || {};

    if (!Array.isArray(payload.messages)) {
      return res.status(400).json({
        error: { message: "'messages' doit être un tableau." },
      });
    }

    // On force stream = true pour que la réponse soit un flux SSE
    const bodyForOpenAI = {
      ...payload,
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
      const err = await openaiResponse.text().catch(() => "");
      console.error("Erreur OpenAI:", openaiResponse.status, err);
      res.status(openaiResponse.status).send(err || "OpenAI error");
      return;
    }

    // On renvoie EXACTEMENT le flux SSE d’OpenAI vers Vapi
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    openaiResponse.body.on("data", (chunk) => {
      res.write(chunk);
    });

    openaiResponse.body.on("end", () => {
      res.end();
    });

    openaiResponse.body.on("error", (err) => {
      console.error("Erreur de stream OpenAI:", err);
      res.end();
    });
  } catch (error) {
    console.error("Erreur proxy:", error);
    res.status(500).json({ error: "Proxy error", detail: String(error) });
  }
});

// Route de test simple
app.get("/", (_req, res) => {
  res.send("Vapi OpenAI proxy is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
