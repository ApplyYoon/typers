# Typers

한국어 타이핑 연습 + 실시간 랭크전 플랫폼. 개인 성장 시각화를 통해 지속적인 동기를 부여한다.

**[typers.kr](https://typers.kr)**

---

## 핵심 기능

- **실시간 랭크전** — WebSocket 기반 1:1 대결. Redis 매칭 워커가 MMR 기반으로 실시간 매칭
- **학교대항전** — 전국 초·중·고·대학교 선택 후 한국어·영어 혼합 65초 배틀
- **자모 타이핑 엔진** — IME 우회, 키 입력 즉시 판정, 실시간 음절 조합 시각화
- **대시보드** — WPM/CPM 추세, 활동 차트로 성장 시각화
- **사용자 인증** — JWT HttpOnly 쿠키 기반 로그인/회원가입

## 기술 스택

| 분류 | 사용 기술 |
|------|----------|
| **Frontend** | React 19, TypeScript, Vite 8, React Router 7 |
| **Backend** | FastAPI, SQLAlchemy (async), Alembic, Pydantic v2 |
| **실시간** | WebSocket, Redis Pub/Sub, Active/Standby 매칭 워커 |
| **Database** | PostgreSQL 16 |
| **인프라** | AWS ECS Fargate, RDS, ALB, CloudFront + S3, Route 53, ACM |
| **IaC** | Terraform (tfstate → S3 + DynamoDB lock) |
| **CI/CD** | GitHub Actions + OIDC (키 없는 AWS 인증) |
| **시크릿** | AWS SSM Parameter Store |

## 프로젝트 구조

```
typers/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Battle/     # 학교대항전
│   │   │   └── RankBattle/ # 실시간 랭크전 (WebSocket)
│   │   ├── engine/         # 한글 타이핑 엔진
│   │   ├── hooks/          # useBattleSocket 등
│   │   └── api/            # 백엔드 API 클라이언트
│   └── package.json
├── backend/                # FastAPI
│   ├── app/
│   │   ├── api/            # auth, battle, practice, dictionaries
│   │   ├── services/       # matching_worker, connection_manager, mmr
│   │   ├── models/         # SQLAlchemy ORM
│   │   └── core/           # config, security
│   ├── alembic/            # DB 마이그레이션
│   └── Dockerfile
├── terraform/              # AWS 인프라 IaC
├── .github/workflows/      # CI/CD (deploy-backend, deploy-frontend)
└── docker-compose.yml      # 로컬 개발 환경
```

## 아키텍처

```
사용자
  │
  ├─ HTTPS → CloudFront → S3 (React SPA)
  │
  └─ HTTPS/WSS → ALB (idle_timeout=300s) → ECS Fargate (FastAPI)
                                                    │
                                            ┌───────┴────────┐
                                          RDS              Redis Cloud
                                       (PostgreSQL)    (매칭 큐 + Pub/Sub)
```

**실시간 매칭 워커** — Active/Standby 패턴으로 고가용성 확보
- `SET leader_lock NX PX 5000` 으로 리더 선출
- Standby는 keyspace notification으로 락 만료를 감지해 즉시 승격
- 1초 틱마다 MMR ±50~1000 가변 윈도우로 매칭 (대기 시간에 따라 확장)

## 로컬 개발

**사전 요구사항**: Docker, Node.js 20+

```bash
# 백엔드 (PostgreSQL + Redis 포함)
cp backend/.env.example backend/.env   # 환경변수 설정
docker-compose up

# 프론트엔드
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## CI/CD

`main` 브랜치 push 시 변경된 쪽만 자동 배포:

| 변경 경로 | 트리거 | 배포 대상 |
|-----------|--------|----------|
| `backend/**` | deploy-backend.yml | Docker 빌드 → ECR → ECS rolling deploy |
| `frontend/**` | deploy-frontend.yml | `npm build` → S3 sync → CloudFront invalidation |

AWS 인증은 **OIDC** 방식 (장기 액세스 키 없음). Docker 이미지는 `git SHA` 태그로 관리해 언제든 특정 버전으로 롤백 가능.

## 한글 타이핑 엔진

브라우저 IME가 음절 조합을 가로채기 때문에 `keydown` 이벤트만으로는 정확한 입력 판정이 불가능하다. Typers는 IME를 완전히 우회하는 자체 엔진을 구현했다.

```
keydown(e.code) → CODE_TO_QWERTY → KOREAN_KEY_TO_JAMO → 자모 판정 (IME 개입 전)

"봄날" → ['ㅂ','ㅗ','ㅁ','ㄴ','ㅏ','ㄹ'] 로 사전 분해
['ㅂ'] → 'ㅂ' / ['ㅂ','ㅗ'] → '보' / ['ㅂ','ㅗ','ㅁ'] → '봄'
```

레이아웃 밀림 방지: 각 글자 `<span>`에 `display: inline-block; width: 1em` 고정.
CPM은 단순 글자 수가 아닌 실제 키입력 횟수(겹모음·겹받침 포함) 기준으로 산출.

## 설계 결정

| 결정 | 이유 |
|------|------|
| ECS Fargate (단일 인스턴스) | NAT Gateway 비용 절감을 위해 public subnet + `assign_public_ip=true` |
| Redis Cloud (외부) | 매칭 워커가 1초 틱 → Upstash 무료 플랜(10K req/day) 한도 초과. Redis Cloud 무제한 무료 플랜 선택 |
| Active/Standby 매칭 워커 | 단일 인스턴스 환경에서도 워커 재시작 시 자동 복구 보장 |
| SSM Parameter Store | DB URL, 시크릿 키 등 민감 정보를 코드/이미지에서 완전 분리 |
| OIDC 인증 (GitHub Actions) | 장기 액세스 키 없이 임시 토큰으로 AWS 접근. 키 유출 위험 제거 |
| IME 우회 (`keydown` 기반) | `input` 이벤트는 조합 중 문자를 판정할 수 없어 전환 |
