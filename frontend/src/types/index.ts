export interface User {
  id: number;
  username: string;
  avatar: string;
  rank: number;
  avgWpm: number;
  avgAccuracy: number;
}

export interface RankUser {
  rank: number;
  username: string;
  avgWpm: number;
  avatar: 'grape' | 'blueberry' | 'lemon';
  isTop3: boolean;
}

export interface StatData {
  date: string;
  wpm: number;
  accuracy: number;
}

export type CursorType = 'basic' | 'left-up' | 'left-down' | 'center' | 'right-up';
