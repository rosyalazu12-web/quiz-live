import Anthropic from "@anthropic-ai/sdk";
import type { Question } from "./types.js";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_SOURCE_CHARS = 15000;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY en el servidor.");
  }
  return new Anthropic({ apiKey });
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  return JSON.parse(raw.trim());
}

export async function generateQuestionsFromText(
  sourceText: string,
  count: number,
  timeLimitSec: number
): Promise<Omit<Question, "id">[]> {
  const client = getClient();
  const trimmedSource = sourceText.slice(0, MAX_SOURCE_CHARS);

  const prompt = `Eres un asistente que crea preguntas de trivia de opción múltiple en español a partir de un texto.

Texto fuente:
"""
${trimmedSource}
"""

Genera exactamente ${count} preguntas de opción múltiple basadas ÚNICAMENTE en el contenido de ese texto.
Reglas:
- Cada pregunta debe tener exactamente 4 opciones, solo una correcta.
- Las opciones incorrectas deben ser plausibles, no absurdas.
- No repitas preguntas ni reformules la misma idea dos veces.
- Responde ÚNICAMENTE con un array JSON válido, sin texto adicional ni markdown, con esta forma exacta:
[{"text": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}]
- "correctIndex" es la posición (0 a 3) de la opción correcta dentro de "options".`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Respuesta inesperada del modelo.");
  }

  let parsed: unknown;
  try {
    parsed = extractJson(block.text);
  } catch {
    throw new Error("No se pudo interpretar la respuesta de la IA como JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("La IA no devolvió una lista de preguntas.");
  }

  const questions: Omit<Question, "id">[] = [];
  for (const item of parsed) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>).text !== "string" ||
      !Array.isArray((item as Record<string, unknown>).options) ||
      typeof (item as Record<string, unknown>).correctIndex !== "number"
    ) {
      continue;
    }
    const q = item as { text: string; options: unknown[]; correctIndex: number };
    const options = q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0);
    if (options.length < 2 || q.correctIndex < 0 || q.correctIndex >= options.length) continue;

    questions.push({ text: q.text, options, correctIndex: q.correctIndex, timeLimitSec });
  }

  if (questions.length === 0) {
    throw new Error("La IA no generó preguntas válidas a partir de ese PDF.");
  }

  return questions;
}
