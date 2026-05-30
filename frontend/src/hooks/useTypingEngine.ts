/**
 * useTypingEngine — TypingEngine 클래스를 React hook API로 감싸는 어댑터
 *
 * Adapter 패턴:
 *   TypingEngine (순수 클래스)  →  useTypingEngine (React 훅)  →  컴포넌트
 *
 * 책임:
 *  - TypingEngine 인스턴스 생명주기 관리 (useRef로 단일 인스턴스 유지)
 *  - keydown 이벤트 → engine.handleKey() 변환
 *  - engine 상태 변경 → setSnap() → React 리렌더 트리거
 *  - text 변경 감지 → engine.setText() 전달
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { TypingEngine, type TypingScore, type EngineSnapshot } from '../engine/TypingEngine';

export type { TypingScore };

export interface UseTypingEngineReturn {
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  getSyllableDisplay: (charIndex: number, targetChar: string) => { cls: string; char: string };
  totalCorrect: number;
  totalTyped: number;
  accuracy: number;
  frame: 1 | 2;
  errorLog: Record<string, number>;
  getErrorLog: () => Record<string, number>;
  reset: () => void;
  getScore: (startTimeMs: number) => TypingScore;
}

interface Options {
  text: string;
  active: boolean;
  onComplete: () => void;
}

export function useTypingEngine({ text, active, onComplete }: Options): UseTypingEngineReturn {
  const engineRef     = useRef(new TypingEngine(text));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const inputRef = useRef<HTMLInputElement>(null);
  const [snap, setSnap] = useState<EngineSnapshot>(() => engineRef.current.snapshot());

  // text 변경 → 엔진에 전달 후 스냅샷 갱신
  useEffect(() => {
    engineRef.current.setText(text);
    setSnap(engineRef.current.snapshot());
  }, [text]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!active) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length > 1 && e.key !== 'Backspace') return;

    e.preventDefault();

    const result = engineRef.current.handleKey(e.key, e.code, e.shiftKey);
    if (result === 'ignored') return;

    setSnap(engineRef.current.snapshot());
    if (result === 'complete') onCompleteRef.current();
  }, [active]);

  // snap을 dep에 포함 → 상태 변경 후 getSyllableDisplay가 최신 엔진 상태를 읽도록 보장
  const getSyllableDisplay = useCallback(
    (charIndex: number, targetChar: string) =>
      engineRef.current.getSyllableDisplay(charIndex, targetChar),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap],
  );

  const reset = useCallback(() => {
    engineRef.current.reset();
    setSnap(engineRef.current.snapshot());
  }, []);

  const getScore    = useCallback((startTimeMs: number) => engineRef.current.getScore(startTimeMs), []);
  const getErrorLog = useCallback(() => engineRef.current.getErrorLog(), []);

  const accuracy = snap.totalTyped > 0
    ? Math.round((snap.totalCorrect / snap.totalTyped) * 100)
    : 100;

  return {
    inputRef,
    handleKeyDown,
    getSyllableDisplay,
    totalCorrect: snap.totalCorrect,
    totalTyped:   snap.totalTyped,
    accuracy,
    frame:        snap.frame,
    errorLog:     snap.errorLog,
    getErrorLog,
    reset,
    getScore,
  };
}
