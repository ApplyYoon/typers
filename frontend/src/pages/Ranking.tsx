import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { practiceApi, type RankEntry, type RankPeriod } from '../api/practice';
import './Ranking.css';

const AVATAR_COLORS = ['#8758FF', '#6DE701', '#03CF5D', '#5B37BF', '#f59e0b'];

const TABS: { key: RankPeriod; label: string }[] = [
  { key: 'daily',   label: '일간' },
  { key: 'weekly',  label: '주간' },
  { key: 'monthly', label: '월간' },
  { key: 'all',     label: '전체' },
];

const Ranking: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod]   = useState<RankPeriod>('daily');
  const [ranks, setRanks]     = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    practiceApi.getRanking(period)
      .then(setRanks)
      .catch(() => setRanks([]))
      .finally(() => setLoading(false));
  }, [period]);

  const top3 = ranks.slice(0, 3);
  const rest = ranks.slice(3);

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="ranking-page">
      <div className="ranking-container">
        <div className="ranking-header">
          <p className="ranking-subtitle">
            {loading ? '불러오는 중...' : `${ranks.length}명의 타이퍼가 랭킹에 올랐습니다`}
          </p>
          <p className="ranking-date">{dateStr}</p>
        </div>

        {/* 탭 */}
        <div className="rank-tabs rank-tabs-top">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`rank-tab ${period === key ? 'active' : ''}`}
              onClick={() => setPeriod(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ranking-loading">랭킹 집계 중...</div>
        ) : ranks.length === 0 ? (
          <div className="ranking-empty">
            <p>이 기간에 기록이 없습니다.</p>
            <p className="ranking-empty-sub">타이핑 연습 후 로그인하면 랭킹에 등록됩니다.</p>
          </div>
        ) : (
          <>
            {/* 포디엄 */}
            <div className="podium">
              {/* 2위 */}
              <div className="podium-item podium-2nd">
                <div className="podium-crown">
                  <img src="/rank_silver.png" alt="2nd" className="podium-crown-img" />
                </div>
                <div className="podium-avatar" style={{ background: AVATAR_COLORS[1] }}>
                  <img src="/logo_nbg.png" alt="logo" className="podium-emoji" />
                </div>
                <p className="podium-name">{top3[1]?.username ?? '—'}</p>
                <div className="podium-block podium-block-2nd">
                  <span className="podium-rank-num">2</span>
                  {top3[1] && <span className="podium-cpm">{top3[1].best_cpm} CPM</span>}
                </div>
              </div>

              {/* 1위 */}
              <div className="podium-item podium-1st">
                <div className="podium-crown">
                  <img src="/rank_gold.png" alt="1st" className="podium-crown-img" />
                </div>
                <div className="podium-avatar podium-avatar-large" style={{ background: AVATAR_COLORS[0] }}>
                  <img src="/logo_nbg.png" alt="logo" className="podium-emoji" />
                </div>
                <p className="podium-name">{top3[0]?.username ?? '—'}</p>
                <div className="podium-block podium-block-1st">
                  <span className="podium-rank-num">1</span>
                  {top3[0] && <span className="podium-cpm">{top3[0].best_cpm} CPM</span>}
                </div>
              </div>

              {/* 3위 */}
              <div className="podium-item podium-3rd">
                <div className="podium-crown">
                  <img src="/rank_bronze.png" alt="3rd" className="podium-crown-img" />
                </div>
                <div className="podium-avatar" style={{ background: AVATAR_COLORS[2] }}>
                  <img src="/logo_nbg.png" alt="logo" className="podium-emoji" />
                </div>
                <p className="podium-name">{top3[2]?.username ?? '—'}</p>
                <div className="podium-block podium-block-3rd">
                  <span className="podium-rank-num">3</span>
                  {top3[2] && <span className="podium-cpm">{top3[2].best_cpm} CPM</span>}
                </div>
              </div>
            </div>

            {/* 4위 이하 */}
            {rest.length > 0 && (
              <div className="rank-list-section">
                <div className="rank-list">
                  {rest.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`rank-row${user?.username === entry.username ? ' rank-row-me' : ''}`}
                    >
                      <span className="rank-num">{entry.rank}</span>
                      <div
                        className="rank-avatar-small"
                        style={{ background: AVATAR_COLORS[entry.rank % AVATAR_COLORS.length] }}
                      >
                        <img src="/logo_nbg.png" alt="logo" className="rank-avatar-img" />
                      </div>
                      <span className="rank-username">
                        {entry.username}
                        {user?.username === entry.username && <span className="rank-me-badge">나</span>}
                      </span>
                      <div className="rank-score">
                        <span className="rank-wpm">{entry.best_cpm} CPM</span>
                        <span className="rank-session-count">{entry.session_count}회</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Ranking;
