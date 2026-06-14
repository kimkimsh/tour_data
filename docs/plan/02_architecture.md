# 02 — 시스템 아키텍처 (System Architecture)

> SPEC §4를 구현 가능한 수준으로 확장한 문서. 권위 원천은 `docs/plan/SPEC.md` (frozen). 본 문서는 SPEC §2 Locked decisions·§4 three planes·§5 data model·§9 workstreams를 구체화하며, 어떤 항목도 SPEC와 모순되지 않는다.
> 스택은 LOCKED — Next.js 15 (App Router, React 19, Node 20) + Supabase (Postgres 17 + PostGIS) + Vercel (Seoul `icn1`), PWA(Serwist). **MVP 제외**: pgvector/RAG, dynamic pgRouting/DEM, FCM/APNs/알림톡, OCR/360°/multi-AI. **Layer C cap = +0.12**. **No runtime KTO calls** — DB가 1차 캐시이자 source of truth.
> 참조: `_research/00_SYNTHESIS.md`, `_research/R4_supabase_vercel.md`, `_research/D2_tech_stack.md`, `_research/_pairing_reconcile.md`.

---

## 0. 아키텍처 한 줄

> **Supabase에 ETL로 발행된 검증 데이터**(data plane) → **프레임워크 비의존 순수 TS 도메인**(domain plane)이 `calculateSuitability` 등 5개 결정적 함수로 가공 → **Next 15 RSC가 public read-model만 캐시**(presentation plane)하여 렌더. 한 번 수집한 무장애 데이터가 F1→F2→F3→F4→F5를 관통하며, **런타임에 KTO/Odii 의존이 0**이다 (Vercel·Supabase·Kakao SDK·Storage는 여전히 런타임 의존; Kakao 장애 시 지도 없이 리스트 전용으로 폴백).

설계 불변식 (전 문서 공통):
1. **순수 도메인은 Next.js·Supabase·React를 import 하지 않는다** (`packages/domain`은 0 framework deps).
2. **접근성 리스트가 source of truth, 지도는 secondary** (canvas는 SR에 안 보임).
3. **per-user 데이터는 절대 `unstable_cache`로 감싸지 않는다** (cross-user 유출).
4. **ETL 실패 시 마지막 성공 publish를 계속 서빙** (ingest ≠ publish transaction).
5. **PII는 Supabase Postgres(Seoul)에만** — CDN/Edge/Blob에 태우지 않는다.

---

## 1. 세 평면 (Three Planes) + 순수 도메인 코어

### 1.1 평면 책임 정의

| 평면 | 책임 (responsibility) | 무엇이 아닌가 (boundary) | 구현 위치 |
|---|---|---|---|
| **DATA PLANE** | KTO·공공 API를 typed adapter로 수집 → raw 저장 → normalize → validate → **PUBLISH 트랜잭션**으로 canonical 테이블에 발행. 휘발 데이터(혼잡·날씨·대기)는 짧은 주기 스냅샷. | 런타임 사용자 요청을 직접 처리하지 않음. KTO를 브라우저/RSC가 직접 부르지 않음. | `packages/{kto-client, public-data-clients, etl, db}` · GitHub Actions · Supabase |
| **DOMAIN PLANE** | 결정적·TDD 순수 TS. `calculateSuitability` · `buildItinerary` · `resolveGuide` · `moderateReport` · `buildDiaryDocument`. KTO 필드명에 의존하지 않고 `capability_code`로 추상화된 입력만 받음. | I/O 없음. DB·HTTP·React·env 접근 없음. 랜덤·시계(`Date.now()`) 직접 호출 없음(주입). | `packages/domain` (framework-free) |
| **PRESENTATION PLANE** | Next 15 RSC가 published read-model을 `unstable_cache`로 캐시해 렌더. 클라이언트: 접근성 리스트=source of truth, 지도=secondary, IndexedDB=프로필/다이어리/오프라인 가이드. | 비즈니스 로직 임베드 금지(도메인 호출만). per-user RLS 데이터를 Data Cache에 적재 금지. | `apps/web` |

### 1.2 전체 데이터 흐름 다이어그램

```
┌──────────────────────────── DATA PLANE (build-time / batch) ────────────────────────────┐
│  KTO TourAPI (10 svc)        공공 API (BF·국가유산청·기상·응급·충남)                        │
│        │                            │                                                     │
│        ▼                            ▼                                                      │
│  packages/kto-client          packages/public-data-clients                                │
│  request<TReq,TRaw>()         (string-first parse · Zod passthrough · single-encode key)  │
│        └──────────────┬──────────────┘                                                    │
│                       ▼                                                                    │
│            packages/etl  (CLI, GitHub Actions)                                            │
│            ① INGEST   → source_records(raw_payload, hash, fetched_at)   ← 실패해도 여기까지 │
│            ② NORMALIZE→ adapter: raw 필드 → capability_code (KTO 필드명 격리)              │
│            ③ VALIDATE → content-schema Zod (6-POI contract); coverage 계산                 │
│            ④ STAGE   → staging 테이블에 이번 배치 기록 (tombstone 포함)                     │
│            ⑤ PUBLISH (atomic swap txn) → staging→canonical + active-version 포인터 스왑   │
│                       │                                                                    │
│                       ▼                                                                    │
│            ⑥ POST /api/internal/revalidate  (HMAC)  → revalidateTag('poi:all', 'poi:{id}'…)│
└───────────────────────┬───────────────────────────────────────────────────────────────┘
                        │  (Supabase Postgres 17 + PostGIS, Seoul ap-northeast-2)
                        │  canonical: pois · accessibility_facts · route_guides ·
                        │             docent_assets · approved UGC · dashboard snapshots
                        ▼
┌──────────────── PRESENTATION PLANE (request-time, Vercel icn1) ───────────────────────────┐
│  RSC (Server Component)                                                                     │
│   ├─ getPublishedPoi(id)   ── unstable_cache(tags:['poi:{id}','poi:all']) → Vercel Data Cache│
│   ├─ getAccessibilityFacts(id) ── same                                                      │
│   └─ calls DOMAIN PLANE (pure):                                                             │
│         calculateSuitability({ poiFacts, routeGuide, personaIds, timeContext, … })         │
│                       │                                                                     │
│                       ▼  SuitabilityResult { score, axes, deductions, dataDates, … }        │
│   RSC streams HTML  →  Client islands (TanStack Query hydrate · Zustand prefs)             │
│        │                                                                                    │
│        ▼                                                                                    │
│  Browser: AccessibleList(source of truth) ║ KakaoMap(CustomOverlay, secondary)             │
│           IndexedDB: persona profile · diary draft · offline 6-POI bundle                  │
│           Service Worker (Serwist): precache app shell + per-POI guide bundles             │
│                                                                                            │
│  per-user 경로 (RLS, NEVER cached): barrier_reports insert/read · diary submit ·           │
│           Supabase Realtime(approved alert state only)                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 흐름의 핵심 규칙

- **ETL 실패 격리**: `INGEST`(②까지)와 `PUBLISH`(⑤)는 분리. `PUBLISH`가 staging→canonical atomic 스왑 트랜잭션이므로 부분 발행이 없고, 실패 시 직전 `dataset_versions.published_version`이 그대로 서빙된다. bounded TTL이 다음 성공 publish까지 회복을 보장 (§6.2 상세).
- **capability 격리 (D7)**: `accessibility_facts(capability_code, status, source, source_field)`가 KTO `detailWithTour2`의 (아직 미검증인) 필드 키와 도메인을 분리한다. 도메인은 `WHEELCHAIR_ENTRY`·`BRAILLE_BLOCK` 같은 안정적 `capability_code`만 본다.
- **런타임 KTO/Odii 0회 (D4)**: Tats(혼잡)·DataLab(방문자)·기상·대기까지 전부 짧은 주기 스냅샷으로 Supabase에 적재. KTO·Odii 장애가 화면에 영향을 주지 않는다. Vercel·Supabase·Kakao SDK는 런타임 의존으로 남으며, Kakao 장애 시 지도 없이 리스트 전용으로 폴백.

---

## 2. 모노레포 패키지 레이아웃 + import 방향 규칙

### 2.1 디렉터리 (SPEC §4 그대로)

```
apps/
  web/                          # 유일한 Next.js 15 앱
    src/
      app/[locale]/             # next-intl 라우팅 (ko/en/ja/zh-CN)
      features/                 # f1-poi-card · f1-planner · f1-route-guide · f1-safety ·
                                # f1-community · f1-predictable · f2-docent · f3-report ·
                                # f4-diary · f5-dashboard
      admin/                    # moderation 큐 등 admin 화면
      shared/                   # 앱 전용 공용 컴포넌트/훅 (도메인 아님)
packages/
  domain/                       # 순수 TS, 0 framework deps — 5개 결정적 함수
  application/                  # 도메인 ↔ db/clients 오케스트레이션 (use-case 계층)
  db/                           # Supabase 클라이언트 + 생성 타입 + query 함수
  kto-client/                   # typed server-only KTO 클라이언트
  public-data-clients/          # BF·국가유산청·기상·응급·충남 어댑터
  etl/                          # INGEST→NORMALIZE→VALIDATE→PUBLISH CLI
  ui/                           # 디자인 시스템 (Tailwind v4 토큰 + shadcn/Radix + a11y primitives)
  exports/                      # PDF/BRF/GPX 생성 (react-pdf · pdf-lib · braillify)
  content-schema/               # 6-POI Content Package Zod 스키마 + 타입
  test-fixtures/               # 저장된 실제 KTO 응답 fixtures (contract test용)
content/
  {pois, route-guides, docent, pictograms, licenses}   # 큐레이션 콘텐츠 (Git 관리)
supabase/
  {migrations, seed, tests}
scripts/
  {ingest, validate-content, publish}
tests/
  {contract, e2e, accessibility, demo}
.github/workflows/
  {ci.yml, kto-etl.yml, release-readiness.yml}
```

### 2.2 각 패키지의 책임 (한 줄 계약)

| 패키지 | 책임 | 노출 인터페이스 (대표) | 의존 가능 대상 |
|---|---|---|---|
| `domain` | 결정적 산식·일정·검수·다이어리 도큐먼트 로직. **순수.** | `calculateSuitability` · `buildItinerary` · `resolveGuide` · `moderateReport` · `buildDiaryDocument` + 타입 | (없음 — 0 deps) |
| `content-schema` | 6-POI Content Package 계약 (entrances/steps/photos/slope/단차/rest/AAC/docent/source/verified-date)의 Zod 스키마와 타입 | `ContentPackageSchema`, `PoiContent` 타입 | `zod` |
| `kto-client` | KTO 10서비스 transport. single-encode 키, JSON-ok/XML-error 처리, Zod passthrough. **숨은 캐시 없음.** | `request<TReq,TRaw>(op, req)` + 서비스 래퍼 | `zod` |
| `public-data-clients` | 비KTO 공공 API 어댑터 (string-first parse, 좌표 변환) | `getBfCertifications` · `getEmergencyFacilities` · `getWeatherSnapshot` … | `zod`, `proj4` |
| `etl` | 위 클라이언트로 수집 → normalize(어댑터) → validate(content-schema) → **PUBLISH txn** → HMAC revalidate | `runIngest()` · `runPublish()` (CLI 엔트리) | `kto-client`, `public-data-clients`, `content-schema`, `db`, `domain`(검증용) |
| `db` | Supabase 클라이언트 팩토리 + `supabase gen types`로 생성된 TS 타입 + query 함수 | `createServerClient` · `createServiceClient` · `getPublishedPoi` … | `@supabase/ssr`, `@supabase/supabase-js` |
| `application` | use-case 오케스트레이션 — db에서 read-model 조립 → domain 호출 → 결과 반환. RSC가 부르는 진입점. | `loadPoiCardModel(id, personaIds, ctx)` · `loadPlannerModel(...)` | `db`, `domain`, `content-schema` |
| `ui` | 디자인 토큰·shadcn/Radix 프리미티브·a11y primitives(skip-link, RouteFocusReset, aria-live, focus-trap) | 컴포넌트 export | `react`, `tailwind`, `radix` |
| `exports` | PDF(react-pdf)·official form fill(pdf-lib)·BRF(braillify)·GPX 생성. 항상 HTML 대안 동반. | `renderStudentPdf` · `fillChungnamForm` · `toBrf` · `toGpx` | `@react-pdf/renderer`, `pdf-lib`, `braillify` |
| `test-fixtures` | 저장된 실제 KTO 응답. live API 없이 contract test 실행. | fixture 상수 export | (없음) |

### 2.3 import 방향 규칙 (단방향, 강제)

```
        content-schema ─┐
                        ▼
   domain (0 deps) ◄── application ──► db ──► @supabase/ssr
        ▲                  │                    @supabase/supabase-js
        │                  └──► content-schema
        │
  apps/web/features ──► application ──► domain
                   └──► ui
                   └──► db (read-model query, RSC만)

   etl ──► kto-client ──► (zod)
       ──► public-data-clients
       ──► content-schema
       ──► db
       ──► domain (publish 전 검증 시 산식 호출 가능)
```

**HARD RULES (CI eslint `no-restricted-imports` + dependency-cruiser로 강제):**

1. **`domain`은 다음을 import 할 수 없다**: `next`, `next/*`, `react`, `@supabase/*`, `db`, `kto-client`, `public-data-clients`, `application`, `apps/web/*`. (순수성 위반 = CI fail)
2. **`apps/web`는 `kto-client`·`public-data-clients`·`etl`을 import 할 수 없다.** 런타임 KTO 호출 금지를 구조로 못박는다 — 앱은 오직 `db`(published read-model)와 `application`만 본다.
   - **예외 (context-refresh):** 날씨·Tats·대기 스냅샷 갱신 로직은 `apps/web`의 Route Handler(`/api/cron/refresh-context`)에서 호출하지 않고, **GitHub Actions 워크플로 또는 `packages/etl` 내 server-only cron 패키지**로 이동한다. `apps/web` Route Handler는 Vercel Cron의 HTTP 진입점(인증 게이트)만 담당하고 실제 data-client import는 `etl` 패키지에 위임한다. dependency-cruiser `web-no-public-data-in-cron` 규칙으로 강제.
3. **`domain`은 어떤 패키지도 `domain`을 거꾸로 import 하지 않는다** (역방향 의존 0). 도메인은 잎(leaf).
4. **`ui`는 `application`·`db`·`domain`을 import 하지 않는다** (프레젠테이션 프리미티브만).
5. **KTO·service_role 키는 `kto-client`·`etl`·`db`(server) 안에서만**. `apps/web` 클라이언트 번들에 들어가면 CI fail (`server-only` 패키지 가드).

```ts
// dependency-cruiser 규칙 (요지) — .dependency-cruiser.cjs
const RULES = [
  { name: 'domain-is-pure',
    severity: 'error',
    from: { path: '^packages/domain' },
    to:   { path: '(^node_modules/(next|react)|^packages/(db|kto-client|application))' } },
  { name: 'web-no-kto',
    severity: 'error',
    from: { path: '^apps/web' },
    to:   { path: '^packages/(kto-client|public-data-clients|etl)' } },
];
```

---

## 3. 모듈 맵 (Module Map)

SPEC §4 module map을 패키지 내부 모듈로 전개.

| 모듈 | 패키지 경로 | 책임 | 주요 export |
|---|---|---|---|
| `domain/poi` | `packages/domain/src/poi` | POI value object·capability 모델 | `Poi`, `Capability`, `CapabilityStatus` |
| `domain/accessibility` | `.../accessibility` | capability + persona matrix + **suitability 산식** | `calculateSuitability`, `PersonaMatrix`, `SuitabilityResult` |
| `domain/itinerary` | `.../itinerary` | 시간 예산 6단 + 5슬롯 분배 (curated template 선택) | `buildItinerary`, `ItineraryResult` |
| `domain/guide` | `.../guide` | 정적 경로 가이드 단계 해석 (F1.B 데이터) | `resolveGuide`, `GuideStep` |
| `domain/docent` | `.../docent` | 도슨트 채널/모드/언어 해석 (F2) | `resolveDocent`, `DocentTrack` |
| `domain/reporting` | `.../reporting` | 제보 검수 상태기계 + reporter-trust (F3) | `moderateReport`, `ReportState` |
| `domain/diary` | `.../diary` | 다이어리 도큐먼트 모델 (6 출력의 공통 IR) | `buildDiaryDocument`, `DiaryDocument` |
| `domain/rto` | `.../rto` | completeness/gap 집계 규칙 (F5) | `computeGapMetrics` |
| `integrations/kto` | `packages/kto-client` | KTO transport + 서비스 래퍼 | §2.2 |
| `integrations/public-data` | `packages/public-data-clients` | 비KTO 어댑터 | §2.2 |
| `application` | `packages/application` | use-case 오케스트레이션 | `loadPoiCardModel` … |
| `features` | `apps/web/src/features/*` | 화면별 RSC + client island | feature별 page/section |
| `admin` | `apps/web/src/admin` | 검수 큐·감사 화면 | `ModerationQueue` |
| `etl` | `packages/etl` | 배치 파이프라인 | `runIngest`, `runPublish` |

도메인 타입 시그니처 (계약, SPEC §7과 정합):

```ts
// packages/domain/src/accessibility/calculateSuitability.ts
export type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

export interface PoiFact {
  capabilityCode: string;          // e.g. 'WHEELCHAIR_ENTRY' — KTO 필드명 아님
  status: CapabilityStatus;
  verifiedAt: string | null;       // ISO date; null ⇒ 미검증
  source: string;                  // 'KorWithService2' | 'UGC' | 'BF인증' | …
}

export interface SuitabilityInput {
  poiFacts: ReadonlyArray<PoiFact>;
  routeGuide: RouteGuideSummary | null;
  personaIds: ReadonlyArray<string>;
  timeContext: TimeContext;        // 혼잡·기상·대기 스냅샷 (주입)
  certifications: ReadonlyArray<Certification>;
  ugcSummary: UgcSummary | null;
  calculationDate: string;         // 시계 주입 — Date.now() 직접 호출 금지
  policyVersion: string;
}

// SuitabilityResult 전체 계약은 16_suitability_policy.md §1 + packages/domain/policy/types.ts가 단일 권위.
// 이 문서에서 재선언하지 않는다. 아키텍처 계층에서 필요한 입출력 요약만 아래에 기록.
export function calculateSuitability(input: SuitabilityInput): import('@modu-baekje/domain/policy/types').SuitabilityResult;
```

> 산식 본문(A/B/C/D 가중치, forced rules, null rule)은 SPEC §7이 권위. `SuitabilityResult` 필드 정의·타입·label 철자는 **[`16_suitability_policy.md §1`](./16_suitability_policy.md)**이 단일 권위 — 이 문서에서 필드를 재선언하지 않는다. 본 문서는 시그니처·격리·주입(시계·timeContext)만 못박는다.

---

## 4. 캐싱 모델 (Caching Model)

### 4.1 결정 (SPEC §2.4 · R4 §6)

- **Next 15 + `unstable_cache`** 로 시작 (생태계 성숙도). Next 16 Cache Components는 아직 사용하지 않음.
- **published read-model(public)만 캐시.** per-user/RLS 데이터는 절대 `unstable_cache`로 감싸지 않는다 (`cookies()`/`headers()` 접근 불가 → cross-user 유출).
- 무효화는 **ETL의 `revalidateTag`** 가 유일한 경로 (시간 기반 TTL은 안전망).

### 4.2 캐시 키·태그 설계

| read-model | 캐시 메커니즘 | 태그 | revalidate(TTL 안전망) | 무효화 트리거 |
|---|---|---|---|---|
| POI 마스터 + 번역 | `unstable_cache` | `poi:all`, `poi:{id}` | 86400s (1일) | ETL POI publish |
| accessibility_facts | `unstable_cache` | `poi:{id}`, `facts:all` | 86400s | ETL facts publish |
| route_guides / steps | `unstable_cache` | `guide:{poi}` | 86400s | ETL guide publish |
| docent_assets | `unstable_cache` | `docent:{poi}:{locale}` | 86400s | ETL docent publish |
| context_snapshots (혼잡/날씨/대기) | `unstable_cache` | `context:{area}` | 1800s (30분) | 짧은 주기 cron publish |
| dashboard snapshots (F5) | `unstable_cache` | `rto:dashboard` | 86400s | MV refresh publish |
| **barrier_reports (per-user/RLS)** | **캐시 금지** — React `cache()` (요청 단위 memo)만 | — | — | (실시간) |
| **diary / profile** | IndexedDB (서버 캐시 아님) | — | — | (local-first) |

```ts
// packages/db/src/readModels.ts — public read-model만 unstable_cache
import { unstable_cache } from 'next/cache';

const POI_TTL_SECONDS = 86_400;            // 1 day safety-net (정상 무효화는 revalidateTag)
const CONTEXT_TTL_SECONDS = 1_800;         // 30 min for volatile snapshots

// Per-POI cached factory: each POI gets its own cache entry tagged with poi:{id} AND poi:all.
// This enables individual POI invalidation (revalidateTag('poi:gongsanseong')) without
// flushing the entire POI cache, which would be necessary if only 'poi:all' were used.
function makeGetPublishedPoi(poiId: string) {
  return unstable_cache(
    () => queryPublishedPoi(poiId),
    [`published-poi-${poiId}`],                       // unique key per POI
    { tags: [`poi:${poiId}`, 'poi:all'], revalidate: POI_TTL_SECONDS },
  );
}

export function getPublishedPoi(poiId: string) {
  return makeGetPublishedPoi(poiId)();
}

// per-user 데이터(barrier_reports 등)는 절대 여기 들어오지 않는다.
```

> **Per-POI invalidation contract test (required):** `tests/contract/cache-invalidation.test.ts`는 `revalidateTag('poi:gongsanseong')`가 해당 POI만 무효화하고 다른 POI 캐시를 건드리지 않음을 검증한다. ETL `notifyRevalidate`가 `['poi:{id}', 'poi:all']` 태그를 발행하는지도 함께 검증.

### 4.3 안티패턴 가드

- `unstable_cache` 콜백 내부에서 `cookies()`/`headers()`/`auth.getUser()` 호출 금지 — RSC lint 룰로 검출.
- per-user 결과는 RSC에서 `cache()`(요청 단위)로만 메모. Data Cache 적재 금지.
- Next 16 `use cache` 와 혼용 금지 (`cacheComponents` off 상태에서 `use cache`는 no-op).

---

## 5. Vercel 구성 (icn1 + cron) — `vercel.json`

### 5.1 리전 핀 + 짧은 refresh cron

```jsonc
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"],                      // 전 함수 Seoul (ap-northeast-2) 고정.
                                            // 기본값 iad1(워싱턴)이면 매 호출 태평양 왕복 발생.
  "crons": [
    // 짧은 주기 refresh만 Vercel Cron이 담당 (SPEC §2.10).
    // 휘발 데이터(혼잡/날씨/대기) 스냅샷 갱신. UTC 고정 → KST 환산 필수.
    { "path": "/api/cron/refresh-context", "schedule": "0 * * * *" }   // 매시 정각 (UTC=KST 기준 시각 무관 hourly)
  ],
  "functions": {
    "src/app/api/exports/**/*": { "maxDuration": 60 }   // PDF/BRF 생성 여유
  }
}
```

> **무거운 배치 ETL은 Vercel Cron이 아니라 GitHub Actions** (`.github/workflows/kto-etl.yml`). Vercel Cron은 SPEC §2.10대로 짧은 refresh 전용. KST 04:00 일배치가 필요하면 `0 19 * * *`(UTC)지만, 본 프로젝트의 무거운 수집은 GH Actions로 분리한다 (Hobby 1일 1회 제약·serverless duration 한계 회피).

### 5.2 Cron 엔드포인트 보호

```ts
// apps/web/src/app/api/cron/refresh-context/route.ts
// This route is an HTTP gate only: it authenticates the Vercel Cron call and delegates
// to packages/etl (server-only). It must NOT import public-data-clients directly —
// that would violate the apps/web boundary rule (§2.3 rule 2 + carved exception).
import { runContextRefresh } from '@modu-baekje/etl/contextRefresh'; // server-only package

export async function GET(req: Request) {
  // Vercel Cron은 production 배포에만 트리거. CRON_SECRET으로 외부 호출 차단.
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  await runContextRefresh();               // Tats/날씨/대기 → context_snapshots upsert (in etl)
  return Response.json({ ok: true });
}
```

> **Context-refresh boundary rule (M-13):** `refreshContextSnapshots` 구현(Tats·날씨·대기 API 호출 + `context_snapshots` upsert)은 `packages/etl/src/contextRefresh.ts`에 위치한다. `apps/web`은 HTTP 진입점·인증만 담당하며 `public-data-clients`를 직접 import 하지 않는다. 대안: GitHub Actions의 별도 `context-refresh.yml` 워크플로가 `runContextRefresh()`를 직접 실행하고 `/api/internal/revalidate`(HMAC)로 `context:{area}` 태그를 무효화 — `apps/web`의 cron 엔드포인트 자체를 제거할 수 있다.

### 5.3 플랜·리전 결정 근거 (R4 §7·§9)

- **Pro 권장 (심사 기간)**: Supabase Free는 1주 비활성 시 일시정지(심사 직전 사고), Vercel Hobby cron은 1일 1회. 심사 기간(2026-10 전후) 둘 다 Pro.
- **단일 리전 `icn1`로 충분** (Hobby 단일 리전, Pro 최대 3). Edge/미들웨어는 글로벌 배포되므로 **PII를 미들웨어에서 다루지 않는다**.

---

## 6. No-runtime-KTO-calls 원칙 + DB-as-cache + HMAC revalidate

### 6.1 원칙 (SPEC §2.7 · D4)

런타임 사용자 요청은 **절대 KTO·Odii를 호출하지 않는다** (zero runtime KTO/Odii dependency). 모든 데이터는 ETL이 Supabase에 발행한다. 휘발 데이터(혼잡·방문자·날씨·대기)도 짧은 주기 스냅샷으로 DB에 적재된다. 따라서 **DB가 1차 캐시이자 source of truth**이며, KTO·Odii 장애는 화면에 0 영향이다. Vercel·Supabase·Kakao SDK·Storage는 런타임 의존으로 남는다 — Kakao 지도 장애 시에는 리스트 전용(list-only) 화면으로 폴백하며 핵심 접근성 정보는 계속 제공된다.

근거: (a) serverless token-bucket은 인스턴스 간 공유되지 않아 쿼터 가드가 불안정(per-instance), (b) KTO 에러는 항상 XML이라 런타임 파싱 리스크, (c) 운영 계정 100k/day는 데모 트래픽엔 충분하지만 **장애 회복력**이 핵심.

### 6.2 DB-as-cache 흐름 (ingest ≠ publish)

```
GitHub Actions (kto-etl.yml, 일배치)
  │
  ├─ ① INGEST  : kto-client.request() → source_records(raw_payload, hash, fetched_at)
  │              실패해도 여기서 멈춤. canonical은 직전 상태 유지.
  │
  ├─ ② NORMALIZE: adapter가 raw → accessibility_facts(capability_code, status, source_field)
  │              KTO 필드명(detailWithTour2 미검증 키)을 여기서 흡수.
  │
  ├─ ③ VALIDATE : content-schema Zod (6-POI). coverage 계산.
  │              실패 POI는 staging 단계에서 제외 → 이전 버전 행(prior-version rows)이 유지됨.
  │
  ├─ ④ STAGE   : staging 테이블(pois_staging / facts_staging / …)에 이번 배치 전체 기록.
  │              각 행에 batch_version 태그. 삭제된 사실(deleted facts)도 staging에 tombstone.
  │
  ├─ ⑤ PUBLISH : 원자적 active-version 포인터 스왑 (단일 트랜잭션)
  │      BEGIN;
  │        -- 이전 버전 행을 교체: staging → canonical upsert + staging tombstone 행 DELETE
  │        INSERT INTO pois SELECT … FROM pois_staging WHERE batch_version = :v ON CONFLICT DO UPDATE …;
  │        DELETE FROM accessibility_facts WHERE poi_id IN (
  │          SELECT poi_id FROM facts_staging WHERE batch_version = :v AND tombstone = true);
  │        INSERT INTO accessibility_facts SELECT … FROM facts_staging
  │          WHERE batch_version = :v AND tombstone = false ON CONFLICT DO UPDATE …;
  │        -- 동일 패턴: route_guides / docent_assets / snapshots
  │        UPDATE dataset_versions
  │          SET published_version = :v, published_at = now(), active = true
  │          WHERE dataset = 'main';   ← 포인터 스왑: 이 시점부터 새 버전이 서빙됨
  │      COMMIT;            ← 부분 발행 없음. 실패 시 ROLLBACK → 이전 active 버전 그대로 서빙.
  │              ("last successful publish stays served" 보장)
  │
  └─ ⑥ REVALIDATE: POST https://{prod}/api/internal/revalidate  (HMAC 서명)
                    tags = ['poi:all'] + ['poi:{id}' for each published poi]
```

> **삭제·실패·이전 버전 처리 규칙:** (a) 삭제된 사실 — staging의 tombstone 행이 PUBLISH 트랜잭션 내에서 canonical 테이블에서 제거. (b) 실패 POI mid-batch — `③ VALIDATE`에서 제외된 POI는 staging에 기록되지 않으므로 canonical에서 이전 버전 행이 그대로 유지; 다음 배치에서 재시도. (c) 이전 버전 행 — `dataset_versions.active` 포인터가 바뀌기 전까지 read-model 쿼리는 이전 `published_version` 기준으로 읽음 (read-model 쿼리에 `WHERE published_version = (SELECT published_version FROM dataset_versions WHERE dataset='main' AND active=true)` 조건 추가).

### 6.3 HMAC-protected revalidate 엔드포인트

GH Actions는 Vercel과 다른 신뢰 도메인이므로, publish 직후 내부 엔드포인트를 **HMAC 서명**으로 호출해 캐시를 무효화한다 (D13).

```ts
// apps/web/src/app/api/internal/revalidate/route.ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

const SIGNATURE_HEADER = 'x-revalidate-signature';
const MAX_SKEW_MS = 300_000;                 // 5분 — replay 방지 timestamp 윈도우

export async function POST(req: Request) {
  const body = await req.text();             // { tags: string[], ts: number }
  const provided = req.headers.get(SIGNATURE_HEADER) ?? '';
  const expected = createHmac('sha256', process.env.REVALIDATE_HMAC_SECRET!)
    .update(body).digest('hex');

  const ok = provided.length === expected.length &&
             timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!ok) { return new Response('Bad signature', { status: 401 }); }

  const { tags, ts } = JSON.parse(body) as { tags: string[]; ts: number };
  if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    return new Response('Stale', { status: 401 });   // replay 차단
  }
  for (const tag of tags) { revalidateTag(tag); }
  return Response.json({ revalidated: tags });
}
```

```ts
// packages/etl/src/revalidate.ts — publish 트랜잭션 직후 호출
export async function notifyRevalidate(tags: string[]): Promise<void> {
  const payload = JSON.stringify({ tags, ts: Date.now() });
  const signature = createHmac('sha256', process.env.REVALIDATE_HMAC_SECRET!)
    .update(payload).digest('hex');
  await fetch(`${process.env.PROD_BASE_URL}/api/internal/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-signature': signature },
    body: payload,
  });
}
```

### 6.4 회복 모델

- revalidate 호출이 실패해도 **bounded TTL**(POI 86400s, context 1800s)이 다음 요청에서 SWR로 갱신을 보장 → 캐시가 영원히 stale 되지 않는다.
- PUBLISH 트랜잭션이 실패하면 `dataset_versions`가 증가하지 않으므로 read-model은 직전 발행을 계속 서빙. **데모 무중단.**

---

## 7. 요청 생애주기 스케치 (Request Lifecycle)

### 7.1 공개 읽기 경로 — F1.A POI 카드 (대표)

```
사용자 → GET /ko/poi/공산성?persona=P1a,P1b,P3&budget=halfday
  │
  1. Vercel Edge (icn1) → Next 15 RSC 진입. next-intl 미들웨어가 locale=ko 해석.
  │   (미들웨어는 PII 미접근, Cache-Control 누수 방지 헤더만 설정)
  │
  2. RSC: application.loadPoiCardModel(poiId, personaIds, ctx)
  │     ├─ db.getPublishedPoi(poiId)          ── unstable_cache HIT? → Vercel Data Cache
  │     ├─ db.getAccessibilityFacts(poiId)    ── unstable_cache
  │     ├─ db.getContextSnapshot(areaCode)    ── unstable_cache (30분 TTL)
  │     └─ (KTO 호출 0회 — 전부 published read-model)
  │
  3. RSC → domain.calculateSuitability({ poiFacts, personaIds, timeContext, certifications,
  │                                      calculationDate(주입), policyVersion })
  │     → SuitabilityResult { score:82, label:'방문가능', axes, deductions,
  │                           evidenceConfidence, coverage, dataDates, alternatives }
  │
  4. RSC가 HTML 스트리밍:
  │     <AccessibleList> (source of truth) + 투명 evidence 카드(perAxis/deductions/dataDates)
  │     <KakaoMap>는 client island로 지연 로드 (secondary)
  │
  5. Client hydrate: TanStack Query가 RSC dehydrated state 흡수, Zustand가 persona/언어 prefs 로드.
  │     IndexedDB에서 persona 프로필 복원 → 즉시 모든 카드에 적용.
  │
  6. Service Worker(Serwist): app shell precache HIT. 6-POI 번들이면 오프라인에서도 동작.
```

**라운드트립**: 외부 API 0회. Data Cache HIT 시 DB 조회도 0회. domain 산식은 순수·동기 → 마이크로초 단위.

### 7.2 per-user 쓰기 경로 — F3 배리어 제보

```
사용자 → Server Action submitReport(form, photo)
  │
  1. db.createServerClient() → auth.getUser() (getSession() 금지 — 서버 검증 안 됨)
  │     익명 사용자도 authenticated 역할 (is_anonymous=true). UGC identity용.
  │
  2. 사진 → Supabase Storage PRIVATE 버킷 'ugc-pending' (승인 전 비공개, signed URL은 admin만)
  │
  3. insert barrier_reports (RLS: owner insert, restrictive: 영구 사용자만? — UGC는 anon 허용,
  │     pre-approval은 status='pending', 공개 read는 status='approved'만)
  │     → 절대 unstable_cache 경유하지 않음 (per-user/RLS)
  │
  4. admin 검수 큐(/admin/moderation)에서 moderateReport 상태기계로 approve
  │     → Postgres 트리거가 realtime.broadcast_changes()로 approved alert state만 방송
  │     (raw report 본문은 방송하지 않음 — region:{area} 토픽)
  │
  5. 구독 중인 클라이언트가 in-app 배너로 수신 (FCM/APNs 없음 — SPEC §2.9)
```

### 7.3 배치 경로 — 일배치 ETL (GitHub Actions)

```
.github/workflows/kto-etl.yml (cron) → packages/etl runIngest → runPublish
  → §6.2 ① INGEST → ② NORMALIZE → ③ VALIDATE → ④ STAGE → ⑤ PUBLISH(atomic swap) → ⑥ HMAC revalidate
  → 실패 시 직전 active-version 유지, bounded TTL이 회복.
```

---

## 8. 확정 기술 스택 표 (라이브러리 + 정확 버전)

> SPEC §2.2·§2.3, SYNTHESIS §1, R-briefs 기준. MVP 제외 라인은 발전방향으로 명시.

### 8.1 코어 플랫폼

| 레이어 | 라이브러리 | 버전/설정 | 비고 |
|---|---|---|---|
| 프레임워크 | Next.js (App Router) | **15.x** | Next 16 Cache Components는 발전방향 |
| 런타임/언어 | React 19 · TypeScript · Node | **Node 20 LTS** | Node 18 EOL |
| 번들러 | Turbopack | dev 기본 | — |
| 호스팅 | Vercel | region **`icn1`** (ap-northeast-2) | `vercel.json` `"regions":["icn1"]` |
| DB/BaaS | Supabase | Postgres **17** + PostGIS, region `ap-northeast-2` | **pgvector 미사용(MVP)** |

### 8.2 UI / 스타일

| 라이브러리 | 버전 | 역할 |
|---|---|---|
| Tailwind CSS | **v4** (`@theme`, OKLCH, `tw-animate-css`) | 전 스타일 |
| shadcn/ui | code-copy (npm 아님), Radix 기반 | 프리미티브 |
| Radix UI / React Aria | WAI-ARIA complete | focus-trap·ARIA (직접 구현 금지) |
| Pretendard | static TTF (SIL OFL 1.1) | UI + PDF embed |

### 8.3 상태 / 데이터 / i18n

| 관심사 | 라이브러리 | 설정 |
|---|---|---|
| 서버 상태 | **TanStack Query v5** | `staleTime 60_000`, `gcTime 300_000`; RSC hydrate |
| 클라이언트 상태 | **Zustand** | 필터·a11y prefs·언어 |
| 폼 | **React Hook Form + Zod** | 검색/의도 폼 |
| i18n | **next-intl v3** | `app/[locale]`, ICU; `ko/en/ja/zh-CN` |
| Supabase 클라이언트 | **@supabase/ssr 0.12.0** | `getAll/setAll` 쿠키; 인가는 `getUser()`/`getClaims()` (`getSession()` 금지) |

### 8.4 지도 / 지오

| 관심사 | 선택 | 비고 |
|---|---|---|
| 베이스맵 + 한국 POI/주소 | **Kakao Maps JS SDK** (`libraries=services,clusterer,drawing`); `react-kakao-maps-sdk` | CustomOverlay = DOM/ARIA 마커 |
| 정부 공간 보강 | **VWorld** (행정경계·보조 geocoder·WMS) | — |
| 권위 주소 | **도로명주소 API**(juso.go.kr) | 공개 도로명+영문 (무인증) |
| 좌표 변환 | **proj4js**(client) / **pyproj**(ETL) | EPSG:5179/5186 ↔ 4326 |
| 제외 | Mapbox | KR 주소 geocoding + 지도 residency |

### 8.5 문서 / 미디어 / 출력

| 관심사 | 선택 | 비고 |
|---|---|---|
| **PDF** | **@react-pdf/renderer** (Node route, no Chromium) + Pretendard TTF + `registerHyphenationCallback`(CJK) | 신규 리포트 |
| official form fill | **pdf-lib** + `@pdf-lib/fontkit` | 충남교육청 체험학습 서식 |
| **점자** | **braillify** (npm **2.0.1**, Apache-2.0, WASM) | Unicode U+2800 + `.brf`(40×25 + FF) |
| GPX | hand-written **GPX 1.1** XML | WGS84/metric |
| 오프라인 PWA | **Serwist `@serwist/next` 9.5.11** + IndexedDB(`idb`/`localForage`) | app shell + 6-POI 번들 precache |
| 차트(F5) | Recharts (MIT) / ECharts (Apache-2.0) | RTO 대시보드 |
| HTML 대안 | 모든 PDF에 **항상 HTML 대안** | KWCAG — PDF-only 화면 금지 |
| **제외(발전방향)** | pgvector/RAG, OCR, 360°, Puppeteer/Chromium, multi-AI provider | SPEC §2.8 |

### 8.6 인증 / 메시징 / Cron

| 관심사 | 선택 | 비고 |
|---|---|---|
| Auth | **Supabase Anonymous** (UGC identity); 소셜 승격 optional | 코어는 무로그인 동작 (SPEC §2.11) |
| 실시간 | **Supabase Realtime (Broadcast from Database)** | approved alert state만 |
| 메시징 | **in-app 배너** (FCM/APNs/알림톡 없음 — MVP) | SPEC §2.9 |
| 무거운 배치 ETL | **GitHub Actions** (`kto-etl.yml`) | SPEC §2.10 |
| 짧은 refresh | **Vercel Cron** (`vercel.json crons`, UTC) | context 스냅샷 |
| a11y test | `@axe-core/playwright`, `jest-axe`/`vi-axe 10`, Storybook `addon-a11y`, Lighthouse v12, `eslint-plugin-jsx-a11y` | CI 게이트 (06/10 참조) |

---

## 9. 환경 변수 · 시크릿 경계

| 변수 | 위치 | 노출 경계 |
|---|---|---|
| `KTO_SERVICE_KEY` (**DECODING** 키) | `etl`/`kto-client` (server-only) | 클라이언트 번들 금지. single-encode. 로그에서 strip. |
| `SUPABASE_SERVICE_ROLE_KEY` | `etl`·server route | 클라이언트 금지 |
| `NEXT_PUBLIC_SUPABASE_URL` / `…_PUBLISHABLE_KEY` | 클라이언트 OK | RLS가 방어선 |
| `CRON_SECRET` | Vercel env | cron 엔드포인트 인증 |
| `REVALIDATE_HMAC_SECRET` | GH Actions + Vercel env (공유) | HMAC 서명/검증 |
| `KAKAO_MAP_JS_KEY` | 클라이언트 (도메인 제한) | JS 키, REST 키는 server-only |

> SPEC §6: DECODING 키를 server-only env에 두고 `URLSearchParams`/`new URL()`로 **정확히 한 번** 인코딩 (double-encode = code 30). 클라이언트 노출·로그 노출 금지.

---

## 10. 비용 봉투 (Cost Envelope)

| 항목 | 플랜 | 월 비용 |
|---|---|---|
| Supabase | Pro (심사 기간) | $25 |
| Vercel | Pro (심사 기간) | $20 |
| OpenAI 임베딩 | — (pgvector 미사용 MVP) | $0 |
| **합계** | | **~$45/mo** |

근거 (R4 §9): 개발 중엔 Free 가능하나 심사 기간(2026-10 전후)엔 **둘 다 Pro** — Supabase Free 1주 일시정지 + Vercel Hobby cron 1일 1회 제약 회피. 콘테스트 트래픽은 Pro 포함 한도 내 여유. Upstash Redis는 제외(런타임 KTO 0회 → 쿼터 가드 불필요).

---

## 11. 수용 기준 (Acceptance Criteria)

본 아키텍처가 "구현 가능"하려면 다음이 CI/리뷰에서 검증되어야 한다.

- [ ] `packages/domain`이 `next`/`react`/`@supabase/*`/`db`/`kto-client`를 import 하지 않음 (dependency-cruiser `error`).
- [ ] `apps/web`가 `kto-client`/`public-data-clients`/`etl`을 import 하지 않음 (런타임 KTO 0회 구조 보장).
- [ ] `unstable_cache` 콜백 내 `cookies()`/`headers()`/`getUser()` 호출 0건 (lint).
- [ ] per-user 테이블(barrier_reports/diary)이 어떤 `unstable_cache` 호출에도 등장하지 않음.
- [ ] `vercel.json`에 `"regions":["icn1"]` 존재. 모든 함수가 icn1로 핀.
- [ ] `/api/internal/revalidate`가 HMAC 미서명 요청을 401로 거부 + 5분 skew 초과 401 (contract test).
- [ ] PUBLISH가 staging→canonical atomic 스왑 트랜잭션 — 삭제된 사실·실패 POI·이전 버전 행 처리가 §6.2 규칙대로 동작; ROLLBACK 시 직전 `published_version` 계속 서빙 (etl test).
- [ ] `calculateSuitability`가 동일 입력에 동일 출력 (golden test) + `calculationDate` 주입(시계 직접 호출 0).
- [ ] KTO DECODING 키가 클라이언트 번들/로그에 등장 0건.
- [ ] 모든 PDF 출력 경로에 HTML 대안 존재 (KWCAG).
- [ ] contract test가 `test-fixtures`만으로(live KTO 없이) 통과.

---

## 12. 미해결 항목 (이 문서 범위에서)

- **detailWithTour2 정확 필드 키** (guide v4.3 + live probe) — `accessibility_facts.source_field` 매핑이 여기 의존. `capability_code` 추상화로 도메인은 격리되나 NORMALIZE 어댑터는 검증 필요. (SPEC §11, blocking C2)
- **lDong 코드** (`ldongCode2` bootstrap) — 하드코딩 금지. ETL bootstrap이 채움.
- **Next 15 → 16 마이그레이션 시점** — 본 문서는 15 + `unstable_cache` 고정. 16은 발전방향.
- **CSAP** — 발주처가 정부기관이 되면 Vercel/Supabase 대신 NCloud/NHN 강제 가능 (아키텍처 변경). 현재 비정부 가정.
