import { api } from './client';

interface TokenResponse { access_token: string; token_type: string; }

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  level: number;
  initial_cpm: number;
}

export const authApi = {
  register: (username: string, email: string, password: string) =>
    api.post<TokenResponse>('/auth/register', { username, email, password }),

  login: (username: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { username, password }),

  me: () => api.get<UserResponse>('/auth/me'),

  updateLevel: (level: number, initial_cpm: number) =>
    api.patch<UserResponse>('/auth/level', { level, initial_cpm }),
};

export function saveToken(token: string) {
  localStorage.setItem('typers_token', token);
  localStorage.setItem('typers_auth', 'true');
}

export function getToken(): string | null {
  return localStorage.getItem('typers_token');
}

export function clearAuth() {
  localStorage.removeItem('typers_token');
  localStorage.removeItem('typers_auth');
  localStorage.removeItem('typers_level');
}
