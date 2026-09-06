# 05 — 실제로 돌린 것과 그 출력

> **안 돌린 것을 통과했다고 쓰지 않는다.** 이 문서의 절반은 「검증되지 않은 것」이고, 그게 이 문서의 목적이다.

---

## 1. 돌렸고 통과한 것

| 명령 | 출력 |
|---|---|
| `pnpm typecheck` | 오류 0. TypeScript 5.9.3, `strict: true`, `noUncheckedIndexedAccess: true` |
| `pnpm lint` | 문제 0. ESLint 9.39.5 + `eslint-config-next` 16.3.4 flat config |
| `pnpm test` | **119 통과 / 6 파일.** 골든 27 + 성질 8 + 카탈로그 불변식 3 + KTO 필드명 미러 3 + 산식 성질 단정 19 + **`resolveStatus` 실문장 42** + **메시지 파일 대칭 5** + **기상특보 문구 파서 16** (Layer C 4건은 규칙과 함께 삭제) |
| `pnpm exec tsx scripts/check-contrast.ts` | `contrast check passed: 58 pairs, 36 tokens mirrored` |
| `pnpm build:fixtures` | 성공. 전 라우트가 `● (SSG)` 또는 `ƒ (Dynamic)`로 나온다 — 스냅샷 라우트에 `force-dynamic`이 없다 |
| `pnpm e2e` | **24 통과.** axe 17경로 + 포커스 4 + 골든 플로우 3 |

> **`pnpm build`가 아니라 `pnpm build:fixtures`다.** `src/lib/data.ts`가 프로덕션 빌드에서 `content/generated/*.json`을 서브하기를 거부하고, `MODU_DATA_SOURCE=fixtures`로 **명시**해야만 내려준다. 플레인 `pnpm build`는 Supabase 없이 돌리면 모든 스냅샷 라우트를 오류 화면으로 프리렌더한다 — 그게 의도다([`03_deviations.md`](./03_deviations.md) D-14).

### 라우트별 렌더 방식 (`pnpm build:fixtures` 출력)

`● (SSG)` — `/ko`, `/en`, `/{locale}/places`, `/{locale}/courses`, `/{locale}/gap-report`, `/{locale}/diary`, `/{locale}/diary/print`, `/{locale}/credits`, `/{locale}/privacy`, `/{locale}/places/[slug]`(+ `/route-guide`, `/docent`)
`ƒ (Dynamic)` — `/{locale}/report`, `/admin/reports`, API 라우트 8개

`[slug]` 라우트는 `generateStaticParams()`가 빈 배열을 돌려주므로 빌드가 DB를 읽지 않고, 첫 요청에서 렌더된 뒤 `revalidate = 3600` 동안 캐시된다 — `02_stack.md` §5가 의도한 동작이다.

---

## 2. 일부러 깨뜨려 빨간불을 확인한 것

**켜 두고 통과만 하는 검사는 없는 것보다 나쁘다.** 각 검사가 오늘 데이터에서 실제로 실패할 수 있는지 확인했다.

### 2.1 대비율 검사

```
$ sed -i 's/"ink-2": "#595959"/"ink-2": "#9A9A9A"/' src/styles/tokens.json
$ pnpm exec tsx scripts/check-contrast.ts
contrast check failed:
  - light: ink-2 (#9A9A9A) on paper (#FFFFFF) is 2.81:1, needs 4.5:1 — secondary text
  - light: ink-2 (#9A9A9A) on surface (#F5F4F1) is 2.55:1, needs 4.5:1 — secondary text on a card
  - light: --color-ink-2 is #595959 in globals.css but #9A9A9A in tokens.json
exit=1
```

### 2.2 토큰 미러 검사

```
$ sed -i 's/"gilt": "#8A6100"/"gilt": "#8A6101"/' src/styles/tokens.json
$ pnpm exec tsx scripts/check-contrast.ts
contrast check failed:
  - light: --color-gilt is #8A6100 in globals.css but #8A6101 in tokens.json
exit=1
```

두 경우 모두 원래 값으로 되돌린 뒤 다시 통과를 확인했다.

### 2.3 무장애 필드명 미러 검사

```
$ sed -i "s/ktoField: 'braileblock'/ktoField: 'brailleblock'/" src/domain/capabilities.ts
$ pnpm exec vitest run src/lib/kto/field-names.test.ts
× the schema and the catalogue name the same 28 fields
Tests  1 failed | 2 passed (3)
```

`l`을 하나 더 넣은 것 — 실제로 일어날 수 있는 오타이고, 그대로면 그 항목이 **영원히 빈 채로** 남는다. 화면에는 「정보 없음」으로 보이므로 버그처럼 보이지도 않는다.

---

## 3. 실측한 것 — 실제 호출로 확인

### 3.1 오퍼레이션 이름 (유효하지 않은 키로)

게이트웨이가 키 검증보다 경로 해석을 먼저 하므로, 존재하지 않는 오퍼레이션은 `12`, 존재하는 오퍼레이션은 `30`을 돌려준다. 대조군 포함해 각 이름을 두 번씩 호출했다.

| 호출 | resultCode | 판정 |
|---|---|---|
| `KorService2/definitelyNotAnOperation` | 12 | 대조군 — 없는 이름 |
| `KorService2/ldongCode2` | 30 | 대조군 — 있는 이름 |
| `TatsCnctrRateService/tatsCnctrRateList` | **12** | **없다** (스펙이 고른 쪽) |
| `TatsCnctrRateService/tatsCnctrRatedList` | **30** | **있다** |
| `Odii/themeBaseSyncdList` | 12 | 없다 |
| `Odii/themeBasedSyncList` | **30** | 있다 |
| `TarRlteTarService1/AreaBasedList1` | 12 | 없다 (대소문자 구분) |
| `TarRlteTarService1/areaBasedList1` | 30 | 있다 |
| `TarRlteTarService1/searchKeyword1` | 30 | 있다 |
| `TarRlteTarService/searchKeyword1` · `TarRlteTarService1/searchKeyword` · `TarRlteTarService/searchKeyword` | 12 | 셋 다 없다 |
| `KorService2/areaCode2` · `categoryCode2` | 30 | **아직 살아 있다** — 폐기는 호출로 감지되지 않는다 |

### 3.2 에러 봉투

```json
{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{
  "errMsg":"SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
  "returnAuthMsg":"등록되지 않은 서비스키",
  "returnReasonCode":"30"}}}
```
HTTP 403, **JSON**. 스펙은 "언제나 XML"이라고 단언했다 → [`02_spec_corrections.md`](./02_spec_corrections.md) C.

### 3.3 Postgres 17에서 마이그레이션과 RLS

`postgres:17-alpine`(17.11)을 띄우고 Supabase 역할 3개와 `auth.uid()`를 스텁으로 만든 뒤 마이그레이션 2개와 시드를 적용해 15가지 동작을 확인했다.

| 확인 | 결과 |
|---|---|
| `timezone(text, timestamptz)`의 volatility | `pg_proc.provolatile = 'i'` — IMMUTABLE. 생성 열에 쓸 수 있다 |
| 관리자 목록 정렬 인덱스가 실제로 쓰이나 | `explain`에 `Index Scan using barrier_reports_expr_created_at_idx` — sort 없음, seq scan 없음. **단, 그 식이 화면이 보내는 정렬과 달랐다** — 3라운드에서 잡혀 인덱스를 바꿨다(§3.5) |
| 같은 날 두 번째 제보 | `unique_violation` |
| `flag_report()` 두 번째 호출 | `flagged_at` 바이트 단위로 동일. 숨겨진 제보는 신고되지 않는다. `anon`도 호출할 수 있다 |
| RLS — `anon` | 3행 중 2행 |
| RLS — 작성자 본인 | 3행 (자기 숨김 글 포함) |
| RLS — 다른 로그인 사용자 | 2행, `admin_users` 0행 |
| RLS — 관리자 | 3행 + 숨김 처리 가능 |
| `anon`·비관리자의 UPDATE | `UPDATE 0` |
| `anon`이 `is_admin()` 호출 | `insufficient_privilege` |
| `detail` 501자 | `check` 제약이 거부 |

**그리고 스펙의 서술 하나가 거꾸로임을 실측했다** — UTC 창은 한국 시간 자정이 아니라 **오전 9시**에 넘어간다 → [`02_spec_corrections.md`](./02_spec_corrections.md) P.

### 3.4 컬럼 단위 권한 — 대조군까지 실측

`002_reports.sql` 말미에 넣은 `revoke insert, update` + 컬럼 grant 블록을 Postgres 17.11에서 확인했다. Supabase 기본 권한(`alter default privileges … grant all on tables to postgres, anon, authenticated, service_role`)을 **테이블 생성 전에** 재현했다 — 이걸 빼면 회수할 것이 없어서 검사가 아무것도 증명하지 못한다.

**대조군(grant 블록을 지운 DB)에서 구멍이 실재함을 확인했다.** 같은 `authenticated` 호출자가 `created_at`을 직접 넣어 하루 1건 unique 인덱스를 우회하고 같은 (관광지, 분류)에 공개 제보 4건을 만들었으며, 그중 하나는 `flagged_at`과 `hidden_reason`까지 스스로 세팅했다.

| 확인 | 블록 적용 후 |
|---|---|
| 5컬럼 정상 insert | `INSERT 0 1` |
| `created_at`을 넣은 insert | `ERROR: permission denied for table barrier_reports` |
| `flagged_at`·`is_hidden`·`hidden_reason`·`hidden_by`·`hidden_at` 각각 | 5건 전부 `permission denied` |
| 같은 날 두 번째 제보 | `duplicate key … barrier_reports_reporter_id_poi_slug_category_created_day_idx`, sqlstate `23505` |
| 관리자의 4컬럼 update | `UPDATE 1`, `returning id` 1행. 숨김 해제 분기도 `UPDATE 1` |
| 관리자가 `detail` 수정 | `ERROR: permission denied` — 숨기는 권한과 본문을 고치는 권한은 다르다 |
| 비관리자의 `is_hidden` update | `(0 rows)` / `UPDATE 0` — 권한 오류가 아니라 RLS가 거부 |
| `anon`의 읽기 | 숨김 아닌 1행, 숨김 0행 |
| `anon`의 `flag_report` | 정상. 두 번째 호출에서 `flagged_at` 바이트 동일 |
| `service_role` | `arwdDxtm` 유지. insert/update/delete 전부 통과 — 회수 대상에 없다 |

`created_at = 2026-09-01 21:30:05+00`인 행의 `created_day`가 `2026-09-02`로 나왔다. Asia/Seoul 시프트가 살아 있다는 뜻이고, 열 주석이 논거로 든 「밤늦게 올린 제보」 경우 그 자체다.

**추가로 회수한 것:** `TRUNCATE`는 행 연산이 아니어서 RLS가 개입하지 않는다. `authenticated`로 `truncate admin_users`를 실행하면 (롤백한 트랜잭션 안에서) 관리자 명단이 전부 지워졌다. PostgREST에 TRUNCATE 동사가 없고 두 역할 모두 `NOLOGIN`이라 API 키로는 닿지 않지만, 그 사실이 클라이언트의 성질이 아니라 스키마의 성질이 되도록 `truncate, trigger, references`를 두 테이블에서 회수했고 `data_snapshots`는 읽기 전용으로 좁혔다.

`supabase/seed.sql`은 `flagged_at`·`created_at`·`is_hidden` 등 회수된 컬럼 6개를 쓴다. `supabase db reset`이 이 파일을 슈퍼유저 `postgres`로 실행하므로 깨지지 않지만, **이제 영구히 슈퍼유저 전용**이다.

### 3.5 정렬 인덱스가 화면의 질의를 실제로 서비스하나 — 아니었다

1라운드가 `Index Scan using barrier_reports_expr_created_at_idx`를 확인했는데, **그때 실행한 정렬이 화면이 보내는 정렬이 아니었다.**

- 인덱스 식: `(flagged_at is not null) desc, created_at desc`
- `page.tsx`가 보내는 것: `flagged_at desc nulls last, created_at desc`

프로즈로는 둘 다 「신고된 것 먼저, 그다음 최신순」인데 **다른 정렬이다** — 앞은 신고된 묶음을 등록일로, 뒤는 신고 시각으로 정렬한다. 5005행을 넣고 `ANALYZE` 후 실측:

```
인덱스가 만들어진 정렬        → Index Scan using barrier_reports_expr_created_at_idx  (Sort 없음)
page.tsx:83 이 보내는 정렬    → Sort (flagged_at DESC NULLS LAST, created_at DESC) → Seq Scan
page.tsx:84 이 보내는 정렬    → Sort (created_at DESC) → Seq Scan
view=flagged                  → Sort → Bitmap Heap Scan → Bitmap Index Scan
                                  Index Cond: ((flagged_at IS NOT NULL) = true)
```

**즉 인덱스는 신고만 보기 뷰의 비트맵 조건으로만 값을 하고 있었고, sort를 한 번도 없애지 않았다.** 주석은 「Admin default order」라고 주장했다.

인덱스를 화면이 보내는 식으로 바꿨다 — `(flagged_at desc nulls last, created_at desc)`. 화면의 정렬(신고 시각 순)이 운영자에게 더 유용하다고 판단했으므로 질의가 아니라 인덱스를 옮겼다. `nulls last`는 장식이 아니다: 내림차순 btree에서 null이 먼저 오므로 빼면 신고되지 않은 제보가 전부 앞에 온다.

**바꾼 뒤 다시 실측했다.** 5003행(신고 264건, 숨김 385건, `flagged_at` 값을 264개로 흩뜨리고 신고 시각과 등록일의 상관을 일부러 끊었다):

```
$ explain (analyze, buffers)  -- page.tsx:83 그대로, 관리자로, 정책을 통과해서
 Limit (actual rows=200 loops=1)
   Buffers: shared hit=204
   ->  Index Scan using barrier_reports_flagged_at_created_at_idx (actual rows=200 loops=1)
         Filter: ((NOT is_hidden) OR ((InitPlan 1).col1 = reporter_id) OR (InitPlan 2).col1)
```

**Sort 없음, 그리고 `actual rows=200`** — 상한에서 멈추고 남은 4803행을 보지 않는다. 바꾸기 전 같은 질의는 `Sort → Seq Scan`이었다.

**그리고 이건 기본 화면이다.** `page.tsx:32`가 `rawSort === 'recent' ? 'recent' : 'flagged'`이므로 `flagged`가 기본이고 `?sort=recent`가 선택이다 — 부차 경로가 아니라 주 경로를 고쳤다.

**순서 자체도 확인했다.** 플랜이 깨끗해 보이면서 순서가 틀리는 경우가 있으므로 기계로 검사했다:

```
last_flagged_pos=200  first_unflagged_pos=NULL  flagged_in_top_200=200
  → 신고된 행이 전부 신고되지 않은 행보다 앞선다
  → 신고 묶음이 flagged_at 내림차순으로 엄격히 정렬 (264건 전체에서 역순 쌍 0개)
```

**`nulls last`를 빼면 실제로 깨진다.** Postgres 기본값(`flagged_at desc`, nulls first)으로 같은 질의를 돌리면 **신고되지 않은 행 6개가 운영자 화면 맨 위에 온다.** 장식이 아니라 하중을 받는 부분이다.

`sort=recent`(`created_at desc` 단독)는 여전히 seq scan + sort다. 200행 상한이고 공모전 규모 테이블이므로 인덱스를 더 만들지 않았다.

`view=flagged`는 인덱스가 **`Index Cond: (flagged_at IS NOT NULL)`**으로 범위를 좁히지만 플래너가 비트맵을 골라 순서를 버리고 264행을 정렬한다. 강제로 정렬된 인덱스 스캔을 켜 보니 존재하고(`cost=0.56..240.86`, `hit=204`), 플래너의 선택이 옳다(비트맵+정렬 `cost=97.05..97.55`, `hit=129`, quicksort 43kB). 신고된 집합이 상한 대비 커지면 뒤집힌다.

**컬럼 grant는 원인이 아니다.** 같은 역할·같은 정책에서 grant만 바꿔 플랜을 두 번 떠 비교했고 **바이트 단위로 동일**했다.

### 3.6 브라우저에서 확인한 것 (여행 기록 화면)

- 관광지를 담으면 라이브 리전이 `담았습니다 — 공산성 · 담은 관광지 1곳`을 읽고, `localStorage`의 `modu-baekje.diary.v1`에 `{"schemaVersion":1,…}`이 들어가며, 페이지를 옮겨도 살아남는다
- 인쇄 페이지가 표지 → 관광지 절(사진 `alt="공산성 사진"`, 정의 목록, 경로 단계 표) → 출처 목록 순으로 렌더되고, 헤더·내비·스킵링크·긴급 버튼·푸터가 **하나도 없다**
- 인쇄 페이지의 모든 조상 요소가 `overflow: visible`이고 고정 높이가 없다 — 인쇄물이 1페이지에서 잘리는 가장 흔한 원인
- `POST /api/export/gpx` → 200, `application/gpx+xml`, `filename*=UTF-8''` 포함, `wpt`와 `trkpt`를 갖춘 유효한 GPX
- `POST /api/export/text` → 스냅샷 없으면 **503** `snapshot unavailable — pois: no fixture file`, 있으면 200에 `--- 출처 ---` 포함. 잘못된 본문 → 400 + `z.prettifyError` 출력

---

## 4. 돌리지 않은 것 — 검증되지 않은 것

**여기가 이 문서의 본론이다.**

### 4.1 한국관광공사 API 탐침 — P0 11건 전부 미실행

`KTO_SERVICE_KEY_DECODING`이 없다. `scripts/probe.ts`는 완성돼 있고 키 없이 실행하면 명확한 메시지와 함께 종료 코드 1로 죽는다(조용히 통과하지 않는다).

**따라서 확인되지 않은 것:**

| 항목 | 확인 안 된 것 |
|---|---|
| **P0-1 ★★★** | 6곳이 무장애여행 데이터셋에 등록돼 있는지, 24항목 중 몇 개가 채워져 있는지. **프로젝트의 형태가 이 답에 달려 있다** |
| P0-3 | Odii에 6곳 콘텐츠가 있는지. 없으면 도슨트 화면이 빈다 |
| P0-4 | Odii `langCode`의 실제 허용값 |
| P0-5 | 집중률 데이터에 우리 관광지 이름이 있는지, `cnctrRate`의 실제 값 범위. **`crowd_forecast`의 40/70 경계가 아직 가정 위에 있다** |
| P0-10 | `contentId`가 국문/다국어에서 같은 값인지. 수집 설계가 여기에 전면 의존한다 |
| P0-11 | 무장애 목록 조회로 6곳을 찾을 수 있는지. `resultCode 03`을 「미등록」으로 읽을 근거가 이것뿐이다 |

### 4.2 수집 파이프라인 미실행

`pnpm ingest`를 한 번도 돌리지 않았다. 코드는 완성됐고 타입체크·린트를 통과하지만 **실제 응답을 파싱해 본 적이 없다.**

특히 검증되지 않은 것:
- `resolveStatus()`가 실제 한국관광공사 문장 144개(6곳 × 24항목)를 어떻게 판정하는지 — `11_open_items.md` **O-1**이 1주차 작업으로 잡아 둔 것
- `readThemeCoord()`가 `themeBasedList` 응답에서 좌표를 읽어낼 수 있는지. **매뉴얼에 그 오퍼레이션의 좌표 필드가 문서화돼 있지 않다** — 도슨트 경로의 가장 큰 위험이다
- 이미지 URL의 `http` → `https` 치환이 실제로 열리는지 (`11_open_items.md` O-3)

### 4.3 Supabase 미연결

프로젝트가 없다. 그래서 **화면 위에서** 검증되지 않은 것:
- 제보 등록 → 즉시 공개 (완료 기준 D-6)
- 관리자 숨김 → 다른 사용자 화면에서 사라짐
- 익명 인증이 실제로 켜져 있는지 (대시보드와 `config.toml` 양쪽에서 따로 켜야 한다)
- 캐시 무효화가 실제로 몇 초 안에 반영되는지

**그리고 제보 흐름에는 자동 검사가 하나도 없다.** 골든 플로우 스펙(`tests/e2e/golden-flow.spec.ts`)을 다시 읽어 확인했다 — 조건 고르기 → 목록 → 상세 → 근거 → 경로 → 갭 리포트까지만 있고 `/ko/report`로 제출하는 단계가 없다. axe가 `/ko/report`를 훑기는 하지만 그건 폼이 접근 가능한지만 본다.

**「막힌 검사가 실패하는 중」이 아니라 「검사가 없다」가 정확한 상태다.** 앞의 두 문장은 검사 하나가 DB를 기다리며 빨간불로 서 있다는 뜻이었는데, 실제로는 그 검사를 쓰지 않았다. DB 없이는 통과할 수 없는 검사이므로 지금 쓸 수도 없다 — Supabase 프로젝트가 생기는 날 §5의 순서 8번에서 함께 써야 한다.

### 4.4 E2E와 axe 스캔 — 돌렸다. 남은 것은 제보 단계뿐

`pnpm exec playwright install chromium` 후 `pnpm e2e`를 돌렸다. **24개 전부 통과.**

```
$ pnpm e2e
Running 24 tests using 1 worker
  ✓ no axe violations on /ko … /admin/reports        (17경로)
  ✓ the skip link is the first tab stop and actually moves focus
  ✓ the second skip link moves focus into the navigation
  ✓ a route change moves focus into the new page
  ✓ the emergency dialog traps focus and returns it to its trigger
  ✓ a visitor can reach a verdict, its basis, a route and the gap report
  ✓ changing the conditions changes the order and the labels
  ✓ the route guide states its evidence level before any step
  24 passed (47.9s)
```

스캔 대상을 스펙 §1.3의 6경로에서 **17경로로 늘렸다.** 늘린 11개는 `/en` 4개(한국어 문장이 `lang="en"` 아래 놓이는 결함이 잡히는 곳), `/ko/courses`, 도슨트, 여행 기록, 인쇄, 크레딧, 개인정보, `/admin/reports`다. 그리고 **스캔 전에 페이지의 모든 `<details>`를 연다** — axe는 닫힌 disclosure 안으로 들어가지 않으므로, 이 서비스의 논거 그 자체인 계산 표가 한 번도 스캔되지 않고 있었다.

**첫 실행에서 실제 결함 2건이 잡혔다** — 검사가 오늘 실패할 수 있다는 증거다:

```
MISSING_MESSAGE: place.reportsLoading (ko)
```
새로 넣은 라이브 리전 문구를 `places` 네임스페이스에 넣었는데 `ReportsSection`은 `place`를 쓴다. 서버 로그에만 나오고 화면은 키 이름을 그대로 보여준다.

```
strict mode violation: getByRole('heading', { name: /휴식/ }) resolved to 2 elements
```
`휴식` 축 제목과 `휴식 좌석` 항목 제목이 둘 다 heading이다. 이름 정규식이 아니라 축 섹션의 id(`#axis-rest-heading`)로 고쳤다.

**여전히 검증되지 않은 것:**
- 브라우저가 `apis.data.go.kr`을 부르지 않는다는 것 (구조로는 ESLint가 막지만, **세어 본 적은 없다**)
- `navigator.geolocation`이 0건이라는 것 — **위치정보법 논거가 이 검사에 걸려 있다**
- **제보 제출 자체.** 그 단계를 시험하는 E2E가 없다(§4.3)

### 4.5 NVDA 수동 검증 미실시

`08_accessibility_legal.md` §1.4의 과업 A·B·C를 하지 않았다. Windows가 필요하다. **axe는 33개 검사항목의 30~50%만 잡는다** — 화면과 발표에 「자체 점검」이라고만 쓰는 이유가 이것이다.

### 4.6 콘텐츠 검증은 지금 빨간불이다

```
$ pnpm validate:content
content validation failed:
  - pois.json: N place(s) still carry ktoContentId "UNRESOLVED"
    Run `pnpm probe` (P0-1) with a KTO service key, then copy the confirmed ids in.
```

**의도된 실패다.** 확인되지 않은 `contentId`로 배포하면 조용히 다른 관광지의 무장애 데이터를 수집한다. `11_open_items.md` P0-1이 이전 기획 문서에 서로 다른 세 세트가 있었다고 경고했고, 그중 어느 것도 쓰지 않았다.

이 검사가 CI에 들어 있으므로 **CI도 지금 빨간불이다.** 그게 프로젝트의 현재 상태에 대한 정확한 보고다.

---

## 5. 빨간불을 확인한 것 — 2차분

[`06_review_round.md`](./06_review_round.md)에서 고친 것 가운데 새로 검사가 붙은 항목은 **그 검사가 오늘 실패할 수 있는지** 확인했다.

### 5.1 두 번째 스킵 링크

```
$ # src/components/SiteHeader.tsx 의 nav 에서 tabIndex={-1} 을 임시로 제거
$ pnpm e2e tests/e2e/focus.spec.ts
  ✘ 2 the second skip link moves focus into the navigation
    Expected: "primary-nav"
    Received: ""
  1 failed / 3 passed
```

파일을 미리 복사해 두고 그 복사본에서 되돌린 뒤 4개 전부 통과를 다시 확인했다. **이 결함은 원래 있었고**, 검사가 없어서 남아 있었다 — 기존 `focus.spec.ts`는 잘 동작하는 링크 하나만 시험했다.

### 5.2 메시지 파일 대칭

```
$ # messages/en.json 에서 place.reportsLoading 을 지우고 place.score 의 자리표시자를 {value} 로 바꿈
$ pnpm vitest run src/i18n/messages.test.ts
× hold the same keys
    AssertionError: expected [ 'place.reportsLoading' ] to deeply equal []
× use the same placeholders in both languages
    AssertionError: place.score: ko score / en value
  Tests  2 failed | 3 passed (5)
```

**이 검사가 없어서 실제 결함이 있었다.** 새로 넣은 라이브 리전 문구를 `places`에 넣었는데 컴포넌트는 `place`를 읽었고, next-intl은 던지지 않고 서버 로그에 `MISSING_MESSAGE`만 남기며 화면에는 **키 이름을 그대로 찍는다.** E2E 첫 실행의 서버 로그에서 잡혔다(§4.4). 자리표시자 검사도 같은 이유다 — `{score}`와 `{value}`가 갈리면 숫자가 사라지고 `{score}`가 글자로 나온다.

파일을 미리 복사해 두고 그 복사본에서 되돌렸다.

### 5.3 `resolveStatus` 42건

새 테스트 파일 자체가 빨간불 확인이다. 고치기 전 함수에 넣으면 다음이 전부 실패한다: `계단만 있음` → `supported`(기대 `unsupported`), `엘리베이터 없음` → `unknown`(기대 `unsupported`), `휠체어 대여 없음` → `supported`, `보조견 동반 불가` → `unknown`, `일부 구간 이용 불가` → `unsupported`(기대 `partial`).

---

## 6. 한 줄 요약

**로직·화면·접근성·DB 권한은 검증됐다. 외부 데이터는 하나도 검증되지 않았다.** 키가 생기는 날 `pnpm probe` → `pnpm ingest` → `pnpm e2e` 순으로 돌리면 4절의 남은 목록이 대부분 닫힌다.
