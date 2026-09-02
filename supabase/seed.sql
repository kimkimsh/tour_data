-- Demo data for `supabase db reset`.
--
-- docs/spec/12_judging_and_demo.md §3 item 3 asks for three example reports sitting
-- on /admin/reports when a reviewer opens the link alone. These are those three, and
-- they are also what S3 section ⑨ shows for the two POIs they belong to.
--
-- reporter_id is a fixed literal uuid, not a real auth.users row. barrier_reports has
-- no foreign key into the auth schema, so seeding needs no sign-up — and nothing in
-- the app can authenticate as this reporter, which is what keeps the rows props
-- rather than a live account.
--
-- created_at is relative to now() so a reset months from now still produces a
-- plausible list. All three rows carry the same reporter_id, so the distinct poi_slug
-- values are what satisfies the (reporter_id, poi_slug, category, created_day) unique
-- index (docs/spec/04_data_model.md §5.2).
--
-- data_snapshots is not seeded. `pnpm ingest` writes it, and a hand-written snapshot
-- would be an unsourced fact — exactly what the source/checkedAt rules exist to stop.

insert into barrier_reports
  (reporter_id, poi_slug, category, occurred_on, detail, flagged_at, created_at)
values
  -- Flagged, so S8's default order (flagged first, then newest) has something to show.
  ('00000000-0000-4000-8000-000000000001', 'gongsanseong', 'construction',
   (now() - interval '3 days')::date,
   '동문 쪽 계단 보수 공사로 통행이 막혀 있습니다',
   now() - interval '1 day',
   now() - interval '2 days'),

  ('00000000-0000-4000-8000-000000000001', 'buyeo-national-museum', 'restroom_closed',
   (now() - interval '5 days')::date,
   '1층 장애인 화장실이 청소 중이라 오후 내내 잠겨 있었습니다',
   null,
   now() - interval '4 days');

-- Hidden row, so the S8 hide/unhide path and the "author still sees their own hidden
-- report" policy can both be demonstrated. hidden_by is another literal uuid with no
-- auth.users row behind it, for the same reason as reporter_id above.
insert into barrier_reports
  (reporter_id, poi_slug, category, occurred_on, detail,
   is_hidden, hidden_reason, hidden_by, hidden_at, created_at)
values
  ('00000000-0000-4000-8000-000000000001', 'jeongnimsaji', 'other',
   (now() - interval '7 days')::date,
   '안내 직원 이름과 연락처를 그대로 적은 항의 글입니다',
   true, '개인정보 포함',
   '00000000-0000-4000-8000-0000000000ad',
   now() - interval '5 days',
   now() - interval '6 days');

-- No admin_users row is seeded. The uuid has to come from a real auth.users row, and
-- that row only exists after someone signs in on the deployed site
-- (docs/spec/04_data_model.md §5.1). Sign in once, then run:
--
--   insert into admin_users (user_id, email)
--   values ('<uuid from auth.users>', '<email>');
