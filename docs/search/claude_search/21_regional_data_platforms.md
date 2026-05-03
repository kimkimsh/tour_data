# 21. 지자체 관광 데이터 플랫폼 카탈로그

> 본 문서는 17개 광역시·도 + 주요 시·군 + 국가급(KTO·문체부·중앙) 데이터 플랫폼을 정리한다.
> 관광 활용도 높은 데이터셋·OpenAPI 출처를 URL과 함께 표·목록으로 망라.

---

## 0. 한눈에 보는 핵심 플랫폼

| 분류 | 플랫폼 | URL | 핵심 기능 |
| --- | --- | --- | --- |
| 국가 통합 | 공공데이터포털 | <https://www.data.go.kr/> | 모든 공공기관 OpenAPI/파일데이터 |
| 국가 통합 | KTO 콘텐츠랩 (TourAPI) | <https://api.visitkorea.or.kr/> | 한국관광공사 통합 관광 API |
| 국가 통합 | 한국관광 데이터랩 | <https://datalab.visitkorea.or.kr/> | 관광 빅데이터 융합분석 (이통·카드·내비) |
| 국가 통합 | 관광지식정보시스템 | <https://www.tour.go.kr/> | 통계·연구·DB |
| 국가 통합 | 관광기업지원포털 (투어라즈) | <https://touraz.kr/> | 기업 지원·공모 |
| 국가 통합 | 문화 빅데이터 플랫폼 | <https://www.bigdata-culture.kr/> | 문화·관광 빅데이터 마켓 |
| 국가 통합 | 관광e배움터 | <https://touredu.visitkorea.or.kr/> | TourAPI 활용 교육 |
| 국가 통합 | 관광개발정보시스템 (TDSS) | <https://www.tdss.kr/> | 관광지·관광단지 지정 |
| 광역 빅데이터 | 부산 Big-데이터웨이브 | <https://data.busan.go.kr/bdip/> | 데이터마켓(전국 최초) |
| 광역 빅데이터 | 부산광역시 빅데이터 플랫폼 | <https://bigdata.busan.go.kr/> | 시 본청 빅데이터 |
| 광역 빅데이터 | 부산 빅데이터 혁신센터 | <https://busanbigdata.kr/> | 활용 지원 |
| 광역 빅데이터 | 서울 열린데이터광장 | <https://data.seoul.go.kr/> | 문화/관광 약 1,660건 |
| 광역 빅데이터 | 서울 빅데이터 캠퍼스 | <https://bigdata.seoul.go.kr/> | 4,500여 종 데이터 |
| 광역 빅데이터 | 서울 LOD | <http://lod.seoul.go.kr/home/> | Linked Open Data |
| 광역 빅데이터 | 경기데이터드림 | <https://data.gg.go.kr/> | 31개 시·군 통합 |
| 광역 빅데이터 | 경기 데이터 분석포털 | <https://insight.gg.go.kr/> | 분석 도구 |
| 광역 빅데이터 | 경기관광공사 데이터 공유 플랫폼 | <https://data.gto.or.kr/> | 관광지식 |
| 광역 빅데이터 | 강원 공공데이터 | <https://data.gwd.go.kr/> | 광역 통합 |
| 광역 빅데이터 | 강원 교육·연구 빅데이터 허브 | <https://bigdata.risdata.or.kr/> | 연구용 |
| 광역 빅데이터 | 충청북도 빅데이터 허브 | <https://data.chungbuk.go.kr/> | KTX 오송역 분석 등 |
| 광역 빅데이터 | 충청남도 데이터포털 올담 | <https://alldam.chungnam.go.kr/> | 맞춤형 데이터 |
| 광역 빅데이터 | 충청남도 다도라 (스마트관광) | <https://chungnam.dadora.kr/> | 모바일 전자지도 |
| 광역 빅데이터 | 세종 빅데이터 플랫폼 (세담터) | <https://www2.sejong.go.kr/bigdata/> | 시민데이터지도 |
| 광역 빅데이터 | 경상남도 빅데이터 허브 | <https://bigdata.gyeongnam.go.kr/> | 도 통합 |
| 광역 빅데이터 | 대구관광 데이터랩 | <https://tourdata.daegu.go.kr/> | 수성구 스마트관광도시 산출 |
| 광역 빅데이터 | 대구 빅데이터활용센터 | <http://dipbigdata.kr/> | 가명정보 활용 |
| 광역 빅데이터 | 제주관광 빅데이터 플랫폼 | <https://data.ijto.or.kr/> | 이통·카드·내비 + 데이터맵 |
| 광역 빅데이터 | 제주데이터허브 | <https://www.jejudatahub.net/> | 제주의 모든 데이터 |
| 광역 빅데이터 | VISIT JEJU TourAPI | <https://tourapi.visitjeju.net/> | REST + SPARQL |

---

## 1. 국가급 통합 플랫폼

### 1-1. 공공데이터포털 (data.go.kr)
- URL: <https://www.data.go.kr/>
- 모든 공공기관(중앙·지자체·공공기관)의 파일/OpenAPI/표준데이터 등록.
- 인증키 발급 후 활용. 개발계정 일일 호출량 제한, 운영계정 신청 시 확장.
- 관광 분류:
  - 한국관광공사_국문 관광정보 서비스_GW: <https://www.data.go.kr/data/15101578/openapi.do>
  - 한국관광공사_관광빅데이터 정보서비스_GW: <https://www.data.go.kr/data/15101972/openapi.do>
  - 한국관광공사_관광지별 연관 관광지 정보: <https://www.data.go.kr/data/15128560/openapi.do>
  - 한국관광공사_국내 관광지 정보(한국관광 100선): <https://www.data.go.kr/data/15003416/fileData.do>
  - 한국관광공사_양양 스마트관광도시 다국어 POI 데이터: <https://www.data.go.kr/data/15124980/fileData.do>
  - 전국길관광정보표준데이터: <https://www.data.go.kr/data/15017321/standard.do>
  - 전국관광지정보표준데이터: <https://www.data.go.kr/data/15021141/standard.do>
  - 한국관광공사_한국관광통계 공표: <https://www.data.go.kr/data/15105720/fileData.do>
  - 문화체육관광부_관광지 관광단지 현황: <https://www.data.go.kr/data/3075662/fileData.do>

### 1-2. KTO 콘텐츠랩 / TourAPI 4.0
- URL: <https://api.visitkorea.or.kr/>
- 공모전 페이지: <https://www.2025tourapi.com/sub/sub01.html>
- **데이터 종류 15종 약 26만 건** (국문):
  1. 지역코드정보
  2. 서비스분류코드정보
  3. 법정동코드정보
  4. 분류체계코드정보
  5. 지역기반관광정보
  6. 위치기반관광정보
  7. 키워드검색
  8. 행사정보
  9. 숙박정보
  10. 공통정보
  11. 소개정보
  12. 반복정보
  13. 이미지정보
  14. 관광정보 동기화 목록정보
  15. 반려동물 동반여행정보
- 영문(GW), 일문, 중문(간체/번체) 등 다국어 버전 별도 제공.
- 관광e배움터 강의(상품기획/개발): <https://touredu.visitkorea.or.kr/common/C202201089/0000/0>
- 활용 이벤트(맞춤형 데이터 in TourAPI): <https://www.allforyoung.com/posts/63144>

### 1-3. 한국관광 데이터랩
- URL: <https://datalab.visitkorea.or.kr/>
- 소개: <https://datalab.visitkorea.or.kr/datalab/portal/bdp/getHowPlatformForm.do>
- 제공 데이터:
  - 이동통신 (KT, SKT)
  - 신용카드 (신한카드)
  - 내비게이션 (TMAP)
  - 관광통계 / 실태조사
  - 방한 외래관광객 / 국민 해외관광객 / 관광수지
  - 세계관광통계 / 크루즈통계
  - 여행실태조사 / 국민여행조사 / 외래관광객조사 / 잠재 방한여행객 조사
  - 관광라이브러리 / 국내외 시장동향
- 지역별 관광 현황(시도코드 기반): <https://datalab.visitkorea.or.kr/datalab/portal/loc/getAreaDataForm.do>
- 데이터 업데이트 주기 메타 정보: <https://datalab.visitkorea.or.kr/datalab/portal/getMetaInfoList.do>
- **AI 관광분석 서비스** — 지역 데이터 기반 맞춤형 AI 관광 인사이트 제공.
- 활용 우수사례집(2025): <https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1129&bcIdx=309896>
- 2025 한국관광 데이터랩 활용 경진대회: <https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1135&bcIdx=309323>

### 1-4. 관광지식정보시스템 (TourGo)
- URL: <https://www.tour.go.kr/>
- 주요관광지점 입장객통계: <https://know.tour.go.kr/stat/visitStatDis/main.do>

### 1-5. 관광기업지원포털 (투어라즈, touraz)
- URL: <https://touraz.kr/>
- 정책지원·기업지원 사업·공모 통합.
- 관광기업지원센터 네트워크: <https://touraz.kr/networkTourbizCenter>

### 1-6. 문화 빅데이터 플랫폼
- URL: <https://www.bigdata-culture.kr/>
- 제주관광공사 채널: <https://www.bigdata-culture.kr/bigdata/user/data_market/agency/detail.do?id=ijto_org>
- 부산센터 채널: <https://www.bigdata-culture.kr/bigdata/user/data_market/agency/detail.do?id=busancenter_org>

### 1-7. TDSS (관광개발정보시스템)
- URL: <https://www.tdss.kr/>
- 사업 개요: <https://www.tdss.kr/pub/busi/busiIntro.do>

---

## 2. 광역시·도 데이터 플랫폼

### 2-1. 서울특별시
- **서울 열린데이터광장**: <https://data.seoul.go.kr/>
  - 문화/관광 카테고리 약 1,660개 데이터셋.
  - 서울시 관광 명소: <https://data.seoul.go.kr/dataList/OA-21050/S/1/datasetView.do>
  - Open API 이용 가이드: <https://data.seoul.go.kr/together/guide/useGuide.do>
- **서울 빅데이터 캠퍼스**: <https://bigdata.seoul.go.kr/>
  - 4,500여 종 빅데이터, 무료 분석 프로그램, 일반분석실 3개(64석).
- **서울 LOD 라이브 서비스**: <http://lod.seoul.go.kr/home/>
- **서울 자치구 단위 열린데이터광장**:
  - 서초구: <https://data.seocho.go.kr/>
  - 송파구: <https://data.songpa.seoul.kr/>
  - 중구: <https://data.junggu.seoul.kr/>
  - 성동구: <https://data.sd.go.kr/>

### 2-2. 부산광역시
- **Big-데이터웨이브 (부산형 데이터 통합플랫폼)**: <https://data.busan.go.kr/bdip/>
  - 데이터 카탈로그(공공·맞춤형), 데이터분석(대시보드, 셀프분석), 데이터 활용(시각화·프로파일링), 데이터마켓(데이터 구매·맞춤형 데이터 의뢰·참여기업 홍보), 데이터 지도(전국통합맵, 지도기반데이터, 시민공감지도).
  - **광역지자체 최초 데이터마켓 운영**.
  - 2025년 7월 21일 본격 운영 개시.
- **부산광역시 빅데이터 플랫폼**: <https://bigdata.busan.go.kr/>
- **부산 빅데이터 혁신센터**: <https://busanbigdata.kr/>
- **부산광역시 데이터 카탈로그**: <https://data.busan.go.kr/Bf47546_test/opendata/dataSet.do>

### 2-3. 인천광역시
- **인천관광공사 OPEN API**: <https://www.ito.or.kr/main/information/public_data4.jsp>
- **인천관광공사 공공데이터 개방 페이지**: <https://www.ito.or.kr/main/information/public_data.jsp>
- 자동 승인 기반 OPEN API.

### 2-4. 경기도
- **경기데이터드림**: <https://data.gg.go.kr/>
  - 경기도 + 31개 시·군 + 산하 공공기관 통합 포털.
  - Sheet, Chart, Map, File, Link + Open API.
- **경기 데이터 분석포털 (insight.gg.go.kr)**: <https://insight.gg.go.kr/>
  - 활용가능 데이터 목록: <https://insight.gg.go.kr/dataSetList.do>
- **경기관광공사 데이터 공유 플랫폼**: <https://data.gto.or.kr/>

### 2-5. 강원특별자치도
- **강원 공공데이터**: <https://data.gwd.go.kr/>
- **강원특별자치도청 공공데이터 개방**: <https://state.gwd.go.kr/portal/administration/openData/dataopen>
- **강원 교육·연구 빅데이터 허브 플랫폼**: <https://bigdata.risdata.or.kr/>
- **강원관광재단 알리미** (관광 통계/지표): <https://www.gwtoalimi.com/kr>

### 2-6. 충청북도
- **충북 빅데이터 허브 플랫폼**: <https://data.chungbuk.go.kr/>
  - 데이터 매핑(GIS), 정책 지도, KTX 오송역 이용 패턴 분석, 산업 생태계 분석, 공공 와이파이 설치 위치 분석.
- **충청북도 OpenAPI 목록**: <https://chungbuk.go.kr/www/pubdataView.do?key=302>

### 2-7. 충청남도
- **충청남도 데이터포털 "올담"**: <https://alldam.chungnam.go.kr/>
  - 데이터 → 공공데이터: <https://alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201001001000>
  - 맞춤형데이터(지역별): <https://alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201003003000>
- **충남 스마트관광 전자지도 "다도라"**: <https://chungnam.dadora.kr/>

### 2-8. 세종특별자치시
- **세담터 (세종 빅데이터 개방형 플랫폼)**: <https://www2.sejong.go.kr/bigdata/>
  - 빅데이터 분석 자료, 테마 분석, 시민데이터지도, 아이디어 공모전.
  - 공모전 안내: <https://www2.sejong.go.kr/bigdata/contest/contestWnpzListView.do>

### 2-9. 대전광역시
- 대전 본청 데이터 페이지 + KTO TourAPI 활용. 별도 통합 공공 빅데이터 플랫폼은 시 본청 정보화담당관 운영.
- 대전관광공사 정보공개·공공데이터: <https://www.djto.kr/kor/page.do?menuIdx=620>

### 2-10. 광주광역시
- 광주미디어아트플랫폼: <https://gmap.gwangju.go.kr/>
- 광주관광기업지원센터 빅데이터 활용 교육: <https://tourbiz.gjto.or.kr/user/board/view/board_cd/notice/wr_no/121>

### 2-11. 대구광역시
- **대구관광 데이터랩**: <https://tourdata.daegu.go.kr/>
  - 2021~2022 대구 수성구 스마트관광도시 사업의 산출물.
  - 이동통신·신용카드·관광통계·스마트관광도시 데이터 통합.
  - 소개: <https://tourdata.daegu.go.kr/daegu/MI000000000000000039/html/cont0010v.do>
- **대구 빅데이터활용센터 / 대구 가명정보 활용지원센터**: <http://dipbigdata.kr/>

### 2-12. 울산광역시
- 울산광역시 본청 공공데이터 + 울산관광기업지원센터.

### 2-13. 경상북도
- 경상북도 본청 데이터 + 경상북도문화관광공사 카탈로그.
- 공공데이터포털 GTC: <https://www.data.go.kr/tcs/dss/selectDataSetList.do?org=경상북도문화관광공사>
- GTC 사전정보공표 데이터: <https://www.data.go.kr/data/15145391/fileData.do>
- 경북 메타포트(메타버스 통합 플랫폼) — 빅데이터/3D POI.

### 2-14. 경상남도
- **경남빅데이터허브플랫폼**: <https://bigdata.gyeongnam.go.kr/>
  - 경상남도_관광지 지정현황: <https://bigdata.gyeongnam.go.kr/index.gn?menuCd=DOM_000000114002001000&publicdatapk=3083972>
- **경상남도 본청 데이터 페이지**: <https://gyeongnam.go.kr/index.gyeong?contentsSid=4061&cpath=%2Fdata>
- **경상남도_문화관광 OpenAPI**: <https://www.data.go.kr/data/15062531/openapi.do>

### 2-15. 전라북도 (전북특별자치도)
- 전북 자체 빅데이터 플랫폼 한정. KTO + JBCT.
- 전북도 한옥마을 빅데이터 분석사업(2015 공모, 국비 5억).

### 2-16. 전라남도
- **JN TOUR (전남관광플랫폼)**: <http://intro.jeonnamtour.kr/>
- **남도여행길잡이**: <https://www.namdokorea.com/>
- **전남 관광 메타버스 (디토랜드)**: <https://ditoland.net/world_detail/839>

### 2-17. 제주특별자치도
- **제주관광 빅데이터 서비스 플랫폼 (data.ijto.or.kr)**:
  - 이동통신·신용카드·내비게이션 데이터.
  - Data Map Jeju: 유동인구 혼잡도, 차량 분포, 신용카드 소비 결합.
  - 43종 관광 데이터 → 문화 빅데이터 플랫폼 개방.
- **제주데이터허브 (jejudatahub.net)** — 제주의 모든 데이터 검색·활용.
  - 제주관광공사_제주방문관광객_통계: <https://www.jejudatahub.net/data/view/data/20>
  - 제주특별자치도_내국인관광지입장객수추이: <https://www.jejudatahub.net/data/view/data/189>
  - 관광지별 내국인 유입자 수: <https://www.jejudatahub.net/data/view/data/591>
  - 관광 숙박업 정보: <https://jejudatahub.net/data/view/data/837>
- **VISIT JEJU TourAPI** (REST + SPARQL): <https://tourapi.visitjeju.net/>
- **제주특별자치도 OpenAPI 활용가이드**: <https://www.jeju.go.kr/open/data/guide.htm>

---

## 3. 시·군 단위 특색있는 데이터 플랫폼

### 3-1. 다도라(DADORA) SaaS형 스마트관광 전자지도
지자체 단위 도입 사례:
- 충청남도 (광역): <https://chungnam.dadora.kr/>
- 다원: <https://teagarden.dadora.kr/>
- 동대문구: <https://dongdaemun.dadora.kr/>
- 서대문구: <https://sdm.dadora.kr/>
- 장성군: <https://jangseong.dadora.kr/>
- 남양주시: <https://namyangju.dadora.kr/>
- 태백시: <https://taebaek.dadora.kr/>
- 횡성군: <https://hoengseong.dadora.kr/>

### 3-2. 시·군 단위 관광 포털
- 비짓전주: <https://tour.jeonju.go.kr/>
- 전주한옥마을: <https://hanok.jeonju.go.kr/>
- 전주한옥마을닷컴: <http://jeonju-hanokvillage.com/>
- 강릉관광개발공사: <https://www.gtdc.or.kr/>
- 대구트립로드: <https://tour.daegu.go.kr/>

---

## 4. 통계·연구 보조 자료

- 한국관광공사_국문 관광정보 서비스_GW: <https://www.data.go.kr/data/15101578/openapi.do>
- 한국관광공사_한국관광통계 공표(2023-07-31 기준): <https://www.data.go.kr/data/15105720/fileData.do>
- 문화체육관광부_관광지 관광단지 현황(2024-05-31): <https://www.data.go.kr/data/3075662/fileData.do>
- 한국관광 데이터랩 인터뷰(생태관광 프로그램 개편 사례): <https://datalab.visitkorea.or.kr/html/interview2/interview02.jsp>
- 한국관광 데이터랩 인터뷰(내비게이션 빅데이터 활용 슬로드 사례): <https://datalab.visitkorea.or.kr/html/interview/interview02.jsp>
- 빅데이터 분석을 활용한 광주·전남지역 관광산업 진단 및 발전 (한국은행 광주전남본부): <https://www.bok.or.kr/ucms/cmmn/file/fileDown.do?atchFileId=FILE_000000000008867>

---

## 5. 한국 관광 OpenAPI 모음 (커뮤니티)

- public-apis-4Kr (GitHub): <https://github.com/yybmion/public-apis-4Kr>
  - 한국 서비스 이용 가능한 Public API 모음.

---

## 6. 데이터 활용 등급 매트릭스 (관광 분야)

| 광역 | 자체 OpenAPI 풍부도 | 자체 빅데이터 플랫폼 | 통합 데이터마켓 | 메타버스/3D | LOD/SPARQL |
| --- | --- | --- | --- | --- | --- |
| 서울 | ★★★★★ | ★★★★★(캠퍼스 4,500종) | △ | △ | ○(서울LOD) |
| 부산 | ★★★★ | ★★★★★(데이터웨이브) | ○(전국 최초) | x | x |
| 인천 | ★★★ | ★★(스마트관광도시) | x | x | x |
| 경기 | ★★★★ | ★★★★(데이터드림) | △ | x | x |
| 강원 | ★★ | ★★★(공공데이터+알리미) | x | x | x |
| 충북 | ★★ | ★★★(빅데이터 허브) | x | x | x |
| 충남 | ★★ | ★★★(올담+다도라) | x | x | x |
| 세종 | ★ | ★★★(세담터) | x | x | x |
| 대전 | ★★ | ★★ | x | x | x |
| 광주 | ★★ | ★★ | x | △(미디어아트플랫폼) | x |
| 대구 | ★★★ | ★★★(데이터랩+활용센터) | x | △ | x |
| 울산 | ★★ | ★★ | x | x | x |
| 경북 | ★★ | ★★★ | x | ○(메타포트, XR) | x |
| 경남 | ★★★ | ★★★(빅데이터허브) | x | x | x |
| 전북 | ★★ | ★★ | x | x | x |
| 전남 | ★★ | ★★(JN TOUR) | x | ○(디토랜드) | x |
| 제주 | ★★★★★ | ★★★★★(IJTO+허브) | △ | x | ○(SPARQL) |

---

## 7. 출처 정리 (URL)

### 국가급
- 공공데이터포털: <https://www.data.go.kr/>
- KTO 콘텐츠랩 / TourAPI: <https://api.visitkorea.or.kr/>
- 한국관광 데이터랩: <https://datalab.visitkorea.or.kr/>
- 관광지식정보시스템: <https://www.tour.go.kr/>
- 관광기업지원포털 투어라즈: <https://touraz.kr/>
- 관광e배움터: <https://touredu.visitkorea.or.kr/>
- 문화 빅데이터 플랫폼: <https://www.bigdata-culture.kr/>
- TDSS 관광개발정보시스템: <https://www.tdss.kr/>
- 2025 관광데이터 활용 공모전: <https://www.2025tourapi.com/>

### 광역 빅데이터/포털 (재인용)
- 부산 Big-데이터웨이브: <https://data.busan.go.kr/bdip/>
- 부산광역시 빅데이터 플랫폼: <https://bigdata.busan.go.kr/>
- 부산 빅데이터 혁신센터: <https://busanbigdata.kr/>
- 서울 열린데이터광장: <https://data.seoul.go.kr/>
- 서울 빅데이터 캠퍼스: <https://bigdata.seoul.go.kr/>
- 서울 LOD: <http://lod.seoul.go.kr/home/>
- 인천관광공사 OPEN API: <https://www.ito.or.kr/main/information/public_data4.jsp>
- 경기데이터드림: <https://data.gg.go.kr/>
- 경기 데이터 분석포털: <https://insight.gg.go.kr/>
- 경기관광공사 데이터 공유 플랫폼: <https://data.gto.or.kr/>
- 강원 공공데이터: <https://data.gwd.go.kr/>
- 강원특별자치도청 공공데이터 개방: <https://state.gwd.go.kr/portal/administration/openData/dataopen>
- 강원 교육·연구 빅데이터 허브: <https://bigdata.risdata.or.kr/>
- 강원관광재단 알리미: <https://www.gwtoalimi.com/kr>
- 충북 빅데이터 허브: <https://data.chungbuk.go.kr/>
- 충북 OpenAPI 목록: <https://chungbuk.go.kr/www/pubdataView.do?key=302>
- 충남 데이터포털 올담: <https://alldam.chungnam.go.kr/>
- 충남 다도라: <https://chungnam.dadora.kr/>
- 세담터(세종): <https://www2.sejong.go.kr/bigdata/>
- 대전관광공사 공공데이터: <https://www.djto.kr/kor/page.do?menuIdx=620>
- 광주미디어아트플랫폼: <https://gmap.gwangju.go.kr/>
- 광주관광기업지원센터 빅데이터 교육: <https://tourbiz.gjto.or.kr/user/board/view/board_cd/notice/wr_no/121>
- 대구관광 데이터랩: <https://tourdata.daegu.go.kr/>
- 대구 빅데이터활용센터: <http://dipbigdata.kr/>
- 경남빅데이터허브플랫폼: <https://bigdata.gyeongnam.go.kr/>
- 경상남도_문화관광 OpenAPI: <https://www.data.go.kr/data/15062531/openapi.do>
- JN TOUR (전남관광플랫폼): <http://intro.jeonnamtour.kr/>
- 남도여행길잡이: <https://www.namdokorea.com/>
- 전남 관광 메타버스 디토랜드: <https://ditoland.net/world_detail/839>
- 제주관광 빅데이터 플랫폼 (data.ijto.or.kr): <https://data.ijto.or.kr/>
- 제주데이터허브: <https://www.jejudatahub.net/>
- VISIT JEJU TourAPI: <https://tourapi.visitjeju.net/>
- 제주특별자치도 OpenAPI 활용가이드: <https://www.jeju.go.kr/open/data/guide.htm>

### 문화재단/콘텐츠
- 충북콘텐츠코리아랩: <https://www.cbckl.kr/>
- 광주미디어아트페스티벌: <http://www.gjcf.or.kr/cf/culture/media/festival.do>
- 빛고을시민문화관: <http://bitculture.gjcf.or.kr/>

### 시·군
- 비짓전주: <https://tour.jeonju.go.kr/>
- 전주한옥마을: <https://hanok.jeonju.go.kr/>
- 강릉관광개발공사: <https://www.gtdc.or.kr/>
- 대구트립로드: <https://tour.daegu.go.kr/>
