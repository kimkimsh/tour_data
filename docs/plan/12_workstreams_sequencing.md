# 12 — 워크스트림 · 일정 · 에이전트팀 실행

> **Status:** EXPANDS SPEC §9 (+ §4 monorepo, §11 risks). Source of truth = `docs/plan/SPEC.md`; 본 문서는 그 §9를 빌드 가능한 실행 계획으로 확장한다. 충돌 시 SPEC가 우선한다.
> **Provenance:** SPEC §9 (streams/contracts/graph/timeline), 연구 `_research/00_SYNTHESIS.md §8` (parallel workstream decomposition), Claude⇆Codex pairing `_research/_pairing_reconcile.md` (D6 F1 5-way split · D8 C4 early-frozen content · D9 monorepo boundaries).
> **We are at 2026-06-14.** Functional review (기능심사) + PT = 2026-10. 빌드 종료 타깃 = **2026-09-30 RC**.

---

## 0. 이 문서의 책임 (one-line)

> **누가 / 무엇을 / 언제 / 어떤 인터페이스로** 만드는지를 고정한다 — 5개 contract를 먼저 얼리고, 18개 stream(공유 디렉터리 전용 owner 포함, SPEC §13.10)을 디렉터리·계약 소유권으로 분리하여, 병렬 AI 에이전트팀이 충돌 없이 **vertical-slice-first**로 빌드하도록 하는 실행 규약.

핵심 3원칙 (SPEC §11 "agent drift" mitigation = `1 contract owner + versioned schema + dir ownership`):

1. **Contract-first freeze** — 5개 계약을 코드보다 먼저 얼린다. 계약은 버전드(`v1`)이며 owner-stream 1개만 변경할 수 있다.
2. **Per-feature directory ownership** — 각 stream은 monorepo의 자기 디렉터리에서만 쓴다(write). 타 디렉터리는 읽기(import contract)만.
3. **Vertical-slice-first** — 넓게 깔지 않는다. 6/14–6/28 안에 단일 정의된 첫 슬라이스(SPEC §13.3): **공산성 F1.A/D → 3-step verified route → HTML diary → 1 F5 gap** (assigned owner + fixtures + E2E)을 먼저 세운 뒤 수평 확장한다.

---

## 1. 5개 Frozen Contracts (먼저 얼린다)

SPEC §9: *"Freeze first (one owner each, versioned)."* 각 계약은 **owner-stream 1개**, **정확한 산출물(artifact)**, **버전 게이트**를 가진다. 계약 변경 = owner-stream의 PR + 버전 bump + 전 consumer에게 broadcast. **계약이 green이 되기 전에는 어떤 feature stream도 시작하지 않는다.**

| # | Contract | Owner stream | 정확한 artifact (path) | Freeze 게이트 (Done = 이게 통과) |
|:--:|---|---|---|---|
| ① | **DB Contract v1** | **C1** Data Platform | `supabase/migrations/*.sql` + `packages/db/src/types.ts` (generated) + `packages/db/src/rls.test.sql` | 모든 테이블/enum/RLS/Storage 정책이 `supabase db reset`로 생성되고 RLS 테스트(default-deny, anon-restrictive, admin) green |
| ② | **KTO Contract v1** | **C2** KTO/ETL | `packages/kto-client/src/index.ts` (transport + `request<TReq,TRaw>`) + `packages/test-fixtures/kto/*.json` (real-response fixtures) + `packages/kto-client/src/types/*.ts` (normalized) | contract 테스트가 **fixtures로** green (live API 없이). `detailWithTour2` 필드키가 guide v4.3 + live probe로 검증됨 (SPEC §11) |
| ③ | **Domain Contract v1** | **C0** Contracts | `packages/domain/src/index.ts` — 5개 함수 시그니처 + 입출력 타입 (구현은 stub OK, 시그니처는 frozen) | 5개 시그니처 컴파일 + 타입 export. consumer가 import만으로 작업 가능 |
| ④ | **Design Contract v1** | **C3** Design/A11y | `packages/ui/src/tokens.ts` + `packages/ui/src/primitives/*` (SkipLink, RouteFocusReset, AriaLiveRegion, FocusTrapModal) + Storybook | 토큰 대비 4.5/3:1 검증, a11y primitives Storybook `addon-a11y` green, eslint-jsx-a11y green |
| ⑤ | **Content Package Contract v1** | **C4** Content (6-POI) | `packages/content-schema/src/index.ts` (Zod) + `content/pois/_schema.json` + `content/pois/gongsanseong.json` (1개 reference fill) | Zod 스키마가 `entrances/steps/photos/slope/단차/rest/AAC/docent/source/verified-date` 전 필드 정의 + 1개 POI가 schema validate 통과 |

### 1.1 5개 Domain Contract 시그니처 (Contract ③ — frozen, C0 소유)

순수 TS, framework-free (SPEC §4 *"`domain` cannot import Next.js"*). 모든 입력은 `Readonly<...>`, 모든 함수는 deterministic (같은 입력 → 같은 출력, PT-stable).

```ts
// packages/domain/src/index.ts  — Domain Contract v1 (frozen signatures; impl may be stubbed)

export function calculateSuitability(input: SuitabilityInput): SuitabilityResult;
export function buildItinerary(input: ItineraryInput): ItineraryResult;
export function resolveGuide(input: GuideInput): ResolvedGuide;
export function moderateReport(input: ModerationInput): ModerationDecision;
export function buildDiaryDocument(input: DiaryInput): DiaryDocument;

// ── Contract types (excerpt; full set lives in packages/domain/src/types.ts) ──

export type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

export interface CapabilityFact {           // mirrors accessibility_facts row (DB Contract ①)
  capabilityCode: string;                   // domain-stable code, NOT a KTO field name
  status: CapabilityStatus;
  detail: string;
  source: string;
  sourceField: string;
  verifiedAt: string;                       // ISO date
}

export interface SuitabilityInput {
  poiFacts: ReadonlyArray<CapabilityFact>;
  routeGuide: ResolvedGuide | null;
  personaIds: ReadonlyArray<string>;        // selected personas (multi → LOWEST personaFit)
  timeContext: TimeContext | null;          // crowd/weather/air snapshot
  certifications: ReadonlyArray<Certification>;
  ugcSummary: UgcSummary | null;
  calculationDate: string;                  // ISO; drives Layer D decay
  policyVersion: string;                    // e.g. "suitability-1.0" — echoed in result
}

// SuitabilityResult — AUTHORITATIVE shape is packages/domain/policy/types.ts (see 16_suitability_policy.md §1).
// Consumers (F1.A·F4·F5) IMPORT it; do NOT redeclare here. Canonical fields: score, label ('정보없음' — no space),
// layerA..layerD, axes[] (per-axis breakdown), evidenceConfidence, coverage, deductions, knownCriticalBlockers,
// alternatives (verified-card POIs only; TarRlteTar is a separate "관련 관광지(접근성 미검증)" list), policyVersion, dataDates.
export type { SuitabilityResult, SuitabilityInput } from '@modu/domain/policy/types';
```

> **계약 동결 효과:** F1-AD(consumer)는 `calculateSuitability`를 **import**해서 화면을 만들고, C0(owner)는 내부 구현을 TDD로 채운다. 시그니처가 frozen이므로 둘은 충돌 없이 병렬 진행한다. 구현이 stub(고정값 반환)이어도 F1-AD의 컴포넌트 트리는 완성 가능 — 이것이 vertical-slice를 가능케 하는 메커니즘이다.

---

## 2. Stream 정의 (C0–C4 · F* · CX · E0 · I0 · Q0)

각 stream = **소유 디렉터리 1개 집합** + **노출 인터페이스** + **의존** + **DoD**. "exposes"는 다른 stream이 import할 계약면을 뜻한다. 소유 디렉터리 밖은 write 금지(read-only import).

### 2.1 Foundation streams (C0–C4)

| Stream | 소유 디렉터리 (write) | Deliverables | Exposes (인터페이스) | Depends on | DoD (test gate) |
|---|---|---|---|---|---|
| **C0 Contracts** | `packages/domain`, `packages/application`, `tests/contract` | 5개 domain 시그니처 동결 + 순수 산식 TDD 구현 (`calculateSuitability` 등) + application orchestrator 시그니처 | Contract ③ (5 함수), `application` 진입점 | — | `vitest` unit: Layer A/B/C/D 가중치·forced rules·null rule 케이스 전부 green; 시그니처 컴파일 |
| **C1 Data Platform** | `supabase/`, `packages/db`, `tests/contract/rls.*` | 전 테이블/enum/RLS/Storage migration + `match`/read-model RPC + generated types | Contract ① (DB schema + RLS + `packages/db` typed client) | C0 (타입 참조) | `supabase db reset` green; RLS 테스트(default-deny/anon/admin) green; generated types 컴파일 |
| **C2 KTO/ETL** | `packages/kto-client`, `packages/public-data-clients`, `packages/etl`, `scripts/{ingest,validate-content,publish}`, `.github/workflows/kto-etl.yml` | typed KTO client(single-encode·XML-error fallback·Zod passthrough) + real fixtures + ETL CLI(`source_records→normalize→validate→PUBLISH txn`) + bootstrap `ldongCode2`/`lclsSystmCode2` + HMAC revalidate endpoint | Contract ② (transport + normalized types + fixtures) | C0, C1 (publish 타깃) | contract 테스트가 fixtures로 green(live API 無); `detailWithTour2` 필드키 verified; publish txn이 실패 시 last-good 유지 |
| **C3 Design/A11y** | `packages/ui`, `apps/web/src/app/[locale]/layout` (shell만), `.storybook` | Tailwind v4 토큰(대비쌍) + Radix/shadcn base + Pretendard + a11y primitives + pictogram registry | Contract ④ (`packages/ui` 컴포넌트 + 토큰) | C0 | Storybook `addon-a11y` green; 토큰 대비 4.5/3:1; eslint-jsx-a11y green; primitives(RouteFocusReset/AriaLive) 단위 검증 |
| **C4 Content (6-POI)** | `packages/content-schema`, `content/{pois,route-guides,docent,pictograms,licenses}` | Content Package Zod 스키마 + 6-POI 검증 fill(entrances/steps/photos/slope/단차/rest/AAC/docent/source/verified-date) + 라이선스 레지스트리 | Contract ⑤ (Zod schema + `content/*.json`) | C0 (타입), C2 (KTO 사진/필드 결합) | `scripts/validate-content` green(6 POI 전부 schema 통과); **각 capability fill에 evidence pack 존재 = DoD** (SPEC §13.5 / doc 16 §11: 원본 사진·측정값·측정 방법·검증자+자격·2차 승인·유효기간·변경 이력). **String-only `verified_by/date`는 publish 게이트로 금지** |

### 2.2 Feature streams (F1-AD/B/C/E/F · F2 · F3 · F4 · F5)

SPEC §8/§9의 canonical F1–F5. F1은 의존 차이에 따라 5-way split(pairing D6). 각 feature는 `apps/web/src/features/<dir>`만 write.

| Stream | 소유 디렉터리 (write) | Deliverables | Exposes | Depends on | DoD (test gate) |
|---|---|---|---|---|---|
| **F1-AD** POI카드 + 시간예산 | `features/f1-poi-card`, `features/f1-planner` | F1.A 무장애 상세 카드(출입구 사진·회전 폴리곤·휴식·매트릭스·부재사유 라벨) + **4-Layer 투명 evidence card** + F1.D 시간예산 **MVP 3단**(반나절/당일/1박2일; "6단"=확장 상한, curated `itinerary_templates`) | `<PoiAccessibilityCard>`, `<SuitabilityEvidenceCard>`, `<TimeBudgetPlanner>` | C1, C2, C3, C4, C0(`calculateSuitability`/`buildItinerary`) | axe 0 on `/poi/[id]`·`/plan`; evidence card가 per-axis 기여·deduction·data-date·policyVersion 표시; null→"정보 없음" |
| **F1-B** 베리어프리 경로 | `features/f1-route-guide` | 정적 step 카드(5~12단계)·출입구별 접근법·구간 hazard·대체경로·5채널 출력(지도/사진/쉬운글/픽토그램/TTS) | `<RouteGuideViewer>`, step data model (F1-F·F1-E·F4 재사용) | C1, C3, C4, C0(`resolveGuide`) | axe 0 on `/route/[poi]`; map 제외→list가 source of truth; 각 step에 verified-by/date |
| **F1-C** SOS·AAC | `features/f1-safety` | SOS 고정 버튼(119/1330/영사콜센터 딥링크) + 보조기기/콜택시 static directory + AAC 5종(픽토그램·쉬운글·다국어·TTS) | `<SosButton>`, `<AacHelpCards>`, static directory model | C3, C4 (AAC/픽토그램), C1(facility) | axe 0; AAC 카드 SR 읽힘; F1.F-6과 AAC 데이터 공유(단일 출처) |
| **F1-E** 후기 + GPX | `features/f1-community` | 페르소나별 후기 + GPX **다운로드**(curated, 검수 통과 동선만) + 로컬 프로필 영속. **후기/UGC GPX 제출은 SPEC §13.2로 발전방향 — F3가 유일 UGC 진입**; F1-E는 7/19 gate 시 컷 1순위 | `<PersonaReviewTabs>` (GPX 다운로드는 CX `exportGpx` import) | CX(`exportGpx`), C1, F1-B(step data) | axe 0; GPX 1.1 valid XML(CX 게이트); 후기 RLS(approved public) |
| **F1-F** 예측가능 백제 | `features/f1-predictable` | **3요소**(픽토그램 시각 일정·1단계1행동·자극조절(calm)+AAC) — F1.B step 데이터 재사용; 60초 카운트다운·보호자동반·단체모드 → **발전방향**(SPEC §13.2) | `<PredictableMode>` 3 sub-components | C3, C4, F1-B(step data) | axe 0; `prefers-reduced-motion` 존중 |
| **F2** Odii 4채널 도슨트 | `features/f2-docent` | 음성·자막·점자·수어 × ko/en/ja/zh-CN (deep=공산성·부소산성; 외국어=text/caption/voice); **map-tap only**(geofence → 발전방향); "AI 음성 안내" 배지; transcript 상시; `aria-live` | `<DocentPlayer>`, `<LangSwitcher>` | C1(docent_assets), C2(Odii), C3, C4 | axe 0 on `/docent/[poi]`; transcript 가시; consent 게이트; AI 배지 SR 노출 |
| **F3** 배리어 제보 + 검수 큐 | `features/f3-report`, `apps/web/src/admin/moderation` | 구조화 제보 + 사진 → admin 큐 → approve → Realtime alert; **no auto-recalc**; reporter-trust filter | `<BarrierReportForm>`, `<ModerationQueue>`, approve → alert-state | C1(barrier_reports + RLS + private bucket), C0(`moderateReport`) | RLS(self insert/read·approved public·evidence private); Realtime은 approved alert state만 broadcast(raw report 금지) |
| **F4** 다중 출력 다이어리 | `features/f4-diary` | local-first 다이어리 + 퀴즈 + 출력(SPEC §13.2 우선순위: HTML+학생PDF+쉬운글PDF+expert-verified BRF; 교사 루브릭/단체 합본은 thin derivative); **HTML alt 상시**, no Chromium. 렌더러는 CX 소유 | `<DiaryEditor>`, `buildDiaryDocument`(C0) → CX `renderPdf/renderBrf/renderHtml/...` | C0(`buildDiaryDocument`), CX(렌더러), C3, C4, F1-B(step data) | 출력 산출물 생성됨(CX 게이트); HTML alt 존재; IndexedDB local-first |
| **F5** 충남 RTO 갭 리포트 | `features/f5-dashboard`, `packages/rto` (있다면 `packages/domain/rto`) | **single gap-priority report**(impact×severity×confidence×feasibility + action items) + visitor trends("방문자≠관광객" caveat); B2G gap view (시군 히트맵 → 발전방향) | `<RtoDashboard>` | C1(`gap_metric_snapshots`/`poi_completeness_mv`/`report_trends_mv`/`rto_dashboard_snapshots`), C2(DataLab), F3(approved 집계) | axe 0; caveat 상시 표시; snapshot view로 PT-reproducible |

### 2.3 Shared-package, Integration & Quality streams

> SPEC §13.10: 공유 디렉터리(`packages/exports`, `tests/e2e`)는 **전용 owner stream**을 갖고, 루트 config·lockfile·env·`app` 라우트·`supabase/migrations`는 각각 **명명된 owner**를 갖는다. 이로써 §2.2의 collision(F1-E↔F4 on `packages/exports`, I0↔Q0 on `tests/e2e`, C2의 revalidate 라우트 침범)을 제거한다.

| Stream | 소유 디렉터리 (write) | Deliverables | Depends on | DoD |
|---|---|---|---|---|
| **CX Exports** (전용 owner) | `packages/exports` | GPX/PDF/BRF/HTML 렌더러 단일 소유 — `exportGpx`·`renderPdf`·`renderBrf`·`renderHtml`. F1-E·F4는 import만(write 금지) | C0(`buildDiaryDocument`), F1-B(step data) | GPX 1.1 valid; pdf-lib 충남교육청 form fill; braillify .brf(40×25+FF); HTML alt 존재 |
| **E0 E2E** (전용 owner) | `tests/e2e` | E2E 하니스·픽스처·셀렉터의 단일 소유. I0는 시나리오 조립, Q0는 게이트 실행만 — 둘 다 read-only consume | I0(조립 산출), 모든 feature(셀렉터 계약) | E2E 하니스 green; D.1 시나리오 import 가능 |
| **I0 Integration (D.1 assembly)** | `tests/demo`, `apps/web/src/app/[locale]/(demo)` | D.1 golden flow를 한 시나리오로 조립(SPEC §12); Serwist offline(6-POI 번들); 데모 seed; fallback drills. E2E 스펙은 **E0 하니스 위에** 작성(E0 소유 디렉터리에 write하지 않음, PR을 E0에 위임) | F1-AD, F1-B, F2, F3, F4, F5, E0 | Playwright E2E가 D.1 7-step 전 구간 통과; offline 모드에서 6-POI 가이드 동작; 데모 seed ≠ prod |
| **Q0 Quality** | `tests/{accessibility,contract}`, `.github/workflows/{ci.yml,release-readiness.yml}` | CI 게이트(typecheck/unit/axe/lighthouse/eslint-jsx-a11y/contract); 수동 NVDA/VoiceOver/TalkBack 매트릭스; license/AI-label/위치동의 audit. **`tests/e2e`는 게이트 실행만(read-only); write는 E0** | E0, 모든 stream | release-readiness 워크플로 green; 수동 SR 매트릭스 기록; audit 체크리스트 통과 |

### 2.4 Repo-root / cross-cutting ownership (SPEC §13.10 — collision-free)

소유자 없는 루트 파일은 silent cross-write의 진원지다. 각 항목에 **명명된 owner**를 둔다(타 stream은 PR을 owner에 위임).

| 디렉터리/파일 | Owner | 비고 |
|---|---|---|
| 루트 config (`package.json` workspaces, `tsconfig.base`, `turbo.json`, `eslint`/`prettier`, `vitest`/`playwright` config) | **C0 Contracts** | toolchain·타입 기준선 소유 |
| Lockfile (`pnpm-lock.yaml`) | **C0 Contracts** | 의존성 추가는 C0 PR 경유(머지 충돌 단일화) |
| Env/secrets (`.env*` 템플릿, `turbo`/Vercel env 매핑) | **C1 Data Platform** | Supabase/서버 전용 키 소유 |
| `apps/web/src/app/[locale]/**` 라우트(셸·세그먼트 레이아웃, `(demo)` 제외) | **C3 Design/A11y** | 라우트 셸·layout·focus reset 소유; feature는 `features/<dir>`만 |
| `supabase/migrations/**` | **C1 Data Platform** | DB Contract ① owner와 동일 |
| HMAC revalidate 엔드포인트 / 컨텍스트 refresh cron | **C2 KTO/ETL** (서버 전용 cron package, **`apps/web` 아님** — SPEC §13.9) | M-13 해소: refresh는 GH Actions/서버 전용 cron으로, `apps/web` 침범 금지 |
| `.github/workflows/kto-etl.yml` | **C2 KTO/ETL** | ETL 워크플로 |
| `.github/workflows/{ci.yml,release-readiness.yml}` | **Q0 Quality** | 게이트 워크플로 |

---

## 3. Dependency Graph (SPEC §9 확장)

SPEC §9 그래프를 stream 단위로 펼친 것. 화살표 = "build-before / contract-depends".

```
                 ┌────────────────────────────────────────────────────────┐
   C0 Contracts ─┤ (5 domain signatures + pure산식)                        │
                 └─┬───────────────┬───────────────┬──────────────────────┘
                   │               │               │
                   ▼               ▼               ▼
              C1 Data Platform   C3 Design/A11y   C4 Content (6-POI)
                   │               │ (→ all features)      │
                   ▼               │                        │
              C2 KTO/ETL ──────────┼────────────────────────┤
                   │               │                        │
        ┌──────────┼───────────────┴───────────┬────────────┤
        ▼          ▼                            ▼            ▼
     F1-AD        F2          F5            F1-B          F1-C
        │          │           ▲              │             ▲
        │          │           │              ▼             │
        │          │           │           F1-F · F1-E · F4 │
        │          │           │              ▲             │
   C1 ──┴──────────┴──► F3 ─(approve)─► F1-B alerts, F5     │  (F1-C reuses F1-F·C4 AAC)
                                                             │
   (F1-AD + F1-B + F2 + F3 + F4 + F5) ─► I0 (D.1 assembly) ─► Q0 (gates)
```

명시적 엣지 (SPEC §9 그대로):

- `C0 → C1 → C2 → {F1-AD, F2, F5}` — 데이터 평면 후 feature.
- `C0 → C3 → all features` — design contract는 모든 feature의 전제.
- `C0 → C4 → {F1-AD, F1-B, F1-C, F1-F, F2, F4}` — content package가 substrate.
- `C1 → F3` — 제보는 DB 계약만 있으면 시작 가능(ETL 불필요).
- `F1-B → {F1-F, F1-E, F4}` — step data model 재사용.
- `F3 approve → {F1-B alerts, F5}` — 승인된 제보가 경고/집계로 흐른다.
- `(F1-AD+F1-B+F2+F3+F4+F5) → I0 → Q0`.

**Critical path (실 의존 체인, 병렬 아님):** `C0 → C1 → C2(`detailWithTour2` 검증) → C4(6-POI evidence pack) → F1-AD(evidence card)`. 이 체인은 **48–72h 동결 슬롯으로 순차** 진행한다(SPEC §13.10; §5.1 P0a). C1은 C0 타입, C2는 C1 publish 타깃, C4는 C2 KTO 필드 결합에 의존하므로 "5개 계약 동시 동결"은 false parallelism이다. C3(design)만 C0 뒤로 이 체인과 직교 병렬. 무장애 데이터 = 제품 차별축이며 cert/legal stream을 게이트한다 (SYNTHESIS §8 build sequence). 따라서 6/14–6/28에 C2의 필드 검증과 C4의 1-POI evidence pack을 **front-load**한다.

---

## 4. Week-by-Week Build Sequence (6/14 → 9/30)

SPEC §9 timeline을 주차별 window + 목표 + 게이트로 확장. 각 window 끝 = 머지 가능한 vertical 상태 + CI green.

> **검증 트랙 (cross-window, SPEC §13.6 — September-only 아님):** 관광약자/전문가 validation은 dev와 분리된 3-pass 트랙이다.
> - **6월(now) lock:** recruitment · compensation · venue · owner · **pass-bars**(task-completion rate · critical-error count · help-request rate · comprehension · route-judgment accuracy)를 빌드 착수 전 고정한다.
> - **7월(Window 2 내) 1차:** demo-pair(공산성·부소산성) 1st validation — 정책 sign-off(doc 16 §11) 게이트와 동기.
> - **8월(Window 3~4) 2차:** full-flow 2nd validation.
> - **9월(Window 5) 회귀:** regression pass + 핵심경로 remediation.

### Window 1 — 6/14 ~ 6/28 · "Contracts + 첫 vertical slice"

> **목표:** 5개 계약을 얼리고, **단일 정의된 첫 슬라이스(SPEC §13.3)** — `공산성` **F1.A/D → 3-step verified route → HTML diary → 1 F5 gap** — 를 세운다. 이 슬라이스는 **단일 owner(I0)**, **fixtures(공산성 evidence pack + KTO 응답)**, **E2E 1개**를 가진다. (이전의 "F1-AD only" / "F1.B+F4 추가" / "full F1→F5" 세 정의는 모두 폐기 — 본 정의가 유일하다.)
>
> **충남 P0 probe (SPEC §13.7):** 이 window 안에서 **공주 `lDong` 코드 + TatsCnctr `signguCd`(공주 TBD) probe를 P0로 즉시 실행**한다 — F5/특별상 서사를 게이트하므로 슬라이스 1개와 동시에 우선 착수한다. CACF letter-of-intent는 7월 말 목표; 미확보 시 슬라이드의 "B2G to CACF" 문구를 "designed for RTO handoff"로 약화.

| stream | 이 window의 산출 | 게이트 |
|---|---|---|
| C0 | 5 시그니처 동결 + `calculateSuitability` Layer A/B/C/D TDD green | unit green |
| C1 | DB Contract v1 migration + RLS 테스트 + `packages/db` types | `db reset` + RLS green |
| C2 | KTO client transport + `detailWithTour2` 필드 검증(guide v4.3 + live probe) + 공산성 fixtures + bootstrap `ldongCode2`/`lclsSystmCode2` + **충남 공주 `lDong`/TatsCnctr `signguCd` probe (P0, SPEC §13.7)** | contract 테스트 fixtures로 green; lDong/signguCd probe 결과 기록 |
| C3 | 토큰 + a11y primitives(SkipLink/RouteFocusReset/AriaLive/FocusTrapModal) + Storybook | addon-a11y green |
| C4 | Content Zod schema + 공산성 1-POI evidence pack(SPEC §13.5, doc 16 §11) | validate-content green(1 POI, evidence pack DoD) |
| I0 (slice owner) | 공산성 F1.A/D 카드 + evidence card → 3-step verified route → HTML diary → 1 F5 gap 을 한 E2E로 관통; **슬라이스 픽스처 스펙 소유**(페르소나 P1a+P1b+P3·반나절, **3개 명명 스텝**, **1개 F5 gap 행 + 시드 입력**, 기대 `SuitabilityResult.label` 고정; SPEC §14.10) | slice E2E green; axe 0 on slice routes |
| CX (W1 최소본) | HTML diary leg의 프로듀서 — `renderHtml` 최소본만 W1 포함(전체 GPX/PDF/BRF 렌더러는 W2); I0가 import | `renderHtml` 호출로 슬라이스 HTML diary 생성 |

**Window 1 종료 게이트 (vertical-slice-first 검증):** `typecheck + unit + @axe-core/playwright(core route) + core E2E(공산성 F1.A/D → 3-step route → HTML diary → 1 F5 gap)` 전부 green. 이 게이트를 통과하지 못하면 Window 2 수평 확장을 시작하지 않는다.

> **DevEx (SPEC §14.10):** 스크립트 매니페스트의 단일 권위 = `13 부록 A`(완전판 — `etl:ingest`/`capture-fixtures`/`exports:update-golden`/`validate-content`/`start:test`↔`start:demo` 정의; 발췌 금지, 오너 C0). 테스트 러너는 **패키지별 명시**(도메인 vitest · contract/exports/component jest) + 각 config 오너. 워크스페이스 스코프 `@modu/*`. Day-1 셋업 런북은 `00_README` 참조.

### Window 2 — 6/29 ~ 7/19 · "6-POI 데이터 + F1.A/D + F1.B 공주 + F3 골격"

> **목표:** content/ETL를 6-POI로 수평 확장하고, F1의 핵심(A/D)과 공주 3 POI 경로, F3 상태기계, F4 출력 spike를 세운다.

| stream | 산출 | 게이트 |
|---|---|---|
| C2/C4 | 6-POI ETL publish + 6-POI content fill — 각 capability에 evidence pack(SPEC §13.5) | validate-content green(6 POI, evidence pack DoD); publish txn last-good |
| F1-AD | 6-POI 카드 + evidence card 완성; itinerary 반나절/당일/1박2일 | axe 0; itinerary 결정론 테스트(같은 입력→같은 결과) |
| F1-B | 공주 3 POI(공산성·무령왕릉·국립공주박물관) step 가이드 | axe 0; step마다 verified-by/date |
| F3 | 제보 폼 + admin 큐 state machine(no auto-recalc) | RLS 테스트; state 전이 unit |
| F4 (spike) | PDF/BRF/GPX 1건씩 생성 spike | 산출물 생성 확인 |

> **🔒 Scope-cut gate @ 7/19 (SPEC §13.4 — 자동, 재질의 없음):** Window 2 종료 시 **core F1→F5 경로(SPEC §13.3 슬라이스의 6-POI 확장)가 일정 뒤**이면, SPEC §13.2 cut list를 **자동 적용**한다 — F1.F 7→3요소 · F2 geofence 제거(map-tap only) · F1.E 후기/UGC GPX 제출 → 발전방향(F3가 유일 UGC 진입) · F4 출력 우선순위(HTML+학생PDF+쉬운글PDF+expert-verified BRF; 교사 루브릭/단체 합본은 thin derivative) · F5 single gap-priority report · 6-POI depth tiering(공산성·부소산성 full, 나머지 4 verification card) · 시간예산 MVP 3단. 동시에 T2/T3 데모 feature(SPEC §13.8)를 demote. 컷 목록 권위 = SPEC §13.2; 본 표에 수치/정책을 재기재하지 않는다.

### Window 3 — 7/20 ~ 8/9 · "부여 + F1.C/E/F + F2 + F3 alert + F4 6출력 + F5"

> **목표:** 나머지 feature 표면을 전부 채운다 — 부여 경로, 안전/후기/예측모드, 4언어·4채널 도슨트, 승인-알림 루프, 6 출력 다이어리, RTO 대시보드.

| stream | 산출 | 게이트 |
|---|---|---|
| F1-B | 부여 3 POI(부소산성·정림사지·국립부여박물관) step 가이드 | axe 0; verified |
| F1-C/F | SOS·AAC / 예측가능 **3요소** (F1-E 후기·UGC GPX 제출 → 발전방향; F3가 유일 UGC 진입) | axe 0 |
| F2 | 4언어 × 4채널(음성·자막·점자·수어, deep=공산성·부소산성) + **map-tap only** + AI 배지 | axe 0; transcript 가시 |
| F3 | approve → Realtime alert(approved state only) → F1-B alerts / F5 | Realtime payload 검증(raw report 미노출) |
| F4 | 6 출력 전부(학생PDF·교사루브릭·.brf·쉬운글PDF·GPX·단체합본) + HTML alt | 6 산출물 생성; HTML alt 존재 |
| F5 | single gap-priority report + visitor trends(caveat) | axe 0; caveat 표시; snapshot view |

> **🔒 Scope-cut gate @ 8/9 (SPEC §13.4 — 자동, 재질의 없음):** Window 3 종료 시 core F1→F5 경로가 일정 뒤이면, **아직 적용되지 않은 SPEC §13.2 cut(7/19 게이트와 동일 목록)을 자동 적용**하고 T2/T3 데모 feature(SPEC §13.8)를 demote한 뒤 Window 4(D.1 조립)로 넘어간다. 7/19에 이미 컷이 적용된 경우 이 게이트는 잔여 항목만 정리한다. 목적: Window 4 D.1 golden flow가 항상 견고한 core 위에서 조립되도록 보장.

### Window 4 — 8/10 ~ 8/31 · "D.1 golden flow + offline + 수동 SR + audit + fallback drills"

> **목표:** 6개 feature를 D.1 단일 서사로 조립하고, 오프라인·수동 스크린리더·법무 audit·장애 대비 드릴로 데모 견고성을 확보한다.

| stream | 산출 | 게이트 |
|---|---|---|
| I0 | D.1 golden flow E2E 조립(SPEC §12 7-step) + Serwist offline(6-POI 번들) + fallback drills(ETL 실패 시 last-good) | D.1 E2E green; offline 6-POI 동작 |
| Q0 | 수동 NVDA/센스리더 + VoiceOver + TalkBack 매트릭스 1차 | 수동 매트릭스 기록 |
| Q0 | license/AI-label/위치동의 audit(KOGL `cpyrhtDivCd`·AI 배지·PIPA 분리동의) | audit 체크리스트 |

### Window 5 — 9/1 ~ 9/15 · "실사용자 + 전문가 검증 + 데모 응답 스냅샷"

> **목표:** 검증 트랙 **3차(regression, SPEC §13.6)** 를 거치고(SPEC §11 *"non-negotiable, separate from dev"*), 데모용 모든 API 응답을 스냅샷하여 PT-day 외부 의존을 0으로 만든다. (1차=7월 demo-pair, 2차=8월 full-flow는 §4 검증 트랙 참조 — 본 window는 회귀.)

| 산출 | 게이트 |
|---|---|
| 검증 트랙 3차: 실 관광약자 + 특수교육/점자 전문가 regression 세션 (pass-bars는 6월 lock 값) | 결함 티켓화 + 핵심경로 remediation; pass-bars 충족 |
| 모든 데모 API 응답 스냅샷(crowd/weather/air 포함) | demo seed에서 외부 호출 0 |
| (옵션) 형식 cert 파일링 준비(버퍼 있으면 mid-Sept) | SPEC §2.13 — pre-review blocker 아님 |

### Window 6 — 9/16 ~ 9/30 · "RC: feature freeze + PT 자산"

> **목표:** 기능 동결, PT 시나리오·백업 영상, 데모/prod 분리, 심사/admin 계정, 인시던트 런북.

| 산출 | 게이트 |
|---|---|
| Feature freeze(버그픽스만) | release-readiness 워크플로 green |
| PT 시나리오 + 백업 데모 영상 | D.1 영상 재생 가능 |
| demo seed vs prod 분리 + judge/admin 계정 + incident runbook | 계정 로그인 + 런북 리허설 |

---

## 5. 에이전트팀이 이걸 어떻게 병렬 실행하는가

> **핵심:** stream 수가 곧 충돌 위험이다. 충돌은 코드가 아니라 **계약면과 디렉터리 경계**로 막는다. 에이전트는 "자기 디렉터리에 write, 계약을 import"라는 단 하나의 규약만 지키면 된다.

### 5.1 Phase별 동시 실행 (어느 stream이 같은 phase에 도는가)

| Phase (window) | 동시 실행 stream | 병렬/순차 구분 |
|---|---|---|
| **P0a 계약 동결 (순차, 48–72h 단위)** (W1 초) | C0 → C1 → C2 → C4 (실 의존 체인, SPEC §13.10) | **full parallel 아님.** C1은 C0 타입, C2는 C1 publish 타깃, C4는 C2 KTO 필드 결합에 의존한다. 각 계약은 **48–72h 동결 슬롯**으로 순차 green → 다음 stream 착수. C3는 C0 뒤로 이 체인과 **병렬**(design은 데이터 평면과 무관) |
| **P0b stub-UI 마일스톤** (W1 중) | F1 컴포넌트 트리(stub 위) + Foundation 잔여 | 계약 frozen이면 **stub 반환값** 위에서 UI 트리 완성. 이것은 **real-data integration과 분리된 마일스톤**(§1.1 효과) — "화면 됨"과 "검증 데이터 흐름"을 같은 게이트로 묶지 않는다 |
| **P1 첫 슬라이스 real-data 통합** (W1 말) | I0 slice(SPEC §13.3) — 공산성 F1.A/D→route→diary→F5 gap | stub-UI를 **실 evidence pack 데이터**로 교체하는 별도 마일스톤. slice E2E green = real-data 마일스톤 통과 |
| **P2 Feature fan-out** (W2–W3) | F1-AD · F1-B · F1-C · F1-E · F1-F · F2 · F3 · F4 · F5 (최대 9 병렬) | 각 feature는 `features/<dir>` 1개만 write; 공유는 계약(`packages/ui`·`packages/domain`·`packages/content-schema`·CX exports) import |
| **P3 Integration** (W4) | I0(조립) + E0(E2E 하니스) + Q0(게이트) | E0만 `tests/e2e` write; I0는 `(demo)`/`tests/demo` write + E0에 시나리오 PR 위임; feature 디렉터리는 read-only |
| **P4 Hardening** (W5–W6) | Q0 + 잔여 버그픽스 | freeze 하에 owner-stream만 자기 디렉터리 수정 |

> **순차 vs 병렬 (M-11 해소):** "5개 계약 all green before features"는 **부분만 병렬**이다. C0→C1→C2→C4→F1 은 실 의존 체인이므로 48–72h 동결 슬롯으로 순차 진행하고, 이와 직교하는 C3(design)만 C0 뒤 병렬이다. **stub-UI 마일스톤**(컴포넌트 트리 완성)과 **real-data integration 마일스톤**(실 evidence pack 흐름)은 분리된 게이트로 추적한다 — false parallelism이 critical path를 숨기지 못하게.
>
> **에이전트 디스패치 모드(메타):** P0b/P2 fan-out은 single-turn N-way **subagent burst**로 충분하다(독립 디렉터리·shared state 없음·머지 가능). teammate 프로세스는 비용만 늘린다. 다만 P0a 계약 동결 체인과 P3 I0 조립처럼 cross-turn 누적 컨텍스트가 필요한 supervisory 구간은 1–2 teammate가 정당화된다.

### 5.2 Interface freeze가 collision을 막는 메커니즘

1. **One contract owner** — 계약 ①–⑤는 각 owner-stream(C1/C2/C0/C3/C4) 1개만 변경 PR을 낸다. consumer는 절대 계약 파일을 수정하지 않는다(변경 필요 시 owner에게 요청). → 동시 write 충돌 원천 차단.
2. **Versioned schema** — 계약은 `v1`. 변경은 minor(추가, backward-compatible)면 in-place, breaking이면 `v2` 신설 + consumer 마이그레이션 윈도. → 한 쪽 변경이 다른 쪽을 조용히 깨뜨리지 않는다.
3. **Per-feature directory ownership** — monorepo가 경계를 강제한다(SPEC §4: `domain` cannot import Next.js). 각 stream의 write 범위는 §2 표의 "소유 디렉터리"로 고정. CODEOWNERS/lint로 cross-dir write를 차단한다.
4. **Stub-first** — 계약이 frozen이면 구현은 stub여도 consumer가 진행 가능. owner가 내부를 채우는 동안 consumer가 막히지 않는다.

### 5.3 Integration / hand-off protocol

stream 간 인수인계는 **계약 + green CI + fixture**로만 이뤄진다. "구두/요약"으로 넘기지 않는다.

```
HAND-OFF CHECKLIST (producer → consumer)
  [ ] 계약 파일(packages/<pkg>/src/index.ts)이 export됨
  [ ] 해당 계약의 contract 테스트가 green (tests/contract/*)
  [ ] consumer가 쓸 fixture/seed가 packages/test-fixtures 또는 supabase/seed에 있음
  [ ] 변경이면 버전 노트(무엇이 minor/breaking인지) PR 본문에 명시
  [ ] consumer는 import만으로 빌드 green (producer 내부 미완성이어도 stub로 통과)
```

- **C2 → C1 publish hand-off:** ETL은 `PUBLISH txn`으로만 read-model을 갱신한다(ingest ≠ publish). 실패 시 last-good 유지 → consumer(F1/F2/F5)는 항상 일관된 스냅샷을 본다(SPEC §4, demo-resilient).
- **F3 → F1-B/F5 hand-off:** 승인 이벤트는 Realtime으로 **approved alert state만** broadcast. raw report는 절대 흐르지 않는다(SPEC §5 RLS). F1-B는 alert state를 읽어 경고 배너만 띄운다(no auto-reroute, SPEC §8 F3).
- **계약 변경 broadcast:** owner가 계약을 bump하면 PR에 영향 consumer를 태그하고, consumer의 contract 테스트가 깨지면 그게 알림이다(silent drift 방지).

---

## 6. Vertical-Slice-First 원칙 & Per-Stream Test Gate

### 6.1 Vertical-slice-first (SPEC §11 "feature glut" mitigation)

> 18개 stream을 수평으로 동시에 절반씩 짓지 않는다. **단일 정의된 첫 슬라이스(SPEC §13.3)**를 먼저 완성(Window 1)한 뒤, 같은 골격에 POI/feature를 수평 확장한다. 이유: 통합 리스크를 마지막이 아니라 첫 주에 노출시키고, D.1 서사가 빌드 1주차부터 살아 있게 한다.

slice의 정의(Window 1 종료 상태, SPEC §13.3 유일 정의): `공산성` **F1.A/D → 3-step verified route → HTML diary → 1 F5 gap**. 단일 owner(I0) + fixtures + E2E 1개를 가진다. 이 한 줄이 F1→F5 서사(SPEC §12)의 축소판이며, F1→F5 5개 표면을 모두 관통하므로 "F1-AD only"보다 넓고 "full 6-output"보다 좁다.

### 6.2 Per-stream test gate (각 stream의 "Definition of Done"은 게이트 통과다)

전역 CI 게이트(SPEC §10): `@axe-core/playwright` violations=0(core routes; `.map-canvas` 제외→수동), `jest-axe` 컴포넌트, Storybook `addon-a11y`, Lighthouse a11y ≥0.95, `eslint-plugin-jsx-a11y`. 추가로 stream별:

| stream | 고유 게이트 (CI에서 PR fail) |
|---|---|
| C0 | `vitest` 산식 케이스(가중치·forced rules·null rule) 100% green; 시그니처 컴파일 |
| C1 | `supabase db reset` green + RLS 테스트(default-deny/anon/admin) green |
| C2 | contract 테스트가 **fixtures로** green(live API 無); single-encode(코드 30 회피) 검증 |
| C3 | Storybook addon-a11y green; 토큰 대비 4.5/3:1; primitives 단위 |
| C4 | `validate-content` green(전 POI schema 통과); **각 capability fill에 evidence pack 존재**(SPEC §13.5 / doc 16 §11: 사진·측정값·방법·검증자·2차 승인·유효기간·변경 이력); string-only verified_by/date는 publish 게이트로 금지 |
| F1-AD | axe 0 on `/poi/[id]`·`/plan`; evidence card per-axis/deduction/date/policyVersion 표시 |
| F1-B | axe 0; list=source of truth(map 제외); step마다 verified-by/date |
| F1-C | axe 0; AAC SR 읽힘; AAC 단일 출처(F1.F-6 공유) |
| F1-E | axe 0; GPX 1.1 valid; 후기 RLS approved-public |
| F1-F | axe 0; reduced-motion 존중; 보호자동반 좌표 송신 0(grep) |
| F2 | axe 0; transcript 가시; consent 게이트; AI 배지 SR 노출 |
| F3 | RLS(self/approved/evidence-private); Realtime은 approved state만(raw 미노출) |
| F4 | 6 출력 생성; pdf-lib form fill; .brf 40×25+FF; HTML alt 존재; IndexedDB local-first |
| F5 | axe 0; "방문자≠관광객" caveat 표시; snapshot view로 reproducible |
| I0 | D.1 E2E green(7-step); offline 6-POI 동작; demo seed ≠ prod |
| Q0 | release-readiness 워크플로 green; 수동 SR 매트릭스 기록; license/AI/위치동의 audit 통과 |

> **게이트 미통과 = 머지 불가 = hand-off 불가.** 이것이 "tests pass, so it's fine"이 아니라 "계약 + green CI로만 인수인계"라는 규약을 강제하는 지점이다.

---

## 7. 요약 테이블 (한눈)

| 축 | 값 |
|---|---|
| Frozen contracts | 5 (DB①/KTO②/Domain③/Design④/Content⑤) — 각 owner 1, versioned |
| Streams | 18 (C0–C4 · F1-AD/B/C/E/F · F2 · F3 · F4 · F5 · **CX Exports** · **E0 E2E** · I0 · Q0) — SPEC §13.10 공유 디렉터리 전용 owner 추가 |
| Critical path | C0 → C2(`detailWithTour2` 검증) → C4(6-POI evidence pack) → F1-AD/F1-A(evidence card) — **C1→C2→C4→F1 은 실 의존 체인(병렬 아님), 48–72h 단위 동결**(SPEC §13.10) |
| Windows | 6 (6/14→6/28→7/19→8/9→8/31→9/15→9/30) |
| 첫 vertical slice | 공산성 F1.A/D → 3-step verified route → HTML diary → 1 F5 gap (SPEC §13.3 유일 정의; owner=I0 + fixtures + E2E) |
| 충돌 방지 | one owner + versioned schema + per-feature dir ownership + stub-first |
| Hand-off | 계약 export + contract 테스트 green + fixture + 버전 노트 (구두 금지) |
| 최대 병렬 | P2에서 9 feature stream (subagent burst) |
