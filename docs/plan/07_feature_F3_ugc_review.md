# 07 F3 현장 제보·관리자 검수 큐 (barrier_reports + moderation console)

> **상위 문서:** `docs/plan/SPEC.md` §8(F3) — 본 문서는 그 확장본이며, SPEC과 모순되지 않는다.
> **모듈 경로:** `apps/web/src/features/f3-report/` · `apps/web/src/admin/moderation/` · `packages/domain/reporting/`
> **의존 스트림:** C1 Data Platform(DB Contract v1) → F3; F3 approve → F1.B alerts, F5

---

## 1. 기능 목적 및 채점 연결

| 채점 축 | F3의 기여 |
|---|---|
| 기획력 30 | Waze 패턴 + 수동 검수 큐: "자동 재계산 금지, 사람이 먼저" 정책이 안전 책임 서사를 완성 |
| 완성도 30 | pending→approved Realtime 알림이 F1.B 경보 카드로 연결되는 단일 수직 슬라이스 |
| 데이터활용 20 | UGC → 검수 → 후속 사용자 알림 → GPX 환류(F1.E) → RTO 갭 신호(F5) 루프 |
| 발전성 20 | 신고자 신뢰도 점수 누적 후 자동 재계산 고도화(발전방향) 서사를 PT에서 제시 |

**PT D.1 시나리오 연결:** "어제 UGC 제보 '공산성 동문 공사 중'이 CACF 검수 통과 → 할아버지 화면에 서문 대체 경보 표시" — F3의 전 파이프라인이 단 2문장으로 설명된다.

---

## 2. 제보 상태 머신 (ReportStatus state machine)

```
        submit()
[DRAFT] ──────────► [PENDING]
                        │
             admin      │       admin
           approve()    │      reject()
              ▼         │         ▼
          [APPROVED]    │    [REJECTED]
              │         │
     admin    │         │  reporter
   retract()  │         │  delete()
              ▼         ▼         ▼
           [RETRACTED] (terminal) (deleted)
```

| 상태 | 공개 SELECT | reporter SELECT | admin SELECT | 설명 |
|---|:---:|:---:|:---:|---|
| `pending` | ✗ | ✓ | ✓ | 검수 대기; 공개 불가 |
| `approved` | ✓ | ✓ | ✓ | 공개 알림 발송됨 |
| `rejected` | ✗ | ✓ | ✓ | 반려 사유 reporter에게 표시 |
| `retracted` | ✗ | ✓ | ✓ | 승인 후 운영자가 철회 (폭설 해소 등) |

**전이 규칙:**
- `pending → approved`: 관리자만, `moderation_events` INSERT 필수
- `pending → rejected`: 관리자만, `rejection_reason` 필수
- `approved → retracted`: 관리자만, `retraction_note` 필수
- `approved → pending` 재진입: 허용하지 않음 — 신규 제보로 재접수
- `rejected → pending` 재진입: 허용하지 않음 — reporter가 내용 보완 후 새 row 생성

```typescript
// packages/domain/reporting/ReportStatus.ts
export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'retracted';

export const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['retracted'],
  rejected: [],
  retracted: [],
};

/** Returns null when the transition is invalid. */
export function transitionStatus(
  current: ReportStatus,
  next: ReportStatus
): ReportStatus | null {
  return VALID_TRANSITIONS[current].includes(next) ? next : null;
}
```

---

## 3. DB 스키마 (DDL 스케치)

### 3.1 `barrier_reports`

```sql
create type report_category as enum (
  'elevator_broken',       -- 엘리베이터 고장
  'ramp_blocked',          -- 경사로 통행 불가
  'restroom_closed',       -- 장애인 화장실 폐쇄
  'construction',          -- 공사·통제 구간
  'surface_damaged',       -- 노면 파손·단차 발생
  'temporary_closure',     -- 임시 폐쇄·입장 제한
  'signage_missing',       -- 점자블록·유도 표시 훼손
  'other'
);

create type report_status as enum (
  'pending',
  'approved',
  'rejected',
  'retracted'
);

create table public.barrier_reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references auth.users(id) on delete cascade,
  poi_id            uuid not null references public.pois(id),
  category          report_category not null,
  status            report_status not null default 'pending',

  -- 발생 정보 (reporter 입력)
  occurred_at       timestamptz not null default now(),
  description       text,                          -- 선택 자유 텍스트, 최대 500자
  is_still_active   boolean not null default true,

  -- 위치 정보 (위치정보법 §23 최소 보관, 검수 후 null-out 처리)
  report_lat        numeric(10, 7),               -- 제보 시점 GPS (검수 후 null)
  report_lng        numeric(10, 7),
  gps_consent_given boolean not null default false,

  -- 신뢰도 참조
  reporter_trust_score  numeric(4,2) not null default 1.00,  -- 제보 시점 snapshot

  -- 검수 결과
  reviewed_by       uuid references auth.users(id),
  reviewed_at       timestamptz,
  rejection_reason  text,
  retraction_note   text,

  -- Layer D freshness 갱신용 (approved 시에만)
  related_capability_code text,                  -- accessibility_facts.capability_code

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 검수 큐 정렬 인덱스 (pending 우선, 신뢰도 높은 순)
create index idx_barrier_reports_queue
  on public.barrier_reports (status, reporter_trust_score desc, created_at asc)
  where status = 'pending';

-- 공개 알림 조회 인덱스
create index idx_barrier_reports_approved_poi
  on public.barrier_reports (poi_id, status, occurred_at desc)
  where status = 'approved';

-- reporter 본인 조회
create index idx_barrier_reports_reporter
  on public.barrier_reports (reporter_id, created_at desc);

-- 중복 감지용 (같은 POI, 같은 카테고리, 24시간 내)
create unique index idx_barrier_reports_dedup
  on public.barrier_reports (poi_id, category, reporter_id)
  where status in ('pending', 'approved')
  and occurred_at > now() - interval '24 hours';
```

### 3.2 `report_evidence`

```sql
create table public.report_evidence (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.barrier_reports(id) on delete cascade,
  storage_path  text not null,   -- private bucket: 'ugc-pending/{reporter_id}/{uuid}.webp'
  mime_type     text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  file_size     integer not null,
  uploaded_at   timestamptz not null default now()
);

create index idx_report_evidence_report on public.report_evidence (report_id);
```

### 3.3 `moderation_events` (append-only 감사 로그)

```sql
create table public.moderation_events (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.barrier_reports(id),
  admin_id      uuid not null references auth.users(id),
  action        text not null check (action in ('approve','reject','retract','flag','note')),
  prev_status   report_status,
  next_status   report_status,
  note          text,
  created_at    timestamptz not null default now()
);

-- INSERT-only; UPDATE/DELETE는 RLS with check (false) 로 원천 차단
create index idx_moderation_events_report on public.moderation_events (report_id, created_at);
```

### 3.4 `reporter_trust_scores`

```sql
create table public.reporter_trust_scores (
  reporter_id       uuid primary key references auth.users(id) on delete cascade,
  score             numeric(4,2) not null default 1.00 check (score between 0.10 and 5.00),
  total_submitted   integer not null default 0,
  total_approved    integer not null default 0,
  total_rejected    integer not null default 0,
  last_recalc_at    timestamptz not null default now()
);
```

### 3.5 Storage 버킷 DDL

```sql
-- private 버킷: 검수 전 사진 (공개 불가)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ugc-pending', 'ugc-pending', false,
  10485760,   -- 10MB
  array['image/jpeg','image/png','image/webp']
);

-- 공개 버킷: 승인 후 이동된 사진 (CDN 캐시 가능 — PII 없음)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ugc-approved', 'ugc-approved', true,
  10485760,
  array['image/jpeg','image/png','image/webp']
);
```

---

## 4. Row Level Security (RLS) 정책

### 4.1 `barrier_reports`

```sql
alter table public.barrier_reports enable row level security;

-- 익명 인증(Anonymous Auth) 사용자도 제보 가능 (SPEC §2.11 + §14.4, 사용자 결정 2026-06-15).
-- 남용은 RESTRICTIVE 차단이 아니라 서버 레이트리밋·파일크기/MIME·중복해시·reporter-trust·관리자 검수/MFA·감사 보존으로 차단한다.
-- (이전의 "permanent users only" RESTRICTIVE insert 정책은 제거됨.)

-- reporter 본인 INSERT (익명·영구 인증 공통; authenticated 역할 = 익명 세션 포함)
create policy "owner inserts own report"
on public.barrier_reports for insert to authenticated
with check ((select auth.uid()) = reporter_id);

-- 공개 SELECT: approved만
create policy "public reads approved reports"
on public.barrier_reports for select to anon, authenticated
using (status = 'approved');

-- reporter 본인 SELECT: 전 상태
create policy "owner reads own reports"
on public.barrier_reports for select to authenticated
using ((select auth.uid()) = reporter_id);

-- admin: 전체 SELECT + status UPDATE
create policy "admin reads all reports"
on public.barrier_reports for select to authenticated
using ((select is_platform_admin()));

create policy "admin updates report status"
on public.barrier_reports for update to authenticated
using ((select is_platform_admin()))
with check ((select is_platform_admin()));
```

### 4.2 `report_evidence`

```sql
alter table public.report_evidence enable row level security;

-- reporter 본인: 자신의 report에 한해 INSERT + SELECT
create policy "owner manages own evidence"
on public.report_evidence for all to authenticated
using (
  exists (
    select 1 from public.barrier_reports br
    where br.id = report_id
    and br.reporter_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.barrier_reports br
    where br.id = report_id
    and br.reporter_id = (select auth.uid())
  )
);

-- admin: 전체 열람
create policy "admin reads all evidence"
on public.report_evidence for select to authenticated
using ((select is_platform_admin()));
```

### 4.3 `moderation_events`

```sql
alter table public.moderation_events enable row level security;

-- admin만 INSERT (append-only)
create policy "admin inserts moderation event"
on public.moderation_events for insert to authenticated
with check ((select is_platform_admin()));

-- admin SELECT
create policy "admin reads moderation events"
on public.moderation_events for select to authenticated
using ((select is_platform_admin()));

-- UPDATE/DELETE 원천 차단 (append-only 보장)
create policy "no update on moderation events"
on public.moderation_events for update to authenticated
with check (false);

create policy "no delete on moderation events"
on public.moderation_events for delete to authenticated
using (false);
```

### 4.4 Storage RLS

```sql
-- ugc-pending: reporter 본인 폴더에만 업로드
create policy "reporter uploads to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ugc-pending'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  -- 익명 인증 포함 (SPEC §14.4); 남용은 앱-레이어 가드(레이트리밋·MIME·크기)로 차단
);

-- ugc-pending: reporter 본인 + admin SELECT
create policy "reporter reads own pending evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'ugc-pending'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select is_platform_admin())
  )
);

-- ugc-approved: 공개 (public 버킷이므로 RLS 추가 불필요 — CDN 제공)
```

---

## 5. TypeScript 도메인 인터페이스

### 5.1 도메인 타입

```typescript
// packages/domain/reporting/types.ts

export type ReportCategory =
  | 'elevator_broken'
  | 'ramp_blocked'
  | 'restroom_closed'
  | 'construction'
  | 'surface_damaged'
  | 'temporary_closure'
  | 'signage_missing'
  | 'other';

export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'retracted';

export interface BarrierReport {
  id: string;
  reporterId: string;
  poiId: string;
  category: ReportCategory;
  status: ReportStatus;
  occurredAt: Date;
  description: string | null;       // 최대 500자; null 허용
  isStillActive: boolean;
  gpsConsentGiven: boolean;
  reporterTrustScore: number;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  retractionNote: string | null;
  relatedCapabilityCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportEvidence {
  id: string;
  reportId: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface ModerationEvent {
  id: string;
  reportId: string;
  adminId: string;
  action: 'approve' | 'reject' | 'retract' | 'flag' | 'note';
  prevStatus: ReportStatus | null;
  nextStatus: ReportStatus | null;
  note: string | null;
  createdAt: Date;
}

export interface ReporterTrustScore {
  reporterId: string;
  score: number;            // 0.10 – 5.00
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  lastRecalcAt: Date;
}
```

### 5.2 도메인 함수 시그니처

```typescript
// packages/domain/reporting/moderateReport.ts

/**
 * Validates a state transition and returns the ModerationEvent to record.
 * Does NOT write to DB; caller (application layer) owns the transaction.
 */
export function buildModerationEvent(
  report: BarrierReport,
  adminId: string,
  action: ModerationEvent['action'],
  note: string | null
): { event: Omit<ModerationEvent, 'id' | 'createdAt'>; nextStatus: ReportStatus } | null;

/**
 * Recalculates trust score from lifetime approval/rejection counters.
 * Score range: 0.10 – 5.00. Called after each moderation decision.
 */
export function recalcTrustScore(
  totalApproved: number,
  totalRejected: number
): number;

/**
 * Returns true when the candidate report is a duplicate of an existing
 * pending/approved report for the same POI+category within 24 hours.
 * Dedup check runs at submit time in the application layer.
 */
export function isDuplicateReport(
  candidate: Pick<BarrierReport, 'poiId' | 'category' | 'occurredAt'>,
  existing: Array<Pick<BarrierReport, 'poiId' | 'category' | 'occurredAt' | 'status'>>
): boolean;

/**
 * Scrubs GPS coordinates from a report row.
 * Called by application layer immediately after admin approves (§위치정보법 §23).
 */
export function scrubGpsCoordinates(
  reportId: string
): { reportId: string; scrubbedAt: Date };
```

### 5.3 Application 레이어 함수 시그니처

```typescript
// packages/application/reporting.ts

/**
 * Persists a new BarrierReport + evidence paths in a single transaction.
 * Checks: (1) authenticated session (anonymous-auth allowed per SPEC §14.4), (2) GPS consent if coords provided,
 * (3) 24h dedup, (4) trust score snapshot from reporter_trust_scores.
 * Returns the created report id.
 */
export async function submitBarrierReport(
  reporterId: string,
  poiId: string,
  category: ReportCategory,
  description: string | null,
  occurredAt: Date,
  gpsConsentGiven: boolean,
  lat: number | null,
  lng: number | null,
  evidencePaths: string[]
): Promise<string>;

/**
 * Admin approves a pending report.
 * Writes moderation_events row, updates barrier_reports.status,
 * moves evidence to ugc-approved bucket, scrubs GPS (위치정보법 §23),
 * increments reporter's total_approved, recalcs trust score.
 * Does NOT trigger suitability recalculation (SPEC §8 F3: no auto-recalc).
 */
export async function approveReport(
  reportId: string,
  adminId: string,
  note: string | null
): Promise<void>;

/**
 * Admin rejects a pending report.
 * Writes moderation_events row, updates status, increments total_rejected,
 * recalcs trust score, deletes evidence from ugc-pending bucket.
 */
export async function rejectReport(
  reportId: string,
  adminId: string,
  rejectionReason: string
): Promise<void>;

/**
 * Admin retracts a previously approved report (e.g. situation resolved).
 * Does not delete evidence; sets status = 'retracted'.
 */
export async function retractReport(
  reportId: string,
  adminId: string,
  retractionNote: string
): Promise<void>;

/**
 * Returns paginated pending reports sorted by trust_score desc, created_at asc.
 * Admin-only.
 */
export async function listPendingReports(
  page: number,
  pageSize: number
): Promise<{ reports: BarrierReport[]; total: number }>;
```

---

## 6. 제보 양식 (ReportForm) — 구조화 입력

**설계 원칙:** 자유 텍스트 최소화. 카테고리 enum 선택 → 사진 업로드 → 선택적 보충 설명(500자) 순서.

### 6.1 컴포넌트 트리

```
features/f3-report/
├── ReportEntryButton.tsx          # 각 POI 카드에 삽입되는 "제보하기" CTA
├── ReportDrawer.tsx               # bottom sheet (모바일 우선)
│   ├── GpsConsentStep.tsx         # 위치정보 동의 + 취득 (STEP 0 — 조건부)
│   ├── CategorySelectStep.tsx     # 카테고리 enum 선택 (STEP 1)
│   ├── PhotoUploadStep.tsx        # 사진 1~3장 (STEP 2)
│   ├── DescriptionStep.tsx        # 자유 텍스트 500자 (STEP 3 — 선택)
│   ├── OccurredAtStep.tsx         # 발생 시각 (기본값 now) (STEP 3b)
│   └── SubmitConfirmStep.tsx      # 제출 전 요약 + 위치정보법 고지 (STEP 4)
├── ReportSuccessToast.tsx
├── ActiveReportBanner.tsx         # 해당 POI approved 제보 표시 배너
└── hooks/
    ├── useSubmitReport.ts
    └── useActiveReports.ts        # Realtime 구독 포함
```

### 6.2 카테고리 레이블 맵

```typescript
// packages/domain/reporting/categoryLabels.ts

export const CATEGORY_LABELS: Record<ReportCategory, { ko: string; icon: string }> = {
  elevator_broken:    { ko: '엘리베이터 고장',        icon: '🛗' },  // 아이콘은 UI 전용
  ramp_blocked:       { ko: '경사로 통행 불가',        icon: '⚠️' },
  restroom_closed:    { ko: '장애인 화장실 폐쇄',      icon: '🚻' },
  construction:       { ko: '공사·통제 구간',           icon: '🚧' },
  surface_damaged:    { ko: '노면 파손·단차 발생',      icon: '🪨' },
  temporary_closure:  { ko: '임시 폐쇄·입장 제한',     icon: '🔒' },
  signage_missing:    { ko: '점자블록·표시 훼손',       icon: '🦯' },
  other:              { ko: '기타',                    icon: '📝' },
};
```

### 6.3 GpsConsentStep — 위치정보법 처리

```typescript
// features/f3-report/GpsConsentStep.tsx

interface GpsConsentStepProps {
  onConsent: (lat: number, lng: number) => void;
  onDecline: () => void;
}
```

**고지 문구 (화면에 표시 필수):**

> 현장 위치(GPS 좌표)를 제보에 포함하면 관리자 검수 정확도가 높아집니다.
> 위치정보는 검수 완료 즉시 삭제되며, 제보 등록 목적 외 사용하지 않습니다.
> (「위치정보의 보호 및 이용 등에 관한 법률」 제9조의2, 제23조)
>
> [위치 포함하여 제보] [위치 없이 제보]

**제약:**
- `gps_consent_given = false`이면 `report_lat`, `report_lng`는 null 저장
- `gps_consent_given = true`이면 검수 완료(`approved`/`rejected`) 직후 Application 레이어가 `scrubGpsCoordinates()` 호출 → DB `report_lat = null, report_lng = null`로 UPDATE
- raw GPS 좌표는 `barrier_reports` 테이블에만 저장; CDN/Edge/Vercel 로그에 노출 금지

### 6.4 PhotoUploadStep — Signed Upload URL 패턴

```typescript
// apps/web/src/app/api/reports/upload-url/route.ts (Route Handler, 서버 전용)

export async function POST(req: Request): Promise<Response> {
  // 1. 인증 세션 확인 (익명 인증 포함; SPEC §14.4) — 남용은 레이트리밋·MIME·파일크기로 차단
  // 2. supabaseAdmin.storage.from('ugc-pending').createSignedUploadUrl(path, { expiresIn: 300 })
  // 3. 반환: { signedUrl, path }  — service_role 키 클라이언트 미노출
}
```

**업로드 제약:**
- 파일당 최대 10MB, MIME: `image/jpeg | image/png | image/webp`
- 최대 3장 / 제보
- 경로 규칙: `{reporter_id}/{report_id}/{uuid}.webp`
- 업로드 성공 후 `path`를 `report_evidence.storage_path`에 INSERT

### 6.5 스텝별 ARIA 요구사항

| 스텝 | 핵심 ARIA |
|---|---|
| CategorySelectStep | `role="radiogroup"` + 각 항목 `role="radio"` + `aria-checked` |
| PhotoUploadStep | `<input type="file" accept="image/*">` + `aria-label="사진 추가"` |
| DescriptionStep | `<textarea aria-label="제보 내용" maxlength="500" aria-describedby="desc-hint">` |
| SubmitConfirmStep | `role="status"` 요약 영역; 제출 버튼 `aria-busy` 처리 |
| 전체 Drawer | `role="dialog"` + `aria-labelledby` + `aria-modal="true"` + focus trap |

---

## 7. 관리자 검수 콘솔 (Admin Moderation Console)

### 7.1 라우팅 구조

```
apps/web/src/admin/
└── moderation/
    ├── page.tsx                   # 검수 큐 목록 (server component)
    ├── [reportId]/
    │   ├── page.tsx               # 개별 제보 상세 + 액션 패널
    │   └── ModerationActionPanel.tsx
    ├── components/
    │   ├── ReportQueueTable.tsx   # 대기열 테이블 (정렬: trust_score desc)
    │   ├── ReportCard.tsx         # 사진 + 카테고리 + POI + 신뢰도 표시
    │   ├── EvidenceViewer.tsx     # signed URL로 사진 열람 (1h TTL)
    │   ├── ModerationHistory.tsx  # moderation_events 타임라인
    │   └── TrustScoreBadge.tsx
    └── actions/
        ├── approveReport.ts       # Server Action
        ├── rejectReport.ts        # Server Action
        └── retractReport.ts       # Server Action
```

### 7.2 검수 큐 테이블 컬럼

| 컬럼 | 데이터 소스 | 정렬 |
|---|---|---|
| POI명 | `pois.poi_translations.title` (ko) | — |
| 카테고리 | `barrier_reports.category` + `CATEGORY_LABELS` | — |
| 제보 시각 | `barrier_reports.occurred_at` | 기본 asc |
| 신뢰도 점수 | `reporter_trust_scores.score` | 기본 desc |
| 사진 수 | `count(report_evidence)` | — |
| 상태 | `barrier_reports.status` | 필터 |
| 검수 액션 | approve / reject 버튼 | — |

**기본 정렬:** `status = 'pending'` → `reporter_trust_score desc` → `created_at asc`
(신뢰도 높은 제보를 먼저 검수 = 고품질 제보의 알림 지연 최소화)

### 7.3 개별 제보 상세 페이지 레이아웃

```
┌─────────────────────────────────────────┐
│ [POI명]  [카테고리 배지]  [발생 시각]     │
│ 신뢰도 ████████░░ 3.8 / 5.0  (제출 12회/승인 9/반려 3) │
├──────────────────┬──────────────────────┤
│  사진 갤러리     │  POI 위치 맵 (정적)  │
│  (1~3장 슬라이드)│  [공산성 서문 마커]  │
│  [signed URL]    │  report GPS 점 표시  │
├──────────────────┴──────────────────────┤
│  제보자 설명 (description)               │
│  "동문 쪽 경사로 공사 시작. 서문 이용 요망" │
├─────────────────────────────────────────┤
│  검수 이력 타임라인                       │
│  (이전 moderation_events 없으면 "최초 제보") │
├─────────────────────────────────────────┤
│  [승인]  [반려 (사유 필수)]  [메모 추가]  │
└─────────────────────────────────────────┘
```

### 7.4 승인 Server Action

```typescript
// apps/web/src/admin/moderation/actions/approveReport.ts
'use server';

export async function approveReport(
  reportId: string,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  // 1. admin 인가 확인 (is_platform_admin())
  // 2. application.approveReport(reportId, adminId, note)
  //    내부 순서:
  //    a. barrier_reports 상태 전이 검증 (pending → approved)
  //    b. moderation_events INSERT
  //    c. barrier_reports UPDATE (status, reviewed_by, reviewed_at)
  //    d. report_evidence 파일 ugc-pending → ugc-approved 이동
  //       (storage.copy + storage.remove)
  //    e. scrubGpsCoordinates(reportId) — GPS null-out (위치정보법 §23)
  //    f. reporter_trust_scores.total_approved++ → recalcTrustScore → UPDATE
  //    g. barrier_reports.reporter_trust_score snapshot UPDATE
  // 3. Realtime broadcast는 Postgres 트리거가 자동 처리 (§8)
  // 4. revalidatePath('/admin/moderation') — 큐 목록 갱신
}
```

### 7.5 반려 Server Action

```typescript
// apps/web/src/admin/moderation/actions/rejectReport.ts
'use server';

export async function rejectReport(
  reportId: string,
  rejectionReason: string  // 비어 있으면 서버에서 거부
): Promise<{ ok: boolean; error?: string }> {
  // 1. admin 인가 확인
  // 2. application.rejectReport(reportId, adminId, rejectionReason)
  //    a. moderation_events INSERT
  //    b. barrier_reports UPDATE (status='rejected', rejection_reason)
  //    c. ugc-pending 버킷의 해당 파일 삭제 (개인정보 최소 보유)
  //    d. GPS scrub (어차피 미승인이지만 동일하게 적용)
  //    e. reporter_trust_scores.total_rejected++ → recalcTrustScore → UPDATE
  // 3. revalidatePath('/admin/moderation')
}
```

---

## 8. Supabase Realtime — 승인 알림 브로드캐스트

**SPEC §2.9 확인:** "No FCM/APNs/알림톡 in MVP. In-app banner + Supabase Realtime for approved alerts"
**브로드캐스트 대상:** `approved` 전이 시에만 — raw 제보 내용은 절대 전송하지 않음

### 8.1 Postgres 트리거 (R4 §8.2 패턴 적용)

```sql
create or replace function public.report_approved_broadcast()
returns trigger security definer language plpgsql as $$
begin
  if (TG_OP = 'UPDATE'
      and NEW.status = 'approved'
      and OLD.status <> 'approved') then
    perform realtime.broadcast_changes(
      'poi-alerts:' || NEW.poi_id::text,
      'report_approved',
      'report_approved',
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      json_build_object(
        'report_id',  NEW.id,
        'poi_id',     NEW.poi_id,
        'category',   NEW.category,
        'occurred_at', NEW.occurred_at,
        'is_still_active', NEW.is_still_active
      ),
      null  -- old_record 미전송 (pending 상태 정보 노출 방지)
    );
  end if;
  return null;
end;
$$;

create trigger on_report_approved
after update on public.barrier_reports
for each row execute function public.report_approved_broadcast();
```

**채널 네이밍:** `poi-alerts:{poi_id}` — POI 단위로 쪼개 불필요한 알림 수신 방지

### 8.2 Realtime Authorization

```sql
create policy "authenticated users receive poi alerts"
on "realtime"."messages" for select to authenticated using (true);
```

### 8.3 클라이언트 구독 훅

```typescript
// features/f3-report/hooks/useActiveReports.ts

interface ApprovedReportPayload {
  report_id: string;
  poi_id: string;
  category: ReportCategory;
  occurred_at: string;
  is_still_active: boolean;
}

/** Subscribes to approved barrier-report alerts for a specific POI. */
export function useActiveReports(poiId: string): {
  alerts: ApprovedReportPayload[];
  isConnected: boolean;
} {
  // 1. supabase.realtime.setAuth() — private channel 인가
  // 2. supabase.channel(`poi-alerts:${poiId}`, { config: { private: true } })
  //    .on('broadcast', { event: 'report_approved' }, handler)
  //    .subscribe()
  // 3. 컴포넌트 언마운트 시 channel.unsubscribe()
  // 4. 반환: 현재 세션 중 수신된 alerts 배열 (approved DB 조회는 초기 fetch로 별도 처리)
}
```

### 8.4 ActiveReportBanner 컴포넌트

```typescript
// features/f3-report/ActiveReportBanner.tsx

interface ActiveReportBannerProps {
  poiId: string;
}

// 표시 조건: approved 제보 존재 (DB 초기 fetch OR Realtime 수신)
// ARIA: role="alert" aria-live="assertive" (즉각 고지 필요)
// F1.F-3 연동: "예측 가능 백제" 모드 활성 시 60초 카운트다운 트리거
```

**배너 표시 내용 예시:**

> ⚠️ 공산성 — 엘리베이터 고장 (오늘 09:30 확인됨)
> 서문 평탄 경로 안내로 이동하기 →

---

## 9. 신고자 신뢰도 점수 (Trust Score)

### 9.1 산정 공식

```typescript
// packages/domain/reporting/moderateReport.ts

const MIN_SCORE = 0.10;
const MAX_SCORE = 5.00;
const BASE_SCORE = 1.00;

export function recalcTrustScore(
  totalApproved: number,
  totalRejected: number
): number {
  // 제출이 없으면 기본값 유지
  if (totalApproved + totalRejected === 0) { return BASE_SCORE; }

  const approvalRate = totalApproved / (totalApproved + totalRejected);
  // 승인률 0~1을 0.10~5.00 범위로 선형 매핑
  const raw = MIN_SCORE + approvalRate * (MAX_SCORE - MIN_SCORE);
  // 소수점 둘째자리 반올림
  return Math.round(raw * 100) / 100;
}
```

### 9.2 신뢰도 점수 활용 지점

| 지점 | 활용 방법 |
|---|---|
| 검수 큐 정렬 | `reporter_trust_score desc` → 고신뢰 제보 먼저 노출 |
| 중복 제보 우선순위 | 동일 POI+category 중복 시 높은 신뢰도 제보를 큐 상단에 |
| barrier_reports snapshot | 제보 시점의 score를 `reporter_trust_score` 컬럼에 기록 (이후 score 변동 영향 없음) |
| F5 RTO 갭 리포트 | `trust_score ≥ 2.0`인 approved 제보만 갭 집계에 반영 |
| **자동 재계산:** | **MVP에서 사용하지 않음** — 발전방향 (사용자 풀 + 신뢰도 충분 누적 후) |

### 9.3 중복(dedup) 처리

```typescript
// packages/domain/reporting/moderateReport.ts

export function isDuplicateReport(
  candidate: Pick<BarrierReport, 'poiId' | 'category' | 'occurredAt'>,
  existing: Array<Pick<BarrierReport, 'poiId' | 'category' | 'occurredAt' | 'status'>>
): boolean {
  const windowMs = 24 * 60 * 60 * 1000; // 24시간 윈도우
  return existing.some(
    (r) =>
      r.poiId === candidate.poiId &&
      r.category === candidate.category &&
      r.status !== 'rejected' &&
      r.status !== 'retracted' &&
      Math.abs(r.occurredAt.getTime() - candidate.occurredAt.getTime()) < windowMs
  );
}
```

**중복 감지 시 UX:** "같은 종류의 제보가 24시간 내에 이미 접수되었습니다. 관리자가 검토 중입니다." 표시 → 제출 차단. (DB `unique index` 도 최종 방어선으로 동작)

---

## 10. 위치정보법 및 PIPA 처리 상세

### 10.1 위치정보법 제9조의2 (위치기반서비스 신고)

| 항목 | 처리 |
|---|---|
| 신고 의무 | 앱 출시 전 방통위 신고 완료 필수 (MVP 범위) |
| GPS 수집 조건 | 명시적 동의(`gps_consent_given = true`) 시에만 수집 |
| 수집 범위 | 제보 시점 1회 좌표(lat/lng) — 실시간 추적 없음 |
| 보관 기간 | 검수 완료(`approved` 또는 `rejected`) 즉시 삭제 |
| 삭제 방법 | `scrubGpsCoordinates()` → DB UPDATE(`report_lat = null, report_lng = null`) |
| 로그 보관 | `moderation_events`에 GPS scrub 완료 시각 기록 (`action = 'note'`, `note = 'gps_scrubbed'`) |

### 10.2 PIPA (개인정보보호법) 처리

| 항목 | 처리 |
|---|---|
| 수집 항목 | `reporter_id` (Supabase UUID, PII 아님) + 선택적 GPS(동의 후 임시 보관) |
| 저장 위치 | Supabase Postgres `ap-northeast-2` (서울) 전용 — CDN·Edge 미노출 |
| 사진 접근 | private 버킷 + 서버사이드 signed URL (1h TTL) — CDN 공개 경로 없음 |
| 승인 후 사진 | `ugc-approved` public 버킷으로 이동 — 개인 식별 정보 없는 장소 사진만 |
| 국외이전 | 개인정보처리방침에 Vercel(미국 처리 가능), Supabase(서울/AWS) 처리위탁 명시 |
| 동의 화면 | 앱 레벨 별도 동의 UI (위치정보법 동의 + PIPA 동의 분리된 체크박스) |
| 익명 사용자 | `is_anonymous = true` 사용자도 제보 가능 (SPEC §14.4); 남용은 레이트리밋·MIME·중복해시·reporter-trust·관리자 검수로 차단 |

### 10.3 동의 체크박스 설계

```
□ [필수] 위치정보 수집·이용에 동의합니다.
        (수집 목적: 현장 제보 위치 확인 / 보관 기간: 검수 완료 즉시 삭제)
        「위치정보의 보호 및 이용 등에 관한 법률」 제9조의2

□ [선택] 사진 파일을 서버에 업로드하는 데 동의합니다.
        (수집 목적: 관리자 현장 확인 근거 / 승인 전 비공개 보관)
```

`[필수]` 체크 없이 위치 포함 제보 불가. `[선택]` 미체크 시 텍스트만 제보 허용.

---

## 11. 자동 재계산 금지 + UGC 권한 (No Auto-Recalc + Promotion Rules)

**SPEC §8(F3) 명시:** "no auto-recalc". **F3는 유일한 UGC 진입점**이다 — F1.E 후기·GPX 제출은 발전방향으로 이관되었으므로, 사용자 현장 데이터는 반드시 F3 제보 파이프라인(카테고리 선택 → 사진 업로드 → 검수 큐)을 통해서만 유입된다.

### 11.1 자동 재계산 금지

| 금지 항목 | 대체 처리 |
|---|---|
| 제보 승인 시 `calculateSuitability()` 자동 호출 | 없음 — 관리자가 판단 후 F5 갭 리포트에만 신호 반영 |
| `accessibility_facts` 자동 UPDATE | 없음 — `related_capability_code`에 참조만 기록 |
| Layer D `verifiedUgc` 자동 갱신 | 없음 — ETL 배치 사이클에서 별도 집계 후 갱신 |
| `ugcSummary` 실시간 재주입 | 없음 — `calculateSuitability()` 입력은 ETL 배치 결과만 사용 |

**승인 후 관리자 화면에 표시:**
> "제보가 승인되었습니다. 접근성 점수는 다음 데이터 갱신 배치(매일 KST 04:00) 이후 반영됩니다."

### 11.2 UGC 권한 경계 (promotion rules — `16_suitability_policy.md` §8 준거)

승인된 UGC 제보 한 건이 단독으로 할 수 있는 것과 없는 것:

| 허용 | 근거 |
|---|---|
| 관련 capability의 Layer D freshness 날짜 갱신 | `approved` 전이 시 `related_capability_code` 기준으로 해당 fact의 날짜만 갱신 |
| 권위 데이터셋의 재검증 플래그 설정 (`flag` moderation action) | `moderation_events.action = 'flag'`로 기록; ETL 배치가 다음 주기에 처리 |

| 금지 | 대체 처리 |
|---|---|
| 권위 `supported ↔ unsupported` 단독 전환 | 금지 — 단일 승인 제보로 `accessibility_facts.status` 변경 불가 |
| 점수 auto-recalc 트리거 | 금지 (§11.1) |

**권위 데이터 변경 요건:** `accessibility_facts.status`의 권위 값을 변경하려면 아래 중 하나가 필요하다:
- 현장 조사 evidence pack (사진·실측값·측정방법·검증자·2차 승인; `13_content_c4.md` DoD 기준), 또는
- **별개 reporter의 승인된 제보 ≥ 2건** (동일 reporter의 제보 2건은 불인정)

이 요건을 충족하지 않은 제보는 `flag` action으로만 처리한다.

> 상세 다중 소스 충돌 해결 규칙은 → [`16_suitability_policy.md` §8](./16_suitability_policy.md#8-multi-source-conflict-resolution-was-undefined)

**발전방향 트리거 조건 (PT 서사에 포함):**
- 신고자 풀 누적 ≥ 50명
- 특정 POI+category의 trust_score 가중 제보 수 ≥ 5건
- UGC 신뢰도 매트릭스 안정화 확인
위 조건 충족 시 자동 재계산 활성화 (별도 기능 플래그 `ENABLE_UGC_AUTO_RECALC`)

---

## 12. F3 → F5 갭 리포트 연결

```sql
-- F5에서 사용하는 뷰: 시군별 제보 빈도 집계
create materialized view public.report_trends_mv as
select
  p.lDongSignguCd,
  br.category,
  count(*) filter (where br.status = 'approved')  as approved_count,
  count(*) filter (where br.status = 'pending')   as pending_count,
  max(br.occurred_at) filter (where br.status = 'approved') as last_approved_at
from public.barrier_reports br
join public.pois p on p.id = br.poi_id
where br.reporter_trust_score >= 2.0
group by p.lDongSignguCd, br.category;

-- ETL 배치 또는 admin 승인 후 refresh
refresh materialized view public.report_trends_mv;
```

---

## 13. 테스트 전략

### 13.1 단위 테스트 (`packages/domain/reporting`)

| 테스트 케이스 | 검증 대상 |
|---|---|
| `transitionStatus('pending', 'approved')` → `'approved'` | 유효 전이 |
| `transitionStatus('rejected', 'pending')` → `null` | 무효 전이 |
| `transitionStatus('approved', 'retracted')` → `'retracted'` | 유효 전이 |
| `recalcTrustScore(9, 3)` → `3.10` | 신뢰도 공식 |
| `recalcTrustScore(0, 0)` → `1.00` | 초기값 |
| `isDuplicateReport(...)` 24h 내 동일 POI+category | 중복 감지 |
| `isDuplicateReport(...)` 25h 경과 후 | 중복 아님 |
| `isDuplicateReport(...)` `rejected` 제보는 중복 아님 | 반려 제외 |

### 13.2 RLS 정책 테스트 (`supabase/tests/`)

```sql
-- 익명 인증 사용자 제보 허용 확인 (SPEC §14.4); 세션 없는 비인증만 거부
begin;
  set local role authenticated;
  set local request.jwt.claims to '{"sub":"anon-uuid","is_anonymous":true}';
  select count(*) from public.barrier_reports;  -- approved만 보여야 함
  -- 본인(reporter_id=auth.uid()) INSERT 성공 확인; 타인 reporter_id INSERT 거부 확인
rollback;
```

### 13.3 E2E 시나리오 (`tests/e2e/f3-report.spec.ts`)

| 시나리오 | 검증 |
|---|---|
| 세션 없는 사용자: 제보 버튼 클릭 → 익명 인증 세션 자동 생성 후 제보 진행(소셜 로그인 불필요, SPEC §14.4) | UX 처리 |
| 로그인 사용자: 카테고리 선택 → 사진 업로드 → 제출 → pending 상태 확인 | 정상 제보 흐름 |
| 24h 내 중복 제보 → 차단 메시지 | dedup |
| 관리자: 검수 큐 접속 → 제보 상세 → 승인 → 알림 수신 | 전체 파이프라인 |
| 관리자: 반려 (사유 없음) → 에러 | 유효성 검사 |
| Realtime: 승인 즉시 같은 POI 열람 중인 사용자 화면에 배너 표시 | Realtime |

---

## 14. 수락 기준 (Acceptance Criteria)

### AC-F3-01 제보 양식
- [ ] 인증 세션(익명 인증 `is_anonymous=true` 포함, SPEC §14.4) 사용자가 본인 제보 가능; 세션이 없으면 익명 세션 자동 생성
- [ ] 카테고리 선택 없이 제출 불가 (프런트 + 서버 동시 검증)
- [ ] 자유 텍스트 500자 초과 시 저장 불가
- [ ] GPS 동의 화면에 위치정보법 제9조의2 고지 문구 표시
- [ ] 사진 없는 텍스트 전용 제보 허용 (사진은 선택)
- [ ] 24h 내 동일 POI+category 중복 제보 차단 메시지 표시

### AC-F3-02 상태 머신
- [ ] `pending → approved | rejected` 전이만 관리자가 수행 가능
- [ ] `approved → retracted` 전이: `retraction_note` 필수
- [ ] `rejected → pending` 재진입 불가 (새 row 생성만)
- [ ] 모든 전이에 `moderation_events` row 생성됨

### AC-F3-03 위치정보 처리
- [ ] `approved` 전이 완료 즉시 `report_lat = null, report_lng = null`
- [ ] `rejected` 전이 완료 즉시 동일 GPS scrub
- [ ] GPS scrub 완료 기록이 `moderation_events`에 `action='note'`로 남음
- [ ] 검수 전 사진은 `ugc-pending` private 버킷에만 보관
- [ ] 승인 후 사진은 `ugc-approved` public 버킷으로 이동 후 `ugc-pending`에서 삭제

### AC-F3-04 RLS
- [ ] 익명 인증 사용자(`is_anonymous=true`)도 본인 제보 INSERT 가능 (SPEC §14.4); 남용은 레이트리밋·중복해시·reporter-trust·검수로 차단
- [ ] anon 역할은 `approved` 상태 제보만 SELECT 가능
- [ ] 비관리자 사용자는 타인의 `pending | rejected` 제보 SELECT 불가
- [ ] `moderation_events`에 UPDATE / DELETE 불가

### AC-F3-05 Realtime
- [ ] `pending → approved` 전이 시에만 `poi-alerts:{poi_id}` 채널에 broadcast
- [ ] broadcast payload에 GPS 좌표 미포함
- [ ] 같은 POI 페이지를 열람 중인 클라이언트에 3초 이내 `ActiveReportBanner` 표시
- [ ] `retracted` 전이 시 배너 제거 (별도 broadcast 또는 30초 polling)

### AC-F3-06 신뢰도 점수
- [ ] 승인 후 `reporter_trust_scores.total_approved` 증가 + score 재계산
- [ ] 반려 후 `reporter_trust_scores.total_rejected` 증가 + score 재계산
- [ ] 검수 큐 정렬이 `reporter_trust_score desc` 기준임을 E2E로 확인
- [ ] `isDuplicateReport`가 `rejected` 제보를 중복 대상에서 제외

### AC-F3-07 자동 재계산 금지
- [ ] `approveReport()` 호출 후 `calculateSuitability()` 호출 없음 (unit test)
- [ ] `accessibility_facts` 테이블이 F3 경로에서 UPDATE되지 않음

### AC-F3-08 관리자 콘솔
- [ ] `platform_admins`에 없는 사용자는 `/admin/moderation` 접근 시 403
- [ ] 검수 큐 테이블에서 사진 signed URL 클릭 시 1h TTL 내 열람 가능
- [ ] 반려 시 `rejectionReason` 빈 문자열이면 서버에서 400 반환
- [ ] 승인 후 큐에서 해당 제보가 즉시 사라짐 (pending 필터 기본)

### AC-F3-09 남용 방지 (Abuse Controls — M-20)
- [ ] **서버사이드 rate limit:** 동일 `reporter_id`는 1시간 내 제보 제출을 최대 N건으로 제한 (Route Handler에서 Supabase RLS 또는 Redis 카운터로 적용; N 값은 구현 시 결정하되 상수로 추출)
- [ ] **파일 크기 제한:** 업로드 요청에서 `Content-Length` 또는 멀티파트 크기가 파일당 10 MB 초과 시 서버에서 413 반환 (클라이언트 검증 단독 신뢰 금지)
- [ ] **MIME 허용 목록 서버 검증:** 업로드 signed URL 발급 전 `mime_type`이 `image/jpeg | image/png | image/webp`인지 서버에서 확인; 불일치 시 400 반환
- [ ] **중복 해시 차단:** 동일 파일 hash(SHA-256)가 이미 `ugc-pending` 또는 `ugc-approved` 버킷에 존재하면 업로드를 중복으로 간주하고 거부
- [ ] **관리자 MFA:** `/admin/moderation` 접근 경로는 Supabase Auth MFA(TOTP) 등록 확인을 미들웨어에서 검증; MFA 미등록 관리자는 MFA 등록 페이지로 리디렉션
- [ ] **감사 로그 보존:** `moderation_events` 테이블은 append-only RLS로 보호되며, 제보 삭제·보존 기간 정책에 무관하게 별도 보존 기간(최소 1년)을 DB 수준에서 명시 (코멘트 또는 retention policy)

### AC-F3-10 UGC 권한 경계 (M-7)
- [ ] 단일 승인 제보가 `accessibility_facts.status`를 `supported ↔ unsupported`로 직접 변경하는 코드 경로가 없음 (unit test로 검증)
- [ ] 승인 제보는 `related_capability_code`에 해당하는 fact의 `verified_at` 날짜만 갱신하고 `status`는 변경하지 않음
- [ ] 승인 제보의 `flag` moderation action이 `moderation_events`에 기록되고 ETL 배치에서 감지 가능한 상태임을 integration test로 확인
- [ ] 권위 변경 요건(evidence pack 또는 별개 reporter 2건)을 충족하지 않은 채 `accessibility_facts.status`를 UPDATE하는 경로 없음
- [ ] F1.E 후기·GPX 제출 UI가 MVP 빌드에 포함되지 않음 (F3가 유일한 UGC 진입점)

---

## 15. 타임라인 체크포인트

SPEC §9 타임라인 기준:

| 기간 | F3 체크포인트 |
|---|---|
| 6/14–6/28 | DB Contract v1에 `barrier_reports`, `report_evidence`, `moderation_events`, `reporter_trust_scores` 테이블 DDL + RLS 정책 포함; `is_platform_admin()` SECURITY DEFINER 함수 포함 |
| 6/29–7/19 | `moderateReport.ts` 도메인 함수 단위 테스트 통과; `submitBarrierReport` application 레이어 구현; 제보 양식 UI 스텝 구현 |
| 7/20–8/9 | `approveReport` Server Action 구현; Postgres 브로드캐스트 트리거 배포; `ActiveReportBanner` Realtime 수신 확인; 관리자 검수 큐 테이블 + 상세 페이지 구현 |
| 8/10–8/31 | GPS scrub 검증; RLS E2E 테스트; 위치정보법 동의 문구 법률 검토 완료; Realtime 배너 → F1.B 대체 경로 연결 확인 |
| 9/1–9/15 | 실 사용자 베타: CACF 운영자가 검수 큐 조작 시연; PT D.1 시나리오 전체 파이프라인 스모크 테스트 |

---

## 16. 오픈 이슈

| # | 이슈 | 우선순위 | 비고 |
|---|---|:---:|---|
| OI-F3-01 | 방통위 위치기반서비스 신고 완료 시점 확인 | P0 | 출시 전 필수; 법무 트래킹 |
| OI-F3-02 | `retracted` 알림 방식 — 별도 broadcast vs 클라이언트 30초 polling | P1 | 콘테스트 규모에선 polling 허용 |
| OI-F3-03 | `ugc-approved` 버킷 사진의 CDN 캐시 — 개인 식별 불가 장소 사진만 허용인지 법률 검토 | P1 | 사람 얼굴 포함 사진 업로드 차단 가이드라인 필요 |
| OI-F3-04 | 관리자 알림 (새 pending 제보 유입) — MVP에서는 `/admin/moderation` 주기적 새로고침; Realtime 관리자 채널은 발전방향 | P2 | Vercel Cron 또는 이메일 알림은 발전방향 |
| OI-F3-05 | `report_trends_mv` refresh 시점 — ETL 배치와 같은 KST 04:00 일배치로 통합 | P2 | 승인 즉시 refresh는 F5 요건 확인 후 결정 |
| OI-F3-06 | 사진 내 얼굴 자동 감지(블러) — MVP에서는 업로드 전 가이드라인 고지로 대체 | P3 | 발전방향 |
