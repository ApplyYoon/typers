import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { curriculumApi, type CurriculumStageResult } from '../api/curriculum';
import { CURRICULUM_META } from '../data/curriculum';
import './Roadmap.css';

const STATUS_ICON: Record<CurriculumStageResult['status'], string> = {
  completed: '✓',
  current:   '▶',
  locked:    '🔒',
};

const Roadmap: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stages, setStages] = useState<CurriculumStageResult[] | null>(null);

  useEffect(() => {
    if (!user) return;
    curriculumApi.get().then(setStages).catch(() => setStages([]));
  }, [user]);

  const handleStageClick = (stage: CurriculumStageResult, mode: string) => {
    if (stage.status === 'locked') return;
    navigate(`/typing?mode=${mode}&stage=${stage.id}`);
  };

  return (
    <div className="roadmap-page">
      <div className="roadmap-container">
        <div className="roadmap-header">
          <p className="roadmap-eyebrow">독수리 타법 탈출</p>
          <h1 className="roadmap-title">한 단계씩, 손에 익혀봐요</h1>
          <p className="roadmap-sub">왼손 → 오른손 → 양손 순서로 자판을 익히는 로드맵이에요</p>
        </div>

        {!user && (
          <div className="roadmap-empty">
            <p>로그인하면 나만의 로드맵 진행 상황이 저장돼요</p>
            <button className="btn-primary" onClick={() => navigate('/login')}>로그인</button>
          </div>
        )}

        {user && stages === null && (
          <div className="roadmap-empty">
            <p>불러오는 중...</p>
          </div>
        )}

        {user && stages && (
          <div className="roadmap-path">
            {CURRICULUM_META.map((meta, i) => {
              const stage = stages.find(s => s.id === meta.id);
              const status = stage?.status ?? 'locked';
              const side = i % 2 === 0 ? 'left' : 'right';
              return (
                <div key={meta.id} className={`roadmap-row roadmap-row--${side}`}>
                  <button
                    className={`roadmap-node roadmap-node--${status}`}
                    onClick={() => handleStageClick(stage!, meta.mode)}
                    disabled={status === 'locked'}
                  >
                    <span className="roadmap-node-icon">{STATUS_ICON[status]}</span>
                    <span className="roadmap-node-id">Lv.{meta.id}</span>
                  </button>
                  <div className="roadmap-card">
                    <p className="roadmap-card-title">{meta.title}</p>
                    <p className="roadmap-card-desc">{meta.description}</p>
                    {stage && stage.best_cpm > 0 && (
                      <p className="roadmap-card-best">
                        최고 기록 {stage.best_cpm}타 · 정확도 {stage.best_accuracy}%
                      </p>
                    )}
                    <p className="roadmap-card-target">
                      통과 기준: {stage?.pass_cpm}타 / 정확도 {stage?.pass_accuracy}% 이상
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Roadmap;
