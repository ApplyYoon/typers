import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPracticeText } from '../data/texts';
import TypingSession, { type TypingSessionHandle } from '../components/TypingSession';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import './LevelTest.css';

type Phase = 'intro' | 'keyboard' | 'speed-intro' | 'speed' | 'result';

interface KeyItem { jamo: string; code: string; group: 'left' | 'right'; }

const ALL_ITEMS: KeyItem[] = [
  { jamo: 'ㅂ', code: 'KeyQ', group: 'left' },
  { jamo: 'ㅈ', code: 'KeyW', group: 'left' },
  { jamo: 'ㄷ', code: 'KeyE', group: 'left' },
  { jamo: 'ㄱ', code: 'KeyR', group: 'left' },
  { jamo: 'ㅅ', code: 'KeyT', group: 'left' },
  { jamo: 'ㅁ', code: 'KeyA', group: 'left' },
  { jamo: 'ㄴ', code: 'KeyS', group: 'left' },
  { jamo: 'ㅇ', code: 'KeyD', group: 'left' },
  { jamo: 'ㄹ', code: 'KeyF', group: 'left' },
  { jamo: 'ㅎ', code: 'KeyG', group: 'left' },
  { jamo: 'ㅛ', code: 'KeyY', group: 'right' },
  { jamo: 'ㅕ', code: 'KeyU', group: 'right' },
  { jamo: 'ㅑ', code: 'KeyI', group: 'right' },
  { jamo: 'ㅐ', code: 'KeyO', group: 'right' },
  { jamo: 'ㅔ', code: 'KeyP', group: 'right' },
  { jamo: 'ㅗ', code: 'KeyH', group: 'right' },
  { jamo: 'ㅓ', code: 'KeyJ', group: 'right' },
  { jamo: 'ㅏ', code: 'KeyK', group: 'right' },
  { jamo: 'ㅣ', code: 'KeyL', group: 'right' },
  { jamo: 'ㅜ', code: 'KeyN', group: 'right' },
];

// 응답시간 1.5초 이하 + 정답 = 진짜 암기
const MEMORIZE_THRESHOLD_MS = 1500;

const LEVEL_INFO = [
  { label: '입문',    color: '#9ca3af', emoji: '🌱', desc: '자판 위치를 아직 익히는 중이에요',    guide: '자음 → 모음 → 왼손 → 오른손 순서로 연습해요' },
  { label: '초급',    color: '#f59e0b', emoji: '🔥', desc: '자판은 알지만 손이 아직 느려요',       guide: '단어 연습으로 타속을 올려요' },
  { label: '중급',    color: '#3b82f6', emoji: '⚡', desc: '일상 타이핑은 문제없어요',              guide: '짧은 글로 정확도와 속도를 함께 올려요' },
  { label: '고급',    color: '#8758FF', emoji: '🚀', desc: '꽤 빠른 손을 가졌어요',               guide: '긴 글 연습으로 300 CPM에 도전해요' },
  { label: '마스터',  color: '#6DE701', emoji: '👑', desc: '타자의 달인이에요',                    guide: '배틀로 다른 사람과 실력을 겨뤄봐요' },
];

interface KbResult {
  jamo: string;
  group: 'left' | 'right';
  correct: boolean;
  fast: boolean; // 응답시간 < 1.5초
}

function calcLevel(trueAccuracy: number, cpm: number): number {
  if (trueAccuracy < 0.7) return 0;
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
    [...ALL_ITEMS].sort(() => Math.random() - 0.5).slice(0, 12)
  );
  const [kbIdx, setKbIdx]         = useState(0);
  const [kbFeedback, setKbFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [kbResults, setKbResults] = useState<KbResult[]>([]);
  const keyShownAtRef             = useRef<number>(0);

  // ── 타속 테스트 ─────────────────────────────────────────────
  const [speedText]   = useState(() => getPracticeText('short', 'ko'));
  const [timeLeft, setTimeLeft]   = useState(30);
  const [finalCpm, setFinalCpm]   = useState(0);
  const [liveCpm, setLiveCpm]     = useState(0);
  const startTimeRef              = useRef(0);
  const speedFinishedRef          = useRef(false);
  const sessionRef                = useRef<TypingSessionHandle>(null);

  // ── 자판 테스트 keydown ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'keyboard') return;
    keyShownAtRef.current = Date.now();

    const handler = (e: KeyboardEvent) => {
      if (kbFeedback !== 'idle') return;
      e.preventDefault();

      const responseMs = Date.now() - keyShownAtRef.current;
      const isCorrect  = e.code === items[kbIdx].code;
      const isFast     = responseMs < MEMORIZE_THRESHOLD_MS;

      setKbFeedback(isCorrect ? 'correct' : 'wrong');
      setKbResults(prev => [...prev, {
        jamo:    items[kbIdx].jamo,
        group:   items[kbIdx].group,
        correct: isCorrect,
        fast:    isFast,
      }]);

      setTimeout(() => {
        const nextIdx = kbIdx + 1;
        if (nextIdx >= items.length) {
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

  // 새 자모 보여줄 때 타이머 리셋
  useEffect(() => {
    if (phase === 'keyboard') keyShownAtRef.current = Date.now();
  }, [kbIdx, phase]);

  // ── 타속 타이머 ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'speed') return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); finishSpeed(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finishSpeed = () => {
    if (speedFinishedRef.current) return;
    speedFinishedRef.current = true;
    const { cpm } = sessionRef.current!.getScore(startTimeRef.current);
    setFinalCpm(cpm);
    setPhase('result');
  };

  const startSpeed = () => {
    speedFinishedRef.current = false;
    startTimeRef.current = Date.now();
    setTimeLeft(30);
    setPhase('speed');
  };

  // ── 결과 계산 ───────────────────────────────────────────────
  // 진짜 암기 = 정답 AND 빠름
  const trueMemorized = kbResults.filter(r => r.correct && r.fast);
  const trueAccuracy  = kbResults.length > 0 ? trueMemorized.length / kbResults.length : 0;

  const leftResults  = kbResults.filter(r => r.group === 'left');
  const rightResults = kbResults.filter(r => r.group === 'right');
  const leftAcc  = leftResults.length  > 0 ? leftResults.filter(r => r.correct && r.fast).length  / leftResults.length  : 0;
  const rightAcc = rightResults.length > 0 ? rightResults.filter(r => r.correct && r.fast).length / rightResults.length : 0;

  // 느리게 맞춘 것 (봤을 가능성)
  const slowCorrect = kbResults.filter(r => r.correct && !r.fast);

  const handleComplete = async () => {
    const level = calcLevel(trueAccuracy, finalCpm);
    localStorage.setItem('typers_level', String(level));
    if (user) {
      try {
        const updated = await authApi.updateLevel(level, finalCpm);
        setUser(updated);
      } catch { /* silent */ }
    }
    navigate('/goal-setting');
  };

  const level = calcLevel(trueAccuracy, finalCpm);
  const info  = LEVEL_INFO[level];

  // ── 인트로 ──────────────────────────────────────────────────
  if (phase === 'intro') return (
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
    const passed = trueAccuracy >= 0.7;
    return (
      <div className="lt-page">
        <div className="lt-card">
          <div className={`lt-badge lt-badge--${passed ? 'pass' : 'fail'}`}>
            {passed ? `자판 암기 완료 ✓` : `진짜 암기율 ${Math.round(trueAccuracy * 100)}%`}
          </div>
          {slowCorrect.length > 0 && (
            <p className="lt-slow-hint">
              {slowCorrect.map(r => r.jamo).join(' · ')} — 조금 느렸어요. 외운 건지 확인해봐요
            </p>
          )}
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
  if (phase === 'speed') return (
    <div className="lt-page">
      <div className="lt-card lt-card--wide">
        <div className="lt-speed-header">
          <div className="lt-timer">{timeLeft}<span>초</span></div>
          <div className="lt-live-cpm">{liveCpm} <span>CPM</span></div>
        </div>
        <TypingSession
          ref={sessionRef}
          text={speedText}
          active
          onComplete={finishSpeed}
          onStatsChange={cpm => setLiveCpm(cpm)}
        >
          <div className="lt-char-wrap">
            <TypingSession.Character className="lt-character" />
          </div>
          <TypingSession.Text isKorean className="lt-speed-text" />
          <TypingSession.Input />
        </TypingSession>
      </div>
    </div>
  );

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
            <div className="lt-stat-value" style={{ color: info.color }}>{Math.round(trueAccuracy * 100)}%</div>
            <div className="lt-stat-label">자판 암기율</div>
          </div>
          <div className="lt-stat-sep" />
          <div className="lt-stat">
            <div className="lt-stat-value">{finalCpm}</div>
            <div className="lt-stat-label">CPM</div>
          </div>
        </div>

        {/* 그룹별 분석 */}
        <div className="lt-group-analysis">
          <div className="lt-group-item">
            <span className="lt-group-label">왼손 자음</span>
            <div className="lt-group-bar">
              <div className="lt-group-fill" style={{ width: `${leftAcc * 100}%`, background: leftAcc >= 0.7 ? '#6DE701' : '#ef4444' }} />
            </div>
            <span className="lt-group-pct">{Math.round(leftAcc * 100)}%</span>
          </div>
          <div className="lt-group-item">
            <span className="lt-group-label">오른손 모음</span>
            <div className="lt-group-bar">
              <div className="lt-group-fill" style={{ width: `${rightAcc * 100}%`, background: rightAcc >= 0.7 ? '#6DE701' : '#ef4444' }} />
            </div>
            <span className="lt-group-pct">{Math.round(rightAcc * 100)}%</span>
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
