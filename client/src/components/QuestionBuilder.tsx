import { useState } from "react";
import type { QuestionDraft } from "../types";

const EMPTY_QUESTION: QuestionDraft = {
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  timeLimitSec: 20,
};

interface Props {
  onCreate: (questions: QuestionDraft[]) => void;
  loading: boolean;
  error: string | null;
}

export function QuestionBuilder({ onCreate, loading, error }: Props) {
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...EMPTY_QUESTION }]);

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
