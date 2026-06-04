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
      <div className="auth-box">
        <img src="/logo_nbg.png" alt="Typers" className="auth-logo" />
        <h1 className="auth-headline">
          다시 돌아오신 것을<br />환영합니다
        </h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">닉네임</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="auth-input"
              required
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">비밀번호</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="auth-input"
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <div className="auth-divider"><span>또는</span></div>

        <div className="auth-social">
          <button className="auth-social-btn">
            <span className="auth-social-icon naver-icon">N</span>
            네이버로 계속하기
          </button>
          <button className="auth-social-btn">
            <span className="auth-social-icon kakao-icon">K</span>
            카카오로 계속하기
          </button>
        </div>

        <p className="auth-switch">
          계정이 없나요? <Link to="/register" className="auth-link">가입하기</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
