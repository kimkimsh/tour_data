# 한국관광공사 TourAPI 조사

조사 기준일: 2026-05-03

## 공통 연동 구조

한국관광공사 TourAPI 계열 서비스는 공공데이터포털의 활용신청을 통해 서비스키를 발급받아 호출한다. 국문 관광정보 서비스 상세 페이지 기준 API 유형은 REST, 데이터 포맷은 JSON+XML, 비용은 무료, 개발단계는 자동승인, 운영단계는 심의승인이다. 개발계정 기본 트래픽은 1,000건이며, 운영계정은 활용사례 등록 후 트래픽 증가 신청이 가능하다고 명시되어 있다.

기본 호출 패턴:

```text
https://apis.data.go.kr/B551011/{ServiceId}/{operation}
  ?serviceKey={SERVICE_KEY}
  &numOfRows=10
  &pageNo=1
  &MobileOS=WEB
  &MobileApp={APP_NAME}
  &_type=json
```

공통 요청 파라미터:

| 파라미터 | 의미 | 조사 메모 |
| --- | --- | --- |
| `serviceKey` | 공공데이터포털 인증키 | 서버에서 보관하고 클라이언트에 노출하지 않는 구성이 필요 |
| `numOfRows` | 페이지당 결과 수 | API별 최대값 확인 필요 |
| `pageNo` | 페이지 번호 | 전체 수집 시 페이징 루프 필요 |
| `MobileOS` | OS 구분 | `IOS`, `AND`, `WEB`, `ETC` 사용 |
| `MobileApp` | 서비스명 | 활용 통계 산출용 필수 항목으로 매뉴얼에 명시 |
| `_type` | 응답 포맷 | JSON 사용 시 `json`; 기본은 XML인 API가 많음 |

공통 응답 구조:

```json
{
  "response": {
    "header": {
      "resultCode": "0000",
      "resultMsg": "OK"
    },
    "body": {
      "items": {
        "item": []
      },
      "numOfRows": 10,
      "pageNo": 1,
      "totalCount": 0
    }
  }
}
```

공통 오류 코드:

| 코드 | 의미 |
| --- | --- |
| `00` / `0000` | 정상 |
| `01` | 애플리케이션 오류 |
| `02` | DB 오류 |
| `03` | 데이터 없음 |
| `04` | HTTP 오류 |
| `05` | 서비스 연결 실패/타임아웃 |
| `10` | 잘못된 요청 파라미터 |
| `11` | 필수 요청 파라미터 누락 |
| `12` | 해당 OpenAPI 서비스 없음 또는 폐기 |
| `20` | 서비스 접근 거부 |
| `21` | 일시적으로 사용할 수 없는 서비스키 |
| `22` | 서비스 요청 제한 횟수 초과 |
| `30` | 등록되지 않은 서비스키 |
| `31` | 활용 기간 만료 |
| `32` | 등록되지 않은 IP |
| `33` | 서명되지 않은 호출 |
| `99` | 기타 오류 |

## 2025년 서비스 URL 변경 공지 반영

공공데이터포털의 2025-05-12 한국관광공사 공지는 국문 관광정보 서비스와 주요 다국어/무장애 서비스의 서비스 URL 변경을 안내했다. 개발 시 아래 서비스 ID를 우선 기준으로 삼는다.

| 서비스 | 기존 | 변경 후 |
| --- | --- | --- |
| 국문 관광정보 | `KorService1` | `KorService2` |
| 영문 관광정보 | `EngService1` | `EngService2` |
| 일문 관광정보 | `JpnService1` | `JpnService2` |
| 중문 간체 | `ChsService1` | `ChsService2` |
| 중문 번체 | `ChtService1` | `ChtService2` |
| 불어 | `FreService1` | `FreService2` |
| 독어 | `GerService1` | `GerService2` |
| 서어 | `SpnService1` | `SpnService2` |
| 노어 | `RusService1` | `RusService2` |
| 무장애 여행 | `KorWithService1` | `KorWithService2` |

## 핵심 TourAPI 서비스 목록

| 서비스 | 공공데이터포털 URL | Service ID / Base URL | 주요 오퍼레이션 | 데이터 성격 |
| --- | --- | --- | --- | --- |
| 국문 관광정보 서비스 | https://www.data.go.kr/data/15101578/openapi.do | `KorService2` | `areaBasedList2`, `locationBasedList2`, `searchKeyword2`, `searchFestival2`, `searchStay2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`, `areaBasedSyncList2`, `detailPetTour2`, `ldongCode2`, `lclsSystmCode2` | 국내 관광 전반: 관광지, 문화시설, 축제, 코스, 레포츠, 숙박, 쇼핑, 음식점, 이미지, 동기화, 반려동물 상세 |
| 영문 관광정보 서비스 | https://www.data.go.kr/data/15101753/openapi.do | `EngService2` | 국문과 유사한 목록/검색/상세/이미지/동기화/법정동/분류체계 계열 | VisitKorea 영문 콘텐츠 기반 국내 관광정보 |
| 일문 관광정보 서비스 | https://www.data.go.kr/data/15101760/openapi.do | `JpnService2` | 국문과 유사 | 일본어 관광 콘텐츠 |
| 중문 간체 관광정보 서비스 | https://www.data.go.kr/data/15101764/openapi.do | `ChsService2` | 국문과 유사 | 중국어 간체 관광 콘텐츠 |
| 중문 번체 관광정보 서비스 | https://www.data.go.kr/data/15101769/openapi.do | `ChtService2` | 국문과 유사 | 중국어 번체 관광 콘텐츠 |
| 독어 관광정보 서비스 | https://www.data.go.kr/data/15101805/openapi.do | `GerService2` | 국문과 유사 | 독일어 관광 콘텐츠 |
| 불어 관광정보 서비스 | https://www.data.go.kr/data/15101808/openapi.do | `FreService2` | 국문과 유사 | 프랑스어 관광 콘텐츠 |
| 서어 관광정보 서비스 | https://www.data.go.kr/data/15101811/openapi.do | `SpnService2` | 국문과 유사 | 스페인어 관광 콘텐츠 |
| 노어 관광정보 서비스 | https://www.data.go.kr/data/15101831/openapi.do | `RusService2` | 국문과 유사 | 러시아어 관광 콘텐츠 |
| 무장애 여행 정보 | https://www.data.go.kr/data/15101897/openapi.do | `KorWithService2` | `areaBasedList2`, `locationBasedList2`, `searchKeyword2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`, `areaBasedSyncList2`, `ldongCode2`, `lclsSystmCode2` | 열린관광 모두의여행 기반 접근성 관광정보 |
| 생태 관광 정보 | https://www.data.go.kr/data/15101908/openapi.do | `GreenTourService1` 계열 | 지역기반, 동기화 중심 | 생태관광 정보 |
| 관광사진 정보 | https://www.data.go.kr/data/15101914/openapi.do | `PhotoGalleryService1` | `galleryList`, `gallerySearchList`, `galleryDetailList`, `gallerySyncDetailList` | 포토코리아 사진 제목, 촬영일, 촬영지, 키워드, 이미지 URL |
| 관광용어 외국어 용례사전 | 폐기 공지: https://www.data.go.kr/bbs/ntc/selectNotice.do?originId=NOTICE_0000000003429 | 폐기 | 폐기 | 관광용어 외국어 용례사전 데이터 생성 및 관리 사업 종료로 2023-12-29 폐기 공지 |
| 고캠핑 정보 조회서비스 | https://www.data.go.kr/data/15101933/openapi.do | `GoCamping` | `basedList`, `locationBasedList`, `searchList`, `imageList`, `basedSyncList` | 캠핑장 목록, 위치기반, 검색, 이미지, 동기화 |
| 두루누비 정보 서비스 | https://www.data.go.kr/data/15101974/openapi.do | `Durunubi` | `routeList`, `courseList` | 코리아둘레길 등 걷기 코스와 GPX/주변 정보 |
| 관광지 오디오 가이드정보 | https://www.data.go.kr/data/15101971/openapi.do | `Odii` | `themeBasedList`, `themeLocationBasedList`, `themeSearchList`, `storyBasedList`, `storyLocationBasedList`, `storySearchList`, `themeBaseSyncdList`, `storyBasedSyncList` | 오디(Odii) 오디오 해설, 대본, 사진, 다국어 스토리 |
| 관광빅데이터 정보서비스 | https://www.data.go.kr/data/15101972/openapi.do | `DataLabService` | `metcoRegnVisitrDDList`, `locgoRegnVisitrDDList` | 광역/기초 지자체 방문자수 집계 |
| 관광인 채용정보 서비스 | https://www.data.go.kr/data/15125070/openapi.do | `tursmService` | `empmnInfoList`, `empmnInfoDetail`, `syncList` | 관광산업 채용정보 |
| 관광지 집중률 방문자 추이 예측 정보 | https://www.data.go.kr/data/15128555/openapi.do | `TatsCnctrRateService` | `tatsCnctrRateList` | 향후 30일 관광지 집중률 예측 |
| 기초지자체 중심 관광지 정보 | https://www.data.go.kr/data/15128559/openapi.do | `LocgoHubTarService1` | `areaBasedList1` | 기초지자체별 중심 관광지 |
| 관광지별 연관 관광지 정보 | https://www.data.go.kr/data/15128560/openapi.do | `TarRlteTarService1` | `areaBasedList1`, `searchKeyword1` | 관광지별 연관 관광지 |
| 반려동물 동반여행 서비스 | https://www.data.go.kr/data/15135102/openapi.do | `KorPetTourService2` | `areaBasedList2`, `locationBasedList`, `searchKeyword`, `detailCommon`, `detailIntro`, `detailInfo`, `detailImage`, `petTourSyncList`, `ldongCode2`, `lclsSystmCode2` | 반려동물 동반 가능 장소, 조건, 시설, 유의사항 |
| 웰니스관광정보 | https://www.data.go.kr/data/15144030/openapi.do | `WellnessTursmService` | `ldongCode`, `areaBasedList`, `locationBasedList`, `searchKeyword`, `wellnessTursmSyncList`, `detailCommon`, `detailIntro`, `detailImage` | 웰니스 관광정보 |
| 의료관광정보 | https://www.data.go.kr/data/15143913/openapi.do | `MdclTursmService` | `ldongCode`, `areaBasedList`, `locationBasedList`, `searchKeyword`, `SyncList`, `detailCommon`, `detailIntro` | 의료관광 정보 |
| 관광공모전 사진 수상작 정보 | https://www.data.go.kr/data/15145706/openapi.do | `PhokoAwrdService` | `ldongCode`, `phokoAwrdList`, `phokoAwrdSyncList` | 포토코리아 관광공모전 사진 수상작 |
| 지역별 관광 수요 강도 | 공공데이터포털 기관별 검색 결과 및 로컬 매뉴얼 | `AreaTarDemDsService` | `areaTarSjrnDsList`, `areaTarExpDsList` | 체류 강도, 소비 강도 |
| 지역별 관광 다양성 | https://www.data.go.kr/data/15151365/openapi.do | `AreaTarDivService` | `areaTouDivList`, `areaExpDivList`, `areaIntlDivList` | 관광객 다양성, 소비 다양성, 국제적 다양성 |
| 지역별 관광 자원 수요 | https://www.data.go.kr/data/15152138/openapi.do | `AreaTarResDemService` | `areaTarSvcDemList`, `areaCulResDemList` | 관광 서비스 수요, 문화 자원 수요 |

## 국문 관광정보 서비스 상세

공공데이터포털 설명 기준 국문 관광정보 서비스는 VisitKorea에 있는 정보 중 저작권 등에 구애 없이 자유롭게 활용 가능한 정보를 선별하여 OpenAPI로 제공한다. 개방 데이터는 지역기반, 위치기반, 키워드, 행사, 숙박, 공통, 소개, 반복, 이미지, 동기화, 반려동물 동반여행, 법정동, 분류체계 등으로 구성된다.

국문 콘텐츠 타입:

| `contentTypeId` | 타입 |
| --- | --- |
| `12` | 관광지 |
| `14` | 문화시설 |
| `15` | 행사/공연/축제 |
| `25` | 여행코스 |
| `28` | 레포츠 |
| `32` | 숙박 |
| `38` | 쇼핑 |
| `39` | 음식점 |

중요 필드:

| 필드 | 의미 | 개발상 주의 |
| --- | --- | --- |
| `contentid` | 콘텐츠 고유 ID | 상세/이미지/동기화의 연결 키 |
| `contenttypeid` | 콘텐츠 타입 | 타입별 소개/반복 필드가 달라짐 |
| `title` | 제목 | 다국어 서비스별 언어가 다름 |
| `addr1`, `addr2` | 주소 | 주소 정규화/지도 검색 보조 필요 |
| `mapx`, `mapy` | WGS84 경도/위도 | 지도 마커, 반경 검색, 공간 DB 인덱스 |
| `firstimage`, `firstimage2` | 대표 이미지 | 빈 값 가능, 저작권 유형 확인 필요 |
| `cpyrhtDivCd` | 이미지 공공누리 유형 | `Type1`, `Type3` 등 분기 필요 |
| `modifiedtime` | 수정일시 | 증분 동기화의 기준 |
| `showflag` | 표출 여부 | 동기화 API에서 비표출 처리 필요 |
| `lDongRegnCd`, `lDongSignguCd` | 법정동 시도/시군구 코드 | 지역 필터/행정구역 매핑 |
| `lclsSystm1~3` | 신분류체계 코드 | 관광 콘텐츠 분류 |

## 관광빅데이터 정보서비스 상세

`DataLabService`는 이동통신 데이터를 기반으로 광역/기초 지자체 방문자수 집계 데이터를 제공한다. 공공데이터포털 상세 설명에는 내국인 데이터는 KT, 외국인 데이터는 SK텔레콤 기반이라고 명시되어 있다. 방문자는 일상생활권을 벗어나 일정 시간 머문 사람으로 정의되며, 정확한 방문 목적을 알 수 없어 관광객과 동일한 개념으로 해석하면 안 된다는 주의가 있다.

| 오퍼레이션 | 의미 | 필수 조회 조건 |
| --- | --- | --- |
| `metcoRegnVisitrDDList` | 광역 지자체 지역방문자수 집계 | `startYmd`, `endYmd` |
| `locgoRegnVisitrDDList` | 기초 지자체 지역방문자수 집계 | `startYmd`, `endYmd` |

주요 응답 필드:

| 필드 | 의미 |
| --- | --- |
| `areaCode`, `areaNm` | 광역 시도 코드/명 |
| `signguCode`, `signguNm` | 시군구 코드/명 |
| `daywkDivCd`, `daywkDivNm` | 요일 코드/명 |
| `touDivCd`, `touDivNm` | 관광객 구분: 현지인, 외지인, 외국인 |
| `touNum` | 방문자수 |
| `baseYmd` | 기준일 |

## 데이터랩 기반 신규 지표 API

지역별 관광 수요 강도, 관광 다양성, 관광 자원 수요 API는 한국관광 데이터랩의 관광수요지수에서 제공하는 지표를 API화한 데이터다. 웹·앱에서 지역별 랭킹, 비교, 설명형 지표를 만들 때 원천이 되는 자료지만, 지수의 산출 기반이 이동통신·신용카드·내비게이션 등 빅데이터 결합이라는 점을 사용자에게 명확히 표시해야 한다.

| API | 구성 지표 | 오퍼레이션 |
| --- | --- | --- |
| 지역별 관광 수요 강도 | 관광 체류 강도, 관광 소비 강도 | `areaTarSjrnDsList`, `areaTarExpDsList` |
| 지역별 관광 다양성 | 관광객 다양성, 관광소비 다양성, 국제적 다양성 | `areaTouDivList`, `areaExpDivList`, `areaIntlDivList` |
| 지역별 관광 자원 수요 | 관광 서비스 수요, 문화 자원 수요 | `areaTarSvcDemList`, `areaCulResDemList` |

## 저장소 내 로컬 매뉴얼 대조

저장소에는 `docs/api_manual` 아래에 한국관광공사 활용매뉴얼이 포함되어 있다. 웹 상세 페이지가 JavaScript 또는 로그인 흐름으로 일부 제한될 때 로컬 매뉴얼이 오퍼레이션 확인에 유용하다.

| 로컬 매뉴얼 | 대응 서비스 |
| --- | --- |
| `한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx` | `KorService2` |
| `한국관광공사_개방데이터_활용매뉴얼(영문)_v4.4.docx` | `EngService2` |
| `한국관광공사_개방데이터_활용매뉴얼(일문)_v4.4.docx` | `JpnService2` |
| `한국관광공사_개방데이터_활용매뉴얼(중문간체)_v4.4.docx` | `ChsService2` |
| `한국관광공사_개방데이터_활용매뉴얼(중문번체)_v4.4.docx` | `ChtService2` |
| `한국관광공사_개방데이터_활용매뉴얼(독어)_v4.3.docx` | `GerService2` |
| `한국관광공사_개방데이터_활용매뉴얼(불어)_v4.3.docx` | `FreService2` |
| `한국관광공사_개방데이터_활용매뉴얼(서어)_v4.3.docx` | `SpnService2` |
| `한국관광공사_개방데이터_활용매뉴얼(노어)_v4.3.docx` | `RusService2` |
| `한국관광공사_개방데이터_활용매뉴얼(무장애여행)_v4.3.docx` | `KorWithService2` |
| `한국관광공사_개방데이터_활용매뉴얼(반려동물동반여행)_v4.1.docx` | `KorPetTourService2` |
| `한국관광공사_개방데이터_활용매뉴얼(관광빅데이터)_v4.1.docx` | `DataLabService` |
| `한국관광공사_개방데이터_활용매뉴얼(관광사진)_v4.2.docx` | `PhotoGalleryService1` |
| `한국관광공사_개방데이터_활용매뉴얼(고캠핑)_v4.1.docx` | `GoCamping` |
| `한국관광공사_개방데이터_활용매뉴얼(두루누비)_v4.1.docx` | `Durunubi` |
| `한국관광공사_개방데이터_활용매뉴얼(오디)_v4.1.docx` | `Odii` |
| `한국관광공사_개방데이터_활용매뉴얼(웰니스)_v4.1.docx` | `WellnessTursmService` |
| `한국관광공사_개방데이터_활용매뉴얼(의료)_v4.1.docx` | `MdclTursmService` |
| `한국관광공사_개방데이터_활용매뉴얼(관광공모전 수상작).docx` | `PhokoAwrdService` |
| `한국관광공사_개방데이터_활용매뉴얼(관광지집중률방문자추이예측정보)_v4.0.docx` | `TatsCnctrRateService` |
| `한국관광공사_개방데이터_활용매뉴얼(기초지자체_중심관광지정보)_v4.1.docx` | `LocgoHubTarService1` |
| `한국관광공사_개방데이터_활용매뉴얼(관광지별연관관광지정보)_v4.1.docx` | `TarRlteTarService1` |
| `한국관광공사_개방데이터_활용매뉴얼(지역별관광수요강도)_v4.0.docx` | `AreaTarDemDsService` |
| `한국관광공사_개방데이터_활용매뉴얼(지역별관광다양성)_v4.0.docx` | `AreaTarDivService` |
| `한국관광공사_개방데이터_활용매뉴얼(지역별관광자원수요)_v4.0.docx` | `AreaTarResDemService` |
