/**
 * useBattleSocket — 실시간 배틀 WebSocket 훅
 *
 * 인증: /auth/ws-ticket 에서 단기 티켓을 발급받아 WS URL에 붙인다.
 *   (Vite 프록시 환경에서 HttpOnly 쿠키가 WS 업그레이드 시 전달되지
 *    않는 문제를 해결하는 표준 패턴)
 *
 * 버퍼링: send()가 CONNECTING 상태에 호출되면 pendingRef에 쌓아두다
 *   onopen 시 일괄 전송 → join_queue 타이밍 문제 해결
 *
 * 재연결: 비정상 종료 시 3초 후 자동 재연결 (최대 5회)
 *   재연결마다 새 티켓을 발급하여 30초 만료 문제 방지
 */
import { useEffect, useRef, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '../api/battle';
import { authApi } from '../api/auth';

const WS_BASE = (() => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiUrl) {
    // https://api.yourdomain.com → wss://api.yourdomain.com/battle/ws/battle
    return apiUrl.replace(/^http/, 'ws') + '/battle/ws/battle';
  }
  // 개발 fallback: Vite 프록시 WS 불안정 → 백엔드 포트 직접 연결
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://localhost:8000/battle/ws/battle`;
})();

const HEARTBEAT_INTERVAL = 5_000;   // ms
const MAX_RETRIES        = 5;
const RETRY_DELAY        = 3_000;   // ms

interface Options {
  onMessage: (msg: ServerMessage) => void;
  enabled?: boolean;
}

export function useBattleSocket({ onMessage, enabled = true }: Options) {
  const wsRef      = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);
  const hbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // CONNECTING 상태에 호출된 메시지 버퍼
  const pendingRef = useRef<ClientMessage[]>([]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      pendingRef.current.push(msg);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current || !enabled) return;

    // ① ws-ticket 발급 (30초 유효, 1회 사용)
    let ticket: string;
    try {
      const res = await authApi.getWsTicket();
      ticket = res.ticket;
    } catch {
      // 미로그인 또는 네트워크 오류 → 연결 포기
      return;
    }

    if (!mountedRef.current) return;

    const ws = new WebSocket(`${WS_BASE}?ticket=${ticket}`);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;

      // 버퍼된 메시지 flush
      const queued = pendingRef.current.splice(0);
      queued.forEach(m => ws.send(JSON.stringify(m)));

      // heartbeat 시작
      if (hbTimerRef.current) clearInterval(hbTimerRef.current);
      hbTimerRef.current = setInterval(() => {
        send({ type: 'heartbeat' });
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage;
        onMessage(msg);
      } catch { /* 파싱 오류 무시 */ }
    };

    ws.onclose = (ev) => {
      if (hbTimerRef.current) clearInterval(hbTimerRef.current);
      // 정상 종료 or 인증 실패 → 재연결 안 함
      if (!mountedRef.current || ev.code === 1000 || ev.code === 4001) return;

      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        setTimeout(() => connect(), RETRY_DELAY);
      }
    };

    ws.onerror = () => ws.close();

  }, [enabled, onMessage, send]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) connect();

    return () => {
      mountedRef.current = false;
      if (hbTimerRef.current) clearInterval(hbTimerRef.current);
      wsRef.current?.close(1000);
    };
  }, [enabled, connect]);

  return { send };
}
