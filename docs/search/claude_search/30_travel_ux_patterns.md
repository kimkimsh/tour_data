# 30. 여행 UX 패턴 — 일정 빌더 / 위치 추천 / 가이드 / 번역 / 회상 서비스 분석

> 본 문서는 국내·해외 주요 여행 서비스의 UX 패턴을 사실 기반으로 묘사한다. 각 서비스의 핵심 화면 구성·인터랙션·데이터 모델을 정리하되, "이런 UX가 좋다"는 의견은 배제한다.

---

## A. 여행 일정 빌더 (Itinerary Builder)

### A-1. 트리플 (Triple) — 인터파크트리플 (구 야놀자 인수)
- 공식: https://triple.guide
- 한국 OTA·여행 슈퍼앱. 「가이드북 + 일정」을 통합한 패턴이 시그니처.
- **주요 화면**:
  - 도시 단위 「가이드북」 — 가볼 만한 곳/먹거리/쇼핑/숙소 카테고리 큐레이션, 사진 카드 + 평점.
  - 「내 일정」 — 일자별 타임라인. 항공·숙소 자동 import (이메일 연동/예약번호 입력), 관광지 카드 드래그 추가.
  - **타임라인 자동 동선 그리기** — 같은 일자에 추가된 장소들 사이 거리/시간 자동 계산.
  - 「일정에 추가」 버튼이 모든 POI 카드에 노출 → 가이드북에서 일정으로 1탭 전환.
  - 「실시간 환율」 위젯, 「현지 정보」(전기/시차/물가) 위젯.
- **데이터 모델 추정**: 일정 = `{day_n: [{poi_id, scheduled_time?, transport_to_next?, memo}], hotel_id, flight_id}`.

### A-2. 마이리얼트립 (MyRealTrip)
- 공식: https://www.myrealtrip.com
- **주요 패턴**:
  - 「투어/티켓」을 코어로 — 가이드 동행 투어 예약이 메인 인벤토리.
  - 「항공+호텔+투어」 묶음 추천.
  - 일정 빌더는 트리플 대비 약하며, 「장바구니」형 예약 흐름이 강함.
  - 도시별 「베스트 투어 TOP 10」 리스트 + 검색 필터(언어/시간/그룹규모/픽업 여부).
  - 가이드/판매자 프로필 페이지 (별점, 리뷰, 진행 횟수).

### A-3. Wanderlog
- 공식: https://wanderlog.com
- **주요 패턴**:
  - **지도 좌측, 일정 리스트 우측의 2-pane 레이아웃**(웹).
  - 「Trip → Days → Places/Notes/Reservations」 트리.
  - 협업: URL 공유 → 동시 편집 (Google Docs 스타일).
  - **자동 경로 그리기**: 같은 day의 장소를 시간/거리 기준 정렬, 운전·도보·대중교통 옵션.
  - **모바일 오프라인** — 지도 타일·일정 다운로드, 비행기 모드 사용.
  - **Import**: 구글 지도 「내 장소」 / 타사 일정 / 이메일 예약 자동 파싱.
  - **Budget tracker** — 1인/총액, 카테고리별, 환율.
  - **Packing list** 내장.

### A-4. Roam Around / Roam
- 공식: https://www.roamaround.io
- **패턴**:
  - LLM 기반 "도시명+일수" 입력 → 자동 일정 생성.
  - 결과는 일별 카드(시간·장소·간단 설명) 형태.
  - 이후 사용자가 카드 추가/삭제로 편집.
  - 데이터: GPT-3.5/4 + Google Places 보강.

### A-5. Wonderplan (구 Wonderplan.ai)
- 공식: https://wonderplan.ai
- **패턴**:
  - 챗 UI + 일정 카드 분할 화면.
  - 예산/관심사/숙소위치 입력 → AI 일정 → 「장소 교체」, 「하루 추가」 버튼으로 인터랙티브 수정.

### A-6. Mindtrip
- 공식: https://mindtrip.ai
- **패턴**:
  - 채팅 기반 — 사용자 질문에 카드(호텔/액티비티/식당) 응답.
  - 카드 → 「Save to trip」 → 우측 일정 패널에 누적.
  - 호텔/항공 메타서치 통합 (Booking, Expedia 가격 비교).

### A-7. Layla (구 Bebot, AI 챗봇 여행)
- 공식: https://www.justlayla.com
- 챗 + 카드 + 지도 hybrid. 인스타 릴 영상 임베드.

### A-8. Kayak Trips
- 공식: https://www.kayak.com/trips
- 이메일 예약 자동 파싱(이메일 주소 trips@kayak.com으로 포워딩) → 일정 자동 구성.

### A-9. TripIt (Concur)
- 공식: https://www.tripit.com
- **이메일 포워딩 → 자동 파싱**의 원조. 항공·호텔·렌터카 confirmation 메일을 분석하여 일정 자동 생성.
- TripIt Pro: 항공 지연·게이트 변경 알림, 보너스 마일 추적.

### A-10. Google Travel / Trips
- 공식: https://www.google.com/travel
- Gmail에서 자동 추출된 호텔/항공권을 「Reservations」에 자동 정렬.
- 「Things to do」 — 도시별 카테고리 큐레이션.
- 호텔/항공 메타서치 + 호텔 가격 인사이트(예측).

### A-11. Notion / Heyday / Arc Tour 일정 템플릿
- Notion 여행 일정 템플릿 다수 — 데이터베이스(장소) + 캘린더 뷰 + 갤러리 뷰.

### A-12. 한국 일정 앱
- **여기어때 / 야놀자**: 일정보다는 예약 중심. 예약 후 「내 여행」 카드.
- **트리플** (위 A-1).
- **여행대잔치, 트래블월렛(여행+카드 결제)** 등 결제·환전 부가 앱.
- **마이리얼트립** + 트리플 인수 (인터파크트리플) 후 통합 단계.

### A-13. 일정 빌더 — 공통 인터랙션 패턴
- **드래그 앤 드롭** 일정 카드 재정렬 (react-dnd, dnd-kit, react-beautiful-dnd).
- **타임라인 vs 리스트 vs 지도** 뷰 토글.
- **자동 동선 최적화** (TSP 변형, OR-Tools).
- **이동시간 자동 계산** + transport 모드 선택(도보/대중교통/자동차).
- **다인 협업** — 실시간 편집(CRDT/Yjs) 또는 코멘트.
- **공유 링크** — 읽기/편집 권한 분리.
- **PDF/이미지 export** + 「오프라인 모드」.

---

## B. 위치 기반 추천 / 「내 주변」 UX

### B-1. Foursquare / Swarm
- 공식: https://foursquare.com (현재는 B2B 위치 데이터에 집중, 컨슈머 앱 축소)
- 과거 시그니처: 「Tip」(짧은 메모) + 「Check-in」.
- 카테고리(약 1,000여 개) + 시간대별 인기.
- "근처 음식점/카페/명소" 카테고리 칩.

### B-2. Google Maps "주변"
- 음식점/카페/관광명소/주유소/약국 등 카테고리 칩 → 지도+리스트.
- 영업시간/혼잡도 시간대 그래프(Popular Times) — Google 자체 위치 히스토리 집계.
- 평점 4.5+ 필터, 가격대($-$$$$) 필터.

### B-3. 네이버 지도 "내 주변"
- 카테고리(맛집/카페/숙박/관광/생활편의/병원약국 등) 일괄 노출.
- 「예약·웨이팅 가능」, 「영업중」, 「방문자 리뷰 평점순」 정렬.
- 「라이브 톡」(실시간 매장 문의), 「예약」(테이블링/캐치테이블 연동).

### B-4. 카카오맵 "주변"
- 비슷한 카테고리 구조.
- 「카카오T」 택시·대리 호출 통합.

### B-5. 「캐치테이블」, 「테이블링」, 「야놀자식당」
- 실시간 웨이팅, 예약, 매장 혼잡도.

### B-6. Yelp Nearby
- 미국 중심. 한국 데이터 빈약.

### B-7. Atlas Obscura
- 공식: https://www.atlasobscura.com
- 「숨은 명소」 데이터베이스. 도시별 큐레이션 리스트(상위 30~100개).
- 위치 기반 필터.

---

## C. 오디오 가이드 / 가이드북

### C-1. Atlas Obscura
- 위 참조. 텍스트 가이드 위주, 일부 트립(가이드 동행 유료).

### C-2. Detour (Bose에 인수, 서비스 종료) → Bose AR
- 위치 기반 자동 트리거 오디오 가이드.

### C-3. GuideTones (TimeOut, Lonely Planet 등)
- Lonely Planet Guides — PDF/eBook 가이드북.

### C-4. GPSmyCity
- 공식: https://www.gpsmycity.com
- 700+ 도시 「Self-Guided Walking Tour」 — 스마트폰 GPS로 코스 따라가기. 무료/유료.

### C-5. izi.TRAVEL
- 공식: https://izi.travel
- 박물관/도시 무료 오디오 가이드 플랫폼. 누구나 가이드 제작 업로드.

### C-6. VoiceMap
- 공식: https://voicemap.me
- 현지 작가/저널리스트가 만든 오디오 워킹 투어. GPS 자동 트리거.

### C-7. Rick Steves Audio Europe
- 공식: https://www.ricksteves.com/watch-read-listen/audio/audio-tours
- 무료 유럽 오디오 투어 (Rick Steves 본인 내레이션).

### C-8. 한국 오디오 가이드
- **「오디오가이드 큐피커(Qpicker)」** — 박물관·미술관·궁궐 오디오. https://qpicker.com
- **「데일리호텔/야놀자 시티가이드」** — 일부 도시 콘텐츠.
- **국립중앙박물관, 국립현대미술관 자체 앱** — 작품별 오디오/영상.
- **문화재청 「우리궁궐가이드」 앱**.
- **한국관광공사 「Visit Korea」 앱** — 일부 가이드 콘텐츠.
- **「e뮤지엄」**(한국문화정보원) 박물관 통합.

### C-9. 오디오 가이드 — 공통 UX 패턴
- 지도 + POI 핀, 핀에 가까워지면 자동 재생 또는 「재생」 버튼 탭.
- 백그라운드 재생, 헤드폰 친화 컨트롤.
- 다국어 트랙 선택.
- 다운로드 후 오프라인 재생.
- 챕터 스킵 / 진행률 / 캡션.

---

## D. 체크리스트 / 패킹 리스트 UX

### D-1. PackPoint
- 공식: https://www.packpnt.com
- 도시·날짜·활동(비즈니스/등산/수영) 입력 → 날씨 API 결합 → 자동 체크리스트.

### D-2. PackKing, Packr, Travel List
- 유사 — 카테고리(의류/세면/전자기기/서류) + 사용자 정의 추가.

### D-3. Wanderlog Packing
- 일정 빌더 안에 packing list 탭 통합.

### D-4. Notion / Apple Reminders / Google Keep
- 사용자 제작 템플릿. 단순 체크박스.

### D-5. 공통 패턴
- 카테고리 그루핑 (의류/위생/의료/전자/서류).
- 시즌·여행 유형별 템플릿.
- 「checked count / total」 진행률.
- 가족·동행자별 분리.

---

## E. 번역 / 통역 UX

### E-1. Google Translate
- 텍스트 입력, **카메라 번역(AR 오버레이)** — 메뉴판/표지판 실시간.
- **대화 모드** — 두 언어 자동 전환 듣기/말하기.
- **오프라인 언어팩** 다운로드.

### E-2. Naver Papago
- 공식: https://papago.naver.com
- 텍스트/이미지/음성/대화 모드.
- 한국어 ↔ 13개 언어 (영/중간/중번/일/스/프/독/러/베/태/인/이/포/아).
- 글로벌 회화 핸드북, 단어장.
- API: NCP Papago Translation/OCR/STT/TTS.

### E-3. DeepL
- 공식: https://www.deepl.com
- 유럽 언어 번역 품질로 정평. 한국어 지원 추가됨.
- 데스크톱 앱 단축키 번역.

### E-4. Microsoft Translator
- 멀티 디바이스 「대화」 — 여러 명이 각자 언어로 동시 통역.

### E-5. 「플리토 (Flitto)」 / 「말해보카」
- 한국 발 번역·언어학습.
- 플리토는 인간 번역 크라우드소싱 + AI.

### E-6. iOS / Android 시스템 번역
- iOS Translate 앱 + 시스템 단축어.
- Android Live Translate (Pixel).
- Apple Vision Pro / Galaxy AI 「실시간 통역」 통화 (2024+).

### E-7. 번역 UX 공통 패턴
- 입력 모드 토글: 텍스트 / 음성 / 이미지(카메라) / 대화.
- 「사진 찍기」 → OCR → 원문 영역에 번역 오버레이 (Google Lens 스타일).
- 즐겨찾기 / 히스토리 / 단어장.
- 음성 출력 + 현지인에게 보여주기 「큰 글씨 모드」.

---

## F. 여행 후 회상 / 기록 / 공유 UX

### F-1. Polarsteps
- 공식: https://www.polarsteps.com
- GPS 자동 트래킹 → 여행 동선 지도 + 일별 사진/메모.
- **여행 후 「인쇄책(travel book)」** 자동 디자인 → 종이 책 주문.

### F-2. Day One Journal
- 공식: https://dayoneapp.com
- 일기 앱. 위치/날씨/사진 자동 메타. 여행 일기 사용자 다수.

### F-3. Journi
- 공식: https://journi.com
- 여행 일기 + 사진북 인쇄.

### F-4. Findpenguins
- 공식: https://findpenguins.com
- 여행 블로그 + 지도 트랙.

### F-5. Apple 「추억 (Memories)」 / Google Photos 「하이라이트」
- 사진 라이브러리에서 위치·시간 클러스터링 → 자동 「2024년 8월 부산」 앨범 + 음악 슬라이드쇼.

### F-6. Instagram Travel Map (구 「Map」)
- 공식 별도 기능 종료, Reel/Story로 대체.

### F-7. 한국 — 「여행지도」, 「여행스케치」
- 「여행지도」 — 다녀온 여행지 지도 색칠.
- 「트래블맵 (Travel Map)」 한국·세계 색칠.
- **「Visit Korea」 앱 「내 여행 기록」**.

### F-8. 회상/공유 공통 패턴
- 자동 GPS 트랙 + 사진 EXIF 위치 → 지도 위 핀.
- 일별 카드(자동 생성된 캡션 + 사진).
- 「공유 링크」, 「PDF/사진북 인쇄」.
- 「방문국가/도시 카운트」 (예: "32개국 방문").

---

## G. 인앱 결제 / 환전 / 페이먼트

### G-1. 트래블월렛 / 트래블로그(하나카드) / 트래블페이(신한카드) / 토스 외화통장
- 한국 → 외화 환전 + 해외 결제 무료/저렴 수수료 카드 + 앱.
- 환율 차트, 환전 알림, 다중 통화 지갑.

### G-2. Wise (구 TransferWise)
- 다중 통화 계좌, 실시간 환율, 해외 송금.

### G-3. Revolut
- 유럽 발 다중 통화 + 카드.

### G-4. 인앱 결제 패턴
- Apple Pay / Google Pay / Samsung Pay 지원.
- 다중 통화 표시 (지역 자동 감지).
- 결제 직전 환율 표시 + 「내 카드로 얼마」.

---

## H. 항공/숙박/이동 통합

### H-1. 메타서치 (가격 비교)
- **Skyscanner, Kayak, Hopper, Google Flights, Trip.com (씨트립), Kiwi** — 항공.
- **Booking, Hotels.com, Agoda, Expedia, Trivago** — 숙박.
- **Rome2Rio** — 모든 교통수단(비행/기차/버스/페리/택시/도보) 비교. https://www.rome2rio.com
- **Omio (구 GoEuro)** — 유럽 다모드 교통.

### H-2. 한국 OTA
- 야놀자, 여기어때, 호텔스닷컴, 마이리얼트립, 트리플, 데일리호텔, 인터파크투어, 노랑풍선, 하나투어, 모두투어.

### H-3. 모빌리티 — 한국
- **카카오T** (택시/대리/주차/내비/항공권/철도/버스/렌터카).
- **티맵 모빌리티** (내비, 대중교통, 카카오T 경쟁).
- **우티 (Uber 합작)**.
- **레일플러스 / KORAIL TALK** — 기차.
- **티머니 GO** — 시외/고속버스/택시/공항버스/킥보드.
- **따릉이/타슈/타바라/누비자/어울링** — 공공자전거.
- **카카오모빌리티 KAKAO MAP API** — POI/지도.

### H-4. 모빌리티 — 글로벌
- Uber, Lyft, Bolt, Grab, Gojek, Didi, Cabify.
- 기차: Trainline (유럽), Rail Europe, Voyages SNCF, Deutsche Bahn, Trenitalia.
- 페리: Direct Ferries.

---

## I. 접근성 / 다국어 / 외국인 UX

### I-1. 외국인 한국 여행 슈퍼앱
- **Visit Korea** (KTO 공식) — 다국어, 가이드/관광지/축제.
- **Creatrip** (https://www.creatrip.com) — K-pop·뷰티 중심 외국인 가이드.
- **KKday, Klook** — 한국 액티비티 외국인 마켓.
- **Trazy** — 한국 액티비티 영문.
- **NAMUWIKI / Korea4Expats** 등 정보.

### I-2. 다국어 i18n 기술
- **i18next (React/Vue 등)** https://www.i18next.com
- **react-intl (FormatJS)** https://formatjs.io
- **next-intl** (Next.js App Router) https://next-intl-docs.vercel.app
- **lingui** https://lingui.dev
- **vue-i18n** https://vue-i18n.intlify.dev
- ICU MessageFormat 표준.
- TMS (번역 관리): **Lokalise, Crowdin, Phrase, POEditor, Transifex, Locize**.

### I-3. RTL (아랍어/히브리어) 처리
- HTML `dir="rtl"`, CSS `logical properties` (`margin-inline-start` 등).
- React: `react-with-direction`, Tailwind `rtl:` variant.

### I-4. 단위/통화/날짜 — 외국인 대상
- ICU `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`.
- 환율: ECB, openexchangerates.org, 한국은행 통계.
- 거리: km/mi, 온도: °C/°F, 통화: 자동 IP/언어 감지 + 사용자 선택 우선.

---

## J. 무장애 / 시니어 / 반려동물 동반

### J-1. 한국관광공사 「열린 관광지」 / 「무장애관광」
- **「대한민국 구석구석」 무장애 여행 카테고리** — https://korean.visitkorea.or.kr → 「테마여행 → 무장애 여행」.
- **무장애 관광지도** (KTO) — 휠체어/시각장애/청각장애 접근 정보.
- **장애인 콜택시** 지자체별.
- **국립공원 무장애 탐방로** — 국립공원공단.

### J-2. 글로벌 무장애 관광
- **Wheelmap.org** — OSM 기반 휠체어 접근성. https://wheelmap.org
- **AccessNow** — 글로벌 휠체어 친화 장소.
- **AbleRoad** — Yelp 통합 접근성 평점.
- **TripAdvisor「Accessibility」 필터**.
- **Google Maps「휠체어 가능 입구」 속성**.

### J-3. 시니어 UX 표준
- 큰 글씨/대비비, 단순 네비게이션, 음성 안내 강화.
- 한국: 「시니어 친화 디자인 가이드」 (KISA), WCAG 2.2 AA 준수.

### J-4. 반려동물 동반
- **「반려in (반려펫)」, 「펫츠고」, 「띵펫」** — 반려동물 동반 가능 시설 검색.
- 「Visit Korea」 앱 일부 카테고리.
- 글로벌: **BringFido** https://www.bringfido.com

### J-5. WCAG 표준
- WCAG 2.2 (W3C 2023.10) — 인지·시각·청각·운동.
- 한국 KWCAG 2.2 (한국 웹 접근성 지침).
- WAI-ARIA, 키보드 네비, alt text, 캡션, 색대비 4.5:1, 포커스 표시.

---

## K. 일정 빌더 — 데이터 모델 패턴 (참조용)

```
Trip {
  id, title, destination_city, start_date, end_date,
  members: [User], budget_total, currency,
  Days: [
    Day {
      date, transport_legs: [Transport], 
      Items: [
        Item { type: 'place'|'note'|'reservation',
               poi_id?, time_start?, time_end?, 
               cost?, transport_to_next?, memo, photos:[] }
      ]
    }
  ],
  Reservations: [Flight|Hotel|Car|Activity],
  Documents: [PDF|Image],
  PackingList: [Item],
  Expenses: [Expense]
}
```

이 형태가 Wanderlog/TripIt/Triple 등에서 공통적으로 관찰되는 구조.

---

## L. 일정 자동화 — AI/LLM 통합 패턴

| 패턴 | 사례 | 기술 |
|---|---|---|
| 챗 → 일정 생성 | Mindtrip, Wonderplan, Layla, Roam Around | GPT-4o + Google Places + 함수 호출 |
| 일정 → 자연어 설명 | Google Travel "Summary" | LLM summarization |
| 「장소 교체」 인터랙션 | Mindtrip, Wonderplan | 컨텍스트 유지 multi-turn |
| 사진/영상 → 추천 | Pinterest Lens, Layla 인스타 임포트 | CLIP/multi-modal |
| 음성 입력 | ChatGPT Voice, Google Maps 음성 | Whisper + LLM |

---

## M. 협업 편집 (다인 일정)

- 실시간 동기화: WebSocket, Yjs (CRDT, https://yjs.dev), Liveblocks (https://liveblocks.io), Automerge.
- 권한: 보기/편집/관리자, 링크 공유 토큰.
- 코멘트: 항목별 댓글 스레드 (Notion/Wanderlog).
- 투표: Google Travel 그룹 — 멤버별 「가고 싶음」 투표 카운트.

---

## N. 알림 / 컨텍스트 인식

| 트리거 | 패턴 |
|---|---|
| 출국 D-day | 푸시 「내일 출발입니다 — 짐싸기 진행률 80%」 |
| 비행 지연 | TripIt Pro / Hopper 항공 데이터 연동 |
| 게이트 변경 | 동상 |
| 도착 후 | 「공항에서 호텔까지 권장 경로」 |
| 위치 기반 | 「100m 이내 카페 3곳」 |
| 날씨 변동 | 「오후 비 예보 — 실내 코스로 변경」 |
| 환율 알림 | 「설정 환율 도달」 |

---

## O. 한국 관광 컨텍스트 — 공식 슈퍼앱/포털

| 서비스 | 운영 | 주요 기능 |
|---|---|---|
| **Visit Korea (한국관광공사)** | KTO | 다국어 가이드, 축제, 추천 코스, AR 스탬프 |
| **대한민국 구석구석** | KTO | 한국어 종합 정보 |
| **데일리코리아 (Korea.net)** | KOCIS | 영문 한국 정보 |
| **KORAIL TALK** | 한국철도공사 | 기차표 |
| **국립공원공단 모바일** | KNPS | 탐방·예약·산행정보 |
| **카카오T / 티맵** | 카카오모빌리티 / SKT | 모빌리티 슈퍼앱 |
| **트리플 / 마이리얼트립** | 인터파크트리플 | 종합 여행 |

---

## P. 핵심 요약

1. **일정 빌더**의 공통 시그니처: 도시 가이드북 → 카드 → 「내 일정 추가」 → 일별 타임라인 → 자동 동선/이동시간 → 협업 공유.
2. **2-pane(지도+리스트)**가 데스크톱 표준 (Wanderlog, Google Travel).
3. **Triple/Wanderlog/TripIt**은 이메일/예약번호 자동 파싱이 핵심 진입 트리거.
4. **AI 일정 생성**(Mindtrip, Wonderplan, Roam, Layla)은 챗 UI + 카드 + 인터랙티브 편집의 3 요소가 표준화.
5. **「내 주변」**은 카테고리 칩 + 영업중·평점 필터 + 시간대 혼잡도(Google) 또는 예약/웨이팅(네이버) 위젯.
6. **오디오 가이드**(VoiceMap/izi.TRAVEL/큐피커)는 GPS 자동 트리거 + 다운로드 오프라인 + 다국어 트랙.
7. **번역 UX**는 카메라 OCR(메뉴판) + 대화 모드 + 오프라인 팩이 3대 필수 모드. 한국에서는 **Papago**가 한국어 ↔ 다국어 대응.
8. **여행 후 회상**은 GPS 트랙 + 사진 EXIF 자동 클러스터링 + 사진북 인쇄 (Polarsteps, Day One, Apple/Google Photos).
9. **외국인 한국 여행** 앱은 Visit Korea 공식 + Creatrip/Klook/KKday/Trazy가 양대 영문 마켓.
10. **무장애/시니어/반려동물** 카테고리는 KTO 「열린 관광지」, Wheelmap, BringFido 등 별도 데이터 레이어가 글로벌 표준.

---
*문서 끝.*
