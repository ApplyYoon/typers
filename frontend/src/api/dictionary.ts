import { api } from './client';

export interface Dictionary {
  id: string;
  name: string;
  words: string[];
  created_at: string;
  updated_at: string;
}

export const dictApi = {
  list:   ()                                              => api.get<Dictionary[]>('/dictionaries'),
  get:    (id: string)                                   => api.get<Dictionary>(`/dictionaries/${id}`),
  create: (body: { name: string; words: string[] })      => api.post<Dictionary>('/dictionaries', body),
  update: (id: string, body: { name?: string; words?: string[] }) =>
    api.patch<Dictionary>(`/dictionaries/${id}`, body),
  remove: (id: string)                                   => api.delete<void>(`/dictionaries/${id}`),
};
