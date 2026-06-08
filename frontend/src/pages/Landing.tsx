import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TypingSession from '../components/TypingSession';
import './Landing.css';

/* ── Hooks ──────────────────────────────────────────────── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

/* ── Intro overlay ──────────────────────────────────────── */
type IntroPhase = 'typing' | 'flash' | 'done';

const IntroOverlay: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<IntroPhase>('typing');
  const TARGET = 'Typers';
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setText(TARGET.slice(0, i));
      if (i === TARGET.length) {
        clearInterval(iv);
        setTimeout(() => setPhase('flash'), 600);
        setTimeout(() => setPhase('done'), 950);
        setTimeout(() => onDoneRef.current(), 1200);
      }
    }, 110);
    return () => clearInterval(iv);
  }, []);

  if (phase === 'done') return null;
  return (
    <div className={`intro-overlay${phase === 'flash' ? ' intro-flash' : ''}`}>
      <div className="intro-text">
        {text}
        <span className="intro-cursor">|</span>
      </div>
    </div>
  );
};


/* ── Hero Typing Demo ───────────────────────────────────── */
const HERO_TEXT = '목표 타수, 가이드와 동기부여로 달성한다';

const HeroTypingDemo: React.FC<{ onScrollToTry: () => void }> = ({ onScrollToTry }) => (
  <div className="hero-td hero-td-preview" onClick={onScrollToTry}>
    <div className="hero-td-preview-top">
      <img src="/typing/character_typing_1-1.png" alt="character" className="hero-td-preview-char" />
      <span className="hero-td-label">클릭해서 타이핑해보세요</span>
    </div>
    <div className="hero-td-text">
      <span className="hero-td-cursor"> </span>
      <span style={{ color: '#d1d5db' }}>{HERO_TEXT}</span>
    </div>
  </div>
);

/* ── Try Section ────────────────────────────────────────── */
const TRY_SENTENCES = [
  '자격증 시험까지 한 달, 타수가 걱정되셨나요?',
];

const TrySentence: React.FC<{
  text: string;
  onComplete: (cpm: number) => void;
}> = ({ text, onComplete }) => {
  const lastCpmRef = useRef(0);
  return (
    <TypingSession
      text={text}
      active
      onComplete={() => onComplete(lastCpmRef.current)}
      onStatsChange={cpm => { lastCpmRef.current = cpm; }}
    >
      <TypingSession.Input />
      <div className="try-char-row">
        <TypingSession.Character className="try-char-img" />
        <TypingSession.Text isKorean className="try-sentence" />
      </div>
      <div className="try-stats">
        <TypingSession.Stats className="try-stat" hint="클릭하고 타이핑 시작" />
      </div>
    </TypingSession>
  );
};

const TrySection = React.forwardRef<HTMLElement, {
  onStart: () => void;
  onDone: (cpm: number) => void;
}>(
  ({ onStart, onDone }, ref) => {
    const [sentenceIdx, setSentenceIdx] = useState(0);
    const [done, setDone]               = useState(false);
    const [finalCpm, setFinalCpm]       = useState(0);

    const handleSentenceComplete = (cpm: number) => {
      const next = sentenceIdx + 1;
      if (next < TRY_SENTENCES.length) {
        setTimeout(() => setSentenceIdx(next), 400);
      } else {
        setFinalCpm(cpm);
        setDone(true);
        onDone(cpm);
      }
    };

    const progress = (sentenceIdx / TRY_SENTENCES.length) * 100;

    return (
      <section ref={ref} className="l-try">
        <div className="l-try-inner">
          <div className="l-section-eyebrow">직접 체험해보세요</div>
          <h2 className="l-try-title">지금 바로 타이핑해봐요</h2>
          <div className="try-box">
            {TRY_SENTENCES.length > 1 && (
              <div className="try-progress-bar">
                <div className="try-progress-fill" style={{ width: `${done ? 100 : progress}%` }} />
              </div>
            )}
            {done ? (
              <div className="try-done">
                <div className="try-done-cpm">{finalCpm} <small>타/분</small></div>
                <div className="try-done-sub">내 타수가 플랜 계산기에 반영됐어요 ↓</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
                  <button className="l-btn-primary" onClick={onStart}>무료로 시작하기 →</button>
                  <button className="l-btn-ghost" onClick={() => { setDone(false); setSentenceIdx(0); }}>다시 측정</button>
                </div>
              </div>
            ) : (
              <>
                {TRY_SENTENCES.length > 1 && (
                  <div className="try-idx">{sentenceIdx + 1} / {TRY_SENTENCES.length}</div>
                )}
                <TrySentence
                  key={sentenceIdx}
                  text={TRY_SENTENCES[sentenceIdx]}
                  onComplete={handleSentenceComplete}
                />
              </>
            )}
          </div>
        </div>
      </section>
    );
  }
);

/* ── Plan Calculator ────────────────────────────────────── */
const CERT_PRESETS = [
  { label: '컴활 2급', cpm: 200 },
  { label: '한글 1급', cpm: 300 },
  { label: '컴활 1급', cpm: 300 },
  { label: '직접 입력', cpm: 0 },
];
const WEEK_OPTIONS = [2, 4, 8];

const PlanCalculator: React.FC<{ initialCpm?: number; onStart?: () => void }> = ({ initialCpm, onStart }) => {
  const [currentCpm, setCurrentCpm]   = useState(initialCpm ?? 150);

  useEffect(() => {
    if (initialCpm && initialCpm > 0) setCurrentCpm(initialCpm);
  }, [initialCpm]);
  const [customTarget, setCustomTarget] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [weeks, setWeeks] = useState(4);

  const effectiveTarget = selectedPreset === 3
    ? (parseInt(customTarget) || 300)
    : CERT_PRESETS[selectedPreset].cpm;

  const gap = Math.max(0, effectiveTarget - currentCpm);
  // 주당 약 10CPM 향상 가정 (하루 20분 기준)
  const weeklyNeeded = weeks > 0 ? gap / weeks : gap;
  const dailyMinutes = Math.round((weeklyNeeded / 10) * 20);
  const clamped = Math.max(10, Math.min(dailyMinutes, 120));
  const isTough = dailyMinutes > 60;
  const alreadyThere = gap <= 0;

  return (
    <div className="plan-calc">
      <div className="plan-row">
        <div className="plan-field">
          <label className="plan-label">현재 타수</label>
          <div className="plan-slider-wrap">
            <input
              type="range" min={50} max={600} step={10}
              value={currentCpm}
              onChange={e => setCurrentCpm(Number(e.target.value))}
              className="plan-slider"
            />
            <span className="plan-slider-val">{currentCpm}<small>타</small></span>
          </div>
        </div>

        <div className="plan-field">
          <label className="plan-label">목표 타수</label>
          <div className="plan-presets">
            {CERT_PRESETS.map((p, i) => (
              <button
                key={i}
                className={`plan-preset${selectedPreset === i ? ' plan-preset-active' : ''}`}
                onClick={() => { setSelectedPreset(i); }}
              >
                {p.label}
                {p.cpm > 0 && <span className="plan-preset-cpm">{p.cpm}타</span>}
              </button>
            ))}
          </div>
          {selectedPreset === 3 && (
            <input
              type="number" min={100} max={800} placeholder="목표 타수 입력"
              value={customTarget}
              onChange={e => setCustomTarget(e.target.value)}
              className="plan-custom-input"
            />
          )}
        </div>

        <div className="plan-field">
          <label className="plan-label">준비 기간</label>
          <div className="plan-weeks">
            {WEEK_OPTIONS.map(w => (
              <button
                key={w}
                className={`plan-week-btn${weeks === w ? ' plan-week-active' : ''}`}
                onClick={() => setWeeks(w)}
              >
                {w}주
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`plan-result${alreadyThere ? ' plan-result-ok' : isTough ? ' plan-result-hard' : ''}`}>
        {alreadyThere ? (
          <>
            <span className="plan-result-icon">✓</span>
            <span className="plan-result-text">이미 목표 타수에 도달했어요!</span>
          </>
        ) : (
          <>
            <span className="plan-result-icon">→</span>
            <span className="plan-result-text">
              하루 <strong>{clamped}분</strong> 연습으로 {weeks}주 안에 달성할 수 있어요
              {isTough && <span className="plan-result-note"> — 기간을 늘려보세요</span>}
            </span>
          </>
        )}
      </div>
      {onStart && (
        <div className="plan-cta">
          <p className="plan-cta-sub">플랜이 완성됐어요. 지금 시작해볼까요?</p>
          <button className="l-btn-primary plan-cta-btn" onClick={onStart}>
            무료로 시작하기 →
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Feature card ───────────────────────────────────────── */
const FeatureCard: React.FC<{
  num: number; title: string; desc: string; delay: number;
}> = ({ num, title, desc, delay }) => {
  const [ref, inView] = useInView(0.1);
  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`feat-card${inView ? ' feat-card-in' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="feat-num">0{num}</div>
      <div className="feat-title">{title}</div>
      <div className="feat-desc">{desc}</div>
    </div>
  );
};

/* ── Landing ────────────────────────────────────────────── */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [introComplete, setIntroComplete] = useState(false);
  const [heroVisible,   setHeroVisible]   = useState(false);
  const [planRef,  planInView]  = useInView(0.2);
  const [ctaRef,   ctaInView]   = useInView(0.2);
  const tryRef  = useRef<HTMLElement>(null);
  const planElemRef = useRef<HTMLElement | null>(null);
  const [tryCpm, setTryCpm] = useState<number>(0);

  const scrollToTry = () => {
    tryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleTryDone = (cpm: number) => {
    setTryCpm(cpm);
    setTimeout(() => {
      planElemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 600);
  };

  useEffect(() => {
    if (introComplete) {
      const t = setTimeout(() => setHeroVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, [introComplete]);

  const handleStart = () => navigate('/register');

  return (
    <div className="landing">
      <IntroOverlay onDone={() => setIntroComplete(true)} />

      {/* ── Nav ── */}
      <nav className={`l-nav${heroVisible ? ' l-nav-visible' : ''}`}>
        <div className="l-nav-logo">Ty<span className="l-nav-accent">pers</span></div>
        <div className="l-nav-links">
          {([['연습하기', '/typing'], ['랭킹', '/ranking'], ['나의 기록', '/profile']] as [string, string][]).map(([label, href]) => (
            <a key={label} href={href} className="l-nav-link"
              onClick={e => { e.preventDefault(); navigate(href); }}>
              {label}
            </a>
          ))}
        </div>
        <button className="l-nav-cta" onClick={handleStart}>무료 시작</button>
      </nav>

      {/* ── 1st fold · Hero ── */}
      <section className="l-hero">
        <div className="l-hero-dotgrid" />
        <div className={`l-hero-inner${heroVisible ? ' l-hero-inner-visible' : ''}`}>

          {/* 좌측: 카피 */}
          <div className="l-hero-left">
            <div className="l-hero-eyebrow">자격증 · 과제 · 전공 실습</div>
            <h1 className="l-hero-h1">
              목표 타수까지<br />
              <span className="l-hero-accent">가는 길이 보인다</span>
            </h1>
            <p className="l-hero-sub">
              막연히 반복하지 않아도 돼요.<br />
              목표와 기간을 입력하면 오늘 뭘 해야 할지 알려드려요.
            </p>
            <button className="l-btn-primary l-btn-hero" onClick={handleStart}>
              무료로 시작하기 →
            </button>
          </div>

          {/* 우측: 타이핑 데모 */}
          <div className={`l-hero-right${heroVisible ? ' l-hero-right-visible' : ''}`}>
            <HeroTypingDemo onScrollToTry={scrollToTry} />
          </div>

        </div>
      </section>

      {/* ── Try Section ── */}
      <TrySection ref={tryRef} onStart={handleStart} onDone={handleTryDone} />

      {/* ── 2nd fold · Plan Demo ── */}
      <section
        ref={el => { (planRef as React.MutableRefObject<HTMLElement | null>).current = el; planElemRef.current = el; }}
        className={`l-plan${planInView ? ' l-plan-visible' : ''}`}
      >
        <div className="l-plan-inner">
          <div className="l-section-eyebrow">목표 기반 플랜</div>
          <h2 className="l-plan-title">
            목표 타수와 기간을 입력하면<br />
            오늘 얼마나 연습할지 알려드려요
          </h2>
          <p className="l-plan-sub">
            다른 앱은 목표를 설정할 수 있지만, 거기까지 어떻게 가야 하는지는 알려주지 않아요.
          </p>
          <PlanCalculator
            initialCpm={tryCpm > 0 ? tryCpm : undefined}
            onStart={tryCpm > 0 ? handleStart : undefined}
          />
        </div>
      </section>

      {/* ── 3rd fold · Features ── */}
      <section className="l-features">
        <div className="l-features-header">
          <div className="l-section-eyebrow">Features</div>
          <h2 className="l-features-title">가이드와 동기부여로<br />목표 타수를 달성해요</h2>
        </div>
        <div className="l-feat-grid">
          <FeatureCard num={1} delay={0}
            title="목표 기반 플랜"
            desc="현재 타수·목표 타수·준비 기간을 입력하면 하루 권장 연습량과 예상 달성일을 자동으로 계산해드려요." />
          <FeatureCard num={2} delay={80}
            title="성장 대시보드"
            desc="CPM과 정확도 추이를 매일 기록해 그래프로 보여드려요. 어제보다 빨라진 손을 직접 눈으로 확인하세요." />
          <FeatureCard num={3} delay={160}
            title="학교대항전"
            desc="같은 학교 친구들과 실시간 타이핑 배틀. 경쟁이 생기면 연습이 달라져요." />
        </div>
      </section>

      {/* ── 4th fold · CTA ── */}
      <section
        ref={ctaRef as React.Ref<HTMLElement>}
        className={`l-cta${ctaInView ? ' l-cta-visible' : ''}`}
      >
        <div className="l-cta-card">
          <div className="l-cta-copy">
            <div className="l-section-eyebrow" style={{ color: 'var(--lprimary)' }}>만든 사람</div>
            <h2 className="l-cta-title">
              영어 타수 100타에서<br />
              <span className="l-hero-accent">1000타까지 올려본 사람</span>이<br />
              만들었어요
            </h2>
            <p className="l-cta-body">
              직업계고에서 자격증을 준비하며 타이핑이 발목을 잡았던 경험,
              기존 앱으로 연습해도 어떻게 올려야 할지 몰랐던 그 막막함.
              그때 이런 앱이 있었으면 좋았을 것 같아서 만들었어요.
            </p>
            <button className="l-btn-primary" onClick={handleStart}>
              지금 무료로 시작하기 →
            </button>
          </div>
          <div className="l-cta-bars">
            {[
              { label: '영어 타수', from: '100타', to: '1000타', pct: 100 },
              { label: '연습 지속일', from: '3일', to: '꾸준히', pct: 85 },
              { label: '자격증 합격', from: '불합격', to: '합격', pct: 100 },
            ].map(({ label, from, to, pct }) => (
              <div key={label} className="l-bar-row">
                <div className="l-bar-meta">
                  <span>{label}</span>
                  <span>{from} → <span className="l-bar-to">{to}</span></span>
                </div>
                <div className="l-bar-track">
                  <div className="l-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <div className="l-footer-logo">Ty<span className="l-nav-accent">pers</span></div>
        <div className="l-footer-copy">© 2026 Typers. 목표 타수까지 가는 길.</div>
        <div className="l-footer-links">
          {['이용약관', '개인정보처리방침'].map(m => (
            <a key={m} href="#" className="l-footer-link">{m}</a>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Landing;
