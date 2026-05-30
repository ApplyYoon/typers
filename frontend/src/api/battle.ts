/**
 * 실시간 배틀 WebSocket 메시지 타입
 *
 * 서버 ↔ 클라이언트 프로토콜을 TypeScript로 선언한다.
 * 실제 WebSocket 연결 로직은 useBattleSocket 훅에서 처리한다.
 */

// ── 서버 → 클라이언트 ────────────────────────────────────────────────

export interface S_Queued {
  type: 'queued';
  mmr: number;
}

export interface S_Dequeued {
  type: 'dequeued';
}

export interface S_Matched {
  type: 'matched';
  room_id: string;
  opponent: {
    user_id:  string;
    username: string;
    level:    number;
  };
}

export interface S_Countdown {
  type: 'countdown';
  seconds: number;
}

export interface S_GameStart {
  type:    'game_start';
  room_id: string;
  text:    string;
}

export interface S_OpponentProgress {
  type:          'opponent_progress';
  correct_chars: number;
  cpm:           number;
  accuracy:      number;
}

export interface S_OpponentFinished {
  type:     'opponent_finished';
  cpm:      number;
  accuracy: number;
}

export interface S_GameEnd {
  type:           'game_end';
  room_id:        string;
  winner_id:      string | null;
  your_cpm:       number;
  opp_cpm:        number;
  your_accuracy:  number;
  opp_accuracy:   number;
  mmr_delta:      number;   // 내 MMR 변화량 (+/-)
}

export interface S_OpponentLeft {
  type: 'opponent_left';
}

export interface S_Error {
  type:    'error';
  message: string;
}

export type ServerMessage =
  | S_Queued
  | S_Dequeued
  | S_Matched
  | S_Countdown
  | S_GameStart
  | S_OpponentProgress
  | S_OpponentFinished
  | S_GameEnd
  | S_OpponentLeft
  | S_Error;

// ── 클라이언트 → 서버 ────────────────────────────────────────────────

export interface C_JoinQueue {
  type: 'join_queue';
  mode: 'quick' | 'custom';
  room_code?: string;
}

export interface C_LeaveQueue {
  type: 'leave_queue';
}

export interface C_Heartbeat {
  type: 'heartbeat';
}

export interface C_TypingProgress {
  type:          'typing_progress';
  room_id:       string;
  correct_chars: number;
  cpm:           number;
  accuracy:      number;
}

export interface C_Finish {
  type:     'finish';
  room_id:  string;
  cpm:      number;
  accuracy: number;
}

export type ClientMessage =
  | C_JoinQueue
  | C_LeaveQueue
  | C_Heartbeat
  | C_TypingProgress
  | C_Finish;
