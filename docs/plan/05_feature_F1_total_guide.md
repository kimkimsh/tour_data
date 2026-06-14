# 05 — F1 무장애 토털 가이드 OS (구현 기획)

> **Status:** EXPANDS `SPEC.md` §7 + §8(F1) + 제안서 §F1.A–F. SPEC = 단일 진실원. 본 문서는 SPEC와 충돌하지 않으며, F1 6 sub-feature를 빌드 가능한 수준으로 상세화한다.
> **Scope:** F1.A POI 무장애 상세 카드 · F1.B 사전 베리어프리 정적 경로 · F1.C SOS·콜택시·보조기기+AAC · F1.D 시간예산(MVP 3단; "6단"=확장 천장 라벨) + 4-Layer 적합도 산식 · F1.E 큐레이션 GPX 다운로드 + 로컬 프로필(후기·UGC GPX 제출은 발전방향) · F1.F 예측 가능 백제(MVP 3요소). 산식 값·반환 contract의 단일 권위 = `16_suitability_policy.md`.
> **Stack (LOCKED):** Next.js 15 (App Router/RSC, TS, React 19) + Supabase (PG17 + PostGIS, no pgvector) + Vercel `icn1`. PWA(Serwist). **No pgvector/RAG/dynamic-routing/messaging in MVP. Layer C cap +0.12. 정적 큐레이션 6-POI 경로. 런타임 KTO 호출 없음 — DB 스냅샷.**
> **소유 모듈:** `packages/domain/{accessibility,itinerary,guide}` · `apps/web/src/features/{f1-poi-card,f1-route-guide,f1-safety,f1-planner,f1-community,f1-predictable}` · `packages/exports`.

---

## 0. F1 한눈에 — sub-feature → 모듈 → 데이터 → 워크스트림

| Sub | 명칭 | 도메인 모듈 | feature 모듈 | 핵심 read-model | 워크스트림 | MVP 단계 |
|---|---|---|---|---|---|---|
| **F1.A** | POI 무장애 상세 카드 | `domain/accessibility` | `features/f1-poi-card` | `accessibility_facts`·`poi_certifications`·`poi_entrances`·`nearby_facilities`·`context_snapshots` | F1-AD | 1차 |
| **F1.B** | 사전 베리어프리 정적 경로 | `domain/guide` | `features/f1-route-guide` | `route_guides`·`route_steps`·`route_hazards` | F1-B | 공주 1차 / 부여 2차 |
| **F1.C** | SOS·콜택시·보조기기+AAC | — (static directory) | `features/f1-safety` | `nearby_facilities`·`safety_directory`(static JSON)·`aac_cards` | F1-C | 2차 |
| **F1.D** | 시간예산(MVP 3단) + 4-Layer 산식 | `domain/accessibility`·`domain/itinerary` | `features/f1-planner` | `itinerary_templates` + F1.A reads | F1-AD | 1차 (3단; 6단=확장 천장) |
| **F1.E** | 큐레이션 GPX + 로컬 프로필 | `domain/reporting` | `features/f1-community` | `gpx_submissions`(curated)·`reviews` | F1-E | 1차 (GPX/프로필); 후기·UGC GPX=발전방향 |
| **F1.F** | 예측 가능 백제 (MVP 3요소) | — (reuses F1.B step data) | `features/f1-predictable` | `route_steps`(픽토그램 id)·`aac_cards`·`pictogram_assets` | F1-F | 2차 (3요소; 나머지 발전방향) |

**의존 그래프 (SPEC §9):** `C4 Content → F1-AD, F1-B, F1-C, F1-F` · `F1-B → F1-F, F1-E, F4` · `F3 approve → F1-B alerts`.

**핵심 설계 불변식 (모든 sub-feature 공통):**
1. **접근성 LIST = 진실원, MAP = 보조.** 지도 캔버스는 스크린리더에 비가시 → 모든 POI/단차/회전영역/경로단계는 텍스트 리스트로 먼저 존재한다 (R5 §6.3).
2. **NEVER infer.** 빈 필드는 추론 금지 → `unknown` + "정보 없음 — 현장 확인 필요", 부재사유 (a)본질제약 vs (b)운영자 미입력 분리 (SPEC §7 Null rule).
3. **런타임 KTO 호출 0.** 모든 데이터는 ETL이 Supabase에 publish한 read-model에서 RSC `unstable_cache`로 읽는다. 변동 데이터(혼잡/날씨/대기)도 단주기 스냅샷.
4. **결정론(determinism).** `calculateSuitability`/`buildItinerary`는 동일 입력 → 동일 출력. PT에서 매 실행 동일 결과 (정적 템플릿 선택, 일반 최적화기 아님).
5. **투명성(transparency).** 점수는 항상 per-axis 기여·감점·데이터 날짜·`policyVersion`을 함께 반환 → F1.A 증거 카드가 렌더.

---

## 1. 데이터 모델 — F1 read-models (DDL 스케치)

> SPEC §5 테이블의 F1 관련 서브셋. **public read = published 행만.** RLS default deny. 모든 정규화 fact는 `source / source_field / source_updated_at / ingested_at / verified_at` 출처 4-튜플을 보유한다.

### 1.1 capability 모델 — `accessibility_facts` (F1.A·F1.D 코어)

도메인을 KTO 필드명(미검증)에서 분리하는 핵심 테이블. `capability_code`는 도메인 enum, KTO `detailWithTour2` 필드는 `source_field`에만 기록.

```sql
-- domain capability codes are framework-stable; KTO field names live in source_field only
CREATE TYPE capability_status AS ENUM ('supported', 'partial', 'unsupported', 'unknown');

CREATE TYPE absence_reason AS ENUM (
  'intrinsic',     -- (a) 본질 제약: 사적지 계단 등 문화재 보존 사유 (개선 불가)
  'unentered',     -- (b) 운영자 미입력: F5 갭 리포트 우선 (개선 가능)
  'not_applicable' -- capability irrelevant to this POI type
);

CREATE TABLE accessibility_facts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id          uuid NOT NULL REFERENCES pois(id),
  capability_code text NOT NULL,            -- e.g. 'entrance_step_free', 'braille_block', 'accessible_restroom'
  status          capability_status NOT NULL,
  absence_reason  absence_reason,           -- non-null only when status IN ('unsupported','unknown')
  detail          text,                     -- human-readable note (KO), nullable
  source          text NOT NULL,            -- 'KorWithService2' | 'BF인증' | 'UGC' | 'survey' | ...
  source_field    text,                     -- raw KTO key, e.g. 'wheelchair' (audit only; domain never reads this)
  source_updated_at timestamptz,            -- KTO modifiedtime (drives Layer D freshness)
  verified_at     timestamptz,              -- field-survey or UGC verification date
  published       boolean NOT NULL DEFAULT false,
  UNIQUE (poi_id, capability_code, source)
);
CREATE INDEX ON accessibility_facts (poi_id) WHERE published;
```

**capability_code 표준 집합 (도메인 enum, 21 → 분류축):** `detailWithTour2` 21필드를 도메인 capability로 매핑. 정확한 KTO 필드 키는 **guide v4.3 검증 후 확정**(SPEC §11 verify-at-build-time, 미검증이면 `unknown`). 매핑 표는 §2.2.

### 1.2 출입구·인증·시설·맥락 (F1.A 보조 영역)

```sql
CREATE TABLE poi_entrances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id        uuid NOT NULL REFERENCES pois(id),
  name          text NOT NULL,              -- '서문' | '북문' | '정문'
  geom          geography(Point, 4326),
  slope_grade   numeric(4,1),              -- NGII DEM 유도 경사도(%) — 정적, 런타임 DEM 호출 없음
  step_free     boolean,                   -- null = 미확인
  photo_refs    text[],                    -- poi_media ids / storage paths
  ugc_verify_count int NOT NULL DEFAULT 0,
  verified_at   timestamptz,
  published     boolean NOT NULL DEFAULT false
);

CREATE TABLE poi_certifications (        -- Layer C 입력
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id    uuid NOT NULL REFERENCES pois(id),
  scheme    text NOT NULL,               -- 'BF' | '열린관광지' | 'KQ'
  grade     text,                        -- BF: '예비' | '일반' | '우수'
  period    daterange,
  source    text NOT NULL,
  published boolean NOT NULL DEFAULT false
);

CREATE TABLE nearby_facilities (         -- F1.A 응급/화장실/보조기기 + F1.C
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id    uuid NOT NULL REFERENCES pois(id),
  kind      text NOT NULL,               -- 'restroom' | 'AED' | 'hospital' | 'equipment'
  name      text NOT NULL,
  geom      geography(Point, 4326),
  distance_m int,                        -- precomputed to POI centroid
  detail    jsonb,                       -- phone, hours, rental contact, etc.
  source    text NOT NULL,
  published boolean NOT NULL DEFAULT false
);

CREATE TABLE context_snapshots (         -- Layer A timeContext (단주기 스냅샷, 런타임 KTO 호출 없음)
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id           uuid NOT NULL REFERENCES pois(id),
  crowd_index      int,                  -- TatsCnctr 0–100 (not headcount)
  weather_warning  text,                 -- KMA 특보 코드 (폭염/호우/...) or null
  air_grade        text,                 -- AirKorea 등급
  effective_period tstzrange NOT NULL,
  fetched_at       timestamptz NOT NULL
);
```

### 1.3 경로 (F1.B·F1.F)

```sql
CREATE TABLE route_guides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id        uuid NOT NULL REFERENCES pois(id),
  persona_flags text[] NOT NULL,         -- ['wheelchair','low_vision','stroller','low_stimulus']
  version       int NOT NULL,
  verified_by   text,                    -- 현장 검수자 (route-error 위험 완화, SPEC §11)
  verified_at   timestamptz,
  published     boolean NOT NULL DEFAULT false,
  UNIQUE (poi_id, version)
);

CREATE TABLE route_steps (               -- POI당 5~12 단계 (제안서 §F1.B)
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      uuid NOT NULL REFERENCES route_guides(id),
  seq           int NOT NULL,            -- 1-based; F1.F-2 '1단계 1행동'의 단위
  action        text NOT NULL,          -- '서문 진입 (평탄 30m, 점자블록 유)'
  geom          geography(LineString, 4326),
  distance_m    int,
  slope_grade   numeric(4,1),
  surface       text,                   -- 'paved' | 'gravel' | ...
  photo_refs    text[],
  easy_text     text,                   -- 쉬운글 (7세 어휘) — F1.F·F2 공유
  pictogram_id  text,                   -- F1.F-1 일정 카드 (KS/ARASAAC id)
  tts_text      text,                   -- TTS 읽기용 (5채널 출력)
  UNIQUE (route_id, seq)
);

CREATE TABLE route_hazards (             -- 구간별 장애요소
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id   uuid NOT NULL REFERENCES route_steps(id),
  type      text NOT NULL,              -- 'step' | 'slope' | 'narrow' | 'crossing' | 'surface'
  severity  text NOT NULL,              -- 'low' | 'medium' | 'high'
  geom      geography(Point, 4326),
  permanence text NOT NULL              -- 'permanent' | 'temporary'(F3 검수 통과 시)
);

CREATE TABLE turning_areas (             -- 휠체어 회전 가능 영역 폴리곤 (F1.A 지도 + F1.B 단계)
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id    uuid NOT NULL REFERENCES pois(id),
  geom      geography(Polygon, 4326),
  diameter_m numeric(4,1),              -- 회전 직경 (min ~1.5m)
  published boolean NOT NULL DEFAULT false
);
```

### 1.4 일정 템플릿 (F1.D) · 후기/GPX (F1.E) · 정적 디렉터리/AAC (F1.C·F1.F)

```sql
CREATE TABLE itinerary_templates (       -- 정적 큐레이션, 일반 최적화기 아님 (SPEC §7)
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family        text NOT NULL,           -- '공주반나절' | '공주부여1박2일' (확장은 동일 family 내)
  budget_mode   text NOT NULL,           -- 'half_day'|'full_day'|'one_night'|'two_night'
  ordered_pois  uuid[] NOT NULL,         -- POI 방문 순서
  slot_durations jsonb NOT NULL,         -- {stay,transfer,rest,meal,lodging} per-POI minutes
  persona_flags text[] NOT NULL,
  version       int NOT NULL,
  published     boolean NOT NULL DEFAULT false
);

CREATE TABLE reviews (                    -- F1.E 페르소나별 후기 분리 (RLS: approved public)
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id    uuid NOT NULL REFERENCES pois(id),
  persona   text NOT NULL,               -- 'wheelchair'|'low_vision'|... (단일 평점 금지)
  dimensions jsonb NOT NULL,             -- {entrance:4, restroom:5, rest:3} 0–5
  body      text,
  reporter_id uuid,                      -- Supabase anonymous auth
  status    text NOT NULL DEFAULT 'pending', -- 'pending'|'approved'|'rejected'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gpx_submissions (            -- F1.E GPX 환류 (검수 통과만 공개)
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id  uuid NOT NULL REFERENCES route_guides(id),
  source    text NOT NULL,               -- 'curated' | 'ugc'
  gpx_xml   text,                        -- GPX 1.1 (WGS84/metric)
  moderation_status text NOT NULL DEFAULT 'pending',
  published boolean NOT NULL DEFAULT false
);

-- F1.C/F1.F static content (content/ package; published once, never per-user)
CREATE TABLE aac_cards (                  -- F1.C 도움요청 5종 = F1.F-6 예외 카드 (데이터 공유)
  id          text PRIMARY KEY,          -- 'help' | 'pain' | 'too_loud' | 'lost' | 'restroom'
  label_ko    text NOT NULL,
  label_en    text NOT NULL,
  label_ja    text NOT NULL,
  label_zh    text NOT NULL,
  pictogram_id text NOT NULL,            -- ARASAAC primary id
  tts_refs    jsonb NOT NULL,            -- {ko,en,ja,zh} audio storage paths
  license     text NOT NULL             -- 'CC BY-NC-SA 4.0 ARASAAC' (출처 표기)
);

CREATE TABLE pictogram_assets (           -- F1.F-1 48 픽토그램 (6 POI × 8단계) 재활용 셋
  id        text PRIMARY KEY,
  source    text NOT NULL,               -- 'ARASAAC'|'KS X ISO 7001'|'복지부'|'KODDI'
  license   text NOT NULL,
  transformable boolean NOT NULL,        -- 복지부 2유형/KODDI 4유형 = false (원형 유지)
  svg_ref   text NOT NULL,
  keyword_ko text NOT NULL
);
```

> `safety_directory`(콜택시·보조기기 대여 연락처)는 정적 JSON으로 `content/` 패키지에 두고 `deploy-atomic-config-bundling` 패턴으로 JS 청크에 정적 import한다(스키마-데이터 버전 스큐 회피). DB 테이블 불필요(전화 딥링크만).

---

## 2. F1.A — POI 무장애 상세 카드

> 사용자가 "갈까 말까"가 아니라 **"어떻게 갈까"** 를 결정하게 한다. 핵심 차별점 = **4-Layer 점수의 투명한 증거 렌더링**.

### 2.1 카드 영역 명세 (모든 region)

| # | 카드 영역 | 컴포넌트 | 데이터 소스 | 접근성 요구 |
|---|---|---|---|---|
| 1 | **상단 3-class 라벨 + 부재사유** | `SuitabilityLabel` | `SuitabilityResult.label` + `deductions` | 색만으로 구분 금지(아이콘+텍스트); `aria-label` 점수+사유 |
| 2 | **투명 점수 증거 카드** | `ScoreEvidenceCard` | `SuitabilityResult.{score, axes[], deductions[], evidenceConfidence, dataDates, policyVersion}` (doc 16 §1) | 4-Layer 분해를 테이블로; 각 축 기여 막대는 텍스트 수치 병기 |
| 3 | **출입구별 사진 + 경사도** | `EntranceGallery` | `poi_entrances` (+ `poi_media`) | 사진 `alt`; 경사도 텍스트("서문 평탄 2%"); UGC 검증 횟수 표기 |
| 4 | **휠체어 회전 영역 지도** | `TurningAreaMap` | `turning_areas` 폴리곤 + `route_hazards`(단차 마커) | **LIST 우선**; CustomOverlay DOM 마커; 폴리곤 직경 텍스트 |
| 5 | **점자블록/음성 안내 경로** | `GuidanceSystemPanel` | `accessibility_facts` (braille/audio/guidesystem) | P2a 핵심; 상태 3-class + 부재사유 |
| 6 | **휴식 인프라** | `RestInfraPanel` | `accessibility_facts`(rest) + `nearby_facilities` | P1b 직격; 화장실 간격 m 텍스트 |
| 7 | **장애인 화장실** | `AccessibleRestroomPanel` | `nearby_facilities`(restroom) + 행안부 표준 | 위치 m + 픽토그램 |
| 8 | **응급 인프라** | `EmergencyInfraPanel` | `nearby_facilities`(AED/hospital) 500m/1km cutoff | 거리·전화 딥링크 |
| 9 | **페르소나×필드 매트릭스** | `PersonaFieldMatrix` | `accessibility_facts` + persona 가중치(§4.3) | critical/보조/무관 정렬; SR용 테이블 캡션 |
| 10 | **현장 사진 미리보기** | `PhotoPreviewStrip` | `poi_media` (PhotoGallery + UGC) | `cpyrhtDivCd` 출처/라이선스 표기 |

### 2.2 capability_code 매핑 (detailWithTour2 21필드 → 도메인 enum)

> KTO 필드 키는 **guide v4.3 검증 후 확정**. 검증 전엔 `unknown`. 도메인은 `capability_code`만 읽는다.

| 분류 | KTO `source_field`(미검증) | 도메인 `capability_code` | 1차 페르소나 |
|---|---|---|---|
| 지체 | `wheelchair` | `wheelchair_access` | wheelchair (critical) |
| 지체 | `exit` | `exit_step_free` | wheelchair (critical) |
| 지체 | `elevator` | `elevator` | wheelchair (critical) |
| 지체 | `restroom` | `accessible_restroom` | wheelchair·senior (critical) |
| 지체 | `room` | `barrier_free_room` | wheelchair (보조) |
| 지체 | `auditorium` | `accessible_auditorium` | wheelchair (보조) |
| 시각 | `braileblock` | `braille_block` | low_vision (critical) |
| 시각 | `audioguide` | `audio_guide` | low_vision (critical) |
| 시각 | `guidesystem` | `guidance_system` | low_vision (보조) |
| 시각 | `bigprint` | `large_print` | low_vision (보조) |
| 시각 | `helpdog` | `guide_dog_ok` | low_vision (critical) |
| 청각 | `signguide` | `sign_guide` | deaf (critical) |
| 청각 | `videoguide` | `video_subtitle` | deaf (critical) |
| 청각 | `hearingroom` | `hearing_room` | deaf (보조) |
| 영유아 | `stroller` | `stroller_access` | family (critical) |
| 영유아 | `lactationroom` | `lactation_room` | family (보조) |
| 영유아 | `babysparechair` | `baby_chair` | family (무관/보조) |
| 공통 | `parking` | `accessible_parking` | wheelchair·senior (보조) |
| 공통 | `route` | `access_route_desc` | all (메타) |
| 공통 | `publictransport` | `public_transport` | all (메타) |
| 공통 | `ticketoffice` | `ticket_office_access` | wheelchair (무관) |

### 2.3 컴포넌트 트리 (F1.A)

```
<PoiAccessibilityCard poiId>                      // RSC; reads published read-models
├── <SuitabilityLabel result>                     // 3-class + 부재사유 칩
├── <ScoreEvidenceCard result>                    // ← 투명 4-Layer 증거 (§2.4)
│   ├── <AxisBreakdownTable axes>                 // Layer A 7축 기여 테이블
│   ├── <LayerMultiplierRow layer="B|C|D" />      // B/C/D 배수 + 근거
│   ├── <DeductionList deductions />              // forced rules 감점 사유
│   └── <DataFreshnessFooter dataDates policyVersion />
├── <EntranceGallery entrances>                   // client island (사진 lazy)
├── <TurningAreaMap polygons hazards>             // client island; LIST=truth (§7)
│   ├── <AccessibleTurningList />                 // ← source of truth
│   └── <KakaoTurningAreaCanvas />                // CustomOverlay 폴리곤/마커
├── <GuidanceSystemPanel facts />
├── <RestInfraPanel facts facilities />
├── <AccessibleRestroomPanel facilities />
├── <EmergencyInfraPanel facilities />            // 500m/1km cutoff
├── <PersonaFieldMatrix facts personaWeights />
└── <PhotoPreviewStrip media />                   // cpyrhtDivCd 출처 표기
```

### 2.4 투명 점수 증거 렌더링 — `ScoreEvidenceCard` (차별점)

`SuitabilityResult`(doc 16 §1)을 받아 **데이터활용 20점 + 기획력**을 직격하는 증거 카드를 렌더. 단순 점수가 아니라 **왜 그 점수인지**를 보여준다.

> 아래는 *레이아웃 illustration*이다. 〈숫자〉 자리의 실제 값·점수는 §4.5 골든 케이스 출력에서 렌더되며, 문서에 손계산 수치를 고정하지 않는다(M-3). 축 라벨·구조·푸터 표기 규칙만 고정.

```
┌─ 공산성 · 휠체어+시니어+가족 · 반나절 ───────────────────┐
│  [〈label〉] 〈score〉점   (70 미만 → 대체 POI 함께 표시)   │
│                                                          │
│  Layer A (POI 본질) = 〈A〉                                │
│   진입가능성   0.30 × 〈v〉 = 〈c〉  [supported]            │
│   동선연속성   0.18 × 〈v〉 = 〈c〉  [worst-segment]        │
│   편의시설     0.15 × 〈v〉 = 〈c〉                          │
│   휴식인프라   0.12 × 〈v〉 = 〈c〉                          │
│   시간대적합   0.10 × 〈v〉 = 〈c〉  [혼잡 index]            │
│   사회적안전   0.08 × 〈v〉 = 〈c〉  [AED 거리]             │
│   UGC검증      0.07 × 〈v〉 = 〈c〉  [unknown 보정]          │
│  ─ A 합계 = 〈A〉                                          │
│  Layer B (페르소나 적합) = 〈B〉  [min personaFit]         │
│  Layer C (인증) = 〈C〉  [BF 등급]                         │
│  Layer D (신뢰도) = 〈D〉  [평균 갱신일]                   │
│                                                          │
│  점수 = round(100 × A × B × C × D) = 〈score〉            │
│  데이터 신뢰도(evidenceConfidence): 〈0–100〉 (점수와 별도)│
│  ⚠ 데이터 날짜: dataDates[]                               │
│  ⚠ policyVersion: suitability-policy-v1                   │
│  ⚠ 감점: deductions[] (forced-rule 한국어)               │
└──────────────────────────────────────────────────────────┘
```

> **렌더 규칙:** (1) 모든 배수·기여는 텍스트 수치를 함께 노출(막대만 X). (2) 라벨 강제 순서는 doc 16 §9 — known critical blocker(→`대체추천`)를 evidence gap(→`정보없음`)보다 **먼저** 평가하고 **둘 다 있으면 둘 다** 표면화; `coverage<0.65`면 라벨이 `주의`로 상한(cap, doc 16 §6). (3) `deductions`는 forced rule 명을 한국어로 풀어 표기. (4) `evidenceConfidence`는 점수와 **분리**된 "데이터 신뢰도" 칩으로(doc 16 §7), `dataDates`/`policyVersion`은 항상 푸터에. (5) 색 대비 4.5:1, 라벨은 색+아이콘+텍스트 3중.

### 2.5 F1.A 수용 기준

- [ ] 6 POI 모두 카드 렌더; `unknown` 필드는 "정보 없음 — 현장 확인 필요" + 부재사유 (a)/(b) 라벨.
- [ ] `ScoreEvidenceCard`가 7축 기여 + B/C/D 배수 + 감점 + 데이터 날짜 + policyVersion을 모두 표기.
- [ ] 회전영역 지도가 LIST 대안을 가지며 axe `.exclude('.map-canvas')` 후 수동 체크리스트 등록.
- [ ] 페르소나×필드 매트릭스가 선택 페르소나의 critical 4를 상단 정렬.
- [ ] 모든 사진 `cpyrhtDivCd` 기반 출처/Type3 변형금지 준수.

---

## 3. F1.B — 사전 베리어프리 정적 경로

> 실시간 GPS 음성 내비 대신 **사전 검수된 무장애 가이드를 현장에서 단계별 참조**. 오프라인 작동 + GPS 송신 최소화. **동적 라우팅/DEM 런타임 호출 없음** — 경사도는 NGII DEM 유도 정적 속성(SPEC §2.6, R5 §3).

### 3.1 동선 단계 카드 (`route_steps`)

POI 진입~퇴장을 5~12 단계로 사전 분할. 각 단계 = `route_steps` 1행. 예(공산성 서문 코스):

| seq | action | distance_m | slope | hazard | easy_text | pictogram |
|---|---|---|---|---|---|---|
| 1 | 서문 진입 (평탄, 점자블록 유) | 30 | 2% | — | "넓고 평평한 길이에요" | `walk_flat` |
| 2 | 우측 광장 회전영역 (직경 3m) | 15 | 1% | — | "여기서 돌 수 있어요" | `turn_area` |
| 3 | 휴식 벤치 1번 (그늘) | 10 | 0% | — | "여기서 쉬어요" | `rest_bench` |
| 4 | 만하루 진입로 (경사 6° 우회로) | 40 | 6% | slope/medium | "조금 가파른 길, 천천히" | `slope_up` |
| … | … | … | … | … | … | … |

### 3.2 5채널 정적 출력

단일 `route_steps` 행 → 5채널 동시 생성 (사전 준비, 런타임 변환 최소화):

| 채널 | 소스 컬럼 | 생성 |
|---|---|---|
| 지도 | `geom` (LineString) | Kakao Polyline (오프라인 시 IndexedDB GeoJSON) |
| 사진 | `photo_refs` | PhotoGallery + UGC (CacheFirst) |
| 쉬운글 | `easy_text` | F1.F·F2 공유 (7세 어휘) |
| 픽토그램 | `pictogram_id` → `pictogram_assets` | KS/ARASAAC SVG |
| TTS 읽기 | `tts_text` | 사전 합성 MP3(Storage) 또는 클라이언트 SpeechSynthesis |

### 3.3 오프라인 번들 (Serwist + IndexedDB)

"이 가이드 오프라인 저장" 탭 시 POI 1개 가이드 패키지를 IndexedDB에 영속(R5 §5):

```ts
// IndexedDB object store: poiGuides
interface OfflineGuideBundle {
  poiId: string;
  routeId: string;
  steps: RouteStep[];          // action/easy_text/pictogram_id/tts_text
  photos: Blob[];              // client-compressed (Canvas API)
  gpxXml: string;              // GPX 1.1
  brailleUnicode: string;      // U+2800 block (F4 점자 연동)
  turningAreas: GeoJSON.Polygon[];
  hazards: GeoJSON.Point[];
  slopeTags: { stepSeq: number; grade: number }[];
  updatedAt: string;
}
```

- App shell = Serwist precache; 사진 = CacheFirst; 경로 JSON = NetworkFirst(timeout 3s) → 캐시 fallback.
- `output:'export'` 금지(Supabase SSR 충돌) → 일반 Vercel 배포 + 명시적 "오프라인 다운로드" 액션(R5 §5.1).

### 3.4 GPX 환류 (F1.E 연동)

검수 통과 `gpx_submissions`만 카카오/구글/네이버맵 "따라가기" 딥링크 제공(R3 §2.2):

```ts
// 카카오 1차 (좌표 다중경유 지원), 구글 2차, .gpx 다운로드 병행
function buildKakaoRouteUrl(steps: RouteStep[]): string {
  const pts = steps.map(s => `${s.lat},${s.lng}`);
  const sp = pts[0], ep = pts[pts.length - 1];
  const vps = pts.slice(1, -1).slice(0, 5)              // 최대 5 경유지
    .map((p, i) => `vp${i === 0 ? '' : i + 1}=${p}`).join('&');
  return `kakaomap://route?sp=${sp}&${vps}&ep=${ep}&by=foot`;
}
```

### 3.5 컴포넌트 트리 + 수용 기준 (F1.B)

```
<RouteGuideView poiId routeId>
├── <RouteStepList steps>                  // ← source of truth (단계 텍스트)
│   └── <StepCard step>                     // 5채널: 사진/지도/쉬운글/픽토/TTS
├── <RouteMapCanvas polyline hazards />     // CustomOverlay; 보조
├── <HazardLegend hazards />                // 색만 X — 아이콘+텍스트
├── <AlternativeRouteToggle />              // 우천/혼잡/공사 우회 (F3 연동)
├── <OfflineDownloadButton bundle />        // IndexedDB 영속
└── <MapAppDeepLinks kakao google naver />  // GPX 환류
```

- [ ] 공주 3 POI 1차, 부여 3 POI 2차. 각 경로 `verified_by`/`verified_at` 필수(route-error 완화).
- [ ] 단계 LIST가 지도 없이 완전 사용 가능(스크린리더 단독 통과).
- [ ] 오프라인 다운로드 후 네트워크 차단 상태에서 5채널 모두 렌더.
- [ ] GPX 딥링크가 카카오 1차 + 미설치 web fallback + `.gpx` 다운로드 제공.

---

## 4. F1.D — 시간예산(MVP 3단; "6단"=확장 천장) + 4-Layer 적합도 산식

> **핵심 빌드 산출물.** `calculateSuitability`는 결정론적 순수 함수(`packages/domain/accessibility`, framework-free, TDD). 동일 입력 → 동일 출력.

### 4.1 capability value (정책: doc 16 §3)

> **산식 값·매트릭스·임계값·conflict 규칙의 단일 권위 = `16_suitability_policy.md`.** 본 절은 값을 재기술하지 않는다. capability value map(supported/partial/unsupported/unknown), Σw=1.00 축 가중치, coverage 분리 반환 규칙은 모두 doc 16 §3을 따른다. SPEC §7은 산식의 *형태(shape)*, doc 16은 모든 *숫자*의 소유자.

### 4.2 TypeScript 시그니처

> **반환 contract `SuitabilityResult` + `AxisContribution`의 단일 권위 = `packages/domain/policy/types.ts` (사양: doc 16 §1).** F1.A 카드·F4 다이어리·F5 대시보드가 모두 이 동일 shape를 import하고 각 소비자 CI에 golden fixture로 검증한다. 본 문서는 contract 필드를 재기술하지 않는다 — canonical 점수 필드명은 `score`(절대 `total` 아님), `evidenceConfidence`/`coverage`/`knownCriticalBlockers`/`alternatives` 등 전체 필드는 doc 16 §1을 단일 진실원으로 한다.

`calculateSuitability`의 **입력 shape**(F1 도메인 고유, 본 문서 소유)는 아래와 같다. 반환 타입은 doc 16 §1의 `SuitabilityResult`.

```ts
// packages/domain/accessibility — pure, deterministic. No I/O, no Next import.
// Returns the authoritative SuitabilityResult from packages/domain/policy/types.ts (doc 16 §1).
import type { SuitabilityResult, PersonaId } from '@domain/policy/types';

type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

interface CapabilityFact {
  capabilityCode: string;
  status: CapabilityStatus;
  sourceUpdatedAt: string | null;   // ISO; drives Layer D
  verifiedAt: string | null;
}

interface CalculateSuitabilityInput {
  poiFacts: CapabilityFact[];
  routeGuide: {                      // worst-segment continuity inputs
    segmentScores: number[];        // per-segment 0..1
    maxNoRestTravelMin: number;     // longest no-rest stretch
  } | null;
  personaIds: PersonaId[];          // e.g. ['wheelchair','senior','family']
  timeContext: {
    crowdIndex: number | null;      // 0..100 (TatsCnctr)
    weatherWarning: string | null;
    airGrade: string | null;
  };
  certifications: { scheme: 'BF' | '열린관광지' | 'KQ'; grade?: string }[];
  ugcSummary: { verifiedCapabilityDates: Record<string, string> };
  calculationDate: string;          // ISO; freshness baseline (PT-stable: inject fixed date)
  policyVersion: string;            // e.g. 'suitability-policy-v1'
}

function calculateSuitability(input: CalculateSuitabilityInput): SuitabilityResult;
```

> **CLAUDE.md 주: `SuitabilityResult`는 순수 TS 도메인(C++ 아님)** — shared_ptr 규칙은 C++ 전용이며 본 스택(TS)에는 적용되지 않는다. 단, 동일 정신으로 결과는 항상 **전체 breakdown을 담은 단일 객체**로 반환(인스펙션-한-번 가정 금지) — 호출자가 캐시/큐/스레드에 넣어도 안전.

### 4.3 Layer 산식 (결정론 단계 — 값은 doc 16)

> **모든 산식 값의 단일 권위 = doc 16.** 본 절은 4-Layer가 *어떤 순서로 결정론적으로 결합되는지*만 요약하고, 가중치·임계값·매트릭스는 재기술하지 않는다.

- **Layer A** (POI 본질, persona-neutral, Σw=1.00): 7축(entry/continuity/amenities/rest/timeContext/safety/verifiedUgc) 가중합. 축 가중치·축별 value 계산(continuity=worst-segment min, rest 임계, crowd/heat/safety 매핑) → **doc 16 §3 + §4.3/§4.4**.
- **Layer B** (페르소나 적합, `[0.75, 1.00]`, 선택 페르소나 간 `min`): persona×capability tier 매트릭스, multi-persona 규칙 → **doc 16 §4**. min 사용으로 한쪽 페르소나의 장벽이 가려지지 않는다(할아버지 vs 손녀).
- **Layer C** (인증, cap +0.12, guarded): 인증만으로는 라벨 band 경계를 넘길 수 없다(M-5 guard). KQ=metadata only → **doc 16 §5**.
- **Layer D** (신뢰도): per-fact freshness decay; 승인 UGC는 관련 capability 날짜만 갱신 → **doc 16 §6**. `evidenceConfidence`는 점수와 **분리** 반환(§7).
- **최종 결합:** `score = round(clamp(100 · A · B · C · D, 0, 100))` (산식 형태는 SPEC §7).

### 4.4 Forced rules + 라벨 순서 (M-4 — 권위 doc 16 §9)

> **라벨 강제 규칙과 평가 순서의 단일 권위 = doc 16 §9; coverage cap = doc 16 §6.** 본 절은 순서를 재기술하지 않고 UX가 의존하는 불변식만 명시한다.

- **평가 순서(doc 16 §9):** (1) **known critical blocker 먼저** — 선택 페르소나의 critical capability가 `unsupported`면 라벨 **`대체추천`**, `score ≤ 49`, 해당 항목을 `knownCriticalBlockers`에 기재. (2) **그 다음 evidence gap** — critical이 `unknown`이거나 `coverage < 0.65`면 라벨 **`정보없음`**(현장 확인 필요). **둘 다 존재하면 둘 다 표면화**(blocker와 gap을 함께 노출). (3) 그 외 점수 band. (4) `score < 70` → `alternatives` 채움(§4.6 / doc 16 §10).
- **Coverage cap(M-2, doc 16 §6):** `coverage < 0.65`면 점수와 무관하게 라벨은 **`주의`**로 상한(희소 데이터가 '방문가능'으로 표시될 수 없음).
- **Null rule:** 빈 필드 → `unknown` + "정보 없음 — 현장 확인 필요", 부재사유 (a)본질 vs (b)미입력. **NEVER infer.**

### 4.5 Worked example — 공산성, 반나절, 휠체어+시니어+가족

> **이 worked example의 모든 숫자는 손계산이 아니라 `packages/domain/policy/__golden__`의 골든 케이스에서 생성·주입된다(doc 16 §1·§11).** 문서에 하드코딩된 단계별 수치를 두지 않는다 — 정책(matrices/thresholds/tiers)이 바뀌면 골든 재베이스라인이 표를 다시 채운다. 따라서 §2.4 증거 카드와 본 절은 동일 골든 케이스의 단일 출력에서 나오며 서로 모순될 수 없다.

- **입력 facts** (공산성, 휠체어+시니어+가족, 반나절): 골든 케이스 fixture `{input}`. 대표 facts 예 — `wheelchair_access`/`exit_step_free` supported, `elevator` partial, `accessible_restroom` supported, `stroller_access` supported, `lactation_room` unknown.
- **출력** `SuitabilityResult` (golden `{expected}`): `score`, `label`, `axes[]`(Layer A 7축 기여), `layerB/C/D`, `coverage`, `evidenceConfidence`, `knownCriticalBlockers`, `deductions[]`(forced-rule trail), `alternatives[]`, `dataDates`, `policyVersion`.
- **라벨·대체추천 동작:** critical 중 unsupported/unknown이 없고 coverage가 cap(0.65)을 통과하면 점수 band로 라벨 결정. `score < 70`이면 `alternatives`가 채워진다(검증 카드 보유 POI만; doc 16 §10).

증거 카드(§2.4)의 ASCII 예시는 *레이아웃*을 보이기 위한 것이며, 실제 화면 수치는 동일 골든 출력으로 렌더된다 — 문서 간 손계산 수치 불일치(구 M-3)는 이 방식으로 구조적으로 제거된다.

### 4.6 시간예산 buildItinerary (MVP 3단; "6단"=확장 천장, 정적 템플릿 선택)

```ts
function buildItinerary(input: {
  budgetMode: 'half_day' | 'full_day' | 'one_night' | 'two_night';
  personaIds: PersonaId[];
  templates: ItineraryTemplate[];     // published, curated
}): ItineraryResult;  // selects a template, NOT a general optimizer
```

- **total = POI stay + 고정 transfer matrix + persona rest + meals + lodging-switch cost.**
- **persona multipliers = max, 곱 아님** (anti-explosion). P1b 시니어 휴식 1.25, P3 식사 1.20, 외국인 도슨트 1.30 중 **최댓값**만 적용.
- 반나절→1박2일 = **동일 template family 내 확장** (PT-stable, 매 실행 동일). 일반 최적화기 사용 금지.

> **시간예산 scope (SPEC §13.2):** MVP = **3단 (반나절·당일·1박2일)**. **2박3일 + 익산/논산 확장은 발전방향.** 문서 제목·UI의 "6단"은 *확장 천장(expansion-ceiling) 라벨*이며 MVP 단계 수가 아니다 — 슬라이더는 3단으로 출시하고 동일 template family 구조가 추후 6단까지 무리 없이 확장됨을 나타낸다.

| 모드 | 예산 | POI 묶음 | MVP |
|---|---|---|---|
| 반나절 | 180–240분 | 1 POI 정밀 | 1차 (MVP) |
| 당일 | 480–600분 | 2–3 POI | 1차 (MVP) |
| 1박2일 | 1440분 | 4–6 POI + 야간 + 숙박 | 1차 (MVP) |
| 2박3일 | 2880분 | 6 POI + 익산/논산 1 | 발전방향 |

> **대체추천 정책 (M-8/M-9, 권위 doc 16 §10):** `score < 70`일 때 `alternatives[]`는 **검증된 접근성 카드 + 계산된 점수를 보유한 POI(MVP 6-POI)만** 담는다. KTO `TarRlteTar` "관련 관광지"는 접근성 안전 대체가 아니므로 **별도 목록 "관련 관광지 (접근성 미검증)"** 로 경고와 함께 분리 표시한다 — 절대 검증 대체 목록에 섞지 않는다.

### 4.7 컴포넌트 트리 + 수용 기준 (F1.D)

```
<PlannerView>
├── <BudgetModeSlider modes />              // MVP 3단 (반나절·당일·1박2일); "6단"=확장 천장 라벨
├── <PersonaSelector personaIds />          // P1~P4 + 외국인 토글
├── <SuitabilityResultPanel result />       // → reuses <ScoreEvidenceCard>
├── <ItinerarySteps itinerary />            // 선택된 template 순서
├── <AlternativePoiList alternatives={result.alternatives} />  // 검증 카드 보유 POI만 (M-8)
└── <RelatedPoiList label="관련 관광지 (접근성 미검증)" />     // TarRlteTar — 별도 목록, 경고 표기
```

- [ ] `calculateSuitability` 단위 테스트: §4.5 골든 케이스의 `{expected}` SuitabilityResult를 결정론적으로(±0) 재현.
- [ ] forced rule: critical unsupported → score≤49; critical unknown/coverage<65% → '정보없음'.
- [ ] 동일 입력 100회 실행 → 동일 결과(PT 재현성).
- [ ] persona multiplier가 max(곱 아님)임을 테스트로 고정.
- [ ] 반나절→1박2일 전환이 동일 family 내에서 결정론적.

---

## 5. F1.C — SOS·콜택시·보조기기 + AAC 5종

> 정적 디렉터리 + 전화 딥링크. API 발급(콜택시)은 발전방향. AAC = ARASAAC 1차 + F1.F-6과 데이터 공유.

| 영역 | 컴포넌트 | 데이터 | 동작 |
|---|---|---|---|
| SOS 버튼(전 화면 우상단 고정) | `SosFab` | static directory | 119 + 1330 + 영사콜센터 다국어 `tel:` 딥링크; 동반자 GPS는 PIPA 명시 동의 후만 |
| 보조기기 대여+예약 | `EquipmentRentalPanel` | `nearby_facilities`(equipment) + KODDI | 연락처 딥링크 |
| 장애인콜택시 | `CallTaxiPanel` | `safety_directory`(공주/부여 콜택시) | `tel:` 딥링크 |
| AAC 도움요청 5종 | `AacCardDeck` | `aac_cards` | 픽토그램+쉬운글+다국어+TTS 동시; 1탭 확대 |

```
<SafetyLayer>                               // app-level fixed
├── <SosFab />                              // 모든 화면 우상단; aria-label 명시
├── <EquipmentRentalPanel facilities />
├── <CallTaxiPanel directory />
└── <AacCardDeck cards={['help','pain','too_loud','lost','restroom']} />
```

- AAC 5종 라벨: 도움이 필요해요 / 아파요 / 소리가 너무 커요 / 길을 잃었어요 / 화장실이 필요해요.
- 출처: 한국보완대체의사소통학회 공개 AAC 셋 + KS 픽토그램 재활용; ARASAAC(CC BY-NC-SA) 1차, 출처 표기.
- **수용 기준:** [ ] SOS가 모든 라우트에 고정·SR 포커스 가능. [ ] AAC 5종이 픽토+쉬운글+4언어+TTS 동시 출력. [ ] 모든 외부 연락은 `tel:`/딥링크(런타임 API 호출 없음).

---

## 6. F1.E — 페르소나별 후기 분리 + GPX / F1.F — 예측 가능 백제

### 6.1 F1.E

> **scope (SPEC §13.2):** **페르소나별 후기 + UGC GPX 제출은 발전방향.** MVP의 단일 UGC 진입점은 **F3**(제보·검수)이며 F1.E에 별도 UGC 제출 경로를 두지 않는다. **큐레이션 GPX 다운로드는 MVP 유지**(검수된 `gpx_submissions.source='curated'`만; F1.B/F4 환류).

- **큐레이션 GPX 다운로드 (MVP 유지):** F4 PDF 출력 시 GPX 동반; `gpx_submissions.moderation_status='approved'` AND `source='curated'`만 환류. UGC GPX 제출은 발전방향.
- **개인 무장애 프로필 영속 (MVP 유지):** **로컬(IndexedDB)만**, 서버 X(PIPA 회피). 한 번 입력한 페르소나·예산이 모든 카드에 즉시 적용.
- **페르소나별 후기 분리 (발전방향):** `reviews.persona`별 탭("휠체어 4.5/5 vs 시각 3.2/5", 단일 평점 금지). UGC 후기 작성·표시는 발전방향이며 MVP UGC는 F3로 단일화.

```
<CommunityView poiId>
├── <CuratedGpxDownloadPanel curatedGpx />   // MVP: 큐레이션 GPX 다운로드 (source='curated')
└── <PersonaProfilePanel />                  // MVP: 로컬 무장애 프로필 (IndexedDB)
// 발전방향: <PersonaReviewTabs> · <ReviewSubmitForm> — UGC 후기/제출은 F3로 단일화
```

### 6.2 F1.F — 예측 가능 백제 (F1.B step data 재사용)

> **scope (SPEC §13.2):** MVP = **3요소** — 시각 일정(F1.F-1), 1단계 1행동(F1.F-2), calm+AAC(F1.F-4 자극강도 + F1.F-6 캐릭터/AAC). **보호자 동기(F1.F-5)·60초 변경(F1.F-3)·단체 모드(F1.F-7)는 발전방향.**

| 요소 | 컴포넌트 | 데이터 | 핵심 | MVP |
|---|---|---|---|---|
| F1.F-1 픽토그램 일정 카드 | `PictogramSchedule` | `route_steps.pictogram_id` (48개) | KS/ARASAAC 재활용 | 1차 (MVP) |
| F1.F-2 단계 카드(1단계 1행동) | `SingleStepCard` | `route_steps`(현재+다음만) | 이전 단계 숨김(인지 부하↓) | 1차 (MVP) |
| F1.F-4 자극 강도 조절 | `SensoryCalmSlider` | OS Reduce Motion API | 음성/진동/깜빡임/BGM 4축 + 조용모드 | 1차 (MVP, calm) |
| F1.F-6 캐릭터 + AAC 예외 | `MascotAacCard` | 마스코트 6컷 + `aac_cards` | F1.C와 공유 | 1차 (MVP, AAC) |
| F1.F-3 예측 가능 동선 60초 카운트다운 | `ChangeCountdown` | F3 알림 + Odii 쉬운글 | 즉시 변경 X; 변경 후 미리보기 + `aria-live` | 발전방향 |
| F1.F-5 보호자 동반(GPS X) | `GuardianSyncView` | step card ID 동기(좌표 X) | 위치정보법 부담 회피 | 발전방향 |
| F1.F-7 발달장애 단체 모드 | `GroupGuideMode` | `route_steps` + F4 합본 PDF | 30→10×3 그룹; 종이 카드 배포 | 발전방향 |

```
<PredictableBaekjeMode poiId routeId>        // P3/P4 활성 시 1탭 프리셋 — MVP 3요소 동작
├── <PictogramSchedule steps />              // MVP: 시각 일정
├── <SingleStepCard current next />          // MVP: 1단계 1행동
├── <SensoryCalmSlider />                    // MVP: calm — prefers-reduced-motion 연동
├── <MascotAacCard cards />                  // MVP: AAC — F1.C aac_cards 공유
├── <ChangeCountdown alert />                // 발전방향 (60s + 미리보기)
├── <GuardianSyncView stepCardId />          // 발전방향 (GPS 좌표 X)
└── <GroupGuideMode groups />                // 발전방향 (단체 모드)
```

- **수용 기준(MVP 3요소):** [ ] 1탭으로 MVP 3요소(시각 일정·1단계 1행동·calm+AAC) 일괄 활성. [ ] F1.F-4가 OS Reduce Motion + KWCAG §2.3.1(광과민) 준수. [ ] AAC 카드가 F1.C와 동일 `aac_cards` 데이터. (발전방향: F1.F-3 60초 카운트다운·F1.F-5 좌표 0 동기·F1.F-7 단체 모드.)

---

## 7. 접근성 map/list 패턴 (F1 전역, KWCAG 2.2)

> **LIST = 진실원, MAP = 보조.** 지도 캔버스는 SR 비가시 → 모든 정보는 텍스트로 먼저 존재(R5 §6.3, R2 §5.2).

### 7.1 패턴

```
<AccessibleMapSection ariaLabel>
├── <PoiTextList items />                    // ← source of truth: 이름/거리/경사/단차수
├── <KakaoMapCanvas className="map-canvas">  // axe .exclude; 수동 체크리스트
│   ├── CustomOverlay (real DOM, role/aria-label)  // raster Marker 대신
│   ├── Polygon (turning areas) + centroid CustomOverlay 라벨
│   └── 단차 markers as CustomOverlay (focusable)
└── <MapKeyboardControls />                  // 드래그/핀치 → 버튼 대안 (2.5.1/2.5.4)
```

- **CustomOverlay 우선:** 실제 DOM → focusable/labelable. raster `Marker`는 SR 비친화.
- **폴리곤 회전영역:** GeoJSON `[lng,lat]` → `kakao.maps.LatLng(lat,lng)`. `polygon.getArea()`로 최소 회전 직경(~1.5m) 검증. 라벨 = centroid CustomOverlay.
- **비색 단서:** 경사/단차 심각도는 색만 X — 아이콘+텍스트.
- **키보드:** pan/zoom 버튼 + 화살표 마커 내비. 드래그/핀치 버튼 대안 필수.

### 7.2 라우트 변경 포커스 (App Router 미자동)

`usePathname` 변경 시 `<h1>`로 포커스 이동(`tabIndex={-1}` + `ref.focus()`) + `document.title` 갱신 + `aria-live="polite"`로 결과 수/지도 선택 안내(R2 §2.2).

---

## 8. 모듈 경계 + 의존성 + 빌드 순서

```
packages/domain/accessibility  → calculateSuitability (pure, TDD) ── F1.A, F1.D
packages/domain/itinerary      → buildItinerary (template select) ── F1.D
packages/domain/guide          → resolveGuide (step assembly) ──── F1.B → F1.F, F1.E
packages/exports               → GPX 1.1 builder ───────────────── F1.B/E
features/f1-poi-card | f1-route-guide | f1-safety | f1-planner | f1-community | f1-predictable
```

- `domain`은 Next.js import 금지(framework-free). RSC가 `unstable_cache`로 published read-model을 읽어 도메인 함수에 주입.
- **빌드 순서(SPEC §9):** C4 Content 6-POI → F1-AD + F1-D(1차 vertical slice: 공산성·반나절·휠체어/시니어/가족) → F1-B 공주 → F1-B 부여 + F1-C/E/F.

## 9. F1 통합 수용 기준 (D.1 골든 플로우 기여)

- [ ] 로그인 없이 휠체어+시니어+가족 선택 → 반나절 공산성 카드(증거 점수 포함) 1화면 동작.
- [ ] `calculateSuitability` 결정론(동일 입력 동일 출력) + 전체 breakdown 반환.
- [ ] F3 승인 제보("동문 공사") → F1.B 서문 정적 가이드 강조(자동 리라우팅 X).
- [ ] 반나절→1박2일 전환이 동일 template family로 부여 확장.
- [ ] 모든 카드 색 대비 4.5:1, 라벨 색+아이콘+텍스트 3중, axe 0 violations(map-canvas 제외 후 수동).
- [ ] 오프라인 번들 후 네트워크 차단에서 F1.B 5채널 렌더.

## 10. Open items (verify-at-build-time)

- detailWithTour2 정확한 필드 키 — guide v4.3 + 라이브 프로브로 확정 후 `capability_code` 매핑(§2.2) 고정. 미검증이면 `unknown`.
- §4.5 worked example과 §2.4 증거 카드 수치는 **동일 골든 케이스**(`packages/domain/policy/__golden__`)에서 생성·주입 — 손계산 수치를 문서에 고정하지 않아 두 표가 구조적으로 일치(M-3 해소).
- Layer A `verifiedUgc`/`rest`/`timeContext`의 value 매핑 곡선·축 가중치는 **doc 16 §3/§4가 단일 권위**(C4 Content 단계 6-POI 실측으로 doc 16 값 검증).
- persona×capability tier 매트릭스의 단일 권위 = **doc 16 §4.1**(전문가 사인오프 게이트, doc 16 §11). 본 문서 §2.2는 KTO 필드↔capability 매핑 골격일 뿐 tier 값을 소유하지 않는다.
- 마스코트 6컷(F1.F-6)만 자체 제작; 나머지 픽토/AAC는 오픈셋 재활용(라이선스 §1.4 `transformable` 플래그 준수).
