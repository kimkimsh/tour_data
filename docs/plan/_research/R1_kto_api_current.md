# R1 — KTO TourAPI 4.0 현재 실태 검증 (Current Reality Verification)

**Project:** 모두의 백제 (Modu Baekje) — Next.js + Supabase + Vercel (Seoul)
**Scope:** R1 — Verify the CURRENT KTO TourAPI 4.0 ecosystem against official/primary sources.
**Date of research:** 2026-06-13 · **Today:** 2026-06-13
**Primary host:** `https://www.data.go.kr` (공공데이터포털) · API gateway: `http://apis.data.go.kr/B551011/...`
**Verification standard:** Every endpoint/param below is taken from the official data.go.kr OpenAPI detail pages or official data.go.kr notices (NOTICE_*), cross-read in Korean + English. Vendor guide docs (`TourAPI_Guide_*.zip`) referenced where the PDF/Excel is the authority for full field lists.

---

## TL;DR (Korean) — 가장 중요한 사실

1. **KorService2 / KorWithService2 가 현행 표준.** `KorService1`(구버전)은 여전히 응답하지만, **신규 개발은 반드시 `2` 버전(`KorService2`, `KorWithService2`)** 으로 해야 함. data.go.kr `KorService2` 상세 페이지(15101578)는 `areaCode / sigunguCode / cat1 / cat2 / cat3` 파라미터를 명시적으로 **"미사용 항목 — 삭제 예정 (법정동코드 / 분류체계코드로 대체)"** 로 표기. 즉 레거시 코드체계는 **deprecated**.
2. **신 코드체계 = `lDong*` (법정동) + `lclsSystm*` (분류체계).** 지역은 `lDongRegnCd`(시도) + `lDongSignguCd`(시군구), 분류는 `lclsSystm1/2/3`(대/중/소). 신규 오퍼레이션 `ldongCode2`(법정동코드 조회), `lclsSystmCode2`(분류체계코드 조회)가 2026-01-09 공지로 추가됨.
3. **마이그레이션은 "URL 버전 올림 + 90일 후 구 URL 중지" 패턴**으로 서비스마다 개별 진행 중. 예: 반려동물(`KorPetTourService` → `KorPetTourService2`)는 2026-01-09 공지, **구 URL 2026-04-08부터 중지**. 연관관광지/기초지자체(`TarRlteTarService`→`TarRlteTarService1`, `LocgoHubTarService`→`LocgoHubTarService1`)는 2025-05-23 공지, 90일 유지. **단일한 "전체 cat/areaCode 폐지 컷오프 날짜"는 공식 공지에 없음** — 서비스별 롤링 전환임 (Open Question 1 참조).
4. **JSON은 `_type=json` 쿼리 파라미터로 받음** (기본 응답은 XML). 데이터포맷은 공식적으로 `JSON+XML`.
5. **serviceKey 인코딩이 #1 함정.** "Encoding 키"를 그대로 쓰면서 HTTP 클라이언트(예: Spring `RestTemplate`)가 String URL을 **이중 인코딩**(`%2B`→`%252B`)하면 `SERVICE KEY IS NOT REGISTERED ERROR (resultCode 30)` 발생. 해결: URI 객체를 직접 만들어 자동 재인코딩 차단, 또는 디코딩 키 + 빌더 인코딩 일관 적용.
6. **트래픽 한도:** 개발계정 **1,000 건/일**, 운영계정은 활용사례 등록 시 증액 신청 → 통상 **100,000 건/일**. 비용 무료. 개발단계 자동승인 / 운영단계 심의승인.

---

## 1. Service Catalog — Verified Endpoints (B551011 = 한국관광공사)

All services live under the gateway prefix `http://apis.data.go.kr/B551011/`. (HTTPS `https://apis.data.go.kr/...` also works and is used in most 2025 sample code.)

| Service (신버전) | Gateway path | data.go.kr ID | 수정일(Edited) | Guide | Notes |
|---|---|---|---|---|---|
| 국문 관광정보 (Korean Tourism Info) | `/KorService2` | 15101578 | 2026-02-13 | `TourAPI_Guide_(국문)v4.4.zip` | **Primary content source.** 15 ops. ~260k items. |
| 무장애 여행 (Barrier-free) | `/KorWithService2` | 15101897 | 2025-11-25 | `TourAPI_Guide_(무장애)v4.3.zip` | 13 ops + barrier-free info op. ~60k items. |
| 반려동물 동반여행 (Pet Tour) | `/KorPetTourService2` | 15135102 | 2026-01-09 공지 | — | **Migrated from `KorPetTourService`; old URL stops 2026-04-08.** |
| 관광지 오디오 가이드 (Odii) | (see §4) | 15101971 | 2025-07-25 | `TourAPI_Guide_(오디)v4.1.zip` | 한/영/중/일 multilingual; web at odii.kr. |
| 관광사진 (Photo Korea) | `/PhotoGalleryService1`* | 15101914 | 2025-07-25 | `TourAPI_Guide_(관광사진)v4.2.zip` | phoko.visitkorea.or.kr; ~100k photos, 공공누리 1유형. |
| 관광빅데이터/데이터랩 (Big Data / DataLab) | `/DataLabService`* | 15101972 | 2025-05-21 | `TourAPI_Guide_(관광빅데이터)v4.1.zip` | KT(내국인)+SKT(외국인) 이동통신 방문자 수. |
| 관광지 집중률·방문자 추이 예측 (Congestion) | `/TatsCnctrRateService`* | 15128555 | 2025-12-01 | `TourAPI_Guide_(관광지집중률방문자추이예측정보)v4.0.zip` | KT 데이터, 향후 30일 집중률(0–100 상대값). |
| 관광지별 연관 관광지 (Related Attractions) | `/TarRlteTarService1` | 15128560 | 2025-12-01 | `TourAPI_Guide_(연관관광지)v4.1.zip` | Tmap 내비 데이터. **Migrated from `TarRlteTarService` 2025-05-23.** baseYm/areaCd/signguCd. |
| 기초지자체 중심 관광지 (Locgo Hub) | `/LocgoHubTarService1` | 15128559 | — | — | **Migrated from `LocgoHubTarService` 2025-05-23.** baseYm/areaCd/signguCd. |
| 지역별 관광 자원 수요 (Resource Demand) | (DataLab family) | 15152138 | 2025-12-10 | `TourAPI_Guide_(지역별관광자원수요)v4.0.zip` | **NEW 2025-11-12.** 관광수요지수. |

\* **NOT yet read on the live data.go.kr detail page in this pass** — service identity (ID/name/guide) is primary-verified, but the exact gateway suffix string and operation list must be confirmed against the Swagger/guide before coding. See Open Question 2. The English/Korean detail pages for these confirm the *dataset*; the precise gateway path token (e.g. `TatsCnctrRateService` vs `TatsCnctrRateService1`) needs the guide zip to lock down. The `*1`-suffix migration pattern (LocgoHub, TarRlteTar both gained `1`) means a `1` suffix is plausible for the others too.

### Multilingual sibling services (for reference; not in core scope)
Same operation set as KorService, language-prefixed: `EngService2` (영문, ID 15101753), `JpnService`, `ChsService`(중문간체), `ChtService`(중문번체), `GerService`, `FreService`, `SpnService`(서어, 15101811), `RusService`. English 영문 service edited 2025-12-01.

---

## 2. KorService2 — Operations & the Code-System Change (PRIMARY-VERIFIED)

Source: data.go.kr 15101578 (Korean + English detail pages), 2026-02-13 edited.

**15 operations (suffix `2`):**
`areaCode2`, `categoryCode2`, `ldongCode2` (NEW), `lclsSystmCode2` (NEW), `areaBasedList2`, `locationBasedList2`, `searchKeyword2`, `searchFestival2`, `searchStay2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`, `areaBasedSyncList2`, `detailPetTour2`.

### 2.1 The deprecation reality — VERIFIED on the live page

On `locationBasedList2` (and area/keyword/sync ops), the data.go.kr request-parameter table now reads, **verbatim from the official English page**:

- `areaCode` — *"Unused items (to be deleted - replaced with legal district code)"*
- `sigunguCode` — *"Unused items (scheduled for deletion - replaced with legal dong city/county/district code)"*
- `cat1` — *"Unused items (to be deleted - replaced by classification system 1Depth)"*
- `cat2` — *"...replaced by classification system 2Depth"*
- `cat3` — *"...replaced by 3Depth classification system"*

**Replacement parameters (now the canonical filters):**

| New param | Meaning | Sample | Requires |
|---|---|---|---|
| `lDongRegnCd` | 법정동 시도 코드 (province) | `11` (서울) | — |
| `lDongSignguCd` | 법정동 시군구 코드 (city/county/district) | `140` | `lDongRegnCd` |
| `lclsSystm1` | 분류체계 대분류 (1Depth) | `FD` | — |
| `lclsSystm2` | 분류체계 중분류 (2Depth) | `FD01` | `lclsSystm1` |
| `lclsSystm3` | 분류체계 소분류 (3Depth) | `FD010100` | `lclsSystm1`,`lclsSystm2` |

**Response also adds:** `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1`, `lclsSystm2`, `lclsSystm3` on list + common ops (per 2026-01-09 notice).

### 2.2 detailCommon2 simplification (2026-01-09 notice)
The pet-tour notice (NOTICE_0000000004471, 2026-01-09) deleted these **request** flags from `detailCommon`-type ops: `contentTypeId`, `defaultYN`, `firstImageYN`, `areacodeYN`, `catcodeYN`, `addrinfoYN`, `mapinfoYN`, `overviewYN` — i.e. the old "YN toggle" style is being removed; `detailCommon2` now returns the full common block by default. (Notice was for KorPetTourService2 but the same op-shape applies across the KorService2 family; confirm field-by-field against `v4.4` guide.)

### 2.3 Content Type IDs (unchanged across versions)
`12` 관광지 · `14` 문화시설 · `15` 행사/공연/축제 · `25` 여행코스 · `28` 레포츠 · `32` 숙박 · `38` 쇼핑 · `39` 음식점.

### 2.4 Common required params (every KorService2 op)
`serviceKey` (Essential), `MobileOS` (Essential: `IOS`/`AND`/`WEB`/`ETC`), `MobileApp` (Essential, app name string), plus `_type=json` (Optional; omit ⇒ XML). `numOfRows`, `pageNo` optional.

> **Note (MobileOS):** KorService2 page lists `WEB` as a valid MobileOS value; older KorWithService2 page still lists `WIN` (Windows Phone). Use `ETC` for server-to-server to be safe.

---

## 3. KorWithService2 — Barrier-Free (무장애) — `detailWithTour2`

Source: data.go.kr 15101897 (Korean + English), edited 2025-11-25, guide `v4.3`.

- **Service URL:** `http://apis.data.go.kr/B551011/KorWithService2`
- **Operations (suffix `2`):** `areaCode2`, `categoryCode2`, `ldongCode2`, `lclsSystmCode2`, `areaBasedList2`, `locationBasedList2`, `searchKeyword2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`, **`detailWithTour2`** (무장애/배리어프리 정보 조회 = "Barrier-free information inquiry"), `areaBasedSyncList2`.
- **`detailWithTour2`** returns barrier-free accessibility fields for a `contentId` — e.g. wheelchair access, parking for the disabled, accessible restroom, braille guides, audio guidance, elevator, ramps, etc. The **exact field names are in `TourAPI_Guide_(무장애)v4.3.zip`** and were NOT machine-readable from the live HTML table in this pass (the response-element table renders empty in the scraped page). **Action: download `v4.3` guide to lock field names** (Open Question 3). For 모두의 백제's KWCAG/accessibility angle, `detailWithTour2` is the canonical KTO barrier-free source.
- Same `lDong*`/`lclsSystm*` migration applies; legacy `areaCode`/`cat*` still appear but are being deprecated identically to KorService2.

---

## 4. Odii (오디) — Audio Guide — `storyBasedList` / `storyLocationBasedList`

Source: data.go.kr 15101971, edited 2025-07-25, guide `TourAPI_Guide_(오디)v4.1.zip`. 한국어/영어/중국어/일본어. Web: www.odii.kr.

**Open data set (per official description):** 관광지 기본 정보, 관광지 및 이야기 **위치 기반 정보**, 관광지 및 이야기 **키워드 검색 목록**, 정보 동기화 목록.

**Operations (from guide v4.1 — names per the task brief, consistent with the dataset description):**
- `storyBasedList` — 이야기(스토리) 키워드/목록 기반 조회
- `storyLocationBasedList` — 이야기 위치 기반 조회
- plus tourist-spot base list + sync list ops.

**Parameters (per task spec, to confirm against v4.1 guide):** `serviceKey`, `MobileOS`, `MobileApp`, **`langCode`** (language selector — 한/영/중/일), and for location ops `xCoord` / `yCoord` / `radius`.

> The live data.go.kr HTML did not expose the Odii request-parameter table in the scrape (page renders the param table client-side). The dataset description and op shape are primary-verified; **`langCode`, `xCoord`/`yCoord`/`radius` exact spellings must be confirmed from `TourAPI_Guide_(오디)v4.1.zip`** before coding (Open Question 3). Note Odii uses `xCoord`/`yCoord` naming (vs `mapX`/`mapY` in KorService) — a real, easy-to-miss inconsistency.

---

## 5. Specialty / DataLab services

### 5.1 관광지 집중률·방문자 추이 예측 (TatsCnctrRate — congestion)
data.go.kr 15128555, edited 2025-12-01, guide `v4.0`. KT 이동통신 데이터. Returns, per attraction, a **30-day-ahead congestion index** scaled 0–100 (100 = busiest). ML-estimated from 2018+ data; explicitly **not actual headcount**. Useful for 모두의 백제 "혼잡도/추천 방문시기" UX. Exact gateway suffix + op (`/TatsCnctrRateService...`) and params (likely `signguCode`/attraction code + base date) → confirm from guide.

### 5.2 관광빅데이터/데이터랩 (DataLab — visitor counts)
data.go.kr 15101972, edited 2025-05-21, guide `v4.1`. KT(내국인)+SKT(외국인). 광역/기초지자체별 일자별 순방문자 수. Caveat (official): 시도/시군구 집계 기준이 달라 **임의 합산 불가**; '방문자'≠'관광객'. Full notes at `https://datalab.visitkorea.or.kr`.

### 5.3 관광지별 연관 관광지 (TarRlteTarService1) — VERIFIED params
data.go.kr 15128560, edited 2025-12-01. **Migrated: `TarRlteTarService` → `TarRlteTarService1` on 2025-05-23 (90-day grace).**
- **Service URL:** `http://apis.data.go.kr/B551011/TarRlteTarService1`
- **Ops:** `areaBasedList1`, `searchKeyword1`.
- **Required params (verified English page):** `serviceKey`, `pageNo`, `numOfRows`, `MobileOS`, `MobileApp`, `baseYm` (YYYYMM, e.g. `202503`), `areaCd` (e.g. `11`), `signguCd` (e.g. `11530`), optional `_type=json`.
- Data window: 2024-05 ~ 2025-04. Tmap 내비 데이터; 차량 이동 기준이라 실제 연계 방문과 차이.
- Response includes `rlteTatsCd` (연관관광지코드) per 2025-05-23 notice. 전체/관광지/음식/숙박 유형별 최대 50위.

### 5.4 기초지자체 중심 관광지 (LocgoHubTarService1) — VERIFIED params
data.go.kr 15128559. **Migrated: `LocgoHubTarService` → `LocgoHubTarService1` 2025-05-23.**
- **Service URL:** `http://apis.data.go.kr/B551011/LocgoHubTarService1`, op `areaBasedList1`.
- Same required params as 5.3 (`baseYm`/`areaCd`/`signguCd`).

### 5.5 관광사진 (PhotoGallery)
data.go.kr 15101914, edited 2025-07-25, guide `v4.2`. phoko.visitkorea.or.kr, ~100k photos, **공공누리 1유형 (free reuse)**. Returns 사진 제목/촬영일/촬영지/촬영자/키워드/웹용 이미지 URL. Op likely `galleryList1` / keyword search — confirm gateway suffix (`/PhotoGalleryService1`?) from guide.

---

## 6. New Code System — `lclsSystm` (분류체계) & `lDong` (법정동)

### 6.1 lclsSystm structure
- **`lclsSystmCode2`** op (NEW 2026-01-09): list by 1/2/3 Depth. Params: `lclsSystm1`, `lclsSystm2`(req lclsSystm1), `lclsSystm3`(req 1+2), `lclsSystmListYn` (`N`=code search / `Y`=full list).
- Format: 1Depth = 2 chars (e.g. `FD`), 2Depth = 4 chars (`FD01`), 3Depth = 8 chars (`FD010100`).
- **Important caveat:** The new `lclsSystm` codes are a **distinct namespace** from the legacy `cat1/2/3` codes. The legacy `cat` codes (well-documented: `A01` 자연, `A02` 인문, `A03` 레포츠, `A04` 쇼핑, `A05` 음식, `B02` 숙박, `C01` 추천코스; mids like `A0101` 자연관광지, `B0201` 숙박시설, etc.) do **not** equal `lclsSystm` codes — `FD`-style examples on the official page prove the new system uses different prefixes. **Do NOT assume cat→lclsSystm is a simple rename.** Build the mapping from `lclsSystmCode2` output, not from old cat tables (Open Question 4).

### 6.2 lDong (법정동) structure
- **`ldongCode2`** op (NEW 2026-01-09): list legal-dong codes. Params: `lDongRegnCd` (시도; empty ⇒ all provinces), `lDongListYn` (`N`/`Y`).
- Response: `lDongRegnCd`/`lDongRegnNm` (시도), `lDongSignguCd`/`lDongSignguNm` (시군구).
- These are **법정동 (statutory dong) codes**, aligned with the national 법정동 code standard — different numeric values from the legacy KTO `areaCode`(1=서울…)/`sigunguCode`. For 모두의 백제 (백제권 = 충남 부여·공주, 전북 익산 등), map regions via `lDongRegnCd`/`lDongSignguCd`, not legacy areaCode.

---

## 7. JSON vs XML

- **Default response = XML.** Add **`_type=json`** to the query string for JSON. Official data format label: `JSON+XML`. (Some older docs use `&_type=Json` with capital J — lowercase `json` is what the current pages show.)
- A frequent bug: requesting JSON but the gateway returns an XML **error** envelope (e.g. on a key error) → clients expecting JSON throw `no suitable HttpMessageConverter for content type [text/xml]`. Always parse defensively / read the body as String first when debugging.

---

## 8. serviceKey — Encoding Gotchas (the #1 integration failure)

data.go.kr issues two key forms: **일반 인증키 (Encoding)** = URL-encoded, and **(Decoding)** = raw. Both *can* work, but the failure modes are specific:

- **`resultCode 30` / `SERVICE KEY IS NOT REGISTERED ERROR`** most often = **double-encoding**, not an actual bad key. With the Encoding key, `+`→`%2B` is already encoded; if the HTTP client re-encodes the whole String URL, `%2B`→`%252B` and the gateway rejects it.
- **Fixes (verified from 2024–2025 dev posts):**
  - Build a `URI` object directly (e.g. `URI.create(...)` / `UriComponentsBuilder(...).build(true)`) so the client does **not** auto-re-encode.
  - Or use the **Decoding key** and let one encoder encode exactly once — but beware `+` is treated as space by some encoders.
  - Newly issued keys need **a few minutes ~ up to ~1h** to propagate before they validate.
- **Node/fetch (Next.js relevant):** `URLSearchParams` will encode the key; if you pass the already-encoded Encoding key through it you double-encode. Prefer storing the **Decoding** key in env and letting `URLSearchParams`/`new URL()` encode once. (For Next.js server routes: keep serviceKey server-side only — never expose in client bundle; strip it from logs.)
- Quota note (from a 2026 MCP wrapper, leejaew/visitkorea-mcp): treat the 1,000/day dev quota as a hard ceiling; add a token bucket (~10 upstream req/min) + TTL cache (static refs 1h, search 5min).

---

## 9. Quotas, Cost, Key Application

- **Cost:** Free (무료) for all B551011 services.
- **Traffic:** **개발계정 1,000 호출/일.** **운영계정**: register a 활용사례 (use case) then apply for an increase → commonly **100,000/일** (the value shown on KorService2/KorWithService2/TarRlteTar English pages: "Available traffic 100000").
- **Approval:** 개발단계 = 자동승인 (instant). 운영단계 = 심의승인 (review).
- **How to get a key (official, contest-aligned):**
  1. 공공데이터포털 (`https://data.go.kr`) 회원가입/로그인 (PC only for application).
  2. 검색창에 "한국관광공사" → 원하는 API 선택 → **활용신청** 클릭 (이용목적 기재).
  3. **마이페이지 > 데이터 활용 > OpenAPI > 인증키 발급 현황** 에서 Encoding/Decoding 인증키 확인.
  - One application per dataset (KorService2, KorWithService2, Odii, etc. are **separate 활용신청** — apply for each you use).
  - On URL/operation changes, **operating-account users must RE-apply (활용신청)** within the 90-day window or lose access (per every migration notice).
- **KTO TourAPI support:** `tourapi@knto.or.kr` · 033-738-3874 (관광데이터개방서비스 운영팀).

---

## 10. Breaking changes / new operations — 2025–2026 timeline

| Date (notice) | Service | Change |
|---|---|---|
| 2025-05-23 | `TarRlteTarService`→`...Service1`, `LocgoHubTarService`→`...Service1` | URL ver-bump; output fields changed (+`rlteTatsCd`); **old URL stops after 90 days**; re-apply required. |
| 2026-01-09 | `KorPetTourService`→`KorPetTourService2` | URL ver-bump; deleted `listYn` + the `*YN` flags from detailCommon; **added `lDongRegnCd`/`lDongSignguCd`/`lclsSystm1-3` (req+resp)**; added NEW ops `ldongCode2`, `lclsSystmCode2`; **old URL stops 2026-04-08**. |
| ongoing (2025-2026) | KorService2 / KorWithService2 family | `areaCode`/`sigunguCode`/`cat1-3` marked **"미사용 — 삭제 예정"**; replaced by `lDong*` + `lclsSystm*`. Pages edited 2026-02-13 / 2025-11-25. |
| 2025-11-12 | NEW `지역별 관광 자원 수요` (15152138) | New DataLab dataset (관광수요지수). |
| — | 분류/법정동 신기능 안내 | Official guide URL: `https://api.visitkorea.or.kr/#/cmsNoticeDetail?no=207`. |

**There is NO single published "cat1/areaCode hard cutoff date".** Deprecation is **rolling per service** via the ver-bump+90-day pattern. The KorService2 page says "삭제 예정" without a date as of 2026-02-13. **Plan for both: send `lDong*`/`lclsSystm*` going forward, but keep legacy params readable for transitional data.** (Open Question 1.)

---

## 11. Canonical request URL examples (copy-ready)

> Replace `{KEY}` with the **Encoding** serviceKey (and do NOT let your HTTP client re-encode it). `_type=json` for JSON.

**Area-based list (new code system), KorService2:**
```
https://apis.data.go.kr/B551011/KorService2/areaBasedList2
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &numOfRows=20&pageNo=1&arrange=C&contentTypeId=12
  &lDongRegnCd=34&lDongSignguCd=...        # 충남 부여 등 (법정동코드)
  &lclsSystm1=...&lclsSystm2=...           # 분류체계
```

**Location-based list, KorService2:**
```
https://apis.data.go.kr/B551011/KorService2/locationBasedList2
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &mapX=126.9098&mapY=36.2756&radius=5000  # 부여 부소산성 인근, 5km
  &contentTypeId=12&numOfRows=20&pageNo=1
```

**Keyword search, KorService2:**
```
https://apis.data.go.kr/B551011/KorService2/searchKeyword2
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &keyword=백제&numOfRows=20&pageNo=1&arrange=A
```

**Common detail, KorService2:**
```
https://apis.data.go.kr/B551011/KorService2/detailCommon2
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &contentId=126508
```

**Barrier-free detail, KorWithService2:**
```
https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &contentId={contentId}
```

**Odii story location list (param spellings to confirm vs guide v4.1):**
```
https://apis.data.go.kr/B551011/{OdiiServicePath}/storyLocationBasedList
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &langCode=ko&xCoord=126.9098&yCoord=36.2756&radius=5000
```

**Related attractions, TarRlteTarService1 (verified params):**
```
https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1
  ?serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
  &pageNo=1&numOfRows=10&baseYm=202503&areaCd=34&signguCd=...
```

---

## 12. Implications for 모두의 백제 (build guidance)

- **Standardize on `*2` services + `lDong*`/`lclsSystm*` from day one.** Treat legacy `areaCode`/`cat*` as read-only fallback for any cached/legacy records; never emit them as new filters.
- **백제권 regions** map through `ldongCode2` (충남 부여/공주, 전북 익산/전주 등) — fetch the 법정동 code list once and cache.
- **Build the `lclsSystm` ↔ Korean-label map from `lclsSystmCode2`** (do not hardcode from old cat tables).
- **Accessibility (KWCAG angle):** `detailWithTour2` (KorWithService2) is the authoritative KTO barrier-free data source — surface its fields directly.
- **serviceKey hygiene (Next.js/Vercel):** store the **Decoding** key in a server-only env var; encode exactly once with `URLSearchParams`/`new URL()`; never expose to the client; strip from logs. Add caching + a rate limiter (1,000/day dev ceiling).
- **Apply for operating accounts early** (운영계정 심의 + 100k/day) — the contest functional review is Oct 2026, so register a 활용사례 well before launch.

---

## Open Questions / To-Verify-Before-Coding

1. **No single global cutoff date for `cat*`/`areaCode` removal.** Migration is rolling (per-service ver-bump + 90 days). Need: monitor data.go.kr KTO notices; assume legacy params can disappear per-service on ~90-day notice. (Decision: dual-read, single-write-new.)
2. **Exact gateway path tokens** for `TatsCnctrRateService`, `DataLabService`, `PhotoGalleryService`, and Odii — the live HTML param tables rendered empty in scraping. Confirm `1`-suffix vs no-suffix and op names from the official guide zips / Swagger UI on data.go.kr.
3. **Field-level specs** for `detailWithTour2` (barrier-free fields) and Odii (`langCode`/`xCoord`/`yCoord`/`radius` spellings, `storyBasedList`/`storyLocationBasedList` param sets) must be read from `TourAPI_Guide_(무장애)v4.3.zip` and `TourAPI_Guide_(오디)v4.1.zip` — the live pages don't expose them.
4. **`cat` → `lclsSystm` mapping is NOT a rename.** Generate the mapping empirically from `lclsSystmCode2` + `categoryCode2` output; do not assume `A01`≈`FD` etc.
5. **HTTPS vs HTTP gateway:** docs show `http://apis.data.go.kr`; 2025 sample code widely uses `https://`. Confirm TLS works for all needed services (it generally does) — required for Vercel/HTTPS-only fetch.

---

## Sources (every URL consulted)

**Official — data.go.kr OpenAPI detail pages (PRIMARY):**
- 국문 관광정보 KorService2 (KR): https://www.data.go.kr/data/15101578/openapi.do
- 국문 관광정보 KorService2 (EN, shows deprecation text): https://www.data.go.kr/en/data/15101578/openapi.do
- 무장애 KorWithService2 (KR): https://www.data.go.kr/data/15101897/openapi.do
- 무장애 KorWithService2 (EN): https://www.data.go.kr/en/data/15101897/openapi.do
- 오디오 가이드 Odii (KR): https://www.data.go.kr/data/15101971/openapi.do
- 관광사진 PhotoKorea (KR): https://www.data.go.kr/data/15101914/openapi.do
- 관광빅데이터/데이터랩 (KR): https://www.data.go.kr/data/15101972/openapi.do
- 관광지 집중률·방문자 추이 예측 (KR): https://www.data.go.kr/data/15128555/openapi.do
- 관광지별 연관 관광지 TarRlteTarService1 (KR): https://www.data.go.kr/data/15128560/openapi.do
- 관광지별 연관 관광지 TarRlteTarService1 (EN, verified params): https://www.data.go.kr/en/data/15128560/openapi.do
- 기초지자체 중심 관광지 LocgoHubTarService1 (EN): https://www.data.go.kr/en/data/15128559/openapi.do
- 지역별 관광 자원 수요 (KR, NEW 2025-11): https://www.data.go.kr/data/15152138/openapi.do
- 서어 관광정보 SpnService (KR): https://www.data.go.kr/data/15101811/openapi.do

**Official — data.go.kr notices (PRIMARY, breaking changes):**
- 2026-01-09 KorPetTourService2 + ldongCode2/lclsSystmCode2 new ops, old URL stops 2026-04-08: https://www.data.go.kr/en/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004471
- 2025-05-23 TarRlteTar/LocgoHub ver-bump (90-day): https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000004109

**Official — KTO / 정부24 / DataLab:**
- 한국관광콘텐츠랩 (api.visitkorea.or.kr; 2026 공모전 일정, key-application steps): https://api.visitkorea.or.kr/
- 신규 상세기능(법정동/신분류) 안내: https://api.visitkorea.or.kr/#/cmsNoticeDetail?no=207
- 한국관광 데이터랩: https://datalab.visitkorea.or.kr/
- 정부24 TourAPI 서비스 안내: https://www.gov.kr/portal/service/serviceInfo/B55101100003
- 2025 공모전 안내 (key-application steps, 트래픽): https://www.2025tourapi.com/sub/sub01.html

**Secondary — dev write-ups (serviceKey encoding, code maps, usage; corroborating only):**
- SERVICE_KEY 이중인코딩 해결 (marinesnow34, 2024-09): https://marinesnow34.github.io/2024/09/18/data-go-kr/
- Tour API 인코딩 (velog gktmzl12, 2025-08): https://velog.io/@gktmzl12/Tour-API-사용하기
- resultCode 30 원인 (devfrom2ne1, 2025-01): https://devfrom2ne1.tistory.com/146
- KorService2 마이그레이션 + 컬럼 (GitHub jangjangji/dataset-): https://github.com/jangjangji/dataset-
- KorService2 MCP wrapper (GitHub dusagong/korail_mcp_server, 2025-12): https://github.com/dusagong/korail_mcp_server
- EngService2 MCP + key normalization/rate-limit (GitHub leejaew/visitkorea-mcp, 2026-04): https://github.com/leejaew/visitkorea-mcp
- 5-API detail flow + params (velog seongmin0302): https://velog.io/@seongmin0302/api
- 국문 서비스 op 명세 v4.2 (velog i_jdk, 2024-05): https://velog.io/@i_jdk/한국관광공사-국문관광정보서비스-문서
- cat1/2/3 → 한글 태그 매핑표 (jetivelop, 2025-04): https://jetivelop.tistory.com/18 · https://jetivelop.tistory.com/17
- 다국어 서비스 prefix 목록 (GitHub dryadsoft/node-public-data-tour-api): https://github.com/dryadsoft/node-public-data-tour-api
- TourAPI 이용 안내 (정책스터디, 2026-02): https://studygov.kr/blog/13071-tourism-info-service/
- areaBasedList1 호출 예시 (codding-child, 2023): https://codding-child.tistory.com/41
