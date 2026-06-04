import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

type Step = 1 | 2 | 3;

const Register: React.FC = () => {
  const [step, setStep]         = useState<Step>(1);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const pwHasLetter  = /[a-zA-Z가-힣]/.test(password);
  const pwHasNumOrSp = /[0-9!@#$%^&*]/.test(password);
  const pwLongEnough = password.length >= 8;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step === 1) {
      if (!email.includes('@')) { setError('올바른 이메일을 입력해주세요'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!pwHasLetter || !pwHasNumOrSp || !pwLongEnough) {
        setError('비밀번호 조건을 확인해주세요'); return;
      }
      setStep(3);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = await authApi.register(username, email, password);
      setUser(user);
      navigate('/level-test');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  // ── 1단계: 헤드라인 + 이메일 + 소셜 ────────────────────────
  if (step === 1) {
    return (
      <div className="auth-page">
        <div className="auth-box">
          <img src="/logo_nbg.png" alt="Typers" className="auth-logo" />
          <h1 className="auth-headline">
            가입하고<br />목표 타수를<br />달성하세요
          </h1>
          <form onSubmit={handleNext} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">이메일 주소</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="auth-input"
                required
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn-primary">다음</button>
          </form>

          <div className="auth-divider"><span>또는</span></div>

          <div className="auth-social">
            <button type="button" className="auth-social-btn">
              <span className="auth-social-icon naver-icon">N</span>
              네이버로 가입하기
            </button>
            <button type="button" className="auth-social-btn">
              <span className="auth-social-icon kakao-icon">K</span>
              카카오로 가입하기
            </button>
          </div>

          <p className="auth-switch">
            이미 계정이 있나요? <Link to="/login" className="auth-link">로그인</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── 2~3단계: 스텝 뷰 ────────────────────────────────────────
  const STEP_TITLES: Record<number, string> = {
    2: '비밀번호를\n만드세요',
    3: '닉네임을\n정해주세요',
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <img src="/logo_nbg.png" alt="Typers" className="auth-logo" />

        <div className="auth-progress">
          <div className="auth-progress-fill" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        <div className="auth-step-header">
          <button
            className="auth-back-btn"
            onClick={() => { setError(''); setStep(s => (s - 1) as Step); }}
            aria-label="이전 단계"
          >
            ←
          </button>
          <div>
            <div className="auth-step-label">{step}/3단계</div>
            <div className="auth-step-title" style={{ whiteSpace: 'pre-line' }}>
              {STEP_TITLES[step]}
            </div>
          </div>
        </div>

        <form onSubmit={handleNext} className="auth-form">
          {step === 2 && (
            <div className="auth-field">
              <label className="auth-label">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input"
                autoFocus
                required
              />
              <ul className="auth-pw-rules">
                <li className={pwHasLetter ? 'rule-ok' : ''}>문자 1개 이상</li>
                <li className={pwHasNumOrSp ? 'rule-ok' : ''}>숫자 또는 특수문자 1개 이상</li>
                <li className={pwLongEnough ? 'rule-ok' : ''}>8자 이상</li>
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="auth-field">
              <label className="auth-label">닉네임</label>
              <input
                type="text"
                placeholder="영문·숫자·밑줄 3~32자"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="auth-input"
                autoFocus
                required
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {step < 3 ? '다음' : loading ? '가입 중…' : '가입하기'}
          </button>
        </form>

        <p className="auth-switch">
          이미 계정이 있나요? <Link to="/login" className="auth-link">로그인</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
