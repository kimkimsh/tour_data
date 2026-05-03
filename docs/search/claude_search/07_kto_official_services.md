# 07. 한국관광공사(KTO) 직접 운영 서비스 전수 조사

> 작성일: 2026-05-03  
> 목적: 2026 한국관광공사 관광데이터 활용 공모전 준비를 위한 KTO 자체 운영 서비스 매핑.  
> 원칙: 사실 정리 중심. 아이디어 제안 금지. 모든 항목 출처 URL 포함.

---

## 0. 한눈에 보기 — KTO 산하 주요 서비스 매트릭스

| 서비스명 | URL | 카테고리 | 타깃 | 주요 데이터 |
|---|---|---|---|---|
| 대한민국 구석구석 | korean.visitkorea.or.kr | 종합 국내여행 포털/앱 | 내국인 | 관광지·맛집·숙박·코스·축제 |
| VISITKOREA (Imagine Your Korea) | english.visitkorea.or.kr | 인바운드 영문 포털 | 외국인 | 관광지/문화/K-콘텐츠 |
| 두루누비 | durunubi.kr | 걷기·자전거 코스 | 도보/라이딩 여행자 | 코리아둘레길·해파랑길·자전거길 |
| 고캠핑 (GoCamping) | gocamping.or.kr | 캠핑장 정보 포털 | 캠퍼 | 전국 캠핑장(인허가)·우수야영장 |
| 열린관광 모두의 여행 | access.visitkorea.or.kr | 무장애 관광 정보 | 관광약자 | 무장애·열린관광지 |
| 한국관광 데이터랩 | datalab.visitkorea.or.kr | 관광 빅데이터 분석 | 사업자/연구자 | 통신·카드·내비·통계 |
| 한국관광콘텐츠랩 | conlab.visitkorea.or.kr / api.visitkorea.or.kr | TourAPI 콘텐츠/오픈API | 개발자/사업자 | 관광콘텐츠 280만 건 |
| 한국관광품질인증 (KQ) | koreaquality.visitkorea.or.kr | 숙박·쇼핑 인증 | 사업자/소비자 | 인증업소 데이터 |
| 우수웰니스관광지 | korean.visitkorea.or.kr/other (otdid 287776d6-…) | 웰니스 관광 | 웰니스/힐링 수요 | 우수 웰니스지 71+ |
| 디지털 관광주민증 | m.visitkorea.or.kr/digtCard | 인구소멸지역 활성화 | 도시-지방 양 거주 수요 | 11개 지자체 협력 |
| 한국관광 100선 | korean.visitkorea.or.kr/other (otdid 622bcd99-…) | 대표 관광지 큐레이션 | 일반 여행자 | 문체부·KTO 선정 100선 |
| K-스마일 캠페인 | kto.visitkorea.or.kr (캠페인) | 친절·서비스 품질 | 인바운드 응대 인력 | 교육·캠페인 |
| 관광e배움터 | touredu.visitkorea.or.kr | 관광 종사자 교육 | 관광 종사자/사업자 | 무료 온라인 강의 |
| 한국관광 통계 | knto.or.kr / kto.visitkorea.or.kr | 통계 공표 | 정책/연구 | 출입국·내국인 관광 통계 |

---

## 1. 대한민국 구석구석 (Korean VISITKOREA)

### 1.1 개요
- 공식 URL: <https://korean.visitkorea.or.kr/>
- 운영 주체: 한국관광공사
- 포지셔닝: KTO가 운영하는 **국내여행 정보 포털 1위**. "국내여행의 믿을 구석"이라는 슬로건으로 신뢰성 있는 공식 정보를 제공.
- 누적 운영 10년 이상, KTO의 OpenAPI(TourAPI)에서 공급하는 콘텐츠를 직접 소비하는 1차 채널 역할.

### 1.2 주요 기능
| 기능 | 설명 |
|---|---|
| **여행지도** (`/mylocation/mylocation.do`) | 관광명소·맛집·카페·숙소·주차장 등을 지도에서 탐색. 현재 위치 기반 주변 검색. |
| **여행 코스 작성** | 당일/1박2일/2박3일 일정형 코스, 가족/연인/아이 동반 등 상황별 코스, 힐링·자연·레포츠·등산·드라이브 등 테마별 코스. |
| **AI콕콕 플래너 (여행콕콕)** (`/curation/cr_abc_create.do`) | AI 기반 맞춤형 일정 추천. 옵션 선택 → 자동 코스 생성. |
| **한국관광 100선** (`/other/otherService.do?otdid=622bcd99-…`) | 문체부·KTO 격년 선정 대표 관광지 100곳. |
| **통합 로그인 (투어원패스)** | 소셜로그인 1회 인증으로 KTO 산하 서비스 연계 로그인. |
| **위치 기반 서비스** | 현재 위치 → 주변 관광지/맛집/주차장. |
| **여행기사** | 큐레이션 콘텐츠 매거진 형태로 발행. 우수 인증업소·웰니스 등 연계. |

### 1.3 모바일 앱
- Android: <https://play.google.com/store/apps/details?id=com.visitkorea.kr>
- iOS: <https://apps.apple.com/kr/app/대한민국-구석구석/id417340980>
- 원스토어: <https://m.onestore.co.kr/ko-kr/apps/appsDetail.omp?prodId=0000116301>
- 누적 다운로드: **150만+** (2018년 기준 보도 — 정보통신신문)
- 부가기능: 디지털 관광주민증 발급/조회, 위치 기반 푸시.

### 1.4 데이터 출처와 OpenAPI
- 백엔드 데이터는 **TourAPI 4.0** (콘텐츠랩) 기반.
- 외부 개발자가 동일 데이터를 OpenAPI로 받아 자체 서비스 구축 가능.

### 출처
- [국내여행의 믿을 구석, 대한민국 구석구석](https://korean.visitkorea.or.kr/)
- [여행지도 | 대한민국 구석구석](https://korean.visitkorea.or.kr/mylocation/mylocation.do)
- [한국관광100선](https://korean.visitkorea.or.kr/other/otherService.do?otdid=622bcd99-84fa-11e8-8165-020027310001)
- [지금 꼭 가봐야 할 스마트한 여행 추천](https://korean.visitkorea.or.kr/curation/cr_abc_create.do)
- [관광공사, 대한민국 구석구석 앱 150만 다운로드 - 정보통신신문](https://www.koit.co.kr/news/articleView.html?idxno=40679)
- [대한민국 구석구석 - Google Play](https://play.google.com/store/apps/details?id=com.visitkorea.kr)

---

## 2. VISITKOREA (Imagine Your Korea) — 인바운드 영문 사이트

### 2.1 개요
- URL: <https://english.visitkorea.or.kr/>
- 슬로건: **Imagine Your Korea**
- 외국인 인바운드 마케팅 공식 채널 — 영어 외 일본어/중국어 간체·번체/스페인어/러시아어/독일어/프랑스어 등 다국어.
- VISITKOREA 영문 앱 별도 제공: <https://play.google.com/store/apps/details?id=com.visitkorea.eng>

### 2.2 주요 기능
- 한국 여행 가이드 (관광지·식문화·숙박·쇼핑·교통·축제)
- VKMap (Visit Korea Map): <https://english.visitkorea.or.kr/vkmap/>
- K-Culture / K-Food / K-Pop 연계 콘텐츠
- "Korea Tour Card" 등 인바운드 결제·교통 카드 안내
- Imagine Your Korea YouTube 채널: <https://www.youtube.com/imagineyourkorea>

### 2.3 데이터 연계
- TourAPI 영문판이 백엔드. 영문 관광정보 서비스를 통해 한국공항공사 '여행정보' 메뉴, 서울교통공사 '또타지하철' 앱 'tour' 메뉴 등 외부 채널에 재공급.

### 출처
- [Imagine Your Korea](https://english.visitkorea.or.kr/svc/main/index.do)
- [VKMap](https://english.visitkorea.or.kr/vkmap/)
- [VISITKOREA - Google Play](https://play.google.com/store/apps/details?id=com.visitkorea.eng)
- [Imagine Your Korea YouTube](https://www.youtube.com/imagineyourkorea)

---

## 3. 한국관광공사 모바일앱 라인업 정리

| 앱명 | 패키지/번들 ID | 타깃 | 핵심 기능 |
|---|---|---|---|
| 대한민국 구석구석 | com.visitkorea.kr | 내국인 | 종합 국내여행 정보, 디지털 관광주민증, AI콕콕 |
| VISITKOREA (영문) | com.visitkorea.eng | 외국인 | 영문 한국 여행 가이드 |
| 두루누비(코리아둘레길) | kr.durunubi | 도보/자전거 여행자 | 코스 가이드·GPS 트래킹·스탬프 |
| 고캠핑 | (별도 앱은 운영 종료/홈페이지 중심) | 캠퍼 | 캠핑장 정보 — 웹 중심 |

> ※ KTO 개발자 계정 페이지 — <https://apps.apple.com/kr/developer/한국관광공사/id326632575> — 에 다국어 영문/일문/중문 등 추가 앱이 등재되어 있음.

### 출처
- [iPhone용 한국관광공사 - App Store 개발자 페이지](https://apps.apple.com/kr/developer/%ED%95%9C%EA%B5%AD%EA%B4%80%EA%B4%91%EA%B3%B5%EC%82%AC/id326632575)
- [앱이용안내 | 모바일서비스 안내](https://kto.visitkorea.or.kr/kor/helpDesk/mobile/appInfo.kto)

---

## 4. 두루누비 (durunubi.kr)

### 4.1 개요
- URL: <https://durunubi.kr/>
- 운영 주체: 한국관광공사
- 포지셔닝: 위치 기반 **걷기·자전거 레저여행 종합 정보** 서비스.
- 핵심 콘텐츠: **코리아둘레길** — 동·서·남해안 및 DMZ 접경지역을 잇는 약 4,500km 걷기여행길. 2024년 9월 전 구간 개통.

### 4.2 주요 코스 카테고리
| 카테고리 | URL |
|---|---|
| 코리아둘레길 (4대 노선) | 해파랑길 / 남파랑길 / 서해랑길 / DMZ 평화의길 |
| 해파랑길 | <https://www.durunubi.kr/haeparang-travel.do> |
| 자전거길 | <https://www.durunubi.kr/road-bicycle.do> (※ 일반길/자전거길 일부 서비스 종료 안내 존재) |
| 코리아둘레길 걷기 프로그램 | <https://www.durunubi.kr/walk-program.do> |
| 여행 자료실 | <https://www.durunubi.kr/road-walk.do> |

### 4.3 모바일 앱 기능
- iOS: <https://apps.apple.com/kr/app/두루누비-코리아둘레길/id1226279088>
- Android: <https://play.google.com/store/apps/details?id=kr.durunubi>
- 핵심 기능
  - **GPS 코스 트래킹** — 지도상 경로 따라가기·기록.
  - **스탬프 획득** — 코리아둘레길 인증.
  - **난이도/지역 검색** — 사용자 조건 매칭.
  - **안전 가이드** — 안전한 걷기여행을 위한 가이드.

### 4.4 데이터 / API
- 공공데이터포털 OpenAPI 제공: [한국관광공사_두루누비 정보 서비스_GW](https://www.data.go.kr/data/15101974/openapi.do)
- 코스 메타데이터(거리·소요시간·난이도·POI)·이미지·트랙 등.

### 출처
- [두루누비 메인](https://durunubi.kr/)
- [한국관광공사_두루누비 정보 서비스_GW | 공공데이터포털](https://www.data.go.kr/data/15101974/openapi.do)
- [코리아둘레길 걷기 프로그램](https://www.durunubi.kr/walk-program.do)
- [두루누비(코리아둘레길) 앱](https://apps.apple.com/kr/app/%EB%91%90%EB%A3%A8%EB%88%84%EB%B9%84-%EC%BD%94%EB%A6%AC%EC%95%84%EB%91%98%EB%A0%88%EA%B8%B8/id1226279088)

---

## 5. 고캠핑 (GoCamping)

### 5.1 개요
- URL: <https://gocamping.or.kr/>
- 운영 주체: 한국관광공사 (대한민국 구석구석 산하)
- 포지셔닝: **전국 캠핑장 통합 정보** 포털 — 지자체 인허가 야영장 + 국립공원·자연휴양림·국민여가 캠핑장 + 문체부·KTO 선정 우수야영장.

### 5.2 데이터 항목
- 야영장명·구분 유형·위치(시도/시군구 GPS)
- 편의시설 보유: 화장실·샤워실·개수대 등
- 안전시설 보유: 소화기·방화수
- 사이트 종류 (오토캠핑/글램핑/카라반/일반)
- 우수캠핑장 인증 정보: <https://gocamping.or.kr/bsite/cntnts/read.do?cntnts_idx=9>
- 캠핑장 운영 현황 데이터

### 5.3 부가 서비스
- 캠핑장 온라인 교육 (사업자 대상): <https://www.gocamping.or.kr/lms/>
- 운영자 시스템: <https://gocamping.or.kr/oprtr/intro.do>
- SNS — 인스타그램 [@gocamping_official](https://www.instagram.com/gocamping_official/), 페이스북 [@go2thecamping](https://www.facebook.com/go2thecamping/), [유튜브 채널](https://www.youtube.com/channel/UCuCBPZUAgFBX0J1EVnkuXPQ)

### 5.4 OpenAPI
- 공공데이터포털: [한국관광공사_고캠핑 정보 조회서비스_GW](https://www.data.go.kr/data/15101933/openapi.do)
- 한국관광 데이터랩 캠핑 데이터: <https://datalab.visitkorea.or.kr/datalab/portal/loc/getAreaCampDataForm.do>

### 출처
- [한국관광공사 고캠핑](https://gocamping.or.kr/)
- [한국관광공사_고캠핑 정보 조회서비스_GW | 공공데이터포털](https://www.data.go.kr/data/15101933/openapi.do)
- [고캠핑 우수캠핑장](https://gocamping.or.kr/bsite/cntnts/read.do?cntnts_idx=9)

---

## 6. 열린관광 모두의 여행 — 무장애(배리어프리) 관광

### 6.1 개요
- URL: <https://access.visitkorea.or.kr/>
- 운영 주체: 한국관광공사 (문체부 위탁사업 포함)
- 포지셔닝: **모두를 위한 장애물 없는 관광** — 장애인·고령자·임산부·영유아 동반 가족 등 관광약자 대상 정보.

### 6.2 주요 기능
- **유용한 무장애 여행정보**: <https://access.visitkorea.or.kr/travel/useful_info.do>
- **지역별 열린관광지** (전국 인증 관광지): <https://access.visitkorea.or.kr/main/intro02.do>
- **무장애 관광 교육** (e배움터 연계 무료 강의): <https://access.visitkorea.or.kr/main/education.do>
- 시설별 편의시설 정보 (휠체어 접근, 점자, 수어, 보조견 동반 등)

### 6.3 OpenAPI
- 공공데이터포털: [한국관광공사_무장애 여행 정보_GW](https://www.data.go.kr/data/15101897/openapi.do)
- TourAPI 4.0 내 "무장애 관광정보" 서비스 항목으로 통합 제공.

### 출처
- [열린관광 모두의 여행](https://access.visitkorea.or.kr/)
- [유용한 무장애 여행정보](https://access.visitkorea.or.kr/travel/useful_info.do)
- [한국관광공사_무장애 여행 정보_GW | 공공데이터포털](https://www.data.go.kr/data/15101897/openapi.do)

---

## 7. 한국관광품질인증 (Korea Quality, KQ)

### 7.1 개요
- 메인 사이트: <https://koreaquality.visitkorea.or.kr/>
- 보조 도메인: <http://qualkorea.com/>
- 운영 주체: 문체부 위탁 → 한국관광공사 운영 (관광진흥법 근거)
- 포지셔닝: 관광 현장에서 자주 접하는 **숙박·쇼핑 4개 업종 8개 분야** 인증제도.

### 7.2 인증 대상 (4개 업종 8개 분야)
- 숙박: 한옥체험업·외국인관광 도시민박업·관광호텔업·중소형 숙박업 등
- 쇼핑: 외국인관광객 면세판매장 등

### 7.3 인증업소 혜택
- 시설·운영자금 융자 시 기준금리 대비 0.75%p ~ 최대 1.25%p 우대.
- 인증 표지 (인증서·인증현판·인증스티커) 활용 가능.
- 공사 운영 홈페이지·SNS·주요 포털 홍보.

### 7.4 데이터 / 공개
- 공공데이터포털: [한국관광 품질인증 현황](https://www.data.go.kr/data/15034825/fileData.do) (2025년 4월 기준 약 4,000개소대 인증 보도자료 존재)
- 인스타그램 [@koreaquality_kq](https://www.instagram.com/koreaquality_kq/)
- 대한민국 구석구석 내 KQ 코너: <https://korean.visitkorea.or.kr/other/otherService.do?otdid=456a84d1-84c4-11e8-8165-020027310001>

### 출처
- [한국관광품질인증](https://koreaquality.visitkorea.or.kr/)
- [한국관광품질인증[Korea Quality] 메인 | 대한민국 구석구석](https://korean.visitkorea.or.kr/other/otherService.do?otdid=456a84d1-84c4-11e8-8165-020027310001)
- [한국관광공사 한국관광 품질인증 현황](https://www.data.go.kr/data/15034825/fileData.do)
- [한국관광품질인증 4... 보도자료](https://kto.visitkorea.or.kr/kor/notice/news/press/board/view.kto?id=443501)

---

## 8. 우수웰니스관광지 / 웰니스 관광

### 8.1 개요
- 대한민국 구석구석 내 코너: <https://korean.visitkorea.or.kr/other/otherService.do?otdid=287776d6-8939-11e8-8165-020027310001>
- 운영 주체: 한국관광공사 관광상품실 (테마관광·한류관광·의료웰니스 총괄)
- 정의: 한방·온천·스파·뷰티·자연·치유 콘텐츠를 갖춘 **우수웰니스관광지** 매년 선정.

### 8.2 카테고리 (대표 분류)
- 자연·숲치유 (휴양림, 치유의 숲)
- 한방·뷰티 (한방병원, 한방체험, 미용·뷰티)
- 스파·온천
- 힐링·명상 (사찰체험, 템플스테이 연계)
- 의료관광 (피부과·치과·성형·종합검진 — KTO 의료관광 별도 사이트 연계)

### 출처
- [우수웰니스관광지 메인](https://korean.visitkorea.or.kr/other/otherService.do?otdid=287776d6-8939-11e8-8165-020027310001)
- [한국관광공사 보도자료 — 웰니스](https://knto.or.kr/pressRelease/431188)

---

## 9. 디지털 관광주민증

### 9.1 개요
- URL: <https://m.visitkorea.or.kr/digtCard/digt_card_intro.do>
- 운영 주체: 한국관광공사 + 문체부 + 11개 협력 지자체
- 포지셔닝: **인구소멸 위기 지역 관광활성화** 사업. 관광객이 가상의 "주민증"을 발급받아 지역 식음료·체험·관람·숙박 등 혜택을 받음.

### 9.2 운영 지역 (11개, 2025 기준)
- 인천 강화군 / 충남 태안군 / 전북 고창군 / 전남 신안군 / 강원 평창군 / 강원 정선군 / 충북 단양군 / 충북 옥천군 / 경남 거창군 / 경북 고령군 / 부산 영도구

### 9.3 발급 채널
- 대한민국 구석구석 앱 / 웹: <https://korean.visitkorea.or.kr/list/travelinfo.do?service=digt/>
- **티맵(TMAP) 연계** — 2025년부터 티맵에서도 발급·할인 사용 가능 (ZDNet 보도, 2025-07).

### 9.4 데이터 흐름
- 발급 정보, 사용처(가맹점) 데이터, 할인 사용 데이터를 KTO가 보유.
- 지역경제 효과 분석에 활용 (한국관광 데이터랩 연계).

### 출처
- [디지털 관광주민증 소개](https://m.visitkorea.or.kr/digtCard/digt_card_intro.do)
- [디지털 관광주민증 발급 신청](https://korean.visitkorea.or.kr/list/travelinfo.do?service=digt/)
- ['디지털 관광주민증' 운영 지역 확대로 — 문체부 보도자료](https://www.mcst.go.kr/attachFiles/viewer/result/press/20250326080431054418407756_PRESS20250326080431377043.hwpx.view.xhtml)
- [티맵에서도 '디지털 관광주민증' 발급 — 정책브리핑](https://www.korea.kr/news/policyNewsView.do?newsId=148946718)
- [디지털 관광주민증, 이제 티맵으로 쓴다 — ZDNet Korea](https://zdnet.co.kr/view/?no=20250728155202)
- [디지털 관광주민증 인스타그램](https://www.instagram.com/digitaltourid/)

---

## 10. 한국관광 데이터랩 (datalab.visitkorea.or.kr)

### 10.1 개요
- URL: <https://datalab.visitkorea.or.kr/>
- 운영 주체: 한국관광공사
- 포지셔닝: **관광 빅데이터 융합분석 플랫폼**. 이동통신·신용카드·내비게이션·관광통계·조사연구 데이터를 결합 제공.

### 10.2 데이터 소스
| 분류 | 소스 |
|---|---|
| 이동통신 | KT (내국인) / SK텔레콤 (외래객) |
| 카드 | BC카드·신한카드 등 |
| 내비게이션 | 티맵 등 |
| 통계 | 출입국·관광사업체·관광동향 |
| 조사연구 | KCTI(문화관광연구원) 연계 |

### 10.3 주요 분석 기능
- 지역별 방문자수 시계열 (외래객/내국인)
- 카드 소비 분석 (업종별/외국인 vs 내국인)
- 캠핑·숙박·축제별 데이터
- 세계관광통계 — <https://datalab.visitkorea.or.kr/datalab/portal/ts/getWldTursmStatsForm.do>
- 권역별/지자체별 마이크로 분석 도구
- AI 기반 스마트 데이터 분석

### 10.4 OpenAPI
- 공공데이터포털: [한국관광공사_관광빅데이터 정보서비스_GW](https://www.data.go.kr/data/15101972/openapi.do)
- 매년 활용 경진대회 운영 ("2025 한국관광 데이터랩 활용 경진대회" 등)

### 출처
- [한국관광 데이터랩](https://datalab.visitkorea.or.kr/)
- [한국관광공사_관광빅데이터 정보서비스_GW](https://www.data.go.kr/data/15101972/openapi.do)
- [세계관광통계](https://datalab.visitkorea.or.kr/datalab/portal/ts/getWldTursmStatsForm.do)
- [<2025 한국관광 데이터랩 활용 경진대회>](https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1135&bcIdx=309323)

---

## 11. 한국관광콘텐츠랩 / TourAPI 4.0

### 11.1 개요
- 콘텐츠랩: <https://conlab.visitkorea.or.kr/>
- TourAPI 포털: <https://api.visitkorea.or.kr/>
- 포지셔닝: KTO가 14년간 축적한 **관광 콘텐츠 280만 건**을 통합 제공하는 디지털 콘텐츠/오픈API 플랫폼.
- 2022년 **TourAPI 4.0** 구축. 외래객 친화 정보 + 관광인 채용정보 추가.

### 11.2 제공 데이터 (15종 ~26만 건 기본 + 확장)
1. 지역코드 정보
2. 서비스분류 코드 정보
3. 법정동 코드 정보
4. 분류체계 코드 정보
5. 지역기반 관광정보 (areaBasedList)
6. 위치기반 관광정보 (locationBasedList)
7. 키워드 검색 (searchKeyword)
8. 행사/축제 정보 (searchFestival)
9. 숙박 정보 (searchStay)
10. 공통 정보 (detailCommon)
11. 소개 정보 (detailIntro)
12. 반복 정보 (detailInfo)
13. 이미지 정보 (detailImage)
14. 관광정보 동기화 목록 정보 (areaBasedSyncList)
15. **반려동물 동반여행 정보** (신규 추가)

### 11.3 활용 사례 (KTO 공식 보도/사례집)
- 서울교통공사 **또타지하철 앱** — 'tour' 메뉴에 영문 관광정보 활용
- 한국공항공사 — 공항별 '여행정보' 메뉴에 국문 관광정보 활용
- 스타트업/외부 서비스: AI 맞춤형 여행코스 '다님', 팬덤 여행지 공유 '덕픽', 승마 종합 플랫폼 '말타' 등

### 11.4 공모전
- **2025/2026 관광데이터 활용 공모전** — 매년 개최. 2025년 공식: <https://www.2025tourapi.com/>
- 2026년 응모 작품의 필수 조건이 TourAPI 활용.

### 11.5 OpenAPI 등록
- 공공데이터포털: [한국관광공사_국문 관광정보 서비스_GW](https://www.data.go.kr/data/15101578/openapi.do) 외 다수.

### 출처
- [한국관광 콘텐츠랩](https://conlab.visitkorea.or.kr/)
- [TourAPI 메인](https://api.visitkorea.or.kr/)
- [한국관광공사 TourAPI - 2025 공모전 사이트](https://www.2025tourapi.com/sub/sub01.html)
- [2025 관광데이터 활용 공모전](https://www.2025tourapi.com/)
- [14년 축적된 관광 데이터 280만건 — 아주경제](https://www.ajunews.com/view/20240725074641040)
- [한국관광공사_국문 관광정보 서비스_GW](https://www.data.go.kr/data/15101578/openapi.do)
- [TourAPI 이해 및 활용 강의 — KTO 관광e배움터](https://touredu.visitkorea.or.kr/home/courseEdu/courseEduDetail?crsCd=C202201089)

---

## 12. K-스마일 캠페인

### 12.1 개요
- 운영 주체: 한국관광공사 (문체부 협업)
- 포지셔닝: **외국인관광객 환대 서비스 품질 향상** 캠페인. 종사자 친절·미소·정중한 응대 문화 확산.
- 직접 운영 단독 사이트는 없고 KTO 홈페이지·교육 프로그램·관광e배움터 강의로 제공.

### 출처
- [한국관광공사 알림마당](https://kto.visitkorea.or.kr/)
- [관광e배움터](https://touredu.visitkorea.or.kr/)

---

## 13. 한국관광 100선

- URL: <https://korean.visitkorea.or.kr/other/otherService.do?otdid=622bcd99-84fa-11e8-8165-020027310001>
- 정의: 문화체육관광부 + 한국관광공사가 격년 단위로 선정하는 **국내 대표 관광지 100곳**.
- 선정 절차: 전문가 평가 + 빅데이터 분석 + 국민투표 결합.
- 시각화: 지도·테마별 분류·계절별 추천.

### 출처
- [한국관광100선 메인](https://korean.visitkorea.or.kr/other/otherService.do?otdid=622bcd99-84fa-11e8-8165-020027310001)

---

## 14. 관광e배움터 (TourEdu)

- URL: <https://touredu.visitkorea.or.kr/>
- 운영 주체: 한국관광공사
- 무장애 관광·TourAPI 활용·관광 종사자 직무 등 무료 온라인 강의.
- TourAPI 활용 강의: <https://touredu.visitkorea.or.kr/home/courseEdu/courseEduDetail?crsCd=C202201089>

---

## 15. 관광지식정보시스템 / 통계

- URL: <https://www.tour.go.kr/>
- 정부(문체부) 주관, KTO 협력 운영. 관광 통계·정책 연구 자료 통합 제공.
- KTO 통계: <https://knto.or.kr/eng/index> (영문 KTO)
- 공공데이터포털 — KTO가 가장 많이 제공하는 기관 중 하나:
  - 국문/영문/일문/중문(간체·번체) 관광정보 서비스 GW
  - 두루누비 GW / 고캠핑 GW / 무장애 GW / 관광빅데이터 GW
  - 한국관광 통계 공표 / 한국관광 품질인증 현황 / 국민 해외관광객 통계 등

### 출처
- [관광지식정보시스템](https://www.tour.go.kr/)
- [Korea Tourism Organization - KTO 영문](https://knto.or.kr/eng/index)
- [한국관광공사_국민 해외관광객 연도별 상세 집계](https://www.data.go.kr/data/15136376/fileData.do)
- [한국관광공사_한국관광통계 공표](https://www.data.go.kr/data/15105720/fileData.do)

---

## 16. 코리아둘레길 / 친환경 캠페인 — KTO 캠페인성 운영

- 코리아둘레길: 동·서·남해안+DMZ 약 4,500km. 두루누비 앱이 인증·트래킹 채널.
- **초록발자국 캠페인** (문체부+KTO) — 친환경 여행 독려.
- **강원 ESG 불착 트레킹 여행 구독 상품** — KTO + 강원도관광재단 + 승우여행사 협업, "No 플라스틱·플로깅" 캠페인 결합.
- **친환경 추천 여행지** 큐레이션: <https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=c489777b-2908-48b2-a528-5d65c6a0ae51>

### 출처
- [[한국관광공사] "관광 부문에도 ESG 적극 실현합시다"](https://kto.visitkorea.or.kr/viewer/view.kto?id=79380&type=bd)
- [[한국관광공사]친환경 여행문화, 직접 실천해 보니](https://kto.visitkorea.or.kr/viewer/view.kto?id=62649&type=bd)
- [친환경 추천 여행지 친추 여행지](https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=c489777b-2908-48b2-a528-5d65c6a0ae51)
- [코리아둘레길 걷기 자전거 여행 코스 완전 정복 — TravelWeather](https://travelweather.co.kr/%EC%BD%94%EB%A6%AC%EC%95%84%EB%91%98%EB%A0%88%EA%B8%B8-%EA%B1%B7%EA%B8%B0-%EC%9E%90%EC%A0%84%EA%B1%B0-%EC%97%AC%ED%96%89-%EC%BD%94%EC%8A%A4-%EC%99%84%EC%A0%84-%EC%A0%95%EB%B3%B5-%EB%91%90%EB%A3%A8/)

---

## 17. 추가 KTO 주변 자산

| 자산 | URL/메모 |
|---|---|
| 한국관광공사 본사 사이트 | <https://kto.visitkorea.or.kr/> |
| 영문 KTO | <https://knto.or.kr/eng/index> |
| 정보공개 게시판 | <https://kto.visitkorea.or.kr/kor/gov30/dataList/board/list.kto> |
| RTO·지자체 정보교류 | <https://kto.visitkorea.or.kr/kor/notice/news/rto.kto> |
| 관광인 채용정보 | TourAPI 4.0 내 신규 서비스 |
| 한국관광산업포털 (투어라즈) | <https://touraz.kr/aboutTourazz> — 사업자 지원 |

---

## 18. 시사점 요약 (사실 정리만)

- KTO 자체 운영 디지털 채널은 **B2C(대한민국 구석구석/Imagine Your Korea/두루누비/고캠핑/열린관광)** 와 **B2B/B2G(데이터랩/콘텐츠랩/TourAPI/품질인증/e배움터)** 로 이원화되어 있음.
- TourAPI 4.0이 사실상 **KTO 산하 모든 B2C 서비스의 백엔드 공통 데이터 레이어** 역할을 하며, 외부 개발자에게도 동일 데이터가 OpenAPI로 공급됨.
- 디지털 관광주민증·코리아둘레길·열린관광·고캠핑 등은 **각각 독립 도메인**으로 운영되어 데이터 분절성이 존재. (통합 ID는 "투어원패스"로 부분 해결)
- KTO 자체 AI 기능은 "AI콕콕 플래너 (여행콕콕)" 수준에 머물러 있고, 마이리얼트립/트리플 등 민간 OTA의 AI 일정 생성 대비 기능 깊이는 상대적으로 단순.
- 데이터랩·캠핑·둘레길·무장애·디지털 관광주민증 등 각 도메인이 별도 OpenAPI를 보유 — TourAPI 단일 키로 통합 호출되지 않는 부분 존재.
- 매년 **관광데이터 활용 공모전**으로 외부 서비스 사례 발굴, 우수 사례는 KTO 공식 사례집/보도에 노출됨.

---
