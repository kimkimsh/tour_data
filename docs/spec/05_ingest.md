# 05 — 수집 파이프라인 (`scripts/ingest.ts`)

> **수집(ingest)** = 외부 API에서 데이터를 받아 우리 저장소에 넣는 작업. 업계에서 ETL(추출-변환-적재)이라고도 한다.
> 사용자 요청과 **무관하게** 하루 한 번 돈다. 이게 있어야 화면이 실행 중에 외부 API를 안 부를 수 있다 ([`00_README.md`](./00_README.md) §4 원칙 3).
>
> 기존 계획은 GitHub Actions 워크플로 + 스테이징 테이블 + 원자 버전 포인터 교체 + HMAC 서명 재검증 엔드포인트 + 4단 파이프라인을 요구했다. 여기서는 **`pnpm ingest` 한 줄로 도는 스크립트 하나**다.

---

## 1. 실행 방법

```bash
pnpm ingest                       # 전체 (스냅샷 6개 다 갱신)
pnpm ingest --only=pois           # 단계별
pnpm ingest --only=accessibility
pnpm ingest --only=docent
pnpm ingest --only=context
pnpm ingest --only=related
pnpm ingest --dry-run             # 스냅샷을 쓰지 않고 결과만 출력
```

**빌드도 배포도 하지 않는다.** `data_snapshots` 테이블의 행 몇 개를 갈아끼우고 캐시를 비울 뿐이다. 몇 초 안에 화면에 반영된다.

GitHub Actions가 매일 KST 04:00(`0 19 * * *` UTC)에 전체를 돌리고, `context`만 1시간마다 따로 돌린다. 수동 실행(`workflow_dispatch`)도 열어 둔다.

---

## 2. 단계

```
0. bootstrap   (최초 1회)  ldongCode2 + lclsSystmCode2 → content/generated/codes.json
1. pois                    content/pois.json + KorService2 + 다국어 + 사진 + content/*.json
                             → 스냅샷 'pois'
2. accessibility           KorWithService2/detailWithTour2 + curated-facts + 파생 항목
                             → 스냅샷 'accessibility'
3. routes                  content/routes/*.json                → 스냅샷 'routes'
4. docent                  Odii + content/docent-easy/*.md      → 스냅샷 'docent'
5. context                 TatsCnctr + DataLab (+기상청)        → 스냅샷 'context'
6. related                 TarRlteTar1                          → 스냅샷 'related'
7. revalidate              POST /api/revalidate
```

각 단계는 **payload를 통째로 만들어 한 번에 쓴다.**

```ts
// 각 단계의 마지막
const payload = SomePayloadSchema.parse(built);       // ★ 쓰기 전에도 검증한다
await sbAdmin.from('data_snapshots').upsert({
  key: 'accessibility',
  payload,
  row_count: payload.length,
  source_note: '한국관광공사 detailWithTour2 + content/curated-facts.json',
  updated_at: new Date().toISOString(),
});
await fs.writeFile('content/generated/accessibility.json',
                   JSON.stringify(payload, null, 2));  // ★ git 이력용 사본
```

**두 군데에 쓴다:**
- `data_snapshots` — 앱이 읽는 곳. 즉시 반영
- `content/generated/*.json` — **git이 이력을 관리하는 곳.** "어제 대비 뭐가 바뀌었나"를 `git diff`로 본다

GitHub Actions는 수집 후 변경분을 커밋한다. 이게 기존 계획의 `source_records` 테이블을 대체한다.

---

## 3. 실패 처리

기존 계획의 걱정은 정당했다: "수집 중간에 실패하면 반쪽짜리 데이터가 발행된다." 스냅샷 구조에서는 이게 **저절로 해결된다.**

1. **payload를 메모리에서 다 만든 다음 한 번에 쓴다.** 중간에 실패하면 **아무것도 안 쓴다.** 이전 스냅샷이 그대로 서빙된다.
2. **쓰기 직전에 Zod로 검증한다.** 형태가 깨진 payload는 애초에 저장되지 않는다.
3. **스냅샷끼리는 독립이다.** `docent` 수집이 실패해도 `pois`·`accessibility`는 이미 갱신됐고 둘 다 유효하다.
4. **`resultCode 22`(일일 한도 초과)를 만나면 그 단계를 중단하고 아무것도 쓰지 않는다.** 다음 실행에서 재시도한다.
5. 실행 결과는 표준 출력과 GitHub Actions 로그에 남는다. 별도 실행 이력 테이블을 두지 않는다.

**스테이징 테이블도, 버전 포인터 교체도, 원자 스왑 함수도 필요 없다.** "통째로 만들어서 한 번에 쓴다"가 같은 보장을 준다.

---

## 4. 단계 2 — 무장애 항목 정규화 (가장 중요한 로직)

### 4.1 한국관광공사 필드 → 항목 코드 매핑

매핑 표는 **`src/domain/capabilities.ts` 한 곳에만** 존재한다. 수집 스크립트·화면·갭 리포트가 전부 이 파일을 import 한다. 기존 계획의 "세트 동일성 CI 게이트"는 이걸로 대체된다 — 타입 시스템이 강제한다.

```ts
// src/domain/capabilities.ts
export const CAPABILITIES = [
  // ── 진입 (entry) ──────────────────────────────────────
  { code: 'access_route',      ktoField: 'route',            labelKo: '접근로',            axis: 'entry' },
  { code: 'entrance_passage',  ktoField: 'exit',             labelKo: '출입통로',          axis: 'entry' },
  { code: 'wheelchair',        ktoField: 'wheelchair',       labelKo: '휠체어',            axis: 'entry' },
  { code: 'elevator',          ktoField: 'elevator',         labelKo: '엘리베이터',        axis: 'entry' },
  { code: 'ticket_office',     ktoField: 'ticketoffice',     labelKo: '매표소',            axis: 'entry' },
  { code: 'help_dog',          ktoField: 'helpdog',          labelKo: '보조견 동반',       axis: 'entry' },
  // ── 이동 (continuity) ─────────────────────────────────
  { code: 'public_transport',  ktoField: 'publictransport',  labelKo: '대중교통',          axis: 'continuity' },
  { code: 'braille_block',     ktoField: 'braileblock',      labelKo: '점자블록',          axis: 'continuity' },
  { code: 'guide_system',      ktoField: 'guidesystem',      labelKo: '유도 안내 설비',    axis: 'continuity' },
  { code: 'path_continuity',   ktoField: null,               labelKo: '경로 연속성',       axis: 'continuity' },
  // ── 편의시설 (facility) ───────────────────────────────
  { code: 'restroom',          ktoField: 'restroom',         labelKo: '화장실',            axis: 'facility' },
  { code: 'parking',           ktoField: 'parking',          labelKo: '주차',              axis: 'facility' },
  { code: 'stroller',          ktoField: 'stroller',         labelKo: '유모차',            axis: 'facility' },
  { code: 'nursing_room',      ktoField: 'lactationroom',    labelKo: '수유실',            axis: 'facility' },
  { code: 'baby_chair',        ktoField: 'babysparechair',   labelKo: '유아용 보조의자',   axis: 'facility' },
  { code: 'room',              ktoField: 'room',             labelKo: '객실',              axis: 'facility' },
  { code: 'hearing_room',      ktoField: 'hearingroom',      labelKo: '객실(청각)',        axis: 'facility' },
  // ── 정보안내 (information) ────────────────────────────
  { code: 'audio_guide',       ktoField: 'audioguide',       labelKo: '오디오 가이드',     axis: 'information' },
  { code: 'big_print',         ktoField: 'bigprint',         labelKo: '큰 활자 홍보물',    axis: 'information' },
  { code: 'braille_promotion', ktoField: 'brailepromotion',  labelKo: '점자 홍보물·표지',  axis: 'information' },
  { code: 'promotion_material',ktoField: 'promotion',        labelKo: '홍보물',            axis: 'information' },
  { code: 'guide_human',       ktoField: 'guidehuman',       labelKo: '안내요원',          axis: 'information' },
  { code: 'sign_guide',        ktoField: 'signguide',        labelKo: '수화 안내',         axis: 'information' },
  { code: 'video_caption',     ktoField: 'videoguide',       labelKo: '자막 영상 안내',    axis: 'information' },
  // ── 휴식 (rest) ───────────────────────────────────────
  { code: 'auditorium',        ktoField: 'auditorium',       labelKo: '관람석',            axis: 'rest' },
  { code: 'rest_seating',      ktoField: null,               labelKo: '휴식 좌석',         axis: 'rest' },
  { code: 'shade_indoor',      ktoField: null,               labelKo: '그늘·실내 휴게',    axis: 'rest' },
  // ── 상황 (context) ────────────────────────────────────
  { code: 'crowd_forecast',    ktoField: null,               labelKo: '예측 혼잡도',       axis: 'context' },
  { code: 'weather_warning',   ktoField: null,               labelKo: '기상 특보',         axis: 'context' },
  { code: 'emergency_distance',ktoField: null,               labelKo: '응급실 거리',       axis: 'context' },
  { code: 'aed_distance',      ktoField: null,               labelKo: '자동심장충격기 거리', axis: 'context' },
] as const;

export type CapabilityCode = typeof CAPABILITIES[number]['code'];
export type Axis = typeof CAPABILITIES[number]['axis'];
```

- **`ktoField`가 있는 24개** = `detailWithTour2`에서 그대로 온다. 이 24개가 갭 리포트의 분모이고 `isKtoScored: true`가 붙는다.
- **`ktoField`가 `null`인 7개** = 파생 항목. 경로 데이터·콘텐츠 파일·혼잡도/날씨에서 온다. 소스가 없으면 `unknown`.
- **기타 4개(`handicapetc`, `blindhandicapetc`, `hearinghandicapetc`, `infantsfamilyetc`)는 항목이 아니다.** 값이 있으면 `pois[].etcNotes`에 넣어 관광지 상세의 "기타 안내"로 보여주고, 점수 계산에는 넣지 않는다.

### 4.2 자유 텍스트 → 상태 판정

한국관광공사 값은 `Y/N`이 아니라 자유 문장이다(`"대여가능(수동휠체어 2대)"`, `"장애인 화장실 있음"`, `""`).

```ts
// src/domain/capabilities.ts
export function resolveStatus(raw: string | null | undefined): CapabilityStatus {
  const s = (raw ?? '').trim();
  if (s === '') return 'unknown';                       // ★ 빈 값은 '없음'이 아니라 '모름'

  // 명시적 부정
  if (/(불가|없음|미설치|미운영|해당\s*없음|없습니다|제공하지\s*않)/.test(s)) return 'unsupported';
  // 조건부·부분
  if (/(일부|제한|사전\s*문의|예약\s*필요|협의|평일만|우천\s*시)/.test(s)) return 'partial';
  // 그 외 내용이 있으면 있는 것으로 본다
  return 'supported';
}
```

**중요한 안전장치:** 이 정규식은 완벽하지 않다. 그래서

1. **`detail`에 원문을 그대로 저장하고 화면에도 원문을 그대로 보여준다.** 사용자는 앱의 판정이 아니라 원문을 읽고 판단할 수 있다.
2. 근거 카드에 원문·필드명·출처를 함께 보여준다.
3. 정규식이 잘못 판정한 사례를 발견하면 `content/curated-facts.json`으로 덮어쓴다(§4.4).

`unknown`인 경우 `absenceKind`를 정한다.

| 조건 | `absenceKind` | 근거 |
|---|---|---|
| 이 관광지 유형에 애초에 없는 항목 (숙박이 아닌 곳의 `room`, `hearing_room`) | `not_applicable` | `contentTypeId`로 판정 |
| 사적지 구조상 불가능 — `curated-facts.json`에 `"absenceKind": "intrinsic"`으로 명시된 것 | `intrinsic` | 사람이 지정 |
| 그 외 전부 | **`operator_missing`** | 기본값 |

**`operator_missing` 목록이 그대로 갭 리포트(S10)의 내용**이다. 이게 이 서비스가 지자체에 돌려주는 값이다.

### 4.3 출처와 날짜

| 필드 | 한국관광공사 항목 | 콘텐츠 파일 항목 | 파생 항목 |
|---|---|---|---|
| `source` | `kto_with` | `curated` | `derived_route` · `derived_facility` · `tats` · `kma` |
| `sourceField` | `wheelchair` 등 원래 필드명 | `null` | `null` |
| `verifiedAt` | **관광지의 한국관광공사 `modifiedtime`** | `checkedAt` | 수집 시각 |
| `isKtoScored` | `true` | 해당 코드의 `ktoField`가 있으면 `true` | `false` |

> **`verifiedAt`을 어떻게 정하나 — 기존 계획의 구멍을 메운 부분.**
> 기존 계획은 Layer D(신선도)를 "항목별 확인 날짜"로 계산한다고 했지만, **한국관광공사는 항목별 날짜를 주지 않는다.** 관광지 단위 `modifiedtime` 하나뿐이다.
> 그래서 **한국관광공사에서 온 항목의 `verifiedAt`은 그 관광지의 `modifiedtime`으로 통일**한다. 근사치이고, 화면에 "한국관광공사 최종 수정일 기준"이라고 명시한다.

### 4.4 출처가 충돌할 때 — 여기서 한 번만 결정한다

같은 `(관광지, 항목)`에 여러 출처의 값이 있을 수 있다. 수집 스크립트가 **하나를 골라** 스냅샷에 넣는다.

```
curated  >  derived_route / derived_facility / tats / kma  >  kto_with
```

결과 payload에는 `(poiSlug, capabilityCode)` 조합이 **정확히 한 번만** 나온다. 화면도 도메인 함수도 이 계산을 다시 하지 않는다 — 계산이 두 곳에 있으면 반드시 갈라진다.

> **방문자 제보는 이 목록에 없다.** 제보는 **사실이 아니라 발언**이므로 `accessibility` 스냅샷에 들어가지 않고, 적합도 점수에도 영향을 주지 않는다.
> 제보가 사실이 되는 경로는 하나뿐이다 — **사람이 검토해서 `content/curated-facts.json`에 옮겨 적고 커밋한다.** 그때 출처 칸에 제보 ID를 남긴다 ([`04_data_model.md`](./04_data_model.md) §4.2).
>
> 기존 계획은 "승인된 제보가 확인일을 갱신하되 상태는 못 뒤집는다"는 규칙을 뒀는데, 규칙이 두 군데에 서로 다르게 적혀 모순이 있었고 저장 구조상 "제보 2건 이상"을 표현할 수도 없었다. **제보를 사실에서 완전히 분리하니 이 문제가 통째로 사라졌다.**

---

## 5. 단계별 세부

### 5.0 bootstrap (최초 1회)

```
GET KorService2/ldongCode2?lDongRegnCd=44&lDongListYn=Y    → 충남 시군구 코드·이름
GET KorService2/lclsSystmCode2?lclsSystmListYn=Y           → 분류체계 243건
→ content/generated/codes.json  (코드 → 한글명 표시용)
```
5자리 시군구 코드(`44150`,`44760`)는 `content/pois.json`에 적힌 값을 쓴다. **하드코딩 금지 규칙은 검증 스크립트가 확인한다** ([`09_test_and_ci.md`](./09_test_and_ci.md) §4).

### 5.1 pois

```
content/pois.json 에서 6곳의 slug ↔ ktoContentId 대응을 읽는다

for each poi:
  GET KorService2/detailCommon2?contentId=…      → 주소·전화·홈페이지·개요·modifiedtime
  GET KorService2/detailIntro2?contentId=…&contentTypeId=…
                                                  → 이용시간·쉬는날·주차·문의처
  GET KorService2/detailImage2?contentId=…&imageYN=Y
                                                  → 이미지 + cpyrhtDivCd
  GET EngService2/detailCommon2?contentId=…       → 영문 제목·개요·주소
  GET JpnService2/detailCommon2?contentId=…       → 일문
  GET ChsService2/detailCommon2?contentId=…       → 중문 간체

GET PhotoGalleryService1/galleryList1  (numOfRows=100, pageNo 1..48 전체)
  → galSearchKeyword / galTitle 에 관광지명·'백제'·'공주'·'부여' 포함된 것만 필터

content/facilities.json      → pois[].facilities
content/certifications.json  → pois[].certifications

→ 스냅샷 'pois' 통째로 쓰기
```

**이미지 처리:**
- `cpyrhtDivCd = 'Type3'` → `noTransform: true`. 화면에서 `next/image` 최적화를 태우지 않는다
- `attribution` 문구를 **저장 시점에 완성해서** 넣는다. 화면에서 조합하지 않는다
- `http://` URL은 `https://`로 치환하고 실제 접속을 확인한다. 안 되면 `/api/image-proxy`를 태운다

**다국어 주의:** 목록 조회(`areaBasedList2`)를 쓸 때는 `contentTypeId`를 변환해야 한다(12→76, 14→78). `detailCommon2`에는 `contentTypeId` 파라미터가 없어 변환이 불필요하지만, **변환 함수는 만들어 둔다** ([`03_external_data.md`](./03_external_data.md) §2.8).

### 5.2 accessibility

```
for each poi:
  GET KorWithService2/detailWithTour2?contentId={ktoContentId}
  → 응답 29항목 중 24개를 CAPABILITIES 매핑으로 변환 (§4.1)
  → resolveStatus() 로 상태 판정, 원문은 detail 에 그대로 (§4.2)
  → *etc 4개는 pois[].etcNotes 로

파생 항목 7개 계산 (§5.6)
content/curated-facts.json 적용 (§4.4 우선순위)

→ 스냅샷 'accessibility' 통째로 쓰기
```

**`resultCode 03`(데이터 없음)이면:** 그 관광지는 무장애여행 서비스에 등록돼 있지 않다. 24항목 전부 `unknown` + `operator_missing`으로 넣고 경고를 출력한다. **화면은 "한국관광공사 무장애 데이터 미등록"이라고 정직하게 표시한다.** 6곳 중 몇 곳이 이런지가 프로젝트의 형태를 바꾼다 → [`11_open_items.md`](./11_open_items.md) **P0-1**.

### 5.3 routes

```
content/routes/*.json 을 읽어 Zod 검증 → 스냅샷 'routes'
파생 항목 path_continuity 계산 (§5.6)
```

발행 플래그가 없다. **파일에 있으면 화면에 나온다.**

### 5.4 docent

```
for each poi (A등급 2곳 우선, 나머지도 시도):
  GET Odii/themeSearchList?keyword={odiiKeyword}&langCode=ko
  → 결과 중 좌표가 관광지 반경 1km 안인 것 선택 → tid, tlid
  if 없으면:
    GET Odii/storyLocationBasedList?mapX={lng}&mapY={lat}&radius=1000&langCode=ko

  for langCode in [ko, en]:
    GET Odii/storyBasedList?tid=…&tlid=…&langCode={langCode}
    → title, script, audioUrl, imageUrl, playTime

content/docent-easy/{slug}.{locale}.md → easyScript (A등급 2곳만)

→ 스냅샷 'docent'
```

- `easyScript`(쉬운 글)는 API가 주지 않는다. **사람이 `script`를 보고 다듬어 파일에 넣는다.**
- Odii 이야기가 없는 관광지는 payload에 안 들어가고, 도슨트 화면 대신 안내 문구가 나온다.
- `langCode` 실제 값은 **P0-4 탐침 결과**를 따른다.

### 5.5 context

```
GET TatsCnctrRateService/tatsCnctrRateList?areaCd=44&signguCd=44150   (공주)
GET TatsCnctrRateService/tatsCnctrRateList?areaCd=44&signguCd=44760   (부여)
  → tAtsNm 이 content/pois.json 의 tatsName 과 일치하는 행만
  → context.crowd (isPredicted: true 고정)

GET DataLabService/locgoRegnVisitrDDList?startYmd={오늘-11}&endYmd={오늘-4}
  → 전국이 오므로 signguCode in ('44150','44760') 만 필터
  → 8일치를 평균내어 context.visitors 에 dailyAverage 로 저장
  → windowStart/windowEnd/days 를 함께 저장한다 (화면에 "최근 8일 일평균"으로 표기)

(선택) 기상청 단기예보 → context.weather

→ 스냅샷 'context'
```

> **한국관광공사 관광 빅데이터는 약 4일 지연**되므로 `endYmd = 오늘 − 4일`이다. 그래서 **월 단위 통계는 만들 수 없다.** 화면에는 **"최근 8일 일평균"** 이라고 정확히 쓴다 — 기존 화면 초안의 "2026-08 일평균"은 이 파이프라인으로 얻을 수 없는 값이었다.

### 5.6 related

```
GET TarRlteTarService1/areaBasedList1?baseYm={지난달}&areaCd=44&signguCd=44150
GET TarRlteTarService1/areaBasedList1?baseYm={지난달}&areaCd=44&signguCd=44760
  → tAtsNm 이 우리 6곳 이름과 정확히 일치하는 행만
  → 이름이 안 맞으면 그 관광지는 관련 목록을 표시하지 않는다 (추측 매칭 금지)
→ 스냅샷 'related'
```

### 5.7 파생 항목 7개 계산

| 항목 | 계산 방법 | `source` | 소스 없을 때 |
|---|---|---|---|
| `path_continuity` | 경로 단계가 있으면 `hazard` 있는 단계 수로 판정 — 0건 `supported` / 1건 이상 `partial` | `derived_route` | `unknown` + `operator_missing` |
| `rest_seating` | `curated-facts.json` 또는 `facilities` 중 `kind='rest_area'` | `derived_facility` | `unknown` |
| `shade_indoor` | `curated-facts.json` | `curated` | `unknown` |
| `crowd_forecast` | `rate` ≤40 `supported` / 41–70 `partial` / 71–100 `unsupported` | `tats` | `unknown` |
| `weather_warning` | 특보 없음 `supported` / 발효 `unsupported` | `kma` | `unknown` |
| `emergency_distance` | 가장 가까운 `kind='hospital'`까지 ≤500m `supported` / ≤1km `partial` / 초과 `unsupported` | `derived_facility` | `unknown` |
| `aed_distance` | 가장 가까운 `kind='aed'`까지 ≤300m `supported` / ≤1km `partial` / 초과 `unsupported` | `derived_facility` | `unknown` |

거리는 **하버사인 공식 함수 10줄**로 계산한다(`src/domain/geo.ts`). PostGIS가 필요 없다.

**`unknown`이면 그냥 `unknown`이다.** 없다고 추론하지 않는다.

---

## 6. 재검증 호출

```ts
// scripts/ingest.ts 마지막
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
  method: 'POST',
  headers: { authorization: `Bearer ${process.env.REVALIDATE_SECRET}` },
  body: JSON.stringify({ keys: ['pois', 'accessibility', 'routes', 'docent', 'context', 'related'] }),
});
```

```ts
// src/app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

// 스냅샷은 전 페이지에 영향을 주므로 레이아웃 단위로 비운다.
const LOCALES = ['ko', 'en'] as const;

export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout');
  return Response.json({ ok: true });
}
```

실패해도 각 페이지의 `revalidate = 3600`이 1시간 뒤에 갱신하므로 치명적이지 않다.

> 기존 계획의 HMAC 서명(`body + timestamp` 서명, `x-etl-signature` 헤더, 5분 재생 방지 창)은 **임의 호출당하면 곤란한 엔드포인트**를 위한 장치다. 이 엔드포인트가 하는 일은 캐시를 비우는 것뿐이고 최악의 피해가 캐시 미스다. 공유 시크릿 비교로 충분하다.

---

## 7. 제보 정리 (관리자, 수동)

제보는 수집 파이프라인과 **완전히 분리돼 있다.** 자동으로 아무 데도 흘러가지 않는다.

```
1. 관리자가 /admin/reports 에서 제보 목록을 본다
2. 부적절한 것(욕설·허위·개인정보·중복)은 [숨기기] → is_hidden = true
3. "이건 사실이다" 싶은 것은
   [항목으로 복사] 버튼 → curated-facts.json 조각이 클립보드에 복사된다
     {
       "poiSlug": "gongsanseong",
       "capabilityCode": "",              ← 관리자가 채운다
       "status": "",                      ← 관리자가 채운다
       "detail": "동문 쪽 계단 보수 공사로 통행 불가",
       "source": "방문자 제보 #a1b2c3 확인 후 ○○ 로 교차 확인",
       "checkedAt": "2026-09-18"
     }
4. content/curated-facts.json 에 붙여넣고 커밋
5. pnpm ingest → 다음 화면부터 반영
```

**이 흐름이 감사 기록 그 자체다.** "왜 이 값이 바뀌었나"는 `git log`가 답한다. 별도 이력 테이블이 필요 없다.

**부적절한 제보 삭제:** `is_hidden = true`인 제보 중 90일 지난 것은 수집 스크립트가 실제로 지운다. 개인정보 처리방침에 적은 내용을 지키기 위한 것이고, 10줄이면 된다.

```ts
// scripts/ingest.ts — 매 실행 시 1회
await sbAdmin.from('barrier_reports').delete()
  .eq('is_hidden', true)
  .lt('hidden_at', new Date(Date.now() - 90 * 864e5).toISOString());
```

---

## 8. 탐침 스크립트 (`scripts/probe.ts`)

수집 전에 **가정을 실제 호출로 확인**한다. `11_open_items.md`의 P0 항목과 1:1 대응한다. (P0-7은 사람이 직접 확인하는 항목이라 자동 탐침에서 빠진다.)

```
pnpm probe

[P0-1] KorWithService2/detailWithTour2 — 6곳 등록 여부
  ✓ 공산성 (126121)        resultCode=0000, 채워진 항목 7/24
  ✗ 국립부여박물관 (…)     resultCode=03  → 무장애 데이터 없음
[P0-2] 인증키 인코딩          ✓ resultCode=0000 (30 아님)
[P0-3] Odii 커버리지          공산성 ✓ 이야기 3건 / 부소산성 ✓ 5건 / 나머지 ✗
[P0-4] Odii langCode 후보     ko ✓ / en ✓ / ja ✗ / jp ✓ / zh-CN ✗ / cn1 ✓
[P0-5] TatsCnctr tAtsNm       '공산성' ✓ / '부소산성' ✗ → 시군 단위만 사용
[P0-6] lDong 코드             44 = 충청남도 ✓ / 150 = 공주시 ✓ / 760 = 부여군 ✓
[P0-8] PhotoGallery 오퍼레이션 galleryList1 ✓ / gallerySearchList1 ✗
[P0-9] 오퍼레이션 이름 오타    tatsCnctrRateList ✓ / themeBasedSyncList ✓ / areaBasedList1 ✓
```

**모든 결과를 `docs/spec/_probe-results.md`에 자동 기록한다.** 이 파일이 "우리가 실제로 확인한 것"의 단일 기록이 된다.
