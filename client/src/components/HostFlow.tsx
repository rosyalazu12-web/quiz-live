import { useEffect, useState } from "react";
import { socket } from "../socket";
import type { LeaderboardEntry, PlayerSummary, PublicQuestion, QuestionDraft, Theme } from "../types";
import { iconUrl } from "./IconPicker";
import { QuestionBuilder } from "./QuestionBuilder";
import { Timer } from "./Timer";

type Stage = "setup" | "lobby" | "question" | "reveal" | "ended";

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function HostFlow({ theme, onExit }: { theme: Theme; onExit: () => void }) {
  const [stage, setStage] = useState<Stage>("setup");
  const [code, setCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onPlayers({ players }: { players: PlayerSummary[] }) {
      setPlayers(players);
    }
    function onAnswerReceived({ answeredCount }: { answeredCount: number }) {
      setAnsweredCount(answeredCount);
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

    socket.on("room:players", onPlayers);
    socket.on("host:answer-received", onAnswerReceived);
    socket.on("game:question-end", onQuestionEnd);
    socket.on("game:ended", onEnded);

    return () => {
      socket.off("room:players", onPlayers);
      socket.off("host:answer-received", onAnswerReceived);
      socket.off("game:question-end", onQuestionEnd);
      socket.off("game:ended", onEnded);
    };
  }, []);

  function handleCreateRoom(questions: QuestionDraft[]) {
    setCreating(true);
    setError(null);
    socket.emit(
      "host:create-room",
      { questions, theme },
      (res: { ok: boolean; code?: string; error?: string }) => {
        setCreating(false);
        if (res.ok && res.code) {
          setCode(res.code);
          setStage("lobby");
        } else {
          setError(res.error ?? "No se pudo crear la sala.");
        }
      }
    );
  }

  function handleStartGame() {
    if (!code) return;
    socket.emit("host:start-game", { code }, (res: { ok: boolean; error?: string }) => {
      if (res.ok) {
        setAnsweredCount(0);
        setStage("question");
      } else {
        setError(res.error ?? "No se pudo iniciar.");
      }
    });
  }

  function handleNext() {
    if (!code) return;
    setAnsweredCount(0);
    socket.emit("host:next-question", { code }, () => {
      setStage((prev) => (prev === "reveal" ? "question" : prev));
    });
  }

  useEffect(() => {
    function onQuestion(payload: PublicQuestion) {
      setQuestion(payload);
      setStage("question");
    }
    socket.on("game:question", onQuestion);
    return () => {
      socket.off("game:question", onQuestion);
    };
  }, []);

  const joinUrl = code ? `${window.location.origin}/?join=${code}` : "";

  return (
    <div className="host-flow">
      {stage === "setup" && <QuestionBuilder onCreate={handleCreateRoom} loading={creating} error={error} />}

      {stage === "lobby" && code && (
        <div className="lobby-view">
          <h2>Sala lista</h2>
          <div className="room-code">{code}</div>
          <p className="join-hint">
            Los jugadores entran en <strong>{window.location.origin}</strong> con el código, o abriendo{" "}
            <a href={joinUrl}>este enlace</a> desde su celular. No necesitan instalar nada.
          </p>
          <h3>Jugadores conectados ({players.length})</h3>
          <ul className="player-chips">
            {players.length === 0 && <li className="empty-state">Esperando jugadores...</li>}
            {players.map((p) => (
              <li key={p.name}>{p.name}</li>
            ))}
          </ul>
          <button type="button" className="primary" onClick={handleStartGame} disabled={players.length === 0}>
            Iniciar juego
          </button>
        </div>
      )}

      {stage === "question" && question && (
        <div className="host-question-view">
          <p className="question-progress">
            Pregunta {question.index + 1} / {question.total}
          </p>
          {question.icon && (
            <div className="question-icon">
              <img src={iconUrl(question.icon)} alt="" />
            </div>
          )}
          <h2>{question.text}</h2>
          <Timer startedAt={question.startedAt} timeLimitSec={question.timeLimitSec} />
          <div className="options-grid readonly">
            {question.options.map((opt, i) => (
              <div key={i} className={`option-tile opt-${i}`}>
                <span className="option-letter">{OPTION_LETTERS[i]}</span>
                {opt}
              </div>
            ))}
          </div>
          <p className="answered-count">
            {answeredCount} / {players.length} respondieron
          </p>
        </div>
      )}

      {stage === "reveal" && question && (
        <div className="reveal-view">
          <h2>Respuesta correcta</h2>
          <div className="options-grid readonly">
            {question.options.map((opt, i) => (
              <div key={i} className={`option-tile opt-${i} ${i === correctIndex ? "correct" : "dim"}`}>
                <span className="option-letter">{OPTION_LETTERS[i]}</span>
                {opt}
              </div>
            ))}
          </div>
          <h3>Ranking</h3>
          <ol className="leaderboard">
            {leaderboard.map((entry) => (
              <li key={entry.name}>
                <span>{entry.name}</span>
                <strong>{entry.score}</strong>
              </li>
            ))}
          </ol>
          <button type="button" className="primary" onClick={handleNext}>
            {question.index + 1 >= question.total ? "Ver resultados finales" : "Siguiente pregunta"}
          </button>
        </div>
      )}

      {stage === "ended" && (
        <div className="ended-view">
          <h2>¡Juego terminado!</h2>
          <ol className="leaderboard final">
            {leaderboard.map((entry, i) => (
              <li key={entry.name} className={i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}>
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
