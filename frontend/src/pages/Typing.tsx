import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPracticeText, getTextFromWords, MODE_META, type TypingMode } from '../data/texts';
import { useTypingEngine } from '../hooks/useTypingEngine';
import TypingText from '../components/TypingText';
import { savePracticeSession, getActivityData } from '../utils/practiceStorage';
import { useAuth } from '../context/AuthContext';
import { practiceApi } from '../api/practice';
import { dictApi, type Dictionary } from '../api/dictionary';
import './Typing.css';

/* ── 타입 ─────────────────────────────────────────────────── */

type Phase = 'idle' | 'countdown' | 'playing' | 'result';

interface SessionResult {
  cpm: number;
  accuracy: number;
  sentences: number;
  topErrors: { jamo: string; count: number }[];
}

/* ── 상수 ─────────────────────────────────────────────────── */

const MODES: TypingMode[] = ['consonant', 'vowel', 'left', 'right', 'word', 'short', 'long'];

const MODE_DESC: Record<TypingMode, string> = {
  consonant: '다양한 자음과 받침을 집중 연습합니다',
  vowel:     '겹모음을 포함한 모든 모음을 연습합니다',
  left:      '왼손이 담당하는 자음 키를 반복 훈련합니다',
  right:     '오른손이 담당하는 모음 키를 반복 훈련합니다',
  word:      '자주 쓰이는 단어를 빠르게 타이핑합니다',
  short:     '짧은 문장으로 속도와 정확도를 측정합니다',
  long:      '긴 문단을 타이핑하며 지속력을 키웁니다',
};

const DURATIONS = [
  { label: '1분', seconds: 60 },
  { label: '2분', seconds: 120 },
  { label: '3분', seconds: 180 },
];

/* ── 컴포넌트 ─────────────────────────────────────────────── */

const Typing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dictId = searchParams.get('dictId');

  // 커스텀 사전 로드
  const [customDict, setCustomDict] = useState<Dictionary | null>(null);
  useEffect(() => {
    if (!dictId) return;
    dictApi.get(dictId)
      .then(setCustomDict)
      .catch(() => setCustomDict(null));
  }, [dictId]);

  const [phase, setPhase]         = useState<Phase>('idle');
  const [mode, setMode]           = useState<TypingMode>('short');
  const [lang, setLang]           = useState<'ko' | 'en'>('ko');
  const [duration, setDuration]   = useState(60);
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft]   = useState(60);
  const [text, setText]           = useState(() => getPracticeText('short', 'ko'));
  const [liveCpm, setLiveCpm]     = useState(0);
  const [result, setResult]       = useState<SessionResult | null>(null);
  const [chartData, setChartData] = useState(() => getActivityData());

  const startTimeRef     = useRef(0);
  const finishedRef      = useRef(false);
  const langRef          = useRef<'ko' | 'en'>('ko');
  const modeRef          = useRef<TypingMode>('short');
  const sentencesDoneRef = useRef(0);
  const durationRef      = useRef(60);
  const userRef          = useRef(user); // doFinish의 deps를 [] 유지하면서 최신 user 접근

  useEffect(() => { langRef.current     = lang;     }, [lang]);
  useEffect(() => { modeRef.current     = mode;     }, [mode]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { userRef.current     = user;     }, [user]);

  const customDictRef = useRef<Dictionary | null>(null);
  useEffect(() => { customDictRef.current = customDict; }, [customDict]);

  const handleComplete = useCallback(() => {
    if (finishedRef.current) return;
    sentencesDoneRef.current += 1;
    const cd = customDictRef.current;
    setText(cd ? getTextFromWords(cd.words) : getPracticeText(modeRef.current, langRef.current));
  }, []);

  const {
    inputRef,
    handleKeyDown,
    getSyllableDisplay,
    totalCorrect,
    totalTyped,
    accuracy,
    frame,
    getErrorLog,
    reset,
    getScore,
  } = useTypingEngine({ text, active: phase === 'playing', onComplete: handleComplete });

  const getScoreRef    = useRef(getScore);
  const getErrorLogRef = useRef(getErrorLog);
  getScoreRef.current    = getScore;
  getErrorLogRef.current = getErrorLog;

  // ── 세션 종료 처리 ────────────────────────────────────────
  const doFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const { cpm, accuracy: acc } = getScoreRef.current(startTimeRef.current);
    const topErrors = Object.entries(getErrorLogRef.current())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([jamo, count]) => ({ jamo, count }));
    const sessionResult = { cpm, accuracy: acc, sentences: sentencesDoneRef.current, topErrors };
    setResult(sessionResult);
    setPhase('result');
    const sessionMode = customDictRef.current ? 'custom' : modeRef.current;
    const sessionLang = customDictRef.current ? 'ko'     : langRef.current;

    // localStorage 저장 + 차트 갱신
    savePracticeSession({
      date: new Date().toISOString().slice(0, 10),
      cpm, accuracy: acc,
      mode: sessionMode,
      lang: sessionLang,
    });
    setChartData(getActivityData());

    // 로그인 상태일 때 서버에도 세션 저장 (실패해도 UX 차단 없이 silent)
    if (userRef.current) {
      practiceApi.createSession({
        mode:      sessionMode,
        lang:      sessionLang,
        cpm,
        accuracy:  acc,
        duration:  durationRef.current,
        sentences: sentencesDoneRef.current,
        error_log: getErrorLogRef.current(),
      }).catch(() => {/* 네트워크 오류 무시 */});
    }
  }, []);

  // ── 카운트다운 ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      startTimeRef.current = Date.now();
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, inputRef]);

  // ── 타이머 ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || finishedRef.current) return;
    if (timeLeft <= 0) { doFinish(); return; }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, doFinish]);

  // ── 실시간 CPM ───────────────────────────────────────────
  useEffect(() => {
    if (!startTimeRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) / 60000;
    if (elapsed < 0.01) return;
    setLiveCpm(Math.round(totalCorrect / elapsed));
  }, [totalCorrect]);

  // ── 모드 전환 ─────────────────────────────────────────────
  const handleModeChange = useCallback((m: TypingMode) => {
    if (m === modeRef.current && phase === 'idle') return;
    setMode(m);
    setPhase('idle');
    setResult(null);
    setLiveCpm(0);
    finishedRef.current = false;
    if (!MODE_META[m].hasLang) setLang('ko');
    if (!MODE_META[m].hasTimer) setDuration(60);
    setText(getPracticeText(m, langRef.current));
  }, [phase]);

  // ── 시작 ─────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    const secs = MODE_META[mode].hasTimer ? duration : 60;
    reset();
    const cd = customDictRef.current;
    setText(cd ? getTextFromWords(cd.words) : getPracticeText(mode, lang));
    sentencesDoneRef.current = 0;
    setLiveCpm(0);
    setCountdown(3);
    setTimeLeft(secs);
    finishedRef.current  = false;
    startTimeRef.current = 0;
    setResult(null);
    setPhase('countdown');
  }, [reset, mode, lang, duration]);

  const handleRestart = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setLiveCpm(0);
    finishedRef.current = false;
  }, []);

  // ── 차트 최대값 ───────────────────────────────────────────
  const chartMax = useMemo(() => Math.max(...chartData.map(d => d.cpm), 1), [chartData]);
  const hasActivity = chartData.some(d => d.cpm > 0);

  const meta    = MODE_META[mode];
  const seconds = meta.hasTimer ? duration : 60;
  const timerPct  = (timeLeft / seconds) * 100;
  const isKo      = lang === 'ko';
  const charLevel = liveCpm >= 400 ? 3 : liveCpm >= 200 ? 2 : 1;
  const charSrc   = `/typing/character_typing_${charLevel}-${frame}.png`;

  /* ── 렌더 ─────────────────────────────────────────────── */
  return (
    <div className="typing-page">

      {/* 웨이브 헤더 */}
      <div className="typing-header">
        <div className="typing-header-wave">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="typing-wave-svg">
            <path d="M0,24 C240,48 480,0 720,24 C960,48 1200,0 1440,24 L1440,48 L0,48 Z" fill="var(--gray-100)" />
          </svg>
        </div>
      </div>

      <div className="typing-container">

        {/* ── 모드 선택 카드 ─────────────────────────────── */}
        <div className="mode-card">
          <div className="mode-options">
            <span className="mode-bracket">{'{'}</span>
            {MODES.map(m => (
              <button
                key={m}
                className={`mode-btn${mode === m ? ' active' : ''}`}
                onClick={() => handleModeChange(m)}
              >
                {MODE_META[m].label.split(' ').map((word, i) => (
                  <span key={i} className="mode-btn-line">{word}</span>
                ))}
              </button>
            ))}
            <span className="mode-bracket">{'}'}</span>
          </div>
        </div>

        {/* ── 연습 카드 ──────────────────────────────────── */}
        <div className="practice-card">

          {/* idle */}
          {phase === 'idle' && (
            <div className="practice-idle">
              {customDict ? (
                <div className="custom-dict-banner">
                  <span className="custom-dict-badge">커스텀 사전</span>
                  <span className="custom-dict-name">{customDict.name}</span>
                  <span className="custom-dict-count">{customDict.words.length}개 단어</span>
                </div>
              ) : (
                <p className="idle-desc">{MODE_DESC[mode]}</p>
              )}
              {!customDict && (
                <div className="idle-controls">
                  {meta.hasLang && (
                    <div className="practice-lang-toggle">
                      <button
                        className={`practice-lang-btn${lang === 'ko' ? ' active' : ''}`}
                        onClick={() => setLang('ko')}
                      >한국어</button>
                      <button
                        className={`practice-lang-btn${lang === 'en' ? ' active' : ''}`}
                        onClick={() => setLang('en')}
                      >English</button>
                    </div>
                  )}
                  {meta.hasTimer && (
                    <div className="practice-duration-row">
                      {DURATIONS.map(d => (
                        <button
                          key={d.seconds}
                          className={`practice-duration-btn${duration === d.seconds ? ' active' : ''}`}
                          onClick={() => setDuration(d.seconds)}
                        >{d.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button className="practice-start-btn" onClick={handleStart}>시작하기</button>
            </div>
          )}

          {/* countdown */}
          {phase === 'countdown' && (
            <div className="practice-countdown">
              <div className="countdown-number">{countdown === 0 ? 'GO!' : countdown}</div>
              <p className="countdown-sub">
                {MODE_META[mode].label}
                {meta.hasLang ? ` · ${lang === 'ko' ? '한국어' : 'English'}` : ''}
                {` · ${DURATIONS.find(d => d.seconds === seconds)?.label ?? '1분'}`}
              </p>
            </div>
          )}

          {/* playing */}
          {phase === 'playing' && (
            <div className="practice-playing">
              {/* 상단 바 */}
              <div className="playing-topbar">
                <div className="playing-stat">
                  <span className="playing-stat-label">CPM</span>
                  <span className="playing-stat-value" style={{ color: 'var(--purple-primary)' }}>{liveCpm}</span>
                </div>
                <div className="playing-timer-wrap">
                  <svg viewBox="0 0 100 100" className="playing-timer-svg">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--gray-200)" strokeWidth="7" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--purple-primary)" strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - timerPct / 100)}`}
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                    <text x="50" y="57" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--gray-800)">
                      {timeLeft}
                    </text>
                  </svg>
                </div>
                <div className="playing-stat">
                  <span className="playing-stat-label">정확도</span>
                  <span className="playing-stat-value">{totalTyped > 0 ? accuracy : 100}%</span>
                </div>
              </div>

              {/* 캐릭터 */}
              <div className="playing-character">
                <img src={charSrc} alt="character" className="playing-character-img" />
              </div>

              <TypingText
                text={text}
                getSyllableDisplay={getSyllableDisplay}
                isKorean={isKo}
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
          )}

          {/* result */}
          {phase === 'result' && result && (
            <div className="practice-result">
              <p className="result-label">세션 결과</p>
              <div className="result-stats-row">
                <div className="result-stat">
                  <span className="result-stat-value" style={{ color: 'var(--purple-primary)' }}>{result.cpm}</span>
                  <span className="result-stat-label">타수 (CPM)</span>
                </div>
                <div className="result-stat-divider" />
                <div className="result-stat">
                  <span className="result-stat-value">{result.accuracy}%</span>
                  <span className="result-stat-label">정확도</span>
                </div>
                <div className="result-stat-divider" />
                <div className="result-stat">
                  <span className="result-stat-value">{result.sentences}</span>
                  <span className="result-stat-label">완료 문장</span>
                </div>
              </div>
              {result.topErrors.length > 0 && (
                <div className="result-errors">
                  <p className="result-errors-label">자주 틀린 자모</p>
                  <div className="result-errors-row">
                    {result.topErrors.map(({ jamo, count }) => (
                      <div key={jamo} className="result-error-chip">
                        <span className="result-error-jamo">{jamo}</span>
                        <span className="result-error-count">{count}회</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button className="practice-start-btn" onClick={handleRestart}>다시 도전</button>
            </div>
          )}
        </div>

        {/* ── 나의 활동 카드 ─────────────────────────────── */}
        <div className="activity-card">
          <div className="activity-header">
            <h3 className="activity-title">나의 활동</h3>
            {!user && (
              <span className="activity-login-hint">
                로그인하면 기록이 저장됩니다 ·{' '}
                <button className="activity-login-link" onClick={() => navigate('/login')}>
                  로그인
                </button>
              </span>
            )}
          </div>
          <div className="activity-content">
            <div className="activity-bars">
              {chartData.map((d, i) => (
                <div key={i} className="activity-bar-wrap">
                  <div
                    className="activity-bar"
                    style={{ height: `${d.cpm > 0 ? (d.cpm / chartMax) * 100 : 0}%` }}
                  />
                  <span className="activity-bar-label">{d.label}</span>
                </div>
              ))}
              {!hasActivity && (
                <p className="activity-empty">연습 기록이 없습니다. 첫 세션을 시작해보세요!</p>
              )}
            </div>
            <div className="activity-mascot">
              <img src="/logo_nbg.png" alt="logo" className="mascot-img" />
              <div className="mascot-bubble">
                <p>{hasActivity ? '잘하고 있어요!' : '첫 연습을\n시작해봐요!'}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Typing;
