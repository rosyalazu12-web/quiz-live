export type Theme = "default" | "arellano";

export interface QuestionDraft {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
  icon?: string;
}

export interface PublicQuestion {
  index: number;
  total: number;
  text: string;
  options: string[];
  timeLimitSec: number;
  startedAt: number;
  icon?: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface PlayerSummary {
  name: string;
  score: number;
}
