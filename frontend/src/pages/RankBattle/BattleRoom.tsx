/**
 * BattleRoom — 실시간 타이핑 배틀 아레나
 *
 * 레이아웃:
 *  ┌───────────────────────────────┐
 *  │  [나]  CPM / ACC  |  타이머  |  [상대] CPM / ACC  │
 *  │  진행 바 (나)                     │
 *  │  진행 바 (상대)                   │
 *  │  타이핑 텍스트                    │
 *  └───────────────────────────────┘
 *
 * 한글 타이핑 엔진: 기존 useTypingEngine 재활용
 * 진행도 전송: 0.5초마다 throttle하여 typing_progress 전송
 * 완료: 텍스트 끝까지 치면 finish 메시지 전송
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTypingEngine } from '../../hooks/useTypingEngine';
import TypingText from '../../components/TypingText';
import type { C_TypingProgress, C_Finish } from '../../api/battle';

interface Opponent {
  user_id:  string;
  username: string;
  level:    number;
}

interface Props {
  roomId:    string;
  text:      string;
  opponent:  Opponent;
  myName:    string;
  countdown: number | null;    // null = 게임 진행 중
  onSend:    (msg: C_TypingProgress | C_Finish) => void;
  oppProgress: { cpm: number; accuracy: number; correct_chars: number };
  oppFinished: boolean;
}

const PROGRESS_THROTTLE_MS = 500;

const BattleRoom: React.FC<Props> = ({
  roomId, text, opponent, myName, countdown, onSend, oppProgress, oppFinished,
}) => {
  const [finished, setFinished]   = useState(false);
  const startTimeRef              = useRef(Date.now());
  const lastSendRef               = useRef(0);

  const handleComplete = useCallback(() => {
    // 텍스트 완료 — finish 전송
    if (finished) return;
    setFinished(true);
    const elapsed  = (Date.now() - startTimeRef.current) / 60000;
    const finalCpm = elapsed > 0 ? Math.round(totalCorrect / elapsed) : 0;
    onSend({ type: 'finish', room_id: roomId, cpm: finalCpm, accuracy });
  }, [finished]); // eslint-disable-line

  const {
    inputRef, handleKeyDown, getSyllableDisplay,
    totalCorrect, totalTyped, accuracy,
  } = useTypingEngine({ text, active: !finished && countdown === null, onComplete: handleComplete });

  // 게임 시작 시 포커스
  useEffect(() => {
    if (countdown === null) {
      startTimeRef.current = Date.now();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [countdown, inputRef]);

  // 0.5초마다 진행도 전송 (throttle)
  useEffect(() => {
    if (countdown !== null || finished) return;
    const now = Date.now();
    if (now - lastSendRef.current < PROGRESS_THROTTLE_MS) return;
    lastSendRef.current = now;

    const elapsed = (now - startTimeRef.current) / 60000;
    const cpm = elapsed > 0.001 ? Math.round(totalCorrect / elapsed) : 0;
    onSend({
      type:          'typing_progress',
      room_id:       roomId,
      correct_chars: totalCorrect,
      cpm,
      accuracy,
    });
  }, [totalCorrect, countdown, finished]); // eslint-disable-line

  // 진행도 퍼센트 계산
  const myPct  = text.length > 0 ? Math.min((totalCorrect / text.length) * 100, 100) : 0;
  const oppPct = text.length > 0 ? Math.min((oppProgress.correct_chars / text.length) * 100, 100) : 0;

  // 실시간 CPM
  const elapsed = (Date.now() - startTimeRef.current) / 60000;
  const liveCpm = elapsed > 0.001 && countdown === null
    ? Math.round(totalCorrect / elapsed) : 0;

  const isKo = /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);

  return (
    <div className="rb-arena">
      {/* ── 카운트다운 오버레이 ─────────────────────────────── */}
      {countdown !== null && (
        <div className="rb-countdown-overlay">
          <div className="rb-countdown-vs">
            <span>{myName}</span>
            <span className="rb-vs">VS</span>
            <span>{opponent.username}</span>
          </div>
          <div className="rb-countdown-num">{countdown === 0 ? 'GO!' : countdown}</div>
        </div>
      )}

      {/* ── 상단 통계 바 ─────────────────────────────────── */}
      <div className="rb-topbar">
        <div className="rb-player-stat rb-me">
          <span className="rb-player-name">{myName} (나)</span>
          <span className="rb-cpm" style={{ color: 'var(--purple-primary)' }}>{liveCpm} CPM</span>
          <span className="rb-acc">{totalTyped > 0 ? accuracy : 100}%</span>
        </div>
        <div className="rb-player-stat rb-opp">
          <span className="rb-player-name">{opponent.username}</span>
          <span className="rb-cpm">{oppProgress.cpm} CPM</span>
          <span className="rb-acc">{oppProgress.accuracy}%</span>
          {oppFinished && <span className="rb-finished-tag">완료!</span>}
        </div>
      </div>

      {/* ── 진행 바 ──────────────────────────────────────── */}
      <div className="rb-progress-wrap">
        <div className="rb-progress-row">
          <span className="rb-progress-label">나</span>
          <div className="rb-progress-track">
            <div className="rb-progress-fill rb-fill-me" style={{ width: `${myPct}%` }} />
          </div>
          <span className="rb-progress-pct">{Math.round(myPct)}%</span>
        </div>
        <div className="rb-progress-row">
          <span className="rb-progress-label">상대</span>
          <div className="rb-progress-track">
            <div className="rb-progress-fill rb-fill-opp" style={{ width: `${oppPct}%` }} />
          </div>
          <span className="rb-progress-pct">{Math.round(oppPct)}%</span>
        </div>
      </div>

      {/* ── 타이핑 영역 ──────────────────────────────────── */}
      {!finished ? (
        <>
          <TypingText
            text={text}
            getSyllableDisplay={getSyllableDisplay}
            isKorean={isKo}
            className="rb-text"
            onClick={() => inputRef.current?.focus()}
          />
          <input
            ref={inputRef}
            className="arena-input-hidden"
            onKeyDown={handleKeyDown}
            readOnly
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </>
      ) : (
        <div className="rb-my-done">
          <p>✅ 입력 완료! 상대방 대기 중...</p>
          <p className="rb-my-done-cpm">{liveCpm} CPM</p>
        </div>
      )}
    </div>
  );
};

export default BattleRoom;
