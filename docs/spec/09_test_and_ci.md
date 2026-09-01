# 09 — 테스트 · CI

> 기존 스펙은 잡 9개짜리 CI + 잡 6개짜리 릴리스 워크플로 + 단위 200건 + 컴포넌트 120건 + E2E 20건을 요구했다. 4주 단독 개발에서 그 테스트를 유지하는 시간이 기능 만드는 시간보다 길다.
> **여기서는 "틀리면 서비스가 거짓말을 하는 것"만 테스트한다.**

---

## 1. 테스트 4종

| 종류 | 도구 | 개수 | 어디서 |
|---|---|---|---|
| 도메인 골든 | Vitest | **23** | CI |
| 도메인 성질(property) | Vitest | **8** | CI |
| 콘텐츠 검증 | Zod 스크립트 | 파일 수만큼 | CI |
| E2E + 접근성 | Playwright + axe | **4** | 로컬 (필요할 때) |

---

## 2. 도메인 골든 테스트 (23건)

목록은 [`06_suitability.md`](./06_suitability.md) §8. 요약하면 페르소나 5종 각각 + 다중 선택 + 강제 규칙 4분기 + 경계값 7건 + 결정성 1건 + 아래 6건.

**이전 기획의 30건 목록에서 살려 온 6건** — §8의 17건이 덮지 않는 분기다.

| # | 이름 | 검증하는 것 |
|---|---|---|
| 18 | `zero-score-clamp` | 필수 전부 `unsupported` → `score`가 음수로 가지 않고 0에서 멈춘다 |
| 19 | `all-partial` | 전 항목 `partial`(0.50) → 점수가 중간대에 앉고 라벨이 `주의` |
| 20 | **`critical-partial-not-blocked`** | 필수 항목이 `partial`이면 §6.4 규칙 1이 **발동하지 않는다** ("일부 가능"은 "불가"가 아니다). 이 한 건이 규칙 1의 경계를 고정한다 |
| 21 | `all-unknown-P0` | 조건 미선택(P0) + 전 항목 `unknown` → `coverage = 0`, 계산이 0으로 나누지 않는다 |
| 22 | `no-certifications` | `certifications` 빈 배열 → `C = 1.00`, 예외 없음 |
| 23 | `boundary-74-75` | 점수 74와 75에서 라벨이 `주의`↔`방문가능`으로 정확히 갈린다 |

> 20번이 가장 중요하다. "필수 항목이 안 되는 게 확실하면 대체추천"이라는 규칙은 `unsupported`에만 적용되는데, `partial`도 걸리게 짜면 **부분적으로 가능한 곳이 전부 '다른 곳 권장'으로 바뀐다.**

**형식:**
```
src/domain/__tests__/__golden__/p1a-all-supported.json
{ "name": "...", "input": { … }, "expected": { … } }
```
`UPDATE_GOLDEN=1 pnpm test`로 재생성한다.

**왜 이게 최우선인가:** 이 서비스는 사용자에게 "여기 갈 수 있습니다"라고 말한다. 그 판정이 틀리면 **실제로 헛걸음을 하게 만든다.** 다른 어떤 버그보다 무겁다.

**관광지 상세의 계산 예시 표(S3 ④)의 숫자는 골든 결과에서 생성한다.** 손으로 적은 숫자를 문서나 화면에 남기지 않는다.

---

## 3. 성질 테스트 (8건)

입력을 무작위로 만들어서 **항상 참이어야 하는 것**을 검사한다. 골든이 못 잡는 구멍을 덮는다.

| # | 항상 참이어야 하는 것 |
|---|---|
| 1 | `0 ≤ score ≤ 100` |
| 2 | `1.00 ≤ layerC ≤ 1.12` |
| 3 | `0.75 ≤ layerB ≤ 1.00` |
| 4 | 선택 페르소나의 critical 항목에 `unsupported`가 하나라도 있으면 → `score ≤ 49` **그리고** `label === '대체추천'` |
| 5 | 페르소나를 여러 개 고르면, 결과의 `layerB` ≤ 각각 단독으로 계산했을 때의 `layerB` 최솟값 |
| 6 | 입력에 라벨은 **정확히 1개**만 결정된다 (모든 분기를 다 돌려도 겹치지 않음) |
| 7 | `evidenceConfidence`가 `score` 계산에 영향을 주지 않는다 (신선도만 바꿔도 `layerA`·`layerB`·`layerC`가 불변) |
| 8 | 같은 입력 100회 → 100회 동일 출력 |

**4번과 6번이 핵심이다.** 기존 스펙에서 라벨 규칙이 두 곳에 서로 다르게 적혀 있어 같은 입력에 두 라벨이 나올 수 있었다.

---

## 4. 콘텐츠 검증 (`pnpm validate:content`)

`content/*.json`을 Zod로 검사한다. 여기서 막는 것:

| 검사 | 왜 |
|---|---|
| `curated-facts.json`의 모든 항목에 `source`와 `checkedAt`이 있다 | **출처 없는 사실을 넣지 못하게** 한다. 이게 이 프로젝트의 신뢰 기반이다 |
| 스냅샷을 읽을 때 Zod 파싱이 통과한다 | 데이터 모델의 정의가 Zod 스키마이므로 **이게 스키마 검증 그 자체다** ([`04_data_model.md`](./04_data_model.md) §3.3) |
| `facilities.json` / `certifications.json`도 동일 | 위와 동일 |
| `capabilityCode`가 `src/domain/capabilities.ts`의 코드 목록에 있다 | 오타로 조용히 무시되는 것 방지 |
| `routes/*.json`의 `slopeNote`에 `%` 나 숫자+`도` 가 없다 | **재지 않은 경사도를 측정값처럼 쓰는 것 방지** ([`04_data_model.md`](./04_data_model.md) §4.4) |
| `routes/*.json`의 `evidenceLevel`이 `desk`인데 `evidenceNote`가 비어 있으면 실패 | 근거 수준을 밝히지 않은 채 넘어가는 것 방지 |
| `pois.json`의 `ktoContentId`가 전부 채워져 있다 | 임시값으로 배포되는 것 방지 |
| `itineraries.json`의 `stayMinutes` 길이 == `orderedPoiSlugs` 길이, `transferMinutes` == 길이−1 | 코스 계산이 조용히 깨지는 것 방지 |

**하드코딩 금지 검사도 여기서 한다:**
```bash
# scripts/validate-content.ts 안에서
grep -rn "44150\|44760" src/ --include="*.ts" --include="*.tsx"
#   → 코드 어디에서든 나오면 실패. 이 값들은 content/pois.json 에만 있어야 한다
```

---

## 5. E2E (4건, 로컬)

`pnpm e2e`. CI에는 넣지 않는다 — 브라우저 설치·실행이 CI 시간의 대부분을 먹고, 혼자 개발하면 로컬에서 바로 돌리는 게 빠르다.

### 5.1 `golden-flow.spec.ts` — 전체 흐름 1개

**이게 발표 시나리오를 실행 가능한 형태로 적어 둔 것이다.** 이게 통과하면 시연이 된다.

```
1.  /ko 접속 (로그인 없음)
2.  '휠체어' + '오래 걷기 어려움' + '유아차' 선택
3.  '반나절' 선택 → [관광지 보기]
4.  목록에 6곳이 뜨고 첫 카드에 라벨 배지가 있다
5.  공산성 클릭
6.  ① 판정 요약에 라벨과 (정보없음이 아니면) 점수가 있다
7.  ③ 무장애 정보에 24개 항목이 있고, 그중 하나에 KTO 원문과 필드명이 보인다
8.  ④ '이 점수가 나온 계산' 펼치기 → A/B/C/D 4개 값이 전부 있다
9.  [경로 안내 보기] → 근거 수준 경고가 보이고 단계가 5개 이상
10. [GPX 내려받기] → 파일이 받아진다
11. [도슨트 듣기] → 대본이 화면에 보인다
12. /ko/diary 에서 공산성을 추가하고 [인쇄용 페이지 열기] → 출처 문구가 있다
13. /ko/gap-report → 공산성의 '정보 없음' 개수가 7단계에서 읽어 둔 값과 같다 (숫자를 테스트에 적지 않고 두 화면에서 읽어 비교한다)
14. 페이지 전체에서 apis.data.go.kr 로 나간 요청이 0건
15. 페이지 전체에서 navigator.geolocation 이 호출되지 않았다
16. 조건을 '청각'으로 바꾸면 목록의 라벨과 순서가 실제로 바뀐다
    (점수를 브라우저에서 계산하므로 캐시된 HTML이어도 바뀌어야 한다)
17. /ko/report 에서 제보를 올리면 즉시 /ko/places/gongsanseong 의 ⑨에 나타난다
```

**13·14·15·16번이 이 테스트의 진짜 목적이다.**
- **13번** — 두 화면이 같은 숫자를 말하는지. 기존 스펙에서 분모가 4가지로 갈려 있던 문제다.
- **14번** — "실행 중 외부 API 호출 없음"이 구조적으로 지켜지는지.
- **15번** — 위치 정보 미수집. **법적 근거가 여기 걸려 있다** (위치정보법 신고 의무 면제).
- **16번** — 점수 계산이 브라우저에서 도는지. 서버에서 계산하면 캐시 때문에 이 테스트가 실패한다 ([`04_data_model.md`](./04_data_model.md) §3.5).

```ts
// 14, 15번 구현 방식
const ktoCalls: string[] = [];
page.on('request', r => { if (r.url().includes('apis.data.go.kr')) ktoCalls.push(r.url()); });
await page.addInitScript(() => {
  (window as any).__geoCalled = false;
  const orig = navigator.geolocation?.getCurrentPosition;
  if (orig) navigator.geolocation.getCurrentPosition =
    function (...a: any[]) { (window as any).__geoCalled = true; return orig.apply(this, a as any); };
});
// … 시나리오 실행 후
expect(ktoCalls).toEqual([]);
expect(await page.evaluate(() => (window as any).__geoCalled)).toBe(false);
```

> 기존 스펙은 브라우저에서 `apis.data.go.kr` 요청을 **차단**해서 "스냅샷으로 동작함"을 증명하려 했다. 브라우저가 원래 그 주소를 부르지 않으므로 **아무것도 증명하지 못한다.** 차단이 아니라 **요청이 0건인지 세는 것**이 맞다.

### 5.2 `a11y.spec.ts` — axe 스캔

핵심 5개 경로에서 위반 0건. `.map-canvas`는 제외하고 수동 점검으로 대체한다.

### 5.3 `focus.spec.ts` — 포커스 관리 3건

| # | 검사 |
|---|---|
| 1 | 페이지 이동 시 포커스가 `<main>`으로 옮겨진다 |
| 2 | 모달을 열면 포커스가 갇히고, 닫으면 열었던 버튼으로 돌아온다 |
| 3 | 스킵 링크가 첫 탭 정지점이고 실제로 `<main>`으로 이동한다 |

**이 3개가 수동 스크린리더 검사로 잡을 실패의 대부분을 자동으로 잡는다.** 5초면 돈다.

### 5.4 `offline.spec.ts` — 오프라인을 구현한 경우에만

네트워크를 끊고 방문했던 관광지 페이지가 열리는지.

---

## 6. 안 만드는 테스트 — 그리고 이유

| 안 만드는 것 | 이유 |
|---|---|
| **PDF 파일 전체 SHA-256 골든** | **이 테스트는 100% 실패한다.** PDF에 생성 시각·생성기 정보가 박혀서 빌드마다 해시가 바뀐다. (그리고 우리는 PDF를 만들지 않는다) |
| 컴포넌트 단위 테스트 120건 | UI가 계속 바뀌는 4주 동안 유지 비용이 가치를 넘는다. `jsx-a11y` 린트 + axe 스캔으로 대체 |
| Storybook + addon-a11y | Storybook의 유일한 고유 가치인 실브라우저 대비율 검사를 20줄 토큰 스크립트로 대체 |
| RLS pgTAP 테스트 스위트 | 정책이 단순하다. E2E에서 "관리자 아닌 계정으로 `/admin` 접근 시 차단"만 확인 |
| 골든 파일이 CI에서 수정됐는지 검사하는 가드 | 동료가 몰래 재생성하는 것을 막는 장치다. 동료가 없다 |
| 데모 시드와 운영 DB 분리 검사 잡 | 커밋하는 사람이 1명이다 |
| KTO 실 API를 부르는 계약 테스트 | 대신 **탐침 스크립트(`pnpm probe`)를 필요할 때 수동 실행**한다. 결과는 `docs/spec/_probe-results.md`에 기록 |
| 제보 검수 상태 전이 테스트 | 상태가 `is_hidden` 불리언 하나다. 전이 규칙이 없다 |
| `routeGuide.steps.length ≥ 5` 를 6곳 전부에 요구 | **B등급 4곳에는 경로를 만들지 않기로 했다.** 만들지 않기로 한 데이터를 요구하는 검사는 규칙에서 지운다 (끄지 않고 지운다) |

---

## 7. CI — 잡 1개

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm validate:content
      - run: pnpm test
      - run: pnpm build
```

**전부 하나의 잡에서 순서대로 돈다.** 잡 사이에 산출물을 주고받으면 디버깅 시간이 절약 시간보다 크다.

수집 워크플로는 별도 (`ingest.yml`) — [`02_stack.md`](./02_stack.md) §6.

---

## 8. 제출 전 최종 점검표

CI가 아니라 **사람이 한 번 훑는 목록**이다. 자동화하지 않는다.

| # | 확인 | 근거 문서 |
|---|---|---|
| 1 | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` 전부 통과 | — |
| 2 | `pnpm e2e` 4건 전부 통과 (골든 플로우 포함) | §5 |
| 3 | NVDA 수동 과업 A·B·C 완료 (점자 디스플레이 지원 확인 포함) | [`08`](./08_accessibility_legal.md) §1.1b·§1.4 |
| 4 | Lighthouse 접근성 점수 확인 (스크린샷 보관) | §1.3 |
| 5 | `/privacy` · `/credits` 페이지가 실제 내용으로 채워져 있다 | [`08`](./08_accessibility_legal.md) §2, §3 |
| 6 | 푸터 출처 문구가 전 페이지에 있다 | [`08`](./08_accessibility_legal.md) §3.3 |
| 7 | Type3 이미지가 원본 그대로 렌더링된다 (최적화 미적용 확인) | [`08`](./08_accessibility_legal.md) §3.2 |
| 8 | 정직성 문구 9개가 각자 자리에 있다 | [`08`](./08_accessibility_legal.md) §5 |
| 9 | Supabase 리전이 `ap-northeast-2`, Vercel 리전이 `icn1` | [`02`](./02_stack.md) §6 |
| 10 | Supabase 플랜이 심사 기간 동안 일시정지되지 않는다 (Pro 또는 킵얼라이브) | [`02`](./02_stack.md) §6 |
| 11 | 관리자 계정과 익명 사용자 흐름이 분리돼 동작한다 | [`07`](./07_screens.md) S8 |
| 11b | 제보가 즉시 공개되고, 숨기면 즉시 사라진다 | [`07`](./07_screens.md) S7·S8 |
| 11c | 동의 문구가 "즉시 공개"라고 되어 있다 ("검수를 거쳐"가 아니다) | [`08`](./08_accessibility_legal.md) §2.2 |
| 12 | `docs/spec/_probe-results.md`가 최신 탐침 결과로 갱신돼 있다 | [`11`](./11_open_items.md) |
| 13 | 백업 — 핵심 흐름 화면 녹화 영상 1개 (외부 장애 대비) | — |
