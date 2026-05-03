# 19. 지역특화 서비스 특별상 대상 RTO 심층 분석

> 본 문서는 2026 한국관광공사 관광데이터 활용 공모전(추정 기준 2025년 공모 정보 활용)의 "지역특화 서비스 특별상" 협업 RTO를 정리한다.
> **공식 협업 RTO 수**: 2025년 공모전 기준 **7개 기관** (부산관광공사, 인천관광공사, 광주광역시관광공사, 세종시문화관광재단, 경상북도문화관광공사, 강원관광재단, 제주관광공사). 사용자가 언급한 "8개"에는 충남(충남문화관광재단)·대전(대전관광공사) 등이 포함된 것으로 보이며, 본 문서는 사용자 지정 8개(부산·대전·광주·세종·충남·경북·강원·제주)를 기준으로 정리하되, 인천도 함께 다루기 위해 본 시리즈의 20번 문서에 보완 정리한다.
> 출처: [2025 관광데이터 활용 공모전 공식](https://www.2025tourapi.com/) · [한국관광공사 보도자료](https://knto.or.kr/pressRelease/549290)

---

## 0. 한눈에 보는 비교 표

| RTO | 공식 사이트 | 자체 OpenAPI/공공데이터 | 자체 빅데이터 플랫폼 | 대표 지역 콘텐츠 |
| --- | --- | --- | --- | --- |
| 부산관광공사 (BTO) | [bto.or.kr](https://bto.or.kr/) · [VISIT BUSAN](https://www.visitbusan.net/) | 공공데이터포털(부산명소·관광안내소·갈맷길) | [Big-데이터웨이브](https://data.busan.go.kr/bdip/) | 갈맷길, 부산국제관광도시, 7Beach |
| 대전관광공사 (DJTO) | [djto.kr](https://www.djto.kr/) · [daejeontour.co.kr](https://daejeontour.co.kr/) | 공공데이터 페이지 운영(djto.kr) | 대전시 빅데이터 활용(시 본청) | 대전 0시 축제, 사이언스 페스티벌, 빵축제 |
| 광주관광공사 (GJTO) | [gjto.or.kr](https://www.gjto.or.kr/) · [tour.gwangju.go.kr](https://tour.gwangju.go.kr/) | 광주관광기업지원센터, 빅데이터 활용 교육 | 광주미디어아트플랫폼 등 시 단위 | 5·18 사적, 광주미디어아트페스티벌, UNESCO 미디어아트 창의도시 |
| 세종시문화관광재단 (SCF) | [sjcf.or.kr](https://www.sjcf.or.kr/) · [sejong.go.kr/tour](https://www.sejong.go.kr/tour/) | 세종시 빅데이터 플랫폼(시 본청) | [세담터(세종 빅데이터 플랫폼)](https://www2.sejong.go.kr/bigdata/) | 호수공원, 국립세종수목원, 정부청사 인접 콘텐츠 |
| 충남문화관광재단 (CACF) | [cacf.or.kr](https://www.cacf.or.kr/) | [충남 데이터포털 올담](https://alldam.chungnam.go.kr/) | 올담 + [충남 스마트관광 다도라](https://chungnam.dadora.kr/) | 백제역사유적지구(공주·부여), 보령머드, 태안 |
| 경상북도문화관광공사 (GTC) | [gtc.co.kr](https://www.gtc.co.kr/) | [공공데이터포털(경북문화관광공사)](https://www.data.go.kr/tcs/dss/selectDataSetList.do?org=경상북도문화관광공사) | 경북 메타포트(메타버스), XR체험존 | 경주(신라), 안동(유교), 울릉·독도 |
| 강원관광재단 (GWTO) | [gwto.or.kr](https://www.gwto.or.kr/) · [gangwon.to](https://www.gangwon.to/) | 강원 공공데이터([data.gwd.go.kr](https://data.gwd.go.kr/)) | 강원관광재단 알리미 + 시 본청 빅데이터 | 강원 방문의 해 2025-2026, 강원더풀, 워케이션 |
| 제주관광공사 (IJTO/JTO) | [ijto.or.kr](https://www.ijto.or.kr/) · [VISIT JEJU](https://www.visitjeju.net/) | [VISIT JEJU TourAPI](https://tourapi.visitjeju.net/) (REST/SPARQL) | [data.ijto.or.kr](https://data.ijto.or.kr/) · [제주데이터허브](https://www.jejudatahub.net/) | 제주올레, 9경/9미/9품, 한라산, 동·서부 권역 |

---

## 1. 부산관광공사 (Busan Tourism Organization, BTO)

### 1-1. 운영 중인 공식 웹·앱
- **공사 홈페이지**: <https://bto.or.kr/> — 공사 소개, 사업 안내, 채용·정보공개.
- **VISIT BUSAN 공식 관광 포털**: <https://www.visitbusan.net/kr/index.do> — 부산시 공식 관광 포털. 부산 여행 정보 제공.
- **부산시티투어**: <https://citytourbusan.com/> — 시티투어 노선·예약.
- **부산광역시 관광 페이지**: <https://www.busan.go.kr/depart/busan-tour> — 부산광역시 본청의 관광통계·정책 페이지.
- **부산광역시관광협회**: <http://www.bta.or.kr/>

### 1-2. 자체 OpenAPI / 공공데이터
공공데이터포털과 부산시 자체 데이터 포털에서 다수 개방 중.

| 데이터셋 | 출처 | URL |
| --- | --- | --- |
| 부산광역시_갈맷길 코스 정보 서비스 | data.go.kr | <https://www.data.go.kr/data/15058979/openapi.do> |
| 부산광역시_갈맷길 편의시설 안내 | data.go.kr | <https://www.data.go.kr/data/15077589/openapi.do> |
| 부산광역시_부산명소정보 서비스 | data.go.kr | <https://www.data.go.kr/data/15063481/openapi.do> |
| 부산광역시_부산관광안내소정보 서비스 | data.go.kr | <https://www.data.go.kr/data/15063445/openapi.do> |
| 부산광역시_AVI 교통량 | data.go.kr | <https://www.data.go.kr/data/15121018/openapi.do> |
| 부산광역시_링크소통정보(실시간 교통) | data.go.kr | <https://www.data.go.kr/data/15120905/openapi.do> |
| Busan 7Beach 관광·식음 OPEN API (BTO 협력 운영) | redtable | <https://busan-7beach.openapi.redtable.global/> |

### 1-3. 자체 빅데이터 플랫폼
- **Big-데이터웨이브 (부산형 데이터 통합플랫폼)**: <https://data.busan.go.kr/bdip/>
  - 데이터 카탈로그(공공·맞춤형), 데이터분석(대시보드, 셀프분석), 데이터마켓(데이터 구매·맞춤형 데이터 의뢰), 데이터 지도(전국통합맵, 지도기반데이터, 시민공감지도) 제공.
  - **데이터마켓 서비스 운영은 광역지자체 최초**.
  - 시범 후 2025년 7월 21일 본격 운영 개시.
- **부산 빅데이터 혁신센터**: <https://busanbigdata.kr/>
- **부산광역시 빅데이터 플랫폼**: <https://bigdata.busan.go.kr/>
- 출처: [부산형 데이터 통합플랫폼 본격 가동(부산언론인연합회)](https://www.bja.kr/108) · [쿠키뉴스 보도](https://www.kukinews.com/article/view/kuk202507210051)

### 1-4. 지역 특화 콘텐츠
- **갈맷길** (부산 9개 코스 도보 트레일) — 코스·편의시설 OpenAPI 공개, VR 정보 제공.
- **부산국제관광도시 사업** — 부산광역시 5대 추진전략(<https://www.busan.go.kr/tourism02>).
- **부산 7Beach** — 해운대 등 7개 해변 식음·관광 통합 OpenAPI.
- **부산시티투어**, **부산국제영화제(BIFF)**, **부산크루즈·MICE**.

### 1-5. 디지털 사업·공모전·스타트업 지원
- 2025 관광데이터 활용 공모전 RTO 협업기관(특별상) — 출처: [2025 공모전 공식](https://www.2025tourapi.com/).
- Big-데이터웨이브 데이터마켓 통한 민간기업 참여·홍보 지원.

### 1-6. 통계·보고서
- 부산광역시 관광통계 페이지: <https://www.busan.go.kr/depart/busan-tour>
- 한국관광 데이터랩 지역별 관광 현황 — 부산(시도코드 26)

---

## 2. 대전관광공사 (Daejeon Tourism Organization, DJTO)

### 2-1. 운영 중인 공식 웹·앱
- **공사 홈페이지**: <https://www.djto.kr/kor/index.do>
- **대전관광 포털**: <https://daejeontour.co.kr/>
- **2025 대전 0시 축제 공식**: <https://djzerofe.com/>
- **인스타그램**: @daejeontourism
- **유튜브 채널**: 대전관광공사 (UCFS6QSDZagEB2eMShxGU9IQ)

### 2-2. 자체 OpenAPI / 공공데이터
- 공사 정보공개 → 공공데이터: <https://www.djto.kr/kor/page.do?menuIdx=620>
- 대전 본청 공공데이터 페이지 활용. 자체 운영 OpenAPI 비중은 KTO TourAPI / data.go.kr 활용 기반.

### 2-3. 자체 빅데이터 플랫폼
- 별도 RTO 단위 빅데이터 플랫폼은 미확인. 대전광역시 빅데이터 활용 기반(시 본청) 활용.

### 2-4. 지역 특화 콘텐츠
- **대전 0시 축제** — 원도심(중앙로~구 충남도청) 차없는 거리 축제, 8월 개최.
  - 출처: [나무위키 대전0시축제](https://namu.wiki/w/%EB%8C%80%EC%A0%840%EC%8B%9C%EC%B6%95%EC%A0%9C)
- **대전 사이언스 페스티벌** — 과학 도시 정체성 기반.
- **대전 빵축제** — 성심당 등 지역 베이커리 브랜드 연계.
- **2026 대전 국제와인 EXPO** — 인턴 모집 등 사전 준비 진행.

### 2-5. 디지털 사업·공모전·지원프로그램
- **2025 대전세종 인트라바운드 관광 콘텐츠 지원사업** — 대전·세종을 중심으로 전국권 연계 당일·숙박형 여행 콘텐츠 발굴, 5개 콘텐츠 최종 선정.
  - 출처: [공고(djto.kr)](https://www.djto.kr/kor/board.do?menuIdx=609&bbsIdx=12452) · [bizinfo 공고](https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=PBLN_000000000105817) · [시사저널 보도](https://www.sisajournal.com/news/articleView.html?idxno=329397)
- **2025 대전 꿈씨기자단** (블로그 12명·인스타그램 6명) — 0시축제·사이언스페스티벌·빵축제·국제와인엑스포 등 콘텐츠 제작.
  - 출처: [시사저널](https://www.sisajournal.com/news/articleView.html?idxno=330138)
- **2026 대전 0시 축제** 협력체계 — 대전관광공사·씨엔씨티마음에너지재단 업무협약(공동브랜딩 상품 개발, 콘텐츠 발굴).
  - 출처: [헤럴드경제](https://biz.heraldcorp.com/article/10692407)

### 2-6. 통계·보고서
- 한국관광 데이터랩 지역별(대전 시도코드 30) 통계 활용.

---

## 3. 광주관광공사 (Gwangju Tourism Organization, GJTO)

### 3-1. 운영 중인 공식 웹·앱
- **공사 홈페이지**: <https://www.gjto.or.kr/>
- **광주관광 포털 "오매광주"**: <https://tour.gwangju.go.kr/>
- **광주관광기업지원센터**: <https://tourbiz.gjto.or.kr/>
- 인스타그램: @gjto_official, 페이스북: gjto.official, 유튜브: 광주광역시 관광공사 GJTO

### 3-2. 자체 OpenAPI / 공공데이터
- 공공데이터 페이지 운영. KTO TourAPI 및 data.go.kr 기반.
- 광주관광기업지원센터에서 **관광 빅데이터 활용 교육** 정기 운영.
  - 6회차 교육 공고: <https://tourbiz.gjto.or.kr/user/board/view/board_cd/notice/wr_no/121>

### 3-3. 자체 빅데이터 플랫폼
- 광주광역시 본청 데이터 + 광주문화재단 운영 플랫폼 활용.
- **광주미디어아트플랫폼**: <https://gmap.gwangju.go.kr/>

### 3-4. 지역 특화 콘텐츠
- **광주미디어아트페스티벌(GMAF)** — 광주문화재단 주관, UNESCO 미디어아트 창의도시 인증.
  - 출처: [광주문화재단 미디어아트페스티벌](http://www.gjcf.or.kr/cf/culture/media/festival.do)
- **5·18 민주화 운동 사적지·관련 콘텐츠**, **국립아시아문화전당(ACC)** 인접 도심 콘텐츠.
- **빛고을 시민문화관·빛고을아트스페이스**.

### 3-5. 디지털 사업·공모전·지원프로그램
- 광주관광공사 비전: "광주의 미래가치를 창출하는 관광마이스 통합플랫폼".
- **2025 광주 관광 일자리 페스타** 운영 용역 진행.
- 2025 관광데이터 활용 공모전 RTO 특별상 협업기관.

### 3-6. 통계·보고서
- 한국관광 데이터랩 지역별(광주 시도코드 29) 통계.
- 한국은행 광주전남본부 [빅데이터 분석을 활용한 광주·전남지역 관광산업 진단 및 발전](https://www.bok.or.kr/ucms/cmmn/file/fileDown.do?atchFileId=FILE_000000000008867&fileSn=1&menuNo=200560)

---

## 4. 세종시문화관광재단 (Sejong Culture & Tourism Foundation, SCF)

### 4-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://www.sjcf.or.kr/>
- **세종시 여행정보 포털**: <https://www.sejong.go.kr/tour/index.do>
- 인스타그램: @sjcf_official
- 위키백과 정의: 세종특별자치시 문화재단 — 세종특별자치시 문화진흥에 관한 중요 시책을 심의·지원하기 위해 시청 출연으로 설립.

### 4-2. 자체 OpenAPI / 공공데이터
- 재단 자체 OpenAPI 공개분 미확인. 세종시 본청 공공데이터 / KTO TourAPI 활용.

### 4-3. 자체 빅데이터 플랫폼
- **세종특별자치시 빅데이터 개방형 플랫폼 "세담터"**: <https://www2.sejong.go.kr/bigdata/>
  - 빅데이터 분석 자료, 테마 분석, 시민데이터지도, 아이디어 공모전.
  - **세종특별자치시 제6회 빅데이터 분석 아이디어 공모전** — 문화행사·시설·교육 프로그램·콘텐츠 등 데이터 기반 정책 아이디어 제시.
  - 출처: [위비티 공모전](https://www.wevity.com/index_university.php?c=find&s=_university&mode=ing&gbn=viewok&gp=11&ix=101356)

### 4-4. 지역 특화 콘텐츠
- **세종호수공원** — 국내 최대 인공호수.
- **국립세종수목원**, **베어트리파크**, **금강 자전거길**.
- **정부세종청사 견학 콘텐츠**.

### 4-5. 디지털 사업·공모전·지원프로그램
- 2026 관광기업 데이터·AI 활용 지원 사업 공고 (touraz.kr).
  - <https://touraz.kr/announcementList/pssrpView?pssrpSeqEnc=%5EgoLEJmaV*qcpvRMc9Qnkw%3D%3D&curPage=1>
- 2025 관광데이터 활용 공모전 RTO 특별상 협업기관.

### 4-6. 통계·보고서
- 한국관광 데이터랩 지역별(세종 시도코드 36) 통계 활용.

---

## 5. 충청남도 / 충남문화관광재단 (CACF)

### 5-1. 운영 중인 공식 웹·앱
- **충남문화관광재단 홈페이지**: <https://www.cacf.or.kr/>
- **재단 페이스북**: facebook.com/cnctf, 인스타: @cnctf_official, 유튜브: cnctf
- **충남관광 유튜브**: <https://www.youtube.com/@chungnamtour>
- **충남역사박물관**: <https://museum.cihc.or.kr/>

### 5-2. 자체 OpenAPI / 공공데이터
- **충청남도 데이터포털 "올담"**: <https://alldam.chungnam.go.kr/>
  - 공공데이터, 맞춤형데이터(지역별), 데이터지도 제공.
  - 데이터 → 맞춤형데이터 → 지역별: <https://alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201003003000>

### 5-3. 자체 빅데이터 / 스마트관광 플랫폼
- **충청남도 스마트관광 전자지도 "다도라(DADORA)"**: <https://chungnam.dadora.kr/>
  - 충청남도의 모든 것을 한눈에 모바일 스마트 전자지도로 제공.
  - 다도라는 동대문구·서대문구·장성군·남양주시·태백시·횡성군 등 전국 다수 지자체에서 채택된 SaaS형 스마트관광 전자지도 플랫폼.

### 5-4. 지역 특화 콘텐츠
- **백제역사유적지구**(공주·부여) — 유네스코 세계유산.
- **보령머드축제**, **태안 안면도**, **서천 갯벌**.
- **충남역사박물관** 디지털 아카이브.

### 5-5. 디지털 사업·공모전·지원프로그램
- 충남 다도라 + 올담 데이터포털 결합 운영.
- 충남문화관광재단은 2025 관광데이터 활용 공모전 공식 협업 RTO 명단에는 포함되지 않았으나, 사용자 지정 8개 권역 중 하나임.

### 5-6. 통계·보고서
- 한국관광 데이터랩 지역별(충남 시도코드 34) 통계.

---

## 6. 경상북도문화관광공사 (Gyeongbuk Tourism Corporation, GTC)

### 6-1. 운영 중인 공식 웹·앱
- **공사 홈페이지**: <https://www.gtc.co.kr/> — "세계와 하나되는 문화관광 플랫폼".
- **경북관광기업지원센터**: <https://tourbiz.gtc.co.kr/>
- **온라인 신청 시스템**: <https://gctogg.or.kr/>
- **경상북도 본청 문화관광 안내**: <https://www.gb.go.kr/Main/open_contents/section/culture/page.do?mnu_uid=1690>

### 6-2. 자체 OpenAPI / 공공데이터
- 공공데이터포털 내 경상북도문화관광공사 카탈로그: <https://www.data.go.kr/tcs/dss/selectDataSetList.do?org=경상북도문화관광공사>
- **사전정보공표 데이터셋(2025-05-22)**: <https://www.data.go.kr/data/15145391/fileData.do?recommendDataYn=Y>

### 6-3. 자체 빅데이터 / 메타버스 플랫폼
- **경북 메타버스 통합 플랫폼 "메타포트(Metaport)"** — 2022~2024 30억 투입, 11월 20일 정식 서비스 개시. 대구경북통합신공항을 메인 공간으로 구성.
- **메타버스 XR체험존** — 지자체 최초 개관식. 초자각몽 콘텐츠, 신라 경문왕 설화 배경 과거-미래 퓨전 콘텐츠, 신라 수로부인 콘텐츠 등.
  - 출처: [12.27 메타버스 XR체험존 개관식](https://gb.go.kr/Main/finace/page.do?cmd=2&iidx=54335) · [경북도청 보도](https://www.gb.go.kr/Main/page.do?mnu_uid=6792&BD_CODE=bbs_bodo&cmd=2&Start=0&B_NUM=339654301)
- **메타버스 관광특구**, **황룡사(신라왕경) 메타버스 콘텐츠 구축**, **1시군 1관광지 가상공간 구축** 계획.
- 파이낸셜뉴스: ['메타버스 수도 경북' 구상](https://www.fnnews.com/news/202202060859197933)

### 6-4. 지역 특화 콘텐츠
- **경주(신라 왕경)** — 황룡사·불국사·석굴암.
- **안동(유교 문화)** — 도산서원, 하회마을.
- **울릉·독도**, **포항 호미곶**, **문경새재**.

### 6-5. 디지털 사업·공모전·지원프로그램
- 경북관광기업지원센터 운영.
- 메타포트·XR체험존 등 메타버스 사업 적극 추진.
- 2025 관광데이터 활용 공모전 RTO 특별상 협업기관.

### 6-6. 통계·보고서
- 한국관광 데이터랩 지역별(경북 시도코드 47) 통계.

---

## 7. 강원관광재단 (Gangwon Tourism Organization, GWTO)

### 7-1. 운영 중인 공식 웹·앱
- **재단 홈페이지**: <https://www.gwto.or.kr/>
- **강원관광 포털**: <https://www.gangwon.to/>
- **강원관광재단 알리미**: <https://www.gwtoalimi.com/kr>
- **강원 방문의 해 공식**: <https://visitgw2526.kr/>
- **강원 워케이션 플랫폼**: <https://worcation.co.kr/>
- 인스타그램: @gwto_official

### 7-2. 자체 OpenAPI / 공공데이터
- **강원특별자치도 공공데이터**: <https://state.gwd.go.kr/portal/administration/openData/dataopen>
- **강원 공공데이터 포털**: <https://data.gwd.go.kr/>
  - 표준데이터 / 전체데이터 / 차트·파일·링크·맵·OpenAPI·시트 모두 제공.
- 한국관광공사 KTO 데이터 + 강원 공공데이터 결합 활용.

### 7-3. 자체 빅데이터 플랫폼
- **강원 교육·연구 빅데이터 허브 플랫폼**: <https://bigdata.risdata.or.kr/>
- 한국관광 데이터랩 강원 지역별 통계와 강원 공공데이터 결합.

### 7-4. 지역 특화 콘텐츠
- **강원 방문의 해 2025-2026** — 슬로건: **"특별한 여행, 강원더풀(Gangwonderful)"**.
  - 2024년 11월 춘천 선포식 개최.
  - 강원 18개 시·군 함께 통합 관광전담기구 역할.
  - 매월 두 곳의 시군 선정 → '이달의 추천 여행지' 사업.
  - 출처: [아주경제](https://www.ajunews.com/view/20251218113319763) · [월간인물 인터뷰(최성현 대표)](https://www.monthlypeople.com/news/articleView.html?idxno=701149)
- **강원 워케이션** — 2021년부터 데스커 양양·워크온더비치 등 서핑·요가 등 해양 액티비티 결합.
- **평창올림픽 유산**, **속초·강릉 해변**, **설악산·오대산**.
- 2025-2026 강원 방문의 해 첫해(2025) 11월 말 기준 방문객 전년 대비 430만 명(3.1%) 증가, 1억4364만 명 기록.

### 7-5. 디지털 사업·공모전·지원프로그램
- **2025 강원특별자치도 해양 관광 콘텐츠 공모전** (5/1~5/31).
  - 출처: [관광e배움터](https://academy.visitkorea.or.kr/macademy/notice/bbs/detail.do?seq=2967)
- **강원관광재단-신한은행 강원영서본부** 강원 방문의 해 성공 MOU.
- **강원관광재단-바르게살기운동 강원자치도협의회** 공동 홍보 MOU.
- 2025-2026 강원 방문의 해 포럼 성료([머니투데이방송](https://news.mtn.co.kr/news-detail/2025112710201451221)).
- 2025 관광데이터 활용 공모전 RTO 특별상 협업기관.

### 7-6. 통계·보고서
- 강원관광재단 알리미 통계, 한국관광 데이터랩 지역별(강원 시도코드 51) 통계.

---

## 8. 제주관광공사 (Jeju Tourism Organization, IJTO/JTO)

### 8-1. 운영 중인 공식 웹·앱
- **공사 홈페이지**: <https://www.ijto.or.kr/>
- **VISIT JEJU 공식 관광 포털**: <https://www.visitjeju.net/>
- **VISIT JEJU 모바일 앱**: <https://play.google.com/store/apps/details?id=com.intelleaders.androidtourjeju> (Google Play)
- **제주관광 빅데이터 플랫폼**: <https://data.ijto.or.kr/>
- **VISIT JEJU TourAPI 사이트**: <https://tourapi.visitjeju.net/>
- **제주데이터허브** (제주도 공공): <https://www.jejudatahub.net/>
- **탐나오** (제주도 공식 여행 플랫폼·할인): <https://www.tamnao.com/>

### 8-2. 자체 OpenAPI / 공공데이터
- **VISIT JEJU 관광정보 오픈 API** — REST 기반(JSON/XML) + **SPARQL endpoint** 제공.
  - 데이터 탐색, 사진 정보 검색, Open API 활용 신청, SPARQL 쿼리 실행.
  - 공공데이터포털 등록: <https://www.data.go.kr/data/15076361/openapi.do>
- **제주관광공사 공공데이터 제공 페이지**: <https://ijto.or.kr/korean/index.php?cid=138>
- **공공데이터 신청·활용제안**: <https://ijto.or.kr/korean/index.php?cid=246>
- 주요 개방 데이터셋:
  - 제주관광공사_제주관광정보시스템(VISIT JEJU)_콘텐츠 (전체 데이터 7,698건; 콘텐츠ID, 분류, 제목, 언어, 좌표 등) — <https://www.data.go.kr/data/15049999/fileData.do>
  - 제주관광공사_제주관광정보시스템(VISIT JEJU)_숙박콘텐츠 — <https://www.data.go.kr/data/15041985/fileData.do>
  - 제주특별자치도_올레코스현황 (총연장 437km, 27개 코스) — <https://www.data.go.kr/data/15043496/fileData.do>
  - 제주특별자치도_제주지역 상세기상정보 조회서비스 — <https://www.data.go.kr/data/15058361/openapi.do>

### 8-3. 자체 빅데이터 플랫폼
- **제주 관광 빅데이터 서비스 플랫폼 (data.ijto.or.kr)**:
  - 제공 데이터: 모바일 통신, 신용카드, 내비게이션 데이터.
  - 시각화: 방문자 수, 신용카드 매출 분석, 인기 관광지(지역별).
  - 통합 빅데이터 — 사전·여행 중·사후 단계 망라(교통·관광지·쇼핑 등).
  - 43종 관광 데이터를 문화 빅데이터 플랫폼([www.bigdata-culture.kr](https://www.bigdata-culture.kr/bigdata/user/data_market/agency/detail.do?id=ijto_org))에 개방, 43개 활용기업·3,146건 다운로드.
  - **Data Map Jeju** 서비스 — 유동인구 혼잡도, 차량 분포 맵, 신용카드 소비 데이터 결합.
  - 출처: [제주매일](https://www.jejumaeil.net/news/articleView.html?idxno=336610) · [트래블데일리](https://www.traveldaily.co.kr/news/articleView.html?idxno=70682) · [한국경제](https://www.hankyung.com/article/202405021185Y)
- **제주데이터허브 (jejudatahub.net)** — 제주의 모든 데이터.
  - 제주관광공사_제주방문관광객_통계: <https://www.jejudatahub.net/data/view/data/20>
  - 제주특별자치도_내국인관광지입장객수추이: <https://www.jejudatahub.net/data/view/data/189>
  - 관광지별 내국인 유입자 수: <https://www.jejudatahub.net/data/view/data/591>
  - 관광 숙박업 정보: <https://jejudatahub.net/data/view/data/837>

### 8-4. 지역 특화 콘텐츠
- **제주올레** — 27개 코스, 총연장 437km. 공식 사이트: <https://www.jejuolle.org/trail>.
- **VISIT JEJU "제주의 9경/9미/9품" 콘텐츠 카테고리**.
- **한라산 국립공원**, **유네스코 세계자연유산**.
- **제주올레길 이용 밀도맵**(500x500m 격자, 월 단위) — 빅데이터 산출물.
  - <https://www.bigdata-culture.kr/bigdata/user/data_market/detail.do?id=df24ecb0-5bb5-11ec-8ee4-95f65f846b27>

### 8-5. 디지털 사업·공모전·지원프로그램
- **2025년 제주관광 데이터 활용 공모전** — IJTO 자체 공모전.
  - 공지: <https://ijto.or.kr/korean/Bd/view.php?btable=notice&bno=1327>
- 2025 관광데이터 활용 공모전 RTO 특별상 협업기관.
- 제주관광 빅데이터 플랫폼 사용자 친화적 개편(반응형 웹 기술 도입, 2024).

### 8-6. 통계·보고서
- 제주방문 관광객 이동패턴 빅데이터 분석 연구(IJTO 정책연구):
  - <https://ijto.or.kr/korean/Bd/view.php?btable=policy&bno=41>
- 한국관광 데이터랩 지역별(제주 시도코드 50) 통계.

---

## 9. 8개 권역 차별점 종합 매트릭스

| 차별점 | 부산 | 대전 | 광주 | 세종 | 충남 | 경북 | 강원 | 제주 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 자체 풀스택 OpenAPI(REST+SPARQL) | △ | x | x | x | x | x | x | **○** |
| 자체 RTO 빅데이터 플랫폼 | **○ Big-데이터웨이브** | x | △(시 본청) | △(세담터) | △(올담+다도라) | △(메타포트) | △(시 본청) | **○ data.ijto.or.kr** |
| 메타버스/XR 자체 콘텐츠 | x | x | △ | x | x | **○ XR체험존·메타포트** | x | x |
| 도보·트레일 시그니처 | **갈맷길 9코스** | - | - | - | - | - | 설악·바우길 | **올레 27코스 437km** |
| 대표 축제·이벤트 | BIFF, 부산국제관광도시 | **0시 축제** | 미디어아트페스티벌 | - | 머드축제 | 신라·유교 | 강원 방문의 해 | 들불축제 |
| 워케이션·체류형 사업 | - | - | - | - | - | - | **○ 강원 워케이션** | △ |
| 외래관광객 비중 강함 | **○** | x | x | x | x | △ | △ | **○** |
| 정부 지정 거점·국제관광도시 | **국제관광도시** | - | - | - | - | **안동(거점)** | **강릉(거점)** | - |
| KTO TourAPI 의존도 | 중 | **고** | **고** | **고** | 중 | 중 | 중 | **저(자체 풍부)** |

### 핵심 차별점 요약 (한 줄)
- **부산**: 광역지자체 최초 데이터마켓(Big-데이터웨이브) + 갈맷길/7Beach 등 자체 OpenAPI 풍부. 국제관광도시.
- **대전**: 0시축제·사이언스·빵·국제와인엑스포 등 도시 브랜딩 축제 IP 집중. 인트라바운드 연계 콘텐츠 사업.
- **광주**: UNESCO 미디어아트 창의도시 기반 미디어아트페스티벌 + 5·18 사적·ACC 도심 콘텐츠.
- **세종**: 행정도시 특성. 세담터 빅데이터 플랫폼 + 호수공원/수목원/정부청사 콘텐츠.
- **충남**: 백제역사유적지구(유네스코) + 다도라 SaaS 스마트관광 전자지도 + 올담 데이터포털.
- **경북**: 메타포트(메타버스 통합 플랫폼) + XR체험존(지자체 최초) + 신라/유교 강력 IP.
- **강원**: 2025-2026 강원 방문의 해 국가급 캠페인 + 워케이션 + 18개 시군 통합 운영.
- **제주**: REST + SPARQL OpenAPI + 자체 빅데이터 플랫폼(data.ijto.or.kr) + 제주데이터허브 + 올레 437km. 자체 데이터 인프라 단연 1위.

---

## 10. 출처 정리 (URL)

### 공통
- 2025 관광데이터 활용 공모전: <https://www.2025tourapi.com/>
- 한국관광공사 보도자료: <https://knto.or.kr/pressRelease/549290>
- 한국관광공사 콘텐츠랩(api.visitkorea.or.kr): <https://api.visitkorea.or.kr/>
- 한국관광 데이터랩: <https://datalab.visitkorea.or.kr/>
- 한국관광공사_관광빅데이터 정보서비스_GW: <https://www.data.go.kr/data/15101972/openapi.do>
- 한국관광공사_국문 관광정보 서비스_GW: <https://www.data.go.kr/data/15101578/openapi.do>

### 부산
- BTO: <https://bto.or.kr/>
- VISIT BUSAN: <https://www.visitbusan.net/>
- Big-데이터웨이브: <https://data.busan.go.kr/bdip/>
- 부산 빅데이터 혁신센터: <https://busanbigdata.kr/>
- 갈맷길 코스 OpenAPI: <https://www.data.go.kr/data/15058979/openapi.do>
- 부산명소정보 OpenAPI: <https://www.data.go.kr/data/15063481/openapi.do>
- 7Beach OpenAPI: <https://busan-7beach.openapi.redtable.global/>
- 부산형 데이터 통합플랫폼 보도: <https://www.bja.kr/108>

### 대전
- DJTO: <https://www.djto.kr/>
- daejeontour.co.kr: <https://daejeontour.co.kr/>
- 0시축제 공식: <https://djzerofe.com/>
- 인트라바운드 콘텐츠 공모: <https://www.djto.kr/kor/board.do?menuIdx=609&bbsIdx=12452>
- 2026 0시축제 협력 보도: <https://biz.heraldcorp.com/article/10692407>

### 광주
- GJTO: <https://www.gjto.or.kr/>
- 오매광주: <https://tour.gwangju.go.kr/>
- 광주관광기업지원센터: <https://tourbiz.gjto.or.kr/>
- 빅데이터 활용 교육: <https://tourbiz.gjto.or.kr/user/board/view/board_cd/notice/wr_no/121>
- 광주미디어아트플랫폼: <https://gmap.gwangju.go.kr/>
- 광주미디어아트페스티벌: <http://www.gjcf.or.kr/cf/culture/media/festival.do>

### 세종
- SCF: <https://www.sjcf.or.kr/>
- 세종 여행정보: <https://www.sejong.go.kr/tour/index.do>
- 세담터 빅데이터: <https://www2.sejong.go.kr/bigdata/>
- 2026 관광기업 데이터·AI 활용 지원 사업: <https://touraz.kr/announcementList/pssrpView?pssrpSeqEnc=%5EgoLEJmaV*qcpvRMc9Qnkw%3D%3D&curPage=1>

### 충남
- 충남문화관광재단: <https://www.cacf.or.kr/>
- 다도라 충남: <https://chungnam.dadora.kr/>
- 올담 데이터포털: <https://alldam.chungnam.go.kr/>
- 충남 맞춤형 데이터(지역별): <https://alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201003003000>

### 경북
- GTC: <https://www.gtc.co.kr/>
- 경북관광기업지원센터: <https://tourbiz.gtc.co.kr/>
- GTC 사전정보공표 데이터: <https://www.data.go.kr/data/15145391/fileData.do>
- 경북 메타버스 XR체험존 보도: <https://gb.go.kr/Main/finace/page.do?cmd=2&iidx=54335>
- 메타버스 수도 경북 구상: <https://www.fnnews.com/news/202202060859197933>

### 강원
- GWTO: <https://www.gwto.or.kr/>
- 강원관광 포털: <https://www.gangwon.to/>
- 강원관광재단 알리미: <https://www.gwtoalimi.com/kr>
- 강원 방문의 해 2025-2026: <https://visitgw2526.kr/>
- 강원 워케이션: <https://worcation.co.kr/>
- 강원 공공데이터: <https://data.gwd.go.kr/>
- 강원 교육·연구 빅데이터 허브: <https://bigdata.risdata.or.kr/>
- 2025 해양 관광 콘텐츠 공모전: <https://academy.visitkorea.or.kr/macademy/notice/bbs/detail.do?seq=2967>

### 제주
- IJTO: <https://www.ijto.or.kr/>
- VISIT JEJU: <https://www.visitjeju.net/>
- VISIT JEJU TourAPI: <https://tourapi.visitjeju.net/>
- 제주관광 빅데이터 플랫폼: <https://data.ijto.or.kr/>
- 제주데이터허브: <https://www.jejudatahub.net/>
- 탐나오: <https://www.tamnao.com/>
- 제주올레: <https://www.jejuolle.org/trail>
- VISIT JEJU OpenAPI(공공데이터포털): <https://www.data.go.kr/data/15076361/openapi.do>
- 제주관광공사 공공데이터 페이지: <https://ijto.or.kr/korean/index.php?cid=138>
- 제주방문 관광객 이동패턴 빅데이터 분석 연구: <https://ijto.or.kr/korean/Bd/view.php?btable=policy&bno=41>
- 2025 제주관광 데이터 활용 공모전: <https://ijto.or.kr/korean/Bd/view.php?btable=notice&bno=1327>
- 문화 빅데이터 플랫폼 IJTO 채널: <https://www.bigdata-culture.kr/bigdata/user/data_market/agency/detail.do?id=ijto_org>
