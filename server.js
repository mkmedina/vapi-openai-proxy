import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.json({ ok: true }));

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const client = new OpenAI({ apiKey });

    const body = req.body || {};
    // Vapi va souvent envoyer un "model". On le laisse passer.
    const result = await client.chat.completions.create(body);

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e?.message || "Proxy error" });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Listening on ${port}`));
