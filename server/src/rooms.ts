import type { LeaderboardEntry, Player, Question, Room, Theme } from "./types.js";

const rooms = new Map<string, Room>();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostSocketId: string, questions: Question[], theme: Theme = "default"): Room {
  const room: Room = {
    code: generateCode(),
    hostSocketId,
    theme,
    questions,
    players: new Map(),
    state: "lobby",
    currentQuestionIndex: -1,
    questionStartedAt: null,
    answers: new Map(),
    timeoutHandle: null,
  };
  rooms.set(room.code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string): void {
  const room = rooms.get(code);
  if (room?.timeoutHandle) clearTimeout(room.timeoutHandle);
  rooms.delete(code);
}

export function addPlayer(room: Room, socketId: string, name: string): Player {
  const player: Player = { socketId, name, score: 0, answeredThisQuestion: false };
  room.players.set(socketId, player);
  return player;
}

export function removePlayer(room: Room, socketId: string): void {
  room.players.delete(socketId);
  room.answers.delete(socketId);
}

export function nameTaken(room: Room, name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return Array.from(room.players.values()).some((p) => p.name.trim().toLowerCase() === normalized);
}

export function currentQuestion(room: Room): Question | null {
  return room.questions[room.currentQuestionIndex] ?? null;
}

export function scoreForAnswer(question: Question, optionIndex: number, elapsedMs: number): number {
  if (optionIndex !== question.correctIndex) return 0;
  const limitMs = question.timeLimitSec * 1000;
  const remainingFraction = Math.max(0, 1 - elapsedMs / limitMs);
  return Math.round(500 + 500 * remainingFraction);
}

export function leaderboard(room: Room): LeaderboardEntry[] {
  return Array.from(room.players.values())
    .map((p) => ({ name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score);
}

export function resetAnswers(room: Room): void {
  room.answers.clear();
  for (const player of room.players.values()) player.answeredThisQuestion = false;
}
