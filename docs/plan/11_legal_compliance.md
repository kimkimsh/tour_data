# 11 법무·컴플라이언스 (Legal & Compliance)

> **SPEC §10 (법무 절반) + §6 (라이선스) 확장 구현 기획서.**  
> 이 문서는 `/docs/plan/SPEC.md`를 단일 진실 원천으로 삼으며, 그와 충돌하는 내용을 포함하지 않는다.  
> 참조: `_research/D3_legal_a11y.md`, `_research/00_SYNTHESIS.md §6`.

---

## 0. 범위 및 전제

| 항목 | 값 |
|---|---|
| 서비스 형태 | 정보 제공 + 추천 (결제·예약·패키지 판매 없음) |
| 인증 수단 | Supabase Anonymous auth (UGC 식별용); 소셜 프로모션 선택적 |
| 데이터 보관 위치 | Supabase Postgres **Seoul (`ap-northeast-2`) 전용** (PII 한정) |
| CDN / Edge | Vercel 전역 PoP — **공개 관광 자산(비PII)만** 허용 |
| AI 적용 범위 | TTS 음성 안내·LLM 번역·LLM 코스 추천 (고영향 AI 제외) |
| MVP 지도 진입점 | map-tap 기반 (실시간 GPS 연속 수집 없음; 위치정보법 신고 타이밍 §1 참조) |

---

## 1. 위치정보법 (위치정보의 보호 및 이용 등에 관한 법률)

### 1.1 사업자 분류 및 방통위 신고 의무

본 서비스의 사업자 분류는 **MVP 설계에 따라 법무 검토로 확정**한다 (SPEC §14.9): MVP는 **map-tap 단독**으로 GPS 원본을 수집·영속하지 않으므로(§1.5와 정합) 위치기반서비스사업자 해당 여부 자체를 먼저 확정하고, 해당하더라도 **2024 개정 위치정보법의 소상공인·1인 창조기업 간소화/신고유예 경로** 적격성을 우선 판단한다. Geofence(실시간 GPS) 활성화 시점에는 §9의2 신고가 **필수**이며, 그 전(map-tap MVP)에는 신고를 하드 데드라인으로 강제하지 않는다.

| 구분 | 정의 | 적용 여부 |
|---|---|---|
| 위치정보사업자 | 위치 데이터를 수집·제공 (통신사·OS 벤더) | 해당 없음 |
| **위치기반서비스사업자** | 위치 데이터를 이용한 서비스 제공 | **해당 여부 법무 확정** (map-tap MVP는 GPS 비수집 §1.5); geofence 활성화 시 신고 필수; 소상공인 간소화 경로 검토 |

**MVP 위험 완화 전략 (map-tap deferred GPS):**  
F2 도슨트의 GPS 자동 트리거 대신, MVP에서는 **map-tap 폴백**만 운영한다. 사용자가 지도에서 직접 POI를 탭하면 도슨트가 재생되며, 연속 위치 수집이 발생하지 않는다. 실시간 GPS 트리거(Geofence) 기능은 방통위 신고 완료 후 활성화한다.

- **신고 완료 목표**: geofence(실시간 GPS) 활성화 전 (발전방향). **map-tap MVP는 하드 데드라인 아님** (SPEC §14.9); 소상공인 간소화 경로 적격 시 절차 경감
- **신고 포털**: https://www.lbsc.kr/

### 1.2 신고 구비 서류

```
1. 사업계획서
   - 사업자 현황 (서비스명, 법인/개인 구분, 대표자)
   - 서비스 내용: 공주·부여 6 POI 무장애 여행 정보 제공
   - 위치정보 활용 방식: map-tap POI 선택 시 주변 편의시설 표시;
     GPS 트리거 도슨트(신고 후 순차 활성화)

2. 사업용 주요설비 내용 및 설치 장소 확인 서류
   - Supabase Seoul (ap-northeast-2) — 위치 관련 로그 저장
   - Vercel 서버리스 함수 (icn1 고정)

3. 위치정보 보호조치 증명 서류 (위치정보법 §16)
   - 암호화 정책 (at-rest: Supabase AES-256; in-transit: TLS 1.3)
   - 접근 제어 정책 (RLS + admin_roles 기반 최소 권한)
   - 위치정보 보호책임자 지정 증명
```

### 1.3 위치정보 보호책임자 (Privacy Officer for Location Data)

- **지정 의무**: 위치정보법 §16에 따라 공개 서비스 전 지정·공시
- **공시 위치**: `/privacy` 페이지 하단 "위치정보 보호책임자" 섹션
- **역할**: 위치 로그 월간 검토, 파기 스케줄 감독, 동의 UI 변경 승인

```typescript
// packages/domain/types/legal.ts
interface LocationPrivacyOfficer {
  name: string;          // 성명
  department: string;    // 소속 부서
  contactEmail: string;  // 연락처 (공시용)
  designatedAt: string;  // ISO 8601
}
```

### 1.4 위치 관련 의무 조항 이행 체계

| 조항 | 의무 | 구현 위치 | 상태 |
|---|---|---|---|
| §15 | 개인 위치정보 수집 전 목적·보유기간·거부권 고지 | `LocationConsentModal` 컴포넌트 | MVP 구현 필수 |
| §16 | 암호화·접근제어·감사 로그 | Supabase RLS + `audit_events` 테이블 | DB Contract v1 |
| §18 | 위치 동의 별도 수집 (PIPA 동의와 분리) | 별도 체크박스 — §2.3 참조 | MVP 구현 필수 |
| §19 | 제3자 제공 시 사전 동의 + 고지 | 개인정보 처리방침 위탁 목록 | §3 참조 |
| §21 | 위치 이용·제공 기록 6개월 보관 | `location_access_logs` (TTL 180일) | DB Contract v1 |
| §23 | 목적 달성 후 **즉시 복구 불가 방식으로 삭제** | Raw GPS 비저장 정책 — §1.5 | MVP 기본 정책 |

### 1.5 Raw GPS 비저장 정책 (§23 Secure-Wipe)

**핵심 원칙**: 원시(raw) GPS 좌표를 사용자 프로필이나 DB에 영속 저장하지 않는다.

```
위치 데이터 흐름 (MVP map-tap 모드):
  사용자 탭 → 클라이언트에서 좌표 추출 → 서버리스 함수 호출
  → 주변 POI 쿼리 (ST_DWithin) → 결과 반환
  → **서버 측 좌표 변수 즉시 소멸 (함수 스택 종료)**
  → DB에 저장되는 것: 없음 (raw GPS 비기록)

GPS 트리거 도슨트 (신고 후 활성화 — 발전방향):
  Geofence 진입 이벤트 → 도슨트 재생 트리거 → 이벤트 소멸
  → location_access_logs: (poi_id, triggered_at, anon_session_id)
    — 좌표 값 비저장; 세션 ID만 6개월 보관 후 삭제

SOS 위치 전송 (F1.C):
  사용자 명시 동의 → 좌표 1회 전송 → 수신자(동반자) 수신 후 즉시 서버 삭제
  → audit_events에 전송 사실만 기록 (좌표 값 비기록)
```

**DB 스키마 — 위치 접근 로그:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_location_access_logs.sql
CREATE TABLE location_access_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_session_id UUID NOT NULL,
  poi_id      UUID REFERENCES pois(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('map_tap','sos_send','docent_trigger')),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- raw_lat, raw_lng: 의도적으로 컬럼 없음 (§23)
);

-- 6개월 TTL 자동 파기 (pg_cron 또는 GitHub Actions weekly)
-- DELETE FROM location_access_logs WHERE accessed_at < now() - INTERVAL '180 days';

ALTER TABLE location_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON location_access_logs
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_roles));
```

---

## 2. 개인정보 보호법 (PIPA) 컴플라이언스

### 2.1 데이터 최소화 원칙 — Anonymous Auth 우선

```
Anonymous 사용자 (로그인 없음):
  수집 PII = 없음 (anon UUID만 세션 식별용)
  → F1·F2·F4(로컬 다이어리)·F5: 로그인 불필요

소셜 계정 연결 시 (선택):
  수집 항목: 이메일 (식별·알림) + SNS 프로필 이름 (선택)
  보관 위치: Supabase Postgres Seoul 전용
  CDN/Edge 저장 금지

UGC 제보자 (F3):
  수집 항목: anon_session_id + 제보 내용 + 사진 (증거용)
  사진 저장: Supabase Storage private bucket (Seoul)
  공개 전: moderation_events 승인 후 공개 bucket으로 이동
```

### 2.2 개인정보 처리방침 필수 항목 13가지 (§30)

`/privacy` 경로에 한국어로 게시, 서비스 첫 이용 전 접근 가능해야 한다.

| # | 항목 | 내용 요약 |
|---|---|---|
| 1 | 처리 목적 | 무장애 관광 정보 제공, UGC 검수, RTO 갭 리포트 |
| 2 | 처리 항목 | 이메일(선택), anon UUID(필수), UGC 사진(선택) |
| 3 | 보유·이용기간 | 항목별 상이 — §2.5 테이블 참조 |
| 4 | 제3자 제공 | 미제공 (운영사 위탁만 존재) |
| 5 | **처리 위탁** | **Vercel(미국), Kakao(국내)** — §3 상세 |
| 6 | **국외이전** | **Vercel Edge(미국 포함 전 세계)** — §3 상세 |
| 7 | 정보주체 권리·행사 방법 | `/account/data` 페이지 자기 서비스 |
| 8 | 개인정보 안전성 확보조치 | TLS, AES-256, RLS, 최소 권한, 접근 로그 |
| 9 | 자동수집장치 설치·운영 | 세션 쿠키 (Supabase Auth), 분석 SDK |
| 10 | 행태정보 처리·제3자 제공 | PostHog/Clarity: 익명화, 서버 사이드 |
| 11 | 가명정보 처리 | 미처리 |
| 12 | 개인정보 보호책임자(CPO) | 성명·연락처 공시 |
| 13 | 처리방침 변경 | 변경 시 14일 전 공지 |

**작성 지침 참조**: 개인정보보호위원회 처리방침 작성지침 2025-04판 (https://www.privacy.go.kr)

### 2.3 동의 UI — 분리 체크박스 (PIPA §22 위반 방지)

**금지**: 묶음 동의, 필수 항목과 선택 항목 혼합, 마케팅 미동의 시 서비스 거부

```typescript
// apps/web/src/features/consent/types.ts
interface ConsentState {
  // 필수 — 서비스 이용에 필요한 최소 동의
  pipaRequired: boolean;         // 개인정보 수집·이용 (필수)
  // 해당 시 필수 — 위치 기능 활성화 시에만 표시
  locationInfo?: boolean;        // 위치정보 수집·이용 (위치정보법 §18)
  // 선택 — 거부해도 서비스 이용 가능
  thirdPartyProvision?: boolean; // 제3자 제공 (현재 해당 없음 — 미래 확장 대비)
  marketing?: boolean;           // 마케팅·광고 활용 (선택)
}
```

```typescript
// apps/web/src/features/consent/ConsentModal.tsx (컴포넌트 계약)

interface ConsentModalProps {
  onComplete: (state: ConsentState) => void;
  trigger: 'first_visit' | 'location_feature' | 'social_login';
}

// 렌더 계약:
// - trigger='first_visit': pipaRequired 체크박스만 표시
// - trigger='location_feature': locationInfo 체크박스 추가 표시
// - trigger='social_login': pipaRequired + marketing 표시
// - 각 체크박스는 독립적 toggle — 하나를 선택해도 다른 것 자동 선택 금지
// - pipaRequired=false 상태에서 서비스 진입 불가 (서비스 최소 동의)
// - marketing=false여도 서비스 이용 가능 (PIPA §22)
// - aria-required, aria-describedby로 SR 접근성 보장
```

### 2.4 정보주체 권리 행사 — `/account/data` 페이지

```typescript
// apps/web/src/app/[locale]/account/data/page.tsx 제공 기능

type DataRightAction =
  | 'export_my_data'    // §35 열람: JSON 다운로드
  | 'delete_account'    // §36 삭제: anon 세션 + UGC 삭제 요청
  | 'pause_processing'; // §37 처리정지: UGC 비공개 처리

// 처리 흐름:
// export_my_data → barrier_reports(본인) + reviews(본인) → JSON 생성 → 다운로드
// delete_account → soft-delete 요청 → 30일 후 영구 삭제 (GitHub Actions 배치)
// pause_processing → barrier_reports.status = 'paused' (관리자 검수 중단)

// 응답 SLA: 10영업일 이내 (PIPA §35 ~§37)
```

**DB 지원 구조:**

```sql
-- 삭제 요청 추적
CREATE TABLE deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','cancelled'))
);
```

### 2.5 항목별 보유기간

| 개인정보 항목 | 보유기간 | 근거 | 삭제 방식 |
|---|---|---|---|
| anon UUID (세션) | 30일 미활동 시 | Supabase anon cleanup policy | Supabase 자동 |
| 소셜 이메일 | 탈퇴 즉시 | PIPA §21 | hard delete |
| UGC 제보 (승인 전 사진) | 검수 완료 후 30일 | 목적 달성 | Storage 삭제 |
| UGC 제보 (승인 후 공개) | 서비스 운영 기간 | 공익 목적 공개 | 공개 유지 (신고자 식별정보 분리) |
| 위치 접근 로그 | 6개월 | 위치정보법 §21 | pg_cron 자동 삭제 |
| 접근 로그 (관리자) | 1년 | PIPA 안전성 확보조치 기준 | 연 1회 배치 |
| 감사 이벤트 (`audit_events`) | 5년 | 최소권한 부여·변경 기록 | 수동 검토 후 아카이브 |
| 삭제 요청 기록 | 30일 처리 대기 후 영구 삭제 | PIPA §21 | GitHub Actions |

### 2.6 TLS·암호화·접근 로그 (PIPA §29 + 안전성 확보조치 기준)

```
암호화 at-rest: Supabase AES-256 (기본 활성화)
암호화 in-transit: TLS 1.3 (Vercel + Supabase 기본)
비밀번호: Supabase Auth bcrypt (소셜 OAuth 사용 시 비밀번호 없음)
접근 로그 보관: 1년 (audit_events 테이블)
접근 로그 검토: 월 1회 (관리자 대시보드 — admin/compliance)
최소 권한 부여·변경·회수 기록: 5년 (audit_events append-only)
```

**접근 로그 테이블:**

```sql
-- audit_events (append-only: UPDATE/DELETE 금지 — RLS로 강제)
CREATE TABLE audit_events (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID,           -- auth.uid() or system
  action      TEXT NOT NULL,  -- 'grant_admin','revoke_admin','approve_report' 등
  target_type TEXT NOT NULL,  -- 'admin_roles','barrier_reports' 등
  target_id   UUID,
  payload     JSONB,          -- 변경 전후 diff (PII 비포함)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
-- INSERT: anon 포함 모두 가능 (시스템 트리거용)
CREATE POLICY "insert_only" ON audit_events FOR INSERT WITH CHECK (true);
-- SELECT: admin_roles만 조회
CREATE POLICY "admin_read" ON audit_events FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM admin_roles));
-- UPDATE/DELETE: 정책 없음 → 모두 거부 (append-only 보장)
```

---

## 3. 위탁·국외이전 고지 (PIPA §28의8)

**PII 데이터 흐름 원칙 (m-2 반영):**  
PII 영속 저장 위치는 Supabase Seoul Postgres(`ap-northeast-2`)이며, 이 목표를 유지하기 위해 아래 경계들을 코드 레벨에서 강제한다. 다만, Server Actions·Vercel 함수 실행 로그·Storage/CDN 요청 로그는 일시적으로 PII 경로를 포함할 수 있으므로 **로그 리덕션(log-redaction)** 정책을 함께 적용한다:

- **Server Actions / Route Handlers**: 응답 바디나 오류 메시지에 이메일·세션 ID 등 PII를 출력하지 않는다. Next.js `onError`/`console` 출력에서 PII 필드를 마스킹한다.
- **Vercel 함수 실행 로그**: `NEXT_PUBLIC_*` 외 PII-bearing 변수는 로그 스트림에 노출되지 않도록 `--log-filter` 설정 또는 구조화 로거를 사용한다.
- **Storage/CDN 요청 로그**: Vercel CDN 요청 로그는 IP 익명화 정책이 적용된 공개 자산 전용으로 제한한다; PII 포함 private bucket 요청은 Edge를 거치지 않는다.
- **법적 최종 확인**: 위 데이터 흐름 진술 및 처리방침 §6 국외이전 고지 문구는 서비스 공개 전 법무 전문가 검토 후 최종 확정한다.

Vercel Edge 함수가 PII를 처리하지 않도록 아키텍처를 설계한다.

### 3.1 처리위탁 목록

개인정보 처리방침 §5(위탁) 항목에 아래 내용을 명시해야 한다:

| 수탁자 | 위탁 업무 | 위탁 데이터 항목 | 보관 위치 |
|---|---|---|---|
| **Supabase, Inc.** | DB 운영·Auth 관리 | 전체 PII | Seoul (ap-northeast-2) |
| **Vercel, Inc.** | 서버리스 함수 실행·CDN | **공개 관광 자산만** (PII 비포함) | 미국 포함 전 세계 PoP |
| **Kakao Corp.** | 지도 SDK (Kakao Maps) | 지도 요청 IP·좌표 (동의 시) | 국내 |

### 3.2 국외이전 고지 (Vercel — 미국·유럽)

```
이전 국가: 미국 (및 Vercel 전 세계 PoP)
이전 받는 자: Vercel, Inc. (https://vercel.com)
이전 목적: 웹 서버리스 함수 실행, 정적 자산 CDN 서빙
이전 항목: 공개 관광 정보 (PII 미포함) / 서버 요청 로그 (IP 익명화)
보유·이용기간: 요청 처리 후 Vercel 로그 보관 정책에 따름 (최대 30일)
```

**아키텍처 제약 (코드 레벨):**

```typescript
// apps/web/src/middleware.ts — Edge Runtime에서 PII 처리 금지
// middleware는 라우팅·인증 토큰 검증만 수행;
// PII 조회는 반드시 Node.js Runtime 서버 컴포넌트 또는 Route Handler로

export const config = {
  matcher: [
    // PII 없는 공개 경로만 Edge에서 처리
    '/((?!account|api/private|admin).*)',
  ],
};
```

```typescript
// 모든 PII 관련 API: runtime = 'nodejs' 명시
// apps/web/src/app/api/account/route.ts
export const runtime = 'nodejs'; // Edge로 승격 금지
```

---

## 4. AI 기본법 (인공지능 발전과 신뢰 기반 조성 등에 관한 기본법)

**시행일**: 2026년 1월 22일 (현재 발효 중)  
**적용 범위**: 생성형 AI 투명성 의무 §31 — **(1) 사전 고지**(서비스가 생성형 AI로 동작함을 온보딩/이용약관에서 사전 안내) **+ (2) 출력물 라벨**(아래 §4.1). 유예기간은 과태료·사실조사만 유예하며 **라벨링·고지 의무는 즉시 적용**(SPEC §14.9). 외부 배포 산출물(F4 학생 PDF·쉬운글 PDF·BRF)에 AI 번역/생성 콘텐츠 포함 시 **문서 내 AI 출처 고지** 임베드(§31(2); 화면 배지만으로 불충분).

### 4.1 AI 출력 유형별 필수 라벨

| AI 출력 유형 | 기능 | 필수 라벨 텍스트 | 위치 |
|---|---|---|---|
| TTS 음성 안내 | F2 도슨트 오디오 | **"AI 음성 안내"** | 오디오 플레이어 UI + SR `aria-label` |
| LLM 번역 | F2 다국어 자막·설명 | **"AI 번역"** | 번역 텍스트 인접 Badge |
| LLM 코스 추천 | F1.D 시간예산 코스 생성 | **"AI 생성 코스"** | 코스 카드 헤더 Badge |

**중요**: CSS-only tooltip·숨김 처리 금지. 스크린리더 사용자도 라벨을 인식할 수 있어야 한다.

### 4.2 AI 라벨 컴포넌트 계약

```typescript
// packages/ui/src/components/AiBadge.tsx

type AiBadgeVariant = 'voice' | 'translation' | 'course';

interface AiBadgeProp {
  variant: AiBadgeVariant;
  locale?: 'ko' | 'en' | 'ja' | 'zh-CN';
}

// 렌더 계약:
// - variant='voice'       → "AI 음성 안내" / "AI Voice Guide" / ...
// - variant='translation' → "AI 번역"       / "AI Translation" / ...
// - variant='course'      → "AI 생성 코스"  / "AI-Generated Route" / ...
// - **단일 출처**: 이 packages/ui AiBadge가 유일 정의 (doc 06은 이를 import; SPEC §14.10). variant/path/locale 중복 정의 금지.
// - role="img"; **accessible name(aria-label)은 보이는 라벨 텍스트를 포함**해야 함 (KWCAG 2.5.3) — 보이는 'AI 음성 안내'와 다른 문구로 덮어쓰지 말 것.
// - 배경 대비: 4.5:1 이상 (KWCAG 1.3.2)
// - 크기: min 16px, 터치 타겟 24px 이상

// 사용 예시:
// <AiBadge variant="voice" locale="ko" />  — F2 DocentPlayer 내부
// <AiBadge variant="translation" />         — 번역 텍스트 블록 상단
// <AiBadge variant="course" />              — ItinerarySummaryCard 헤더
```

### 4.3 환각(Hallucination) 면책 고지

AI가 생성한 코스·추천·번역에는 다음 면책 고지를 함께 표시한다:

```typescript
// packages/ui/src/components/AiDisclaimer.tsx

interface AiDisclaimerProps {
  context: 'course' | 'translation' | 'hours_fees';
}

// 렌더 계약 (한국어 기준):
// context='course':
//   "AI가 생성한 코스입니다. 실제 운영 시간·입장료는 현장에서 확인하세요."
// context='translation':
//   "AI 번역 결과로, 표현이 부정확할 수 있습니다."
// context='hours_fees':
//   "운영 시간·입장료 등 변경 가능 정보는 방문 전 해당 기관에 확인하세요."

// - 코스 카드·번역 블록 하단에 소형 텍스트로 삽입
// - aria-live 영역 밖 (매 갱신 시 SR 읽기 폭탄 방지)
// - 다국어 처리: next-intl 메시지 키 ai.disclaimer.{context}
```

### 4.4 AI 학습 데이터 출처 기록

KOGL Type 1 공공 데이터가 TTS·번역 모델의 프롬프트 또는 RAG 소스로 사용된 경우, `/credits` 페이지 AI 학습/RAG 데이터 섹션에 명시한다.

### 4.5 고영향 AI 해당 여부 확인

| AI 기본법 고영향 AI 카테고리 | 해당 여부 |
|---|---|
| 의료·금융·공공·교통·에너지·채용 | **해당 없음** |
| 관광 정보 제공·음성 안내·번역 | 고영향 AI 외 — 영향평가 의무 없음 |

---

## 5. KOGL (공공누리) 라이선스 정책

### 5.1 KOGL 유형 일람

| 유형 코드 | 명칭 | 출처표시 | 상업적 이용 | 변경·가공 |
|---|---|---|---|---|
| **Type1 (1유형)** | 출처표시 | **필수** | 허용 | 허용 |
| Type2 (2유형) | 출처표시 + 상업적 이용금지 | **필수** | **금지** | 허용 |
| **Type3 (3유형)** | 출처표시 + 변경금지 | **필수** | 허용 | **금지** |
| Type4 (4유형) | 출처표시 + 상업적이용금지 + 변경금지 | **필수** | **금지** | **금지** |
| AI유형 | AI 학습·이용 허용 | 불필요 | 허용 | 허용 |

**컨테스트 출품 단계의 상업성**: 공모전 출품 자체는 상업적 이용에 해당하지 않으나, 수상 후 서비스 운영 시 Type2·Type4 자산의 상업적 이용 여부를 재검토한다.

### 5.2 데이터 소스별 KOGL 유형 목록

| 데이터 소스 | KOGL 유형 | 가공 가능 여부 | 주요 제약 |
|---|---|---|---|
| KTO TourAPI 텍스트 | **Type1** | 허용 | 출처 표시 필수 |
| KTO TourAPI 이미지 (`cpyrhtDivCd=Type1`) | **Type1** | 허용 (리사이즈·썸네일 OK) | 출처 표시 필수 |
| KTO TourAPI 이미지 (`cpyrhtDivCd=Type3`) | **Type3** | **금지 (crop·filter·합성 불가)** | 변경 없이 원본 표시 |
| 국가유산청 문화재 정보 | Type1 추정 | 허용 (확인 필요) | 실제 데이터 페이지에서 확인 |
| 보건복지부 복지서비스 픽토그램 | **Type2** | 가공 허용 | **상업적 이용 금지** |
| KODDI 알기 쉬운 자료 (쉬운글 일러스트) | **Type4** | **금지** | 원본 그대로만 삽입 |
| 충남 올담 데이터 | **Type4 추정** | **금지** | 개별 데이터셋 확인 필수 |
| 정부24 공공 픽토그램 | Type1 | 허용 | 출처 표시 |
| KTO PhotoGalleryService1 사진 | **Type1** | 허용 | 출처 표시 |
| 국립국어원 한국수어사전 | 항목별 상이 | **항목별 확인 필수** | 공유·딥링크 우선 고려 |
| ARASAAC AAC 심볼 | **CC BY-NC-SA 4.0** | 허용 (비상업) | **상업적 이용 금지·출처 필수** |
| KAAC 한국 AAC | 저작권자 © | **제한적** | 개인·비상업 용도만; 변환·상업 위험 |
| Pretendard 폰트 | **SIL OFL 1.1** | 허용 (임베드 포함) | 폰트 자체 판매 금지 |
| 백제 마스코트 일러스트 6컷 | 자체 제작 | 제한 없음 | — |

### 5.3 최고 제약 원칙 (Most-Restrictive-Wins)

복수의 KOGL 데이터를 결합한 출력물에는 **가장 제약이 강한 유형**이 전체 출력에 적용된다. 이 규칙은 자산 단위로 적용한다 (전체 서비스 단위가 아님).

```
결합 규칙 예시:
  KTO 이미지(Type1) + 기상청 특보(Type1) = 출력: Type1 (양쪽 출처 표시)
  KTO 이미지(Type1) + KODDI 일러스트(Type4) = 출력: Type4 (비상업+변경금지)
  KTO 텍스트(Type1) + 보건복지부 픽토그램(Type2) = 출력: Type2 (비상업)
  KTO Type3 이미지 → 단독 표시 (합성·필터·크롭 금지)

전략: 가공·변환이 필요한 자산은 OFL / CC-BY / ARASAAC에서 소싱
      KODDI / KAAC 자산은 원본 그대로 임베드 또는 딥링크로 연결
```

**DB 컬럼 — 자산별 라이선스 추적:**

```sql
-- poi_media 테이블 (SPEC §5 기반)
ALTER TABLE poi_media ADD COLUMN IF NOT EXISTS
  license_code       TEXT NOT NULL DEFAULT 'Type1',
  -- 'Type1','Type2','Type3','Type4','CC_BY_NC_SA_4','OFL','proprietary'
  transform_policy   TEXT NOT NULL DEFAULT 'allowed',
  -- 'allowed','no_transform','no_commercial','no_commercial_no_transform'
  attribution_text   TEXT,
  attribution_url    TEXT;

-- 렌더 시 분기 로직:
-- transform_policy = 'no_transform' → crop/filter/overlay 컴포넌트 비활성화
-- transform_policy in ('no_commercial','no_commercial_no_transform')
--   → 상업 운영 전환 시 재검토 플래그
```

### 5.5 KOGL Type3 오프라인·번들 정책 (M-19 반영)

**클라이언트 측 캔버스 변환 금지 (client-side canvas transform ban):**  
`cpyrhtDivCd='Type3'`인 자산은 브라우저의 `<canvas>`, OffscreenCanvas, CSS `filter`/`transform`, 또는 `createImageBitmap` 등 **어떠한 픽셀 조작 API도 적용하지 않는다**. PWA 오프라인 캐시에 저장하거나 ServiceWorker에서 응답을 재조합할 때도 원본 바이트를 그대로 반환해야 한다. 이 규칙은 `resolveImagePolicy`의 `allowResize=false·allowCrop=false·allowFilter=false` 조건과 일치하며, 런타임에서 이 조건이 true인 자산에 대해 canvas 경로를 취하는 코드는 빌드 린트 규칙으로 차단한다.

**라이선스 인식 번들 매니페스트 (license-aware bundle manifest):**  
ETL 파이프라인은 오프라인 패키지에 포함될 모든 자산에 대해 아래 구조의 `offline-bundle-manifest.json`을 생성한다:

```json
{
  "version": "<ISO 8601 생성 시각>",
  "maxBundleSizeBytes": 52428800,
  "assets": [
    {
      "assetId": "<poi_media.id>",
      "sha256": "<원본 파일 SHA-256 hex>",
      "storageUrl": "<단일 Supabase Storage URL — 중복 저장 없음>",
      "licenseCode": "Type3",
      "transformPolicy": "no_transform",
      "offlineCacheAllowed": true
    }
  ]
}
```

- `maxBundleSizeBytes`: 50 MiB (IndexedDB 할당 초과 방지)
- `sha256`: 원본 파일 해시; ServiceWorker가 캐시 반환 전 검증하여 변조 감지
- `storageUrl`: **단일 저장 위치** 원칙 — 동일 자산을 Cache Storage와 IndexedDB에 이중 저장하지 않는다; 하나의 캐시 레이어(Cache Storage)를 정규 위치로 사용하고 IndexedDB에는 URL 참조만 저장한다

**오프라인 폴백 — 전체 텍스트 단계 (full text-step fallback):**  
오프라인 상태에서 Type3 지도 타일을 변환하거나 합성한 커스텀 오버레이를 제공하는 방식은 금지한다. 대신, 오프라인 F1.B 루트는 **텍스트 단계 전체 목록(full text-step list)** 으로 폴백한다:

```
오프라인 루트 폴백 순서:
  1. Cache Storage에 사전 캐시된 원본 지도 타일 (변환 없음) → 정적 표시
  2. 타일 미캐시 또는 할당량 초과 → 텍스트 단계 전체 목록으로 전환
     (poi 이름, 이동 방향, 거리, 접근성 경고 텍스트만 표시)
  3. 지도 UI 컴포넌트는 숨김; 스크린리더 사용자는 단계 목록만 수신
```

오프라인 폴백 UI에서 지도 타일이 없을 때 "지도를 표시할 수 없음" 안내 문구와 함께 텍스트 단계가 자동 렌더된다.

### 5.4 `cpyrhtDivCd` 필드 처리 로직

KTO API `detailImage2` 응답에서 반환되는 `cpyrhtDivCd` 값을 기준으로 이미지 렌더 방식을 분기한다.

```typescript
// packages/domain/src/media/imagePolicy.ts

type CpyrhtDivCd = 'Type1' | 'Type3' | string; // 관측 값: Type1, Type3

interface ImageRenderPolicy {
  allowResize: boolean;
  allowCrop: boolean;
  allowFilter: boolean;
  allowWatermark: boolean;
  allowAiAugment: boolean;
  requireAttribution: boolean;
}

function resolveImagePolicy(cpyrhtDivCd: CpyrhtDivCd): ImageRenderPolicy {
  // Type3: 변경금지 — 원본 그대로만 표시
  if (cpyrhtDivCd === 'Type3') {
    return {
      allowResize: false,
      allowCrop: false,
      allowFilter: false,
      allowWatermark: false,
      allowAiAugment: false,
      requireAttribution: true,
    };
  }
  // Type1 및 기타 (기본 허용)
  return {
    allowResize: true,
    allowCrop: true,
    allowFilter: true,
    allowWatermark: false, // 워터마크는 원본 저자 정보 훼손 방지
    allowAiAugment: false, // AI 증강은 별도 검토 필요
    requireAttribution: true,
  };
}
```

```typescript
// apps/web/src/shared/components/KtoImage.tsx

interface KtoImageProps {
  src: string;
  cpyrhtDivCd: string;
  attribution: string;
  alt: string;
  width: number;
  height: number;
}

// 렌더 계약:
// - resolveImagePolicy(cpyrhtDivCd) 호출
// - allowResize=false → next/image sizes 고정, layout='fill' 사용 금지
// - allowCrop=false → objectFit='contain' 강제 (fill 금지)
// - requireAttribution=true → 이미지 하단 또는 캡션에 attribution 문자열 렌더
// - aria-describedby로 attribution 연결 (SR 접근성)
```

---

## 6. 개인정보 처리방침 구조 (Privacy Policy Outline)

`/privacy` 경로. 다국어: `ko` (필수) · `en` · `ja` · `zh-CN`.

```
제1조 (목적)
  본 개인정보 처리방침은 「모두의 백제(Modu Baekje)」 서비스가 이용자의
  개인정보를 어떻게 처리하는지 설명합니다.

제2조 (수집하는 개인정보 항목 및 수집 방법)
  2.1 자동 수집: Supabase Anonymous UUID (세션 식별)
  2.2 선택 제공: 소셜 계정 이메일 (Kakao/Naver/Google/Apple OAuth)
  2.3 이용자 직접 입력: UGC 제보 내용·사진

제3조 (개인정보의 처리 목적)
  - 무장애 관광 정보 제공 및 추천
  - UGC 제보 관리 및 현장 검증
  - 서비스 품질 개선 (익명화 통계)
  - 충남 RTO 갭 리포트 생성 (집계 데이터, 개인 식별 없음)

제4조 (개인정보 보유 및 이용기간) → §2.5 테이블 내용

제5조 (개인정보 처리 위탁)
  수탁업체: Supabase, Inc. (DB 운영) · Vercel, Inc. (서버 실행)
  · Kakao Corp. (지도 SDK)

제6조 (개인정보의 국외이전)
  이전 대상: Vercel, Inc.
  이전 국가: 미국 (및 글로벌 CDN PoP)
  이전 항목: 공개 자산 서빙 요청 로그 (PII 미포함)
  이전 근거: PIPA §28의8 (표준 계약)

제7조 (이용자 권리 및 행사 방법)
  - 열람(§35), 정정·삭제(§36), 처리정지(§37)
  - 행사 경로: /account/data 페이지 자기 서비스
  - 처리 기한: 요청일로부터 10영업일 이내

제8조 (개인정보 안전성 확보 조치)
  - TLS 1.3 전송 암호화
  - AES-256 저장 암호화 (Supabase 기본)
  - 최소 권한 원칙 (RLS + admin_roles)
  - 접근 로그 1년 보관 및 월 1회 검토

제9조 (자동 수집 장치 설치·운영)
  - 세션 쿠키: Supabase Auth (서비스 운영 필수)
  - 분석 SDK: PostHog (익명화), Microsoft Clarity

제10조 (위치정보 처리)
  - 위치 수집 시점: 위치 기능 명시적 활성화 후
  - 수집 항목: POI 접근 기록 (좌표 비저장)
  - 보유기간: 6개월 (위치정보법 §21)
  - 위치정보 보호책임자: [성명·연락처]

제11조 (AI 생성 콘텐츠 안내)
  - 음성 안내·번역·코스 추천에 AI 기술 사용
  - 생성 결과는 부정확할 수 있으며 현장 확인을 권장
  - 이용자 입력이 모델 학습에 사용되지 않음

제12조 (개인정보 보호책임자)
  [성명·직위·연락처·이메일]

제13조 (개인정보 처리방침 변경)
  변경 시 14일 전 서비스 내 공지
  시행일: [서비스 오픈일]
```

---

## 7. 자산 출처 표시 컴포넌트 (`AttributionFooter` + `/credits`)

### 7.1 필수 표시 위치

| 위치 | 표시 항목 |
|---|---|
| 모든 페이지 Footer | KTO TourAPI 기본 출처 (Type1 표준 문구) |
| POI 상세 페이지 | 이미지별 인라인 출처 + `cpyrhtDivCd` 유형 |
| 도슨트 재생 화면 | Odii 출처 + AI 음성 안내 배지 |
| 코스 카드 | AI 생성 코스 배지 + 면책 고지 |
| 번역 텍스트 블록 | AI 번역 배지 |
| `/credits` 전용 페이지 | 모든 데이터 소스·라이선스 상세 목록 |

### 7.2 표준 출처 문구

```typescript
// packages/ui/src/components/attribution/AttributionConfig.ts

const ATTRIBUTION_STRINGS = {
  ktoType1: {
    ko: '출처: 한국관광공사 TourAPI (https://api.visitkorea.or.kr/) 공공누리 제1유형',
    en: 'Source: Korea Tourism Organization TourAPI (CC Korea 1.0)',
  },
  ktoType3: {
    ko: '출처: 한국관광공사 TourAPI · 공공누리 제3유형 (변경금지)',
    en: 'Source: Korea Tourism Organization TourAPI (No Derivatives)',
  },
  nationalHeritage: {
    ko: '출처: 국가유산청 문화재 공개 서비스',
    en: 'Source: Cultural Heritage Administration of Korea',
  },
  odii: {
    ko: '출처: 한국관광공사 Odii 오디오 가이드',
    en: 'Source: KTO Odii Audio Guide',
  },
  arasaac: {
    ko: 'ARASAAC 심볼 (CC BY-NC-SA 4.0) · Aragonese Portal of AAC',
    en: 'ARASAAC symbols (CC BY-NC-SA 4.0) · Aragonese Portal of AAC',
  },
  pretendard: {
    ko: 'Pretendard 폰트 (SIL OFL 1.1)',
    en: 'Pretendard font (SIL OFL 1.1)',
  },
} as const;
```

### 7.3 `/credits` 페이지 컴포넌트 트리

```
/credits
└── CreditsPage
    ├── DataSourceSection (title="데이터 출처")
    │   ├── SourceEntry (kto-tourapi)      — Type1, 상세 URL, 갱신일
    │   ├── SourceEntry (kto-with-tour)    — Type1, detailWithTour2
    │   ├── SourceEntry (odii)             — Type1
    │   ├── SourceEntry (cultural-heritage)— Type1
    │   ├── SourceEntry (welfare-pictogram)— Type2 (비상업)
    │   └── SourceEntry (chungnam-alldam) — Type4 (비상업·변경금지)
    ├── AssetLicenseSection (title="자산 라이선스")
    │   ├── LicenseEntry (pretendard-font) — SIL OFL 1.1
    │   ├── LicenseEntry (arasaac)         — CC BY-NC-SA 4.0
    │   └── LicenseEntry (baekje-mascot)   — 자체 제작
    └── AiDataSection (title="AI 활용 데이터")
        ├── "TTS 합성: KTO Odii 텍스트 (KOGL Type1)"
        └── "번역 프롬프트: KTO 다국어 원문 (KOGL Type1)"
```

```typescript
// packages/ui/src/components/attribution/SourceEntry.tsx

interface SourceEntryProps {
  name: string;
  url: string;
  licenseCode: string;      // 'Type1' | 'Type3' | 'Type4' | 'CC_BY_NC_SA_4' | 'OFL'
  licenseLabel: string;     // 사람이 읽을 수 있는 라이선스명
  lastVerifiedAt: string;   // ISO 8601 (이 문서 갱신 시마다 업데이트)
  transformAllowed: boolean;
  commercialAllowed: boolean;
  notes?: string;
}
```

---

## 8. 관광사업법·전자상거래법 해당 여부

| 법률 | 의무 | MVP 해당 여부 | 근거 |
|---|---|---|---|
| 관광진흥법 §3 (여행업 등록) | 여행 패키지 판매·수수료 수취 시 | **해당 없음** | 정보 제공만, 결제 없음 |
| 전자상거래법 §12 (통신판매업 신고) | 연 50건 이상 거래 또는 과세 매출 시 | **해당 없음** (MVP) | 판매 없음 |
| 전자상거래법 §20 (통신판매중개자) | 외부 OTA 딥링크 추가 시 | 딥링크 추가 시 | "통신판매중개자 아님" 고지 필요 |

**MVP 이후 결제 기능 추가 시**: 통신판매업 신고(지자체) + 7일 청약철회 정책 + 여행업 등록(패키지 시) 필요.

---

## 9. 수용인증(Accept-Gate) 흐름 — 서비스 진입 시

```
첫 방문 (익명 사용자):
  1. Supabase signInAnonymously() → anon UUID 발급
  2. ConsentModal 표시 (pipaRequired 체크박스)
  3. pipaRequired = true → 서비스 진입 허용
  4. pipaRequired = false → 정보 열람 불가, 재동의 요청

위치 기능 활성화 (지도 내 "내 위치" 버튼 탭):
  1. ConsentModal(trigger='location_feature') 표시
  2. locationInfo = true → Geofence/map-tap 위치 기능 활성화
  3. locationInfo = false → 위치 기능 비활성화, 나머지 서비스 정상 이용

소셜 로그인 (UGC 이력 연결 선택):
  1. ConsentModal(trigger='social_login') 표시
  2. pipaRequired + marketing(선택) 각 독립 체크박스
  3. marketing 미동의여도 소셜 연결 허용

동의 철회:
  /account/data → 동의 철회 요청 → 30일 내 계정 삭제 처리
```

---

## 10. 구현 체크리스트 (Pre-Launch Legal Gates)

### Phase WS3-Legal (8월 10일–8월 31일 타깃)

#### 10.1 위치정보법

- [ ] `location_access_logs` 테이블 생성 (§1.5 DDL 적용)
- [ ] 위치정보 보호책임자 지정 및 `/privacy` 페이지 공시
- [ ] 방통위 위치기반서비스 신고 서류 준비 및 제출 (목표: 8월 31일 이전)
- [ ] SOS GPS 전송 후 서버 측 즉시 삭제 로직 확인 (`audit_events` 전송 사실만 기록)
- [ ] 6개월 TTL 자동 파기 Job 설정 (pg_cron 또는 GitHub Actions)
- [ ] 위치 동의 UI (locationInfo 체크박스) 구현 — pipaRequired와 분리 확인

#### 10.2 PIPA

- [ ] `/privacy` 13개 필수 항목 처리방침 게시 (서비스 오픈 전)
- [ ] `ConsentModal` 분리 체크박스 구현 (pipaRequired / locationInfo / marketing)
- [ ] `/account/data` 열람·삭제·처리정지 3개 기능 구현
- [ ] `deletion_requests` 테이블 + 30일 삭제 배치 Job
- [ ] `audit_events` append-only RLS 정책 확인 (UPDATE/DELETE 차단)
- [ ] 접근 로그 월간 검토 절차 수립 (admin 대시보드 `/admin/compliance`)
- [ ] Edge Runtime에서 PII 처리 없음 확인 (middleware 검토)
- [ ] Server Actions / Route Handlers 로그에 PII 마스킹 적용 (이메일·세션 ID 출력 없음) 확인
- [ ] Vercel 함수 실행 로그: PII-bearing 변수 노출 없음 확인 (구조화 로거 또는 `--log-filter`)
- [ ] Storage/CDN private bucket 요청이 Edge를 경유하지 않음 확인
- [ ] 처리방침 §3(데이터 흐름) 및 §6(국외이전) 문구 법무 전문가 검토 후 최종 확정 (서비스 오픈 전)
- [ ] Vercel 국외이전 고지 처리방침 §6 항목 포함 확인

#### 10.3 AI 기본법

- [ ] `<AiBadge variant="voice" />` — F2 DocentPlayer 내 표시 확인
- [ ] `<AiBadge variant="translation" />` — 다국어 텍스트 인접 표시 확인
- [ ] `<AiBadge variant="course" />` — ItinerarySummaryCard 헤더 표시 확인
- [ ] 배지 SR 접근성 확인 (`role="img"` + `aria-label` 스크린리더 읽기 테스트)
- [ ] `<AiDisclaimer context="course" />` — 코스 카드 하단 표시 확인
- [ ] `<AiDisclaimer context="hours_fees" />` — 운영 시간·입장료 섹션 표시 확인
- [ ] AI 학습 데이터 출처 `/credits` 페이지 AI 섹션 기재

#### 10.4 KOGL·라이선스

- [ ] `poi_media.license_code` + `transform_policy` 컬럼 마이그레이션 적용
- [ ] `resolveImagePolicy()` 함수 + `KtoImage` 컴포넌트 구현
- [ ] ETL에서 `cpyrhtDivCd` 필드 수집 및 `transform_policy` 자동 설정
- [ ] Type3 이미지: `next/image` crop 비활성화, objectFit='contain' 강제 확인
- [ ] Type3 자산: 클라이언트 측 canvas/OffscreenCanvas/CSS filter 변환 경로 없음 확인 (빌드 린트 규칙 적용)
- [ ] `offline-bundle-manifest.json` 생성 로직 ETL에 추가: `sha256` + 단일 `storageUrl` + `maxBundleSizeBytes=52428800`
- [ ] ServiceWorker: Type3 자산 반환 전 `sha256` 검증, 캐시 미스 시 텍스트 단계 폴백 경로 확인
- [ ] 오프라인 F1.B 루트: 지도 타일 없을 때 텍스트 단계 전체 목록 자동 렌더 확인 (지도 UI 숨김)
- [ ] KTO TourAPI 기본 출처 문구 모든 페이지 Footer 표시 확인
- [ ] POI 상세 이미지 인라인 출처 표시 확인
- [ ] `/credits` 페이지 모든 데이터 소스 목록 완성
- [ ] ARASAAC 사용 화면: CC BY-NC-SA 4.0 출처 표시 확인
- [ ] KODDI 쉬운글 일러스트: 원본 그대로 삽입 (Type4 — 변형 없음) 확인
- [ ] 국립국어원 한국수어사전: 항목별 라이선스 유형 개별 확인 후 `/credits` 반영
- [ ] 결합 자산 최고 제약 원칙 감사: 각 화면의 데이터 소스 조합 → 출력 라이선스 결정

---

## 11. 참조 법령·규정 URL

| 주제 | URL |
|---|---|
| 위치정보법 | https://www.law.go.kr/법령/위치정보의보호및이용등에관한법률 |
| LBS 신고 (방통위) | https://www.lbsc.kr/ |
| PIPA 전문 | https://www.law.go.kr/lsEfInfoP.do?lsiSeq=195062 |
| 안전성 확보조치 기준 고시 | https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000265956 |
| 개인정보 국외이전 규정 | https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000230332 |
| 처리방침 작성지침 2025-04 | https://www.privacy.go.kr/front/bbs/bbsView.do?bbsNo=BBSMSTR_000000000049&bbscttNo=20806 |
| AI 기본법 전문 | https://www.law.go.kr/lsInfoP.do?lsiSeq=268543 |
| KOGL 유형 안내 | https://www.kogl.or.kr/info/license.do |
| KTO 저작권 정책 | https://knto.or.kr/helpdeskCopyrightguide |
| KWCAG 2.2 전문 | https://a11ykr.github.io/kwcag22/ |
