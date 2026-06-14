# R3 — 문서 생성 & 오픈 에셋 / Document Generation & Open Assets

> 모두의 백제 (Modu Baekje) — 학교제출 PDF · GPX · 점자(.brf) 생성, AAC/픽토그램/수어 오픈 에셋
> Stack: Next.js + Supabase + Vercel (Seoul, `icn1`) · KWCAG 2.2 · 기능심사 2026-10
> Research date: 2026-06-13 · 모든 버전/라이선스는 1차 출처 확인 (Sources 참조)

---

## 0. TL;DR (의사결정 요약)

| 산출물 | 1차 권장 | 핵심 근거 |
| --- | --- | --- |
| 학교제출 PDF (루브릭/표 레이아웃) | **`@react-pdf/renderer`** (Node 런타임 API Route) | 브라우저 불필요, 서버리스 즉시 동작, ~2–5MB 번들, <500ms 생성. 한글은 **정적 TTF/WOFF + `registerHyphenationCallback`** 으로 줄바꿈 해결 |
| 디자인 충실도가 매우 높은 PDF (선택) | Puppeteer + `@sparticuz/chromium-min` (`puppeteer-core`) | 250MB 함수 한도 내에서만. cold start 0.8–1.5s, 메모리 ≥512MB(권장 1600MB). 기본은 react-pdf, 정 필요 시에만 |
| 기존 PDF 채우기/병합/워터마크 | `pdf-lib` | 새 문서 생성보다 **기존 PDF 편집** 전용. 한글 폰트는 `fontkit` + `@pdf-lib/fontkit` 로 임베드 |
| GPX | **GPX 1.1** 수기 XML 생성 (`trk`/`trkseg`/`trkpt` 또는 `rte`/`rtept`) | 의존성 불필요한 경량 XML. WGS84, metric. `togpx`/`@tmcw/togeojson` 보조 가능 |
| 지도 앱 열기 | **카카오맵 URL Scheme(앱) + map.kakao.com/link(웹)** 주력, 구글맵 cross-platform URL 보조, 네이버는 web `route.nhn` | 카카오맵만 좌표 기반 다중 경유지(vp~vp5) 길찾기 딥링크 지원. 네이버 앱 scheme은 `appname` 필수 |
| 점자 .brf / 유니코드 점자 | **`braillify`** (npm, Apache-2.0, 2024 개정 한국점자규정, WASM) | 100% 오픈소스·온디바이스·서버 불필요. `.brf`는 **Braille ASCII + CR/LF/FF**, 40 cells × 25 lines 관례 |
| AAC 상징 | **ARASAAC** (CC BY-NC-SA 4.0, REST API 13,500+) 주력 / KAAC는 **개인·비상업만 무상** | KAAC(한국형)는 상업/2차가공 금지·이메일 사전협의 필요 → 콘테스트 배포물엔 라이선스 리스크 |
| 픽토그램 (공공안내) | **KS X ISO 7001** (국표원/KSSN) · 다만 **개별 이미지(ai/eps)는 KSA 유료 판매** | 표준 자체는 공공안내 디자인 규범. 무료 SVG는 ISO 7001 기반 오픈셋(예: 위키미디어 PD 셋) 별도 확보 권장 |
| 사회보장/복지 픽토그램 | 보건복지부 「나에게 힘이 되는 복지서비스」 | **공공누리 제2유형 (출처표시 + 상업적 이용금지)** — 비영리 콘테스트 OK, 상업화 시 불가 |
| 알기 쉬운 자료/일러스트 | 한국장애인개발원(KODDI) | **공공누리 제4유형 (출처표시+상업금지+변경금지)** — 변형 불가, 그대로 사용만 |
| 수어 | 국립국어원 한국수어사전 (sldict.korean.go.kr) | 국립국어원 **공공누리(유형 자료별 상이)** — 콘텐츠마다 부착 유형 개별 확인 필수. **임베드/링크 우선** |

> ⚠️ 라이선스 리스크 핵심: KAAC AAC 상징과 KODDI 자료는 **상업적 이용 금지 / 변경 금지** 가 걸려 있음. 콘테스트는 비영리지만 "공모전 출품작의 상업화 가능성"·"2차 가공" 조항에 주의. **ARASAAC + Pretendard(OFL) + KS 표준 픽토그램**처럼 변형·재배포 자유로운 소스를 1차로, 한국 특화 소스(KAAC/KODDI)는 출처표시·원형유지 조건으로 보조 사용 권장.

---

## 1. Next.js/Vercel 한글 PDF 생성

### 1.1 라이브러리 비교 (2025–2026 기준)

| 기준 | `@react-pdf/renderer` | Puppeteer/Playwright (HTML→PDF) | `pdf-lib` | (참고) PDFKit |
| --- | --- | --- | --- | --- |
| 렌더링 방식 | React 컴포넌트 → PDF primitives (Yoga flexbox + PDFKit) | 헤드리스 Chromium이 HTML/CSS 렌더 후 print | 기존 PDF 바이트 편집 | 명령형 좌표 드로잉 |
| 번들/배포 크기 | ~2–5MB | Chromium ~100–300MB (서버리스 한도 압박) | ~1.5MB | ~1–2MB |
| 생성 속도 | <500ms, cold start 없음 | 2–5s, cold start 0.8–1.5s | 빠름 | 빠름 |
| CSS 지원 | flexbox subset (grid·transforms·pseudo 불가, `@media print` 없음) | 전체 CSS3 (Tailwind/MUI OK) | 없음 | 없음 |
| 한글(CJK) | 정적 TTF/WOFF 등록 필요 + 줄바꿈 콜백 | 시스템에 한글 폰트 필요(서버리스 미보장) → `@font-face` 임베드 | fontkit으로 임베드 | 폰트 임베드 |
| Vercel 적합성 | **설정 없이 동작 (Node 런타임)** | `@sparticuz/chromium` 필요·취약 | OK | OK |
| 최적 용도 | **인보이스·증명서·루브릭 등 데이터 기반 정형 문서** | 디자인 그대로 픽셀퍼펙트 | **기존 양식 PDF 채우기/병합** | 좌표 정밀 제어 |

**결론 (R3 학교제출 PDF):** 루브릭·체크리스트·표 중심의 정형 문서 → **`@react-pdf/renderer`**. Vercel serverless에서 추가 인프라 없이 `renderToBuffer`로 메모리 생성 후 `Content-Disposition: attachment` 응답. 디자인 충실도가 절대적으로 필요한 한정된 페이지에만 Puppeteer 분리 고려.

### 1.2 한글 폰트 임베딩 — 함정과 해결

`@react-pdf/renderer`의 한글 처리에는 **두 가지 알려진 함정**이 있고, 1차 GitHub 이슈로 확인됨:

1. **OTF/가변폰트(variable) 미지원.**
   - 공식 폰트 문서: *"only TTF and WOFF fonts files are supported"*, *"OpenType Variable fonts (such as Noto Sans variable weights) does not work properly because PDF 2.0 spec does not support those."*
   - 실제 이슈(#806): Noto Sans KR을 **OTF로 등록하면 깨지고, TTF(예: Nanum Gothic ExtraBold TTF)로는 정상** — 즉 **정적 TTF**로 받아야 함.
   - **권장: Pretendard 정적 TTF** (또는 Noto Sans KR static TTF). 가중치별로 별도 `Font.register({ family, fonts: [{src, fontWeight}, ...] })`.

2. **CJK 줄바꿈(wrap) 오류.** 한글은 단어 경계가 없어 layout 알고리즘이 음절 단위로 쪼개거나 hyphen을 삽입 (이슈 #1568/#1662/#419). 표준 우회:
   ```js
   import { Font } from '@react-pdf/renderer';
   // CJK는 글자 단위로 끊되 hyphen 없이 줄바꿈
   Font.registerHyphenationCallback((word) =>
     Array.from(word).flatMap((char) => [char, ''])
   );
   ```
   - 더 정교하게는 `Intl.Segmenter("ko", {granularity:"word"})` 로 1차 분절 후 콜백 적용.
   - 참고: hyphenation rework PR #3188/#3267/#3268 (2025–2026, carlobeltrame) 이 머지 진행 중 → 향후 버전에서 개선 가능. 현재는 콜백 우회가 안전.

3. **루브릭/표 레이아웃 팁:** grid 미지원이므로 `flexDirection: 'row'` + `flexBasis`/`width %` 로 표 구성. 헤더/푸터 반복은 `<View fixed>`, 페이지 나눔은 `break` prop. 모든 `<Text>`에 `fontFamily` 기본값을 root style로 지정(누락 시 내장 Latin 폰트로 fallback → 한글 깨짐).

### 1.3 폰트 라이선스 (임베딩 가능 여부 = 핵심)

| 폰트 | 라이선스 | 임베드/상업 | 비고 |
| --- | --- | --- | --- |
| **Pretendard** | **SIL OFL 1.1** | 임베드·상업·수정·재배포 OK (폰트 단독 판매만 금지) | 정적 TTF 9 weights + variable. PDF엔 **정적 TTF** 사용 |
| **Noto Sans KR** | **SIL OFL** | 동일 (폰트 단독 판매만 금지, 앱 번들/판매 OK) | static / variable 모두 제공 → **static TTF** 받기 |
| Nanum Gothic | OFL | OK | react-pdf 이슈에서 TTF로 검증된 실사용 사례 |

> 결론: **Pretendard 정적 TTF**를 `@react-pdf/renderer`에 임베드 — OFL이므로 PDF 문서에 폰트를 박아 배포해도 라이선스 문제 없음 (문서는 OFL 적용 대상 아님).

### 1.4 Puppeteer-on-serverless (보조안) 핵심 수치

- 패키지: `puppeteer-core` (prod) + `@sparticuz/chromium-min` 또는 `@sparticuz/chromium`. **표준 `puppeteer`는 250MB 함수 한도 초과**.
- `@sparticuz/chromium` 최신 **149.0.0 (2026-05-27)**. 버전은 puppeteer가 선호하는 Chromium에 맞춰 선택 (예: puppeteer 25.x ↔ chromium 149).
- 메모리 **≥512MB, 권장 1600MB**. Vercel은 read-only FS(`/tmp`만 쓰기) → 런타임 다운로드 금지, `executablePath: await chromium.executablePath()` 필수.
- 한글: `--font-render-hinting=none`, `--disable-dev-shm-usage` args 권장. HTML에 `@font-face`로 폰트 base64 인라인(시스템 폰트 의존 금지).
- Next.js: `serverExternalPackages: ['@sparticuz/chromium']`, `runtime = 'nodejs'`(Edge 불가), `maxDuration` 상향.

---

## 2. GPX 1.1 생성 & 지도 앱 연동

### 2.1 GPX 1.1 스펙 요지

- 네임스페이스: `http://www.topografix.com/GPX/1/1` (불변). 스키마: `http://www.topografix.com/GPX/1/1/gpx.xsd`.
- 규약: **모든 좌표 WGS84, 모든 측정 metric**. 2023-10부터 schema URL이 HTTP→HTTPS 301 리다이렉트(스키마 위치 하드코딩 금지).
- 구조: `<gpx version="1.1" creator="...">` → `metadata` → `wpt`* → `rte`(=`rtept` 순서열) → `trk`(=`trkseg`→`trkpt`). 확장은 `<extensions>`.
- 관광 경로엔 보통 **`rte`/`rtept`** (턴포인트 목록) 또는 단순 **`trk`/`trkseg`/`trkpt`** (경로 점열) 사용. 시간 없는 코스면 `trkpt`에 `ele`/`time` 생략 가능.
- 생성: 외부 의존성 없이 문자열 템플릿으로 충분(좌표는 `wptType`의 `lat`/`lon` 속성). GeoJSON→GPX 변환이 필요하면 `togpx`(mapbox), GPX→GeoJSON은 `@tmcw/togeojson`.

최소 예시 (route):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ModuBaekje"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>백제 역사여행 코스</name></metadata>
  <rte>
    <name>공산성 코스</name>
    <rtept lat="36.4669" lon="127.1247"><name>공산성</name></rtept>
    <rtept lat="36.4592" lon="127.1217"><name>송산리 고분군</name></rtept>
  </rte>
</gpx>
```

### 2.2 지도 앱에서 GPX 경로 "열기" — 현실

> 핵심 제약: **카카오맵/네이버지도/구글맵 모두 임의 GPX 파일을 직접 import해 경로로 그리는 표준 딥링크는 없음.** 실무 패턴은 **(a) 좌표 기반 길찾기 URL Scheme/Web URL로 출발–경유–도착 전달**, 또는 **(b) `.gpx` 파일을 다운로드 제공**(사용자가 등산앱/가민/구글 내 지도 등으로 임포트). 웹앱에선 (a)가 UX 우위.

**카카오맵 (주력 — 좌표·다중경유 길찾기 딥링크 지원, 1차 공식문서):**
- 앱: `kakaomap://route?sp={출발lat,lng}&ep={도착lat,lng}&by={car|publictransit|foot|bicycle}`
- 경유지: `&vp=`, `&vp2=` … `&vp5=` (최대 5개, 대중교통은 경유지 미지원)
- 미설치 시 모바일웹 fallback: `https://m.map.kakao.com/scheme/route?...` (동일 파라미터)
- 단순 링크(웹/PC 공용): `https://map.kakao.com/link/to/{이름},{lat},{lng}`, `https://map.kakao.com/link/map/{lat},{lng}`
- 예: `kakaomap://route?sp=36.4669,127.1247&vp=36.4592,127.1217&ep=36.4550,127.1190&by=foot`

**구글맵 (보조 — cross-platform, 출처: developers.google.com/maps/documentation/urls):**
- `https://www.google.com/maps/dir/?api=1&origin={lat,lng}&destination={lat,lng}&travelmode={driving|walking|bicycling|transit}&waypoints={A}|{B}`
- `api=1` 필수. waypoints는 `|`(=`%7C`)로 구분, 모바일 브라우저 최대 3개·그 외 9개. 좌표 콤마는 `%2C` 인코딩.

**네이버지도 (보조 — 앱 scheme은 `appname` 필수, 웹은 비공식 URL):**
- 앱: `nmap://route/{public|car|walk|bicycle}?...&appname=com.example.app` (네이버 클라우드 Maps URL Scheme 공식문서). `appname` 없으면 동작 안 함.
- 웹(비공식·레거시): 모바일 `http://m.map.naver.com/route.nhn?menu=route&sname=&sx=&sy=&ename=&ex=&ey=&pathType=0`, PC `http://map.naver.com/index.nhn?slng=&slat=&stext=&elng=&elat=&etext=&menu=route` (좌표 X=lng, Y=lat). 신형 `map.naver.com/p/directions/...` 는 내부 인코딩이라 안정적 생성 비권장.

**구현 권고:** 디바이스 감지 → 모바일은 앱 scheme 우선 + 미설치 fallback(타임아웃 후 웹 URL), 데스크톱은 웹 URL. **카카오맵 1차, 구글맵 2차** 버튼 제공. 동시에 `.gpx` 다운로드 버튼을 별도 제공(가민/스트라바/구글 내 지도 등 GPX 임포트 사용자 대응).

---

## 3. 한국 점자 디지털 텍스트 (.brf / 유니코드 점자)

### 3.1 변환 라이브러리 (1차 확인)

| 라이브러리 | 언어/플랫폼 | 라이선스 | 규정 | 상태 | 비고 |
| --- | --- | --- | --- | --- | --- |
| **`braillify`** (dev-five-git) | Rust core → **Node.js / Python / WASM / .NET** | **Apache-2.0** | **2024 개정 한국 점자 규정** | 활발(★140, npm 2.0.1 / 2026-05-26, 의존성 0, WASM 1.4MB) | **온디바이스·오프라인·서버 불필요**, 점역+역점역. **1차 권장** |
| `hanbraille` (delvier) | TypeScript/Node CLI | MIT | 한국 점자(2024 목표, WIP) | 소규모(★1) | 옛한글(ㆁㆆㅿㆍ) 지원, Braille ASCII(`-a`) 출력. 보조 |
| `braille-camp` (campable-io) | Python | — | **2024 개정 수학점자규정** | 활발 | **LaTeX 수식 → BRF/유니코드 점자**. 수식 전용 |
| `kmathbraille` | Python (pip) | MIT | 문체부 고시 2024-5호 | v1.0.1 | LaTeX 수식 점자. 보조 |
| (상용 참고) 점사랑/하상브레일/Brlio API | 폐쇄/API | — | — | — | 소스 비공개·서버 의존 → 오픈/온디바이스 원칙과 불일치 |

> **R3 권장: `braillify` (npm)** — Next.js 서버(Node) 또는 브라우저(WASM) 양쪽에서 외부 API 없이 점역. 2024 개정 규정 기반이라 "기능심사 2026-10" 시점 최신성 확보. 수식이 포함되면 `braille-camp`/`kmathbraille` 보조.

### 3.2 .brf (Braille Ready Format) 생성 규칙 (LoC/BANA/Duxbury 1차)

- **내용:** Plain **Braille ASCII**(North American convention, 64조합) + 공백 + **CR/LF/FF** 제어문자만. 별도 포맷 명령 없음(현행 BRF = Web-Braille/BARD와 동일 포맷).
- **페이지 규격:** 관례 **25 lines/page, 최대 39–40 cells/line** (BANA 2016: 11½″×11″, 25 lines, max 40 cells). 임베서/노트테이커 설정과 일치해야 정확 출력. 페이지 끝은 **Form Feed(FF, 0x0C)**.
- **인코딩 주의:** BRF는 본질적으로 ASCII-braille. 한국 BRF는 미국 Computer Braille Code 매핑과 다를 수 있음 → braillify가 출력하는 **유니코드 점자(U+2800–U+28FF)**를 받아 (1) UTF-8 `.txt`로 화면/스크린리더용 제공, (2) 임베싱이 필요하면 ASCII-braille로 매핑 후 40×25 줄바꿈/FF 삽입하여 `.brf` 생성.
- **검증:** SimBraille 폰트로 `.brf`를 워드프로세서에서 시각 검수 가능. 학교제출용이면 대상 임베서의 cells/line·lines/page를 먼저 확정.

> 실무: braillify → **유니코드 점자 문자열** 획득 → 화면표시/UTF-8 다운로드는 그대로, `.brf` 다운로드는 `Array.from(유니코드).map(→ASCII)` + 라인 wrap(≤40 cells) + 페이지 wrap(25 lines→`\x0C`) 후 ASCII로 저장.

---

## 4. 오픈/재사용 가능 에셋 + 라이선스

### 4.1 AAC 상징 (그림상징)

| 소스 | 규모 | 라이선스 | 콘테스트 적합성 |
| --- | --- | --- | --- |
| **ARASAAC** (아라곤 정부, Sergio Palao) | **13,500+** 픽토그램, 다국어(한국어 포함) | **CC BY-NC-SA 4.0** (출처표시·비상업·동일조건변경허락) | **1차 권장.** REST API(`api.arasaac.org/v1`)로 검색/다운로드(투명 PNG·SVG), 한국어 keyword 지원. 비상업 콘테스트 OK. **상업화 시 불가** |
| **KAAC (한국형 AAC 기본상징, symbol.ksaac.or.kr)** | ~10,000 (한국형 기본상징 체계집) | **저작권 박은혜·김영태·홍기형.** "무단사용·2차가공·배포·상업적 사용 금지" | **개인·비상업만 무상**, 비상업도 `kaacweb@honglab.org` **사전 통지 필요**. 상업=원본의 5%(500개)↑ 배포. **2차가공 금지** → 앱 임베드/변형 리스크 큼 |
| AAC Board Maker (aacmaker.or.kr) | KAAC·손담·알다·커뮤니 등 ~5,000 통합 | 개별 상징별 상이(상당수 CC, KAAC 조건 동일) | 비영리·무료 사용 명시. 단 KAAC 출처 상징은 위 조건 승계 |
| 국립특수교육원 **손담** / 서울시 **커뮤니** | — | 기관별 상이 | aacmaker 경유 사용 가능, 라이선스 개별 확인 |

> 권장: **ARASAAC를 1차**(API 연동, 출처표시 + 비상업 명시), 한국 특화 표현이 꼭 필요할 때만 KAAC를 **출처표시·원형유지·사전통지** 조건으로 보조. 콘테스트 산출물이 비영리임을 README/푸터에 명시.

### 4.2 픽토그램 (공공안내)

| 소스 | 라이선스/비용 | 비고 |
| --- | --- | --- |
| **KS X ISO 7001** (공공안내 그래픽심볼, 국표원) | **표준 자체는 디자인 규범**. 개별 이미지(ai/eps)는 **한국표준협회 KSSN에서 유료 판매** | 관광안내지도 제작 가이드(문체부)가 KS 표기 준수를 원칙으로 제시. 표준 형태를 따르되, 무료 벡터는 별도 확보 |
| ISO 7001 기반 **오픈 픽토 셋** (예: 위키미디어 PD/공항·표지 SVG) | PD/CC 다양 | KS 유료 회피용. 셋별 라이선스 개별 확인 |
| **보건복지부 「나에게 힘이 되는 복지서비스」** (사회보장 안내) | **공공누리 제2유형 (출처표시 + 상업적 이용금지)** | 2024/2025판 PDF·HWPX 공개. "공공 목적 외 상업·판매 불가", 자체제작은 가능(원고는 사회보장총괄과 문의) |

### 4.3 한국장애인개발원(KODDI) — 알기 쉬운 자료/일러스트

- 기관 기본 정책: **공공누리 제4유형 (출처표시 + 상업적 이용금지 + 변경금지)**.
- 「2023 장애인식개선 일러스트 56종」(jpg+키워드 xlsx), 「장애인에티켓 인포그래픽」, 「나는 발달장애인입니다」(공공누리 4유형) 등 다운로드 제공.
- **제약:** 변형 금지(원형 유지), 비상업만, 디자인 소스 제공 안 함. → "알기 쉬운 자료"로 **그대로 삽입**만 가능, 리디자인 불가.

### 4.4 수어 — 국립국어원 한국수어사전 (sldict.korean.go.kr)

- 국립국어원 자료는 저작권법 §24-2(공공저작물 자유이용) 기반, **공공누리 유형을 자료별로 부착**(제0~제4유형 + AI유형 혼재). **콘텐츠마다 부착 유형 개별 확인 필수** — 일괄 "자유이용" 단정 금지.
- 수어 영상/이미지를 직접 다운로드·재배포하기보다 **공식 사전 페이지 임베드/딥링크**가 안전(분기별 수정본 갱신: 2026 1분기까지 업데이트 확인).
- 출처표시 예: "본 저작물은 국립국어원에서 제○유형으로 개방한 '한국수어사전'을 이용하였습니다."

---

## 5. 공공누리 유형 빠른 참조 (라이선스 매트릭스)

| 유형 | 출처표시 | 상업적 이용 | 변형(2차저작) | 본 프로젝트 영향 |
| --- | --- | --- | --- | --- |
| 제1유형 | ✅ | ✅ | ✅ | 자유 |
| 제2유형 (복지부 복지서비스) | ✅ | ❌ | ✅ | 비영리 OK, **상업화 불가** |
| 제3유형 | ✅ | ✅ | ❌ | 변형 불가 |
| **제4유형 (KODDI 기본)** | ✅ | ❌ | ❌ | 비영리·**원형 그대로만** |
| AI유형 | ✅(조건) | ✅ | ✅ | AI 학습 가능 |

> 콘테스트(비영리·교육) 범위에서 제2/제4유형 자료는 **출처표시**하면 사용 가능하나, **상업적 전환·디자인 변형**은 막힘. 변형이 필요한 픽토/AAC는 **OFL/CC-BY/CC-BY-NC-SA(ARASAAC)** 소스를 우선.

---

## 6. R3 구현 권고 (정리)

1. **PDF:** `@react-pdf/renderer` + **Pretendard 정적 TTF**(OFL) 임베드 + `registerHyphenationCallback`(CJK 글자단위, no-hyphen). Node 런타임 API Route에서 `renderToBuffer` → attachment. 디자인 충실도 필수 페이지만 별도 Puppeteer(`@sparticuz/chromium-min`) 분리.
2. **GPX:** GPX 1.1 XML 직접 생성(WGS84/metric). `.gpx` 다운로드 + **카카오맵(좌표 길찾기 scheme, vp 경유지) 1차 / 구글맵 cross-platform URL 2차** 버튼. 네이버는 앱 scheme(`appname`) 또는 레거시 web `route.nhn` 보조.
3. **점자:** `braillify`(npm, Apache-2.0, 2024 개정 규정, WASM)로 점역 → 유니코드 점자 UTF-8 다운로드 + 40cells×25lines·FF 규칙으로 `.brf` 생성. 수식은 `braille-camp`/`kmathbraille`.
4. **에셋:** **ARASAAC(CC BY-NC-SA, API)** + **KS ISO 7001 규범 준수 픽토** + **Pretendard(OFL)** 를 변형 가능한 1차 세트로. KAAC·KODDI·복지부·국립국어원 수어는 **출처표시·원형유지·비상업** 조건으로 보조, 비영리 명시. 각 에셋 출처/라이선스 표를 산출물 푸터·문서에 기재.

---

## Sources

### PDF generation
- Puppeteer vs react-pdf 비교(2026): https://iurii.rogulia.fi/blog/pdf-generation-puppeteer-vs-react-pdf
- DEV 프로덕션 비교(2026-05): https://dev.to/iurii_rogulia/pdf-generation-on-the-server-puppeteer-vs-react-pdfrenderer-a-production-comparison-44cg
- pdf4.dev 비교(2026-05): https://pdf4.dev/blog/convert-react-component-to-pdf
- React-PDF + Next.js 15(2026-04): https://noqta.tn/en/tutorials/react-pdf-nextjs-generate-invoices-documents-2026
- ResumeLens (pdfkit/puppeteer/react-pdf/pdf-lib): https://www.resumelens.org/blog/nodejs/nodejs-pdf-generation
- React-pdf 공식 Font 문서(TTF/WOFF만, variable 불가): https://react-pdf.org/fonts
- 이슈 #806 Korean font (OTF 실패/TTF 성공): https://github.com/diegomura/react-pdf/issues/806
- 이슈 #862 Korean not rendered: https://github.com/diegomura/react-pdf/issues/862
- 이슈 #1568 한국어 줄바꿈 콜백: https://github.com/diegomura/react-pdf/issues/1568
- 이슈 #1662 CJK Wrap Error: https://github.com/diegomura/react-pdf/issues/1662
- 이슈 #419 Japanese hyphenation off(콜백 패턴): https://github.com/diegomura/react-pdf/issues/419
- Vercel KB: Deploying Puppeteer with Next.js(2025-11): https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel
- @sparticuz/chromium npm(149.0.0, 2026-05): https://www.npmjs.com/package/@sparticuz/chromium
- Vercel 500 Chromium 토론(2026-03): https://github.com/vercel/next.js/discussions/91204
- next.js #69127 (@sparticuz/chromium external): https://github.com/vercel/next.js/pull/69127

### Fonts
- Pretendard LICENSE (OFL 1.1): https://github.com/orioncactus/pretendard/blob/main/LICENSE
- Pretendard repo/README(OFL, 상업·수정·재배포 가능): https://github.com/orioncactus/pretendard
- @fontsource/pretendard (OFL-1.1): https://www.npmjs.com/package/@fontsource/pretendard
- Noto 사용/라이선스(OFL, static vs variable): https://notofonts.github.io/noto-docs/website/use/

### GPX & maps
- GPX 1.1 공식 스키마: http://topografix.com/GPX/1/1/
- GPX 개요/스키마 상태(2023 HTTP→HTTPS): https://www.topografix.com/gpx.asp
- GPX for developers(namespace/schemaLocation): https://www.topografix.com/gpx_for_developers.asp
- 카카오맵 URL Scheme(Android, route sp/ep/vp/by): https://apis.map.kakao.com/android_v2/docs/api-guide/urlscheme/
- 카카오맵 URL Scheme(iOS): https://apis.map.kakao.com/ios_v2/docs/getting-started/urlscheme/
- Google Maps URLs(get-started, dir/?api=1&waypoints): https://developers.google.com/maps/documentation/urls/get-started
- Google Maps iOS URL scheme: https://developers.google.com/maps/documentation/urls/ios-urlscheme
- NAVER Cloud Maps URL Scheme(appname 필수): https://guide.ncloud-docs.com/docs/en/maps-url-scheme
- 네이버/카카오 길찾기 web URL 레거시(route.nhn): https://landzz.com/125
- 네이버지도 신형 URL 사례: https://dev.aporia.blog/board_fKje48/54503

### Braille
- braillify GitHub(Apache-2.0, 2024 개정 규정, WASM): https://github.com/dev-five-git/braillify
- braillify npm(2.0.1, deps 0): https://www.npmjs.com/package/braillify
- braillify crates.io: https://crates.io/crates/braillify
- braillify.kr: https://braillify.kr/
- hanbraille GitHub(MIT, 옛한글, Braille ASCII): https://github.com/delvier/hanbraille
- braille-camp(LaTeX→BRF, 2024 수학점자규정): https://github.com/campable-io/braille-camp
- kmathbraille(MIT, 문체부 고시 2024-5): https://pypi.org/project/kmathbraille/
- BRF 포맷(LoC Digital Preservation, 25 lines/39 cells): https://www.loc.gov/preservation/digital/formats/fdd/fdd000551.shtml
- Braille ASCII(Wikipedia, CR/LF/FF): https://en.wikipedia.org/wiki/Braille_ASCII
- BANA 2016 Formats §1.7(25 lines, max 40 cells): https://brailleauthority.org/formats/2016manual-web/section01.html
- Duxbury BRF 문서(cells/line·lines/page 일치): https://www.duxburysystems.com/documentation/dbt12.7/Content/miscellaneous/brf_files.htm

### Open assets & licenses
- ARASAAC 메인: https://arasaac.org/index.html
- ARASAAC API(v1 REST, OAS3): https://arasaac.org/developers/api
- ARASAAC Global Symbols(CC BY-NC-SA 4.0): https://globalsymbols.com/symbolsets/arasaac?locale=en
- KAAC Symbols 소개/라이선스(symbol.ksaac.or.kr): http://symbol.ksaac.or.kr/introduction.jsp
- KAAC 검색 시스템: http://symbol.ksaac.or.kr/
- AAC Board Maker 플랫폼: https://www.aacmaker.or.kr/symbolpage
- KS S ISO 7001 표준 상세(e나라 표준인증): https://standard.go.kr/KSCI/standardIntro/getStandardSearchView.do?ksNo=KSSISO7001
- KSSN 공공안내심볼(ai/eps 유료): https://www.kssn.net/ks/symlist.do
- 국가기술표준원 공공안내 그래픽 심볼: https://www.kats.go.kr/content.do?cmsid=82
- 보건복지부 2025 복지서비스(공공누리 제2유형): https://www.mohw.go.kr/board.es?act=view&bid=0019&list_no=1487005&mid=a10411010100
- 보건복지부 2024 복지서비스: https://www.mohw.go.kr/board.es?act=view&bid=0019&list_no=1481372&mid=a10411010100
- KODDI 저작권 정책(공공누리 제4유형): https://www.koddi.or.kr/etc/sitemap_copyright_policy.jsp
- KODDI 2023 장애인식개선 일러스트 56종(제4유형): https://www.koddi.or.kr/data/edu_bbs01_view.jsp?brdNum=7416815&brdTp=EDU04
- 국립국어원 저작권 정책(공공누리 유형별): https://www.korean.go.kr/front/nuri/pageView.do?mkn=3&page_id=P000189
- 국립국어원 한국수어사전: https://sldict.korean.go.kr/
