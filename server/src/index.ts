import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import {
  addPlayer,
  createRoom,
  currentQuestion,
  deleteRoom,
  getRoom,
  leaderboard,
  nameTaken,
  removePlayer,
  resetAnswers,
  scoreForAnswer,
} from "./rooms.js";
import type { Question, Room } from "./types.js";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] },
});

function publicQuestion(question: Question) {
  return {
    text: question.text,
    options: question.options,
    timeLimitSec: question.timeLimitSec,
  };
}

function broadcastPlayers(room: Room) {
  io.to(room.code).emit("room:players", {
    players: Array.from(room.players.values()).map((p) => ({ name: p.name, score: p.score })),
  });
}

function startQuestion(room: Room) {
  const question = currentQuestion(room);
  if (!question) return;

  resetAnswers(room);
  room.state = "question";
  room.questionStartedAt = Date.now();

  io.to(room.code).emit("game:question", {
    index: room.currentQuestionIndex,
    total: room.questions.length,
    ...publicQuestion(question),
    startedAt: room.questionStartedAt,
  });

  if (room.timeoutHandle) clearTimeout(room.timeoutHandle);
  room.timeoutHandle = setTimeout(() => endQuestion(room), question.timeLimitSec * 1000 + 250);
}

function endQuestion(room: Room) {
  if (room.state !== "question") return;
  const question = currentQuestion(room);
  if (room.timeoutHandle) clearTimeout(room.timeoutHandle);
  room.timeoutHandle = null;
  room.state = "reveal";

  io.to(room.code).emit("game:question-end", {
    correctIndex: question?.correctIndex ?? -1,
    answeredCount: room.answers.size,
    leaderboard: leaderboard(room),
  });
}

function endGame(room: Room) {
  room.state = "ended";
  if (room.timeoutHandle) clearTimeout(room.timeoutHandle);
  room.timeoutHandle = null;
  io.to(room.code).emit("game:ended", { leaderboard: leaderboard(room) });
}

io.on("connection", (socket: Socket) => {
  socket.data.role = null as "host" | "player" | null;
  socket.data.roomCode = null as string | null;

  socket.on("host:create-room", (payload: { questions: Question[] }, callback: (res: { ok: boolean; code?: string; error?: string }) => void) => {
    const questions = payload?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      callback({ ok: false, error: "Necesitas al menos una pregunta." });
      return;
    }
    for (const q of questions) {
      if (!q.text?.trim() || !Array.isArray(q.options) || q.options.length < 2) {
        callback({ ok: false, error: "Cada pregunta necesita texto y al menos 2 opciones." });
        return;
      }
      if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
        callback({ ok: false, error: "El índice de la respuesta correcta es inválido." });
        return;
      }
    }

    const room = createRoom(socket.id, questions);
    socket.join(room.code);
    socket.data.role = "host";
    socket.data.roomCode = room.code;
    callback({ ok: true, code: room.code });
  });

  socket.on("player:join", (payload: { code: string; name: string }, callback: (res: { ok: boolean; error?: string }) => void) => {
    const code = (payload?.code ?? "").toUpperCase().trim();
    const name = (payload?.name ?? "").trim().slice(0, 24);
    const room = getRoom(code);

    if (!room) {
      callback({ ok: false, error: "No existe una sala con ese código." });
      return;
    }
    if (room.state !== "lobby") {
      callback({ ok: false, error: "El juego ya comenzó. Pide al host un nuevo código." });
      return;
    }
    if (!name) {
      callback({ ok: false, error: "Escribe un nombre." });
      return;
    }
    if (nameTaken(room, name)) {
      callback({ ok: false, error: "Ese nombre ya está en uso en esta sala." });
      return;
    }

    addPlayer(room, socket.id, name);
    socket.join(room.code);
    socket.data.role = "player";
    socket.data.roomCode = room.code;

    callback({ ok: true });
    broadcastPlayers(room);
  });

  socket.on("host:start-game", (payload: { code: string }, callback?: (res: { ok: boolean; error?: string }) => void) => {
    const room = getRoom(payload?.code);
    if (!room || room.hostSocketId !== socket.id) {
      callback?.({ ok: false, error: "No autorizado." });
      return;
    }
    if (room.players.size === 0) {
      callback?.({ ok: false, error: "Necesitas al menos un jugador para empezar." });
      return;
    }
    room.currentQuestionIndex = 0;
    startQuestion(room);
    callback?.({ ok: true });
  });

  socket.on("player:answer", (payload: { code: string; optionIndex: number }, callback?: (res: { ok: boolean; error?: string }) => void) => {
    const room = getRoom(payload?.code);
    if (!room || room.state !== "question") {
      callback?.({ ok: false, error: "No se puede responder ahora." });
      return;
    }
    const player = room.players.get(socket.id);
    if (!player) {
      callback?.({ ok: false, error: "No estás en esta sala." });
      return;
    }
    if (room.answers.has(socket.id)) {
      callback?.({ ok: false, error: "Ya respondiste esta pregunta." });
      return;
    }

    const question = currentQuestion(room);
    if (!question) return;

    const answeredAt = Date.now();
    const elapsedMs = answeredAt - (room.questionStartedAt ?? answeredAt);
    room.answers.set(socket.id, { optionIndex: payload.optionIndex, answeredAt });
    player.answeredThisQuestion = true;

    const points = scoreForAnswer(question, payload.optionIndex, elapsedMs);
    player.score += points;

    callback?.({ ok: true });
    io.to(room.hostSocketId).emit("host:answer-received", { answeredCount: room.answers.size, totalPlayers: room.players.size });

    if (room.answers.size >= room.players.size) {
      endQuestion(room);
    }
  });

  socket.on("host:next-question", (payload: { code: string }, callback?: (res: { ok: boolean; error?: string }) => void) => {
    const room = getRoom(payload?.code);
    if (!room || room.hostSocketId !== socket.id) {
      callback?.({ ok: false, error: "No autorizado." });
      return;
    }
    if (room.state !== "reveal") {
      callback?.({ ok: false, error: "Espera a que termine la pregunta actual." });
      return;
    }
    room.currentQuestionIndex += 1;
    if (room.currentQuestionIndex >= room.questions.length) {
      endGame(room);
    } else {
      startQuestion(room);
    }
    callback?.({ ok: true });
  });

  socket.on("host:end-game", (payload: { code: string }) => {
    const room = getRoom(payload?.code);
    if (!room || room.hostSocketId !== socket.id) return;
    endGame(room);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode as string | null;
    if (!code) return;
    const room = getRoom(code);
    if (!room) return;

    if (socket.data.role === "host") {
      io.to(room.code).emit("room:closed", { reason: "El host se desconectó." });
      deleteRoom(room.code);
    } else if (socket.data.role === "player") {
      removePlayer(room, socket.id);
      broadcastPlayers(room);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`quiz-live server listening on :${PORT}`);
});
