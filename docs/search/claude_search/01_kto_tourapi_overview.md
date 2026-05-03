# 01. 한국관광공사(KTO) OpenAPI 전체 카탈로그 및 신청·발급·트래픽 정책

> 본 문서는 2026년 5월 현재 한국관광공사(KTO)가 공공데이터포털(data.go.kr) 및 자체 한국관광 콘텐츠랩(api.visitkorea.or.kr)을 통해 개방하고 있는 모든 OpenAPI 서비스를 카탈로그 형태로 정리한 것이다.
>
> 1차 출처는 KTO가 배포하는 공식 활용매뉴얼(`docs/api_manual/**/*.docx`, v3.3 활용신청 / 각 서비스 v4.0~v4.4 활용매뉴얼)이며, 부가 출처는 공공데이터포털 상세 페이지와 KTO 공식 발표 자료다. 추측 없이 매뉴얼/포털에 명시된 사실만 기재한다.

---

## 0. 핵심 요약 (TL;DR)

| 항목 | 값 |
|---|---|
| 공급 기관 코드 (data.go.kr) | **B551011** (Korea Tourism Organization) |
| 1차 발급 채널 | 공공데이터포털 [data.go.kr](https://www.data.go.kr/) |
| 통합 안내·가이드 채널 | 한국관광 콘텐츠랩 [api.visitkorea.or.kr](https://api.visitkorea.or.kr/) |
| 빅데이터 통합 채널 | 한국관광 데이터랩 [datalab.visitkorea.or.kr](https://datalab.visitkorea.or.kr/) |
| 데이터 포맷 | XML(default) / JSON(`&_type=json` 옵션) |
| 인증 방식 | `serviceKey` (URL-encoded), HTTPS 권장 |
| 개발계정 트래픽 | **각 오퍼레이션별 일 1,000건** |
| 운영계정 트래픽 | KTO 담당자 심의 후 확장(활용사례 등록 필수) |
| 활용 비용 | **무료** |
| 운영계정 활용 기간 | 승인일로부터 **24개월** (만료 시 [연장신청] 가능) |
| Character Set | **UTF-8 고정** |
| 응답 데이터 갱신 | 실시간(개방 데이터 일 1회 동기화 일반적) |
| 운영 문의 | tourapi@knto.or.kr / 070-4287-3219 (개방데이터운영팀·디지털콘텐츠팀) |
| 회원가입/포털 문의 | 디지털인프라팀 033-738-3860 |
| TourAPI 4.0 출시 | 2022-08-02 (v4.0), 가장 최근 v4.4 = 2026-02-10 |

> 공공데이터포털 자료(`https://www.data.go.kr/data/15101578/openapi.do`)와 KTO 보도자료에 따르면, 2026년 3월 30일 카카오 공동 주관 「2026 관광데이터 활용 공모전(웹·앱 부문)」 응모 마감일은 **2026-05-06 16:00 (한국관광 콘텐츠랩 접수)** 이며, 공모 데이터 규모는 약 **750만 건**으로 안내된다.[^kto-2026]

[^kto-2026]: 한국관광공사·카카오 보도자료(2026.03.30); 뉴시스 — <https://www.newsis.com/view/NISX20260330_0003568923> 및 <https://knto.or.kr/pressRelease/549290>

---

## 1. KTO 디지털 채널 구조

KTO는 관광 데이터를 다음 3개 채널로 분리해 운영한다. 각 채널의 역할이 다르므로, OpenAPI 활용은 **공공데이터포털 + 콘텐츠랩 가이드** 조합이 표준이다.

| 채널 | URL | 역할 | OpenAPI 발급 |
|---|---|---|---|
| 공공데이터포털 (행안부) | `https://www.data.go.kr/` | OpenAPI 등록·키 발급·트래픽 통계 | **O** (1차 발급처) |
| 한국관광 콘텐츠랩 | `https://api.visitkorea.or.kr/` | OpenAPI 가이드, Swagger UI, 활용사례, 다운로드(매뉴얼) | X (안내 전용) |
| 한국관광 데이터랩 | `https://datalab.visitkorea.or.kr/` | 이동통신/신용카드/내비/관광통계 등 빅데이터 분석 플랫폼 | 일부 빅데이터 OpenAPI는 공공데이터포털 등록 |
| 대한민국 구석구석 | `https://korean.visitkorea.or.kr/` | 일반 사용자용 관광 포털(콘텐츠 소비) | X |
| 한국관광 품질인증(KQ) | `https://koreaquality.visitkorea.or.kr/` | 품질인증 사업체 정보 검색 | 별도 파일데이터로 개방 |

> **참고**: 일부 보도자료에는 `https://www.2025tourapi.com` / `https://www.2024tourapi.com` 같은 연도별 공모전 마이크로사이트도 있으나 이는 공모전 안내용 임시 사이트이며 발급 채널이 아니다.

---

## 2. 인증키(serviceKey) 발급·사용 절차

KTO 공식 활용신청 매뉴얼 v3.3 (`한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx`, 최종 개정 2024-03-27) 기반.[^apply-manual]

[^apply-manual]: `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx` (KTO 공식)

### 2.1 회원 가입
- 행정안전부 공공데이터포털(<https://data.go.kr>)에서 가입.
- 개인 → 일반회원 / 기관·민간업체 → 기업회원.

### 2.2 개발계정 활용 신청 (테스트 계정)
1. 공공데이터포털 상단메뉴 [데이터찾기 > 데이터목록 > "한국관광공사" 검색].
2. 사용할 OpenAPI 클릭 → [활용신청].
3. 활용목적·상세기능·라이선스 동의(필수) 입력.
4. **자동승인** — 신청 후 약 10~30분 이후부터 호출 가능.
5. **트래픽 제한 = 각 오퍼레이션별 일 1,000건**.

### 2.3 인증키 확인
- 경로: [마이페이지 > 데이터활용 > Open API > 활용신청현황 / 인증키 발급현황].
- 공공데이터포털은 인증키 재발급을 권고하지 않음 (포털 Q&A 답변 참고).

### 2.4 운영계정 활용 신청
- KTO 담당자 심의 → 약 1~3일 소요.
- 승인 시 확인사항: 활용 어플 URL(App/Web/Kiosk), 개발계정 호출 이력.
- 한국관광공사 [활용사례]에 등록·홍보됨 → 상세 기재 권장.
- **활용 기간: 승인일로부터 24개월**, 만료 시 [연장신청] 버튼으로 연장.

### 2.5 인증키 인코딩 규칙
```text
2015년 1월 이전 발급 키 → URLEncoder.encode(myKey, "UTF-8") 필요
2015년 1월 이후 발급 키 → 인코딩 불필요(이미 인코딩된 형태로 발급)
```
모든 KTO OpenAPI Character Set = **UTF-8** 고정.

### 2.6 표준 요청 파라미터 (모든 KTO REST OpenAPI 공통)

| 파라미터 | 필수 | 의미 |
|---|---|---|
| `serviceKey` | O | 공공데이터포털 발급 인증키(URL 인코딩) |
| `MobileOS` | O | `IOS`, `AND`(안드로이드), `WEB`, `ETC` 중 하나 |
| `MobileApp` | O | 서비스(앱/웹) 이름 — 활용 통계 산출용. 빈값 금지 |
| `_type` | X | `json`이면 JSON 응답 (생략 시 XML 기본) |
| `numOfRows` | X | 페이지당 결과 수 (기본 10) |
| `pageNo` | X | 페이지 번호 (기본 1) |

응답 표준은 **XML**, JSON은 옵션.

### 2.7 예시 호출 (curl, Python, JS)

```bash
# curl — 국문 관광정보 areaBasedList2 (지역기반 목록)
curl -G "https://apis.data.go.kr/B551011/KorService2/areaBasedList2" \
  --data-urlencode "serviceKey=발급받은_인증키" \
  --data-urlencode "MobileOS=ETC" \
  --data-urlencode "MobileApp=AppTest" \
  --data-urlencode "_type=json" \
  --data-urlencode "numOfRows=10" \
  --data-urlencode "pageNo=1" \
  --data-urlencode "arrange=C" \
  --data-urlencode "contentTypeId=12" \
  --data-urlencode "lDongRegnCd=11" \
  --data-urlencode "lDongSignguCd=140"
```

```python
# Python — searchKeyword2
import requests
r = requests.get(
    "https://apis.data.go.kr/B551011/KorService2/searchKeyword2",
    params={
        "serviceKey": "발급받은_인증키",
        "MobileOS": "ETC", "MobileApp": "AppTest", "_type": "json",
        "numOfRows": 10, "pageNo": 1, "arrange": "C",
        "keyword": "시장",
    },
    timeout=10,
)
r.raise_for_status()
items = r.json()["response"]["body"]["items"]["item"]
```

```javascript
// fetch — locationBasedList2 (위치기반)
const url = new URL("https://apis.data.go.kr/B551011/KorService2/locationBasedList2");
Object.entries({
  serviceKey: "발급받은_인증키",
  MobileOS: "ETC", MobileApp: "AppTest", _type: "json",
  numOfRows: 10, pageNo: 1, arrange: "C",
  mapX: 126.98375, mapY: 37.563446, radius: 1000, contentTypeId: 39,
}).forEach(([k, v]) => url.searchParams.append(k, v));
const res = await fetch(url);
const data = await res.json();
```

### 2.8 에러 코드
- 공공데이터포털 공통 에러는 **XML로만** 반환된다 (JSON 옵션과 무관). 형태:
```xml
<OpenAPI_ServiceResponse>
  <cmmMsgHeader>
    <errMsg>SERVICE ERROR</errMsg>
    <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>
    <returnReasonCode>30</returnReasonCode>
  </cmmMsgHeader>
</OpenAPI_ServiceResponse>
```

| 코드 | 메시지 | 의미 |
|---|---|---|
| 01 | APPLICATION_ERROR | 어플리케이션 에러 |
| 04 | HTTP_ERROR | HTTP 에러 |
| 12 | NO_OPENAPI_SERVICE_ERROR | 해당 OpenAPI 없음/폐기 |
| 20 | SERVICE_ACCESS_DENIED_ERROR | 서비스 접근 거부 |
| 22 | LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR | 요청 제한 초과 |
| 30 | SERVICE_KEY_IS_NOT_REGISTERED_ERROR | 미등록 키 |
| 31 | DEADLINE_HAS_EXPIRED_ERROR | 활용기간 만료 |
| 32 | UNREGISTERED_IP_ERROR | 미등록 IP |
| 99 | UNKNOWN_ERROR | 기타 |

KTO(제공기관) 측 에러:

| 코드 | 메시지 | 의미 |
|---|---|---|
| 00 | NORMAL_CODE | 정상 |
| 01 | APPLICATION_ERROR | 어플리케이션 에러 |
| 02 | DB_ERROR | DB 에러 |
| 03 | NODATA_ERROR | 데이터 없음 |
| 04 | HTTP_ERROR | HTTP 에러 |
| 05 | SERVICETIMEOUT_ERROR | 서비스 연결 실패 |
| 10 | INVALID_REQUEST_PARAMETER_ERROR | 잘못된 요청 파라메터 |
| 11 | NO_MANDATORY_REQUEST_PARAMETERS_ERROR | 필수 파라메터 누락 |
| 12 | NO_OPENAPI_SERVICE_ERROR | 서비스 없음/폐기 |
| 20 | SERVICE_ACCESS_DENIED_ERROR | 접근 거부 |
| 21 | TEMPORARILY_DISABLE_THE_SERVICEKEY_ERROR | 일시 사용 불가 키 |
| 22 | LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR | 요청 제한 초과 |
| 30 | SERVICE_KEY_IS_NOT_REGISTERED_ERROR | 미등록 키 |
| 31 | DEADLINE_HAS_EXPIRED_ERROR | 활용기간 만료 |
| 32 | UNREGISTERED_IP_ERROR | 미등록 IP |
| 33 | UNSIGNED_CALL_ERROR | 서명되지 않은 호출 |
| 99 | UNKNOWN_ERROR | 기타 |

---

## 3. KTO OpenAPI 전체 카탈로그 (B551011 기관 코드)

KTO 활용매뉴얼(국문 v4.4)에 명시된 "한국관광공사가 제공하는 OpenAPI 서비스 목록".[^kor-manual] 매뉴얼은 본 카탈로그를 다음과 같이 분류한다.

[^kor-manual]: `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx` (KTO 공식, v4.4 = 2026-02-10)

> 모든 서비스의 베이스 URL은 `http(s)://apis.data.go.kr/B551011/{서비스ID}/{오퍼레이션}` 형식이다. 개발/운영 환경 URL이 동일하다.

### 3.1 다국어 관광정보 서비스 (9종) — TourAPI 4.0 본체

| # | 서비스ID | 언어 | 매뉴얼 버전 | 베이스 URL |
|---|---|---|---|---|
| 1 | **KorService2** | 국문 | v4.4 (2026-02-10) | `https://apis.data.go.kr/B551011/KorService2` |
| 2 | **EngService2** | 영문 | v4.4 (2026) | `https://apis.data.go.kr/B551011/EngService2` |
| 3 | **JpnService2** | 일문 | v4.4 (2026) | `https://apis.data.go.kr/B551011/JpnService2` |
| 4 | **ChsService2** | 중문 간체 | v4.4 (2026) | `https://apis.data.go.kr/B551011/ChsService2` |
| 5 | **ChtService2** | 중문 번체 | v4.4 (2026) | `https://apis.data.go.kr/B551011/ChtService2` |
| 6 | **GerService2** | 독문 | v4.3 (2026-02-25) | `https://apis.data.go.kr/B551011/GerService2` |
| 7 | **FreService2** | 불문 | v4.3 (2026) | `https://apis.data.go.kr/B551011/FreService2` |
| 8 | **SpnService2** | 서문 (스페인어) | v4.3 (2026) | `https://apis.data.go.kr/B551011/SpnService2` |
| 9 | **RusService2** | 노문 (러시아어) | v4.3 (2026) | `https://apis.data.go.kr/B551011/RusService2` |

각 다국어 서비스는 **동일한 13개 오퍼레이션 시그니처**를 공유한다(아래 § 3.x 참조). 다국어 5개 비-국문 서비스는 다음과 같은 차이가 있다:
- `contentTypeId` 코드값이 **국문과 다름** (12/14/15 → 76/78/85 등). 자세한 매핑은 `02_tourapi_4_endpoints.md` 및 `03_tourapi_codes_schema.md` 참조.
- 일부 메뉴(반려동물 정보, 행사 진행상태 등)는 다국어 서비스에서는 제공되지 않을 수 있음.

### 3.2 특화 관광정보 서비스

| # | 서비스ID | 한글명 | 베이스 URL | 매뉴얼 |
|---|---|---|---|---|
| 10 | **KorWithService2** | 국문 무장애 여행 정보 (Without Barrier) | `/B551011/KorWithService2` | v4.3 |
| 11 | **KorPetTourService2** | 반려동물 동반 여행 정보 (전용 서비스) | `/B551011/KorPetTourService2` | v4.1 |
| 12 | **GreenTourService1** | 생태관광정보 | `/B551011/GreenTourService1` | v4.2 |
| 13 | **WellnessTursmService** | 웰니스 관광정보 | `/B551011/WellnessTursmService` | v4.1 |
| 14 | **MdclTursmService** | 의료 관광정보 | `/B551011/MdclTursmService` | v4.1 |
| 15 | **PhotoGalleryService1** | 관광사진 갤러리 | `/B551011/PhotoGalleryService1` | v4.2 |
| 16 | **Odii** | 관광지 오디오 가이드 (Odii) | `/B551011/Odii` | v4.1 |
| 17 | **GoCamping** | 고캠핑 정보(캠핑장) | `/B551011/GoCamping` | v4.1 |
| 18 | **Durunubi** | 두루누비(코리아둘레길/자전거·걷기 코스) | `/B551011/Durunubi` | v4.1 |

### 3.3 빅데이터·통계·분석 서비스

| # | 서비스ID | 한글명 | 베이스 URL | 매뉴얼 |
|---|---|---|---|---|
| 19 | **DataLabService** | 관광 빅데이터 (지역방문자수 등) | `/B551011/DataLabService` | v4.1 |
| 20 | **TatsCnctrRateService** | 관광지 집중률 방문자 추이 예측 | `/B551011/TatsCnctrRateService` | v4.0 |
| 21 | **LocgoHubTarService1** | 기초 지자체 중심 관광지 정보 | `/B551011/LocgoHubTarService1` | v4.1 |
| 22 | **TarRlteTarService1** | 관광지별 연관 관광지 정보 | `/B551011/TarRlteTarService1` | v4.1 |
| 23 | **AreaTarDemDsService** | 지역별 관광 수요 강도(체류·소비) | `/B551011/AreaTarDemDsService` | v4.0 |
| 24 | **AreaTarDivService** | 지역별 관광 다양성(관광객·소비·국제적) | `/B551011/AreaTarDivService` | v4.0 |
| 25 | **AreaTarResDemService** | 지역별 관광 자원 수요(서비스·문화 자원) | `/B551011/AreaTarResDemService` | v4.0 |

### 3.4 기타

| # | 서비스ID | 한글명 | 베이스 URL | 매뉴얼 |
|---|---|---|---|---|
| 26 | **tursmService** | 관광 채용 정보(관광인) | `/B551011/tursmService` | v4.0 |
| 27 | **PhokoAwrdService** | 관광공모전(사진) 수상작 정보 | `/B551011/PhokoAwrdService` | (비번호) |

> **국문 매뉴얼이 명시한 추가 안내**(국문 v4.4 § I-1):
> - "국문 및 다국어(영문, 일문, 중문간체, 중문번체, 독문, 불문, 서문, 노문) 서비스 (9종)"
> - "국문 무장애 여행 정보 서비스"
> - "생태관광정보 서비스"
> - "관광사진갤러리 서비스"
> - "고캠핑정보 서비스"
> - "관광지 오디오 가이드정보 서비스"
> - "관광 빅데이터 정보 서비스"
> - "두루누비 정보 서비스"
> - "관광 채용 정보 서비스"
> - "관광지 집중률 방문자 추이 예측 정보"
> - "기초지자체 중심 관광지 정보"
> - "관광지별 연관 관광지 정보"
> - "반려동물 동반여행 서비스"
>
> 즉 KTO 공식 카탈로그상 활용매뉴얼이 배포된 서비스는 위 26~27개로 집계된다(공공데이터포털 등록 기준).

---

## 4. TourAPI 버전 변천사

국문 활용매뉴얼 § 개정이력에 따른 핵심 마일스톤.

| 버전 | 일자 | 주요 변경 |
|---|---|---|
| 1.0 | 2013-03-05 | 최초 작성 |
| 1.3 | 2013-04-01 | 교통(ContentTypeId=40) 카테고리 삭제, 길안내·약도이미지 항목 삭제 |
| 1.5 | 2013-08-08 | 통합검색·행사 날짜 검색·여행코스 일정 검색 등 다중 조합 검색 추가 |
| 3.0 | 2014-08-04 | **TourAPI 3.0** 전면 개정 |
| 3.5 | 2020-04-16 | 목록 오퍼레이션(지역/위치/숙박/행사) 응답에 수정일 추가 |
| 3.6 | 2021-10-06 | 행사정보 조회 시 행사 시작일 **필수** 변경 |
| **4.0** | **2022-08-02** | **TourAPI 4.0** 전면 개정 — 모든 오퍼레이션이 `xxx2` suffix 도입 |
| 4.1 | 2023-01-30 | 응답에 이미지 공공누리 유형(`cpyrhtDivCd`) 추가, 조회수 필드 제거, 반려동물 여행정보 오퍼레이션 추가 |
| 4.2 | 2024-03-27 | 제공 서비스 구성도 이미지 변경 |
| **4.3** | **2025-05-12** | 모든 목록 오퍼레이션 요청/응답에 **법정동(`lDongRegnCd`/`lDongSignguCd`)** 및 **분류체계(`lclsSystm1/2/3`)** 추가, "목록구분" 요청 항목 삭제, "교과서 속 여행지 여부" 응답 항목 삭제, 숙박/소개 오퍼레이션에서 (베니키아여부, 굿스테이여부, 한옥여부) 삭제, 키워드 검색에서 관광타입 요청 항목 삭제, 동기화 오퍼레이션에 "이전 콘텐츠 ID" 추가, 공통정보 오퍼레이션 다수 요청항목 삭제, **법정동 정보(`ldongCode2`) 오퍼레이션 신규**, **분류체계 정보(`lclsSystmCode2`) 오퍼레이션 신규** |
| **4.4** | **2026-02-10** | 지역코드 오퍼레이션(`areaCode2`) 삭제, 서비스분류코드 오퍼레이션(`categoryCode2`) 삭제, 요청/응답에서 (areaCode/sigunguCode/대분류·중분류·소분류) 삭제 — **법정동 + 분류체계 단일 체계로 일원화** |

> **중요**: v4.4 시점(국문 KorService2 기준)에서 `areaCode2` / `categoryCode2` / `cat1` / `cat2` / `cat3` / `areaCode` / `sigunguCode`는 **국문 본 서비스에서 deprecated**된다. 다만 **다국어 9종, 무장애여행(KorWithService2), 캠핑·생태·웰니스·의료 등 특화 서비스는 여전히 areaCode/sigunguCode/categoryCode 체계를 사용**한다(매뉴얼 v4.3 / v4.1 기준).

---

## 5. 트래픽·라이선스 정책 정리

| 항목 | 정책 |
|---|---|
| 비용 | 무료 (모든 KTO OpenAPI 공통) |
| 개발계정 | 자동 승인, 약 10~30분 내 활성화, **각 오퍼레이션별 일 1,000건** |
| 운영계정 | 심의 승인 (1~3일), 트래픽 확장 가능, **24개월 활용기간** |
| Character Set | UTF-8 |
| 응답 포맷 | XML(default), JSON(옵션 `&_type=json`) |
| 이미지 저작권 | `cpyrhtDivCd` 필드: `Type1`(제1유형: 출처표시-권장) / `Type3`(제1유형 + 변경금지) |
| 이미지 사용 제한 | 명예훼손·상업적 브랜딩 등 KTO 평판을 훼손할 목적 사용 금지 (data.go.kr EngService 페이지 명시) |
| 트래픽 통계 산출 | `MobileApp` 파라미터(서비스명·앱명) 기반 — 누락 시 통계 누락 |
| 운영계정 만료 | 만료 시 [연장신청] 버튼으로 갱신 |

---

## 6. 공모전·이벤트 (참고)

- **2026 관광데이터 활용 공모전 (웹·앱 개발 부문)**
  - 주최: 한국관광공사 + 카카오
  - 모집기간: **2026.03.30 ~ 2026.05.06 16:00** (한국관광 콘텐츠랩 접수)
  - 데이터 규모: **약 750만 건** (관광지 정보·이미지·빅데이터)
  - 선발: 31개 팀
  - 시상: 대상(장관상, 1,000만원) 1팀, 최우수상(300만원) 5팀, 우수상(100만원) 10팀, 장려상(50만원) 15팀
  - 출처: <https://www.newsis.com/view/NISX20260330_0003568923>, <https://knto.or.kr/pressRelease/549290>

- 직전 행사: 2025 관광데이터 활용 공모전 — <https://www.2025tourapi.com/>

---

## 7. 참고 링크 모음

### 7.1 공공데이터포털 OpenAPI 상세 페이지

| 서비스 | URL |
|---|---|
| 국문 관광정보(KorService2) | <https://www.data.go.kr/data/15101578/openapi.do> |
| 영문 관광정보(EngService2) | <https://www.data.go.kr/data/15101753/openapi.do> |
| 관광 빅데이터(DataLabService) | <https://www.data.go.kr/data/15101972/openapi.do> |
| 두루누비(Durunubi) | <https://www.data.go.kr/data/15101974/openapi.do> |
| 고캠핑(GoCamping) | <https://www.data.go.kr/data/15101933/openapi.do> |
| 한국관광 품질인증 현황(파일) | <https://www.data.go.kr/data/15034825/fileData.do> |

### 7.2 KTO 공식 채널

- 한국관광 콘텐츠랩 (가이드·Swagger·매뉴얼 다운로드): <https://api.visitkorea.or.kr/>
- 한국관광 데이터랩 (빅데이터 분석): <https://datalab.visitkorea.or.kr/>
- 한국관광 품질인증(KQ): <https://koreaquality.visitkorea.or.kr/>
- 대한민국 구석구석(B2C 포털): <https://korean.visitkorea.or.kr/>
- 관광지식정보시스템(통계): <https://www.tour.go.kr/>
- 한국관광공사 본사: <https://kto.visitkorea.or.kr/>

### 7.3 KTO TourAPI e배움터 (학습)

- TourAPI 이해 및 활용 (상품기획/개발): <https://touredu.visitkorea.or.kr/common/C202201089/0000/0>
- 관광인 한국관광공사 관광전문인력포털: <https://academy.visitkorea.or.kr/>

---

## 8. 본 문서 작성 시 참고한 1차 소스 (로컬 매뉴얼)

본 카탈로그·정책 정리는 다음 KTO 공식 매뉴얼을 1차 소스로 한다. 모든 사실 진술은 해당 매뉴얼 또는 공공데이터포털 등록 정보와 직접 대응된다.

| 매뉴얼(서비스) | 버전 | 로컬 경로 |
|---|---|---|
| 활용신청 방법 | v3.3 (2024-03-27) | `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx` |
| 국문(KorService2) | v4.4 (2026-02-10) | `docs/api_manual/1737596499508/한국관광공사_개방데이터_활용매뉴얼(국문)_v4.4.docx` |
| 영문(EngService2) | v4.4 (2026) | `docs/api_manual/1737596531873/한국관광공사_개방데이터_활용매뉴얼(영문)_v4.4.docx` |
| 일문(JpnService2) | v4.4 (2026) | `docs/api_manual/1737596480579/한국관광공사_개방데이터_활용매뉴얼(일문)_v4.4.docx` |
| 중문간체(ChsService2) | v4.4 (2026) | `docs/api_manual/1704160495049/한국관광공사_개방데이터_활용매뉴얼(중문간체)_v4.4.docx` |
| 중문번체(ChtService2) | v4.4 (2026) | `docs/api_manual/1737596423271/한국관광공사_개방데이터_활용매뉴얼(중문번체)_v4.4.docx` |
| 독어(GerService2) | v4.3 (2026-02-25) | `docs/api_manual/1737596457504/한국관광공사_개방데이터_활용매뉴얼(독어)_v4.3.docx` |
| 불어(FreService2) | v4.3 (2026) | `docs/api_manual/1737596408255/한국관광공사_개방데이터_활용매뉴얼(불어)_v4.3.docx` |
| 서어(SpnService2) | v4.3 (2026) | `docs/api_manual/1737596391866/한국관광공사_개방데이터_활용매뉴얼(서어)_v4.3.docx` |
| 노어(RusService2) | v4.3 (2026) | `docs/api_manual/1737596057411/한국관광공사_개방데이터_활용매뉴얼(노어)_v4.3.docx` |
| 무장애여행(KorWithService2) | v4.3 | `docs/api_manual/1737596514908/한국관광공사_개방데이터_활용매뉴얼(무장애여행)_v4.3.docx` |
| 반려동물(KorPetTourService2) | v4.1 | `docs/api_manual/1737596366080/한국관광공사_개방데이터_활용매뉴얼(반려동물동반여행)_v4.1.docx` |
| 생태(GreenTourService1) | v4.2 | `docs/api_manual/1704160406003/한국관광공사_개방데이터_활용매뉴얼(생태관광)_v4.2.docx` |
| 사진(PhotoGalleryService1) | v4.2 | `docs/api_manual/1704160396374/한국관광공사_개방데이터_활용매뉴얼(관광사진)_v4.2.docx` |
| 오디(Odii) | v4.1 | `docs/api_manual/1720672146251/한국관광공사_개방데이터_활용매뉴얼(오디)_v4.1.docx` |
| 웰니스(WellnessTursmService) | v4.1 | `docs/api_manual/1725080513010/한국관광공사_개방데이터_활용매뉴얼(웰니스)_v4.1.docx` |
| 의료(MdclTursmService) | v4.1 | `docs/api_manual/1725080563660/한국관광공사_개방데이터_활용매뉴얼(의료)_v4.1.docx` |
| 고캠핑(GoCamping) | v4.1 | `docs/api_manual/1704160387374/한국관광공사_개방데이터_활용매뉴얼(고캠핑)_v4.1.docx` |
| 두루누비(Durunubi) | v4.1 | `docs/api_manual/1704160359411/한국관광공사_개방데이터_활용매뉴얼(두루누비)_v4.1.docx` |
| 빅데이터(DataLabService) | v4.1 | `docs/api_manual/1704160370032/한국관광공사_개방데이터_활용매뉴얼(관광빅데이터)_v4.1.docx` |
| 집중률(TatsCnctrRateService) | v4.0 | `docs/api_manual/1725501618773/한국관광공사_개방데이터_활용매뉴얼(관광지집중률방문자추이예측정보)_v4.0.docx` |
| 기초지자체 중심관광지(LocgoHubTarService1) | v4.1 | `docs/api_manual/1725501897980/한국관광공사_개방데이터_활용매뉴얼(기초지자체_중심관광지정보)_v4.1.docx` |
| 연관관광지(TarRlteTarService1) | v4.1 | `docs/api_manual/1725502022236/한국관광공사_개방데이터_활용매뉴얼(관광지별연관관광지정보)_v4.1.docx` |
| 채용(tursmService) | v4.0 | `docs/api_manual/1704160822554/한국관광공사_개방데이터_활용매뉴얼(관광채용정보)_v4.0.docx` |
| 공모전 수상작(PhokoAwrdService) | — | `docs/api_manual/1725092509540/한국관광공사_개방데이터_활용매뉴얼(관광공모전 수상작).docx` |
| 지역별 수요 강도(AreaTarDemDsService) | v4.0 | `docs/api_manual/manual_areaTarDemDsService/한국관광공사_개방데이터_활용매뉴얼(지역별관광수요강도)_v4.0.docx` |
| 지역별 다양성(AreaTarDivService) | v4.0 | `docs/api_manual/manual_areaTarDivService/한국관광공사_개방데이터_활용매뉴얼(지역별관광다양성)_v4.0.docx` |
| 지역별 자원수요(AreaTarResDemService) | v4.0 | `docs/api_manual/manual_areaTarResDemService/한국관광공사_개방데이터_활용매뉴얼(지역별관광자원수요)_v4.0.docx` |
| 지역코드(시도+시군구) | v1.0 | `docs/api_manual/manual_areaTarDemDsService/한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx` |
| 다국어 서비스분류코드 | v4.2 | `docs/api_manual/1737596057411/한국관광공사_다국어_서비스분류코드_v4.2.xlsx` |
| 신분류체계 ↔ 관광타입 매핑 | — | `docs/api_manual/1737596499508/신분류체계정보 관광타입정보 연계 정의서.xlsx` |

---

본 문서의 엔드포인트별 상세 명세는 **`02_tourapi_4_endpoints.md`**, 코드(지역/시군구/contentType/legacy categoryCode/신분류체계 lclsSystm) 체계는 **`03_tourapi_codes_schema.md`** 참조.
