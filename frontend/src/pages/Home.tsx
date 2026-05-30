import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getRecords } from '../utils/battleStorage';
import { useAuth } from '../context/AuthContext';
import { practiceApi } from '../api/practice';
import './Home.css';

const MODES = [
  { label: '기본',      sub: '두 손 기본',   path: '/battle' },
  { label: '왼손 상단', sub: '상단 열 집중', path: '/typing' },
  { label: '왼손 하단', sub: '하단 열 집중', path: '/typing' },
  { label: '가운데',    sub: '홈 포지션',    path: '/typing' },
  { label: '오른손',    sub: '오른손 집중',  path: '/typing' },
];

function buildWeeklyData() {
  const records = getRecords();
  const today   = new Date();

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label    = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd   = dayStart + 86400000;

    const dayRecs = records.filter(r => r.timestamp >= dayStart && r.timestamp < dayEnd);
    const avgCpm  = dayRecs.length
      ? Math.round(dayRecs.reduce((s, r) => s + r.score, 0) / dayRecs.length)
      : 0;

    return { label, cpm: avgCpm };
  });
}

const Home: React.FC = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [activeMode, setActiveMode] = useState(0);

  // 로그인 시 API, 비로그인 시 localStorage
  const localWeekData = useMemo(buildWeeklyData, []);
  const [apiWeekData, setApiWeekData] = useState<{ label: string; cpm: number }[] | null>(null);

  useEffect(() => {
    if (!user) return;
    practiceApi.getStats(7).then(stats => {
      const data = stats.daily.map(d => ({ label: d.date.slice(5), cpm: Math.round(d.avg_cpm) }));
      setApiWeekData(data);
    }).catch(() => {});
  }, [user]);

  const weekData = user ? (apiWeekData ?? []) : localWeekData;
  const hasData  = weekData.some(d => d.cpm > 0);

  return (
    <div className="home">

      {/* ── 히어로 ─────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-text">
          <p className="home-eyebrow">한국 타이핑 배틀 플랫폼</p>
          <h1 className="home-title">
            {user ? `${user.username}님,` : '타이핑으로'}<br />
            {user ? '오늘도 달려볼까요?' : '실력을 증명하세요'}
          </h1>
        </div>
        <div className="home-hero-actions">
          <button className="btn-primary" onClick={() => navigate('/battle')}>
            학교대항전 시작
          </button>
          <button className="btn-ghost" onClick={() => navigate('/ranking')}>
            랭킹 보기
          </button>
        </div>
      </section>

      {/* ── 모드 선택 ──────────────────────────── */}
      <section className="home-modes">
        <div className="home-section-inner">
          <p className="home-section-label">연습 모드</p>
          <div className="mode-tabs">
            {MODES.map((m, i) => (
              <button
                key={m.label}
                className={`mode-tab ${activeMode === i ? 'active' : ''}`}
                onClick={() => { setActiveMode(i); navigate(m.path); }}
              >
                <span className="mode-tab-label">{m.label}</span>
                <span className="mode-tab-sub">{m.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 콘텐츠 ─────────────────────────────── */}
      <section className="home-content">
        <div className="home-section-inner home-grid">

          {/* 활동 차트 */}
          <div className="home-card">
            <div className="home-card-head">
              <h2 className="home-card-title">나의 활동</h2>
              <span className="home-card-meta">최근 7일 · 평균 CPM</span>
            </div>

            {hasData ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekData} barSize={24} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => v !== undefined ? [`${v} CPM`, '평균 속도'] : ['', '']}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      boxShadow: 'none',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="cpm" fill="#8758FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="home-empty">
                <p>기록이 없습니다.</p>
                <button className="btn-text" onClick={() => navigate('/login')}>
                  로그인하고 기록 저장하기
                </button>
              </div>
            )}
          </div>

          {/* 액션 카드 */}
          <div className="home-card home-action-card">
            <h2 className="home-card-title">학교대항전</h2>
            <p className="home-action-desc">
              학교를 선택하고 65초 동안 한국어·영어 타이핑으로 학교의 명예를 걸고 경쟁하세요.
            </p>
            <div className="home-action-stats">
              <div className="home-stat">
                <span className="home-stat-num">65</span>
                <span className="home-stat-unit">초</span>
                <span className="home-stat-label">제한 시간</span>
              </div>
              <div className="home-stat-divider" />
              <div className="home-stat">
                <span className="home-stat-num">40</span>
                <span className="home-stat-unit">초</span>
                <span className="home-stat-label">한국어</span>
              </div>
              <div className="home-stat-divider" />
              <div className="home-stat">
                <span className="home-stat-num">20</span>
                <span className="home-stat-unit">초</span>
                <span className="home-stat-label">영어</span>
              </div>
            </div>
            <button className="btn-primary full-width" onClick={() => navigate('/battle')}>
              지금 시작하기
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Home;
