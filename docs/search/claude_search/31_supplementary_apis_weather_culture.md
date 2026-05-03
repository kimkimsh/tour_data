# 31. 부가 데이터 / API 카탈로그 — 기상·환경·교통·문화·자연·체험

> 본 문서는 한국관광공사 TourAPI 외에 관광 서비스에 결합 가능한 한국 공공/민간 API를 사실 위주로 정리한다. 각 API의 운영기관, 엔드포인트, 인증 방식, 주요 응답 필드, 갱신 주기를 기록한다. (각 항목은 해당 기관 공지에 따라 변경될 수 있으므로 발급 직전 최신 명세 재확인 필요.)

---

## A. 기상 / 날씨

### A-1. 기상청 (KMA) 공식 API
- **공식 사이트**: https://www.weather.go.kr / API 포털 https://apihub.kma.go.kr (구 https://www.data.go.kr 기상청)
- **단기예보 (동네예보)**: 3시간 간격, 5km 격자(LCC). `getVilageFcst`, `getUltraSrtFcst`(초단기), `getUltraSrtNcst`(초단기실황).
- **중기예보 (Mid-term)**: 3~10일 후, 광역.
- **특보 / 기상특보 / 호우경보**: `getWthrWrnList`.
- **AWS 관측, ASOS 관측**: 기상관측 (분/시 단위).
- **태풍 정보, 황사/한파/폭염, 자외선, 체감온도, 자외선지수**.
- **인증**: data.go.kr 또는 apihub.kma.go.kr 가입 → 서비스키. 일반 인증키 일일 호출 한도 1,000회/서비스 → 운영키 신청 후 확장.
- **격자 변환**: 위경도 ↔ KMA Grid (X,Y) — Lambert Conformal Conic 변환 공식 KMA 제공.
- **응답 형식**: XML / JSON 선택 (대부분 가능).

### A-2. 기상청 「날씨 빅데이터 플랫폼」
- https://bd.kma.go.kr — 시간단위 격자 데이터, 기후평년값, 농업기상.

### A-3. 글로벌 기상 API (대안/보완)
| 서비스 | URL | 특징 |
|---|---|---|
| OpenWeatherMap | https://openweathermap.org | 무료 1k calls/일, 한국 커버 |
| Tomorrow.io | https://www.tomorrow.io | 분단위 강수 예측 |
| Open-Meteo | https://open-meteo.com | 무료, 키 없음 (정책 준수) |
| Weatherbit | https://www.weatherbit.io | 14일 예보 |
| AccuWeather API | https://developer.accuweather.com | 라이선스 |
| Visual Crossing | https://www.visualcrossing.com | 과거 기상 데이터 |
| Meteostat | https://meteostat.net | 무료 과거 기상 |

### A-4. 미세먼지 / 대기질
- **에어코리아 (한국환경공단)** — https://www.airkorea.or.kr , API: data.go.kr 「대기오염정보」.
  - 항목: PM10/PM2.5/O3/NO2/SO2/CO + CAI(통합대기환경지수).
  - 측정소 단위(전국 약 600여개), 시단위.
  - `getCtprvnRltmMesureDnsty`(시도별), `getMsrstnAcctoRltmMesureDnsty`(측정소별), `getMinuDustFrcstDspth`(예보).
- **WHO/WAQI World Air Quality Index** — https://aqicn.org/api/
- **PurpleAir (글로벌)** — https://api.purpleair.com

### A-5. 자외선 / 일출일몰
- **기상청 생활기상지수** — 자외선/식중독/감기 등 8종.
- **천문연구원 KASI 일출몰 API** — https://astro.kasi.re.kr (천문우주지식정보 → 자료실 OPEN API).

---

## B. 환경 / 자연

### B-1. 국립공원공단 (KNPS)
- **국립공원 공공데이터** — https://www.knps.or.kr, data.go.kr 「국립공원공단」.
  - 탐방로 정보, 시설, 야영장, 대피소, 탐방예약, 실시간 탐방객 수, 통제정보, CCTV 영상.
  - **「국립공원 탐방예약」 API** — 예약 가능 여부.
- **「둘레길/명품숲/등산로 표준 데이터」** — 산림청과 연계.

### B-2. 산림청 (KFS)
- **산림청 산림공간정보서비스 (FGIS)** — https://www.forest.go.kr
- **산림청 공공데이터**: data.go.kr 산림청.
  - 자연휴양림 정보, 산림욕장, 등산로, 명품숲, 임도.
  - **「숲나들e (구 산림청 휴양림 예약)」** — https://www.foresttrip.go.kr API 일부.
  - **국가표준 등산로** 격자.
- **산불위험예보지수, 산림기상**.

### B-3. 환경부 / 한국환경공단
- **국가하천 / 호수 / 습지 / 보호지역**.
- **에코뱅크** (생태계 정보) — https://www.nie.re.kr
- **국립생태원, 국립생물자원관 종 정보 API**.

### B-4. 한국수자원공사 (K-water)
- **수문(댐/저수지) 수위, 방류량** — http://opendata.kwater.or.kr
- **물맞이 페스티벌, 댐 관광지** 정보.

### B-5. 해양수산부 / 국립해양조사원
- **조위·조류 예보** — https://www.khoa.go.kr/api
  - 무인등대, 항만, 조석 표준.
- **해양 기상 / 파고 / 수온**.
- **항만/어항 정보** (국가어항).

### B-6. 농림수산식품교육문화정보원 (EPIS)
- **농림축산식품 공공데이터** — https://data.mafra.go.kr
- 음식·특산물·6차산업·체험농장(웰촌, https://www.welchon.com), 농촌체험휴양마을.

### B-7. 농촌진흥청 (RDA)
- **농사로 (Nongsaro)** — https://www.nongsaro.go.kr
- 작물·체험농장 정보.

---

## C. 문화 / 유산 / 박물관

### C-1. 국가유산청 (구 문화재청)
- **공식**: https://www.cha.go.kr
- **공공데이터**: https://www.cha.go.kr/openapi/openApiServiceList.do
  - **국가유산 검색** (지정종목/지정번호/소재지).
  - **국가지정문화재**, **시도지정문화재**, **등록문화재**, **세계유산**, **무형유산**, **자연유산**.
  - 이미지/영상/3D/VR 콘텐츠 일부.
- **국가유산포털** — https://www.heritage.go.kr (디지털 헤리티지 DB).

### C-2. 한국문화정보원 (KCISA)
- **공식**: https://www.kcisa.kr
- **「문화포털」** — https://www.culture.go.kr — 공연/전시/축제/체험.
- **「문화데이터광장」** — https://www.culture.go.kr/data
  - 박물관·미술관 소장품 (e뮤지엄), 공연예술 통합전산망 KOPIS, 영화관입장권통합전산망 KOBIS.
  - 「문화 빅데이터」 API.
- **「e뮤지엄」** — https://www.emuseum.go.kr — 전국 박물관 소장유물 통합검색.

### C-3. KOPIS (공연예술통합전산망)
- 공식: http://www.kopis.or.kr
- 공연 통합 통계 (장르/지역/일자별).
- API: 공연목록, 공연시설, 박스오피스, 예매현황.

### C-4. KOBIS (영화관입장권통합전산망)
- 공식: http://www.kobis.or.kr/kobisopenapi/
- 일별/주간/월간 박스오피스, 영화 상세, 영화관 정보.

### C-5. 한국영상자료원 KMDB
- 공식: https://www.kmdb.or.kr/info/api/openApi/intro
- 한국 영화 데이터베이스 API.

### C-6. 국립중앙박물관 / 국립현대미술관 / 국립국악원
- 각 기관 공식 API 또는 「공공데이터포털」 등록.
- 「국립박물관 통합 검색」 — https://www.museum.go.kr

### C-7. 「K-Festival」 / 지역축제
- KTO TourAPI 4.0 「축제정보 (festival/event)」.
- 「대한민국 구석구석」 축제 캘린더.
- 각 지자체 축제 공식 사이트.

---

## D. 교통 / 모빌리티

### D-1. 국가교통DB (KTDB)
- **공식**: https://www.ktdb.go.kr — 한국교통연구원(KOTI).
- 전국 OD 통행량 (시군구·읍면동 단위), 화물·여객 분리, 모드별(승용/버스/철도).
- 신청 후 다운로드, 일부 가공 데이터 무료.

### D-2. ITS 국가교통정보센터
- **공식**: https://www.its.go.kr
- 실시간 교통정보, VDS, CCTV, 돌발상황, 도로공사, 통행시간.
- API: data.go.kr 「국가교통정보센터」.

### D-3. 한국도로공사 / 고속도로
- **EX 한국도로공사 데이터셋** — https://data.ex.co.kr
- 영업소 / 휴게소 / 실시간 교통 / 통행료.

### D-4. 코레일 KORAIL
- **공식 API**: https://www.korail.com 일부 + data.go.kr.
- KTX/SRT/일반열차 시간표·운임·잔여석.
- **「KORAIL TALK」 앱** 자체 사용.
- **SRT** (수서고속철도) — https://etk.srail.kr

### D-5. 시외/고속버스
- **전국버스운송사업조합연합회 / 고속버스통합 / 시외버스통합**:
  - 고속버스: https://www.kobus.co.kr
  - 시외버스: https://www.bustago.or.kr (티머니 GO 등 통합).
- API: data.go.kr 「전국버스정류장」, 「고속버스정보」.

### D-6. 도시철도 / 지하철
- 서울교통공사, 부산교통공사, 대구·광주·대전·인천 도시철도, 코레일 광역.
- **서울 열린데이터광장** (https://data.seoul.go.kr) — 실시간 지하철 도착정보.
- 공공데이터포털 「전국 도시철도 역사 정보」, 「실시간 지하철 위치정보」.

### D-7. 시내버스 BIS (Bus Information System)
- **국토교통부 「전국 BIS 표준」** — data.go.kr 노선/정류장/실시간 도착.
- 지자체별 BIS API: 서울, 경기, 부산, 인천, 대전, 광주, 대구, 울산.

### D-8. 항공
- **인천국제공항** — https://www.airport.kr/api/
  - 출도착 운항정보, 주차장, 환승.
- **김포/김해/제주 등 공항공사** — https://www.airport.co.kr (한국공항공사 API).

### D-9. 항만 / 여객선
- **해양수산부 항만운영정보시스템** — https://new.portmis.go.kr
- **「가보고싶은 섬」** — https://island.haewoon.co.kr 여객선 시간표/예매.

### D-10. 공공자전거
| 서비스 | 운영 | API |
|---|---|---|
| **따릉이** (서울) | 서울시설공단 | 서울 열린데이터광장 「서울특별시 공공자전거 실시간 대여정보」 |
| **타슈** (대전) | 대전 | data.go.kr 대전 |
| **타바라** (제주) | 제주 | (지자체) |
| **누비자** (창원) | 창원 | data.go.kr 창원 |
| **어울링** (세종) | 세종 | (지자체) |
| **트랜짓** (수원) | 수원 | (지자체) |
| **그린카, 쏘카, 피플카** (카셰어링) | 민간 | 자체 API (제휴) |

### D-11. 전동킥보드 / 마이크로모빌리티
- **「라임(Lime), 빔(Beam), 스윙(Swing), 디어(Deer), 알파카(Alpaca)」** 등.
- 공식 공개 API 거의 없음 (B2B 제휴).
- 「티머니 GO」 일부 통합.

### D-12. 카카오모빌리티
- https://developers.kakaomobility.com — 길찾기, 자동차/대중교통/도보/자전거 경로.

### D-13. SKT TMAP
- https://openapi.sk.com — POI/경로/대중교통.

---

## E. 숙박 / 음식점 / 인허가

### E-1. LOCALDATA (지방행정 인허가 데이터)
- **공식**: https://www.localdata.go.kr
- 한국 전체 인허가 사업장 통합 (음식점, 숙박, 카페, 미용, 노래연습장 등).
- 일별 갱신 CSV 다운로드 + API.
- 지자체 → 국가표준.

### E-2. 한국관광 품질인증
- **「한국관광품질인증」** — KTO. 인증된 호텔/한옥/외국인관광 식당.

### E-3. 「우리동네 안심식당」 / HACCP
- 식약처 안심식당 / HACCP 인증 식품제조업소.

### E-4. 「깨끗한 화장실」
- 행정안전부 / 지자체 「깨끗한 공중화장실」 데이터.

---

## F. 통신사 / 카드 빅데이터

### F-1. 통신사 빅데이터 플랫폼
| 통신사 | 플랫폼 | URL |
|---|---|---|
| KT | 빅사이트 (BigSight, 구 KT 빅데이터 플랫폼) | https://bdp.kt.co.kr |
| SKT | 빅데이터 허브 (T 데이터플레이스) | https://www.bigdatahub.co.kr |
| LG U+ | 빅데이터센터 데이터셋 | (제휴 협의) |
- 유동인구(시·군·구·읍·면·동·격자), 외국인 로밍, 시간대별, 인구속성.

### F-2. 카드 데이터
- **금융데이터거래소 FinDX** — https://www.findatamall.or.kr
  - BC카드, 신한카드, 삼성카드, KB국민카드, 우리카드, 하나카드 등 매출/소비 패턴 데이터셋.
- **「데이터스토어 (Data Store)」** — 한국데이터산업진흥원 https://www.datastore.or.kr

### F-3. 한국관광 데이터랩 (가공)
- KTO가 통신·카드사 원천데이터를 가공해 「외국인 카드매출」, 「내국인 유동인구」, 「관광지 기반/배후」 형태로 공개.
- https://datalab.visitkorea.or.kr

---

## G. 행사 / 축제 / 공연

### G-1. KTO TourAPI 「축제공연행사」
- contentTypeId=15 (축제/공연/행사).
- 시기별 검색 가능.

### G-2. 문화포털 「공연/전시/축제」
- https://www.culture.go.kr

### G-3. KOPIS / 공연
- 위 C-3 참조.

### G-4. 지자체 축제
- 각 시도/시군구 공식 사이트, 일부 데이터 data.go.kr 등록.
- **「대한민국 대표 축제」** — 문화체육관광부 매년 선정.

### G-5. 글로벌
- **Eventbrite API** — https://www.eventbrite.com/platform/api
- **Ticketmaster Discovery API** — https://developer.ticketmaster.com
- **SeatGeek API**.

---

## H. 검색 / 트렌드

| 소스 | URL |
|---|---|
| 네이버 데이터랩 검색어 트렌드 API | https://developers.naver.com/docs/serviceapi/datalab/search/search.md |
| 카카오 데이터트렌드 | https://datatrend.kakao.com (웹 위주, API 제한) |
| 구글 트렌드 (비공식 pytrends) | https://trends.google.com |
| 빅카인즈 (뉴스 빅데이터) | https://www.bigkinds.or.kr |
| KTO 데이터랩 검색 트렌드 | https://datalab.visitkorea.or.kr |

---

## I. 기타 부가 데이터 카탈로그

### I-1. 공공데이터포털 (data.go.kr)
- https://www.data.go.kr — 거의 모든 부처/공공기관 API/파일 데이터셋 등록.
- 인증키 1개로 다수 기관 API 호출 (서비스별 신청).

### I-2. 서울 열린데이터광장
- https://data.seoul.go.kr — 서울 특화.

### I-3. 경기데이터드림
- https://data.gg.go.kr

### I-4. 부산 BIGDATA
- https://www.bigdata-environment.kr (환경)
- 부산광역시 빅데이터포털 https://busan.go.kr 데이터.

### I-5. 통계청 SGIS / KOSIS
- KOSIS — https://kosis.kr (통계 표준).
- SGIS Plus — https://sgis.kostat.go.kr (통계지리정보, 격자/행정경계).

### I-6. 국토교통부 V-WORLD
- https://www.vworld.kr — 정부 표준 공간정보 (지도·POI·주소·항공영상·3D 건물).

### I-7. LX 한국국토정보공사
- https://www.lx.or.kr — 지적, 공간정보.

### I-8. 도로명주소
- https://www.juso.go.kr — 도로명/지번 주소 검색, POBox 등.

### I-9. 부동산 공공데이터
- 국토교통부 실거래가 API — 일자/지역별 거래.
- (관광 컨텍스트에선 한정적이나 「숙박업 분포」 분석에 활용 가능.)

### I-10. 보건복지부 / 의료기관
- **응급의료포털 E-Gen** — https://www.e-gen.or.kr
  - 응급실 실시간 가용병상, 외국인 안내.
- **HIRA 심평원 의료기관 정보**.

### I-11. 행정안전부 「긴급재난문자」
- DSP 긴급재난문자 API — 외국인 관광객 안내 결합 가능.

### I-12. 주차장
- **공공주차장 정보** (data.go.kr 「전국 주차장 정보 표준 데이터」).
- 「파킹클라우드 (아이파킹)」, 「하이파킹」, 「이지파킹」 — 민간 주차장 SaaS.

### I-13. 화장실
- 「전국 공중화장실 표준 데이터」 — data.go.kr.

### I-14. WiFi
- 「공공WiFi 위치정보 표준 데이터」 — data.go.kr.

### I-15. 충전소 (전기차/수소)
- **환경부 무공해차 통합누리집 OPEN API** — https://www.ev.or.kr
- KEPCO ChargEV.

---

## J. 한국 외국인 관광 특화 API/서비스

| 서비스 | 운영 | URL |
|---|---|---|
| **Visit Korea API** (다국어 컨텐츠) | KTO | https://api.visitkorea.or.kr (다국어 서비스 별도 contentTypeId) |
| **K-ETA** (전자여행허가) | 법무부 | https://www.k-eta.go.kr |
| **HiKR Lounge** (관광안내소) | KTO | 위치/연락 정보 |
| **K-Pass / Korea Tour Card** | KTO/제휴 | 교통 통합 카드 |
| **Korea Tourism Quality (KQ)** | KTO | 인증 호텔/한옥/식당 |
| **AREX 공항철도** | 공항철도㈜ | 시간표 API |

---

## K. 결제 / 예약 통합

### K-1. 한국 PG / 결제
- **토스페이먼츠** https://docs.tosspayments.com
- **네이버페이 / 카카오페이 / 페이코 / 삼성페이**
- **KSNET, 나이스페이, 이니시스, KCP** — 전통 PG.
- **포트원 (구 아임포트)** — https://portone.io (PG 통합).

### K-2. 글로벌 PG
- Stripe, Adyen, Braintree (PayPal), Checkout.com.
- 인앱 결제: Apple StoreKit, Google Play Billing.

### K-3. 예약 OTA (B2B)
- Booking, Expedia, Agoda, Klook, GetYourGuide, Viator — 위 29번 문서 참조.

---

## L. 알림 / 메시징

| 채널 | API |
|---|---|
| 카카오 알림톡/친구톡 | https://business.kakao.com (CMP) |
| 네이버 SENS (알림톡/SMS) | https://www.ncloud.com/product/applicationService/sens |
| Twilio | https://www.twilio.com |
| Push: FCM (Firebase) | https://firebase.google.com/docs/cloud-messaging |
| Push: Apple APNs | https://developer.apple.com/notifications/ |
| 이메일: SES, SendGrid, Mailgun, Postmark | (각 사이트) |

---

## M. 데이터셋 검색 / 메타 카탈로그

| 카탈로그 | URL |
|---|---|
| 공공데이터포털 | https://www.data.go.kr |
| 서울 열린데이터광장 | https://data.seoul.go.kr |
| 경기데이터드림 | https://data.gg.go.kr |
| 빅데이터 플랫폼 통합 (16개) | https://www.bigdata-map.kr |
| AI 허브 (NIA) | https://aihub.or.kr (AI 학습용 데이터) |
| KISTI 사이언스ON | https://scienceon.kisti.re.kr |
| 통계청 KOSIS | https://kosis.kr |
| Kaggle Datasets | https://www.kaggle.com/datasets |
| HuggingFace Datasets | https://huggingface.co/datasets |

---

## N. 인증 / 키 발급 절차 표준 패턴

### N-1. data.go.kr
1. 회원가입 → 「개발계정」 신청 → 즉시 발급 (1,000회/일).
2. 「운영계정」 전환 신청 → 검토 후 트래픽 확장.
3. 응답 형식 XML/JSON (서비스별 상이).
4. 일부 API는 별도 기관 사이트 가입 필요 (KMA APIHub, KTO TourAPI 등).

### N-2. KMA APIHub
- https://apihub.kma.go.kr — 별도 가입.
- 종전 data.go.kr의 KMA 일부 API를 흡수, 새 API 추가.

### N-3. KTO TourAPI 4.0
- https://api.visitkorea.or.kr → 한국관광공사 OpenAPI 신청.
- 4.0은 GET/POST + JSON, contentTypeId(12관광지/14문화시설/15축제/25여행코스/28레포츠/32숙박/38쇼핑/39음식점) 표준.

---

## O. 한 줄 요약 카탈로그 (용도 → 표준 API)

| 용도 | 권장 한국 표준 |
|---|---|
| 날씨 단기예보 | 기상청 단기예보 (apihub.kma.go.kr) |
| 날씨 글로벌 | Open-Meteo (무료) / OpenWeatherMap |
| 미세먼지 | 에어코리아 |
| 일출몰 | KASI 천문우주지식정보 |
| 조위/조류 | 국립해양조사원 KHOA |
| 국립공원 | KNPS 공공데이터 |
| 휴양림 | 산림청 + 숲나들e |
| 문화재 | 국가유산청 + 디지털 헤리티지 |
| 박물관 | e뮤지엄 (KCISA) |
| 공연/전시 | 문화포털 + KOPIS |
| 영화 | KOBIS |
| 지하철 실시간 | 서울 열린데이터광장 + 도시별 |
| 시내버스 | 국토부 BIS 표준 + 지자체 |
| 고속/시외버스 | KOBUS / BUSTAGO |
| 기차 | KORAIL + SRT |
| 공항 출도착 | 인천공항/한국공항공사 |
| 여객선 | 가보고싶은섬 |
| 공공자전거 | 따릉이/타슈/누비자/타바라 |
| 충전소(EV) | 환경부 무공해차 누리집 |
| 응급의료 | E-Gen |
| 통신사 유동인구 | KT 빅데이터 / SKT 빅허브 |
| 카드 매출 | FinDX (BC/신한 등) |
| 검색트렌드 | 네이버 데이터랩 + 구글 트렌드 + KTO 데이터랩 |
| 행정 인허가 | LOCALDATA |
| 주소 | 도로명주소 |
| 좌표↔주소 | 카카오 Local / VWorld |
| 지도 | 카카오맵 / 네이버 지도 / VWorld |
| K-ETA | 법무부 K-ETA |
| 알림톡 | 카카오 비즈니스 / NAVER SENS |

---

## P. 실무 통합 시 유의사항 (사실 정리)

1. **격자 좌표계 차이**: 기상청 LCC X/Y, KOSIS 1km 격자(GS80/UTM-K), VWorld TM, OSM/지도 EPSG:4326 → 좌표 변환 라이브러리(`pyproj` `EPSG:5179` 한국 중부원점) 필요.
2. **TourAPI ↔ 카카오 Local ↔ 네이버 Local**의 POI ID 미일치 → 이름/좌표 거리 기반 매칭 + 수동 보정.
3. **공공데이터 응답 인코딩**: 일부 EUC-KR 응답 잔존, JSON UTF-8/XML 혼재.
4. **호출 한도**: 기본 1,000회/일 → 운영 키 신청 (사유 필요).
5. **갱신 주기**:
   - 기상 단기예보: 매 3시간(02/05/08/11/14/17/20/23시 발표).
   - 미세먼지: 1시간.
   - 지하철 실시간: 30초~1분.
   - 카드/통신 가공 데이터: 월 단위.
   - LOCALDATA: 일 단위.
6. **API 응답 변동**: 기관 시스템 점검 다수 — 캐싱 / 재시도 / 백오프 필수.
7. **데이터 라이선스**: 공공누리(KOGL) 1~4유형 표시 의무. 상업 이용 가능 여부 확인.
8. **개인정보**: 통신/카드 데이터는 비식별화 가공본만 외부 공개. 원천데이터는 NDA 필요.

---

## Q. 핵심 요약

1. **기상청 APIHub + 에어코리아 + KASI 일출몰 + KHOA 조위**가 한국 환경/기상 부가 데이터 4대 표준.
2. **국립공원공단 + 산림청 숲나들e + 환경부 에코뱅크**가 자연/생태 표준.
3. **국가유산청 + 한국문화정보원(e뮤지엄/문화포털) + KOPIS + KOBIS**가 문화 콘텐츠 표준.
4. **KORAIL/SRT + 국토부 BIS + 서울 열린데이터 + 카카오모빌리티 + 따릉이류**가 교통/모빌리티 표준.
5. **FinDX(카드) + KT/SKT 빅데이터(통신) + KTO 데이터랩(가공)**이 빅데이터 분석 입력 3대 축.
6. **LOCALDATA + 도로명주소 + VWorld**가 인허가/주소/공간정보 표준.
7. **인증 절차의 분산**(data.go.kr / KMA APIHub / KTO API / KOPIS / 서울 열린데이터 각자 별도 가입)이 실무에서 가장 큰 마찰 — 통합 키 관리 필수.
8. **격자/좌표계 변환** (LCC ↔ EPSG:4326 ↔ EPSG:5179)이 모든 공간 데이터 결합의 1차 관문.
9. **공공데이터 응답 인코딩/형식 혼재**(XML/JSON, UTF-8/EUC-KR)와 **호출 한도(기본 1k/일)**가 운영 단계 표준 이슈.
10. **공공누리 라이선스 표기** 의무 — 4유형 분류 확인 후 UI에 출처 표시.

---
*문서 끝.*
