/**
 * TypingText — 타이핑 텍스트 공통 렌더러 (Facade 패턴)
 *
 * 책임: getSyllableDisplay() 결과를 char-* CSS 클래스 span으로 변환.
 * Typing / LevelTest / BattleArena 어디서나 동일한 렌더링 보장.
 *
 * 사용처가 담당할 것: 컨테이너 font-size, padding (className prop으로 주입)
 */

import React from 'react';
import './TypingText.css';

interface Props {
  text: string;
  getSyllableDisplay: (i: number, ch: string) => { cls: string; char: string };
  /** 한국어 구간 — 자모↔음절 폭 차이 방지를 위해 고정폭 적용 */
  isKorean?: boolean;
  /** 어두운 배경 컨텍스트 (LevelTest 등) */
  dark?: boolean;
  /** 컨테이너에 추가할 클래스 (font-size·padding 등 페이지별 스타일) */
  className?: string;
  onClick?: () => void;
}

const TypingText: React.FC<Props> = ({
  text,
  getSyllableDisplay,
  isKorean = false,
  dark = false,
  className = '',
  onClick,
}) => {
  const rootCls = [
    'typing-text',
    isKorean ? 'typing-text--ko'   : '',
    dark      ? 'typing-text--dark' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootCls} onClick={onClick}>
      {text.split('').map((ch, i) => {
        const { cls, char } = getSyllableDisplay(i, ch);
        const spaceCls = ch === ' ' && isKorean ? ' char-space' : '';
        // 한국어 고정폭: CSS 로딩 타이밍에 관계없이 인라인 스타일로 확실하게 보장
        const fixedStyle = isKorean
          ? { display: 'inline-block' as const, width: ch === ' ' ? '0.5em' : '1em', textAlign: 'center' as const, verticalAlign: 'middle' as const }
          : undefined;
        return (
          <span key={i} className={`char-${cls}${spaceCls}`} style={fixedStyle}>
            {char}
          </span>
        );
      })}
    </div>
  );
};

export default TypingText;
