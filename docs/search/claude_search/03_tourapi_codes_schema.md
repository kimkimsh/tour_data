# 03. TourAPI 4.0 공통코드·데이터 스키마 완전 정리

> 본 문서는 KTO TourAPI 4.0 호출 시 사용하는 모든 코드 체계를 정리한다:
> 1. **법정동 시도·시군구 코드** (`lDongRegnCd` / `lDongSignguCd`) — v4.3+ 표준
> 2. **legacy 지역코드 / 시군구코드** (`areaCode` / `sigunguCode`) — KorWithService2·다국어 등에서 일부 유지
> 3. **콘텐츠 타입 ID** (`contentTypeId`) — 국문 vs 다국어 코드 매핑
> 4. **신분류체계 코드** (`lclsSystm1` / `lclsSystm2` / `lclsSystm3`) — v4.3+ 신규
> 5. **legacy 서비스 분류코드** (`cat1` / `cat2` / `cat3`) — A/B/C 코드 (2025-12-31 일몰 예정)
> 6. **신분류체계 ↔ 관광타입 매핑** (lclsSystm → contentTypeId)
> 7. **공통 응답 데이터 스키마** (저작권 유형 등)
>
> 1차 출처:
> - `docs/api_manual/manual_areaTarDemDsService/한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx` (모든 시도·시군구 250+ 행)
> - `docs/api_manual/1737596499508/신분류체계정보 관광타입정보 연계 정의서.xlsx` (lcls 240행 + 매핑 표)
> - `docs/api_manual/1737596057411/한국관광공사_다국어_서비스분류코드_v4.2.xlsx` (다국어 8개 시트)
> - `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx` (국문 v4.4)
> - `docs/api_manual/1737596514908/한국관광공사_개방데이터_활용매뉴얼(무장애여행)_v4.3.docx` (legacy 코드 사용 예시)

---

## 1. 법정동 시도·시군구 코드 (`lDongRegnCd` / `lDongSignguCd`) — v4.3+ 표준

`ldongCode2` 오퍼레이션이 반환하는 코드. **전체 17개 시도 × 약 250개 시군구**를 5자리 표준 코드로 표현한다(시군구코드는 시도코드를 prefix로 가짐, 예: `11110` = 11(서울) + 110(종로구)). API 호출 시에는 보통 시도 2자리(`lDongRegnCd`) + 시군구 3자리(`lDongSignguCd`)를 분리 전달한다.

> 매뉴얼 부속 엑셀(`한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx`)의 시군구코드는 `areaCd|areaNm|sigunguCd|sigunguNm` 4컬럼으로 제공된다(아래 표는 그 그룹화 결과).

### 1.1 시도 코드 (`lDongRegnCd`)

| 코드 | 시도명 | 비고 |
|---|---|---|
| 11 | 서울특별시 | 25개 자치구 |
| 26 | 부산광역시 | 16개 |
| 27 | 대구광역시 | 9개 (군위군 포함) |
| 28 | 인천광역시 | 10개 |
| 29 | 광주광역시 | 5개 |
| 30 | 대전광역시 | 5개 |
| 31 | 울산광역시 | 5개 |
| 36 | 세종특별자치시 | 1개(세종특별자치시) |
| 41 | 경기도 | 다수 (수원시 4개구 포함) |
| 42/43/44/45/46/47/48/50/51 | 강원/충북/충남/전북/전남/경북/경남/제주/강원특별자치도 등 | 매뉴얼 엑셀 참조 |

> 정확한 시도 매핑은 매뉴얼 엑셀의 `areaCd` 컬럼 기준이며, **법정동 코드 체계(`lDongRegnCd`)와 1:1 매칭**된다.

### 1.2 시군구 코드 (`lDongSignguCd`) — 일부 발췌

서울(`lDongRegnCd=11`):

| sigunguCd | 시군구 |
|---|---|
| 11110 | 종로구 |
| 11140 | 중구 |
| 11170 | 용산구 |
| 11200 | 성동구 |
| 11215 | 광진구 |
| 11230 | 동대문구 |
| 11260 | 중랑구 |
| 11290 | 성북구 |
| 11305 | 강북구 |
| 11320 | 도봉구 |
| 11350 | 노원구 |
| 11380 | 은평구 |
| 11410 | 서대문구 |
| 11440 | 마포구 |
| 11470 | 양천구 |
| 11500 | 강서구 |
| 11530 | 구로구 |
| 11545 | 금천구 |
| 11560 | 영등포구 |
| 11590 | 동작구 |
| 11620 | 관악구 |
| 11650 | 서초구 |
| 11680 | 강남구 |
| 11710 | 송파구 |
| 11740 | 강동구 |

부산(`lDongRegnCd=26`):

| sigunguCd | 시군구 |
|---|---|
| 26110 | 중구 |
| 26140 | 서구 |
| 26170 | 동구 |
| 26200 | 영도구 |
| 26230 | 부산진구 |
| 26260 | 동래구 |
| 26290 | 남구 |
| 26320 | 북구 |
| 26350 | 해운대구 |
| 26380 | 사하구 |
| 26410 | 금정구 |
| 26440 | 강서구 |
| 26470 | 연제구 |
| 26500 | 수영구 |
| 26530 | 사상구 |
| 26710 | 기장군 |

대구(`lDongRegnCd=27`):

| sigunguCd | 시군구 |
|---|---|
| 27110 | 중구 |
| 27140 | 동구 |
| 27170 | 서구 |
| 27200 | 남구 |
| 27230 | 북구 |
| 27260 | 수성구 |
| 27290 | 달서구 |
| 27710 | 달성군 |
| 27720 | 군위군 |

> **주의**: API 요청 시 `lDongSignguCd`는 **3자리 뒷부분만** 사용하는 경우가 일반적이다. 예: 강남구를 요청할 때 `lDongRegnCd=11&lDongSignguCd=680`. 다만 `ldongCode2` 응답 형식에서는 실제로 코드 필드가 `code: "110"` (3자리만)로 반환된다(매뉴얼 샘플 응답 참조). 즉, **`lDongSignguCd`는 시도 prefix를 제외한 3자리 코드**가 표준이다.
>
> 전체 250+ 시군구 코드는 `docs/api_manual/manual_areaTarDemDsService/한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx`의 `시도,시군구코드` 시트(253행)에서 일괄 다운로드 가능.

### 1.3 `ldongCode2` 응답 예시

```json
// lDongRegnCd=11 & lDongListYn=N → 서울 시군구 25건
{
  "items": { "item": [
    { "rnum": 1, "code": "110", "name": "종로구" },
    { "rnum": 2, "code": "140", "name": "중구" }
  ]},
  "totalCount": 25
}

// lDongRegnCd=11 & lDongListYn=Y → 서울 25건 시도+시군구
{
  "items": { "item": [
    { "lDongRegnCd": "11", "lDongRegnNm": "서울특별시",
      "lDongSignguCd": "110", "lDongSignguNm": "종로구", "rnum": 1 }
  ]},
  "totalCount": 25
}
```

---

## 2. Legacy 지역코드 (`areaCode` / `sigunguCode`) — KorWithService2·다국어 일부에서 유지

KorWithService2 매뉴얼 § areaCode2 명시: **"※ 25년12월말까지만 활용가능하며, 신규 법정동 지역코드로 대체될 예정."**

### 2.1 Legacy `areaCode` 코드 (정책 기준 — 행정구역 코드와 다름)

| areaCode | 지역명 |
|---|---|
| 1 | 서울 |
| 2 | 인천 |
| 3 | 대전 |
| 4 | 대구 |
| 5 | 광주 |
| 6 | 부산 |
| 7 | 울산 |
| 8 | 세종특별자치시 |
| 31 | 경기도 |
| 32 | 강원특별자치도 |
| 33 | 충청북도 |
| 34 | 충청남도 |
| 35 | 경상북도 |
| 36 | 경상남도 |
| 37 | 전라북도 |
| 38 | 전라남도 |
| 39 | 제주도 |

> 주의: legacy `areaCode`(예: 서울=1)는 새 `lDongRegnCd`(서울=11)와 **숫자 체계가 다르다**. 매뉴얼 엑셀에서는 두 체계가 별도 시트로 관리된다.

### 2.2 Legacy `sigunguCode`

각 areaCode별로 1~30 사이의 짧은 시퀀스 번호를 사용. 예: 서울(areaCode=1)의 강남구 = `sigunguCode=1`(매뉴얼 표기), 서초구 = `sigunguCode=23` 등. **법정동 5자리 코드와 호환되지 않으므로** API 호출 시 한 체계만 일관되게 사용해야 한다.

### 2.3 Legacy 코드 사용 예 (KorWithService2)

```
https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2?serviceKey=인증키&numOfRows=10&pageNo=1&MobileOS=ETC&MobileApp=AppTest&arrange=C&contentTypeId=14&areaCode=4&sigunguCode=4
```
→ areaCode=4(대구) + sigunguCode=4(동구) 의 문화시설(14) 목록.

---

## 3. 콘텐츠 타입 ID (`contentTypeId`) — 국문 ↔ 다국어 매핑

KTO 콘텐츠 타입은 **국문과 다국어가 다른 코드 체계**를 사용한다.

| 관광타입 | 국문 (`KorService2`) | 다국어 (Eng/Jpn/Chs/Cht/Ger/Fre/Spn/RusService2) | 비고 |
|---|---|---|---|
| 관광지 | **12** | **76** | "Tourist Attractions" |
| 문화시설 | **14** | **78** | "Cultural Facilities" |
| 행사·공연·축제 | **15** | **85** | "Festivals, Performances, Events" |
| 여행코스 | **25** | (없음) | 다국어 미서비스 |
| 레포츠 | **28** | **75** | "Leisure Sports" |
| 숙박 | **32** | **80** | "Accommodations" |
| 쇼핑 | **38** | **79** | "Shopping" |
| 음식점 | **39** | **82** | "Restaurants" / "Food" |
| 교통 | (없음 — 1.3 v3에서 삭제됨) | **77** | 다국어 한정 (`A0205` 건축/조형물 → 영문은 `Transportation` 매핑) |

> **국문 매뉴얼 v4.4 § Table 4** + **다국어(영문) 매뉴얼 v4.4 § Table 4** 직접 인용.
> v1.3 (2013-04-01)에서 국문 contentTypeId=40 (교통)이 삭제됐으나, 다국어에는 77로 보존됨.
> 국문 25(여행코스)의 다국어 매핑은 신분류체계 정의서(`신분류체계정보 관광타입정보 연계 정의서.xlsx`)에서 `-`로 명시 (없음).

### 3.1 무장애여행(KorWithService2) contentTypeId

매뉴얼은 다음 6개만 지원한다고 명시한다 (음식점·여행코스 제외):

| contentTypeId | 의미 |
|---|---|
| 12 | 관광지 |
| 14 | 문화시설 |
| 15 | 행사·공연·축제 |
| 28 | 레포츠 |
| 32 | 숙박 |
| 38 | 쇼핑 |

---

## 4. 신분류체계 (`lclsSystm1` / `lclsSystm2` / `lclsSystm3`) — v4.3+ 신규

`lclsSystmCode2` 오퍼레이션이 반환. 대분류 2자(예 `AC`) → 중분류 4자(예 `AC01`) → 소분류 8자(예 `AC010100`) 트리 구조.

매뉴얼 부속 엑셀 `신분류체계정보 관광타입정보 연계 정의서.xlsx` 기준 **전체 트리 = 11개 대분류 / 62개 중분류 / 240개 소분류**(매뉴얼 `lclsSystmCode2` 응답 totalCount=243과 ±3 차이는 추천코스 `C01` 등 일부 신규 추가로 보임).

### 4.1 대분류 (`lclsSystm1`) — 전체 11개

| 코드 | 대분류명 | 중분류 수 | 매핑되는 contentTypeId |
|---|---|---|---|
| `AC` | 숙박 | 6 | 32 (숙박) — 단 `AC05` 캠핑은 28 (레포츠) |
| `EV` | 축제/공연/행사 | 3 | 15 (행사·공연·축제) |
| `EX` | 체험관광 | 7 | 12 (관광지) |
| `FD` | 음식 | 5 | 39 (음식점) |
| `HS` | 역사관광 | 4 | 12 (관광지) |
| `LS` | 레저스포츠 | 4 | 28 (레포츠) |
| `NA` | 자연관광 | 5 | 12 (관광지) |
| `SH` | 쇼핑 | 7 | 38 (쇼핑) |
| `VE` | 문화관광 | 11 | 14 (문화시설) — 단 `VE10` 레저스포츠시설은 28, `VE12` 기타문화관광지는 12 |
| `C01` | 추천코스 | 6 | 25 (여행코스) |

### 4.2 중분류 (`lclsSystm2`) — 전체 62개

#### `AC` 숙박 (6 중분류)
| 코드 | 명칭 | 소분류 |
|---|---|---|
| `AC01` | 호텔 | 1 |
| `AC02` | 콘도미니엄 | 2 |
| `AC03` | 펜션/민박 | 4 (펜션, 한옥스테이, 농어촌민박, 홈스테이) |
| `AC04` | 모텔 | 1 |
| `AC05` | 캠핑 | 4 (일반야영장, 오토캠핑장, 카라반, 글램핑장) — **contentTypeId=28 (레포츠) 매핑** |
| `AC06` | 호스텔 | 2 (유스호스텔, 게스트하우스) |

#### `EV` 축제/공연/행사 (3 중분류)
| 코드 | 명칭 | 소분류 |
|---|---|---|
| `EV01` | 축제 | 6 (문화관광축제, 문화예술축제, 지역특산물축제, 전통역사축제, 생태자연축제, 기타축제) |
| `EV02` | 공연 | 10 (전통공연, 연극, 뮤지컬, 오페라, 무용, 클래식음악회, 대중콘서트, 영화, 기타공연, 넌버벌) |
| `EV03` | 행사 | 4 (전시회, 박람회, 스포츠경기, 기타행사) |

#### `EX` 체험관광 (7 중분류)
| 코드 | 명칭 | 소분류 수 |
|---|---|---|
| `EX01` | 전통체험 | 1 (전통문화체험) |
| `EX02` | 공예체험 | 4 (금속/유리/가죽공예체험, 기타공예체험) |
| `EX03` | 농.산.어촌 체험 | 4 (체험마을, 체험목장, 체험농장, 체험어장) |
| `EX04` | 산사체험 | 2 (템플스테이, 사찰문화체험) |
| `EX05` | 웰니스관광 | 8 (온천/사우나/스파, 찜질방, 한방체험, 힐링명상, 뷰티스파, 기타웰니스, 자연치유, 기타의료관광) |
| `EX06` | 산업관광 | 10 (근대산업유산, IT, 전통/향토, 문화콘텐츠, 장수기업, 자동차/조선/철강, 로봇/항공우주, 화장품/주류/먹거리, 친환경/신재생에너지, 기타산업관광지) |
| `EX07` | 기타체험 | 2 (유람선/잠수함관광, 기타체험관광) |

#### `FD` 음식 (5 중분류)
| 코드 | 명칭 | 소분류 |
|---|---|---|
| `FD01` | 한식 | 2 (관광식당, 모범음식점) |
| `FD02` | 외국식 | 5 (중식, 일식, 서양식, 기타외국식, 퓨전음식) |
| `FD03` | 간이음식 | 6 (제과, 피자/햄버거/샌드위치, 치킨, 김밥/분식, 떡/한과, 기타) |
| `FD04` | 주점 | 5 |
| `FD05` | 카페/찻집 | 3 |

#### `HS` 역사관광 (4 중분류)
| 코드 | 명칭 | 소분류 수 |
|---|---|---|
| `HS01` | 역사유적지 | 12 |
| `HS02` | 역사유물 | 4 |
| `HS03` | 종교성지 | 4 |
| `HS04` | 안보관광지 | 4 |

#### `LS` 레저스포츠 (4 중분류)
| 코드 | 명칭 | 소분류 수 |
|---|---|---|
| `LS01` | 육상레저스포츠 | 19 |
| `LS02` | 수상레저스포츠 | 14 |
| `LS03` | 항공레저스포츠 | 6 |
| `LS04` | 복합레저스포츠 | 1 |

#### `NA` 자연관광 (5 중분류)
| 코드 | 명칭 | 소분류 수 |
|---|---|---|
| `NA01` | 자연경관(산) | 5 |
| `NA02` | 자연경관(하천·해양) | 9 |
| `NA03` | 자연생태 | 5 |
| `NA04` | 자연공원 | 7 |
| `NA05` | 기타자연관광 | 1 |

#### `SH` 쇼핑 (7 중분류)
| 코드 | 명칭 | 소분류 수 |
|---|---|---|
| `SH01` | 백화점 | 1 |
| `SH02` | 쇼핑몰 | 2 |
| `SH03` | 대형마트 | 1 |
| `SH04` | 면세점 | 3 |
| `SH05` | 전문매장/상가 | 3 |
| `SH06` | 시장 | 2 |
| `SH07` | 기타쇼핑시설 | 1 |

#### `VE` 문화관광 (11 중분류)
| 코드 | 명칭 | 소분류 수 |
|---|---|---|
| `VE01` | 랜드마크관광 | 9 |
| `VE02` | 테마공원 | 5 |
| `VE03` | 도시공원 | 5 |
| `VE04` | 도시·지역문화관광 | 3 |
| `VE05` | 복합관광시설 | 2 |
| `VE06` | 공연시설 | 2 |
| `VE07` | 전시시설 | 6 |
| `VE08` | 행사시설 | 1 |
| `VE09` | 교육시설 | 6 |
| `VE10` | 레저스포츠시설 | 2 (→ contentTypeId=28 매핑) |
| `VE12` | 기타문화관광지 | 3 (→ contentTypeId=12 매핑) |

#### `C01` 추천코스 (6 중분류)
| 코드 | 명칭 | 소분류 |
|---|---|---|
| `C0112` | 가족코스 | 1 |
| `C0113` | 나홀로코스 | 1 |
| `C0114` | 힐링코스 | 1 |
| `C0115` | 도보코스 | 1 |
| `C0116` | 캠핑코스 | 1 |
| `C0117` | 맛코스 | 1 |

### 4.3 신분류체계 ↔ contentTypeId 매핑 (정의서 표 직접 인용)

| 분류체계 (lclsSystm1.lclsSystm2.lclsSystm3) | 국문 contentTypeId | 다국어 contentTypeId | 관광타입명 |
|---|---|---|---|
| `AC.AC01.*` 호텔 | 32 | 80 | 숙박 |
| `AC.AC02.*` 콘도미니엄 | 32 | 80 | 숙박 |
| `AC.AC03.*` 펜션/민박 | 32 | 80 | 숙박 |
| `AC.AC04.*` 모텔 | 32 | 80 | 숙박 |
| `AC.AC05.AC0501..04` 캠핑 | **28** | **75** | **레포츠** |
| `AC.AC06.*` 호스텔 | 32 | 80 | 숙박 |
| `EV.EV01..03.*` 축제/공연/행사 | 15 | 85 | 축제/공연/행사 |
| `EX.*` 체험관광 | 12 | 76 | 관광지 |
| `FD.*` 음식 | 39 | 82 | 음식점 |
| `HS.*` 역사관광 | 12 | 76 | 관광지 |
| `LS.*` 레저스포츠 | 28 | 75 | 레포츠 |
| `NA.*` 자연관광 | 12 | 76 | 관광지 |
| `SH.*` 쇼핑 | 38 | 79 | 쇼핑 |
| `VE.VE01..09, VE12` 문화관광 | 14 | 78 | 문화시설 (단 VE12는 12/76 관광지) |
| `VE.VE10` 레저스포츠시설 | 28 | 75 | 레포츠 |
| `C01.*` 추천코스 | 25 | (없음) | 여행코스 |

> 매핑 표는 매뉴얼 부속 `신분류체계정보 관광타입정보 연계 정의서.xlsx` 우측 컬럼에 정의되어 있다. 즉 lclsSystm로 분류해도 contentTypeId 매핑이 자동으로 결정된다.

### 4.4 `lclsSystmCode2` 응답 예시

```xml
<!-- lclsSystmListYn=N -->
<item><code>A01</code><name>자연</name><rnum>1</rnum></item>

<!-- lclsSystmListYn=Y -->
<item>
  <lclsSystm1Cd>AC</lclsSystm1Cd><lclsSystm1Nm>숙박</lclsSystm1Nm>
  <lclsSystm2Cd>AC01</lclsSystm2Cd><lclsSystm2Nm>호텔</lclsSystm2Nm>
  <lclsSystm3Cd>AC010100</lclsSystm3Cd><lclsSystm3Nm>호텔</lclsSystm3Nm>
  <rnum>1</rnum>
</item>
```

---

## 5. Legacy 서비스 분류코드 (`cat1` / `cat2` / `cat3`) — A/B/C 코드 체계 (~2025-12-31)

`categoryCode2` (KorWithService2 등 일부 서비스에 잔존) 또는 다국어 매뉴얼 부속 엑셀(`한국관광공사_다국어_서비스분류코드_v4.2.xlsx`)에 정의된 A/B 코드 체계.

대분류 3자 (예 `A01`) → 중분류 5자 (예 `A0101`) → 소분류 9자 (예 `A01010100`).

### 5.1 대분류 (`cat1`) — 8개

| 코드 | 한글 | 영문 |
|---|---|---|
| `A01` | 자연 | Nature |
| `A02` | 인문(문화/예술/역사) | Culture / Art / History |
| `A03` | 레포츠 | Activities |
| `A04` | 쇼핑 | Shopping |
| `A05` | 음식 | Food |
| `B01` | 교통 | Transportation |
| `B02` | 숙박 | Accommodations |
| `C01` | 추천코스 | Recommended Courses |

### 5.2 중분류 (`cat2`)

#### A01 자연
| 코드 | 한글 | 영문 |
|---|---|---|
| `A0101` | 자연관광지 | Natural Sites |
| `A0102` | 관광자원 | Natural Resources |

#### A02 인문(문화/예술/역사)
| 코드 | 한글 | 영문 |
|---|---|---|
| `A0201` | 역사관광지 | Historical Sites |
| `A0202` | 휴양관광지 | Recreational Sites |
| `A0203` | 체험관광지 | Experience Programs |
| `A0204` | 산업관광지 | Industrial Sites |
| `A0205` | 건축/조형물 | Architecture / Sculptures |
| `A0206` | 문화시설 | Cultural Facilities |
| `A0207` | 축제 | Festivals |
| `A0208` | 공연/행사 | Performances / Events |

#### A03 레포츠
| 코드 | 한글 |
|---|---|
| `A0301` | 레포츠소개 |
| `A0302` | 육상 레포츠 |
| `A0303` | 수상 레포츠 |
| `A0304` | 항공 레포츠 |
| `A0305` | 복합 레포츠 |

#### A04 쇼핑
| 코드 | 한글 |
|---|---|
| `A0401` | 쇼핑 |

#### A05 음식
| 코드 | 한글 |
|---|---|
| `A0502` | 음식점 |

#### B01 교통 / B02 숙박
| 코드 | 한글 |
|---|---|
| `B0102` | 교통시설 |
| `B0201` | 숙박시설 |

### 5.3 소분류 (`cat3`) — 발췌 (자연/A01/A0101)

| 코드 | 한글 | 영문 |
|---|---|---|
| `A01010100` | 국립공원 | National Parks |
| `A01010200` | 도립공원 | Provincial Parks |
| `A01010300` | 군립공원 | County Parks |
| `A01010400` | 산 | Mountains |
| `A01010500` | 자연생태관광지 | Eco-Tourism Sites |
| `A01010600` | 자연휴양림 | Recreational Forests |
| `A01010700` | 수목원 | Botanical Gardens |
| `A01010800` | 폭포 | Waterfalls |
| `A01010900` | 계곡 | Valleys |
| `A01011000` | 약수터 | Mineral Springs |
| `A01011100` | 해안절경 | Coastal Attractions |
| `A01011200` | 해수욕장 | Beaches |
| `A01011300` | 섬 | Islands |
| `A01011400` | 항구/포구 | Ports / Harbors |
| `A01011600` | 등대 | Lighthouses |
| `A01011700` | 호수 | Lakes |
| `A01011800` | 강 | Rivers |
| `A01011900` | 동굴 | Caves |

> **전체 소분류 약 152~153개** (다국어 8개 시트 기준). 전체 트리 다운로드는 `한국관광공사_다국어_서비스분류코드_v4.2.xlsx` 8개 언어 시트(영문/일문/중문간체/중문번체/독일어/프랑스어/스페인어/러시아어).

### 5.4 `categoryCode2` 응답 예시 (KorWithService2)

```xml
<!-- 대분류 전체 (contentTypeId 미지정) → 7건: A01,A02,A03,A04,A05,B02,C01 -->
<item><code>A01</code><name>자연</name><rnum>1</rnum></item>
<item><code>A02</code><name>인문(문화/예술/역사)</name><rnum>2</rnum></item>
…

<!-- 관광지(contentTypeId=12) 대분류 → 2건: A01, A02 -->
<item><code>A01</code><name>자연</name><rnum>1</rnum></item>
<item><code>A02</code><name>인문(문화/예술/역사)</name><rnum>2</rnum></item>

<!-- 관광지(12) cat1=A01 cat2=A0101 소분류 → 18건 (totalCount) -->
<item><code>A01010100</code><name>국립공원</name><rnum>1</rnum></item>
…
```

---

## 6. 공통 응답 데이터 스키마 (모든 KTO 콘텐츠 메타)

### 6.1 표준 응답 envelope

```json
{
  "response": {
    "header": { "resultCode": "0000", "resultMsg": "OK" },
    "body": {
      "items": { "item": [ ... ] },
      "numOfRows": 10,
      "pageNo": 1,
      "totalCount": 100
    }
  }
}
```

### 6.2 콘텐츠 메타 공통 필드 (areaBasedList2 / locationBasedList2 / searchKeyword2 / searchFestival2 / searchStay2 / areaBasedSyncList2)

| 필드 | 필수 | 의미 |
|---|---|---|
| `addr1` | X | 주소 (예: 서울특별시 중구 퇴계로27길 48) |
| `addr2` | X | 상세주소 (동/건물명) |
| `zipcode` | X | 우편번호 |
| `contentid` | **O** | 콘텐츠 ID (KTO 내부 PK) |
| `contenttypeid` | **O** | 관광타입 ID (12/14/15/25/28/32/38/39 또는 다국어 76/78/85/75/80/82/79) |
| `createdtime` | **O** | 콘텐츠 최초 등록일 (YYYYMMDDHHmmss) |
| `modifiedtime` | **O** | 콘텐츠 수정일 (YYYYMMDDHHmmss) |
| `firstimage` | X | 대표이미지 원본 URL (~500×333) |
| `firstimage2` | X | 대표이미지 썸네일 URL (~150×100) |
| `cpyrhtDivCd` | X | 저작권 유형 (Type1/Type3) |
| `mapx` | X | GPS X좌표 (WGS84 경도) |
| `mapy` | X | GPS Y좌표 (WGS84 위도) |
| `mlevel` | X | Map Level (보통 6) |
| `tel` | X | 전화번호 |
| `title` | **O** | 콘텐츠 제목 |
| `lDongRegnCd` | X | 법정동 시도 코드 |
| `lDongSignguCd` | X | 법정동 시군구 코드 |
| `lclsSystm1` / `lclsSystm2` / `lclsSystm3` | X | 신분류체계 |
| `dist` | (locationBased만) | 중심 좌표로부터 거리 (m) |
| `eventstartdate` / `eventenddate` | (Festival만) | 행사 시작·종료 (YYYYMMDD) |
| `progresstype` | (Festival만, v4.x) | 진행상태 (예: "선택안함") |
| `festivaltype` | (Festival만) | 축제유형명 |
| `showflag` | (SyncList만) | 표출(1) / 비표출(0) |
| `oldContentid` | (SyncList 요청만) | DB 동기화 시 이전 KEY 값 |

### 6.3 저작권 유형 (`cpyrhtDivCd`)

| 값 | 의미 |
|---|---|
| `Type1` | 제1유형 — 출처표시 (권장) |
| `Type3` | 제3유형 — 제1유형 + 변경금지 |

> 매뉴얼 v4.4 § 8 명시. 영문 매뉴얼은 추가로 "imagery 사용 시 KTO의 평판을 훼손하거나 상업적 브랜딩 목적 사용을 금지"한다고 명시.

### 6.4 detailIntro2 — 콘텐츠 타입별 응답 필드 매트릭스

타입별 응답 필드는 `02_tourapi_4_endpoints.md` § 1.7 참조 (총 130개+ 필드, 8개 타입에 분기). 이 표는 detailIntro2 응답이 단일 스키마가 아니라 `contentTypeId`에 따라 완전히 다른 필드 셋을 반환함을 의미한다.

### 6.5 detailInfo2 — 반복정보 스키마

#### 일반 (12/14/15/28/38/39)
| 필드 | 의미 |
|---|---|
| `contentid` | 콘텐츠 ID |
| `contenttypeid` | 관광타입 ID |
| `serialnum` | 일련번호 (반복) |
| `infoname` | 정보명 (예: "이용가능시설", "화장실") |
| `infotext` | 정보내용 (HTML 가능) |
| `fldgubun` | 반복정보 유형 |

#### 숙박 (32) — 객실 정보
| 필드 | 의미 |
|---|---|
| `roomcode` | 객실 코드 |
| `roomtitle` | 객실명 (예: "수페리어 더블") |
| `roomsize1` / `roomsize2` | 객실 크기 (평/㎡) |
| `roomcount` | 객실 수 |
| `roombasecount` / `roommaxcount` | 기준/최대 인원 |
| `roomoffseasonminfee1/2` | 비수기 주중/주말 최저요금 |
| `roompeakseasonminfee1/2` | 성수기 주중/주말 최저요금 |
| `roomintro` | 객실 소개 |
| `roombathfacility`, `roombath`, `roomhometheater`, `roomaircondition`, `roomtv`, `roompc`, `roomcable`, `roominternet`, `roomrefrigerator`, `roomtoiletries`, `roomsofa`, `roomcook`, `roomtable`, `roomhairdryer` | Y/N 토글 |
| `roomimg1~5`, `roomimg1alt~5alt`, `cpyrhtDivCd1~5` | 객실 이미지 5장 (URL + alt + 저작권) |

### 6.6 detailImage2 — 이미지 응답

| 필드 | 의미 |
|---|---|
| `contentid` | 콘텐츠 ID |
| `originimgurl` | 원본 이미지 URL |
| `imgname` | 이미지명 |
| `smallimageurl` | 썸네일 URL |
| `cpyrhtDivCd` | 저작권 유형 |
| `serialnum` | 일련번호 |

### 6.7 detailWithTour2 — 무장애여행 응답 (KorWithService2 전용)

장애 카테고리별 응답 필드:

| 카테고리 | 필드 |
|---|---|
| 공통 | `contentid`, `parking`, `route`, `publictransport`, `ticketoffice`, `promotion` |
| 지체장애 | `wheelchair`, `exit`, `elevator`, `restroom`, `auditorium`, `room`, `handicapetc` |
| 시각장애 | `braileblock`(점자블록), `helpdog`(안내견), `guidehuman`, `audioguide`, `bigprint`, `brailepromotion`, `guidesystem`, `blindhandicapetc` |
| 청각장애 | `signguide`, `videoguide`, `hearingroom`, `hearinghandicapetc` |
| 영유아가족 | `stroller`, `lactationroom`(수유실), `babysparechair`, `infantsfamilyetc` |

### 6.8 detailPetTour2 — 반려동물 응답 (KorService2 / KorPetTourService2)

| 필드 | 의미 |
|---|---|
| `acmpyPsblCpam` | 동반가능동물 (예: "전 견종 동반 가능") |
| `relaRntlPrdlst` | 관련 렌탈 품목 |
| `acmpyNeedMtr` | 동반시 필요사항 (예: "목줄 착용,반려동물 유모차 탑승,이동장(켄넬) 사용") |
| `relaFrnshPrdlst` | 관련 비치 품목 |
| `etcAcmpyInfo` | 기타 동반 정보 (예: "맹견의 경우 입마개 필수") |
| `relaPurcPrdlst` | 관련 구매 품목 |
| `relaAcdntRiskMtr` | 관련 사고 대비사항 |
| `acmpyTypeCd` | 동반유형코드 (예: "일부구역 동반가능", "전구역 동반가능", "동반불가") |
| `relaPosesFclty` | 관련 구비 시설 |
| `petTursmInfo` | 반려동물 관광정보 (자유 텍스트) |

---

## 7. 좌표계·날짜·시간 형식

| 형식 | 표기 | 비고 |
|---|---|---|
| GPS 경도 (`mapx`) | WGS84 경도 (소수, 예 `126.9608659589`) | |
| GPS 위도 (`mapy`) | WGS84 위도 (소수, 예 `37.5076357737`) | |
| 거리 (`radius`, `dist`) | 미터 (m) — `radius` Max 20,000 | |
| 등록일 (`createdtime`) | YYYYMMDDHHmmss (예 `20071106103018`) | |
| 수정일 (`modifiedtime`) | YYYYMMDDHHmmss | 동기화 요청 시 YYYY/YYYYMM/YYYYMMDD 모두 가능 |
| 행사 시작/종료 (`eventStartDate`, `eventEndDate`) | YYYYMMDD | searchFestival2에서 시작일 필수 |
| 채용 (`minRegDt`, `maxRegDt`, tursmService) | YYYY-MM-DD | **다른 서비스와 다름** (`-` 구분자 사용) |
| 빅데이터 기준일 (`startYmd`/`endYmd`) | YYYYMMDD | |
| 중심관광지 기준월 (`baseYm`) | YYYYMM | |
| 동기화 (`syncModTime`, GoCamping) | YYMMDD | 2자리 연도 |
| 문자집합 | UTF-8 | 모든 KTO API 공통 |

---

## 8. 호출 시 주의사항 정리

1. **항상 `MobileApp` 파라미터를 채워서 호출**할 것 (통계 산출, 운영계정 심의 평가에 영향).
2. **인증키 인코딩**: 2015년 1월 이전 발급키만 `URLEncoder.encode(..., "UTF-8")` 필요. 그 이후는 인코딩된 형태로 발급되므로 추가 인코딩 불필요.
3. **에러 코드는 항상 XML로 반환**됨. JSON 옵션과 무관하게 에러 응답 파서는 XML도 처리해야 함.
4. **개발계정은 각 오퍼레이션별 일 1,000건**. 즉 KorService2의 `areaBasedList2`/`locationBasedList2`/`searchKeyword2` 각각이 독립 카운트.
5. **법정동 코드 vs Legacy 코드는 호환되지 않음**. `lDongRegnCd=11`(서울)과 `areaCode=1`(서울)을 혼용하지 말 것.
6. **다국어 서비스의 contentTypeId는 다름**. `EngService2`에 `contentTypeId=12`로 호출하면 결과가 비어 나오거나 오류 — `76`을 사용해야 함.
7. **`searchKeyword2`에서 contentTypeId 요청 항목이 v4.3에서 삭제됨**. 키워드+법정동+분류체계만 받음.
8. **`KorWithService2`/특화 서비스의 `areaCode2`/`categoryCode2`는 2025-12-31 일몰 예정**. 신규 개발은 `ldongCode2`/`lclsSystmCode2`로 시작하고, 그 사이 호환성을 위해 두 체계를 모두 응답으로 받는 것이 안전.
9. **이미지 URL은 HTTP가 기본**(예: `http://tong.visitkorea.or.kr/cms/resource/...`)이지만, 일부 행사 이미지는 HTTPS도 혼재. CSP/Mixed-content 정책에 주의.
10. **저작권**: `cpyrhtDivCd` 필드를 반드시 확인하고, 출처표시·변경금지 의무를 준수할 것.

---

## 9. 본 문서의 1차 출처

| 자료 | 로컬 경로 |
|---|---|
| 시도·시군구 코드 (250+ 시군구) | `docs/api_manual/manual_areaTarDemDsService/한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx` |
| 신분류체계 ↔ 관광타입 매핑 (240 행) | `docs/api_manual/1737596499508/신분류체계정보 관광타입정보 연계 정의서.xlsx` |
| 다국어 서비스분류코드 (A/B 코드, 8개 언어 시트) | `docs/api_manual/1737596057411/한국관광공사_다국어_서비스분류코드_v4.2.xlsx` |
| 국문 KorService2 v4.4 매뉴얼 (contentTypeId 표 / 응답 스키마) | `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx` |
| 영문 EngService2 v4.4 매뉴얼 (다국어 contentTypeId 표) | `docs/api_manual/1737596531873/한국관광공사_개방데이터_활용매뉴얼(영문)_v4.4.docx` |
| KorWithService2 v4.3 매뉴얼 (legacy areaCode/categoryCode + detailWithTour2 스키마) | `docs/api_manual/1737596514908/한국관광공사_개방데이터_활용매뉴얼(무장애여행)_v4.3.docx` |
| KorPetTourService2 v4.1 (detailPetTour2 스키마) | `docs/api_manual/1737596366080/한국관광공사_개방데이터_활용매뉴얼(반려동물동반여행)_v4.1.docx` |

전체 카탈로그·정책은 **`01_kto_tourapi_overview.md`**, 엔드포인트별 호출 명세는 **`02_tourapi_4_endpoints.md`** 참조.
