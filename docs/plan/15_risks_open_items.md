# 15 위험·미해결 항목·결정 로그

> **Authority:** SPEC §11 + proposal 부록 B 확장. 이 문서는 구현 중 발생하는 결정·위험을 추적하는 살아있는 로그다. SPEC.md가 변경되면 이 문서도 같은 커밋에 갱신한다.
> **상태 (2026-06-14):** 결정 로그 §3 잠금 완료. §1 위험 레지스터와 §2 빌드타임 게이트는 C0 contracts 단계에서 검증 후 상태를 갱신한다.

---

## §1. 위험 레지스터

각 위험은 독립 행으로 추적된다. **Impact:** H=High(점수 또는 런타임 영향) / M=Medium / L=Low. **Likelihood:** H/M/L. **Priority = Impact × Likelihood.** Owner-stream은 SPEC §9 스트림 코드(C0–Q0)를 따른다.

### 1.1 데이터 계층 위험

| ID | 위험 | Impact | Likelihood | Priority | 완화 전략 | Owner |
|---|---|:---:|:---:|:---:|---|:---:|
| R-D1 | **`detailWithTour2` 필드 키 불일치** — 제안서(21필드), D1 브리프, D4 브리프가 세 가지 서로 다른 키 목록(`restroom` vs `handicaptoilet`, `lactationroom` vs `nursingroom`)을 제시함. F1.A 카드와 `accessibility_facts` 스키마가 잘못된 키에 의존할 경우 ETL 전체가 공 데이터를 반환 | H | H | HH | (1) C0/WS0-KTOClient 첫 태스크로 가이드 v4.3 PDF 다운로드 + 공주/부여 실 contentId 프로브 실행. (2) 확인된 키만 `content-schema` Zod에 등록; 미확인 키는 `unknown` passthrough. (3) 계약 테스트(`tests/contract/detailWithTour2.spec.ts`)를 실 응답 fixture로 실행; CI가 키 누락 시 실패 | C2 |
| R-D2 | **lDong 코드 하드코딩** — 제안서 예시(`lDongRegnCd=44`, `lDongSignguCd=150/760`)는 digest 주장이며 live 검증 미완료. 잘못된 값은 `areaBasedList2` 필터가 빈 결과를 반환 | H | M | HM | (1) `ldongCode2` 부트스트랩 호출 결과를 `source_code_mappings` 테이블에 적재. (2) 코드는 DB에서만 조회; 소스에 `44/150/760` 리터럴 금지. (3) `scripts/validate-content/verify-ldong-codes.ts`가 공주·부여 코드를 응답에서 확인 후 CI 통과 | C2 |
| R-D3 | **`cat→lclsSystm` 이름 변경 오해** — `HS/HS01` 등 예시가 실제 `lclsSystmCode2` 응답과 불일치하면 POI 카테고리 필터가 전체 실패 | H | M | HM | (1) `lclsSystmCode2` 부트스트랩 응답에서 레이블 맵을 실증적으로 생성; D1 예시를 가설로만 처리. (2) 맵을 `source_code_mappings(service='lclsSystm')`에 저장. (3) `HS/VE/EV` 가설은 허용; 소스 코드에 직접 사용 금지 | C2 |
| R-D4 | **serviceKey 이중 인코딩** → `resultCode 30` — Encoding key를 서버가 한 번 더 인코딩하면 `%2B→%252B`가 되어 KTO가 미등록 키로 거부 | H | M | HM | (1) Decoding key를 서버 전용 env var에 보관. (2) `URLSearchParams` / `new URL()`로 정확히 한 번 인코딩; `kto-client`에 double-encode 감지 단언 추가. (3) 키를 로그·응답에 절대 노출 금지 | C2 |
| R-D5 | **KTO 운영 계정 발급 지연** — dev 계정은 1,000 calls/op/day 상한. 운영 계정(≈100,000/day) 심사 1–3일 + 활용사례 URL 필요. PT 직전 심사라면 데모가 quota 한계에 걸림 | H | M | HM | (1) 활용사례 URL 생성 즉시(첫 수직 슬라이스 배포) 운영 계정 신청. (2) 데모 환경은 DB 스냅샷 우선(런타임 KTO 호출 불필요 — SPEC §2.7). (3) `tests/demo/` 시나리오 전체를 스냅샷 seed로 실행 가능하게 유지 | C2 |
| R-D6 | **Odii 6 POI 미커버리지** — Odii `storyLocationBasedList`가 공주·부여 6 POI를 커버하지 않을 가능성 | H | M | HM | (1) C0 단계에서 `themeBasedList`·`storyBasedList` 키워드 프로브로 커버리지 측정. (2) 미커버 POI는 국가유산청 메타데이터 + CLOVA TTS 자체 생성으로 대체. (3) 데모 음성은 Supabase Storage 사전 저장(런타임 Odii 무의존) | F2 |
| R-D7 | **TatsCnctr 공주 `signguCd` 미확인** — 부여=34800만 브리프에 존재; 공주 코드가 없으면 F1.D Layer A 시간대 적합도 입력 누락 | M | H | MH | (1) C0 단계에서 `tatsCnctrRateList` 충남(areaCd=34) 응답을 파싱해 `tAtsNm`×`signguCd` 매핑 덤프. (2) 공주 코드를 `source_code_mappings`에 기록. (3) 미발견 시 Layer A `timeContext` 가중치(0.10) 항목에 `unknown` 처리(→ 0.35 기본값); UI에 "시간대 정보 없음" 표시 | C2, F1-AD |
| R-D8 | **Supabase Free 플랜 자동 일시정지** — 1주일 비활동 시 Free 플랜 DB가 일시정지. PT 직전 리뷰어 접근 불능 | H | L | HL | (1) 9월 1일 이전 Supabase Pro로 업그레이드($25/mo). (2) GitHub Actions health-check cron이 매일 DB에 쿼리를 보내 idle 방지. (3) `tests/demo/smoke.spec.ts`를 매일 실행하는 Vercel Cron으로 추가 방어 | C1 |
| R-D9 | **충남 증거 체인 미확립 (P0 — CEO 차단 항목)** — 공주 `lDong` 코드와 TatsCnctr `signguCd` 프로브가 실행되지 않으면 F5 격차 리포트와 충남 KTO 특별상(CACF RTO 신호) 스토리가 성립되지 않는다(SPEC §13.7). CACF 의향서 없이 "B2G → CACF 데이터 채널" 슬라이드를 유지하면 PT에서 과장 주장으로 감점 가능 | H | H | HH | (1) **이번 스프린트** 즉시 Gate 2(공주 `lDong`) + Gate 4(공주 TatsCnctr `signguCd`) 프로브 실행. (2) **7월 말**까지 CACF 의향서(letter-of-intent) 수령. (3) 7월 말까지 미수령 시 슬라이드 표현을 "B2G → CACF"에서 "RTO 인계를 위해 설계된 충남 격차 리포트"로 완화하고 PT 스크립트 반영. (4) 결과를 `source_code_mappings`에 기록, Gate 2/4 CI에 편입 | C2, C0, Q0 |

### 1.2 도메인 로직 위험

| ID | 위험 | Impact | Likelihood | Priority | 완화 전략 | Owner |
|---|---|:---:|:---:|:---:|---|:---:|
| R-L1 | **적합도 점수 허위 정밀도** — `calculateSuitability`가 소수점 점수를 반환하지만 `unknown`(0.35 대입) 비중이 높으면 점수가 의미 없는 중간값을 반환. 사용자가 "62점"을 믿고 방문했다가 현장 불일치 | H | M | HM | (1) `coverage` 비율을 항상 `SuitabilityResult`에 포함. (2) coverage < 65% → `label = "정보 없음"` 강제(SPEC §7). (3) 카드 UI는 점수 숫자보다 라벨과 coverage %, 마지막 검증일을 전면에 표시. (4) "정보 없음" 라벨은 (a) 본질 제약 / (b) 운영자 미입력 사유를 분리 표시 | domain, F1-AD |
| R-L2 | **에이전트 계약 드리프트** — 모노레포 6개 패키지가 병렬 개발될 때 `domain` 순수 함수 시그니처, DB 스키마, KTO 클라이언트 타입이 개별로 수정되면 런타임 오류가 통합 단계까지 숨겨짐 | H | M | HM | (1) 각 계약(DB v1, KTO v1, Domain v1, Design v1, Content v1)은 단일 소유자가 버전 태그를 붙여 관리(SPEC §9). (2) `packages/domain`은 Next.js/Supabase import 금지(`eslint-plugin-import` boundary 규칙). (3) Contract test suite(`tests/contract/`)는 fixture 기반으로 CI에서 실행; 계약 변경은 PR 필수. (4) `.github/CODEOWNERS`로 계약 파일 변경 시 소유자 리뷰 강제 | C0, C1 |
| R-L3 | **Layer C 상한 미준수** — 개발 중 원래 제안서 Layer C(×1.00–1.30)를 참조하면 cap +0.12 결정이 실수로 되돌아감 | M | M | MM | (1) `calculateSuitability` 소스 주석에 `// Layer C capped at +0.12 (1.00–1.12); proposal ×1.30 was replaced — see Decision D-5` 기입. (2) Unit test로 BF우수(+0.08) + 열린관광지(+0.04) = +0.12 = max 검증; +0.13이면 실패. (3) KQ는 score boost 없이 metadata-only — `poi_certifications` 행으로만 저장 | domain |
| R-L4 | **멀티페르소나 페널티 누락** — `multi-persona`에서 가장 낮은 `personaFit`을 취하는 로직이 누락되면 한 페르소나가 다른 페르소나의 높은 점수로 마스킹됨 | H | L | HL | (1) `calculateSuitability` 내 `min(personaFit over selected personas)` 단언 테스트를 P1a+P3 조합으로 작성. (2) `critical AND` 강제: 선택 페르소나의 CRITICAL capability가 `unsupported`이면 score ≤ 49 강제 — 별도 unit test | domain |

### 1.3 기능 범위 위험

| ID | 위험 | Impact | Likelihood | Priority | 완화 전략 | Owner |
|---|---|:---:|:---:|:---:|---|:---:|
| R-F1 | **기능 과밀(Feature Glut)** — F1~F5 + 4개 언어 + KWCAG + UGC를 4개월 안에 완성하려는 범위 과대 | H | H | HH | (1) F1~F5 각각 수직 슬라이스 1개(공산성 휠체어·시니어·가족 조합)를 6/28까지 완성. (2) "발전방향" 태그 기능은 UI에도 "(출시 예정)" 뱃지로 표시; 데모에 포함하지 않음. (3) SPEC §9 타임라인 준수를 Q0가 매 스프린트 검증 | all streams |
| R-F2 | **F4 PDF/BRF 품질** — `@react-pdf/renderer` CJK 줄바꿈 미설정, Pretendard TTF 미임베드, `braillify` 한국어 점자 변환 오류 | H | M | HM | (1) `registerHyphenationCallback`을 per-char no-hyphen으로 설정. (2) Pretendard static TTF를 `packages/ui/fonts/`에 번들; 외부 URL 의존 금지. (3) `braillify` → `.brf` 40×25 포맷 + FF(0x0C) 페이지 구분자 unit test. (4) HTML 대안 항상 제공(SPEC §8 F4). (5) Chromium 의존 금지(MVP) | F4 |
| R-F3 | **F3 UGC 오염** — 악의적·중복·오류 제보가 검수 큐를 초과하거나 승인 전 레코드가 공개 읽기 가능 | H | M | HM | (1) `barrier_reports`는 `self insert/read + approved public` RLS(SPEC §5). (2) 선택형 양식 + 사진 근거 필수; 자유 텍스트 최소화. (3) 신고자 신뢰도 점수 컬럼(`reporter_trust`)으로 자동 필터. (4) 자동 재계산 없음 — 관리자 검수 큐 통과 후 `Supabase Realtime` broadcast(승인 상태만) | F3, C1 |
| R-F4 | **F2 수어 영상 커버리지** — MVP 6 POI 샘플 수어 영상은 국립국어원 한국수어사전 + 서울관광재단 다누림 협력 의존. 협력 미성사 시 수어 채널 비워짐 | M | M | MM | (1) 수어 채널은 선택적 채널; 미제공 POI는 "수어 자막 준비 중" 상태 표시. (2) 대안: 한국수어사전 embed/deep-link 방식 전환(재배포 없이). (3) 채널 4개 중 3개(음성·자막·점자)는 수어와 무관하게 독립 완성 | F2 |
| R-F5 | **다국어 콘텐츠 품질** — KTO 다국어 서비스 원문 품질이 낮거나 POI 커버리지 부족 시 영문/일문/중문 UI가 한국어보다 현저히 열악 | M | M | MM | (1) KTO 다국어 원문 우선; 자체 번역은 보조 + "AI 번역" 배지 의무. (2) multilingual contentTypeId 매핑(76/78/85) 검증 fixture 작성; 국문 12로 다국어 호출 시 빈 결과 확인 테스트. (3) 6 POI의 다국어 원문 커버리지를 ETL 실행 후 `poi_completeness_mv`에서 확인 | C2, F1-AD |

### 1.4 접근성·법률 위험

| ID | 위험 | Impact | Likelihood | Priority | 완화 전략 | Owner |
|---|---|:---:|:---:|:---:|---|:---:|
| R-A1 | **a11y 자동화 과신** — axe-core CI가 KWCAG 33검사항목의 30–50%만 커버. CI 통과를 "인증 통과"로 오해하거나 수동 검사 없이 제출 | H | M | HM | (1) CI 게이트는 자동화 회귀 방지 전용임을 README에 명시. (2) NVDA + 센스리더 수동 검사를 9/1–9/15 주간으로 일정 고정(SPEC §9). (3) map canvas는 axe `.exclude('.map-canvas')` 처리 후 수동 체크리스트로 라우팅; 게이트 통과 ≠ 커버 | Q0, C3 |
| R-A2 | **정식 인증 일정 착오** — "자체점검(MVP)"과 "정식 인증(발전방향)"의 경계가 흐려지면 PT에서 인증 과장으로 감점 | H | L | HL | (1) UI, 발표 자료, 이 문서 모두에서 "KWCAG 2.2 자체점검 (axe-core CI + 수동 SR 검증)"과 "정식 인증 신청 후보 (WA/KWACC, 출시 후 3개월 내)"를 명확히 분리. (2) K-WAH 자체점검 보고서를 9월 말 작성(인증 기관 제출 서식) | C3, Q0 |
| R-A3 | **위치정보법 제9조의2 신고 누락** — GPS 실시간 사용 전 방통위 신고 없이 배포하면 법 위반 | H | L | HL | (1) MVP는 map-tap 방식으로 실시간 GPS를 지연(SPEC §2.11 + §10). (2) 방통위 신고를 9월 배포 전까지 완료; 신고 전까지 GPS 자동 트리거 기능은 기능 플래그로 비활성. (3) raw GPS는 영구 저장 금지(§23 secure-wipe) | C3 |
| R-A4 | **PIPA 개인정보 국외이전 미고지** — Vercel(US) 처리·Supabase Storage CDN의 글로벌 PoP을 개인정보처리방침에 미기재 | M | M | MM | (1) PII(제보 작성자 식별·소셜 프로필)는 Supabase Seoul Postgres에만 저장; CDN/Edge 배치 금지. (2) 개인정보처리방침에 Vercel(US)/Kakao 위탁·국외이전 명시. (3) 분리 동의 체크박스(수집·이용 / 제3자제공 / 위치 / 마케팅) 구현 | C3 |
| R-A5 | **AI 기본법 라벨 누락** — "AI 음성 안내", "AI 번역", "AI 생성 코스" 배지가 CSS-only 또는 스크린리더에 노출 안 됨 | M | M | MM | (1) 배지는 `aria-label` 포함 실제 DOM 요소로 렌더. (2) 릴리스 준비 체크리스트(`tests/demo/ai-label-audit.spec.ts`)에서 3종 배지 존재 확인 | C3, Q0 |
| R-A6 | **KOGL Type3 이미지 변환** — `cpyrhtDivCd=Type3` 이미지를 crop/filter/composite하면 저작권 위반 | M | M | MM | (1) `poi_media.transform_policy` 컬럼을 ETL이 `cpyrhtDivCd`에서 파생. (2) 이미지 렌더 컴포넌트는 `transform_policy='no_transform'`이면 next/image 변환 파라미터 금지. (3) `content-schema` Zod로 Type3 자산에 transform 시도 시 컴파일 경고 | C2, C3 |

### 1.5 운영·데모 위험

| ID | 위험 | Impact | Likelihood | Priority | 완화 전략 | Owner |
|---|---|:---:|:---:|:---:|---|:---:|
| R-O1 | **데모 당일 외부 API 장애** — PT 현장에서 KTO API 또는 Odii가 응답 불능 | H | M | HM | (1) 모든 KTO 호출은 DB 스냅샷 우선(SPEC §2.7); 런타임 KTO 의존 없음. (2) Odii 음성·Supabase Storage MP3 사전 저장. (3) `tests/demo/` 전체를 seed DB로 실행하는 오프라인 데모 모드 유지. (4) 9/16–9/30 RC 단계에서 백업 영상 촬영(SPEC §9) | C1, Q0 |
| R-O2 | **Vercel Cron 타임존 착오** — `0 19 * * *` UTC = KST 04:00이 아닌 다른 시간이면 ETL과 분석 시간이 불일치 | L | M | LM | (1) `vercel.json crons`에 주석으로 `# KST 04:00 = UTC 19:00` 명시. (2) ETL 로그에 `ingestedAt`(UTC ISO8601)을 기록하고 모니터링 | C1 |
| R-O3 | **HMAC 보호 없는 `revalidateTag` 엔드포인트** — 공개 엔드포인트 노출 시 DoS 가능 | M | L | ML | (1) GitHub Actions → 내부 endpoint 호출 시 `X-Internal-Secret` HMAC 헤더 검증 미들웨어 적용. (2) 엔드포인트는 `NEXT_PUBLIC_` 아닌 서버 전용 환경 변수에서 시크릿 로드 | C1 |

### 1.6 검증·전문가 위험

| ID | 위험 | Impact | Likelihood | Priority | 완화 전략 | Owner |
|---|---|:---:|:---:|:---:|---|:---:|
| R-V1 | **전문가 검증 미실시** — 관광약자·특수교육·점자 전문가 검증 없이 개발팀만의 접근성 판단에 의존 | H | M | HM | **전문가 검증은 협상 불가 비차단 조건(non-negotiable).** 검증은 3단계로 분리(SPEC §13.6): (1) **7월 — 데모 대상쌍(공산성·부소산성) 1차 검증** (task-completion rate · critical-error count · help-request rate · comprehension · route-judgment accuracy 패스바 기준으로 판정). (2) **8월 — 전체 F1→F5 흐름 2차 검증.** (3) **9월 — 회귀 검증.** 모집·보상·장소·담당 owner·**패스바(task-completion rate, critical-error count, help-request rate, comprehension, route-judgment accuracy)는 6월 중 고정.** (4) PT 발표에 실사용자 인용 포함 | Q0 |
| R-V2 | **AI 전용 개발의 도메인 한계** — AI 에이전트 팀은 실제 무장애 현장 경험이 없어 접근성 판단의 맥락 오류 가능. 예: 경사도 숫자가 정확해도 실제 휠체어 조작 난이도와 불일치 | H | M | HM | (1) `route_steps`, `route_hazards` 데이터는 실측 검증 없이 "미검증" 플래그 유지. (2) 현장 검수 1회(5–6월 6 POI 방문 계획)를 전문가와 함께 수행. (3) 능력치(capability) 상태 "현장 검증"은 증거 팩 DoD를 충족해야 한다(아래 Gate B-3 참조). (4) UGC 검수를 전문 운영자(CACF 협력)가 담당. (5) 이 제약을 PT에서 "7월 1차·8월 2차·9월 회귀 관광약자 검증"으로 투명하게 언급 | C4, Q0 |

---

## §2. 빌드타임 검증 게이트 (Foundation)

SPEC §11 "Verify-at-build-time" 목록의 구체 실행 절차. 모두 C0/C2 단계 완료 전에 통과해야 한다. 실패 시 downstream 스트림(F1-AD, F2, F5)은 해당 계약에 의존하는 코드를 작성하지 않는다.

### Gate 1 — `detailWithTour2` 정확한 필드 키

**검증 절차:**

```typescript
// scripts/validate-content/verify-detailWithTour2.ts
// 실행: npx ts-node scripts/validate-content/verify-detailWithTour2.ts
const PROBE_CONTENT_IDS = [
  '2634812', // 공산성
  '264141',  // 무령왕릉과 왕릉원
  '126508',  // 국립공주박물관
  '126425',  // 부소산성
  '126544',  // 정림사지
  '126375',  // 국립부여박물관
];

// 1. KorWithService2/detailWithTour2 호출
// 2. 응답 키 목록을 guide v4.3 필드 목록과 비교
// 3. 불일치 키를 콘솔에 출력하고 exit(1)
// 4. 확인된 키를 packages/content-schema/src/detailWithTour2Fields.ts에 export
```

**합격 기준:** 6 POI 모두에서 응답이 오고, 최소 15개 키가 확인되며, Zod 스키마에 `unknown` passthrough 없이 등록 가능.

**연동 위험:** R-D1.

### Gate 2 — lDong 코드 (충남/공주/부여)

**검증 절차:**

```typescript
// scripts/validate-content/verify-ldong-codes.ts
// 기대값(가설): lDongRegnCd=44(충남), lDongSignguCd=150(공주), 760(부여)
// 실행: KorService2/ldongCode2 호출 → 충남 레코드 필터 → 실제값과 비교

interface LDongVerifyResult {
  province: { code: string; label: string };   // 충남
  sigungu: { code: string; label: string }[];  // 공주, 부여
  hypothesis: { regnCd: '44'; gongjuSiguCd: '150'; buyeoSiguCd: '760' };
  match: boolean;
}
// match=false이면 exit(1), source_code_mappings 테이블에 실제값 upsert
```

**합격 기준:** `ldongCode2`에서 충남·공주·부여 레코드를 찾고, `source_code_mappings`에 기록 완료.

**연동 위험:** R-D2.

### Gate 3 — KTO 게이트웨이 서픽스 확인

각 서비스의 실제 URL 서픽스를 Swagger/가이드 PDF와 대조한다.

| 서비스 | 예상 서픽스 | 검증 방법 |
|---|---|---|
| `TatsCnctrRateService` | `/tatsCnctrRateList` (서픽스 없음) | 실 호출 후 `resultCode=00` 확인 |
| `DataLabService` | `/locgoRegnVisitrDDList`, `/metcoRegnVisitrDDList` | 실 호출 |
| `PhotoGalleryService1` | `/galleryList1`, `/gallerySearchList1`, `/galleryDetailList1` | 실 호출 |
| `Odii` | `/storyLocationBasedList`, `/storyBasedList`, `/themeBasedList` | 실 호출 (공주·부여 좌표) |
| `TarRlteTarService1` | `/areaBasedList1`, `/searchKeyword1` (`1` 서픽스) | 실 호출 |

**합격 기준:** 전 서비스 `resultCode=00` 또는 `03`(데이터 없음); `10/11` 파라미터 에러 없음.

**연동 위험:** R-D4.

### Gate 4 — TatsCnctr 공주 `signguCd`

```typescript
// scripts/validate-content/verify-tats-signgu.ts
// KorWithService/tatsCnctrRateList areaCd=34 + 부여 signguCd=34800 → 정상 확인
// 동일 호출에서 공주 관련 레코드 필터 → signguCd 추출
// 결과를 source_code_mappings(service='TatsCnctr', code_type='signguCd')에 upsert
```

**합격 기준:** 공주에 해당하는 `signguCd`를 실 응답에서 추출 완료. 미발견 시 `unknown` 상태로 `source_code_mappings`에 기록하고 R-D7 완화 전략 2 적용.

**연동 위험:** R-D7.

### Gate 5 — Odii 6 POI 커버리지

```typescript
// scripts/validate-content/verify-odii-coverage.ts
const POI_COORDS = [
  { name: '공산성',       x: 127.1247, y: 36.4654, radius: 500 },
  { name: '무령왕릉',     x: 127.1149, y: 36.4592, radius: 500 },
  { name: '국립공주박물관', x: 127.1282, y: 36.4651, radius: 300 },
  { name: '부소산성',     x: 126.9087, y: 36.2777, radius: 500 },
  { name: '정림사지',     x: 126.9204, y: 36.2745, radius: 300 },
  { name: '국립부여박물관', x: 126.9218, y: 36.2718, radius: 300 },
];
// storyLocationBasedList langCode=ko 호출 → storyId 목록 확인
// 커버리지 리포트: { poi, storyCount, langCodes: string[] }[]
```

**합격 기준:** 6 POI 중 4개 이상에서 `storyCount > 0`. 미달 POI는 R-D6 대안(국가유산청 + CLOVA TTS) 자동 활성.

**연동 위험:** R-D6.

### Gate 실행 순서 및 CI 통합

```yaml
# .github/workflows/ci.yml (Foundation Gate 단계)
jobs:
  foundation-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Gate 1 — detailWithTour2 fields
        run: npx ts-node scripts/validate-content/verify-detailWithTour2.ts
      - name: Gate 2 — lDong codes
        run: npx ts-node scripts/validate-content/verify-ldong-codes.ts
      - name: Gate 3 — gateway suffixes
        run: npx ts-node scripts/validate-content/verify-gateway-suffixes.ts
      - name: Gate 4 — TatsCnctr signguCd
        run: npx ts-node scripts/validate-content/verify-tats-signgu.ts
      - name: Gate 5 — Odii coverage
        run: npx ts-node scripts/validate-content/verify-odii-coverage.ts
```

Gates 1–5는 C0 완료 전에 한 번, ETL 첫 실행 후 한 번 총 두 번 실행한다. 이후 weekly로 실행해 KTO 서비스 변경을 감지한다.

### Gate B-3 — "현장 검증" 증거 팩 DoD (SPEC §13.5)

능력치(capability) 상태를 `verified`(현장 검증)로 게시하려면 **아래 모든 항목이 갖춰진 증거 팩**이 있어야 한다. 항목 하나라도 누락되면 해당 capability 상태는 `unknown`으로 유지되고 게시가 차단된다.

| 필드 | 설명 |
|---|---|
| `photo` | 원본 사진 1장 이상 (압축·크롭·필터 처리 전 원본) |
| `measured_value` | 실측값 (예: 경사도 %, 문폭 cm, 단차 cm) |
| `measurement_method` | 측정 방법 및 장비 명칭 |
| `verifier` | 검증자 이름 + 자격·소속 |
| `second_approval` | 검증자와 다른 2차 승인자 및 승인 일시 |
| `validity_period` | 유효 기간 (기본값: 90일) |
| `change_history` | 이전 검증 이력 (최초 등록 시 빈 배열 허용) |

**문자열 단독 `verified_by/date` 조합은 게시 게이트를 통과하지 못한다.** ETL 검증 스크립트(`scripts/validate-content/verify-evidence-pack.ts`)가 누락 필드 시 `exit(1)`. 연동 위험: R-V2.

### Gate B-6 — 첫 수직 슬라이스 단일 정의 (SPEC §13.3)

**유일한 정의:** 공산성 **F1.A/D → 3단계 검증 경로 → HTML 다이어리 → F5 격차 1건**.

- 담당 owner: C4(콘텐츠 패키지) + F1-AD + Q0
- 픽스처: `tests/fixtures/gongsan-first-slice/` 디렉토리에 검증된 capability 팩 + route_steps 3건 포함
- E2E 테스트: `tests/e2e/first-slice.spec.ts` — 공산성 F1.A 카드 로드 → F1.D 경로 렌더 → F4 HTML 내보내기 → F5 격차 1건 존재 확인
- 이 슬라이스가 통과되기 전까지 다른 POI 스트림은 스텁(stub) 상태 유지

### Gate B-7 — 범위 축소 자동 게이트 (SPEC §13.4)

**7월 19일 및 8월 9일** 두 지점에서 코어 F1→F5 경로 진척을 자동으로 평가한다. 기준 미달 시 아래 축소 목록을 re-asking 없이 적용한다.

| 축소 항목 | 기준 미달 시 처리 |
|---|---|
| F1.F 요소 수 | 7개 → 3개 유지 (시각 일정·1단계 1행동·calm+AAC) |
| F2 지오펜스 | 제거 (map-tap only 고정) |
| F2 4채널 심화 대상 | 공산성·부소산성만 유지; 나머지 4 POI는 텍스트·자막·음성만 |
| F1.E 후기·UGC GPX 제출 | 발전방향으로 이동 (F3만 UGC 진입점 유지) |
| F4 출력 | HTML + 학생 PDF + 쉬운글 PDF + 전문가 검증 BRF 우선; 교사 루브릭/단체 합본 후순위 |
| F5 | 단일 격차 우선순위 보고서 (`impact × severity × confidence × feasibility`) |
| 6-POI 심도 | 공산성·부소산성 = 전체 증거 팩 + 경로; 나머지 4 = 검증 카드 |
| 데모 T2/T3 기능 | T2 → 영상/짧은 시연으로 강등; T3 → 언급만 |

게이트 평가 기준: **T1 시나리오(F1.A 카드·F1.B 경로+오프라인·F4 내보내기·F5 격차·F1→F5 다이어그램) E2E 통과 여부.** T1 미통과 시 위 축소 목록 전체 즉시 적용.

---

## §3. 결정 로그

모든 잠금된 결정을 추적한다. **상태:** LOCKED = 변경 불가 / USER = 사용자가 직접 결정 / PAIRING = Claude⇆Codex pairing 결과.

### 3.1 SPEC §2 잠금 결정

| ID | 결정 | 값 | 상태 | 근거 |
|---|---|---|:---:|---|
| D-1 | 주제 | 「모두의 백제」 | LOCKED | 제안서 확정 |
| D-2 | 스택 | Next.js 15 + Supabase(Postgres 17+PostGIS) + Vercel, 전부 Seoul(`icn1`/`ap-northeast-2`) | LOCKED | 서울 리전 고정으로 KTO→DB 왕복 지연 최소화; `icn1` 누락 시 Washington PoP 경유 |
| D-3 | 앱 형태 | PWA(Serwist `@serwist/next` 9.5.11) — 네이티브 앱 아님. 모바일 KS X 3253 = 발전방향 | LOCKED | 앱스토어 배포 오버헤드 없이 KWCAG 2.2 준수 가능; 4개월 MVP 적합 |
| D-4 | 캐시 모델 | Next 15 + `unstable_cache`; 사용자별 데이터는 캐시 금지; Next 16 Cache Components = 발전방향 | LOCKED | 생태계 성숙도 + 사용자별 데이터 cross-user 누출 방지 |
| D-5 | **Layer C cap** | **+0.12 (1.00–1.12)**; KQ = 메타데이터만 | **USER + PAIRING** | Codex 권고 채택; 사용자 확인(2026-06-14). 제안서 ×1.30은 정밀도 과장; cap과 문서화가 심사 투명성을 높임. 세부 내역: BF 예비+0.02 / 일반+0.05 / 우수+0.08 + 열린관광지+0.04 |
| D-6 | **방향성** | **Narrow, contract-first, content-verified system** (광범위 플랫폼 아님) | **USER + PAIRING** | Codex 핵심 테제 채택; 사용자 확인(2026-06-14). 6 POI 검증 콘텐츠 패키지가 기반; 투명 카드가 그 위에 서 있음 |
| D-7 | 라우팅 | **정적 큐레이션 경로 패키지** (6 POI). pgRouting/DEM 동적 라우팅 = MVP 제외 | LOCKED/PAIRING | 유산지 계단·문짝·경사는 DEM으로 추론 불가 — 수동 검수 필수. Codex D2 결정 |
| D-8 | 데이터 제공 | **런타임 KTO 호출 없음.** 모든 데이터는 ETL→Supabase 게시; 휘발성 데이터(혼잡/날씨/공기)도 단기 스냅샷 | LOCKED/PAIRING | 데모 당일 KTO 장애 무영향; DB = 1차 캐시 + 진실 소스. Codex D4 결정 |
| D-9 | 검색/AI | **pgvector/RAG/임베딩/OCR/360°/멀티AI 제공자 없음** → 발전방향 | LOCKED/PAIRING | 6 POI에 벡터 검색 불필요. Codex D3 결정 |
| D-10 | 메시징 | **FCM/APNs/알림톡 없음** → 발전방향. 인앱 배너 + Supabase Realtime(승인된 알림만) | LOCKED/PAIRING | MVP 범위 축소; Realtime은 `barrier_reports` 승인 상태 broadcast에 한정 |
| D-11 | ETL 스케줄러 | **GitHub Actions**(무거운 배치) + **Vercel Cron**(단기 새로고침만). GH Actions → HMAC 보호 내부 엔드포인트 → `revalidateTag` | LOCKED/PAIRING | 서버리스 토큰 버킷은 인스턴스 간 미공유 → ETL 재시도 GH Actions가 담당. Codex D13 결정 |
| D-12 | 인증 | 핵심(탐색·도슨트·다이어리) = **로그인 불필요**. UGC 식별용 Supabase **Anonymous** auth만 | LOCKED/PAIRING | Codex D10 |
| D-13 | 결제 | MVP 없음(정보+추천만 → 통신판매업/여행업 미적용) | LOCKED | |
| D-14 | A11y 인증 | **자체점검 + 수동 스크린리더 검증**이 핵심 경로; 정식 WA/KWACC 신청 = MVP 비차단(발전방향, 9월 중순 파일링 가능 시) | LOCKED | |
| D-15 | 외부 데이터(MVP) | KTO 10개 서비스 + BF인증 + 국가유산청 + 기상청 + 응급/AED + 충남(다도라/올담). 나머지 24개 → 발전방향 | LOCKED/PAIRING | Codex D11 |
| D-16 | 자체 제작 콘텐츠 | **백제 마스코트 6컷만** 자체 제작. 픽토그램/AAC/쉬운글은 공개 셋 재활용(ARASAAC/KS/복지부/KODDI/국립특수교육원) | LOCKED | |

### 3.2 Claude⇆Codex Pairing 결과 (2026-06-14)

> **적합도 산식 정책 숫자(행렬·임계값·`SuitabilityResult` 계약)는 이 문서에 재기재하지 않는다. 단일 권위 문서: [`16_suitability_policy.md`](16_suitability_policy.md).**

**Pairing 범위:** 아키텍처 기획 단계(구현 전). 두 모델이 동일 입력(제안서 + SYNTHESIS)으로 독립 초안 작성 후 조정.

**수렴 (양측 독립 합의 → 고신뢰):**

1. 순수 도메인 `calculateSuitability` 결정론적 함수 — Layer A 가중치 동일, 페르소나 매트릭스 동일, Layer D 감쇠 동일
2. F1을 복수 스트림으로 분할
3. 정식 F1–F5 번호 유지; 외국인 = 횡단 레이어
4. 접근 가능 리스트 = 진실 소스; 지도 = 보조
5. 로컬 퍼스트 다이어리(IndexedDB), 날 GPS 저장 없음(PIPA)
6. 계약 우선 동결 (스키마 + KTO 클라이언트 + 디자인 시스템 + 도메인 시그니처)
7. 수동 스크린리더 검증 > 형식 인증이 핵심 경로
8. GitHub Actions = 무거운 배치 ETL; Vercel Cron = 단기 새로고침만
9. D.1 데모 = 하나의 데이터셋이 F1→F5를 통과하는 단일 내러티브
10. 데모 깊이로 범위 축소(수어 일부 POI, UGC 수동, 지오펜스 동의+탭 폴백, 자동 재계산 없음)

**발산 → 해결 (Codex 개선 채택):**

| Pairing ID | 주제 | Claude | Codex | 채택 |
|---|---|---|---|---|
| D1 | #1 레버리지 | 점수 카드 | 6-POI 콘텐츠 패키지 | **양쪽** — 패키지가 기반(Codex), 카드가 표면(Claude) |
| D2 | 휠체어 라우팅 | WS1-GeoPipeline (pgRouting+NGII DEM) | **제거** → 정적 큐레이션 경로 | **Codex** → D-7 |
| D3 | pgvector/RAG | nice-to-have로 유지 | **제거** (6 POI에 불필요) | **Codex** → D-9 |
| D4 | KTO 캐싱/런타임 | 토큰 버킷 + TTL + 일부 라이브 | **런타임 KTO 없음**; 스냅샷으로 서브 | **Codex** → D-8 |
| D5 | Layer C 승수 | 제안서 ×1.00–1.30 | cap **+0.12** (1.00–1.12) | **USER** → D-5 |
| D6 | F1 분할 세분도 | F1-core + F1-assist (2개) | F1-AD / F1-B / F1-C / F1-E / F1-F (5개) | **Codex** |
| D7 | 무장애 스키마 | `poi_barrier_free(jsonb)` | `accessibility_facts(capability_code, status, source_field)` | **Codex** — KTO 필드명과 도메인 분리 |
| D8 | 콘텐츠 타이밍 | 후기 WS3-Content | **조기 동결 Content Package Contract + C4 스트림** | **Codex** |
| D9 | 레포 구조 | 단일 Next 앱 | **모노레포** (apps/web + packages/{domain,…}) | **Codex** |
| D10 | 인증 | anon-first | 핵심 기능 **로그인 불필요**; UGC 식별만 anon auth | **Codex** |
| D11 | 외부 데이터 | (암묵적 trim) | 명시적 MVP 셋 + 나머지 발전방향 | **Codex** |
| D12 | PDF | react-pdf + Chromium | react-pdf + pdf-lib + **HTML 대안 항상; MVP Chromium 없음** | **Codex** |
| D13 | 캐시 무효화 | (미지정) | GH Actions → HMAC → `revalidateTag`; bounded TTL 복구 | **Codex** |

**수렴 판정:** 셋 수렴, 순서 일부 발산 → 판사 라운드 불필요. Codex 개선은 모두 제안서 리스크 레지스터와 정합.

**채택된 통합 입장:** Narrow, contract-first, content-verified system (Codex 척추) + 순수 도메인 점수 핵심이 투명 증거 카드로 표면화 (Claude 차별화).

**Plan-review 추가 결과 (2026-06-14 — `_plan_review_findings.md` 통합):**

계획 검토에서 "아직 공모전 준비 완료 아님(not yet contest-ready)"으로 평가했으나, 수정 가능한 격차로 결론지었다. 3개의 핵심 차단 항목이 식별되었다: (1) 산식 계약 미구현(`16_suitability_policy.md`로 해결), (2) "검증 데이터셋" 주장이 문자열 날짜만으로 미방어(Gate B-3 DoD로 해결), (3) 4개월 계획에 강제 범위 축소 게이트 부재(Gate B-6·B-7로 해결). 잠금된 SPEC 값(`unknown=0.35`, Layer C `+0.12`, Layer D 감쇠, TarRlteTar 대안)은 사용자가 잠금 유지 가드를 선택하며 변경 없이 유지; 가드는 `16_suitability_policy.md §5·§6·§9·§10`에 반영.

### 3.3 사용자 결정

| ID | 결정 | 날짜 | 내용 |
|---|---|---|---|
| U-1 | **방향성 확인** | 2026-06-14 | 파이링 권고 채택 — Narrow direction (D-6). 드롭 목록: pgRouting/DEM, pgvector/RAG, Upstash, FCM/APNs/알림톡, OCR, 360°, 멀티AI 제공자, 24개 데이터셋 완전 통합 |
| U-2 | **Layer C cap** | 2026-06-14 | Codex 권고 채택 — +0.12 상한 (D-5). 제안서 ×1.30은 정밀도 과장으로 문서화된 개선 사항으로 명시 |
| U-3 | **잠금 유지 가드 채택** | 2026-06-14 | 계획 검토 blockers M-2/M-5/M-6/M-8에 대한 사용자 결정: 잠금된 값(`unknown=0.35`, Layer C `+0.12` 승수, Layer D 감쇠)은 변경하지 않고, 검토자 우려를 가드로 추가. (a) `evidenceConfidence`/`coverage`를 `score`와 분리 출력; (b) `coverage < 0.65` 시 레이블을 `주의`로 강제; (c) 인증만으로 레이블 경계를 넘을 수 없음; (d) 대안 트리거 `<70`, 검증 카드 있는 6 MVP POI만 포함, TarRlteTar는 "관련 관광지(접근성 미검증)" 별도 목록. 세부 내역: [`16_suitability_policy.md`](16_suitability_policy.md) §5·§6·§9·§10 |
| U-4 | **권고 범위 축소 + PT 전략 채택** | 2026-06-14 | 계획 검토 권고 범위 축소(§4 cuts) + PT 전략(SPEC §13.8) 채택. 범위 축소 목록은 Gate B-7에 고정. PT 전략: 사전 녹화 F1→F5 골든 플로(1:00–7:00)가 1차 산출물; 라이브 앱은 3개 하이라이트(4-Layer 카드·6채널 내보내기·F5 격차 보고서)만 사용. 데모 티어: T1 완벽 라이브 · T2 영상/짧은 시연 · T3 언급만 |

### 3.4 미결 항목 (Open Items)

구현 중 추가 결정이 필요한 항목. 해결되면 상태를 RESOLVED로 변경하고 결정 내용을 기입한다.

| OI ID | 항목 | 차단 대상 | 기한 | 상태 |
|---|---|---|---|---|
| OI-1 | `detailWithTour2` 정확한 필드 키 (Gate 1) | F1-AD, F1.B, F2 스키마 | C0 완료 전 | OPEN |
| OI-2 | 충남/공주/부여 lDong 코드 실측값 (Gate 2) | F1-AD 지역 필터, F5 대시보드 | C0 완료 전 | OPEN |
| OI-3 | TatsCnctr 공주 `signguCd` (Gate 4) | F1.D Layer A 시간대 | C0 완료 전 | OPEN |
| OI-4 | Odii 6 POI 커버리지 (Gate 5) | F2 도슨트 채널 계획 | C0 완료 전 | OPEN |
| OI-5 | 게이트웨이 서픽스 확인 — TatsCnctr/DataLab/PhotoGallery/Odii (Gate 3) | C2 ETL | C0 완료 전 | OPEN |
| OI-6 | KTO 운영 계정 신청 타이밍 — 활용사례 URL 생성 즉시 신청 | 데모 안정성 | 첫 수직 슬라이스 배포 직후 | OPEN |
| OI-7 | Odii 미커버 POI 대안 선택 — 자체 TTS vs 국가유산청 메타데이터 혼합 비율 | F2 | Gate 5 결과 후 | OPEN |
| OI-8 | 방통위 LBS 신고 일정 — 9월 배포 전 완료 필요 | GPS 자동 트리거 기능 활성화 | 9월 배포 전 | OPEN |
| OI-9 | CACF(충남문화관광재단) 협력 확인 — UGC 검수 큐 운영자 역할 합의 + **의향서(letter-of-intent) 수령** | F3 검수 워크플로, F5 충남 RTO 스토리, PT 슬라이드 | 7월 말 | OPEN |
| OI-10 | 관광약자 베타 테스트 모집·보상·장소·owner·**패스바** 확정 (task-completion rate · critical-error count · help-request rate · comprehension · route-judgment accuracy) — 6월 중 고정 | R-V1 완화, 7월 1차 검증 | 6월 말 | OPEN |
| OI-11 | Gate B-3 증거 팩 ETL 검증 스크립트(`verify-evidence-pack.ts`) 구현 및 CI 편입 | C4 콘텐츠 게시 게이트 | C4 스트림 시작 전 | OPEN |
| OI-12 | 첫 수직 슬라이스(Gate B-6) — 공산성 F1.A/D→경로 3단계→HTML 다이어리→F5 격차 1건 E2E 통과 | 전 스트림 킥오프 CI 게이트 | 7/19 이전 | OPEN |
| OI-13 | 7/19 범위 축소 자동 게이트(Gate B-7) — T1 E2E 통과 여부 평가 및 필요 시 축소 목록 적용 | 전 스트림 | 7/19 | OPEN |
| OI-14 | 8/9 범위 축소 자동 게이트(Gate B-7 2차) — 2차 T1 E2E 통과 여부 평가 | 전 스트림 | 8/9 | OPEN |
| OI-15 | **Hero-POI 현장 검증 선행** — 공산성 서문 휠체어 traversal 체크를 `supported` 시드보다 먼저 실행; 폴백 hero = 국립공주박물관 (SPEC §14.8, F-08) | D.1 데모 신뢰성 (시드된 미검증 주장) | 7월 1차 검증 | OPEN |
| OI-16 | **수요 관찰 인터뷰** — 관광약자 5–8명 인터뷰로 "5개 질문" 수요를 가정→관찰(verbatim)로 전환 (SPEC §14.8, F-35) | 기획력/적정성 논거(현재 가정 기반) | 7월 현장 방문 동행 | OPEN |
| OI-17 | **F3→F5 플라이휠 파일럿 1회** — 실제 제보→검수→fact 갱신→F5 gap-delta 1건 실연 (SPEC §14.8, F-37) | 발전성 20 논거(현재 미실연) | 8월 전체 플로우 | OPEN |
| OI-18 | **조달 레지스터 (named owner + 요청일/필요일 + 인수 산출물 + 라이선스 + 폴백)** — 충남교육청 양식·마스코트 6컷·점자 검수 파트너·**CACF LOI(관계 owner + 사전 작성 LOI + 다도라/올담·충남교육청 병행 트랙 + 하드 다운그레이드 일자)**·KTO 운영계정(**데이터셋별**)·CLOVA/ElevenLabs 키 (SPEC §14.10, F-11/F-16dep) | 전 외부 의존(조용한 누락 방지) | 6월 말 owner 지정 | OPEN |
| OI-19 | **감사 등급 검증 프로토콜 사전 등록** — 독립 평가자 · 페르소나 strata(청각/KSL·점자 사용자 포함) · 측정 보정 · 평가자간 신뢰도 · 서명 원자료 · 심각도 규칙 · 재검 (SPEC §14.10, F-15 validation) | R-V1 강화(현재 통과 기준만 존재) | 6월 말 사전 등록 | OPEN |

---

## §4. 위험 요약 매트릭스

```
Impact/Likelihood  |  L        M        H
-------------------|---------|---------|---------
H                  | R-A2,   | R-D1,   | R-F1,
                   | R-A3    | R-D2,   | R-D9
                   |         | R-D3,   |
                   |         | R-D4,   |
                   |         | R-D5,   |
                   |         | R-D6,   |
                   |         | R-L1,   |
                   |         | R-L2,   |
                   |         | R-F2,   |
                   |         | R-F3,   |
                   |         | R-A1,   |
                   |         | R-O1,   |
                   |         | R-V1,   |
                   |         | R-V2    |
-------------------|---------|---------|---------
M                  | R-O3    | R-D7,   |
                   |         | R-L3,   |
                   |         | R-F4,   |
                   |         | R-F5,   |
                   |         | R-A4,   |
                   |         | R-A5,   |
                   |         | R-A6    |
-------------------|---------|---------|---------
L                  |         | R-O2    | R-D8,
                   |         |         | R-L4,
                   |         |         | R-A2,
                   |         |         | R-A3
```

**즉시 주의(HH) 위험:** R-D1(detailWithTour2 필드), R-D4(serviceKey 인코딩), R-D5(운영계정 지연), R-F1(기능 과밀), **R-D9(충남 증거 체인 — P0 CEO 차단)**. R-D9는 이번 스프린트 즉시 Gate 2·4 프로브 실행 + 7월 말 CACF 의향서 수령으로 완화해야 한다.

---

## §5. 결정·위험 변경 프로토콜

1. **위험 상태 갱신:** 완화 조치 실행 후 해당 위험 행에 `~~취소선~~`으로 완료 표시 + 날짜와 담당자 기입.
2. **결정 변경:** LOCKED 결정은 변경 불가. USER 결정은 사용자가 명시 요청 시 이 문서와 SPEC.md를 같은 커밋에 갱신.
3. **미결 항목 해결:** OI 항목이 해결되면 RESOLVED 상태로 변경 + 결정 내용을 §3에 신규 행으로 추가.
4. **새 위험 추가:** ID 채번(R-X_NN 형식), Impact/Likelihood/Priority/완화/Owner 모두 기입 후 §4 매트릭스 갱신.
5. **이 문서와 SPEC.md 간 모순:** SPEC.md가 항상 우선. 이 문서가 SPEC을 어긋나면 즉시 수정.
