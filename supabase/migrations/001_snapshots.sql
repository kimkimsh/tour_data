-- data_snapshots — every verified fact, in six jsonb rows.
-- docs/spec/04_data_model.md §3.1
--
-- The payload shape is defined by src/domain/snapshot-schema.ts (Zod), not by SQL.
-- Readers parse on every read, so a broken ingest surfaces as a parse error instead
-- of rendering wrong facts (§2 principle 5).

create table data_snapshots (
  key         text primary key,      -- one of the six keys in §3.2
  payload     jsonb not null,
  row_count   integer not null,      -- eyeball canary: a sudden 0 means ingest broke
  source_note text,
  updated_at  timestamptz not null default now()
);

alter table data_snapshots enable row level security;

create policy "snapshots public read" on data_snapshots
  for select to anon, authenticated using (true);

-- No write policy, and that is the whole access control. Only scripts/ingest.ts
-- writes here, using service_role, which bypasses RLS; an insert or update policy
-- would hand the same write access to anyone holding the anon key.

-- Read only, at the privilege level and not only at the policy level.
--
-- `revoke all` then grant back, rather than naming the privileges to remove. Postgres
-- 17 added MAINTAIN to `grant all` (VACUUM FULL, CLUSTER, REINDEX, LOCK — each takes
-- an ACCESS EXCLUSIVE lock, and RLS sees none of them), and an enumerated revoke
-- written before 17 silently left it behind. The next version can add another one.
-- Revoking everything and granting back exactly what the app uses cannot be outrun
-- that way.
--
-- Supabase grants ALL on new tables in public to anon and authenticated, so this has
-- to be narrowed explicitly rather than merely not widened. Only scripts/ingest.ts
-- writes here, as service_role, which is not named below and keeps its privileges.
revoke all on data_snapshots from anon, authenticated;
grant select on data_snapshots to anon, authenticated;
