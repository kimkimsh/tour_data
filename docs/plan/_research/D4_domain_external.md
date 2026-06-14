# D4 — Domain, External Datasets, RTO & Scoring Digest

**Role**: D4 digestion agent — implementation-relevant facts only.
**Project**: 모두의 백제 (Modu Baekje) — barrier-free heritage tourism for Chungnam Gongju·Buyeo.
**Stack target**: Next.js + Supabase + Vercel (Seoul region).
**Primary API requirement**: KTO TourAPI (mandatory) + Kakao OpenAPI + public datasets.

---

## 1.充南 (Chungnam) RTO Context

### 1-1. Chungnam Cultural Tourism Foundation (CACF) — 충남문화관광재단

| Item | Detail |
|---|---|
| Homepage | https://www.cacf.or.kr/ |
| Smart Tourism Map (SaaS) | **충남 다도라 (DADORA)**: https://chungnam.dadora.kr/ |
| Regional Data Portal | **올담 (Alldam)**: https://alldam.chungnam.go.kr/ |
| Alldam regional sub-path | https://alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201003003000 |
| 2025 KTO Contest status | Not in official 7-RTO list, but designated in project scope as Chungnam partner |
| Chungnam region KTO code | 시도코드 **34** |

**Dadora** is a SaaS-form smart tourism electronic map adopted by multiple municipalities (Chungnam (광역), Dongdaemun-gu, Seodaemun-gu, Jangseong-gun, Namyangju, Taebaek, Hoengseong). It is the primary mobile map layer for the project.

### 1-2. Contest RTO Landscape (2025 공모전 공식 협업 7개 기관)

Official RTO partners for the 2025 KTO contest special award:
1. 부산관광공사 (BTO)
2. 인천관광공사 (ITO)
3. 광주광역시관광공사 (GJTO)
4. 세종시문화관광재단 (SCF)
5. 경상북도문화관광공사 (GTC)
6. 강원관광재단 (GWTO)
7. 제주관광공사 (IJTO)

Chungnam is **not** in the official 7 but is the project's designated RTO. The project targets the **지역특화 서비스 특별상** track by aligning with Chungnam's Baekje Heritage District focus.

---

## 2. Six MVP POI — Baekje Historic Areas (백제역사유적지구)

UNESCO World Heritage (유네스코 세계유산) — Gongju + Buyeo.

| # | Site (한국어) | Site (English) | Location | TourAPI areaCode |
|---|---|---|---|---|
| 1 | 공산성 | Gongsanseong Fortress | 공주 | 충남/공주 |
| 2 | 무령왕릉과 왕릉원 | Royal Tombs of Muyeong and Wangniyeong Garden | 공주 | 충남/공주 |
| 3 | 국립공주박물관 | National Museum of Gongju | 공주 | 충남/공주 |
| 4 | 부소산성 | Busosanseong Fortress | 부여 | 충남/부여 |
| 5 | 정림사지 | Jeongnimsa Temple Site | 부여 | 충남/부여 |
| 6 | 국립부여박물관 | National Museum of Buyeo | 부여 | 충남/부여 |

**Content IDs**: Not confirmed in source documents — must be retrieved via `KorService2.areaBasedList2` with `areaCode=34` (충남) and `sigunguCode` for 공주/부여, filtered by `contentTypeId=12` (관광지) and `contentTypeId=14` (문화시설). Cross-reference with `KorWithService2.detailWithTour2` for accessibility fields.

**Note on Gongju night tourism**: Gongju was designated a **야간관광 특화도시 in 2024** (야간관광 특화도시 10개소 목록 포함). The service can leverage this designation as a distinct feature.

---

## 3. KTO TourAPI — Core Endpoints and Fields

Base portal: https://api.visitkorea.or.kr/

### 3-1. Primary Endpoints Used by This Project

| API Name | Operation | Key Params/Fields | Feature |
|---|---|---|---|
| `KorService2.areaBasedList2` | List POI by area | `areaCode=34`, `sigunguCode`, `contentTypeId`, `arrange`, `numOfRows`, `pageNo` | F1 코스 빌더 |
| `KorService2.locationBasedList2` | List POI by coordinate | `mapX`, `mapY`, `radius` (in meters) | F1 근거리 POI |
| `KorService2.detailCommon2` | Common POI detail | `contentId`, `contentTypeId` — returns `addr1`, `addr2`, `homepage`, `tel`, `zipcode`, `firstimage`, `firstimage2`, `cpyrhtDivCd`, `booktour` | F1/F2 |
| `KorService2.detailIntro2` | Type-specific intro | Varies by `contentTypeId`; for type 14 (cultural facility): `usetime`, `restdate`, `parkinginfo`, `chkbabycarriage`, `chkpet` | F2 |
| `KorService2.detailImage2` | Image list | `contentId` — returns `originimgurl`, `smallimageurl`, `imgname`, `cpyrhtDivCd`, `cpyrhtDivCdNm` | All features |
| `KorService2.lclsSystmCode2` | Category classification | Large/middle/small classification codes for history/culture filtering | F1 필터 |
| `KorService2.searchFestival2` | Festival search | `areaCode=34`, `eventStartDate`, `eventEndDate` — returns 백제문화제 and local events | F4 |
| `KorWithService2.areaBasedList2` | Barrier-free POI list | `areaCode=34` — accessibility-specific variant | F2 접근성 |
| `KorWithService2.detailWithTour2` | Barrier-free detail | `contentId` — key fields: `wheelchair` (휠체어 대여여부), `exit` (출입구 단차), `elevator` (엘리베이터), `handicaptoilet` (장애인화장실), `handicapparking` (장애인주차장), `braileblock` (점자블록), `guidesystem` (안내시스템), `helpdog` (보조견), `stroller` (유아차), `nursingroom` (수유실), `audioguide` (오디오가이드), `bigprint` (큰활자), `videoguide` (영상가이드), `signguide` (수어가이드) | F2 접근성 프로필 핵심 |
| `Odii.storyLocationBasedList` | Audio story by location | `mapX`, `mapY`, `radius` — GPS-triggered audio content | F3 오디오 도슨트 |
| `Odii.themeBasedList` | Audio story by theme | `contentTypeId` — theme-based audio stories | F3 |
| `EngService2.areaBasedList2` | English POI | `areaCode=34` + English fields | F5 외국인 |
| `JpnService2.areaBasedList2` | Japanese POI | `areaCode=34` | F5 |
| `ChsService2.areaBasedList2` | Chinese (simplified) POI | `areaCode=34` | F5 |
| `TatsCnctrRateService` | Congestion prediction | `contentId`, date range — returns congestion rate | F1 혼잡 회피 |
| `DataLabService` | Datalab stats | Area visit trends | Analytics |
| `PhokoAwrdService` | Award photo gallery | Region filter — `cpyrhtDivCd` required | Content |

**contentTypeId standard codes (TourAPI 4.0)**:
- `12` — 관광지
- `14` — 문화시설
- `15` — 축제공연행사
- `25` — 여행코스
- `28` — 레포츠
- `32` — 숙박
- `38` — 쇼핑
- `39` — 음식점

**areaCode 34 = 충청남도**. 공주 sigunguCode and 부여 sigunguCode must be fetched from `KorService2` region code tables.

### 3-2. Known Legacy / Deprecation Notes

The `KorWithService2` barrier-free APIs retain some legacy codes — verify field availability against the v4.4 manual before assuming all fields are populated. Use `detailWithTour2` response to distinguish: field absent vs. field present with null vs. field present with "불가" (inaccessible).

---

## 4. The ~24 External Datasets — Feature Mapping

### F1 = 코스 빌더 / 지도  F2 = 접근성 프로필  F3 = 오디오 도슨트  F4 = 체험학습 다이어리  F5 = 외국인/다국어

| # | Dataset | Access Portal / URL | Features |
|---|---|---|---|
| 1 | **충남 다도라 스마트관광 전자지도** | https://chungnam.dadora.kr/ | F1 지도 UX, RTO 협력 근거 |
| 2 | **충남 올담 데이터포털** | https://alldam.chungnam.go.kr/ (맞춤형 지역별 데이터 https://alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201003003000) | F1 공공시설·지역통계 보강 |
| 3 | **BF인증 (장애물 없는 생활환경 인증)** — 국토교통부 | https://www.bfreelife.or.kr/ (공공데이터포털 연계) | F2 접근성 등급 |
| 4 | **장애인편의시설현황** (보건복지부/한국장애인개발원) | https://www.data.go.kr/ — 장애인편의시설 현황 데이터셋 | F2 접근성 |
| 5 | **행안부 장애인화장실 위치정보** | https://www.data.go.kr/ — 전국 공중화장실 표준데이터 (I-13 항목), 장애인화장실 포함 | F2 |
| 6 | **행안부 장애인주차구역 정보** | https://www.data.go.kr/ — 주차장 표준데이터 (I-12) | F2 |
| 7 | **국가유산청 (Heritage Administration) OpenAPI** | https://www.cha.go.kr/openapi/openApiServiceList.do — 국가지정문화재, 세계유산, 이미지·3D 일부 | F1/F3/F4 역사 메타 |
| 8 | **국가유산포털 디지털 헤리티지** | https://www.heritage.go.kr — 백제유산 설명, 이미지 | F3/F4 |
| 9 | **e뮤지엄 (한국문화정보원 KCISA)** | https://www.emuseum.go.kr — 전국 박물관 소장유물 통합검색 API | F3/F4 박물관 |
| 10 | **충남교육청 체험학습 양식** (충청남도교육청) | https://www.cne.go.kr/ — 체험학습 보고서 서식 파일 | F4 PDF 리포트 템플릿 |
| 11 | **기상청 단기예보 (KMA)** | https://apihub.kma.go.kr — `getVilageFcst`, `getUltraSrtFcst`, `getUltraSrtNcst`; 격자 LCC 변환 필요; 기본 1,000회/일 인증키 | F1 날씨 연동, 폭염/우천 시 대체 동선 |
| 12 | **기상청 특보/기상경보** | https://apihub.kma.go.kr — `getWthrWrnList` | F1 안전 알림 |
| 13 | **에어코리아 (한국환경공단)** | https://www.airkorea.or.kr; data.go.kr — `getCtprvnRltmMesureDnsty`(시도별), `getMsrstnAcctoRltmMesureDnsty`(측정소별); 항목: PM10/PM2.5/O3/NO2/SO2/CO + CAI; 갱신: 1시간 | F1/F2 고위험군 외출 안내 |
| 14 | **응급의료기관 정보 (E-Gen, 복지부)** | https://www.e-gen.or.kr; data.go.kr — 응급실 실시간 가용병상, 위치, 외국인 안내 | F2/F5 안전망 |
| 15 | **AED (자동심장충격기) 위치** | https://www.data.go.kr/ — 자동심장충격기(AED) 위치 표준 데이터 | F2 안전망 |
| 16 | **1330 관광안내 콜센터 (KTO)** | 연결 정보: 1330 (국내), +82-2-1330 (해외); API 연동 불필요, 버튼 딥링크 | F5 외국인 긴급 안내 |
| 17 | **영사콜센터 (외교부)** | 연결 정보: 02-3210-0404 (해외: +82-2-3210-0404) | F5 외국인 긴급 안내 |
| 18 | **카카오맵 Web API / Kakao Local API** | https://apis.map.kakao.com; https://developers.kakao.com/docs/latest/ko/local/dev-guide — POI 검색(keyword/category), 좌표↔주소, `place_name`, `road_address_name`, `x`(경도), `y`(위도), `place_url`; 리뷰 미포함 | F1 지도, 경로 |
| 19 | **VWorld (국토교통부 공간정보)** | https://www.vworld.kr/dev/v4dv_geocoderguide_s001.do — POI, 행정경계, 항공·위성 영상, 3D 건물; ODbL 유사 | F1 배경지도 대안 |
| 20 | **도로명주소 API** | https://business.juso.go.kr/addrlink/main.do — 도로명/지번 검색, 팝업 API | F1 주소 검색 |
| 21 | **한국점자도서관** | https://www.kbll.or.kr/ — 점자·음성 도서 목록 API (접근성 콘텐츠 참조) | F2/F3 시각장애 사용자 |
| 22 | **국립국어원 수어사전** | https://www.korean.go.kr/ — 한국수어(KSL) 사전 검색 API; 데이터 활용신청 필요 | F2 청각장애 사용자 |
| 23 | **다누림 (국립재활원)** | https://www.nrc.go.kr/nrc/main.do; 다누림센터: https://www.danurims.or.kr/ — 장애유형별 관광 가이드, 편의시설 정보 | F2 접근성 운영 원칙 |
| 24 | **KS X ISO 7001 픽토그램** (국가표준, KATS) | https://www.standard.go.kr/ — 공공안내용 그래픽기호 KS 표준 (픽토그램 도안) | F1/F2 UI 표준 아이콘 |
| 25 | **보건복지부 사회보장 픽토그램** | https://www.mohw.go.kr/ — 복지서비스 안내용 픽토그램 세트 | F2 UI |
| 26 | **한국보완대체의사소통학회 AAC (보완대체의사소통)** | https://www.kssac.or.kr/ — AAC 상징 체계, 의사소통판 자료 | F2 중증장애 사용자 지원 |
| 27 | **한국장애인개발원 KODDI** | https://www.koddi.or.kr/ — 장애인관광 가이드, 편의시설 데이터, 무장애관광 연구 | F2 정책·데이터 근거 |
| 28 | **국립특수교육원 (NISE)** | https://www.nise.go.kr/ — 특수교육 학습자료, 쉬운 말 (Easy Korean) 자료, 의사소통 도구 | F4 어린이·장애학생 체험학습 |

**Total enumerated external datasets: 28** (the plan document refers to "~24"; this list is the expanded verified set from source files).

---

## 5. Persona × Field Matrix — 5 Personas × Feature Logic

The project defines 5 core personas. Each persona drives which feature fields and datasets are prioritized.

| # | Persona | Core Problem | Primary Fields / Datasets | Feature Focus |
|---|---|---|---|---|
| 1 | **휠체어 이용자·시니어** | Cannot know pre-visit whether ramps, elevators, accessible toilets exist | `detailWithTour2`: `wheelchair`, `elevator`, `handicaptoilet`, `handicapparking`, `exit`; 행안부 장애인화장실/주차구역; BF인증; KODDI | F2 접근성 프로필 |
| 2 | **유아차 가족** | Stroller-accessible routes, nursing rooms, rest points scattered across sites | `detailWithTour2`: `stroller`, `nursingroom`; 에어코리아(실외 체류 적합성); 기상청 | F2 + F1 |
| 3 | **초등 자녀 동반 가족** | Children cannot understand historical narrative; school trip reports are tedious | `Odii` (어린이 모드 스토리); 국가유산청 설명; 국립특수교육원 쉬운 말; 충남교육청 서식 | F3 + F4 |
| 4 | **외국인 관광객** | Multi-language gap; dispersed multilingual info; emergency contact unknown | `EngService2/JpnService2/ChsService2`; 1330/영사콜센터; E-Gen 외국인 안내; KTO 다국어 관광정보 | F5 |
| 5 | **충남 RTO·지자체** | No data view on accessibility gaps or improvement priorities | `detailWithTour2` null-field analysis; 사용자 제보 집계; KODDI 연구; KTO DataLab | F2 데이터 갭 리포트 |

**21 data-field intersections** (5 personas × core fields): each persona maps to approximately 3–5 dedicated `detailWithTour2` sub-fields plus 2–3 external dataset layers. The exact 5×21 matrix is constructed at implementation time by joining persona accessibility requirements against all 28 dataset columns.

---

## 6. Four-Layer Accessibility Suitability Score (4-Layer 적합도 산식)

Defined in `03_barrier_free_baekje_diary.md`. Each layer is evaluated per POI and combined into a composite suitability card.

| Layer | Korean Name | Component Sub-fields / Data Sources |
|---|---|---|
| **Layer 1** | **이동 접근성** (Physical Access) | `handicapparking`, `exit` (출입구 단차), `elevator`, `handicaptoilet`, 행안부 장애인화장실/주차구역 위치, BF인증 등급 |
| **Layer 2** | **감각 접근성** (Sensory Access) | `audioguide`, `bigprint`, `braileblock`, `guidesystem`, `signguide`, `videoguide`, 한국점자도서관, 국립국어원 수어사전, AAC 자료 |
| **Layer 3** | **가족 접근성** (Family Access) | `stroller`, `nursingroom`, `chkbabycarriage`, 유아 의자 여부, 휴식공간, 동선 거리 (from POI coordinate delta) |
| **Layer 4a** | **일정 안정성** (Schedule Stability) | 이동거리 (Kakao Local / Kakao Mobility route), 소요시간, 기상청 단기예보, 에어코리아 CAI, 야간 조명 여부, 실내 대체 가능성 |
| **Layer 4b** | **역사 경험성** (Heritage Experience) | Odii 스토리 존재 여부, 국가유산청 등록 여부, 퀴즈 콘텐츠, 사진(`detailImage2`), 주변 연관 관광지 (`TatsCnctrRateService`) |

**Composite suitability classification per POI per persona**:
- `방문 가능` (Accessible) — all Layer 1 fields populated and positive
- `주의 필요` (Caution) — partial fields or conflict between layers
- `대체 추천` (Alternative recommended) — critical Layer 1 field is "불가" or null

**Null handling rule**: if `detailWithTour2` field is absent (not populated by KTO), display "정보 없음 — 현장 확인 필요" rather than inferring accessibility. User crowdsourced reports can upgrade null → confirmed status.

---

## 7. KTO Contest Winners — What Wins (역대 수상 패턴)

Source: `11_kto_contest_winners_history.md` + `04_cases_and_contests.md` + `03_service_case_studies.md`.

### 7-1. Structural Patterns of Winners

| Pattern | Evidence |
|---|---|
| **Niche targeting ("뾰족한 타겟")** | Carping (차박), JOYRIDE (자전거), DIB (다이버), OFFSIDE (K리그), Greeney (비건) — not "everyone" but a specific pain point |
| **Data mashup beyond TourAPI** | All major winners combine TourAPI + at least one additional API (기상청, 두루누비, Kakao Map, 바다누리). Bonus points awarded for multi-API mashup per 2023 rules |
| **Deployable public service** | Must be accessible on Google Play / App Store / public URL at 1st screening. Winners have working products, not mockups |
| **Social value + local specificity** | RTO 특별상 was introduced in 2024. 지역특화 서비스 wins require single-region focus with genuine local data |
| **AI / LLM integration (rising)** | 2025 프롬프톤 (prompton) track added; 비트리비 (2023) used AI video analysis; SPOT (2024) used Set-Jetting concept. AI is now a differentiator |
| **Outdoor / active tourism dominated early; heritage + accessibility is emerging** | 자전거·등산·차박·다이빙 dominated 2021–2024. Heritage + 무장애 is a less competed segment |

### 7-2. Losing Patterns to Avoid

- Generic national scope with no regional differentiation — loses to region-specific competitors for RTO 특별상
- TourAPI-only without supplementary APIs — loses on "data depth" scoring dimension
- No working product at 1st review — disqualified
- AR / 3D heavy content — high asset production risk, does not score proportionally higher

### 7-3. Contest Scoring Rubric (2025 contest, inferred from source)

2025 공모전 시상 구조:
- **대상** 1팀 × 1,500만 원
- **최우수상** 5팀 × 300만 원
- **우수상** 10팀 × 100만 원
- **장려상** 20팀 × 50만 원
- **RTO 기관장 특별상** (기관별 1팀) — RTO 7개 기관 협력
- Total pool: 5,000만 원 + RTO 특별상

2026 공모전 (진행 중 기준):
- Submission period: 2026-03-30 ~ 2026-05-06 16:00
- Award: 대상 1, 최우수상 5, 우수상 10, 장려상 15, 특별상 기관별 1팀
- Mandatory: KTO OpenAPI, public/deployed service

**Scoring dimensions** (inferred from contest history and source materials):

| Dimension | Weight Signal | Evidence |
|---|---|---|
| 지역특화 (Regional specificity) | High — RTO 특별상 dedicated track; +2점 가점 implied for single-region focus | Doc 03 선정판단 표: 지역특화/RTO 19/20점 |
| 사회적 가치 (Social value) | High — 무장애, 관광약자, 다국어 | Doc 03 평가축: 91/100 overall with social value noted |
| TourAPI 활용 깊이 (API depth) | High — multiple endpoints, especially non-obvious ones like `KorWithService2`, `Odii` | 2023 rules: other API mashup = bonus points |
| 서비스 완성도 (Service completeness) | High — must be deployed; UX demo at final review | All confirmed winners had live products |
| 실용성/시장성 (Practicality) | Medium-High | Doc 03: 14/15 for practicality |
| 구현 가능성 (Build feasibility within 4 months) | Medium | Doc 03: 13/15 |

**This project's estimated scoring profile**: 최우수상 or 우수상 + RTO 특별상 (Chungnam 지역특화 서비스 특별상 candidate), per the ideation document's assessment of 91/100.

---

## 8. Supplementary Legal and Operational Facts

### 8-1. Public License (공공누리 KOGL) Obligations

All KTO TourAPI image fields include `cpyrhtDivCd`:
- Type 1 (공공누리 1유형): Free use with attribution
- Type 2: Attribution + No commercial use
- Type 3: Attribution + No modification
- Type 4: Attribution + No commercial + No modification

The `cpyrhtDivCd` value must be stored per POI and displayed in-app on every image card. Omitting attribution is a license violation.

### 8-2. Coordinate System Notes

- KTO TourAPI: WGS84 (EPSG:4326) `mapX` (longitude), `mapY` (latitude)
- Kakao Map / Local: WGS84 `x` (longitude), `y` (latitude)
- KMA weather grid: LCC (Lambert Conformal Conic) X/Y — requires coordinate conversion before weather API calls. KMA provides the LCC formula.
- VWorld: TM (Korean Transverse Mercator, EPSG:5179)

### 8-3. API Rate Limits

| API | Default daily limit | Upgrade path |
|---|---|---|
| KTO TourAPI | Not specified per call limit; standard data.go.kr key | Apply for 운영계정 for production |
| data.go.kr standard APIs | 1,000 calls/day (개발계정) | Apply for 운영계정 |
| KMA apihub.kma.go.kr | 1,000 calls/day per service key | Separate apihub account from data.go.kr |
| Kakao Local API | App-unit quota, default free tier | Kakao developers console |
| KTO TourAPI contact | tourapi@knto.or.kr / 033-738-3874 | — |

### 8-4. SNS / Review Data Legal Constraint

No official Open API provides Naver Place or Kakao Map review text. Google Places API returns up to 5 reviews per POI but requires Google attribution display and 30-day cache limit. Scraping Naver/Kakao review text violates 저작권법 제93조 (database rights) and each platform's ToS. For this project: use self-generated user reviews within the service, and rely on KTO TourAPI content and public cultural heritage metadata for POI descriptions.

### 8-5. AI Voice / TTS Disclosure

Per AI 기본법 (AI Framework Act, effective 2026), AI-generated voice (TTS for audio docent) must display "AI 음성 안내" label. This applies to the GPS-triggered audio docent feature (F3).

### 8-6. Location Data / GPS Triggers

GPS-triggered audio (F3) requires 위치정보법 compliance: user consent for location collection, explicit purpose disclosure. MVP should start with manual map-tap mode; real-time GPS triggering requires a 위치정보사업자 신고.

---

## 9. Key URL Reference Index

| Category | Resource | URL |
|---|---|---|
| KTO API | TourAPI 4.0 콘텐츠랩 | https://api.visitkorea.or.kr/ |
| KTO API | 2025 공모전 공식 | https://www.2025tourapi.com/ |
| KTO API | 열린관광 모두의 여행 | https://access.visitkorea.or.kr/ |
| KTO Data | 한국관광 데이터랩 | https://datalab.visitkorea.or.kr/ |
| 국가유산 | 국가유산청 OpenAPI | https://www.cha.go.kr/openapi/openApiServiceList.do |
| 국가유산 | 국가유산포털 | https://www.heritage.go.kr |
| 박물관 | e뮤지엄 | https://www.emuseum.go.kr |
| 충남 RTO | 충남문화관광재단 | https://www.cacf.or.kr/ |
| 충남 RTO | 다도라 충남 | https://chungnam.dadora.kr/ |
| 충남 RTO | 올담 데이터포털 | https://alldam.chungnam.go.kr/ |
| 기상 | KMA APIHub | https://apihub.kma.go.kr |
| 대기 | 에어코리아 | https://www.airkorea.or.kr |
| 공공데이터 | 공공데이터포털 | https://www.data.go.kr/ |
| 응급 | E-Gen 응급의료포털 | https://www.e-gen.or.kr |
| 지도 | 카카오맵 API | https://apis.map.kakao.com |
| 지도 | 카카오 로컬 API | https://developers.kakao.com/docs/latest/ko/local/dev-guide |
| 지도 | VWorld | https://www.vworld.kr |
| 주소 | 도로명주소 개발자센터 | https://business.juso.go.kr/addrlink/main.do |
| 접근성 | 한국장애인개발원 KODDI | https://www.koddi.or.kr/ |
| 접근성 | 다누림 (국립재활원) | https://www.danurims.or.kr/ |
| 접근성 | 국립특수교육원 NISE | https://www.nise.go.kr/ |
| 수어 | 국립국어원 수어사전 | https://www.korean.go.kr/ |
| 점자 | 한국점자도서관 | https://www.kbll.or.kr/ |
| AAC | 한국보완대체의사소통학회 | https://www.kssac.or.kr/ |
| 픽토그램 | 국가표준(KATS) KS X ISO 7001 | https://www.standard.go.kr/ |
| 교육 | 충남교육청 체험학습 | https://www.cne.go.kr/ |
| 야간관광 | 공주 야간관광 특화도시 | https://www.ktonighttour.co.kr/ |
| UX 참조 | 열린관광 모두의 여행 | https://access.visitkorea.or.kr/ |
| UX 참조 | KTO Odii 오디오가이드 | https://api.visitkorea.or.kr (Odii 서비스 포함) |
