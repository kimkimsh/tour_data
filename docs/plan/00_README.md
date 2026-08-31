# 00 — 「모두의 백제 (Modu Baekje)」 구현 기획 블루프린트 인덱스

> **이 파일은 블루프린트의 진입점이다.** 단일 권위 소스는 [`SPEC.md`](./SPEC.md) (frozen)이며, 이 README와 `01`–`15` 확장 문서는 모두 SPEC의 한 절(節)을 빌드 가능한 수준으로 펼친 것이다. **어떤 문서든 SPEC과 충돌하면 SPEC이 이긴다.**

「모두의 백제」는 **2026 KTO 관광데이터 활용 공모전 ① 웹·앱 개발 부문**을 위한 **배리어프리(무장애) 헤리티지 관광 웹앱**이다. 충남 공주·부여 백제역사유적지구 **6 POI**를 대상으로, **한 번 수집·검증한 무장애 접근성 데이터가 F1 사전 결정 → F2 현장 도슨트 → F3 현장 제보 → F4 교육 기록 → F5 충남 RTO 개선 신호까지 하나의 데이터셋으로 흐르는 것**을 증명하는 것이 핵심 테제다. 스택은 **Next.js 15 + Supabase(Postgres 17 + PostGIS) + Vercel(Seoul)** PWA로 고정되어 있고, 방향성은 **좁고 계약-우선이며 콘텐츠-검증된 시스템**(넓은 플랫폼이 아님)으로 잠겨 있다. 승리 조건은 기능 수가 아니라 **동일 데이터셋이 F1→F5를 관통한다는 증거**다.

---

## 목차 (Table of Contents)

| # | 문서 | 확장하는 SPEC 절 | 한 줄 설명 |
|---|---|---|---|
| — | [`SPEC.md`](./SPEC.md) | (권위 원천) | 단일 진실 소스(frozen). §0 한 줄 정의 · §1 채점 · §2 잠금 결정 16개 · §3 6 POI · §4 아키텍처 · §5 데이터 모델 · §6 KTO 계약 · §7 4-Layer 산식 · §8 F1–F5 · §9 워크스트림/타임라인 · §10 KWCAG/법무 · §11 위험 · §12 PT · **§13 플랜-리뷰 수정사항(2026-06-14)** |
| 00 | `00_README.md` | (인덱스) | 본 문서 — 블루프린트 진입점, 목차, 읽기 경로, 결정 로그, 상태 |
| 01 | [`01_overview_goals_scope.md`](./01_overview_goals_scope.md) | §0–§3 · §12 | 서비스 개요 · 채점 매핑 · MVP In/Out 범위 · 페르소나 4종 · "한 데이터셋 F1→F5" 테제 · 10월 합격 기준(AC-01~10) |
| 02 | [`02_architecture.md`](./02_architecture.md) | §4 | 세 평면(data/domain/presentation) + 순수 도메인 코어 · 모노레포 패키지 경계 · 설계 불변식 · 스택 상세 |
| 03 | [`03_data_model.md`](./03_data_model.md) | §5 | DB Contract v1 — Supabase 테이블 DDL · enum · `accessibility_facts` 경계 · RLS default-deny · Storage · SRID 4326 |
| 04 | [`04_kto_data_integration.md`](./04_kto_data_integration.md) | §6 · §4 · §5 · §9(C2) · §11 | KTO 10개 서비스 typed client 계약 · ETL(ingest≠publish) · 단일 인코딩/XML 에러 · 코드 부트스트랩 · 빌드타임 게이트 |
| 05 | [`05_feature_F1_total_guide.md`](./05_feature_F1_total_guide.md) | §7 · §8(F1) | F1 무장애 토털 가이드 OS — A 상세 카드 + 4-Layer 증거 카드 · B 정적 경로 · C SOS/AAC · D 시간예산+산식 · E 후기/GPX · F 예측 가능 백제 |
| 06 | [`06_feature_F2_docent.md`](./06_feature_F2_docent.md) | §8(F2) | F2 Odii 4채널 도슨트(음성·자막·점자·수어) × 4언어 × 3모드 · geofence consent + map-tap fallback · AI 배지 · TTS 대체 |
| 07 | [`07_feature_F3_ugc_review.md`](./07_feature_F3_ugc_review.md) | §8(F3) | F3 배리어 제보 + 관리자 검수 큐 · 상태 머신 · no auto-recalc · approve→Realtime 알림 · reporter-trust |
| 08 | [`08_feature_F4_diary.md`](./08_feature_F4_diary.md) | §8(F4) | F4 다중 출력 다이어리 — local-first(IndexedDB) + 6채널 출력(학생PDF·교사루브릭·점자.brf·쉬운글PDF·GPX·단체합본) · no Chromium |
| 09 | [`09_feature_F5_rto_dashboard.md`](./09_feature_F5_rto_dashboard.md) | §8(F5) | F5 충남 RTO 갭 리포트 — completeness 집계 + 방문자 추세("방문자≠관광객" caveat) · B2G 갭 뷰 · PT-재현 스냅샷 |
| 10 | [`10_accessibility_kwcag.md`](./10_accessibility_kwcag.md) | §10(a11y 절반) | KWCAG 2.2 33 검사항목 · 자동 CI 게이트(axe/jest-axe/Storybook/Lighthouse/eslint) · 수동 스크린리더 게이트 |
| 11 | [`11_legal_compliance.md`](./11_legal_compliance.md) | §10(법무 절반) · §6(라이선스) | 위치정보법 §9의2 · PIPA · AI 기본법 라벨 · KOGL/`cpyrhtDivCd` most-restrictive-wins |
| 12 | [`12_workstreams_sequencing.md`](./12_workstreams_sequencing.md) | §9 · §4 · §11 | 5개 frozen contracts · 16개 스트림(C0–C4·F*·I0·Q0) · 디렉터리 소유권 · 의존 그래프 · 타임라인 · 에이전트팀 실행 |
| 13 | [`13_testing_quality.md`](./13_testing_quality.md) | §4 · §9 · §10 · §11 | 테스트 피라미드 · 도메인 골든 파일 · KTO contract(fixture) · RLS · 아키텍처 경계 · D.1 E2E · Lighthouse CI |
| 14 | [`14_demo_pt.md`](./14_demo_pt.md) | §12 | 시연·PT 전략 — 채점 루브릭 대응 · D.1 골든 플로우 샷 시퀀스 · 백업 영상 · 데모 시드 분리 |
| 15 | [`15_risks_open_items.md`](./15_risks_open_items.md) | §11 | 위험 레지스터(R-*) · 빌드타임 게이트 · **결정 로그(§3)** · 미결 항목(OI-1~10) · 변경 프로토콜 |
| 16 | [`16_suitability_policy.md`](./16_suitability_policy.md) | §7 · §13.1 | **4-Layer 적합도 산식 policy 단일 권위** — `SuitabilityResult` 계약 · capability catalog · Layer A–D 행렬/임계값/갈등 규칙 · 골든 케이스 게이트 · 전문가 서명 조건 (`suitability-policy-v1`) |

> **연구 부록:** [`_research/00_SYNTHESIS.md`](./_research/00_SYNTHESIS.md) (D1–D4 vs R1–R5 대조), [`_research/_pairing_reconcile.md`](./_research/_pairing_reconcile.md) (Claude⇆Codex 아키텍처 페어링), 그리고 일관성 점검 결과 [`_research/_consistency_check.md`](./_research/_consistency_check.md).

---

## 어떻게 읽는가 — 개발자-에이전트 경로

새로 합류한 빌더(사람 또는 에이전트)는 **반드시 이 순서로** 읽는다. 단일 문서를 고립해서 읽지 않는다.

```
1. SPEC.md         ← 전체 계약. §2 잠금 결정 16개를 먼저 내면화한다.
2. 02_architecture ← 세 평면 + 모노레포 경계. "내 패키지가 무엇을 import 할 수 있는가".
3. 03_data_model   ← DB Contract v1. accessibility_facts 경계 + RLS. 모든 feature의 입력.
4. 12_workstreams  ← 5 contracts + 내 스트림의 소유 디렉터리·의존·DoD. "내가 어디에 쓰는가".
5. <your feature>  ← 담당 기능 문서 (05 F1 / 06 F2 / 07 F3 / 08 F4 / 09 F5).
   + 횡단 참조: 10 a11y(전 feature 선행) · 11 legal · 13 testing(게이트) · 15 risks(미결 항목).
```

**핵심 규칙:** 계약(03 DB · 04 KTO · 12의 5 frozen contracts)이 green이 되기 전에는 어떤 feature 스트림도 시작하지 않는다. 각 스트림은 자기 소유 디렉터리에만 write 하고, 타 디렉터리는 계약 import(read-only)만 한다.

### Day-1 셋업 런북 (DevEx · SPEC §14.10)

새 스트림 오너(사람·에이전트)는 첫날 아래 순서로 부팅한다 — 이 런북이 없으면 18개 스트림 전부가 0시에 막힌다.

```bash
# 0) 사전 요구: Node 20(.nvmrc), pnpm, Supabase CLI, Docker
nvm use                       # .nvmrc = 20
pnpm install --frozen-lockfile
cp .env.example .env.local    # KTO_SERVICE_KEY_DECODING · SUPABASE_* · ETL_HMAC_SECRET 등 채움
supabase start && supabase db reset
pnpm run seed                 # 데모 시드(공산성·부소산성)
# 1) 첫 green 확인:
pnpm run typecheck && pnpm --filter @modu/domain test   # 도메인 골든이 green 이어야 함
```

- **스크립트 매니페스트의 단일 권위 = `13` 부록 A(완전판)** — `etl:ingest`/`capture-fixtures`/`exports:update-golden`/`validate-content` 등 plan 어디서든 호출되는 스크립트를 전부 정의(발췌 금지). 오너 = C0.
- **테스트 러너:** 도메인 = vitest, contract/exports/component = jest — 패키지별로 명시하고 각 config 오너를 둔다(SPEC §14.5g).
- **첫 수직 슬라이스(SPEC §13.3) 픽스처 스펙**은 `12`의 "첫 슬라이스 픽스처" 절 참조(페르소나·예산, 3개 스텝, 1개 F5 갭, 기대 label 고정). HTML 다이어리 leg의 W1 프로듀서로 **CX `renderHtml` 최소본을 Window 1에 포함**한다.
- 워크스페이스 스코프는 `@modu/*`로 통일(SPEC §14.5d).

---

## 잠금된 결정 로그 (Locked Decision Log)

> 권위 원천: SPEC §2 + §13 + 상세 로그 [`15_risks_open_items.md §3`](./15_risks_open_items.md). 산식 policy 권위: [`16_suitability_policy.md`](./16_suitability_policy.md). 상태 표기 — **LOCKED**=변경 불가 · **USER**=사용자 직접 결정 · **PAIRING**=Claude⇆Codex 페어링 결과.

### SPEC §2 잠금 결정 (16개)

| # | 결정 | 값 | 상태 |
|---|---|---|:--:|
| 2.1 | 주제 | 「모두의 백제」 확정 | LOCKED |
| 2.2 | 스택 | Next.js 15(App Router/TS/React 19/Node 20) + Supabase(PG17+PostGIS, **no pgvector**) + Vercel, 전부 Seoul(`icn1`/`ap-northeast-2`) | LOCKED |
| 2.3 | 앱 형태 | PWA(Serwist) — 네이티브 아님. 모바일 KS X 3253 = 발전방향 | LOCKED |
| 2.4 | 캐시 모델 | Next 15 `unstable_cache`(per-user 데이터 절대 금지). Next 16 Cache Components 미사용 | LOCKED |
| 2.5 | 방향성 | **좁고 계약-우선·콘텐츠-검증 시스템**(넓은 플랫폼 아님) | LOCKED |
| 2.6 | 라우팅 | **정적 큐레이션 경로 패키지**(6 POI). 동적 pgRouting/DEM = MVP 제외 | LOCKED |
| 2.7 | 데이터 제공 | **런타임 KTO 호출 없음.** ETL→Supabase publish; 휘발성 데이터도 단기 스냅샷. DB = 1차 캐시 + 진실 소스 | LOCKED |
| 2.8 | 검색/AI | **pgvector/RAG/임베딩/OCR/360°/멀티AI 없음** → 발전방향 | LOCKED |
| 2.9 | 메시징 | **FCM/APNs/알림톡 없음.** 인앱 배너 + Supabase Realtime(승인 알림만) | LOCKED |
| 2.10 | ETL 스케줄러 | **GitHub Actions**(무거운 배치) + **Vercel Cron**(단기 갱신만). GH Actions → HMAC 내부 엔드포인트 → `revalidateTag`; bounded TTL 복구 | LOCKED |
| 2.11 | 인증 | 핵심(탐색·도슨트·다이어리) = **로그인 불필요**. UGC 식별용 Supabase **Anonymous** auth만 | LOCKED |
| 2.12 | 결제 | MVP 없음(정보+추천만 → 통신판매업/여행업 미적용) | LOCKED |
| 2.13 | A11y 인증 | **자체점검 + 수동 스크린리더 검증**이 핵심 경로; 정식 WA/KWACC = 비차단(발전방향) | LOCKED |
| 2.14 | **Layer C cap** | 인증 보정 **+0.12(1.00–1.12)**; KQ = 메타데이터만. 제안서 ×1.30의 보수적 개선 | **USER+PAIRING** |
| 2.15 | 외부 데이터(MVP) | KTO 10개 + BF인증 + 국가유산청 + 기상청 + 응급/AED + 충남(다도라/올담). 나머지 24개 → 발전방향 | LOCKED |
| 2.16 | 자체 제작 콘텐츠 | **백제 마스코트 6컷만** 자체 제작; 픽토그램/AAC/쉬운글은 공개 셋 재활용 | LOCKED |

### 사용자 직접 결정 4건 (2026-06-14)

| ID | 결정 | 내용 |
|---|---|---|
| **U-1** | 방향성 확인 | 페어링 권고 채택 — Narrow direction. 드롭: pgRouting/DEM · pgvector/RAG · Upstash · FCM/APNs/알림톡 · OCR · 360° · 멀티AI 제공자 · 24개 데이터셋 완전 통합 |
| **U-2** | Layer C cap | Codex 권고 채택 — **+0.12 상한**. 제안서 ×1.30은 정밀도 과장으로 명시, 문서화된 개선 사항으로 기록 |
| **U-3** | 잠금 보존 가드(lock-preserving guards) | `unknown=0.35` · Layer C `+0.12` · Layer D decay 값 모두 **잠금 유지**. 대신 가드 추가: `coverage < 0.65` → 라벨 **'주의'** 상한; 인증 단독으로 라벨 경계 초과 금지; `evidenceConfidence`/`coverage` 점수와 **별도** 출력; 대안 트리거 **`<70`** (검증된 카드 POI만). 상세: [SPEC §13.1](./SPEC.md) · [16 §5–§10](./16_suitability_policy.md) |
| **U-4** | 권고 범위 축소 + PT 전략 | §13.2 scope cuts 채택(F1.F 7→3요소 · F2 geofence 제거 · F1.E UGC GPX → F3 전용 · F4 출력 우선순위 · F5 단일 갭-우선 리포트 · 6-POI 깊이 티어링 · 시간예산 3단). §13.8 PT 전략 채택(사전 녹화 1:00–7:00 주 아티팩트 · 3개 히어로 라이브 순간). 상세: [SPEC §13.2](./SPEC.md) · [SPEC §13.8](./SPEC.md) |

### Claude⇆Codex 페어링 결과 (계약-검증, 2026-06-14)

> 두 모델이 동일 입력(canonical 제안서 + `00_SYNTHESIS.md`)으로 **독립** 초안 작성 후 조정. **수렴 판정: 셋(set) 수렴, 순서 일부 발산 → 판사 라운드 불필요.** Codex 개선은 모두 제안서 리스크 레지스터와 정합하여 채택. 상세: [`_research/_pairing_reconcile.md`](./_research/_pairing_reconcile.md), [`15 §3.2`](./15_risks_open_items.md).

- **수렴(고신뢰):** 순수 도메인 `calculateSuitability` 결정론 함수 · F1 복수 분할 · 정식 F1–F5 번호 유지 · 리스트=진실/지도=보조 · local-first 다이어리 · 계약 우선 동결 · 수동 스크린리더 > 형식 인증 · GH Actions 배치/Vercel Cron 단기 · D.1 단일 내러티브 · 데모 깊이 범위 축소.
- **채택된 통합 입장:** **Narrow, contract-first, content-verified system**(Codex 척추) + **순수 도메인 점수 핵심이 투명 증거 카드로 표면화**(Claude 차별화). 6-POI 검증 콘텐츠 패키지가 기반이고, 4-Layer 투명 카드가 그 위에 서는 상보 관계.
- **Codex 개선 채택(D2–D13):** 휠체어 라우팅 제거 → 정적 경로 · pgvector 제거 · 런타임 KTO 없음 · F1 5-way 분할 · `accessibility_facts` 스키마(jsonb 대신) · Content Package 조기 동결(C4) · 모노레포 · 로그인 불필요 · 외부 데이터 명시 셋 · PDF는 react-pdf+pdf-lib(no Chromium) · HMAC `revalidateTag` 캐시 무효화.

### Claude⇆Codex 플랜-리뷰 결과 (2026-06-14)

> CEO/Eng/DevEx/Office-hours 4개 페르소나 리뷰 + 독립 Codex 플랜-리뷰 + SPEC↔docs 일관성 점검 통합. **판정: 계획 문서 "아직 경쟁 준비 미완 — 수정 가능한 격차"**. 전체 결과: [`_research/_plan_review_findings.md`](./_research/_plan_review_findings.md). 수정사항 권위: [SPEC §13](./SPEC.md) + [16_suitability_policy.md](./16_suitability_policy.md).

- **블로커 해소(B-1~B-7):** `SuitabilityResult` 계약 단일화(→ `16`) · 산식 inputs 정의(→ `16`) · 현장 검증 DoD = evidence pack(§13.5) · 검증 일정 3-pass(§13.6) · 첫 수직 슬라이스 단일 정의(§13.3) · 범위 축소 게이트(§13.4).
- **주요 수정(M-1~M-9):** Layer A persona-neutral / Layer B persona-fit 분리(→ `16 §2/§4`) · `evidenceConfidence`/`coverage` 별도 출력(§13.1 가드) · `unknown=0.35` 잠금 유지 + coverage cap 추가(→ `16 §6`) · `verified` DoD 강화(§13.5) · 갭 우선 공식화(→ `16 §9`) · 다중 출처 충돌 규칙(→ `16 §8`) · 대안 정책 `<70` + 검증 카드 전용(→ `16 §10`).
- **수렴 항목(고신뢰):** 위 블로커/주요 항목 전부 수렴. 산식 잠금값(§2.14) 유지 합의.

> **Content Package Contract v1 (C4) 소유 위임:** 이 계약은 설계상 단일 전용 문서를 두지 않는다. 권위 조각은 — **SPEC §9 ⑤**(계약 본문), [`03_data_model.md`](./03_data_model.md)(`route_guides`/`route_steps`/`poi_entrances`/도슨트 테이블), [`12_workstreams_sequencing.md §C4`](./12_workstreams_sequencing.md)(스트림 DoD), `packages/content-schema`의 `content/` Zod 스키마 — 에 분산된다. **1차 참조 문서 = `12_workstreams_sequencing.md`.**

---

## 현재 상태 (Status)

| 항목 | 값 |
|---|---|
| 방향성 | **APPROVED DIRECTION** (2026-06-14) — SPEC frozen, 결정 로그 §3 잠금 완료 |
| **플랜-리뷰** | **v5 (2026-06-14) + v6 sixth-pass (2026-06-15, Claude 6-lens + Codex `gpt-5.5` 교차검증)**; build-ready pending policy expert sign-off + early validation (see SPEC §13·**§14** + [16_suitability_policy.md](./16_suitability_policy.md) + [`_research/_plan_review_v6_findings.md`](./_research/_plan_review_v6_findings.md)) |
| 단계 | **빌드 단계 (build phase)** — C0 contracts + 첫 vertical slice 진행 중 (6/14–6/28) |
| 빌드 종료 타깃 | **2026-09-30 RC** (feature freeze + PT 리허설) |
| 기능심사 + PT | **2026년 10월** (1차 서면·기능심사 100 + 최종 PT 100) |
| 미결 항목 | OI-1~10 (대부분 C0 빌드타임 게이트에서 해소 — [`15 §3.4`](./15_risks_open_items.md)) |
| 즉시 주의 위험(HH) | R-D1(detailWithTour2 필드) · R-D4(serviceKey 인코딩) · R-D5(운영계정 지연) · R-F1(기능 과밀) |

> **다음 게이트:** 5개 frozen contracts(DB·KTO·Domain·Design·Content)가 green이 되고 `공산성` 1 POI가 **F1→F5**(F1.A/D → 3단계 검증 경로 → HTML 다이어리 → F5 갭 1건, SPEC §13.3)를 관통하는 첫 수직 슬라이스가 CI green이면 horizontal 확장 개시.
>
> **v6 추가 게이트 (SPEC §14.11):** capability_code 단일 어휘 set-equality CI(§14.2) + contract 통합(§14.5)이 green이어야 스트림 시작; **§14.6 계보 exhibit(data passport)이 첫 슬라이스 수락 아티팩트**; **§14.8 hero-POI 현장 검증이 `supported` 시드보다 선행**.
