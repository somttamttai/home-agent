# home-agent

집안 소모품 재고/가격 관리를 위한 개인용 PWA.

- **Frontend**: React + Vite PWA (`frontend/`)
- **Backend**: FastAPI
  - 로컬 개발: `backend/main.py` 하나로 전체 API 통합 실행
  - Vercel 배포: `api/*.py` 가 각각 Serverless Function 으로 분할 실행
- **DB**: Supabase (REST API, anon key)
- **가격 소스**: 네이버 쇼핑 API

## 기능

| 기능 | 상태 |
|---|---|
| 소모품 재고 카드 (소진예상일 / 재주문 알림) | ✅ |
| 재고 +/- 직접 조정, 삭제 | ✅ |
| 소모품 추가 폼 | ✅ |
| 네이버 최저가 비교 (단위당 가격) | ✅ |
| 구매링크 바로가기 | ✅ |
| 재고 부족 브라우저 푸시알림 | ✅ |
| 구글/카카오 로그인 (Supabase Auth) | ✅ |
| 가족 공유 (household + 초대코드) | ✅ |
| Realtime 동기화 (다른 가족 수정 즉시 반영) | ✅ |
| 가족설정 / 브랜드설정 DB 저장 | ✅ |
| 바코드 스캔 | 🔒 준비중 |
| 상품 사진 인식 (Claude Vision) | 🔒 준비중 |
| 영수증 사진 인식 (Claude Vision) | 🔒 준비중 |

---

## 프로젝트 구조

```
home-agent/
├── api/                       # Vercel Serverless Functions
│   ├── consumables.py         # /api/consumables/*
│   ├── prices.py              # /api/prices/*
│   ├── scan.py                # /api/scan/*
│   ├── health.py              # /api/health
│   └── _lib/                  # 공통 로직 (Vercel 은 _ prefix 를 함수로 인식 안 함)
│       ├── naver.py
│       ├── supabase.py
│       ├── ocr.py
│       ├── consumables_router.py
│       ├── prices_router.py
│       └── scan_router.py
├── backend/                   # 로컬 개발 전용 통합 엔트리
│   ├── main.py                # uvicorn backend.main:app
│   └── scheduler.py           # APScheduler (로컬만; Vercel 은 Cron 사용)
├── frontend/                  # Vite + React PWA
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/             # Home / Add / Scan / Receipt / PriceCompare
│   │   └── components/        # StockCard / BuyButton / AlertBadge / Toast
│   └── public/                # manifest.json, sw.js
├── requirements.txt           # Vercel Python 런타임
├── vercel.json                # rewrites + 빌드 설정
└── .env                       # 로컬 환경변수 (커밋 금지)
```

---

## Supabase Auth 설정 (구글 + 카카오 로그인)

### 1) Supabase 대시보드 기본 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Authentication → Providers** 에서 아래 두 가지 활성화

### 2) 구글 로그인 설정

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
2. **OAuth 2.0 클라이언트 ID** 생성 (웹 애플리케이션)
3. **승인된 리디렉션 URI** 에 추가:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. 생성된 **Client ID** 와 **Client Secret** 복사
5. Supabase Dashboard → **Authentication → Providers → Google**
   - Enabled: ON
   - Client ID: 붙여넣기
   - Client Secret: 붙여넣기
   - 저장

### 3) 카카오 로그인 설정

1. [Kakao Developers](https://developers.kakao.com/) 접속 → 애플리케이션 추가
2. **앱 설정 → 플랫폼** 에서 Web 플랫폼 등록:
   - 사이트 도메인: `https://your-app.vercel.app` (배포 URL)
3. **제품 설정 → 카카오 로그인** 활성화
4. **Redirect URI** 등록:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
5. **앱 키** 에서 **REST API 키** 복사
6. **제품 설정 → 카카오 로그인 → 보안** 에서 **Client Secret** 생성
7. Supabase Dashboard → **Authentication → Providers → Kakao**
   - Enabled: ON
   - Client ID: REST API 키 붙여넣기
   - Client Secret: 위에서 생성한 Secret 붙여넣기
   - 저장

### 4) Supabase URL 설정

1. Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: `https://your-app.vercel.app` (배포 URL)
3. **Redirect URLs** 에 추가:
   ```
   https://your-app.vercel.app
   https://your-app.vercel.app/**
   http://localhost:5173
   http://localhost:5173/**
   ```

### 5) DB 마이그레이션

Supabase Dashboard → **SQL Editor** 에서 `supabase_auth_migration.sql` 파일 내용을 실행.

### 6) Realtime 활성화

Supabase Dashboard → **Database → Replication** 에서 다음 테이블의 Realtime 활성화:
- `consumables`
- `family_settings`
- `brand_preferences`

---

## 로컬 개발

### 1) 환경변수 (`.env`)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
NAVER_CLIENT_ID=xxxxxxxx
NAVER_CLIENT_SECRET=xxxxxxxx

# 프론트엔드용 (Vite 에서 사용 — VITE_ prefix 필수)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...

# ANTHROPIC_API_KEY 는 OCR 활성화 시에만 필요
ANTHROPIC_API_KEY=sk-ant-api03-...
# ENABLE_OCR=true   # 주석 해제 시 상품/영수증 인식 활성화
```

### 2) 백엔드 (Python)

```bash
# ai-stock-trader 의 venv 재사용
/c/Users/박상민/ai-stock-trader/.venv/Scripts/python.exe -m pip install \
  fastapi uvicorn[standard] python-dotenv apscheduler requests python-multipart

/c/Users/박상민/ai-stock-trader/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/api/health

### 3) 프론트엔드 (Vite)

```bash
cd frontend
npm install
npm run dev
```

- 앱: http://localhost:5173
- Vite 가 `/api/*` 를 `localhost:8000` 으로 프록시 (vite.config.js)

---

## Vercel 배포

### 1) 환경변수 (Vercel Dashboard → Project → Settings → Environment Variables)

**필수**
| 키 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `VITE_SUPABASE_URL` | 프론트엔드용 Supabase URL (SUPABASE_URL 과 동일) |
| `VITE_SUPABASE_ANON_KEY` | 프론트엔드용 anon key (SUPABASE_ANON_KEY 와 동일) |
| `NAVER_CLIENT_ID` | 네이버 개발자센터 애플리케이션 ID |
| `NAVER_CLIENT_SECRET` | 네이버 개발자센터 시크릿 |

**선택 (OCR 활성화 시)**
| 키 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Vision 호출용 |
| `ENABLE_OCR` | `true` 로 설정 시 `/api/scan/product-image`, `/api/scan/receipt` 활성화 |

각 변수는 Production / Preview / Development 환경 모두에 등록.

### 2) 배포

```bash
# 1. git repo 생성 후 commit
git init
git add .
git commit -m "initial commit"
git remote add origin <your-repo-url>
git push -u origin main

# 2. Vercel Dashboard 에서 Import Git Repository
#    - Framework Preset: Other (vercel.json 이 자동 인식)
#    - Environment Variables 위에서 설정
#    - Deploy
```

또는 CLI:

```bash
npm i -g vercel
vercel            # 프리뷰
vercel --prod     # 프로덕션
```

### 3) 동작 방식

| URL | 처리 |
|---|---|
| `/` 및 기타 정적 경로 | `frontend/dist` 에서 서빙, SPA fallback → `index.html` |
| `/api/health` | `api/health.py` (Serverless Function) |
| `/api/consumables` | `api/consumables.py` |
| `/api/consumables/5` | `vercel.json` rewrite → `api/consumables.py` (FastAPI 내부 라우팅) |
| `/api/prices/*` | `api/prices.py` |
| `/api/scan/*` | `api/scan.py` |

`api/_lib/` 은 언더스코어 prefix 라 Vercel 이 함수로 인식하지 않고, 공통 모듈로 import 됨.

### 4) 일일 스케줄러

로컬의 APScheduler 는 Vercel Serverless 에서는 동작하지 않음 (쿨드스타트, persistent 프로세스 부재).
필요 시 [Vercel Cron](https://vercel.com/docs/cron-jobs) 으로 `/api/prices/refresh/{id}` 등을
주기 호출하는 방식 권장.

---

## API 엔드포인트 요약

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/health` | 헬스체크 |
| GET | `/api/consumables` | 소모품 목록 (재고 예측 포함) |
| POST | `/api/consumables` | 소모품 추가 |
| GET | `/api/consumables/{id}` | 소모품 상세 |
| PATCH | `/api/consumables/{id}` | 재고/사용량/재주문시점 수정 |
| DELETE | `/api/consumables/{id}` | 소모품 삭제 |
| GET | `/api/consumables/alerts/low-stock` | 재고 부족 품목 |
| GET | `/api/prices/compare?query=&ply=` | 네이버 최저가 비교 |
| GET | `/api/prices/history/{id}` | 가격 이력 |
| POST | `/api/prices/refresh/{id}` | 최저가 재조회 + 저장 |
| POST | `/api/scan/barcode` | 바코드 → 네이버 검색 |
| POST | `/api/scan/product-image` | 🔒 준비중 |
| POST | `/api/scan/receipt` | 🔒 준비중 |
