import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

/* ── 두벌식 keyboard demo data ──────────────────────────── */
const KB_CHOSUNG   = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const KB_JUNGSEONG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const KB_JONGSEONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const JUNG_KEYS: Record<string, string[]> = {
  'ㅏ':['ㅏ'],'ㅐ':['ㅐ'],'ㅑ':['ㅑ'],'ㅒ':['ㅒ'],
  'ㅓ':['ㅓ'],'ㅔ':['ㅔ'],'ㅕ':['ㅕ'],'ㅖ':['ㅖ'],
  'ㅗ':['ㅗ'],'ㅘ':['ㅗ','ㅏ'],'ㅙ':['ㅗ','ㅐ'],'ㅚ':['ㅗ','ㅣ'],
  'ㅛ':['ㅛ'],'ㅜ':['ㅜ'],'ㅝ':['ㅜ','ㅓ'],'ㅞ':['ㅜ','ㅔ'],'ㅟ':['ㅜ','ㅣ'],
  'ㅠ':['ㅠ'],'ㅡ':['ㅡ'],'ㅢ':['ㅡ','ㅣ'],'ㅣ':['ㅣ'],
};
const JONG_KEYS: Record<string, string[]> = {
  '':[],'ㄱ':['ㄱ'],'ㄲ':['ㄱ'],'ㄳ':['ㄱ','ㅅ'],'ㄴ':['ㄴ'],
  'ㄵ':['ㄴ','ㅈ'],'ㄶ':['ㄴ','ㅎ'],'ㄷ':['ㄷ'],'ㄹ':['ㄹ'],
  'ㄺ':['ㄹ','ㄱ'],'ㄻ':['ㄹ','ㅁ'],'ㄼ':['ㄹ','ㅂ'],'ㄽ':['ㄹ','ㅅ'],
  'ㄾ':['ㄹ','ㅌ'],'ㄿ':['ㄹ','ㅍ'],'ㅀ':['ㄹ','ㅎ'],'ㅁ':['ㅁ'],
  'ㅂ':['ㅂ'],'ㅄ':['ㅂ','ㅅ'],'ㅅ':['ㅅ'],'ㅆ':['ㅅ'],
  'ㅇ':['ㅇ'],'ㅈ':['ㅈ'],'ㅊ':['ㅊ'],'ㅋ':['ㅋ'],'ㅌ':['ㅌ'],'ㅍ':['ㅍ'],'ㅎ':['ㅎ'],
};
// 된소리 초성 → 물리 키 (시각적으로 같은 키를 켜줌)
const CHO_KEY: Record<string, string> = {
  'ㄱ':'ㄱ','ㄲ':'ㄱ','ㄴ':'ㄴ','ㄷ':'ㄷ','ㄸ':'ㄷ','ㄹ':'ㄹ',
  'ㅁ':'ㅁ','ㅂ':'ㅂ','ㅃ':'ㅂ','ㅅ':'ㅅ','ㅆ':'ㅅ','ㅇ':'ㅇ',
  'ㅈ':'ㅈ','ㅉ':'ㅈ','ㅊ':'ㅊ','ㅋ':'ㅋ','ㅌ':'ㅌ','ㅍ':'ㅍ','ㅎ':'ㅎ',
};

const KB_ROWS = [
  ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],
  ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],
  ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'],
];
const KB_SHIFT: Record<string, string> = {
  'ㅂ':'ㅃ','ㅈ':'ㅉ','ㄷ':'ㄸ','ㄱ':'ㄲ','ㅅ':'ㅆ','ㅐ':'ㅒ','ㅔ':'ㅖ',
};

function syllableToKeys(char: string): string[] {
  const code = char.charCodeAt(0);
  if (code === 32) return ['SPACE'];
  if (code < 0xAC00 || code > 0xD7A3) return [char];
  const off  = code - 0xAC00;
  const jIdx = off % 28;
  const uIdx = Math.floor(off / 28) % 21;
  const cIdx = Math.floor(off / 28 / 21);
  const cho  = KB_CHOSUNG[cIdx];
  const jung = KB_JUNGSEONG[uIdx];
  const jong = KB_JONGSEONG[jIdx];
  return [
    CHO_KEY[cho] || cho,
    ...(JUNG_KEYS[jung] || [jung]),
    ...(jong ? (JONG_KEYS[jong] || [jong]) : []),
  ];
}

interface Step { displayUpTo: string; activeKey: string; }

function sentenceToKeystrokes(sentence: string): Step[] {
  const steps: Step[] = [];
  let built = '';
  for (const char of sentence) {
    for (const key of syllableToKeys(char)) {
      steps.push({ displayUpTo: built + char, activeKey: key });
    }
    built += char;
  }
  return steps;
}

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

function useCounter(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(target < 10 ? parseFloat((e * target).toFixed(1)) : Math.floor(e * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ── Components ─────────────────────────────────────────── */

// 인트로 오버레이: "Typers" 타이핑 → 보라 플래시 → 사라짐
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

// 두벌식 키보드 (키가 켜지고 꺼짐)
const KoreanKeyboard: React.FC<{ litKey: string | null }> = ({ litKey }) => (
  <div className="kb-wrap">
    {KB_ROWS.map((row, ri) => (
      <div key={ri} className="kb-row">
        {row.map(k => (
          <div key={k} className={`kb-key${litKey === k ? ' kb-key-lit' : ''}`}>
            {KB_SHIFT[k] && <span className="kb-shift">{KB_SHIFT[k]}</span>}
            {k}
          </div>
        ))}
      </div>
    ))}
    <div className={`kb-space${litKey === 'SPACE' ? ' kb-key-lit' : ''}`} />
  </div>
);

// 타이핑 데모 (텍스트 + 키보드)
const DEMO_SENTENCES = [
  '타이핑 연습을 시작해요',
  '매일 조금씩 성장해요',
  '틀려도 괜찮아요',
  '빠르게 그리고 정확하게',
];

const TypingDemo: React.FC<{ started: boolean }> = ({ started }) => {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [litKey, setLitKey] = useState<string | null>(null);

  const sentence = DEMO_SENTENCES[sentenceIdx];
  const steps = useMemo(() => sentenceToKeystrokes(sentence), [sentence]);

  useEffect(() => {
    if (!started) return;
    if (stepIdx >= steps.length) {
      const t = setTimeout(() => {
        setSentenceIdx(i => (i + 1) % DEMO_SENTENCES.length);
        setStepIdx(0);
        setLitKey(null);
      }, 1400);
      return () => clearTimeout(t);
    }
    const step = steps[stepIdx];
    setLitKey(step.activeKey);
    const speed = step.activeKey === 'SPACE' ? 180 : 110;
    const t = setTimeout(() => setStepIdx(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [started, stepIdx, steps]);

  const currentDisplay = steps.length > 0
    ? steps[Math.min(stepIdx, steps.length - 1)].displayUpTo
    : '';
  const remaining = sentence.slice(currentDisplay.length);

  return (
    <div className="demo-wrap">
      <div className="demo-text">
        <span className="demo-typed">{currentDisplay}</span>
        <span className="demo-cursor">│</span>
        <span className="demo-remaining">{remaining}</span>
      </div>
      <KoreanKeyboard litKey={litKey} />
    </div>
  );
};

// 통계 카드 (스크롤 시 숫자 카운트 업)
const StatCard: React.FC<{
  target: number; suffix: string; label: string; inView: boolean;
}> = ({ target, suffix, label, inView }) => {
  const value = useCounter(target, 1600, inView);
  return (
    <div className="stat-card">
      <div className="stat-number">{value}{suffix}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

// 피처 카드 (스크롤 시 페이드인)
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

/* ── Landing page ────────────────────────────────────────── */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [introComplete, setIntroComplete] = useState(false);
  const [heroVisible,   setHeroVisible]   = useState(false);
  const [statsRef, statsInView] = useInView(0.3);

  // Hero content fades in shortly after intro finishes
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

      {/* ── Fixed Nav ── */}
      <nav className={`l-nav${heroVisible ? ' l-nav-visible' : ''}`}>
        <div className="l-nav-logo">
          Ty<span className="l-nav-accent">pers</span>
        </div>
        <div className="l-nav-links">
          {([['연습하기', '/typing'], ['랭킹', '/ranking'], ['커뮤니티', '#'], ['나의 기록', '/profile']] as [string, string][]).map(([label, href]) => (
            <a key={label} href={href} className="l-nav-link"
              onClick={e => { if (href !== '#') { e.preventDefault(); navigate(href); } }}>
              {label}
            </a>
          ))}
        </div>
        <button className="l-nav-cta" onClick={handleStart}>무료 시작</button>
      </nav>

      {/* ── Hero ── */}
      <section className="l-hero">
        {/* dot grid bg */}
        <div className="l-hero-dotgrid" />

        <div className={`l-hero-inner${heroVisible ? ' l-hero-inner-visible' : ''}`}>
          <h1 className="l-hero-h1">
            타이핑,<br />
            <span className="l-hero-accent">다시 설레게</span>
          </h1>

          <p className="l-hero-sub">
            틀려도 괜찮아요 — 그게 연습이니까.<br />
            매일 10분으로 손이 먼저 기억하게 만들어요.
          </p>

          <div className="l-hero-cta-row">
            <button className="l-btn-primary" onClick={handleStart}>
              지금 바로 시작하기 →
            </button>
            <button className="l-btn-ghost" onClick={() => navigate('/typing')}>
              데모 보기
            </button>
          </div>

          {/* 두벌식 키보드 데모 */}
          <div className={`l-hero-demo${heroVisible ? ' l-hero-demo-visible' : ''}`}>
            <TypingDemo started={heroVisible} />
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        ref={statsRef as React.Ref<HTMLElement>}
        className={`l-stats${statsInView ? ' l-stats-visible' : ''}`}
      >
        <StatCard target={128400} suffix="+" label="누적 사용자"    inView={statsInView} />
        <StatCard target={42}     suffix="%" label="평균 타속 향상" inView={statsInView} />
        <StatCard target={15000}  suffix="+" label="연습 문장"      inView={statsInView} />
        <StatCard target={4.9}    suffix="★" label="앱 평점"        inView={statsInView} />
      </section>

      {/* ── Features ── */}
      <section className="l-features">
        <div className="l-features-header">
          <div className="l-section-eyebrow">Features</div>
          <h2 className="l-features-title">성장이 보이는<br />타이핑 연습</h2>
        </div>
        <div className="l-feat-grid">
          <FeatureCard num={1} delay={0}   title="실시간 속도 측정"
            desc="타이핑할 때마다 WPM, 정확도가 실시간으로 표시돼요. 지금 내 실력을 정확하게 파악하세요." />
          <FeatureCard num={2} delay={80}  title="성장 그래프"
            desc="매일의 기록이 쌓여 그래프로 보여져요. 어제보다 오늘 더 빨라진 나를 직접 눈으로 확인해요." />
          <FeatureCard num={3} delay={160} title="맞춤형 커리큘럼"
            desc="초보부터 고수까지 레벨에 맞는 코스를 제공해요. 틀린 글자는 집중 훈련으로 정복하세요." />
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="l-phil">
        <div className="l-phil-card">
          <div className="l-phil-copy">
            <div className="l-section-eyebrow" style={{ color: '#8758FF' }}>Our Philosophy</div>
            <h2 className="l-phil-title">틀리는 게<br />연습이에요.</h2>
            <p className="l-phil-body">
              Typers는 실수를 실패로 보지 않아요.<br />
              모든 오타, 모든 느린 타이핑이 여러분이<br />
              성장하고 있다는 신호예요.
            </p>
            <button className="l-btn-primary" onClick={handleStart}>
              나도 시작해보기 →
            </button>
          </div>
          <div className="l-phil-bars">
            {[
              { label:'오타율',    from:'18%', to:'4%',   pct: 4  },
              { label:'타속 (WPM)',from:'120', to:'210',  pct: 70 },
              { label:'정확도',   from:'82%', to:'97%',  pct: 97 },
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
        <div className="l-footer-copy">© 2026 Typers. 타이핑을 다시 설레게.</div>
        <div className="l-footer-links">
          {['이용약관','개인정보처리방침','고객센터'].map(m => (
            <a key={m} href="#" className="l-footer-link">{m}</a>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Landing;
