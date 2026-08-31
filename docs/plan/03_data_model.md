# 03 — 데이터 모델·스키마 (DB Contract v1)

> **Status:** EXPANDS `SPEC.md §5`. 본 문서는 DB Contract v1의 단일 소유 명세다. SPEC §5의 테이블/enum/RLS/Storage 결정을 **구현 가능한 DDL 수준**으로 확장하며, SPEC을 절대 모순하지 않는다. 변경은 버전 증가(`db_contract_version`)와 함께만 한다.
> **Stack 고정:** Supabase Postgres 17 + PostGIS (no pgvector in MVP) · Vercel `icn1` · 모든 PII는 서울 리전 Postgres에만 (CDN/Edge 금지). 자세한 근거는 `_research/R4_supabase_vercel.md`.
> **읽기 순서:** 데이터는 `source_records`(raw, 불변) → normalize → validate → **PUBLISH 트랜잭션** → 공개 read-model. `accessibility_facts`는 도메인을 KTO 필드명에서 분리하는 핵심 경계다.

---

## 0. 설계 원칙 (이 스키마가 강제하는 6가지)

| # | 원칙 | 스키마에서의 강제 방식 |
|---|---|---|
| 0.1 | **raw ≠ published** | `source_records`(원본 JSON·hash) 와 정규화 테이블(`pois`, `accessibility_facts` …) 물리 분리. ETL 실패 시 마지막 published 스냅샷 계속 서빙 (SPEC §4) |
| 0.2 | **도메인은 KTO 필드명을 모른다** | `detailWithTour2`의 21필드는 **컬럼이 아니라** `accessibility_facts.source_field` 값으로만 존재. `domain/accessibility`는 `capability_code` 만 본다 |
| 0.3 | **없음 ≠ 불가** | 모든 capability는 `status` enum에 `unknown` 포함. NULL은 "운영자 미입력"이며, 본질 제약과 분리(`absence_kind`) — NEVER infer (SPEC §7 Null rule) |
| 0.4 | **deny-by-default RLS** | public 스키마 전 테이블 RLS ON. 정책 없는 테이블 = service_role 외 전면 거부. anon은 RESTRICTIVE로 추가 제약 |
| 0.5 | **provenance 필수** | 모든 정규화 fact는 `source` / `source_field` / `source_updated_at` / `ingested_at` 4축을 carry (SPEC §6 typed client 규칙) |
| 0.6 | **PT 재현성** | F5 집계는 materialized view + 스냅샷 테이블. 시연 시 동일 입력 → 동일 출력 (SPEC §12) |

**좌표계 고정:** 모든 `geography`/`geometry` 컬럼은 **SRID 4326 (WGS84)**. KTO `mapx`=경도(lng), `mapy`=위도(lat). PostGIS 저장 시 `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` (경도 먼저). 거리 질의는 `geography` 의 미터 단위 `ST_DWithin` 사용.

---

## 1. 확장·enum·공통 규약

### 1.1 확장 (migration `00_extensions.sql`)

```sql
-- PostGIS only. pgvector는 MVP 제외(SPEC §2.8) — 활성화하지 않는다.
create extension if not exists postgis;          -- geography/geometry + GiST
create extension if not exists pgcrypto;         -- gen_random_uuid()
-- citext는 locale/code 비교 단순화용(선택). 미사용 시 text + lower() 인덱스.
```

### 1.2 enum 타입 (migration `01_enums.sql`)

> enum 은 DB Contract v1의 고정 어휘. 값 추가는 마이그레이션으로만 (Postgres `alter type ... add value`는 트랜잭션 내 제약 있음 → 신규 enum 값은 별도 마이그레이션 파일).

```sql
-- POI 가시성: published 만 공개 read. draft/retired 는 service_role/admin 전용.
create type poi_visibility   as enum ('draft', 'published', 'retired');

-- capability 상태 — 4-Layer 산식의 입력 (SPEC §7: supported 1.00 / partial 0.50 / unsupported 0.00 / unknown 0.35)
create type capability_status as enum ('supported', 'partial', 'unsupported', 'unknown');

-- capability 부재 사유 2분류 (SPEC §7 Null rule, F1.A 상단 라벨)
--   intrinsic = 본질 제약(사적지 계단 등 문화재 보존), operator_missing = 운영자 미입력(F5 갭 우선)
create type absence_kind     as enum ('intrinsic', 'operator_missing', 'not_applicable');

-- fact 출처 시스템 (provenance)
create type fact_source      as enum ('kto_with', 'kto_kor', 'bf_cert', 'heritage', 'public_facility',
                                      'field_survey', 'ugc_approved', 'kma', 'airkorea', 'emergency');

-- UGC 검수 상태 머신 (F3)
create type report_status    as enum ('pending', 'in_review', 'approved', 'rejected', 'duplicate', 'expired');

-- 리뷰 검수 상태 (F1.E)
create type review_status    as enum ('pending', 'approved', 'rejected');

-- GPX 환류 검수 상태 (F1.E)
create type moderation_status as enum ('pending', 'approved', 'rejected');

-- 페르소나 코드 (SPEC §F1 입력: P1a/P1b/P2a/P2b/P3/P4 + 외국인 횡단은 locale로 처리)
create type persona_code     as enum ('wheelchair', 'senior', 'visual', 'hearing', 'family', 'group_leader', 'cognitive');

-- 인근 시설 종류 (SPEC §5 nearby_facilities)
create type facility_kind    as enum ('restroom', 'aed', 'hospital', 'equipment_rental', 'call_taxi', 'shelter');

-- route step 행동 유형 (F1.B 단계 카드)
create type route_action     as enum ('enter', 'traverse', 'rest', 'turn', 'caution', 'exit', 'restroom', 'viewpoint');

-- 위험요소 유형/심각도 (F1.B route_hazards)
create type hazard_type      as enum ('slope', 'step', 'surface', 'width', 'crossing', 'construction', 'congestion', 'weather');
create type hazard_severity  as enum ('info', 'caution', 'blocking');
create type hazard_lifespan  as enum ('permanent', 'temporary');

-- 도슨트 채널/모드 (F2 4채널 × 3모드)
create type docent_channel   as enum ('audio', 'caption', 'braille', 'sign');
create type docent_mode      as enum ('child', 'adult', 'easy');

-- 인증 등급 (Layer C; SPEC §7: 예비+0.02 / 일반+0.05 / 우수+0.08 / 열린관광지+0.04 / KQ=metadata only)
create type cert_grade       as enum ('bf_preliminary', 'bf_general', 'bf_excellent', 'open_tourism', 'kq_quality');

-- 관리자 역할
create type admin_role       as enum ('moderator', 'rto_viewer', 'superadmin');

-- 콘텐츠 스냅샷 종류 (volatile)
create type context_kind     as enum ('weather', 'crowd', 'air', 'warning');
```

### 1.3 공통 컬럼 규약

- **PK:** UGC/identity 성격은 `uuid default gen_random_uuid()`. 카탈로그성(코드 매핑·번역)은 자연키 또는 `bigint generated always as identity`.
- **타임스탬프:** 전부 `timestamptz`. `created_at timestamptz not null default now()`. 갱신 추적 필요 테이블만 `updated_at` + 트리거.
- **provenance 4축(정규화 fact 공통):** `source fact_source not null`, `source_field text`, `source_updated_at timestamptz`, `ingested_at timestamptz not null default now()`.
- **소유자(UGC 공통):** `reporter_id uuid` / `author_id uuid` → `auth.users(id)` 참조(FK는 `auth` 스키마라 논리 FK; 앱에서 `(select auth.uid())` 강제).
- **published 게이트:** 공개 read 대상은 `is_published boolean` 또는 visibility/status enum 으로 일관 표현.

---

## 2. Source / Publish 평면 (raw, service-role 전용)

> 이 평면은 **anon/authenticated 전면 차단**(RLS deny-by-default, 정책 0개). ETL(GitHub Actions/Vercel Cron)이 `service_role`로만 접근. SPEC §4의 "ingest ≠ publish transaction" 을 물리적으로 구현.

### 2.1 `ingest_runs` — ETL 실행 로그

```sql
create table ingest_runs (
  id            uuid primary key default gen_random_uuid(),
  source        fact_source not null,
  operation     text not null,                 -- e.g. 'detailWithTour2', 'areaBasedList2'
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running' check (status in ('running','succeeded','failed','partial')),
  records_seen  integer not null default 0,
  records_upserted integer not null default 0,
  error_code    text,                           -- KTO error code (03/10/11/22/30/31) if failed
  error_detail  text,
  triggered_by  text not null default 'github_actions' -- 'github_actions' | 'vercel_cron'
);
create index idx_ingest_runs_source_started on ingest_runs (source, started_at desc);
```

### 2.2 `source_records` — 원본 페이로드 (불변 append/upsert)

```sql
-- raw 원본. JSON 성공/ XML 에러 구분 없이 body-as-string도 보존(SPEC §6: errors always XML).
create table source_records (
  id            uuid primary key default gen_random_uuid(),
  source        fact_source not null,
  operation     text not null,
  source_id     text not null,                  -- contentId / themeId / area code 등 원천 식별자
  raw_payload   jsonb,                          -- 파싱 성공 시 JSON. 실패 시 null
  raw_body      text,                           -- 원문 그대로(특히 XML 에러 응답). 항상 보존
  content_hash  text not null,                  -- sha256(raw_body) — 변경 감지
  http_status   integer,
  result_code   text,                           -- KTO header.resultCode
  ingest_run_id uuid references ingest_runs(id),
  fetched_at    timestamptz not null default now(),
  unique (source, operation, source_id, content_hash)  -- 동일 내용 재수집 방지
);
create index idx_source_records_lookup on source_records (source, operation, source_id, fetched_at desc);
create index idx_source_records_run    on source_records (ingest_run_id);
```

**정규화 규칙:** normalize 단계는 `source_records` 의 최신 hash row 를 읽어 도메인 테이블로 upsert. `raw_payload`/`raw_body`는 정규화 후에도 삭제하지 않는다(필드 드리프트 디버깅·계약 테스트 fixture 근거).

### 2.3 `dataset_versions` + staging + atomic publish (M-14)

> **SPEC §4 / §13.9:** "ingest ≠ publish transaction." The plain `dataset_versions` + direct-upsert pattern does not handle deleted facts, a mid-batch POI failure, or leftover rows from the prior version. The fix is: write a full snapshot into staging tables, then atomically flip the active-version pointer.

#### Staging tables (service_role only, not exposed via RLS)

```sql
-- Mirrors accessibility_facts but scoped to a single pending publish version.
-- ETL writes here first; publish transaction swaps it to live.
create table accessibility_facts_staging (
  like accessibility_facts including all,        -- identical columns + constraints
  staging_version integer not null,
  staging_status  text not null default 'pending'
    check (staging_status in ('pending', 'committed', 'failed', 'superseded'))
);
alter table accessibility_facts_staging enable row level security;
-- No RLS policies → service_role only.

-- Same pattern for pois staging (handles deleted / renamed POIs safely)
create table pois_staging (
  like pois including all,
  staging_version integer not null,
  staging_status  text not null default 'pending'
    check (staging_status in ('pending', 'committed', 'failed', 'superseded'))
);
alter table pois_staging enable row level security;
```

#### `dataset_versions` — active-version pointer

```sql
create table dataset_versions (
  dataset           text not null,              -- 'pois' | 'accessibility' | 'route_guides' | 'docent' | 'context' ...
  published_version integer not null,
  published_at      timestamptz not null default now(),
  ingest_run_id     uuid references ingest_runs(id),
  -- Row lifecycle: 'active' = serving; 'superseded' = replaced by a later version;
  -- 'failed' = publish transaction aborted; 'stale' = ETL marked but not yet replaced.
  row_status        text not null default 'active'
    check (row_status in ('active', 'superseded', 'failed', 'stale')),
  superseded_at     timestamptz,               -- set when row_status flips to 'superseded'
  notes             text,
  primary key (dataset, published_version)
);
create index idx_dataset_versions_active on dataset_versions (dataset, published_version desc)
  where row_status = 'active';
create index idx_dataset_versions_all on dataset_versions (dataset, published_version desc);
```

#### Atomic publish sequence (M-14 contract)

The ETL publish function executes in a single transaction:

```sql
create or replace function publish_dataset(
  p_dataset         text,
  p_ingest_run_id   uuid,
  p_staging_version integer
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_new_version integer;
begin
  -- 1. Determine next version
  select coalesce(max(published_version), 0) + 1
    into v_new_version
    from public.dataset_versions
   where dataset = p_dataset;

  -- 2. Swap staging rows into live tables (delete-then-insert for full snapshot replace)
  if p_dataset = 'accessibility' then
    delete from public.accessibility_facts
     where poi_id in (
       select distinct poi_id from public.accessibility_facts_staging
        where staging_version = p_staging_version
     );
    insert into public.accessibility_facts
      select id, poi_id, capability_code, status, absence_kind, detail,
             source, source_field, source_updated_at, verified_at, ingested_at
        from public.accessibility_facts_staging
       where staging_version = p_staging_version
         and staging_status = 'pending';
    update public.accessibility_facts_staging
       set staging_status = 'committed'
     where staging_version = p_staging_version;
  end if;
  -- (analogous branches for 'pois', 'route_guides', 'docent' datasets)

  -- 3. Mark previous active version as superseded
  update public.dataset_versions
     set row_status = 'superseded', superseded_at = now()
   where dataset = p_dataset
     and row_status = 'active';

  -- 4. Insert new active-version pointer
  insert into public.dataset_versions
    (dataset, published_version, published_at, ingest_run_id, row_status)
  values
    (p_dataset, v_new_version, now(), p_ingest_run_id, 'active');

  -- 5. Append audit event
  insert into public.audit_events (actor_id, action, entity, entity_id, meta)
  values (null, 'dataset.publish', 'dataset_versions',
          p_dataset || ':' || v_new_version,
          jsonb_build_object('staging_version', p_staging_version,
                             'ingest_run_id', p_ingest_run_id));

  return v_new_version;
  -- On any exception: entire transaction rolls back → previous 'active' row is untouched
  -- → last successful publish continues serving (SPEC §4 guarantee).
end; $$;
```

**Row lifecycle semantics:**
- `active` — exactly one row per dataset; this is what the domain reads.
- `superseded` — replaced by a later successful publish; retained for audit/rollback reference.
- `failed` — written by the ETL error handler when a publish is attempted but the transaction aborts; the prior `active` row remains and continues serving.
- `stale` — ETL may mark a version stale (e.g. source-API returned no-data / code 03) without attempting a publish; the `active` row is unchanged.

After commit, the ETL calls the HMAC-protected internal endpoint to `revalidateTag('poi:all')` and per-POI tags (SPEC §2.10).

### 2.4 `source_code_mappings` — 코드 라벨 맵 (부트스트랩, 하드코딩 금지)

> SPEC §6: **lDong 코드를 절대 하드코딩(44/150/760)하지 말 것.** `ldongCode2`/`lclsSystmCode2` 응답으로 부트스트랩. legacy `areaCd=34`/`cat*` 는 read-only fallback.

```sql
create table source_code_mappings (
  service     text not null,                    -- 'KorService2' | 'KorWithService2' | 'TatsCnctrRateService' ...
  code_type   text not null,                    -- 'lDongRegn' | 'lDongSinggu' | 'lclsSystm1' | 'lclsSystm2' | 'lclsSystm3'
                                                 -- | 'legacy_areaCd' | 'legacy_signguCd' | 'contentTypeId'
  source_code text not null,                    -- '44' | '150' | 'HS' | 'HS01' | '34' | '34800' | '12'
  parent_code text,                             -- 계층(lclsSystm2 → 부모 lclsSystm1; lDongSignggu → 부모 lDongRegn)
  label       text not null,                    -- '충청남도' | '공주시' | '역사유적지' ...
  is_legacy   boolean not null default false,   -- TatsCnctr/TarRlte/DataLab 의 legacy 네임스페이스
  source      fact_source not null default 'kto_kor',
  ingested_at timestamptz not null default now(),
  primary key (service, code_type, source_code)
);
create index idx_code_mappings_type on source_code_mappings (service, code_type);
create index idx_code_mappings_parent on source_code_mappings (service, code_type, parent_code);
```

**부트스트랩 시퀀스(1회, scripts/ingest):**

| 순서 | 호출 | 적재 `code_type` | 비고 |
|---|---|---|---|
| 1 | `KorService2/ldongCode2?lDongRegnCd=44&lDongListYn=Y` | `lDongRegn`, `lDongSinggu` | 충남(44) 하위 시군구 라벨. `label` = `lDongRegnNm`/`lDongSignguNm` |
| 2 | `KorService2/lclsSystmCode2?lclsSystmListYn=Y` | `lclsSystm1/2/3` | 11/62/~243 코드. `parent_code` 로 계층 연결 |
| 3 | (수동/문서) TatsCnctr signguCd | `legacy_signguCd` | 부여=34800 확정, **공주=TBD(빌드 시 xlsx 검증)**, `is_legacy=true`, `service='TatsCnctrRateService'` |
| 4 | (문서) 다국어 contentTypeId | `contentTypeId` | 관광지 76/문화 78/행사 85 등 (SPEC §6) |

> **verify-at-build-time:** lDong 코드는 §1 호출로 채우고, TatsCnctr 공주 signguCd 와 detailWithTour2 필드 키는 빌드 단계 live probe 로 확정(SPEC §11). 본 테이블이 단일 진실원천.

---

## 3. POI / Accessibility 평면 (published 시 공개 read)

### 3.1 `pois` — POI 마스터

```sql
create table pois (
  id             uuid primary key default gen_random_uuid(),
  kto_content_id text unique,                   -- KTO contentId (정규화 키). 자체 POI는 null 허용
  slug           text unique not null,          -- 'gongsanseong' | 'busosanseong' ... (URL/콘텐츠 패키지 키)
  content_type_id integer,                       -- 12/14/15/28/32/38 (KorWith 지원 6종)
  ldong_regn_cd  text,                           -- '44' (source_code_mappings 참조; FK 아님 — read-only)
  ldong_signgu_cd text,                          -- '150'(공주) | '760'(부여)
  lcls_systm1    text,                           -- 'HS' | 'VE' | 'EV' ...
  lcls_systm2    text,                           -- 'HS01' | 'HS03' | 'VE07' ...
  geom           geography(Point, 4326) not null,-- WGS84. ST_MakePoint(lng, lat)
  heritage_no    text,                           -- 史477 등 국가유산청 지정번호
  visibility     poi_visibility not null default 'draft',
  is_published   boolean generated always as (visibility = 'published') stored,
  demo_priority  integer not null default 0,     -- 공산성·부소산성 = 높은 값(시연 우선)
  source         fact_source not null default 'kto_kor',
  source_updated_at timestamptz,                 -- KTO modifiedtime
  ingested_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_pois_geom        on pois using gist (geom);                 -- 공간 질의(반경)
create index idx_pois_published   on pois (is_published) where is_published; -- 부분 인덱스
create index idx_pois_signgu      on pois (ldong_signgu_cd) where is_published;
create index idx_pois_content_id  on pois (kto_content_id);
```

**6 POI 시드(`supabase/seed`):** 공산성·무령왕릉과 왕릉원·국립공주박물관(공주, signgu 150) · 부소산성·정림사지·국립부여박물관(부여, signgu 760). `demo_priority`: 공산성·부소산성 = 10, 나머지 5.

### 3.2 `poi_translations` — 다국어 텍스트 (외국인 4언어 횡단)

```sql
create table poi_translations (
  poi_id      uuid not null references pois(id) on delete cascade,
  locale      text not null check (locale in ('ko','en','ja','zh-CN')),
  title       text not null,
  description text,
  provenance  text not null,                    -- 'kto_kor' | 'kto_eng' | 'self_translated' | 'heritage'
  is_ai_translated boolean not null default false, -- "AI 번역" 배지(AI 기본법) 트리거
  source      fact_source not null default 'kto_kor',
  source_field text,
  source_updated_at timestamptz,
  ingested_at timestamptz not null default now(),
  primary key (poi_id, locale)
);
```

### 3.3 `poi_media` — 사진/미디어 (라이선스 carry)

```sql
create table poi_media (
  id            uuid primary key default gen_random_uuid(),
  poi_id        uuid not null references pois(id) on delete cascade,
  url           text not null,                  -- KTO firstimage 등(http 가능 — CSP/proxy 처리)
  storage_path  text,                           -- public 버킷 미러본 경로(있으면 우선)
  kind          text not null default 'photo' check (kind in ('photo','floorplan','og','entrance')),
  license_code  text,                           -- cpyrhtDivCd: 'Type1'(출처표시) | 'Type3'(출처표시+변경금지)
  attribution   text not null,                  -- 화면 표기 문구(자동 카드)
  transform_policy text not null default 'none' check (transform_policy in ('none','attribution_only','no_modification')),
                                                 -- Type3 → no_modification(변형 금지). 가장 제약적 정책 우선
  width         integer,
  height        integer,
  sort_order    integer not null default 0,
  source        fact_source not null default 'kto_kor',
  source_field  text,                            -- 'firstimage' | 'galleryPhotoUrl' ...
  ingested_at   timestamptz not null default now()
);
create index idx_poi_media_poi on poi_media (poi_id, sort_order);
```

> **라이선스 규약(SPEC §10):** `Type3` 자산은 `transform_policy='no_modification'` → 앱은 변형(크롭·합성·필터) 금지, 출처+변경금지 표기. Next `<Image>` 최적화도 Type3 자산엔 적용하지 않는다(원본 서빙).

### 3.4 `poi_entrances` — 출입구별 (F1.A 출입구 사진/접근법)

```sql
create table poi_entrances (
  id           uuid primary key default gen_random_uuid(),
  poi_id       uuid not null references pois(id) on delete cascade,
  name         text not null,                   -- '서문' | '북문' | '후문'
  location     geography(Point, 4326) not null, -- 출입구 좌표
  approach     text,                            -- 접근법 요약('평탄 30m, 점자블록 유')
  has_ramp     boolean,
  has_steps    boolean,
  verified_at  timestamptz,                     -- 현장 검증일(콘텐츠 패키지)
  verified_by  text,                            -- 검증자(개인정보 아님 — 역할/팀명)
  source       fact_source not null default 'field_survey',
  ingested_at  timestamptz not null default now()
);
create index idx_poi_entrances_poi  on poi_entrances (poi_id);
create index idx_poi_entrances_geom on poi_entrances using gist (location);
```

### 3.5 `accessibility_facts` — capability 모델 (★ 핵심 경계)

> SPEC §5/§7의 심장. **detailWithTour2 21필드는 여기 row 로만 들어온다(컬럼 금지).** 도메인은 `capability_code` + `status` 만 읽고 KTO 필드명(`wheelchair`,`braileblock` …)은 `source_field` 에 보관 → 필드 드리프트가 도메인을 깨지 않음.

```sql
create table accessibility_facts (
  id            uuid primary key default gen_random_uuid(),
  poi_id        uuid not null references pois(id) on delete cascade,
  capability_code text not null,                -- 16 §2 canonical 어휘 (SPEC §14.2). 예: 'wheelchair_access' (NOT 'entry.wheelchair')
  status        capability_status not null,     -- supported | partial | unsupported | unknown
  absence_kind  absence_kind,                   -- status=unsupported/unknown 일 때만 의미. NULL=해당없음
  detail        text,                            -- 원문 설명(현장 확인 안내 등). 다국어는 별도 안 함(코어는 ko)
  -- provenance 4축
  source        fact_source not null,           -- 'kto_with'(detailWithTour2) | 'bf_cert' | 'field_survey' | 'ugc_approved'
  source_field  text,                            -- KTO 원본 필드명: 'wheelchair' | 'restroom' | 'braileblock' ... (빌드 시 검증)
  source_updated_at timestamptz,
  verified_at   timestamptz,                     -- 마지막 확인일(Layer D freshness 입력)
  ingested_at   timestamptz not null default now(),
  unique (poi_id, capability_code, source)       -- 출처별 1행(KTO vs 현장 vs UGC 공존; 도메인이 우선순위 결정)
);
create index idx_acc_facts_poi  on accessibility_facts (poi_id);
create index idx_acc_facts_cap  on accessibility_facts (poi_id, capability_code);
create index idx_acc_facts_src  on accessibility_facts (source, source_field);
```

#### 3.5.1 `accessibility_evidence` — evidence pack (B-3 · 현장 검증 DoD)

> **SPEC §13.5 Definition of Done:** a capability is "현장 검증" only when this table holds a fully populated evidence pack row. A bare `verified_by`/`verified_at` string in `accessibility_facts` alone is **banned as a publish gate** for the full evidence-pack tier (공산성·부소산성). See `16_suitability_policy.md §8` for source precedence that governs `active_source` resolution when rows from multiple sources conflict.

```sql
-- One row per fact-verification event. Multiple rows per (poi_id, capability_code)
-- are allowed (successive re-verification cycles); the ETL publish step selects the
-- most recent row with second_approved_at IS NOT NULL as the authoritative entry.
create table accessibility_evidence (
  id                    uuid primary key default gen_random_uuid(),
  -- FK into accessibility_facts row that this evidence supports.
  fact_id               uuid not null references accessibility_facts(id) on delete cascade,
  poi_id                uuid not null references pois(id) on delete cascade,  -- denormalized for fast RLS/index
  capability_code       text not null,

  -- Per-fact photo (single Storage path; type-checked by upload policy)
  photo_storage_path    text not null,   -- 'evidence/{poi_slug}/{cap_code}/{uuid}.jpg' in private bucket

  -- Measurement
  measured_value        text,            -- e.g. '87 cm', '8.5 %', 'present', 'absent'
  measurement_method    text not null,   -- e.g. 'tape measure', 'inclinometer app', 'visual inspection'

  -- Verifier identity (role/title, not PII name)
  verifier_role         text not null,   -- e.g. 'OT 담당자', '관광약자 접근성 전문가'
  verifier_qualification text,           -- certification or institutional affiliation

  -- Second approval (doc 16 §8: second-approved field survey outranks all other sources)
  second_approved_by    text,            -- role/institution of second reviewer
  second_approved_at    timestamptz,     -- NULL = only primary verifier; non-NULL = authoritative

  -- Temporal validity
  valid_from            timestamptz not null default now(),
  valid_until           timestamptz,     -- NULL = indefinite; set for seasonal/construction-bounded facts

  -- Change history (one JSON entry per re-verification; append-only by ETL)
  -- Each entry: {changed_at, changed_by_role, prior_status, new_status, reason}
  change_history        jsonb not null default '[]',

  ingested_at           timestamptz not null default now(),
  ingest_run_id         uuid references ingest_runs(id)
);
create index idx_acc_evidence_fact      on accessibility_evidence (fact_id);
create index idx_acc_evidence_poi_cap   on accessibility_evidence (poi_id, capability_code, second_approved_at desc nulls last);
create index idx_acc_evidence_validity  on accessibility_evidence (poi_id, valid_from, valid_until);

alter table accessibility_evidence enable row level security;
-- Evidence photos are admin+field-team only; public never reads raw evidence paths.
create policy "evidence acc: admin reads" on accessibility_evidence for select to authenticated
  using ((select is_platform_admin()));
```

**Source precedence rule (doc 16 §8 — enforced at ETL publish, not query time):**
When `accessibility_facts` rows from multiple sources exist for the same `(poi_id, capability_code)`, the domain resolves the active status in this order:
1. `accessibility_evidence` row with `second_approved_at IS NOT NULL` (field survey, evidence pack)
2. `bf_cert` / `heritage` public dataset
3. `kto_with` (`detailWithTour2`)
4. Single approved UGC (`ugc_approved`) — can flag for re-verification but cannot alone flip an authoritative status
5. Unverified UGC

The ETL publish step writes the resolved winner back to `accessibility_facts.source` + `status` for the fact that the domain reads; the losing rows remain as provenance.

#### 3.5.2 capability catalog (도메인 어휘 ↔ KTO source_field 매핑)

> `capability_code` 의 **단일 어휘 권위는 `16_suitability_policy.md §2`** (SPEC §14.2); `packages/domain/policy/capabilities.ts`가 그 export다. 아래 표의 코드는 **반드시 16 §2와 동일**해야 하며(`entry.wheelchair`류 변형 금지 → `wheelchair_access` 등) set-equality CI가 `{ETL}={16 §2}={domain}={F5}` 를 강제한다. detailWithTour2 필드 키는 **verify-at-build-time** (SPEC §11). 현장 검증 증거는 §3.5.1 `accessibility_evidence`.

| capability_code | 도메인 의미 | source=`kto_with` source_field | Layer A 축(가중치) | critical 페르소나 |
|---|---|---|---|---|
| `wheelchair_access` | 휠체어 진입 | `wheelchair` | entry(0.30) | P1a |
| `entrance_step_free` | 출입구 단차 | `exit` | entry(0.30) | P1a |
| `elevator` | 엘리베이터 | `elevator` | entry(0.30) | P1a, P1b |
| `amenity.restroom` | 장애인 화장실 | `restroom` | amenities(0.15) | wheelchair |
| `amenity.auditorium` | 객석/관람석 | `auditorium` | amenities(0.15) | — |
| `amenity.room` | 편의 공간 | `room` | amenities(0.15) | — |
| `amenity.stroller` | 유아차 | `stroller` | amenities(0.15) | family |
| `amenity.lactationroom` | 수유실 | `lactationroom` | amenities(0.15) | family |
| `amenity.babychair` | 영유아 의자 | `babysparechair` | amenities(0.15) | family |
| `visual.braileblock` | 점자블록 | `braileblock` | entry/continuity | visual |
| `visual.audioguide` | 음성 안내 | `audioguide` | amenities | visual |
| `visual.guidesystem` | 안내 시스템 | `guidesystem` | continuity(0.18) | visual |
| `visual.bigprint` | 큰 글씨 | `bigprint` | amenities | visual, senior |
| `visual.helpdog` | 도우미견 | `helpdog` | entry | visual |
| `visual.guidehuman` | 안내 인력 | `guidehuman` | amenities | visual |
| `visual.brailepromotion` | 점자 안내물 | `brailepromotion` | amenities | visual |
| `hearing.signguide` | 수어 안내 | `signguide` | amenities | hearing |
| `hearing.videoguide` | 영상 안내 | `videoguide` | amenities | hearing |
| `hearing.room` | 청각 안내실 | `hearingroom` | amenities | hearing |
| `common.parking` | 주차 | `parking` | amenities | wheelchair, senior |
| `common.route` | 접근 경로 | `route` | continuity(0.18) | all |
| `common.publictransport` | 대중교통 | `publictransport` | continuity | all |
| `common.ticketoffice` | 매표소 접근 | `ticketoffice` | entry | wheelchair |

> `*etc` catchall(`handicapetc`,`blindhandicapetc`,`hearinghandicapetc`,`infantsfamilyetc`)은 capability 가 아니라 **detail 텍스트 보강**으로만 매핑(점수에 직접 반영 안 함). 빈 필드 → row 자체를 만들지 않거나 `status='unknown'` + `absence_kind='operator_missing'` (F5 갭 카운트 대상).

### 3.6 `poi_certifications` — 인증 (Layer C 입력)

```sql
create table poi_certifications (
  id          uuid primary key default gen_random_uuid(),
  poi_id      uuid not null references pois(id) on delete cascade,
  grade       cert_grade not null,             -- bf_preliminary/general/excellent | open_tourism | kq_quality
  period_start date,
  period_end   date,                            -- 유효기간(만료 시 Layer C 미반영)
  source       fact_source not null default 'bf_cert',
  source_field text,
  source_updated_at timestamptz,
  ingested_at  timestamptz not null default now(),
  unique (poi_id, grade)
);
create index idx_poi_cert_poi on poi_certifications (poi_id);
```

> Layer C 보정(SPEC §7): `bf_preliminary +0.02 / bf_general +0.05 / bf_excellent +0.08 / open_tourism +0.04`, 합 cap **+0.12**(1.00–1.12). `kq_quality` 는 **metadata only**(점수 미반영) — 도메인이 enum 으로 식별해 배제.

### 3.7 `nearby_facilities` — 인근 시설 (F1.A 응급/화장실/대여)

```sql
create table nearby_facilities (
  id           uuid primary key default gen_random_uuid(),
  poi_id       uuid references pois(id) on delete set null,  -- POI 비종속 시설 허용(좌표만)
  kind         facility_kind not null,          -- restroom | aed | hospital | equipment_rental | call_taxi | shelter
  name         text not null,
  location     geography(Point, 4326) not null,
  phone        text,                             -- 콜택시/응급 전화 딥링크
  detail       text,
  source       fact_source not null,            -- 'emergency'(AED/응급) | 'public_facility'(행안부 표준)
  source_field text,
  ingested_at  timestamptz not null default now()
);
create index idx_nearby_geom on nearby_facilities using gist (location);
create index idx_nearby_poi  on nearby_facilities (poi_id, kind);
```

> 500m/1km cutoff(SPEC §F1.A)는 질의 시점 `ST_DWithin(location, poi.geom, 500)` / `1000` 으로 계산 — 거리 컬럼 비저장.

### 3.8 `context_snapshots` — volatile 스냅샷 (날씨/혼잡/대기/특보)

> SPEC §2.7: **런타임 KTO 호출 없음.** 변동 데이터는 ETL이 짧은 주기로 스냅샷. 도메인은 `effective_period` 안의 최신 row 만 본다.

```sql
create table context_snapshots (
  id            uuid primary key default gen_random_uuid(),
  poi_id        uuid references pois(id) on delete cascade, -- 광역 특보는 null(signgu 단위)
  ldong_signgu_cd text,                          -- POI 없는 광역 스냅샷용
  kind          context_kind not null,          -- weather | crowd | air | warning
  payload       jsonb not null,                  -- {temp, pm10, congestionIndex(0..100), warningType ...}
  effective_from timestamptz not null,
  effective_to  timestamptz not null,            -- 만료 시각(TTL). 만료 후 도메인 미반영
  source        fact_source not null,            -- 'kma' | 'airkorea' | 'kto_kor'(TatsCnctr)
  source_field  text,
  ingested_at   timestamptz not null default now()
);
create index idx_context_active on context_snapshots (poi_id, kind, effective_to desc);
create index idx_context_signgu on context_snapshots (ldong_signgu_cd, kind, effective_to desc);
```

> TatsCnctr 집중률은 0–100 index(headcount 아님; SPEC §6). `payload.congestionIndex` 로 저장하고 화면에 "집중률 지수" 라벨 명시.

---

## 4. Routes / Docent 평면 (published 시 공개 read)

### 4.1 `route_guides` — 사전 검수 정적 경로 (F1.B)

```sql
create table route_guides (
  id            uuid primary key default gen_random_uuid(),
  poi_id        uuid not null references pois(id) on delete cascade,
  persona_flags persona_code[] not null default '{}', -- 이 가이드가 최적화된 페르소나
  version       integer not null default 1,
  is_published  boolean not null default false,
  verified_at   timestamptz,                     -- 검증일(route 오류 방지 게이트, SPEC §11)
  verified_by   text,                             -- 검증 역할/팀(개인정보 아님)
  created_at    timestamptz not null default now(),
  unique (poi_id, version)
);
create index idx_route_guides_poi on route_guides (poi_id) where is_published;
```

> **NO dynamic pgRouting/DEM(SPEC §2.6).** 6 POI 큐레이션 정적 패키지만. 자동 생성 경로 금지 — 모든 row 는 `verified_by`/`verified_at` 보유.

### 4.2 `route_steps` — 단계 카드 (F1.B 5~12단계, F1.F 재사용)

```sql
create table route_steps (
  id           uuid primary key default gen_random_uuid(),
  route_guide_id uuid not null references route_guides(id) on delete cascade,
  seq          integer not null,                -- 1..N (1단계 1행동)
  action       route_action not null,           -- enter | traverse | rest | turn | caution | exit | restroom | viewpoint
  geometry     geography(LineString, 4326),     -- 구간 폴리라인(정적 캐시). 단일 지점은 null
  point        geography(Point, 4326),          -- 단계 대표 지점(카드 표시)
  distance_m   integer,                          -- 구간 거리
  slope_pct    numeric(4,1),                     -- NGII DEM 파생 경사도(%) — 런타임 DEM 호출 없음(R5)
  easy_text    text not null,                   -- 쉬운글(7세 어휘, 1단계 1행동) — F1.F/F2 공유
  photo_media_id uuid references poi_media(id), -- 단계 사진
  pictogram_code text,                           -- KS X ISO 7001 등 픽토그램 코드(자체 제작 아님)
  unique (route_guide_id, seq)
);
create index idx_route_steps_guide on route_steps (route_guide_id, seq);
create index idx_route_steps_geom  on route_steps using gist (geometry);
```

### 4.3 `route_hazards` — 구간 위험요소 (F1.B)

```sql
create table route_hazards (
  id            uuid primary key default gen_random_uuid(),
  route_guide_id uuid not null references route_guides(id) on delete cascade,
  step_seq      integer,                         -- 연관 단계(없으면 null=경로 전반)
  type          hazard_type not null,            -- slope | step | surface | width | crossing | construction | congestion | weather
  severity      hazard_severity not null,        -- info | caution | blocking
  lifespan      hazard_lifespan not null,        -- permanent | temporary
  location      geography(Point, 4326),
  detail        text,
  source        fact_source not null default 'field_survey', -- temporary+construction 은 'ugc_approved' 가능
  effective_to  timestamptz,                     -- temporary 위험의 만료(공사 종료 등)
  ingested_at   timestamptz not null default now()
);
create index idx_route_hazards_guide on route_hazards (route_guide_id);
create index idx_route_hazards_geom  on route_hazards using gist (location);
```

### 4.4 `itinerary_templates` — 시간 예산 큐레이션 (F1.D)

> SPEC §7 Time budget: **일반 옵티마이저 아님.** 큐레이션 템플릿에서 선택. 반나절→1박2일 = 동일 template family 확장(PT-stable).

```sql
create table itinerary_templates (
  id            uuid primary key default gen_random_uuid(),
  family        text not null,                   -- 'gongju_core' | 'buyeo_core' | 'baekje_2pois' ...
  budget_mode   text not null check (budget_mode in ('half_day','full_day','one_night','two_night')),
  ordered_pois  uuid[] not null,                 -- 방문 순서(pois.id 배열)
  slot_durations jsonb not null,                 -- {stay, transfer, rest, meal, lodging} 분 단위 기준값
  persona_flags persona_code[] not null default '{}',
  is_published  boolean not null default false,
  notes         text,
  unique (family, budget_mode)
);
create index idx_itinerary_family on itinerary_templates (family, budget_mode) where is_published;
```

> 전이 행렬(transfer matrix)·페르소나 휴식 multiplier(**max, not product** — SPEC §7)는 도메인 상수(`packages/domain/itinerary`). 본 테이블은 POI 순서 + 슬롯 기준값만.

### 4.5 `offline_bundle_manifests` — F1.B 오프라인 번들 (M-19)

> **SPEC §13.9 / M-19:** KOGL Type3 assets ("no transform" — `transform_policy='no_modification'`) must not be Canvas-compressed for the offline bundle. The manifest enforces license-awareness, deduplicates storage, and provides a full text-step fallback contract so the offline guide degrades gracefully when a restricted asset is unavailable. Each POI route package has exactly one active manifest row.

```sql
create table offline_bundle_manifests (
  id              uuid primary key default gen_random_uuid(),
  poi_id          uuid not null references pois(id) on delete cascade,
  route_guide_id  uuid not null references route_guides(id) on delete cascade,
  version         integer not null default 1,
  is_active       boolean not null default false,  -- only one active manifest per (poi_id, route_guide_id)

  -- Manifest payload: array of asset descriptors.
  -- Each entry: {asset_id, storage_path, asset_hash, license_code, transform_policy,
  --              kind ('photo'|'audio'|'caption'|'pictogram'),
  --              step_seq, fallback_text}
  -- storage_path is a SINGLE canonical path (never duplicated across Cache Storage + IndexedDB).
  -- asset_hash: sha256 of the stored file — integrity check on IndexedDB write.
  -- fallback_text: full text-step content shown when the asset is unavailable offline.
  assets          jsonb not null default '[]',

  -- Bundle-level size accounting (sum of non-Type3 compressed + Type3 original sizes)
  total_bytes     bigint not null default 0,

  -- Type3 assets are served as-is (no canvas/Next <Image> optimization).
  -- This count helps the client decide whether to warn about bundle size before download.
  type3_asset_count integer not null default 0,

  created_at      timestamptz not null default now(),
  published_at    timestamptz,                     -- set when ETL marks the bundle ready for download
  ingest_run_id   uuid references ingest_runs(id),
  unique (poi_id, route_guide_id, version)
);
create index idx_bundle_manifest_active on offline_bundle_manifests (poi_id, route_guide_id)
  where is_active;
create index idx_bundle_manifest_poi on offline_bundle_manifests (poi_id, is_active);

alter table offline_bundle_manifests enable row level security;
-- Published bundles are publicly readable (IndexedDB download by the PWA).
create policy "bundle manifest public read active"
on offline_bundle_manifests for select to anon, authenticated
using (is_active = true and published_at is not null);
```

**Asset entry schema (per element of `assets` jsonb array):**

| field | type | note |
|---|---|---|
| `asset_id` | uuid | FK to `poi_media.id` or `docent_assets.id` |
| `storage_path` | text | canonical single path in public bucket; never duplicated |
| `asset_hash` | text | sha256 of stored file; client verifies before IndexedDB write |
| `license_code` | text | `'Type1'` / `'Type3'` / `'public_domain'` |
| `transform_policy` | text | mirrors `poi_media.transform_policy`; `'no_modification'` blocks canvas resize |
| `kind` | text | `'photo'` / `'audio'` / `'caption'` / `'pictogram'` |
| `step_seq` | integer | route step this asset belongs to (null = route-level) |
| `fallback_text` | text | full text-step shown when asset unavailable offline (**required for every entry**) |

> The PWA offline worker reads `assets[]` and caches each `storage_path` once (single storage location). Type3 entries skip compression/resize. If `storage_path` is unreachable, the worker renders `fallback_text` — guaranteeing a full text-step offline guide regardless of asset availability.

### 4.6 `docent_stories` / `docent_assets` (F2)

```sql
create table docent_stories (
  id           uuid primary key default gen_random_uuid(),
  poi_id       uuid not null references pois(id) on delete cascade,
  locale       text not null check (locale in ('ko','en','ja','zh-CN')),
  mode         docent_mode not null,            -- child | adult | easy
  title        text not null,
  trigger_point geography(Point, 4326),         -- geofence 진입 트리거(Odii xCoord/yCoord). map-tap fallback도 동일 사용
  trigger_radius_m integer not null default 500,
  is_ai_voice  boolean not null default false,  -- "AI 음성 안내" 배지
  source       fact_source not null default 'kto_kor', -- Odii
  source_field text,
  source_updated_at timestamptz,
  is_published boolean not null default false,
  unique (poi_id, locale, mode)
);
create index idx_docent_stories_poi  on docent_stories (poi_id, locale, mode) where is_published;
create index idx_docent_stories_geom on docent_stories using gist (trigger_point);

create table docent_assets (
  id              uuid primary key default gen_random_uuid(),
  docent_story_id uuid not null references docent_stories(id) on delete cascade,
  channel         docent_channel not null,       -- audio | caption | braille | sign
  storage_path    text,                          -- public 버킷(음성/수어 영상) 경로
  url             text,                           -- Odii 원음 외부 URL 가능
  transcript      text,                           -- caption/braille 텍스트(항상 노출 — aria-live)
  braille_unicode text,                           -- U+2800 블록(점자) — 무손실
  duration_s      integer,
  source          fact_source not null default 'kto_kor',
  unique (docent_story_id, channel)
);
create index idx_docent_assets_story on docent_assets (docent_story_id, channel);
```

> 4채널 × 4언어 × 3모드 매트릭스. `caption.transcript` 는 항상 존재(KWCAG; SPEC §8 F2). 수어 영상은 6 POI 샘플(MVP).

---

## 5. UGC / Admin 평면 (RLS 강제)

### 5.1 `admin_roles` — 관리자 (하드코딩 금지)

```sql
create table admin_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       admin_role not null,               -- moderator | rto_viewer | superadmin
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, role)
);
create index idx_admin_roles_user on admin_roles (user_id);
```

```sql
-- admin 판별 헬퍼: SECURITY DEFINER 로 admin_roles RLS 순환참조 회피(R4 §2.2 패턴)
create or replace function is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_roles ar where ar.user_id = (select auth.uid()));
$$;

create or replace function has_admin_role(required admin_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_roles ar
    where ar.user_id = (select auth.uid())
      and (ar.role = required or ar.role = 'superadmin')
  );
$$;
```

### 5.2 `barrier_reports` — 배리어 제보 (F3, self insert/read · approved public)

```sql
create table barrier_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null,                   -- auth.uid() (anon 포함). 본인만 작성/열람
  poi_id       uuid references pois(id) on delete set null,
  route_guide_id uuid references route_guides(id) on delete set null,
  category     hazard_type not null,            -- 제보 분류(선택형 — 자유 텍스트 최소화)
  status       report_status not null default 'pending', -- pending→in_review→approved/rejected/duplicate/expired
  occurred_at  timestamptz,                     -- 사용자가 본 시점
  location     geography(Point, 4326),          -- 제보 좌표(위치정보법: GPS 원본 비영속 — §23 secure-wipe)
  ldong_signgu_cd text,                          -- F5 히트맵·Realtime 토픽 키
  detail       text,
  reporter_trust integer not null default 0,    -- 신고자 신뢰도(누적, 필터)
  is_anonymous boolean not null default true,   -- auth.jwt is_anonymous 미러(빠른 정책 평가)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_reports_status on barrier_reports (status, created_at desc);
create index idx_reports_owner  on barrier_reports (reporter_id);          -- RLS 정책 컬럼 인덱스(필수)
create index idx_reports_poi    on barrier_reports (poi_id) where status = 'approved';
create index idx_reports_signgu on barrier_reports (ldong_signgu_cd, status);
```

### 5.3 `report_evidence` — 제보 사진 (reporter + admin only, private storage 경로만)

```sql
create table report_evidence (
  id                  uuid primary key default gen_random_uuid(),
  report_id           uuid not null references barrier_reports(id) on delete cascade,
  reporter_id         uuid not null,            -- RLS 소유 검증용 미러
  private_storage_path text not null,           -- 'ugc-evidence/{uid}/{file}' — private 버킷 경로만(URL 금지)
  mime_type           text not null,
  created_at          timestamptz not null default now()
);
create index idx_report_evidence_report on report_evidence (report_id);
create index idx_report_evidence_owner  on report_evidence (reporter_id);
```

### 5.4 `moderation_events` — 검수 이력 (admin only, append-only)

```sql
create table moderation_events (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references barrier_reports(id) on delete cascade,
  moderator_id uuid not null,                   -- 검수자 admin uid
  from_status report_status not null,
  to_status   report_status not null,
  reason      text,
  created_at  timestamptz not null default now()
);
create index idx_moderation_report on moderation_events (report_id, created_at);
```

### 5.5 `reviews` — 페르소나별 후기 (F1.E, approved public)

```sql
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null,                    -- 영구 사용자만(anon 작성 금지 — RESTRICTIVE)
  poi_id      uuid not null references pois(id) on delete cascade,
  persona     persona_code not null,            -- 페르소나별 분리 탭(단일 평점 금지)
  dimensions  jsonb not null,                   -- {entry, restroom, rest, ...} 차원별 점수
  body        text,
  status      review_status not null default 'pending',
  created_at  timestamptz not null default now()
);
create index idx_reviews_poi    on reviews (poi_id, persona) where status = 'approved';
create index idx_reviews_author on reviews (author_id);
```

### 5.6 `gpx_submissions` — 검증 동선 환류 (F1.E)

```sql
create table gpx_submissions (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null,
  route_guide_id    uuid references route_guides(id) on delete set null,
  storage_path      text not null,              -- private 버킷(검수 전) → 승인 시 public 미러
  track             geography(LineString, 4326),
  moderation_status moderation_status not null default 'pending',
  created_at        timestamptz not null default now()
);
create index idx_gpx_author on gpx_submissions (author_id);
create index idx_gpx_status on gpx_submissions (moderation_status);
```

### 5.7 `audit_events` — 감사 로그 (admin only, append-only)

```sql
create table audit_events (
  id         bigint generated always as identity primary key,
  actor_id   uuid,                              -- 행위자(admin/system)
  action     text not null,                     -- 'report.approve' | 'role.grant' | 'publish' ...
  entity     text not null,                     -- 'barrier_reports' | 'admin_roles' ...
  entity_id  text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_created on audit_events (created_at desc);
-- 실제 기록은 SECURITY DEFINER 트리거로만. 직접 INSERT 차단(아래 RLS).
```

### 5.8 F4 다이어리 정책

> SPEC §5: 다이어리는 **IndexedDB 기본**, 서버는 **명시적으로 제출된 데이터만** 저장. MVP 서버 테이블은 두지 않는다(로컬 우선). 단체 합본/공유 등 서버 영속이 필요한 발전 항목은 별도 마이그레이션. IndexedDB object store 스키마(`poiGuides`/`media`/`routes`/`syncQueue`)는 `R5 §5.2` 및 `04_*`(클라이언트 문서) 소관.

---

## 6. Storage 버킷 (public vs private/evidence)

> SPEC §5 + R4 §3: public/private 토글과 RLS는 **별개 스위치 — 둘 다 설정**. PII가 식별되는 자산은 private + 짧은 signed URL. 공개 관광 자산만 CDN(글로벌 PoP)에 흐르게 한다.

| 버킷 | public | mime 화이트리스트 | size limit | 용도 | 접근 |
|---|---|---|---|---|---|
| `poi-public` | true | image/jpeg,png,webp | 10MB | POI 공개 사진·OG·출입구 사진 미러 | anon read |
| `docent-public` | true | audio/mpeg, video/mp4, image/* | 50MB | 도슨트 음성·수어 영상·자막 자산 | anon read |
| `gpx-public` | true | application/gpx+xml, text/xml | 2MB | 승인된 GPX 환류본 | anon read |
| `ugc-evidence` | **false** | image/jpeg,png,webp | 10MB | 검수 전 제보 사진(승인 전 비공개) | reporter+admin only |
| `ugc-gpx-pending` | **false** | application/gpx+xml, text/xml | 2MB | 검수 전 GPX 제출본 | author+admin only |

```sql
-- 버킷 생성(seed). 화이트리스트로 토큰 유출 시에도 악성 파일 차단(R4 §3.1)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('poi-public','poi-public', true, 10485760, array['image/jpeg','image/png','image/webp']),
 ('docent-public','docent-public', true, 52428800, array['audio/mpeg','video/mp4','image/jpeg','image/png','image/webp']),
 ('gpx-public','gpx-public', true, 2097152, array['application/gpx+xml','text/xml']),
 ('ugc-evidence','ugc-evidence', false, 10485760, array['image/jpeg','image/png','image/webp']),
 ('ugc-gpx-pending','ugc-gpx-pending', false, 2097152, array['application/gpx+xml','text/xml']);

-- private evidence: 본인 폴더(uid)에만 업로드
create policy "evidence upload to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ugc-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
-- private evidence: 본인 또는 admin 만 read
create policy "evidence read own or admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'ugc-evidence'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select is_platform_admin()))
);
-- ugc-gpx-pending: 동일 패턴(insert own / read own+admin) — bucket_id 만 교체하여 2개 정책 추가
```

> **검수 전 사진 열람**은 서버(Route Handler)에서 `service_role` 로 짧은 TTL `createSignedUrl(path, 3600)` 발급(R4 §3.2). `service_role` 키는 클라이언트 노출 금지. 토큰 만료가 CDN 캐시를 비우지 않으므로 **접근 차단은 객체 삭제로**(R4 §3.3).

---

## 7. RLS 정책 (deny-by-default)

### 7.1 전역 게이트

```sql
-- public 스키마 전 테이블 RLS ON. 정책 없는 테이블 = service_role 외 전면 거부.
-- Source/Publish 평면(§2)은 RLS ON + 정책 0개 → ETL service_role 전용.
alter table ingest_runs           enable row level security;
alter table source_records        enable row level security;
alter table dataset_versions      enable row level security;
alter table source_code_mappings  enable row level security;  -- 라벨은 공개 read 1개만 추가(아래)
-- POI/accessibility/routes/docent: published 공개 read
alter table pois                  enable row level security;
alter table poi_translations      enable row level security;
alter table poi_media             enable row level security;
alter table poi_entrances         enable row level security;
alter table accessibility_facts   enable row level security;
alter table poi_certifications    enable row level security;
alter table nearby_facilities     enable row level security;
alter table context_snapshots     enable row level security;
alter table route_guides              enable row level security;
alter table route_steps               enable row level security;
alter table route_hazards             enable row level security;
alter table itinerary_templates       enable row level security;
alter table offline_bundle_manifests  enable row level security;
alter table docent_stories            enable row level security;
alter table docent_assets             enable row level security;
alter table accessibility_evidence    enable row level security;
-- UGC/admin
alter table admin_roles           enable row level security;
alter table barrier_reports       enable row level security;
alter table report_evidence       enable row level security;
alter table moderation_events     enable row level security;
alter table reviews               enable row level security;
alter table gpx_submissions       enable row level security;
alter table audit_events          enable row level security;
```

### 7.2 공개 read-model (published 만)

```sql
-- pois: published 만 anon/authenticated read. 쓰기 정책 없음 → service_role(ETL) 전용
create policy "pois public read published"
on pois for select to anon, authenticated
using (is_published = true);

-- pois 의 자식 테이블: 부모가 published 일 때만 read (EXISTS 서브쿼리)
create policy "poi_translations read when poi published"
on poi_translations for select to anon, authenticated
using (exists (select 1 from pois p where p.id = poi_id and p.is_published));
-- ↑ 동일 패턴을 poi_media / poi_entrances / accessibility_facts / poi_certifications 에 적용(poi_id FK 기준)

-- nearby_facilities: 전부 공개 read(좌표·전화는 공공정보)
create policy "nearby public read" on nearby_facilities for select to anon, authenticated using (true);

-- context_snapshots: 활성 스냅샷만 공개 read(만료본 숨김)
create policy "context public read active"
on context_snapshots for select to anon, authenticated
using (effective_to > now());

-- route_guides / docent_stories / itinerary_templates / offline_bundle_manifests: is_published 게이트
create policy "route_guides public read" on route_guides for select to anon, authenticated using (is_published = true);
create policy "docent_stories public read" on docent_stories for select to anon, authenticated using (is_published = true);
create policy "itinerary public read" on itinerary_templates for select to anon, authenticated using (is_published = true);
-- offline_bundle_manifests: RLS policy is defined inline at §4.5 (is_active + published_at guard)

-- route_steps/route_hazards/docent_assets: 부모 published 기준(EXISTS), 위 패턴 동일

-- source_code_mappings: 라벨은 공개 read(코드→한글 표시용). 쓰기는 service_role
create policy "code_mappings public read" on source_code_mappings for select to anon, authenticated using (true);
```

### 7.3 UGC — barrier_reports (self insert/read · approved public · admin)

```sql
-- 1) 익명(게스트) 작성 금지 — RESTRICTIVE 로 항상 강제(permissive OR 누수 차단; R4 §2.2)
create policy "reports: permanent users only insert"
on barrier_reports as restrictive for insert to authenticated
with check ((select (auth.jwt()->>'is_anonymous')::boolean) is false);
-- ↑ SPEC §2.11: anon 은 식별용 sign-in 만. 제보 작성은 영구 사용자.
--   (게스트 제보를 허용하려면 이 RESTRICTIVE 를 제거하고 reporter_id=auth.uid() 만 강제 — 정책 결정은 F3 문서 소관)

-- 2) 본인 insert(소유 강제)
create policy "reports: owner inserts own"
on barrier_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

-- 3) 공개 read: 승인된 것만
create policy "reports: public reads approved"
on barrier_reports for select to anon, authenticated
using (status = 'approved');

-- 4) 본인 read: 자기 제보 전부(상태 무관)
create policy "reports: owner reads own"
on barrier_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

-- 5) admin read 전체 + status 변경
create policy "reports: admin reads all"
on barrier_reports for select to authenticated
using ((select is_platform_admin()));

create policy "reports: admin updates"
on barrier_reports for update to authenticated
using ((select has_admin_role('moderator')))
with check ((select has_admin_role('moderator')));
```

### 7.4 report_evidence · moderation_events · reviews · gpx · admin_roles · audit

```sql
-- report_evidence: 본인 insert(소유 폴더), 본인+admin read, 수정/삭제 없음
create policy "evidence: owner inserts" on report_evidence for insert to authenticated
  with check ((select auth.uid()) = reporter_id);
create policy "evidence: owner or admin reads" on report_evidence for select to authenticated
  using ((select auth.uid()) = reporter_id or (select is_platform_admin()));

-- moderation_events: admin read only. INSERT/UPDATE/DELETE 직접 금지 → SECURITY DEFINER 트리거로만 기록
create policy "moderation: admin reads" on moderation_events for select to authenticated
  using ((select is_platform_admin()));
-- (INSERT 정책 없음 → 직접 삽입 거부; 상태 전이 함수가 definer 권한으로 기록)

-- reviews: 영구 사용자만 작성(RESTRICTIVE), 본인 insert, 승인 공개 read, 본인 read, admin 검수
create policy "reviews: permanent only" on reviews as restrictive for insert to authenticated
  with check ((select (auth.jwt()->>'is_anonymous')::boolean) is false);
create policy "reviews: owner inserts" on reviews for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "reviews: public reads approved" on reviews for select to anon, authenticated
  using (status = 'approved');
create policy "reviews: owner reads own" on reviews for select to authenticated
  using ((select auth.uid()) = author_id);
create policy "reviews: admin updates" on reviews for update to authenticated
  using ((select has_admin_role('moderator'))) with check ((select has_admin_role('moderator')));

-- gpx_submissions: 본인 insert/read, 승인본 공개 read, admin 검수
create policy "gpx: owner inserts" on gpx_submissions for insert to authenticated
  with check ((select auth.uid()) = author_id);
create policy "gpx: owner reads own" on gpx_submissions for select to authenticated
  using ((select auth.uid()) = author_id);
create policy "gpx: public reads approved" on gpx_submissions for select to anon, authenticated
  using (moderation_status = 'approved');
create policy "gpx: admin updates" on gpx_submissions for update to authenticated
  using ((select has_admin_role('moderator'))) with check ((select has_admin_role('moderator')));

-- admin_roles: superadmin 만 read/write(이메일 하드코딩 금지 — 테이블 관리; R4 §2.2)
create policy "admin_roles: superadmin reads" on admin_roles for select to authenticated
  using ((select has_admin_role('superadmin')));
create policy "admin_roles: superadmin writes" on admin_roles for all to authenticated
  using ((select has_admin_role('superadmin'))) with check ((select has_admin_role('superadmin')));

-- audit_events: admin read only. 직접 INSERT/UPDATE/DELETE 차단 → definer 함수로만 append
create policy "audit: admin reads" on audit_events for select to authenticated
  using ((select is_platform_admin()));
```

> **anon sign-in 전수 리뷰(R4 §4.1):** anonymous user 도 `authenticated` 역할이라 permissive 정책은 OR 로 새므로, 영구사용자 전용 동작은 반드시 `is_anonymous` + **RESTRICTIVE** 로 막는다. 정책 컬럼(`reporter_id`/`author_id`/`status`/`moderation_status`)은 전부 인덱스 보유(7.x 인덱스 참조) — RLS 성능 1순위 함정 회피.

### 7.5 상태 전이 함수 (SECURITY DEFINER — 검수 + append-only)

```sql
-- 제보 상태 전이: moderation_events + audit_events 를 definer 권한으로 append하고 status 갱신.
-- approved 전이 시에만 Realtime broadcast 트리거가 발화(아래 8절).
create or replace function moderate_report(report_id uuid, to_status report_status, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare from_st report_status;
begin
  if not public.has_admin_role('moderator') then
    raise exception 'not authorized';
  end if;
  select status into from_st from public.barrier_reports where id = report_id for update;
  update public.barrier_reports set status = to_status, updated_at = now() where id = report_id;
  insert into public.moderation_events (report_id, moderator_id, from_status, to_status, reason)
    values (report_id, (select auth.uid()), from_st, to_status, reason);
  insert into public.audit_events (actor_id, action, entity, entity_id, meta)
    values ((select auth.uid()), 'report.moderate', 'barrier_reports', report_id::text,
            jsonb_build_object('from', from_st, 'to', to_status));
end; $$;
```

---

## 8. Realtime — 승인 알림만 방송 (raw 제보 비노출)

> SPEC §2.9/§5: FCM/APNs 없음. 승인된 alert state 만 방송, raw 제보 금지. R4 §8: Broadcast from Database(권장) — `status='approved'` 전이 시에만 지역 토픽으로.

```sql
create or replace function report_approved_broadcast()
returns trigger security definer language plpgsql set search_path = '' as $$
begin
  if (TG_OP = 'UPDATE' and NEW.status = 'approved' and OLD.status <> 'approved') then
    perform realtime.broadcast_changes(
      'signgu:' || coalesce(NEW.ldong_signgu_cd, 'unknown'),  -- 지역별 토픽(노이즈·비용↓)
      'approved', 'approved', TG_TABLE_NAME, TG_TABLE_SCHEMA,
      -- 페이로드는 승인 alert 메타만(원문 detail/reporter 제외)
      jsonb_build_object('id', NEW.id, 'poi_id', NEW.poi_id, 'category', NEW.category, 'signgu', NEW.ldong_signgu_cd),
      null
    );
  end if;
  return null;
end; $$;

create trigger on_report_approved
after update on barrier_reports
for each row execute function report_approved_broadcast();

-- 구독 인가: 인증 사용자 broadcast 수신 허용(realtime.messages RLS)
create policy "authenticated can receive broadcasts"
on realtime.messages for select to authenticated using (true);
```

---

## 9. F5 Materialized Views + 갱신 전략

> SPEC §5/§F5: PT-reproducible 집계. **방문자≠관광객 caveat 필수**(DataLab). 4개 뷰 + 스냅샷.

### 9.1 `poi_completeness_mv` — detailWithTour2 입력 완성도

```sql
-- POI별 capability 입력률 + 미입력(operator_missing) 카운트 → F5 갭 리포트 코어
create materialized view poi_completeness_mv as
select
  p.id as poi_id,
  p.slug,
  p.ldong_signgu_cd,
  count(*) filter (where af.source = 'kto_with')                              as kto_fields_total,
  count(*) filter (where af.source = 'kto_with' and af.status <> 'unknown')   as kto_fields_filled,
  count(*) filter (where af.status = 'unknown' and af.absence_kind = 'operator_missing') as missing_operator,
  count(*) filter (where af.status = 'unknown' and af.absence_kind = 'intrinsic')        as intrinsic_limits,
  round(
    100.0 * count(*) filter (where af.source = 'kto_with' and af.status <> 'unknown')
    / nullif(count(*) filter (where af.source = 'kto_with'), 0), 1
  ) as completeness_pct
from pois p
left join accessibility_facts af on af.poi_id = p.id
where p.is_published
group by p.id, p.slug, p.ldong_signgu_cd;
create unique index idx_completeness_poi on poi_completeness_mv (poi_id);
```

### 9.2 `report_trends_mv` — 시군구별 제보 빈도 (히트맵)

```sql
-- 승인된 제보의 시군구 × 분류 × 주차 집계 → F5 개선 후보지 히트맵
create materialized view report_trends_mv as
select
  br.ldong_signgu_cd,
  br.category,
  date_trunc('week', br.created_at) as week,
  count(*) filter (where br.status = 'approved') as approved_count,
  count(*)                                       as total_count
from barrier_reports br
where br.ldong_signgu_cd is not null
group by br.ldong_signgu_cd, br.category, date_trunc('week', br.created_at);
create index idx_report_trends_signgu on report_trends_mv (ldong_signgu_cd, week);
```

### 9.3 `gap_metric_snapshots` · `rto_dashboard_snapshots` — PT 재현 스냅샷 (테이블)

> 시연일 동일 출력을 위해 뷰 결과를 **물리 스냅샷**으로 고정(시연 seed 와 prod 분리; SPEC §9). 방문자 추세는 DataLab 스냅샷에 caveat 동봉.

```sql
create table gap_metric_snapshots (
  id            uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  ldong_signgu_cd text not null,
  poi_id        uuid references pois(id),
  missing_operator integer not null,
  intrinsic_limits integer not null,
  completeness_pct numeric(4,1),
  created_at    timestamptz not null default now(),
  unique (snapshot_date, poi_id)
);

create table rto_dashboard_snapshots (
  id            uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  ldong_signgu_cd text not null,
  visitor_payload jsonb not null,               -- DataLab touDivCd(현지인/외지인/외국인)·touNum 집계
  caveat        text not null default '방문자는 관광객과 동일하게 정의되지 않음', -- 화면 필수 표기
  source        fact_source not null default 'kto_kor',
  created_at    timestamptz not null default now(),
  unique (snapshot_date, ldong_signgu_cd)
);
alter table gap_metric_snapshots enable row level security;
alter table rto_dashboard_snapshots enable row level security;
-- RTO 대시보드는 rto_viewer/superadmin + (선택) 공개 집계 read. 기본은 admin read.
create policy "gap snapshots admin/rto read" on gap_metric_snapshots for select to authenticated
  using ((select has_admin_role('rto_viewer')));
create policy "rto snapshots admin/rto read" on rto_dashboard_snapshots for select to authenticated
  using ((select has_admin_role('rto_viewer')));
```

### 9.4 갱신 전략

| 객체 | 갱신 트리거 | 방식 | 비고 |
|---|---|---|---|
| `poi_completeness_mv` | ETL publish 후 | `refresh materialized view concurrently poi_completeness_mv` | unique index 필수(concurrently 조건) |
| `report_trends_mv` | 제보 승인 후 N분 배치 (Vercel Cron) | `refresh ... concurrently report_trends_mv` | 실시간 불필요 |
| `gap_metric_snapshots` | 일배치(GH Actions) + 시연 전 수동 | mv → insert (snapshot) | 시연 seed 고정 |
| `rto_dashboard_snapshots` | DataLab 일배치(~4일 지연) | DataLab fetch → 집계 → insert | caveat 컬럼 동봉 |

> `refresh ... concurrently` 는 unique index 보유 mv 에서만 동작하며 읽기 잠금을 막는다(서빙 중 갱신 안전). publish 트랜잭션 커밋 후 별도 호출(트랜잭션 내 refresh 금지).

---

## 10. 마이그레이션 파일 순서 (`supabase/migrations`)

| 순서 | 파일 | 내용 |
|---|---|---|
| 00 | `00_extensions.sql` | postgis, pgcrypto |
| 01 | `01_enums.sql` | §1.2 전 enum |
| 02 | `02_source_plane.sql` | ingest_runs, source_records, dataset_versions (+ staging tables), source_code_mappings, publish_dataset() |
| 03 | `03_poi_plane.sql` | pois ~ context_snapshots + GiST 인덱스 |
| 04 | `04_route_docent.sql` | route_guides ~ docent_assets, offline_bundle_manifests |
| 05 | `05_ugc_admin.sql` | admin_roles ~ audit_events + helper 함수 |
| 06 | `06_storage_buckets.sql` | 버킷 + storage RLS |
| 07 | `07_rls_policies.sql` | §7 전 정책 |
| 08 | `08_realtime.sql` | broadcast 트리거 + realtime.messages 정책 |
| 09 | `09_views_snapshots.sql` | mv 4종 + 스냅샷 테이블 + refresh 함수 |
| seed | `supabase/seed/*.sql` | 6 POI + 코드 매핑 부트스트랩 + 버킷 + 데모 admin |

---

## 11. 수용 기준 (Acceptance Criteria — DB Contract v1)

1. **raw/published 분리:** `source_records` 는 anon/authenticated 쿼리 시 0 row(RLS 전면 거부). 정규화 테이블만 published row 노출. ETL 실패 시뮬레이션 → 마지막 published 스냅샷 계속 서빙(`dataset_versions.row_status='active'` 행 불변 확인). 의도적 mid-batch POI 실패 → 롤백 후 이전 `active` 버전 유지(M-14 계약).
2. **capability 경계:** `accessibility_facts` 외 어떤 테이블에도 `wheelchair`/`braileblock` 등 KTO 필드명 컬럼이 없다. `select column_name from information_schema.columns` 로 검증.
3. **unknown 분리:** 빈 detailWithTour2 필드 → `status='unknown'` + `absence_kind='operator_missing'` row, F5 갭에 카운트. 본질 제약은 `intrinsic`. NEVER `unsupported` 로 추론.
4. **RLS deny-by-default:** 정책 미부여 테이블에 anon SELECT → 0 row. anon sign-in 사용자 제보 INSERT → RESTRICTIVE 로 거부.
5. **소유/검수:** reporter 본인은 pending 제보 read 가능, 타인 pending 은 0 row. admin 만 전체 read·`moderate_report()` 호출 가능. 비-admin 호출 → exception.
6. **approved-only Realtime:** `moderate_report(..., 'approved', ...)` 시에만 `signgu:{code}` 토픽 broadcast 1건, 페이로드에 reporter/detail 원문 미포함. rejected/pending 전이 → broadcast 0건.
7. **Storage 분리:** `ugc-evidence`(private) 객체는 비소유·비admin signed-URL 없이는 403. `poi-public` 는 anon URL read 200.
8. **공간 질의:** `ST_DWithin(nearby.location, poi.geom, 500)` GiST 인덱스 사용(EXPLAIN 확인). 좌표 lng-first 저장 검증(공산성 ≈ lng 127.12 / lat 36.46).
9. **코드 부트스트랩:** `source_code_mappings` 에 lDong 44/150/760 라벨이 `ldongCode2` 응답에서 적재(하드코딩 grep 0건). TatsCnctr 공주 signguCd 는 빌드 probe 후 채움(TBD 마커 해소).
10. **F5 재현성:** 동일 `snapshot_date` seed 로 `gap_metric_snapshots`/`rto_dashboard_snapshots` 재생성 시 동일 결과. RTO 스냅샷에 caveat 문자열 존재.
11. **Evidence pack gate (B-3):** 공산성·부소산성 capability publish에서, `accessibility_evidence.second_approved_at IS NOT NULL` 없는 row를 "현장 검증" 라벨로 서빙하면 CI 실패. `accessibility_evidence` 는 anon SELECT → 0 row(RLS 전면 거부).
12. **Bundle manifest license check (M-19):** `offline_bundle_manifests.assets` 의 모든 `license_code='Type3'` 항목은 `transform_policy='no_modification'` 이며 `fallback_text` 가 비어있지 않다. CI 스크립트가 `assets` jsonb를 순회해 검증.
13. **Publish atomicity (M-14):** `dataset_versions` 에 동시에 `row_status='active'` 인 같은 `dataset` 행이 2개 이상 존재하면 CI 실패(unique partial index로 강제 가능). `failed` / `stale` 행은 보존되고 `active` 행을 덮어쓰지 않는다.

---

## 12. 미해결/검증 항목 (verify-at-build-time)

- **detailWithTour2 정확한 필드 키:** §3.5.2 매핑은 가이드 v4.3 기준. 빌드 단계 live probe + 매뉴얼 대조로 `source_field` 확정 후 capability catalog 동결(SPEC §11).
- **TatsCnctr 공주 signguCd:** §2.4 부트스트랩 3행 TBD. `관광지_시군구_코드_정보_v1.0.xlsx` 파싱으로 확정(부여 34800 확정).
- **Odii 6 POI 커버리지:** `docent_stories` trigger_point 시드 전 `themeSearchList` probe 로 6 POI 스토리 존재 확인(없으면 map-tap fallback + 자체 스토리).
- **capability catalog 위치:** 도메인 상수 파일(`packages/domain/accessibility`)과 본 §3.5.2 표의 단일 진실원천 동기화 — 불일치 시 도메인 파일 우선, 본 문서 갱신.
- **IndexedDB 다이어리 스키마:** F4 로컬 우선 store 정의는 본 문서 범위 밖(R5 §5.2 / 클라이언트 문서 소관). 서버 영속이 필요해지는 발전 항목만 추후 마이그레이션 추가.
- **evidence bucket 정책:** `accessibility_evidence.photo_storage_path` 가 참조하는 버킷(§6)은 private(`ugc-evidence` 또는 별도 `field-evidence` 버킷). admin 외 접근 차단 확인 필요. 현재 §6에 `field-evidence` 전용 버킷이 정의되어 있지 않음 → 마이그레이션 추가 필요.
- **`publish_dataset()` 데이터셋 브랜치 완성:** 현 함수는 `accessibility` 브랜치만 구현. `pois` / `route_guides` / `docent` 브랜치는 구현 시점에 동일 패턴으로 추가.
- **`dataset_versions` unique active 강제:** `where row_status='active'` partial unique index 추가로 동시 active 2행 방지 → 마이그레이션에서 확정.
- **bundle manifest 생성 자동화:** `offline_bundle_manifests` 는 ETL publish 후 자동 생성(asset hash 계산 포함). 수동 생성 금지.
