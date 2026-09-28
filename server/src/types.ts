export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

export interface Player {
  socketId: string;
  name: string;
  score: number;
  answeredThisQuestion: boolean;
}

export type RoomState = "lobby" | "question" | "reveal" | "ended";

export type Theme = "default" | "arellano";

export interface Room {
  code: string;
  hostSocketId: string;
  theme: Theme;
  questions: Question[];
  players: Map<string, Player>;
  state: RoomState;
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  answers: Map<string, { optionIndex: number; answeredAt: number }>;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}
