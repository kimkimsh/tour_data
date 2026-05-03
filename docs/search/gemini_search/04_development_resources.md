# 관광데이터 활용 웹/앱 개발 필수 리소스 및 가이드

국내 관광데이터를 활용한 웹/앱 서비스 개발 시 필요한 핵심 플랫폼, 링크, 및 권장 아키텍처를 정리한 자료입니다.

## 1. 핵심 데이터 포털 및 가이드 링크
- **공공데이터포털**: [data.go.kr](https://www.data.go.kr/)
  - 인증키 발급 및 모든 공공 API의 중심 포털.
- **한국관광공사 TourAPI 공식 가이드**: [api.visitkorea.or.kr](https://api.visitkorea.or.kr/)
  - Swagger UI 기반으로 브라우저에서 직접 API 파라미터 테스트 가능.
- **한국관광 데이터랩**: [datalab.visitkorea.or.kr](https://datalab.visitkorea.or.kr/)
  - 빅데이터 기반 통계, 트렌드, 혼잡도 지표 조회.

## 2. API 연동 개발 워크플로우
1. **포털 가입 및 API 활용 신청**
   - 공공데이터포털(data.go.kr)에 가입 후 '한국관광공사' 제공 API 검색 후 활용 신청.
   - 발급된 `일반 인증키(Encoding)`와 `일반 인증키(Decoding)` 중 언어/프레임워크의 URL 인코딩 방식에 맞춰 선택 사용.
2. **API 테스트 및 응답 포맷 설정**
   - 기본적으로 XML을 반환하므로 웹 프론트엔드/Node.js 백엔드 개발 시 파라미터로 `&_type=json`을 필수로 추가하여 JSON으로 처리.
3. **목록 -> 상세 계층적 호출 구조 구현**
   - 1차: `areaBasedList` 또는 `locationBasedList`로 지역 내 관광지 목록과 썸네일, `contentId` 확보.
   - 2차: `contentId`를 파라미터로 `detailCommon`, `detailIntro`, `detailImage` API를 호출하여 상세 뷰 구현.

## 3. 권장 기술 스택 (Tech Stack)
### 프론트엔드 (웹)
- **프레임워크**: React (Next.js) 또는 Vue.js (Nuxt.js)
  - SEO 최적화 및 빠른 렌더링을 위해 SSR(서버 사이드 렌더링)을 지원하는 프레임워크 권장. 관광 정보의 특성상 검색엔진 노출이 중요.
- **상태 관리**: React Query 또는 SWR
  - 외부 공공 API를 빈번하게 호출하므로, 캐싱과 재검증(Revalidation)을 쉽게 처리하기 위해 권장.

### 모바일 앱 (크로스 플랫폼)
- **프레임워크**: Flutter 또는 React Native
  - 안드로이드/iOS 동시 출시를 위해 크로스 플랫폼 활용 다수. 위치 기반 서비스(GPS 플러그인) 연동이 필수.

### 백엔드 (API 게이트웨이 / 프록시)
- **프레임워크**: Node.js (Express/NestJS), Spring Boot, Python (FastAPI)
  - 공공데이터포털 API를 프론트엔드에서 직접 호출 시 CORS(Cross-Origin Resource Sharing) 에러 및 인증키 노출 위험이 있음.
  - **필수 아키텍처**: 반드시 자체 백엔드 서버를 프록시로 구축하여 인증키를 서버(`.env`)에 숨기고, 프론트엔드는 자체 백엔드를 호출하도록 설계해야 함.
- **데이터베이스**: PostgreSQL, MySQL, MongoDB
  - 공공데이터 외에 사용자 리뷰, 자체 코스 저장, 찜하기 등의 기능을 위해 필요.

## 4. 유의사항 및 에러 핸들링
- **SERVICE_KEY_IS_NOT_REGISTERED_ERROR**: 인증키 발급 직후 약 1~2시간 동안 동기화 지연으로 발생할 수 있음.
- **이미지 저작권**: `detailImage` 등으로 반환되는 이미지 데이터에는 공공누리 저작권 코드가 포함됨. 서비스 UI상에 출처와 저작권 유형(예: 공공누리 1유형) 표기가 필수적.
- **CORS 이슈 대응**: 개발 환경(localhost)에서는 Vite나 Webpack의 proxy 설정을 사용하고, 운영 환경에서는 백엔드 프록시 서버를 경유하여 CORS 정책을 준수해야 함.
- **호출 트래픽 제한**: 공공 API는 일일 호출 건수 제한(보통 1,000건~10,000건)이 있으므로, 자주 변하지 않는 데이터(지역코드 등)는 자체 DB나 Redis 등에 캐싱(Caching)하여 사용하는 것이 필수.
