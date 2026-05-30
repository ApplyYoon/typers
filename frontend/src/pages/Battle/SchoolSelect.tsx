import React, { useState, useEffect, useRef } from 'react';
import {
  SCHOOL_TYPES,
  searchSchools,
  schoolColor,
  type SchoolType,
  type NeisSchool,
} from '../../utils/schoolApi';
import { getSchoolStats } from '../../utils/battleStorage';

interface Props {
  onConfirm: (schoolId: string, username: string, schoolName: string) => void;
}

const RANK_IMAGES: Record<number, string> = {
  1: '/rank_gold.png',
  2: '/rank_silver.png',
  3: '/rank_bronze.png',
};

const SchoolSelect: React.FC<Props> = ({ onConfirm }) => {
  const [username, setUsername]           = useState('');
  const [schoolType, setSchoolType]       = useState<SchoolType>('고등학교');
  const [query, setQuery]                 = useState('');
  const [results, setResults]             = useState<NeisSchool[]>([]);
  const [selected, setSelected]           = useState<NeisSchool | null>(null);
  const [loading, setLoading]             = useState(false);
  const [showDropdown, setShowDropdown]   = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const stats       = getSchoolStats();

  useEffect(() => {
    if (query.length < 1) { setResults([]); setShowDropdown(false); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const data = await searchSchools(query, schoolType);
      setResults(data);
      setShowDropdown(true);
      setLoading(false);
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, schoolType]);

  const handleSelect = (school: NeisSchool) => {
    setSelected(school);
    setQuery(school.SCHUL_NM);
    setShowDropdown(false);
  };

  const handleTypeChange = (type: SchoolType) => {
    setSchoolType(type);
    setSelected(null);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const canProceed = selected && username.trim().length > 0;
  const schoolId   = selected?.SD_SCHUL_CODE ?? '';

  return (
    <div className="school-select">
      <div className="school-select-layout">

        {/* ── 왼쪽: 배틀 참가 폼 ── */}
        <div className="school-select-form">
          <div className="battle-logo">
            <img src="/logo_nbg.png" alt="logo" className="battle-logo-emoji" />
            <h1 className="battle-logo-title">Typers 학교 대항전</h1>
            <p className="battle-logo-sub">한국어 40초 · 영어 20초 · CPM 측정</p>
          </div>

          {/* 닉네임 */}
          <div className="username-section" style={{ width: '100%' }}>
            <input
              className="username-input"
              type="text"
              placeholder="닉네임을 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={12}
            />
          </div>

          {/* 학교 종류 탭 */}
          <div className="school-type-tabs">
            {SCHOOL_TYPES.map((type) => (
              <button
                key={type}
                className={`school-type-tab ${schoolType === type ? 'active' : ''}`}
                onClick={() => handleTypeChange(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {/* 학교 검색 */}
          <div className="school-search-wrap" style={{ width: '100%' }}>
            <div className="school-search-input-row">
              <input
                ref={inputRef}
                className="school-search-input"
                type="text"
                placeholder={`${schoolType} 이름을 검색하세요`}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                onFocus={() => results.length > 0 && setShowDropdown(true)}
                autoComplete="off"
              />
              {loading && <span className="school-search-spinner" />}
            </div>

            {showDropdown && results.length > 0 && (
              <ul className="school-dropdown">
                {results.map((school) => (
                  <li
                    key={school.SD_SCHUL_CODE}
                    className="school-dropdown-item"
                    onMouseDown={() => handleSelect(school)}
                  >
                    <div className="school-dropdown-name">{school.SCHUL_NM}</div>
                    <div className="school-dropdown-meta">
                      {school.LCTN_SC_NM} · {school.SCHUL_KND_SC_NM}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {showDropdown && !loading && results.length === 0 && query.length > 0 && (
              <div className="school-dropdown school-dropdown-empty">검색 결과가 없습니다</div>
            )}
          </div>

          {/* 선택된 학교 뱃지 */}
          {selected && (
            <div
              className="selected-school-badge"
              style={{ background: schoolColor(selected.SD_SCHUL_CODE) }}
            >
              <span>{selected.SCHUL_NM}</span>
              <span className="selected-school-type">{selected.SCHUL_KND_SC_NM}</span>
            </div>
          )}

          <button
            className="start-btn"
            disabled={!canProceed}
            onClick={() =>
              canProceed && onConfirm(schoolId, username.trim(), selected!.SCHUL_NM)
            }
          >
            배틀 시작
          </button>
        </div>

        {/* ── 오른쪽: 학교 랭킹 ── */}
        <div className="school-ranking-panel">
          <h2 className="ranking-panel-title">학교 랭킹</h2>

          {stats.length === 0 ? (
            <p className="ranking-panel-empty">아직 기록이 없습니다.<br />첫 번째 도전자가 되세요!</p>
          ) : (
            <div className="ranking-panel-list">
              {stats.map((stat, idx) => {
                const rank   = idx + 1;
                const isMine = stat.schoolId === schoolId;
                const color  = schoolColor(stat.schoolId);
                return (
                  <div
                    key={stat.schoolId}
                    className={`ranking-panel-row ${isMine ? 'mine' : ''}`}
                    style={isMine ? { borderColor: color } : {}}
                  >
                    <div className="ranking-panel-pos">
                      {rank <= 3
                        ? <img src={RANK_IMAGES[rank]} alt={`${rank}위`} className="ranking-panel-crown" />
                        : <span className="ranking-panel-rank-num">{rank}</span>
                      }
                    </div>
                    <div className="ranking-panel-info">
                      <span className="ranking-panel-school">{stat.schoolName}</span>
                      <span className="ranking-panel-nick">{stat.topUsername}</span>
                    </div>
                    <span className="ranking-panel-score">
                      {stat.avgScore.toLocaleString()} <small>CPM</small>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SchoolSelect;
