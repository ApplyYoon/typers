/**
 * RankBattleResult — 배틀 종료 결과 화면
 *
 * 표시 정보:
 *  - 승/패/무승부 판정
 *  - 내 CPM, 상대 CPM 비교 바차트
 *  - MMR 변동 (±n 포인트)
 *  - 다시하기 / 로비로 버튼
 */
import React from 'react';
import type { S_GameEnd } from '../../api/battle';

interface Props {
  result:       S_GameEnd;
  myUserId:     string;
  myName:       string;
  oppName:      string;
  onRematch:    () => void;
  onLobby:      () => void;
}

const RankBattleResult: React.FC<Props> = ({
  result, myUserId, myName, oppName, onRematch, onLobby,
}) => {
  const isWin  = result.winner_id === myUserId;
  const isDraw = result.winner_id === null;

  const verdict = isDraw ? '무승부' : isWin ? '승리!' : '패배';
  const verdictColor = isDraw
    ? '#f59e0b'
    : isWin ? 'var(--success-strong)' : 'var(--error)';

  const maxCpm = Math.max(result.your_cpm, result.opp_cpm, 1);

  return (
    <div className="rb-result">
      {/* ── 판정 ─────────────────────────────────────────── */}
      <div className="rb-verdict" style={{ color: verdictColor }}>
        {verdict}
      </div>

      {/* ── CPM 비교 ──────────────────────────────────────── */}
      <div className="rb-cpm-compare">
        <div className="rb-cpm-col rb-cpm-mine">
          <span className="rb-cpm-name">{myName} (나)</span>
          <div className="rb-cpm-bar-wrap">
            <div
              className="rb-cpm-bar"
              style={{
                height: `${(result.your_cpm / maxCpm) * 120}px`,
                background: isWin ? 'var(--success-strong)' : isDraw ? '#f59e0b' : '#e5e7eb',
              }}
            />
          </div>
          <span className="rb-cpm-val">{result.your_cpm}</span>
          <span className="rb-acc-val">{result.your_accuracy}%</span>
        </div>

        <div className="rb-cpm-vs-label">CPM</div>

        <div className="rb-cpm-col rb-cpm-opp">
          <span className="rb-cpm-name">{oppName}</span>
          <div className="rb-cpm-bar-wrap">
            <div
              className="rb-cpm-bar"
              style={{
                height: `${(result.opp_cpm / maxCpm) * 120}px`,
                background: !isWin && !isDraw ? 'var(--success-strong)' : '#e5e7eb',
              }}
            />
          </div>
          <span className="rb-cpm-val">{result.opp_cpm}</span>
          <span className="rb-acc-val">{result.opp_accuracy}%</span>
        </div>
      </div>

      {/* ── MMR 변동 ──────────────────────────────────────── */}
      <div className="rb-mmr-delta">
        <span className="rb-mmr-label">랭크 포인트</span>
        <span
          className="rb-mmr-value"
          style={{ color: result.mmr_delta >= 0 ? 'var(--success-strong)' : 'var(--error)' }}
        >
          {result.mmr_delta >= 0 ? `+${result.mmr_delta}` : result.mmr_delta}
        </span>
      </div>

      {/* ── 버튼 ──────────────────────────────────────────── */}
      <div className="rb-result-btns">
        <button className="rb-btn-primary" onClick={onRematch}>
          다시 도전
        </button>
        <button className="rb-btn-ghost" onClick={onLobby}>
          로비로
        </button>
      </div>
    </div>
  );
};

export default RankBattleResult;
