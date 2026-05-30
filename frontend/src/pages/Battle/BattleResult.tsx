import React from 'react';
import { getSchoolStats } from '../../utils/battleStorage';
import { schoolColor } from '../../utils/schoolApi';

interface Props {
  schoolId: string;
  schoolName: string;
  username: string;
  score: number;
  accuracy: number;
  onRetry: () => void;
  onChangeSchool: () => void;
}

const RANK_IMAGES: Record<number, string> = {
  1: '/rank_gold.png',
  2: '/rank_silver.png',
  3: '/rank_bronze.png',
};

const getRankDisplay = (rank: number) => {
  if (rank <= 3) {
    return <img src={RANK_IMAGES[rank]} alt={`${rank}위`} className="rank-crown-img" />;
  }
  return <span>{rank}위</span>;
};

const getScoreComment = (s: number) => {
  if (s >= 700) return '신의 경지!';
  if (s >= 500) return '타이핑 고수!';
  if (s >= 350) return '준수한 실력!';
  if (s >= 200) return '계속 연습하면 늘 거예요!';
  return '포기하지 마세요!';
};

const BattleResult: React.FC<Props> = ({
  schoolId,
  schoolName,
  username,
  score,
  accuracy,
  onRetry,
  onChangeSchool,
}) => {
  const stats  = getSchoolStats();
  const myRank = stats.findIndex((s) => s.schoolId === schoolId) + 1;
  const myColor = schoolColor(schoolId);

  return (
    <div className="result-page">
      <div className="result-container">
        {/* My score card */}
        <div className="result-score-card">
          <img src="/logo_nbg.png" alt="logo" className="result-mascot" />
          <h2 className="result-username">{username}</h2>
          <div className="result-school-badge" style={{ background: myColor }}>
            {schoolName}
          </div>

          <div className="result-main-score">
            <span className="result-score-num">{score.toLocaleString()}</span>
            <span className="result-score-unit">CPM</span>
          </div>
          <p className="result-comment">{getScoreComment(score)}</p>

          <div className="result-sub-stats">
            <div className="result-sub-stat">
              <span className="result-sub-label">정확도</span>
              <span className="result-sub-value">{accuracy}%</span>
            </div>
            <div className="result-sub-stat">
              <span className="result-sub-label">학교 순위</span>
              <span className="result-sub-value">
                {myRank > 0 ? getRankDisplay(myRank) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* School ranking */}
        <div className="school-ranking-card">
          <h3 className="school-ranking-title">학교 대항전 랭킹</h3>

          <div className="school-ranking-list">
            {stats.slice(0, 8).map((stat, idx) => {
              const isMine = stat.schoolId === schoolId;
              return (
                <div
                  key={stat.schoolId}
                  className={`school-rank-row ${isMine ? 'mine' : ''}`}
                  style={isMine ? { borderColor: myColor } : {}}
                >
                  <span className="school-rank-pos">{getRankDisplay(idx + 1)}</span>
                  <div className="school-rank-info">
                    <span className="school-rank-school">{stat.schoolName}</span>
                    <span className="school-rank-nick">{stat.topUsername}</span>
                  </div>
                  <span className="school-rank-score">
                    {stat.avgScore.toLocaleString()} <small>CPM</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button className="result-retry-btn" onClick={onRetry}>다시 도전</button>
          <button className="result-change-btn" onClick={onChangeSchool}>학교 변경</button>
        </div>
      </div>
    </div>
  );
};

export default BattleResult;
