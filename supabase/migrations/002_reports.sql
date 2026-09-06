-- The two visitor-writable tables plus the admin roster.
-- docs/spec/04_data_model.md §5, screens in docs/spec/07_screens.md S7 and S8.
--
-- Immediate-publish model: a report is visible the moment it is inserted. There is
-- no pending/approved state anywhere in this file — an admin can only hide a report
-- after the fact, and hiding never changes a fact in data_snapshots.

-- The eight categories offered by the S7 form (§5.2). Mirrored in
-- src/domain/types.ts REPORT_CATEGORIES; the two lists must stay in step.
create type report_category as enum (
  'elevator_broken',
  'ramp_blocked',
  'restroom_closed',
  'construction',
  'surface_damaged',
  'temporary_closure',
  'signage_missing',
  'other'
);

-- §5.1 — the only place that decides who is an admin. Deliberately not an env var,
-- so revoking access is a delete rather than a redeploy.
create table admin_users (
  user_id    uuid primary key,       -- auth.users(id), no FK: auth schema is Supabase-owned
  email      text not null,
  granted_at timestamptz not null default now()
);

-- security definer so a caller can answer "am I an admin?" without being able to
-- read admin_users itself. search_path = '' means every reference inside the body
-- must be schema-qualified, which is why public.admin_users is spelled out.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()));
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC, and PostgREST then publishes
-- it at /rest/v1/rpc/is_admin for the anon key. Only the RLS policies below need it,
-- and they run as the invoking user, so authenticated is the whole grant.
--
-- anon is named alongside public because `revoke ... from public` does not touch a
-- direct grant, and Supabase's default privileges on FUNCTIONS give anon its own
-- EXECUTE. Without naming it, the rpc stays published to the anon key — it returns
-- false unconditionally there (auth.uid() is null), so nothing leaks, but the grant
-- should say what it means.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table barrier_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null,            -- auth.uid() of an anonymous session
  poi_slug     text not null,            -- there is no pois table; slug is the reference
  category     report_category not null,
  occurred_on  date,                     -- when the visitor saw it, not when they wrote it
  detail       text check (char_length(detail) <= 500),

  -- First-flag timestamp, not a counter (§5.3). A counter would let one anonymous
  -- caller invoke flag_report() repeatedly on any id and inflate a report's position
  -- in the admin list, pushing honest reports out of sight. coalesce() in the RPC
  -- makes every call after the first a no-op, and storing no flagger identity means
  -- the public read policy exposes nothing about who flagged what.
  flagged_at    timestamptz,

  is_hidden     boolean not null default false,
  hidden_reason text,                    -- '욕설' | '허위' | '중복' | '개인정보 포함' …
  hidden_by     uuid,
  hidden_at     timestamptz,

  created_at   timestamptz not null default now(),

  -- Generated column because the duplicate rule has to be a unique index, and an
  -- index expression must be IMMUTABLE. A now() predicate is not IMMUTABLE, so an
  -- exact 24-hour window cannot be enforced by the database at all; a timestamptz
  -- shifted into a named zone and cast to date is IMMUTABLE, so a calendar day can be.
  --
  -- The zone is Asia/Seoul, not UTC. Every visitor is standing in Korea and the form
  -- tells them one report per day, so the boundary has to be the one they mean.
  -- Under UTC the window would roll over at 09:00 KST and the sentence on the form
  -- would be false for anyone reporting late in the evening.
  created_day  date generated always as ((created_at at time zone 'Asia/Seoul')::date) stored
);

create index on barrier_reports (poi_slug, created_at desc) where not is_hidden;
create index on barrier_reports (reporter_id);
-- Admin default order (§5.3, S8 rule 6): flagged first, then newest.
--
-- The expression matches what src/app/(admin)/admin/reports/page.tsx actually sends:
-- `flagged_at desc nulls last, created_at desc`. An earlier version indexed
-- `(flagged_at is not null) desc, created_at desc`, which reads the same in prose but
-- is a different ordering — it sorts the flagged group by post date where the screen
-- sorts it by flag recency. Measured at 5005 rows: the old expression left the screen's
-- query on `Sort -> Seq Scan` and only ever served the flagged-only view as a bitmap
-- predicate; this one gives an Index Scan with no Sort node.
--
-- `nulls last` is not decoration. In a descending btree nulls sort first by default,
-- which would put every unflagged report ahead of the flagged ones.
create index on barrier_reports (flagged_at desc nulls last, created_at desc);
-- Duplicate prevention the database enforces. A server-side select-then-insert check
-- loses the race when two requests from the same reporter arrive together, and S7's
-- completion criterion states flatly that the second one is rejected (§5.2).
create unique index on barrier_reports (reporter_id, poi_slug, category, created_day);

alter table admin_users     enable row level security;
alter table barrier_reports enable row level security;

create policy "admin self read" on admin_users for select to authenticated
  using (user_id = (select auth.uid()));
-- No write policy on admin_users: an admin is added by hand with service_role (§5.1).

create policy "reports insert own" on barrier_reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- The comment model: anything not hidden is readable without signing in.
create policy "reports public read visible" on barrier_reports for select to anon, authenticated
  using (not is_hidden);

-- Permissive policies are OR-ed, so this one keeps a hidden report visible to its own
-- author while hiding it from everyone else — the author can see why it disappeared
-- (S8 rule 2).
create policy "reports owner reads own" on barrier_reports for select to authenticated
  using ((select auth.uid()) = reporter_id);

create policy "reports admin reads all" on barrier_reports for select to authenticated
  using ((select public.is_admin()));
create policy "reports admin hides" on barrier_reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Flagging cannot be a plain UPDATE by an ordinary user: any update policy wide
-- enough to set flagged_at also lets the caller rewrite detail, is_hidden and the
-- moderation columns. One security definer RPC is the narrow alternative.
--
-- Returning void is deliberate: the caller cannot tell whether the report was
-- already flagged, and has no reason to know.
--
-- authenticated only, not anon. Posting a report already requires an anonymous
-- session, so letting flagging happen without one was the inconsistency; and a caller
-- with no session at all can flag every report in the table, which does more damage
-- than flattening a sort. The admin list shows 200 rows with no pagination and orders
-- flagged first, so once the flagged set passes 200 the default screen holds nothing
-- else — measured at 264 flagged rows, the first unflagged report has no position at
-- all. The operator stops seeing new reports.
--
-- Nothing changes for a visitor: the flag button creates the same anonymous session
-- the report form creates, and no sign-up exists in either path.
create or replace function flag_report(target uuid)
returns void language sql security definer set search_path = '' as $$
  update public.barrier_reports
     set flagged_at = coalesce(flagged_at, now())
   where id = target and not is_hidden;
$$;
revoke all on function public.flag_report(uuid) from public, anon;
grant execute on function public.flag_report(uuid) to authenticated;

-- Table and column privileges, because RLS alone cannot say WHICH columns a caller
-- may write — nor anything at all about the statements that are not row operations.
--
-- The insert policy above only proves the row belongs to the caller. created_at is a
-- plain writable column and created_day is generated from it, so a caller who sets
-- created_at to an arbitrary date lands a different created_day and walks straight
-- past the one-report-per-day unique index — N dates, N public reports for one
-- (place, category). The same gap let an insert pre-set flagged_at, hidden_reason and
-- hidden_by. Measured on Postgres 17.11 with the grant block removed: one caller
-- landed four public reports for one (place, category), one of them pre-flagged.
--
-- `revoke all` then grant back, rather than naming the privileges to remove:
--
--   * TRUNCATE is not a row operation, so no policy is consulted before it empties
--     the table. Measured: `authenticated` truncated an RLS-enabled table with no
--     write policy and left it at zero rows.
--   * Postgres 17 added MAINTAIN to `grant all` — VACUUM FULL, CLUSTER, REINDEX and
--     LOCK, each taking an ACCESS EXCLUSIVE lock that blocks every reader, and RLS
--     sees none of them. An enumerated revoke written before 17 left it behind, and
--     the next version can add another privilege the same way.
--
-- Neither role can open a SQL session (both are NOLOGIN) and PostgREST has no verb
-- for TRUNCATE or VACUUM, so this is defence in depth. It is here so that fact is a
-- property of the schema rather than a property of the client in front of it.
--
-- Supabase grants ALL on new tables in public to anon and authenticated, so the grant
-- has to be narrowed explicitly rather than merely not widened. service_role is not
-- named, so ingest and createAdminClient() keep everything.
--
-- ORDER MATTERS, and it fails silently. `revoke all on <table>` also drops every
-- COLUMN grant on that table, so the grants below must stay after the revokes above —
-- and a later migration that adds its own belt-and-braces `revoke all on
-- barrier_reports` would wipe all nine column grants and break the report form with
-- nothing here to warn it. Measured: running the revoke a second time leaves 0
-- surviving column grants and the S7 insert answers `permission denied for table`.
revoke all on barrier_reports from anon, authenticated;
revoke all on admin_users     from anon, authenticated;

-- Which ROWS the select policies decide; which COLUMNS this does. A table-wide
-- SELECT is what PostgREST publishes, so `?select=*` with the anon key returned every
-- column of every visible row — including reporter_id, the per-visitor anonymous
-- identifier that lets a caller group every report back to one session, and
-- flagged_at, whose whole design is that a caller cannot learn whether a report was
-- already flagged (see flag_report above and src/app/api/reports/route.ts).
--
-- ORDER BY, WHERE and RETURNING all need SELECT on the column too, so this grant is
-- also the list of columns a query may sort on, filter on, or read back. anon gets
-- six: id, poi_slug, category, occurred_on, detail, created_at.
--
-- Two natural edits that would trip it, neither of which anything does today:
--   * a belt-and-braces `?is_hidden=eq.false` on the public client — `permission
--     denied`, and unnecessary, because the row filter is RLS's job and it is doing it
--   * a bare `.select()` appended to the insert in src/app/api/report/route.ts to get
--     the new row's id back. supabase-js currently sends Prefer: return=minimal and
--     PostgREST emits no RETURNING, so it is safe; `.select()` asks for the WHOLE row
--     and 403s on reporter_id. `.select('id')` is the form that works.
--
-- These are the exact column lists the two read paths name:
--   anon          -> src/app/api/reports/route.ts
--   authenticated -> src/app/(admin)/admin/reports/page.tsx, plus the author's own
--                    hidden row, where hidden_reason is how they learn why it went
--   reporter_id   -> written only (src/app/api/report/route.ts), read by nobody
--
-- RLS is unaffected: a policy expression is not subject to the caller's column
-- privileges, so `not is_hidden` still filters for a caller who cannot select
-- is_hidden. Measured — anon sees 1 of 2 rows while `select is_hidden` is refused.
grant select (id, poi_slug, category, occurred_on, detail, created_at)
  on barrier_reports to anon;
grant select (id, poi_slug, category, occurred_on, detail, created_at,
              flagged_at, is_hidden, hidden_reason)
  on barrier_reports to authenticated;

-- Exactly the S7 form's fields. id, reporter_id's default, created_at, created_day
-- and every moderation column are the database's to fill.
grant insert (reporter_id, poi_slug, category, occurred_on, detail)
  on barrier_reports to authenticated;

-- The four moderation columns and nothing else. RLS still restricts this to admins;
-- this stops an admin from silently rewriting the text of a visitor's report, which
-- is a different power from hiding it. flagged_at is deliberately absent — once
-- flagged, a report stays flagged (07_screens.md S8).
grant update (is_hidden, hidden_reason, hidden_by, hidden_at)
  on barrier_reports to authenticated;

-- Only the owner reads their own membership row, and only when signed in. anon needs
-- no privilege here at all: its policies never reference this table, and is_admin()
-- is security definer so it does not read it as the caller.
grant select on admin_users to authenticated;
