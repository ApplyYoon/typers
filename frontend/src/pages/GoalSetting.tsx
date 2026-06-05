import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { goalApi } from '../api/goal';
import { ApiError } from '../api/client';
import './GoalSetting.css';

const CERT_PRESETS = [
  { label: '컴활 2급', cpm: 200 },
  { label: '한글 1급', cpm: 300 },
  { label: '컴활 1급', cpm: 300 },
  { label: 'ITQ 한글', cpm: 250 },
];

const DEADLINE_PRESETS = [
  { label: '2주 후', days: 14 },
  { label: '1달 후', days: 30 },
  { label: '2달 후', days: 60 },
  { label: '직접 입력', days: 0 },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcPreview(targetCpm: number, currentCpm: number, deadline: string) {
  const today = new Date();
  const end = new Date(deadline);
  const daysLeft = Math.max(Math.ceil((end.getTime() - today.getTime()) / 86400000), 1);
  const gap = Math.max(targetCpm - currentCpm, 0);
  if (gap === 0) return { daysLeft, dailyMinutes: 0, warning: null };
  const dailyMinutes = Math.round((gap / daysLeft) / 0.5);
  const warning = dailyMinutes > 60 ? '기간이 너무 짧아요. 마감일을 늘려보세요.' : null;
  return { daysLeft, dailyMinutes: Math.min(dailyMinutes, 60), warning };
}

const GoalSetting: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0);
  const [customCpm, setCustomCpm] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState(1); // 1달 후
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCpm, setCurrentCpm] = useState(0);

  // 기존 목표 or 현재 타수 로드
  useEffect(() => {
    goalApi.get().then(goal => {
      setCurrentCpm(goal.current_cpm);
    }).catch(() => {});
  }, []);

  const targetCpm = selectedPreset !== null
    ? CERT_PRESETS[selectedPreset].cpm
    : parseInt(customCpm) || 0;

  const deadline = selectedDeadline < 3
    ? addDays(DEADLINE_PRESETS[selectedDeadline].days)
    : customDate || addDays(30);

  const preview = targetCpm > 0 && deadline
    ? calcPreview(targetCpm, currentCpm, deadline)
    : null;

  const handleSubmit = async () => {
    if (!targetCpm || !deadline) return;
    setError('');
    setLoading(true);
    try {
      await goalApi.upsert({ target_cpm: targetCpm, deadline });
      navigate('/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gs-page">
      <div className="gs-card">
        <div className="gs-header">
          <h1 className="gs-title">목표를 설정해요</h1>
          <p className="gs-desc">목표와 기간을 입력하면 오늘 얼마나 연습할지 알려드려요.</p>
        </div>

        {/* 목표 타수 */}
        <div className="gs-section">
          <div className="gs-section-label">목표 타수</div>
          <div className="gs-presets">
            {CERT_PRESETS.map((p, i) => (
              <button
                key={i}
                className={`gs-preset${selectedPreset === i ? ' gs-preset--active' : ''}`}
                onClick={() => { setSelectedPreset(i); setCustomCpm(''); }}
              >
                <span className="gs-preset-name">{p.label}</span>
                <span className="gs-preset-cpm">{p.cpm}타</span>
              </button>
            ))}
            <button
              className={`gs-preset${selectedPreset === null ? ' gs-preset--active' : ''}`}
              onClick={() => setSelectedPreset(null)}
            >
              <span className="gs-preset-name">직접 입력</span>
            </button>
          </div>
          {selectedPreset === null && (
            <input
              type="number"
              min={50}
              max={1000}
              placeholder="목표 타수 입력"
              value={customCpm}
              onChange={e => setCustomCpm(e.target.value)}
              className="gs-input"
            />
          )}
        </div>

        {/* 마감일 */}
        <div className="gs-section">
          <div className="gs-section-label">준비 기간</div>
          <div className="gs-deadline-presets">
            {DEADLINE_PRESETS.map((d, i) => (
              <button
                key={i}
                className={`gs-deadline-btn${selectedDeadline === i ? ' gs-deadline-btn--active' : ''}`}
                onClick={() => setSelectedDeadline(i)}
              >
                {d.label}
              </button>
            ))}
          </div>
          {selectedDeadline === 3 && (
            <input
              type="date"
              value={customDate}
              min={addDays(1)}
              onChange={e => setCustomDate(e.target.value)}
              className="gs-input"
            />
          )}
        </div>

        {/* 플랜 미리보기 */}
        {preview && (
          <div className={`gs-preview${preview.warning ? ' gs-preview--warn' : ''}`}>
            {preview.dailyMinutes === 0 ? (
              <>
                <span className="gs-preview-icon">✓</span>
                <span className="gs-preview-text">이미 목표 타수에 도달했어요!</span>
              </>
            ) : (
              <>
                <span className="gs-preview-icon">→</span>
                <div>
                  <span className="gs-preview-text">
                    하루 <strong>{preview.dailyMinutes}분</strong> 연습으로{' '}
                    <strong>{preview.daysLeft}일</strong> 안에 달성할 수 있어요
                  </span>
                  {preview.warning && (
                    <p className="gs-preview-warning">{preview.warning}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {error && <p className="gs-error">{error}</p>}

        <div className="gs-actions">
          <button
            className="gs-btn-primary"
            onClick={handleSubmit}
            disabled={loading || !targetCpm || !deadline}
          >
            {loading ? '저장 중…' : '시작하기'}
          </button>
          <button className="gs-btn-skip" onClick={() => navigate('/home')}>
            나중에 설정하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalSetting;
