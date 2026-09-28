import { useState } from "react";
import type { QuestionDraft } from "../types";

const EMPTY_QUESTION: QuestionDraft = {
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  timeLimitSec: 20,
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

interface GeneratedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

interface Props {
  onCreate: (questions: QuestionDraft[]) => void;
  loading: boolean;
  error: string | null;
}

export function QuestionBuilder({ onCreate, loading, error }: Props) {
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...EMPTY_QUESTION }]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfCount, setPdfCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerateFromPdf() {
    if (!pdfFile) return;
    setGenerating(true);
    setGenError(null);
    try {
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("count", String(pdfCount));
      formData.append("timeLimitSec", "20");

      const res = await fetch(`${SERVER_URL}/api/generate-questions`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudieron generar preguntas.");
      }
      const generated: GeneratedQuestion[] = data.questions;
      setQuestions(generated.map((q) => ({ ...q })));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Error generando preguntas.");
    } finally {
      setGenerating(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      )
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION, options: ["", "", "", ""] }]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function isValid() {
    return questions.every(
      (q) => q.text.trim() && q.options.filter((o) => o.trim()).length >= 2
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = questions.map((q) => ({
      ...q,
      options: q.options.filter((o) => o.trim().length > 0),
    }));
    onCreate(cleaned);
  }

  return (
    <form className="question-builder" onSubmit={handleSubmit}>
      <h2>Crea tus preguntas</h2>

      <fieldset className="pdf-generator">
        <legend>Generar desde PDF (opcional)</legend>
        <p className="pdf-hint">
          Sube un PDF y la IA arma un borrador de preguntas basado en su contenido. Podrás revisar y
          editar todo antes de crear la sala.
        </p>
        <div className="pdf-controls">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          />
          <label className="pdf-count">
            N.º de preguntas
            <input
              type="number"
              min={1}
              max={20}
              value={pdfCount}
              onChange={(e) => setPdfCount(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={handleGenerateFromPdf}
            disabled={!pdfFile || generating}
          >
            {generating ? "Generando..." : "Generar preguntas"}
          </button>
        </div>
        {genError && <p className="error-text">{genError}</p>}
      </fieldset>

      {questions.map((q, qIndex) => (
        <fieldset key={qIndex} className="question-card">
          <legend>Pregunta {qIndex + 1}</legend>
          {questions.length > 1 && (
            <button type="button" className="link-btn remove" onClick={() => removeQuestion(qIndex)}>
              Eliminar
            </button>
          )}
          <input
            type="text"
            placeholder="Escribe la pregunta"
            value={q.text}
            onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
            required
          />
          <div className="options-grid">
            {q.options.map((opt, oIndex) => (
              <label key={oIndex} className={`option-input opt-${oIndex}`}>
                <input
                  type="radio"
                  name={`correct-${qIndex}`}
                  checked={q.correctIndex === oIndex}
                  onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                  title="Marcar como correcta"
                />
                <input
                  type="text"
                  placeholder={`Opción ${oIndex + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="time-limit">
            Tiempo (segundos):
            <input
              type="number"
              min={5}
              max={120}
              value={q.timeLimitSec}
              onChange={(e) => updateQuestion(qIndex, { timeLimitSec: Number(e.target.value) })}
            />
          </label>
        </fieldset>
      ))}

      <div className="builder-actions">
        <button type="button" className="secondary" onClick={addQuestion}>
          + Agregar pregunta
        </button>
        <button type="submit" className="primary" disabled={!isValid() || loading}>
          {loading ? "Creando sala..." : "Crear sala"}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
