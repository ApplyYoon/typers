/**
 * RankBattle — 실시간 배틀 오케스트레이터
 *
 * 단계 흐름:
 *  lobby → matching → battle → result
 *
 * 서버 메시지 처리를 한 곳에서 담당하고,
 * 각 단계 컴포넌트에 필요한 상태와 콜백만 내려준다.
 *
 * WebSocket은 `matching` 단계 진입 시부터 활성화되며,
 * `lobby`로 돌아오면 연결을 끊는다 (enabled 플래그 제어).
 */
import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBattleSocket } from '../../hooks/useBattleSocket';
import type { ServerMessage, S_GameEnd, S_Matched } from '../../api/battle';
import Lobby from './Lobby';
import Matching from './Matching';
import BattleRoom from './BattleRoom';
import RankBattleResult from './RankBattleResult';
import './RankBattle.css';

type Step = 'lobby' | 'matching' | 'battle' | 'result';

interface OppProgress {
  cpm:           number;
  accuracy:      number;
  correct_chars: number;
}

const RankBattle: React.FC = () => {
  const { user } = useAuth();

  const [step, setStep]             = useState<Step>('lobby');
  const [matchMode, setMatchMode]   = useState<'quick' | 'custom'>('quick');
  const [roomCode, setRoomCode]     = useState<string | undefined>();

  // 매칭 결과
  const [matchInfo, setMatchInfo]   = useState<S_Matched | null>(null);
  // 배틀 텍스트
  const [battleText, setBattleText] = useState('');
  // 카운트다운 숫자 (null = 게임 진행 중)
  const [countdown, setCountdown]   = useState<number | null>(3);
  // 상대 진행도
  const [oppProgress, setOppProgress] = useState<OppProgress>({ cpm: 0, accuracy: 100, correct_chars: 0 });
  const [oppFinished, setOppFinished] = useState(false);
  // 결과
  const [gameResult, setGameResult] = useState<S_GameEnd | null>(null);

  // WebSocket은 matching 단계 이후에만 활성화
  const wsEnabled = step !== 'lobby';

  // 서버 메시지 핸들러
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {

      case 'queued':
        // 큐 진입 확인 — UI는 이미 matching 화면
        break;

      case 'matched':
        setMatchInfo(msg);
        setCountdown(3);
        setStep('battle');
        break;

      case 'countdown':
        setCountdown(msg.seconds);
        break;

      case 'game_start':
        setBattleText(msg.text);
        setCountdown(null);  // 게임 시작
        break;

      case 'opponent_progress':
        setOppProgress({
          cpm:           msg.cpm,
          accuracy:      msg.accuracy,
          correct_chars: msg.correct_chars,
        });
        break;

      case 'opponent_finished':
        setOppFinished(true);
        setOppProgress(prev => ({ ...prev, cpm: msg.cpm, accuracy: msg.accuracy }));
        break;

      case 'game_end':
        setGameResult(msg);
        setStep('result');
        break;

      case 'opponent_left':
        // 상대 이탈 → 잠시 후 결과 화면으로 (서버가 강제 결산)
        setOppFinished(true);
        break;

      case 'error':
        console.error('[battle]', msg.message);
        break;
    }
  }, []);

  const { send } = useBattleSocket({ onMessage: handleMessage, enabled: wsEnabled });

  // ── 이벤트 핸들러 ────────────────────────────────────────────────

  const handleQuickMatch = useCallback(() => {
    setMatchMode('quick');
    setRoomCode(undefined);
    setStep('matching');
  }, []);

  const handleCustomMatch = useCallback((code: string) => {
    setMatchMode('custom');
    setRoomCode(code);
    setStep('matching');
  }, []);

  const handleCancelMatch = useCallback(() => {
    send({ type: 'leave_queue' });
    setStep('lobby');
  }, [send]);

  const handleRematch = useCallback(() => {
    // 상태 초기화 후 다시 matching으로
    setMatchInfo(null);
    setBattleText('');
    setCountdown(3);
    setOppProgress({ cpm: 0, accuracy: 100, correct_chars: 0 });
    setOppFinished(false);
    setGameResult(null);
    setStep('matching');
  }, []);

  const handleLobby = useCallback(() => {
    setMatchInfo(null);
    setBattleText('');
    setCountdown(3);
    setOppProgress({ cpm: 0, accuracy: 100, correct_chars: 0 });
    setOppFinished(false);
    setGameResult(null);
    setStep('lobby');
  }, []);

  // ── 렌더 ─────────────────────────────────────────────────────────

  return (
    <div className="real-battle-page">
      {step === 'lobby' && (
        <Lobby
          onQuickMatch={handleQuickMatch}
          onCustomMatch={handleCustomMatch}
        />
      )}

      {step === 'matching' && (
        <Matching
          onSend={send}
          onCancel={handleCancelMatch}
          mode={matchMode}
          roomCode={roomCode}
        />
      )}

      {step === 'battle' && matchInfo && (
        <BattleRoom
          roomId={matchInfo.room_id}
          text={battleText}
          opponent={matchInfo.opponent}
          myName={user?.username ?? '나'}
          countdown={countdown}
          onSend={send}
          oppProgress={oppProgress}
          oppFinished={oppFinished}
        />
      )}

      {step === 'result' && gameResult && (
        <RankBattleResult
          result={gameResult}
          myUserId={user?.id ? String(user.id) : ''}
          myName={user?.username ?? '나'}
          oppName={matchInfo?.opponent.username ?? '상대'}
          onRematch={handleRematch}
          onLobby={handleLobby}
        />
      )}
    </div>
  );
};

export default RankBattle;
