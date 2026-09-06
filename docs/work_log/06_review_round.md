# 06 — 검토 라운드: 무엇이 잡혔고 무엇을 고쳤나

> **한 줄:** 구현이 끝난 뒤 두 번의 적대적 검토를 돌렸다. **19건의 정확성 결함과 22건의 접근성·설계 결함이 나왔다.** 그중 최상위 두 개는 각각 「엘리베이터가 없는 곳에 확인된 항목: 엘리베이터를 찍는 것」과 「다크 모드에서 제보 폼의 오류 문구를 읽을 수 없는 것」이었다.
>
> **여기 적힌 것은 전부 고쳤거나, 고치지 않은 이유가 붙어 있다.** 고치지 않은 것은 [`04_open_items.md`](./04_open_items.md)로 넘겼다.

---

## 0. 어떻게 검토했나

두 개의 독립 에이전트를 병렬로 돌렸다.

| 검토 | 대상 | 산출 |
|---|---|---|
| 정확성 | `suitability.ts`·`scoreboard.ts`·`gap.ts`·`resolveStatus()`·`ingest.ts`·`data.ts`·API 라우트 8개·클라이언트 훅·RLS 정책·`content-schema.ts` | S1–S19 |
| 접근성·설계 | 화면 10개·컴포넌트 전부·토큰·인쇄 CSS·E2E 스펙 | A-1–A-22 + 설계 비평 |

그 뒤 마이그레이션 변경을 **실제 Postgres 17.11**에 대고 네 라운드 검증했다(§4). **각 라운드가 앞 라운드의 수정 자체에서 새 결함을 찾았다:**

1. 구멍이 실재함 — 대조군에서 공개 제보 4건을 만들었다
2. 열거식 회수가 PG17에서 샘 — `MAINTAIN`이 남아 `VACUUM FULL`·`CLUSTER`가 통했다
3. 읽기 grant가 테이블 전체임 — `reporter_id`·`flagged_at`이 anon 키로 읽혔다
4. 정렬 인덱스가 화면의 질의를 서비스하지 않음 — 그리고 그건 **기본 화면**이었다

**두 검토 모두 "코드를 읽고 의견을 말하는" 것이 아니라 "실행해서 값을 보고하는" 것을 요구했다.** 그래서 아래 대부분의 항목에 실제 입력과 실제 출력이 붙어 있다.

---

## 1. 최우선 — 판정 자체를 망가뜨린 것

### S1 · S2 · S3 — `resolveStatus()`가 한 함수에서 두 방향으로 틀렸다

`src/domain/capabilities.ts`. **이 함수는 한국어 문장이 기계 판정으로 바뀌는 유일한 지점이고, 하류 전부가 이 값을 상속한다** — 6개 축 평균, `personaFit`, `coverage`, 「대체추천」 규칙, 「정보없음」 과반 규칙, 「주의」 상한, `unknownCriticals`, `confirmedItems`, `ktoUnknownCount`, 갭 리포트의 심각도 열.

**실제 함수를 돌려서 확인한 값:**

| 입력 | 고치기 전 | 맞는 답 |
|---|---|---|
| `계단만 있음` | **`supported`** | `unsupported` |
| `휠체어 대여 없음` | **`supported`** | `unsupported` |
| `엘리베이터 없음` | **`unknown`** | `unsupported` |
| `장애인 화장실 없음` | **`unknown`** | `unsupported` |
| `보조견 동반 불가` | **`unknown`** | `unsupported` |
| `수어 통역 불가` | **`unknown`** | `unsupported` |
| `일부 구간 이용 불가` | **`unsupported`** | `partial` |

**첫 줄이 최악의 경우다.** `elevator`에 `"계단만 있음"`이 들어오고 나머지 P1a 필수 항목이 진짜로 `supported`이면 `calculateSuitability`가 `주의 66점`, **`coverage 1.000`**, **`unknownCriticals []`**를 낸다. 화면에서 벌어지는 일:

- `VerdictPanel.tsx`가 `확인된 항목: … 엘리베이터`를 찍는다 — 그 관광지 자신의 문장이 「계단만 있음」이라고 말하는데
- 필수인 `확인 필요:` 블록이 **아예 렌더되지 않는다** — `unknownCriticals`가 비었으므로
- `coverage`가 1.000에 도달해 §6.4의 4b 상한이 꺼진다

더 나쁜 변형: P1a 필수 5개가 모두 그런 문장이면 `주의 44점`, blockers `[]`, unknownCriticals `[]`. **필수 시설 전부가 없는데 확인할 것이 하나도 없다고 말한다.**

**두 방향의 비용은 대칭이 아니다.** 검토자의 정리를 그대로 옮긴다:

> `단차 없음` → `unsupported`는 갈 수 있는 곳에 「다른 곳 권장」을 붙인다: 방문자는 갈 수 있었던 여행을 놓치고, **화면에 원문이 있으므로 스스로 뒤집을 수 있다.** `엘리베이터 없음` → `unknown`은 확인된 장벽에 「주의 필요 · 확인 필요: 엘리베이터」를 붙인다 — 방문자는 상태가 **미해결**이라고 듣고, 확인하러 가서, 들어갈 수 없다.

**고친 방식:** 부정어의 극성을 문장 전체가 아니라 **명사 옆 8자 안에서** 읽는다.

```ts
const BARRIER_NOUN = /(단차|문턱|계단|장애물|급경사|경사(?!로)|돌길|자갈|비포장|협소|좁음)/g;
```

장애물 명사 옆의 부정은 좋은 소식, 시설 명사 옆의 부정은 나쁜 소식이다. `경사`에 `(?!로)`가 붙은 이유도 같다 — `경사로`는 장애물이 아니라 시설이고, 이걸 놓치면 `출입구까지 경사로가 설치되어 있음`이 뒤집힌다.

`단차 없고 경사로 있음`이 이 구조가 필요한 이유다. 부정어와 긍정어가 한 문장에 다 있고, **어느 명사에 붙었는지만 다르다.** 전역 매칭으로는 어느 쪽으로도 틀린다.

**붙인 검사:** `src/domain/__tests__/resolve-status.test.ts` 42건. 전부 실제 문장 — KTO 응답, 공주시·부여군 편의시설 표, 그리고 위 두 오류가 만든 문장들. **골든 적합도 케이스는 이 단계를 절대 통과하지 않는다** — `suitability.test.ts`는 `status: 'supported'`를 직접 받기 때문에 그 값을 만든 문장을 한 번도 보지 않는다. 검토자가 이 함수를 1순위로 지목한 이유이기도 하다: `tsc`·`eslint`·골든 스위트 어느 것도 볼 수 없는 곳이다.

스펙도 고쳤다 → `docs/spec/05_ingest.md` §4.2.

### A-1 — 다크 모드에서 제보 폼의 오류 문구를 읽을 수 없다

`src/styles/tokens.json`이 배지 색 4개를 **`min: 3.0`, 「페이지 대비 배지 모양」**으로만 검사했다. 그런데 코드는 같은 토큰을 **작은 굵은 글씨의 색**으로 쓴다 — 다크 모드에서 3.08–3.45:1, 필요한 값은 4.5:1.

검토자의 문장이 정확하다:

> 대비 검사는 44쌍을 통과한다. 그런데 **검사하는 쌍이 코드가 렌더하는 쌍이 아니다.**

해당 지점: `ReportForm.tsx`의 모든 폼 오류(3.44), `EmergencyContacts.tsx`(3.44), `EvidenceRow.tsx`의 32항목 상태 단어 전부(3.38–3.45), `VerdictPanel.tsx`(3.38–3.44), `PlaceList.tsx`, `CourseView.tsx`(3.38). `.card` 위에서는 3.08–3.14.

큰 글씨의 3:1 예외는 18.66px 굵은 글씨부터인데 **어느 것도 그에 못 미친다.**

**고친 방식:** 텍스트용 토큰 3개를 새로 만들었다.

```
state-ok   #1B7A2E → 다크 #56C271
state-warn #8A6100 → 다크 #E0AE4A
state-bad  #C0392B → 다크 #F2837A
```

배지 색을 **배경**으로 쓰는 곳은 그대로, **글자 색**으로 쓰던 곳은 전부 `state-*`로 옮겼다. 그리고 `tokens.json.checks`에 `paper`·`surface` 양쪽 6쌍을 `min: 4.5`로 추가했다 — **검사가 코드가 렌더하는 쌍을 덮는다.** 44쌍 → 58쌍.

### A-2 — 영어 경로에서 한국어에 `lang`이 없다

`/en` 아래에서 `<html lang="en">`인 채로 한국어가 나온다. 검토자의 표현: *영어 음성이 한국어를 읽으면 음소 죽이 나온다 — 글자가 아니다.*

| 위치 | 고침 |
|---|---|
| `privacy/page.tsx` 개인정보 처리방침 본문 | `<section lang="ko">` — 한국어본이 법적 효력을 갖는 문서이므로 번역하지 않고 표시만 한다 |
| `credits/page.tsx` 라이선스 표 | `<tbody lang="ko">` |
| `credits/page.tsx` 안전 연락처 | `labelEn`을 쓰고, 출처 주석만 `lang="ko"` |
| `EmergencyContacts.tsx` | `labelEn`을 쓰고, `note`는 `lang="ko"` |
| `gap-report/page.tsx` 상태·원인 열 | `statusLabel(status, locale)`·`absenceLabel(kind, locale)` 신규 |

---

## 2. 정확성 결함 — 나머지

| # | 무엇 | 고침 |
|---|---|---|
| **S4** | 큐레이트 사실 한 줄이 관광지 하나를 갭 리포트에서 통째로 지울 수 있었다. `absenceKind`가 4종 전부를 받았고, `not_registered` 한 줄이면 우선순위 행이 **64 → 32**로 줄고 해당 관광지가 0행이 됐다 | 스키마를 `['intrinsic','operator_missing']`로 좁혔다. 나머지 둘은 **데이터셋에서 유도할 것이고 손으로 주장할 것이 아니다** |
| **S5** | KTO `modifiedtime`이 `YYYYMMDDHHmmss`인데 그대로 저장돼 `Date.parse`가 `NaN`을 냈다. 모든 KTO 항목이 **영구히 「1년 이상」 버킷**에 있었고(신뢰도 최대 25점 저평가), 근거 카드에는 `… · 20260901120000`이 찍혔다 | `ktoTimestampToIsoDate()`로 정규화하고, **스냅샷 스키마를 `z.iso.date()`로 바꿔** 원시 값이 다시 들어올 수 없게 했다 |
| **S5b** | 갭 리포트의 as-of 날짜가 혼합 포맷을 문자열 `>`로 비교했다. `'20260101120000' > '2026-09-02'`가 **참**이다(4번째 자리에서 `'0'`이 `'-'`보다 크다) — 9월 데이터가 있는데 1월이라고 보고했다 | ISO 형태만 비교하도록 모양 검사를 붙였다 |
| **S6** | `validUntil`이 파싱 안 되는 인증에 보너스가 그대로 붙었다. `daysBetween`이 `+Infinity`를 내고 그건 `< 0`이 아니다. `{grade:'bf_excellent', validUntil:'20200101'}` → **6년 전에 만료된 인증으로 +8점** | 파싱 불가를 만료로 취급. 스냅샷 스키마도 `z.iso.date()`로 |
| **S7** | 관광지 화면과 갭 리포트가 KTO 분모에서 어긋났다. 화면은 카탈로그를 채우고 리포트는 있는 행만 셌다. 사실 1건뿐인 관광지: 화면 `24건 중 23건 정보 없음`, 리포트 `ktoTotal 1`. 스냅샷에 없는 관광지는 **리포트에 행이 아예 없었다** | `computeGapReport`가 같은 카탈로그로 같이 채운다. 그리고 **권위 있는 관광지 목록을 인자로 받는다** — 그래야 접근성 스냅샷이 없는 곳도 「0건 채움 / 22건 모름」으로 나타난다 |
| **S8** | 일일 쿼터가 스테이지 중간에 걸리면 절반만 채운 페이로드가 발행됐다. `common`·`intro`·`images`만 검사했고 다국어 제목·사진갤러리·Odii는 경고만 하고 계속했다. 다음 날 실행은 「데이터가 있다」고 아무것도 안 한다 | `abortOnQuota()`를 7개 fetch 지점 전부에 붙였다. 스펙 §3.4가 요구하는 대로 **아무것도 쓰지 않고 종료한다** |
| **S9** | `publish()`가 DB보다 파일을 먼저 썼다. upsert가 실패하면 `content/generated/*.json`이 `data_snapshots`보다 앞서 나가고, 그 파일은 다음 스테이지와 `src/lib/data.ts`가 읽는다 | DB 먼저, 파일 나중 |
| **S10** | `weather_warning`이 영구히 `unknown`이다 — 기상청 호출이 리포지터리에 없다. `buildContext`는 `{crowd, visitors, fetchedAt}`만 쓴다. **경고조차 조건부**여서 아무도 모른다 | 실행마다 무조건 경고한다. 근본 해결은 사람의 결정 → [`04_open_items.md`](./04_open_items.md) §3.1 |
| **S11** | Vercel이 아닌 프로덕션이 픽스처를 수집 데이터처럼 내려줬다. 가드가 `VERCEL === '1'`만 봤다. `next build && next start`는 Docker·VPS·심사용 노트북에서도 프로덕션이고, `pnpm seed:fixtures`가 바로 그 디렉터리에 쓴다. 그리고 이 상황을 알릴 함수 `currentDataSource`는 **어디서도 import되지 않았다** | `NODE_ENV === 'production'`도 본다. 픽스처를 프로덕션 모드로 쓰려면 `MODU_DATA_SOURCE=fixtures`를 말해야 하고, 그걸 하는 스크립트가 `build:fixtures`·`start:fixtures`다(D-14). 그리고 `currentDataSource()`가 실제로 **모든 화면 상단의 배너**를 띄운다(D-15) |
| **S12** | RLS가 **어떤 행**만 정하고 **어떤 컬럼**은 정하지 못한다. `created_at`을 직접 넣으면 `created_day`가 달라져 하루 1건 unique 인덱스를 통과한다 | 컬럼 단위 grant. §4에서 대조군까지 실측했다 |
| **S13** | `/api/reports`가 `flagged_at`을 모든 방문자에게 넘겼다. `/api/report/flag`가 빈 응답을 돌려주는 설계가 무의미해진다 | select에서 뺐다 |
| **S14** | 주석 두 개가 코드에 없는 것을 주장했다. `report/route.ts`는 「서버도 먼저 확인한다」고 썼는데 사전 확인이 없고, 관리자 액션은 `.select()`가 없어 RLS에 막힌 update에도 `{ok:true}`를 냈다 | 주석을 사실에 맞췄고(사전 확인은 **일부러** 안 한다 — 레이스에서 지므로), 액션에 `.select('id')` + 행 수 검사를 붙였다 |
| **S15** | `image-proxy`에 포트 검사가 없어 `https://tong.visitkorea.or.kr:8080/`이 통과했다. `content-length`가 없으면 `Number('0')`이 검사를 통과하고 본문 전체를 버퍼링한 뒤 걸렸다. 그리고 **`src/` 어디서도 이 라우트를 참조하지 않았다** | 포트·쿼리·인증정보 거부, `content-length` 필수(411). 그리고 ingest가 HEAD로 찔러 보고 https가 안 열리면 스냅샷에 프록시 경로를 저장한다(D-18) — **라우트를 코드가 아니라 데이터가 참조한다** |
| **S17** | `rest_seating`이 거리 헬퍼를 거쳐서, 좌표 없는 휴게시설은 전부 버려졌다. `facilities.json`의 휴게시설에는 좌표가 하나도 없다 → 있는데도 `unknown` | 스펙 5.7대로 **존재 여부**로 판정한다 |
| **S19a** | `applyCurated`가 `entry.source`를 버리고 상수 `'curated'`를 썼다. 근거 카드가 「공개 자료로 확인」이라고만 하고 인용이 없었다 — `curated-facts.json`이 존재하는 이유 그 자체 | 인용을 `sourceField`로 실어 근거 라인에 찍는다. **`scripts/seed-fixtures.ts`에도 같은 버그가 있었고 그쪽이 실제로 위험했다** — ingest는 키가 없어 안 돌지만 시드는 지금 돌아가는 경로이고, 심사위원이 보는 화면이 바로 그것이다. 렌더 확인으로 잡았다(§5) |
| **S19b** | 인지 옵션이 가장 촘촘한 휴식 한계(15분)를 낼 때 경고가 `P3`를 이름으로 댔다. **P3 자신의 한계는 20분이다** — 숫자와 이름이 안 맞았다 | `personaId`에 `'cognitive'`를 추가하고 그 경우를 따로 이름 짓는다 |

**S16과 S18은 고치지 않았다.** S16(`path_continuity`의 `absenceKind`)은 검토자 자신이 *스펙 표가 틀린 쪽이다*라고 결론 냈고 숫자 영향이 없다. S18은 아래 A-18에서 같이 고쳤다.

### 검토가 깨끗하다고 확인한 것

기록해 둘 가치가 있다. 검토자가 **실행해서** 확인한 것들이다.

- **`suitability.ts`의 산술** — 0으로 나누는 곳 없음, `NaN` 누출 없음, `Math.min(...fits)`가 빈 배열에 걸리지 않음, 「절반 초과」 비교가 정확히 1/2에서 옳고 3/5에서 옳음, coverage 상한이 정확히 0.65에서 옳음(`< 0.65`가 제외), `not_applicable`이 축 평균·`totalCount`·personaFit의 분자와 **분모** 양쪽·coverage·`ktoTotalCount` 전부에서 빠짐(실측: N/A 2개 → `ktoTotalCount 22`), 축 하나가 통째로 빠질 때 가중치 재정규화가 정확히 1이 됨(실측 `0.3333/0.2/0.2/0.1556/0.1111`), 규칙 4의 상한이 내리기만 함, 인증이 밴드를 넘지 못함(라벨은 `scoreWithoutCertification`을 읽는다), 신선도가 점수도 라벨도 건드리지 않음
- **`scoreboard.ts`** — 관광지가 자기를 추천할 수 없고, 2차 패스가 판정을 바꿀 수 없다
- **`gap.ts`** — 채움 3열의 합이 구조적으로 `ktoTotal`, 우선순위 정렬이 4중 타이브레이커로 완전 결정적
- **`usePersona.ts`** — `getSnapshot`이 무한 루프에 빠질 수 없다. 메모리 폴백이 **도달 가능하고**(`setItem`이 쿼터로 던지면서 `getItem`은 성공하는 경우) 두 경로 모두 옳다
- **쿠키** — 읽지 말아야 할 라우트가 하나도 읽지 않는다. `/api/report`와 관리자 화면만 `createServerClient`를 쓰고 둘 다 세션이 필요하다. 관리자 게이트는 `getSession()`이 아니라 `getUser()` + `admin_users` 멤버십 읽기다
- **`revalidate`의 비교** — 길이 XOR + 최대 길이에 대한 문자별 XOR. `charCodeAt` 범위 밖과 리터럴 NUL이 둘 다 0으로 가지만 길이가 같아야 하므로 도달 불가
- **`image-proxy`의 호스트 허용목록** — 우회 실패. 대소문자, 사용자정보(`https://tong.visitkorea.or.kr@evil.com/x` → `hostname`이 `evil.com`), 끝점(`tong.visitkorea.or.kr.`), IPv6 전부 403. `redirect: 'error'`가 리다이렉트 탈출을 막는다

---

## 3. 접근성·설계 결함

### 심각

| # | 무엇 | 고침 |
|---|---|---|
| **A-3** | `Eyebrow.tsx`가 `<p>`를 렌더하는데 S3의 **7개 섹션이 그것을 유일한 `aria-labelledby` 라벨로 쓴다.** 제목 개요가 `h1 → h3`로 뛰고, 판정·제보·사진·안전 블록이 개요에 **없다** | `as` prop을 받는다. 섹션이 가리키는 eyebrow는 그 섹션의 제목이므로 `h2`여야 한다 — 8곳 |
| **A-4** | `role="status"` 자리표시자가 **갱신되는 게 아니라 언마운트된다.** 5곳. 그중 둘은 텍스트가 `…` 하나였다 — 아무것도 읽히지 않는다 | 리전을 분기 **밖**으로 옮겨 스왑을 견디게 했다. React가 같은 위치·같은 타입을 같은 DOM 노드로 유지하므로 텍스트만 바뀐다. 자리표시자 문구도 실제 문장으로 |
| **A-5** | `ReportForm`이 성공을 알린 직후 `router.push`로 리전을 언마운트했다. **제보가 접수됐다는 단 하나의 확인 문구가 절대 읽히지 않는다** | 폼이 확인 패널로 교체된다. 패널이 포커스를 받고 `role="status"`. 스펙이 써 둔 `report.goPlace`가 여기서 처음 쓰인다(D-16) |
| **A-6** | 서버 오류가 **동의 체크박스 탓으로** 표시됐다(503·실패·익명로그인 실패 3곳). 텍스트영역의 `aria-invalid`가 켜지는데 `aria-describedby`는 오류 id를 가리키지 않았다. 그리고 모든 메시지가 **두 번 읽혔다**(`role="alert"` + polite 리전) | 폼 단위 오류 필드를 만들고 포커스를 받게 했다. `aria-describedby`에 오류 id를 넣었다. `fail()`의 polite 복사를 지웠다 — `role="alert"`이 이미 한다 |
| **A-7** | 도슨트 대본이 `<details open>`이었다. **접근성 트리에서 접혀 사라질 수 있다** — 청각장애 방문자가 쓸 수 있는 유일한 형태인데 | 평범한 `<section>` + `<h2>`. `<track>`은 남겼고 왜 그것이 전달 수단이 아닌지 주석에 적었다(Chrome은 `<audio>`에 캡션 표면을 만들지 않는다) |
| **A-8** | 스킵 링크가 `#primary-nav`를 가리키는데 `<nav>`에 `tabIndex={-1}`이 없다. **스크롤만 되고 포커스는 그대로다** | `tabIndex={-1}`. 그리고 `focus.spec.ts`가 이 링크를 시험하게 했다 — 기존 테스트는 **잘 동작하는 링크 하나만** 시험했고, 그래서 이 결함이 남아 있었다. 일부러 되돌려 빨간불을 확인했다 → [`05_verification.md`](./05_verification.md) §5.1 |

### 나머지

| # | 무엇 | 고침 |
|---|---|---|
| A-9 | 맨 `<span>`에 `aria-label`(역할 없는 요소의 `aria-label`은 노출이 보장되지 않는다). 그리고 `place.score = "{score}점"`이 정의만 되고 안 쓰여 점수가 **단위 없이** 읽혔다 | 보이는 글리프와 읽히는 텍스트를 분리(`aria-hidden` + `sr-only`). `score` 메시지를 쓴다 |
| A-10 | 고정 긴급 버튼이 공간을 예약하지 않았고, `scroll-margin-top: 5rem`이 **존재하지 않는 sticky 헤더**를 위해 있었다 — 가드가 반대쪽 변에 붙어 있었다 | `--emergency-clearance`를 `body`의 아래 패딩과 `scroll-margin-block`의 끝 값으로 쓴다. 인쇄에서는 0 |
| A-11 | 신고 버튼이 ≈25×40px이고 접근 이름이 행마다 같았다 | `min-h-[44px]`, `aria-label`에 분류와 날짜를 넣었다 — 똑같은 「신고」 링크 목록은 스크린리더의 링크 목록에서 쓸 수 없다 |
| A-12 | `<dl>`과 `<dt>` 사이에 `<span>`이 있었다. **`dl`을 쓰는 이유 그 자체인 용어–값 매핑이 깨진다** | `<div>` |
| A-13 | 신뢰도 설명이 `title` 속성에만 있었다 — 터치에서 안 뜨고, 키보드에서 안 뜨고, 읽히는 방식이 일정하지 않다. **사람들이 가장 자주 오해하는 구분**인데 | 본문 텍스트로 |
| A-14 | `disabled={!loaded}`가 주 폼을 하이드레이션 동안 탭 순서에서 빼고, JS 없이는 영구히 뺐다 | 비활성화를 없앴다. 부모 체크박스에 의존하는 중첩 옵션만 남겼다 |
| A-15 | 여행 기록에서 관광지를 지우면 포커스가 `<body>`로 떨어졌다 | 관광지 선택 셀렉트로 옮긴다 |
| A-16 | 「한 단계씩」 모드에서 다음/이전이 **조용히** 카드를 바꿨다 | 두 모드 모두에 마운트된 리전이 위치와 제목을 읽는다 |
| A-17 | `SnapshotProblem`이 `<h2>`를 돌려주는데 8개 페이지가 그것을 본문 대신 반환한다 → **`<h1>`이 없는 페이지** | `<h1>`. 그리고 공개 페이지에 Postgres 오류·Zod 이슈를 찍지 않도록 스냅샷 키만 남겼다 |
| A-18 | 관리자 화면이 `.limit(200)`에 대해 **행마다 `LiveRegion` 하나**를 렌더했다. 200개의 polite 리전이 서로 큐를 만든다 | `ReportList.tsx`가 목록 전체에 하나를 소유한다 |
| A-19 | 인쇄물에 페이지 번호가 없고, `globals.css`가 주장한 「반복되는 각주 `<thead>`」가 **구현돼 있지 않았다**. `print-page-break`가 첫 절에도 붙어 1페이지에 제목만 남았다 | 각주를 `position: fixed` 스트립으로 실제 구현했다 — Chrome이 반복하는 유일한 running-footer 수단이다. `@page` 아래 마진을 넓혔다. 첫 절의 break를 뺐다. 페이지 번호는 CSS로는 불가 → [`04_open_items.md`](./04_open_items.md) §3.2 |
| A-20 | **`admin` 메시지 29개가 두 로케일에 다 있는데 하나도 안 쓰였고** 화면은 같은 한국어를 하드코딩했다. 그 결과 `admin.copied`의 뒷문장(커밋 지시)이 통째로 빠졌다. `REASONS`가 원시 한국어를 `hidden_reason`에 저장했다. `AdminSignIn`이 Supabase 원문 메시지를 노출했다 | 로케일을 `ko`로 고정하고 메시지를 쓴다(D-17). 사유를 안정된 코드로 저장한다. 로그인 실패는 하나의 문구로 — Supabase는 「없는 사용자」와 「틀린 비밀번호」를 구분하고, 그걸 공개 폼에 옮기면 어느 주소가 관리자인지 알려준다 |
| A-21 | **실패할 수 없는 검사들.** `tokens.json`이 `src/` 어디서도 안 쓰이는 `ink-3`을 지켰다. `gapReport.csvHint`가 있는데 CSV 링크가 형식·크기를 안 말했다. `a11y.spec.ts`가 로케일 전환·도슨트·여행기록·인쇄·관리자를 안 훑었고, **계산 표는 닫힌 `<details>` 안이라 axe가 들어가지 않았다** | `ink-3` 삭제. `csvHint`가 실제 바이트 수를 말한다(같은 순수 함수, 같은 행 → 파일과 어긋날 수 없다). axe 6경로 → **17경로**, 스캔 전에 모든 `<details>`를 연다. **첫 실행에서 실제 결함 2건이 잡혔다** → [`05_verification.md`](./05_verification.md) §4.4 |
| A-22 | 숫자 열이 왼쪽 정렬이라 `tabular-nums`가 맞출 대상이 없었다. 순위 `<td>`가 `<th scope="row">` **앞**에 있었다(앞의 셀은 라벨링되지 않는다). `size-6` = 25.5px. 🚧가 두 분류에 쓰였고 🛗는 Emoji 13.0 — **이 서비스가 대상으로 하는 구형 기기에서 빈 사각형이 된다.** `@custom-variant dark`가 죽은 코드였다 | `.data-table .tabular`가 오른쪽 정렬. 순위를 행 헤더로. `.control` 클래스로 ~30px. **분류별 이모지를 전부 지웠다** — 여덟 중 둘이 같은 글리프를 써서 구분하는 것이 없었고, 분류명이 바로 옆에 글자로 있다. 죽은 variant 삭제 |

### 설계 비평 — 무엇을 고쳤나

검토자의 판정은 「디자인된 것으로 읽힌다」였다(17px 루트와 그 이유, 자기 규칙을 그리는 gilt eyebrow, 파선 빈칸, 자체 호스팅 서브셋, 실제로 적용된 `--container-prose`). 그런데 네 가지가 그것을 무너뜨리고 있었다.

**1. 선언한 타입 스케일이 두 곳에서만 유효했다.** 18개 `<h2>` 중 **16개가 `!text-[…]` 오버라이드**를 달고 있었고, 그중 여섯은 `1.05rem` — **기본 `h3`인 1.06rem보다 작다.**

→ 21개의 임의값을 **두 개의 이름 붙은 단계**로 바꿨다. `.item-head`(1.18rem)는 목록의 한 항목을 제목한다(경로 단계, 여행 기록의 관광지, 도슨트 이야기). `.subhead`(1.06rem)는 카드·aside·하위 블록을 제목한다. 나머지 2개는 오버라이드를 지워 기본 `h2` 클램프로 돌렸다. **레벨은 문서 개요가 정하고 크기는 위치가 정한다** — 그래서 둘을 분리했다.

**2. `--color-rule`이 종이 대비 1.36:1이었다.** 시스템의 어떤 실선도 실제로 그려지지 않았다. 검토자가 「단 하나의 최고 가치 변경」으로 지목한 것이다.

→ 라이트 `#DFDDD7` → `#A8A49B`(≈2.5:1), 다크 `#333333` → `#575757`(≈2.9:1). 그리고 `tokens.json.checks`에 `min: 2.0`으로 넣었다 — UI 경계는 아니지만 **나눌 수 있을 만큼은 보여야 한다**, 그리고 그 기준이 검사되어야 한다.

**3. `--color-gilt`과 `--color-badge-caution`이 라이트 모드에서 같은 `#8A6100`이었다.** 정체성 강조와 주의 색이 구분되지 않았다.

→ gilt를 `#6B4B12`로 옮겼다. 더 어둡고 덜 채도 높은 청동색 — 앰버 경고색과 눈으로 구분된다. 배지 값은 스펙 §6.6이 못 박고 있으므로 움직이지 않았다.

**4. `.card`가 24곳에서 열한 가지 일을 했다.** 그중 8곳은 `border-l-4 border-[var(--color-badge-caution)] bg-[var(--color-surface)] p-5` 같은 유틸리티 문자열을 반복하고 있었다 — 이름 없는 컴포넌트다.

→ `.callout` + `--caution`/`--stop`/`--note`. 왼쪽 변의 색이 상태이므로 배지 채움이 아니라 `state-*` 토큰에서 온다 — **판정 단어를 실은 색이 그 단어가 앉은 블록을 실는다.**

**5. 두꺼운 색 테두리 세 곳.** 훅이 두 번에 걸쳐 잡았고, 두 번째 지적이 첫 번째 판단을 뒤집었다.

- **`.callout`의 4px 왼쪽 변** — 내가 정한 것이 아니라 기존 유틸리티 문자열에서 그대로 옮겨온 값이었다. **`--color-rule`을 2.5:1로 올린 직후이므로 실선이 스스로 그려진다** — 변이 소리칠 이유가 없어졌다. 2px로 줄였고, 배경 틴트가 이미 신호의 절반을 지고 있다. `border-left` → `border-inline-start`로도 바꿨다(이 파일의 나머지 논리 속성과 맞춘다)
- **`.field[aria-invalid="true"]`의 5px** — 처음에는 「WCAG 1.4.1의 비색상 중복 신호」라고 판단해 4px로만 줄여 남겼다. **훅이 다시 잡았고, 다시 보니 내 논거가 틀렸다.** `aria-invalid`가 붙는 컨트롤 4곳을 전부 확인했는데 **네 곳 모두 이미 보이는 오류 문구를 렌더한다**(`ReportForm`의 `FieldError` 3곳, `DiaryEditor`의 `dateRequired`). 텍스트가 비색상 채널이고, **폭보다 나은 채널이다** — 어느 필드가 왜 틀렸는지 말한다. 폭은 그 위에 얹은 벨트-앤-브레이스였고, 컨트롤 한쪽에 색 슬래브를 두는 것은 방금 `.callout`에서 걷어낸 바로 그 형태다. **폭을 없애고 색만 남겼다.** 토큰이 `badge-blocked`(채움용)였던 것도 `state-bad`로 고쳤다 — A-1 정리에서 놓친 곳이다
- **긴급 연락 모달의 `sm:border-4`** — 데스크톱에서 둥근 모달을 네 변 전부 4px 빨강으로 두르고 있었다. 1차로 위쪽 변만 2px로 줄였는데 **훅이 다시 잡았고, 그것도 맞다** — 위 2px + 나머지 1px은 코너마다 폭이 바뀌는 단을 만든다. **테두리를 아예 없애고 상태를 제목 아래 규칙선으로 옮겼다.** 분리는 그림자와 라디우스가 하고, 빨간 선은 「이 시트가 무엇을 위한 것인지」를 표시한다 — 도착한 상자를 두르는 것이 아니라

**추가로:**
- **근거 레일에 보이는 열 경계를 그렸다.** 이 인터페이스 전체의 논거가 「왼쪽의 주장마다 오른쪽에 출처가 있다」인데, 선이 없으면 그냥 더 오른쪽에 있는 캡션으로 읽힌다. 브레이크포인트 아래에서는 열이 쌓이므로 경계가 각주 위로 옮겨간다
- **홈의 `Step 1`을 지웠다.** 한국어 화면의 하드코딩된 영어 장식이었고, 인터페이스 어디에도 step 2가 없는 순서를 알리고 있었다

---

## 4. 마이그레이션 — 실측 네 라운드

`S12`의 컬럼 권한을 **실제 Postgres 17.11**에 대고 네 번 검증했다. Supabase의 기본 권한(`alter default privileges … grant all on tables to postgres, anon, authenticated, service_role`)을 **테이블 생성 전에** 재현했다 — 이걸 빼면 회수할 것이 없어서 검사가 아무것도 증명하지 못한다.

### 1라운드 — 구멍이 실재했다

대조군(grant 블록을 지운 DB)에서 같은 `authenticated` 호출자가 하루 1건 unique 인덱스를 우회해 같은 (관광지, 분류)에 **공개 제보 4건**을 만들었다:

```
 detail | created_day | pre_flagged | hidden_reason
 y      | 2020-01-01  | f           |
 y2     | 2020-01-02  | f           |
 y3     | 2020-01-03  | t           | self-set
 legit  | 2026-09-02  | f           |
```

블록을 넣으면 전부 `permission denied for table barrier_reports`. 정상 경로 10개 전부 통과. 상세는 [`05_verification.md`](./05_verification.md) §3.4.

### 2라운드 — 열거식 회수가 Postgres 17에서 새는 것을 잡았다

1라운드에서 「`TRUNCATE`는 행 연산이 아니라 RLS가 개입하지 않는다」는 지적이 나와 `revoke truncate, trigger, references`를 추가했다. 2라운드가 **그 회수 자체의 결함**을 잡았다.

**`grant all on tables`는 Postgres 17에서 여덟 개다 — `arwdDxtm`.** 여덟 번째 `m` = `MAINTAIN`이 17에서 새로 생겼고, **이름을 열거한 회수문이 그것을 남겨 뒀다.** `anon`으로 실측:

```
LOCK TABLE data_snapshots IN ACCESS EXCLUSIVE MODE  → granted=t
VACUUM FULL data_snapshots                          → VACUUM
VACUUM FULL barrier_reports                         → VACUUM
CLUSTER data_snapshots USING data_snapshots_pkey    → CLUSTER
REINDEX TABLE admin_users                           → (success)
```

전부 ACCESS EXCLUSIVE 락을 잡는다(그 동안 모든 읽기가 막힌다). `VACUUM FULL`과 `CLUSTER`는 테이블을 통째로 다시 쓴다. **RLS는 그중 어느 것도 보지 않는다** — `TRUNCATE` 주석이 스스로에 대해 한 논거 그대로다.

대조군으로 `revoke maintain`이 정확히 이것들을 막는 것도 확인했다.

**고친 방식은 열거를 버리는 것이다.**

```sql
revoke all on barrier_reports from anon, authenticated;
grant select on barrier_reports to anon, authenticated;
grant insert (reporter_id, poi_slug, category, occurred_on, detail) on barrier_reports to authenticated;
grant update (is_hidden, hidden_reason, hidden_by, hidden_at) on barrier_reports to authenticated;
```

**다음 Postgres 버전이 또 하나를 추가해도 이 형태는 새지 않는다.** 열거식은 작성 시점의 Postgres를 영원히 가정한다.

같은 라운드가 잡은 세 가지 불일치도 같은 방식으로 닫았다:

- **`barrier_reports`에 `DELETE`가 남아 있었다** — `001`은 `data_snapshots`에서 `delete`를 회수하는데 `002`는 안 했다. `delete from barrier_reports`가 `permission denied`가 아니라 `DELETE 0`을 냈다(ACL이 문장을 허용하고 RLS가 전부 걸렀다). 착취 가능하지는 않지만 **같은 원칙을 한 테이블에만 적용한 것**이다
- **`admin_users`에 `INSERT`·`UPDATE`·`DELETE`가 남아 있었다.** 이 테이블은 자기 주석대로 「누가 관리자인지 정하는 유일한 곳」이다. `anon`의 insert가 `permission denied`가 아니라 **RLS 위반**으로 거부됐다 — 권한 검사는 통과했다는 뜻이다
- **`revoke all on function public.is_admin() from public`이 `anon`에 무효였을 가능성.** `from public`은 **직접 grant**를 건드리지 않고, Supabase의 FUNCTIONS 기본 권한은 `anon`에게 자기 EXECUTE를 준다 — 그러면 `/rest/v1/rpc/is_admin`이 anon 키에 공개된 채다. 유출은 없다(`auth.uid()`가 null이므로 무조건 `false`) 지만 주석이 「authenticated가 grant의 전부다」라고 말하는 것과 어긋난다. `from public, anon`으로 고쳤다

### 3라운드 — 읽기도 컬럼 단위여야 했다

2라운드의 `revoke all` + grant 형태가 옳았는데, 그 안의 **읽기 grant가 테이블 전체**였다. `grant select on barrier_reports to anon`이면 PostgREST가 테이블을 공개하므로 `?select=*`로 모든 컬럼을 가져올 수 있다:

```
 id | reporter_id                          | poi_slug | … | flagged_at | is_hidden | hidden_reason | hidden_by | created_day
```

**두 개가 문제다.**

- **`reporter_id`** — 방문자별 익명 식별자다. 개인정보 처리방침이 「익명 식별자(UUID)를 저장한다」고 쓴 그 값이고, 이걸로 **한 세션의 모든 제보를 묶을 수 있다.** 코드에서는 쓰기만 하고 어느 읽기 경로도 select하지 않는다
- **`flagged_at`** — S13에서 `/api/reports`의 select 목록에서 빼 놓고, 정작 권한은 열려 있었다. **라우트의 재량은 강제되지 않는다** — 호출자가 그냥 컬럼을 달라고 하면 된다. 내가 그 라우트에 「flagged_at은 일부러 select하지 않는다」고 주석을 써 놓은 것이 사실이 아니었던 셈이다

고친 형태 — 두 읽기 경로가 실제로 이름 붙인 컬럼 목록 그대로다:

```sql
grant select (id, poi_slug, category, occurred_on, detail, created_at)
  on barrier_reports to anon;                                    -- api/reports/route.ts
grant select (id, poi_slug, category, occurred_on, detail, created_at,
              flagged_at, is_hidden, hidden_reason)
  on barrier_reports to authenticated;                           -- admin/reports/page.tsx
```

**핵심 질문은 「is_hidden을 select할 수 없는 호출자에게 `not is_hidden` 정책이 걸리는가」였고, 걸린다.** 정책 표현식은 호출자의 컬럼 권한을 따르지 않는다. 실측: `anon`이 2행 중 1행을 보면서 `select is_hidden`은 `permission denied`.

**그리고 이 형태에는 조용한 함정이 있다.** `revoke all on <table>`은 **컬럼 grant까지 지운다.** 지금 파일은 revoke가 위, grant가 아래라 안전하지만, 나중 `003`이 벨트-앤-브레이스로 `revoke all`을 한 줄 더 넣으면 **9개 컬럼 grant가 전부 날아가고 제보 폼이 죽는다.** 실측으로 확인했다 — 두 번째 revoke 후 살아남은 컬럼 grant 0개, S7 insert가 `permission denied`. 그래서 순서 의존성을 주석에 명시했다.

**3라운드가 곁가지로 잡은 것 둘** — 둘 다 grant와 무관하게 원래 있던 것이다.

- **정렬 인덱스가 화면의 질의를 서비스하지 않았다.** 인덱스는 `(flagged_at is not null) desc, created_at desc`인데 `page.tsx`는 `flagged_at desc nulls last, created_at desc`를 보낸다 — 프로즈로는 같지만 다른 정렬이다. 5003행 실측에서 화면 질의가 `Sort → Seq Scan`으로 떨어졌고, 인덱스는 신고만 보기 뷰의 비트맵 조건으로만 쓰이고 있었다. **주석은 「Admin default order」라고 주장하고 있었다.**

  인덱스를 화면 쪽으로 옮겼다. 4라운드 재측정: `Index Scan`, **Sort 없음**, `actual rows=200` — 상한에서 멈추고 남은 4803행을 안 본다. **그리고 이건 부차 경로가 아니라 기본 화면이다**(`page.tsx:32`에서 `flagged`가 기본, `?sort=recent`가 선택). `nulls last`를 빼면 신고되지 않은 행 6개가 화면 맨 위에 오는 것도 확인했다 → [`05_verification.md`](./05_verification.md) §3.5
- **`ReportsSection.tsx`의 `ReportRow`가 `flagged_at`을 선언했다.** 그 컴포넌트가 부르는 `/api/reports`는 S13에서 이 컬럼을 select 목록에서 뺐으므로 런타임 값이 `undefined`인데 타입은 `string | null`을 약속했다. 읽는 곳이 없어 안 깨졌다. 이제 엔드포인트도 안 주고 anon 권한도 없으니 **두 겹으로 틀렸다** — 줄을 지웠다

스펙에도 없던 절을 추가했다 → `docs/spec/04_data_model.md` §5.4.

---

## 5. 게이트 상태

렌더된 HTML에서 직접 확인한 것(`pnpm start:fixtures`):

```
<h1>공산성                                   h1 1개, h2 11개, h3 32개
id="verdict-heading" … id="axis-rest-heading"  섹션 라벨 11개가 전부 heading (A-3)
color:var(--color-state-ok) ×4                 상태 단어가 텍스트용 토큰을 쓴다 (A-1)
공개 자료로 확인 · https://access.visitkorea.or.kr/ms/detail.do?cotId=…
                                               큐레이트 인용이 근거 라인에 찍힌다 (S19a)
출입구까지 경사로가 설치되어 있음               KTO 원문이 그대로 나온다
정보 없음 17건 / 22건 (한국관광공사 항목 기준)
/en/privacy    <section lang="ko"> 14개        (A-2)
/en/gap-report 한국어 0건, 영어 라벨만          (A-2)
/ko            「예시 데이터」 배너             (D-15)
```

빌드된 CSS에서 확인한 것:

```
--color-state-{ok,warn,bad}  라이트·다크 6개 값 전부
--color-rule:#a8a49b / #575757     (1.36:1 → 2.5:1 / 2.9:1)
--color-gilt:#6b4b12 / #d2a33a     (badge-caution 과 더 이상 같은 값이 아니다)
.callout .callout--caution .callout--stop .callout--note
.item-head .subhead .control
```

```
pnpm typecheck        오류 0
pnpm lint             문제 0
pnpm test             107 통과 / 5 파일   ← 이 라운드 종료 시점. 이후 119로 (07번 §6)
check-contrast        58 pairs, 36 tokens mirrored
pnpm build:fixtures   성공, 스냅샷 라우트 전부 ● (SSG)
pnpm e2e              24 통과 (axe 17경로 + 포커스 4 + 골든 3)
pnpm validate:content 빨간불 — 의도된 것 (ktoContentId "UNRESOLVED" 6건)
```

**마지막 줄이 초록불이 되는 유일한 방법은 서비스 키를 얻어 `pnpm probe`를 돌리는 것이다.** 그게 [`04_open_items.md`](./04_open_items.md)의 1절이다.
