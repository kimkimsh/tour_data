# 04. 올레 링크드 제주 (Olle Linked Jeju) — 9미·9품·웰니스 × SPARQL 시맨틱 큐레이터

> **한 줄 정의**: 제주 올레 27코스 437km × **VISIT JEJU TourAPI의 유일무이한 SPARQL endpoint** × 9미(味)·9품·우수웰니스 88개소(2025 신규 11) × 제주데이터허브 이통·카드·내비를 LOD(Linked Open Data)로 묶어 "한식+해녀+무장애+올레 인접" 같은 다중조건 시맨틱 쿼리로 추천하는 제주 깊이 여행자용 큐레이터.

| 항목 | 내용 |
| --- | --- |
| **타겟 페르소나** | 제주 4박+ 깊이 여행자 (올레+미식+웰니스) / 인바운드 외국인 워케이셔너 / 50+ 시니어 |
| **지역** | **제주 특화 (RTO 특별상 1순위)** |
| **가점 가능성** | **지역특화 +2 ★** + **RTO 특별상 1순위 ★★★** |
| **1차 심사 추정 점수** | **95/100** (가점 +2 포함) |
| **차별성 강도** | 10/10 |
| **4개월 구현 가능성** | 8/10 |
| **1등 가능성** | ★★★ (최우수상 + RTO 특별상) |

---

## 1) 서비스 기획배경 및 필요성

### 1-1. 기획 배경
- **제주는 8개 특별상 RTO 중 데이터 인프라 1위** (분석 결과). VISIT JEJU TourAPI는 **REST + SPARQL endpoint**를 둘 다 운영하는 **유일한 광역 RTO**. data.ijto.or.kr이 이통(SKT)·신한카드·내비(TMAP) 3종 빅데이터를 정형 제공.
- 제주 9미(味)·9품 + 한국관광 100선 6개 + **2025 우수웰니스 신규 2개소**(전국 11개 중) + 올레 27코스 437km — 분류체계가 정교해 시맨틱 쿼리에 최적.
- 제주 단순 코스 추천 앱은 VISIT JEJU(공식)·탐나오·제주올레재단 앱이 압도. **차별화는 SPARQL/LOD 활용 또는 신규 데이터 결합(웰니스·반려·무장애)에서만 가능** — 분석 함정 E-1.

### 1-2. 필요성
- "한식 + 해녀 어촌 식당 + 휠체어 접근 가능 + 올레 6코스 인접 1km + 평일 점심 한산"같은 **다중 조건 정밀 쿼리**는 SPARQL/LOD 없이는 만들 수 없음. 일반 OTA·KTO TourAPI도 이 깊이까지 못 감.
- 제주 4박+ 깊이 여행자는 "관광지 추천" 단계를 졸업했음. 그들이 원하는 건 **9미·9품·웰니스·해녀 같은 제주 고유 분류체계로 정밀 큐레이션**.
- 인바운드 외국인 워케이셔너(2024~2025 급증, 디지털노마드 비자) — 다국어 SPARQL 결과 + KQ 인증 숙박 + 우수웰니스 매칭은 시장에 없음.

---

## 2) 서비스 개요

### 2-1. 한 줄 소개
"제주를 두 번째 가는 사람을 위한 첫 번째 큐레이터. **SPARQL이 짠 9미·9품·웰니스의 정밀한 그물망**으로 '오늘만 열리는 제주'를 추천합니다."

### 2-2. 주요 기능 (6개)
1. **시맨틱 쿼리 빌더 (SPARQL UI)** — 9미(味, 9개)·9품·올레 27코스·우수웰니스 6카테고리(뷰티스파/힐링명상/자연숲/한방/푸드/스테이) 8소분류 LOD 트리에서 사용자가 조건 조합 → SPARQL 자동 생성 → VISIT JEJU endpoint 쿼리. **사용자에게 SPARQL을 노출하지 않되**, 고급 사용자에게는 raw 쿼리 토글 제공.
2. **혼잡 회피 + 실시간 기상** — data.ijto Data Map Jeju 혼잡도 + 제주 상세기상정보 OpenAPI(15058361) + KTO `TatsCnctrRateService` → 시간대별 색상 코딩.
3. **올레 27코스 × 9미·9품 자동 코스 합성** — 올레 코스 reststop 위치 + 9미 인근 식당 + 9품 명소 → 코스 위에 자동 핀(pyproj 좌표 변환). GPS 트리거 오디오 가이드 (Odii + CLOVA Voice 영·중·일).
4. **인바운드 다국어 + KQ 인증 숙박** — TourAPI EngService2/JpnService2/ChsService2 + KTO 한국관광 품질인증(15034825) + 우수웰니스 88개소 결합. 외국인 4박+ 워케이셔너용 영문 큐레이션.
5. **2-pane 데스크톱 UX (lasso 패턴)** — 좌측 deck.gl 지도 + 우측 일정. 사용자가 지도에서 폴리곤을 그리면 그 안의 SPARQL 결과 자동 추출 ("제주 동쪽 해안 30km 일대" 같은 비정형 영역 정의).
6. **AI 보조 (LLM-as-Reranker, 비가시적)** — Cohere Rerank로 사용자 이전 체류 패턴 기반 "당신 같은 사람이 다음에 좋아할 곳" 정렬. 텍스트 생성 0.

### 2-3. 서비스 차별성
- **SPARQL/LOD 활용 = 거의 0 사례**. 일본·유럽 관광 LOD 사례는 있어도 한국 RTO LOD 활용 앱은 없음. **이것 하나만으로 차별성 10/10**.
- VISIT JEJU 공식 앱·탐나오 = 일반 검색·코스 추천. 올레 링크드 = **9미·9품·웰니스·해녀의 LOD 시맨틱 그물망**.
- 우수웰니스 88개소 + KQ 인증 + lclsSystm2=EX05 웰니스소분류 8종 결합 사례 0.
- 인바운드 다국어(8종) + 외국인 워케이셔너 매칭 사례 0.
- TourAPI 4.4 신표준(legacy areaCode2 미사용) 100% 적용 명시.

---

## 3) 데이터 활용 방안 (KTO OpenAPI 필수 활용)

### 3-1. 메인 KTO OpenAPI

| 활용 API | 사용 목적 | TourAPI 4.4 신표준 적용 |
| --- | --- | --- |
| **KorService2.areaBasedList2 (areaCode=39 → lDongRegnCd 50)** | 제주 전체 베이스라인 (전국 비교 필요 시) | ★★ |
| **KorService2.searchKeyword2 + lclsSystm2=EX05** | 웰니스 8소분류 정밀 매칭 | ★★ |
| **KorService2.searchStay2 + detailIntro2** | KQ 인증 숙박 + 환불정책·체류일 + 외국인 친화 필드 | ★★ |
| **EngService2 / JpnService2 / ChsService2** | 인바운드 다국어 8종 (외국인 워케이셔너) | ★★ |
| **KorWithService2.detailWithTour2** | 무장애 24+ 필드 (시니어·휠체어 깊이 여행자) | ★ |
| **AreaTarDivService.areaTouDivList** | 제주 vs 비제주 다양성 비교 → 시너지 시각화 | — |
| **TatsCnctrRateService** | 핵심 관광지 미래 혼잡 예측 | — |
| **PhokoAwrdService.phokoAwrdList** | 제주 수상 사진 (cpyrhtDivCd Type1만) — 감성 비주얼 | ★ |
| **WellnessTursmService** | 우수웰니스 88개소 + 2025 제주 신규 2개소 | — |

### 3-2. 보조 데이터 (제주 특화)
- **VISIT JEJU TourAPI SPARQL endpoint** (한국 유일 RTO LOD)
- **VISIT JEJU REST API** (REST endpoint도 별도 운영)
- **data.ijto.or.kr** (이통 SKT + 신한카드 + 내비 TMAP 3종 빅데이터)
- **제주 상세기상정보 OpenAPI** (15058361, 한라산 산악기상)
- **제주데이터허브** + Data Map Jeju
- 카카오맵 SDK + VWorld 3D (한라산 지형)
- KOPIS 공연 (제주 공연·이벤트)
- 한국관광 1330 (12개 언어)

### 3-3. 데이터 활용 방식
1. **사전 인덱싱**: KTO TourAPI 제주 콘텐츠 + 우수웰니스 + KQ 인증 + VISIT JEJU REST → PostGIS + pgvector + Apache Jena Fuseki(LOD triple store).
2. **시맨틱 쿼리**: 사용자 UI 조합 → SPARQL 생성 → VISIT JEJU SPARQL endpoint 호출 + 자체 Fuseki 보완 → 결과 머지.
3. **혼잡·기상 결합**: `TatsCnctrRateService` + 제주 상세기상 API + data.ijto Data Map → 색상 코드.
4. **다국어 인덱스 분리**: 8개 언어별 별도 인덱스 (contentTypeId 코드 다름 — 12 vs 76 매핑 테이블 하드코딩).

---

## 4) 서비스 발전 방향

### 4-1. 단기 (수상 후 6개월)
- **제주관광공사(IJTO) RTO 특별상 후속 협력**으로 SPARQL 콘텐츠 추가 + 데이터허브 직접 결합 정식 협약 추진.
- 인바운드 외국인 워케이셔너 1,000명 베타 (제주 디지털노마드 비자 협업).
- 우수웰니스 88개소 + KQ 인증 사업자 광고 모델.

### 4-2. 중기 (1~2년)
- 제주 모델 → 부산·강원·경주 LOD 확장 (다른 광역 RTO 데이터를 자체 Fuseki에 적재 → 해당 RTO와 LOD 협업 제안).
- B2B SaaS — KQ 인증 숙박·우수웰니스 사업자에게 "내 시설이 어떤 SPARQL 쿼리에서 노출되는가" 대시보드.
- 글로벌 OTA(Klook/KKday) 인바운드 채널 확장.

### 4-3. 장기
- 한국 광역 RTO 통합 LOD 표준화 — KTO·문체부에 LOD 표준화 제안서 (B2G 컨설팅).
- 동남아·일본·중국 4박+ 인바운드 시장 직격.

---

## 5) 4개월 빌드 일정

| 월 | 핵심 마일스톤 | 산출물 |
| --- | --- | --- |
| **5월** | VISIT JEJU SPARQL endpoint 학습 + Fuseki 셋업 + KTO TourAPI 제주 인덱싱 | LOD triple store + PostGIS |
| **6월** | SPARQL 쿼리 빌더 UI + 9미·9품·웰니스 LOD 트리 | 쿼리 빌더 v0.1 |
| **7월** | 올레 27코스 자동 합성 + lasso 폴리곤 + 혼잡·기상 색상 코드 | 베타 v0.5 |
| **8월** | 다국어 인덱스 분리 (8종) + KQ 인증 매칭 + 음성 가이드 (영·중·일) | 인바운드 v0.9 |
| **9월** | 100명 베타 (제주 4박+ 사용자) + 외국인 50명 베타 + 시연 영상 | 1차 심사 v1.0 |

**팀 5명**: 백엔드/LOD 1 (Apache Jena Fuseki + SPARQL) / 프론트 2 (Next.js + deck.gl + lasso) / 다국어/콘텐츠 1 / AI/추천 1.

---

## 6) 1차 심사 점수 시뮬레이션

| 심사 항목 | 배점 | 추정 점수 | 근거 |
| --- | --- | --- | --- |
| 서비스 기획력 | 30 | **28** | SPARQL/LOD 활용은 한국 관광 앱 0 사례. 제주 4박+ 깊이 여행자 단일 페르소나. |
| 서비스 완성도 | 30 | **26** | 4개월 8/10 (SPARQL 학습곡선만 통과하면 빠름). |
| 데이터 활용 적절성 | 20 | **19** | KTO TourAPI 9개 endpoint + VISIT JEJU SPARQL/REST + data.ijto + 우수웰니스 + KQ 인증. v4.4 100%. |
| 서비스 발전성 | 20 | **18** | 광역 RTO LOD 표준화 + 인바운드 + B2B SaaS. |
| **합계** | **100** | **91** | |
| **가점 (지역특화)** | **+2** | **+2** | 제주 한정 |
| **합산** | | **93** | |
| **+ RTO 특별상 가능** | — | ★★★ | IJTO 데이터 인프라 1위 → 특별상 1순위 |

**최종심사 PT**: 시의적절성 28점 (제주 우수웰니스 2025 신규 + LOD 신선도). 1등 가능성 ★★★ (최우수상 + IJTO 특별상).

---

## 7) 위험 요소 + 완화책

| 위험 | 영향 | 완화책 |
| --- | --- | --- |
| VISIT JEJU SPARQL endpoint 안정성 | 실시간 호출 시 latency | Fuseki 자체 미러 + ETL 정기 동기화 (1시간 주기). 운영 시 SPARQL 직접 호출 fallback. |
| SPARQL 학습 곡선 | 개발자 진입 시간 ↑ | 5월 1주차 집중 학습 + Apache Jena Fuseki 표준 사용 + Stardog 학습 자료. UI는 SPARQL 비노출. |
| 다국어 contentTypeId 코드 차이 (12 vs 76) | 8개 언어 결합 시 빈 결과 | 매핑 테이블 하드코딩 + 다국어 인덱스 분리. |
| AI 기본법 표시 의무 | Reranker는 약함, TTS는 강함 | TTS는 첫 3초 "AI 음성" 명시. Reranker는 정렬만 → 표시 불요. |
| 위치기반서비스사업자 신고 | 미신고 형사처벌 | 5월 즉시 신고. |
| 라이선스 분기 | 이미지 cpyrhtDivCd Type3 변형 위반 | 빌드 단계 가드. |

---

## 8) 추천 기술 스택

- **프론트**: Next.js 15 + Tailwind + shadcn/ui + next-intl(8개 언어) + deck.gl(2-pane + lasso 패턴 EditableGeoJsonLayer) + ECharts.
- **백엔드**: Node + Hono + Postgres + PostGIS + pgvector + **Apache Jena Fuseki**(LOD triple store, JVM).
- **검색**: BM25 + 벡터 + LLM-as-Reranker(Cohere Rerank).
- **지도**: 카카오맵 + VWorld 3D (한라산).
- **TTS**: CLOVA Voice (한·영·중·일).
- **AI**: Claude Haiku 4.5 (RAG 보조) + bge-m3.
- **호스팅**: Vercel + NCP (Fuseki는 NCP).

---

## 9) 한줄 PT 핵심 메시지

> **"제주를 처음 가는 사람을 위한 앱은 많습니다. 제주를 두 번째 가는 사람을 위한 앱은 없었습니다. SPARQL이 짠 9미·9품·웰니스의 그물망으로, 제주를 다시 만나게 합니다."**

발표 시연: 사용자가 "한식 + 해녀 어촌 식당 + 휠체어 접근 + 올레 6코스 인접 + 평일 점심 한산" 5조건 조합 → SPARQL 자동 생성 (UI에는 자연어로) → 7개 결과 → 지도에서 lasso로 동쪽 해안 30km 그리기 → 결과 자동 갱신 → 외국어 토글로 영문 음성 가이드. 발표 점수 14점 가능.
