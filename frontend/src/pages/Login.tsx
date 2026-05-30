import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login: React.FC = () => {
  const [form, setForm]       = useState({ username: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authApi.login(form.username, form.password);
      setUser(user);
      navigate('/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Left panel */}
        <div className="auth-panel">
          <div className="auth-panel-blob blob1" />
          <div className="auth-panel-blob blob2" />
          <div className="auth-panel-content">
            <img src="/logo_nbg.png" alt="logo" className="auth-mascot" />
            <h2 className="auth-panel-title">Welcome Back</h2>
            <p className="auth-panel-sub">돌아오신 걸 환영합니다.</p>
          </div>
        </div>

        {/* Right form */}
        <div className="auth-form-section">
          <h1 className="auth-title">로그인</h1>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-input-group">
              <input
                type="text"
                placeholder="닉네임"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="auth-input"
                required
              />
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                placeholder="비밀번호"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="auth-input"
                required
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </form>

          <p className="auth-divider">또는</p>

          <div className="social-btns">
            <button className="social-btn naver" title="네이버 로그인">N</button>
            <button className="social-btn kakao"  title="카카오 로그인">K</button>
            <button className="social-btn google" title="구글 로그인">G</button>
          </div>

          <p className="auth-switch">
            계정이 없으신가요?{' '}
            <Link to="/register" className="auth-link">계정 만들기</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
