# 02. TourAPI 4.0 엔드포인트별 상세 명세 (모든 KTO OpenAPI)

> 본 문서는 KTO OpenAPI 26+ 서비스의 모든 오퍼레이션을 다음 형식으로 정리한다:
> - **호출 URL** (`http://apis.data.go.kr/B551011/{서비스ID}/{오퍼레이션}`)
> - **요청 파라미터** (필수=1 / 옵션=0)
> - **응답 메시지 주요 필드**
> - **요청·응답 예시**
>
> 1차 출처: KTO 공식 활용매뉴얼(`docs/api_manual/**/*.docx`, v3.3 / v4.0~v4.4). 모든 사실은 매뉴얼 표 또는 매뉴얼에 명시된 샘플 URL과 직접 대응한다.

---

## 0. 표준 공통 파라미터 (모든 KTO REST OpenAPI)

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `serviceKey` | O | 발급키 | 공공데이터포털 발급 인증키 (URL-Encode) |
| `MobileOS` | O | `ETC` | `IOS`, `AND`, `WEB`, `ETC` 중 하나 |
| `MobileApp` | O | `AppTest` | 서비스(앱·웹) 이름 — 통계 산출용 |
| `numOfRows` | X | `10` | 페이지당 결과 수 (기본 10) |
| `pageNo` | X | `1` | 페이지 번호 (기본 1) |
| `_type` | X | `json` | 응답 포맷. 생략 시 XML |

표준 응답 헤더(공통):
```json
{ "response": { "header": { "resultCode": "0000", "resultMsg": "OK" },
  "body": { "items": { "item": [...] }, "numOfRows": 10, "pageNo": 1, "totalCount": N } } }
```

이하 각 오퍼레이션은 위 공통 파라미터를 모두 받는다 (테이블에서 중복 표기는 생략하고 **고유 파라미터만 명시**한다).

---

## 1. KorService2 — 국문 관광정보 (TourAPI 4.0 본체) [13개 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/KorService2`

| # | 오퍼레이션(영문) | 한글 의미 | 유형 |
|---|---|---|---|
| 1 | `areaBasedList2` | 지역기반 관광정보 조회 | 목록 |
| 2 | `locationBasedList2` | 위치기반 관광정보 조회 | 목록 |
| 3 | `searchKeyword2` | 키워드 검색 조회 | 목록 |
| 4 | `searchFestival2` | 행사정보 조회 | 목록 |
| 5 | `searchStay2` | 숙박정보 조회 | 목록 |
| 6 | `detailCommon2` | 공통정보 조회 (상세1) | 상세 |
| 7 | `detailIntro2` | 소개정보 조회 (상세2) | 상세 |
| 8 | `detailInfo2` | 반복정보 조회 (상세3) | 상세 |
| 9 | `detailImage2` | 이미지정보 조회 (상세4) | 상세 |
| 10 | `areaBasedSyncList2` | 관광정보 동기화 목록 조회 | 목록 |
| 11 | `detailPetTour2` | 반려동물 동반여행 정보 조회 | 상세 |
| 12 | `ldongCode2` | 법정동 코드 조회 | 목록 |
| 13 | `lclsSystmCode2` | 분류체계 코드 조회 | 목록 |

> v4.4 (2026-02-10) 시점에서 **`areaCode2`/`categoryCode2`는 KorService2에서 삭제됨**. 위 13개가 KorService2 전체.

### 1.1 `areaBasedList2` — 지역기반 목록

- URL: `/B551011/KorService2/areaBasedList2`
- 설명: 시도/시군구(법정동) + 분류체계 + 콘텐츠타입을 조합해 국문 관광정보 목록을 반환. 정렬: 제목순/수정일순/등록일순.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `arrange` | X | `C` | `A`=제목순, `C`=수정일순, `D`=생성일순 / 대표이미지 必: `O`=제목순, `Q`=수정일순, `R`=생성일순 |
| `contentTypeId` | X | `12` | 12 관광지 / 14 문화시설 / 15 축제공연행사 / 25 여행코스 / 28 레포츠 / 32 숙박 / 38 쇼핑 / 39 음식점 |
| `modifiedtime` | X | `20250415` | YYYYMMDD |
| `lDongRegnCd` | X | `26` | 법정동 시도 코드 |
| `lDongSignguCd` | X | `380` | 법정동 시군구 코드 (lDongRegnCd 必) |
| `lclsSystm1` | X | `NA` | 분류체계 대분류 |
| `lclsSystm2` | X | `NA04` | 분류체계 중분류 (lclsSystm1 必) |
| `lclsSystm3` | X | `NA040500` | 분류체계 소분류 (lclsSystm1+2 必) |

응답 주요 필드: `addr1`, `addr2`, `contentid`(필수), `contenttypeid`(필수), `createdtime`(필수), `firstimage`, `firstimage2`, `cpyrhtDivCd`(저작권 유형 Type1/Type3), `mapx`(WGS84 경도), `mapy`(WGS84 위도), `mlevel`, `modifiedtime`(필수), `tel`, `title`(필수), `zipcode`, `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1/2/3`.

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/areaBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&arrange=C&contentTypeId=12&lDongRegnCd=26&lDongSignguCd=380&lclsSystm1=NA&lclsSystm2=NA04&lclsSystm3=NA040500
```

샘플 응답 (json 일부):
```json
{
  "addr1": "부산광역시 사하구 낙동남로 1240 (하단동)",
  "contentid": "127974",
  "contenttypeid": "12",
  "createdtime": "20031208090000",
  "firstimage": "http://tong.visitkorea.or.kr/cms/resource/21/3497121_image2_1.jpg",
  "firstimage2": "http://tong.visitkorea.or.kr/cms/resource/21/3497121_image3_1.jpg",
  "cpyrhtDivCd": "Type1",
  "mapx": "128.9460030322", "mapy": "35.1045320626", "mlevel": "6",
  "modifiedtime": "20250618095454",
  "title": "을숙도 공원", "zipcode": "49435",
  "lDongRegnCd": "26", "lDongSignguCd": "380",
  "lclsSystm1": "NA", "lclsSystm2": "NA04", "lclsSystm3": "NA040500"
}
```

### 1.2 `locationBasedList2` — 위치기반 목록 (반경)

- URL: `/B551011/KorService2/locationBasedList2`
- 설명: GPS 좌표 + 반경(`radius`) 기반. 정렬에 **거리순** 추가됨.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `mapX` | O | `126.98375` | WGS84 경도 |
| `mapY` | O | `37.563446` | WGS84 위도 |
| `radius` | O | `1000` | 거리 반경 (m). **Max 20000m = 20km** |
| `arrange` | X | `C` | `A/C/D/E`=제목/수정일/생성일/거리, 대표이미지 必=`O/Q/R/S` |
| `contentTypeId` | X | `39` | (위 1.1 코드표 동일) |
| `modifiedtime` | X | YYYYMMDD | 콘텐츠 수정일 |
| `lDongRegnCd`/`lDongSignguCd` | X | `11`/`140` | 법정동 |
| `lclsSystm1/2/3` | X | `FD/FD01/FD010100` | 분류체계 |

응답 주요 필드 = `areaBasedList2` 필드 + **`dist`**(중심 좌표로부터 거리, m).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/locationBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&arrange=C&mapX=126.98375&mapY=37.563446&radius=1000&contentTypeId=39
```

### 1.3 `searchKeyword2` — 키워드 검색

- URL: `/B551011/KorService2/searchKeyword2`
- 설명: 키워드 통합 검색. v4.3에서 **`contentTypeId` 요청 항목이 삭제**됨(키워드+법정동+분류체계만으로 검색).

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `keyword` | O | `시장` | 검색 키워드 (국문은 URL 인코딩) |
| `arrange` | X | `C` | A/C/D, 이미지 必 O/Q/R |
| `lDongRegnCd`/`lDongSignguCd` | X | `50`/`130` | 법정동 |
| `lclsSystm1/2/3` | X | `SH/SH06/SH060100` | 분류체계 |

응답 주요 필드: `areaBasedList2`와 동일 (콘텐츠 메타).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&arrange=C&keyword=%EC%8B%9C%EC%9E%A5
```

### 1.4 `searchFestival2` — 행사·공연·축제

- URL: `/B551011/KorService2/searchFestival2`
- 설명: contentTypeId=15 (행사/공연/축제) 한정. **`eventStartDate` 필수**(v3.6 변경, 2021-10-06).

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `eventStartDate` | **O** | `20260101` | YYYYMMDD |
| `eventEndDate` | X | `20261231` | YYYYMMDD |
| `arrange` | X | `C` | (위와 동일) |
| `modifiedtime` | X | YYYYMMDD | |
| `lDongRegnCd`/`lDongSignguCd` | X | | 법정동 |
| `lclsSystm1/2/3` | X | `EV/EV01/EV010500` | 분류체계 |

응답 추가 필드: `eventstartdate`, `eventenddate`, `progresstype`(진행상태정보), `festivaltype`(축제유형명).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/searchFestival2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&arrange=C&eventStartDate=20260101&eventEndDate=20261231
```

### 1.5 `searchStay2` — 숙박정보

- URL: `/B551011/KorService2/searchStay2`
- 설명: contentTypeId=32 (숙박) 한정. v4.3에서 (베니키아여부, 굿스테이여부, 한옥여부) 요청·응답 항목 삭제.

요청 파라미터(고유): `arrange`, `modifiedtime`, `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1/2/3`.

응답 주요 필드: `areaBasedList2`와 동일.

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/searchStay2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&arrange=C&lDongRegnCd=51&lDongSignguCd=820&lclsSystm1=AC&lclsSystm2=AC03&lclsSystm3=AC030100
```

### 1.6 `detailCommon2` — 공통 상세정보 (상세1)

- URL: `/B551011/KorService2/detailCommon2`
- 설명: 콘텐츠 ID로 공통 상세 (제목·주소·좌표·개요·홈페이지·이미지) 조회. v4.3에서 옵션 토글 파라미터들(관광타입ID·기본정보조회 여부·대표이미지조회 여부·지역코드/서비스분류코드/주소/좌표/개요 조회 여부) **모두 삭제**.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `contentId` | **O** | `126128` | 콘텐츠 ID |

응답 주요 필드: `contentid`, `contenttypeid`, `title`, `createdtime`, `modifiedtime`, `tel`, `telname`, `homepage`(HTML `<a>` 형태), `firstimage`, `firstimage2`, `cpyrhtDivCd`, `addr1`, `addr2`, `zipcode`, `mapx`, `mapy`, `mlevel`, `overview`(개요), `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1/2/3`.

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/detailCommon2?serviceKey=인증키&MobileApp=AppTest&MobileOS=ETC&pageNo=1&numOfRows=10&contentId=126128&_type=json
```

### 1.7 `detailIntro2` — 소개 상세정보 (상세2)

- URL: `/B551011/KorService2/detailIntro2`
- 설명: **타입(`contentTypeId`)별로 응답 필드가 다름**. 각 타입의 운영시간·휴무일·주차·요금 등.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 |
|---|---|---|
| `contentId` | O | `126128` |
| `contentTypeId` | O | `12` |

응답 필드는 타입별로 130개+ 분기. 핵심 발췌:

| contentTypeId | 주요 응답 필드 |
|---|---|
| 12 (관광지) | `accomcount`(수용인원), `chkbabycarriage`(유모차대여), `chkcreditcard`, `chkpet`(애완동물), `expagerange`(체험연령), `expguide`(체험안내), `heritage1/2/3`(세계 문화/자연/기록유산 유무), `infocenter`(문의안내), `opendate`, `parking`, `restdate`(쉬는날), `useseason`, `usetime` |
| 14 (문화시설) | `accomcountculture`, `chkbabycarriageculture`, `chkcreditcardculture`, `chkpetculture`, `discountinfo`, `infocenterculture`, `parkingculture`, `parkingfee`, `restdateculture`, `usefee`, `usetimeculture`, `scale`(규모), `spendtime`(관람소요시간) |
| 15 (행사/공연/축제) | `agelimit`(관람가능연령), `bookingplace`(예매처), `discountinfofestival`, `eventstartdate`, `eventenddate`, `eventhomepage`, `eventplace`, `festivalgrade`(축제등급, 2016-06-17 추가), `placeinfo`, `playtime`, `program`, `spendtimefestival`, `sponsor1`, `sponsor1tel`, `sponsor2`, `sponsor2tel`, `subevent`, `usetimefestival` |
| 25 (여행코스) | `distance`(코스총거리), `infocentertourcourse`, `schedule`(코스일정), `taketime`(코스총소요시간), `theme`(코스테마) |
| 28 (레포츠) | `accomcountleports`, `chkbabycarriageleports`, `chkcreditcardleports`, `chkpetleports`, `expagerangeleports`, `infocenterleports`, `openperiod`(개장기간), `parkingfeeleports`, `parkingleports`, `reservation`, `restdateleports`, `scaleleports`, `usefeeleports`(입장료), `usetimeleports` |
| 32 (숙박) | `accomcountlodging`, `checkintime`, `checkouttime`, `chkcooking`(객실내취사), `foodplace`, `infocenterlodging`, `parkinglodging`, `pickup`(픽업서비스), `roomcount`(객실수), `reservationlodging`, `reservationurl`, `roomtype`, `scalelodging`, `subfacility`(부대시설), `barbecue`, `beauty`, `beverage`, `bicycle`, `campfire`, `fitness`, `karaoke`, `publicbath`, `publicpc`, `sauna`, `seminar`, `sports`, `refundregulation`(환불규정, 2018-11-01 추가) |
| 38 (쇼핑) | `chkbabycarriageshopping`, `chkcreditcardshopping`, `chkpetshopping`, `culturecenter`, `fairday`(장서는날), `infocentershopping`, `opendateshopping`, `opentime`(영업시간), `parkingshopping`, `restdateshopping`, `restroom`, `saleitem`, `saleitemcost`, `scaleshopping`, `shopguide`(매장안내) |
| 39 (음식점) | `chkcreditcardfood`, `discountinfofood`, `firstmenu`(대표메뉴), `infocenterfood`, `kidsfacility`(어린이놀이방여부), `opentimefood`, `packing`, `parkingfood`, `reservationfood`, `restdatefood`, `scalefood`, `seat`, `smoking`, `treatmenu`(취급메뉴), `lcnsno`(인허가번호, 2020-04-16 추가) |

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/detailIntro2?serviceKey=인증키&MobileOS=ETC&MobileApp=AppTest&_type=json&contentId=126128&contentTypeId=12
```

### 1.8 `detailInfo2` — 반복(추가) 상세정보 (상세3)

- URL: `/B551011/KorService2/detailInfo2`
- 설명: 타입에 따라 다음과 같이 동작.
  - **숙박(32)**: 객실(room) 정보 반복 — `roomcode`, `roomtitle`, `roomsize1/2`, `roomcount`, `roombasecount`, `roommaxcount`, `roomoffseasonminfee1/2`(비수기 주중/주말 최저), `roompeakseasonminfee1/2`(성수기 주중/주말 최저), `roomintro`, 시설 토글(`roombathfacility`, `roombath`, `roomhometheater`, `roomaircondition`, `roomtv`, `roompc`, `roomcable`, `roominternet`, `roomrefrigerator`, `roomtoiletries`, `roomsofa`, `roomcook`, `roomtable`, `roomhairdryer`), 객실 이미지(`roomimg1~5`, `roomimg1alt~5alt`, `cpyrhtDivCd1~5`).
  - **여행코스(25)**: 코스 일정 항목 반복 — 일자별 콘텐츠 sequence (자세한 필드는 매뉴얼 참조).
  - **그 외(12/14/15/28/38/39)**: `serialnum`(일련번호), `infoname`(정보명), `infotext`(정보내용), `fldgubun`(반복정보유형) — 자유형 키-값 반복.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 |
|---|---|---|
| `contentId` | O | `126128` |
| `contentTypeId` | O | `12` |

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/detailInfo2?serviceKey=인증키&MobileOS=ETC&MobileApp=AppTest&_type=json&contentId=988449&contentTypeId=12
```

### 1.9 `detailImage2` — 이미지정보 (상세4)

- URL: `/B551011/KorService2/detailImage2`
- 설명: 콘텐츠 추가 이미지 (대표이미지 외) 또는 음식메뉴 이미지(음식점). v4.3에서 `subImageYN` 요청항목 삭제.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `contentId` | O | `126128` | |
| `imageYN` | X | `Y` | `Y`=콘텐츠 일반 이미지 / `N`=음식점 음식 이미지 |

응답 필드: `contentid`, `originimgurl`(원본), `imgname`, `smallimageurl`(썸네일), `cpyrhtDivCd`(저작권 유형), `serialnum`(일련번호).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/detailImage2?serviceKey=인증키&MobileApp=AppTest&MobileOS=ETC&pageNo=1&numOfRows=10&contentId=126128&imageYN=Y&_type=json
```

### 1.10 `areaBasedSyncList2` — 동기화 목록 조회

- URL: `/B551011/KorService2/areaBasedSyncList2`
- 설명: DB 동기화 용도. 표출/비표출 여부와 수정일 기준으로 콘텐츠 변경분을 받아옴. v4.3에서 `oldContentid` 신설(이전 KEY로 조회).

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `showflag` | X | `1` | 표출(1) / 비표출(0) |
| `modifiedtime` | X | `20250415` | YYYY/YYYYMM/YYYYMMDD 모두 가능 |
| `arrange` | X | `C` | (1.1과 동일) |
| `contentTypeId` | X | `14` | |
| `lDongRegnCd`/`lDongSignguCd` | X | | |
| `lclsSystm1/2/3` | X | | |
| `oldContentid` | X | | DB 동기화 시 이전 KEY |

응답 필드 = `areaBasedList2` + **`showflag`** (필수, 표출여부).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/areaBasedSyncList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&showflag=1&arrange=C&modifiedtime=20250415&contentTypeId=14&lDongRegnCd=30&lDongSignguCd=200
```

### 1.11 `detailPetTour2` — 반려동물 동반여행 정보

- URL: `/B551011/KorService2/detailPetTour2`
- 설명: 콘텐츠별 반려동물 동반 가능 여부·필요사항. (v4.1, 2023-01-30 신규)

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `contentid` | X | `125534` | 미기입 시 반려동물 정보 전부 |

응답 필드: `acmpyPsblCpam`(동반가능동물), `relaRntlPrdlst`(관련 렌탈 품목), `acmpyNeedMtr`(동반시 필요사항), `relaFrnshPrdlst`(관련 비치 품목), `etcAcmpyInfo`(기타 동반 정보), `relaPurcPrdlst`(관련 구매 품목), `relaAcdntRiskMtr`(관련 사고 대비사항), `acmpyTypeCd`(동반유형코드), `relaPosesFclty`(관련 구비 시설), `contentid`, `petTursmInfo`(반려동물 관광정보).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/detailPetTour2?serviceKey=인증키&pageNo=1&numOfRows=10&MobileOS=ETC&MobileApp=AppTest&contentId=125534&_type=json
```

### 1.12 `ldongCode2` — 법정동 코드 조회 (v4.3 신규)

- URL: `/B551011/KorService2/ldongCode2`
- 설명: 법정동 시도/시군구 코드 + 이름 매칭. `lDongListYn=Y`로 전체 목록 조회 가능.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `lDongRegnCd` | X | `11` | 시도코드. 미입력 시 시도 전체 |
| `lDongListYn` | X | `N` | `N`=코드(시군구) 조회, `Y`=전체목록 조회 |

응답 필드:
- `lDongListYn=N` 시: `code`(예 `110`), `name`(예 `종로구`), `rnum`
- `lDongListYn=Y` 시: `lDongRegnCd`, `lDongRegnNm`(시도명), `lDongSignguCd`, `lDongSignguNm`, `rnum`

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/ldongCode2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=APP&_type=json&lDongRegnCd=11&lDongListYn=N
```

### 1.13 `lclsSystmCode2` — 분류체계 코드 조회 (v4.3 신규)

- URL: `/B551011/KorService2/lclsSystmCode2`
- 설명: 신분류체계 1/2/3 Depth 코드. `lclsSystmListYn=Y`로 전체 트리 일괄 조회.

요청 파라미터(고유):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `lclsSystm1` | X | `AC` | 대분류 |
| `lclsSystm2` | X | `AC01` | 중분류 (lclsSystm1 必) |
| `lclsSystm3` | X | `AC010100` | 소분류 (1+2 必) |
| `lclsSystmListYn` | X | `N` | `N`=코드 조회, `Y`=전체목록 조회 |

응답 필드:
- `N`: `code`, `name`, `rnum`
- `Y`: `lclsSystm1Cd`, `lclsSystm1Nm`, `lclsSystm2Cd`, `lclsSystm2Nm`, `lclsSystm3Cd`, `lclsSystm3Nm`, `rnum` — 전체 코드는 매뉴얼 기준 **243건** (totalCount).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorService2/lclsSystmCode2?serviceKey=인증키&MobileApp=APP&MobileOS=ETC&pageNo=1&numOfRows=10&_type=json&lclsSystmListYn=Y
```

---

## 2. 다국어 관광정보 서비스 (8종) — Eng/Jpn/Chs/Cht/Ger/Fre/Spn/RusService2

다국어 8개 서비스는 **KorService2와 거의 동일한 시그니처를 공유**한다. 단, 다음 차이가 있다:

1. **베이스 URL**의 `KorService2` 부분만 해당 언어 서비스 ID로 치환:
   - `EngService2`, `JpnService2`, `ChsService2`, `ChtService2`, `GerService2`, `FreService2`, `SpnService2`, `RusService2`
2. **`contentTypeId` 코드값이 다름**:
   - 75 레포츠 / 76 관광지 / 77 교통(다국어 한정) / 78 문화시설 / 79 쇼핑 / 80 숙박 / 82 음식점 / 85 축제공연행사
3. **반려동물 정보**(`detailPetTour2`)는 다국어 서비스에 **없음** — 국문(`KorService2`) 전용.
4. **여행코스** contentTypeId는 다국어에서는 **별도 코드 미할당**(매뉴얼 표 기준 `-`).

### 2.1 EngService2 — 영문 관광정보 [12개 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/EngService2`

| # | 오퍼레이션 | 한글 의미 |
|---|---|---|
| 1 | `areaBasedList2` | 지역기반 관광정보 |
| 2 | `locationBasedList2` | 위치기반 관광정보 |
| 3 | `searchKeyword2` | 키워드 검색 |
| 4 | `searchFestival2` | 행사 정보 |
| 5 | `searchStay2` | 숙박 정보 |
| 6 | `detailCommon2` | 공통 상세 |
| 7 | `detailIntro2` | 소개 상세 |
| 8 | `detailInfo2` | 반복 상세 |
| 9 | `detailImage2` | 이미지 상세 |
| 10 | `areaBasedSyncList2` | 영문 동기화 목록 |
| 11 | `ldongCode2` | 법정동 코드 |
| 12 | `lclsSystmCode2` | 분류체계 코드 |

요청·응답 필드는 KorService2와 동일하되 콘텐츠 본문이 **영문**으로 반환됨. 응답 예시 (영문):
```json
{ "addr1": "40 Cheonggyecheon-ro, Jung-gu, Seoul", "title": "HiKR Ground (하이커 그라운드)", "contenttypeid": "78", ... }
```

샘플 URL (지역기반):
```
https://apis.data.go.kr/B551011/EngService2/areaBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&arrange=C&contentTypeId=85&lDongRegnCd=47&lDongSignguCd=130&lclsSystm1=EV&lclsSystm2=EV02&lclsSystm3=EV021000
```

### 2.2 JpnService2 — 일문 관광정보

베이스 URL: `https://apis.data.go.kr/B551011/JpnService2`. 12개 오퍼레이션 = EngService2와 동일.

샘플 URL (위치기반):
```
https://apis.data.go.kr/B551011/JpnService2/locationBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&mapX=126.9608659589&mapY=37.5076357737&radius=1000
```

### 2.3 ChsService2 — 중문 간체

베이스 URL: `https://apis.data.go.kr/B551011/ChsService2`. 12개 오퍼레이션 동일.

샘플 URL (검색):
```
https://apis.data.go.kr/B551011/ChsService2/searchKeyword2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&keyword=시장&lDongRegnCd=26&lDongSignguCd=110&lclsSystm1=SH&lclsSystm2=SH06&lclsSystm3=SH060200
```

### 2.4 ChtService2 — 중문 번체

베이스 URL: `https://apis.data.go.kr/B551011/ChtService2`. 12개 오퍼레이션 동일.

### 2.5 GerService2 — 독문

베이스 URL: `https://apis.data.go.kr/B551011/GerService2`. 12개 오퍼레이션 동일.

### 2.6 FreService2 — 불문

베이스 URL: `https://apis.data.go.kr/B551011/FreService2`. 12개 오퍼레이션 동일.

### 2.7 SpnService2 — 서문 (스페인어)

베이스 URL: `https://apis.data.go.kr/B551011/SpnService2`. 12개 오퍼레이션 동일.

### 2.8 RusService2 — 노문 (러시아어)

베이스 URL: `https://apis.data.go.kr/B551011/RusService2`. 12개 오퍼레이션 동일.

샘플 URL (지역기반):
```
https://apis.data.go.kr/B551011/RusService2/areaBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&_type=json&contentTypeId=85&lDongRegnCd=11&lDongSignguCd=140
```

---

## 3. KorWithService2 — 국문 무장애 여행 정보 [13개 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/KorWithService2`

| # | 오퍼레이션 | 한글 의미 |
|---|---|---|
| 1 | `areaCode2` | 지역코드 조회 (※ 25년12월말까지만, 신규 법정동으로 대체) |
| 2 | `categoryCode2` | 서비스 분류코드 조회 (※ 25년12월말까지만, 신규 분류체계로 대체) |
| 3 | `areaBasedList2` | 지역기반 관광정보 |
| 4 | `locationBasedList2` | 위치기반 |
| 5 | `searchKeyword2` | 키워드 검색 |
| 6 | `detailCommon2` | 공통 상세 |
| 7 | `detailIntro2` | 소개 상세 |
| 8 | `detailInfo2` | 반복 상세 |
| 9 | `detailImage2` | 이미지 상세 |
| 10 | `detailWithTour2` | **무장애여행 상세정보** (무장애 전용 상세5) |
| 11 | `areaBasedSyncList2` | 무장애 여행정보 동기화 목록 |
| 12 | `ldongCode2` | 법정동 코드 |
| 13 | `lclsSystmCode2` | 분류체계 코드 |

contentTypeId 코드 (무장애 한정): 12 관광지 / 14 문화시설 / 15 행사·공연·축제 / 28 레포츠 / 32 숙박 / 38 쇼핑 (음식점·여행코스 제외).

### 3.1 `areaCode2` — 지역코드 조회 (legacy)

- URL: `/B551011/KorWithService2/areaCode2`
- 설명: 정책 기준의 areaCode/sigunguCode 체계(서울=1, 부산=6 등). **2025-12-31 까지만 활용**, 이후 `ldongCode2`로 대체.

요청 파라미터: `areaCode`(선택; 미입력 시 시도 전체).

응답 필드: `code`(지역/시군구 코드), `name`(지역/시군구명), `rnum`.

샘플 URL:
```
https://apis.data.go.kr/B551011/KorWithService2/areaCode2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&areaCode=1
```

### 3.2 `categoryCode2` — 서비스 분류코드 조회 (legacy)

- URL: `/B551011/KorWithService2/categoryCode2`
- 설명: A/B/C 코드 체계 (예: A01 자연, A02 인문, A03 레포츠, A04 쇼핑, A05 음식, B02 숙박, C01 추천코스). **2025-12-31 까지만 활용**, 이후 `lclsSystmCode2`로 대체.

요청 파라미터:

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `contentTypeId` | X | `12` | |
| `cat1` | X | `A01` | 대분류 |
| `cat2` | X | `A0101` | 중분류 (cat1 必) |
| `cat3` | X | `A01010100` | 소분류 (cat1+cat2 必) |

응답 필드: `code`, `name`, `rnum`.

샘플 URL:
```
https://apis.data.go.kr/B551011/KorWithService2/categoryCode2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&contentTypeId=12&cat1=A01&cat2=A0101
```

### 3.3 `areaBasedList2` (KorWithService2)

KorService2와 동일하되, **`areaCode`/`sigunguCode`/`cat1`/`cat2`/`cat3` legacy 파라미터를 추가로 받음** (법정동/lclsSystm와 병행 사용).

샘플 URL:
```
https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&contentTypeId=14&areaCode=4&sigunguCode=4
```

### 3.4 `detailWithTour2` — 무장애 여행 상세 (이 서비스 고유)

- URL: `/B551011/KorWithService2/detailWithTour2`
- 설명: 지체장애·시각장애·청각장애·영유아가족 4개 카테고리에 대한 상세 무장애 정보.

요청 파라미터:

| 파라미터 | 필수 | 샘플 |
|---|---|---|
| `contentId` | O | `988449` |

응답 주요 필드:
- 공통: `contentid`, `parking`, `route`, `publictransport`, `ticketoffice`, `promotion`
- 지체장애: `wheelchair`, `exit`, `elevator`, `restroom`, `auditorium`, `room`, `handicapetc`
- 시각장애: `braileblock`(점자블록), `helpdog`(도우미견), `guidehuman`, `audioguide`, `bigprint`, `brailepromotion`, `guidesystem`, `blindhandicapetc`
- 청각장애: `signguide`, `videoguide`, `hearingroom`, `hearinghandicapetc`
- 영유아가족: `stroller`, `lactationroom`(수유실), `babysparechair`, `infantsfamilyetc`

샘플 URL:
```
https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&contentId=988449
```

### 3.5 KorWithService2 나머지 오퍼레이션
`locationBasedList2`, `searchKeyword2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`, `areaBasedSyncList2`, `ldongCode2`, `lclsSystmCode2` — 모두 KorService2와 동일한 시그니처 (legacy `areaCode`/`cat1`/`cat2`/`cat3` 파라미터를 옵션으로 받음).

---

## 4. KorPetTourService2 — 반려동물 동반여행 [11개 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/KorPetTourService2`

| # | 오퍼레이션 | 한글 |
|---|---|---|
| 1 | `areaBasedList2` | 지역기반 |
| 2 | `locationBasedList2` | 위치기반 |
| 3 | `searchKeyword2` | 키워드 검색 |
| 4 | `detailCommon2` | 공통 상세 |
| 5 | `detailIntro2` | 소개 상세 |
| 6 | `detailInfo2` | 반복 상세 |
| 7 | `detailImage2` | 이미지 |
| 8 | `detailPetTour2` | 반려동물 상세 |
| 9 | `areaBasedSyncList2` | 동기화 |
| 10 | `ldongCode2` | 법정동 |
| 11 | `lclsSystmCode2` | 분류체계 |

콘텐츠는 반려동물 동반 가능 장소만. 시그니처는 KorService2와 동일.

샘플 URL:
```
https://apis.data.go.kr/B551011/KorPetTourService2/areaBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&contentTypeId=12&_type=json&lDongRegnCd=46
```

---

## 5. GreenTourService1 — 생태관광정보

베이스 URL: `https://apis.data.go.kr/B551011/GreenTourService1`

| 오퍼레이션 | 한글 |
|---|---|
| `areaCode1` | 지역코드 조회 |
| `areaBasedList1` | 지역기반 생태관광정보 |
| `areaBasedSyncList1` | 동기화 목록 |

샘플 URL:
```
http://apis.data.go.kr/B551011/GreenTourService1/areaBasedList1?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&areaCode=2&sigunguCode=9
```

---

## 6. WellnessTursmService — 웰니스 관광정보 (langDivCd 사용)

베이스 URL: `https://apis.data.go.kr/B551011/WellnessTursmService`

| 오퍼레이션 | 한글 |
|---|---|
| `ldongCode` | 법정동 코드 조회 |
| `areaBasedList` | 지역기반 |
| `locationBasedList` | 위치기반 |
| `searchKeyword` | 키워드 검색 |
| `wellnessTursmSyncList` | 동기화 목록 (`/B551011/wellnessTursmSyncList/wellnessTursmSyncList`로 별도 base 사용) |
| `detailCommon` | 공통 상세 |

특이 파라미터: **`langDivCd`** (예: `KOR`) — 언어 분류 코드.

샘플 URL:
```
http://apis.data.go.kr/B551011/WellnessTursmService/searchKeyword?serviceKey=서비스키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&langDivCd=KOR&contentTypeId=12&arrange=C&keyword=스파&_type=json
```

---

## 7. MdclTursmService — 의료 관광정보 (langDivCd 사용)

베이스 URL: `https://apis.data.go.kr/B551011/MdclTursmService`

| 오퍼레이션 | 한글 |
|---|---|
| `ldongCode` | 법정동 코드 |
| `areaBasedList` | 지역기반 |
| `locationBasedList` | 위치기반 |
| `searchKeyword` | 키워드 |
| `mdclTursmSyncList` | 동기화 목록 |
| `detailCommon` | 공통 상세 |

특이 파라미터: `langDivCd` (예: `ENG` 다국어 검색 가능).

샘플 URL:
```
http://apis.data.go.kr/B551011/MdclTursmService/areaBasedList?serviceKey=서비스키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&langDivCd=ENG&arrange=C&lDongRegnCd=11&_type=json
```

---

## 8. PhotoGalleryService1 — 관광사진 갤러리

베이스 URL: `https://apis.data.go.kr/B551011/PhotoGalleryService1`

| 오퍼레이션 | 한글 |
|---|---|
| `galleryList1` | 관광사진 갤러리 목록 |
| `gallerySearchList1` | 키워드 검색 목록 |
| `galleryDetailList1` | 갤러리 상세 목록 |
| `gallerySyncDetailList1` | 동기화(표출 여부) |

샘플 URL:
```
http://apis.data.go.kr/B551011/PhotoGalleryService1/galleryList1?serviceKey=인증키&arrange=C&MobileOS=ETC&MobileApp=AppTesting&numOfRows=1&pageNo=1
```

---

## 9. Odii — 관광지 오디오 가이드

베이스 URL: `https://apis.data.go.kr/B551011/Odii`

| 오퍼레이션 | 한글 |
|---|---|
| `themeBasedList` | 관광지(테마) 기본 정보 목록 |
| `themeLocationBasedList` | 관광지 위치기반 |
| `themeSearchList` | 관광지 키워드 검색 |
| `storyBasedList` | 이야기(스토리) 기본 정보 |
| `storyLocationBasedList` | 이야기 위치기반 |
| `storySearchList` | 이야기 키워드 검색 |

특이 파라미터: **`langCode`** (예: `ko`), 위치기반은 `xCoord`/`yCoord` 사용 (다른 서비스와 다름).

샘플 URL:
```
http://apis.data.go.kr/B551011/Odii/themeBasedList?serviceKey=서비스인증키&MobileOS=ETC&MobileApp=AppTest&pageNo=1&numOfRows=10&langCode=ko
```

```
http://apis.data.go.kr/B551011/Odii/storyLocationBasedList?serviceKey=서비스인증키&MobileOS=ETC&MobileApp=AppTest&lang=ko&xCoord=126.615455&yCoord=34.476566&radius=1000
```

---

## 10. GoCamping — 고캠핑 정보 [5개 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/GoCamping`

| 오퍼레이션 | 한글 |
|---|---|
| `basedList` | 기본 정보 목록 |
| `locationBasedList` | 위치기반 정보 목록 |
| `searchList` | 키워드 검색 목록 |
| `imageList` | 이미지정보 목록 |
| `basedSyncList` | 고캠핑정보 동기화 목록 |

응답 데이터: 캠핑장 운영 현황 (전국 지자체 인허가 시스템 연계). 시설명·위치·편의시설(화장실, 샤워실, 싱크), 안전장비(소화기, 소화전) 포함.

샘플 URL (기본):
```
http://apis.data.go.kr/B551011/GoCamping/basedList?serviceKey=서비스인증키&MobileOS=ETC&MobileApp=AppTest&pageNo=1&numOfRows=10
```

샘플 URL (위치기반):
```
http://apis.data.go.kr/B551011/GoCamping/locationBasedList?serviceKey=서비스인증키&MobileOS=ETC&MobileApp=AppTest&mapX=128.6142847&mapY=36.0345423&radius=2000
```

샘플 URL (키워드):
```
http://apis.data.go.kr/B551011/GoCamping/searchList?serviceKey=서비스인증키&MobileOS=ETC&MobileApp=AppTest&keyword=%EC%95%BC%EC%98%81%EC%9E%A5
```

샘플 URL (이미지):
```
http://apis.data.go.kr/B551011/GoCamping/imageList?serviceKey=서비스인증키&MobileOS=ETC&MobileApp=AppTest&contentId=3429
```

샘플 URL (동기화):
```
http://apis.data.go.kr/B551011/GoCamping/basedSyncList?serviceKey=인증키&MobileOS=ETC&MobileApp=AppTest&syncStatus=A
```

특이 파라미터:
- `syncStatus`: `A`(신규) / `U`(수정) / `D`(삭제)
- `syncModTime`: YYMMDD (예 `221018` = 2022-10-18)

---

## 11. Durunubi — 두루누비(코리아둘레길) [2개 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/Durunubi`

| 오퍼레이션 | 한글 |
|---|---|
| `routeList` | 길 목록 정보 조회 |
| `courseList` | 코스 목록 정보 조회 |

데이터: 코리아둘레길 284개 코스의 GPX + 주변 관광정보.

샘플 URL (길 목록):
```
http://apis.data.go.kr/B551011/Durunubi/routeList?serviceKey=서비스인증키&pageNo=1&numOfRows=10&MobileOS=ETC&MobileApp=AppTest&themeNm=천지인&brdDiv=DNWW
```

샘플 URL (코스 목록):
```
http://apis.data.go.kr/B551011/Durunubi/courseList?serviceKey=서비스인증키&pageNo=1&numOfRows=10&MobileOS=ETC&MobileApp=AppTest&crsKorNm=밀양강&crsLevel=2&brdDiv=DNBW
```

특이 파라미터:
- `themeNm`: 테마명 (예 `천지인`)
- `brdDiv`: 게시판 구분 (`DNWW`=둘레길 워킹, `DNBW`=둘레길 자전거 등)
- `crsKorNm`: 코스 한글명
- `crsLevel`: 난이도 (1~?)

---

## 12. DataLabService — 관광 빅데이터 [2개 핵심 오퍼레이션]

베이스 URL: `https://apis.data.go.kr/B551011/DataLabService`

| 오퍼레이션 | 한글 |
|---|---|
| `metcoRegnVisitrDDList` | 광역 지자체 지역방문자수 집계 데이터 정보 |
| `locgoRegnVisitrDDList` | 기초 지자체 지역방문자수 집계 데이터 정보 |

데이터 출처: KT(내국인) + SK텔레콤(외국인) 이동통신 데이터 기반의 광역/기초 지자체별 방문자 수.

> 매뉴얼이 명시한 **데이터 한계**: "방문 목적을 정확히 알 수 없으므로 '방문자'는 '관광객'과 동일하게 정의되지 않음."

요청 파라미터(공통):

| 파라미터 | 필수 | 샘플 | 설명 |
|---|---|---|---|
| `startYmd` | O | `20210513` | 시작일 (YYYYMMDD) |
| `endYmd` | O | `20210513` | 종료일 (YYYYMMDD) |

샘플 URL (광역):
```
http://apis.data.go.kr/B551011/DataLabService/metcoRegnVisitrDDList?serviceKey=서비스인증키&pageNo=1&numOfRows=10&MobileOS=ETC&MobileApp=AppTest&startYmd=20210513&endYmd=20210513
```

샘플 URL (기초):
```
http://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList?serviceKey=서비스인증키&pageNo=1&numOfRows=10&MobileOS=ETC&MobileApp=AppTest&startYmd=20210513&endYmd=20210513
```

---

## 13. TatsCnctrRateService — 관광지 집중률 방문자 추이 예측

베이스 URL: `https://apis.data.go.kr/B551011/TatsCnctrRateService`

| 오퍼레이션 | 한글 |
|---|---|
| `tatsCnctrRateList` | 관광지 집중률 정보 목록조회 |

요청 파라미터(고유):

| 파라미터 | 샘플 | 설명 |
|---|---|---|
| `areaCd` | `51` | 지역코드 (areaCode) |
| `signguCd` | `51130` | 시군구코드 |
| `tAtsNm` | `간현관광지` | 관광지명 |

샘플 URL:
```
http://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRateList?serviceKey=서비스키&numOfRows=30&pageNo=1&MobileOS=ETC&MobileApp=AppTest&areaCd=51&signguCd=51130&tAtsNm=간현관광지
```

---

## 14. LocgoHubTarService1 — 기초 지자체 중심 관광지 정보

베이스 URL: `https://apis.data.go.kr/B551011/LocgoHubTarService1`

| 오퍼레이션 | 한글 |
|---|---|
| `areaBasedList1` | 지역기반 중심 관광지 목록 |

요청 파라미터(고유):

| 파라미터 | 샘플 | 설명 |
|---|---|---|
| `baseYm` | `202504` | 기준년월 (YYYYMM) |
| `areaCd` | `11` | 지역코드 |
| `signguCd` | `11530` | 시군구코드 |

샘플 URL:
```
http://apis.data.go.kr/B551011/LocgoHubTarService1/areaBasedList1?serviceKey=서비스인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&baseYm=202504&areaCd=11&signguCd=11530
```

---

## 15. TarRlteTarService1 — 관광지별 연관 관광지 정보

베이스 URL: `https://apis.data.go.kr/B551011/TarRlteTarService1`

| 오퍼레이션 | 한글 |
|---|---|
| `areaBasedList1` | 지역기반 관광지별 연관 관광지 |
| `searchKeyword1` | 키워드 검색 관광지별 연관 |

요청 파라미터(고유): `baseYm`(YYYYMM), `areaCd`, `signguCd`, `keyword`.

샘플 URL:
```
http://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1?serviceKey=서비스인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&baseYm=202504&areaCd=51&signguCd=51130
```

```
http://apis.data.go.kr/B551011/TarRlteTarService1/searchKeyword1?serviceKey=서비스인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&baseYm=202504&areaCd=51&signguCd=51130&keyword=뮤지엄산
```

---

## 16. AreaTarDemDsService — 지역별 관광 수요 강도

베이스 URL: `https://apis.data.go.kr/B551011/AreaTarDemDsService`

| 오퍼레이션 | 한글 |
|---|---|
| `areaTarSjrnDsList` | 지역별 관광 체류 강도 정보 |
| `areaTarExpDsList` | 지역별 관광 소비 강도 정보 |

매뉴얼: `한국관광공사_개방데이터_활용매뉴얼(지역별관광수요강도)_v4.0.docx` (2025-02-25 최종).

---

## 17. AreaTarDivService — 지역별 관광 다양성

베이스 URL: `https://apis.data.go.kr/B551011/AreaTarDivService`

| 오퍼레이션 | 한글 |
|---|---|
| `areaTouDivList` | 지역별 관광객 다양성 |
| `areaExpDivList` | 지역별 관광 소비 다양성 |
| `areaTouDivList` (재사용) | 지역별 국제적 다양성 정보 |

> 매뉴얼 표기상 "국제적 다양성"도 동일 endpoint(`areaTouDivList`)를 사용하며, 파라미터 차이로 구분되는 것으로 추정. 정확한 파라미터 분기는 매뉴얼 본문 참고.

---

## 18. AreaTarResDemService — 지역별 관광 자원 수요

베이스 URL: `https://apis.data.go.kr/B551011/AreaTarResDemService`

| 오퍼레이션 | 한글 |
|---|---|
| `areaTarSvcDemList` | 지역별 관광 서비스 수요 정보 |
| `areaCulResDemList` | 지역별 문화 자원 수요 정보 |

---

## 19. tursmService — 관광인 채용 정보

베이스 URL: `https://apis.data.go.kr/B551011/tursmService`

| 오퍼레이션 | 한글 |
|---|---|
| `empmnInfoList` | 채용정보 목록 |
| `empmnInfoDetail` | 채용정보 상세 |
| `code` | 코드 조회 (codeType + code) |
| `syncList` | 동기화 목록 |

특이 파라미터: `minRegDt`/`maxRegDt`(YYYY-MM-DD 형식 — 다른 서비스의 YYYYMMDD와 다름), `empmnInfoNo`(채용정보 ID), `codeType` (예 `COMM`), `code`(예 `JC11`), `regnCd`/`signguCd`.

샘플 URL:
```
http://apis.data.go.kr/B551011/tursmService/empmnInfoList?serviceKey=인증키(URLEncode)&MobileApp=AppTest&MobileOS=ETC&numOfRows=10&pageNo=1&minRegDt=2023-11-10&maxRegDt=2023-11-10&arrange=A
```

```
http://apis.data.go.kr/B551011/tursmService/empmnInfoDetail?serviceKey=인증키&MobileApp=AppTest&MobileOS=ETC&numOfRows=10&pageNo=1&empmnInfoNo=alpensia_4
```

---

## 20. PhokoAwrdService — 관광공모전(사진) 수상작

베이스 URL: `https://apis.data.go.kr/B551011/PhokoAwrdService`

| 오퍼레이션 | 한글 |
|---|---|
| `ldongCode` | 법정동 코드 조회 |
| `phokoAwrdList` | 관광공모전(사진) 수상작 목록 |
| `phokoAwrdSyncList` | 동기화 목록 |

샘플 URL:
```
http://apis.data.go.kr/B551011/PhokoAwrdService/phokoAwrdList?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&lDongRegnCd=11&_type=json&keyword=%EB%AC%B8%ED%99%94%EC%9C%A0%EC%82%B0
```

```
http://apis.data.go.kr/B551011/PhokoAwrdService/phokoAwrdSyncList?serviceKey=서비스키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&showflag=1&_type=json
```

---

## 21. 알려진 제약·이슈 (매뉴얼 명시)

1. **응답 표준**은 XML이며, JSON은 `&_type=json`으로 옵션 추가. 공공데이터포털 공통 에러는 항상 XML로 반환된다.
2. **`MobileApp` 파라미터는 통계 산출용**으로, 누락 시 통계가 누락되며 KTO 운영계정 심의 시 불이익이 있을 수 있다.
3. **인증키 인코딩**:
   - 2015-01 이전 발급키는 `URLEncoder.encode(myKey, "UTF-8")` 필수.
   - 2015-01 이후 발급키는 인코딩 불필요.
4. **`searchFestival2` `eventStartDate` 필수** (v3.6, 2021-10-06부터).
5. **`locationBasedList2` `radius` 최대값 = 20,000m (20km)**.
6. **v4.4 KorService2에서 `areaCode2`/`categoryCode2` 삭제됨**. 기존 `areaCode`/`sigunguCode`/`cat1`/`cat2`/`cat3` 응답·요청 항목도 KorService2에서 제거. 대체는 `ldongCode2` + `lclsSystmCode2`. (단 KorWithService2/다국어/특화 서비스는 여전히 legacy 체계 사용 가능.)
7. **다국어 서비스의 contentTypeId는 국문과 다름** (12 vs 76 등). `03_tourapi_codes_schema.md` 참조.
8. **저작권 유형(`cpyrhtDivCd`)**:
   - `Type1` = 제1유형(출처표시-권장)
   - `Type3` = 제3유형(제1유형 + 변경금지)
9. **`KorWithService2`의 `areaCode2` / `categoryCode2`는 2025-12-31 까지만 활용 가능** — 매뉴얼이 명시적으로 일몰 일자를 안내함.
10. **GoCamping/Durunubi/Odii 등 일부 특화 서비스는 신분류체계(lclsSystm)를 사용하지 않음** — 자체 코드 체계(themeNm, brdDiv, langCode 등)를 사용.
11. **DataLabService 데이터 한계**: 이동통신 기반 방문자 수이므로 "관광객"과 1:1 매칭되지 않음.

---

## 22. 본 문서의 1차 출처

| 매뉴얼 | 로컬 경로 |
|---|---|
| 활용신청 v3.3 | `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx` |
| 국문 v4.4 | `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx` |
| 영문 v4.4 | `docs/api_manual/1737596531873/...` |
| 일·중·독·불·서·노 v4.3~4.4 | `docs/api_manual/1737596480579 / 1704160495049 / 1737596423271 / 1737596457504 / 1737596408255 / 1737596391866 / 1737596057411/...` |
| 무장애 v4.3 (KorWithService2) | `docs/api_manual/1737596514908/...` |
| 반려동물 v4.1 (KorPetTourService2) | `docs/api_manual/1737596366080/...` |
| 생태 v4.2 / 사진 v4.2 | `docs/api_manual/1704160406003 / 1704160396374/...` |
| 오디 v4.1 | `docs/api_manual/1720672146251/...` |
| 웰니스 v4.1 / 의료 v4.1 | `docs/api_manual/1725080513010 / 1725080563660/...` |
| 고캠핑 v4.1 / 두루누비 v4.1 | `docs/api_manual/1704160387374 / 1704160359411/...` |
| 빅데이터 v4.1 | `docs/api_manual/1704160370032/...` |
| 집중률 v4.0 / 중심관광지 v4.1 / 연관관광지 v4.1 | `docs/api_manual/1725501618773 / 1725501897980 / 1725502022236/...` |
| 채용 v4.0 / 공모전수상작 | `docs/api_manual/1704160822554 / 1725092509540/...` |
| 지역별 수요·다양성·자원수요 v4.0 | `docs/api_manual/manual_areaTar*Service/...` |

코드 체계(법정동·시군구·contentTypeId·legacy categoryCode·신분류체계 lclsSystm)는 **`03_tourapi_codes_schema.md`** 참조.
