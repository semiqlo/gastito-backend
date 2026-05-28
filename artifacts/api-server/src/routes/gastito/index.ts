import { GoogleGenAI } from "@google/genai";
import { Router } from "express";
import multer from "multer";

const router = Router();

const SERVER_AI = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"] });

function getAI(req: import("express").Request): GoogleGenAI {
  const userKey = req.headers["x-gemini-key"];
  if (typeof userKey === "string" && userKey.trim()) {
    return new GoogleGenAI({ apiKey: userKey.trim() });
  }
  return SERVER_AI;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const SYSTEM_PROMPT = `Eres Gastito, un asistente financiero personal chileno. Hablas chileno coloquial directo y estructurado.

PERSONALIDAD:
- Tono: amigable + profesional, NO infantil, NO corporativo
- Sin emojis
- Sarcasmo leve ocasional para gastos innecesarios (ej: "AliExpress otra vez. Estás financiando China lentamente.")
- Respuestas concisas y estructuradas
- Nunca suenas ni chatbot ni ejecutivo bancario

CAPACIDADES:
- Detectar gastos e ingresos en lenguaje natural chileno
- Entender montos: "8 lucas" = 8000, "12 mil" = 12000, "medio palo" = 500000, "un palo" = 1000000, "50 mangos" = 50000
- Sugerir categorías automáticamente basado en comercio o descripción
- Rastrear deudas entre amigos
- Dar recomendaciones financieras concretas
- Responder preguntas sobre presupuesto y capacidad de gasto

CUANDO DETECTES UNA TRANSACCION, usa EXACTAMENTE este formato al inicio del mensaje:
[TRANSACTION]
amount: <numero entero sin puntos ni signo>
category: <categoria>
type: <expense o income>
description: <descripcion breve>
merchant: <nombre comercio, vacío si no aplica>
[/TRANSACTION]
Luego continúa con tu mensaje conversacional.

Categorías válidas: Comida, Transporte, Entretenimiento, Compras, Salud, Educacion, Servicios, Ingresos, Deudas, Otro

IMPORTANTES:
- Solo detecta transacciones cuando el usuario claramente reporta un gasto o ingreso
- Para preguntas responde conversacionalmente sin bloque [TRANSACTION]
- Mantén contexto financiero del usuario cuando te lo proporcionen
- Las recomendaciones deben ser concretas y basadas en los datos del usuario`;

type Role = "user" | "model";

async function streamChatResponse(
  req: import("express").Request,
  res: import("express").Response,
  userMessage: string,
  context?: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
) {
  const ai = getAI(req);
  const contents: Array<{ role: Role; parts: Array<{ text: string }> }> = [];

  if (context) {
    contents.push({ role: "user", parts: [{ text: `[Contexto: ${context}]` }] });
    contents.push({ role: "model", parts: [{ text: "Entendido, tengo el contexto financiero." }] });
  }

  if (history && Array.isArray(history)) {
    for (const h of history.slice(-12)) {
      if (h.role === "user" || h.role === "assistant") {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }
  }

  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 8192,
    },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
}

router.post("/chat", async (req, res): Promise<void> => {
  const { message, context, history } = req.body as {
    message: string;
    context?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    await streamChatResponse(req, res, message, context, history);
    res.end();
  } catch (err: unknown) {
    req.log.error({ err }, "Gastito chat error");
    res.write(`data: ${JSON.stringify({ error: "Error al procesar tu mensaje." })}\n\n`);
    res.end();
  }
});

router.post("/voice", upload.single("audio"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "audio file is required" });
    return;
  }

  const { context, history: historyRaw } = req.body as {
    context?: string;
    history?: string;
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const audioBase64 = file.buffer.toString("base64");
    const mimeType = file.mimetype || "audio/m4a";

    const transcriptionResponse = await getAI(req).models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            {
              text: "Transcribe este audio exactamente como fue hablado en español chileno. Devuelve solo el texto transcrito, sin explicaciones ni comentarios adicionales.",
            },
            {
              inlineData: { mimeType, data: audioBase64 },
            },
          ],
        },
      ],
    });

    const transcript = transcriptionResponse.text?.trim() ?? "";

    if (!transcript) {
      res.write(`data: ${JSON.stringify({ error: "No se pudo transcribir el audio." })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify({ transcript })}\n\n`);

    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (historyRaw) {
      try {
        history = JSON.parse(historyRaw);
      } catch {}
    }

    await streamChatResponse(req, res, transcript, context, history);
    res.end();
  } catch (err: unknown) {
    req.log.error({ err }, "Gastito voice error");
    res.write(`data: ${JSON.stringify({ error: "Error al procesar el audio." })}\n\n`);
    res.end();
  }
});

export default router;
