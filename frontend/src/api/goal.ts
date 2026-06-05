import { api } from './client';

export interface GoalCreate {
  target_cpm: number;
  deadline: string; // YYYY-MM-DD
}

export interface GoalResponse {
  target_cpm: number;
  deadline: string;
  current_cpm: number;
  days_left: number;
  daily_minutes: number;
  progress_pct: number;
  is_achieved: boolean;
  warning: string | null;
}

export const goalApi = {
  upsert: (body: GoalCreate) =>
    api.post<GoalResponse>('/goals/me', body),

  get: () =>
    api.get<GoalResponse>('/goals/me'),

  delete: () =>
    api.delete<void>('/goals/me'),
};
