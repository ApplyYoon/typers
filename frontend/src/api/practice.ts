import { api } from './client';

export interface DailyStats {
  date: string;
  avg_cpm: number;
  avg_accuracy: number;
  session_count: number;
}

export interface StatsResponse {
  daily: DailyStats[];
  best_cpm: number;
  total_sessions: number;
}

export interface SessionCreate {
  mode: string;
  lang: string;
  cpm: number;
  accuracy: number;
  duration: number;
  sentences?: number;
  error_log?: Record<string, number>;
}

export interface RankEntry {
  rank: number;
  username: string;
  best_cpm: number;
  session_count: number;
}

export type RankPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export const practiceApi = {
  getStats:      (days = 30)                      => api.get<StatsResponse>(`/practice/stats?days=${days}`),
  createSession: (body: SessionCreate)             => api.post<void>('/practice/sessions', body),
  getRanking:    (period: RankPeriod = 'daily')   => api.get<RankEntry[]>(`/practice/ranking?period=${period}`),
};
