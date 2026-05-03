# 16. 지도 / 위치 서비스 — 카카오 · 네이버 · 구글 · TMAP · VWorld 비교

> 조사 기준일: 2026-05-03
> **한국 관광 서비스 핵심 인프라 — 정확한 가격/쿼터 정리**

---

## 1. 한 눈에 보기

| 서비스 | 운영사 | 무료 티어 | 단가 (정상) | 비고 |
|---|---|---|---|---|
| 카카오맵 | Kakao | 앱별 무료 쿼터 | 50원/건 (2026.2~12 할인 10원) | 추가 쿼터 0.1원/건 (지도) |
| 네이버 지도 (NCP) | NAVER Cloud | 월 3,000,000 호출 | 호출별 상이 | 대표 계정만 무료 |
| Google Maps | Google | SKU별 (Essentials 10K, Pro 5K, Enterprise 1K) | $2-40/1K | 모바일 SDK 무제한 |
| TMAP | SK텔레콤/티맵모빌리티 | 일부 무료 | 협의 | POI 한국 최대 |
| VWorld | 국토교통부/공간정보산업진흥원 | **완전 무료** | - | 인증키 필요 |
| Mapbox | Mapbox | 50K 웹 / 25K MAU 모바일 / 100K geocoding | 사용량 기반 | 글로벌 |

---

## 2. 카카오맵 API

### 2.1 기본 정보

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://developers.kakao.com/docs/latest/ko/kakaomap/common |
| 시작 | 카카오 디벨로퍼스 앱 등록 → 앱 키 발급 |
| 플랫폼 | JavaScript SDK · Android · iOS · REST API |

### 2.2 가격 (2026)

| 구간 | 단가 |
|---|---|
| 무료 쿼터 | 앱별 일/월 무료 제공 |
| 추가 쿼터 (지도) | 0.1원/건 |
| 정상가 | 50원/건 |
| **2026.2.2 ~ 12.31 할인** | **10원/건 (80% 할인)** |
| 초과 시 | HTTP 429 에러 |

> 2024-12-01부터 JavaScript 지도 SDK도 추가 쿼터 설정 가능 API에 포함

### 2.3 주요 API

| 카테고리 | API |
|---|---|
| 지도 | Map · Marker · InfoWindow · Polyline · Polygon · Circle |
| 로컬 | 키워드 검색 · 카테고리 검색 · 주소 검색 · 좌표→주소 |
| 모빌리티 | 자동차 길찾기 · 미래 운행정보 · 버스정류장/노선 |
| 로드뷰 | 로드뷰 패널 |

### 2.4 코드 예제

```html
<!-- Kakao JavaScript Maps SDK -->
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_JS_APP_KEY&libraries=services,clusterer"></script>
<div id="map" style="width:100%;height:400px;"></div>
<script>
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청
    level: 5
  };
  const map = new kakao.maps.Map(container, options);
  
  // 키워드 검색
  const ps = new kakao.maps.services.Places();
  ps.keywordSearch('경복궁', (data, status) => {
    if (status === kakao.maps.services.Status.OK) {
      data.forEach(place => {
        new kakao.maps.Marker({
          map,
          position: new kakao.maps.LatLng(place.y, place.x)
        });
      });
    }
  });
</script>
```

```bash
# REST API — 주소→좌표
curl -H "Authorization: KakaoAK ${REST_API_KEY}" \
  "https://dapi.kakao.com/v2/local/search/address.json?query=서울특별시 종로구 사직로 161"
```

---

## 3. 네이버 지도 (NAVER Cloud Platform Maps)

### 3.1 기본 정보

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://www.ncloud.com/product/applicationService/maps |
| 신규 신청 | 2025년 일부 차단 → AI·NAVER API 콘솔 통합 |
| Web JS SDK | https://navermaps.github.io/maps.js.ncp/ |
| 주의 | 기존 "네이버 클라우드 플랫폼 Maps"와 "AI·NAVER API"가 통합됨 |

### 3.2 가격 (2026)

| 항목 | 내용 |
|---|---|
| 무료 호출 | 대표 계정 월 3,000,000 호출 (Web Dynamic Map / Static Map / Geocoding / Reverse Geocoding) |
| 추가 호출 | 종량제 (서비스별 상이, 0.5원~수원/건 범위) |
| Directions 5/15 | 별도 가격 (경로 길이 의존) |

### 3.3 주요 API

| API | 용도 |
|---|---|
| Web Dynamic Map | 인터랙티브 지도 |
| Static Map | 이미지 지도 |
| Geocoding | 주소 → 좌표 |
| Reverse Geocoding | 좌표 → 주소 |
| Directions 5 (Driving) | 자동차 길찾기 (5경로) |
| Directions 15 (Driving) | 15경로 |

### 3.4 코드 예제

```html
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_KEY_ID"></script>
<div id="map" style="width:100%;height:400px;"></div>
<script>
  const map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 13
  });
  new naver.maps.Marker({
    position: new naver.maps.LatLng(37.5665, 126.9780),
    map
  });
</script>
```

```bash
# Geocoding REST
curl -H "x-ncp-apigw-api-key-id: ${KEY_ID}" \
     -H "x-ncp-apigw-api-key: ${KEY}" \
  "https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=서울특별시 종로구 사직로 161"
```

---

## 4. TMAP API

### 4.1 기본 정보

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://tmapapi.tmapmobility.com/ |
| 대중교통 API | https://transit.tmapmobility.com/ |
| SK Open API | https://openapi.sk.com/products/detail?svcSeq=4 |
| 운영 | 티맵모빌리티 (SK텔레콤 분사) |

### 4.2 강점
- 국내 최대 POI 데이터 (맛집/숙박 특화)
- 실시간 교통 정보 (택시 데이터 기반)
- 별칭(Alias) 검색
- 고품질 한국 도로 데이터

### 4.3 주요 API

| 카테고리 | API |
|---|---|
| 길찾기 | 자동차 · 보행자 · 자전거 · 트럭 |
| POI | 통합 검색 · 카테고리 · 주변 검색 |
| 지도 | Web JS · Android · iOS SDK |
| 대중교통 | 다중 수단 경로 (버스/지하철/도보) |
| 미래운행 | 출발 시간 예측 |

### 4.4 가격
- 일정 무료 호출량 제공 (회원가입 시)
- 초과 시 협의 (B2B 라이선스)
- 정확한 단가는 SK Open API 페이지 또는 영업 문의

---

## 5. Google Maps Platform

### 5.1 가격 구조 (2026)

| 카테고리 | 무료 캡 (월) | 단가 범위 |
|---|---|---|
| Essentials APIs | 10,000 events | $2-7/1K |
| Pro APIs | 5,000 | $5-15/1K |
| Enterprise APIs | 1,000 | $15-40/1K |
| Maps Embed API | 무제한 | 무료 |
| Maps SDK (Mobile native dynamic) | 무제한 | 무료 |

> 2025-03부터 SKU별 별도 무료 티어로 변경. 기존 $200 월 크레딧 폐지.

### 5.2 주요 SKU 단가 (2026)

| SKU | 단가 (USD/1K req) |
|---|---|
| Dynamic Maps (Web) | $7 |
| Geocoding | $5 |
| Routes (Compute Routes) | $5-10 |
| Places (Text Search) | $32 |
| Places (Place Details Pro) | $5 |
| Street View | $7 |

### 5.3 코드 예제

```html
<script async src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places&loading=async&callback=init"></script>
<div id="map" style="height:400px;"></div>
<script>
  function init() {
    const map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: 37.5665, lng: 126.9780 },
      zoom: 13
    });
  }
</script>
```

---

## 6. VWorld (공간정보 오픈플랫폼)

### 6.1 기본 정보

| 항목 | 내용 |
|---|---|
| 공식 사이트 | https://www.vworld.kr/ |
| 운영 | 국토교통부 / 공간정보산업진흥원 |
| 가격 | **완전 무료** (인증키만 발급) |
| 회원 | 일반 무료 가입 |

### 6.2 제공 API

| 카테고리 | 내용 |
|---|---|
| 2D 지도 API | 웹 지도 (OpenLayers 기반) |
| 3D 지도 API | WebGL 3D, 데스크톱 클라이언트 |
| 데이터 API | WMS / WFS / WMTS |
| 검색 API | 주소/장소/지번 |
| 지오코더 API | 주소→좌표 |
| 벡터 지도 API | 사용자 정의 스타일 |

### 6.3 데이터셋

- 국가 보유 공간정보 (도로, 행정경계, 건물, 지적, 토지이용)
- 항공 영상 / 위성 영상
- 실내 지도 (일부)
- 3D 건물 모델

### 6.4 사용 시 주의
- 상업적 이용 가능 (공공데이터법)
- 일부 데이터는 별도 라이선스 표시 필요
- 트래픽 제한 명시 없음 (사실상 무제한)
- 상업 운영 시 출처 표기 권장

---

## 7. 글로벌 오픈/대안 — Mapbox, MapLibre, OSM

### 7.1 가격 비교 (2026)

| 서비스 | 무료 티어 | 유료 |
|---|---|---|
| Mapbox | 50K 웹 + 25K MAU 모바일 + 100K geocoding/dir | 사용량 기반, 1K req $0.5-5 |
| MapTiler | 100K 타일/월 | $25/월부터 |
| MapLibre GL JS | OSS, 무제한 (타일은 별도) | 0 (라이브러리만) |
| OpenStreetMap | 무료 (Tile usage policy 준수 시) | 0 (Heavy use는 자체 호스팅) |
| Stadia Maps | 200K view/월 | $20/월부터 |
| Protomaps | 무료 (S3에 PMTiles 호스팅) | S3 비용만 |
| Leaflet | OSS, 라이브러리 무료 | 0 (타일 별도) |

### 7.2 MapLibre 코드 예제

```html
<link href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
<div id="map" style="height:400px;"></div>
<script>
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY',
    center: [126.9780, 37.5665],
    zoom: 12
  });
</script>
```

---

## 8. 좌표계 / 변환

### 8.1 한국에서 쓰이는 주요 좌표계

| 좌표계 | EPSG | 사용처 |
|---|---|---|
| WGS84 | 4326 | GPS 표준, 카카오/네이버/구글 모두 |
| WGS84 Web Mercator | 3857 | 웹 지도 타일 |
| KATEC (Bessel) | (없음) | 구 카카오 좌표 |
| TM128 | (없음) | 구 네이버 좌표 |
| GRS80 중부원점 (Korea 2000) | 5179, 5181, 5186 | 정부/지적/측량 |
| Bessel 1841 | 5174, 5176 | 구 측량 |

### 8.2 카카오맵 좌표 변환

```javascript
// kakao.maps.services.Geocoder
const geocoder = new kakao.maps.services.Geocoder();
geocoder.transCoord(126.9780, 37.5665, callback, {
  input_coord: kakao.maps.services.Coords.WGS84,
  output_coord: kakao.maps.services.Coords.TM
});
```

### 8.3 변환 라이브러리

| 라이브러리 | 언어 | 비고 |
|---|---|---|
| proj4js | JS | 가장 많이 쓰임 |
| pyproj | Python | proj 바인딩 |
| GeoTools | Java | - |
| GDAL | C++ (CLI) | ogr2ogr, 모든 변환 |

---

## 9. 한국관광공사 OpenAPI ↔ 지도 통합 패턴

### 9.1 데이터 흐름

```
한국관광공사 OpenAPI (areaBasedList2 등)
  → mapX, mapY (WGS84) 좌표 포함
  → 카카오맵/네이버지도/구글맵 마커로 표시
  → contentid 클릭 시 detailCommon2 호출 → 상세 정보
```

### 9.2 mapX/mapY 좌표계
- 한국관광공사 API는 WGS84 (EPSG:4326) 사용
- mapX = longitude (경도)
- mapY = latitude (위도)
- 별도 변환 불필요

---

## 10. 비교 매트릭스 — 한국 관광 서비스 관점

| 기준 | 카카오맵 | 네이버지도 | 구글맵 | TMAP | VWorld | MapLibre+OSM |
|---|---|---|---|---|---|---|
| 한국 POI 정확도 | ★★★★★ | ★★★★★ | ★★★ | ★★★★★ | ★★★ | ★★ |
| 한국 도로 데이터 | ★★★★★ | ★★★★★ | ★★★ | ★★★★★ | ★★★★ | ★★ |
| 가격 (한국) | 중 (할인 시 저) | 중 | 고 (USD) | 협의 | 무료 | 무료 (호스팅 별) |
| 외국인 사용성 | 중 (다국어 일부) | 중 | ★★★★★ | 낮음 | 낮음 | 중 |
| SDK 성숙도 | ★★★★ | ★★★★ | ★★★★★ | ★★★ | ★★ | ★★★★ |
| 길찾기 품질 | ★★★★ | ★★★★★ | ★★★ | ★★★★★ | - | △ (외부 라우팅 필요) |
| 다국어 지원 | 한·영 | 한·영 | 모든 언어 | 한국어 위주 | 한국어 | 사용자 정의 |
| 공공데이터 | △ | △ | X | △ | ★★★★★ | △ |
| 상업 라이선스 | O | O | O | 협의 | O (무료) | O |

---

## 11. 출처

### 카카오
- 카카오 디벨로퍼스 — 쿼터: https://developers.kakao.com/docs/latest/ko/getting-started/quota
- 카카오맵 시작: https://developers.kakao.com/docs/latest/ko/kakaomap/common
- 카카오 데브톡 가격 안내: https://devtalk.kakao.com/t/api/135368

### 네이버
- NCP Maps: https://www.ncloud.com/product/applicationService/maps
- Maps JS API v3: https://navermaps.github.io/maps.js.ncp/
- Geocoding API: https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding

### 구글
- Google Maps Platform Pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Pricing Overview: https://developers.google.com/maps/billing-and-pricing/overview

### TMAP
- TMAP API: https://tmapapi.tmapmobility.com/
- TMAP 대중교통: https://transit.tmapmobility.com/
- SK Open API: https://openapi.sk.com/

### VWorld
- VWorld 포털: https://www.vworld.kr/
- 오픈API: https://www.vworld.kr/dev/v4dv_dhapiguide_s001.do

### Mapbox / MapLibre
- Mapbox Pricing: https://www.mapbox.com/pricing
- MapLibre: https://maplibre.org/
- MapTiler: https://www.maptiler.com/

### 좌표계
- EPSG.io: https://epsg.io/
- proj4js: http://proj4js.org/
