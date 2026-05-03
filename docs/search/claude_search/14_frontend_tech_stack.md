# 14. 프론트엔드 기술 스택 — 웹/모바일 (UI · 상태관리 · i18n)

> 조사 기준일: 2026-05-03
> 출처: 공식 문서, NPM 통계, 2026년 비교 글
> **본 문서는 사실 비교만 다룸 — 추천/주관 의견 없음**

---

## 1. 웹 프론트엔드 프레임워크

### 1.1 Next.js (15 / 16)

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://nextjs.org/docs/app |
| 최신 버전 | 15.x (안정) / 16.x (16 Cache Components 도입) |
| 라우터 | App Router (RSC, Server Actions) / Pages Router (legacy) |
| 렌더링 모드 | SSR · SSG · ISR · CSR · PPR (Partial Prerendering, 16) |
| React 지원 | React 19 |
| 번들러 | Turbopack (Next 15+ default for dev) |
| 라이선스 | MIT |

#### 렌더링 전략 핵심

| 전략 | 트리거 | 관광 서비스 적용 케이스 |
|---|---|---|
| SSR | `export const dynamic = 'force-dynamic'` 또는 `revalidate = 0` | 로그인 사용자별 추천, 실시간 가격 |
| SSG | 기본값 (모든 fetch가 정적) | 정적 명소 소개 페이지 |
| ISR | `export const revalidate = N` 또는 `fetch(url, { next: { revalidate: N } })` | 명소 목록 (1시간 단위 갱신) |
| Tag-based revalidate | `next: { tags: ['attractions'] } + revalidateTag()` | 관리자 콘솔에서 즉시 반영 |
| Path revalidate | `revalidatePath('/tour/[id]')` | 단일 콘텐츠 즉시 갱신 |

#### 코드 예제 — App Router ISR

```tsx
// app/attractions/page.tsx
export const revalidate = 3600; // 1시간

export default async function Page() {
  const res = await fetch('https://api.visitkorea.or.kr/areaBasedList', {
    next: { revalidate: 3600, tags: ['attractions'] }
  });
  const data = await res.json();
  return <List items={data.items} />;
}
```

#### 가격 (Vercel 호스팅 기준)
- Hobby: 무료 (개인/비상업)
- Pro: $20/월/시트 + 사용량 (대역폭 1TB · Function 1000h 포함)
- Enterprise: 협의

---

### 1.2 React (18 / 19)

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://react.dev/ |
| React 19 출시 | 2024-12 (Stable) |
| 신규 기능 (19) | Actions, useActionState, useOptimistic, use() Hook, Document Metadata, RSC 안정화 |
| Compiler | React Compiler (RC) — 자동 메모이제이션 |

---

### 1.3 Vue 3 / Nuxt

| 항목 | Vue 3 | Nuxt 3/4 |
|---|---|---|
| 공식 문서 | https://vuejs.org/ | https://nuxt.com/ |
| 최신 버전 | 3.5+ (Composition API 기본) | 4.x (Nitro 엔진) |
| 라우팅 | vue-router | 파일 기반 |
| 렌더링 | CSR (기본) | SSR · SSG · ISR · Edge |
| TypeScript | 1급 지원 | 1급 지원 |

---

### 1.4 SvelteKit

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://kit.svelte.dev/ |
| Svelte 버전 | Svelte 5 (Runes 도입) |
| 컴파일러 | 빌드 타임 컴파일 (런타임 가상 DOM 없음) |
| 번들 크기 | 가장 작음 (No-VDOM) |
| 어댑터 | Vercel · Netlify · Cloudflare · Node · Static |

---

### 1.5 프레임워크 비교표

| 프레임워크 | 주간 다운로드 (2026Q1) | 학습 곡선 | SSR 성숙도 | 한국 관광/이커머스 채택 |
|---|---|---|---|---|
| Next.js | ~9M | 중 | ★★★★★ | 야놀자, 여기어때, 마켓컬리, 토스 |
| Nuxt | ~1.5M | 중 | ★★★★ | 일부 스타트업 |
| SvelteKit | ~600K | 낮음 | ★★★ | 소수 |
| Remix/React Router 7 | ~700K | 중 | ★★★★ | 소수 |

---

## 2. UI 라이브러리

### 2.1 Tailwind CSS v4

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://tailwindcss.com/ |
| 현재 버전 | 4.x (2025 출시, 2026 채택 가속) |
| v4 주요 변경 | `@theme` 디렉티브, OKLCH 색상, native CSS 변수, 빌드 10x 빨라짐 |
| zero-config | content 자동 감지 |
| 라이선스 | MIT |

### 2.2 shadcn/ui

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://ui.shadcn.com/ |
| 모델 | 코드 복사 (npm 패키지 X) |
| 기반 | Radix UI 또는 Base UI (선택 가능, 2026) |
| Tailwind 버전 | v4 / React 19 호환 |
| 변경 | toast → sonner, tailwindcss-animate → tw-animate-css |
| 라이선스 | MIT |

### 2.3 Radix UI / Base UI

| 라이브러리 | 특징 | 라이선스 |
|---|---|---|
| Radix UI Primitives | unstyled, headless, WAI-ARIA 완벽 | MIT |
| Base UI | MUI 팀 후속 (Radix 대체 가능) | MIT |
| Headless UI | Tailwind Labs | MIT |

### 2.4 통합 UI 키트

| 라이브러리 | 컴포넌트 수 | 디자인 시스템 | NPM 주간 |
|---|---|---|---|
| Mantine | 100+ | 자체 | ~600K |
| Ant Design | 60+ | Ant Design | ~1.5M |
| Material UI (MUI) | 80+ | Material 3 | ~4M |
| Chakra UI | 50+ | 자체 | ~700K |
| NextUI / HeroUI | 40+ | 자체 | ~200K |

---

## 3. 데이터/상태 관리

### 3.1 서버 상태 (Server State)

| 라이브러리 | 주간 다운로드 | 특징 |
|---|---|---|
| TanStack Query (v5) | ~5M | React/Vue/Solid/Svelte 지원, 캐싱·재요청·낙관적 업데이트 |
| SWR (Vercel) | ~3M | 가벼움, focus refetch 기본 |
| Apollo Client | ~1.5M | GraphQL 전용 |
| urql | ~250K | 경량 GraphQL |

#### TanStack Query 코드 예제

```tsx
import { useQuery } from '@tanstack/react-query';

function Attractions() {
  const { data, isLoading } = useQuery({
    queryKey: ['attractions', { areaCode: '1' }],
    queryFn: () => fetch('/api/areaBasedList?areaCode=1').then(r => r.json()),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  // ...
}
```

### 3.2 클라이언트 상태 (Client State)

| 라이브러리 | 주간 다운로드 | 모델 | 번들 크기 |
|---|---|---|---|
| Zustand | ~4M | store-based | ~1KB |
| Redux Toolkit | ~3.5M | flux | ~12KB |
| Jotai | ~1M | atomic | ~3KB |
| Recoil | ~600K (감소) | atomic | ~20KB |
| Valtio | ~400K | proxy | ~3KB |

#### 2026년 표준 레이어링

| 레이어 | 라이브러리 |
|---|---|
| 1. 서버 상태 | TanStack Query |
| 2. 글로벌 클라이언트 상태 | Zustand |
| 3. Atomic/Derived | Jotai (필요 시) |
| 4. 로컬 컴포넌트 | useState / useReducer |
| 5. 폼 상태 | React Hook Form + zod |

---

## 4. 폼 / 검증

| 라이브러리 | 주간 다운로드 | 특징 |
|---|---|---|
| React Hook Form | ~10M | uncontrolled, 성능 우수 |
| Formik | ~3M | controlled (legacy 다수) |
| Zod | ~30M | TS-first 스키마 검증 |
| Yup | ~6M | 전통적 스키마 |
| Valibot | ~500K | 트리쉐이킹 우수 |

---

## 5. 다국어 (i18n)

### 5.1 라이브러리 비교

| 라이브러리 | 주간 다운로드 | Next.js 호환 | RSC | 메시지 포맷 |
|---|---|---|---|---|
| next-intl | ~1.5M | ★★★★★ (App Router 1급) | O | ICU |
| react-i18next | ~3.5M | ★★★ | △ | i18next 자체 |
| i18next | ~5M | ★★★ | △ | 자체 |
| react-intl (FormatJS) | ~2M | ★★★ | O | ICU 표준 |
| Lingui | ~300K | ★★★ | O | ICU |
| Paraglide | ~200K | ★★★ | O | type-safe |

### 5.2 next-intl 코드 예제

```tsx
// app/[locale]/page.tsx
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('home');
  return <h1>{t('title')}</h1>;
}

// messages/ko.json
{ "home": { "title": "한국 관광" } }

// messages/en.json
{ "home": { "title": "Korea Tourism" } }
```

### 5.3 ICU 메시지 포맷 — 복수형/성별 처리

```
{count, plural,
  =0 {No reviews}
  =1 {1 review}
  other {# reviews}
}
```

### 5.4 한국 관광 서비스 다국어 요건

- 필수: 한·영·중(간/번)·일 (4개 언어 8개 변형)
- 권장 추가: 베트남어, 태국어, 인도네시아어, 스페인어, 프랑스어, 독일어, 러시아어
- 한국관광공사 다국어 OpenAPI: 13개 언어 (영어, 중국어 간체/번체, 일본어, 독일어, 프랑스어, 스페인어, 러시아어 등)

---

## 6. 모바일 앱

### 6.1 React Native (Expo)

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://docs.expo.dev/versions/latest/ |
| Expo SDK | 53 (2025-2026 최신) |
| React Native | 0.79 |
| React | 19 |
| New Architecture | 기본 활성화 (bridgeless) |
| 신규 모듈 | expo-audio (stable), expo-maps (alpha), expo-background-task |
| Expo UI | SwiftUI / Jetpack Compose 통합 (실험) |
| EAS Build | frozen lockfiles 기본 |
| Node 요구 | Node 20+ (Node 18 EOL: 2025-04-30) |

### 6.2 Flutter

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://docs.flutter.dev/ |
| 최신 버전 | 3.41.5 (2026 초) |
| Dart | 최신 |
| 데스크톱 | popup/tooltip windows 실험 API |
| 렌더러 | Impeller (Android 10+ Skia 제거 진행) |
| Web | Wasm 기본화 진행 |
| 동기 이미지 디코딩 | 3.41 추가 |

### 6.3 React Native vs Flutter vs 네이티브 비교

| 항목 | React Native (Expo) | Flutter | iOS Native (Swift) | Android Native (Kotlin) |
|---|---|---|---|---|
| 언어 | TS/JS | Dart | Swift | Kotlin |
| UI 렌더 | 네이티브 컴포넌트 | 자체 (Skia/Impeller) | UIKit/SwiftUI | View/Compose |
| 코드 공유 | iOS/Android/Web | iOS/Android/Web/Desktop | iOS only | Android only |
| 빌드 시간 | 빠름 (EAS) | 중 | 빠름 | 중 |
| 패키지 생태계 | NPM (방대) | pub.dev | CocoaPods/SPM | Maven |
| 한국 관광 앱 사례 | 야놀자, 여기어때 일부 | - | 비짓서울 (네이티브 부분), 마이리얼트립 일부 | 동일 |

### 6.4 PWA (Progressive Web App)

| 항목 | 내용 |
|---|---|
| 매니페스트 | manifest.json (icons, name, display, theme_color) |
| Service Worker | offline 캐싱, push notification |
| iOS 지원 | Safari 16.4+ (Web Push 지원) |
| 앱스토어 등록 | PWABuilder로 TWA(Trusted Web Activity)로 Play Store 등록 가능 |
| Vercel 가이드 | Next.js + next-pwa 또는 Serwist |

---

## 7. 앱스토어 출시 절차 (한국 기준)

### 7.1 Apple App Store

| 단계 | 항목 | 비용/기간 |
|---|---|---|
| 1 | Apple Developer Program 가입 | $99/년 (개인/조직) |
| 2 | App Store Connect 앱 등록 | - |
| 3 | 빌드 업로드 (Xcode / Transporter) | - |
| 4 | TestFlight 베타 (최대 10,000명) | - |
| 5 | 스크린샷 (6.7", 6.5", 5.5", iPad 13") | - |
| 6 | App Privacy 설정 (필수) | - |
| 7 | 심사 제출 | 평균 24-48시간 (2026) |
| 8 | 출시 (자동/수동) | - |

#### 한국 등록 추가 사항
- D-U-N-S 번호 (조직 계정): 무료, 최대 14일
- 사업자등록증 사본 (조직)
- 결제 정보 (Apple 입금 → 한국 은행)

### 7.2 Google Play Store

| 단계 | 항목 | 비용/기간 |
|---|---|---|
| 1 | Google Play Console 가입 | $25 (1회) |
| 2 | 개발자 계정 검증 (2026 강화) | 신분증 + 사진 |
| 3 | AAB(App Bundle) 업로드 | APK 대신 AAB 의무 |
| 4 | 내부/비공개/공개 테스트 | 최소 12명 14일 테스트 (개인 계정) |
| 5 | Data Safety 양식 | 필수 |
| 6 | 콘텐츠 등급 | IARC |
| 7 | 심사 제출 | 평균 1-7일 |

#### 한국 추가 사항
- 게임의 경우 게임물관리위원회 등급 분류 필수
- 위치 데이터 사용 시 별도 신고 양식

---

## 8. 빌드/번들 도구

| 도구 | 종류 | 특징 |
|---|---|---|
| Vite | dev/build | ESM 기반, 가장 빠른 dev 서버 |
| Turbopack | bundler | Next.js 15+ dev 기본 |
| Webpack | bundler | 레거시, 안정 |
| Rspack | bundler | Webpack 호환, Rust |
| esbuild | bundler/transformer | Go, 매우 빠름 |
| SWC | transformer | Rust, Babel 대체 |
| Bun | runtime + bundler | Zig, 통합 도구 |

---

## 9. 출처

### 프레임워크
- Next.js 공식 문서: https://nextjs.org/docs/app
- ISR Guide: https://nextjs.org/docs/pages/guides/incremental-static-regeneration
- React 공식: https://react.dev/
- Nuxt: https://nuxt.com/
- SvelteKit: https://kit.svelte.dev/

### 모바일
- Expo SDK 53 Changelog: https://expo.dev/changelog/sdk-53
- Expo Versions: https://docs.expo.dev/versions/latest/
- Flutter What's New: https://docs.flutter.dev/release/whats-new
- Flutter 2026 Roadmap: https://blog.flutter.dev/flutter-darts-2026-roadmap-89378f17ebbd

### UI
- Tailwind v4 + shadcn: https://ui.shadcn.com/docs/tailwind-v4
- Radix UI: https://www.radix-ui.com/
- Mantine: https://mantine.dev/
- Ant Design: https://ant.design/

### 상태관리
- TanStack Query: https://tanstack.com/query
- Zustand: https://zustand-demo.pmnd.rs/
- React State 2026 비교: https://www.pkgpulse.com/blog/state-of-react-state-management-2026

### i18n
- next-intl: https://next-intl.dev/
- react-i18next: https://react.i18next.com/
- Next.js i18n Routing: https://nextjs.org/docs/pages/guides/internationalization

### 출시
- Apple Developer: https://developer.apple.com/programs/
- Google Play Console: https://play.google.com/console/
