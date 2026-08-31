# 03 — 외부 데이터 계약 (한국관광공사 API 10종 + 나머지)

> **이 문서의 출처:** `docs/api_manual/` 안의 **한국관광공사 공식 활용 매뉴얼 원문(.docx/.xlsx)을 직접 파싱해서** 만들었다. 기존 `docs/plan/`과 `docs/search/`의 조사 문서와 값이 다를 경우 **이 문서가 맞다.**

## 표기 규칙

| 표기 | 뜻 |
|---|---|
| **[확정]** | 공식 매뉴얼 원문에서 직접 확인함 |
| **[구조확정]** | 매뉴얼의 다른 값들로부터 규칙이 명확히 도출됨 (예: 코드 자릿수 규칙) |
| **[미확인]** | 매뉴얼에 없음. **실제 호출로 확인해야 함** → `11_open_items.md` |
| **[정정]** | 기존 `docs/plan/` 문서가 틀렸고 여기서 바로잡은 것 |

---

## 1. 공통 규칙

### 1.1 게이트웨이 **[확정]**

```
https://apis.data.go.kr/B551011/{서비스ID}/{오퍼레이션}
```
- `B551011` = 한국관광공사 제공기관 코드
- 매뉴얼은 `http://`로 표기하지만 `https://`도 동작한다. **`https://`를 쓴다** (Vercel·GitHub Actions의 fetch가 요구)

### 1.2 모든 호출에 필수인 파라미터 **[확정]**

| 이름 | 값 | 비고 |
|---|---|---|
| `serviceKey` | 발급받은 인증키 | **§1.3 참조 — 여기서 가장 많이 실패한다** |
| `MobileOS` | `ETC` | 허용값은 서비스마다 미묘하게 다르다. `KorService2`는 `IOS/AND/WEB/ETC`, `KorWithService2`는 `IOS/AND/WIN/ETC`. **`ETC`는 모든 서비스에서 유효**하므로 이것만 쓴다 |
| `MobileApp` | `ModuBaekje` | 한국관광공사 활용 통계 집계용. **비우면 안 된다** — 통계가 안 잡히면 운영계정 심의에서 불리하다 |

선택: `numOfRows`(기본 10) · `pageNo`(기본 1) · `_type=json`(빼면 XML). 문자셋은 전 서비스 UTF-8 고정.

### 1.3 인증키 인코딩 — 실패 원인 1순위 **[확정]**

공공데이터포털은 키를 **두 가지 형태**로 준다.
- **일반 인증키(Encoding)** — 이미 URL 인코딩된 문자열 (`+`가 `%2B`로 들어 있음)
- **일반 인증키(Decoding)** — 원본 문자열

`URLSearchParams`나 `new URL()`은 넣은 값을 **다시 인코딩**한다. 여기에 Encoding 키를 넣으면 `%2B` → `%252B`가 되고 서버가 `resultCode 30`(등록되지 않은 서비스키)로 거절한다. 키가 잘못된 게 아니라 **이중 인코딩**이다.

```ts
// src/lib/kto/transport.ts
// 환경변수에는 DECODING 키를 넣는다. URLSearchParams가 정확히 한 번만 인코딩한다.
const params = new URLSearchParams();
params.set('serviceKey', process.env.KTO_SERVICE_KEY_DECODING!);  // 미리 인코딩하지 말 것
params.set('MobileOS', 'ETC');
params.set('MobileApp', 'ModuBaekje');
params.set('_type', 'json');
```

발급 직후 **수 분 ~ 1시간** 정도 반영 지연이 있을 수 있다. 개발계정 자체는 자동승인 후 **10~30분**이면 호출 가능하다. **[확정]**

### 1.4 응답 파싱 — 에러는 항상 XML **[확정]**

`_type=json`을 붙여도 **에러 응답은 언제나 XML**로 온다. JSON 파서에 그대로 넣으면 터진다.

```xml
<OpenAPI_ServiceResponse>
  <cmmMsgHeader>
    <errMsg>SERVICE ERROR</errMsg>
    <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>
    <returnReasonCode>30</returnReasonCode>
  </cmmMsgHeader>
</OpenAPI_ServiceResponse>
```

주의: 이 봉투의 필드명은 `resultCode`가 아니라 **`returnReasonCode`** 다.

**필수 구현 — 문자열 우선 파싱:**
```ts
const body = await res.text();                    // ① 항상 문자열로 먼저 읽는다
if (body.trimStart().startsWith('<')) {           // ② XML이면 에러 분기
  return { ok: false, error: parseXmlError(body), rawBody: body };
}
const json = JSON.parse(body);                    // ③ JSON이면 파싱
const code = json.response?.header?.resultCode;
if (code !== '0000' && code !== '00') {           // ④ 두 형태 모두 정상으로 취급
  return { ok: false, error: { resultCode: code }, rawBody: body };
}
```

정상 응답 봉투:
```json
{ "response": {
    "header": { "resultCode": "0000", "resultMsg": "OK" },
    "body": { "items": { "item": [ … ] }, "numOfRows": 10, "pageNo": 1, "totalCount": 100 } } }
```

> **함정:** 결과가 1건이면 `items.item`이 **배열이 아니라 객체**로 온다. 결과가 0건(`resultCode` 03)이면 `items`가 **빈 문자열 `""`** 인 경우가 있다. 세 가지 형태를 모두 배열로 정규화하는 헬퍼를 하나 만든다.

### 1.5 결과 코드 **[확정]**

| 코드 | 의미 | 수집 스크립트 처리 |
|---|---|---|
| `00` / `0000` | 정상 | 진행 |
| `03` | 데이터 없음 | **정상으로 취급.** 빈 결과를 기록한다. 누락은 장애가 아니다 |
| `10` | 잘못된 파라미터 | 즉시 중단 — 호출 코드 버그 |
| `11` | 필수 파라미터 누락 | 즉시 중단 |
| `20` | 서비스 접근 거부 | 즉시 중단 |
| `21` | 일시적으로 사용 불가한 키 | 재시도 |
| `22` | 일일 요청 제한 초과 | 중단하고 다음 실행으로 이월. **발행하지 않는다** |
| `30` | 등록되지 않은 서비스키 | 즉시 중단 — §1.3 이중 인코딩 점검 |
| `31` | 활용기간 만료 | 즉시 중단 — 키 갱신 |
| `32` | 등록되지 않은 IP | 즉시 중단 |
| `99` | 기타 | 재시도 |

### 1.6 계정과 트래픽 **[확정]**

| 항목 | 값 |
|---|---|
| 비용 | 전 서비스 무료 |
| **개발계정** | **오퍼레이션당 1일 1,000건.** 자동승인, 10~30분 후 사용 가능 |
| **운영계정** | **심의승인.** 활용사례(서비스 URL) 등록 필요. 트래픽 증액은 별도 신청 |
| 신청 단위 | **데이터셋(서비스)별로 각각 신청.** `KorService2`와 `KorWithService2`는 별개 |
| 유효기간 | 운영계정 24개월, 포털에서 연장 신청 |

**계산:** 관광지 6곳 기준 1회 전체 수집이 **약 126건**이다(§5). **개발계정 1,000건/일로 개발 기간 내내 충분하다.** 운영계정은 심사 전에 신청해 두되, 없어도 서비스는 동작한다.

> **[정정]** 기존 문서의 "운영계정 100,000건/일"은 광고된 최대치이고, 활용사례 등록 심의 + 증액 요청 심의를 **순차로 2번** 거쳐야 한다. 이번 규모에서는 필요 없다.

---

## 2. 서비스별 계약

### 2.1 KorWithService2 — 무장애 여행 정보 ★ 핵심

- **베이스:** `/B551011/KorWithService2` **[확정]**
- data.go.kr 데이터셋 ID `15101897`, 매뉴얼 **v4.3 (2025-05-12)**, 데이터 약 **60,000건**, 갱신 일 1회
- 라이선스: 데이터 자체는 이용허락범위 제한 없음. 이미지는 **공공누리 1유형·3유형 혼재**

**오퍼레이션 13종 [확정]**
`areaCode2` · `categoryCode2` · `areaBasedList2` · `locationBasedList2` · `searchKeyword2` · `detailCommon2` · `detailIntro2` · `detailInfo2` · `detailImage2` · **`detailWithTour2`** · `areaBasedSyncList2` · `ldongCode2` · `lclsSystmCode2`

**지원 contentTypeId [확정] [정정]**
`12` 관광지 · `14` 문화시설 · `15` 행사/공연/축제 · `28` 레포츠 · `32` 숙박 · `38` 쇼핑 · **`39` 음식점**
→ `25`(여행코스)만 미지원.
> **[정정]** 기존 문서 여러 곳이 "39 음식점 미지원"이라고 썼는데 **매뉴얼 v4.3 코드표와 파라미터 설명 양쪽 모두 39를 포함한다.**

**이 서비스는 신·구 코드를 둘 다 받는다 [확정]**
`areaBasedList2`의 요청 파라미터에 `areaCode`/`sigunguCode`/`cat1`/`cat2`/`cat3`(구)와 `lDongRegnCd`/`lDongSignguCd`/`lclsSystm1~3`(신)이 **공존**한다. **신 코드를 쓴다.**

#### `detailWithTour2` — 무장애 항목 전체 **[확정] [정정]**

```
GET /B551011/KorWithService2/detailWithTour2
    ?serviceKey=…&MobileOS=ETC&MobileApp=ModuBaekje&_type=json&contentId={콘텐츠ID}
```
요청 파라미터는 **`contentId` 하나뿐**(대문자 I). 응답의 키는 소문자 `contentid`.

응답 항목 — **`contentid` + 무장애 28개 = 총 29개.** 그중 `*etc` 4개를 뺀 **24개가 점수 대상**이다.

| 분야 | 필드명(영문) | 항목명 |
|---|---|---|
| **공통 (5)** | `parking` | 주차 |
| | `publictransport` | 대중교통 |
| | `route` | 접근로 |
| | `ticketoffice` | 매표소 |
| | `promotion` | 홍보물 |
| **지체장애 (6+1)** | `wheelchair` | 휠체어 |
| | `exit` | 출입통로 |
| | `elevator` | 엘리베이터 |
| | `restroom` | 화장실 |
| | `auditorium` | 관람석 |
| | `room` | 객실 |
| | `handicapetc` | 지체장애 기타상세 *(점수 제외)* |
| **시각장애 (7+1)** | `braileblock` | 점자블록 |
| | `helpdog` | 보조견 동반 |
| | `guidehuman` | 안내요원 |
| | `audioguide` | 오디오 가이드 |
| | `bigprint` | 큰 활자 홍보물 |
| | `brailepromotion` | 점자 홍보물·점자표지판 |
| | `guidesystem` | 유도 안내 설비 |
| | `blindhandicapetc` | 시각장애 기타상세 *(점수 제외)* |
| **청각장애 (3+1)** | `signguide` | 수화 안내 |
| | `videoguide` | 자막 비디오 가이드·영상 자막 |
| | `hearingroom` | 객실 |
| | `hearinghandicapetc` | 청각장애 기타상세 *(점수 제외)* |
| **영유아가족 (3+1)** | `stroller` | 유모차 |
| | `lactationroom` | 수유실 |
| | `babysparechair` | 유아용 보조의자 |
| | `infantsfamilyetc` | 영유아가족 기타상세 *(점수 제외)* |

> **[정정] 4가지를 바로잡는다.**
> 1. 제안서와 기존 스펙의 **"21개 필드"는 틀렸다. 점수 대상은 24개**(+기타 4개 = 28개).
> 2. 일부 조사 문서가 주장한 `handicaptoilet` / `handicapparking` / `nursingroom`은 **존재하지 않는다.** 실제 이름은 `restroom` / `parking` / `lactationroom`이다.
> 3. **철자 함정** — `braileblock`, `brailepromotion`은 `l`이 **하나**다(`braille` 아님). `infantsfamilyetc`는 `infants` 복수형이다. 기타 항목 4개는 접두사가 전부 다르다: `handicapetc` / `blindhandicapetc` / `hearinghandicapetc` / `infantsfamilyetc`.
> 4. 매뉴얼 내부에도 오류가 있다 — 표에서는 `route`(접근로)에 샘플값 "출입구까지 경사로가 설치되어 있음"이 붙어 있는데, 같은 문서의 XML 예시에서는 그 값이 `publictransport`에 들어 있다. **둘 다 원문 그대로 저장하고 화면에도 원문을 보여준다.** 어느 쪽이 맞는지 추론하지 않는다.

#### 참고 — 한국관광공사 자체 서비스가 드러내는 신호

같은 데이터로 운영되는 공개 서비스 **「열린관광 모두의 여행」**(`access.visitkorea.or.kr`)을 확인한 결과 (2026-09-01):

- 관광지·명소 카테고리 총 **5,656건**
- 검색 필터가 **5개 유형**(지체장애·시각장애·청각장애·영유아가족·**고령자**)으로 되어 있다. API에는 고령자 분야가 따로 없고 이 서비스가 `wheelchair`(휠체어 대여) 항목을 재사용한다
- **필터로 제공되는 항목이 API 필드보다 적다:**

| 분야 | 이 서비스가 필터로 제공하는 항목 |
|---|---|
| 지체장애 | 주차여부 · 대중교통 · 주 출입 접근로 · 휠체어대여 · 출입통로 · 엘리베이터 · 화장실 · 관람석(좌석) · 객실 · 기타상세 (10개) |
| 시각장애 | 음성안내 · 큰활자/점자 홍보물 · 점자표지판 · 기타상세 (4개) |
| **청각장애** | **기타상세 하나뿐** |
| 영유아가족 | 유모차 대여 · 수유실 · 유아용 보조의자/침대 · 기타상세 (4개) |

**주목할 점: 청각장애 분야에 필터가 하나도 없다.** 한국관광공사 자체 서비스가 `signguide`·`videoguide`·`hearingroom`으로 필터를 제공하지 않는다는 것은, **그 필드에 값이 거의 없다**는 뜻으로 읽힌다.

이건 우리 설계와 일치한다 — [`06_suitability.md`](./06_suitability.md) §4.3에서 청각장애 조건은 대부분 `정보없음`이 나올 것으로 예상하고, 그것을 갭 리포트의 1순위로 삼는다. **버그가 아니라 이 서비스가 드러내려는 사실이다.**

시각장애 쪽도 마찬가지로 `braileblock`·`helpdog`·`guidehuman`·`guidesystem`에 필터가 없다.

**값의 성격:** 값은 `Y/N`이 아니라 **자유 텍스트**다. 예: `"대여가능(수동휠체어 2대)"`, `"장애인 화장실 있음"`, `"주출입구는 경사로가 있어 휠체어 접근 가능함"`. 빈 값도 흔하다. 상태 판정 규칙은 [`05_ingest.md`](./05_ingest.md) §4.

---

### 2.2 KorService2 — 국문 관광정보

- **베이스:** `/B551011/KorService2` · 데이터셋 `15101578` · 매뉴얼 **v4.4 (2026-02-10)** **[확정]**
- **오퍼레이션 13종 [확정]:** `areaBasedList2` · `locationBasedList2` · `searchKeyword2` · `searchFestival2` · `searchStay2` · `detailCommon2` · `detailIntro2` · `detailInfo2` · `detailImage2` · `areaBasedSyncList2` · `detailPetTour2` · `ldongCode2` · `lclsSystmCode2`
- **contentTypeId [확정]:** `12`관광지 `14`문화시설 `15`행사/공연/축제 `25`여행코스 `28`레포츠 `32`숙박 `38`쇼핑 `39`음식점

#### v4.4에서 사라진 것 **[확정] [정정]**

매뉴얼 v4.4 개정 이력에 명시돼 있다.
- **`areaCode2` / `categoryCode2` 오퍼레이션 삭제**
- **요청·응답에서 `areaCode` / `sigunguCode` 삭제**
- **요청·응답에서 `cat1` / `cat2` / `cat3` 삭제**

즉 `KorService2`는 이제 **신 코드(`lDongRegnCd`/`lDongSignguCd`/`lclsSystm1~3`)만** 받는다.
(다만 매뉴얼의 JSON 응답 샘플에는 `cat1`,`cat2`,`cat3`,`areacode`,`sigungucode`가 **빈 문자열로** 남아 있다. 응답에 오더라도 무시한다.)

반면 **`KorWithService2`는 v4.3이라 구 코드가 아직 살아 있다.** 두 서비스가 서로 다른 상태다. → 코드에서 서비스별로 분기한다.

#### 주요 오퍼레이션

| 오퍼레이션 | 필수/핵심 파라미터 | 쓰는 곳 |
|---|---|---|
| `areaBasedList2` | `lDongRegnCd`,`lDongSignguCd`,`lclsSystm1~3`,`contentTypeId`,`arrange`,`modifiedtime` | 관광지 후보 목록 |
| `areaBasedSyncList2` | 위 + `showflag`, **`oldContentid`** | 증분 동기화. `showflag=0`은 숨김 처리, `oldContentid`로 콘텐츠ID 변경 추적 |
| `detailCommon2` | `contentId` | 주소·전화·홈페이지·개요. **v4.3부터 `*YN` 토글 파라미터가 전부 삭제**돼 기본으로 전체 블록을 준다 |
| `detailIntro2` | `contentId`, `contentTypeId` | 타입별 소개 정보. **타입마다 필드가 완전히 다르다** (아래) |
| `detailImage2` | `contentId`, `imageYN` | 추가 이미지. `originimgurl`, `smallimageurl`, **`cpyrhtDivCd`** |
| `detailInfo2` | `contentId`, `contentTypeId` | 반복 정보(`infoname`/`infotext`). `infotext`에 **HTML이 들어올 수 있다** |
| `searchFestival2` | **`eventStartDate` 필수** (YYYYMMDD) | 백제문화제. 빼면 `resultCode 11` |
| `ldongCode2` | `lDongRegnCd`, `lDongListYn` | 법정동 코드 부트스트랩 |
| `lclsSystmCode2` | `lclsSystmListYn` | 분류체계 코드 부트스트랩. 전체 `totalCount = 243` |

`detailIntro2`에서 이번에 쓰는 필드 **[확정]**
- `contentTypeId=12` (관광지): `usetime` 이용시간 · `restdate` 쉬는날 · `parking` 주차 · `infocenter` 문의처 · `chkbabycarriage` 유모차 대여 · `heritage1/2/3` 유네스코 유산 여부 · `expguide` 체험안내
- `contentTypeId=14` (문화시설): `usetimeculture` · `restdateculture` · `usefee` 이용요금 · `parkingculture` · `infocenterculture` · `spendtime` 관람 소요시간 · `scale` 규모

**목록 응답 공통 필드 [확정]**
`contentid` · `contenttypeid` · `title` · `addr1` · `addr2` · `zipcode` · `mapx`(**경도**) · `mapy`(**위도**) · `mlevel` · `tel` · `firstimage`(약 500×333) · `firstimage2`(썸네일 약 150×100) · **`cpyrhtDivCd`** · `createdtime` · `modifiedtime`(`YYYYMMDDHHmmss`) · `lDongRegnCd` · `lDongSignguCd` · `lclsSystm1~3`

> **좌표 주의:** `mapx`가 **경도(longitude)**, `mapy`가 **위도(latitude)** 다. 저장할 때는 `{ lat, lng }` **이름 있는 객체**로 넣는다 — 배열로 두면 순서를 뒤집는 실수가 난다.

---

### 2.3 Odii — 관광지 오디오 가이드 (도슨트)

- **베이스:** `/B551011/Odii` · 데이터셋 `15101971` · 매뉴얼 **v4.1** **[확정]**
  (매뉴얼 본문에 `Odlii`라는 오타가 있지만 실제 경로는 `Odii`다)

**오퍼레이션 8종 [확정]**
`themeBasedList` · `themeLocationBasedList` · `themeSearchList` · `storyBasedList` · `storyLocationBasedList` · `storySearchList` · `themeBaseSyncdList` · `storyBasedSyncList`
(마지막 두 개는 매뉴얼 표기 그대로다. 예시 URL에는 `themeBasedSyncList`로 적혀 있어 **표와 예시가 어긋난다** → **[미확인]**, 탐침으로 확인)

#### 좌표 파라미터 **[확정] [정정] ★ 중요**

```
GET /B551011/Odii/storyLocationBasedList
    ?serviceKey=…&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
    &mapX=126.9060&mapY=36.2765&radius=500&langCode=ko
```

| 파라미터 | 값 |
|---|---|
| **`mapX`** | GPS X좌표 (**WGS84 경도**) |
| **`mapY`** | GPS Y좌표 (**WGS84 위도**) |
| `radius` | 거리 반경 (m). **최대 20,000m** |
| `langCode` | 언어 |

> **[정정] 기존 스펙 전체가 `xCoord` / `yCoord`라고 적고 있는데 틀렸다.** 매뉴얼 v4.1은 `mapX` / `mapY`다. 그대로 짜면 모든 호출이 빈 응답이 된다. 기존 스펙의 수용 기준 `AC-10`("Odii 호출이 xCoord/yCoord를 사용")도 함께 폐기한다.

#### `langCode` 값 **[미확인]**

매뉴얼 v4.1에는 **`ko` 샘플만 있고 허용값 목록이 없다.** 서비스 설명문에는 "한국어, 영어, 중국어, 일본어"라고 되어 있고, 응답의 `langCheck` 필드가 `1111`(4개 언어 제공 여부 비트마스크)로 나온다.

기존 스펙은 두 가지 상반된 주장을 한다 — `ko/en/ja/zh-CN`(조사 문서) vs `ko/en/cn1/jp`(플랜 리뷰). **어느 쪽도 매뉴얼로 확인되지 않는다.**
→ **탐침으로 4가지 후보를 전부 시도한다** (`11_open_items.md` **P0-4**).

또 하나: `themeSearchList`의 파라미터 표에는 언어 파라미터가 **`lang`** 으로 적혀 있는데 같은 항목의 예시 URL은 `langCode`를 쓴다. → 같은 탐침에서 확인.

#### `storyBasedList` 응답 — 이게 도슨트의 실체다 **[확정]**

```
GET /B551011/Odii/storyBasedList?…&langCode=ko&tid={관광지ID}&tlid={관광지언어ID}
```

| 필드 | 내용 |
|---|---|
| `tid` / `tlid` | 관광지 ID / 관광지 언어 ID |
| `stid` / `stlid` | 이야기 ID / 이야기 언어 ID |
| `title` | 이야기 제목 (예: "대흥사 해탈문") |
| `mapX` / `mapY` | 좌표 |
| `audioTitle` | 오디오 제목 |
| **`script`** | **대본 전문** — 그대로 자막으로 쓸 수 있다 |
| `playTime` | 재생 시간(초) |
| **`audioUrl`** | **MP3 직링크** (`https://sfj608538-…ktcdn.co.kr/file/audio/…mp3`) |
| `imageUrl` | 이미지 URL |
| `langCode` | 언어 |
| `createdtime` / `modifiedtime` | 등록일 / 수정일 |

**이것이 도슨트 기능이 싼 이유다.** 한국관광공사가 **완성된 MP3와 대본 전문을 직접 준다.** 음성 합성(TTS)도, 대본 작성도 필요 없다. 재생기 + 자막 표시만 만들면 된다.

**좋은 신호:** 매뉴얼의 `themeBasedList` 응답 예시가 하필 **`themeCategory: "백제역사여행"`, `title: "백제문화단지"`, `addr1: "충청남도" addr2: "부여군"** 이다. 백제권 콘텐츠가 실제로 들어 있다는 뜻이다. 다만 우리 6곳이 있는지는 별개 → **P0-3**.

**관광지 ID 찾는 법:** `themeSearchList?keyword=공산성&langCode=ko` → `tid`/`tlid` 확보 → `storyBasedList?tid=…&tlid=…`

---

### 2.4 TatsCnctrRateService — 관광지 집중률 (예측)

- **베이스:** `/B551011/TatsCnctrRateService` · 데이터셋 `15128555` · 매뉴얼 **v4.0** **[확정]**
- **오퍼레이션 1종:** `tatsCnctrRateList`
  (매뉴얼 예시 URL에 `tatsCnctrRatedList`라는 오타가 있다. 표의 `tatsCnctrRateList`가 맞다 → 탐침 확인)

```
GET /B551011/TatsCnctrRateService/tatsCnctrRateList
    ?…&areaCd=44&signguCd=44150&tAtsNm=공산성
```

| 파라미터 | 필수 | 값 |
|---|---|---|
| `areaCd` | O | 지역코드 |
| `signguCd` | O | 시군구코드 |
| `tAtsNm` | X | 관광지명 (문자열 일치) |

응답: `baseYmd` · `areaCd` · `areaNm` · `signguCd` · `signguNm` · `tAtsNm` · **`cnctrRate`**(집중률, 예: `64.65`)

#### 지역코드 **[확정] [정정] ★ 기존 스펙의 미결 항목 해소**

이 서비스는 별도 코드표 파일(`한국관광공사_개방데이터_관광지_시군구_코드정보_v1.0.xlsx`)을 쓰는데, 그 파일은 **행정표준코드**다.

| 지역 | `areaCd` | `signguCd` |
|---|---|---|
| 충청남도 | **44** | — |
| **공주시** | 44 | **44150** |
| **부여군** | 44 | **44760** |

> **[정정]** 기존 스펙은 "`areaCd=34`(충남 레거시), 부여 `34800`, **공주는 TBD**"라고 적고 이것을 P0 미결 항목(GATE-3, OI-3)으로 남겨 뒀다. **틀렸고, 이제 해소됐다.** 이 서비스는 레거시 관광 코드가 아니라 행정표준코드를 쓴다.

#### 의미 **[확정] ★ 표기 주의**

매뉴얼 원문: **"관광지별 지역별 현재일 기준으로 향후 30일 관광객 집중률 정보"**

즉 **현재 혼잡도가 아니라 향후 30일 예측치**다. 화면에 "현재 혼잡도"라고 쓰면 사실과 다르다.
→ **화면 표기는 "예측 혼잡도 (향후 30일)"** 로 고정하고, DB에 `is_predicted = true` 플래그를 붙인다.

또한 `cnctrRate`는 **0~100 상대 지수이고 실제 인원수가 아니다.**

**한계:** 관광지 매칭이 **이름 문자열** 기준이라 "공산성"이 이 데이터셋에 그 이름으로 등록돼 있는지 불확실하다 → **P0-5**. 없으면 시군 단위로만 쓰거나 이 축을 `unknown` 처리한다.

---

### 2.5 DataLabService — 관광 빅데이터 (방문자 수)

- **베이스:** `/B551011/DataLabService` · 데이터셋 `15101972` · 매뉴얼 **v4.1** **[확정]**
- **오퍼레이션 2종:** `metcoRegnVisitrDDList`(광역) · `locgoRegnVisitrDDList`(기초)

```
GET /B551011/DataLabService/locgoRegnVisitrDDList?…&startYmd=20260801&endYmd=20260807
```

| 파라미터 | 필수 |
|---|---|
| `startYmd` | O (YYYYMMDD) |
| `endYmd` | O (YYYYMMDD) |

> **중요:** **지역 필터 파라미터가 없다.** 기간만 주면 **전국 전체**가 온다(기초 기준 하루 약 740행). 공주·부여만 쓰려면 **응답을 받아서 `signguCode`로 걸러야 한다.** `numOfRows`를 크게 잡고 페이징한다.

응답: `signguCode` · `signguNm` · `daywkDivCd`/`daywkDivNm`(요일) · `touDivCd`/**`touDivNm`**(현지인/외지인/외국인) · **`touNum`**(방문자 수) · `baseYmd`

#### 반드시 화면에 붙여야 하는 주의 문구 **[확정]**

매뉴얼과 한국관광 데이터랩이 명시한다: **"방문자는 관광객과 동일하게 정의되지 않음."**
이동통신 신호 기반이라 여행 목적을 알 수 없다. 방문자 수를 보여주는 모든 화면에 이 문구를 **항상 보이게** 넣는다(`role="note"`, `display:none` 금지).

또한 **시도 단위와 시군구 단위의 집계 기준이 달라 임의로 더할 수 없다.** 데이터는 약 **4일 지연**된다 → `endYmd = 오늘 − 4일`.

---

### 2.6 TarRlteTarService1 — 연관 관광지

- **베이스:** `/B551011/TarRlteTarService1` (**`1` 접미사**) · 데이터셋 `15128560` · 매뉴얼 **v4.1** **[확정]**
- **오퍼레이션 2종:** `areaBasedList1` · `searchKeyword1`
  (매뉴얼 표는 `AreaBasedList1`/`SearchKeyword1`로 대문자 시작, URL 예시는 소문자 `areaBasedList1`. **URL 예시를 따른다**)

```
GET /B551011/TarRlteTarService1/areaBasedList1?…&baseYm=202608&areaCd=44&signguCd=44150
```

| 파라미터 | 필수 |
|---|---|
| `baseYm` | O (YYYYMM) |
| `areaCd` | O — **44** |
| `signguCd` | O — **44150** / **44760** |

응답: `tAtsNm`(기준 관광지명) · `rlteTatsCd`(연관 관광지 코드, 해시 문자열) · **`rlteTatsNm`**(연관 관광지명) · `rlteRegnCd/Nm` · `rlteSignguCd/Nm` · `rlteCtgryLclsNm`/`MclsNm`/`SclsNm`(대/중/소분류) · **`rlteRank`**(연관 순위)

**중요한 한계 2가지:**
1. **연관 관광지에 `contentid`가 없다.** 이름 문자열만 온다. 우리 DB의 관광지와 정확히 이어붙일 수 없다.
2. 원 데이터가 **내비게이션 기반 차량 이동 데이터**라 도보·접근성과 무관하다.

→ 그래서 이 데이터는 **"관련 관광지 (접근성 미검증)"** 라는 별도 목록으로만 보여주고, 적합도 점수가 낮을 때 제시하는 **대체 관광지에는 절대 섞지 않는다.** 대체 관광지는 우리가 점수를 계산한 6곳 중에서만 고른다.

---

### 2.7 PhotoGalleryService1 — 관광사진

- **베이스:** `/B551011/PhotoGalleryService1` · 데이터셋 `15101914` · 매뉴얼 **v4.2** **[확정]**
- **오퍼레이션: `galleryList1` 1종뿐** **[확정] [정정]**

```
GET /B551011/PhotoGalleryService1/galleryList1?…&arrange=C&numOfRows=100&pageNo=1
```

| 파라미터 | 값 |
|---|---|
| `arrange` | `A`=촬영일 · `B`=제목 · `C`=수정일 |

응답: `galContentId` · `galContentTypeId` · `galTitle` · **`galWebImageUrl`** · `galCreatedtime` · `galModifiedtime` · `galPhotographyMonth` · `galPhotographyLocation`(예: "경북") · **`galPhotographer`**(예: "한국관광공사 김지호") · **`galSearchKeyword`**(쉼표 구분 키워드)

> **[정정]** 기존 스펙은 `gallerySearchList1` / `galleryDetailList1` / `gallerySyncDetailList1`도 있다고 적었지만 **매뉴얼 v4.2에는 `galleryList1` 하나뿐**이다. 포털에 다른 오퍼레이션이 있을 수도 있으므로 **[미확인]** 으로 두되, 없다고 가정하고 설계한다.

**따라서 검색 파라미터가 없다.** 전체가 약 **4,754건**이므로 수집 스크립트가 `numOfRows=100`으로 **48번 페이징해서 전부 받은 뒤 `galSearchKeyword`/`galTitle`에 "공산성","부여","백제" 등이 포함된 것만 골라 저장**한다. 1회 48콜이면 개발계정 한도(1,000)의 5%다.

**라이선스: 공공누리 1유형** — 출처 표시하면 변형·상업 이용 모두 가능. 가장 너그럽다.

---

### 2.8 EngService2 / JpnService2 / ChsService2 — 다국어

- **베이스:** `/B551011/EngService2`, `/JpnService2`, `/ChsService2` **[확정]**
- 데이터셋: Eng `15101753` · Jpn `15101760` · Chs `15101764`
- 매뉴얼 **v4.4 (2026-02-10)** — 국문과 마찬가지로 **`areaCode2`/`categoryCode2` 삭제, 구 코드 파라미터 삭제** **[확정]**
- **오퍼레이션 12종:** 국문과 동일하되 **`detailPetTour2` 없음**

#### 다국어 contentTypeId — 국문과 코드가 다르다 **[확정]**

| 타입 | 국문 | 다국어 |
|---|---|---|
| 관광지 | 12 | **76** |
| 문화시설 | 14 | **78** |
| 행사/공연/축제 | 15 | **85** |
| 레포츠 | 28 | **75** |
| 숙박 | 32 | **80** |
| 쇼핑 | 38 | **79** |
| 음식점 | 39 | **82** |
| **교통** | (없음) | **77** — 다국어 전용 |
| 여행코스 | 25 | **없음** (국문 전용) |

> `EngService2`에 `contentTypeId=12`를 넣으면 **빈 응답**이 온다. 반드시 `76`을 써야 한다.
> 우리 6곳: 공산성·무령왕릉·부소산성·정림사지 = 12 → **76**, 박물관 3곳 = 14 → **78**.

**중요:** `contentId`는 국문/다국어가 **같은 값**이다. 국문에서 얻은 `contentid`로 `EngService2/detailCommon2?contentId=…`를 부르면 영문 제목·개요가 온다.

---

### 2.9 코드 체계 — 두 개의 다른 번호 체계 **[확정]**

이 프로젝트는 **서로 호환되지 않는 두 가지 지역 코드**를 동시에 쓴다. 섞으면 조용히 빈 결과가 나온다.

#### (가) 법정동 코드 — `KorService2`, `KorWithService2`, 다국어

| 파라미터 | 자릿수 | 공주 | 부여 |
|---|---|---|---|
| `lDongRegnCd` (시도) | 2자리 | **44** | **44** |
| `lDongSignguCd` (시군구) | **3자리** | **150** | **760** |

**[구조확정]** 행정표준 시군구 코드 5자리(`44150`, `44760`)를 앞 2 + 뒤 3으로 쪼갠 것이다. 매뉴얼 예시가 이 규칙을 따른다: 서울 종로구 `11110` → `lDongRegnCd=11`, `lDongSignguCd=110`. 부산 사하구 `26380` → `26`/`380`.

그래도 **하드코딩하지 않고 부트스트랩한다:**
```
GET /B551011/KorService2/ldongCode2?…&lDongRegnCd=44&lDongListYn=Y
→ lDongRegnCd, lDongRegnNm, lDongSignguCd, lDongSignguNm 목록
```
결과를 `content/generated/codes.json`에 저장하고 코드→한글명 표시에 쓴다.

#### (나) 행정표준 5자리 코드 — `TatsCnctrRateService`, `TarRlteTarService1`

(`DataLabService`는 **요청에 지역 파라미터가 없다.** 전국 응답을 받아 응답의 `signguCode`로 거른다 — §2.5)

| 파라미터 | 자릿수 | 공주 | 부여 |
|---|---|---|---|
| `areaCd` | 2자리 | **44** | **44** |
| `signguCd` | **5자리** | **44150** | **44760** |

> **(가)의 `lDongSignguCd`는 3자리, (나)의 `signguCd`는 5자리다.** 같은 프로젝트 안에 두 규칙이 공존한다. `content/pois.json`이 관광지마다 `lDongSignguCd`(3자리)와 `signguCd5`(5자리)를 **둘 다** 들고 있어 헷갈릴 일이 없다.

#### (다) 분류체계 코드 (`lclsSystm`) **[확정]**

`lclsSystm1`(2자) → `lclsSystm2`(4자) → `lclsSystm3`(8자). 전체 243건.

우리 6곳에 해당하는 코드 — `신분류체계정보 관광타입정보 연계 정의서.xlsx`에서 확인:

| 대상 | 코드 | 이름 | contentTypeId |
|---|---|---|---|
| 공산성, 부소산성 | **`HS010200`** | 성·산성·성곽 | 12 / 다국어 76 |
| 무령왕릉과 왕릉원 | **`HS010800`** | 고분, 능 | 12 / 76 |
| 정림사지 | **`HS010700`** | 사적지 | 12 / 76 |
| 박물관 3곳 | **`VE070100`** | 박물관 | 14 / 78 |

(대분류: `HS` 역사관광, `VE` 문화관광)

> **[정정]** 기존 문서는 이 코드들을 "가설"로 표시하고 `lclsSystmCode2` 실측을 요구했다. **연계 정의서 엑셀 원본에서 확인했으므로 확정이다.** 그래도 부트스트랩 호출은 한글 라벨 확보를 위해 그대로 한다.
>
> 구 코드(`cat1`/`cat2`/`cat3`)와 신 코드는 **단순 이름 변경이 아니다.** 구 코드로부터 신 코드를 계산하려 들지 않는다.

---

## 3. KTO 외 데이터

기존 스펙은 24종을 나열하고 그중 7종을 MVP로 잡았다. 이번에는 **API 연동을 2종으로 줄이고 나머지는 저장소 안의 JSON 콘텐츠 파일로 처리한다.**

### 3.1 API로 연동하는 것

| 데이터 | 용도 | 상태 |
|---|---|---|
| **국가유산청 OpenAPI** (`khs.go.kr`, data.go.kr `15034324`) | 사적 지정번호·공식 해설. 도슨트 보조 + 여행 기록 문서 | **선택 구현.** XML 전용. 여유 있으면 |
| **기상청 단기예보** (`apihub.kma.go.kr`) | 시간대 적합도(폭염·강수) | **선택 구현.** 격자 좌표 변환이 필요하지만 공주·부여 2개 지점이므로 상수로 박아도 된다 |

> **[정정]** 문화재청 → **국가유산청**, 도메인 `cha.go.kr` → **`khs.go.kr`** 로 바뀌었다. 기존 문서가 옛 도메인을 쓰고 있다.

### 3.2 저장소 안의 JSON으로 처리하는 것 (`content/`)

**이유:** 6곳짜리 데이터를 위해 API 클라이언트를 만드는 것보다 손으로 30분 조사해서 JSON에 적는 게 싸고, 출처와 확인 날짜를 함께 기록할 수 있어 오히려 투명하다. Zod로 검증하므로 형식 오류도 잡힌다.

| 파일 | 내용 | 조사 출처 |
|---|---|---|
| `content/facilities.json` | 6곳 인근 장애인 화장실 / 응급실 / 자동심장충격기 / 장애인콜택시 (이름·좌표·거리·전화) | 응급의료포털 E-Gen, 자동심장충격기 공공데이터, 시군 홈페이지 |
| `content/certifications.json` | BF(장애물 없는 생활환경) 인증 등급, 열린관광지 지정 여부 | 한국장애인개발원 BF인증 현황, 열린관광 모두의 여행 |
| `content/curated-facts.json` | KTO가 비운 항목 중 공개 자료로 확인된 것 (예: "국립공주박물관 승강기 있음 — 출처: 박물관 공식 홈페이지, 2026-09-01 확인") | 각 기관 공식 홈페이지 |
| `content/safety-directory.json` | 119 · 관광안내 1330 · 외교부 영사콜센터 · 공주/부여 장애인콜택시 전화번호 | 각 기관 |

**모든 행에 `source`(출처 URL 또는 기관명)와 `checked_at`(확인 날짜)을 필수로 넣는다.** 화면에도 그대로 표시한다.

---

## 4. 라이선스와 출처 표기

### 4.1 `cpyrhtDivCd` — 이미지 저작권 구분 **[확정]**

| 값 | 공공누리 유형 | 허용 | 우리 처리 |
|---|---|---|---|
| `Type1` | 제1유형 (출처표시) | 출처 표시 시 변형·상업 이용 가능 | `next/image` 최적화·리사이즈 OK |
| `Type3` | 제3유형 (출처표시 + **변경금지**) | 자르기·필터·합성·워터마크 **전부 금지** | **원본 그대로 서빙.** `object-fit: contain`, `next/image` 최적화 미적용, 캔버스 조작 금지 |

이미지마다 `cpyrhtDivCd`를 **반드시 함께 저장**한다. `detailImage2`와 목록 응답 모두 이 필드를 준다.

### 4.2 표시 의무

| 위치 | 문구 |
|---|---|
| 모든 페이지 푸터 | `출처: 한국관광공사 TourAPI (https://api.visitkorea.or.kr/) · 공공누리 제1유형` |
| Type3 이미지 옆 | `출처: 한국관광공사 · 공공누리 제3유형 (변경금지)` |
| 도슨트 화면 | `출처: 한국관광공사 Odii 오디오 가이드` |
| 방문자 수 표시 화면 | `방문자는 관광객과 동일하게 정의되지 않습니다 (한국관광공사 관광 빅데이터)` |
| `/credits` 페이지 | 전 출처 목록 + 각각의 라이선스 유형 |

자세한 내용은 [`08_accessibility_legal.md`](./08_accessibility_legal.md) §3.

### 4.3 이미지 URL이 HTTP다 **[확정]**

대부분의 KTO 이미지가 `http://tong.visitkorea.or.kr/cms/resource/...` 로 온다. HTTPS 페이지에서 그대로 쓰면 혼합 콘텐츠로 차단된다.
**처리:** 수집할 때 `http://` → `https://`로 치환해 저장하고 실제 접속 가능 여부를 확인한다. 안 되면 `next.config.ts`의 `images.remotePatterns`에 등록하고 Next 이미지 프록시를 태운다(단, **Type3 이미지는 최적화하지 않으므로 별도 프록시 라우트**를 쓴다).

---

## 5. 호출 예산

관광지 6곳, 1회 전체 수집 기준.

| 서비스 | 오퍼레이션 | 호출 수 |
|---|---|---|
| KorWithService2 | `detailWithTour2` | 6 |
| KorService2 | `detailCommon2` + `detailIntro2` + `detailImage2` | 18 |
| KorService2 | `areaBasedList2` (후보 탐색) | 4 |
| KorService2 | `ldongCode2` + `lclsSystmCode2` (최초 1회) | 2 |
| Eng/Jpn/ChsService2 | `detailCommon2` | 18 |
| Odii | `themeSearchList` 6 + `storyBasedList` 12 (6곳 × ko/en) | 18 |
| PhotoGalleryService1 | `galleryList1` 전체 페이징 | 48 |
| TatsCnctrRateService | `tatsCnctrRateList` | 2 |
| TarRlteTarService1 | `areaBasedList1` | 2 |
| DataLabService | `locgoRegnVisitrDDList` | 8 |
| **합계** | | **약 126건** |

**개발계정 한도는 오퍼레이션당 1일 1,000건.** 하루에 여러 번 돌려도 여유가 크다. 운영계정 없이 개발·심사를 마칠 수 있다.
