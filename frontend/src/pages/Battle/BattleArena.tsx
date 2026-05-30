import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomText, type Lang } from '../../data/texts';
import { useTypingEngine } from '../../hooks/useTypingEngine';
import TypingText from '../../components/TypingText';

interface Props {
  lang: Lang;
  onFinish: (score: number, accuracy: number) => void;
}

const TOTAL     = 65;
const KO_END    = 25;
const TRANS_END = 20;

type Phase = 'korean' | 'transition' | 'english';

function getPhase(timeLeft: number, lang: Lang): Phase {
  if (lang !== 'mixed') return lang === 'ko' ? 'korean' : 'english';
  if (timeLeft > KO_END)    return 'korean';
  if (timeLeft > TRANS_END) return 'transition';
  return 'english';
}

const BattleArena: React.FC<Props> = ({ lang, onFinish }) => {
  const [countdown, setCountdown] = useState(3);
  const [started, setStarted]     = useState(false);
  const [timeLeft, setTimeLeft]   = useState(TOTAL);
  const [text, setText]           = useState(() => getRandomText(lang === 'mixed' ? 'ko' : lang));
  const [liveCpm, setLiveCpm]     = useState(0);

  const startTimeRef  = useRef<number>(0);
  const finishedRef   = useRef(false);
  const phaseRef      = useRef<Phase>(getPhase(TOTAL, lang));

  // 문장 완료 시 다음 텍스트로 교체
  const handleComplete = useCallback(() => {
    const nextLang = phaseRef.current === 'english' ? 'en' : 'ko';
    setText(getRandomText(nextLang));
  }, []);

  // 타이핑 엔진
  const {
    inputRef,
    handleKeyDown,
    getSyllableDisplay,
    totalCorrect,
    accuracy,
    frame,
    getScore,
  } = useTypingEngine({ text, active: started, onComplete: handleComplete });

  // ── 카운트다운 ──────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) {
      setStarted(true);
      startTimeRef.current = Date.now();
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── 타이머 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!started || finishedRef.current) return;
    if (timeLeft <= 0) { doFinish(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft]);

  // ── 페이즈 전환 ─────────────────────────────────────────────
  useEffect(() => {
    if (!started) return;
    const phase = getPhase(timeLeft, lang);

    if (phase === 'transition' && phaseRef.current === 'korean') {
      phaseRef.current = 'transition';
    }

    if (phase === 'english' && phaseRef.current === 'transition') {
      phaseRef.current = 'english';
      setText(getRandomText('en'));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [timeLeft, started, lang]);

  // ── 실시간 CPM ──────────────────────────────────────────────
  useEffect(() => {
    if (!startTimeRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000 / 60;
    if (elapsed < 0.01) return;
    setLiveCpm(Math.round(totalCorrect / elapsed));
  }, [totalCorrect]);

  // ── 종료 ────────────────────────────────────────────────────
  const doFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const { cpm, accuracy: acc } = getScore(startTimeRef.current);
    onFinish(cpm, acc);
  }, [getScore, onFinish]);

  // ── 렌더 파생값 ─────────────────────────────────────────────
  const phase      = getPhase(timeLeft, lang);
  const timerPct   = (timeLeft / TOTAL) * 100;
  const charLevel  = liveCpm >= 400 ? 3 : liveCpm >= 200 ? 2 : 1;
  const charSrc    = `/typing/character_typing_${charLevel}-${frame}.png`;
  const timerColor = timeLeft > KO_END ? '#7c3aed' : timeLeft > TRANS_END ? '#f59e0b' : '#10b981';
  const transCount = timeLeft - TRANS_END;

  // ── 카운트다운 화면 ─────────────────────────────────────────
  if (!started) {
    return (
      <div className="arena-countdown-overlay">
        <img src="/logo_nbg.png" alt="logo" className="arena-logo" />
        <div className="countdown-number">{countdown === 0 ? 'GO!' : countdown}</div>
        <p className="countdown-sub">
          {lang === 'mixed'
            ? '혼합 모드 · 한국어 40초 → 영어 20초'
            : lang === 'ko' ? '한타 모드 · 1분' : '영타 모드 · 1분'}
        </p>
      </div>
    );
  }

  // ── 전환 카운트다운 오버레이 ────────────────────────────────
  if (phase === 'transition') {
    return (
      <div className="arena">
        <div className="arena-topbar">
          <div className="arena-stat">
            <span className="arena-stat-label">CPM</span>
            <span className="arena-stat-value" style={{ color: '#7c3aed' }}>{liveCpm}</span>
          </div>
          <div className="arena-timer-wrap">
            <svg className="arena-timer-svg" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={timerColor} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - timerPct / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
              <text x="60" y="65" textAnchor="middle" fontSize="26" fontWeight="800" fill={timerColor}>
                {timeLeft}
              </text>
            </svg>
          </div>
          <div className="arena-stat">
            <span className="arena-stat-label">정확도</span>
            <span className="arena-stat-value">{accuracy}%</span>
          </div>
        </div>
        <div className="arena-transition">
          <p className="transition-label">🇺🇸 영어 전환까지</p>
          <div className="transition-count">{transCount}</div>
          <p className="transition-sub">잠시 후 영어 타이핑이 시작됩니다</p>
        </div>
      </div>
    );
  }

  // ── 메인 타이핑 화면 ────────────────────────────────────────
  return (
    <div className="arena">
      <div className="arena-topbar">
        <div className="arena-stat">
          <span className="arena-stat-label">CPM</span>
          <span className="arena-stat-value" style={{ color: '#7c3aed' }}>{liveCpm}</span>
        </div>
        <div className="arena-timer-wrap">
          <svg className="arena-timer-svg" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={timerColor} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - timerPct / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
            <text x="60" y="65" textAnchor="middle" fontSize="26" fontWeight="800" fill={timerColor}>
              {timeLeft}
            </text>
          </svg>
        </div>
        <div className="arena-stat">
          <span className="arena-stat-label">정확도</span>
          <span className="arena-stat-value">{accuracy}%</span>
        </div>
      </div>

      {lang === 'mixed' && (
        <div className={`phase-badge ${phase}`}>
          {phase === 'korean' ? '🇰🇷 한국어' : '🇺🇸 영어'}
          {phase === 'korean' && <span className="phase-remain"> · {timeLeft - KO_END}초 후 영어 전환</span>}
        </div>
      )}

      <div className="arena-character">
        <img src={charSrc} alt="character" className="arena-character-img" />
      </div>

      <TypingText
        text={text}
        getSyllableDisplay={getSyllableDisplay}
        isKorean={phase === 'korean'}
        className="arena-text"
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
    </div>
  );
};

export default BattleArena;
