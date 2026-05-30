/**
 * Lobby — 배틀 모드 선택
 *
 * Quick Match: MMR 기반 랜덤 매칭 (랭크 반영)
 * Custom Match: 방 코드로 특정인과 배틀 (랭크 미반영, 사설)
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onQuickMatch: () => void;
  onCustomMatch: (roomCode: string) => void;
}

const Lobby: React.FC<Props> = ({ onQuickMatch, onCustomMatch }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  if (!user) {
    return (
      <div className="rb-lobby">
        <div className="rb-lobby-card">
          <p className="rb-login-hint">로그인 후 배틀에 참가할 수 있습니다.</p>
          <button className="rb-btn-primary" onClick={() => navigate('/login')}>
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rb-lobby">
      <div className="rb-lobby-header">
        <h1 className="rb-lobby-title">실시간 배틀</h1>
        <p className="rb-lobby-sub">
          타수로 실력을 증명하세요 · 현재 랭크 포인트{' '}
          <strong style={{ color: 'var(--purple-primary)' }}>{user.rank_score ?? 1000}</strong>
        </p>
      </div>

      <div className="rb-mode-grid">
        {/* Quick Match */}
        <button className="rb-mode-card rb-mode-quick" onClick={onQuickMatch}>
          <div className="rb-mode-icon">⚡</div>
          <h2 className="rb-mode-name">빠른 매칭</h2>
          <p className="rb-mode-desc">
            MMR이 비슷한 상대와 자동으로 매칭됩니다.
            <br />
            승패에 따라 랭크 포인트가 변동됩니다.
          </p>
          <div className="rb-mode-badge rb-badge-ranked">랭크</div>
        </button>

        {/* Custom Match */}
        <button
          className="rb-mode-card rb-mode-custom"
          onClick={() => setShowCustom(v => !v)}
        >
          <div className="rb-mode-icon">🤝</div>
          <h2 className="rb-mode-name">커스텀 매칭</h2>
          <p className="rb-mode-desc">
            방 코드를 생성하거나 입력해
            <br />
            원하는 상대와 배틀합니다.
          </p>
          <div className="rb-mode-badge rb-badge-custom">사설</div>
        </button>
      </div>

      {showCustom && (
        <div className="rb-custom-box">
          <p className="rb-custom-label">방 코드 입력</p>
          <div className="rb-custom-row">
            <input
              className="rb-custom-input"
              placeholder="예: TYPERS-1234"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={16}
            />
            <button
              className="rb-btn-primary"
              disabled={roomCode.length < 4}
              onClick={() => onCustomMatch(roomCode)}
            >
              입장
            </button>
          </div>
          <button
            className="rb-btn-ghost"
            onClick={() => {
              const code = `TYPERS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
              setRoomCode(code);
            }}
          >
            방 코드 생성
          </button>
        </div>
      )}
    </div>
  );
};

export default Lobby;
