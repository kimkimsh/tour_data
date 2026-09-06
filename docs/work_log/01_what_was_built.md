# 01 — 무엇이 만들어졌나

> 코드 0줄에서 시작했다. 아래는 스펙 문서 ↔ 파일 대응이다.

---

## 1. 스펙 문서별 이행 상태

| 스펙 | 무엇을 요구했나 | 어디에 있나 | 상태 |
|---|---|---|---|
| `02_stack.md` | Next 16 · React 19 · TS strict · pnpm · Tailwind v4 · Radix · Zod 4 · next-intl · Vitest · Playwright · 폴더 구조 · 환경변수 · 캐시 정책 | 프로젝트 루트 전체 | **완료.** Tailwind는 v4 CSS-first라 `tailwind.config.ts`가 없다 |
| `03_external_data.md` | 한국관광공사 API 10종 클라이언트 · 문자열 우선 파싱 · 결과 코드 분기 · 이중 인코딩 회피 | `src/lib/kto/{transport,schemas,services}.ts` | **완료.** 실측으로 스펙 3건을 정정 → [02](./02_spec_corrections.md) |
| `04_data_model.md` | 테이블 3개 · 스냅샷 6종 Zod 스키마 · RLS 6개 정책 · 콘텐츠 파일 스키마 | `supabase/migrations/`, `src/domain/snapshot-schema.ts`, `src/domain/content-schema.ts` | **완료.** Postgres 17에서 실제로 적용·검증됨 |
| `05_ingest.md` | 수집 스크립트 · 항목 정규화 · 자유 텍스트 상태 판정 · 출처 우선순위 · 파생 8항목 · 탐침 | `scripts/ingest.ts`, `scripts/probe.ts`, `src/domain/capabilities.ts` | **코드 완료 · 미실행** (API 키 없음) |
| `06_suitability.md` | 적합도 산식 · 페르소나 매트릭스 · 라벨 규칙 · 코스 계산 · 골든 24건 | `src/domain/{types,capabilities,personas,suitability,scoreboard,itinerary}.ts` + `__tests__/` | **완료.** 골든 27 + 성질 8 + `resolveStatus` 실문장 42, 전부 통과 |
| `07_screens.md` | 화면 S1~S10 + `/credits` + `/privacy` | `src/app/(site)/`, `src/app/(admin)/`, `src/app/(print)/` | **완료** (지도 제외 — DEC-2 기본값) |
| `08_accessibility_legal.md` | KWCAG 구현 항목 · 개인정보 처리방침 · 공공누리 표기 · AI 표시 | `src/app/globals.css`, `src/components/a11y/`, `/privacy`, `/credits` | **완료** (페이지 번호는 브라우저 미지원 → [02](./02_spec_corrections.md) K) |
| `09_test_and_ci.md` | 골든 24 · 성질 8 · 콘텐츠 검증 · E2E 3 · CI 잡 1개 | `src/domain/__tests__/`, `src/i18n/messages.test.ts`, `scripts/validate-content.ts`, `tests/e2e/`, `.github/workflows/ci.yml` | **완료.** 단위 119건 + E2E 24건 통과. axe 스캔은 스펙의 6경로에서 17경로로 늘렸다 |
| `10_build_order.md` | 주차별 순서 | — | Day 1~2의 탐침이 막혀 있다 → [04](./04_open_items.md) |
| `11_open_items.md` | P0 11건 · 결정 항목 · 위험 | `scripts/probe.ts`가 자동 9건을 구현 | **미실행** |
| `12_judging_and_demo.md` | 배점 ↔ 화면 매핑 | 화면이 그 매핑을 이행한다 | 아래 §5 |
| `13_legal_citations.md` | 색상 토큰 · 대비율 · 법령 근거 | `src/styles/tokens.json`, `scripts/check-contrast.ts`, `/privacy` | **완료.** 44개 쌍 검사 통과 |

---

## 2. 순수 도메인 계층 (`src/domain/`)

프레임워크·DB·`Date.now()`를 import 하지 않는다. ESLint `no-restricted-imports`가 강제한다.

| 파일 | 무엇 |
|---|---|
| `types.ts` | **유일한 계약.** 모든 유니온을 `as const` 배열로 선언해 Zod 스키마가 같은 배열로 만들어진다 — 타입과 런타임 검증이 갈라질 수 없다 |
| `capabilities.ts` | 무장애 32항목 카탈로그(KTO 24 + 파생 8) + `resolveStatus()` 자유 텍스트 판정 |
| `personas.ts` | 페르소나 5종 × 32항목 등급 매트릭스 + `assertPersonaMatrix()` 불변식 |
| `suitability.ts` | `calculateSuitability()` — `100 × A × B × C`. 신선도는 점수에 곱하지 않는다 |
| `scoreboard.ts` | 6곳을 한 조건으로 채점하고 서로를 대체 후보로 넘긴다 (2패스) |
| `itinerary.ts` | `buildItinerary()` — 최적화기가 아니라 선택기 |
| `gap.ts` | `computeGapReport()` + CSV 생성 |
| `diary.ts` · `gpx.ts` · `geo.ts` | 여행 기록 문서 · GPX 1.1 · 하버사인 |
| `snapshot-schema.ts` | **데이터 모델의 실제 정의.** 읽을 때마다 파싱한다 |
| `content-schema.ts` | 손으로 쓰는 파일의 스키마. 출처 없는 사실과 숫자 경사도를 여기서 막는다 |

---

## 3. 실제로 강제되는 규칙 — 켜 두면 빨간불이 될 수 있는 것

**켜 두고 통과만 하는 검사는 만들지 않았다.** 각 항목을 일부러 깨뜨려 빨간불을 확인했다 → [`05_verification.md`](./05_verification.md).

| 규칙 | 강제 수단 | 무엇을 막나 |
|---|---|---|
| `src/domain`은 프레임워크를 import 하지 않는다 | ESLint `no-restricted-imports` (`paths` + `patterns` 둘 다 — 글롭은 bare specifier를 매칭하지 않는다) | 순수 함수 계층이 조용히 오염되는 것 |
| 화면은 `src/lib/kto`를 import 하지 않는다 | 같은 규칙 | 실행 중 외부 API 호출. 구조로 보장한다 |
| 화면은 `admin.ts`를 import 하지 않는다 | 같은 규칙 | service_role 키가 브라우저 번들에 들어가는 것 |
| 색상 토큰이 역할별 최소 대비율을 넘는다 | `scripts/check-contrast.ts` — 색상값에서 매번 계산 | 문서에 적힌 비율과 실제가 어긋나는 것 (실제로 있었던 문제) |
| `tokens.json`과 `globals.css`가 같은 값을 쓴다 | 같은 스크립트가 CSS를 파싱해 대조 | 두 사본의 드리프트 |
| 출처 없는 사실을 넣을 수 없다 | Zod `source: z.string().min(4)` + `checkedAt: z.iso.date()` | 이 프로젝트의 신뢰 기반 |
| 경사도를 숫자로 쓸 수 없다 | `slopeNote: z.enum([6개 단어])` — 금지 문자를 세는 대신 허용 값을 센다 | 재지 않은 값을 측정값처럼 내보내는 것 |
| 확인되지 않은 `ktoContentId`로 배포할 수 없다 | `validate-content.ts`가 `UNRESOLVED` 센티널에서 실패 | 조용히 다른 관광지 데이터를 수집하는 것 |
| 제보 분류 8개의 두 사본이 같다 | `validate-content.ts`가 마이그레이션 SQL의 enum을 파싱해 대조 | 프로덕션 insert 실패 |
| 무장애 필드 28개의 두 사본이 같다 | `src/lib/kto/field-names.test.ts` | 철자 하나 때문에 항목이 영원히 비는 것 |
| 두 로케일의 메시지 키·자리표시자·배열 길이가 같다 | `src/i18n/messages.test.ts` | 화면에 문장 대신 `place.score` 같은 키 이름이 찍히는 것 — next-intl은 던지지 않는다 |
| 기상특보 문구가 안전한 쪽으로 읽힌다 | `src/lib/kma/warnings.test.ts` | 확인 실패를 「특보 없음」으로 바꾸는 것 — 무장애 서비스에서 거짓 이상 없음은 안전 실패다 |
| 한국어 문장 42개가 맞는 상태로 판정된다 | `src/domain/__tests__/resolve-status.test.ts` | 확인된 장벽이 「모름」으로, 계단이 「엘리베이터 있음」으로 판정되는 것 — 골든 케이스는 상태를 직접 받으므로 이 단계를 보지 못한다 |
| 파생 항목은 `critical`이 될 수 없다 | `assertPersonaMatrix()` (골든 스위트가 호출) | 거의 모든 관광지가 「정보없음」이 되는 것 |
| 같은 날 중복 제보가 거부된다 | DB 유니크 인덱스 (앱 검사가 아니다) | 동시 요청에서 뚫리는 것 |
| 브라우저가 KTO 게이트웨이를 부르지 않는다 | E2E가 요청을 **센다** (차단하지 않는다 — 차단은 아무것도 증명하지 않는다) | 원칙 3 |
| 위치 정보를 수집하지 않는다 | E2E가 `getCurrentPosition`·`watchPosition` **둘 다** 감싸 센다 | 위치정보법 논거 |

---

## 4. 테스트

| 종류 | 개수 | 상태 |
|---|---|---|
| 도메인 골든 | 27 파일 | **통과** |
| 도메인 성질 (fast-check, 각 300회) | 8 | **통과** |
| 카탈로그 불변식 | 3 | **통과** |
| KTO 필드명 미러 | 3 | **통과** |
| 콘텐츠 검증 | 파일 수만큼 | **의도적 실패** — `ktoContentId`가 미확인이다 |
| E2E 골든 플로우 | 스펙 파일 1개 (3 테스트) | **작성 완료 · 미실행** |
| E2E axe 스캔 | 6개 경로 | **작성 완료 · 미실행** |
| E2E 포커스 | 3 | **작성 완료 · 미실행** |

E2E를 돌리지 않은 이유와 무엇이 검증되지 않았는지는 [`05_verification.md`](./05_verification.md).

---

## 5. 화면 ↔ 배점 (`12_judging_and_demo.md` §2)

배점을 올린다고 주장하는 화면이 실제로 그 일을 하는지만 적는다.

| 배점 근거 | 화면에서 실제로 무엇이 보이나 |
|---|---|
| **S3 ③ — 24항목 원문 + 필드명 + 확인일** | 32항목 전부가 축별로 펼쳐지고, 각 행 오른쪽에 `한국관광공사 무장애여행 · elevator · 2025-11-03` 형태의 등폭 출처 열이 붙는다. 파생 8항목은 `derived` 표시와 자기 출처를 갖는다 |
| **S3 ④ — A·B·C + 분리된 신뢰도** | 접힌 disclosure 안에 축별 `가중치 × 원점수 = 기여값` 표, A 합계, B, C, `점수 = 100 × A × B × C`가 있고, 데이터 신뢰도는 별도 블록에 `coverage × freshness`로 분리돼 있다. **숫자는 전부 `SuitabilityResult`에서 렌더된다** — 화면이 다시 계산하지 않고 손으로 적은 값도 없다 |
| **S2/S3 — 확인 필요 항목명 노출** | 라벨이 `주의`이고 모르는 필수 항목이 있으면 그 **이름**이 라벨 바로 옆에 나온다. `정보없음`이면 점수 자리에 `—`가 오고 「판단할 정보가 부족합니다」와 모르는 항목 이름이 함께 나온다 |
| **S1 — `min()` 규칙 설명** | 조건을 2개 이상 고르면 배너가 나타나 **가장 조건이 까다로운 사람의 이름을 넣어** 규칙을 문장으로 설명한다 |
| **S10 — 세 열 분리** | `공사 원문` / `우리가 확인` / `정보 없음`이 별도 열이고, 왜 나눴는지가 표 아래에 있다. 우선순위 표의 「원인」 열은 확인된 것만 적고 나머지는 「원인 미확인」이다 |
| **실행 중 외부 API 0건** | 구조로 강제(ESLint) + E2E가 셈 |
| **위치 정보 미수집** | 코드 전체에 `navigator.geolocation` 호출이 없다 + E2E가 두 메서드를 셈 |
| **정직성 문구 9개** | `messages/*.json`의 `common.honesty.*`에 모여 있고 각자 자기 화면에 배치돼 있다. `/credits`가 전부 한 번 더 모아 보여준다 |

---

## 6. 파일 수

```
src/domain/        12 파일 + 테스트 3 + 골든 27
src/lib/            8 파일 (kto 3 + supabase 4 + data/content 2)
src/components/    20 파일
src/app/           16 라우트 + 8 API 라우트
scripts/            5 파일
supabase/           3 파일 (마이그레이션 2 + 시드 1) + config
content/            3 파일 (+ 조사 대기 4)
tests/e2e/          3 파일 (23 테스트)
messages/           2 파일
```
