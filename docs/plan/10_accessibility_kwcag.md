# 10. 접근성 (KWCAG 2.2) 구현·검증

> **SPEC §10 확장본.** 이 문서는 모든 접근성 관련 개발·검증 결정의 단일 출처다. 다른 feature 문서는 여기에 위임한다.

---

## 0. 요약

| 항목 | 값 |
|---|---|
| 표준 | KWCAG 2.2 (KS X OT0003, 2022-12-28) — 4원칙·14지침·**33 검사항목** |
| 법적 근거 | 디지털포용법 §21 + 시행령 §20; 장차법 §20–21 |
| 자동 CI 게이트 | `@axe-core/playwright` violations=0 · `jest-axe` · Storybook addon-a11y · Lighthouse ≥0.95 · `eslint-plugin-jsx-a11y` |
| 수동 스크린리더 게이트 | NVDA / 센스리더 / VoiceOver(macOS+iOS) / TalkBack — **인증 심사 직결 gate** |
| 공식 인증 | WA / KWACC 품질마크 = **발전방향** (pre-review 선결 조건 아님); 자가진단(K-WAH) + 수동 스크린리더 검증이 MVP 기간 내 임계치 |
| 스트림 | **C3 Design/A11y** (Design Contract v1 포함, 전체 feature에 선행) |

---

## 1. KWCAG 2.2 구조 — 33 검사항목 전체

### 1.1 4원칙별 검사항목 목록

KWCAG 2.2는 WCAG 2.1 Level A/AA 항목을 주축으로 WCAG 2.2의 일부를 선택 차용했다. WCAG 버전 번호와 KWCAG 버전 번호는 **1:1 대응이 아니다.**

#### 원칙 1 — 인식의 용이성 (Perceivable) / 9항목

| # | 검사항목 | WCAG 대응 | 이 프로젝트 직결 영역 |
|---|---|---|---|
| 1.1.1 | 적절한 대체 텍스트 제공 | 1.1.1 | POI 이미지 alt, 지도 핀 aria-label, 픽토그램 alt |
| 1.2.1 | 자막 제공 (자막/대본/수어) | 1.2.1 | F2 도슨트 음성 → 대본 텍스트 상시 노출, 수어 영상 자막 |
| 1.3.1 | 표의 구성 | 1.3.1 | F5 RTO 대시보드 데이터 표, 적합도 근거 표 |
| 1.3.2 | 콘텐츠의 선형구조 | 1.3.2 | DOM 순서 = 시각 순서; 지도→목록 탭 전환 구조 |
| 1.3.3 | 명확한 지시사항 제공 | 1.3.3 | 색 이외의 형태·아이콘·텍스트로 지시 전달 |
| 1.4.1 | 색에 무관한 콘텐츠 인식 | 1.4.1 | 지도 핀: 색+아이콘+라벨 병행; 점수 레벨: 텍스트 동반 |
| 1.4.2 | 자동 재생 금지 | 1.4.2 | F2 GPS 트리거 도슨트: **사용자 동의 후 세션만** 자동재생; 정지 버튼 필수 |
| 1.4.3 | 텍스트 명도 대비 (≥4.5:1) | 1.4.3 | 디자인 토큰 쌍 대비비 문서화; 큰 텍스트 ≥3:1 |
| 1.4.4 | 콘텐츠 간의 구분 | 1.4.4 | UI 컴포넌트 경계·그래픽 ≥3:1 |

#### 원칙 2 — 운용의 용이성 (Operable) / 15항목

| # | 검사항목 | WCAG 대응 | 이 프로젝트 직결 영역 |
|---|---|---|---|
| 2.1.1 | 키보드 사용 보장 | 2.1.1 | 지도 패닝·줌 버튼 대안; 전체 플로우 Tab·Enter·Space·Esc |
| 2.1.2 | 초점 이동과 표시 | 2.4.3 | 라우트 전환 포커스 reset; 모달 focus trap |
| 2.1.3 | 조작 가능 | 2.1.3 | 터치 타깃 자발적 ≥24px (WCAG 2.2 2.5.8은 KWCAG 미채택이지만 품질기준으로 채택) |
| 2.1.4 | 문자 단축키 (**KWCAG 2.2 신규**) | 2.1.4 | 단일 문자 단축키는 비활성화 또는 재설정 UI 제공 |
| 2.2.1 | 응답시간 조절 | 2.2.1 | 세션 타임아웃 경고·연장 UI (Anonymous 세션) |
| 2.2.2 | 정지 기능 제공 | 2.2.2 | F2 도슨트 정지·일시정지·볼륨; 자동 슬라이드 정지 버튼 |
| 2.3.1 | 깜빡임과 번쩍임 사용 제한 | 2.3.1 | 초당 3~50회 금지; `prefers-reduced-motion` 필수 |
| 2.4.1 | 반복 영역 건너뛰기 | 2.4.1 | "본문 바로가기" skip-link 최상단 |
| 2.4.2 | 제목 제공 | 2.4.2 | 라우트별 고유 `<title>` (Next.js `metadata`); 페이지당 `<h1>` 1개 |
| 2.4.3 | 적절한 링크 텍스트 | 2.4.3 | PDF 링크에 형식·용량 명시; "여기 클릭" 금지 |
| 2.4.4 | 고정된 참조 위치 정보 (**KWCAG 2.2 신규**, 전자출판) | WCAG 2.2계열 | F4 다이어리·PDF 출력물 페이지 번호·섹션 참조 |
| 2.5.1 | 단일 포인터 입력 지원 (**KWCAG 2.2 신규**, WCAG 2.5.1+2.5.7 통합) | 2.5.1+2.5.7 | 지도 핀치 줌·드래그 → 버튼 대안 필수; 드래그 단독 기능 금지 |
| 2.5.2 | 포인터 입력 취소 (**KWCAG 2.2 신규**) | 2.5.2 | mousedown/touchstart 단독 액션 금지; mouseup/pointerup에서 처리 |
| 2.5.3 | 레이블과 네임 (**KWCAG 2.2 신규**) | 2.5.3 | 버튼 visible label ⊆ accessible name; aria-label이 시각 텍스트를 포함해야 |
| 2.5.4 | 동작기반 작동 (**KWCAG 2.2 신규**) | 2.5.4 | 기기 흔들기 등 모션 트리거 → 비활성화 옵션 필수 |

#### 원칙 3 — 이해의 용이성 (Understandable) / 7항목

| # | 검사항목 | WCAG 대응 | 이 프로젝트 직결 영역 |
|---|---|---|---|
| 3.1.1 | 기본 언어 표시 | 3.1.1 | `<html lang="ko">`; 다국어 콘텐츠 영역에 `lang` 속성 |
| 3.2.1 | 사용자 요구에 따른 실행 | 3.2.1 | 포커스·hover만으로 상태 변경 금지 |
| 3.2.2 | 찾기 쉬운 도움 정보 (**KWCAG 2.2 신규**, WCAG 3.2.6) | 3.2.6 | 1330·응급·SOS는 일관된 위치에 (F1.C) |
| 3.3.1 | 오류 정정 | 3.3.1 | F3 제보 폼: 오류 위치 + 정정 방법 텍스트 |
| 3.3.2 | 레이블 제공 | 3.3.2 | 모든 `<input>` → `<label>` 또는 `aria-label` |
| 3.3.3 | 접근 가능한 인증 (**KWCAG 2.2 신규**, WCAG 3.3.8) | 3.3.8 | CAPTCHA 단독 인증 금지; Supabase Anonymous/매직링크/OTP 허용 |
| 3.3.4 | 반복 입력 정보 (**KWCAG 2.2 신규**, WCAG 3.3.7) | 3.3.7 | 페르소나·언어 등 기존 입력값 자동 채움 또는 선택 허용 |

#### 원칙 4 — 견고성 (Robust) / 2항목

| # | 검사항목 | WCAG 대응 | 이 프로젝트 직결 영역 |
|---|---|---|---|
| 4.1.1 | 마크업 오류 방지 | 4.1.1 | id 중복 금지; 열린 태그 없음; ARIA role 유효성 |
| 4.2.1 | 웹 애플리케이션 접근성 준수 | 4.1.2 (확장) | ARIA 속성 유효; 지도 웹앱 접근성 (캔버스 제외 영역 대안) |

### 1.2 KWCAG 2.1 → 2.2 신규 9항목 요약

KWCAG 2.2에서 추가된 항목은 위 표에서 **(KWCAG 2.2 신규)** 표시. 기존 24개에서 9개 추가.

**KWCAG 2.2가 채택하지 않은 WCAG 2.2 항목** (법적 의무 아님, 그러나 품질 기준으로 자발적 채택):

| WCAG 2.2 항목 | KWCAG 채택 | 이 프로젝트 방침 |
|---|---|---|
| 2.5.8 Target Size (≥24×24px) | **미채택** | 자발적 채택 — 목표 ≥24px, 최소 24px (비용 ≈ 0, 인증 사용자심사 유리) |
| 2.4.11 Focus Not Obscured (Min) | **미채택** | sticky header 높이만큼 scroll margin 적용 |
| 2.4.12 Focus Not Obscured (Enhanced) | **미채택** | 권장 |
| 2.4.13 Focus Appearance | **미채택** | focus-ring 3:1 자발적 채택 |
| 2.5.7 Dragging Movements | **미채택** (KWCAG 2.5.1에 통합) | 2.5.1 준수로 커버 |

---

## 2. 컴포넌트-검사항목 매핑 테이블

> 개발자가 어느 컴포넌트에서 어떤 항목을 구현해야 하는지 즉시 조회할 수 있도록 정렬.

| 컴포넌트 / 기능 | 해당 KWCAG 검사항목 | 핵심 구현 의무 |
|---|---|---|
| `SkipLink` | 2.4.1 | `href="#main-content"` 첫 포커스 요소; 키보드로만 visible |
| `AppLayout` (landmarks) | 2.4.1, 2.4.2, 3.1.1 | `<header>`, `<nav>`, `<main id="main-content">`, `<footer>` 1개씩; `<html lang>` |
| `RouteFocusReset` | 2.1.2 | 라우트 전환마다 `<main>` 상단으로 포커스; `document.title` 변경 |
| `PageMeta` | 2.4.2 | `generateMetadata` → 라우트별 고유 `<title>` |
| `HeadingStructure` | 2.4.2 | 페이지당 `<h1>` 1개; h2→h3 순서 유지 |
| `PoiCard` | 1.1.1, 1.4.1, 1.4.3, 2.1.1 | alt 텍스트; 점수 레벨 텍스트 동반; 대비 토큰 |
| `SuitabilityBadge` | 1.4.1, 1.4.3 | 색+텍스트 동시 표현 (색만으로 구분 금지) |
| `MapContainer` | 2.1.1, 2.1.3, 2.5.1, 2.5.4, 1.4.1 | 지도 캔버스 `.map-canvas` → axe exclude; 키보드 줌·패닝 버튼 별도 제공; 드래그 단독 기능 버튼 대안; 핀 색+아이콘+aria-label |
| `PoiListFallback` | 2.1.1, 1.3.2 | 지도 대안 텍스트 목록; DOM 순서 = 시각 순서 |
| `DocentPlayer` (F2) | 1.2.1, 1.4.2, 2.2.2, 4.2.1 | 대본 텍스트 상시 노출; 자동재생 동의 후 세션만; 정지·일시정지·볼륨 항상 노출; `aria-live="polite"` 진행 안내 |
| `DocentConsentModal` | 1.4.2, 3.3.2, 3.3.3 | 동의 없이 오디오 재생 불가; label 연결; Radix Dialog 사용 |
| `SignVideoPlayer` (F2 수어) | 1.2.1 | 자막 트랙 또는 대본 패널 제공 |
| `BarrierReportForm` (F3) | 3.3.1, 3.3.2, 3.3.4 | 오류 메시지 텍스트 + 위치 명시; `<label>` 연결; 이전 입력 자동채움 |
| `DiaryEditor` (F4) | 2.1.1, 3.3.2, 3.3.4 | 키보드 접근 가능; label 연결; 저장된 페르소나 자동 채움 |
| `PdfExportLink` (F4) | 2.4.3 | `파일명.pdf (PDF, 약 2.2MB)` 형식으로 링크 텍스트; HTML 대체본 링크 병행 |
| `RtoDashboard` (F5) | 1.3.1, 1.4.3 | `<table>` caption + scope; 시각화 색 외 패턴/텍스트 대안 |
| `Modal` (모든 곳) | 2.1.2, 2.1.1 | Radix UI Dialog: focus trap + `aria-modal="true"` + Esc 닫기 + 닫을 때 트리거 복귀 |
| `FormInput` | 3.3.1, 3.3.2, 3.3.3 | label 연결; 오류 상태 `aria-invalid` + `aria-describedby`; CAPTCHA 금지 |
| `NavMenu` | 2.1.1, 2.4.1, 2.4.3 | 키보드로 열기/닫기; 링크 텍스트 설명적 |
| `AlertBanner` (F3 approved alert) | 1.4.2, 2.2.2, 4.2.1 | `role="alert"` 또는 `aria-live="assertive"` (긴급 배리어 알림만); 정지 가능 |
| `AutoSlide` / `Carousel` | 2.2.2, 2.3.1 | 정지 버튼; `prefers-reduced-motion: reduce` 시 자동 전환 중지 |
| `MapAnimation` | 2.3.1 | 지도 자동 패닝·줌 애니메이션 → reduce 시 즉시 전환 |
| `AiBadge` | 4.2.1, 2.5.3 | `aria-label="AI 음성 안내"` 스크린리더도 읽어야; visible label 포함 |

---

## 3. CI 게이트 구성

### 3.1 계층 구조

```
PR 차단 (error → merge 불가)
  ├─ eslint-plugin-jsx-a11y (빌드 시 정적 검사)
  ├─ jest-axe 컴포넌트 단위 (jsdom, color-contrast 비활성 — Storybook에서 보완)
  ├─ Storybook addon-a11y (브라우저 렌더, color-contrast 포함) parameters.a11y.test='error'
  └─ @axe-core/playwright 핵심 라우트 violations=0 (wcag2a, wcag2aa, wcag21a, wcag21aa)

PR 경고 (warn → merge 허용, 주간 검토)
  ├─ @axe-core/playwright wcag22aa + best-practice 태그 (target-size, region, skip-link 등)
  └─ Lighthouse a11y minScore ≥ 0.95 (3회 median)

주기적·수동 (스프린트별)
  ├─ NVDA / 센스리더 스크린리더 매트릭스 (§7)
  ├─ VoiceOver (macOS + iOS) / TalkBack
  ├─ 지도·오디오·PDF 수동 체크리스트 (§5)
  └─ K-WAH 자가진단 결과서 작성 (인증 신청 시 필수 서류)
```

### 3.2 `@axe-core/playwright` — 핵심 라우트 E2E 스캔

**설치 패키지:** `@axe-core/playwright ~4.11.x` (axe-core ~4.11.4와 lockstep)

**공유 fixture** (`tests/accessibility/fixtures/a11y.fixture.ts`):

```typescript
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type A11yFixtures = {
  makeAxe: () => AxeBuilder;
};

export const test = base.extend<A11yFixtures>({
  makeAxe: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('.map-canvas')  // 지도 캔버스: 수동 체크리스트로 이관
    );
  },
});

export { expect } from '@playwright/test';
```

**스캔 대상 라우트** (`tests/accessibility/routes.a11y.spec.ts`):

```typescript
import { test, expect } from './fixtures/a11y.fixture';

const CORE_ROUTES = [
  '/',
  '/poi/gongsan-fortress',
  '/poi/gongsan-fortress/route',
  '/docent/gongsan-fortress',
  '/report/new',
  '/diary',
  '/dashboard',
];

for (const route of CORE_ROUTES) {
  test(`${route} — no a11y violations`, async ({ page, makeAxe }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    const results = await makeAxe().analyze();
    expect(results.violations).toEqual([]);
  });
}
```

**지도 캔버스 처리 원칙:**
- `.map-canvas` (Kakao/Naver/Leaflet 캔버스 요소) → `.exclude()` 적용
- exclude는 완전히 무시하는 것이 아니라 **§5 수동 체크리스트 항목으로 이관**
- 지도 컨테이너 바깥의 버튼·레이블·목록 영역은 axe 스캔 범위에 포함

### 3.3 `jest-axe` — 컴포넌트 단위 테스트

**설치 패키지:** `jest-axe 10.0.0`, Node ≥20

```typescript
// packages/ui/src/__tests__/DocentPlayer.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DocentPlayer } from '../DocentPlayer';

expect.extend(toHaveNoViolations);

describe('DocentPlayer', () => {
  it('has no a11y violations', async () => {
    const { container } = render(
      <DocentPlayer
        transcript="공산성 동문에 오셨습니다..."
        audioSrc="/audio/gongsan-east-gate.mp3"
        isConsentGranted={true}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

**jest-axe 한계:** jsdom 환경이므로 `color-contrast` 규칙은 비활성 상태. 대비 검증은 Storybook에서 수행.

**테스트 필수 대상 컴포넌트:**

| 패키지 | 컴포넌트 |
|---|---|
| `packages/ui` | `PoiCard`, `SuitabilityBadge`, `DocentPlayer`, `BarrierReportForm`, `Modal`, `FormInput`, `NavMenu`, `AlertBanner`, `SkipLink`, `AiBadge` |
| `apps/web/features/f1-poi-card` | `PoiDetail`, `AccessibilityFactsTable` |
| `apps/web/features/f2-docent` | `DocentConsentModal`, `SignVideoPlayer` |
| `apps/web/features/f4-diary` | `DiaryEditor`, `PdfExportLink` |
| `apps/web/features/f5-dashboard` | `RtoDashboard`, `GapMetricTable` |

### 3.4 Storybook `addon-a11y` — 대비 포함 브라우저 렌더 검증

**설치 패키지:** `@storybook/addon-a11y`, `@storybook/addon-vitest` (Storybook 9), `@storybook/nextjs-vite`

**story 기본 설정** (`.storybook/preview.ts`):

```typescript
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    a11y: {
      test: 'error',  // 위반 시 Vitest CI 실패
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};

export default preview;
```

**대비 검증 대상 story 필수 포함 (color-contrast 포함):**
- 라이트 테마 + 다크 테마 각각
- `SuitabilityBadge` (방문가능/주의/대체추천 3개 상태)
- `PoiCard` (기본 + hover + focus)
- `AlertBanner` (정보/경고/오류)
- `FormInput` (기본/포커스/오류 상태)

### 3.5 Lighthouse CI — 회귀 감시

**설정 파일** (`.lighthouserc.json`):

```json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/poi/gongsan-fortress",
        "http://localhost:3000/docent/gongsan-fortress"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:performance": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**GitHub Actions 스텝** (`.github/workflows/ci.yml`에 포함):

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    configPath: .lighthouserc.json
    uploadArtifacts: true
    temporaryPublicStorage: true
```

### 3.6 `eslint-plugin-jsx-a11y` — 정적 분석

**설정** (`eslint.config.mjs`):

```javascript
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
];
```

---

## 4. 개발 필수 구현 패턴

### 4.1 라우트 전환 포커스 리셋 + `aria-live` 타이틀 안내

**배경:** Next.js App Router는 라우트 전환 시 포커스를 자동으로 `<main>`으로 이동하지 않는다. 내장 `AppRouterAnnouncer`는 `document.title` 변경만 읽어주지만 폴백 동작에 알려진 이슈(#86660)가 있다.

**`RouteFocusReset` 컴포넌트** (`apps/web/src/shared/components/RouteFocusReset.tsx`):

```typescript
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function RouteFocusReset() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;  // 최초 로드는 브라우저/스크린리더가 처리
    }
    ref.current?.focus();
  }, [pathname]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      aria-hidden="true"
      style={{ outline: 'none' }}
    />
  );
}
```

**배치:** `apps/web/src/app/[locale]/layout.tsx`의 `<main id="main-content">` 바로 안, `<SkipLink>` 다음.

**`document.title` 연동:** 각 라우트의 `generateMetadata` 반환값이 `<title>`을 갱신하면 내장 announcer가 읽음. 클라이언트 전용 페이지는 `useEffect`에서 `document.title = '...'` 직접 갱신.

**`aria-live` 도슨트 진행 안내 패턴** (`apps/web/src/features/f2-docent/components/DocentStatusRegion.tsx`):

```typescript
'use client';
import { useDocentStore } from '../stores/docentStore';

export function DocentStatusRegion() {
  const currentSegment = useDocentStore((s) => s.currentSegment);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {currentSegment ? `현재 해설: ${currentSegment.title}` : ''}
    </div>
  );
}
```

**`aria-live` 수준 선택 기준:**
- `polite` (role="status"): 도슨트 진행, 검색 결과 수, 필터 변경 — 현재 읽기 완료 후 안내
- `assertive` (role="alert"): 배리어 긴급 알림(공사·폐쇄), 오류 — 즉시 끼어들기

### 4.2 지도 — 키보드·목록 대안

**지도 캔버스 axe 제외 원칙:**
- `.map-canvas` 캔버스 요소 자체는 axe 스캔에서 제외
- 지도 컨테이너 내 모든 `<button>`, `<div role="...">`, aria 속성은 스캔 대상

**지도 접근성 구현 체크리스트:**

```
[ ] 줌 인 버튼: <button aria-label="지도 확대">+</button>
[ ] 줌 아웃 버튼: <button aria-label="지도 축소">-</button>
[ ] 내 위치 버튼: <button aria-label="현재 위치로 이동">
[ ] 키보드 패닝: 화살표 키 이벤트 핸들러 (지도 포커스 시)
[ ] 핀 클릭 = Enter/Space 동작 동일
[ ] 각 마커: aria-label에 POI 이름 + 접근성 요약 포함
[ ] 선택된 마커: aria-pressed="true" 또는 aria-expanded="true"
[ ] 팝업: role="dialog" + aria-modal + focus trap
```

**텍스트 목록 대안 (`PoiListFallback`):** 지도 뷰와 **탭으로 전환 가능**한 목록 뷰를 항상 제공. 스크린리더는 기본으로 목록 뷰로 시작.

```typescript
// 탭 전환 패턴
<div role="tablist">
  <button role="tab" aria-selected={view === 'map'} onClick={() => setView('map')}>
    지도로 보기
  </button>
  <button role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>
    목록으로 보기
  </button>
</div>
<div role="tabpanel" hidden={view !== 'list'}>
  <PoiListFallback pois={pois} />
</div>
```

**색에 무관한 핀 구분 (KWCAG 1.4.1):**

| 상태 | 색 | 아이콘 | aria-label |
|---|---|---|---|
| 방문가능 (75–100) | 초록 | ✓ 체크 | `POI명 — 방문가능` |
| 주의 (50–74) | 노랑 | ⚠ 삼각형 | `POI명 — 주의 필요` |
| 대체추천 (0–49) | 빨강 | ✕ X | `POI명 — 대체 POI 추천` |
| 정보없음 | 회색 | ? 물음표 | `POI명 — 접근성 정보 없음` |

### 4.3 도슨트 동의·대본·컨트롤 (F2)

**자동재생 동의 흐름 (KWCAG 1.4.2):**

```
사용자 진입
  └─ 도슨트 동의 모달 (DocentConsentModal)
       ├─ "AI 음성 안내 시작" 버튼 → sessionStorage: docentConsent=true
       └─ "텍스트 대본만 보기" 버튼 → 오디오 없이 텍스트 전용

세션 내 (docentConsent=true 상태)
  └─ GPS 트리거 또는 지도 탭 → 오디오 자동재생 허용
       + DocentPlayer: 정지·일시정지·볼륨 항상 표시
       + DocentStatusRegion: aria-live="polite" 현재 구간 안내
       + 대본 패널: 항상 화면에 노출 (collapsed 기본, 펼침 버튼 제공)
```

**`DocentPlayer` 필수 컨트롤 구조:**

```typescript
interface DocentPlayerProps {
  audioSrc: string;
  transcript: string;
  segmentTitle: string;
  isConsentGranted: boolean;
}

// 필수 렌더 요소:
// <audio> — preload="metadata", 자동재생은 isConsentGranted 경우에만
// <button aria-label="일시정지"> / <button aria-label="재생">
// <button aria-label="정지">
// <input type="range" aria-label="볼륨 조절">
// <section aria-label="해설 대본"> — transcript 텍스트
// <DocentStatusRegion /> — aria-live
```

**AI 배지 (AI 기본법 §31 + 스크린리더):**

```typescript
export function AiBadge({ type }: { type: 'voice' | 'translation' | 'course' }) {
  const labels = {
    voice: 'AI 음성 안내',
    translation: 'AI 번역',
    course: 'AI 생성 코스',
  } as const;

  return (
    <span
      aria-label={labels[type]}
      title={labels[type]}
      className="badge-ai"
    >
      {labels[type]}
    </span>
  );
}
```

### 4.4 대비 토큰 (KWCAG 1.4.3 / 1.4.4)

**Design Contract v1 토큰** (`packages/ui/src/tokens/contrast.ts`):

```typescript
export const ContrastTokens = {
  // 일반 텍스트: 4.5:1 이상 (라이트/다크 모두 검증)
  textPrimary: {
    light: { fg: '#1A1A1A', bg: '#FFFFFF', ratio: 21.0 },
    dark:  { fg: '#F5F5F5', bg: '#121212', ratio: 18.1 },
  },
  textSecondary: {
    light: { fg: '#595959', bg: '#FFFFFF', ratio: 7.0 },
    dark:  { fg: '#ABABAB', bg: '#121212', ratio: 7.2 },
  },
  // 큰 텍스트 / UI 경계: 3:1 이상
  textLarge: {
    light: { fg: '#767676', bg: '#FFFFFF', ratio: 4.54 },
    dark:  { fg: '#8A8A8A', bg: '#121212', ratio: 3.5 },
  },
  // 적합도 배지 (색+텍스트 병행)
  badgeVisitable: {
    light: { fg: '#FFFFFF', bg: '#1B7A2E', ratio: 8.2 },
  },
  badgeCaution: {
    light: { fg: '#000000', bg: '#D4A017', ratio: 5.9 },
  },
  badgeAlternative: {
    light: { fg: '#FFFFFF', bg: '#C0392B', ratio: 7.1 },
  },
  badgeUnknown: {
    light: { fg: '#FFFFFF', bg: '#6B6B6B', ratio: 4.6 },
  },
} as const;
```

**CSS 변수 매핑** (`apps/web/src/app/globals.css`):

```css
:root {
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #595959;
  --color-badge-visitable: #1B7A2E;
  --color-badge-caution: #D4A017;
  --color-badge-alternative: #C0392B;
  --color-badge-unknown: #6B6B6B;
}

[data-theme="dark"] {
  --color-text-primary: #F5F5F5;
  --color-text-secondary: #ABABAB;
}
```

**검증 시점:** 새 토큰 추가 시 Storybook `addon-a11y` story에 반드시 포함. Storybook은 브라우저 렌더이므로 `color-contrast` 규칙이 동작함.

### 4.5 `prefers-reduced-motion`

**CSS 전역 규칙** (`apps/web/src/app/globals.css` 최상위):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**JS 훅** (`apps/web/src/shared/hooks/useReducedMotion.ts`):

```typescript
'use client';
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(true); // SSR-safe: 기본 off

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

**적용 대상:**
- 지도 자동 패닝·줌 애니메이션 → `prefersReduced` 시 `duration: 0`
- 자동 슬라이드·캐러셀 → 자동 전환 중지 (수동 전환만 허용)
- 페이지 전환 슬라이드 → 즉시 전환
- 배경 비디오 autoplay → 정지; poster 이미지 표시

### 4.6 Skip-link + 랜드마크 + h1

**`SkipLink` 컴포넌트** (`apps/web/src/shared/components/SkipLink.tsx`):

```typescript
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      본문 바로가기
    </a>
  );
}
```

```css
/* globals.css */
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  background: var(--color-surface);
  padding: 0.5rem 1rem;
  z-index: 9999;
  text-decoration: underline;
}

.skip-link:focus {
  top: 1rem;
}
```

**랜드마크 구조** (`apps/web/src/app/[locale]/layout.tsx`):

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <SkipLink />
        <header>
          <nav aria-label="주요 메뉴">...</nav>
        </header>
        <main id="main-content">
          <RouteFocusReset />
          {children}
        </main>
        <footer>...</footer>
      </body>
    </html>
  );
}
```

**h1 배치 원칙:**
- 각 페이지의 `page.tsx`에서 `<h1>` 1개 명시
- layout.tsx에서 h1 사용 금지 (중복 방지)
- `/poi/[poiId]` → `<h1>{poiName} 무장애 안내</h1>`
- `/docent/[poiId]` → `<h1>{poiName} 도슨트</h1>`

### 4.7 Radix UI / React Aria 포커스 트랩

**모달·다이얼로그:** 직접 구현 금지. `@radix-ui/react-dialog` 사용 (focus trap + `aria-modal` + Esc 내장).

```typescript
import * as Dialog from '@radix-ui/react-dialog';

export function DocentConsentModal({ onConsent, onTextOnly }: DocentConsentModalProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>도슨트 시작</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content aria-describedby="docent-desc">
          <Dialog.Title>AI 음성 도슨트 동의</Dialog.Title>
          <Dialog.Description id="docent-desc">
            GPS 위치 기반으로 AI 음성 안내가 자동 재생됩니다.
          </Dialog.Description>
          <button onClick={onConsent}>AI 음성 안내 시작</button>
          <button onClick={onTextOnly}>텍스트 대본만 보기</button>
          <Dialog.Close aria-label="닫기">✕</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**셀렉트·콤보박스:** `@radix-ui/react-select` 또는 `react-aria-components` (페르소나 선택, 언어 선택 등).

### 4.8 자발적 타깃 크기 ≥24px

KWCAG 2.2는 WCAG 2.2의 2.5.8(Target Size ≥24×24px)을 채택하지 않았으나 이 프로젝트는 무장애 서비스 품질 기준으로 **자발적 채택**.

**Tailwind 기준** (`tailwind.config.ts`):

```typescript
theme: {
  extend: {
    minHeight: { 'touch': '24px' },
    minWidth:  { 'touch': '24px' },
  },
},
```

**적용 대상:** 모든 `<button>`, `<a>`, `<input>`, `<label>` (클릭 영역 기준). 시각적 크기가 작아도 투명 padding으로 타깃 크기 확보.

**focus-ring 3:1 (자발적):**

```css
:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* focus ring 대비: 3:1 이상 */
:root { --color-focus-ring: #0055CC; }  /* bg #FFF 대비 ≈ 7.5:1 */
```

---

## 5. 수동 체크리스트 — 인증 직결·자동검사 사각지대

> 스프린트 종료마다 해당 feature 담당자가 직접 수행. 지도·오디오·PDF는 자동 스캔으로 잡히지 않는다.

### 5.1 전체 공통

```
[ ] 키보드만으로 전체 플로우 수행 가능 (KWCAG 2.1.1)
    └─ Tab: 포커스 이동 / Enter·Space: 활성화 / Esc: 모달 닫기 / 화살표: 메뉴·탭 탐색
[ ] 포커스 순서가 시각적 순서와 일치 (2.1.2)
[ ] 포커스 표시 가시 (focus-ring 항상 보임, 2.1.2)
[ ] Skip-link "본문 바로가기" Tab 첫 번째 포커스, Enter 시 #main-content로 이동 (2.4.1)
[ ] 라우트 전환: 포커스가 main 콘텐츠로 이동 + document.title 변경 (2.4.2)
[ ] 페이지당 h1 1개, heading 위계 순서 (2.4.2)
[ ] lang="ko" on <html>; 다국어 콘텐츠 영역 lang 속성 (3.1.1)
[ ] 마크업 오류 없음 (id 중복, 열린 태그, 잘못된 ARIA role) (4.1.1)
[ ] 모든 <input> label 연결 (3.3.2)
[ ] 모든 이미지 alt 텍스트 (장식이면 alt="") (1.1.1)
[ ] prefers-reduced-motion: reduce 시 모든 애니메이션 정지 (2.3.1)
[ ] 텍스트 대비 본문 ≥4.5:1, 큰 텍스트·UI 경계 ≥3:1 (라이트+다크) (1.4.3, 1.4.4)
[ ] 색 이외의 수단으로 정보 전달 (아이콘·패턴·텍스트 병행) (1.4.1)
[ ] 깜빡임·번쩍임 초당 3~50회 없음 (2.3.1)
```

### 5.2 지도 (F1 지도 뷰)

```
[ ] 지도 내 패닝: 키보드 화살표 키 또는 버튼 (2.1.1)
[ ] 줌 인/아웃: <button> 제공 (2.1.1, 2.5.1)
[ ] 드래그로만 가능한 기능 없음 — 모두 버튼 대안 (2.5.1)
[ ] 핀치 줌 대안 버튼 (2.5.1)
[ ] 기기 흔들기 트리거 비활성화 옵션 (2.5.4)
[ ] 각 마커: Enter/Space로 팝업 열기 (2.1.1)
[ ] 마커 팝업: role="dialog", focus trap, Esc 닫기 (2.1.2)
[ ] 핀 색 + 아이콘 + aria-label 병행 (1.4.1)
[ ] 목록 탭으로 전환 가능 (PoiListFallback) (2.1.1)
[ ] 지도 자동 패닝 애니메이션: reduce 시 즉시 전환 (2.3.1)
```

### 5.3 오디오 도슨트 (F2)

```
[ ] GPS 트리거 전 동의 없이 오디오 자동재생 없음 (1.4.2)
[ ] 동의 모달: 텍스트 전용 선택지 제공 (1.4.2)
[ ] 동의 후 세션에서만 자동재생; 항상 정지·일시정지·볼륨 컨트롤 표시 (2.2.2)
[ ] 해설 대본 텍스트 항상 화면에 노출 (1.2.1)
[ ] 현재 재생 구간 aria-live="polite" 안내 (4.2.1)
[ ] 수어 영상: 자막 트랙 또는 대본 패널 (1.2.1)
[ ] AI 배지 ("AI 음성 안내"): 스크린리더도 읽히는 텍스트 (4.2.1)
[ ] 지도 탭 fallback으로도 도슨트 시작 가능 (위치 미동의 시) (2.1.1)
```

### 5.4 제보 폼 (F3), 다이어리 (F4)

```
[ ] 모든 입력 필드 <label> 또는 aria-label (3.3.2)
[ ] 오류 메시지: aria-invalid + aria-describedby + 위치·정정방법 텍스트 (3.3.1)
[ ] CAPTCHA 없음 (3.3.3)
[ ] 이전 제보/다이어리 항목 자동채움 또는 선택 제공 (3.3.4)
[ ] 파일 첨부: aria-label + 형식 안내 (1.1.1)
[ ] PDF 내보내기 링크: "파일명.pdf (PDF, 약 ??MB)" 형식 (2.4.3)
[ ] HTML 대체본 링크 병행 제공 (권장) (2.4.3)
```

### 5.5 F5 RTO 대시보드

```
[ ] 데이터 표: <caption> + scope 속성 (1.3.1)
[ ] 시각화 차트: 색 외 패턴·텍스트·데이터 테이블 대안 (1.4.1)
[ ] 차트 aria-label 또는 figcaption (1.1.1)
```

---

## 6. 개발 시점 TypeScript 인터페이스 / 함수 시그니처

### 6.1 접근성 관련 공유 타입 (`packages/ui/src/types/a11y.ts`)

```typescript
export type AriaLiveLevel = 'polite' | 'assertive' | 'off';

export interface A11yStatusRegionProps {
  message: string;
  level: AriaLiveLevel;
  atomic?: boolean;
}

export interface SkipLinkTarget {
  id: string;       // HTML id of the target element
  label: string;    // visible + SR text for the skip link
}

export interface AiBadgeType {
  kind: 'voice' | 'translation' | 'course';
}

export interface ContrastPair {
  fg: string;
  bg: string;
  ratio: number;    // computed at design token definition time
}
```

### 6.2 `useA11yAnnouncer` 훅 (`apps/web/src/shared/hooks/useA11yAnnouncer.ts`)

```typescript
'use client';
import { useCallback, useRef } from 'react';

export function useA11yAnnouncer(level: 'polite' | 'assertive') {
  const regionRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((message: string) => {
    if (!regionRef.current) { return; }
    regionRef.current.textContent = '';
    requestAnimationFrame(() => {
      if (regionRef.current) { regionRef.current.textContent = message; }
    });
  }, []);

  return { regionRef, announce };
}
```

### 6.3 `validateA11yTokens` (빌드타임 대비 검증, `packages/ui/src/tokens/validateContrast.ts`)

```typescript
import { ContrastTokens } from './contrast';

export function validateA11yTokens(): void {
  for (const [name, themes] of Object.entries(ContrastTokens)) {
    for (const [theme, pair] of Object.entries(themes)) {
      if (pair.ratio < 4.5) {
        throw new Error(
          `Contrast violation: ${name}/${theme} ratio=${pair.ratio} < 4.5:1`
        );
      }
    }
  }
}
```

빌드 스크립트 (`package.json`의 `prebuild`):

```json
{
  "scripts": {
    "prebuild": "node -e \"require('./packages/ui/src/tokens/validateContrast').validateA11yTokens()\"",
    "build": "next build"
  }
}
```

---

## 7. 수동 스크린리더 매트릭스 — 인증 직결 게이트

> 이 섹션의 체크 통과 = cert-direct gate. WA/KWACC 사용자심사 시나리오와 동일 환경.

### 7.1 테스트 환경

| 플랫폼 | 스크린리더 | 브라우저 | 우선순위 |
|---|---|---|---|
| Windows | **NVDA** (최신, 무료) | Chrome 최신 | **1순위** |
| Windows | **센스리더** (최신) | Chrome 최신 | 1순위 (국내 인증 명시) |
| Windows | JAWS (최신) | Chrome 최신 | 2순위 |
| macOS | **VoiceOver** | Safari 최신 | 1순위 |
| iOS | **VoiceOver** | Safari 최신 | 1순위 (모바일) |
| Android | **TalkBack** | Chrome 최신 | 1순위 (모바일) |

### 7.2 핵심 시나리오 × 스크린리더 매트릭스

> 각 셀 = Pass / Fail / Blocked. Fail 또는 Blocked = PR merge 불가 (8월 31일 수동검증 마감 이후).

#### 시나리오 목록

| ID | 시나리오 | 장애 유형 모사 |
|---|---|---|
| S1 | 홈 → 페르소나 선택 → 공산성 카드 확인 | 전맹 (시각장애) |
| S2 | 공산성 적합도 카드 → 4-Layer 근거 펼치기 | 전맹 |
| S3 | 지도 뷰 → 키보드로 핀 탐색 → 목록 탭 전환 | 전맹 |
| S4 | 도슨트 동의 → 재생 → 대본 읽기 → 정지 | 전맹 |
| S5 | 배리어 제보 폼 작성 → 전송 | 지체(상지)·뇌병변 |
| S6 | 다이어리 입력 → PDF 내보내기 링크 확인 | 저시력 (텍스트 크기 200%) |
| S7 | RTO 대시보드 표 탐색 | 저시력 |
| S8 | 언어 전환 (한→영) 후 페이지 title·lang 변경 확인 | 전맹 |

#### 매트릭스 시트 (테스트 결과 기록용)

| 시나리오 | NVDA/Chrome | 센스리더/Chrome | VoiceOver/Safari | VoiceOver iOS | TalkBack Android |
|---|---|---|---|---|---|
| S1 홈→페르소나→카드 | | | | | |
| S2 적합도 카드 | | | | | |
| S3 지도→목록 탭 | | | | | |
| S4 도슨트 재생·정지 | | | | | |
| S5 제보 폼 | | | | | |
| S6 다이어리·PDF 링크 | | | | | |
| S7 RTO 표 탐색 | | | | | |
| S8 언어 전환 | | | | | |

**기록 파일:** `tests/accessibility/manual/screen-reader-matrix.md` — 날짜·테스터·결과·이슈 링크 포함.

### 7.3 스크린리더 검증 일정

| 시점 | 대상 | 담당 |
|---|---|---|
| 8/10–8/31 | S1–S8 전체 × NVDA + VoiceOver + TalkBack | 개발팀 내부 |
| 9/1–9/15 | 실제 관광약자 + a11y 전문가 검증 | 외부 (SPEC §11) |
| 9/16 | 매트릭스 전 셀 Pass 확인 후 RC 진입 | QA 리드 |

---

## 8. 자가진단 vs 공식 인증 — 구분과 타임라인

### 8.1 MVP 기간(pre-review) 목표

```
자가진단 (K-WAH) 결과서 작성·보관
  + 수동 스크린리더 매트릭스 전 셀 Pass
  = pre-review 접근성 게이트 통과
```

공식 WA / KWACC 인증은 **pre-review 선결 조건이 아니다** (SPEC §2.13). 심사 기간(7~30일) + 비용(110–150만원+VAT)을 고려해 **발전방향**으로 분류.

### 8.2 K-WAH 자가진단 절차

**K-WAH (한국 웹 접근성 검사 도구):**
- NIA 제공 브라우저 확장 또는 독립 실행 도구
- KWCAG 33 검사항목을 페이지별로 자동+반자동 점검
- 결과: 준수/미준수/해당없음 × 항목별 → **결과서 PDF 출력** (인증 신청 필수 서류)

**수행 시점:** 8/31 수동 검증 완료 후, RC 진입 전(9/15까지) 전체 라우트에 대해 수행.

**결과서 보관 경로:** `tests/accessibility/k-wah/YYYY-MM-DD_kwah_report.pdf`

### 8.3 공식 인증 (발전방향 — 9월 버퍼 있을 시)

| 기관 | URL | 심사 기간 | 예상 비용 (MVP 규모) |
|---|---|---|---|
| 한국정보접근성인증평가원 (WA) | https://www.wa.or.kr/ | 5영업일 + 2차 4일 | 약 110–120만원+VAT (소 구간) |
| 한국디지털접근성진흥원 (KWACC) | http://www.kwacc.or.kr/ | 7–10영업일 + 보완 | 견적 필요 (소~중 구간) |

**합격 기준:**
- 전문가심사: 33개 검사항목 전체 준수율 **95% 이상**
- 사용자심사: 모든 장애 유형 과업 성공률 **100%**
- 2차심사 기회: 전문가심사 85–95% 미만 또는 사용자심사 85% 이상일 때 (KWACC 경우)

**신청 타임라인 (9월 버퍼 시나리오):**

```
9/1–9/15  K-WAH 결과서 완성 + NVDA/센스리더 검증 완료
9/16      인증 신청 접수 (선택)
9/26–10/5 심사 완료 (7~10영업일)
10/10전   2차 보완 여유 (기능심사 마감 전)
```

**신청 필수 서류:**
- 사업자등록증 (또는 단체 등록증)
- 자가진단 결과서 (K-WAH PDF)
- 서비스 URL + 테스트 계정

### 8.4 PT에서의 접근성 활용 전략

공식 인증 마크가 없더라도 다음으로 PT 접근성 항목 점수를 최대화:

1. **K-WAH 결과서** — 33항목 준수율 가시화
2. **CI 게이트 통과 화면** — axe violations=0, Lighthouse 1.0 스크린샷
3. **NVDA + TalkBack 라이브 데모** — S1(전맹 홈→카드)·S4(도슨트 재생) 시연
4. **KWCAG 2.2 준수 선언** — 서비스 내 접근성 선언문 페이지 (`/accessibility-statement`)

---

## 9. 수용 기준 (Acceptance Criteria) 요약

각 feature PR이 merge되려면 아래를 모두 충족해야 한다.

### 9.1 자동 게이트 (모든 PR)

| 게이트 | 기준 | 실패 시 |
|---|---|---|
| `eslint-plugin-jsx-a11y` | 오류 0개 | PR merge 차단 |
| `jest-axe` 컴포넌트 테스트 | violations 0 | PR merge 차단 |
| Storybook `addon-a11y` | error 레벨 위반 0 (color-contrast 포함) | PR merge 차단 |
| `@axe-core/playwright` 핵심 라우트 | violations 0 (`wcag2a/aa/21aa`) | PR merge 차단 |
| Lighthouse a11y | ≥0.95 (3회 median) | PR merge 차단 |

### 9.2 수동 게이트 (feature 완성 후)

| 게이트 | 기준 | 시점 |
|---|---|---|
| 스크린리더 매트릭스 S1–S8 | 전 셀 Pass | 8/31 |
| 지도·오디오·PDF 수동 체크리스트 | 전 항목 체크 | 8/31 |
| K-WAH 자가진단 결과서 | 준수율 ≥95% | 9/15 |
| 외부 관광약자 검증 | 전 시나리오 완수 | 9/1–9/15 |

### 9.3 Feature별 핵심 수용 기준 추가

| Feature | 추가 AC |
|---|---|
| F1 POI 카드 | 적합도 배지 색+텍스트 병행; 이미지 alt 있음 |
| F1 지도 뷰 | 키보드 줌·패닝 버튼 있음; 목록 탭 전환 가능; 드래그 단독 기능 없음 |
| F2 도슨트 | 동의 없이 자동재생 없음; 대본 항상 노출; 정지·볼륨 컨트롤 있음; AI 배지 SR도 읽힘 |
| F3 제보 | label 연결됨; 오류 메시지 위치+정정방법; CAPTCHA 없음 |
| F4 다이어리 | PDF 링크 형식·용량 표기; HTML 대체본 링크 있음 |
| F5 대시보드 | 표 caption+scope; 차트 텍스트 대안 있음 |

---

## 10. 구현 스트림 C3 체크포인트

C3 Design/A11y 스트림은 다른 모든 feature에 선행한다. 아래 체크포인트가 완료되어야 C3 v1 완료로 인정.

```
C3.1 [ ] Design Contract v1 — ContrastTokens 문서화 + validateA11yTokens 빌드 통과
C3.2 [ ] SkipLink + RouteFocusReset + AppLayout 랜드마크 구현 + jest-axe 통과
C3.3 [ ] RouteFocusReset 라우트 전환 NVDA 수동 확인
C3.4 [ ] prefers-reduced-motion CSS 전역 규칙 + useReducedMotion 훅 구현
C3.5 [ ] eslint-plugin-jsx-a11y 설정 활성 + CI 통과
C3.6 [ ] Storybook addon-a11y 설정 + 핵심 컴포넌트 story color-contrast pass
C3.7 [ ] @axe-core/playwright 기본 fixture + 홈 라우트 violations=0
C3.8 [ ] Lighthouse CI 설정 + ≥0.95 확인
C3.9 [ ] 수동 체크리스트 §5 초안 검토 완료
C3.10 [ ] AiBadge 스크린리더 읽힘 NVDA 수동 확인
```
