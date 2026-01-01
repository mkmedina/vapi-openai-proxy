import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

// Clé OpenAI lue dans les variables d’environnement (Render)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Endpoint compatible "chat/completions" OpenAI
app.post("/chat/completions", async (req, res) => {
  try {
    const { model, messages, max_tokens, temperature, top_p } = req.body;

    const response = await client.chat.completions.create({
      model: model || "gpt-4.1-mini",
      messages,
      max_tokens,
      temperature,
      top_p,
    });

    // On renvoie la même structure qu’OpenAI
    res.json(response);
  } catch (error) {
    console.error("Proxy error:", error.response?.data || error.message);
    res.status(500).json({
      error: {
        message: "Error calling OpenAI from proxy",
        details: error.response?.data || error.message,
      },
    });
  }
});

app.get("/", (_req, res) => {
  res.send("Vapi → OpenAI proxy OK");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
