import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 10000;

// Clé API OpenAI prise dans les variables d'env Render
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Route de test simple
app.get("/v1/test", (req, res) => {
  res.json({ ok: true, message: "Proxy OpenAI fonctionne" });
});

// Route compatible OpenAI chat.completions
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const {
      messages,
      model = "gpt-4.1-mini",
      temperature = 0.7,
      max_tokens = 512,
    } = req.body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: "Body invalide: 'messages' doit être un tableau.",
        },
      });
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
    });

    // On renvoie exactement le format OpenAI
    res.json(completion);
  } catch (err) {
    console.error("OpenAI error:", err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json({ error: err.response?.data || { message: err.message } });
  }
});

// Healthcheck Render
app.get("/", (req, res) => {
  res.send("vapi-openai-proxy running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
