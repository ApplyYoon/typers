import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { practiceApi } from '../api/practice';
import type { StatsResponse } from '../api/practice';
import './Profile.css';

const LEVEL_INFO = [
  { label: '입문', color: '#9ca3af', emoji: '🌱' },
  { label: '초급', color: '#f59e0b', emoji: '🔥' },
  { label: '중급', color: '#3b82f6', emoji: '⚡' },
  { label: '고급', color: '#8758FF', emoji: '🚀' },
  { label: '마스터', color: '#6DE701', emoji: '👑' },
];

// CPM 기준 다음 레벨 목표
const LEVEL_CPM_GOAL = [100, 200, 300, 400, 999];

type ChartRange = '1주' | '1달' | '3달';
const RANGE_DAYS: Record<ChartRange, number> = { '1주': 7, '1달': 30, '3달': 90 };

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]   = useState<StatsResponse | null>(null);
  const [range, setRange]   = useState<ChartRange>('1주');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    practiceApi.getStats(RANGE_DAYS[range])
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [user, range]);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: 80 }}>
            로그인이 필요합니다.
          </p>
        </div>
      </div>
    );
  }

  const level    = Math.min(user.level, 4);
  const info     = LEVEL_INFO[level];
  const goalCpm  = LEVEL_CPM_GOAL[level];
  const bestCpm  = stats?.best_cpm ?? user.initial_cpm;
  const xpPct    = level >= 4 ? 100 : Math.min((bestCpm / goalCpm) * 100, 100);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const cpmData = stats?.daily.map(d => ({
    date: d.date.slice(5),   // MM-DD
    cpm: Math.round(d.avg_cpm),
  })) ?? [];

  const accData = stats?.daily.map(d => ({
    date: d.date.slice(5),
    accuracy: Math.round(d.avg_accuracy),
  })) ?? [];

  const ranges: ChartRange[] = ['1주', '1달', '3달'];

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Header card */}
        <div className="profile-header-card">
          <div className="profile-mascot-wrap">
            <div className="profile-mascot-bg" />
            <img src="/logo_nbg.png" alt="logo" className="profile-mascot" />
          </div>

          <div className="profile-info">
            <h2 className="profile-username">{user.username}</h2>
            <div className="profile-level-badge" style={{ color: info.color }}>
              {info.emoji} Lv.{level} {info.label}
            </div>
            <div className="profile-level-row">
              <span className="profile-level-label">
                {level >= 4 ? '최고 레벨 달성' : `다음 레벨까지 ${goalCpm} CPM`}
              </span>
              <div className="profile-xp-bar">
                <div className="profile-xp-fill" style={{ width: `${xpPct}%`, background: info.color }} />
              </div>
              <span className="profile-xp-text">{bestCpm} CPM</span>
            </div>

            <div className="profile-stat-row">
              <div className="profile-mini-stat">
                <span className="profile-mini-value">{stats?.best_cpm ?? '—'}</span>
                <span className="profile-mini-label">최고 CPM</span>
              </div>
              <div className="profile-mini-stat">
                <span className="profile-mini-value">{stats?.total_sessions ?? '—'}</span>
                <span className="profile-mini-label">총 세션</span>
              </div>
              <div className="profile-mini-stat">
                <span className="profile-mini-value">{user.initial_cpm}</span>
                <span className="profile-mini-label">시작 CPM</span>
              </div>
            </div>

            <button className="profile-logout-btn" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>

        {/* Range tabs */}
        <div className="chart-range-tabs">
          {ranges.map(r => (
            <button
              key={r}
              className={`range-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="profile-loading">데이터 불러오는 중...</div>
        ) : cpmData.length === 0 ? (
          <div className="chart-card">
            <p className="chart-empty">이 기간에 연습 기록이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* CPM Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">타수 (CPM)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cpmData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="cpm" stroke="#8758FF" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#8758FF' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Accuracy Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">정확도 (%)</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={accData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[50, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v) => v !== undefined ? [`${v}%`, '정확도'] : ['', '']}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="#03CF5D" strokeWidth={2.5}
                    dot={{ r: 3, fill: '#03CF5D' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Session count bar */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">일별 세션 수</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={stats?.daily.map(d => ({ date: d.date.slice(5), count: d.session_count }))}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#8758FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
