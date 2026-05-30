import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { getPracticeText } from '../data/texts';
import TypingText from '../components/TypingText';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import './LevelTest.css';

type Phase = 'intro' | 'keyboard' | 'speed-intro' | 'speed' | 'result';

interface KeyItem { jamo: string; code: string; }

const ALL_ITEMS: KeyItem[] = [
  { jamo: 'ㅂ', code: 'KeyQ' }, { jamo: 'ㅈ', code: 'KeyW' },
  { jamo: 'ㄷ', code: 'KeyE' }, { jamo: 'ㄱ', code: 'KeyR' },
  { jamo: 'ㅅ', code: 'KeyT' }, { jamo: 'ㅛ', code: 'KeyY' },
  { jamo: 'ㅕ', code: 'KeyU' }, { jamo: 'ㅁ', code: 'KeyA' },
  { jamo: 'ㄴ', code: 'KeyS' }, { jamo: 'ㅇ', code: 'KeyD' },
  { jamo: 'ㄹ', code: 'KeyF' }, { jamo: 'ㅎ', code: 'KeyG' },
  { jamo: 'ㅗ', code: 'KeyH' }, { jamo: 'ㅓ', code: 'KeyJ' },
  { jamo: 'ㅏ', code: 'KeyK' }, { jamo: 'ㅣ', code: 'KeyL' },
  { jamo: 'ㅠ', code: 'KeyB' }, { jamo: 'ㅜ', code: 'KeyN' },
  { jamo: 'ㅡ', code: 'KeyM' },
];

const LEVEL_INFO = [
  {
    label: '입문',
    color: '#9ca3af',
    emoji: '🌱',
    desc: '자판 위치를 아직 외우는 중이에요',
    guide: '자음 → 모음 → 왼손 → 오른손 순서로 연습해요',
  },
  {
    label: '초급',
    color: '#f59e0b',
    emoji: '🔥',
    desc: '자판은 알지만 손이 아직 느려요',
    guide: '단어 연습으로 타속을 올려요',
  },
  {
    label: '중급',
    color: '#3b82f6',
    emoji: '⚡',
    desc: '일상 타이핑은 문제없어요',
    guide: '짧은 글로 정확도와 속도를 함께 올려요',
  },
  {
    label: '고급',
    color: '#8758FF',
    emoji: '🚀',
    desc: '꽤 빠른 손을 가졌어요',
    guide: '긴 글 연습으로 300 CPM에 도전해요',
  },
  {
    label: '마스터',
    color: '#6DE701',
    emoji: '👑',
    desc: '타자의 달인이에요',
    guide: '배틀로 다른 사람과 실력을 겨뤄봐요',
  },
];

function calcLevel(keyboardAcc: number, cpm: number): number {
  if (keyboardAcc < 0.7) return 0;
  if (cpm < 100) return 1;
  if (cpm < 200) return 2;
  if (cpm < 300) return 3;
  return 4;
}

const LevelTest: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [phase, setPhase] = useState<Phase>('intro');

  // ── 자판 암기 테스트 ─────────────────────────────────────────
  const [items] = useState<KeyItem[]>(() =>
    [...ALL_ITEMS].sort(() => Math.random() - 0.5).slice(0, 10)
  );
  const [kbIdx, setKbIdx] = useState(0);
  const [kbFeedback, setKbFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const kbCorrectRef = useRef(0);
  const [keyboardAcc, setKeyboardAcc] = useState(0);

  // ── 타속 테스트 ─────────────────────────────────────────────
  const [speedText] = useState(() => getPracticeText('short', 'ko'));
  const [speedActive, setSpeedActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [finalCpm, setFinalCpm] = useState(0);
  const startTimeRef = useRef(0);
  const speedFinishedRef = useRef(false);
  const finishSpeedRef = useRef<() => void>(() => {});

  const { inputRef, handleKeyDown, getSyllableDisplay, totalCorrect, frame, getScore } = useTypingEngine({
    text: speedText,
    active: speedActive,
    onComplete: () => finishSpeedRef.current(),
  });

  // 항상 최신 getScore를 바라보도록
  useEffect(() => {
    finishSpeedRef.current = () => {
      if (speedFinishedRef.current) return;
      speedFinishedRef.current = true;
      setSpeedActive(false);
      const { cpm } = getScore(startTimeRef.current);
      setFinalCpm(cpm);
      setPhase('result');
    };
  });

  // 타속 phase 시작 시 input 포커스
  useEffect(() => {
    if (phase === 'speed') inputRef.current?.focus();
  }, [phase, inputRef]);

  // ── 자판 테스트 keydown ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'keyboard') return;

    const handler = (e: KeyboardEvent) => {
      if (kbFeedback !== 'idle') return;
      e.preventDefault();

      const isCorrect = e.code === items[kbIdx].code;
      if (isCorrect) kbCorrectRef.current++;
      setKbFeedback(isCorrect ? 'correct' : 'wrong');

      setTimeout(() => {
        const nextIdx = kbIdx + 1;
        if (nextIdx >= items.length) {
          setKeyboardAcc(kbCorrectRef.current / items.length);
          setPhase('speed-intro');
        } else {
          setKbIdx(nextIdx);
          setKbFeedback('idle');
        }
      }, 350);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, kbIdx, kbFeedback, items]);

  // ── 타속 테스트 타이머 ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'speed') return;

    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          finishSpeedRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [phase]);

  const startSpeed = () => {
    speedFinishedRef.current = false;
    startTimeRef.current = Date.now();
    setTimeLeft(30);
    setSpeedActive(true);
    setPhase('speed');
  };

  const handleComplete = async () => {
    localStorage.setItem('typers_level', String(level));
    if (user) {
      try {
        const updated = await authApi.updateLevel(level, finalCpm);
        setUser(updated);
      } catch {
        // 서버 저장 실패해도 localStorage fallback
      }
    }
    navigate('/home');
  };

  const level = calcLevel(keyboardAcc, finalCpm);
  const info = LEVEL_INFO[level];
  const elapsed = 30 - timeLeft;
  const liveCpm = elapsed > 0 ? Math.round(totalCorrect / (elapsed / 60)) : 0;

  // ── 인트로 ──────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="lt-page">
        <div className="lt-card">
          <div className="lt-intro-icon">⌨️</div>
          <h1 className="lt-title">실력 측정</h1>
          <p className="lt-desc">
            딱 두 가지만 확인할게요.<br />
            자판 위치를 외웠는지, 그리고 타자가 얼마나 빠른지.
          </p>
          <p className="lt-sub">총 1분 내외면 충분해요</p>
          <button className="lt-btn-primary" onClick={() => setPhase('keyboard')}>
            시작하기
          </button>
        </div>
      </div>
    );
  }

  // ── 자판 암기 테스트 ─────────────────────────────────────────
  if (phase === 'keyboard') {
    const current = items[kbIdx];
    return (
      <div className="lt-page">
        <div className="lt-card">
          <div className="lt-step-label">자판 암기 테스트 · {kbIdx + 1} / {items.length}</div>
          <div className="lt-progress">
            <div className="lt-progress-fill" style={{ width: `${(kbIdx / items.length) * 100}%` }} />
          </div>
          <p className="lt-keyboard-desc">이 자모에 해당하는 키를 눌러주세요</p>
          <div className={`lt-jamo lt-jamo--${kbFeedback}`}>{current.jamo}</div>
          <p className="lt-hint">키보드를 보지 말고 눌러보세요 🙈</p>
        </div>
      </div>
    );
  }

  // ── 타속 인트로 ─────────────────────────────────────────────
  if (phase === 'speed-intro') {
    const passed = keyboardAcc >= 0.7;
    return (
      <div className="lt-page">
        <div className="lt-card">
          <div className={`lt-badge lt-badge--${passed ? 'pass' : 'fail'}`}>
            {passed ? `자판 암기 완료 ✓` : `자판 정확도 ${Math.round(keyboardAcc * 100)}%`}
          </div>
          <h2 className="lt-title" style={{ marginTop: 8 }}>이번엔 타속을 측정할게요</h2>
          <p className="lt-desc">
            30초 동안 아래 문장을 최대한<br />
            빠르고 정확하게 타이핑해주세요.
          </p>
          <button className="lt-btn-primary" onClick={startSpeed}>
            준비됐어요
          </button>
        </div>
      </div>
    );
  }

  // ── 타속 테스트 ─────────────────────────────────────────────
  if (phase === 'speed') {
    const charLevel = liveCpm >= 400 ? 3 : liveCpm >= 200 ? 2 : 1;
    const charSrc   = `/typing/character_typing_${charLevel}-${frame}.png`;
    return (
      <div className="lt-page">
        <div className="lt-card lt-card--wide">
          <div className="lt-speed-header">
            <div className="lt-timer">{timeLeft}<span>초</span></div>
            <img src={charSrc} alt="character" className="lt-character" />
            <div className="lt-live-cpm">{liveCpm} <span>CPM</span></div>
          </div>
          <TypingText
            text={speedText}
            getSyllableDisplay={getSyllableDisplay}
            isKorean
            dark
            className="lt-speed-text"
          />
          <input ref={inputRef} className="arena-input-hidden" onKeyDown={handleKeyDown} readOnly />
        </div>
      </div>
    );
  }

  // ── 결과 ────────────────────────────────────────────────────
  return (
    <div className="lt-page">
      <div className="lt-card">
        <div className="lt-result-emoji">{info.emoji}</div>
        <div className="lt-level-badge" style={{ color: info.color, borderColor: info.color }}>
          Lv.{level} &nbsp;{info.label}
        </div>
        <p className="lt-level-desc">{info.desc}</p>

        <div className="lt-stats-row">
          <div className="lt-stat">
            <div className="lt-stat-value">{Math.round(keyboardAcc * 100)}%</div>
            <div className="lt-stat-label">자판 정확도</div>
          </div>
          <div className="lt-stat-sep" />
          <div className="lt-stat">
            <div className="lt-stat-value">{finalCpm}</div>
            <div className="lt-stat-label">CPM</div>
          </div>
        </div>

        <div className="lt-guide-box">
          <span className="lt-guide-arrow">→</span>
          {info.guide}
        </div>

        <button className="lt-btn-primary" onClick={handleComplete}>
          연습 시작하기
        </button>
      </div>
    </div>
  );
};

export default LevelTest;
