# 02 — 기술 스택 · 프로젝트 구조 · 실행 방법

---

## 1. 스택

| 계층 | 선택 | 버전 | 왜 |
|---|---|---|---|
| 프레임워크 | **Next.js (App Router)** | **16.3.x** | 2026-08 기준 최신 안정 버전. `create-next-app`이 주는 기본값 |
| UI 런타임 | React | 19.x | Next 16 동봉 |
| 언어 | TypeScript | 5.x, `strict: true` | — |
| Node | **Node.js 24 LTS** | 24.x | Vercel 신규 프로젝트 기본값. **Node 20은 2026-10-01 사용 중지** 예정이라 쓰면 안 된다 |
| 패키지 매니저 | **pnpm** | 9.x | `.npmrc`에 `node-linker=hoisted` 불필요, 기본 설정 사용 |
| DB / 인증 | **Supabase** | Postgres 17 (**PostGIS 불필요**) | 리전 **`ap-northeast-2` (서울)** — 생성 후 변경 불가하므로 처음에 제대로 고른다. 테이블 2개 + `jsonb` 스냅샷뿐이라 공간 확장이 필요 없다 |
| 호스팅 | **Vercel** | — | 리전 **`icn1` (서울)** 고정 |
| 스타일 | **Tailwind CSS** | v4 | — |
| UI 프리미티브 | **Radix UI** (필요한 것만 개별 설치) | — | 모달 포커스 트랩·탭·아코디언을 직접 구현하지 않는다. 접근성 버그의 최대 원천 |
| 지도 | **Kakao Maps JS SDK** | — | 국내 좌표·주소 정확도. **보조 수단.** SDK 로드 실패 시 목록만으로 동작 |
| 폼 검증 / 스키마 | **Zod** | 4.x | API 응답 검증 + 콘텐츠 파일 검증 공용 |
| 국제화 | **next-intl** | v3 | `app/[locale]` 라우팅, `ko`/`en` |
| 테스트 (단위) | **Vitest** | — | `src/domain` 순수 함수 |
| 테스트 (E2E·접근성) | **Playwright** + `@axe-core/playwright` | — | 골든 플로우 1개 + 접근성 스캔. **`@axe-core/playwright`와 `axe-core`는 버전을 맞춰야 한다**(lockstep) — 어긋나면 규칙이 조용히 빠진다 |
| 린트 | ESLint (`next/core-web-vitals`) + **`eslint-plugin-jsx-a11y`** | — | jsx-a11y 8개 규칙을 `error`로 승격 |
| 폰트 | **Pretendard** (SIL OFL 1.1) + 시스템 한자 폴백 | — | 웹 폰트로만 사용. PDF 임베드 안 함 |

### 안 쓰는 것과 이유

| 안 쓰는 것 | 이유 |
|---|---|
| 모노레포 (pnpm workspace, 9개 패키지) | 작성자 1명. 패키지 경계는 조율 장치이고 조율할 상대가 없다. **단일 Next.js 앱 + `src/domain/` 폴더**로 같은 순수성을 얻는다 |
| `@react-pdf/renderer`, `pdf-lib`, `braillify` | [`01_scope.md`](./01_scope.md) §4.4 참조 — 브라우저 인쇄와 텍스트 내려받기로 대체 |
| Supabase Realtime | 페이지 로드 시 조회로 충분 |
| GitHub Actions ETL + HMAC 서명 재검증 엔드포인트 + 스테이징 테이블 원자 교체 | 수집은 `pnpm ingest` 수동 실행 + GitHub Actions 일 1회. 재검증은 공유 시크릿 1개짜리 POST 라우트 |
| Storybook + addon-a11y | 대비율 검사는 빌드 시 토큰 검증 스크립트 20줄로 대체 |
| `cacheComponents: true` / `use cache` | Next 16.2부터 안정화됐지만 새 캐싱 모델이다. **라우트 세그먼트 `revalidate`** 로 충분하다. `cacheComponents`가 꺼진 상태에서 `use cache`를 쓰면 **하드 빌드 에러**가 나므로 코드에 절대 넣지 않는다 |
| Redis / Upstash | 실행 중 외부 API 호출이 0이므로 쿼터 가드가 필요 없다 |

---

## 2. 폴더 구조

```
modu-baekje/
├─ .env.example                     # 필요한 환경변수 전체 (값은 비움)
├─ .nvmrc                           # 24
├─ next.config.ts
├─ vercel.json                      # regions: ["icn1"]
├─ tailwind.config.ts
├─ vitest.config.ts
├─ playwright.config.ts
│
├─ content/                         # 손으로 작성하는 데이터. Git으로 관리. Zod로 검증
│  ├─ pois.json                     # 6곳 기본 정보 + KTO contentId
│  ├─ facilities.json               # 인근 화장실·응급실·자동심장충격기·장애인콜택시
│  ├─ certifications.json           # BF 인증 / 열린관광지 등급
│  ├─ curated-facts.json            # KTO가 비운 항목 중 공개자료로 확인한 것
│  ├─ itineraries.json              # 코스 템플릿
│  ├─ safety-directory.json         # 긴급 연락처 (119·1330·영사콜센터·시군 콜택시)
│  └─ routes/
│     ├─ gongsanseong.json          # 공산성 경로 단계
│     └─ busosanseong.json          # 부소산성 경로 단계
│
├─ supabase/
│  ├─ migrations/                   # 001_snapshots.sql · 002_reports.sql (2개뿐)
│  └─ seed.sql                      # 데모용 최소 시드 (관리자 계정, 예시 제보)
│
├─ scripts/
│  ├─ ingest.ts                     # KTO → Supabase 수집 (pnpm ingest)
│  ├─ probe.ts                      # P0 확인용 API 탐침 (pnpm probe)
│  ├─ validate-content.ts           # content/*.json Zod 검증 (pnpm validate:content)
│  └─ check-contrast.ts             # 색상 토큰 대비율 검증 (빌드 전 실행)
│
├─ tests/
│  ├─ e2e/golden-flow.spec.ts       # 전체 흐름 1개
│  └─ e2e/a11y.spec.ts              # axe 스캔
│
└─ src/
   ├─ domain/                       # ★ 순수 TypeScript. next/react/supabase import 금지
   │  ├─ types.ts                   # SuitabilityResult 등 전체 타입 (= 유일한 계약)
   │  ├─ snapshot-schema.ts         # 스냅샷 payload Zod 스키마 (= 데이터 모델의 정의)
   │  ├─ geo.ts                     # 하버사인 거리 계산 (PostGIS 대체, 10줄)
   │  ├─ capabilities.ts            # 무장애 항목 카탈로그 (KTO 필드 ↔ 도메인 코드)
   │  ├─ personas.ts                # 페르소나 × 항목 등급 매트릭스
   │  ├─ suitability.ts             # calculateSuitability()
   │  ├─ itinerary.ts               # buildItinerary()
   │  ├─ diary.ts                   # buildDiaryDocument()
   │  ├─ gpx.ts                     # toGpx()
   │  ├─ gap.ts                     # computeGapPriority()
   │  └─ __tests__/                 # 골든 케이스
   │
   ├─ lib/
   │  ├─ kto/                       # KTO API 클라이언트 (수집 스크립트 전용)
   │  │  ├─ transport.ts            # URL 생성 + 문자열 우선 파싱
   │  │  ├─ schemas.ts              # Zod 응답 스키마
   │  │  └─ services.ts             # 서비스별 래퍼 함수
   │  ├─ supabase/
   │  │  ├─ server.ts               # RSC/서버액션용 클라이언트
   │  │  ├─ browser.ts              # 브라우저용 클라이언트
   │  │  └─ admin.ts                # service_role (수집 스크립트 전용)
   │  ├─ data.ts                    # 스냅샷 6종 읽기 + Zod 검증
   │  └─ content.ts                 # content/*.json 로더 (코스·긴급연락처)
   │
   ├─ components/                   # 공용 UI
   │  ├─ a11y/                      # SkipLink, RouteFocusReset, LiveRegion
   │  ├─ Attribution.tsx            # 출처 표기
   │  └─ ...
   │
   └─ app/
      ├─ [locale]/
      │  ├─ layout.tsx              # html lang, 랜드마크, 스킵 링크
      │  ├─ page.tsx                # S1 홈
      │  ├─ places/page.tsx         # S2 목록
      │  ├─ places/[slug]/page.tsx  # S3 상세
      │  ├─ places/[slug]/route-guide/page.tsx   # S5 경로 안내
      │  ├─ places/[slug]/docent/page.tsx        # S6 도슨트
      │  ├─ courses/page.tsx        # S4 코스
      │  ├─ report/page.tsx         # S7 제보
      │  ├─ diary/page.tsx          # S9 여행 기록
      │  ├─ diary/print/page.tsx    # S9 인쇄용
      │  ├─ gap-report/page.tsx     # S10 갭 리포트
      │  ├─ credits/page.tsx        # 출처 전체
      │  └─ privacy/page.tsx        # 개인정보 처리방침
      ├─ admin/
      │  └─ reports/page.tsx        # S8 검수
      └─ api/
         ├─ report/route.ts         # 제보 등록 (즉시 공개)
         ├─ export/gpx/route.ts     # GPX 생성
         ├─ export/text/route.ts    # 여행 기록 텍스트 내보내기
         ├─ gap-report/csv/route.ts # CSV 내보내기
         ├─ image-proxy/route.ts    # 공공누리 3유형 이미지 원본 프록시 (03 §4.3)
         └─ revalidate/route.ts     # 수집 후 캐시 무효화 (공유 시크릿)
```

### 이 구조가 강제하는 규칙 (딱 3개)

1. **`src/domain/`은 아무것도 import 하지 않는다.** `next`, `react`, `@supabase/*`, `src/lib/*` 전부 금지. 순수 TypeScript + 자기 자신뿐.
   - 강제 수단: ESLint `no-restricted-imports` 규칙 하나. dependency-cruiser 같은 도구는 안 쓴다.
2. **`src/app/`과 `src/components/`는 `src/lib/kto/`를 import 하지 않는다.** KTO 클라이언트는 `scripts/ingest.ts`만 쓴다. 이것이 "실행 중 외부 API 호출 0"을 구조로 못 박는다.
   - 강제 수단: 같은 ESLint 규칙 + E2E에서 네트워크 요청 검사.
3. **`src/domain/types.ts`가 유일한 계약이다.** 다른 곳에서 같은 타입을 다시 선언하지 않고 import 한다. 기존 계획의 "세트 동일성 CI 게이트"는 이 한 줄로 대체된다.

---

## 3. 환경변수 (`.env.example`)

```bash
# ── Supabase ─────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # 서버 전용. 클라이언트 번들 유입 금지

# ── 한국관광공사 OpenAPI ──────────────────────────────────
# ★ 반드시 "일반 인증키(Decoding)"를 넣는다.
#   Encoding 키를 넣으면 URLSearchParams가 다시 인코딩해서 %2B → %252B 가 되고
#   서버가 resultCode 30 (등록되지 않은 서비스키)로 거절한다. 가장 흔한 실패다.
KTO_SERVICE_KEY_DECODING=

# ── 지도 ─────────────────────────────────────────────────
NEXT_PUBLIC_KAKAO_MAP_JS_KEY=       # 도메인 제한 걸린 JavaScript 키

# ── 운영 ─────────────────────────────────────────────────
REVALIDATE_SECRET=                  # 수집 후 캐시 무효화 POST 인증용
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 관리자는 환경변수가 아니라 admin_users 테이블로 지정한다 (04 §5.1).
# 배포 후 SQL 로 한 줄 넣는다:
#   insert into admin_users (user_id, email) values ('<auth.users의 uuid>', '<이메일>');
```

**절대 규칙:** `KTO_SERVICE_KEY_DECODING`과 `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. 로그와 에러 메시지에 URL 전체를 출력하지 않는다(키가 쿼리스트링에 들어 있다).

---

## 4. 첫날 셋업 (clone → 첫 초록불)

```bash
# 0) 사전 요구: Node 24, pnpm, Docker (Supabase 로컬용)
nvm use                       # .nvmrc = 24
pnpm install

# 1) 환경변수
cp .env.example .env.local
#   → Supabase 프로젝트 생성 (리전 ap-northeast-2 반드시 확인) 후 URL·키 입력
#   → data.go.kr에서 KorWithService2 개발계정 신청 (자동승인, 10~30분 후 사용 가능)
#     발급받은 키 중 "Decoding" 쪽을 복사

# 2) DB
pnpm supabase start           # 로컬 Postgres
pnpm supabase db reset        # 마이그레이션 2개 + seed 적용

# 3) P0 확인 탐침 — 이게 통과해야 나머지가 의미 있다
pnpm probe                    # 11_open_items.md P0-1 ~ P0-6 자동 확인

# 4) 데이터 수집
pnpm validate:content         # content/*.json 스키마 검증
pnpm ingest                   # KTO → Supabase

# 5) 첫 초록불
pnpm typecheck && pnpm test   # 도메인 골든 테스트
pnpm dev                      # http://localhost:3000
```

### package.json 스크립트 (전체 목록)

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "node scripts/check-contrast.ts && next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",       // Next 16 에서 `next lint` 는 제거됐다
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "probe": "tsx scripts/probe.ts",
    "ingest": "tsx scripts/ingest.ts",                // --only=pois|accessibility|routes|docent|context|related
    "validate:content": "tsx scripts/validate-content.ts",
    "supabase": "supabase"
  }
}
```

---

## 5. 캐시 정책

### 원칙 — 사실 데이터는 캐시하고, 점수는 브라우저에서 계산한다

```
서버 컴포넌트                        브라우저
────────────────────────            ──────────────────────────────
data_snapshots 읽기                  localStorage 에서 페르소나 읽기
→ 모든 방문자에게 동일한 HTML         → calculateSuitability() 실행
→ 캐시 유효                          → 라벨·점수·근거 렌더
```

**왜 점수를 서버에서 계산하지 않나:** 페르소나는 `localStorage`에 있는데 서버는 그걸 모른다. 서버에서 계산하면 **모든 방문자가 같은 캐시된 HTML을 받아 조건을 바꿔도 결과가 안 바뀐다.**
`calculateSuitability`는 순수 함수라 브라우저에서 똑같이 돈다. 데이터가 250행이라 통째로 내려보내도 부담이 없다.

| 데이터 | 방식 | 갱신 |
|---|---|---|
| 스냅샷 `pois` `accessibility` `routes` `docent` `related` | 라우트 세그먼트 `export const revalidate = 3600` | 1시간 (안전망) + 수집 후 즉시 무효화 |
| 스냅샷 `context` (혼잡도·방문자) | `export const revalidate = 3600` | 1시간 (데이터 자체는 일 1회 갱신) |
| **방문자 제보** | **캐시 금지.** `export const dynamic = 'force-dynamic'` 또는 클라이언트에서 조회 | 즉시 |
| 여행 기록 | 브라우저 `localStorage` | 서버에 안 올림 |

**절대 규칙:** 사용자별 데이터(제보 작성 이력, 여행 기록)는 캐시 대상에 넣지 않는다. 다른 사용자에게 새어 나간다.

**수집 후 무효화:** `scripts/ingest.ts`가 끝나면 `POST /api/revalidate`를 `Authorization: Bearer $REVALIDATE_SECRET`로 호출하고, 라우트가 `revalidatePath('/ko','layout')`·`revalidatePath('/en','layout')`를 실행한다. **재배포하지 않는다.** 실패해도 1시간 뒤 자동 갱신된다.

## 6. 배포 설정

### `vercel.json`

```jsonc
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"]
}
```

> `functions` 글롭 경로는 **Vercel 프로젝트 루트 기준 상대경로**다. 저장소 루트 기준으로 쓰면 조용히 무시되고 기본 타임아웃이 적용된다. 이번 범위에는 긴 함수가 없으므로 `functions` 항목 자체를 두지 않는다.

### 플랜

| 서비스 | 개발 중 | 심사 기간 |
|---|---|---|
| Supabase | Free | **Pro 권장** — Free는 7일 무활동 시 일시정지된다. Free를 유지하려면 매일 **실제 SELECT를 던지는** 킵얼라이브가 필요하다 (HTTP 핑만으로는 안 깨어난다) |
| Vercel | Hobby | **Pro 권장** — 서울 리전(`icn1`) 고정이 Pro 기능이다 |

### GitHub Actions (워크플로 2개, 그 이상 만들지 않는다)

| 파일 | 트리거 | 하는 일 |
|---|---|---|
| `.github/workflows/ci.yml` | push / PR | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — **단일 잡** |
| `.github/workflows/ingest.yml` | `schedule` (KST 04:00 = UTC `0 19 * * *`) + `workflow_dispatch` | `pnpm ingest` 실행 후 재검증 호출 |

E2E와 접근성 스캔은 CI에 넣지 않고 로컬에서 필요할 때 돌린다. 이유는 [`09_test_and_ci.md`](./09_test_and_ci.md) §4.
