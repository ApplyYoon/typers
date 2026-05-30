/**
 * Matching — 매칭 대기 화면
 *
 * - 연결되자마자 join_queue 메시지를 서버로 전송
 * - 로딩 스피너 + 경과 시간 표시
 * - 취소 버튼: leave_queue 전송 후 로비로 복귀
 */
import React, { useEffect, useRef, useState } from 'react';
import type { C_JoinQueue } from '../../api/battle';

interface Props {
  onSend: (msg: C_JoinQueue) => void;
  onCancel: () => void;
  mode: 'quick' | 'custom';
  roomCode?: string;
}

const Matching: React.FC<Props> = ({ onSend, onCancel, mode, roomCode }) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  // 컴포넌트 마운트 시 즉시 큐 진입
  useEffect(() => {
    onSend({ type: 'join_queue', mode, room_code: roomCode });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 경과 시간 카운터
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="rb-matching">
      <div className="rb-matching-card">
        <div className="rb-spinner" />
        <h2 className="rb-matching-title">상대 탐색 중...</h2>
        <p className="rb-matching-elapsed">{formatTime(elapsed)}</p>
        <p className="rb-matching-hint">
          {mode === 'quick'
            ? 'MMR이 비슷한 상대를 찾고 있습니다'
            : `방 코드 ${roomCode}로 입장 대기 중`}
        </p>

        <div className="rb-matching-dots">
          <span /><span /><span />
        </div>

        <button className="rb-btn-ghost rb-cancel-btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
};

export default Matching;
