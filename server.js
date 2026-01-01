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

app.use(express.json());

// Route appelée par Vapi : /v1/chat/completions
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const {
      model = "gpt-4.1-mini",
      messages,
      ...rest
    } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: { message: "'messages' doit être un tableau." }
      });
    }

    // On force stream à false pour simplifier
    const openaiBody = {
      model,
      messages,
      stream: false,
      ...rest
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur OpenAI:", data);
      return res.status(response.status).json({ error: data.error || data });
    }

    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? "";

    // Format que Vapi attend
    return res.json({
      messages: [
        {
          role: "assistant",
          content
        }
      ]
    });
  } catch (error) {
    console.error("Erreur proxy:", error);
    res.status(500).json({ error: "Proxy error", detail: String(error) });
  }
});

// Route simple pour vérifier que le service tourne
app.get("/", (_req, res) => {
  res.send("Vapi OpenAI proxy is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
