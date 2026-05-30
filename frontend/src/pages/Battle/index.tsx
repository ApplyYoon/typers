import React, { useState } from 'react';
import SchoolSelect from './SchoolSelect';
import BattleArena from './BattleArena';
import BattleResult from './BattleResult';
import { saveRecord } from '../../utils/battleStorage';
import { useAuth } from '../../context/AuthContext';
import { practiceApi } from '../../api/practice';
import './Battle.css';

type Step = 'select' | 'arena' | 'result';

interface BattleState {
  schoolId: string;
  schoolName: string;
  username: string;
  score: number;
  accuracy: number;
}

const Battle: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('select');
  const [state, setState] = useState<BattleState>({
    schoolId: '',
    schoolName: '',
    username: '',
    score: 0,
    accuracy: 0,
  });

  const handleConfirmSelect = (schoolId: string, username: string, schoolName: string) => {
    setState((s) => ({ ...s, schoolId, schoolName, username }));
    setStep('arena');
  };

  const handleFinish = (score: number, accuracy: number) => {
    // localStorage에 배틀 기록 저장
    saveRecord({
      schoolId:   state.schoolId,
      schoolName: state.schoolName,
      username:   state.username,
      score,
      accuracy,
      timestamp:  Date.now(),
    });

    // 로그인 상태일 때 서버에도 세션 저장 (실패해도 UX 차단 없이 silent)
    if (user) {
      practiceApi.createSession({
        mode:     'battle',
        lang:     'mixed',   // 혼합 모드 (한타 40s + 영타 20s + 전환 5s = 65s)
        cpm:      score,
        accuracy,
        duration: 65,
      }).catch(() => {/* 네트워크 오류 무시 */});
    }

    setState((s) => ({ ...s, score, accuracy }));
    setStep('result');
  };

  return (
    <div className="battle-page">
      {step === 'select' && (
        <SchoolSelect onConfirm={handleConfirmSelect} />
      )}
      {step === 'arena' && (
        <BattleArena
          key={Date.now()}
          lang="mixed"
          onFinish={handleFinish}
        />
      )}
      {step === 'result' && (
        <BattleResult
          schoolId={state.schoolId}
          schoolName={state.schoolName}
          username={state.username}
          score={state.score}
          accuracy={state.accuracy}
          onRetry={() => setStep('arena')}
          onChangeSchool={() => setStep('select')}
        />
      )}
    </div>
  );
};

export default Battle;
