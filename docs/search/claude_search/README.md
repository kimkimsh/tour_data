# 한국 국내 관광 데이터 활용 웹·앱 서비스 — 종합 리서치 자료실

> **목적**: 2026 한국관광공사 관광데이터 활용 공모전(① 웹·앱 개발 부문, 마감 2026.05.06 16:00) 준비를 위한 심층 리서치 자료 모음.
>
> **작성 원칙**: 사용자 지시에 따라 **아이디에이션(아이디어 제안) 일체 배제, 순수 조사·팩트 정리만 수록**.
>
> **자료 규모**: 32개 MD 파일 / 약 **13,088줄 / 752KB**. 모든 사실은 1차 출처 URL 부착.
>
> **작성 도구**: Claude Code (Opus 4.7) 8개 도메인 전문 리서치 에이전트 병렬 실행.
>
> **작성일**: 2026-05-03 (마감 D-3)

---

## 📋 빠른 참조 (Quick Reference)

| 트랙 | 파일 범위 | 주제 | 분량 |
| --- | --- | --- | --- |
| **0. 공모전** | `00` | 공모요강 사실 정리 | 229줄 |
| **A. KTO API** | `01~03` | TourAPI 4.0/4.4, 엔드포인트, 코드체계 | 2,011줄 |
| **B. 빅데이터·AI** | `04~06` | 한국관광 데이터랩, 빅데이터 소스, AI/LLM 트렌드 | 1,369줄 |
| **C. 경쟁환경** | `07~10` | KTO 직영, 국내·글로벌 OTA, 버티컬 | 1,595줄 |
| **D. 공모전 사례** | `11~13` | 역대 수상작, 타 공공데이터 공모전, KTO 스타트업 | ~800줄 |
| **E. 기술 스택** | `14~18` | 프론트, 백엔드, 지도, 인증·결제, AI 통합 | 2,072줄 |
| **F. 지역 RTO** | `19~22` | 8개 특별상 RTO, 광역시도, 데이터 플랫폼, 지역사업 | 1,619줄 |
| **G. 법규·정책** | `23~26` | KOGL, 개인정보, 관광진흥법, 접근성/AI기본법 | 1,205줄 |
| **H. 분석·UX·미디어** | `27~31` | 시각화, 미디어, 리뷰/SNS, UX 패턴, 부가 API | 2,169줄 |

---

## 0. 공모전 정보 (필독)

| 파일 | 내용 |
| --- | --- |
| ✅ [`00_contest_overview.md`](./00_contest_overview.md) | **2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 공식 요강** — 일정, 시상규모(총 4,250만원/31팀), 심사기준(1차/최종), 가점, 특별상 RTO 8개(부산·대전·광주·세종·충남·경북·강원·제주), 제안서 양식(5p PDF), 유의사항, 충족요건 체크리스트 |

---

## A. KTO TourAPI · 공급 인프라

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 01 | ✅ [`01_kto_tourapi_overview.md`](./01_kto_tourapi_overview.md) | KTO 27개 OpenAPI 카탈로그, 4채널 구조(공공데이터포털·콘텐츠랩·데이터랩·구석구석), 발급/트래픽(개발 1,000건/오퍼레이션·일, 운영 24개월), 무료, TourAPI 1.0→4.4 변천 |
| 02 | ✅ [`02_tourapi_4_endpoints.md`](./02_tourapi_4_endpoints.md) | **964줄 — 모든 오퍼레이션 정확한 URL/파라미터/응답/샘플 호출**: KorService2 13개 + 다국어 8종×12개 + KorWithService2 13개 + KorPetTourService2 11개 + 특화(생태/웰니스/의료/사진/오디/캠핑/두루누비) + 빅데이터 9종 |
| 03 | ✅ [`03_tourapi_codes_schema.md`](./03_tourapi_codes_schema.md) | 법정동 시도(17)·시군구(250+) 코드, contentTypeId 국문↔다국어 매핑, **신분류체계 lclsSystm 11/62/240 트리** (AC숙박/EV행사/EX체험/FD음식/HS역사/LS레저스포츠/NA자연/SH쇼핑/VE문화/C01추천코스), legacy A/B categoryCode 8/20/152, detailIntro2 130+필드 |

> 🔥 **핵심 알림 — TourAPI 4.4 (2026-02-10) 마이그레이션**: 국문 KorService2에서 `areaCode2`/`categoryCode2` 오퍼레이션과 `areaCode`/`sigunguCode`/`cat1/2/3` 응답 필드 **삭제**. 이제 `lDongRegnCd`/`lDongSignguCd` + `lclsSystm1/2/3` 단일 체계. 다국어/특화는 2025-12-31까지 legacy 한시 유지. **신규 서비스는 신분류체계로 시작 필수**.

---

## B. 빅데이터 · AI 인프라

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 04 | ✅ [`04_korea_tourism_datalab.md`](./04_korea_tourism_datalab.md) | 한국관광 데이터랩 — 4개 데이터 소스(KT 내국인 통신·SKT 외국인 통신·신한카드·TMAP 내비), 갱신 지연(통신 4일/카드 11일/내비 6일), `data.go.kr` 무료 OpenAPI(15101972) |
| 05 | ✅ [`05_tourism_bigdata_sources.md`](./05_tourism_bigdata_sources.md) | 공공/민간 빅데이터 — 공공데이터포털, 지자체 빅데이터(제주데이터허브/부산빅데이터플랫폼/서울 열린데이터광장), 한국문화정보원, 통계청 |
| 06 | ✅ [`06_ai_llm_tourism_trends.md`](./06_ai_llm_tourism_trends.md) | AI/LLM 관광 트렌드 — Visit Seoul AI(베스핀 RAG, 2025.02), 광집사(딥파인 XR+VPS+AI), 글로벌 에이전틱 AI(TripGenie/Romie/Kayak AI Mode), **AI 여행 활용률 한국 15%(2023 3Q)→45%(2025 1Q)** |

---

## C. 경쟁 서비스 환경

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 07 | ✅ [`07_kto_official_services.md`](./07_kto_official_services.md) | KTO 직영 17개 카테고리 — 대한민국 구석구석/Imagine Your Korea/두루누비/고캠핑/열린관광/한국관광 데이터랩/콘텐츠랩/품질인증(KQ)/우수웰니스관광지/디지털 관광주민증/한국관광 100선/K-스마일/관광e배움터/관광지식정보시스템 |
| 08 | ✅ [`08_domestic_ota_landscape.md`](./08_domestic_ota_landscape.md) | 국내 OTA — **놀유니버스(NOL=야놀자+인터파크+트리플 통합법인 2024.11)**, 여기어때, 마이리얼트립(첫 흑자 1,120억 매출 2025), 패키지 빅4(하나/모두/노랑/참좋은) |
| 09 | ✅ [`09_global_ota_in_korea.md`](./09_global_ota_in_korea.md) | 글로벌 OTA — Booking Holdings(Booking/Agoda/KAYAK), Expedia(Hotels.com/Vrbo), Trip.com Group(Skyscanner), Airbnb 한국 규제, Klook/KKday/GetYourGuide |
| 10 | ✅ [`10_vertical_specialty_services.md`](./10_vertical_specialty_services.md) | 버티컬 — 광역 RTO 디지털, 큐레이션 숙박(스테이폴리오/위홈), 일정 플래너(위시빈/Wanderlog), 모빌리티(카카오T 케이라이드/TMAP/코레일톡), 결제(트래블월렛), AI 여행 플래너 |

> 🔥 **핵심 변별 포인트**: TourAPI는 **메이저 OTA(NOL/여기어때/마이리얼트립/하나/모두/노랑)가 사용 안 함**. 활용은 공공기관(서울교통공사 또타지하철, 한국공항공사) + 스타트업(다님/덕픽/말타) + KTO 공모전 출품작에 집중.

> 🔥 **2025 한국 OTA 시장 대격변**: 11월 기준 이용 경험률 1위 **아고다(17%)**, NOL 11%로 4위 추락. 글로벌 OTA 강세, 국내 OTA 약세.

---

## D. 공모전 수상작 · 스타트업 사례

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 11 | ✅ [`11_kto_contest_winners_history.md`](./11_kto_contest_winners_history.md) | KTO 공모전 역대 수상작 (2018~2025, 약 60개 명단 확인, 전체 250개+ 추정), 2025 생성형 AI 프롬프톤 4팀, 데이터랩 우수사례, 부산 DIVE 2025 |
| 12 | ✅ [`12_other_public_data_contests.md`](./12_other_public_data_contests.md) | 타 공모전 — 공공데이터 활용 창업경진대회, 문화데이터 활용 공모전, 국토교통 데이터 활용 경진대회, K-Geo, 지역 RTO 자체 공모전 |
| 13 | ✅ [`13_kto_tourism_startups.md`](./13_kto_tourism_startups.md) | KTO 지원 관광 벤처/스타트업 — 관광벤처사업, 관광기업지원센터, 관광액셀러레이팅, THE VC 등록 21개사 |

> 🔥 **사업화 성공 모델**: 짐캐리(2022 활용공모전 최우수→2023 관광벤처 장관상), 럭스테이(2018 대상→블루웨일컴퍼니 사업화), 트래블월렛(글로벌챌린지→197억 투자), 트립비토즈(관광벤처→해외 진출).

> 🔥 **데이터 스택 표준화**: TourAPI(필수) + 카카오 OpenAPI(지도/로그인/내비) + 공공데이터(기상청/두루누비/바다누리) — 사실상 수상작 공식 콤비.

---

## E. 개발 기술 스택

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 14 | ✅ [`14_frontend_tech_stack.md`](./14_frontend_tech_stack.md) | 웹/모바일 프론트 — Next.js 15(App Router), React 19, Vue/Nuxt, **RN(Expo SDK 53)/Flutter**, Tailwind+shadcn/ui, i18n(next-intl/i18next), TanStack Query+Zustand+Jotai+RHF+zod 표준 |
| 15 | ✅ [`15_backend_database_infra.md`](./15_backend_database_infra.md) | 백엔드/DB — Node(NestJS/Hono), Python(FastAPI), Spring, **Postgres+PostGIS, Supabase**, Redis, Elasticsearch nori/Meilisearch/Typesense, **pgvector 우위**, 호스팅(Vercel/AWS/NCP/Kakao Cloud) |
| 16 | ✅ [`16_map_location_services.md`](./16_map_location_services.md) | **카카오·네이버·TMAP·구글·VWorld 지도 완전 비교** (가격/쿼터/SDK), 좌표계(WGS84/Bessel TM/Katec/UTM-K) |
| 17 | ✅ [`17_auth_payment_messaging.md`](./17_auth_payment_messaging.md) | **PortOne(아임포트) V2 = 한국 결제 통합 표준**, 카카오/네이버/구글/애플 OAuth, 토스페이먼츠/카카오페이/네이버페이, **카카오 알림톡 2026.1 개편**(8원/건), FCM/APNs, 본인인증(PASS/NICE) |
| 18 | ✅ [`18_ai_llm_integration_stack.md`](./18_ai_llm_integration_stack.md) | AI/LLM — **Claude Opus 4.7 토크나이저 변경**(35% 토큰↑), GPT/Gemini/HyperCLOVA X/Solar Pro, Vercel AI SDK, LangChain/LlamaIndex, RAG 패턴, 임베딩(KURE-v1/BGE-M3), Whisper/Clova Voice, Papago/DeepL |

> 🔥 **카카오맵 80% 한정 할인 (2026.2.2~12.31)**: 정상가 50원/건 → **10원/건**. 추가 쿼터 0.1원/건. 공모전 데모/심사(2026.10) 까지 비용 거의 무시 가능.

> 🔥 **VWorld(국토교통부) = 완전 무료 + 상업이용 가능** (2D/3D/벡터/지오코더 모두). 비용 압박 시 카카오/네이버 대체 핵심 옵션.

> 🔥 **검색엔진 비용 격차 극단**: 100K 레코드/1M 검색/월 — Algolia ~$1,000 vs Meilisearch Cloud ~$59 vs 자체 호스팅 ~$20. 한국어는 Elasticsearch nori, Meilisearch/Typesense 내장.

---

## F. 지역 RTO · 지자체

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 19 | ✅ [`19_rto_special_award_8regions.md`](./19_rto_special_award_8regions.md) | **특별상 8개 RTO 심층** — 부산(BTO/Big-데이터웨이브), 대전(DJTO/축제IP), 광주(GJTO/UNESCO 미디어아트), 세종(SCF/세담터), 충남(CACF/다도라), 경북(GTC/메타포트XR), 강원(GWTO/2025-2026 방문의 해), **제주(IJTO/REST+SPARQL+제주데이터허브 단연 1위)** |
| 20 | ✅ [`20_other_metropolitan_rto.md`](./20_other_metropolitan_rto.md) | 그 외 9개 광역 RTO — 서울(STO/VISIT SEOUL AI 플래너)·인천·경기·충북·전북·전남·경남·울산·대구 |
| 21 | ✅ [`21_regional_data_platforms.md`](./21_regional_data_platforms.md) | 국가·광역·시군 데이터 플랫폼 카탈로그 — 제주데이터허브, 서울 열린데이터광장, 경기데이터드림, 부산 빅데이터 플랫폼, 충남 올담 |
| 22 | ✅ [`22_regional_tourism_programs.md`](./22_regional_tourism_programs.md) | KTO·문체부 지역 사업 — **관광두레(147지역/998사업체)**, 거점도시, 스마트관광도시, 야간관광 특화도시, 웰니스, 열린관광지, 국제회의도시, 로컬100, 한국관광100선, 글로컬 관광도시 |

> 🔥 **자체 데이터 인프라 우위**: 제주(IJTO) > 부산(BTO) > 서울(STO) 3강 체제. 제주는 **SPARQL까지 운영하는 유일 RTO**.

> 🔥 **공식 협업 RTO 차이 주의**: 2025년 공모전 **7개**(부산·인천·광주·세종·경북·강원·제주) vs 2026년 **8개**(부산·대전·광주·세종·충남·경북·강원·제주) — 인천 빠지고 대전·충남 추가됨.

---

## G. 법규 · 정책 · 라이선스

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 23 | ✅ [`23_data_license_policy.md`](./23_data_license_policy.md) | 공공데이터법, **KOGL(공공누리) 1~4유형**, KTO OpenAPI 이용약관, 출처 표기 의무 |
| 24 | ✅ [`24_privacy_security_law.md`](./24_privacy_security_law.md) | 개인정보보호법(2024 개정), **위치정보법(방통위 신고 의무)**, GDPR, 개인정보처리방침 13개 필수항목, 만 14세 미만, 국외이전 |
| 25 | ✅ [`25_tourism_business_law.md`](./25_tourism_business_law.md) | 관광진흥법, 여행업/숙박업/도시민박업 등록, 전자상거래법, 외환·외국인관광(K-ETA/택스리펀드) |
| 26 | ✅ [`26_accessibility_standards.md`](./26_accessibility_standards.md) | KWCAG 2.2, 모바일 접근성 2.0, WAI-ARIA, **AI 기본법 2026.1.22 시행**(AI 생성물 표시·워터마크 의무), 저작권, 외국인 친화 표준 |

> 🔥 **공모전 출품작 운영 시 10대 법적 의무**:
> 1) **공공누리 제1유형 출처표시** (KTO 데이터, 푸터 명시)
> 2) **개인정보 처리방침 13개 필수항목**
> 3) **위치기반서비스사업자 방통위 신고** (GPS 사용 시, 미신고 형사처벌)
> 4) **동의 UI 분리** (수집·제3자제공·마케팅·위치·민감 별도)
> 5) **안전성 확보조치** (HTTPS, 비밀번호 단방향 암호화, 접속기록 1년)
> 6) **국외이전 처리방침** (해외 클라우드 시)
> 7) **GDPR 대비** (영문 메뉴 + EU 거주자)
> 8) **여행업·통신판매업 등록** (직접 예약·중개 시)
> 9) **웹·앱 접근성** (KWCAG 2.2)
> 10) **AI 기본법 대비** (2026.1.22 시행 — AI 생성물 표시 + 워터마크)

---

## H. 분석 · UX · 미디어 · 부가 인프라

| # | 파일 | 핵심 내용 |
| --- | --- | --- |
| 27 | ✅ [`27_data_analytics_visualization.md`](./27_data_analytics_visualization.md) | 시계열·**GIS(PostGIS)**·OD·추천(협업/콘텐츠/하이브리드/LLM)·클러스터링·이상탐지·**한국어 NLP(KoELECTRA/KoBigBird/HyperCLOVA-X/EXAONE/Solar)**, 시각화(D3/ECharts/deck.gl/kepler.gl) |
| 28 | ✅ [`28_media_image_content_infra.md`](./28_media_image_content_infra.md) | 이미지 CDN(Cloudinary/Imgix/Cloudflare), 360°/VR(Pannellum/Three.js), 영상(YouTube/Mux), AR(8th Wall/AR.js/ARKit/ARCore), 비전 AI |
| 29 | ✅ [`29_review_sns_data_apis.md`](./29_review_sns_data_apis.md) | **리뷰 데이터 합법 경로 매우 좁음** — 네이버/카카오 플레이스 리뷰 본문 공식 API 부재, **IG Basic Display API 2024.9 종료**, **YouTube Data API v3는 합법·무료(10k/일)**, 임베딩·벡터DB 매칭 |
| 30 | ✅ [`30_travel_ux_patterns.md`](./30_travel_ux_patterns.md) | UX 패턴 — 트리플/Wanderlog/TripIt/AI 일정 빌더(Mindtrip/Wonderplan/Roam/Layla 표준 = 챗+카드+편집), 오디오 가이드, 번역, 회상, 접근성 UX |
| 31 | ✅ [`31_supplementary_apis_weather_culture.md`](./31_supplementary_apis_weather_culture.md) | 부가 API — **기상청 KMA APIHub**(LCC X/Y 격자), 환경부 에어코리아, 국립공원공단(탐방로/혼잡도), 산림청, 문화재청, KOPIS(공연), KORAIL, 공공자전거 |

> 🔥 **격자 좌표계 변환** (KMA LCC X/Y, KOSIS GS80/UTM-K, VWorld TM, EPSG:4326) 이 공공데이터 결합의 1차 관문 — `pyproj` 표준.

> 🔥 **AI 일정 빌더 표준 패턴**: 챗 UI + 카드 + 인터랙티브 편집 3요소 (Mindtrip/Wonderplan/Roam/Layla). 트리플/Wanderlog/TripIt은 이메일 자동 파싱이 진입 트리거.

---

## 🎯 자료 활용 가이드

### 본 자료를 읽는 순서 (권장)

1. **[`00`](./00_contest_overview.md)** — 공모 요건/충족 요건 체크리스트 먼저 (필독)
2. **[`01`](./01_kto_tourapi_overview.md), [`02`](./02_tourapi_4_endpoints.md), [`03`](./03_tourapi_codes_schema.md)** — KTO TourAPI 4.0/4.4 (공모전 필수 활용)
3. **[`19`](./19_rto_special_award_8regions.md), [`22`](./22_regional_tourism_programs.md)** — 지역특화 가점 + RTO 특별상 8개 + 지역 사업
4. **[`11`](./11_kto_contest_winners_history.md), [`12`](./12_other_public_data_contests.md), [`13`](./13_kto_tourism_startups.md)** — 역대 수상작 + 사업화 성공 모델 (변별 포인트 파악)
5. **[`07`](./07_kto_official_services.md), [`08`](./08_domestic_ota_landscape.md), [`09`](./09_global_ota_in_korea.md), [`10`](./10_vertical_specialty_services.md)** — 경쟁 서비스 매핑
6. **[`23`](./23_data_license_policy.md), [`24`](./24_privacy_security_law.md), [`25`](./25_tourism_business_law.md), [`26`](./26_accessibility_standards.md)** — 법규 (위반 시 실격)
7. **[`14`](./14_frontend_tech_stack.md)~[`18`](./18_ai_llm_integration_stack.md)** — 기술 스택 (구현 단계)
8. **[`04`](./04_korea_tourism_datalab.md)~[`06`](./06_ai_llm_tourism_trends.md), [`27`](./27_data_analytics_visualization.md)~[`31`](./31_supplementary_apis_weather_culture.md)** — 빅데이터·분석·UX·부가 API (서비스 깊이 강화)

### 외부 1차 출처 핵심 링크

| 분류 | 링크 |
| --- | --- |
| **공모전 접수** | https://api.visitkorea.or.kr (한국관광 콘텐츠랩) |
| **공모전 사무국** | gongmo@stunning.kr / 070-4060-4046 |
| **API 키 발급** | https://www.data.go.kr (공공데이터포털, 기관코드 B551011) |
| **빅데이터** | https://datalab.visitkorea.or.kr (한국관광 데이터랩) |
| **KTO 공식** | https://kto.visitkorea.or.kr |
| **사용자용 포털** | https://korean.visitkorea.or.kr (대한민국 구석구석) |
| **두루누비** | https://www.durunubi.kr |
| **고캠핑** | https://gocamping.or.kr |
| **VISIT JEJU** | https://www.visitjeju.net |
| **VISIT BUSAN** | https://www.visitbusan.net |
| **API 운영 문의** | tourapi@knto.or.kr / 070-4287-3219 |

### 로컬 리소스 (이미 보유)

- **`docs/base/info.pdf`** — 2026 공모전 공식 요강 (10페이지, KTO 발행)
- **`docs/base/format.hwp`** — 제안서 양식 (HWP)
- **`docs/api_manual/` 28개 파일** — KTO 공식 API 매뉴얼 (.docx + .xlsx, v3.3~v4.4) — 본 리서치의 1차 출처로 직접 활용됨

---

## 📊 산출물 통계

| 항목 | 수량 |
| --- | --- |
| 리서치 MD 파일 | 32개 |
| 총 라인 수 | 약 13,088줄 |
| 총 용량 | 약 752KB |
| 외부 출처 URL | 700+개 (각 파일 평균 20개 이상) |
| 1차 출처 매뉴얼 | 28개 (.docx/.xlsx, KTO 공식) |
| 백그라운드 에이전트 | 8개 도메인 병렬 |
| 작성 소요 시간 | 약 18분 (병렬 실행) |

---

## 🔍 자료 갱신/확장 시 우선 보완 영역

> 백그라운드 에이전트들이 명시한 **확인 미진/추후 보완** 항목들:
>
> 1. **2024 활용공모전 대상(grand prize) 팀명/서비스명 미확정** — 공식 발표 페이지에서 직접 확인 안 됨. KTO 사장상 보도자료 직접 검색 또는 사무국(gongmo@stunning.kr) 문의 필요.
> 2. **2022~2024 우수상·장려상 세부 명단** — 공식 hwp 첨부에만 존재, 공개 검색 부분 한계.
> 3. **공모전 PDF 원문 "PDF 10KB 미만"** 표기 — 일반적으로 10MB의 오기로 해석되나 접수 시 사이트 안내 재확인 필수.
> 4. **TourAPI 4.4 마이그레이션 가이드** — 신분류체계 lclsSystm로 전환 시 detail 필드 변환 매핑 표가 매뉴얼 부속 엑셀에만 존재.

---

## 작성 메타 정보

- **작성일**: 2026-05-03 (마감 2026-05-06 16:00, D-3)
- **작성 도구**: Claude Code (Opus 4.7) + 8개 도메인 전문 리서치 에이전트
- **출처 정책**: 모든 사실은 1차 출처(공식 사이트, 공공기관 보도자료, KTO 공식 매뉴얼) URL 부착
- **작성 원칙**: 사용자 지시 — **"아이디에이션 관련은 빼고 철저하게 조사 위주로"** 엄수. 아이디어 제안·추천·의견 일체 배제, 사실/카탈로그/비교표 중심.
