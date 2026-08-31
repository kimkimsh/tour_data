# 09 F5 — 충남 RTO 데이터 갭 리포트 (RTO Dashboard)

> **SPEC §8(F5) 확장 구현 기획.**
> 이 문서는 SPEC.md의 F5 절을 developer-buildable 수준으로 전개한다. SPEC과 모순되는 사항이 있을 경우 SPEC이 우선한다.

---

## 0. 한 줄 정의 + 역할

> F5는 F1–F4가 생성·소비하는 **동일한 데이터셋의 갭을 집계해 "어느 시설을 먼저 개선해야 하는가, 그리고 그 이유"를 충남 CACF/다도라/올담에 제공하는 B2G 갭 우선순위 리포트**다. 별도 데이터 수집 없이 F1–F4 파이프라인의 닫힌 루프 증거(closed-loop proof)로 기능한다. (SPEC §13.2: MVP는 단일 갭 우선순위 리포트 화면 하나로 제한한다. 방문자 추세/히트맵 장식 제거.)

**갭 우선순위 엔진 (M-21):**

F5의 핵심 출력은 POI × capability_code 단위의 **우선순위 점수**다.

```
priority = impact × severity × confidence × feasibility
```

| 인수 | 정의 | 산출 방법 |
|---|---|---|
| `impact` | 이 갭이 F1 사용자 결정에 미치는 실제 영향 | `suitabilityAffected = true`(F1 적합도 ≤ 49) → 1.0; 아니면 0.5 |
| `severity` | 갭의 심각도 | `null`(미입력) → 1.0; `unknown`(빈 값) → 0.7; `unsupported`(본질 제약) → 0.2 |
| `confidence` | 갭 판단의 신뢰도 | F3 현장 제보 ≥ 1건 동일 category → 1.0; 제보 없음 → 0.6 |
| `feasibility` | 개선 실행 가능성 | 운영자 미입력 (`null`/`unknown`) → 1.0; 본질 구조 제약 (`unsupported`) → 0.1 |

**각 메트릭이 지원하는 RTO 의사결정:**

| 메트릭 | 지원하는 RTO 결정 |
|---|---|
| `priority` 순위 1위 POI + capability | CACF 시설 개선 예산 배정 순서 |
| `suitabilityAffected = true` 여부 | F1에서 실제로 "대체추천" 판정을 유발한 갭 → 즉시 개선 대상 식별 |
| `severity = null` (운영자 미입력) | 다도라/올담 운영자가 현장 확인으로 해소 가능한 항목 목록 |
| `report_count_30d > 0` (F3 제보 동반) | 현장 이용자가 실제로 경험한 갭 → 개선 효과 검증 가능성 높음 |
| `feasibility = 1.0` (개선 가능) vs `0.1` (본질 제약) | CACF 예산을 개선 가능 갭에만 집중할 수 있도록 필터링 |

**F5가 최종 답하는 질문 (단일 리포트 화면):**

| 수신자 | 질문 |
|---|---|
| 충남 CACF | "공주·부여에서 우선순위가 가장 높은 무장애 개선 대상은 어디이며, 그 이유는?" |
| 다도라 / 올담 운영자 | "KTO `detailWithTour2` 누락 필드 중 현장 확인으로 해소 가능한 항목은?" |
| 본 팀(PT 심사) | "수집한 무장애 데이터가 F1 판단 → F5 개선 우선순위 → 다음 F1 판단으로 순환함을 데이터로 증명할 수 있는가?" |

> **주의:** 방문자 수치는 KT·SKT 이동통신 신호 기반이며 관광객과 동일하지 않습니다 (DataLabService 매뉴얼 명시). 방문자 추세는 우선순위 엔진의 직접 입력이 아닌 보조 맥락으로만 사용되며 MVP 단일 리포트 화면에는 표시하지 않습니다. ("방문자≠관광객" 캐비엣은 관련 데이터를 노출하는 모든 컨텍스트에서 필수 표시.)

---

## 1. SPEC 위치 + 의존 관계

### 1.1 SPEC §8(F5) 요약

SPEC §8의 F5 정의:
- `completeness aggregates + visitor trends ("방문자≠관광객" caveat)` — 모듈 `(rto, features/f5-dashboard)`
- B2G gap view로도 기능
- 뷰: `gap_metric_snapshots`, `poi_completeness_mv`, `report_trends_mv`, `rto_dashboard_snapshots` (PT-reproducible)

**SPEC §13.2 범위 조정:** MVP = 단일 갭 우선순위 리포트 화면. 우선순위 엔진 = `impact × severity × confidence × feasibility`. 방문자 추세 / 히트맵 = 발전방향. "방문자≠관광객" 캐비엣은 DataCaveatFooter로 MVP에서도 유지.

### 1.2 데이터 흐름 (closed loop)

```
KorWithService2.detailWithTour2
    └─► ETL → accessibility_facts (poi_id, capability_code, status, source_field)
           └─► poi_completeness_mv   (집계: null 탐지 by 시군구)
                   └─► gap_metric_snapshots  (스냅샷: 비교 가능한 시계열)
                           └─► rto_dashboard_snapshots (PT-reproducible 고정 뷰)

F3 barrier_reports (approved)
    └─► report_trends_mv  (제보 빈도 by poi_id, category)
           └─► gap_metric_snapshots에 UGC 제보 신호 합산

DataLabService.locgoRegnVisitrDDList
    └─► ETL → datalab_visitor_snapshots  (touDivCd 3분류, 4일 래그)
               ※ "방문자≠관광객" 캐비엣 필수 표시
               ※ MVP: UI에 표시하지 않음 (발전방향 보조 레이어). dataCaveat 문자열은 payload에 포함.

F1 적합도 결과 (suitability_score ≤ 49 또는 "정보 없음")
    └─► 갭 집계에 "실사용 영향 POI" 마킹 → 개선 우선순위 가중
```

**F5는 F1–F4가 이미 수집·가공한 데이터를 재사용한다. 추가 API 호출 예산 없음.**

---

## 2. 데이터베이스 스키마 (Supabase / Postgres 17)

### 2.1 기존 테이블 (F1 파이프라인 생성, F5 참조)

```sql
-- F1 파이프라인에서 생성; F5는 읽기 전용 참조
CREATE TABLE accessibility_facts (
    id            bigserial PRIMARY KEY,
    poi_id        uuid        NOT NULL REFERENCES pois(id),
    capability_code text      NOT NULL,   -- 16 §2 canonical codes ('wheelchair_access'|'elevator'|'accessible_restroom'|…), raw KTO 필드명 아님 (SPEC §14.2)
    status        text        NOT NULL    -- 'supported'|'partial'|'unsupported'|'unknown'
                  CHECK (status IN ('supported','partial','unsupported','unknown')),
    detail        text,
    source        text        NOT NULL,   -- 'kto_detailWithTour2'|'ugc_approved'|'manual'
    source_field  text,                   -- raw KTO field name, e.g. 'wheelchair'
    verified_at   timestamptz,
    ingested_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE barrier_reports (
    id            bigserial PRIMARY KEY,
    poi_id        uuid        NOT NULL REFERENCES pois(id),
    category      text        NOT NULL,
    status        text        NOT NULL    -- 'pending'|'approved'|'rejected'
                  CHECK (status IN ('pending','approved','rejected')),
    occurred_at   timestamptz NOT NULL
    -- RLS: self insert/read; approved rows public
);
```

### 2.2 Materialized View: `poi_completeness_mv`

capability_code 기준으로 POI × 필드 행렬을 집계하는 뷰. 갱신 주기: 1일 1회 (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).

```sql
CREATE MATERIALIZED VIEW poi_completeness_mv AS
WITH field_list AS (
    -- F5 completeness 분모 = F1이 점수화하는 capability 집합과 동일해야 한다 (AC-F5-06: F5 null == F1 정보없음; SPEC §14.7).
    -- 16 §2 catalog의 canonical capability_code 만 사용(raw KTO 필드명 금지; SPEC §14.2);
    -- 점수 비기여 4개 *etc(handicapetc/blindhandicapetc/hearinghandicapetc/infantsfamilyetc)는 분모에서 제외(detail 전용).
    SELECT capability_code FROM scored_capability_codes  -- 16 §2에서 생성; set-equality CI가 {ETL}={16 §2}={domain}={F5} 강제
),
poi_region AS (
    SELECT
        p.id AS poi_id,
        p.kto_content_id,
        pt.title,
        p.l_dong_signgu_cd,   -- '150'(공주) | '760'(부여)
        p.l_dong_regn_cd      -- '44'(충남)
    FROM pois p
    LEFT JOIN poi_translations pt ON pt.poi_id = p.id AND pt.locale = 'ko'
    WHERE p.visibility = 'published'
),
fact_agg AS (
    SELECT
        poi_id,
        capability_code,
        status,
        max(verified_at) AS last_verified_at
    FROM accessibility_facts
    GROUP BY poi_id, capability_code, status
),
cross_joined AS (
    SELECT
        pr.poi_id,
        pr.kto_content_id,
        pr.title,
        pr.l_dong_signgu_cd,
        fl.capability_code,
        fa.status,          -- NULL means no record at all
        fa.last_verified_at
    FROM poi_region pr
    CROSS JOIN field_list fl
    LEFT JOIN fact_agg fa USING (poi_id, capability_code)
)
SELECT
    poi_id,
    kto_content_id,
    title,
    l_dong_signgu_cd,
    capability_code,
    CASE
        WHEN status IS NULL THEN 'null'      -- KTO 필드 미제공
        WHEN status = 'unknown' THEN 'unknown'
        ELSE status
    END AS completeness_status,
    last_verified_at,
    -- 실사용 영향 마킹 (F1 적합도 ≤ 49 시 가중)
    (status IS NULL OR status = 'unknown') AS is_gap
FROM cross_joined;

CREATE UNIQUE INDEX ON poi_completeness_mv (poi_id, capability_code);
```

### 2.3 Materialized View: `report_trends_mv`

F3 approved 제보를 시군구별·카테고리별로 집계.

```sql
CREATE MATERIALIZED VIEW report_trends_mv AS
SELECT
    br.poi_id,
    p.l_dong_signgu_cd,
    br.category,
    date_trunc('week', br.occurred_at)  AS week_start,
    count(*)                            AS report_count,
    count(*) FILTER (WHERE br.status = 'approved') AS approved_count
FROM barrier_reports br
JOIN pois p ON p.id = br.poi_id
WHERE br.occurred_at >= now() - interval '90 days'
GROUP BY br.poi_id, p.l_dong_signgu_cd, br.category, date_trunc('week', br.occurred_at);

CREATE INDEX ON report_trends_mv (poi_id, week_start);
CREATE INDEX ON report_trends_mv (l_dong_signgu_cd, week_start);
```

### 2.4 Table: `datalab_visitor_snapshots`

DataLabService ETL 결과. `locgoRegnVisitrDDList` → 공주(lDongSignguCd=150) + 부여(lDongSignguCd=760) 스냅샷.

```sql
CREATE TABLE datalab_visitor_snapshots (
    id              bigserial PRIMARY KEY,
    base_ymd        date        NOT NULL,
    l_dong_signgu_cd text       NOT NULL,   -- '150'(공주) | '760'(부여)
    tou_div_cd      text        NOT NULL    -- '1'내국인현지인|'2'내국인외지인|'3'외국인
                    CHECK (tou_div_cd IN ('1','2','3')),
    tou_div_nm      text        NOT NULL,
    daywk_div_cd    text,                   -- 요일 코드
    tou_num         integer     NOT NULL,   -- 방문자 수 (통신 기반; 관광객 ≠ 방문자)
    ingested_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (base_ymd, l_dong_signgu_cd, tou_div_cd)
);

COMMENT ON COLUMN datalab_visitor_snapshots.tou_num IS
    'KT/SKT 이동통신 기반 방문자 수. 관광 목적으로 정의되지 않으며 관광객과 동일하지 않음 (DataLabService 매뉴얼 명시).';

CREATE INDEX ON datalab_visitor_snapshots (l_dong_signgu_cd, base_ymd);
```

### 2.5 Table: `gap_metric_snapshots`

일별 집계 스냅샷. `poi_completeness_mv` + `report_trends_mv` 조합. ETL GitHub Actions가 매일 1회 INSERT.

```sql
CREATE TABLE gap_metric_snapshots (
    id                   bigserial PRIMARY KEY,
    snapshot_date        date        NOT NULL,
    l_dong_signgu_cd     text        NOT NULL,
    poi_id               uuid        NOT NULL REFERENCES pois(id),
    total_fields         integer     NOT NULL,   -- = F1 점수화 capability 수 (field_list 기준, *etc 제외; SPEC §14.7). AC-F5-06
    null_fields          integer     NOT NULL,   -- status='null'
    unknown_fields       integer     NOT NULL,   -- status='unknown'
    supported_fields     integer     NOT NULL,
    partial_fields       integer     NOT NULL,
    unsupported_fields   integer     NOT NULL,
    completeness_pct     numeric(5,2) NOT NULL,  -- (supported+partial) / total_fields * 100
    report_count_30d     integer     NOT NULL DEFAULT 0,  -- F3 approved 제보 30일
    suitability_affected boolean     NOT NULL DEFAULT false,  -- F1 score ≤ 49 POI
    -- Gap-priority engine output (M-21): impact × severity × confidence × feasibility
    top_gap_capability   text,                               -- capability_code with highest priority
    top_gap_priority     numeric(4,3),                       -- 0.000..1.000
    top_gap_action_item  text,                               -- human-readable action for CACF
    created_at           timestamptz NOT NULL DEFAULT now(),
    UNIQUE (snapshot_date, poi_id)
);

CREATE INDEX ON gap_metric_snapshots (snapshot_date, l_dong_signgu_cd);
CREATE INDEX ON gap_metric_snapshots (poi_id, snapshot_date);
```

### 2.6 Table: `rto_dashboard_snapshots`

PT-reproducible 고정 뷰. 심사 시점 스냅샷을 seed로 포함. 별도 테이블로 분리해 Realtime 갱신과 독립.

```sql
CREATE TABLE rto_dashboard_snapshots (
    id               bigserial PRIMARY KEY,
    snapshot_label   text        NOT NULL,   -- 'live'|'pt_demo_2026_10'|...
    snapshot_date    date        NOT NULL,
    payload_json     jsonb       NOT NULL,   -- 전체 대시보드 payload (compact)
    created_by       text        NOT NULL DEFAULT 'etl',
    created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN rto_dashboard_snapshots.snapshot_label IS
    'pt_demo_2026_10 라벨은 심사일 기준 고정 seed; live는 ETL이 덮어씀. 페이지는 라벨을 env/route-param으로 선택(하드코딩 ''live'' 금지) — 데모일 재배포 불필요 (SPEC §14.10).';

CREATE INDEX ON rto_dashboard_snapshots (snapshot_label, snapshot_date);
```

`payload_json` 구조 (MVP: 단일 갭 우선순위 리포트). **아래 수치는 예시이며 골든 테스트로 생성한다 — 손계산 금지(F1과 동일 정책, SPEC §14.10); `total`은 F1 점수화 capability 수(*etc 제외).**

```jsonc
{
  "snapshotDate": "2026-10-01",
  "gongju": {
    "lDongSignguCd": "150",
    "pois": [
      {
        "poiId": "uuid",
        "title": "공산성",
        "completenessFields": { "total": 28, "null": 5, "unknown": 2, "supported": 18, "partial": 3 },
        "completenessPct": 75.0,
        "reportCount30d": 2,
        "suitabilityAffected": false,
        "topGapCapability": "elevator",
        "topGapPriority": 0.02,
        "topGapActionItem": "사적지 구조 제약 → 개선 불가 (CACF 예산 제외)"
      }
    ],
    "signguNullPct": 18.0,
    "signguReportCount30d": 5
  },
  "buyeo": {
    "lDongSignguCd": "760",
    "pois": [
      {
        "poiId": "uuid",
        "title": "부소산성",
        "completenessFields": { "total": 28, "null": 8, "unknown": 3, "supported": 15, "partial": 2 },
        "completenessPct": 60.7,
        "reportCount30d": 3,
        "suitabilityAffected": true,
        "topGapCapability": "elevator",
        "topGapPriority": 1.00,
        "topGapActionItem": "KTO 미입력 → 현장 확인 후 다도라 등록 요청 (F1 대체추천 유발 → CACF 즉시 배정)"
      }
    ],
    "signguNullPct": 32.0,
    "signguReportCount30d": 7
  },
  "dataCaveat": "방문자는 관광객과 동일하게 정의되지 않음 (KT/SKT 이동통신 기반). 방문자 추세는 MVP 리포트 화면에 표시하지 않음."
}
```

### 2.7 RLS

```sql
-- gap_metric_snapshots, rto_dashboard_snapshots: public read, ETL service_role write
ALTER TABLE gap_metric_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON gap_metric_snapshots FOR SELECT USING (true);

ALTER TABLE rto_dashboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON rto_dashboard_snapshots FOR SELECT USING (true);

ALTER TABLE datalab_visitor_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON datalab_visitor_snapshots FOR SELECT USING (true);
```

---

## 3. ETL — F5 집계 파이프라인

### 3.1 GitHub Actions 워크플로 (`kto-etl.yml` 확장)

```yaml
# .github/workflows/kto-etl.yml (F5 관련 step 발췌)

- name: Ingest DataLab visitor data
  run: |
    node scripts/ingest/datalab-visitor.mjs \
      --startYmd $(date -d '5 days ago' +%Y%m%d) \
      --endYmd $(date -d '1 day ago' +%Y%m%d) \
      --signguCds 150,760
  # DataLabService ~4일 래그 반영: startYmd = 5일 전, endYmd = 1일 전

- name: Refresh poi_completeness_mv
  run: node scripts/publish/refresh-completeness-mv.mjs

- name: Refresh report_trends_mv
  run: node scripts/publish/refresh-report-trends-mv.mjs

- name: Snapshot gap metrics
  run: node scripts/publish/snapshot-gap-metrics.mjs --date $(date +%Y-%m-%d)

- name: Update rto_dashboard live snapshot
  run: node scripts/publish/update-rto-snapshot.mjs --label live
```

### 3.2 DataLab 수집 스크립트 시그니처 (`packages/etl`)

```typescript
// packages/etl/src/datalab/ingestVisitorData.ts

interface DataLabIngestOptions {
    startYmd: string;    // YYYYMMDD
    endYmd: string;
    signguCds: string[]; // ['150', '760']
}

interface DataLabVisitorRow {
    baseYmd: string;
    lDongSignguCd: string;
    touDivCd: '1' | '2' | '3';
    touDivNm: string;
    daywkDivCd: string;
    touNum: number;
}

// DataLabService는 legacy areaCd/signguCd 체계 사용 (lDong 아님)
// locgoRegnVisitrDDList: 충남 areaCd=34, signguCd: 공주=?/부여=34800
// 공주 signguCd는 xlsx 검증 후 상수화 필요 (SPEC §11 open risk)
async function ingestVisitorData(options: DataLabIngestOptions): Promise<void>;
```

```typescript
// packages/etl/src/completeness/snapshotGapMetrics.ts

interface GapMetricRow {
    snapshotDate: string;     // YYYY-MM-DD
    lDongSignguCd: string;
    poiId: string;
    totalFields: number;
    nullFields: number;
    unknownFields: number;
    supportedFields: number;
    partialFields: number;
    unsupportedFields: number;
    completenessPct: number;
    reportCount30d: number;
    suitabilityAffected: boolean;
    // Gap-priority engine output (M-21): computed per-POI before INSERT
    topGapCapability: string | null;
    topGapPriority: number | null;    // impact × severity × confidence × feasibility
    topGapActionItem: string | null;
}

// poi_completeness_mv + report_trends_mv JOIN → run rankPoiByGapPriority → gap_metric_snapshots INSERT
async function snapshotGapMetrics(date: string): Promise<void>;
```

```typescript
// packages/etl/src/rto/updateRtoDashboardSnapshot.ts

interface RtoDashboardSnapshotOptions {
    label: string;            // 'live' | 'pt_demo_2026_10'
}

// gap_metric_snapshots (including top_gap_* fields) → rto_dashboard_snapshots upsert
// MVP: visitor series omitted from payload (ETL still collects datalab_visitor_snapshots separately).
// dataCaveat string is always included per DataLabService disclosure requirement.
async function updateRtoDashboardSnapshot(options: RtoDashboardSnapshotOptions): Promise<void>;
```

---

## 4. 도메인 계층 (`packages/domain/rto`)

### 4.1 타입 정의

```typescript
// packages/domain/src/rto/types.ts

export type CompletionStatus = 'supported' | 'partial' | 'unsupported' | 'unknown' | 'null';

export interface CapabilityGap {
    capabilityCode: string;
    status: CompletionStatus;
    lastVerifiedAt: string | null;
}

export interface PoiCompletenessResult {
    poiId: string;
    title: string;
    lDongSignguCd: string;
    completenessPct: number;
    nullCount: number;
    unknownCount: number;
    gaps: CapabilityGap[];
    reportCount30d: number;
    suitabilityAffected: boolean;
    // Populated by rankPoiByGapPriority: top-scoring gap for this POI (M-21 engine)
    topGapCapability: string | null;     // capability_code with highest priority score
    topGapPriority: number | null;       // impact × severity × confidence × feasibility (0..1)
    topGapActionItem: string | null;     // human-readable action ("엘리베이터 KTO 미입력 → 현장 확인 후 다도라 등록 요청")
}

export interface SignguGapSummary {
    lDongSignguCd: string;
    signguName: string;
    poiCount: number;
    avgCompletenessPct: number;
    nullCountTotal: number;
    reportCountTotal: number;
    pois: PoiCompletenessResult[];
}

export interface VisitorTrendPoint {
    baseYmd: string;
    domestic: number;
    foreign: number;
    localResident: number;
}

export interface RtoDashboardPayload {
    snapshotDate: string;
    gongju: SignguGapSummary;   // pois sorted by topGapPriority descending (rankPoiByGapPriority)
    buyeo: SignguGapSummary;
    // Mandatory caveat string even when visitor series is not displayed (MVP).
    // DataLabService manual requires this disclosure wherever DataLab data is collected.
    dataCaveat: string;
    // visitorSeries is collected by ETL but omitted from MVP payload_json (발전방향 only).
}
```

### 4.2 도메인 함수

```typescript
// packages/domain/src/rto/buildGapSummary.ts

// poi_completeness_mv rows → SignguGapSummary (순수 집계; DB 없음)
export function buildGapSummary(
    rows: PoiCompletenessResult[],
    lDongSignguCd: string,
    signguName: string
): SignguGapSummary;

// 갭 우선순위 엔진 (M-21): priority = impact × severity × confidence × feasibility
// 각 POI의 capability_code 단위 우선순위 점수를 계산한 뒤 POI를 최고 점수 기준 내림차순 정렬.
// - impact:      suitabilityAffected=true → 1.0; else 0.5
// - severity:    status='null' → 1.0; 'unknown' → 0.7; 'unsupported' → 0.2
// - confidence:  reportCount30d ≥ 1 (동일 POI F3 제보) → 1.0; else 0.6
// - feasibility: status='null'|'unknown' → 1.0; 'unsupported' → 0.1
// 출력: 각 PoiCompletenessResult에 topGapPriority(최고 우선순위 점수) 및
//       topGapCapability(해당 capability_code)가 채워진다.
export function rankPoiByGapPriority(
    pois: PoiCompletenessResult[]
): PoiCompletenessResult[];
```

```typescript
// packages/domain/src/rto/buildVisitorTrend.ts

// datalab_visitor_snapshots rows → VisitorTrendPoint[] (touDivCd 분류 집계)
// touDivCd: '1'=내국인현지인(localResident) / '2'=내국인외지인(domestic) / '3'=외국인(foreign)
export function buildVisitorTrend(
    rows: {
        baseYmd: string;
        lDongSignguCd: string;
        touDivCd: string;
        touNum: number;
    }[],
    lDongSignguCd: string
): VisitorTrendPoint[];
```

---

## 5. Application 계층 (`packages/application`)

```typescript
// packages/application/src/rto/getRtoDashboard.ts
import { unstable_cache } from 'next/cache';

// RLS public read → 캐시 가능 (per-user 데이터 없음)
export const getRtoDashboard = unstable_cache(
    async (snapshotLabel: string): Promise<RtoDashboardPayload> => {
        // rto_dashboard_snapshots WHERE snapshot_label = snapshotLabel ORDER BY snapshot_date DESC LIMIT 1
        // payload_json 파싱 → RtoDashboardPayload 반환
    },
    ['rto-dashboard'],
    { tags: ['rto-dashboard'], revalidate: 3600 }
);

// 시계열 비교용: 최근 N일 gap_metric_snapshots 집계
export const getGapTrend = unstable_cache(
    async (poiId: string, days: number): Promise<GapMetricRow[]> => {
        // gap_metric_snapshots WHERE poi_id = poiId AND snapshot_date >= now()-days
    },
    ['gap-trend'],
    { tags: ['gap-trend'], revalidate: 3600 }
);
```

---

## 6. UI — `features/f5-dashboard`

> **SPEC §13.2 범위 제한:** MVP는 단일 갭 우선순위 리포트 화면 하나다. 히트맵, 방문자 추세 차트, 제보 추세 차트는 MVP에서 제거한다. 방문자 추세 데이터는 ETL이 계속 수집하지만(DataLab 수집은 유지) UI에 노출하지 않는다. 발전방향에서 보조 레이어로 추가 가능.

### 6.1 컴포넌트 트리 (MVP — 단일 리포트 화면)

```
app/[locale]/rto/page.tsx                  (RSC; getRtoDashboard 호출)
└─ features/f5-dashboard/
   ├─ GapPriorityReportPage.tsx            (RSC shell; 데이터 주입)
   │   ├─ ReportHeader.tsx                 (스냅샷 날짜 + B2G 안내 문구)
   │   ├─ GapPriorityTable.tsx            (핵심: 우선순위 1위 액션 아이템 테이블)
   │   │   └─ GapPriorityRow.tsx          (POI × 최우선 capability × 액션 아이템 × priority 점수)
   │   └─ DataCaveatFooter.tsx            (방문자≠관광객 캐비엣 — MVP에서도 필수 표시)
   └─ (admin) rto/admin/page.tsx          (관리자 전용; CACF 공유용 CSV 다운로드)
```

**발전방향 (출시 후):** 시군구별 히트맵(`GapHeatmapPanel`), POI별 28 capability 상태 그리드(`CapabilityStatusGrid`), F3 제보 빈도 추세, DataLab 방문자 추세 레이어.

### 6.2 `GapPriorityTable` — 핵심 시각화 (단일 리포트)

```typescript
// features/f5-dashboard/GapPriorityTable.tsx
'use client';

interface GapPriorityTableProps {
    gongju: SignguGapSummary;  // rankPoiByGapPriority 결과 포함
    buyeo: SignguGapSummary;
}

// 우선순위 테이블: POI를 topGapPriority 내림차순으로 나열
// 각 행: POI명 | 최우선 개선 항목(topGapCapability) | 액션 아이템(topGapActionItem) | 우선순위 점수 | RTO 결정 유형
// 색상 사용 시 수치·아이콘과 반드시 병기 (KWCAG 2.2 §1.4.1)
export function GapPriorityTable(props: GapPriorityTableProps): React.JSX.Element;
```

**리포트 테이블 예시 (accessible table; 차트 없음):**

```
| 순위 | POI          | 개선 항목    | 액션 아이템                              | 우선순위 점수 | RTO 결정 유형                |
|------|--------------|------------|----------------------------------------|-------------|----------------------------|
| 1    | 부소산성      | elevator   | KTO 미입력 → 현장 확인 후 다도라 등록 요청 | 1.00        | F1 대체추천 유발 → CACF 즉시 배정 |
| 2    | 무령왕릉과 왕릉원 | wheelchair | KTO 미입력 → 현장 확인 후 다도라 등록 요청 | 0.60        | 운영자 미입력 → 다도라 운영자 액션 |
| 3    | 공산성        | elevator   | 사적지 구조 제약 → 개선 불가 (예산 미배정)  | 0.02        | 본질 제약 → CACF 예산 제외     |
```

### 6.3 `DataCaveatFooter` — 방문자 캐비엣 (필수, 화면 하단 항상 표시)

```typescript
// features/f5-dashboard/DataCaveatFooter.tsx

// DataLabService 매뉴얼 명시 의무: "방문자는 관광객과 동일하게 정의되지 않음"
// MVP 단일 리포트 화면에서도 방문자 데이터를 직접 표시하지 않더라도,
// F5가 DataLab 데이터를 ETL 수집하는 한 이 캐비엣은 페이지에 항상 표시한다.
export function DataCaveatFooter(): React.JSX.Element
{
    return (
        <aside
            role="note"
            aria-label="데이터 출처 한계 안내"
            className="border-l-4 border-yellow-500 bg-yellow-50 p-3 text-sm"
        >
            <p>
                <strong>데이터 출처 안내:</strong> 방문자 수치는 KT·SK텔레콤 이동통신
                신호 기반이며, <strong>관광 목적으로 정의되지 않습니다.</strong> 통근·업무·
                거주 이동도 포함될 수 있어 실제 관광객 수와 다를 수 있습니다. (출처:
                KTO DataLabService 매뉴얼)
            </p>
        </aside>
    );
}
```

---

## 7. null 탐지 로직 상세

### 7.1 null vs unknown 분류 기준

| `accessibility_facts` 상태 | 의미 | F5 표시 |
|---|---|---|
| 행 없음 (not ingested yet) | ETL 미실행 또는 KTO API 응답 자체 없음 | `null` — "정보 없음" |
| `status = 'unknown'` | KTO 응답 있지만 필드 값이 빈 문자열/null | `unknown` — "미입력 (운영자 확인 필요)" |
| `status = 'unsupported'` | KTO 응답: "없음"·"불가" 명시 | `unsupported` — "해당 없음 (본질 제약 가능성)" |
| `status = 'supported'` | 이용 가능 | `supported` — "지원됨" |
| `status = 'partial'` | 조건부 이용 가능 | `partial` — "부분 지원" |

**부재 사유 2분류 (SPEC §8 F1 요구사항, F5에서도 표시):**

| 분류 | 판단 기준 | F5 UI 표시 |
|---|---|---|
| **(a) 본질 제약** | `status='unsupported'` + `capability_code`가 사적지 구조적 한계 (`exit`, `elevator` 등) | 주황 배지 "사적지 구조 제약" |
| **(b) 운영자 미입력** | `status='unknown'` 또는 행 없음 | 빨간 배지 "개선 가능 (KTO 미입력)" |

### 7.2 시군구별 null 집계 SQL (참조용)

```sql
-- gap_metric_snapshots 기반 시군구별 현황 (대시보드 쿼리)
SELECT
    l_dong_signgu_cd,
    count(DISTINCT poi_id)                       AS poi_count,
    round(avg(completeness_pct), 1)              AS avg_completeness_pct,
    sum(null_fields + unknown_fields)            AS total_gap_fields,
    sum(report_count_30d)                        AS total_reports_30d,
    sum(CASE WHEN suitability_affected THEN 1 ELSE 0 END) AS suitability_affected_count
FROM gap_metric_snapshots
WHERE snapshot_date = (SELECT max(snapshot_date) FROM gap_metric_snapshots)
GROUP BY l_dong_signgu_cd
ORDER BY avg_completeness_pct ASC;   -- 낮은 완성도 시군구 우선
```

---

## 8. B2G 프레이밍 — 충남 CACF / 다도라 / 올담

### 8.1 공유 가능한 산출물

| 산출물 | 형식 | 수신자 | 갱신 주기 |
|---|---|---|---|
| 시군구별 갭 현황 | 대시보드 URL (public) | CACF, 다도라 운영자 | 일 1회 |
| POI별 미입력 필드 목록 | CSV 다운로드 (`/rto/admin/export`) | CACF 담당자 | On-demand |
| 주간 제보 빈도 리포트 | 이메일 또는 올담 연동 (발전방향) | 올담 데이터포털 | 주 1회 |
| PT 심사용 고정 스냅샷 | `rto_dashboard_snapshots.snapshot_label='pt_demo_2026_10'` | 심사위원 시연 | 고정 (seed) |

### 8.2 다도라 / 올담 연동 방향

**MVP**: 대시보드 공개 URL + CSV 다운로드 제공. API 연동은 발전방향.

**발전방향 (출시 후 6개월):**

```
올담 데이터포털 (alldam.chungnam.go.kr)
    ← POST /api/rto/weekly-report  (JSON webhook; HMAC 인증)
다도라 스마트관광맵 (chungnam.dadora.kr)
    ← 무장애 정보 갭 레이어 공유 (GeoJSON; 시군구 폴리곤 + completenessPct)
```

### 8.3 PT 시연 스크립트 (F5 해당 장면)

SPEC §12 PT 내러티브의 마지막 단계:

> "같은 데이터의 갭이 F5 충남 RTO 대시보드에 나타납니다."

시연 순서 (단일 리포트 화면):

1. 공산성 카드에서 `elevator = 정보 없음` 확인 (F1.A — "대체추천" 판정 유발)
2. F5 갭 우선순위 리포트 진입 → 우선순위 1위 행: **부소산성 elevator** (priority=1.00; "F1 대체추천 유발 → CACF 즉시 배정")
3. 3위 행: **공산성 elevator** (priority=0.02; "사적지 구조 제약 → 예산 미배정") — 같은 `elevator` 갭이지만 실행 가능성 차이로 순위 분리됨
4. CSV 내보내기 클릭 → "이 파일을 CACF 담당자에게 즉시 공유할 수 있습니다"

**PT 핵심 대사:**

> "한 번 수집한 무장애 데이터가 여행 전 판단(F1), 현장 안내(F2), 교육 기록(F4), 그리고 충남의 시설 개선 우선순위(F5)까지 연결됩니다. 추가 수집 없이 같은 데이터가 5개 기능을 순환합니다."

---

## 9. closed-loop 증명 — F1–F4 재사용 매핑

F5는 새로운 데이터를 수집하지 않는다. 아래 표가 closed-loop 증거다.

| F5 표시 항목 | 원천 데이터 | 생성 기능 |
|---|---|---|
| POI 완성도 % | `accessibility_facts` | F1 ETL (KorWithService2.detailWithTour2) |
| null 필드 목록 | `accessibility_facts WHERE status='unknown'` | F1 ETL |
| impact 인수 (suitabilityAffected) | `calculateSuitability()` 결과 ≤ 49 | F1.D 도메인 |
| confidence 인수 (제보 동반 여부) | `barrier_reports WHERE status='approved'` | F3 검수 큐 |
| **우선순위 점수 (top_gap_priority)** | **`rankPoiByGapPriority()` 결과** | **F5 도메인 엔진 (M-21)** |
| **액션 아이템 (top_gap_action_item)** | **priority 인수 조합 → 문자열 생성** | **F5 도메인 엔진 (M-21)** |
| 방문자 데이터 (ETL 수집, MVP UI 미표시) | `datalab_visitor_snapshots` | F5 ETL (DataLabService) — 유일한 F5 전용 수집 |
| 인증 보정 Layer C 정보 | `poi_certifications` | F1 ETL (BF인증, 열린관광지) |

DataLabService 수집만 F5 전용이며, 나머지는 모두 F1–F4 파이프라인 재사용이다. 우선순위 엔진(M-21)은 이 데이터들을 조합해 "어느 시설을 먼저 개선해야 하는가"라는 단일 RTO 질문에 답한다.

---

## 10. 접근성 (KWCAG 2.2)

### 10.1 리포트 화면 전용 요구사항

| 항목 | 구현 |
|---|---|
| 색상만으로 상태 구분 금지 (§1.4.1) | `GapPriorityTable` 행: 색상 + 우선순위 점수 수치 + 아이콘(즉시/운영자/구조제약) 3중 표현 |
| 테이블 접근성 | `<table>` 마크업; `<th scope="col/row">`; 각 행에 의미 있는 순위·액션 텍스트 |
| 키보드 탐색 | 테이블 행 Tab 탐색; CSV 다운로드 버튼 포커스 가능 |
| 포커스 표시 (§2.4.11) | 포커스 링 3:1 대비 이상 |
| 데이터 캐비엣 (§3.3.2) | `DataCaveatFooter`: `role="note"`; 숨김 불가; 항상 렌더링 |
| 한국어 lang 속성 | `<html lang="ko">` (리포트는 ko 전용; 외국인 B2G 수신자 없음) |

### 10.2 스크린리더 탐색 순서

```
1. h1 "충남 RTO 무장애 갭 개선 우선순위 리포트" + 스냅샷 날짜
2. role="note" 리포트 안내 문구 ("우선순위 점수 = impact × severity × confidence × feasibility")
3. <table> GapPriorityTable (순위 · POI · 개선항목 · 액션아이템 · 점수 · RTO결정유형)
4. CSV 내보내기 버튼 (aria-label="CACF 공유용 CSV 다운로드")
5. DataCaveatFooter (role="note") — 방문자 데이터 한계 안내
```

---

## 11. 페이지 라우트 + Next.js 15

```
app/
└─ [locale]/
   └─ rto/
      ├─ page.tsx          (RSC; public; unstable_cache 1h; tag 'rto-dashboard')
      └─ admin/
         ├─ page.tsx       (관리자 전용; Supabase session guard)
         └─ export/
            └─ route.ts    (GET; CSV 스트리밍; Content-Disposition attachment)
```

```typescript
// app/[locale]/rto/page.tsx (RSC skeleton)

import { getRtoDashboard } from '@/packages/application/src/rto/getRtoDashboard';
import { RtoDashboardPage } from '@/features/f5-dashboard/RtoDashboardPage';

export const revalidate = 3600;

export default async function RtoPage(): Promise<React.JSX.Element>
{
    // PT 심사 기간에는 'pt_demo_2026_10' 라벨 사용 (seed data; 안정적)
    const payload = await getRtoDashboard('live');
    return <GapPriorityReportPage payload={payload} />;
}
```

---

## 12. KTO DataLabService 수집 상세

### 12.1 API 호출 파라미터

```
GET https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList
    ?serviceKey={KEY}
    &MobileOS=ETC
    &MobileApp=ModuBaekje
    &_type=json
    &startYmd=20261001
    &endYmd=20261005
```

응답 필드 매핑:

| 응답 필드 | DB 컬럼 | 비고 |
|---|---|---|
| `baseYmd` | `base_ymd` | YYYYMMDD → date |
| `signguCode` | — | legacy; lDong 매핑 필요 |
| `signguNm` | — | "공주시" / "부여군" 으로 필터 |
| `touDivCd` | `tou_div_cd` | '1' 내국인현지인 / '2' 내국인외지인 / '3' 외국인 |
| `touDivNm` | `tou_div_nm` | |
| `daywkDivCd` | `daywk_div_cd` | |
| `touNum` | `tou_num` | 방문자 수 (통신 기반) |

### 12.2 레거시 코드 처리

DataLabService는 lDong 체계 미지원 (`areaCd=34`, `signguCd` legacy). 공주·부여 응답을 `signguNm` 문자열 매칭으로 필터:

```typescript
const TARGET_SIGNGU_NMS = ['공주시', '부여군'];
const rows = response.body.items.item.filter(
    (item) => TARGET_SIGNGU_NMS.includes(item.signguNm)
);
```

`lDongSignguCd` 매핑:

```typescript
const SIGNGU_NM_TO_LDONG: Record<string, string> = {
    '공주시': '150',
    '부여군': '760',
};
```

### 12.3 4일 래그 처리

```typescript
// DataLab 데이터는 ~4일 래그
const LAG_DAYS = 5;  // 여유 1일 추가
const endDate = new Date();
endDate.setDate(endDate.getDate() - 1);
const startDate = new Date();
startDate.setDate(startDate.getDate() - LAG_DAYS);
```

ETL 실패 시 마지막 성공 스냅샷 유지 (SPEC §4 ETL failure policy).

---

## 13. 인수 기준 (Acceptance Criteria)

### AC-F5-01: null 탐지 정확성

- `detailWithTour2` 응답에서 빈 문자열 또는 null인 필드는 `accessibility_facts.status='unknown'`으로 저장된다.
- `accessibility_facts` 행이 없는 capability_code는 `poi_completeness_mv`에서 `completeness_status='null'`로 나타난다.
- `poi_completeness_mv` 갱신 후 `gap_metric_snapshots`의 `null_fields + unknown_fields` 합산이 `poi_completeness_mv` 집계와 일치한다.

### AC-F5-02: 갭 우선순위 엔진

- `gap_metric_snapshots`에서 `l_dong_signgu_cd='150'`(공주)과 `'760'`(부여) 각각 3개 POI 행이 존재한다.
- `rankPoiByGapPriority` 결과의 각 POI에 `topGapCapability`, `topGapPriority`, `topGapActionItem`이 채워진다.
- `priority = impact × severity × confidence × feasibility` 계산이 각 capability_code 단위로 수행되며 결정 근거(어느 인수가 높은가)가 `topGapActionItem` 문자열에 반영된다.
- `suitabilityAffected=true` + `severity='null'` + `feasibility=1.0` 조합은 `priority=1.00`을 생성한다.
- `status='unsupported'`(본질 제약)는 `feasibility=0.1`을 적용받아 동일 `suitabilityAffected` 조건에서도 하위 순위로 분리된다.
- `GapPriorityTable`이 6개 POI를 `topGapPriority` 내림차순으로 표시하며 각 행에 RTO 결정 유형 열이 존재한다.

### AC-F5-03: 방문자 캐비엣 (MVP 단일 리포트 화면)

- `DataCaveatFooter`가 F5 리포트 페이지에 항상 렌더링된다 (방문자 차트가 없어도).
- 캐비엣 텍스트에 "관광객과 동일하게 정의되지 않음" 문구가 포함된다.
- 캐비엣 요소는 `role="note"`를 가지며 스크린리더로 읽힌다.
- 캐비엣 요소를 `display:none`으로 숨기는 코드가 없다.

### AC-F5-04: 리포트 화면 접근성

- `GapPriorityTable`이 `<table>` 마크업으로 구현되며 `<th scope>` 속성이 올바르게 적용된다.
- `@axe-core/playwright` 검사에서 F5 페이지 위반이 0건이다.
- Lighthouse accessibility score ≥ 0.95.

### AC-F5-05: PT-reproducible 스냅샷

- `rto_dashboard_snapshots WHERE snapshot_label='pt_demo_2026_10'` 행이 seed로 존재한다.
- seed 스냅샷은 ETL이 덮어쓰지 않는다 (`label='live'`만 갱신).
- 심사일 `getRtoDashboard('pt_demo_2026_10')` 호출 시 항상 동일한 페이로드를 반환한다.

### AC-F5-06: F1–F4 closed-loop

- F5 대시보드 POI별 `null_fields` 수치가 F1 POI 상세 카드의 "정보 없음" 필드 수와 일치한다.
- F3에서 승인된 제보(`barrier_reports WHERE status='approved'`)가 `report_trends_mv`에 반영된다.
- `gap_metric_snapshots.report_count_30d`가 `report_trends_mv`의 최근 30일 합산과 일치한다.

### AC-F5-07: ETL 안정성

- ETL DataLab 수집 실패 시 `datalab_visitor_snapshots` 마지막 성공 행이 유지된다.
- `poi_completeness_mv REFRESH` 실패 시 대시보드는 이전 materialized view 데이터를 서빙한다.
- `rto_dashboard_snapshots.snapshot_label='live'` 행이 없는 경우 페이지가 500 대신 빈 상태 UI를 반환한다.

### AC-F5-08: B2G 산출물

- `/rto/admin/export` 엔드포인트가 `text/csv; charset=utf-8` 형식으로 POI별 갭 데이터를 반환한다.
- CSV 헤더: `poi_id, title, l_dong_signgu_cd, completeness_pct, null_fields, unknown_fields, report_count_30d, suitability_affected, top_gap_capability, top_gap_priority, top_gap_action_item`.
- 관리자 세션 없이 접근 시 401을 반환한다.

---

## 14. 개방형 항목 (Open Items)

| # | 항목 | 우선순위 | 해결 시점 |
|---|---|---|---|
| OI-1 | DataLabService `signguCd` 공주 코드 미확인 (SPEC §11). `한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx` 직접 파싱 필요. | 높음 | C2 ETL 착수 전 |
| OI-2 | `poi_completeness_mv REFRESH CONCURRENTLY` 실행 중 잠금 충돌 가능성 → 야간 배치 시간 확정 필요. | 중간 | C1 DB Contract v1 |
| OI-3 | 올담 데이터포털 webhook API 사양 미확인. MVP는 수동 CSV 공유로 대체. | 낮음 (발전방향) | 출시 후 6개월 |
| OI-4 | `rto_dashboard_snapshots.payload_json` 크기 상한 미정 (6 POI × 28필드 × 시계열 90일 = ~수십 KB 예상; Postgres jsonb 제한 없음; 체크 필요). | 낮음 | C1 |
| OI-5 | ECharts 추가 도입 여부 (히트맵 컴포넌트). MVP에서는 히트맵 제거(발전방향)이므로 불필요. 발전방향 도입 시 bundle 영향 측정 후 결정. | 낮음 (발전방향) | 출시 후 |
| OI-6 | 발전방향 — 올담 GeoJSON 레이어 공유 형식 협의 (CACF 담당자 접촉 필요). | 낮음 (발전방향) | 출시 후 |
