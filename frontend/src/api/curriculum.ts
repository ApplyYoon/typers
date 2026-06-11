import { api } from './client';

export interface CurriculumStageResult {
  id: number;
  mode: string;
  status: 'locked' | 'current' | 'completed';
  best_cpm: number;
  best_accuracy: number;
  pass_cpm: number;
  pass_accuracy: number;
}

export const curriculumApi = {
  get: () =>
    api.get<CurriculumStageResult[]>('/curriculum/me'),
};
