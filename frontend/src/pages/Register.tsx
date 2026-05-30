import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register: React.FC = () => {
  const [form, setForm]     = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setLoading(true);
    try {
      const user = await authApi.register(form.username, form.email, form.password);
      setUser(user);
      navigate('/level-test');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-reverse">
        {/* Left form */}
        <div className="auth-form-section">
          <h1 className="auth-title">계정 만들기</h1>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <input
                type="text"
                placeholder="닉네임 (영문·숫자·밑줄 3~32자)"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-input-group">
              <input
                type="email"
                placeholder="이메일"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="auth-input"
                required
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? '가입 중…' : '계정 만들기'}
            </button>
          </form>

          <p className="auth-divider">또는</p>

          <div className="social-btns">
            <button className="social-btn naver" title="네이버 로그인">N</button>
            <button className="social-btn kakao"  title="카카오 로그인">K</button>
            <button className="social-btn google" title="구글 로그인">G</button>
          </div>

          <p className="auth-switch">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="auth-link">로그인</Link>
          </p>
        </div>

        {/* Right panel */}
        <div className="auth-panel">
          <div className="auth-panel-blob blob1" />
          <div className="auth-panel-blob blob2" />
          <div className="auth-panel-content">
            <img src="/logo_nbg.png" alt="logo" className="auth-mascot" />
            <h2 className="auth-panel-title">Welcome to Typers</h2>
            <p className="auth-panel-sub">타이퍼즈에 함께해서 반갑습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
