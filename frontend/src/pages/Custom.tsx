import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dictApi, type Dictionary } from '../api/dictionary';
import './Custom.css';

/* ── 모달 ─────────────────────────────────────────────────── */

interface ModalProps {
  initial?: Dictionary;
  onSave: (name: string, words: string[]) => Promise<void>;
  onClose: () => void;
}

const DictModal: React.FC<ModalProps> = ({ initial, onSave, onClose }) => {
  const [name, setName]   = useState(initial?.name ?? '');
  const [text, setText]   = useState(initial?.words.join('\n') ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const wordCount = text.split('\n').filter(w => w.trim()).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const words = text.split('\n').map(w => w.trim()).filter(Boolean);
    if (!name.trim())    return setError('사전 이름을 입력해주세요');
    if (!words.length)   return setError('단어를 최소 1개 이상 입력해주세요');
    if (words.length > 500) return setError('단어는 최대 500개까지 입력 가능합니다');
    setSaving(true);
    setError('');
    try {
      await onSave(name.trim(), words);
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요');
      setSaving(false);
    }
  };

  return (
    <div className="dict-modal-backdrop" onClick={onClose}>
      <div className="dict-modal" onClick={e => e.stopPropagation()}>
        <div className="dict-modal-header">
          <h2 className="dict-modal-title">{initial ? '사전 편집' : '새 사전 만들기'}</h2>
          <button className="dict-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="dict-modal-form">
          <label className="dict-field-label">사전 이름</label>
          <input
            ref={nameRef}
            className="dict-field-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="예) 회사 용어, 수능 어휘, 코딩 키워드"
            maxLength={64}
          />

          <label className="dict-field-label">
            단어 목록
            <span className="dict-word-count">{wordCount} / 500</span>
          </label>
          <textarea
            className="dict-field-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"단어를 한 줄에 하나씩 입력하세요\n예)\n데이터베이스\n알고리즘\n인터페이스"}
            rows={10}
          />

          {error && <p className="dict-modal-error">{error}</p>}

          <div className="dict-modal-actions">
            <button type="button" className="dict-btn-cancel" onClick={onClose}>취소</button>
            <button type="submit" className="dict-btn-save" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── 메인 페이지 ──────────────────────────────────────────── */

const Custom: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dicts, setDicts]         = useState<Dictionary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Dictionary | undefined>();
  const [deleting, setDeleting]   = useState<string | null>(null);

  const loadDicts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await dictApi.list();
      setDicts(data);
    } catch {
      // 네트워크 오류 무시
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadDicts(); }, [loadDicts]);

  const handleCreate = async (name: string, words: string[]) => {
    const d = await dictApi.create({ name, words });
    setDicts(prev => [d, ...prev]);
    setModalOpen(false);
  };

  const handleUpdate = async (name: string, words: string[]) => {
    if (!editing) return;
    const d = await dictApi.update(editing.id, { name, words });
    setDicts(prev => prev.map(x => x.id === d.id ? d : x));
    setEditing(undefined);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await dictApi.remove(id);
      setDicts(prev => prev.filter(x => x.id !== id));
    } catch {
      // 실패 무시
    } finally {
      setDeleting(null);
    }
  };

  const handlePractice = (dictId: string) => {
    navigate(`/typing?dictId=${dictId}`);
  };

  /* ── 렌더 ─────────────────────────────────────────────── */

  if (!user) {
    return (
      <div className="custom-page">
        <div className="custom-container">
          <div className="custom-login-prompt">
            <img src="/logo_nbg.png" alt="logo" className="custom-login-logo" />
            <p className="custom-login-text">로그인 후 커스텀 사전을 만들 수 있습니다</p>
            <button className="custom-login-btn" onClick={() => navigate('/login')}>로그인하기</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="custom-page">
      <div className="custom-container">

        {/* 헤더 */}
        <div className="custom-header-row">
          <div>
            <h1 className="custom-page-title">커스텀 사전</h1>
            <p className="custom-page-sub">나만의 단어로 연습해보세요</p>
          </div>
          <button className="custom-create-btn" onClick={() => setModalOpen(true)}>
            + 새 사전
          </button>
        </div>

        {/* 사전 목록 */}
        {loading ? (
          <div className="custom-loading">불러오는 중...</div>
        ) : dicts.length === 0 ? (
          <div className="custom-empty">
            <p className="custom-empty-title">아직 사전이 없어요</p>
            <p className="custom-empty-sub">자주 쓰는 단어, 공부 중인 어휘를 모아 나만의 연습 사전을 만들어보세요</p>
            <button className="custom-create-btn" onClick={() => setModalOpen(true)}>첫 사전 만들기</button>
          </div>
        ) : (
          <div className="custom-dict-grid">
            {dicts.map(d => (
              <div key={d.id} className="dict-card">
                <div className="dict-card-body">
                  <h3 className="dict-card-name">{d.name}</h3>
                  <p className="dict-card-meta">{d.words.length}개 단어</p>
                  <p className="dict-card-preview">
                    {d.words.slice(0, 5).join(' · ')}
                    {d.words.length > 5 ? ' ...' : ''}
                  </p>
                </div>
                <div className="dict-card-actions">
                  <button
                    className="dict-action-btn practice"
                    onClick={() => handlePractice(d.id)}
                  >
                    연습하기
                  </button>
                  <button
                    className="dict-action-btn edit"
                    onClick={() => setEditing(d)}
                  >
                    편집
                  </button>
                  <button
                    className="dict-action-btn delete"
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                  >
                    {deleting === d.id ? '...' : '삭제'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 모달 */}
      {(modalOpen || editing) && (
        <DictModal
          initial={editing}
          onSave={editing ? handleUpdate : handleCreate}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
};

export default Custom;
