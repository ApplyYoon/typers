import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { getRecords } from '../utils/battleStorage';
import { useAuth } from '../context/AuthContext';
import { practiceApi } from '../api/practice';
import { goalApi, type GoalResponse } from '../api/goal';
import './Home.css';

function buildWeeklyData() {
  const records = getRecords();
  const today   = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const label    = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd   = dayStart + 86400000;
    const dayRecs  = records.filter(r => r.timestamp >= dayStart && r.timestamp < dayEnd);
    const avgCpm   = dayRecs.length
      ? Math.round(dayRecs.reduce((s, r) => s + r.score, 0) / dayRecs.length)
      : 0;
    return { label, cpm: avgCpm };
  });
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const localWeekData = useMemo(buildWeeklyData, []);
  const [apiWeekData, setApiWeekData]   = useState<{ label: string; cpm: number }[] | null>(null);
  const [goal, setGoal]                 = useState<GoalResponse | null | 'loading'>('loading');

  useEffect(() => {
    if (!user) { setGoal(null); return; }
    practiceApi.getStats(7).then(stats => {
      setApiWeekData(stats.daily.map(d => ({ label: d.date.slice(5), cpm: Math.round(d.avg_cpm) })));
    }).catch(() => {});
    goalApi.get().then(setGoal).catch(() => setGoal(null));
  }, [user]);

  const weekData = user ? (apiWeekData ?? []) : localWeekData;
  const hasData  = weekData.some(d => d.cpm > 0);

  const goalData = goal !== 'loading' ? goal : null;

  return (
    <div className="home">

      {/* ── 히어로 ─────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-text">
          <p className="home-eyebrow">
            {goalData ? '목표 기반 플랜' : '한국 타이핑 연습'}
          </p>
          <h1 className="home-title">
            {user ? `${user.username}님,` : '타이핑으로'}<br />
            {goalData
              ? `D-${goalData.days_left}, 오늘도 달려볼까요?`
              : user ? '오늘도 달려볼까요?' : '실력을 키워보세요'}
          </h1>
        </div>
        <div className="home-hero-actions">
          <button className="btn-primary" onClick={() => navigate('/typing')}>
            연습 시작
          </button>
          <button className="btn-ghost" onClick={() => navigate('/battle')}>
            학교대항전
          </button>
        </div>
      </section>

      {/* ── 콘텐츠 ─────────────────────────────── */}
      <section className="home-content">
        <div className="home-section-inner home-grid home-grid--single">

          {/* 목표 + 차트 */}
          <div className="home-left">

            {/* 목표 카드 */}
            {user && goalData && (
              <div className="home-card home-goal-card">
                <div className="home-card-head">
                  <h2 className="home-card-title">목표 달성 플랜</h2>
                  <button className="btn-text" onClick={() => navigate('/goal-setting')}>수정</button>
                </div>

                {/* 진행률 바 */}
                <div className="goal-progress-wrap">
                  <div className="goal-progress-labels">
                    <span>{goalData.current_cpm}타 현재</span>
                    <span>{goalData.target_cpm}타 목표</span>
                  </div>
                  <div className="goal-progress-track">
                    <div
                      className="goal-progress-fill"
                      style={{ width: `${goalData.progress_pct}%` }}
                    />
                  </div>
                  <div className="goal-progress-meta">
                    <span>{goalData.progress_pct}% 달성</span>
                    <span>D-{goalData.days_left} ({goalData.deadline})</span>
                  </div>
                </div>

                {/* 오늘 플랜 */}
                {goalData.is_achieved ? (
                  <div className="goal-achieved">
                    🎉 목표 타수를 달성했어요! 새 목표를 설정해봐요.
                    <button className="btn-text" style={{ marginLeft: 8 }} onClick={() => navigate('/goal-setting')}>
                      새 목표 설정
                    </button>
                  </div>
                ) : (
                  <div className="goal-today">
                    <div className="goal-today-label">오늘의 플랜</div>
                    <div className="goal-today-minutes">
                      {goalData.daily_minutes}<span>분</span>
                    </div>
                    <div className="goal-today-sub">
                      오늘 {goalData.daily_minutes}분 연습하면 목표에 가까워져요
                    </div>
                    {goalData.warning && (
                      <div className="goal-warning">{goalData.warning}</div>
                    )}
                    <button className="btn-primary goal-start-btn" onClick={() => navigate('/typing')}>
                      지금 연습하기 →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 목표 없는 유저 유도 배너 */}
            {user && goal !== 'loading' && !goalData && (
              <div className="home-card home-goal-empty">
                <div className="home-goal-empty-text">
                  <p className="home-goal-empty-title">목표를 설정하면 오늘 뭘 해야 할지 알 수 있어요</p>
                  <p className="home-goal-empty-sub">자격증, 과제, 실습 — 목표 타수와 날짜를 입력하면 플랜을 만들어드려요.</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/goal-setting')}>
                  목표 설정하기
                </button>
              </div>
            )}

            {/* 성장 차트 */}
            <div className="home-card">
              <div className="home-card-head">
                <h2 className="home-card-title">나의 성장</h2>
                <span className="home-card-meta">최근 7일 · 평균 CPM</span>
              </div>
              {hasData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weekData} barSize={24} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v) => v !== undefined ? [`${v} CPM`, '평균 속도'] : ['', '']}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: 'none', fontSize: 12 }}
                    />
                    <Bar dataKey="cpm" fill="#8758FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="home-empty">
                  <p>아직 연습 기록이 없어요</p>
                  {!user && (
                    <button className="btn-text" onClick={() => navigate('/login')}>
                      로그인하고 기록 저장하기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>


        </div>
      </section>

    </div>
  );
};

export default Home;
