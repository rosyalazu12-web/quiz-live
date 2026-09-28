import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { LeaderboardEntry, PublicQuestion } from "../types";
import { Timer } from "./Timer";

type Stage = "join" | "lobby" | "question" | "waiting" | "reveal" | "ended";

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function PlayerFlow({ initialCode, onExit }: { initialCode: string; onExit: () => void }) {
  const [stage, setStage] = useState<Stage>("join");
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    function onQuestion(payload: PublicQuestion) {
      setQuestion(payload);
      setSelected(null);
      setCorrectIndex(null);
      setStage("question");
    }
    function onQuestionEnd(payload: { correctIndex: number; leaderboard: LeaderboardEntry[] }) {
      setCorrectIndex(payload.correctIndex);
      setLeaderboard(payload.leaderboard);
      setStage("reveal");
    }
    function onEnded(payload: { leaderboard: LeaderboardEntry[] }) {
      setLeaderboard(payload.leaderboard);
      setStage("ended");
    }
    function onClosed() {
      setError("El host cerró la sala.");
      setStage("join");
    }

    socket.on("game:question", onQuestion);
    socket.on("game:question-end", onQuestionEnd);
    socket.on("game:ended", onEnded);
    socket.on("room:closed", onClosed);

    return () => {
      socket.off("game:question", onQuestion);
      socket.off("game:question-end", onQuestionEnd);
      socket.off("game:ended", onEnded);
      socket.off("room:closed", onClosed);
    };
  }, []);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError(null);
    socket.emit("player:join", { code, name }, (res: { ok: boolean; error?: string }) => {
      setJoining(false);
      if (res.ok) {
        setStage("lobby");
      } else {
        setError(res.error ?? "No se pudo unir a la sala.");
      }
    });
  }

  function handleAnswer(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    socket.emit("player:answer", { code, optionIndex });
    setStage("waiting");
  }

  const myScore = leaderboard.find((e) => e.name === name)?.score;
  const myRank = leaderboard.findIndex((e) => e.name === name) + 1;

  return (
    <div className="player-flow">
      {stage === "join" && (
        <form className="join-form" onSubmit={handleJoin}>
          <h2>Unirme a una sala</h2>
          <label>
            Código de sala
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              required
            />
          </label>
          <label>
            Tu nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Cómo te van a ver en el ranking"
              required
            />
          </label>
          <button type="submit" className="primary" disabled={joining}>
            {joining ? "Uniendo..." : "Unirme"}
          </button>
          {error && <p className="error-text">{error}</p>}
          <button type="button" className="link-btn" onClick={onExit}>
            Volver
          </button>
        </form>
      )}

      {stage === "lobby" && (
        <div className="lobby-view">
          <h2>¡Estás dentro, {name}!</h2>
          <p>Esperando a que el host inicie el juego...</p>
        </div>
      )}

      {stage === "question" && question && (
        <div className="player-question-view">
          <Timer startedAt={question.startedAt} timeLimitSec={question.timeLimitSec} />
          <h2>{question.text}</h2>
          <div className="options-grid answer-grid">
            {question.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                className={`option-tile opt-${i} answer-btn`}
                onClick={() => handleAnswer(i)}
              >
                <span className="option-letter">{OPTION_LETTERS[i]}</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === "waiting" && (
        <div className="waiting-view">
          <h2>Respuesta enviada</h2>
          <p>Esperando a los demás jugadores...</p>
        </div>
      )}

      {stage === "reveal" && question && (
        <div className="reveal-view">
          <h2>{selected === correctIndex ? "¡Correcto! 🎉" : "Incorrecto"}</h2>
          <div className="options-grid readonly">
            {question.options.map((opt, i) => (
              <div
                key={i}
                className={`option-tile opt-${i} ${
                  i === correctIndex ? "correct" : i === selected ? "wrong" : "dim"
                }`}
              >
                <span className="option-letter">{OPTION_LETTERS[i]}</span>
                {opt}
              </div>
            ))}
          </div>
          {myScore !== undefined && (
            <p className="my-score">
              Tu puntaje: <strong>{myScore}</strong> {myRank > 0 && `· Puesto #${myRank}`}
            </p>
          )}
        </div>
      )}

      {stage === "ended" && (
        <div className="ended-view">
          <h2>¡Juego terminado!</h2>
          <ol className="leaderboard final">
            {leaderboard.map((entry, i) => (
              <li
                key={entry.name}
                className={`${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""} ${
                  entry.name === name ? "me" : ""
                }`}
              >
                <span>
                  #{i + 1} {entry.name}
                </span>
                <strong>{entry.score}</strong>
              </li>
            ))}
          </ol>
          <button type="button" className="secondary" onClick={onExit}>
            Volver al inicio
          </button>
        </div>
      )}
    </div>
  );
}
