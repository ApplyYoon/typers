# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

- 실제 서비스 + 포트폴리오 겸용 프로젝트
- **철학**: 데이터 시각화를 통한 감정적 각성(Emotional Arousal) 유발 → 지속적 동기 부여 (Cornell Univ. Xingyu Lan et al., 2022 논문 기반)
- 단순 구현보다 확장성과 유지보수를 고려한 설계 우선
- 코드에 상세한 주석을 작성하여 개발자가 학습 자료로 활용할 수 있도록 함

## Commands

```bash
# 프론트엔드 (frontend/ 에서 실행)
cd frontend
npm run dev       # Start Vite dev server (HMR)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Serve built dist locally

# 백엔드 (루트에서 실행)
docker-compose up  # FastAPI + PostgreSQL + Redis
```

No test suite is configured.

## Feature Roadmap (Phase별 우선순위)

현재 구현된 기능은 전체 스펙의 일부. 우선순위 순으로:

| Phase | 기능 | 상태 |
|-------|------|------|
| v1.0 | 기본 연습 모드, 타이핑 통계, 간단한 대시보드, 사용자 인증 | 부분 구현 |
| v1.1 | **커스텀 사전** (최우선), 사전별 통계 | 미구현 |
| v1.2 | 상세 분석 페이지, 히트맵, 배지 시스템 | 미구현 |
| v1.3 | 랭킹, 주간 목표, 배지 컬렉션 | 미구현 |
| v2.0 | 다크모드, 모바일, 소셜 랭킹 | 미구현 |

**학교대항전(Battle)은 킬러 콘텐츠이지만 플랫폼의 핵심 목표는 커스텀 사전 기반 개인화 연습 + 성장 시각화임.**

## Design System

### 색상 팔레트 (현재 코드의 #7c3aed와 다름 — 점진적으로 교체 예정)

| 역할 | 색상명 | HEX |
|------|-------|-----|
| Primary (메인 보라) | Violets Are Blue | `#8758FF` |
| Primary Hover | Very Light Blue | `#6E58FF` |
| 성공/성장 | Alien Armpit | `#6DE701` |
| 강한 성공 | Malachite | `#03CF5D` |
| 보조 텍스트/링크 | Ocean Blue | `#5B37BF` |
| 에러 | Red | `#EF4444` |
| 카드 배경 | — | `#F9FAFB` |
| 경계선 | — | `#E5E7EB` |

**차트 색상 규칙**: 같은 의미 = 항상 같은 색. 차트당 최대 4가지 색.

### 타이포그래피

- **Font**: G마켓 산스 (Gmarket Sans) — 현재 Noto Sans KR에서 교체 예정
- Bold 700: 제목, 통계 숫자
- Medium 500: 소제목, 본문, 버튼
- Light 300: 캡션, 보조 텍스트
- 통계 숫자: 48px Bold (감정적 임팩트)

### 여백 / 레이아웃

- 기본 그리드: 4px 배수
- 섹션 간: 40px / 컴포넌트 간: 24px / 카드 내부 패딩: 20px
- Border-radius: 카드 12px / 버튼 8px / 배지 4px

### 상호작용 / 애니메이션

- 모든 애니메이션: 150–300ms, `cubic-bezier(0.4, 0, 0.2, 1)`
- GPU 가속: `transform`, `opacity`만 사용
- 과도한 애니메이션 금지 (집중력 방해)

### 콘텐츠 톤

- "틀렸습니다" 금지 → "다시 한 번 확인해보세요"
- 실패를 학습 과정으로 프레이밍. 격려 중심.

## Architecture

### 현재 구현 상태

```
App.tsx (BrowserRouter)
  /              → Home.tsx         ← 대시보드 (모드 선택 + 활동 차트)
  /battle        → Battle/index.tsx ← 학교대항전 (SchoolSelect → BattleArena → BattleResult)
  /typing        → Typing.tsx       ← 기본 연습
  /ranking       → Ranking.tsx
  /profile       → Profile.tsx      (스켈레톤)
  /custom        → Custom.tsx       (스켈레톤)
  /login, /register → Auth pages
```

**현재 모든 데이터는 localStorage 저장. 추후 Firebase 또는 Supabase로 교체 예정.**

`Battle/index.tsx`가 `step` state로 3단계 플로우(SchoolSelect → BattleArena → BattleResult)를 오케스트레이션.

### Core Utilities (`frontend/src/utils/`)

| File | Purpose |
|------|---------|
| `jamoUtils.ts` | 한글 자모 분해·합성. IME 우회 타이핑 엔진 핵심 |
| `keystrokes.ts` | 겹모음·겹받침 포함 실제 타 수 계산 → CPM 환산 |
| `schoolApi.ts` | NEIS API(초중고) + 200여 개 대학교 내장 데이터 |
| `battleStorage.ts` | localStorage CRUD, 학교별 평균/최고 CPM 집계 |

### 한글 타이핑 엔진 핵심 원리

`keydown` → `e.code` → `CODE_TO_QWERTY` → `KOREAN_KEY_TO_JAMO` → 자모 판정 (IME 개입 전)

- 각 글자 `<span>`에 `display: inline-block; width: 1em` 적용 → 자모(ㅂ)↔음절(봄) 폭 차이로 인한 레이아웃 밀림 방지
- 영어 구간은 자연 가변 폭 유지 (`phase === 'korean'`일 때만 `.arena-text-ko` 클래스 부여)

### State Management

전역 상태 관리자 없음. 페이지별 `useState`/`useRef`/`useCallback`/`useMemo`. 이벤트 핸들러 내에서 stale closure를 피해야 하는 값은 `useRef` 사용.

### Styling

페이지/컴포넌트별 CSS 파일. 동적 색상(학교 색 등)은 inline style.
