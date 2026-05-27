import { Router } from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

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
- Para preguntas ("¿cuánto puedo gastar?") responde conversacionalmente sin bloque [TRANSACTION]
- Mantén contexto financiero del usuario cuando te lo proporcionen
- Las recomendaciones deben ser concretas y basadas en los datos del usuario`;

async function streamChatResponse(
  res: import("express").Response,
  userMessage: string,
  context?: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (context) {
    messages.push({ role: "system", content: context });
  }

  if (history && Array.isArray(history)) {
    for (const h of history.slice(-12)) {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  messages.push({ role: "user", content: userMessage });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 512,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
    if (chunk.choices[0]?.finish_reason === "stop") {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  }
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
    await streamChatResponse(res, message, context, history);
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
    const ext = file.mimetype.includes("mp4") || file.mimetype.includes("m4a")
      ? "m4a"
      : file.mimetype.includes("webm")
      ? "webm"
      : file.mimetype.includes("ogg")
      ? "ogg"
      : "wav";

    const audioFile = await toFile(file.buffer, `audio.${ext}`, {
      type: file.mimetype,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe" as any,
      language: "es",
      response_format: "json",
    } as any);

    const transcript = (transcription as any).text as string;

    if (!transcript || !transcript.trim()) {
      res.write(`data: ${JSON.stringify({ error: "No se pudo transcribir el audio." })}\n\n`);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify({ transcript: transcript.trim() })}\n\n`);

    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (historyRaw) {
      try {
        history = JSON.parse(historyRaw);
      } catch {}
    }

    await streamChatResponse(res, transcript.trim(), context, history);
    res.end();
  } catch (err: unknown) {
    req.log.error({ err }, "Gastito voice error");
    res.write(`data: ${JSON.stringify({ error: "Error al procesar el audio." })}\n\n`);
    res.end();
  }
});

export default router;
