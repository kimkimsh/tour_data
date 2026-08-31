# 01 서비스 개요 · 목표 · 범위

> **Expands:** SPEC §0–§3 · §12 · §13 (plan-review revisions 2026-06-14).
> **Authoritative source:** `docs/plan/SPEC.md` — this document must not contradict it.
> **Do not read this file in isolation.** The domain contracts (DB schema, 4-Layer formula, F1–F5 module map) live in SPEC §4–§11 and are expanded in sibling `docs/plan/NN_*.md` files.

---

## 0. 한 줄 정의

> **「모두의 백제 (Modu Baekje)」** — 충남 공주·부여 백제역사유적지구 6 POI를 장애 유형과 시간 예산에 맞춰, **한 번 수집한 무장애 접근성 데이터가 F1 사전 결정 → F2 현장 도슨트 → F3 현장 제보 → F4 교육 기록 → F5 충남 RTO 개선 신호까지 흐르는** 배리어프리 헤리티지 관광 웹앱 (2026 KTO 관광데이터 활용 공모전 ① 웹·앱 개발 부문).

이 정의는 SPEC §0과 동일하며, 본 문서의 모든 판단 기준이다. 기능 단위가 추가되거나 범위가 흔들릴 때마다 이 문장으로 되돌아온다.

---

## 1. 공모전 채점 구조와 기능별 득점 매핑

### 1.1 채점 배점표

| 단계 | 항목 | 배점 | 비고 |
|---|---|:--:|---|
| **1차** (서면·기능심사) | 서비스 기획력 (구체성·독창성·트렌드) | 30 | 심사 Oct 2026 |
| | 서비스 완성도 (기능성·안정성·편의성) | 30 | |
| | **데이터 활용 적절성** (KTO API 필수) | 20 | 핵심 차별 항목 |
| | 서비스 발전성 (지속성·확장성) | 20 | |
| | 지역특화 가점 (충남 단일 RTO) | **+2** | CACF RTO 특별상 연계 |
| **최종 PT** | 서비스 적정성 (명확성·논리성·시의적절성) | 30 | |
| | 서비스 완성도 (기능 구현도·데이터 활용 안정성) | 30 | |
| | 서비스 실용성 (활용성·이용 편의성·지속성) | 25 | |
| | 발표 점수 | 15 | |

**설계 규칙:** 새 기능을 추가하거나 기존 기능을 수정하기 전에 위 배점표의 어느 항목을 얼마나 높이는지 먼저 확인한다. 득점 기여가 불분명한 기능은 발전방향으로 이동한다.

### 1.2 F1–F5 × 채점 항목 매핑

아래 표는 각 기능이 어느 채점 항목을 주로 얻는지 명시한다. "주"는 핵심 기여, "보조"는 부가 기여.

| 기능 | 기획력 30 | 완성도 30 | 데이터활용 20 | 발전성 20 | PT 적정성 30 | PT 완성도 30 | PT 실용성 25 | PT 발표 15 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **F1.A** POI 무장애 상세 카드 + 4-Layer 적합도 증거 카드 | 주 | 주 | **주** | — | 주 | 주 | 보조 | 주 |
| **F1.B** 사전 배리어프리 정적 경로 (5~12단계) | 주 | 주 | 보조 | — | 보조 | 주 | **주** | 보조 |
| **F1.C** SOS·콜택시·보조기기·AAC | 보조 | 보조 | 보조 | — | 주 | — | 주 | 보조 |
| **F1.D** 시간 예산 3단 MVP + 적합도 산식 | **주** | 주 | **주** | — | 주 | 주 | **주** | 주 |
| **F1.F** 예측 가능 백제 3요소 | **주** | 보조 | 보조 | — | **주** | — | 주 | **주** |
| **F2** Odii 4채널 도슨트 (음성·자막·점자·수어) | **주** | 주 | **주** | — | 주 | 주 | 주 | **주** |
| **F3** 배리어 제보 + 검수 큐 + Realtime 알림 | 주 | 보조 | **주** | 보조 | 보조 | 보조 | 보조 | 보조 |
| **F4** 다중 출력 다이어리 (6채널) | **주** | 주 | **주** | **주** | **주** | **주** | **주** | **주** |
| **F5** 충남 RTO 갭 리포트 대시보드 | 보조 | — | 보조 | **주** | **주** | — | 보조 | 보조 |
| **외국인 4언어** 횡단 레이어 | 보조 | 보조 | 주 | 보조 | 보조 | 보조 | 보조 | 보조 |

### 1.3 차별 요소와 득점 논리

**데이터활용 20점 + 기획력 획득의 핵심:** `KorWithService2.detailWithTour2` 21개 필드를 raw 값이 아닌 **4-Layer 투명 적합도 증거 카드**로 변환한다. 데이터의 출처 필드명·검증일·Layer별 기여값이 화면에 노출된다. "API 데이터를 호출했다"가 아니라 "어떤 필드가 왜 이 점수를 냈는지 심사위원이 카드 한 장으로 확인할 수 있다"는 점이 핵심이다.

**PT 실용성 25점의 money shot:** F4 다이어리 6채널 출력 — 학생 PDF(충남교육청 서식) + 교사 루브릭 + 점자 `.brf` + 쉬운글 PDF + GPX + 단체 합본 PDF. 심사위원이 5분 데모 안에 실물 산출물을 확인할 수 있다.

**충남 가점 +2 + RTO 특별상 후보:** F5 대시보드가 충남 CACF에 즉시 가치를 제공하며, 다도라·올담 통합을 통해 단일 RTO 심화 적용을 증명한다.

---

## 2. 서비스 개요

### 2.1 무엇을 만드는가

충남 공주·부여 **백제역사유적지구(유네스코 세계유산) 6 POI**를 대상으로, 장애 유형(휠체어·시각·청각·인지·발달·시니어·유아차·만성질환)과 시간 예산(반나절~2박 3일)에 맞춰 여행 전 결정 → 현장 안내 → 현장 제보 → 교육 기록 → RTO 개선 신호를 **하나의 접근성 데이터셋으로 연결**하는 배리어프리 헤리티지 관광 웹앱.

기존 서비스(KTO 「모두의 여행」, Wheelmap, Wheelmate)가 **"POI 단위 정적 분류"**에서 멈추는 지점을 본 서비스는 6축 + 시간 예산 차원으로 넘어선다.

| 기존 서비스의 한계 | 본 서비스의 응답 |
|---|---|
| 단일 POI "접근 가능/불가" 분류 | 4-Layer 100점 산식 + 투명 증거 카드 |
| 시간 예산 개념 없음 | 반나절~2박 3일 6단 시간 예산 빌더 (F1.D) |
| 동선 연속성 미검증 | 사전 검수된 정적 배리어프리 경로 (F1.B) |
| 현장 변화 반영 없음 | Waze 패턴 제보 → 관리자 검수 → Realtime 알림 (F3) |
| 교육 산출물 없음 | 6채널 다이어리 + 충남교육청 양식 PDF (F4) |
| 지자체 데이터 피드백 없음 | 충남 RTO 갭 리포트 대시보드 (F5) |

### 2.2 왜 백제·충남인가

- 유네스코 세계유산 백제역사유적지구 — 국제 IP로 외국인 횡단 레이어 자연 결합
- 충남 단일 RTO → 지역특화 가점 +2 + CACF 특별상 직접 후보
  - **P0 의존성 (SPEC §13.7):** 공주 `lDong` · TatsCnctr `signguCd` API 프로브가 이 스프린트 안에 완료되어야 F5·특별상 주장이 성립한다. CACF 의향서(LOI)는 7월 말까지 미확보 시 "B2G 납품"을 "RTO 인도 설계"로 완화한다.
- 공주 야간관광 특화도시 → 시즌 토글(백제문화제·야간·폭염 회피) 실 데이터 시연
- 충남 다도라(`chungnam.dadora.kr`) + 올담(`alldam.chungnam.go.kr`) → F5 RTO 통합 자산 기존 보유
- KTO API 의존도 중간 + 명확한 공간 범위(공주·부여 2개 시군) → 4개월 MVP 완성 가능 범위

---

## 3. MVP 범위 정의 (SPEC §2.6–§2.16 기준)

### 3.1 기술 스택 (locked)

| 계층 | 결정 값 |
|---|---|
| 프레임워크 | Next.js 15 (App Router, TS, React 19, Node 20) |
| BaaS / DB | Supabase (Postgres 17 + PostGIS; pgvector **MVP 제외**) |
| 호스팅 | Vercel Seoul (`icn1` / `ap-northeast-2`) |
| 앱 형태 | PWA (Serwist `@serwist/next` 9.5.11) — 네이티브 앱 아님 |
| 캐시 | Next 15 `unstable_cache` — per-user 데이터에 절대 사용 금지 |
| 인증 | Supabase Anonymous auth (UGC 식별용만) — 핵심 기능 로그인 불필요 |
| 데이터 제공 | KTO API 런타임 호출 없음. ETL → Supabase → RSC. 실시간성 데이터(군중·날씨·대기)는 단기 스냅샷 |
| ETL 스케줄 | GitHub Actions (무거운 배치) + Vercel Cron (단기 갱신) |
| 결제 | MVP 없음 (정보·추천 전용) |

### 3.2 6 MVP POI (공주 3 + 부여 3)

| 지역 | POI | 사적 번호 | 데모 우선순위 |
|---|---|:--:|:--:|
| 공주 | 공산성 | 史477 | ★★★ |
| 공주 | 무령왕릉과 왕릉원 | 史13 | ★★ |
| 공주 | 국립공주박물관 | — | ★★ |
| 부여 | 부소산성 | 史5 | ★★★ |
| 부여 | 정림사지 + 정림사지박물관 | 史301 | ★★ |
| 부여 | 국립부여박물관 | — | ★★ |

**데모 우선 쌍:** 공산성 · 부소산성 — 두 POI는 content 패키지(출입구 사진, 단계 안내, 경사도, 도슨트 스크립트)가 가장 깊이 검수된다.

**6-POI 깊이 티어링 (SPEC §13.2):** 공산성·부소산성 = 전체 증거 팩 + 배리어프리 경로 완성. 나머지 4 POI = 검증 카드(F1.A) 수준. 나머지 4 POI에 도슨트·전체 경로 적용 → §3.4 발전방향.

### 3.3 MVP In-Scope 기능 (F1–F5)

| 기능 ID | 설명 | 핵심 제약 |
|---|---|---|
| **F1.A** | POI 무장애 상세 카드 + 4-Layer 적합도 증거 카드 | `detailWithTour2` 21필드 기반; 자동 재계산 없음 |
| **F1.B** | 사전 검수된 정적 배리어프리 경로 (5~12단계) | 오프라인 다운로드; 실시간 GPS 내비 아님 |
| **F1.C** | SOS·콜택시·보조기기 정적 디렉토리 + AAC 5종 | 전화 딥링크; 콜택시 API 발급은 발전방향 |
| **F1.D** | 시간 예산 3단 MVP (반나절·당일·1박 2일) + `calculateSuitability` ("6단"은 발전방향 상한 레이블) | 선택형 템플릿; 동적 pgRouting 없음 |
| **F1.F** | 예측 가능 백제 3요소 (시각 일정·1단계 1행동·calm+AAC) | 나머지 4요소(보호자 동기·60초 변경·단체 모드 등) → §3.4 발전방향 |
| **F2** | Odii 4채널 도슨트 (음성·자막·점자·수어) — 4채널·수어 deep: 공산성·부소산성만; 외국어 = 텍스트·자막·음성 (map-tap only; geofence 제거) | ko/en/ja/zh-CN; geofence는 위치정보법 신고 후 활성화 (→ 발전방향) |
| **F3** | 배리어 제보 + 사진 → 관리자 검수 큐 → Supabase Realtime 알림 | 자동 재계산 없음; 검수 후 alert만 broadcast |
| **F4** | 로컬-first 다이어리 + 퀴즈 + 6채널 출력 (학생 PDF·교사 루브릭·점자 BRF·쉬운글 PDF·GPX·단체 합본) | Chromium 없음 (`@react-pdf/renderer` + `pdf-lib`); IndexedDB 기본 |
| **F5** | 충남 RTO 단일 갭 우선순위 리포트 (`impact × severity × confidence × feasibility` + 액션 아이템) | 방문자 추세·히트맵 장식 제거; "방문자≠관광객" 주의 문구 필수 |
| **외국인 4언어** | ko/en/ja/zh-CN 횡단 레이어 (F1–F5 전체) | 4언어 contentTypeId 매핑: 76/78/85/75/80/79/82 (전체 7종은 `04_kto_data_integration.md` 참조) |

### 3.4 명시적 발전방향 (MVP 제외)

다음은 SPEC §2.6–§2.16에서 MVP 범위 밖으로 고정된 항목이다. 이 항목들이 MVP에 포함되면 완성도 점수가 오히려 하락한다.

| 항목 | 이유 | 이동 단계 |
|---|---|---|
| 시간 예산 2박 3일 단계 + 익산·논산 POI | MVP 3단 완성 우선; "6단"은 발전방향 상한 레이블 | 중기 |
| F1.E 페르소나 후기 + UGC GPX 제출 | F3가 유일한 UGC 입력창; 큐레이션 GPX 다운로드는 F1.B 유지 | 중기 |
| F1.F 나머지 4요소 (보호자 동기·60초 변경·단체 모드 등) | MVP는 3요소만; 나머지는 F1.F v2 | 중기 |
| F2 geofence GPS 트리거 | map-tap only MVP; 위치정보법 §9의2 신고 후 활성화 | 중기 (신고 완료 후) |
| pgvector / RAG / 임베딩 / OCR | 복잡도 대비 MVP 득점 기여 낮음 | 중기 6~18개월 |
| 360° / AR / 3D / 메타버스 | 4개월 콘텐츠 제작 리스크 | 장기 18개월+ |
| pgRouting / DEM 동적 경로 | PostGIS pgrouting은 Plan B; 정적 큐레이션 경로로 충분 | 중기 |
| FCM/APNs / 알림톡 | in-app Realtime으로 대체 | 중기 |
| GPS 실시간 내비게이션 | F1.B 정적 가이드로 대체; 책임 소재 명확화 | 중기 |
| 동행 매칭 | 사용자 풀 없는 MVP에 무의미 | 장기 |
| 자동 적합도 재계산 (F3 연동) | UGC 신뢰도 누적 전 오남용 위험 | 중기 |
| 결제 / 예약 / OTA 딥링크 | 여행업·통신판매업 신고 트리거 | 장기 또는 법인화 후 |
| 시즌 패스 / 시민 패스 / 1년 학년 패스 | F4 누적 다이어리 v2 선행 필요 | 중기 |
| 다회차 누적 서버 동기화 | MVP IndexedDB 로컬 저장으로 충분 | 중기 |
| 중문 번체 / 독·불·서·노 추가 언어 | MVP ko/en/ja/zh-CN 4종 | 중기 |
| KWCAG 2.2 정식 인증 (WA/KWACC) | 자체점검 MVP; 정식 신청은 출시 후 3개월 | 단기 (출시 후) |
| 모바일 앱 / KS X 3253 | PWA로 대체 | 장기 |
| 수어 영상 전 POI 확장 | 6 POI 샘플만 MVP | 중기 |
| 한국관광공사 runtime API 직접 호출 | ETL snapshot 전용 (데모 안정성) | 결정 유지 |
| KTO 외 24개 외부 API 중 MVP 미포함분 | 10개 KTO + MVP 명시 외부 데이터만 | 중기 |

### 3.5 MVP 외부 데이터 (SPEC §2.15 — KTO 10개 + 명시 비KTO)

**KTO 10개 서비스:**

| # | 서비스 | 주요 용도 |
|:--:|---|---|
| 1 | KorWithService2 | F1.A 핵심 — `detailWithTour2` 21필드 |
| 2 | KorService2 | F1 동선 베이스, `areaBasedSyncList2`, 코드 테이블 bootstrap |
| 3 | EngService2 | F2 영문 도슨트 자막 (contentTypeId 76/78/85 주요 타입; 전체 7종은 `04_kto_data_integration.md` 참조) |
| 4 | JpnService2 | F2 일문 자막 |
| 5 | ChsService2 | F2 중문 간체 자막 |
| 6 | Odii | F2 GPS 트리거 도슨트 음성 채널 (xCoord/yCoord/langCode) |
| 7 | TatsCnctrRateService | F1.D Layer A 시간대 적합도 (0~100 지수, 실인원 아님) |
| 8 | DataLabService | F5 RTO 방문자 추세 ("방문자≠관광객" 주의 필수) |
| 9 | TarRlteTarService1 | F1.D 적합도 <70 fallback 대체 추천 |
| 10 | PhotoGalleryService1 | F1.A 출입구별 사진, F1.B 단계별 시각 안내 (공공누리 1유형) |

**MVP 비KTO 외부 데이터:**

| 범주 | 데이터 | 기능 연결 |
|---|---|---|
| 무장애 인증 | BF 인증정보 (`data.go.kr/data/3051093`) | F1.D Layer C 보정 (+0.02/+0.05/+0.08) |
| 무장애 인증 | 장애인편의시설 현황 (`data.go.kr/data/15092317`) | F1.A 카드 보강 |
| 헤리티지 | 국가유산청 OpenAPI (`khs.go.kr` — 구 문화재청 `cha.go.kr` 도메인 이전; data.go.kr `15034324`) | F2 어른 모드, F4 공식 해설 (엔드포인트별 라이선스 1개로 고정; SPEC §14.9) |
| 공간 | Kakao Maps JS SDK, VWorld | 지도 렌더링, 경사도 보조 |
| 공간 | 도로명주소 API (`juso.go.kr`) | F1.B 도로명 음성 안내 (좌표제공 API 승인 선행 필요) |
| 기상·안전 | 기상청 단기예보·특보 (`apihub.kma.go.kr`) | F1.D 시간대, F1.F-3 |
| 기상·안전 | 에어코리아 | F1.D 미세먼지 시 실내 대체 |
| 기상·안전 | 응급의료기관 + AED (`data.go.kr`) | F1.A "가까운 응급실/AED", F1.C SOS |
| 교육 | 충남교육청 체험학습 양식 | F4 (a) 학생 PDF 서식 |
| 충남 RTO | 충남 다도라, 올담 | F5 시군 보강, RTO 통합 |
| 픽토그램·AAC | KS X ISO 7001, 보건복지부 사회보장, ARASAAC (CC BY-NC-SA 4.0) | F1.B, F1.C, F1.F, F4 (d) |
| 점자 | 한국점자규정 (국립국어원) | F2 점자 채널, F4 (c) `.brf` |

**MVP에서 명시적으로 제외되는 외부 데이터:** Google Maps Places, Wheelmap/OSM (라이선스 충돌), TMAP, FinDX 카드, 민간 카셰어링·킥보드, AccuWeather/Tomorrow.io, Google Translate.

---

## 4. 페르소나 모델

### 4.1 4 페르소나 + 외국인 횡단

| ID | 명칭 | 하위 분류 | 핵심 니즈 | Critical 데이터 필드 (상위 4개) |
|---|---|---|---|---|
| **P1** | 휠체어·시니어 | P1a 휠체어/도우미견; P1b 시니어/만성질환 | 단차 없는 연속 동선, 휴식 간격, 폭염·미세먼지 회피 | `wheelchair` · `exit` · `elevator` · `restroom` |
| **P2** | 시각·청각 | P2a 시각/도우미견; P2b 청각/수어 | P2a: 음성·점자·고대비·STT; P2b: 자막·시각 알림·수어 | P2a: `braileblock` · `audioguide` · `helpdog` · `guidesystem` / P2b: `signguide` · `videoguide` · `hearingroom` · `hearinghandicapetc` |
| **P3** | 가족·자녀 | 유아차; **인지·발달·자폐·치매 초기를 1탭 옵션으로 흡수** (P5 별도 신설 없음) | 유아차 접근, 수유실, 쉬운글, 낮은 자극, 짧은 동선 | `stroller` · `lactationroom` · `babysparechair` · `auditorium` |
| **P4** | 단체 인솔자 | 학교·복지기관·발달장애 단체 | 그룹별 픽토그램 카드, 단체 합본 PDF, 인솔 보고서 | F4 단체 합본 (단체 모드 → §3.4 발전방향) |
| **횡단** | 외국인 4언어 | P1~P4 위에 겹침 | 다국어 4종, 1330, 영사콜센터, 응급 다국어 | multilingual contentTypeId 76/78/85 (주요 타입; 전체 7종은 `04_kto_data_integration.md` 참조) + Odii `langCode` |

**설계 원칙:**
- F5를 별도 페르소나로 만들지 않는다 — F5는 충남 RTO 관리자 대시보드이며 P1~P4가 생성한 데이터를 소비한다.
- 인지·발달 장애는 P5 신설 없이 P3 하위 1탭 옵션 `"예측 가능 백제"` (F1.F)로 흡수한다. 페르소나 5개 이상은 입력 UX 복잡도를 올리고 PT 설명 시간을 낭비한다.
- 다중 페르소나 선택 시 `calculateSuitability`는 **최저 personaFit**을 사용한다 — 할아버지(P1)의 접근성 점수가 손녀(P3) 점수를 마스킹해서는 안 된다.

### 4.2 페르소나 × 4-Layer 가중치 매트릭스 (Layer B 요약)

| 페르소나 | Critical×4 필드 (항목) | 보조×2 필드 예시 | 단독 방문 불가 트리거 |
|---|---|---|---|
| P1a 휠체어 | wheelchair · exit · elevator · restroom | auditorium · room | 선택 CRITICAL 중 하나라도 `unsupported` → score ≤ 49 |
| P1b 시니어 | restroom · auditorium · room · handicapetc | 휴식 인프라 (Layer A 0.12) | CRITICAL `unknown` + coverage < 65% → "정보 없음" |
| P2a 시각 | braileblock · audioguide · helpdog · guidesystem | bigprint · brailepromotion | |
| P2b 청각 | signguide · videoguide · hearingroom · hearinghandicapetc | — | |
| P3 가족 | stroller · lactationroom · babysparechair · infantsfamilyetc | auditorium · room | |
| P4 단체 | (인솔 부가 항목 — F1.F-7) | F4 단체 합본 활성화 여부 | |

전체 5×21 매트릭스 (페르소나×필드 critical/supporting/other 등급)는 `packages/domain/accessibility` 내 `personaWeightMatrix.ts`에서 정의한다. 이 문서에 인라인으로 복제하지 않는다.

---

## 5. "한 데이터셋이 F1→F5를 흐른다" 테제

### 5.1 데이터 흐름 개요

```
[ETL → Supabase]
  KorWithService2.detailWithTour2 (21 fields)
  + BF 인증 + 국가유산청 + 기상청 + 응급/AED
  + 충남 다도라/올담
       │
       ▼
[accessibility_facts 테이블]
  poi_id · capability_code · status · detail · source · source_field · verified_at
       │
       ├─► F1.A  4-Layer 적합도 카드 — "방문 가능 / 주의 / 대체 추천 / 정보 없음"
       │         ↳ 투명 증거: 필드명·갱신일·Layer 기여값 노출
       │
       ├─► F1.B  사전 배리어프리 경로 단계 카드
       │         ↳ route_steps.easy_text · photo · slope · 단차
       │
       ├─► F1.D  시간 예산 빌더 + calculateSuitability()
       │         ↳ itinerary_templates × persona 가중치
       │
       ├─► F2    Odii 4채널 도슨트
       │         ↳ docent_stories + docent_assets (audio/transcript/braille/sign_video)
       │
       ├─► F3    배리어 제보 → 관리자 검수 → Realtime 알림
       │         ↳ barrier_reports → moderation_events → approved alert broadcast
       │         ↳ 승인된 UGC → accessibility_facts.verified_at 갱신 (관련 capability만)
       │
       ├─► F4    다이어리 6채널 출력
       │         ↳ 같은 route_steps + accessibility_facts → 학생 PDF + GPX + BRF
       │
       └─► F5    충남 RTO 갭 리포트
                 ↳ poi_completeness_mv + report_trends_mv + rto_dashboard_snapshots
                 ↳ "F3에서 제보가 많은 POI" = F5에서 "개선 후보지 1순위"
```

### 5.2 왜 이 테제가 심사에서 중요한가

- **데이터활용 20점:** `accessibility_facts`는 **권위 있는 접근성 단일 소스**(`KorWithService2.detailWithTour2` + BF/장애인편의시설 보강)가 채우는 **결정 척추(decision spine)**이고, 나머지 KTO 서비스는 **같은 `poi_id`에 키를 맞춘 타입드 컨텍스트 레이어**로 부착된다 — Odii→도슨트, TatsCnctr/기상청→timeContext, DataLab→갭 컨텍스트, PhotoGallery→증거 사진, TarRlteTar→연관. 즉 "10개가 한 테이블로 수렴"이 아니라 **`poi_id` 허브-스포크**다(SPEC §14.7). 심사위원의 "그 10개가 이 한 테이블에 들어오나?" 검증 질문에 견디는, 서비스별 역할이 명확한 더 강한 서사.
- **발전성 20점:** F3 UGC가 누적되면 `accessibility_facts.verified_at`이 갱신되고, F5 gap metric이 자동으로 줄어든다. 사용자가 늘수록 데이터 품질이 올라가는 순환 구조.
- **PT 발표 15점:** "한 번 수집한 무장애 데이터가 여행 전 판단, 현장 안내, 교육 기록, 다음 방문자의 경고, 충남의 시설 개선 우선순위까지 연결됩니다." (SPEC §12 PT 마무리 문장 — 발표 마지막 슬라이드에 그대로 인용)

### 5.3 PT 핵심 시나리오 (D.1) 에서 데이터 흐름 검증

SPEC §12의 PT 시나리오를 데이터 경로로 재표현한다:

| 시나리오 단계 | 소비하는 데이터 | 생성하는 데이터 |
|---|---|---|
| 페르소나 선택 (휠체어 할아버지 + P3 손녀) | persona_weight_matrix | 세션 내 필터 상태 (client-side) |
| 반나절 공산성 F1.A 카드 | accessibility_facts + poi_certifications + context_snapshots | — |
| F1.B 서문 진입 5단계 카드 | route_steps + route_hazards | — |
| F3 "동문 공사" 알림 수신 | barrier_reports (approved) | — (이미 F3 검수 완료) |
| F2 Odii 도슨트 (어른/어린이 분기) | docent_stories + docent_assets | — |
| 슬라이더 → 1박 2일 전환 | itinerary_templates (같은 template family, 확장) | — |
| F4 손녀 다이어리 → 6채널 출력 | route_steps + docent_stories + accessibility_facts | diary_entry (IndexedDB); 명시 제출 시 서버 저장 |
| F5 충남 RTO 대시보드 | poi_completeness_mv + report_trends_mv | rto_dashboard_snapshots |

**증명 완료:** 공산성의 `accessibility_facts` 행이 F1(카드·경로·시간 예산), F2(도슨트 트리거), F3(갱신 신호), F4(PDF 내용), F5(gap metric)에 모두 등장한다.

---

## 6. 10월 기능심사 성공 기준

### 6.1 기능 수준 합격선

심사위원이 데모 세션(≈30분)에서 확인해야 하는 항목:

| # | 합격 기준 | 관련 기능 | 비고 |
|:--:|---|---|---|
| AC-01 | P1a+P1b+P3 다중 선택 후 반나절 공산성 카드가 4-Layer 점수 + 필드별 기여값 + 데이터 날짜를 표시 | F1.A · F1.D | Layer C cap ≤ +0.12 |
| AC-02 | 공산성 서문 진입 5단계 배리어프리 경로 카드가 사진·텍스트·점자·TTS 4형식으로 표시되며 오프라인 다운로드 작동 | F1.B | Serwist PWA |
| AC-03 | F3 "동문 공사 중" 테스트 제보가 관리자 검수 큐에 나타나고, 승인 후 Supabase Realtime으로 화면에 알림 배너 표시 | F3 | 자동 재계산 없음 |
| AC-04 | Odii 공산성 스토리가 map-tap으로 트리거되어 음성·자막·점자 텍스트 3채널 동시 출력; 영문 전환 작동 | F2 | geofence는 위치정보법 신고 후 활성화 |
| AC-05 | 시간 예산 슬라이더를 반나절 → 1박 2일로 전환하면 같은 template family에서 부여 POI가 추가됨 | F1.D | 동적 pgRouting 없음 |
| AC-06 | F4 다이어리에서 학생 PDF(충남교육청 서식)·점자 BRF·GPX 3종 다운로드 성공 | F4 | Chromium 없음 |
| AC-07 | F5 대시보드에서 공주·부여 무장애 필드 누락 POI 수 + 제보 빈도 히트맵 표시 | F5 | "방문자≠관광객" 주의 문구 |
| AC-08 | 영문 모드에서 F1~F5 전체 흐름이 영어로 표시됨 | 외국인 4언어 | ko/en/ja/zh-CN |
| AC-09 | axe-core 자동 검사 violations === 0 (core routes); Lighthouse a11y ≥ 0.95 | KWCAG 2.2 CI | 지도 canvas는 manual 검사 |
| AC-10 | NVDA + Chrome에서 F1.A 카드 포커스 순서, F2 transcript `aria-live` 발화, F3 제보 폼 레이블 정상 작동 | KWCAG 2.2 manual | 센스리더도 병행 |

### 6.2 데모 안정성 기준

| 항목 | 기준 |
|---|---|
| API 의존성 | KTO API 런타임 호출 없음 — 모든 POI 데이터는 Supabase snapshot으로 제공 |
| 미디어 | 도슨트 오디오·사진은 Supabase Storage에 pre-upload (demo-day CDN 없어도 작동) |
| 백업 | 핵심 플로우 화면 녹화 영상 준비 (API 장애 대비) |
| 심사위원 계정 | 관리자 계정(검수 큐) + 익명 사용자 흐름 분리 seed 완료 |
| 데이터 seed | 공산성·부소산성 `accessibility_facts` 전 21필드 입력 완료; F3 테스트 제보 1건 승인 상태 preset |

### 6.3 타임라인과 합격선 도달 경로

(SPEC §9 타임라인 요약 — 상세 WBS는 `docs/plan/12_workstreams_sequencing.md` 참조)

| 기간 | 마일스톤 | AC 항목 |
|---|---|---|
| ~6/28 | Contracts frozen + 첫 vertical slice (**공산성 단일 POI**: F1.A/D → 3단계 검증 경로 → HTML 다이어리 → F5 갭 1건, SPEC §13.3; 반나절+휠체어·시니어·가족; CI green) | AC-09 기반 |
| ~7/19 | 6 POI ETL/publish + F1.A/D + F1.B 공주 3 + F3 state machine + F4 PDF/BRF/GPX spike | AC-01, 02, 06 초안 |
| ~8/9 | F1.B 부여 3 + F1.C/E/F + F2 4채널 + F3 approve-alert + F4 6출력 + F5 | AC-03, 04, 05, 07, 08 |
| ~8/31 | D.1 golden flow + Serwist offline + NVDA/VoiceOver/TalkBack manual + license/AI-label audit | AC-10 |
| ~9/15 | 관광약자·특수교육·점자 전문가 검증 + 모든 데모 API 응답 snapshot | AC-01~10 최종 |
| ~9/30 | RC: feature freeze + PT 시나리오 리허설 + judge/admin 계정 + incident runbook | 발표 준비 |

---

## 7. 콘텐츠 패키지 (SPEC §9 Content Package Contract v1 요약)

6 POI 각각에 대해 아래 항목이 검수·확정되어야 기능심사 입장이 가능하다. 상세 스키마는 `packages/content-schema`의 Zod 스키마로 관리한다.

| 필드 그룹 | 필수 항목 | 검증 기준 |
|---|---|---|
| 출입구 | entrance 위치·유형·사진 (최소 1개 이상) | `poi_entrances.verified_at` ≤ 90일 |
| 배리어프리 경로 | route_steps 5~12개; 각 step에 action·geometry·photo·easy_text | F1.B 렌더 테스트 통과 |
| 접근성 사실 | `accessibility_facts` 21개 capability_code 중 critical 4개 이상 `supported/partial/unsupported` (unknown 허용하되 coverage 계산에 반영) | `calculateSuitability` 입력 검증 통과 |
| 경사·단차 | slope (°), 단차 높이 (mm), 표면 유형 | F1.B 구간별 장애요소 표기 |
| 휴식 인프라 | 벤치·그늘·실내 휴게·화장실 간격 (Layer A 0.12 입력) | — |
| 도슨트 | docent_stories (어른/어린이/쉬운글) + Odii story_id 또는 자체 스크립트 | F2 재생 테스트 |
| 사진 라이선스 | `cpyrhtDivCd` 저장; Type3 변환 금지 플래그 | PhotoGallery 렌더 정책 |
| 출처·검증 | `source` · `source_field` · `verified_at` 전 행 필수 | Layer D 신선도 계산 |

**데모 우선 깊이:** 공산성·부소산성은 위 모든 항목 100% 완성 목표. 나머지 4 POI는 F1.A + F1.B 최소 완성.

---

## 8. 법적·운영 전제 조건

기능심사 이전에 아래 조건이 충족되지 않으면 AC 항목 중 일부가 데모 불가 상태가 된다.

| 조건 | 담당 | 마감 |
|---|---|---|
| KTO 운영 계정 발급 (서비스당 100,000 calls/day) — 활용사례 URL 등록 선행 필요 | 개발팀 | **최대한 빨리 — Oct 심사 전 여유 있게** |
| 위치정보법 §9의2 방통위 신고 (geofence F2 실 GPS 사용 전) | 법무·개발팀 | geofence 활성화 전 |
| PIPA 개인정보처리방침 (Vercel US 위탁·국외이전 포함) | 법무 | 공개 서비스 전 |
| AI 기본법 라벨 (AI 음성 안내·AI 번역·AI 생성 코스) 전 화면 배치 | 개발팀 | 출시 시점 |
| KOGL `cpyrhtDivCd` 저장 + Type3 변환 금지 처리 | 개발팀 | ETL 단계 |
| Supabase Pro 플랜 업그레이드 (auto-pause 방지) | 운영팀 | 심사 2주 전 |
| Vercel Pro 플랜 업그레이드 (Cron 1×/day → 정상 cadence) | 운영팀 | 심사 2주 전 |

---

## 부록 A. 용어 정의

| 용어 | 정의 |
|---|---|
| **accessibility_facts** | `poi_id + capability_code + status(supported/partial/unsupported/unknown) + source + source_field + verified_at` — `detailWithTour2` 필드명을 도메인에서 분리한 정규화 행. F1~F5의 공통 입력 |
| **4-Layer 적합도** | A(POI 본질 7축) × B(페르소나 fit) × C(인증 보정 1.00~1.12) × D(신선도 감쇠) × 100 = 0~100점 |
| **Layer C cap** | SPEC §2.14: 인증 보정 최대 +0.12 (BF 예비+0.02/일반+0.05/우수+0.08 + 열린관광지+0.04). 제안서 ×1.30 대비 보수적 보정 |
| **정보 없음** | CRITICAL capability `unknown` 또는 evidence coverage < 65% → 점수 표시 대신 "정보 없음 — 현장 확인 필요" 표시. 추론 금지 |
| **대체 추천** | score < 70 시 TarRlteTarService1 인접 대체지 자동 노출 |
| **정적 경로** | F1.B: 사전 검수된 배리어프리 단계 카드. 실시간 GPS 내비가 아니며 오프라인 작동 |
| **PT 마무리 문장** | "한 번 수집한 무장애 데이터가 여행 전 판단, 현장 안내, 교육 기록, 다음 방문자의 경고, 충남의 시설 개선 우선순위까지 연결됩니다." — SPEC §12; PT 마지막 슬라이드 인용 고정 |
| **발전방향** | MVP 범위 밖으로 고정된 항목. §3.4 목록 참조. 심사 전 이 목록에 없는 항목을 "발전방향"으로 이동하려면 SPEC 개정 필요 |
| **CACF** | 충남문화관광재단 — F5 RTO 갭 리포트의 주 수신처 + RTO 특별상 연계 |

---

## 부록 B. 관련 문서 인덱스

| 문서 | 내용 |
|---|---|
| `SPEC.md` | 단일 권위 소스 — 본 문서가 모순될 경우 SPEC가 우선 |
| `00_README.md` | 블루프린트 진입점 — 목차 · 읽기 경로 · 결정 로그 · 상태 |
| `01_overview_goals_scope.md` | 본 문서 — 서비스 개요 · 채점 매핑 · MVP 범위 · 페르소나 · 합격 기준 |
| `02_architecture.md` | 세 평면 + 순수 도메인 코어 · 모노레포 패키지 경계 · 스택 상세 |
| `03_data_model.md` | Supabase 테이블 DDL + enum + RLS 상세 |
| `04_kto_data_integration.md` | KTO 10개 서비스 typed client 계약 + ETL(ingest≠publish) |
| `05_feature_F1_total_guide.md` | F1 A–F 구현 명세 (`calculateSuitability` 산식 포함) |
| `06_feature_F2_docent.md` | F2 Odii 4채널 도슨트 구현 명세 |
| `07_feature_F3_ugc_review.md` | F3 배리어 제보 + 검수 큐 구현 명세 |
| `08_feature_F4_diary.md` | F4 다중 출력 다이어리 구현 명세 |
| `09_feature_F5_rto_dashboard.md` | F5 충남 RTO 갭 리포트 대시보드 구현 명세 |
| `10_accessibility_kwcag.md` | KWCAG 2.2 CI 게이트 + 수동 스크린리더 게이트 |
| `11_legal_compliance.md` | 위치정보법 · PIPA · AI 기본법 · KOGL 법적 체크리스트 |
| `12_workstreams_sequencing.md` | 5 frozen contracts · 스트림 · WBS · dependency graph · 타임라인 |
| `13_testing_quality.md` | 테스트 피라미드 · 도메인 골든 · contract · RLS · D.1 E2E |
| `14_demo_pt.md` | 시연·PT 전략 · D.1 골든 플로우 · 백업 영상 · 데모 시드 |
| `15_risks_open_items.md` | 위험 레지스터 · 빌드타임 게이트 · 결정 로그 · 미결 항목 |
| `16_suitability_policy.md` | 4-Layer 적합도 산식 정책 단일 권위 문서 — 모든 수치·매트릭스·임계값·`SuitabilityResult` 계약 |
| `_research/00_SYNTHESIS.md` | 기술 스택·API 현실 검증 (D1–D4 vs R1–R5 대조) |
