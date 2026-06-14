# R2 — KWCAG 2.2 / WCAG 2.2 Accessibility for Next.js + React, and Korean Certification

Research brief for **모두의 백제 (Modu Baekje)** — Next.js (App Router) + Supabase + Vercel (Seoul), map/audio/PDF-heavy SPA, KWCAG 2.2 compliance + Korean WA/품질마크 certification.
Date: 2026-06-13. Sources are primary/official where possible (NIA/RRA standard, TTA, wa.or.kr, kwacc.or.kr, W3C, Deque, Playwright, Storybook, Next.js). Full URL list in **Sources** at the end.

> 한 줄 요약 / TL;DR: KWCAG 2.2(국가표준 KS X OT0003, 4원칙·14지침·**33검사항목**)가 2025년 1월부터 모든 웹접근성 품질인증 기술심사의 기준이다. KWCAG 2.2는 WCAG 2.1을 주축으로 일부 WCAG 2.2 항목만 차용했고 — **WCAG 2.2의 Target Size(2.5.8), Focus Appearance(2.4.13), Focus Not Obscured(2.4.11/12), Dragging(2.5.7), Consistent Help(3.2.6)은 KWCAG 2.2에 도입되지 않았다.** 따라서 자동화 게이트는 axe `wcag2a/wcag2aa/wcag21a/wcag21aa` 태그 + 일부 `wcag22aa`를 돌리되, **인증 통과 기준은 KWCAG 33항목 중심으로 사람이 검증**해야 한다. 자동 도구는 KWCAG 위반의 약 30~50%만 잡는다(나머지는 수동·스크린리더 심사).

---

## 1. KWCAG 2.2 — Structure, Legal Basis, and Mapping to WCAG

### 1.1 What it is
- **국가표준**: `KS X OT0003` 「한국형 웹 콘텐츠 접근성 지침 2.2 (Korean Web Content Accessibility Guidelines 2.2)」, 제·개정일 **2022-12-28** (국립전파연구원/RRA, 표준분야 정보기술). 이전판 KWCAG 2.1(2015-03-31).
- **구조 3단계**: 원칙(principle) → 지침(guideline) → 검사항목(requirement). **4개 원칙 · 14개 지침 · 33개 검사항목**.
  - 원칙1 인식의 용이성(Perceivable) — 9항목
  - 원칙2 운용의 용이성(Operable) — 15항목
  - 원칙3 이해의 용이성(Understandable) — 7항목
  - 원칙4 견고성(Robust) — 2항목
- **법적 근거(인증)**: 「디지털포용법」 제21조 및 시행령 제20조 (구 지능정보화기본법 제47조). 인증 미준수·만료 후 마크 미제거 시 과태료 가능.
- **WCAG와의 관계**: KWCAG와 WCAG의 버전 번호는 **서로 무관**(같은 2.2라도 1:1 대응 아님). KWCAG 2.2는 **WCAG 2.1의 Level A/AA 항목을 주축**으로 하고, **WCAG 2.2의 일부 항목만 선택 차용**했다.

### 1.2 KWCAG 2.2 33개 검사항목 (전체, 한국 표준 번호)
> 표준 본문의 번호는 5.x(인식)/6.x(운용)/7.x(이해)/8.x(견고)이며, 업계에서는 흔히 WCAG식 1.x/2.x/3.x/4.x로 부른다. 아래는 WCAG식 표기.

**원칙1 인식의 용이성 (5.x)**
- 1.1.1 적절한 대체 텍스트 제공 · 1.2.1 자막 제공(자막/대본/수어) · 1.3.1 표의 구성 · 1.3.2 콘텐츠의 선형구조 · 1.3.3 명확한 지시사항 제공 · 1.4.1 색에 무관한 콘텐츠 인식 · 1.4.2 자동 재생 금지 · 1.4.3 텍스트 콘텐츠의 명도 대비(**4.5:1 이상**) · 1.4.4 콘텐츠 간의 구분

**원칙2 운용의 용이성 (6.x)**
- 2.1.1 키보드 사용 보장 · 2.1.2 초점 이동과 표시 · 2.1.3 조작 가능 · **2.1.4 문자 단축키**(신규) · 2.2.1 응답시간 조절 · 2.2.2 정지 기능 제공 · 2.3.1 깜빡임과 번쩍임 사용 제한(**초당 3~50회 금지**, 광과민) · 2.4.1 반복 영역 건너뛰기 · 2.4.2 제목 제공 · 2.4.3 적절한 링크 텍스트 · **2.4.4 고정된 참조 위치 정보**(신규, 전자출판) · **2.5.1 단일 포인터 입력 지원**(신규) · **2.5.2 포인터 입력 취소**(신규) · **2.5.3 레이블과 네임**(신규) · **2.5.4 동작기반 작동**(신규)

**원칙3 이해의 용이성 (7.x)**
- 3.1.1 기본 언어 표시 · 3.2.1 사용자 요구에 따른 실행 · **3.2.2 찾기 쉬운 도움 정보**(신규) · 3.3.1 오류 정정 · 3.3.2 레이블 제공 · **3.3.3 접근 가능한 인증**(신규) · **3.3.4 반복 입력 정보**(신규)

**원칙4 견고성 (8.x)**
- 4.1.1 마크업 오류 방지 · 4.2.1 웹 애플리케이션 접근성 준수

### 1.3 KWCAG 2.1 → 2.2 변경 (정확히)
NIA 공식 안내 기준: **기존 24개 검사항목에 9개 신규 항목 추가 → 33개** (1개 내용 변경, 3개 지침 이동, 2개 신규 지침, 9개 신규 검사항목). 신규 9개와 대응 WCAG:

| KWCAG 2.2 신규 항목 | 대응 WCAG | WCAG 출처 |
|---|---|---|
| 2.1.4 문자 단축키 | 2.1.4 Character Key Shortcuts | WCAG 2.1 |
| 2.4.4 고정된 참조 위치 정보 | (Fixed Reference Points / 2.4.x) | **WCAG 2.2 계열** (전자출판) |
| 2.5.1 단일 포인터 입력 지원 | 2.5.1 Pointer Gestures **+ 2.5.7 Dragging Movements** | WCAG 2.1 + **2.2** (둘을 하나로 통합) |
| 2.5.2 포인터 입력 취소 | 2.5.2 Pointer Cancellation | WCAG 2.1 |
| 2.5.3 레이블과 네임 | 2.5.3 Label in Name | WCAG 2.1 |
| 2.5.4 동작기반 작동 | 2.5.4 Motion Actuation | WCAG 2.1 |
| 3.2.2 찾기 쉬운 도움 정보 | 3.2.6 Consistent Help | **WCAG 2.2** |
| 3.3.3 접근 가능한 인증 | 3.3.7→**3.3.8 Accessible Authentication (Min)** | **WCAG 2.2** |
| 3.3.4 반복 입력 정보 | 3.3.7 Redundant Entry | **WCAG 2.2** |

> **CRITICAL gap for this project**: KWCAG 2.2는 **WCAG 2.2의 2.5.8 Target Size(최소 24×24px)를 도입하지 않았고** (업계 전문가들이 명시적으로 지적: 국내 기준에선 작은 컨트롤을 문제 삼을 근거가 없음), **2.4.11/2.4.12 Focus Not Obscured, 2.4.13 Focus Appearance(둘 다 AAA 포함)** 도 미도입. 즉 한국 인증만 노린다면 이 항목들은 "법적 필수"는 아니다. 그러나 **모바일/태블릿 지도·도슨트 UX 품질과 WCAG 2.2 글로벌 기준을 위해 우리는 자체 기준으로 채택 권장** (target ≥ 24px, focus ring 3:1 — 비용 거의 0, 인증 사용자심사에서도 유리).

### 1.4 이 SPA(지도/오디오/PDF)에 가장 직결되는 검사항목
- **지도(Map)**: 2.1.1 키보드, 2.1.3 조작 가능, 2.5.1 단일 포인터(드래그/핀치 → 버튼 대안 필수), 2.5.4 동작기반 비활성화, 1.4.1 색 무관(범례·핀 색만으로 구분 금지), 4.2.1 웹앱 접근성. 지도 라이브러리(예: 카카오/네이버/Leaflet)는 캔버스 기반이라 **자동 axe 스캔으로 안 잡힘 → 키보드 패닝·줌 버튼 + ARIA + 목록형 대안(텍스트 리스트) 제공이 핵심**.
- **오디오 도슨트(GPS 자동재생)**: **1.4.2 자동 재생 금지**(소리 자동재생 금지 — GPS 트리거 자동재생은 사용자 동의/정지 가능해야 함), 2.2.2 정지 기능, 1.2.1 자막/대본 제공(오디오 대본 텍스트 필수), 2.2.1 응답시간. **aria-live로 현재 재생 해설 안내**.
- **PDF 다운로드/뷰어**: PDF 자체는 KWCAG 웹 항목이 아니라 별도 접근성 책임이나, 링크에 형식·용량 명시(2.4.3), 가능하면 **HTML 대체본** 제공 권장. 인증 심사 페이지에 PDF만 있는 화면은 위험.
- **광과민(2.3.1)**: 깜빡임/번쩍임 초당 3~50회 금지 + `prefers-reduced-motion` 존중(아래 §2.3).

---

## 2. Practical React / Next.js (App Router) Accessibility Implementation

### 2.1 Semantic landmarks & document structure
- 페이지당 **`<h1>` 1개**, 논리적 heading 위계(2.4.2 제목 제공 / KWCAG). Next App Router에서 layout/page 경계로 heading이 깨지기 쉬움 → 라우트별 h1 명시.
- 랜드마크: `<header>`(banner), `<nav>`, `<main>`(단 1개), `<footer>`(contentinfo), `<aside>`. axe `region`/`landmark-one-main` 규칙으로 검증.
- **Skip link**(2.4.1 반복 영역 건너뛰기): `<a href="#main-content">본문 바로가기</a>`를 첫 포커스 요소로. 한국 인증 심사는 "본문 바로가기/주메뉴 바로가기" skip-nav를 사실상 기대(공공기관 표준 패턴).
- `lang` 속성(3.1.1): App Router `app/layout.tsx`의 `<html lang="ko">`. 다국어 페이지는 해당 영역 `lang` 명시.

### 2.2 Focus management on client routing (WCAG 2.4.3 / KWCAG 2.1.2)
- **Next.js App Router는 라우트 변경 시 포커스를 자동으로 리셋하지 않는다** (Pages Router도 마찬가지). 내장 `AppRouterAnnouncer`는 `<next-route-announcer>`(Shadow DOM, `aria-live="assertive"`, `role="alert"`)로 **document.title 변경만** 읽어주고, h1/path fallback은 사실상 동작 안 함(알려진 이슈 #86660). 따라서:
  1. 라우트 전환 후 **메인 콘텐츠 heading(또는 skip-target)으로 포커스 이동** — `usePathname()` + `useEffect` + `ref.focus()`(대상에 `tabIndex={-1}`).
  2. `document.title`을 라우트별로 갱신(App Router `metadata`/`generateMetadata` 또는 클라이언트에서 `document.title=`)해 내장 announcer가 새 제목을 읽도록.
- 패턴(클라이언트 컴포넌트):
```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function RouteFocusReset() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; } // 최초 로드는 스크린리더가 자동 처리
    ref.current?.focus();
  }, [pathname]);
  return <div ref={ref} tabIndex={-1} aria-hidden="true" />; // skip-target near <main>
}
```
- **모달/다이얼로그**: focus trap + `aria-modal="true"` + Esc 닫기 + 닫을 때 트리거로 포커스 복귀. (직접 구현보다 Radix UI / React Aria 권장 — 접근성 내장.) parallel/intercepting routes(모달 라우트)는 독립 트리라 별도 포커스/announce 처리 필요.

### 2.3 aria-live for GPS docent auto-play & dynamic updates
- 현재 위치/해설 변경을 **`aria-live` region**으로 안내(시각장애 사용자가 화면을 안 봐도 인지). GPS 트리거 자동 안내는:
  - 상태 텍스트 컨테이너: `role="status"` 또는 `aria-live="polite"`(긴급 아님), `aria-atomic="true"`.
  - **오디오 자동재생은 1.4.2 위반 위험** → 사용자가 한 번 "오디오 도슨트 켜기"로 동의한 세션 내에서만, **항상 정지/일시정지 버튼 + 볼륨** 제공. 재생 중 텍스트 대본을 화면에 노출.
- 주의: `aria-live="assertive"`(또는 `role="alert"`)는 즉시 끼어들어 다른 안내를 끊으므로 **꼭 긴급할 때만**. 도슨트 진행 안내는 `polite`.
- Next 내장 route announcer가 불필요한 noise를 주면(직접 포커스 관리 시) — 끄는 옵션은 공식 미제공, CSP(`unsafe-inline`) 충돌 시 글로벌 CSS로 대체하는 워크어라운드 존재(§Sources).

### 2.4 prefers-reduced-motion (광과민 §2.3.1 보강, vestibular)
- **CSS 우선(가장 견고)** — 애니메이션을 기본 off로 두고 motion 허용 시에만 켜는 방향이 SSR/구브라우저 안전:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
- **JS 필요한 경우(Web Animations, 지도 패럴랙스, 비디오 autoplay)**: `window.matchMedia('(prefers-reduced-motion: reduce)')` 구독. SSR 안전 hook 패턴(Next): 서버/최초 렌더에서 애니메이션 off로 가정 후 mount 시 보정. Motion(framer-motion) 사용 시 `useReducedMotion()` 제공.
- 적용 대상: 지도 자동 패닝/줌 애니메이션, 자동 슬라이드/캐러셀, 페이지 전환 슬라이드, 배경 비디오 autoplay → reduce면 즉시 전환/정지.

### 2.5 Color-contrast tokens (1.4.3 명도 대비 = WCAG 4.5:1)
- **KWCAG 1.4.3 = 일반 텍스트 4.5:1, 큰 텍스트(18pt/14pt bold ≈ 24px/18.66px bold) 3:1**, UI 컴포넌트/그래픽 경계 3:1(1.4.4 콘텐츠 간 구분).
- 디자인 토큰을 **명도대비 검증된 쌍**으로 설계: 텍스트/배경 토큰 각각에 대해 대비비 기록. 다크/라이트 테마 모두 검증. CSS 변수 + Tailwind theme 토큰화 권장.
- 자동 검증: axe `color-contrast` 규칙(jsdom에선 미동작 → 실제 브라우저/Playwright/Storybook에서 검사). Storybook a11y 애드온은 **브라우저 렌더**라 대비를 잡음(jest-axe/jsdom은 못 잡음).
- 색만으로 정보 전달 금지(1.4.1): 지도 핀/범례/상태는 색 + 아이콘/텍스트/패턴 병행.

### 2.6 Screen-reader / AT testing matrix
한국 인증 **사용자심사**는 실제 보조기기 + 장애 유형별 사용자(전맹/저시력/지체·뇌병변)로 진행되므로, 개발 단계에서 동일 환경을 흉내 내야 한다.
| 플랫폼 | 스크린리더 | 비고 |
|---|---|---|
| Windows | **NVDA**(무료, 1순위), 센스리더(국내 인증 기준에 명시), JAWS | 국내 PC 웹 사용자심사: **센스리더 최신/죠스/NVDA** |
| macOS | **VoiceOver** | live region/route announce 검증 |
| iOS | **VoiceOver** | 인증 모바일 단말 기준 |
| Android | **TalkBack** | 인증 모바일 단말 기준 |
- 브라우저: WA 전문가심사는 **과기정통부 지정 Chrome 최신**(PC), 모바일은 User-Agent 변경 가능한 최신 브라우저. 즉 **Chrome 최신 + NVDA/센스리더**를 1차 타깃으로.

---

## 3. Automated a11y in CI (gate)

> 핵심 원칙: 자동 도구(axe 등)는 KWCAG/WCAG 위반의 약 30~50%만 잡는다. **CI 게이트로 회귀를 막되, 인증 합격은 수동+스크린리더 심사로 보강**. (jest-axe README도 "자동 테스트가 접근성을 보장하지 않는다"고 명시.)

### 3.1 axe-core 계열 (엔진: `axe-core` v4.11.x, 2026-06 기준 최신 ~4.11.4)
- axe-core는 WCAG 2.0/2.1/**2.2** 규칙을 태그로 보유(`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, `best-practice`). 4.9+에서 **2.5.8 target-size**, 4.11+에서 RGAA·target-size false-positive 개선, 4.11.x에서 **accessible-authentication(WCAG 2.2)** 규칙 추가(기본 비활성).
- **권장 태그 baseline**: `['wcag2a','wcag2aa','wcag21a','wcag21aa']` (= WCAG 2.0/2.1 A·AA, KWCAG 2.2가 차용한 대부분을 커버). 추가로 `'wcag22aa'`(target-size, redundant-entry 등) + `'best-practice'`(h1·region·skip-link)로 내부 기준 상향.

#### (a) E2E 페이지 스캔 — `@axe-core/playwright` (v4.11.x, axe-core와 lockstep)
- 설치: `npm i -D @axe-core/playwright`. 주입 자동(별도 injectAxe 불필요).
- 패턴(공유 fixture):
```ts
// fixtures/a11y.fixture.ts
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Fx = { makeAxe: () => AxeBuilder };
export const test = base.extend<Fx>({
  makeAxe: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page })
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']));
  },
});
export { expect } from '@playwright/test';
```
```ts
// home.a11y.spec.ts
import { test, expect } from './fixtures/a11y.fixture';
test('home has no a11y violations', async ({ page, makeAxe }) => {
  await page.goto('/');
  const r = await makeAxe().analyze();
  expect(r.violations).toEqual([]);
});
```
- `.include('#map')` / `.exclude('.third-party-map-canvas')` 로 스코프. **지도 캔버스 등 자동검사 불가 영역은 exclude하되, 별도 수동 체크리스트로 이관**(무조건 disable 금지).
- 동적 콘텐츠는 `await page.waitForSelector(...)` 후 스캔(스피너 떠 있을 때 스캔하면 false pass). Playwright 1.59 `--fail-on-flaky-tests`로 retry-pass를 실패 처리.

#### (b) 컴포넌트 단위 — `jest-axe`(v10.0.0, 2025-03) 또는 vitest용 `vi-axe`(v1.0.0)
- jest + RTL:
```ts
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
it('no a11y violations', async () => {
  const { container } = render(<DocentCard />);
  expect(await axe(container)).toHaveNoViolations();
});
```
- **한계**: jsdom 환경이라 **color-contrast·layout 의존 규칙은 부정확/비활성** → 대비는 Storybook/Playwright(실브라우저)에서. vitest면 `vi-axe`(jest-axe 포크, color-contrast 기본 비활성). Node ≥ 20.

#### (c) Storybook a11y — `@storybook/addon-a11y` + `@storybook/addon-vitest`(Storybook 9, Vitest browser mode)
- 컴포넌트별 axe 실행 + 패널 시각화(브라우저 렌더라 **대비도 검출**). `npx storybook add @storybook/addon-a11y` / `@storybook/addon-vitest`.
- CI 게이트: 스토리 `parameters.a11y.test = 'error'` 로 두면 Vitest 실행 시 위반을 **에러로** 처리. `'todo'`는 경고만. Next.js는 `@storybook/nextjs-vite` 프레임워크 필요.

### 3.2 Lighthouse a11y (보조 게이트, 회귀 감시)
- `treosh/lighthouse-ci-action@v12`(Lighthouse v12.x) + `lighthouserc.json`:
```jsonc
{ "ci": {
  "collect": { "url": ["http://localhost:3000/","http://localhost:3000/docent"], "numberOfRuns": 3 },
  "assert": { "assertions": {
    "categories:accessibility": ["error", { "minScore": 1 }],
    "categories:performance":   ["warn",  { "minScore": 0.9 }]
  } },
  "upload": { "target": "temporary-public-storage" }
}}
```
- `numberOfRuns: 3` + median 권장(단일 실행은 flaky). Lighthouse a11y는 axe 일부 + 휴리스틱이라 **axe E2E의 보완**으로만 사용(이것만으론 부족).

### 3.3 추천 CI 레이어링 (게이트 전략)
1. **PR 차단(error)**: jest-axe/vi-axe 컴포넌트 테스트 + Storybook a11y(`test:'error'`) + 핵심 라우트 `@axe-core/playwright` 스캔(`wcag2a/aa/21aa`).
2. **PR 경고(warn)**: Lighthouse a11y(`minScore` 0.95~1.0), `wcag22aa`·`best-practice` 추가 규칙.
3. **주기적/수동**: NVDA·VoiceOver·TalkBack 실제 스크린리더 점검, 지도/오디오/PDF 수동 체크리스트(아래 §5), 인증 자가진단도구(K-WAH 등) 결과서 작성.
- GitHub Actions 예: `actions/checkout` → `npm ci` → `npx playwright install --with-deps` → `npm run build && npm run start &` → `npx playwright test --project=a11y` / `treosh/lighthouse-ci-action`.

---

## 4. Korean Certification — WA & KWACC (process, timeline, cost)

### 4.1 제도 개요
- **품질마크(웹접근성 품질인증)**: 「디지털포용법」 근거. 과기정통부 지정 인증기관이 KWCAG 2.2 준수 사이트에 마크 부여. **유효기간 1년**(매년 갱신). **2025년 1월부터 기술심사 기준 = KWCAG 2.2** (이전 2.1에서 전환).
- **지정 인증기관(3개소)**: ① (사)한국장애인단체총연합회 **한국정보접근성인증평가원(WA, wa.or.kr)** ② **㈜웹와치(WebWatch, webwatch.or.kr)** ③ **한국디지털접근성진흥원(KWACC, kwacc.or.kr)** — KWACC는 (한국시각장애인협회 계열) 웹접근성평가센터 운영. 세 기관 모두 동일 국가표준(KWCAG 2.2) + 한국지능정보사회진흥원(NIA)의 **「웹 접근성 품질인증 표준심사 지침」(25.1.1 시행)**을 최소 기준으로 심사.

### 4.2 심사 절차 (공통 골격)
1. **견적 신청** → 2. **심사 신청**(자가진단 결과서 + 사업자등록증 제출, 수수료 납부/세금계산서) → 3. **서면심사**(자가진단·서류) → 4. **기술심사 = 전문가심사 + 사용자심사**(동시) → 5. **결과 통보**(합격 시 인증서·마크 발급) → 6. 이의제기(결과 통보 후 5일 내, 15일 내 최종 통보).
- **전문가심사**: 심사원이 KWCAG 2.2 **33개 검사항목 전 항목**을 페이지별로 기술 평가. 신규 3인 이상.
- **사용자심사**: 장애유형별(전맹/저시력/지체(상지)·뇌병변) 실사용자가 과업을 제한시간 내 수행 가능한지 평가. 신규 3인 이상(전맹 포함 필수). PC는 센스리더/JAWS/NVDA, 모바일은 iOS VoiceOver / Android TalkBack.

### 4.3 합격 기준 (엄격 — 중요)
- **전문가심사**: 33개 검사항목 **전체 준수율 95% 이상** (특정 항목 과락 없이 평균).
- **사용자심사**: **모든 장애 유형의 과업 성공률 100%**.
- 2차심사(보완 기회): 전문가심사 평균 준수율 **85%~95% 미만** 또는 사용자심사 성공률 **85%~100% 미만**일 때만. 이때 **1차 심사 페이지의 20% 이상을 변경**해야 하고 수정사항 포함 재심사. KWACC는 평균 85% 이상 경미 위반에 한해 **최초 1회 7영업일 내 보완** 후 재개.

### 4.4 일정(타임라인)
- KWACC 기준: 인증심사 **7~10영업일**, 재검수 2~3영업일, **총 10~30일**(보완기간 포함 시). WA는 입금 확인 후 기술심사 약 5일 내, 2차심사는 수정 후 약 4일 내.
- **프로젝트 함의**: 기능심사 마감(2026-10)에 맞추려면 **개발 완료 + 자가진단 + 보완을 9월 초까지** 끝내고, 인증 신청은 늦어도 **9월 중순**까지(2차심사 가능성·보완기간 버퍼 1개월 확보). 갱신은 매년이므로 1년 안에 재신청 일정도 캘린더화.

### 4.5 비용 (WA 공시 기준, 부가세 별도)
| 사이트 규모 | 신규 심사 | 갱신/재심사(약 30% DC) | 전문가 페이지 / 사용자 과업 |
|---|---|---|---|
| 소 (1~10p) | 1,100,000원 | 770,000원 | 전체 / 10개 |
| 소 (11~20p) | 1,200,000원 | 840,000원 | 전체(갱신 10p) / 10개 |
| 중 (21~99p) | 1,500,000원 | 1,050,000원 | 20p / 10개 |
| 대 (100p+) | 2,100,000원 | 1,470,000원 | 25p / 12개+ |
| 특수(금융·대민) | 별도견적 | 별도견적 | 25p+ / 12개+ |
- **할인**: 비영리 장애인기관·단체, 장애인기업·사회적기업 → 신규 30%/갱신 40% DC(공적기관 제외). 현장심사 필요 시 별도. **KWACC는 2025-03-01 접수분부터 수수료 일부 개편**(견적으로 확인).
- **프로젝트 함의**: Modu Baekje는 페이지 수가 적은 SPA지만 **인증 "페이지"는 화면/상태 단위로 샘플링**(가입·검색·상세 등 단계별)되므로 "소~중" 구간 예상 → 신규 약 **110만~150만원대(+VAT)** + 컨설팅 별도. 갱신 매년 발생.

---

## 5. Concrete CI-gateable + manual checklist (구현·게이트용)

### 5.1 자동 게이트(CI에서 fail 처리)
- [ ] `@axe-core/playwright` 핵심 라우트(홈/지도/도슨트/상세/검색/PDF목록) **violations === 0** (`wcag2a,wcag2aa,wcag21a,wcag21aa`).
- [ ] `wcag22aa` + `best-practice` 태그는 **warn**(target-size 24px, region, skip-link, page h1) — 점진 상향.
- [ ] jest-axe/vi-axe 컴포넌트 테스트 통과(버튼/폼/모달/카드/내비).
- [ ] Storybook `addon-a11y` + `addon-vitest`, 핵심 컴포넌트 `parameters.a11y.test='error'` (color-contrast 포함, 브라우저 렌더).
- [ ] Lighthouse a11y `categories:accessibility minScore ≥ 0.95`(median of 3), 목표 1.0.
- [ ] ESLint `eslint-plugin-jsx-a11y` 룰 활성(빌드 차단).

### 5.2 수동 / 스크린리더 체크리스트 (인증 직결, 자동검사 사각지대)
- [ ] **키보드만으로** 전체 플로우 수행 가능(지도 패닝·줌 버튼 포함), 포커스 순서 논리적, 포커스 표시 가시(KWCAG 2.1.1~2.1.3).
- [ ] 라우트 전환 시 포커스 main으로 이동 + `document.title` 변경 + announce(2.4.x).
- [ ] Skip-link "본문 바로가기" 최상단, 키보드로 동작.
- [ ] **지도**: 드래그/핀치 줌의 **버튼 대안**, 동작기반 비활성화(2.5.1/2.5.4), 색 외 핀 구분(아이콘/라벨, 1.4.1), 텍스트 목록형 대안 제공.
- [ ] **오디오 도슨트**: **자동 소리재생 금지/사용자 동의**(1.4.2), 정지·일시정지·볼륨(2.2.2), 해설 **대본 텍스트** 동시 노출(1.2.1), 진행 안내 `aria-live="polite"`.
- [ ] **PDF**: 링크에 형식/용량 표기(2.4.3), 가능하면 HTML 대체본, 인증 심사 화면이 PDF 단독이 아니게.
- [ ] **광과민**(2.3.1): 초당 3~50회 깜빡임 없음 + `prefers-reduced-motion: reduce` 시 지도/캐러셀/전환 애니메이션·배경비디오 정지.
- [ ] **대비**: 본문 4.5:1, 큰 텍스트/UI 경계 3:1, 다크·라이트 모두(1.4.3/1.4.4) — 디자인 토큰 대비비 문서화.
- [ ] **폼/인증**: 모든 입력 라벨(3.3.2), 오류 정정 안내(3.3.1), **CAPTCHA 등 인지테스트 단독 인증 금지** + 대안(SSO/매직링크/password autocomplete 허용, 3.3.3), 반복 입력 자동/선택(3.3.4).
- [ ] **NVDA(+센스리더) / VoiceOver / TalkBack** 각각으로 핵심 과업 통과(전맹·저시력·지체 시나리오).
- [ ] `lang="ko"`, 페이지 제목(2.4.2), 마크업 오류 없음(4.1.1 — HTML 검증/올바른 ARIA).
- [ ] 자가진단도구(K-WAH inspector 등) 결과서 작성·보관(인증 신청 필수 서류).

### 5.3 권장 라이브러리 버전 스냅샷 (2026-06)
- `axe-core` ~**4.11.4** / `@axe-core/playwright` ~4.11.x / `jest-axe` **10.0.0** / `vi-axe` 1.0.0 / `@storybook/addon-a11y`(Storybook 9) / Lighthouse v12.x / `treosh/lighthouse-ci-action@v12` / `eslint-plugin-jsx-a11y` 최신. (지도/모달은 직접 구현보다 **Radix UI / React Aria** 권장 — 포커스·ARIA 내장.)

---

## Sources (URLs)

KWCAG 2.2 표준 / 매핑
- 국가표준 PDF (KS X OT0003) — http://www.webwatch.or.kr/pds/(KS%20X%20OT0003)%20한국형%20웹%20콘텐츠%20접근성%20지침%202.2.pdf
- 국립전파연구원(RRA) 표준자료 (2022-12-28) — https://www.rra.go.kr/ko/reference/kcsList_view.do?nb_seq=5247&nb_type=6
- TTA 표준위원회(요약, 구판 비교) — https://committee.tta.or.kr/summary/standard_view.jsp?nowSu=130&section=1&section_code=
- 33개 검사항목 전체 (Web Soul Lab) — https://www.websoul.co.kr/accessibility/WA_guide22.asp
- KWCAG 2.2 온라인판(비공식) a11ykr — https://a11ykr.github.io/kwcag22/ , repo https://github.com/a11ykr/kwcag22
- 2.1→2.2 변경/WCAG 매핑 (mulder21c) — https://mulder21c.io/understanding-kwcag-22-changes-intro/ , https://mulder21c.io/understanding-kwcag-22-input-modalities-guideline/
- NIA 개정안내(24→33 항목) — https://www.nia.or.kr/site/nia_kor/ex/bbs/View.do?bcIdx=25083&cbIdx=90549
- 체크리스트 (UXKM) — https://uxkm.io/accessibility/a11y/06-a11yCheck/01-checkWcagRobust , .../01-checkWcagUnderstandable

WCAG 2.2 (글로벌, 매핑 비교)
- W3C WCAG 2.2 권고안 — https://www.w3.org/TR/WCAG22/
- W3C "What's New in WCAG 2.2" — https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- WCAG 2.2 신규기준 해설 — https://access-proof.com/blog/wcag-2-2-new-criteria-explained , https://a11y-examples.com/wcag-2-2/
- WCAG 2.2 한국어 비공식 번역 — https://a11ykr.github.io/docs/wcag2/

인증기관 (process/cost/criteria)
- 한국정보접근성인증평가원(WA) 심사절차 — http://wa.or.kr/m1/sub2.asp ; 심사기준(33항목) — http://wa.or.kr/m1/sub3.asp ; 심사비용 — https://www.wa.or.kr/m1/sub4.asp ; 메인 — https://www.wa.or.kr/
- 한국디지털접근성진흥원(KWACC) 인증소개 — http://www.kwacc.or.kr/Accessibility/Certification ; 인증절차 — http://kwacc.or.kr/Certification/Steps?category=WA
- 웹와치(WebWatch) 절차·기준(25.1.1 표준심사 지침 반영) — https://www.webwatch.or.kr/WA/010301.html?MenuCD=130
- 문화체육관광부 품질마크 운영정책(사례) — https://www.mcst.go.kr/kor/s_etc/webAccess/accessibility.jsp

Next.js / React a11y
- Next.js route announcer (App Router) 구현 커밋 — https://github.com/vercel/next.js/commit/9b40be8e444a5b4a5d23da8510dbe8d02f8d9ee8 ; Pages 버전 소스 — https://github.com/vercel/next.js/blob/canary/packages/next/src/client/route-announcer.tsx
- announcer fallback 이슈 #86660 — https://github.com/vercel/next.js/issues/86660 ; 끄기/CSP 논의 #48097 — https://github.com/vercel/next.js/discussions/48097 ; 포커스 이동 이슈 #49386 — https://github.com/vercel/next.js/issues/49386 ; 클라이언트 라우팅 a11y #28969 — https://github.com/vercel/next.js/discussions/28969
- App Router a11y 패턴(MFA11y) — https://modern-framework-accessibility.com/react-nextjs-accessibility-patterns/nextjs-app-router-a11y/

prefers-reduced-motion / contrast
- MDN prefers-reduced-motion — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- web.dev — https://web.dev/articles/prefers-reduced-motion
- Josh W. Comeau (React hook, SSR) — https://www.joshwcomeau.com/react/prefers-reduced-motion/
- Motion useReducedMotion — https://motion.dev/docs/react-use-reduced-motion ; ReactUse — https://reactuse.com/browser/usereducedmotion/ , https://reactuse.com/blog/react-accessibility-hooks/

Automated a11y CI
- Playwright Accessibility testing — https://playwright.dev/docs/accessibility-testing
- @axe-core/playwright — https://www.npmjs.com/package/@axe-core/playwright , https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md
- axe-core (engine, v4.11.x, tags) — https://www.npmjs.com/package/axe-core ; releases 4.11.0/.2/.3 — https://github.com/dequelabs/axe-core/releases/tag/v4.11.0 , .../v4.11.2 , .../v4.11.3 ; accessible-authentication PR #5046 — https://github.com/dequelabs/axe-core/pull/5046
- Microsoft axe-pipelines-samples — https://github.com/microsoft/axe-pipelines-samples/tree/main/typescript-playwright-sample
- Slack a11y testing — https://slack.engineering/automated-accessibility-testing-at-slack/
- @axe-core/playwright 2026 reference — https://qaskills.sh/blog/axe-core-playwright-accessibility-testing-2026
- jest-axe (10.0.0) — https://www.npmjs.com/package/jest-axe ; vi-axe — https://github.com/dhshah/vi-axe
- Storybook a11y — https://storybook.js.org/docs/writing-tests/accessibility-testing ; Vitest addon — https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/index ; Storybook 9 test blog — https://storybook.js.org/blog/component-test-with-storybook-and-vitest/
- Lighthouse CI config — https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md ; treosh action — https://github.com/treosh/lighthouse-ci-action ; CI integration guide — https://googlechrome-lighthouse.mintlify.app/advanced/ci-integration
