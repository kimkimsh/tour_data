# 공공·민간 관광 빅데이터 소스 종합 가이드

> 본 문서는 한국관광 데이터랩(KTDL) **외부**의 관광 빅데이터 소스를 망라한 사실 기반 카탈로그이다. 공공데이터포털, 지자체 빅데이터 플랫폼, 통신·카드·내비 데이터 사업자, 관광지식정보시스템(TOUR.GO.KR), 한국문화관광연구원, 한국문화정보원, 기상청·국토부 등 융합 활용 데이터를 포괄한다. (조사 시점: 2026-05)

---

## 1. 공공데이터포털(data.go.kr)

| 항목 | 내용 |
|---|---|
| URL | https://www.data.go.kr/ |
| 운영 주체 | 행정안전부 (한국지능정보사회진흥원 위탁) |
| 인증 | 회원가입 → 인증키 발급 → 활용신청(개발/운영) |
| 데이터 형태 | 파일 데이터 (CSV/EXCEL/SHP/JSON) + 오픈 API (REST/SOAP) |

### 1.1 한국관광공사 등록 주요 API/데이터 (사례)

| ID | 명칭 | 형태 | URL |
|---|---|---|---|
| 15101578 | 한국관광공사_국문 관광정보 서비스_GW (TourAPI) | OpenAPI | https://www.data.go.kr/data/15101578/openapi.do |
| 15101972 | 한국관광공사_관광빅데이터 정보서비스_GW (방문자수) | OpenAPI | https://www.data.go.kr/data/15101972/openapi.do |
| 15135102 | 한국관광공사_반려동물_동반여행_서비스 | OpenAPI | https://www.data.go.kr/data/15135102/openapi.do |
| 15105720 | 한국관광공사_한국관광통계 공표 | 파일 | https://www.data.go.kr/data/15105720/fileData.do |
| 15105718 | 한국관광공사_관광 연도별 통계 | 파일 | https://www.data.go.kr/data/15105718/fileData.do |
| 15089187 | 한국관광공사_Data and Tourism (이슈리포트) | 파일 | https://www.data.go.kr/data/15089187/fileData.do |

### 1.2 한국문화관광연구원(KCTI) 등록 데이터

| ID | 명칭 | 형태 | URL |
|---|---|---|---|
| 15052709 | 한국문화관광연구원_국민여행조사 통계 원자료 정보 | 파일 | https://www.data.go.kr/data/15052709/fileData.do |
| 15111604 | 한국문화관광연구원_관광실태조사_외래관광객 | OpenAPI | https://www.data.go.kr/data/15111604/openapi.do |

### 1.3 한국문화정보원 등록 데이터

| ID | 명칭 | URL |
|---|---|---|
| 15000389 | 한국문화정보원_문화정보조회서비스 | https://www.data.go.kr/data/15000389/openapi.do |

### 1.4 외국어 관광정보 API군 (한국관광공사)
- 영문 관광정보 서비스 GW
- 일문 관광정보 서비스 GW
- 중문(간체/번체) 관광정보 서비스 GW
- 독문/불문/스페인어/러시아어 관광정보 서비스 GW
- 한국관광공사 길따라(코스) 정보 서비스
- 한국관광공사 고캠핑 정보 서비스
- 한국관광공사 의료관광 정보 서비스

> 모두 공공데이터포털에서 검색하여 활용신청 가능. 일 기본 트래픽 1,000건(개발), 운영계정 전환 시 확장.

출처: https://www.data.go.kr/, https://www.2025tourapi.com/, https://touraz.kr/

---

## 2. 관광지식정보시스템(TOUR.GO.KR / KNOW.TOUR.GO.KR)

| 항목 | 내용 |
|---|---|
| 메인 | https://www.tour.go.kr / https://know.tour.go.kr |
| 운영 | 문화체육관광부 / 한국문화관광연구원 |
| 역할 | 한국 관광 통계 집대성 + 조사 보고서 + 원자료 다운로드 |

### 2.1 제공 통계 카테고리

| 카테고리 | 설명 |
|---|---|
| 관광객 통계 | 출입국 통계(외래객/국민 해외관광객), 한국관광수지(한국은행 BoP 연계) |
| 조사 통계 | 외래관광객조사 / 국민여행조사 / 잠재 방한여행객조사 |
| 산업 통계 | 관광사업체 현황, MICE 산업통계 |
| 지역 통계 | 광역/기초지자체별 방문 통계 |

### 2.2 외래관광객조사
- 조사대상: 출국하는 외국인 관광객 (인천국제공항 등)
- 조사주기: 연중 분기별 + 연간 종합 보고서
- 표본수: 연간 약 12,000~14,000명
- 데이터다운로드: https://know.tour.go.kr/stat/fRawDataDownloadDis19Re.do
- **2024년 주요 결과**: 재방문율 54.7%, 방한 목적 '여가·위락·휴식' 68.0%, 한국 관심 계기 '한류 콘텐츠 접하고 나서' 38.3%

### 2.3 국민여행조사
- 조사대상: 만 15세 이상 국민
- 조사주기: 분기별 + 연간 종합
- 표본수: 연간 약 50,000명
- 항목: 여행 횟수, 목적, 교통수단, 숙박 형태, 지출 비용, 동행자, 여행지 선택 요인, 정보 획득 경로 등
- 데이터다운로드: https://know.tour.go.kr/stat/nRawDataDownloadDis19Re.do

### 2.4 한국관광수지 (한국은행 연계)
- URL: https://know.tour.go.kr/stat/koreaTourIncomeDis19Re.do
- 원자료: 한국은행 국제수지(BoP) 일반여행수지
- 갱신: 월별/분기별

### 2.5 KCTI DATA (한국문화관광연구원 통계 포털)
- URL: https://data.kcti.re.kr
- 데이터 검색·시각화·다운로드

출처: https://know.tour.go.kr, https://www.kcti.re.kr/, https://data.kcti.re.kr/

---

## 3. 통신사 빅데이터 — KT / SKT

### 3.1 KT 관광분석 솔루션 — TrIP (Travel Intelligence Platform)

| 항목 | 내용 |
|---|---|
| URL | https://enterprise.kt.com/pd/P_PD_AI_BD_001.do |
| 데이터 소스 | KT 5G/LTE 시그널 데이터 |
| 분석 단위 | 광역/기초지자체 + 관광지 영역 |
| 융합 데이터 | BC카드 소비 데이터 + SNS 버즈량 |
| 사용 기관 | 중앙정부, 관광 연구원·협회, 140여개 기초지자체 |
| 인증 | 통계청 빅데이터 통계 인증 |
| 가격 | 비공개 (B2B 협의) |

#### 분석 가능 지표
- 내·외국인 관광객 이동 패턴
- 관광지 방문 밀집도
- 거주지·체류시간·연령·성별 분포
- 카드 소비 결합 만족도 분석
- 신뢰성 있는 관광지 영역 설정 (관광 인구 정의 적용)

#### 활용 예
관광 성과 측정, 수요 예측, 상품 설계, 업무 제휴, 이벤트 기획·효과 분석, 가격 설정, 홍보 타겟팅

### 3.2 KT 통신 빅데이터 플랫폼
- URL: https://www.bigdata-telecom.kr
- 통신 데이터 + 카드·SNS·기타 융합 데이터 제공
- 과학기술정보통신부 '빅데이터 플랫폼·센터' 사업의 통신 분야 플랫폼

### 3.3 KT의 UN WTO 가입
- 국내 통신사 최초 UN 세계관광기구 회원
- 출처: https://blog.kt.com/1474

### 3.4 SKT 지오비전 (Geovision)
| 항목 | 내용 |
|---|---|
| 출시 | 2011년 2월 (10년+ 운영) |
| 인증 | 통계청 국가승인 통계 (2014~) — 국내 유일 유동인구 데이터 |
| 분석 단위 | 5분 간격, 전국 단위 유동인구 |
| 데이터 형태 | API + 파일 + 실시간 스트림 |

#### 제공 지표
- 유동인구·주거인구·외국인 인구
- 업종별 매출 (카드 결합)
- 부동산 정보, POI 데이터
- 지하철 혼잡도, 쇼핑·레저시설 혼잡도
- 인기 국내 여행지, 거주생활 분석
- 공유 킥보드 이용 데이터

### 3.5 지오비전 퍼즐 (Geovision Puzzle)
- URL: https://puzzle.geovision.co.kr
- 셀프 분석 도구 — 사용자가 직접 OD/체류/방문 분석 가능
- KDX(한국데이터거래소)에서도 일부 데이터 거래

출처: https://enterprise.kt.com/pd/P_PD_AI_BD_001.do, https://b2b.tworld.co.kr/bizts/solution/solutionTemplate.bs?solutionId=0022, https://news.sktelecom.com/179447, https://puzzle.geovision.co.kr/

### 3.6 SKT 데이터 허브
- URL: http://www.bigdatahub.co.kr
- SKT 보유 데이터의 일반 공개 포털 (일부 무료)

---

## 4. 카드사 빅데이터 — 신한 / BC

### 4.1 신한카드 빅데이터연구소 — Trendis
| 항목 | 내용 |
|---|---|
| URL | https://www.shinhancard.com/pconts/html/benefit/trendis/MOBFM501/MOBFM501.html |
| 데이터 | 신한카드 결제 데이터 + SNS 데이터 결합 |
| 발행물 | 트렌드 키워드 보고서, 산업별 인사이트 |

#### 연도별 트렌드 키워드
| 연도 | 키워드 | 세부 |
|---|---|---|
| 2024 | **SPARK** | Start the Time Revolution / Pivot Family Model / Age of Funflation / Ripples of Stimulating Polarization / Tasty Entertainment |
| 2025 | **R.E.V.I.V.E** | Redefine Festivities / Exploring Identity / Virtual Companions / Integrated Contents Commerce / Value of Tenderness / Environment First |
| 2026 | **WISE UP** | (신한카드 발표) |

#### 관광 관련 사례
- '쉬는 제주, 노는 부산, 먹는 강릉' (2024 국내 여행 트렌드)
- 폭염으로 야간관광·실내공간 소비 부상

### 4.2 BC카드 빅데이터센터
- URL: https://www.bccard.com/card/html/company/kr/bigdata/business/index.jsp
- 가맹점 매출 데이터 기반 컨슈머 인사이트
- 한국관광 데이터랩에는 신한카드 데이터로 전환되었으나, BC카드는 자체 빅데이터 사업 지속
- 소비 트렌드, 지역 상권 분석, SNS 데이터 결합 알고리즘 개발

출처: https://www.newswire.co.kr/newsRead.php?no=1004439 (REVIVE), https://www.shinhancard.com/pconts/company/html/promotion/press/1226125_3999.html (SPARK), https://www.fetv.co.kr/news/article.html?no=210346 (WISE UP)

---

## 5. 내비게이션·모빌리티 데이터

### 5.1 TMAP 모빌리티 — 데이터 인사이트 보드
| 항목 | 내용 |
|---|---|
| URL | https://datainsight.tmap.co.kr |
| MAU | 2024년 3분기 기준 1,524만 명 |
| 검색 데이터 | 2024년 22.2억 회 |
| 이동 데이터 | 연간 약 67억 건 |
| API | https://tmapapi.tmapmobility.com/, https://openapi.sk.com/products/detail?svcSeq=4 |
| 데이터 시작 | 2018년부터 지자체별·관광지유형별 방문객 이동행태 분석 제공 |

#### 핫플레이스 사례 (2024 검색 데이터)
- 전남: 목포역, 담양 죽녹원, 여수 해상케이블카
- 전북: 익산역, 전주역, 전주 한옥마을, 군산 이성당 본점
- 제주: 제주국제공항, 동문재래시장, 협재해수욕장, 함덕해수욕장

### 5.2 카카오모빌리티
- 카카오내비 / 카카오T 데이터
- 한국관광공사 2025 공모전 공동 주관 — Kakao OpenAPI 활용

### 5.3 한국관광 데이터랩 내비게이션 데이터
- 출처: TMAP (KTDL 공식 제공자)
- 갱신: 일 데이터 6일 지연

출처: https://news.sktelecom.com/208894, https://datainsight.tmap.co.kr/, https://openapi.sk.com/products/detail?svcSeq=4

---

## 6. 지자체 빅데이터·관광 플랫폼 (RTO·광역지자체)

### 6.1 서울특별시
| 플랫폼 | URL | 특징 |
|---|---|---|
| 서울 열린데이터광장 | https://data.seoul.go.kr/ | 전체 데이터셋 11,136종(12개 분야), 문화/관광 1,660종, OpenAPI/Sheet/Chart/Map/LOD/File/Link 7가지 형태 |
| 서울 빅데이터 캠퍼스 | https://bigdata.seoul.go.kr/ | 시민 일상 데이터 통합 분석 환경(상암 본원). 카드사 골목단위 외국인 매출, 통신사 외국인 로밍 기지국 데이터 등 보유 |
| 비짓서울 | https://www.visitseoul.net/ | 서울관광재단, 외국인 대상 관광 정보 |
| 서울관광재단 | https://www.sto.or.kr/ | 데이터·정책·연구 |
| S-Data | (서울특별시 분야별 통합 데이터 브랜드) | https://news.seoul.go.kr/gov/archives/529268 |

### 6.2 부산광역시
| 플랫폼 | URL |
|---|---|
| Big-데이터웨이브 (부산 공공데이터 통합) | https://data.busan.go.kr/bdip/ |
| 부산 빅데이터 혁신센터 | https://busanbigdata.kr/ |
| 부산 빅데이터 플랫폼 | https://bigdata.busan.go.kr/ |
| 부산관광공사(BTO) | https://bto.or.kr/ |

#### 부산관광공사 보유 데이터셋
- 부산관광 실태조사 (data.go.kr ID: 15117366)
- 부산관광산업 동향분석 자료 (data.busan.go.kr publicdatapk: 15123637)
- 부산 해양레저 체험객 조사
- 부산 인포그래픽 보고서 (https://bto.or.kr/kor/CMS/Board/Board.do?mCode=MN103)

### 6.3 제주도
| 플랫폼 | URL |
|---|---|
| 제주 관광 빅데이터 서비스 플랫폼 | https://data.ijto.or.kr/ |
| 제주데이터허브 | https://www.jejudatahub.net/ |
| 제주 TourAPI | https://tourapi.visitjeju.net/ |
| 제주관광공사_비짓제주 관광정보 오픈 API | https://www.data.go.kr/data/15076361/openapi.do |

#### 제주관광공사 데이터 사업
- 2021~ 3년간 빅데이터 센터 구축 사업 (한국지능정보사회진흥원 지원)
- 사전·여행 중·사후 단계별 빅데이터 (교통/관광지/쇼핑) 43종을 문화 빅데이터 플랫폼에 공급
- 비짓제주 웹: 통신 기반 실시간 혼잡도, 내비게이션 차량 분포, 신용카드 매출, 인기 관광지 시각화
- SPARQL Endpoint 제공 (시맨틱웹)

### 6.4 경기도
| 플랫폼 | URL |
|---|---|
| 경기관광공사 데이터 공유 플랫폼 | https://data.gto.or.kr/ |
| 경기관광공사 메인 | https://gto.or.kr/, https://ggtour.or.kr/ |
| 경기관광+P 플랫폼 | (클라우드·빅데이터·AI 추천) |

### 6.5 강원도
| 플랫폼 | URL |
|---|---|
| 강원관광재단 | http://www.gwto.or.kr/ |
| 강원관광재단 공공데이터 개방 | https://www.gwto.or.kr/www/contents.do?key=29 |
| 강원도 데이터 | https://data.gwd.go.kr/ |
| 강원특별자치도 관광 동향 분석 보고서 | https://state.gwd.go.kr/egf/bp/common/front/229451/download |

### 6.6 대구광역시
| 플랫폼 | URL |
|---|---|
| 대구관광 데이터랩 | https://tourdata.daegu.go.kr/ |
| 대구 데이터광장 | http://data.daegu.go.kr/ |
| 대구 빅데이터 활용센터 | https://data.daegu.go.kr/open/bigData/introduce.do |

#### 대구관광 데이터랩 특징
- 대구시 전체 데이터 제공, 추세분석 권장
- 38개 관광지점 데이터 (1개 지점 단위 분석 권장 — 중복값 발생)

### 6.7 기타 지자체
- **인천관광공사**: 한국관광 데이터랩과 협력 인터뷰 사례 게재
- **광주광역시관광공사**: 2025 관광데이터 활용 공모전 참여 RTO
- **경상북도문화관광공사**: 2025 공모전 참여 RTO
- 대부분 광역지자체가 자체 열린데이터광장(예: 인천 https://www.data.go.kr/, 광주 등)에 관광 데이터셋 게시

출처: https://touraz.kr/, https://www.2025tourapi.com/, https://datalab.visitkorea.or.kr/html/interview4/interview02.jsp

---

## 7. 문화·체육·관광 통합 빅데이터 플랫폼

### 7.1 문화 빅데이터 플랫폼
| 항목 | 내용 |
|---|---|
| URL | https://www.bigdata-culture.kr/ , https://www.culture.go.kr/bigdata/ |
| 운영 | 한국문화정보원 (KCISA) |
| 역할 | 과기정통부 '빅데이터 플랫폼·센터 사업'의 문화 분야 플랫폼 |

#### 데이터 카테고리
- 도서, 체육, 예술, 숙박, 레저, 음식
- 문화행사 정보(축제·공연·전시)
- 지역별 관광명소 정보
- 지역 문화재 정보
- 관광 연관시설 정보
- 문화산업 통계
- 공연·전시 유동인구 분석
- 도서관 대출, 체육시설 이용
- 식당·카페 정보
- 여행·축제 트렌드

#### 데이터 거래 기능
- 공공기관·민간기업 협업 → 데이터 생산·수집·가공·유통
- 일부 유료 거래 / 일부 무료 개방

### 7.2 문화공공데이터광장
| 항목 | 내용 |
|---|---|
| URL | https://www.culture.go.kr/data/ |
| 운영 | 한국문화정보원 |
| 연계 기관 | 문체부 산하 66개 + 타부처/지자체 74개 = 140개 기관 |
| 메타데이터 | 약 8,500만건 연결 |

#### 핵심 카테고리
- 문화유산
- 예술
- 체육
- **관광** (https://www.culture.go.kr/data/openapi/openapiList.do?category=D)
- 한글
- 문화재
- 8대 분야 OpenAPI 통합 제공

### 7.3 KCISA (한국문화정보원) 공공데이터 개방
- URL: https://www.kcisa.kr/kr/contents/open_openData/view.do
- 사업: 문화산업 데이터 활용 생태계 조성 / 문화데이터 전략적 활용 강화

출처: https://www.bigdata-culture.kr/, https://www.culture.go.kr/data/, https://www.kcisa.kr/

---

## 8. 융합 활용 데이터 (관광 외 분야)

### 8.1 기상청 (KMA)
| 항목 | URL |
|---|---|
| 기상청 API 허브 | https://apihub.kma.go.kr/ |
| 기상자료개방포털 | https://data.kma.go.kr/ |
| 단기예보(동네예보) 조회서비스 | https://www.data.go.kr/data/15084084/openapi.do |

#### 관광 활용 가능 API
- 단기예보 (5km 격자, 읍·면·동 단위) — 초단기실황·초단기예보·단기예보
- 종관기상(ASOS) 일자료/시간자료
- **관광코스별 관광지 상세 날씨 조회** (https://apihub.kma.go.kr/apiList.do?seqApi=971&seqApiSub=987)
- 생활기상지수, 보건·산업기상지수

### 8.2 국토교통부 — V-WORLD (공간정보 오픈플랫폼)
| 항목 | URL |
|---|---|
| 메인 | https://www.vworld.kr/ |
| 개발자 센터 | https://www.vworld.kr/dev/v4dv_static_s001.do |
| API | https://api.vworld.kr/ |

#### 제공
- 2D/3D 지도 서비스
- WMS/WFS/WMTS API
- POI 벡터 타일 (관광안내소·전통시장 등 포함)
- 지오코딩·역지오코딩
- 지적 데이터·새주소 데이터
- WebGL 기반 API 3.0

### 8.3 법무부 출입국·외국인정책본부
- 출입국통계 (월별 국적별 입국·출국)
- 한국관광 데이터랩 '국가별 분석' 원자료의 한 축

### 8.4 통계청 KOSIS
- URL: https://kosis.kr
- 관광사업체 통계, 관광수지 등 통계청 승인 통계 검색·다운로드

### 8.5 한국은행
- 국제수지(BoP) 일반여행수지 → 관광수입·지출
- ECOS 통계검색 시스템 https://ecos.bok.or.kr

---

## 9. SNS·텍스트 데이터 (관광 트렌드 분석용)

### 9.1 데이터랩 내 글로벌 SNS 트렌드
- 한국관광 데이터랩 '국가별 분석 → 글로벌 SNS 트렌드' 제공
- Twitter/X·Instagram·블로그 등 다국어 텍스트 마이닝 결과

### 9.2 네이버·카카오 트렌드
- 네이버 데이터랩 https://datalab.naver.com/ — 검색어 트렌드, 쇼핑인사이트
- 카카오 트렌드 (카카오데이터트렌드 https://datatrend.kakao.com/)
- 검색 트렌드 + 지역 + 연령·성별 분포

### 9.3 관광공사 1330 다국어관광콜센터 VOC
- 한국관광 데이터랩 '관광 VOC 현황'에서 시각화
- 음성→텍스트 변환 후 텍스트마이닝 (출처별 키워드, 감성분석)
- 다국어 (한·영·일·중) 응대 기록 → 외국인 관점 인사이트
- 관광불편신고·소비자상담 함께 통합

---

## 10. 데이터 거래소·민간 마켓

### 10.1 KDX (한국데이터거래소)
- URL: https://kdx.kr
- SKT 지오비전 퍼즐 데이터, 카드·통신·POI 데이터 등 거래

### 10.2 빅데이터 플랫폼·센터 사업 (과기정통부)
- 16개 플랫폼 (통신/금융/문화/환경/교통/유통소비/헬스/지역경제 등)
- 통신 빅데이터 플랫폼 (KT 운영)
- 문화 빅데이터 플랫폼 (KCISA 운영)
- 지역경제 빅데이터 플랫폼 (한국감정원 등)
- 데이터 카탈로그·다운로드·구매 통합 환경

### 10.3 AI HUB (NIA 운영)
- URL: https://aihub.or.kr
- 학습용 AI 데이터셋 (관광지 이미지·관광 발화 등 일부 포함)

---

## 11. 산업포털·종합 정보

### 11.1 투어라즈 (관광산업포털)
| 항목 | 내용 |
|---|---|
| URL | https://touraz.kr |
| 운영 | 한국관광공사 |
| 역할 | 정부·지자체·RTO·협회 등 90여개 유관기관 정보 통합 |
| 콘텐츠 | 산업동향, 보고서, 통계, 공모전 공고, 비즈뉴스 |

### 11.2 한국관광 e배움터
- URL: https://touredu.visitkorea.or.kr
- 데이터랩 활용 강좌, TourAPI 활용 강좌, ChatGPT 활용 강좌 등

---

## 12. 인바운드 통계 핵심 수치 (2024~2025)

| 지표 | 2024 | 2025 상반기 |
|---|---|---|
| 외래관광객 수 | 16,369,629명 (2019년 대비 93.5%) | 사상 최대 (1,456.4만명) |
| 관광수입 (BoP) | 164.5억 달러 (2019년 대비 80%) | 141.4억 달러 |
| 1인당 지출액 | — | 971달러 (소폭 반등) |
| 관광수지 | -100.4억 달러 (적자 확대) | -52.0억 달러 |
| 해외여행 지출 | 264.9억 달러 (2019년 대비 90.5%) | — |
| 재방문율 | 54.7% | — |
| 방한 목적 1위 | 여가·위락·휴식 (68.0%) | — |
| 관심 계기 1위 | 한류 콘텐츠 (38.3%) | — |

출처: https://www.kcti.re.kr/web/board/boardContentsView.do?contents_id=969e40a59b534173bb2911c714ae929d (2024년 외래관광객조사 주요 결과), https://www.yanolja-research.com/brief/view/166?lang=kr (2024 분석), https://www.yanolja-research.com/brief/view/558?lang=ko (2025 상반기), https://datalab.visitkorea.or.kr/datalab/portal/nat/getForTourDashForm.do

---

## 13. 데이터 결합·융합 활용 사례 (한국관광공사 인터뷰 기준)

| 기관/주체 | 활용 데이터 | 활용 내용 |
|---|---|---|
| 강진군청 | 데이터랩 통신·카드 | 반값여행 정책 타깃팅 — 2024 대상, 2025 대상 |
| 인천관광공사 | 데이터랩 외국인 빅데이터 | FIT(개별관광객) 패턴 분석 |
| 슬로드(Slord) | 내비게이션 빅데이터 | 선호 거점 파악 |
| 제주관광공사 | 통신·카드·내비 | 실시간 혼잡도, 차량 분포, 인기 관광지 시각화 |
| 부산관광공사 | 자체 실태조사 + 데이터랩 | 관광산업 동향 분석 |
| KT 빅사이트 | KT 시그널 + BC카드 + SNS | 만족도 결합 분석 |

출처: https://datalab.visitkorea.or.kr/html/interview4/interview02.jsp, https://datalab.visitkorea.or.kr/html/interview/interview02.jsp, https://datalab.visitkorea.or.kr/html/interview2/interview01.jsp

---

## 14. 데이터 저작권·라이선스

| 데이터 | 라이선스 |
|---|---|
| 한국관광공사 TourAPI / 데이터랩 다운로드 | 공공누리 제1유형 (출처표시) |
| 한국문화관광연구원 원자료 | 비상업적 활용 가능, 익명처리 |
| 한국문화정보원 문화데이터 | 공공누리 제1유형 다수 |
| KT TrIP / SKT 지오비전 | 상용 라이선스 (B2B) |
| 신한카드 Trendis 보고서 | 출처표시 인용 가능 (개별 수치 사용은 약관 확인) |
| TMAP API | SK 오픈API 약관 (무료/유료 호출량 차등) |
| V-WORLD | 출처표시 (일부 상용 제한) |

---

## 15. 핵심 출처 종합

| # | 출처 | URL |
|---|---|---|
| 1 | 공공데이터포털 | https://www.data.go.kr/ |
| 2 | 한국관광공사 TourAPI 콘텐츠랩 | https://api.visitkorea.or.kr/ |
| 3 | 관광지식정보시스템 | https://know.tour.go.kr |
| 4 | 한국문화관광연구원 | https://www.kcti.re.kr |
| 5 | KCTI DATA | https://data.kcti.re.kr |
| 6 | 한국문화정보원 KCISA | https://www.kcisa.kr |
| 7 | 문화 빅데이터 플랫폼 | https://www.bigdata-culture.kr/ |
| 8 | 문화공공데이터광장 | https://www.culture.go.kr/data/ |
| 9 | KT TrIP | https://enterprise.kt.com/pd/P_PD_AI_BD_001.do |
| 10 | KT 통신 빅데이터 플랫폼 | https://www.bigdata-telecom.kr |
| 11 | SKT 지오비전 | http://b2b.tworld.co.kr/bizts/solution/solutionTemplate.bs?solutionId=0022 |
| 12 | 지오비전 퍼즐 | https://puzzle.geovision.co.kr |
| 13 | SKT 데이터 허브 | http://www.bigdatahub.co.kr |
| 14 | 신한카드 Trendis | https://www.shinhancard.com/pconts/html/benefit/trendis/MOBFM501/MOBFM501.html |
| 15 | BC카드 빅데이터 | https://www.bccard.com/card/html/company/kr/bigdata/business/index.jsp |
| 16 | TMAP 데이터 인사이트 보드 | https://datainsight.tmap.co.kr |
| 17 | 서울 열린데이터광장 | https://data.seoul.go.kr/ |
| 18 | 서울 빅데이터 캠퍼스 | https://bigdata.seoul.go.kr/ |
| 19 | 부산 Big-데이터웨이브 | https://data.busan.go.kr/bdip/ |
| 20 | 부산관광공사 | https://bto.or.kr/ |
| 21 | 제주 관광 빅데이터 플랫폼 | https://data.ijto.or.kr/ |
| 22 | 제주데이터허브 | https://www.jejudatahub.net/ |
| 23 | 제주 TourAPI | https://tourapi.visitjeju.net/ |
| 24 | 경기관광공사 데이터 플랫폼 | https://data.gto.or.kr/ |
| 25 | 강원관광재단 | http://www.gwto.or.kr/ |
| 26 | 대구관광 데이터랩 | https://tourdata.daegu.go.kr/ |
| 27 | 기상청 API 허브 | https://apihub.kma.go.kr/ |
| 28 | V-WORLD | https://www.vworld.kr/ |
| 29 | KOSIS | https://kosis.kr |
| 30 | 한국은행 ECOS | https://ecos.bok.or.kr |
| 31 | KDX (한국데이터거래소) | https://kdx.kr |
| 32 | AI HUB | https://aihub.or.kr |
| 33 | 투어라즈 | https://touraz.kr |
| 34 | 한국관광 e배움터 | https://touredu.visitkorea.or.kr |
| 35 | 야놀자 리서치 인바운드 분석 | https://www.yanolja-research.com/brief/view/166?lang=kr |

