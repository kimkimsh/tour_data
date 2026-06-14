# 04 — KTO·외부데이터 연동·ETL

> **Scope:** SPEC §6 (KTO API contracts), §4 데이터 플레인, §5 source/publish 테이블, §9 C2 스트림, §11 verify-at-build-time gate 를 구현 가능한 수준으로 확장한다. 본 문서는 `packages/kto-client`, `packages/public-data-clients`, `packages/etl`, `scripts/{ingest,validate-content,publish}`, `.github/workflows/kto-etl.yml` 의 단일 구현 기준이다.
> **Authority:** SPEC.md 가 상위. 본 문서가 SPEC 과 충돌하면 SPEC 이 이긴다. 본 문서는 SPEC §2.7(런타임 KTO 호출 금지·DB 스냅샷), §2.10(GitHub Actions ETL), §2.14(Layer C +0.12), §2.15(MVP 외부데이터 셋)을 절대 위반하지 않는다.
> **Provenance:** `_research/D1_kto_api.md`, `_research/R1_kto_api_current.md`, `_research/D4_domain_external.md`, `_research/00_SYNTHESIS.md §2`, 그리고 canonical `docs/ideation/total/00_modu_baekje.md §3`. **R-brief 가 D-brief 와 충돌하면 R-brief 가 이긴다** (live 2026-06-13 검증). 모든 "verified"가 아닌 값(lDong 코드, detailWithTour2 키, 공주 signguCd, gateway suffix, Odii 커버리지)은 **`gate:0` 빌드타임 게이트에서 실측 확정**한다 — 하드코딩 금지.

---

## 0. 핵심 불변식 (먼저 읽을 것)

| # | 불변식 | 근거 |
|---|---|---|
| INV-1 | **런타임에 KTO 를 직접 호출하지 않는다.** 모든 데이터는 ETL 이 Supabase 에 publish. 브라우저·RSC·Route Handler 어디서도 `apis.data.go.kr` 미호출. | SPEC §2.7 |
| INV-2 | **serviceKey 는 server-only 환경변수에 DECODING 키로 저장, 정확히 1회만 인코딩.** 이중 인코딩 = code 30. | SPEC §6; R1 §8 |
| INV-3 | **에러 응답은 항상 XML** (`_type=json` 무관). 파서는 body 를 string 으로 먼저 읽고 JSON-ok / XML-error 분기. | SPEC §6; R1 §7 |
| INV-4 | **ETL 실패 = 마지막 성공 publish 유지.** ingest 트랜잭션 ≠ publish 트랜잭션. | SPEC §4, §2.10 |
| INV-5 | **lDong / lclsSystm 코드는 부트스트랩에서 `ldongCode2`/`lclsSystmCode2`로 가져온다 — 44/150/760 하드코딩 금지.** legacy `areaCd=34`/`signguCd`는 별개 네임스페이스(TatsCnctr/TarRlte/DataLab 전용). | SPEC §6; SYNTHESIS §2.5 |
| INV-6 | **모든 정규화 fact 는 `source/sourceField/sourceUpdatedAt/ingestedAt` 출처를 보유.** 도메인은 KTO 필드명에 의존하지 않는다(`accessibility_facts.capability_code` 로 디커플). | SPEC §5, §6 |
| INV-7 | **most-restrictive-wins.** 조합 산출물(PDF/지도/합본)의 라이선스는 가장 제한적인 소스를 따른다. Type3/4유형 소스는 변형 금지. | SPEC §10; SYNTHESIS §5.2 |
| INV-8 | **클라이언트 transport 에 숨은 캐시 없음.** quota/retry/TTL 은 ETL 의 책임(서버리스 토큰버킷은 공유되지 않음). 저장된 fixtures 로 contract test 를 live API 없이 돌린다. | SPEC §6 |

---

## 1. Gateway·공통 파라미터·에러

**Gateway:** `https://apis.data.go.kr/B551011/{ServiceID}/{op}` (provider `B551011` = 한국관광공사). HTTPS 사용(Vercel/CI fetch 요구). 일부 서비스는 gateway suffix 가 `1`/`2`/무접미로 갈린다 → `gate:0`에서 Swagger 로 확정(§9 GATE-4).

**모든 호출 필수 공통 파라미터:**

| 파라미터 | 값 | 비고 |
|---|---|---|
| `serviceKey` | (DECODING 키, env) | 1회 인코딩. INV-2 |
| `MobileOS` | `ETC` | server-to-server 안전값. `WIN` 은 KorWithService2 구표기 |
| `MobileApp` | `ModuBaekje` | 생략 시 KTO 트래픽 통계 누락 → 운영계정 심사 불리 |

**선택 공통:** `numOfRows`(기본 10), `pageNo`(기본 1), `_type=json`(생략 ⇒ XML). 문자셋 UTF-8 고정.

**응답 봉투(JSON):** `response.header.{resultCode,resultMsg}` + `response.body.{items.item[], numOfRows, pageNo, totalCount}`.

**에러 코드(KTO):**

| 코드 | 의미 | ETL 처리 |
|---|---|---|
| `00`/`0000` | 정상 | 진행 |
| `03` | 데이터 없음 | 정상으로 취급, 빈 결과 기록(누락 ≠ 장애) |
| `10` | 잘못된 파라미터 | fail-fast, 호출 빌더 버그 |
| `11` | 필수 파라미터 누락 | fail-fast |
| `22` | 일일 트래픽 초과 | 백오프 후 다음 run 으로 이월, publish 안 함(INV-4) |
| `30` | 미등록/이중 인코딩 키 | fail-fast, INV-2 점검 |
| `31` | 키 만료 | fail-fast, 키 갱신 알림 |

---

## 2. 10개 KTO 서비스 계약 (서비스별 정밀)

> 표 형식: **base path · 호출 op · 필수+핵심 파라미터 · 매핑 응답 필드 · gotcha**. `*2` 표준 + `lDong*`/`lclsSystm*` 사용. legacy `areaCode`/`cat*` 는 read-only fallback 으로만, 신규 필터로 절대 emit 금지(dual-read, single-write-new).

### 2.1 KorService2 — 국문 관광 콘텐츠 (primary content)

- **Base:** `/KorService2` · data.go.kr `15101578` · guide **v4.4**
- **Consumes:** F1.A 카드 본문, F1.B 경로 카드, F1.D 코스 후보, F4 다이어리 메타, 코드 부트스트랩

| op | 필수/핵심 params | 매핑하는 응답 필드 → 내부 | gotcha |
|---|---|---|---|
| `areaBasedList2` | `lDongRegnCd`,`lDongSignguCd`,`lclsSystm1/2`,`contentTypeId`,`arrange` | `contentid`→`pois.kto_content_id` · `contenttypeid`→`pois.type` · `mapx/mapy`(WGS84 경도/위도)→`pois.geom` · `title`→`poi_translations(ko)` · `firstimage/firstimage2`→`poi_media.url` · `cpyrhtDivCd`→`poi_media.license_code` · `modifiedtime`→증분키 · `lDong*`/`lclsSystm*`→`source_code_mappings` | legacy `areaCode/cat*` "미사용-삭제예정" 표기, 신규 필터로 미emit |
| `areaBasedSyncList2` | `lDong*`,`showflag`,`modifiedtime`,**`oldContentid`** | 위 + `showflag`(0=숨김)→`pois.visibility` · `oldContentid`→`source_records` 컬럼(rename 추적) | **증분 동기화 코어**. `oldContentid`(v4.3) 로 rename 추적 → F4 누적 다이어리가 깨지지 않음. `modifiedtime`>마지막 ingest 만 fetch |
| `locationBasedList2` | `mapX`,`mapY`,`radius`(≤20,000m) | areaBased 와 동일 셋 | 반경 보강(6 POI 인근 시설 후보) |
| `searchKeyword2` | `keyword`,`arrange` | 동일 셋 | v4.3 에서 `contentTypeId` 파라미터 제거됨 |
| `searchFestival2` | **`eventStartDate`(YYYYMMDD 필수)** | `eventstartdate/eventenddate`→축제 기간 | `eventStartDate` 없으면 code 11. 백제문화제(9–10월) |
| `searchStay2` | `lDong*` | 숙박 리스트 | 1박2일 템플릿 lodging 후보(static) |
| `detailCommon2` | `contentId` | `addr1/addr2`→주소 · `homepage`,`tel`,`zipcode` · `overview`→`poi_translations.description`(provenance=KTO) | v4.4: `*YN` 토글 플래그 제거 → 기본 full common block 반환 |
| `detailIntro2` | `contentId`,`contentTypeId` | type12: `chkbabycarriage`,`chkpet`,`heritage1/2/3`,`infocenter`,`parking`,`restdate`,`usetime` · type14: `usefee`,`usetimeculture`,`restdateculture`,`spendtime`,`scale` · type15: `eventhomepage`,`program`,`playtime` | type 별 키 상이. F1.F-2 단계카드·시간예산 입력 |
| `detailInfo2` | `contentId`,`contentTypeId` | 반복 key-value(객실/부가정보) | type32 는 객실, 그 외 freeform |
| `detailImage2` | `contentId`,`imageYN=Y` | `originimgurl`/`smallimageurl`→`poi_media.url` · `imgname` · **`cpyrhtDivCd`**/`cpyrhtDivCdNm`→`poi_media.license_code`/attribution | 이미지별 license 저장 필수. HTTP URL 주의(§5) |
| `ldongCode2` | `lDongRegnCd`,`lDongListYn=Y` | `lDongRegnCd/Nm`,`lDongSignguCd/Nm`→`source_code_mappings(service=KorService2,code_type=lDong)` | **부트스트랩 1회.** 44/150/760 하드코딩 금지(INV-5) |
| `lclsSystmCode2` | `lclsSystmListYn=Y` | `lclsSystm1/2/3Cd`,`...Nm`→`source_code_mappings(code_type=lclsSystm)` | **부트스트랩 1회.** cat→lclsSystm 은 rename 아님 — 라벨맵 실측 생성 |

### 2.2 KorWithService2 — 무장애 여행 (authoritative accessibility source)

- **Base:** `/KorWithService2` · data.go.kr `15101897` · guide **v4.3**
- **Consumes:** **F1.A 무장애 상세 카드 코어** + F1.D Layer A/B 입력 + F5 갭 리포트(누락 식별)
- **contentTypeId 제약:** **12/14/15/28/32/38 만 지원.** 39(음식점)·25(여행코스) 미지원 → 6 POI 는 모두 12/14 라 영향 없으나, 음식 무장애는 KorService2 type12 `chkbabycarriage`/type39 `kidsfacility` 로 보강.

| op | 필수/핵심 params | 매핑 | gotcha |
|---|---|---|---|
| **`detailWithTour2`** | `contentId` | 21 named + 4 `*etc` → `accessibility_facts`(capability_code 로 정규화, §3) | **유일 무장애 op.** 키 스키마는 `gate:0`에서 guide v4.3 + live probe 로 확정(GATE-1). 빈 필드 = "정보 없음", 절대 "inaccessible" 추론 금지 |
| `areaBasedList2`/`Sync2` | `lDong*` | 무장애 대상 POI 목록 | 6 POI 외 후보 식별 |
| `detailCommon2`/`Intro2`/`Info2`/`Image2` | `contentId` | KorService2 와 동일 매핑 | 무장애 변종 |
| `ldongCode2`/`lclsSystmCode2` | — | KorService2 와 동일 | 코드 부트스트랩 중복 가능(같은 네임스페이스) |

**`detailWithTour2` 작업 스키마 (guide v4.3, `gate:0` 확정 전 working spec)** — canonical 00 §3.(1) 직인용. 정규화 매핑은 §3:

| 카테고리 | 응답 필드(영문 키) |
|---|---|
| 공통 6 | `contentid` · `parking` · `route` · `publictransport` · `ticketoffice` · `promotion` |
| 지체장애 7 | `wheelchair` · `exit` · `elevator` · `restroom` · `auditorium` · `room` · `handicapetc` |
| 시각장애 7+1 | `braileblock` · `helpdog` · `guidehuman` · `audioguide` · `bigprint` · `brailepromotion` · `guidesystem` (+`blindhandicapetc`) |
| 청각장애 4 | `signguide` · `videoguide` · `hearingroom` · `hearinghandicapetc` |
| 영유아가족 3+1 | `stroller` · `lactationroom` · `babysparechair` (+`infantsfamilyetc`) |

> **경고(D4 vs D1 불일치):** D4 는 `handicaptoilet`/`handicapparking`/`nursingroom` 으로 표기, D1/canonical 은 `restroom`/`parking`/`lactationroom`. **둘 다 가설.** GATE-1 에서 실 응답으로 확정 후에만 `accessibility_facts` 매핑 테이블 동결. 코드는 `KTO_DETAILWITHTOUR_FIELD_MAP` 상수(§3)로 격리해 키 변동을 1곳에 가둔다.

### 2.3 Odii — 관광지 오디오 가이드 (F2 도슨트 코어)

- **Base:** `/Odii` · data.go.kr `15101971` · guide v4.1
- **Consumes:** F2 음성 채널(ko/en/ja/zh-CN), F1.D Layer B 역사경험성(스토리 존재 여부)

| op | 필수/핵심 params | 매핑 | gotcha |
|---|---|---|---|
| `storyLocationBasedList` | **`xCoord`,`yCoord`,`langCode`,`radius`(m)** | story→`docent_stories`(locale=langCode) · 오디오 URL→`docent_assets.audio` | **좌표가 `mapX/mapY` 아님 → `xCoord/yCoord`.** `langCode`=`ko`/`en`/`ja`/`zh-CN`(contentTypeId 언어매핑 없음) |
| `storyBasedList` | `langCode` | 키워드/목록 story | — |
| `themeBasedList` | `langCode` | `themeNm`(자체 스킴)별 테마 | **lclsSystm 미사용**, areaCode 미사용 |
| `storySearchList`/`themeSearchList` | `keyword`,`langCode` | 키워드 검색 | `gate:0` 커버리지 probe 에 사용(GATE-5) |
| `storyBasedSyncList`/`themeBaseSyncdList` | sync params | 증분 동기화 | 표기 `themeBaseSyncdList`(오타 아님, 매뉴얼 그대로) |

**Odii 4대 quirk:** ① 좌표 `xCoord`/`yCoord` ② 언어 `langCode` ③ 분류 `themeNm`(no lclsSystm/areaCode) ④ `contentTypeId` 없음(반경 내 전체 반환). 4개 POI 좌표 × 4개 langCode = 16 ETL 호출.

### 2.4 TatsCnctrRateService — 집중률·방문자 추이 예측 (F1.D Layer A 0.10)

- **Base:** `/TatsCnctrRateService` · `15128555` · guide v4.0 · op `tatsCnctrRateList`
- **Consumes:** F1.D timeContext(시간대 적합도, weight 0.10)

| 필수/핵심 params | 매핑 | gotcha |
|---|---|---|
| **`areaCd=34`(충남, legacy)** · `signguCd` · `tAtsNm`(관광지명) | 0–100 집중지수→`context_snapshots.crowd`(effective_period 부착) | **legacy 코드 전용**(lDong 미이전). `signguCd` 부여=`34800`, **공주=TBD** → `gate:0` GATE-3 에서 `한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx` 대조 확정. **0–100 상대 지수, 실인원 아님** — UI 라벨 "혼잡도(상대)" |

### 2.5 DataLabService — 관광 빅데이터 (F5 RTO 대시보드)

- **Base:** `/DataLabService` · `15101972` · guide v4.1
- **Consumes:** F5 방문자 추세

| op | 필수 params | 매핑 | gotcha |
|---|---|---|---|
| `locgoRegnVisitrDDList` | `startYmd`,`endYmd`(YYYYMMDD) | `touDivCd/Nm`(현지인/외지인/외국인),`touNum`,`baseYmd`,`signguCode/Nm`→`rto_dashboard_snapshots` | 기초지자체(시군구) 단위 |
| `metcoRegnVisitrDDList` | `startYmd`,`endYmd` | 광역 단위 | 시도/시군 집계 기준 상이 → **임의 합산 불가** |

**필수 caveat(매뉴얼 명시):** **"방문자는 관광객과 동일하게 정의되지 않음"** — 이동통신(KT 내국인 + SKT 외국인) 신호 기반, 여행 목적 추론 불가. F5 화면에 caveat 상시 노출. **데이터 지연 ~4일** → `endYmd` = (오늘 − 4일) 로 ETL 계산.

### 2.6 TarRlteTarService1 — 연관 관광지 (F1.D fallback, F3 대체경로)

- **Base:** `/TarRlteTarService1` (**`1` suffix**, 2025-05-23 마이그레이션) · `15128560` · guide v4.1
- **Consumes:** suitability score<70 시 대체 POI 제안, F3 제보 승인 후 대체 경로

| op | 필수 params | 매핑 | gotcha |
|---|---|---|---|
| `areaBasedList1` | `baseYm`(YYYYMM),`areaCd`(legacy),`signguCd` | `rlteTatsCd`(연관관광지코드)→대체 후보 | Tmap 내비(차량) 기반 → 도보 연계와 차이. 데이터 윈도 2024-05~2025-04 |
| `searchKeyword1` | `keyword`,`baseYm` | 동일 | legacy 코드 |

### 2.7 PhotoGalleryService1 — 관광사진 (F1.A 출입구·F1.B 단계 카드)

- **Base:** `/PhotoGalleryService1` (**`1` suffix**) · `15101914` · guide v4.2
- **Consumes:** F1.A 출입구 사진, F1.B 단계별 시각 카드, F4 다이어리 비주얼

| op | 핵심 params | 매핑 | gotcha |
|---|---|---|---|
| `galleryList1` | `arrange=C` | `galWebImageUrl`→`poi_media.url` · 촬영지/촬영자→attribution | **공공누리 1유형(free reuse)** — 가장 너그러운 라이선스 |
| `gallerySearchList1` | `keyword`(=POI 명) | 동일 | 키워드=POI 명으로 출입구 사진 매칭 |
| `galleryDetailList1` | gallery item id | 상세 | F1.B 단계 카드 |
| `gallerySyncDetailList1` | `showflag` | 증분 | sync |

### 2.8 다국어 4종 — Eng/Jpn/Chs/ChtService2 (F2 자막·F5 외국인)

- **Base:** `/EngService2` · `/JpnService2` · `/ChsService2` · `/ChtService2` (`15101753` 등)
- **Consumes:** F2 4언어 자막, F5 외국인 콘텐츠
- **Op 셋:** KorService2 와 동일(단 `detailPetTour2` 없음)

| 필수/핵심 | 매핑 | gotcha |
|---|---|---|
| **multilingual `contentTypeId`** + `lDong*` + `contentId` | `title`/`overview`→`poi_translations(locale)` | **다국어 contentTypeId 별도**: 관광지 **76** / 문화 **78** / 행사 **85** / 레포츠 **75** / 숙박 **80** / 쇼핑 **79** / 음식 **82**. `EngService2`에 `contentTypeId=12` 호출 시 **빈 응답**. 여행코스 25 는 다국어 미지원 → 다국어 호출에서 제외 |

> **6 POI 다국어:** 공산성·부소산성·무령왕릉·정림사지(type12→76) + 국립공주/부여박물관(type14→78). 백제문화제(type15→85)는 F4/F5 시즌 토글용.

---

## 3. accessibility_facts 정규화 — KTO 키 디커플 (INV-6)

도메인(`packages/domain/accessibility`)은 KTO 필드명을 모른다. ETL 이 `detailWithTour2` 21필드를 `capability_code` 로 변환해 `accessibility_facts` 에 적재한다. 키 변동은 **단일 상수 맵**에 격리.

```ts
// packages/kto-client/src/maps/detailWithTour.ts
// Maps raw detailWithTour2 field keys (guide v4.3) to domain capability codes.
// GATE-1 must confirm exact keys before this map is frozen.
export const KTO_DETAILWITHTOUR_FIELD_MAP: ReadonlyArray<{
  sourceField: string;          // raw KTO key (e.g. "wheelchair")
  capabilityCode: string;       // domain code (e.g. "MOBILITY_WHEELCHAIR_ENTRY")
  category: 'mobility' | 'visual' | 'hearing' | 'family' | 'common';
}> = [
  { sourceField: 'wheelchair',   capabilityCode: 'MOBILITY_WHEELCHAIR_ENTRY', category: 'mobility' },
  { sourceField: 'exit',         capabilityCode: 'MOBILITY_ENTRANCE_STEP',    category: 'mobility' },
  { sourceField: 'elevator',     capabilityCode: 'MOBILITY_ELEVATOR',         category: 'mobility' },
  { sourceField: 'restroom',     capabilityCode: 'MOBILITY_ACCESSIBLE_WC',    category: 'mobility' },
  { sourceField: 'braileblock',  capabilityCode: 'VISUAL_TACTILE_PAVING',     category: 'visual' },
  { sourceField: 'helpdog',      capabilityCode: 'VISUAL_GUIDE_DOG',          category: 'visual' },
  { sourceField: 'audioguide',   capabilityCode: 'VISUAL_AUDIO_GUIDE',        category: 'visual' },
  { sourceField: 'bigprint',     capabilityCode: 'VISUAL_LARGE_PRINT',        category: 'visual' },
  { sourceField: 'signguide',    capabilityCode: 'HEARING_SIGN_GUIDE',        category: 'hearing' },
  { sourceField: 'videoguide',   capabilityCode: 'HEARING_VIDEO_GUIDE',       category: 'hearing' },
  { sourceField: 'stroller',     capabilityCode: 'FAMILY_STROLLER',           category: 'family' },
  { sourceField: 'lactationroom',capabilityCode: 'FAMILY_NURSING_ROOM',       category: 'family' },
  // … 나머지 9 필드 + 4 *etc(자유서술 → detail 컬럼) GATE-1 확정 후 추가
];
```

**status 도출 규칙(빈 필드 = unknown, 추론 금지):**

| 원천 값(KTO) | `accessibility_facts.status` | detail |
|---|---|---|
| "Y"/"가능"/내용 있음(긍정) | `supported` | 원문 보존 |
| "일부"/조건부 표현 | `partial` | 원문 보존 |
| "불가"/"없음"(명시적 부정) | `unsupported` | 원문 보존 |
| 빈 문자열/null/필드 부재 | `unknown` | "정보 없음 — 현장 확인 필요" |

각 fact 행: `(poi_id, capability_code, status, detail, source='KorWithService2/detailWithTour2', source_field, verified_at)`. `unknown` 은 F5 갭 리포트로 흘러가고, F1.A 카드에서 (a)본질 제약 vs (b)운영자 미입력 으로 분리 표기(SPEC §7 Null rule).

---

## 4. 타입드 KTO 클라이언트 (`packages/kto-client`)

### 4.1 KtoTransport 인터페이스 (transport = 순수 HTTP, 캐시 없음)

```ts
// packages/kto-client/src/transport.ts
// Single responsibility: build one correctly-encoded URL, do one fetch,
// read body as string first, branch JSON-ok / XML-error. No cache, no retry,
// no quota (those are ETL's job — INV-8). serviceKey decoded from server-only env.

export interface KtoRequestParams {
  readonly [key: string]: string | number | undefined;
}

export type KtoResult<TRaw> =
  | { readonly ok: true;  readonly data: TRaw;  readonly rawBody: string; readonly fetchedAt: string }
  | { readonly ok: false; readonly error: KtoError; readonly rawBody: string };

export interface KtoError {
  readonly kind: 'kto-result' | 'http' | 'parse' | 'network';
  readonly resultCode?: string;   // '03' | '10' | '22' | '30' | '31' …
  readonly resultMsg?: string;
  readonly httpStatus?: number;
}

export interface KtoTransport {
  // serviceId e.g. 'KorWithService2', op e.g. 'detailWithTour2'
  request<TRaw>(serviceId: string, op: string, params: KtoRequestParams): Promise<KtoResult<TRaw>>;
}
```

### 4.2 single-encode 키 + string-first 파싱 규칙

```ts
// Build URL so the HTTP client never re-encodes serviceKey (INV-2).
// Store the DECODING key in env; URLSearchParams encodes exactly once.
function buildUrl(serviceId: string, op: string, params: KtoRequestParams): string {
  const KEY = requireServerEnv('KTO_SERVICE_KEY_DECODING'); // never logged, never to client
  const sp = new URLSearchParams();
  sp.set('serviceKey', KEY);          // encoded once here — do NOT pre-encode
  sp.set('MobileOS', 'ETC');
  sp.set('MobileApp', 'ModuBaekje');
  sp.set('_type', 'json');
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  return `${KTO_GATEWAY}/${serviceId}/${op}?${sp.toString()}`;
}
```

**string-first 파싱 (INV-3):** ① `const body = await res.text()` ② `body.trimStart().startsWith('<')` → XML 분기(에러 봉투 또는 XML payload), 아니면 `JSON.parse` ③ `response.header.resultCode` 검사 → `00/0000` 외는 `{ok:false, error:{kind:'kto-result', resultCode}}`. JSON 요청에도 에러는 XML 로 오므로 `JSON.parse` 를 try/catch 로 감싸 실패 시 XML 에러 파서로 폴백. **serviceKey 는 로그·에러 메시지에서 마스킹**(`buildUrl` 결과를 그대로 로깅 금지).

### 4.3 Zod 스키마 — passthrough + 식별자 strict

```ts
// packages/kto-client/src/schemas/korService.ts
// passthrough(): KTO adds/removes fields per version — never drop unknown keys.
// strict only on the identifiers the domain joins on.
import { z } from 'zod';

export const AreaBasedItem = z.object({
  contentid:     z.string().min(1),     // identifier — strict
  contenttypeid: z.string().min(1),     // identifier — strict
  title:         z.string(),
  mapx:          z.string().optional(), // string-first: KTO returns numbers as strings
  mapy:          z.string().optional(),
  modifiedtime:  z.string().optional(), // 'yyyyMMddHHmmss'
  firstimage:    z.string().optional(),
  cpyrhtDivCd:   z.string().optional(),
  lDongRegnCd:   z.string().optional(),
  lDongSignguCd: z.string().optional(),
  lclsSystm1:    z.string().optional(),
}).passthrough();

export const KtoEnvelope = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    response: z.object({
      header: z.object({ resultCode: z.string(), resultMsg: z.string() }),
      body: z.object({
        items: z.union([
          z.object({ item: z.array(item) }),
          z.object({ item: item }),       // single-item: KTO returns object not array
          z.literal(''),                  // no-data (resultCode 03): items === ''
        ]),
        numOfRows: z.coerce.number().optional(),
        pageNo:    z.coerce.number().optional(),
        totalCount:z.coerce.number().optional(),
      }),
    }),
  });
```

**string-first 원칙:** KTO 는 좌표·카운트를 문자열로 반환 → Zod 에서 `z.string()` 으로 받고 정규화 단계에서 숫자 변환(`z.coerce` 는 envelope 메타에만). `items.item` 이 단일이면 object, 복수면 array, no-data 면 `''` → union 으로 흡수.

### 4.4 서비스 래퍼 (per-op 타입드 함수, 정규화 fact 반환)

```ts
// packages/kto-client/src/services/korWith.ts
export interface KtoClient {
  // each returns normalized facts carrying source provenance (INV-6)
  getBarrierFree(contentId: string): Promise<BarrierFreeFacts>;       // detailWithTour2
  getPoiList(filter: PoiListFilter): Promise<PoiListItem[]>;          // areaBasedList2/Sync2
  getDetailCommon(contentId: string): Promise<PoiCommon>;
  getImages(contentId: string): Promise<PoiImage[]>;                  // detailImage2
  getDocentStories(p: { xCoord: string; yCoord: string; langCode: Locale; radius: number }): Promise<DocentStory[]>; // Odii
  getCrowdIndex(p: { areaCd: string; signguCd: string; tAtsNm: string }): Promise<CrowdSnapshot>; // TatsCnctr
  getVisitorTrends(p: { startYmd: string; endYmd: string }): Promise<VisitorRow[]>; // DataLab
  getRelated(p: { baseYm: string; areaCd: string; signguCd: string }): Promise<RelatedPoi[]>;     // TarRlteTar1
  getGallery(keyword: string): Promise<GalleryPhoto[]>;              // PhotoGallery1
  getMultilingual(p: { service: 'Eng'|'Jpn'|'Chs'|'Cht'; contentId: string }): Promise<LocalizedContent>;
  // bootstrap-once
  fetchLDongCodes(lDongRegnCd?: string): Promise<CodeMapping[]>;     // ldongCode2
  fetchLclsSystmCodes(): Promise<CodeMapping[]>;                     // lclsSystmCode2
}
```

각 메서드는 `KtoTransport.request` → Zod 검증 → 정규화(`source/sourceField/sourceUpdatedAt/ingestedAt` 부착). **정규화 결과만 ETL 로 노출**; raw 는 `source_records.raw_payload` 로 따로 적재.

### 4.5 fixtures + contract tests (INV-8)

```
packages/test-fixtures/kto/
  KorWithService2.detailWithTour2.공산성.json      # 실 응답 저장(masked serviceKey)
  KorWithService2.detailWithTour2.empty.json       # 빈 무장애 필드 케이스
  KorService2.areaBasedSyncList2.gongju.json
  Odii.storyLocationBasedList.busosanseong.en.json
  Odii.storyLocationBasedList.empty.json           # 커버리지 없는 POI
  *.error.code22.xml                               # XML 에러 봉투(트래픽 초과)
  *.error.code30.xml                               # 이중 인코딩 키
```

**Contract test (`tests/contract/kto.spec.ts`):** fixtures 를 `KtoTransport` 모킹에 주입 → 래퍼가 정규화 fact 를 정확히 산출하는지 + Zod passthrough 가 unknown key 를 보존하는지 + XML 에러 봉투가 `{ok:false, resultCode}` 로 변환되는지 + single-item object 가 array 로 정규화되는지 검증. **live API 없이 CI 에서 항상 실행**. fixture 갱신은 `scripts/refresh-fixtures.ts`(수동, dev 키, serviceKey 마스킹 후 커밋).

---

## 5. 이미지·라이선스 처리

**HTTP / mixed-content:** 대부분 KTO 이미지는 `http://tong.visitkorea.or.kr/cms/...` (HTTP). 일부 행사 이미지 HTTPS. **처리:** ① ETL 시 가능하면 Supabase Storage 로 미러(공공누리 1유형 한정, Type3/4 는 변형·재배포 금지 → URL 만 저장 + 프록시) ② 런타임은 `next/image remotePatterns` 또는 HTTPS 프록시 Route 로 mixed-content 회피. CSP `img-src` 에 프록시 도메인만.

**cpyrhtDivCd 매핑 → render policy:**

| `cpyrhtDivCd` | KOGL 유형 | render policy(`poi_media.transform_policy`) |
|---|---|---|
| `Type1` | 1유형 | 출처표시 + 리사이즈/크롭 OK |
| `Type3` | 3유형 | 출처표시 + **변경금지**(no crop/filter/watermark/AI-augment) |

PhotoGalleryService1 은 전부 1유형. `detailImage2` 는 Type1/Type3 혼재 → 이미지별 `cpyrhtDivCd` 저장 필수. 모든 이미지 카드에 inline attribution.

---

## 6. ETL 파이프라인 (GitHub Actions; SPEC §2.10, §4)

### 6.1 4단계: ingest → normalize → validate → publish (txn)

```
.github/workflows/kto-etl.yml  (schedule: KST 04:00 = '0 19 * * *' UTC; workflow_dispatch)
 ├─ ingest    : KtoClient → source_records(raw_payload, hash, fetched_at), ingest_runs row
 │              증분: areaBasedSyncList2 modifiedtime>last & showflag=1; Odii/photo sync ops
 ├─ normalize : raw → 정규화 (pois, poi_translations, poi_media, accessibility_facts, context_snapshots …)
 ├─ validate  : Zod + content-schema 게이트 + dataset 무결성(필수 6 POI 존재, geom 유효, license 코드 존재)
 └─ publish   : 단일 트랜잭션 — dataset_versions(published_version++) 갱신 + read-model 스왑
                → HMAC 서명으로 /api/internal/revalidate 호출 → revalidateTag('poi:all')
```

**INV-4 보장:** ingest/normalize 는 `source_records`·staging 만 건드린다. publish 트랜잭션이 커밋되어야만 public read-model(`pois.visibility='published'` 등)이 바뀐다. 어느 단계든 실패하면 publish 미실행 → **직전 성공 publish 그대로 서빙**. `ingest_runs.status ∈ {running,succeeded,failed}` 기록.

### 6.2 증분 규칙

| 데이터셋 | 증분 키 | 규칙 |
|---|---|---|
| POI master | `modifiedtime` + `showflag` | `areaBasedSyncList2`, `modifiedtime` > `dataset_versions.published_at` 인 항목만 fetch; `showflag=0` → `visibility='hidden'`; `oldContentid` → rename 매핑 |
| 무장애 facts | per-POI `detailWithTour2` | 6 POI 고정 + 신규 추가 POI. modifiedtime 변동 시만 재호출 |
| 이미지/사진 | `gallerySyncDetailList1` showflag | sync op 의 showflag 필터 |
| 볼셔틸(crowd/visitor) | 시간 기반 | TatsCnctr/DataLab 은 짧은 주기 스냅샷, `context_snapshots.effective_period` 부착 |

### 6.3 HMAC revalidate 엔드포인트

```ts
// apps/web/src/app/api/internal/revalidate/route.ts
// HMAC-protected internal endpoint — only the ETL workflow can trigger revalidation.
export async function POST(req: Request) {
  const sig = req.headers.get('x-etl-signature');
  const body = await req.text();
  if (!sig || !timingSafeEqualHmac(body, sig, requireServerEnv('ETL_HMAC_SECRET'))) {
    return new Response('forbidden', { status: 403 });
  }
  const { tags } = JSON.parse(body) as { tags: string[] };
  for (const t of tags) revalidateTag(t);   // 'poi:all', 'poi:{id}', 'rto:dashboard'
  return Response.json({ ok: true });
}
```

GitHub Actions 가 publish 커밋 후 `ETL_HMAC_SECRET` 로 body 서명 → 이 엔드포인트 호출. 서명 불일치 = 403. revalidate 실패는 비치명적(bounded TTL 이 결국 회수, SPEC §2.10).

### 6.4 scheduler 분리 (SPEC §2.10)

- **GitHub Actions** = heavy batch(전체 ingest→publish, 일 1회 + 수동).
- **Vercel Cron** = short refresh 만(crowd/visitor 짧은 주기 스냅샷). GH Actions 가 무거운 잡, Vercel Cron 은 짧은 잡 — 둘 다 HMAC 내부 엔드포인트 경유 revalidate.

---

## 7. MVP 외부 데이터 셋 (SPEC §2.15) — `packages/public-data-clients`

> KTO 부재 영역(현장 도보·SOS·점자/수어·안전·RTO 근거)을 채운다. 24종 중 MVP 는 아래만; 나머지 → 발전방향. 각 클라이언트는 KtoTransport 와 동일 패턴(string-first, Zod passthrough, fixtures).

| 데이터셋 | portal URL | op/필드 | 소비 feature | 라이선스 |
|---|---|---|---|---|
| **BF인증(장애물 없는 생활환경)** | `bfreelife.or.kr` (data.go.kr 연계) | 인증 등급(예비/일반/우수) → `poi_certifications` | **F1.D Layer C**(+0.02/+0.05/+0.08) · F1.A 등급 배지 | 공공데이터 |
| **국가유산청 OpenAPI** | `cha.go.kr/openapi` · `data.go.kr/data/15034324` | 지정문화재 현황·공식 해설·史 지정번호 → `docent_stories`(어른 모드) | **F2 어른 모드 메타** · F4 PDF 공식 해설 | 공공누리 1·4유형 |
| **기상청 단기예보 + 특보** | `apihub.kma.go.kr` (`getVilageFcst`,`getWthrWrnList`) | LCC 격자 변환 필요; 폭염/우천/특보 → `context_snapshots.weather` | **F1.D timeContext** · 폭염/우천 시 실내 대체 동선 · F1.F-3 카운트다운 | 1,000회/일 별도 키 |
| **응급의료기관(E-Gen)** | `e-gen.or.kr` · `data.go.kr/dataset/15000563` | 응급실 위치·외국인 안내 → `nearby_facilities(kind='hospital')` | **F1.A 가까운 응급실** · F1.C SOS · F5 외국인 | 공공데이터 |
| **AED 위치** | `data.go.kr/data/15147982` | 좌표·설치장소 → `nearby_facilities(kind='AED')` | **F1.A 안전망**(500m/1km cutoff) · F1.C | 공공데이터 표준 |
| **충남 다도라(DADORA)** | `chungnam.dadora.kr` | 스마트관광 전자지도(시군 POI 보강) | **F1 지도 보강** · F5 RTO 협력 근거 | RTO 협력 |
| **충남 올담(Alldam)** | `alldam.chungnam.go.kr` | 시군 공공시설·재난안전·지역통계 | **F1 보강** · F5 갭 리포트 | KOGL(데이터별 확인, 4유형 가능) |

**KMA 좌표 변환:** KTO/Kakao 는 WGS84, KMA 는 LCC 격자 → ETL 에서 `pyproj`(또는 KMA 제공 공식)로 6 POI 좌표를 격자(nx,ny)로 1회 변환·캐시. **응급/AED cutoff:** 500m(우선)/1km(보조) 반경 `ST_DWithin`.

---

## 8. 라이선스 / KOGL 매트릭스 + most-restrictive-wins (INV-7)

### 8.1 공공누리(KOGL) 유형

| 유형 | 의미 | 변형 | 상업 |
|---|---|---|---|
| 1유형 | 출처표시 | OK | OK |
| 2유형 | 출처+비상업 | OK | 금지 |
| 3유형 | 출처+변경금지 | 금지 | OK |
| 4유형 | 출처+비상업+변경금지 | 금지 | 금지 |

### 8.2 소스별 라이선스 매트릭스

| 소스 | 라이선스 | 규칙 |
|---|---|---|
| KTO PhotoGalleryService1 | 공공누리 1유형 | 출처표시 + 변형 OK |
| KTO detailImage2 | 1유형 多, **Type3 존재** | 이미지별 `cpyrhtDivCd` 저장; Type3=변형금지 |
| KTO Odii/콘텐츠 | Type1 | 출처표시 |
| 국가유산청 | 공공누리 1·4유형 혼재 | **4유형 항목은 as-is only**(F4 PDF 삽입 시 재디자인 금지) |
| 충남 올담 | KOGL(데이터별) | 4유형 가능 → 데이터별 확인 |
| ARASAAC(AAC) | CC BY-NC-SA | 비상업 + 출처 + 동일조건 |
| KS X ISO 7001 픽토그램 | 표준(규범) | KS 형태 준수; ai/eps 유료 → 무료 SVG 별도 |
| Pretendard/Noto | SIL OFL | PDF/앱 임베드 OK |

### 8.3 most-restrictive-wins 핸들링

조합 산출물(F4 학생PDF·합본, F1 지도 카드)의 유효 라이선스 = **소스 중 가장 제한적인 것**. 알고리즘:

```ts
// packages/exports/src/license.ts
// Combined output license = most restrictive of its sources.
type Kogl = 1 | 2 | 3 | 4;
function combineLicense(sources: Kogl[]): { noCommercial: boolean; noDerivative: boolean } {
  const noCommercial = sources.some(t => t === 2 || t === 4);
  const noDerivative = sources.some(t => t === 3 || t === 4);
  return { noCommercial, noDerivative };
}
```

**적용:** 어떤 소스가 변경금지(3/4)면 조합 출력에서 그 asset 을 **변형하지 않고 as-is 삽입**. 비상업(2/4) 소스가 하나라도 있으면 전체 산출물 비상업. **변형 대상(번역·합성·재디자인)에는 OFL/CC-BY/ARASAAC 만 사용**. 산출물마다 출처 카드 자동 삽입(소스별 KOGL 유형 명기).

---

## 9. verify-at-build-time 게이트 (`gate:0`, Foundation 첫 작업; SPEC §11)

> **`gate:0` 은 C2 스트림의 첫 산출물이며 하류 F1/F2 스키마를 동결하기 전 반드시 통과**한다. dev 키로 live 호출 → 결과를 `packages/test-fixtures` 와 `source_code_mappings` 에 기록 → 가설(44/150/760, detailWithTour 키, 공주 signguCd, gateway suffix, Odii 커버리지)을 실측으로 대체. 게이트 산출물 = `scripts/gate0-verify.ts` + 갱신된 fixtures + 코드맵 seed.

| Gate | 검증 대상 | 방법 | 통과 기준 / 산출물 |
|---|---|---|---|
| **GATE-1** | `detailWithTour2` 정확한 필드 키 | guide v4.3 대조 + 6 POI(우선 공산성/부소산성) live probe | 실 응답 키셋 ↔ `KTO_DETAILWITHTOUR_FIELD_MAP` 일치 확인. 불일치 키는 맵 수정 후 동결. fixture 저장 |
| **GATE-2** | lDong 코드(충남/공주/부여) | `ldongCode2?lDongRegnCd=??&lDongListYn=Y` 호출 | 충남 `lDongRegnCd`, 공주·부여 `lDongSignguCd` 실값 → `source_code_mappings` seed. **44/150/760 가설 검증** |
| **GATE-3** | TatsCnctr 공주 `signguCd` | `한국관광공사_..._시군구_코드_정보_v1.0.xlsx` 대조 + 부소산성 호출로 부여 34800 재확인 | 공주 signguCd 확정(TBD 해소) |
| **GATE-4** | gateway suffix(`1`/`2`/무접미) | data.go.kr Swagger / guide zip 대조 | `TatsCnctrRateService`/`DataLabService`/`PhotoGalleryService1`/`Odii` 정확 path 토큰 확정 |
| **GATE-5** | Odii 6 POI 커버리지 | `themeSearchList`/`storyLocationBasedList` 키워드+좌표 probe(4 lang) | POI별 story 존재 여부 매트릭스. 부재 POI → 자체 TTS(heritage meta) 폴백 표시 |
| **GATE-6** | lclsSystm 라벨맵 | `lclsSystmCode2?lclsSystmListYn=Y` | HS/HS01/VE07 등 가설을 실 라벨로 대체(cat→lclsSystm 은 rename 아님) |

`gate:0` 실패 시 하류 스키마 동결 금지. 각 게이트는 fixture 를 남겨 contract test 가 회귀를 잡는다.

---

## 10. C2 스트림 산출물·의존성 (SPEC §9)

| 산출물 | 위치 | 의존 |
|---|---|---|
| `gate:0` 검증 스크립트 + fixtures + 코드맵 seed | `scripts/gate0-verify.ts`, `packages/test-fixtures`, `supabase/seed` | C0(DB Contract v1) |
| `KtoTransport` + `KtoClient` + Zod 스키마 + 정규화 | `packages/kto-client` | C0 KTO Contract v1 |
| 외부 데이터 클라이언트(BF/국가유산/KMA/E-Gen/AED/충남) | `packages/public-data-clients` | C0 |
| ETL 4단계 + 증분 + HMAC revalidate | `packages/etl`, `scripts/{ingest,validate-content,publish}`, `.github/workflows/kto-etl.yml` | kto-client, DB |
| contract tests | `tests/contract` | fixtures |

**의존 그래프(SPEC §9):** `C0 → C1 → C2 → {F1-AD, F2, F5}`. C2 는 ETL 이 publish 하는 read-model 로 F1.A(무장애 카드)·F2(Odii 도슨트)·F5(RTO 대시보드)를 공급. 운영계정(≈100,000/일, 심사 1–3일 + 활용사례 URL) **조기 신청**(Oct 리뷰 한참 전). dev 1,000/op/일 은 하드 ceiling 으로 취급.

---

## 11. Acceptance Criteria (구현 완료 판정)

- [ ] AC-1 `KtoTransport.request` 가 6 POI live 호출에 정상(`00`) 응답, 에러 봉투(code 22/30 XML)를 `{ok:false, resultCode}` 로 변환. (INV-3)
- [ ] AC-2 serviceKey 가 1회만 인코딩(code 30 미발생) + 로그·에러에 키 미노출. (INV-2)
- [ ] AC-3 `detailWithTour2` 응답이 `accessibility_facts` 로 정규화, 빈 필드 = `status='unknown'`(추론 없음). (INV-6, GATE-1)
- [ ] AC-4 모든 정규화 fact 가 `source/sourceField/sourceUpdatedAt/ingestedAt` 보유.
- [ ] AC-5 ETL 이 ingest→normalize→validate→publish 단일 publish 트랜잭션으로 동작; validate 실패 시 직전 publish 유지(public read-model 불변). (INV-4)
- [ ] AC-6 증분 동기화가 `modifiedtime`/`showflag` 로 변경분만 fetch; `oldContentid` rename 추적.
- [ ] AC-7 HMAC 서명 없는 revalidate 호출 403; 서명 일치 시 `revalidateTag` 실행.
- [ ] AC-8 lDong/lclsSystm/공주 signguCd/gateway suffix/Odii 커버리지가 `gate:0` 실측값으로 확정(하드코딩 없음). (INV-5, GATE-1~6)
- [ ] AC-9 다국어 호출이 multilingual contentTypeId(76/78/85…) 사용; `EngService2` + `12` 빈 응답 회귀 테스트 존재.
- [ ] AC-10 Odii 호출이 `xCoord`/`yCoord`/`langCode`/`radius` 사용(`mapX`/`mapY` 아님).
- [ ] AC-11 이미지별 `cpyrhtDivCd` 저장 + Type3 변형금지 render policy; HTTP 이미지 mixed-content 회피(프록시/remotePatterns).
- [ ] AC-12 DataLab F5 화면에 "방문자≠관광객" caveat 상시; `endYmd` = 오늘−4일.
- [ ] AC-13 most-restrictive-wins 조합 라이선스 함수 + 산출물 출처 카드 자동 삽입; 변형 산출물은 OFL/CC-BY/ARASAAC 만.
- [ ] AC-14 contract tests 가 fixtures 로 live API 없이 CI 통과(passthrough unknown-key 보존 포함). (INV-8)
- [ ] AC-15 INV-1 회귀: 클라이언트 번들·RSC·Route Handler 에 `apis.data.go.kr` 직접 호출 부재(grep 게이트).

---

## 12. Open Items (gate:0 가 해소)

1. `detailWithTour2` 정확 키(D1 `restroom`/`parking`/`lactationroom` vs D4 `handicaptoilet`/`handicapparking`/`nursingroom`) — GATE-1.
2. 충남/공주/부여 lDong 값(44/150/760 가설) — GATE-2.
3. TatsCnctr 공주 `signguCd`(부여만 34800 확정) — GATE-3.
4. TatsCnctr/DataLab/PhotoGallery/Odii gateway suffix — GATE-4.
5. 6 POI Odii 스토리 커버리지(4 lang) — GATE-5.
6. lclsSystm 라벨맵(HS/VE07 가설) — GATE-6.
7. 운영계정 승인 리드타임 + 활용사례 URL 등록 시점 — 조기 신청.
