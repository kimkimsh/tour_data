# 관광 데이터 웹·앱 개발 연동 조사

조사 기준일: 2026-05-03

## 1. API 확보 절차

한국관광공사 TourAPI와 다수 공공데이터 API는 공공데이터포털 회원가입 후 개별 API 활용신청으로 인증키를 발급받는다. 공공데이터포털 상세 페이지 기준 개발단계 자동승인 API가 많고, 운영단계는 API별로 자동승인 또는 심의승인으로 나뉜다.

기본 절차:

1. 공공데이터포털 회원가입 및 로그인
2. API 검색: 예시 `한국관광공사_국문 관광정보 서비스_GW`
3. 활용신청
4. 마이페이지의 OpenAPI 인증키 확인
5. Swagger/활용 명세에서 요청 URL, 필수 파라미터, 응답 필드 확인
6. 개발계정 트래픽으로 테스트
7. 운영 전 활용사례 등록/운영계정 전환/트래픽 증가 신청 검토

## 2. 인증키 처리

공공데이터포털 API 키는 클라이언트 앱 번들, 웹 프론트엔드, 공개 저장소에 넣지 않는다. 모바일 앱은 디컴파일 가능하고 웹은 네트워크 탭에서 키가 노출되므로, 서버 프록시 또는 서버리스 백엔드를 통해 호출하는 구조가 필요하다.

권장 보관 방식:

| 환경 | 보관 위치 |
| --- | --- |
| 로컬 개발 | `.env` 또는 OS secret manager |
| 서버 | secret manager, encrypted environment variable |
| CI/CD | repository secret |
| 모바일 앱 | 직접 저장 금지, 서버 API 호출 |
| 웹 프론트엔드 | 직접 저장 금지, 백엔드 API 호출 |

인코딩 주의:

공공데이터포털 키는 URL 인코딩된 키와 디코딩된 키를 모두 제공하는 경우가 있다. 한국관광공사 매뉴얼 일부는 UTF-8 URL 인코딩을 언급하고, 일부 과거 매뉴얼은 2015년 이후 키는 인코딩 불필요라고 설명한다. 실제 개발에서는 Swagger 샘플과 현재 발급 화면의 "일반 인증키/Encoding 인증키" 구분을 기준으로 하나만 사용하고, 이중 인코딩을 피해야 한다.

## 3. TourAPI 호출 패턴

대표 목록 조회:

```text
GET https://apis.data.go.kr/B551011/KorService2/areaBasedList2
  ?serviceKey={KEY}
  &numOfRows=20
  &pageNo=1
  &MobileOS=WEB
  &MobileApp={APP_NAME}
  &_type=json
  &arrange=C
  &contentTypeId=12
  &lDongRegnCd=11
  &lDongSignguCd=110
```

대표 상세 조회:

```text
GET https://apis.data.go.kr/B551011/KorService2/detailCommon2
  ?serviceKey={KEY}
  &MobileOS=WEB
  &MobileApp={APP_NAME}
  &_type=json
  &contentId={CONTENT_ID}
```

이미지 조회:

```text
GET https://apis.data.go.kr/B551011/KorService2/detailImage2
  ?serviceKey={KEY}
  &MobileOS=WEB
  &MobileApp={APP_NAME}
  &_type=json
  &contentId={CONTENT_ID}
  &imageYN=Y
```

동기화 조회:

```text
GET https://apis.data.go.kr/B551011/KorService2/areaBasedSyncList2
  ?serviceKey={KEY}
  &numOfRows=100
  &pageNo=1
  &MobileOS=WEB
  &MobileApp={APP_NAME}
  &_type=json
  &showflag=1
  &modifiedtime=20260401
```

## 4. 표준데이터 호출 패턴

전국 표준데이터는 `api.data.go.kr/openapi` 도메인을 사용한다.

전국관광지정보:

```text
GET https://api.data.go.kr/openapi/tn_pubr_public_trrsrt_api
  ?serviceKey={KEY}
  &pageNo=1
  &numOfRows=100
  &type=json
```

전국문화축제:

```text
GET https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api
  ?serviceKey={KEY}
  &pageNo=1
  &numOfRows=100
  &type=json
```

전국시티투어:

```text
GET https://api.data.go.kr/openapi/tn_pubr_public_city_tour_api
  ?serviceKey={KEY}
  &pageNo=1
  &numOfRows=100
  &type=json
```

## 5. 데이터 모델링 기준

관광 데이터는 출처별 키 체계가 다르므로 내부 모델에서 원천 식별자를 명확히 보관해야 한다.

| 내부 필드 | 설명 |
| --- | --- |
| `source` | `kto_tourapi`, `data_go_standard`, `culture_api`, `regional_api` 등 |
| `source_service` | `KorService2`, `DataLabService`, `tn_pubr_public_trrsrt_api` 등 |
| `source_id` | `contentid`, 표준데이터 고유 조합, 지역 API ID |
| `content_type` | 관광지, 문화시설, 축제, 숙박, 음식점 등 |
| `title` | 원문 제목 |
| `language` | `ko`, `en`, `ja`, `zh-Hans`, `zh-Hant`, `de`, `fr`, `es`, `ru` |
| `address_raw` | 원천 주소 |
| `legal_dong_code` | 법정동 시도/시군구 코드 |
| `lat`, `lng` | WGS84 위도/경도 |
| `image_url` | 원천 이미지 URL |
| `image_license_code` | `cpyrhtDivCd` 또는 공공누리 유형 |
| `modified_at_source` | 원천 수정일 |
| `is_visible_source` | TourAPI `showflag` 등 |
| `source_url` | 원천 상세/메타데이터 URL |

중복 처리:

| 중복 축 | 기준 |
| --- | --- |
| TourAPI 언어별 중복 | `contentid`가 같거나 매핑 테이블이 있는 경우 같은 장소로 묶음 |
| TourAPI와 표준데이터 중복 | 좌표 거리, 제목 유사도, 주소, 관리기관명 조합으로 후보 생성 |
| 이미지 중복 | 이미지 URL, 콘텐츠 ID, 시리얼 번호 기준 |
| 축제 중복 | 축제명, 장소, 기간, 주최/주관기관 조합 |

## 6. 동기화 전략

TourAPI는 목록 API와 동기화 API를 같이 제공한다. 전체 수집과 증분 수집을 분리해야 한다.

| 수집 단계 | 내용 |
| --- | --- |
| 초기 적재 | 지역/타입별 목록 API 전체 페이지 수집 |
| 상세 보강 | `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2` 호출 |
| 증분 갱신 | `areaBasedSyncList2`와 `modifiedtime`, `showflag`로 변경분 확인 |
| 삭제/비표출 처리 | `showflag=0` 또는 원천 미조회 항목을 내부 비활성화 |
| 이미지 갱신 | 상세 이미지 API의 `serialnum` 기준 업데이트 |
| 재검증 | 월 1회 이상 전체 샘플링으로 누락 확인 |

주의할 점:

| 항목 | 설명 |
| --- | --- |
| 빈 필드 | 전화번호, 이미지, 좌표, 홈페이지가 비어 있을 수 있음 |
| 타입별 상세 차이 | `contenttypeid`에 따라 소개/반복 정보 필드가 다름 |
| 날짜 포맷 | `createdtime`, `modifiedtime`은 `yyyyMMddHHmmss`, 축제 표준데이터는 날짜형 |
| 좌표 신뢰도 | 지자체 표준데이터와 TourAPI 좌표가 다를 수 있음 |
| 페이지 제한 | `numOfRows` 최대값과 트래픽 제한을 고려 |

## 7. 지도·위치 연동 자료

지도 서비스는 관광 데이터 원천이 아니라 위치 표현·검색·경로의 구현 인프라다.

| 공급자 | 문서 | 주요 기능 |
| --- | --- | --- |
| Kakao Developers | https://developers.kakao.com/docs | 지도, 로컬 키워드 검색, 주소-좌표 변환, 좌표-주소 변환, 카카오내비 |
| Kakao Maps Web API | https://apis.map.kakao.com/web/documentation/ | JavaScript 지도, Places, Geocoder |
| NAVER Cloud Maps | https://api.ncloud-docs.com/docs/application-maps-overview | Static Map, Directions, Geocoding, Reverse Geocoding |
| VWorld | https://www.vworld.kr/dev/v4dv_opnapi2_s001.do | 공공 공간정보, 지도, 지오코딩 |
| 도로명주소 개발자센터 | https://business.juso.go.kr/addrlink/main.do | 도로명주소 검색/팝업 API |

구현상 확인할 항목:

| 항목 | 확인 이유 |
| --- | --- |
| 지도 SDK 이용약관 | 지도의 캐시, 타사 POI 표시, 데이터 저장 제한이 있을 수 있음 |
| 지오코딩 비용/쿼터 | 주소 정규화 배치 작업 시 호출량이 큼 |
| 좌표계 | TourAPI는 WGS84 경도/위도, 기상청은 격자 `nx`, `ny` |
| 모바일 권한 | 현재 위치 사용 시 OS 권한과 별도 위치정보 고지 필요 |
| 외국어 지원 | 외국인 대상 앱은 지도 검색 결과의 언어 지원 범위 확인 필요 |

## 8. 날씨·휴일·일정 연동 자료

기상청 단기예보:

| 항목 | 내용 |
| --- | --- |
| URL | https://www.data.go.kr/data/15084084/openapi.do |
| 서비스 URL | `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0` |
| 기능 | 초단기실황, 초단기예보, 단기예보, 예보버전 |
| 형식 | JSON+XML |
| 좌표 | 전국 5km x 5km 격자 기준 `nx`, `ny` |
| 주요 파라미터 | `base_date`, `base_time`, `nx`, `ny`, `dataType` |

한국천문연구원 특일 정보:

| 항목 | 내용 |
| --- | --- |
| URL | https://www.data.go.kr/data/15012690/openapi.do |
| 서비스 URL | `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService` |
| 기능 | 국경일, 공휴일, 기념일, 24절기, 잡절 |
| 형식 | XML |
| 주요 파라미터 | `solYear`, `solMonth`, `pageNo`, `numOfRows` |
| 주요 필드 | `locdate`, `dateName`, `dateKind`, `isHoliday` |

## 9. 교통·이동 자료

관광 서비스에서 이동 정보가 필요하면 공공데이터포털의 국토교통부 TAGO 계열 API와 지자체 교통 API를 검토한다. API가 노선, 정류장, 도착, 터미널, 철도, 지하철 등으로 분리되어 있으므로 특정 앱 범위에 맞춰 개별 활용신청이 필요하다.

조사 포인트:

| 항목 | 확인 내용 |
| --- | --- |
| 지역 범위 | 전국/시도/특정 지자체 데이터 여부 |
| 실시간성 | 실시간 도착인지 정적 노선/시간표인지 |
| 좌표 | 정류장/역 좌표 제공 여부 |
| 요금/예약 | 정보 제공만인지 예약/결제와 분리되어 있는지 |
| 호출량 | 위치 기반 앱은 호출량이 급증하므로 캐시 필요 |

## 10. API 프록시와 캐시

권장 구조:

```text
Web/App Client
  -> Backend API
      -> Cache / DB
      -> Public API Adapter
          -> TourAPI / Data.go.kr / Culture API / Map API / Weather API
```

서버 측 책임:

| 책임 | 설명 |
| --- | --- |
| 키 보호 | 서비스키를 서버에서만 사용 |
| 쿼터 보호 | 캐싱, rate limit, backoff |
| 원천 오류 흡수 | `NODATA`, timeout, 쿼터 초과를 내부 오류 모델로 변환 |
| 데이터 정규화 | 다중 원천 필드를 내부 모델로 변환 |
| 라이선스 분기 | 이미지와 텍스트의 출처/공공누리 유형 저장 |
| 관측 가능성 | API별 성공률, 지연, 오류 코드, 호출량 기록 |

캐시 기준:

| 데이터 | 권장 캐시/갱신 |
| --- | --- |
| 관광 POI 목록 | 일 단위 또는 `modifiedtime` 기반 증분 |
| 관광 상세 | 수정일 변경 시 갱신 |
| 이미지 | URL/시리얼 기준 저장, 라이선스 확인 |
| 축제/행사 | 매일 갱신, 종료일 지난 항목 비활성화 |
| 날씨 | 발표시각 기준 짧은 TTL |
| 휴일 | 연도별 장기 캐시, 임시공휴일 변경 대비 재동기화 |
| 지도 지오코딩 | 약관 허용 범위 내 주소별 캐시 |

## 11. 크롤링과 API 사용 구분

공식 API가 제공되는 데이터는 크롤링보다 API를 우선 사용한다. 웹페이지 크롤링은 다음 자료에 한정하는 것이 안전하다.

| 크롤링 대상 | 허용 목적 |
| --- | --- |
| 공공데이터포털 상세/공지 페이지 | 메타데이터, 수정일, 활용 조건 확인 |
| 데이터랩 공지/가이드 페이지 | 메뉴, 데이터 설명, 지표 해석 확인 |
| 공모전 안내 페이지 | 일정, 제출 조건, 활용 데이터 요구 확인 |

피해야 할 크롤링:

| 대상 | 이유 |
| --- | --- |
| VisitKorea 본문/이미지 대량 수집 | API 선별 콘텐츠와 별도 저작권/이용조건 문제가 생길 수 있음 |
| 지도 서비스 POI 대량 수집 | 약관 위반 가능성 높음 |
| 사용자 리뷰/평점 무단 수집 | 개인정보, 저작권, 약관 이슈 가능 |
| 이미지 원본 대량 다운로드 | 공공누리 유형과 피사체 권리 확인 필요 |

