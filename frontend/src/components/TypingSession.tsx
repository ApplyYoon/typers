/**
 * TypingSession — Compound Component + Context 패턴
 *
 * 기본 사용:
 *   <TypingSession text="..." onComplete={fn}>
 *     <TypingSession.Input />
 *     <TypingSession.Character className="..." />
 *     <TypingSession.Text isKorean />
 *     <TypingSession.Stats />
 *   </TypingSession>
 *
 * 타이머 종료·에러 로그가 필요한 경우 (BattleArena, Typing):
 *   const sessionRef = useRef<TypingSessionHandle>(null);
 *   <TypingSession ref={sessionRef} onCpmChange={setLiveCpm} ...>
 *   sessionRef.current?.getScore(startTimeMs)
 *   sessionRef.current?.getErrorLog()
 *
 * 설계 원칙:
 *   - CPM 계산 로직은 이 컴포넌트 하나에만 존재
 *   - 서브컴포넌트는 Context에서 필요한 것만 꺼내 씀
 *   - useMemo로 Context value 안정화 → 불필요한 리렌더 방지
 */

import React, {
  createContext, useContext,
  useState, useEffect, useRef, useMemo,
  useImperativeHandle, forwardRef,
} from 'react';
import { useTypingEngine, type TypingScore } from '../hooks/useTypingEngine';
import TypingText from './TypingText';

/* ── Imperative handle (외부 접근용) ─────────────────────── */
export interface TypingSessionHandle {
  getScore:    (startTimeMs: number) => TypingScore;
  getErrorLog: () => Record<string, number>;
  focus:       () => void;
}

/* ── Context ──────────────────────────────────────────────── */
interface TypingSessionCtx {
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  getSyllableDisplay: (i: number, ch: string) => { cls: string; char: string };
  totalTyped: number;
  totalCorrect: number;
  accuracy: number;
  frame: 1 | 2;
  cpm: number;
  text: string;
}

const TypingSessionContext = createContext<TypingSessionCtx | null>(null);

function useSession(): TypingSessionCtx {
  const ctx = useContext(TypingSessionContext);
  if (!ctx) throw new Error('TypingSession 서브컴포넌트는 <TypingSession> 안에서만 사용 가능합니다.');
  return ctx;
}

/* ── Main ─────────────────────────────────────────────────── */
interface TypingSessionProps {
  text: string;
  active?: boolean;
  onComplete?: () => void;
  /** CPM·정확도가 바뀔 때마다 호출 — 상단 바 등 외부 표시용 */
  onStatsChange?: (cpm: number, accuracy: number) => void;
  children: React.ReactNode;
  className?: string;
}

const TypingSessionBase = forwardRef<TypingSessionHandle, TypingSessionProps>(
  function TypingSession(
    { text, active = true, onComplete, onStatsChange, children, className },
    ref,
  ) {
    const [cpm, setCpm]        = useState(0);
    const startTimeRef         = useRef<number | null>(null);
    const onStatsChangeRef     = useRef(onStatsChange);
    onStatsChangeRef.current   = onStatsChange;

    const {
      inputRef,
      handleKeyDown,
      getSyllableDisplay,
      totalTyped,
      totalCorrect,
      accuracy,
      frame,
      getScore,
      getErrorLog,
    } = useTypingEngine({ text, active, onComplete: onComplete ?? (() => {}) });

    // text 변경 시 CPM 리셋
    useEffect(() => {
      startTimeRef.current = null;
      setCpm(0);
    }, [text]);

    // CPM 계산 — BattleArena와 동일한 로직
    useEffect(() => {
      if (totalTyped === 1 && !startTimeRef.current) startTimeRef.current = Date.now();
      if (!startTimeRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
      if (elapsed < 0.01) return; // cold-start 스파이크 방지
      const next = Math.round(totalCorrect / elapsed);
      setCpm(next);
      onStatsChangeRef.current?.(next, accuracy);
    }, [totalCorrect, totalTyped]);

    useImperativeHandle(ref, () => ({
      getScore,
      getErrorLog,
      focus: () => inputRef.current?.focus(),
    }), [getScore, getErrorLog, inputRef]);

    const value = useMemo<TypingSessionCtx>(() => ({
      inputRef, handleKeyDown, getSyllableDisplay,
      totalTyped, totalCorrect, accuracy, frame, cpm, text,
    }), [inputRef, handleKeyDown, getSyllableDisplay,
        totalTyped, totalCorrect, accuracy, frame, cpm, text]);

    return (
      <TypingSessionContext.Provider value={value}>
        <div className={className} onClick={() => inputRef.current?.focus()}>
          {children}
        </div>
      </TypingSessionContext.Provider>
    );
  },
);

/* ── Sub-components ───────────────────────────────────────── */

function TypingSessionInput() {
  const { inputRef, handleKeyDown } = useSession();
  return (
    <input
      ref={inputRef}
      onKeyDown={handleKeyDown}
      className="arena-input-hidden"
      readOnly
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  );
};

interface TextProps {
  isKorean?: boolean;
  dark?: boolean;
  className?: string;
}

function TypingSessionText({ isKorean, dark, className }: TextProps) {
  const { text, getSyllableDisplay, inputRef } = useSession();
  return (
    <TypingText
      text={text}
      getSyllableDisplay={getSyllableDisplay}
      isKorean={isKorean}
      dark={dark}
      className={className}
      onClick={() => inputRef.current?.focus()}
    />
  );
};

interface StatsProps {
  className?: string;
  hint?: string;
}

function TypingSessionStats({ className, hint }: StatsProps) {
  const { cpm, accuracy, totalTyped } = useSession();
  if (totalTyped === 0) {
    return hint
      ? <span className={className} style={{ fontStyle: 'italic', color: 'var(--lsub, #6B7280)' }}>{hint}</span>
      : null;
  }
  return (
    <div className={className} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {cpm > 0 && <span>{cpm} <small style={{ fontWeight: 400, color: 'var(--lsub, #6B7280)' }}>타/분</small></span>}
      <span>{accuracy}% <small style={{ fontWeight: 400, color: 'var(--lsub, #6B7280)' }}>정확도</small></span>
    </div>
  );
};

function TypingSessionCharacter({ className }: { className?: string }) {
  const { cpm, frame } = useSession();
  const level = cpm >= 400 ? 3 : cpm >= 200 ? 2 : 1;
  return (
    <img
      src={`/typing/character_typing_${level}-${frame}.png`}
      alt="character"
      className={className}
    />
  );
};

// Object.assign으로 forwardRef + 서브컴포넌트 타입 통합
const TypingSession = Object.assign(TypingSessionBase, {
  Input:     TypingSessionInput,
  Text:      TypingSessionText,
  Stats:     TypingSessionStats,
  Character: TypingSessionCharacter,
});

export default TypingSession;
