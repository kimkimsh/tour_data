# 20. 그 외 광역 시·도 관광기구(RTO) 정리

> 본 문서는 2026 한국관광공사 관광데이터 활용 공모전 "지역특화 서비스 특별상" 협업 RTO **외**의 9개 광역 시·도 관광기구를 정리한다.
> 사용자 지정 8개 권역(부산·대전·광주·세종·충남·경북·강원·제주)은 19번 문서에서 다루었으며, 본 문서에서는 **서울·인천·경기·충북·전북·전남·경남·울산·대구**를 정리한다.
> 인천관광공사는 실제 2025 공모전 협업 RTO 7개 기관 중 하나이지만 사용자 지정 8개에는 포함되지 않아 본 문서에 보완 정리한다.

---

## 0. 한눈에 보는 비교 표

| RTO | 공식 사이트 | OpenAPI/공공데이터 | 빅데이터/스마트관광 플랫폼 | 대표 콘텐츠 |
| --- | --- | --- | --- | --- |
| 서울관광재단 (STO) | [sto.or.kr](https://www.sto.or.kr/index) · [VISIT SEOUL](https://english.visitseoul.net/) · 한글 visitseoul.net | [data.seoul.go.kr](https://data.seoul.go.kr/) (문화/관광 약 1,660건) | [서울 빅데이터 캠퍼스](https://bigdata.seoul.go.kr/) (4,500여 종) | Visit Seoul 여행 플래너(생성형 AI), Seoul MICE |
| 인천관광공사 (ITO) | [ito.or.kr](https://www.ito.or.kr/) | 인천 스마트관광도시 OPEN API | 스마트관광도시(개항장·송도) | 개항장·차이나타운, 송도 스마트관광도시 |
| 경기관광공사 (GTO) | [gto.or.kr](https://gto.or.kr/) · [ggtour.or.kr](https://ggtour.or.kr/) | [data.gto.or.kr](https://data.gto.or.kr/) (관광지식) + [경기데이터드림](https://data.gg.go.kr/) | 경기 데이터 분석포털 [insight.gg.go.kr](https://insight.gg.go.kr/) | 경기관광플랫폼, 31개 시군 |
| 충북관광공사 / 충북문화관광 (※) | 본청 [chungbuk.go.kr](https://chungbuk.go.kr/) | 충북 본청 OpenAPI | [충북 빅데이터 허브](https://data.chungbuk.go.kr/) | 청주 스마트관광도시, 단양·보은 |
| 전북특별자치도문화관광재단 (JBCT) | [jbct.or.kr](https://www.jbct.or.kr/) · [tour.jb.go.kr](https://tour.jb.go.kr/) | KTO TourAPI 활용 | 한옥마을 빅데이터 분석사업(국비 5억) | 전주 한옥마을, 전북야행, 새만금 |
| 전남관광재단 (JNTO) | [ijnto.or.kr](https://ijnto.or.kr/) · [jact.or.kr](https://jact.or.kr) | KTO TourAPI 활용 | [전남관광플랫폼 JN TOUR](http://intro.jeonnamtour.kr/) · [전남 메타버스](https://ditoland.net/world_detail/839) | 남도여행길잡이, 섬 관광, 순천만 |
| 경남관광재단 (GNTO) | [gnto.or.kr](https://gnto.or.kr/) | [data.go.kr 경남 문화관광](https://www.data.go.kr/data/15062531/openapi.do) | [경남빅데이터허브플랫폼](https://bigdata.gyeongnam.go.kr/) | 통영·거제·남해, 경남관광기념품점 |
| 울산문화관광재단 (UCTF) | [uctf.or.kr](https://uctf.or.kr/) | 울산 본청 활용 | 울산 본청 빅데이터 | 울산 남구 스마트관광도시(2022), 울산공업·태화강 |
| 대구관광재단 (DTO) | [dto.or.kr](http://www.dto.or.kr/) · [tour.daegu.go.kr](https://tour.daegu.go.kr/) | KTO + 대구 본청 활용 | [대구관광 데이터랩](https://tourdata.daegu.go.kr/) (수성구 스마트관광도시 산출) | 대구뷰, 대구트립로드 |

---

## 1. 서울관광재단 (Seoul Tourism Organization, STO)

### 1-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://www.sto.or.kr/index>
- **VISIT SEOUL 한글**: <https://www.visitseoul.net/> (en: <https://english.visitseoul.net/>)
- **Visit Seoul 모바일 앱** (iOS): <https://apps.apple.com/kr/app/visit-seoul-비짓서울/id360156429>

### 1-2. 자체 OpenAPI / 공공데이터
- **서울 열린데이터광장**: <https://data.seoul.go.kr/>
  - 문화/관광 카테고리 **약 1,660개 데이터셋**.
  - **서울특별시 열린데이터광장 서비스 현황** (정책 메타): <https://www.data.go.kr/data/15072239/fileData.do>
  - 서울시 관광 명소 데이터셋: <https://data.seoul.go.kr/dataList/OA-21050/S/1/datasetView.do>
  - **서울 LOD(Linked Open Data) 라이브 서비스**: <http://lod.seoul.go.kr/home/>
- 데이터셋 메타: DB_NM, DT_NM/INFO_TYPE_NM, INF_ID, INF_NM, 관리부서·담당자, 저작권/공공누리 유형, 제공형식(시트/차트/OpenAPI), 갱신주기.

### 1-3. 자체 빅데이터 플랫폼
- **서울특별시 빅데이터 캠퍼스**: <https://bigdata.seoul.go.kr/>
  - 4,500여 종 빅데이터, 빅데이터 분석프로그램 무료 제공.
  - 위치: 서울 마포구 매봉산로 31 에스플렉스센터 스마티움 15층.
  - 일반분석실 3개(64석), 세미나실(32석), 회의실, 휴게실, 분석지원실.
  - 데이터: 신용카드 소비, 택배 통계, 도시센서 환경정보 등.
  - 출처: [서울특별시 빅데이터 캠퍼스](https://bigdata.seoul.go.kr/) · [내 손안에 서울 보도](http://mediahub.seoul.go.kr/archives/1007811)

### 1-4. 지역 특화 콘텐츠 / 디지털 사업
- **Visit Seoul 여행 플래너(생성형 AI 챗봇)** — 시범 도입.
  - 약 30,000건의 Visit Seoul 공식 관광정보 데이터 기반.
  - 한국어, 영어, 번체 중국어, 간체 중국어, 일본어 5개 언어 지원.
  - 외국인 관광객 3천만 명 목표 일환.
  - 추후 러시아어·말레이어 추가, 7개 언어 확장 + 실시간 예약 기능 추가 예정.
  - 출처: [서울관광재단 보도](https://www.sto.or.kr/press/) · [아시아경제](https://www.asiae.co.kr/article/2025022411475926104) · [문화일보](https://www.munhwa.com/article/11486966) · [뉴시스](https://www.newsis.com/view/NISX20250224_0003076283)
- **서울 MICE 산업 지원** (서울특별시 마이스 산업 지원계획): <https://korean.miceseoul.com/>
- **N서울타워**, **경복궁/창덕궁/덕수궁** 등 5대 고궁, **한강공원**, **성수 반짝매장**.

### 1-5. 통계·보고서
- 한국관광 데이터랩 지역별(서울 시도코드 11) 통계.
- 서울 열린데이터광장 자체 통계.

---

## 2. 인천관광공사 (Incheon Tourism Organization, ITO)

### 2-1. 운영 중인 공식 웹·앱
- **공사 홈페이지**: <https://www.ito.or.kr/>
- **인천관광기업지원센터**: <https://tourbiz.ito.or.kr/>
- 디지털 마케팅 페이지: <https://www.ito.or.kr/main/introduce/business2_2.jsp>

### 2-2. 자체 OpenAPI / 공공데이터
- **인천 스마트관광도시 OPEN API**: <https://www.ito.or.kr/main/information/public_data4.jsp>
  - 별도 확인 절차 없이 간단한 정보 입력만으로 자동 승인 → URL 기반 API 호출.
- **공공데이터 개방 페이지**: <https://www.ito.or.kr/main/information/public_data.jsp>
- **공공데이터포털 등록**: <https://www.data.go.kr/dataset/15000496/openapi.do>
- 인천관광기업지원센터 공공데이터 안내: <https://tourbiz.ito.or.kr/info/opendata>

### 2-3. 자체 빅데이터 / 스마트관광 플랫폼
- **인천 스마트관광도시**: 최첨단 스마트 기술을 관광 서비스에 접목, 차별화된 관광 서비스 + 수집 데이터 기반 지역 발전 + 민간기업 비즈니스 기회.
  - 페이지: <https://www.ito.or.kr/main/introduce/business4.jsp>

### 2-4. 지역 특화 콘텐츠 / 디지털 사업
- **개항장(중구) / 차이나타운 / 송도국제도시** 도심 관광.
- **교동도** (오징어게임 촬영지) — 2025-2026 한국관광 100선 신규 선정.
- **AR/VR 신규 콘텐츠 발굴** — 비대면 디지털 홍보·마케팅.
- 국내외 SNS 채널 운영(블로그·페이스북·인스타그램·유튜브) 디지털 마케팅.
- **2025 관광데이터 활용 공모전 공식 협업 RTO 7개 기관 중 하나**.

### 2-5. 통계·보고서
- 한국관광 데이터랩 지역별(인천 시도코드 28) 통계.

---

## 3. 경기관광공사 (Gyeonggi Tourism Organization, GTO)

### 3-1. 운영 중인 공식 웹·앱
- **공사 홈페이지(메인)**: <https://gto.or.kr/>
- **GG TOUR 홈페이지**: <https://ggtour.or.kr/gto/>
- **데이터 공유 플랫폼**: <https://data.gto.or.kr/>
- 채용 페이지: <https://gto.saramin.co.kr/service/gto/3561/applicant/apply/recruit_default.asp>

### 3-2. 자체 OpenAPI / 공공데이터
- **경기관광공사 공공데이터** (data.go.kr 등록):
  - 경기관광공사_경기관광플랫폼_메인 추천 여행 정보 (2025-11-13): <https://www.data.go.kr/data/15138578/fileData.do>
  - 경기관광공사_플랫폼 홍보 배너 정보_메인 관련기관 정보 (2025-11-13): <https://www.data.go.kr/data/15138577/fileData.do>
- **경기 데이터 공유 플랫폼 (data.gto.or.kr)** — 경기관광공사 자체 운영 데이터 포털.
- **경기데이터드림 (data.gg.go.kr)** — 경기도 + 31개 시·군 + 산하 공공기관 통합 데이터.
  - Sheet, Chart, Map, File, Link 서비스 + Open API.
  - 사이트 소개: <https://data.gg.go.kr/portal/intro/intro/selectIntroPage.do>
  - 우리 지역 데이터 찾기: <https://data.gg.go.kr/portal/data/village/selectListDataByCityPage.do>
- **경기 데이터 분석포털 insight.gg.go.kr**: <https://insight.gg.go.kr/> · 활용가능 데이터 목록: <https://insight.gg.go.kr/dataSetList.do>

### 3-3. 자체 빅데이터 플랫폼
- **경기 데이터 분석포털**: 데이터 분석 + 활용가능 데이터 목록 제공.
- **경기데이터드림**: 광역지자체 단위 통합 포털.

### 3-4. 지역 특화 콘텐츠
- **31개 시·군 통합 운영** — 인구·관광 자원 최대 광역지자체.
- **수원화성, DMZ, 가평, 양평, 파주 임진각**.
- **수원국제회의복합지구** 지정(2026.1) — 반도체·바이오·AI 중심 글로벌 마이스 도시.
  - 출처: [이투데이](https://www.etoday.co.kr/news/view/2546050) · [경기일보](https://www.kyeonggi.com/article/20260122580013)

### 3-5. 통계·보고서
- 한국관광 데이터랩 지역별(경기 시도코드 41) 통계.

---

## 4. 충청북도 / 충북관광 (시·도 공공기관)

> ※ 충북은 광역지자체 단위 별도 "충북관광공사" 명칭 기관 운영 여부가 검색상 명확하지 않음. 충북도 본청 + 충청북도관광협회 + 충북콘텐츠코리아랩 등이 분담 운영.

### 4-1. 운영 중인 공식 웹·앱
- **충청북도 본청**: <https://chungbuk.go.kr/www/intro/index.html>
- **충북콘텐츠코리아랩**: <https://www.cbckl.kr/> — AI 기반 웹툰·웹소설 창작 교육, 콘텐츠 기업 액셀러레이팅.

### 4-2. 자체 OpenAPI / 공공데이터
- **충청북도 본청 OpenAPI 목록**: <https://chungbuk.go.kr/www/pubdataView.do?key=302&publicDataId=25&sc_offerer=&sc_subject=&sc_type=API>

### 4-3. 자체 빅데이터 플랫폼
- **충청북도 빅데이터 허브 플랫폼**: <https://data.chungbuk.go.kr/>
  - 데이터 매핑(GIS), 정책 지도, 도 이슈 시각화, KTX 오송역 이용 패턴 분석, 산업 생태계 분석, 공공 와이파이 설치 위치 분석.

### 4-4. 지역 특화 콘텐츠 / 디지털 사업
- **청주 스마트관광도시** (2022 선정) — 청주국제공항·오송역·버스터미널 교통 이점 + 기록문화 정체성. 디지로그(디지털+아날로그) 기록 컨셉.
  - 문화제조창·국립현대미술관·공예비엔날레·동부창고 등 도심 산업유산 → 체류형 관광 콘텐츠.
  - 출처: [트래블타임즈](https://www.traveltimes.co.kr/news/articleView.html?idxno=400772) · [뉴스코리아](https://www.newskorea.ne.kr/news/articleView.html?idxno=4870)
- **단양·보은·충주** — 산악·호반 관광.
- **Kati 충주데이터센터** 건설 중(중부권 최대급).
- 보은브루어리, '관광두레 사업' 선정(5,000만원 지원).

### 4-5. 통계·보고서
- 한국관광 데이터랩 지역별(충북 시도코드 33) 통계.

---

## 5. 전북특별자치도문화관광재단 (Jeonbuk Culture & Tourism Foundation, JBCT)

### 5-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://www.jbct.or.kr/>
- **투어전북 (전북문화관광 포털)**: <https://tour.jb.go.kr/>
- **전주관광재단**: <https://www.jjto.or.kr/main/>
- **고창문화관광재단**: <https://www.gctf.or.kr/>
- **전북문화관광재단 교육 플랫폼**: <https://jbctedu.com/>
- **비짓전주**: <https://tour.jeonju.go.kr/>
- **전주한옥마을** 공식: <https://hanok.jeonju.go.kr/>

### 5-2. 자체 OpenAPI / 공공데이터
- KTO TourAPI 및 data.go.kr 활용. 재단 자체 OpenAPI 미확인.

### 5-3. 자체 빅데이터 플랫폼 / 사업
- **한옥마을 빅데이터 분석사업** — 2015년 공공 빅데이터 분석사업 공모 선정, **국비 5억원** 확보.
  - 한옥마을 관광객의 성별·연령, 출발지, 체류시간, 다음 여행지, 소비액 등 관광 패턴 데이터 수집·분석.
  - 출처: [전북도 보도](https://www.jeonbuk.go.kr/newsroom/board/view.jeonbuk?boardId=BBS_0000090&dataSid=197964)

### 5-4. 지역 특화 콘텐츠
- **전주 한옥마을** (한국관광 100선 7회 연속 선정) — 슬로시티.
- **전북야행 야간관광 특화도시 조성** 계획.
- **새만금 간척사업 기념관** + 새만금 관광지구.
- **2025 전북형 관광두레 주민사업체** 모집 — JBCT 공고: <https://www.gunsan.go.kr/_cms/board/eFileDownload/111/3666777/d06e9c914f30eff4ec44419a179d8cab>
- 전북자치도, 2024년 방문객 9,864만 명. 2025년 1억 명 목표 — '전북야행', 미식 관광 활성화, 친환경 산악관광지구 지정 등.
  - 출처: [klan.kr](http://www.klan.kr/news_gisa/gisa_view.htm?gisa_idx=221206)

### 5-5. 통계·보고서
- 한국관광 데이터랩 지역별(전북 시도코드 45) 통계.

---

## 6. 전남관광재단 (Jeonnam Tourism Organization, JNTO)

### 6-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://ijnto.or.kr/>
- **전라남도관광협회**: <https://jntour.or.kr/>
- **남도여행길잡이 (전남여행 안내 시스템)**: <https://www.namdokorea.com/>
- **전남관광플랫폼 JN TOUR**: <http://intro.jeonnamtour.kr/>
- **전남 여행문화 플랫폼**: <https://jact.or.kr>
- **전남관광재단 조직도**: <https://ijnto.or.kr/org/graph>

### 6-2. 자체 OpenAPI / 공공데이터
- KTO TourAPI 활용. 자체 OpenAPI는 한정.

### 6-3. 자체 빅데이터 / 메타버스 플랫폼
- **전남 관광 메타버스(디토랜드)**: <https://ditoland.net/world_detail/839>
  - 14개 시군 가상 여행, 뷰포인트 캡처·여행 앨범 채우기.
- 한국은행 광주전남본부 [빅데이터 분석을 활용한 광주·전남지역 관광산업 진단 및 발전](https://www.bok.or.kr/ucms/cmmn/file/fileDown.do?atchFileId=FILE_000000000008867&fileSn=1&menuNo=200560)

### 6-4. 지역 특화 콘텐츠
- **남도 섬 관광** (한국 최다 섬 보유), **순천만 국가정원·습지**(7회 연속 한국관광 100선), **목포** (관광거점도시).
- **여수 밤바다·낭만포차**, **담양 죽녹원**.
- **로컬100 선정** 전남 관광지·축제 12곳 (역대 최다) — 출처: [코리아타임뉴스](https://www.koreatimenews.com/news/article.html?no=1064112).

### 6-5. 디지털 사업
- 2023 관광산업 디지털혁신 오픈세미나 등 — JNTour 공지: <http://jntour.or.kr/notice/view?id=2957>
- 도서·해양 관광 메타버스 콘텐츠.

### 6-6. 통계·보고서
- 한국관광 데이터랩 지역별(전남 시도코드 46) 통계.

---

## 7. 경상남도 관광재단 (Gyeongnam Tourism Organization, GNTO)

### 7-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://gnto.or.kr/>
- **경남관광기념품점**: <https://www.gntostore.kr/>
- **경상남도 본청 데이터 페이지**: <https://gyeongnam.go.kr/index.gyeong?contentsSid=4061&cpath=%2Fdata>
- **경남관광협회**: <http://www.tourgsnd.or.kr/>

### 7-2. 자체 OpenAPI / 공공데이터
- **경상남도_문화관광 OpenAPI**: <https://www.data.go.kr/data/15062531/openapi.do>
- **경상남도_관광정보_20230627**: <https://www.data.go.kr/data/3065515/fileData.do>
- 경남관광길잡이 기반 시군별 관광지 정보.

### 7-3. 자체 빅데이터 플랫폼
- **경남빅데이터허브플랫폼**: <https://bigdata.gyeongnam.go.kr/>
  - 경상남도_관광지 지정현황: <https://bigdata.gyeongnam.go.kr/index.gn?menuCd=DOM_000000114002001000&publicdatapk=3083972>
    - 시군명, 관광지명, 소재지, 지정일, 면적, 시행청, 주요개발내용 포함.
  - 관광지식정보시스템 연계: <https://bigdata.gyeongnam.go.kr/board/view.gn?boardId=BBS_0000005&menuCd=DOM_000000111007000000&dataSid=11851>

### 7-4. 지역 특화 콘텐츠
- **통영(케이블카·동피랑)**, **거제·남해·하동**, **창녕 우포늪**, **합천 해인사**.
- **하동** — 2022 스마트관광도시 선정.
- **김해 가야 문화권**.

### 7-5. 통계·보고서
- 한국관광 데이터랩 지역별(경남 시도코드 48) 통계.

---

## 8. 울산문화관광재단 (Ulsan Culture & Tourism Foundation, UCTF)

### 8-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://uctf.or.kr/>
- **울산관광기업지원센터**: <https://tourbiz.uctf.or.kr/>
- **울산광역시 관광 페이지**: <https://www.ulsan.go.kr/tour/kor/main.ulsan>
- **문화도시 울산**: <https://www.usculture.or.kr/>
- 인스타그램: @uctf.or.kr, 유튜브: 울산문화관광재단

### 8-2. 자체 OpenAPI / 공공데이터
- 울산광역시 본청 공공데이터 활용. 재단 자체 OpenAPI 한정.

### 8-3. 자체 빅데이터 / 스마트관광 플랫폼
- **울산광역시 남구 스마트관광도시** (2022 선정).
- 재단 차원에서 "스마트관광플랫폼 활성화" 사업 운영.

### 8-4. 지역 특화 콘텐츠
- **태화강 국가정원**, **간절곶**, **반구대 암각화**.
- **2025 문화도시 울산 조성 구·군 특화사업** — 울산 지역 문화 콘텐츠 기획·개발.
- 산업관광(현대중공업·자동차) 결합.

### 8-5. 통계·보고서
- 한국관광 데이터랩 지역별(울산 시도코드 31) 통계.

---

## 9. 대구관광재단 (Daegu Tourism Organization, DTO)

### 9-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <http://www.dto.or.kr/>
- **대구관광정보센터**: <https://www.daegutour.or.kr/>
- **대구뷰 (DAEGUVIEW)**: <http://www.daeguview.com/>
- **대구트립로드 (대구시 공식 관광)**: <https://tour.daegu.go.kr/>

### 9-2. 자체 OpenAPI / 공공데이터
- **대구광역시_관광지 OpenAPI**: <https://www.data.go.kr/data/3054892/openapi.do>
- KTO TourAPI 활용.

### 9-3. 자체 빅데이터 플랫폼
- **대구관광 데이터랩**: <https://tourdata.daegu.go.kr/>
  - 2021~2022년 「대구 수성구 스마트관광도시 조성사업」의 일환으로 제작된 플랫폼.
  - 이동통신, 신용카드, 관광통계, 스마트관광도시 사업에서 취득된 다양한 관광 분석·통계 데이터 활용.
  - 관광기업·지자체·학계 등 이해관계자에게 데이터 기반 정책·비즈니스 수립 지원.
  - 소개: <https://tourdata.daegu.go.kr/daegu/MI000000000000000039/html/cont0010v.do>
- **대구 빅데이터활용센터 / 대구 가명정보 활용지원센터**: <http://dipbigdata.kr/>

### 9-4. 지역 특화 콘텐츠
- **수성구 스마트관광도시** — 모바일 하나로 교통·음식·숙박·관광지 정보·예약·결제·다국어 서비스 제공 + 미디어아트 음악분수, 가상미술관 등 콘텐츠.
- **대구사유원** — 2025-2026 한국관광 100선 신규 선정(고요한 사색의 공간).
- **김광석길**, **앞산공원**, **약령시**.

### 9-5. 통계·보고서
- 한국관광 데이터랩 지역별(대구 시도코드 27) 통계.

---

## 10. 광역시·도 RTO 운영 형태 비교

| 광역 | 단독 RTO 명칭 | 형태 | 비고 |
| --- | --- | --- | --- |
| 서울 | 서울관광재단 | 재단 | Visit Seoul AI 챗봇 |
| 인천 | 인천관광공사 | 공사 | 스마트관광도시 OPEN API |
| 경기 | 경기관광공사 | 공사 | data.gto.or.kr 자체 운영 |
| 강원 | 강원관광재단 | 재단 | 강원 방문의 해 |
| 충북 | (충청북도 본청 + 협회·콘텐츠랩 분담) | - | 별도 단독 공사 미운영 |
| 충남 | 충남문화관광재단 | 재단 | 다도라 + 올담 |
| 대전 | 대전관광공사 | 공사 | 0시축제 |
| 세종 | 세종시문화관광재단 | 재단 | 세담터 |
| 전북 | 전북특별자치도문화관광재단 | 재단 | 한옥마을 빅데이터 |
| 전남 | 전남관광재단 | 재단 | JN TOUR + 디토랜드 메타버스 |
| 광주 | 광주관광공사 (GJTO) | 공사 | UNESCO 미디어아트 |
| 경북 | 경상북도문화관광공사 | 공사 | 메타포트, XR |
| 경남 | 경상남도 관광재단 | 재단 | 빅데이터허브 |
| 대구 | 대구관광재단 | 재단 | 대구관광 데이터랩 |
| 울산 | 울산문화관광재단 | 재단 | 남구 스마트관광 |
| 부산 | 부산관광공사 | 공사 | 빅-데이터웨이브 |
| 제주 | 제주관광공사 | 공사 | data.ijto.or.kr + 데이터허브 |

---

## 11. 출처 정리 (URL)

### 서울
- 서울관광재단: <https://www.sto.or.kr/index>
- VISIT SEOUL: <https://english.visitseoul.net/>
- 서울 열린데이터광장: <https://data.seoul.go.kr/>
- 서울 빅데이터 캠퍼스: <https://bigdata.seoul.go.kr/>
- 서울시가 보유한 빅데이터 시민 공개: <http://mediahub.seoul.go.kr/archives/1007811>
- Visit Seoul 여행 플래너 보도(아시아경제): <https://www.asiae.co.kr/article/2025022411475926104>
- Visit Seoul 여행 플래너 보도(문화일보): <https://www.munhwa.com/article/11486966>
- 서울 LOD: <http://lod.seoul.go.kr/home/>

### 인천
- ITO: <https://www.ito.or.kr/>
- 인천 스마트관광도시 OPEN API: <https://www.ito.or.kr/main/information/public_data4.jsp>
- 스마트관광도시 사업: <https://www.ito.or.kr/main/introduce/business4.jsp>
- 인천관광기업지원센터: <https://tourbiz.ito.or.kr/>
- ITO 공공데이터포털: <https://www.data.go.kr/dataset/15000496/openapi.do>

### 경기
- GTO: <https://gto.or.kr/>
- ggtour.or.kr: <https://ggtour.or.kr/gto/>
- data.gto.or.kr: <https://data.gto.or.kr/>
- 경기데이터드림: <https://data.gg.go.kr/>
- 경기 데이터 분석포털: <https://insight.gg.go.kr/>
- 경기관광플랫폼 추천 여행정보(공공데이터포털): <https://www.data.go.kr/data/15138578/fileData.do>
- 수원국제회의복합지구 지정: <https://www.etoday.co.kr/news/view/2546050>

### 충북
- 충청북도: <https://chungbuk.go.kr/www/intro/index.html>
- 충북 OpenAPI 목록: <https://chungbuk.go.kr/www/pubdataView.do?key=302>
- 충북 빅데이터 허브: <https://data.chungbuk.go.kr/>
- 충북콘텐츠코리아랩: <https://www.cbckl.kr/>
- 청주 스마트관광도시 보도: <https://www.traveltimes.co.kr/news/articleView.html?idxno=400772>

### 전북
- JBCT: <https://www.jbct.or.kr/>
- 투어전북: <https://tour.jb.go.kr/>
- 전주관광재단: <https://www.jjto.or.kr/main/>
- 고창문화관광재단: <https://www.gctf.or.kr/>
- 전주한옥마을: <https://hanok.jeonju.go.kr/>
- 비짓전주: <https://tour.jeonju.go.kr/>
- 한옥마을 빅데이터 분석사업: <https://www.jeonbuk.go.kr/newsroom/board/view.jeonbuk?boardId=BBS_0000090&dataSid=197964>

### 전남
- JNTO: <https://ijnto.or.kr/>
- 전라남도관광협회: <https://jntour.or.kr/>
- 남도여행길잡이: <https://www.namdokorea.com/>
- JN TOUR 플랫폼: <http://intro.jeonnamtour.kr/>
- jact.or.kr: <https://jact.or.kr>
- 전남 관광 메타버스(디토랜드): <https://ditoland.net/world_detail/839>
- 전남관광재단 조직도: <https://ijnto.or.kr/org/graph>

### 경남
- GNTO: <https://gnto.or.kr/>
- 경남관광기념품점: <https://www.gntostore.kr/>
- 경남빅데이터허브플랫폼: <https://bigdata.gyeongnam.go.kr/>
- 경상남도_문화관광 OpenAPI: <https://www.data.go.kr/data/15062531/openapi.do>
- 경남관광협회: <http://www.tourgsnd.or.kr/>

### 울산
- UCTF: <https://uctf.or.kr/>
- 울산관광기업지원센터: <https://tourbiz.uctf.or.kr/>
- 울산광역시 관광 페이지: <https://www.ulsan.go.kr/tour/kor/main.ulsan>
- 문화도시 울산: <https://www.usculture.or.kr/>

### 대구
- DTO: <http://www.dto.or.kr/>
- 대구관광정보센터: <https://www.daegutour.or.kr/>
- 대구뷰: <http://www.daeguview.com/>
- 대구트립로드: <https://tour.daegu.go.kr/>
- 대구관광 데이터랩: <https://tourdata.daegu.go.kr/>
- 대구관광 데이터랩 소개: <https://tourdata.daegu.go.kr/daegu/MI000000000000000039/html/cont0010v.do>
- 대구 빅데이터활용센터: <http://dipbigdata.kr/>
- 대구광역시_관광지 OpenAPI: <https://www.data.go.kr/data/3054892/openapi.do>
