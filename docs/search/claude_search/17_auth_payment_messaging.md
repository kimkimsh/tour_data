# 17. 인증 / 결제 / 알림 인프라 (한국 특화)

> 조사 기준일: 2026-05-03
> **한국 사용자 대상 서비스 필수 인프라**

---

## 1. 소셜 로그인 (OAuth 2.0)

### 1.1 한국 사용자 점유율 (참고)

| 제공자 | 한국 사용자 점유율 (참고) |
|---|---|
| 카카오 | 가장 높음 (전국민 대다수 카카오톡 사용) |
| 네이버 | 매우 높음 (검색·메일 사용자) |
| 구글 | 높음 (Android 기본) |
| 애플 | iOS 사용자 |
| 페이스북 | 감소 추세 |

### 1.2 카카오 로그인 (Kakao Login)

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://developers.kakao.com/docs/latest/ko/kakaologin/common |
| 표준 | OAuth 2.0 + OIDC (선택) |
| 토큰 | Access Token + Refresh Token (+ ID Token 옵션) |
| Client Secret | REST API 키는 기본 활성화 (보안 강화) |
| 플랫폼 | REST · JavaScript · Android · iOS · Flutter |
| 가격 | **무료** |

#### 카카오 로그인 코드 예제 (REST)

```bash
# 1. 인가 코드 받기 (브라우저)
https://kauth.kakao.com/oauth/authorize?client_id=APP_KEY&redirect_uri=URL&response_type=code

# 2. 토큰 발급
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "client_id=${REST_API_KEY}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "code=${AUTH_CODE}"

# 3. 사용자 정보
curl -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  https://kapi.kakao.com/v2/user/me
```

### 1.3 네이버 로그인

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://developers.naver.com/products/login/api/api.md |
| 표준 | OAuth 2.0 |
| 가격 | **무료** |
| 콘솔 | https://developers.naver.com/apps/ |

### 1.4 구글 로그인 / 애플 로그인

| 항목 | 구글 | 애플 |
|---|---|---|
| 공식 | https://developers.google.com/identity | https://developer.apple.com/sign-in-with-apple/ |
| 표준 | OAuth 2.0 + OIDC | OIDC (자체) |
| 가격 | 무료 | $99/년 (Apple Developer 가입비) |
| iOS 앱 정책 | - | 제3자 소셜 로그인 제공 시 Apple 로그인 필수 (App Store 가이드라인 4.8) |

---

## 2. 인증 라이브러리

### 2.1 비교표

| 라이브러리 | 호스팅 | 가격 | 특징 |
|---|---|---|---|
| Auth.js (NextAuth.js) | Self | 무료 (OSS) | Next.js 1급, 다수 제공자 |
| Clerk | SaaS | Free 10K MAU, $25/월부터 | 풀 UI, 조직/팀 |
| Auth0 (Okta) | SaaS | Free 25K MAU, $35/월부터 | 엔터프라이즈, 다양한 SDK |
| Supabase Auth | SaaS/Self | 50K MAU 무료 | Postgres 통합 |
| Firebase Auth | SaaS | 50K MAU 무료, 이상은 SMS 비용 등 | Google 생태계 |
| Stytch | SaaS | Free 10K MAU | 패스워드리스 특화 |
| WorkOS | SaaS | $125/월부터 (B2B) | SAML/SCIM 엔터프라이즈 |
| Lucia | Self | 무료 (OSS, 2025 종료 후 자체 채택) | TypeScript 라이브러리 |
| Better Auth | Self | 무료 (OSS) | TS-first, Lucia 대안으로 부상 |

### 2.2 Auth.js (NextAuth) 코드 예제

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import GoogleProvider from 'next-auth/providers/google';

export const { handlers, auth } = NextAuth({
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});

export const { GET, POST } = handlers;
```

---

## 3. 본인인증 (간편인증)

### 3.1 통합 인증 서비스 사업자

| 사업자 | 서비스명 | 특징 |
|---|---|---|
| KG이니시스 | 통합인증서비스 | sign-service.inicis.com, 1시간 내 연동 가능 |
| NICE평가정보 | NICE PASS | 통신사 PASS 기반, 가장 많이 사용 |
| KCB | KCB 본인인증 | - |
| 드림시큐리티 | 드림시큐리티 PASS | - |
| 다날 | 다날 본인인증 | - |

### 3.2 PortOne(포트원) 본인인증 통합

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://developers.portone.io/opi/ko/extra/identity-verification/readme-v2 |
| 지원 인증사 | KG이니시스, NICE, KCB, 다날 등 |
| 통합 SDK | 포트원 V2 SDK 한 번 연동으로 멀티 PG/인증사 |
| 가격 | 인증사별 건당 100~300원 (협의) |

### 3.3 지원 간편인증 수단

- 카카오 인증서
- 네이버 인증서
- PASS (통신3사 통합)
- TOSS 인증
- 금융인증서
- KB모바일인증
- 신한 인증
- 삼성 패스

### 3.4 본인인증 시 받을 수 있는 정보 (개인정보)

- 이름
- 성별
- 생년월일
- 내국인/외국인 구분
- CI (연계정보, 88byte)
- DI (중복가입확인정보, 64byte)
- 휴대폰 번호 (선택)

> CI/DI는 모든 본인인증 사업자가 동일 사용자에 대해 동일 값을 발급 (개인 식별자)

---

## 4. 결제 (PG / 간편결제)

### 4.1 통합 결제 SDK

| 서비스 | 운영사 | 가격 | 특징 |
|---|---|---|---|
| 포트원 (PortOne, 구 아임포트) | 코리아크레딧뷰로 | 무료 (PG 수수료만) | 모든 PG 통합, V1/V2 SDK |
| 토스페이먼츠 (TossPayments) | 토스페이먼츠 | PG 수수료 (구간별) | 토스의 PG, 직결 |
| Bootpay | 부트페이 | 협의 | 통합 결제 |

### 4.2 토스페이먼츠 수수료 정책

| 결제 수단 | 수수료 (참고치) |
|---|---|
| 신용카드 | 1.7~3.4% (반기 1회 여신금융협회 기준) |
| 계좌이체 | 1.5% |
| 가상계좌 | 200원 (정액) |
| 휴대폰 결제 | 5.0% |
| 토스페이 | 2.4% |
| 카카오페이 | 2.6% |
| 네이버페이 | 3.4% |

> 부가세 = 수수료의 10% 별도

### 4.3 PG사 수수료 비교 (참고)

| PG사 | 신용카드 (참고) | 가입비 | 특징 |
|---|---|---|---|
| 토스페이먼츠 | 1.7-3.4% | 무료 | UX 우수, 모바일 1급 |
| KG이니시스 | 2.0-3.4% | 22만원 | 가장 오래된 PG, 안정 |
| NHN KCP | 2.0-3.5% | 22만원 | 안정 |
| 나이스페이먼츠 | 2.0-3.4% | 22만원 | 안정 |
| 다날 | 협의 | - | 휴대폰 결제 1위 |
| KSnet | 협의 | - | 가상계좌 강세 |

> 정확한 수수료는 가맹점 매출 규모/계약에 따라 상이

### 4.4 간편결제 직접 연동

| 결제사 | 가맹점 직접 연동 | PortOne 통합 |
|---|---|---|
| 카카오페이 | O | O |
| 네이버페이 | O | O |
| 토스페이 | O | O |
| 페이코 (PAYCO) | O | O |
| Apple Pay | O (PG 통해서만) | O |
| Samsung Pay | O | O |

### 4.5 PortOne V2 코드 예제

```html
<script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
<script>
  PortOne.requestPayment({
    storeId: 'store-XXXXX',
    channelKey: 'channel-key-XXXXX', // PG/결제수단 채널
    paymentId: `payment-${crypto.randomUUID()}`,
    orderName: '제주 한라산 투어 예약',
    totalAmount: 50000,
    currency: 'KRW',
    payMethod: 'CARD',
    customer: {
      fullName: '홍길동',
      phoneNumber: '010-1234-5678',
      email: 'hong@example.com',
    },
    redirectUrl: 'https://example.com/payment/complete',
  }).then(response => {
    if (response.code !== undefined) {
      console.error(response.message);
    }
  });
</script>
```

---

## 5. 숙박 / 액티비티 예약 — B2B API

### 5.1 한국 OTA / 메타서치

| 서비스 | API 제공 | 어필리에이트 | 비고 |
|---|---|---|---|
| 야놀자 | B2B API (협의) | 일부 | 국내 1위 OTA |
| 여기어때 | B2B API (협의) | 일부 | 국내 2위 |
| Agoda (Booking Holdings) | Affiliate Partners API | O | 글로벌, 한국 호텔 풍부 |
| Booking.com | Affiliate Partner | O | - |
| Expedia | EAN (Expedia API Network) | O | XML/JSON |
| Hotels.com | Expedia 그룹 | O | - |

### 5.2 액티비티 / 투어

| 서비스 | API |
|---|---|
| KKday | Affiliate API (협의) |
| Klook | Affiliate API (협의) |
| Viator (TripAdvisor) | Affiliate API |
| GetYourGuide | Affiliate API |
| 마이리얼트립 | 협의 |
| 트리플 (Triple) | - |

### 5.3 항공권 — GDS

| GDS | 글로벌 점유율 | 비고 |
|---|---|---|
| Amadeus | 1위 | 자체 개발자 포털 (Self-Service) |
| Sabre | 2위 | - |
| Travelport (Galileo/Worldspan/Apollo) | 3위 | - |
| Skyscanner Travel API | - | B2B 메타서치 |
| Kiwi.com Tequila | - | NDC 결합 |

#### Amadeus Self-Service API
- 가격: Test 무료 (자체 환경) → Production 협의
- 주요 API: Flight Offers Search, Hotel Search, Points of Interest, City Search

---

## 6. 알림 / 메시징

### 6.1 카카오 알림톡 / 친구톡

| 항목 | 내용 |
|---|---|
| 공식 | https://kakaobusiness.gitbook.io/main/ad/infotalk |
| 채널 | 카카오 비즈니스 채널 (옛 플러스친구) |

### 6.2 가격 (2026)

| 메시지 종류 | 단가 (부가세 별도) | 비고 |
|---|---|---|
| **알림톡** | **8원/건** | 정보성, 사전 템플릿 승인 필요 |
| 친구톡 텍스트형 | 15원/건 | 채널 친구 대상, 광고성 가능 |
| 친구톡 이미지형 | 18원/건 | - |
| 친구톡 와이드형 | 20원/건 | - |

> **2026.1 변경사항**: 친구톡이 "브랜드 메시지"로 통합. 알림톡 발송 기준 강화 (정보성 중심).

### 6.3 카카오 알림톡 발송 대행사 (CPaaS)

| 사업자 | 비고 |
|---|---|
| 알리고 (Aligo) | 가장 많이 사용, REST API 단순 |
| 비즈고 (Bizgo) | KT |
| 다이렉트센드 | - |
| 솔라피 (SOLAPI) | 개발자 친화 SDK |
| LG U+ 메시징 | LG U+ |
| 핵클 (Hackle) | A/B 테스트 결합 |

### 6.4 푸시 알림

| 서비스 | 무료 | 가격 |
|---|---|---|
| FCM (Firebase Cloud Messaging) | **완전 무료** (무제한) | - |
| APNs (Apple Push) | **완전 무료** (무제한) | - |
| OneSignal Free | 무제한 푸시 | - |
| OneSignal Growth | $0.012/MAU (모바일 푸시) | 50K MAU = $600/월 |
| AWS SNS | 1M 모바일 푸시 무료 | $0.50/1M 이후 |
| Pusher Beams | 1K MAU 무료 | $29/월부터 |
| Airship | 협의 | 엔터프라이즈 |
| Braze | 협의 | 엔터프라이즈 |

### 6.5 SMS / 알림 통합

| 서비스 | 가격 |
|---|---|
| Twilio SMS Korea | $0.04~0.05/건 |
| AWS SNS SMS | $0.025-0.07/건 (한국) |
| 알리고 SMS | 9.9원/건 |
| NHN Cloud SMS | 8원/건 |
| 솔라피 SMS | 9.9원/건 (단문) |
| LMS (장문 SMS, 한국) | 30원/건 평균 |

### 6.6 이메일

| 서비스 | 무료 | 시작 가격 |
|---|---|---|
| AWS SES | EC2에서 62K/월 | $0.10/1K |
| SendGrid | 100/일 | $19.95/월 50K |
| Mailgun | 5K/월 (3개월) | $35/월 |
| Resend | 3K/월, 100/일 | $20/월 50K |
| Postmark | 100/월 | $15/월 10K |
| Mailchimp Transactional | - | $20/월 25K |

### 6.7 Resend 코드 예제

```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: 'user@example.com',
  subject: '경복궁 투어 예약 확정',
  html: `<h1>예약이 확정되었습니다</h1><p>방문일: 2026-06-15</p>`,
});
```

---

## 7. 분석 / 모니터링

### 7.1 제품 분석

| 서비스 | 무료 티어 | 시작 가격 | 비고 |
|---|---|---|---|
| GA4 (Google Analytics 4) | 무료 (10M event/월) | GA360 협의 | 표준 |
| Amplitude | 50K MAU | $49/월부터 | 행동 분석 |
| Mixpanel | 1M event/월 | $20/월부터 | 행동 분석 |
| PostHog | 1M event + 5K replay + 100K errors/월 | $0 자체호스팅 | 통합 (분석+세션리플레이+플래그) |
| Hotjar | 35 session/일 | $39/월 | 히트맵, 세션 |
| Microsoft Clarity | **완전 무료 (무제한)** | - | 히트맵, 세션 |
| Plausible | - | $9/월 10K | GDPR 친화 |
| Umami | $0 자체호스팅 | $9/월 | 오픈소스 |

### 7.2 에러/APM

| 서비스 | 무료 | 시작 가격 |
|---|---|---|
| Sentry | 5K errors + 50 replay | $26/월 (Team) |
| Datadog | 14일 무료 평가 | $31/host/월 (APM) |
| New Relic | 100GB/월 무료 | $49/사용자/월 |
| LogRocket | 1K session/월 | $99/월 |
| Bugsnag | - | $59/월 |
| Better Stack (Logtail) | 3GB/월 무료 | $24/월 |
| Highlight.io | 무료 | $50/월 |

### 7.3 한국 분석 도구 (참고)

| 서비스 | 비고 |
|---|---|
| 와이즈로그 (Wiselog) | 한국 분석 솔루션 |
| 에이스카운터 (Acecounter) | 한국 분석 (오래된 표준) |
| 핵클 (Hackle) | 국내 A/B 테스트 + 분석 |
| 비즈스프링 (BizSpring) | 한국 SaaS |

---

## 8. 출처

### 인증
- 카카오 로그인: https://developers.kakao.com/docs/latest/ko/kakaologin
- 네이버 로그인: https://developers.naver.com/products/login/api/
- Auth.js: https://authjs.dev/
- Clerk Pricing: https://clerk.com/pricing
- Supabase Auth: https://supabase.com/auth
- Firebase Auth: https://firebase.google.com/docs/auth

### 본인인증
- KG이니시스 통합인증: https://sign-service.inicis.com/
- NICE 본인확인: https://www.niceinfo.co.kr/business/NICEiD_2.nice
- PortOne 본인인증 V2: https://developers.portone.io/opi/ko/extra/identity-verification/readme-v2

### 결제
- PortOne V2 SDK: https://developers.portone.io/
- 토스페이먼츠 수수료: https://docs-pay.toss.im/policy/fee
- 토스페이먼츠 (PortOne 연동): https://developers.portone.io/opi/ko/integration/pg/v1/newtoss/readme

### 메시징
- 카카오 알림톡 가이드: https://kakaobusiness.gitbook.io/main/ad/infotalk
- 카카오 비즈니스 발송비용: https://cs.kakao.com/helps_html/1073208485
- FCM: https://firebase.google.com/docs/cloud-messaging
- OneSignal Pricing: https://onesignal.com/pricing
- Resend: https://resend.com/pricing
- 솔라피: https://solapi.com/

### 분석
- Sentry: https://sentry.io/pricing/
- Datadog: https://www.datadoghq.com/pricing/
- PostHog: https://posthog.com/pricing
- Microsoft Clarity: https://clarity.microsoft.com/
