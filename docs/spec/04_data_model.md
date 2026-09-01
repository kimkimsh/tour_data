# 04 — 데이터 모델 (테이블 3개 · 그중 스냅샷 1개에 6행 + 콘텐츠 파일)

> **테이블 개수를 먼저 못 박는다.** 이 스펙이 만드는 테이블은 **3개**다 — `data_snapshots` · `admin_users` · `barrier_reports`.
> 이 문서가 "테이블 2개"라고 말할 때는 **사용자가 쓰기하는 테이블 2개**(`admin_users` · `barrier_reports`)를 뜻하고, `data_snapshots`는 수집 스크립트만 쓰는 읽기 전용 테이블이라 따로 센다.
> 앞 판은 이 구분 없이 "테이블 2개"라고만 써서 실제 개수와 어긋났다.

> **이 문서는 2026-09-01에 크게 바뀌었다.** 원래는 관광지 데이터를 테이블 18개로 정규화했는데, 데이터가 **250행 미만**이라 스키마 설계·RLS·마이그레이션·뷰의 비용이 이득보다 컸다.
> 지금은 **관광지 데이터를 통째로 `jsonb` 스냅샷 6개**에 넣고, DB 테이블은 **사용자가 쓰는 것 2개**만 둔다.
> 바꾼 이유와 대안 비교는 §7.

---

## 1. 전체 그림

```
┌─ 확인된 사실 (읽기 전용, 하루 1회 갱신) ─────────────────────┐
│                                                               │
│  한국관광공사 API ──┐                                         │
│  content/*.json ────┼──▶ scripts/ingest.ts ──▶ data_snapshots │
│                     │                          (jsonb 6행)    │
│                     └──▶ content/generated/*.json (git 이력)  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                              │ 서버 컴포넌트가 읽어서 페이지에 실어 보냄
                              ▼
┌─ 브라우저 ────────────────────────────────────────────────────┐
│  calculateSuitability()  ← 순수 함수. 페르소나는 localStorage  │
└───────────────────────────────────────────────────────────────┘

┌─ 방문자가 말한 것 (쓰기, 즉시 공개) ──────────────────────────┐
│                                                               │
│  barrier_reports  ── 댓글처럼 바로 보인다. 검수 대기 없음      │
│  admin_users      ── 부적절한 것 숨기기 + 사실 반영 판단       │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**핵심 분리:** `data_snapshots`는 **우리가 출처를 대고 확인한 사실**이고, `barrier_reports`는 **방문자가 한 말**이다.

**둘을 섞지 않는다.** 저장 위치가 다르고, 화면에서 시각적으로 분리하고, **적합도 점수에 제보가 들어가지 않는다.**

방문자 제보가 사실로 반영되는 경로는 하나뿐이다 — **사람이 판단해서 `content/curated-facts.json`에 넣고 커밋한다.** 그러면 다음 수집 때 스냅샷에 들어간다. `git log`가 그 판단의 기록이 된다.

---

## 2. 원칙

| # | 원칙 | 어떻게 강제하나 |
|---|---|---|
| 1 | **도메인은 한국관광공사 필드명을 모른다** | 무장애 24항목이 `capabilityCode`로 정규화돼 스냅샷에 들어간다. 원래 필드명은 `sourceField` 값으로만 존재 |
| 2 | **없음 ≠ 불가, 그리고 빈칸 ≠ 미입력** | `status`에 `unknown`이 있다. `absenceKind`는 **원인을 확인한 것만** 적고 기본값은 `null`이다 — 빈 응답에서 "담당자 미입력"을 추론하지 않는다 ([`05_ingest.md`](./05_ingest.md) §4.2) |
| 3 | **모든 사실은 출처를 갖는다** | 모든 항목에 `source`·`sourceField`·`verifiedAt` 필수. Zod가 강제 |
| 4 | **확인된 사실과 방문자 발언을 섞지 않는다** | 저장 위치가 다르고, 화면에서 분리하고, 점수에 안 들어간다 |
| 5 | **읽을 때 검증한다** | 스냅샷을 읽을 때마다 Zod로 파싱한다. 형태가 깨지면 즉시 드러난다 |
| 6 | **기본 차단(RLS)** | 테이블 **3개 전부** RLS 활성화. 정책 없으면 아무도 못 읽는다 |

**좌표:** 전부 WGS84 십진 도. 한국관광공사 `mapx`=경도(lng), `mapy`=위도(lat). JSON에는 `{ lat, lng }` **이름 있는 객체**로 저장한다 — 배열을 쓰면 순서를 뒤집는 실수가 난다.

---

## 3. 스냅샷

### 3.1 DDL — 이게 전부다

```sql
-- 확인된 사실 전부가 여기 6행으로 들어간다.
-- payload 의 형태는 SQL 이 아니라 src/domain/snapshot-schema.ts (Zod) 가 정의한다.
create table data_snapshots (
  key         text primary key,      -- §3.2 의 6가지
  payload     jsonb not null,
  row_count   integer not null,      -- 눈으로 확인용. 갑자기 0이면 수집이 깨진 것
  source_note text,                  -- '한국관광공사 detailWithTour2 + content/curated-facts.json'
  updated_at  timestamptz not null default now()
);

alter table data_snapshots enable row level security;
create policy "snapshots public read" on data_snapshots
  for select to anon, authenticated using (true);
-- 쓰기 정책 없음 → service_role(수집 스크립트)만 쓴다
```

### 3.2 스냅샷 6종

| `key` | 내용 | 갱신 주기 | 대략 크기 |
|---|---|---|---|
| `pois` | 6곳 기본 정보 + 다국어 제목·개요 + 사진 + 인증 + 인근 시설 | 1일 | ~60KB |
| `accessibility` | 관광지별 항목 32개의 상태·원문·출처·확인일 | 1일 | ~50KB |
| `routes` | 경로 안내 (A등급 2곳) | 콘텐츠 수정 시 | ~15KB |
| `docent` | 도슨트 이야기 (제목·대본·오디오 URL) | 1일 | ~40KB |
| `context` | 예측 혼잡도 · 방문자 추이 | 1일 | ~10KB |
| `related` | 연관 관광지 (접근성 미검증) | 1개월 | ~10KB |

전부 합쳐 **200KB 미만**, gzip 후 40KB 수준. 페이지에 통째로 실어 보내도 된다.

> **왜 6개로 나눴나:** 갱신 사유가 다르다. `routes`는 콘텐츠 파일을 고칠 때만, `related`는 한 달에 한 번, 나머지는 하루 한 번이다. 하나로 합치면 한 곳을 고칠 때마다 전체를 다시 쓰게 되고 `git diff`가 매일 전면 변경으로 보인다.

### 3.3 payload 스키마 (`src/domain/snapshot-schema.ts`)

**여기가 데이터 모델의 진짜 정의다.** SQL DDL 대신 Zod 스키마가 그 역할을 한다.

```ts
import { z } from 'zod';

export const LatLng = z.object({ lat: z.number(), lng: z.number() });

// ── key: 'pois' ────────────────────────────────────────────
export const PoiSchema = z.object({
  slug: z.string(),                        // 'gongsanseong'
  ktoContentId: z.string(),
  contentTypeId: z.number(),               // 12 | 14
  depthTier: z.enum(['A', 'B']),
  coord: LatLng,
  lDongRegnCd: z.string(),                 // 2자리. 값은 content/pois.json 에만 있다
  lDongSignguCd: z.string(),               // 3자리. 값은 content/pois.json 에만 있다
  signguCd5: z.string(),                   // 5자리. 값은 content/pois.json 에만 있다
  lclsSystm3: z.string().nullable(),
  heritageLabel: z.string().nullable(),    // '사적 「공주 공산성」' — P0-7 확인 후. 불확실하면 null
  ktoModifiedAt: z.string().nullable(),    // KTO modifiedtime → 신선도 기준 (점수 아님, 06 §6.1)

  i18n: z.record(
    z.enum(['ko', 'en', 'ja', 'zh-CN']),
    z.object({
      title: z.string(),
      overview: z.string().nullable(),
      addr: z.string().nullable(),
      tel: z.string().nullable(),
      homepage: z.string().nullable(),
    }),
  ),

  media: z.array(z.object({
    url: z.string(),
    kind: z.enum(['photo', 'thumbnail', 'gallery']),
    alt: z.string(),                       // KTO imgname / galTitle. 비면 '' 이 아니라 관광지명+순번
                                           // ★ 스크린리더 사용자가 1급 대상인 서비스에서
                                           //   KTO 가 주는 유일한 이미지 설명 필드다 (03 §2.2)
    licenseCode: z.string().nullable(),    // 'Type1' | 'Type3' | 'kogl1'
    attribution: z.string(),               // 화면에 그대로 출력할 완성된 문구
    noTransform: z.boolean(),              // Type3 → true. 최적화·리사이즈 금지
    caption: z.string().nullable(),
    sourceField: z.string(),
  })),

  certifications: z.array(z.object({
    grade: z.enum(['bf_preliminary', 'bf_general', 'bf_excellent', 'open_tourism']),
    validUntil: z.string().nullable(),
    sourceNote: z.string(),
    checkedAt: z.string(),
  })),

  facilities: z.array(z.object({
    kind: z.enum(['restroom', 'aed', 'hospital', 'call_taxi', 'parking', 'rest_area']),
    name: z.string(),
    coord: LatLng.nullable(),
    distanceM: z.number().nullable(),
    phone: z.string().nullable(),
    detail: z.string().nullable(),
    sourceNote: z.string(),
    checkedAt: z.string(),
  })),

  // detailWithTour2 의 *etc 4개. 항목이 아니라 보조 설명으로만 쓴다
  etcNotes: z.array(z.object({ sourceField: z.string(), text: z.string() })),
});
export const PoisPayload = z.array(PoiSchema);

// ── key: 'accessibility' ───────────────────────────────────
export const FactSchema = z.object({
  poiSlug: z.string(),
  capabilityCode: z.string(),              // src/domain/capabilities.ts 의 32개 중 하나
  status: z.enum(['supported', 'partial', 'unsupported', 'unknown']),
  absenceKind: z.enum(['intrinsic', 'operator_missing', 'not_applicable',
                       'not_registered']).nullable(),
                                           // ★ null 이 기본값이다 — '왜 비었는지 모른다'.
                                           //   intrinsic·operator_missing 은 curated-facts.json 에
                                           //   출처와 함께 명시된 것만 (05 §4.2)
  detail: z.string().nullable(),           // 한국관광공사 원문 그대로. 화면에 이 문장을 보여준다
  source: z.enum(['kto_with', 'curated', 'derived_route', 'derived_facility', 'tats', 'kma']),
  sourceField: z.string().nullable(),      // 'wheelchair' | 'braileblock' … 원래 필드명
  verifiedAt: z.string().nullable(),       // 신선도 입력 → evidenceConfidence (점수 아님)
  isKtoScored: z.boolean(),                // 갭 리포트 분모에 들어가는가.
                                           // not_applicable 은 분모에서 빠지므로 24가 아닐 수 있다 (06 §3)
});
export const AccessibilityPayload = z.array(FactSchema);

// ── key: 'routes' ──────────────────────────────────────────
export const RouteSchema = z.object({
  poiSlug: z.string(),
  title: z.string(),                       // '서문(금서루) 진입 경로'
  entranceName: z.string().nullable(),
  personaFlags: z.array(z.enum(['P1a','P1b','P2a','P2b','P3'])),
  totalDistanceM: z.number().nullable(),
  totalMinutes: z.number().nullable(),
  evidenceLevel: z.enum(['desk', 'photo', 'field']),
  evidenceNote: z.string().min(1),         // 비어 있으면 검증 실패
  checkedAt: z.string(),
  steps: z.array(z.object({
    seq: z.number(),
    action: z.enum(['enter','move','rest','turn','caution','restroom','view','exit']),
    title: z.string(),
    easyText: z.string(),                  // 쉬운 글. 한 단계 한 동작
    detail: z.string().nullable(),
    distanceM: z.number().nullable(),
    surface: z.string().nullable(),        // '포장' | '흙길' | '자갈'
    slopeNote: z.string().nullable(),      // ★ 숫자 금지. '평탄' | '완만한 오르막'
    hazard: z.string().nullable(),
    photoUrl: z.string().nullable(),
    coord: LatLng.nullable(),
  })),
});
export const RoutesPayload = z.array(RouteSchema);

// ── key: 'docent' ──────────────────────────────────────────
export const DocentSchema = z.object({
  poiSlug: z.string(),
  locale: z.enum(['ko', 'en']),
  seq: z.number(),
  title: z.string(),
  script: z.string().nullable(),           // 대본 전문 → 자막
  easyScript: z.string().nullable(),       // 쉬운 글. A등급 2곳만
  audioUrl: z.string().nullable(),         // Odii MP3 직링크
  imageUrl: z.string().nullable(),
  playTimeS: z.number().nullable(),
  odiiTid: z.string().nullable(),
  odiiStid: z.string().nullable(),
});
export const DocentPayload = z.array(DocentSchema);

// ── key: 'context' ─────────────────────────────────────────
export const ContextPayload = z.object({
  crowd: z.array(z.object({
    poiSlug: z.string(),
    baseYmd: z.string(),
    rate: z.number(),                      // 단위·상한이 매뉴얼에 없다 (03 §2.4).
                                           // 범위를 스키마로 강제하지 않고 원값을 그대로 담는다.
                                           // 0~100 밖이면 crowd_forecast 를 unknown 으로 (05 §5.7)
    isPredicted: z.literal(true),          // ★ 항상 true. 예측치다 (03 §2.4)
  })),
  visitors: z.array(z.object({
    signguCd5: z.string(),                 // 5자리. 값은 content/pois.json 에만 있다
    signguNm: z.string(),
    touDivCd: z.enum(['1', '2', '3']),     // 1 현지인 / 2 외지인 / 3 외국인 (03 §2.5)
    touDivNm: z.string(),                  // 화면에 구분을 함께 쓴다
    windowStart: z.string(),               // YYYYMMDD
    windowEnd: z.string(),
    days: z.number(),                      // 실제 집계 일수
    dailyAverage: z.number(),              // 소수. touNum 이 모형 추정치라 정수로 만들지 않는다
    caveat: z.literal('방문자는 관광객과 동일하게 정의되지 않습니다 (출처: 한국관광 데이터랩)'),
  })),
  weather: z.array(z.object({
    signguCd5: z.string(),
    warning: z.string().nullable(),
  })).optional(),
  fetchedAt: z.string(),
});

// ── key: 'related' ─────────────────────────────────────────
export const RelatedPayload = z.array(z.object({
  poiSlug: z.string(),                     // 기준 관광지
  baseYm: z.string(),
  items: z.array(z.object({
    code: z.string(),                      // rlteTatsCd
    name: z.string(),                      // rlteTatsNm
    signguNm: z.string().nullable(),
    categoryLcls: z.string().nullable(),
    rank: z.number(),
  })),
}));
```

> **`(poiSlug, capabilityCode)` 조합은 `accessibility` payload 안에 정확히 한 번만 나온다.** 출처 우선순위는 **수집 시점에** 이미 적용돼 있다(§4.3) — 화면도 도메인도 고민할 게 없다.

### 3.4 읽는 쪽 (`src/lib/data.ts`)

```ts
import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { PoisPayload, AccessibilityPayload /* … */ } from '@/domain/snapshot-schema';

async function readSnapshot<T>(key: string, schema: z.ZodType<T>): Promise<T> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('data_snapshots').select('payload').eq('key', key).single();
  if (error) throw new Error(`snapshot ${key} 읽기 실패: ${error.message}`);
  return schema.parse(data.payload);        // ★ 읽을 때마다 검증한다
}

export const getPois   = cache(() => readSnapshot('pois', PoisPayload));
export const getFacts  = cache(() => readSnapshot('accessibility', AccessibilityPayload));
export const getRoutes = cache(() => readSnapshot('routes', RoutesPayload));
// …
```

페이지는 `export const revalidate = 3600`. 수집이 끝나면 `/api/revalidate`가 캐시를 비우므로 **몇 초 안에 반영된다. 재배포하지 않는다.**

### 3.5 점수는 브라우저에서 계산한다

**서버 컴포넌트는 사실 데이터만 내려보내고, 적합도 계산은 브라우저가 한다.**

```
서버 컴포넌트            브라우저
──────────────           ────────────────────────────────
pois + facts   ─────────▶ localStorage 에서 페르소나 읽기
(모든 사용자에게 동일)     calculateSuitability() 실행
캐시 가능                  라벨·점수·근거 렌더
```

**왜 이렇게 하나:**
- 페르소나는 `localStorage`에 있는데 서버는 그걸 모른다. 서버에서 계산하면 **모든 방문자가 같은 캐시된 HTML을 받아 조건을 바꿔도 결과가 안 바뀐다.**
- `calculateSuitability`는 순수 함수라 브라우저에서 똑같이 돈다.
- 데이터가 250행이라 통째로 내려보내도 부담이 없다.
- 페이지 HTML은 누구에게나 같으므로 캐시가 그대로 유효하다.

---

## 4. 콘텐츠 파일 (`content/*.json`)

손으로 쓰는 데이터다. Git으로 관리되고, `pnpm validate:content`가 Zod로 검증하며, 수집 스크립트가 읽어 스냅샷에 넣는다.

**모든 항목에 `source`(출처)와 `checkedAt`(확인 날짜)이 필수다.** 이게 "미검증 데이터를 검증된 것처럼 내보내지 않는다"를 강제한다.

| 파일 | 내용 | 들어가는 곳 |
|---|---|---|
| `content/pois.json` | 6곳 기본 정보 + 한국관광공사 `contentId` | `pois` 스냅샷 |
| `content/facilities.json` | 인근 장애인 화장실·응급실·자동심장충격기·장애인콜택시 | `pois.facilities` |
| `content/certifications.json` | BF 인증 등급 / 열린관광지 지정 | `pois.certifications` |
| `content/curated-facts.json` | 한국관광공사가 비운 항목 중 공개 자료로 확인한 것 **+ 제보를 검토해 사실로 반영한 것** | `accessibility` |
| `content/routes/{slug}.json` | 경로 단계 | `routes` 스냅샷 |
| `content/docent-easy/{slug}.{locale}.md` | 쉬운 글 도슨트 (사람이 작성) | `docent.easyScript` |
| `content/itineraries.json` | 코스 템플릿 | **코드에서 직접 import** (갱신 안 되는 상수) |
| `content/safety-directory.json` | 119 · 1330 · 영사콜센터 · 시군 장애인콜택시 | **코드에서 직접 import** |

### 4.1 `content/pois.json`

```jsonc
[
  {
    "slug": "gongsanseong",
    "nameKo": "공산성",
    "ktoContentId": "126121",       // ← P0-1 탐침으로 확정. 임시값은 검증 스크립트가 막는다
    "contentTypeId": 12,
    "lDongRegnCd": "44",
    "lDongSignguCd": "150",
    "signguCd5": "44150",
    "lclsSystm3": "HS010200",
    "coord": { "lat": 36.4661, "lng": 127.1236 },
    "heritageLabel": null,           // ← P0-7 확인 후. 불확실하면 null 로 둔다
    "depthTier": "A",
    "odiiKeyword": "공산성",
    "tatsName": "공산성"
  }
  // … 6개
]
```

### 4.2 `content/curated-facts.json` — 제보가 사실이 되는 유일한 통로

```jsonc
[
  {
    "poiSlug": "gongju-national-museum",
    "capabilityCode": "elevator",
    "status": "supported",
    "detail": "전시실 간 엘리베이터 1대 운영",
    "source": "국립공주박물관 공식 홈페이지 관람안내 https://…",
    "checkedAt": "2026-09-02"
  },
  {
    // 방문자 제보를 검토해 반영한 경우 — 제보 ID 를 출처에 남긴다
    "poiSlug": "gongsanseong",
    "capabilityCode": "elevator",
    "status": "unsupported",
    "absenceKind": "intrinsic",
    "detail": "성곽 구조상 승강기 설치 불가. 서문 주변 평탄 구간만 이용 가능",
    "source": "방문자 제보 3건(#a1b2, #c3d4, #e5f6) 확인 후 공주시 관광안내 통화로 확인",
    "checkedAt": "2026-09-18"
  }
]
```

**출처나 확인 경로 없이 넣는 것을 금지한다** — 검증 스크립트가 막는다.
제보를 반영할 때는 **제보 ID를 출처에 적는다.** 그러면 `git log`가 "왜 이 값이 바뀌었나"의 완전한 기록이 된다.

### 4.3 출처 우선순위 — 수집 시점에 한 번만 적용

같은 `(관광지, 항목)`에 여러 출처가 있을 수 있다.

```
curated  >  derived_route / derived_facility / tats / kma  >  kto_with
```

**수집 스크립트가 여기서 하나를 골라 스냅샷에 넣는다.** 화면도 도메인 함수도 이 계산을 다시 하지 않는다 — 계산이 두 곳에 있으면 반드시 갈라진다.

> **방문자 제보는 이 목록에 없다.** 제보는 사실이 아니라 발언이므로 `accessibility` 스냅샷에 들어가지 않는다. 사람이 검토해 `curated-facts.json`에 옮겨 적어야만 사실이 된다.

### 4.4 경로 파일 작성 규칙

- **`slopeNote`에 숫자를 쓰지 않는다.** 실측을 안 했으므로 "평탄 / 완만한 오르막 / 가파른 구간 있음"만. `8.5%` 같은 값은 재지 않은 값을 측정값처럼 내보내는 것이다. 검증 스크립트가 막는다.
- **`easyText`는 한 단계에 한 동작**, 짧은 문장, 능동태.
- **`evidenceLevel`은 사실대로.** 현장에 안 갔으면 `desk`이고, 그때 `evidenceNote`가 비어 있으면 검증 실패다.

---

## 5. 사용자가 쓰기하는 테이블 2개 (전체 3개 중)

### 5.1 관리자

```sql
create table admin_users (
  user_id    uuid primary key,       -- auth.users(id)
  email      text not null,
  granted_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()));
$$;
```

> **환경변수로 관리자 이메일을 두지 않는다.** 이 테이블이 유일한 기준이다.

### 5.2 방문자 제보 — 댓글 모델

```sql
create type report_category as enum (
  'elevator_broken',   -- 엘리베이터 고장
  'ramp_blocked',      -- 경사로 막힘
  'restroom_closed',   -- 장애인 화장실 이용 불가
  'construction',      -- 공사 중
  'surface_damaged',   -- 노면 파손
  'temporary_closure', -- 임시 휴무·폐쇄
  'signage_missing',   -- 안내 표지 없음
  'other'
);

-- ★ 승인 대기 상태가 없다. 올리면 바로 보인다.
--   관리자는 부적절한 것을 '숨기는' 사후 조치만 한다.
create table barrier_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null,            -- auth.uid() (익명 인증)
  poi_slug     text not null,            -- pois 테이블이 없으므로 slug 문자열로 참조
  category     report_category not null,
  occurred_on  date,                     -- 사용자가 본 날짜
  detail       text check (char_length(detail) <= 500),

  -- 방문자 신고 (사후 조치의 입력)
  -- ★ 개수가 아니라 '신고가 들어왔는가' 하나다. 아래 §5.3의 이유 참조
  flagged_at    timestamptz,

  -- 사후 조치
  is_hidden     boolean not null default false,
  hidden_reason text,                    -- '욕설' | '허위' | '중복' | '개인정보 포함' …
  hidden_by     uuid,
  hidden_at     timestamptz,

  created_at   timestamptz not null default now(),

  -- ★ 중복 방지를 DB가 강제하기 위한 생성 열 (아래 §5.2 주 참조)
  created_day  date generated always as ((created_at at time zone 'UTC')::date) stored
);
create index on barrier_reports (poi_slug, created_at desc) where not is_hidden;
create index on barrier_reports (reporter_id);
-- 관리자 목록: 신고 들어온 것 먼저, 그다음 최신순
create index on barrier_reports ((flagged_at is not null) desc, created_at desc);
-- ★ 중복 방지: DB가 강제한다 (§5.2 아래 주)
create unique index on barrier_reports (reporter_id, poi_slug, category, created_day);
```

**사진 컬럼과 저장소 버킷이 없다.** 즉시 공개 모델에서는 초상권·개인정보 위험이 이득보다 크다 → [`01_scope.md`](./01_scope.md) §4.4 (4).

**중복 방지 — DB가 강제한다.**

앞 판은 *"인덱스가 아니라 서버 코드에서 검사한다"* 였다. **그건 보장이 아니다** — 같은 사용자의 요청 두 개가 동시에 도착하면 둘 다 `select`를 통과한 뒤 둘 다 `insert`한다. 그런데 완료 기준([`07_screens.md`](./07_screens.md) S7)은 "중복 제보가 거부된다"고 **단언**한다. 코드로만 검사하면 그 단언이 경합에서 깨진다.

```sql
-- created_day 는 생성 열이다. (created_at at time zone 'UTC')::date 는 IMMUTABLE 이므로
-- 인덱스에 쓸 수 있다 — 원래 막혔던 것은 now() 였고, 그건 조건절에 있었다.
create unique index on barrier_reports (reporter_id, poi_slug, category, created_day);
```

| | 앞 판 | 지금 |
|---|---|---|
| 창 | 정확히 24시간 | **UTC 기준 같은 날(달력일)** |
| 보장 | 서버 코드 — 경합에서 깨진다 | **DB 유니크 제약 — 깨지지 않는다** |
| 사용자에게 보이는 것 | — | 서버 코드가 **먼저** 확인해 친절한 문구를 준다. 경합으로 뚫려도 **DB가 두 번째를 거절**하고 같은 문구를 보여준다 |

**대가:** 창이 "24시간"에서 "같은 날"로 바뀐다. 23:50에 올린 사람이 00:10에 다시 올릴 수 있다. **경계를 정확히 24시간으로 만드는 유일한 방법은 애플리케이션 검사이고, 그건 보장이 아니다.** 정확하지 않은 창을 DB가 지키는 쪽을 고른다 — 화면 문구도 **"같은 날에는 같은 제보를 한 번만 올릴 수 있습니다"** 로 사실대로 쓴다.

### 5.3 RLS

```sql
alter table admin_users     enable row level security;
alter table barrier_reports enable row level security;

-- 관리자 명단: 본인 행만 읽는다. 쓰기 정책 없음 → service_role(수동 SQL)로만 추가
create policy "admin self read" on admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- 제보 쓰기: 익명 인증 사용자도 가능. 본인 것으로만
create policy "reports insert own" on barrier_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- 제보 읽기: 숨겨지지 않은 것은 누구나 (← 댓글 모델의 핵심)
create policy "reports public read visible" on barrier_reports for select to anon, authenticated
  using (not is_hidden);

-- 본인 것은 숨겨져도 본인은 본다 (왜 안 보이는지 알 수 있게)
create policy "reports owner reads own" on barrier_reports for select to authenticated
  using ((select auth.uid()) = reporter_id);

-- 관리자는 전부 읽고, 숨김 처리한다
create policy "reports admin reads all" on barrier_reports for select to authenticated
  using ((select is_admin()));
create policy "reports admin hides" on barrier_reports for update to authenticated
  using ((select is_admin())) with check ((select is_admin()));

-- 신고는 일반 사용자가 UPDATE 로 할 수 없다 (다른 컬럼까지 열리므로).
-- security definer RPC 하나만 둔다.
--
-- ★ 카운터가 아니라 '처음 신고된 시각' 하나다. 이게 남용을 구조로 막는다.
--   앞 판은 report_count = report_count + 1 이었고, anon 이 아무 report id 로
--   무한히 호출할 수 있었다 — 한 사람이 신고 수를 부풀려 관리자가 읽는 순서를
--   조작하고 정상 제보를 아래로 밀어낼 수 있었다.
--   coalesce 로 '이미 값이 있으면 그대로' 두면 두 번째 호출부터 아무 일도 하지 않는다.
create or replace function flag_report(target uuid)
returns void language sql security definer set search_path = '' as $$
  update public.barrier_reports
     set flagged_at = coalesce(flagged_at, now())
   where id = target and not is_hidden;
$$;
revoke all on function flag_report(uuid) from public;
grant execute on function flag_report(uuid) to anon, authenticated;

-- 이 함수가 돌려주는 것이 없다는 것도 의도다. 호출자는 그 제보가
-- 이미 신고된 상태였는지 알 수 없고, 알 필요도 없다.
```

> **`flagged_at`은 공개 읽기 정책으로 노출된다.** 누가 신고했는지는 저장하지 않으므로(시각 하나뿐) 신고자 식별 위험이 없다. 카운터를 두거나 신고자 목록을 두면 그 순간 노출 대상이 된다 — 두지 않는 이유가 하나 더 있다.
>
> 익명 인증 사용자도 Supabase에서는 `authenticated` 역할이다. 이번에는 "정회원만" 구분이 필요 없으므로 `RESTRICTIVE` 정책을 쓰지 않는다.
> RLS 정책이 참조하는 컬럼(`reporter_id`, `is_hidden`)에는 전부 인덱스를 걸었다.

---

## 6. 마이그레이션 (2개)

| 순서 | 파일 | 내용 |
|---|---|---|
| 001 | `001_snapshots.sql` | `data_snapshots` + RLS |
| 002 | `002_reports.sql` | `report_category` enum · `admin_users` · `is_admin()` · `barrier_reports` + 인덱스 + RLS |

PostGIS가 필요 없다. `gen_random_uuid()`는 Supabase에 기본 활성화돼 있다.

---

## 7. 왜 이렇게 바꿨나 — 대안 비교

| | 원래 스펙 (테이블 18개) | **지금 (테이블 3 · 스냅샷 6행)** | 순수 파일 `import` |
|---|---|---|---|
| 관광지 데이터 위치 | Supabase 테이블 15개 | **`data_snapshots` jsonb 6행** | 코드에 `import` |
| 테이블 수 | 18 | **3** (`data_snapshots` + 사용자 테이블 2) | 3 |
| 마이그레이션 | 8 | **2** | 2 |
| RLS 정책 | ~20 | **6** | 6 |
| 뷰 | 2 | **0** (코드에서 병합) | 0 |
| 데이터 갱신 | 즉시 | **즉시** | ❌ 재배포 필요 |
| 갱신 방법 | 테이블 upsert 다수 | **행 6개 UPDATE** | 커밋 + 배포 |
| 변경 이력 | `source_records` 테이블 | **`git diff`** (수집이 `content/generated/`에도 쓴다) | `git diff` |
| 타입 안전성 | 생성 타입 | **Zod로 읽을 때 검증** (더 엄격) | Zod |
| 갭 리포트 집계 | SQL 뷰 | 코드 20줄 (6행이라 무관) | 코드 |
| 반경 내 시설 | PostGIS `ST_DWithin` | 거리 함수 10줄 | 함수 |

**바꾼 이유:** 데이터가 250행 미만이다. 이 규모에 스키마 설계·RLS·마이그레이션·뷰를 얹는 것은 비용이 이득보다 크다. 원래 설계는 이전 기획의 DB 중심 구조를 관성으로 이어받은 것이었다.

### 부수 효과로 사라진 결함 4개

| 원래 있던 문제 | 왜 사라지나 |
|---|---|
| `route_guides.is_published`가 기본 `false`인데 아무도 `true`로 안 바꿔서 **경로·도슨트 화면이 영영 빈다** | 발행 플래그 개념 자체가 없다. 스냅샷에 있으면 보인다 |
| `nearby_facilities`·`poi_media`에 유니크 키가 없어 **매일 수집할 때마다 행이 중복된다** | 스냅샷을 통째로 갈아끼우므로 중복이 불가능하다 |
| 승인된 제보가 사실을 뒤집는 규칙과 "서로 다른 제보자 2건 이상 필요" 규칙이 **서로 모순** (게다가 유니크 키 때문에 제보 2건을 저장할 수도 없었다) | 제보가 사실에 아예 안 들어간다 (§1) |
| **페르소나는 `localStorage`에 있는데 점수는 캐시된 서버 컴포넌트가 계산**해서, 조건을 바꿔도 결과가 안 바뀐다 | 점수 계산을 브라우저로 옮겼다 (§3.5) |

---

## 8. 이 문서에서 뺀 것

| 뺀 것 | 이유 |
|---|---|
| `pois` `poi_i18n` `poi_media` `accessibility_facts` `poi_certifications` `nearby_facilities` `context_snapshots` `route_guides` `route_steps` `docent_stories` `itinerary_templates` `related_pois` `code_mappings` (13개 테이블) | 전부 `data_snapshots`의 payload로 들어갔다 |
| `ingest_runs` `source_records` | 수집 결과와 원본은 `content/generated/`에 파일로 남기고 git이 이력을 관리한다 |
| `poi_capability_resolved` `poi_completeness` (뷰 2개) | 출처 우선순위는 수집 시점에 적용(§4.3), 채움률 집계는 코드 20줄 |
| `report_photos` + `report-photos` 저장소 버킷 | 제보 사진 제외 ([`01_scope.md`](./01_scope.md) §4.4 (4)) |
| `report_status` enum (`pending`/`approved`/`rejected`) | 즉시 공개 모델. `is_hidden` 불리언 하나면 된다 |
| `reporter_trust_scores` | 제보자 풀이 없다 |
| `moderation_events` `audit_events` | 숨김 이력은 `barrier_reports`의 4개 컬럼에, 사실 변경 이력은 `git log`에 |
| `accessibility_evidence` (사진·실측값·2차 승인자) | 현장 실측을 안 하므로 채울 수 없다. 대신 `routes[].evidenceLevel`/`evidenceNote`로 근거 수준을 정직하게 표기 |
| `turning_areas` `poi_entrances` `route_hazards` `offline_bundle_manifests` `reviews` `gpx_submissions` | 해당 기능을 만들지 않는다 |
| PostGIS 확장 | 6곳 × 시설 몇 개의 거리 계산은 함수 10줄 |
