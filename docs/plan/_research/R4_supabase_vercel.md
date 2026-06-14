# R4 — Supabase + Next.js + Vercel Production Patterns (Seoul / PIPA)

> 모두의 백제 (Modu Baekje) 구현 청사진용 R4 리서치. 대상 스택: Next.js App Router + Supabase + Vercel (서울 리전), KTO TourAPI 4.0, KWCAG 2.2, 기능 심사 2026-10. 작성일 2026-06-13.
> Verified against primary/official docs (Supabase / Next.js / Vercel / Korean PIPA primary sources). Every URL in the Sources section.

---

## 0. TL;DR (의사결정 요약)

- **리전**: Supabase `ap-northeast-2` (Seoul) + Vercel `icn1` (Seoul, `ap-northeast-2`) — 둘 다 같은 AWS 서울 리전 위에 있어 함수↔DB 왕복 지연이 최소. **함수 리전을 반드시 `icn1`로 고정**하라 (Vercel 기본값은 `iad1` 워싱턴이라 서울 DB와 멀어 매 호출 태평양 왕복 발생). `vercel.json`의 `"regions": ["icn1"]`로 핀.
- **PIPA 관점**: 앱 데이터(Postgres·Auth·Storage origin)는 서울 리전에 상주 → 국경 간 이전(cross-border transfer) 미발생이 기본. **단,** (a) Vercel **Edge/Static CDN**과 (b) Supabase **Storage Smart CDN(Cloudflare 기반, cf-cache-status)** 은 전세계 PoP에 캐시 → 정적/이미지 자산은 해외 엣지로 흐를 수 있음. 컴퓨트(함수)·DB·인증 토큰은 서울 고정 가능. 개인정보(UGC/제보 작성자 식별정보)는 DB(서울)에만 두고, CDN에는 공개 자산만 태우는 분리가 핵심.
- **게스트 우선 + PIPA 동의**: Supabase **Anonymous Sign-In**(`signInAnonymously()`)이 정확히 게스트-우선 패턴. PII 0개로 `authenticated` 역할 발급 → 나중에 `linkIdentity()`/`updateUser()`로 소셜·이메일 승격 시 **user id 유지**(UGC 보존). 동의 UX는 앱 레벨에서 별도 구현(아래 §5).
- **검수 큐(admin 큐) + UGC**: RLS "deny-by-default" + `is_anonymous`/`status` 컬럼 + 플랫폼 admin 테이블 + `SECURITY DEFINER` 헬퍼로 분리. 작성은 본인(또는 게스트 제외), 공개 read는 `status='approved'`만, 검수는 admin 전용 정책.
- **KTO API 프록시 캐시**: Route Handler/Server Action에서 KTO 호출을 서버사이드로 감싸고 `unstable_cache`(Next 15 이하) 또는 `use cache`+`cacheTag`/`cacheLife`(Next 16, Cache Components) 로 Vercel Data Cache에 태깅. `revalidateTag`로 ETL 후 무효화.
- **ETL 배치**: Vercel Cron(`vercel.json` `crons`)으로 KTO 일배치. **Hobby 플랜은 하루 1회 제한 + 시간(hour) 단위 지터**, Pro는 분 단위. UTC 고정이므로 KST 새벽 실행하려면 UTC로 환산(예: KST 04:00 = UTC 19:00 전날 → `0 19 * * *`).
- **실시간 푸시(승인된 배리어 제보)**: Supabase Realtime **Broadcast from Database**(권장, 확장성·보안 우위) — Postgres 트리거에서 `realtime.broadcast_changes()`로 `status='approved'` 전이 시에만 private 채널로 송신. Postgres Changes는 간단하지만 스케일 한계.
- **비용(콘테스트 MVP)**: Supabase **Free**(또는 Pro $25/mo)와 Vercel **Hobby**(Free)/**Pro** $20/user/mo 조합으로 충분. 단 Free는 1주 비활성 시 일시정지(심사 직전 사고 위험) + Cron 1일 1회 제한 → **심사 기간엔 Pro 권장**.

---

## 1. Supabase — Northeast Asia (Seoul) 리전 & 가용성

### 1.1 리전 가용성 (PRIMARY)
- Supabase는 **특정 AWS 리전(Specific region)** 으로 `ap-northeast-2` (Seoul) 선택 가능. Status 페이지에 `ap-northeast-2` Operational로 상시 노출 (Tokyo `ap-northeast-1`도 동일). 즉 서울 단일 프라이머리 리전 배포 가능. ([Available regions], [Status])
- 리전은 인프라 레벨에 고정 — **사후 변경 = 새 프로젝트 생성 후 마이그레이션**. 초기 설정에서 반드시 Seoul 선택. ([Change Project Region])
- Read replica / Management API는 "General region"에선 미지원이지만, **specific region(`ap-northeast-2`) 선택 시 read replica 가능** (Pro 이상). 콘테스트 MVP는 단일 인스턴스로 충분.
- 최근(2026-06-10) `ap-northeast-1/2` 클러스터에서 10분간 connection 실패율 상승 사례 있음(복구됨) → 심사일 단일 리전 장애 리스크는 인지하되 MVP 규모에선 수용.

### 1.2 pgvector — 한국어 임베딩 (PRIMARY)
- 확장명은 `vector`. Dashboard → Database → Extensions에서 토글로 활성화. ([pgvector docs])
- 한국어 의미 검색 권장: OpenAI `text-embedding-3-small`(1536/축소 가능, 저비용 — 1M토큰 $0.02) 또는 한국어 정확도가 더 좋은 **multilingual 모델**(예: `multilingual-e5-large` 1024차원, intfloat) 중 택1. 차원이 작을수록 저장·검색 비용↓.
- 인덱스: 대규모는 **HNSW**(`create index on docs using hnsw (embedding vector_cosine_ops)`), 소규모는 IVFFlat. 정규화 임베딩이면 내적(`<#>`)이 가장 빠름, 미정규화면 코사인(`<=>`)이 안전 기본값.
- **하이브리드 검색**(벡터 + Postgres FTS, RRF 융합)이 고유명사(예: "정림사지", "공산성") 매칭에 유리 — 백제 유적 POI엔 키워드 정확도가 중요하므로 강력 권장.
- pgvector ≥ 0.8.0: HNSW + 필터 조합 시 결과 부족 문제를 **iterative index scan**으로 보완.

```sql
-- POI 의미 검색 RPC (PostgREST는 거리 연산자 직접 미지원 → 함수로 래핑)
create or replace function match_poi (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns setof poi
language sql stable
as $$
  select *
  from poi
  where poi.embedding <=> query_embedding < 1 - match_threshold
  order by poi.embedding <=> query_embedding asc
  limit least(match_count, 200);
$$;
```

### 1.3 자동 임베딩 갱신 (선택)
- DB-native 패턴: `pgmq`(큐) + `pg_net`(DB→HTTP) + Edge Function 트리거로 INSERT/UPDATE 시 임베딩 자동 생성. POI 마스터가 KTO ETL로 갱신되므로, ETL 배치 안에서 직접 임베딩 호출하는 것이 MVP엔 더 단순.

---

## 2. RLS — UGC + 검수(admin) 큐 패턴

### 2.1 원칙 (PRIMARY)
- public 스키마 모든 테이블 RLS **필수**. anon key만 있으면 누구나 Data API로 쿼리 가능 → RLS 없으면 전체 노출. ([RLS docs])
- **Deny-by-default**: RLS 켜고 정책 없으면 모든 작업 거부. 필요한 작업만 정책으로 허용.
- 정책에 **`TO authenticated` / `TO anon` 명시** (deprecated `auth.role()` 대신 `TO` 절). 불필요한 anon 평가 방지 + 성능.
- 정책 컬럼은 **반드시 인덱스** (RLS 성능 1순위 함정).
- `auth.uid()`는 `(select auth.uid())`로 감싸 per-row 재평가 방지(성능).
- 테스트는 SQL Editor가 아닌 **클라이언트 SDK / "Run as role"** 로 (SQL Editor는 RLS 우회).

### 2.2 모두의 백제 적용 정책 세트
- **POI 마스터**(KTO 동기화, 공개 read-only): anon/authenticated SELECT 허용, 쓰기는 service_role(ETL)만.
- **UGC 제보(barrier reports / 리뷰)**: 작성은 영구 사용자만(게스트 제외), 본인 행 CRUD, 공개 read는 `status='approved'`만.
- **검수 큐(admin)**: 플랫폼 admin만 pending 전체 조회 + status 변경.

```sql
-- 1) 게스트(익명)는 제보 작성 금지 — RESTRICTIVE로 항상 강제
create policy "permanent users only can insert reports"
on barrier_reports as restrictive for insert to authenticated
with check ((select (auth.jwt()->>'is_anonymous')::boolean) is false);

create policy "owner inserts own report"
on barrier_reports for insert to authenticated
with check ((select auth.uid()) = author_id);

-- 2) 공개 read는 승인된 것만, 본인은 자기 것 전부
create policy "public reads approved"
on barrier_reports for select to anon, authenticated
using (status = 'approved');

create policy "owner reads own"
on barrier_reports for select to authenticated
using ((select auth.uid()) = author_id);

-- 3) 플랫폼 admin: 큐 전체 열람 + 상태 변경 (정책은 OR로 결합 → 위 정책 위에 얹힘)
create policy "admin reads all"
on barrier_reports for select to authenticated
using ((select is_platform_admin()));

create policy "admin updates status"
on barrier_reports for update to authenticated
using ((select is_platform_admin()))
with check ((select is_platform_admin()));
```

```sql
-- admin 판별 헬퍼: SECURITY DEFINER로 admin 테이블 RLS 순환참조 회피
-- 내부에서 호출자 uid를 직접 검증하므로 권한상승 위험 없음
create or replace function is_platform_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;
```

- **익명 사용자 핵심 주의(PRIMARY)**: anonymous user는 **`authenticated` 역할**을 그대로 사용 → 영구 사용자 전용 동작은 `auth.jwt()->>'is_anonymous'` 체크 + **RESTRICTIVE** 정책으로 막아야 함(permissive는 OR라 새는다). Anonymous Sign-In 활성화 전에 기존 RLS 전수 리뷰 필수.
- admin email **하드코딩 금지** → `platform_admins` 테이블로 관리(퇴사/회수 가능).
- 감사 로그(검수 이력)는 본인 SELECT만 + INSERT/UPDATE/DELETE `with check (false)`, 실제 기록은 `SECURITY DEFINER` 트리거 → append-only.

---

## 3. Supabase Storage — POI/UGC 이미지 + Signed URL

### 3.1 버킷 설계 (PRIMARY)
- **Public 버킷** = 인증 없이 URL 직접 접근, CDN 캐시 효율 최대 → **POI 공개 사진, OG 이미지**.
- **Private 버킷** = signed URL 또는 인증 요청 필요 → **검수 전 UGC 업로드**(승인 전 비공개), 신고 첨부 등.
- Storage 접근은 `storage.objects` 테이블 RLS로 제어(DB RLS와 동일 철학). private 버킷이라도 **RLS 정책 없으면 service_role 외 접근 불가**(닫힘) — public/private 토글과 RLS는 별개 스위치, 둘 다 설정해야 함.
- 버킷 생성 시 `file_size_limit` + `allowedMimeTypes` 설정 → 토큰이 새도 거대/악성 파일 업로드 차단(서버가 업로드 자체에서 강제). HTML/실행파일 업로드 시 stored-XSS 방지 위해 MIME 화이트리스트 필수.

```sql
-- private UGC 버킷: 사용자 폴더(uid) 기반 격리
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ugc-pending', 'ugc-pending', false, 10485760,            -- 10MB
        ARRAY['image/jpeg','image/png','image/webp']);

CREATE POLICY "user uploads to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ugc-pending'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);
```

### 3.2 Signed URL 패턴 (PRIMARY)
- 검수 전 UGC는 **서버사이드(Route Handler / Server Action)에서 짧은 TTL signed URL 발급** — `service_role`을 클라이언트에 노출 금지.
- 직접 업로드는 `createSignedUploadUrl()`(단일 객체 키 스코프, 바이트가 Vercel 함수를 통과하지 않음) → 대용량/다수 업로드에 권장.

```ts
// 서버 전용(Route Handler) — 검수 전 비공개 이미지 1시간 열람 링크
const { data } = await supabaseAdmin
  .storage.from('ugc-pending')
  .createSignedUrl(`${userId}/${fileName}`, 3600); // data.signedUrl
```

- **Next.js `<Image>` 주의**: signed URL이 매 렌더마다 바뀌면 `/_next/image` 옵티마이저 캐시가 매번 무효화됨. 안정적 캐시 키(객체 경로) 유지하고 파일 변경 시에만 signed URL 회전, 또는 업로드 콘텐츠는 옵티마이저 우회.

### 3.3 Storage CDN / 데이터 이동 (PIPA 관련, PRIMARY)
- **Origin 서버는 프로젝트 리전(서울)에서 실행** → 원본은 서울 상주. 그러나 Supabase Storage는 모든 요청을 **CDN(Cloudflare 기반, `cf-cache-status` 헤더, `MISS`/`HIT`)** 으로 먼저 라우팅하고 **전세계 PoP에 캐시**. 예: 미국 사용자가 요청하면 미국 CDN 노드가 origin(서울)에서 당겨 미국에 캐시.
- → **함의**: Storage에 올린 자산(공개 POI 사진 등)은 해외 엣지에 복제될 수 있음. **개인 식별정보가 담긴 파일은 Storage에 두지 말 것**(또는 private + 최소 노출). 공개 관광 자산만 CDN에 흐르게 설계.
- Smart CDN: 자산 메타데이터를 엣지에 동기화 → 변경/삭제 시 자동 무효화(최대 60초 전파). signed URL도 토큰 단위로 개별 캐시 키. 토큰 만료가 CDN 캐시를 즉시 비우지 않음 → **접근 차단은 객체 삭제로** 해야 확실.

---

## 4. Supabase Auth — 게스트 우선 + 소셜 + PIPA

### 4.1 Anonymous Sign-In = 게스트 우선 (PRIMARY)
- `supabase.auth.signInAnonymously()` → PII 0개로 임시 사용자 생성, `authenticated` 역할 + `is_anonymous=true` JWT 클레임. (sign-out/브라우저 정리/타기기 전환 시 복구 불가).
- **`anon` API 키와 다름**: anon 키는 사용자 미생성(public 접근), anonymous sign-in은 실제 user row 생성.
- **남용 방지(PRIMARY)**: 익명 가입은 DB row를 늘리므로 **Turnstile/invisible CAPTCHA 권장**, IP 기준 기본 30 req/hour rate limit(대시보드 조정 가능).
- **자동 정리 없음** → 30일 경과 익명 사용자 주기 삭제 SQL(또는 Cron):
  `delete from auth.users where is_anonymous is true and created_at < now() - interval '30 days';`
- **정적 렌더링 캐싱 버그 주의(PRIMARY)**: Next.js static rendering에서 익명 사용자 user_metadata가 다른 익명 사용자 간 캐시되는 사례 보고 → **동적 렌더링 사용** 권장.

### 4.2 게스트 → 영구 사용자 승격 (PRIMARY)
- **user id가 유지**되므로 게스트가 만든 데이터(찜/임시 제보) 자동 보존.
- 이메일/전화: `updateUser({ email })` → 인증(OTP/매직링크) 후 `updateUser({ password })`.
- 소셜(OAuth): **manual linking 활성화**(`GOTRUE_SECURITY_MANUAL_LINKING_ENABLED`) 후 `linkIdentity({ provider: 'google' })` / `'kakao'` 등.
- 기존 계정과 충돌(이미 그 이메일 사용자 존재) 시 수동 처리: 기존 계정 로그인 → `from('table').update({ user_id: existingUser.id }).eq('user_id', anonId)` 로 데이터 재귀속.

### 4.3 PIPA 동의와의 관계 (요약, 상세는 §5)
- Anonymous는 PII를 수집하지 않으므로 **수집·이용 동의가 원천적으로 최소화** — 게스트-우선 + PIPA 친화의 핵심 근거.
- 소셜 로그인으로 승격하는 순간 카카오/구글에서 이메일·프로필 등 **개인정보 수집·이용 발생** → 그 시점에 동의 UX 필요(앱 레벨). Supabase Auth는 동의 화면을 제공하지 않으므로 **직접 구현**.

---

## 5. PIPA / 데이터 잔류성 — Vercel + Supabase Seoul

### 5.1 핵심 사실 (PRIMARY)
- **PIPA cross-border 이전 근거(2023 개정, 2023-09-15 시행)**: ① 정보주체 별도 동의, ② **계약 이행에 필요한 처리위탁·보관이고 개인정보처리방침에 공개/통지한 경우**(consent 면제), ③ PIPC 인정 인증 보유, ④ PIPC가 적정성(equivalence) 인정한 국가. (2025-09-16 EU/EEA 적정성 인정 → EU로의 이전은 무동의 가능. 미국은 미인정 → 미국 처리 시 위 ①/② 근거 필요.) ([PIPA Art.28-8], [Law.asia], [Lexology])
- **Vercel 처리 위치(PRIMARY, DPA)**: Vercel의 1차 처리 시설은 **미국**. 컴퓨트 리전은 선택 가능하나, 백업은 전세계 복제, "미국 및 전세계 어디든" 처리 가능성 명시.
- **Supabase**: 프로젝트를 서울로 두면 Postgres/Auth/Storage origin은 서울 상주. 단 Storage CDN(Cloudflare)·Vercel CDN/Edge는 글로벌 캐시.

### 5.2 모두의 백제 권고 아키텍처
1. **Vercel 함수 리전 `icn1` 고정** + Edge Runtime(미들웨어) 최소화 → 컴퓨트는 서울. (단 Vercel 정적 자산/Edge는 글로벌 PoP — 이건 개인정보가 아닌 정적 콘텐츠이므로 허용.)
2. **개인정보(제보 작성자 식별·연락처·소셜 프로필)는 Supabase Postgres(서울)에만 저장.** CDN/Blob/Edge에 PII 태우지 않음.
3. **이미지**: 공개 관광 자산만 public 버킷(CDN OK). 신원이 식별되는 UGC는 private + 짧은 signed URL.
4. **개인정보처리방침에 처리위탁 명시**: Supabase(서울 리전, AWS), Vercel(미국 처리 가능), 카카오/구글(소셜) 를 **처리위탁/국외이전 항목으로 고지** → 근거 ②(계약 이행 + 처리방침 고지) 확보. 미국 처리가 있는 한 처리방침 고지는 사실상 필수.
5. **소셜 로그인 동의 화면**(수집 항목·목적·보유기간·국외이전 사실·거부 시 불이익)을 승격 플로우에 직접 구현. 게스트는 동의 표면 0.
- **주의**: 본 문서는 엔지니어링 가이드이며 법률 자문이 아님. 콘테스트 기능 심사 전 처리방침/동의 문구는 PIPA 전문가 검토 권장.

---

## 6. Next.js App Router — KTO API 프록시 & 캐시

### 6.1 패턴 선택 (PRIMARY)
- KTO TourAPI 키는 **서버에만** → KTO 호출은 Server Component / Route Handler / Server Action에서 수행(클라이언트 직접 호출 금지, 키·CORS·캐시 통제).
- 같은 앱 내 Server Component가 소비하면 Route Handler 불필요(직접 fetch/DB). Route Handler는 외부·클라이언트 컴포넌트가 호출할 때.

### 6.2 캐시 — 버전별 (PRIMARY, 타임라인 중요)
**Next.js 15 이하 (현행 안정)** — `fetch` 캐시 + `unstable_cache`:
```ts
// fetch 기반(KTO REST): 태그 + 시간 기반
async function getPoiList() {
  const res = await fetch(`${KTO_BASE}/areaBasedList2?...`, {
    next: { tags: ['poi:all'], revalidate: 86400 }, // 1일
  });
  return res.json();
}

// 비-fetch(ORM/RPC) 결과: unstable_cache로 Data Cache에 태깅
import { unstable_cache } from 'next/cache';
export const getCachedPoi = unstable_cache(
  async () => supabase.rpc('match_poi', { ... }),
  ['poi-search'],
  { tags: ['poi:all'], revalidate: 86400 }
);
```
- **함정(PRIMARY)**: `unstable_cache`는 격리 컨텍스트라 `cookies()`/`headers()` 접근 불가 → **per-user 데이터를 절대 감싸지 말 것**(과거 버전에서 사용자 간 데이터 유출 사례). per-user는 React `cache()`(요청 단위 메모이즈)만.
- ETL 후 무효화: 배치 끝에서 `revalidateTag('poi:all')` 호출 → SWR로 다음 요청 시 갱신.

**Next.js 16 (Cache Components, `unstable_` 접두어 16.2에서 제거됨)** — `use cache`:
```ts
// next.config.ts → cacheComponents: true (이게 켜져야 use cache 동작)
import { cacheLife, cacheTag } from 'next/cache';
async function getPoiList() {
  'use cache';
  cacheLife('days');     // 내장 프로파일: minutes|hours|days|weeks|max
  cacheTag('poi:all');
  const res = await fetch(`${KTO_BASE}/areaBasedList2?...`);
  return res.json();
}
```
- **Next 16 주의**: `cacheComponents` 켜면 **fetch 자동 캐시 사라짐** — `use cache` 미부착 함수는 매 요청 실행(느려짐, 조용한 회귀). `revalidateTag(tag, 'max')`는 **2번째 인자(cacheLife 프로파일) 필요**, read-your-writes는 `updateTag()`.
- **타임라인 권고**: 2026-10 심사 기준 신규 프로젝트면 Next 16 + Cache Components + `use cache`가 정방향. 다만 생태계 안정성·예제 풍부함을 우선하면 **Next 15 + `unstable_cache`로 시작**하고 마이그레이션은 리스크 평가 후. (둘 다 Vercel Data Cache에 적재됨.) `cacheComponents` 미사용 시 `use cache`는 no-op이므로 혼용 금지.

### 6.3 KTO 프록시 캐시 키 설계
- POI 마스터(일배치로만 갱신) → 긴 TTL + `poi:all` / `poi:{contentId}` 태그, ETL이 `revalidateTag`.
- 사용자별/위치별 동적 결과 → 캐시하지 말거나 짧은 `revalidate`. RLS 통과 데이터는 per-user이므로 Data Cache 금지.

---

## 7. Vercel — Cron(KTO 일배치) & 리전 핀

### 7.1 Cron 설정 (PRIMARY)
```jsonc
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"],                 // 모든 함수 서울 고정
  "crons": [
    { "path": "/api/cron/kto-etl", "schedule": "0 19 * * *" }  // UTC 19:00 = KST 04:00
  ]
}
```
- **타임존은 항상 UTC** — KST 환산 필수. `MON`/`JAN` 등 약어 미지원, day-of-month와 day-of-week 동시 지정 불가.
- 트리거는 **프로덕션 배포에만** 적용(프리뷰 무시). user-agent `vercel-cron/1.0`, 헤더 `x-vercel-cron-schedule`로 어느 스케줄인지 식별(같은 path 다중 스케줄 분기 가능).
- **Hobby 제약(PRIMARY)**: 크론 **하루 1회만** 허용(더 자주면 배포 실패) + 지정 "시(hour)" 내 임의 시각 실행(예 `0 8 * * *` → 08:00:00~08:59:59 사이). Pro 이상은 분 단위 정확.
- 보안: 크론 엔드포인트는 `CRON_SECRET`(Authorization 헤더) 또는 `x-vercel-cron` 검증으로 외부 호출 차단.
- 지속시간: `maxDuration`은 일반 함수와 동일 한도. KTO 대량 ETL이 길면 **여러 크론으로 분할** 또는 크론이 일반 HTTP 작업을 페이지네이션 호출하는 구조로 분산.

### 7.2 리전 핀 (PRIMARY)
- 기본 `iad1`(워싱턴) → **반드시 `icn1`(서울) 로 변경**. `vercel.json` `"regions": ["icn1"]` 또는 프로젝트 설정/`vercel --regions icn1`.
- 함수별 오버라이드는 `functions["api/x.ts"].regions`로. `functionFailoverRegions`는 **Enterprise 전용**.
- Pro는 **최대 3리전**, Hobby는 **단일 리전 1개**(서울 1개면 충분). Edge Functions/미들웨어는 리전 핀 무관하게 전 글로벌 배포됨(PIPA상 PII를 미들웨어에서 다루지 말 것).
- **Region code 확정(PRIMARY)**: `icn1` = `ap-northeast-2`, Seoul, South Korea.

---

## 8. Supabase Realtime — 승인된 배리어 제보 푸시

### 8.1 방식 선택 (PRIMARY)
- **Broadcast from Database (권장)**: Postgres 트리거 → `realtime.broadcast_changes()` → private 채널. 확장성·보안·페이로드 정밀제어 우위. `realtime.message`에서 WAL 기반, 3일 후 자동 삭제. Realtime Authorization(RLS on `realtime.messages`) 필요.
- **Postgres Changes (간단)**: `supabase_realtime` 퍼블리케이션에 테이블 추가 후 클라이언트 구독. 단 **모든 변경마다 구독자 수만큼 RLS read 발생**(100명 구독 → 1 insert가 100 read) → 스케일 한계. 콘테스트 데모엔 가능하나 Broadcast가 정석.
- 무료/Pro 한도(아래 §9): Free **Realtime 동시연결 200 / 월 메시지 2M**, Pro **500 동시연결 / 5M 메시지**.

### 8.2 "승인 시에만" 푸시 패턴
```sql
-- status가 approved로 전이될 때만 broadcast
create or replace function public.report_approved_broadcast()
returns trigger security definer language plpgsql as $$
begin
  if (TG_OP = 'UPDATE' and NEW.status = 'approved' and OLD.status <> 'approved') then
    perform realtime.broadcast_changes(
      'region:' || NEW.area_code::text,   -- 지역별 토픽
      'approved', 'approved', TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
    );
  end if;
  return null;
end; $$;

create trigger on_report_approved
after update on public.barrier_reports
for each row execute function report_approved_broadcast();
```
```sql
-- 구독 인가: 인증 사용자가 메시지 수신 허용
create policy "authenticated can receive broadcasts"
on "realtime"."messages" for select to authenticated using (true);
```
```ts
// 클라이언트: private 채널 구독 (지역별 토픽)
await supabase.realtime.setAuth();
const ch = supabase
  .channel(`region:${areaCode}`, { config: { private: true } })
  .on('broadcast', { event: 'approved' }, (p) => showNewReport(p))
  .subscribe();
```
- 토픽을 지역(area_code)별로 쪼개면 사용자가 보는 지역만 구독 → 메시지 비용·노이즈↓.

---

## 9. 비용 — 콘테스트 MVP 봉투 (PRIMARY)

### 9.1 Supabase (org 단위 과금)
| 항목 | Free ($0) | Pro ($25/mo, 기본 spend cap ON) |
|---|---|---|
| DB 크기 | 500MB/프로젝트 | 8GB disk, 초과 $0.125/GB |
| 월간 활성사용자(MAU) | 50,000 | 100,000, 초과 $0.00325/MAU |
| Egress(통합) | 5GB cached + 5GB uncached | 250GB + 250GB, 초과 $0.09(uncached)/$0.03(cached) per GB |
| 파일 스토리지 | 1GB | 100GB, 초과 $0.0213/GB |
| 이미지 변환 | 불가 | 100 origin 포함, 이후 $5/1000 |
| Edge Function 호출 | 500,000 | 2M 포함 |
| Realtime 메시지/동시연결 | 2M / 200 | 5M / 500 |
| 백업 | 없음 | 7일 일일 백업 |
| **일시정지** | **1주 비활성 시 정지** | **정지 없음** |

- **Free의 함정**: 1주 비활성 시 자동 일시정지 → 심사 직전 휴면 사고 위험. + Free 프로젝트 2개 제한.
- **권고**: 개발은 Free, **심사 기간(2026-10 전후)엔 Pro $25/mo** 로 올려 일시정지·백업·여유 한도 확보. 콘테스트 트래픽은 Pro 포함 한도 내 여유.

### 9.2 Vercel (icn1 Seoul 리전 단가, Pro 한정 관리형 인프라)
| 항목 | Hobby (Free) | Pro ($20/user/mo, $20 크레딧 포함) |
|---|---|---|
| 크론 | **1일 1회**, 시간 내 임의 실행 | 분 단위 정확 |
| 함수 리전 | 단일 1개(icn1) | 최대 3개 |
| Fast Data Transfer(icn1) | 캡 내 | 첫 1TB 포함, 이후 $0.35/GB |
| Edge Requests(icn1) | 캡 내 | 첫 10M 포함, 이후 $2.60/1M |
| Image Optimization(icn1) | — | 변환 $0.0595/1K |
| 추가 사용 구매 | 불가(캡 고정) | 가능(uncapped, spend 관리) |

- **권고**: 데모는 Hobby로도 가능하나 **크론 1일 1회 제한 + 캡 고정**이 심사 안정성에 불리. KTO 일배치 1회면 Hobby로도 되지만, 분 단위 정확성·여유 위해 **Pro $20/mo** 권장. icn1은 Pro 전용 regional 관리형 인프라 단가 적용.

### 9.3 추가 변동비
- 임베딩: OpenAI `text-embedding-3-small` 1M토큰 $0.02 — POI 수천~수만 건이면 1달러 미만(1회성).
- LLM(RAG 사용 시): 별도. MVP에서 RAG가 핵심이 아니면 임베딩 검색만으로 충분.
- **총 봉투**: 풀 Pro 조합 약 **$45/mo (Supabase $25 + Vercel $20)** + 미미한 OpenAI. 콘테스트 기간 수개월 운영해도 수십 달러 수준.

---

## 10. 권장 종합 구성 (config 스냅샷 모음)

```jsonc
// vercel.json — 서울 핀 + KST 04:00 일배치
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["icn1"],
  "crons": [{ "path": "/api/cron/kto-etl", "schedule": "0 19 * * *" }]
}
```
```ts
// lib/supabase/server.ts — App Router 서버 클라이언트 (@supabase/ssr ^0.12)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component: 미들웨어가 토큰 갱신 처리 */ }
        },
      } }
  );
}
```
```ts
// app/api/cron/kto-etl/route.ts — 보호된 크론 엔드포인트
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response('Unauthorized', { status: 401 });
  // 1) KTO TourAPI 동기화 → Supabase upsert (service_role)
  // 2) 변경 POI 임베딩 갱신(선택)
  // 3) revalidateTag('poi:all')  // 캐시 무효화
  return Response.json({ ok: true });
}
```
- **라이브러리 현행 버전**: `@supabase/ssr` **0.12.0**(2026-06-09), `@supabase/supabase-js`와 함께 사용. `@supabase/auth-helpers-*`는 **deprecated → @supabase/ssr로 통합**. `getSession()`은 쿠키에서 읽어 **인가 판단에 사용 금지**(서버 검증 안 됨); 인가는 `getUser()`/`getClaims()`로.
- 쿠키 메서드는 **`getAll`/`setAll`** 사용(구 `get`/`set`/`remove`는 deprecated, 차기 메이저 제거). 미들웨어(Proxy)에서 토큰 갱신 + 캐시 누수 방지 헤더(`Cache-Control` 등) 응답 적용 필수.

---

## 11. 리스크 / 오픈 이슈

- **Next 15 vs 16 캐시 모델 분기**: 심사 시점(2026-10) Next 16 Cache Components가 정방향이나, `cacheComponents` 켜면 fetch 자동캐시 제거 → 마이그레이션 리스크. 팀 숙련도 기준 선택 필요. 혼용 금지.
- **Vercel 미국 처리 + 백업 글로벌 복제**: icn1 핀으로 컴퓨트는 서울이나, Vercel DPA상 미국/전세계 처리 가능 → PII는 Supabase(서울)에만, 처리방침 국외이전 고지로 커버. 법률 검토 권장.
- **Supabase Storage/Vercel CDN 글로벌 캐시**: 공개 자산만 태우고 PII 파일은 private+짧은 signed URL. 토큰 만료가 캐시를 안 비움 → 차단은 객체 삭제로.
- **Free 일시정지·Cron 1일 1회**: 심사 기간엔 양쪽 Pro로 격상 권장.
- **Anonymous 남용/정적캐시 버그**: CAPTCHA + 동적 렌더링 + 30일 정리 SQL 필요.
- **단일 서울 리전 장애**(2026-06 사례) — MVP는 수용, read replica/failover는 콘테스트 범위 밖.

---

## Sources

### Supabase — 리전 / DB / pgvector
- Available regions — https://supabase.com/docs/guides/platform/regions
- Regional Invocations (Edge Functions) — https://supabase.com/docs/guides/functions/regional-invocation
- Status (ap-northeast-2 Operational) — https://status.supabase.com/
- Change Project Region — https://supabase.com/docs/guides/troubleshooting/change-project-region-eWJo5Z
- pgvector: Embeddings and vector similarity — https://supabase.com/docs/guides/database/extensions/pgvector
- Semantic search (HNSW/IVFFlat, RPC, iterative scan) — https://supabase.com/docs/guides/ai/semantic-search

### Supabase — RLS / Auth / Storage / Realtime
- Row Level Security — https://supabase.com/docs/guides/database/postgres/row-level-security
- RLS practical patterns (7 patterns) — https://zenn.dev/azuma317/articles/supabase-rls-practical-patterns?locale=en
- RLS SaaS blueprint (admin/audit/security definer) — https://afterbuildlabs.com/resources/supabase-rls-saas-blueprint
- RLS best practices (MakerKit) — https://makerkit.dev/blog/tutorials/supabase-rls-best-practices
- 10 real-world RLS patterns — https://supaexplorer.com/dev-notes/10-real-world-rls-patterns-for-supabase-with-policy-snippets.html
- Anonymous Sign-Ins — https://supabase.com/docs/guides/auth/auth-anonymous
- Anonymous sign-ins (blog) — https://supabase.com/blog/anonymous-sign-ins
- Identity Linking — https://supabase.com/docs/guides/auth/auth-identity-linking
- Users (permanent vs anonymous) — https://supabase.com/docs/guides/auth/users
- Creating a Supabase client for SSR (Next.js) — https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs
- Migrating to @supabase/ssr — https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers
- @supabase/ssr (npm, v0.12.0) — https://registry.npmjs.org/@supabase/ssr
- createServerClient source (getAll/setAll) — https://github.com/supabase/ssr/blob/main/src/createServerClient.ts
- Storage Access Control (RLS) — https://supabase.com/docs/guides/storage/security/access-control
- Storage Deep Dive (signed URLs, transforms) — https://dev.to/kanta13jp1/supabase-storage-deep-dive-bucket-design-signed-urls-image-transforms-and-rls-3b9k
- Secure file uploads Next.js + Supabase Storage — https://securestartkit.com/blog/secure-file-uploads-nextjs-supabase-storage-2026
- Securing Supabase Storage Buckets — https://www.audityour.app/guides/supabase-storage-security-guide
- Smart CDN — https://supabase.com/docs/guides/storage/cdn/smart-cdn
- Storage CDN fundamentals (cf-cache-status, origin in project region) — https://supabase.com/docs/guides/storage/cdn/fundamentals
- Storage 500GB uploads / cheaper egress — https://supabase.com/blog/storage-500gb-uploads-cheaper-egress-pricing
- Bandwidth & Storage Egress — https://supabase.com/docs/guides/storage/serving/bandwidth
- Subscribing to Database Changes (Broadcast vs Postgres Changes) — https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Realtime: Broadcast from Database (blog) — https://supabase.com/blog/realtime-broadcast-from-database
- Postgres Changes — https://supabase.com/docs/guides/realtime/postgres-changes
- Realtime Broadcast from Database (feature) — https://supabase.com/features/realtime-broadcast-from-database

### Supabase — 비용
- Pricing & Fees — https://supabase.com/pricing
- Manage Egress usage — https://supabase.com/docs/guides/platform/manage-your-usage/egress
- About billing on Supabase — https://supabase.com/docs/guides/platform/billing-on-supabase
- Billing FAQ — https://supabase.com/docs/guides/platform/billing-faq

### Next.js — App Router 캐시
- Caching (Previous Model, unstable_cache) — https://nextjs.org/docs/app/guides/caching-without-cache-components
- unstable_cache reference — https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- Cache Revalidation Options (discussion) — https://github.com/vercel/next.js/discussions/78513
- Data Fetching Patterns in App Router — https://www.iamraghuveer.com/posts/nextjs-data-fetching-patterns/
- Cache Invalidation Field Guide — https://www.72technologies.com/blog/nextjs-app-router-cache-invalidation-field-guide
- Next.js 16 (Cache Components, use cache, revalidateTag cacheLife) — https://nextjs.org/blog/next-16
- Directive: use cache — https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next 16.2 unstable_cache vs use cache — https://www.buildwithmatija.com/en/blog/nextjs-16-2-caching-unstable-cache-vs-use-cache
- Next 16 Cache Components migration — https://klawsfx.com/blog/nextjs-16-cache-components-migration

### Vercel — Cron / 리전 / 데이터 잔류성 / 비용
- Cron Jobs quickstart — https://vercel.com/docs/cron-jobs/quickstart
- Cron Jobs (format, headers) — https://vercel.com/docs/cron-jobs
- Managing Cron Jobs (Hobby 1/day, x-vercel-cron-schedule) — https://vercel.com/docs/cron-jobs/manage-cron-jobs
- How to setup Cron Jobs — https://vercel.com/kb/guide/how-to-setup-cron-jobs-on-vercel
- Configuring regions for Vercel Functions — https://vercel.com/docs/functions/configuring-functions/region
- vercel.json static configuration (regions) — https://vercel.com/docs/project-configuration/vercel-json
- Pro 3-region changelog — https://vercel.com/changelog/pro-customers-can-now-configure-up-to-3-regions-for-vercel-functions
- Region list (icn1 = ap-northeast-2 Seoul) — https://vercel.com/docs/regions
- icn1 regional pricing — https://vercel.com/docs/pricing/regional-pricing/icn1
- Data Processing Addendum (US processing) — https://vercel.com/legal/dpa
- Security & Compliance ("Where does my data live") — https://vercel.com/docs/security/compliance
- Secure Compute (VPC peering) — https://vercel.com/docs/networking/secure-compute
- Vercel Pricing — https://vercel.com/pricing

### PIPA (Korea) — 국외이전
- DLA Piper — Korea transfer rules — https://www.dlapiperdataprotection.com/index.html?c=KR&t=transfer
- PIPA statute (Ch IV-3 cross-border) — https://elaw.klri.re.kr/eng_mobile/viewer.do?hseq=66066&key=4&type=part
- Doing business in Korea: data privacy (Art.28-8 grounds) — https://law.asia/doing-business-in-korea-data-privacy-compliance/
- EU equivalence recognition (2025-09-16) — https://www.lexology.com/library/detail.aspx?g=31ad9919-e907-4039-b953-2e2beeb6ee85
- Amended Enforcement Decree (2023-09-15) — https://chambers.com/articles/amended-enforcement-decree-of-the-personal-information-protection-act-of-korea-2
