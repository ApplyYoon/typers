/**
 * TypingEngine — 순수 타이핑 엔진 (React 의존성 없음)
 *
 * 설계 원칙:
 *  - 자모 판정·CPM 계산·오류 추적만 담당 (SRP)
 *  - React, DOM, 타이머 참조 전혀 없음 → Web Worker / 서버 / 테스트에서도 재사용 가능
 *  - 모든 상태는 인스턴스 내부에 캡슐화
 *  - handleKey() 반환값으로 소비자(hook)가 후속 처리 결정 (Adapter 패턴)
 */

import {
  decomposeText,
  composePartialJamos,
  isKoreanJamo,
  KOREAN_KEY_TO_JAMO,
  CODE_TO_QWERTY,
} from '../utils/jamoUtils';

/* ── 공개 타입 ──────────────────────────────────────────────── */

export interface TypingScore {
  cpm: number;
  accuracy: number;
}

/**
 * 렌더링 트리거용 스냅샷.
 * 내부 상태(jamoPos 등)는 getSyllableDisplay가 직접 읽으므로 노출 안 함.
 */
export interface EngineSnapshot {
  totalCorrect: number;
  totalTyped: number;
  frame: 1 | 2;
  errorLog: Record<string, number>;
}

/** handleKey() 반환 타입 — hook이 분기 처리에 사용 */
export type KeyResult = 'correct' | 'complete' | 'error' | 'backspace' | 'ignored';

/* ── 엔진 클래스 ────────────────────────────────────────────── */

export class TypingEngine {
  private _jamoInfo: ReturnType<typeof decomposeText>;

  private _jamoPos    = 0;
  private _hasError   = false;
  private _wrongTyped = '';

  private _totalCorrect = 0;
  private _totalTyped   = 0;
  private _frame: 1 | 2 = 1;
  private _errorLog: Record<string, number> = {};

  constructor(text: string) {
    this._jamoInfo = decomposeText(text);
  }

  /* ── 텍스트 교체 (문장 완료 후 다음 문장으로 넘어갈 때) ────── */
  setText(text: string): void {
    this._jamoInfo  = decomposeText(text);
    this._jamoPos   = 0;
    this._hasError  = false;
    this._wrongTyped = '';
    // 누적 통계(totalCorrect/Typed, errorLog)는 초기화하지 않음
  }

  /* ── 키 입력 처리 ───────────────────────────────────────────
   * @param key  e.key  (영어·Backspace 처리)
   * @param code e.code (한글 두벌식 변환)
   * @param shiftKey  쌍자음·겹모음 판별
   */
  handleKey(key: string, code: string, shiftKey: boolean): KeyResult {
    const { jamoSequence } = this._jamoInfo;
    const expected = jamoSequence[this._jamoPos];
    if (expected === undefined) return 'ignored';

    // Backspace: 오타 상태 해제만
    if (key === 'Backspace') {
      if (this._hasError) {
        this._hasError   = false;
        this._wrongTyped = '';
        return 'backspace';
      }
      return 'ignored';
    }

    // 오타 상태에서는 Backspace 외 차단
    if (this._hasError) return 'ignored';

    // 입력 자모/문자 결정
    let typed: string;
    if (isKoreanJamo(expected)) {
      const baseKey = CODE_TO_QWERTY[code];
      if (!baseKey) return 'ignored';
      const physKey = shiftKey ? baseKey.toUpperCase() : baseKey;
      typed = KOREAN_KEY_TO_JAMO[physKey] ?? '';
      if (!typed) return 'ignored';
    } else {
      typed = key;
    }

    this._frame = this._frame === 1 ? 2 : 1;
    this._totalTyped++;

    if (typed === expected) {
      this._hasError   = false;
      this._wrongTyped = '';
      this._totalCorrect++;

      const nextPos = this._jamoPos + 1;
      if (nextPos >= jamoSequence.length) return 'complete';

      this._jamoPos = nextPos;
      return 'correct';
    } else {
      this._hasError   = true;
      this._wrongTyped = typed;
      this._errorLog   = {
        ...this._errorLog,
        [expected]: (this._errorLog[expected] ?? 0) + 1,
      };
      return 'error';
    }
  }

  /* ── 렌더 헬퍼 (TypingText 컴포넌트가 호출) ─────────────────
   * 현재 엔진 상태를 기반으로 글자 하나의 표시 정보를 반환.
   */
  getSyllableDisplay(charIndex: number, targetChar: string): { cls: string; char: string } {
    const range = this._jamoInfo.syllableRanges[charIndex];
    // text 변경 직후 useEffect가 실행되기 전 한 프레임 동안 range가 없을 수 있음
    if (!range) return { cls: 'pending', char: targetChar };

    if (this._jamoPos >= range.end)  return { cls: 'correct', char: targetChar };
    if (this._jamoPos < range.start) return { cls: 'pending', char: targetChar };

    if (this._hasError) {
      if (targetChar === ' ') return { cls: 'wrong', char: ' ' };
      if (this._jamoPos > range.start) {
        const correctJamos = this._jamoInfo.jamoSequence.slice(range.start, this._jamoPos);
        const before       = composePartialJamos(correctJamos);
        const composed     = composePartialJamos([...correctJamos, this._wrongTyped]);
        return { cls: 'wrong', char: composed !== before ? composed : this._wrongTyped };
      }
      return { cls: 'wrong', char: this._wrongTyped || targetChar };
    }

    if (this._jamoPos === range.start) return { cls: 'cursor', char: targetChar };

    // 입력한 자모 수만큼 부분 합성해서 표시 (ㄱ → 가 → 강 순으로 변화)
    // 컨테이너 width: 1em은 TypingText.tsx 인라인 스타일로 보장되므로 layout shift 없음
    const typedJamos = this._jamoInfo.jamoSequence.slice(range.start, this._jamoPos);
    return { cls: 'composing', char: composePartialJamos(typedJamos) };
  }

  /* ── 점수 계산 ──────────────────────────────────────────────
   * @param startTimeMs  세션 시작 시각 (Date.now())
   */
  getScore(startTimeMs: number): TypingScore {
    const elapsed  = (Date.now() - startTimeMs) / 1000 / 60 || 1 / 60;
    const cpm      = Math.round(this._totalCorrect / elapsed);
    const accuracy = this._totalTyped > 0
      ? Math.round((this._totalCorrect / this._totalTyped) * 100)
      : 0;
    return { cpm, accuracy };
  }

  getErrorLog(): Record<string, number> {
    return { ...this._errorLog };
  }

  /** 세션 전체 리셋 (통계 포함) */
  reset(): void {
    this._jamoPos     = 0;
    this._hasError    = false;
    this._wrongTyped  = '';
    this._totalCorrect = 0;
    this._totalTyped   = 0;
    this._frame        = 1;
    this._errorLog     = {};
  }

  /** React 상태 동기화용 — 렌더를 트리거할 최소 정보만 담음 */
  snapshot(): EngineSnapshot {
    return {
      totalCorrect: this._totalCorrect,
      totalTyped:   this._totalTyped,
      frame:        this._frame,
      errorLog:     { ...this._errorLog },
    };
  }
}
