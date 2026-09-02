# 02 — 스펙이 틀린 것 (실측 결과)

> **A–P는 목록으로만 남겼다.** spec에 반영하는 것은 문서를 소유한 사람의 판단이므로, 각 항목에 **어느 파일 몇 절을 어떻게 고쳐야 하는지**까지 적었다.
>
> **Q와 R은 예외로 스펙에 직접 반영했다.** 둘 다 스펙의 지시를 그대로 따르면 방문자가 실제로 잘못된 판정을 받는 경우이고, 이전 서술을 남겨 두면 다음 사람이 그것을 되살린다. 어디를 어떻게 고쳤는지는 각 항목에 적었다.
>
> 표기: **[실측]** 실제 호출·실행으로 확인 · **[원문]** 매뉴얼 원문 대조 · **[유도]** 코드로 옮기다 드러난 모순

---

## A. 오퍼레이션 이름 — 스펙이 고른 쪽이 틀렸다 **[실측] ★★★**

게이트웨이는 **키를 검증하기 전에 URL 경로를 먼저 해석한다.** 그래서 유효하지 않은 키로도 오퍼레이션의 존재 여부를 알 수 있다.

- 존재하지 않는 오퍼레이션 → `resultCode 12`
- 존재하는 오퍼레이션 + 등록되지 않은 키 → `resultCode 30`

대조군으로 확인했다: `KorService2/definitelyNotAnOperation` → 12, `KorService2/ldongCode2` → 30.

이 방법으로 매뉴얼이 표와 예시에서 갈라진 이름 전부를 실측했다.

| 서비스 | 스펙의 결정 | **실측 결과** | 수정할 곳 |
|---|---|---|---|
| TatsCnctrRateService | 표의 `tatsCnctrRateList`가 맞고 예시 URL은 오타 | **거꾸로다.** `tatsCnctrRateList` → **12**(없음), `tatsCnctrRatedList` → **30**(있음) | `03_external_data.md` §2.4 · `11_open_items.md` P0-9 1번 |
| Odii | — | `themeBaseSyncdList` → 12, **`themeBasedSyncList` → 30** (예시 URL이 맞다) | `11_open_items.md` P0-9 2번 |
| TarRlteTarService1 | 소문자 `areaBasedList1` (예시 URL) | **맞다.** `AreaBasedList1` → 12, `areaBasedList1` → 30. 오퍼레이션명은 대소문자를 구분한다 | 확인만 |
| TarRlteTarService1 | `searchKeyword1` | **맞다.** `1`을 뗀 세 가지 표기(`TarRlteTarService/searchKeyword1`, `TarRlteTarService1/searchKeyword`, `TarRlteTarService/searchKeyword`)는 전부 12 | `03_external_data.md` §2.6에 세 번째 변형 추가 |

**코드는 실측값을 쓴다.** `src/lib/kto/services.ts`의 `getCrowdForecast()`가 `tatsCnctrRatedList`를 부르고, 그 자리에 실측 기록을 주석으로 남겼다 — 누가 "표가 맞다"며 되돌리지 않도록.

---

## B. `areaCode2`·`categoryCode2`는 아직 살아 있다 **[실측]**

`03_external_data.md` §2.1은 *"부르면 `resultCode 12`(서비스 없거나 폐기됨)가 올 수 있다"*고 적었다. **오늘 기준 두 오퍼레이션 모두 `30`을 돌려준다** — `KorService2`·`KorWithService2` 양쪽에서. 즉 경로가 살아 있다.

**의미:** 폐기된 오퍼레이션은 **불러서 감지할 수 없다.** 두 오퍼레이션을 쓰지 않는 판단은 그대로 유지하되(매뉴얼의 만료 고지가 근거다), "12가 온다"는 서술은 사실이 아니다.

**수정할 곳:** `03_external_data.md` §2.1의 해당 문장.

---

## C. 에러 응답이 XML이 아니었다 **[실측] ★★★ 가장 위험했던 것**

`03_external_data.md` §1.4는 *"`_type=json`을 붙여도 **에러 응답은 언제나 XML**로 온다"*고 단언하고, **문자열 우선 파싱에서 `<`로 시작하면 XML로 분기**하라고 못 박았다.

실제로 받은 응답 (HTTP 403):

```json
{"OpenAPI_ServiceResponse":{"cmmMsgHeader":{
  "errMsg":"SERVICE_KEY_IS_NOT_REGISTERED_ERROR",
  "returnAuthMsg":"등록되지 않은 서비스키",
  "returnReasonCode":"30"}}}
```

**JSON이다.** 스펙대로 구현하면 `<`로 시작하지 않으므로 XML 분기를 타지 않고, JSON 분기에서 `response.header.resultCode`를 찾다가 실패해 **`resultCode 30`을 잃는다.** 30은 이 프로젝트에서 가장 중요한 진단(이중 인코딩)이다.

**코드 대응:** `src/lib/kto/transport.ts`가 두 형태를 모두 읽는다. 필드 이름은 어느 쪽이든 `returnReasonCode`다.

**수정할 곳:** `03_external_data.md` §1.4 — "언제나 XML"을 "XML 또는 JSON 봉투 둘 다 올 수 있다"로.

---

## D. `HS010200` 라벨의 구분자 문자가 스펙 안에서 두 가지다 **[원문]**

`신분류체계정보 관광타입정보 연계 정의서.xlsx` 원문의 소분류명은 **`성ㆍ산성ㆍ성곽`** — 구분자가 **U+318D (ㆍ)** 다. 흔한 가운뎃점 **U+00B7 (·)** 이 아니다.

`03_external_data.md`가 같은 코드를 두 곳에서 다르게 쓴다.

| 위치 | 값 | 문자 |
|---|---|---|
| §2.9 (다) 표 | `성·산성·성곽` | U+00B7 — **원본과 다르다** |
| §2.9 [정정] 인용 | `성ㆍ산성ㆍ성곽` | U+318D — 원본과 같다 |

`lclsSystmCode2`가 준 라벨을 표의 값과 문자열 비교하면 **절대 일치하지 않는다.** 같은 문제가 `HS020100 탑ㆍ비석ㆍ기념탑`에도 있다.

**코드 대응:** 라벨을 문자열 비교하는 코드가 없다. 코드 값(`HS010200`)만 저장하고 한글 라벨은 부트스트랩 응답을 그대로 쓴다.

**수정할 곳:** `03_external_data.md` §2.9 (다) 표.

---

## E. 매뉴얼에 「공통」 분야는 없다 **[원문]**

`03_external_data.md` §2.1이 `detailWithTour2`의 24항목을 **「공통 (5)」 + 지체장애 (6+1)** 로 나눈다. 매뉴얼의 「파라미터 구분」 열은 `parking`부터 `handicapetc`까지 **12개를 전부 지체장애**로 묶고, 「공통」이라는 분야를 두지 않는다.

점수 계산은 영향 없다(24개는 그대로). **화면에 분야를 표기할 때 「공통」이라고 쓰면 매뉴얼에 없는 분류를 만드는 것이다.**

**코드 대응:** 화면은 우리 자체 6축(진입·이동·편의시설·정보안내·휴식·상황)으로만 묶고 한국관광공사 분야 라벨을 쓰지 않는다.

**수정할 곳:** `03_external_data.md` §2.1 표의 「공통 (5)」 행 머리.

---

## F. `touDivNm`에 「내국인」이라는 말은 매뉴얼에 없다 **[원문]**

`03_external_data.md` §2.5와 `05_ingest.md` §5.5가 `touDivCd`를 **「내국인 현지인 / 내국인 외지인 / 외국인」**으로 적는다. 관광빅데이터 매뉴얼 원문은 **`현지인(a)` / `외지인(b)` / `외국인(c)`** 이고, 「내국인」은 문서 전체에 등장하지 않는다(grep 0건).

코드값 매핑(1/2/3의 대상과 순서)은 정확하므로 집계가 어긋날 위험은 없다. **화면 문구가 API 원문에 없는 라벨을 쓰는 것이 문제다.**

**코드 대응:** `context.visitors[].touDivNm`에 **응답값을 그대로** 저장하고 화면도 그 값을 출력한다. `05_ingest.md` §5.5가 지시한 화면 표기 *"내국인 외지인 기준"*은 쓰지 않았다.

**수정할 곳:** `03_external_data.md` §2.5 코드값 표 · `05_ingest.md` §5.5 화면 표기 줄.

---

## G. `langCheck`를 「비트마스크」라고 단정할 근거가 없다 **[원문]**

`03_external_data.md` §2.3이 *"응답의 `langCheck` 필드가 `1111`(4개 언어 제공 여부 비트마스크)로 나온다"*고 쓴다. 매뉴얼 원문은 `langCheck | 제공언어 | 1 | 1111 | 제공언어` 한 줄뿐이다. **비트마스크라는 해석은 매뉴얼에 없다.**

그리고 `langCheck`는 `theme*` 계열에만 있고 **`storyBasedList` 응답 표에는 없다.**

**수정할 곳:** `03_external_data.md` §2.3 — 괄호 안 단정을 빼고 `[미확인]`으로.

---

## H. `gallerySyncDetailList1`은 `title`이 필수다 **[원문]**

`03_external_data.md` §2.7 표가 이 오퍼레이션의 「핵심 파라미터」로 **옵션인 `galUseFlag`만** 적었다. 매뉴얼의 필수(1) 파라미터는 **`title`** 이다. 지금 호출하지 않으므로 예산에는 영향이 없지만, 이 표를 보고 구현하면 `resultCode 11`이 온다.

같은 절의 **`77,916`을 "사진 단위 규모"로 쓰면 안 된다** — 그 샘플은 `title=청설모`로 필터한 호출의 값이다. `4,754`와 마찬가지로 페이징 계산의 근거가 못 된다.

**수정할 곳:** `03_external_data.md` §2.7.

---

## I. 적합도 산식의 계산 예시가 재현되지 않는다 **[유도] ★**

`06_suitability.md` §6.4의 반례 계산과 `07_screens.md` S3 ④의 예시 블록이 **32번째 항목(`visual_alarm`, DEC-8로 2026-09-01 추가) 이전의 값**이다.

| 스펙의 값 | 실제 |
|---|---|
| P1a 등급 가중치 합 **55** | **56** (`visual_alarm`이 P1a에 `other`로 한 줄 늘었다) |
| 반례 점수 **45** (뒤에 48로 재계산) | **46** (골든 `low-score-not-blocked`) |
| S3 ④ 예시 "정보안내 (0/7 확인)" | 정보안내 축은 **8개** 항목이다 |

**판정 자체는 스펙대로다** — 라벨 `주의`, `대체추천` 아님, `unknownCriticals = ['elevator']`. 골든 테스트가 그 **성질**을 검증하고, 화면은 손으로 적은 숫자를 쓰지 않는다(`09_test_and_ci.md` §2의 요구).

한편 `06_suitability.md` §6.4의 P0 fixture 표(100 / 84 / 62 / 29)와 골든 19번(`all-partial` → 44)은 **항목 개수와 무관한 균등 케이스**라 지금 구현에서 정확히 재현된다. 산식 엔진 자체는 스펙과 일치한다.

**수정할 곳:** `06_suitability.md` §6.4 반례 산수 · `07_screens.md` S3 ④ 예시 블록의 항목 수.

---

## J. `07_screens.md` S3 ⑦의 조건이 `06_suitability.md` §6.5와 다르다 **[유도]**

- `06_suitability.md` §6.5: 대체 관광지는 **라벨 비교**로 채운다. 점수 기준은 DEC-7에서 폐기됐다.
- `07_screens.md` S3 ⑦: **"점수 < 70 일 때만"**

**코드는 §6.5(라벨 비교)를 따랐다.** 점수 기준을 되살리면 DEC-7이 없앤 "여섯 곳이 서로를 추천하는 고리"가 돌아온다.

**수정할 곳:** `07_screens.md` S3 ⑦의 조건 줄.

---

## K. 인쇄 문서의 페이지 번호는 Chrome에서 만들 수 없다 **[실측 · 브라우저 지원]**

`08_accessibility_legal.md` §1.1이 「고정된 참조 위치 정보」 대응으로 이렇게 지시한다.

```css
@page { @bottom-center { content: counter(page) " / " counter(pages) } }
```
그리고 `position: running()` 머리글.

**Chrome은 `@page` 마진 박스와 `position: running()`을 구현하지 않는다.** `@page { size; margin }`과 `break-*`만 동작한다. 즉 **CSS로 페이지 번호를 넣을 방법이 없다.**

**코드 대응:** `@page { size: A4; margin: 20mm }` + `break-inside`/`break-before`를 쓰고, 매 페이지 반복이 필요한 출처 문구는 **`<thead>`** 에 둔다(Chrome이 `<thead>`는 페이지마다 반복한다). **페이지 번호가 있는 문서라고 말하지 않는다.**

**수정할 곳:** `08_accessibility_legal.md` §1.1의 해당 행 — 요구를 "절 제목 반복"으로 좁히고 페이지 번호를 뺀다.

---

## L. `04_data_model.md` §3.4의 예시 코드는 그대로 쓸 수 없다 **[유도]**

```ts
const sb = createServerClient();          // ← await 없음
```

두 가지가 틀렸다.

1. `@supabase/ssr`의 `createServerClient`를 감싸면 안에서 `await cookies()`를 해야 하므로 래퍼가 `async`다. 지금 코드는 `Promise`에 `.from()`을 호출해 **타입체크에서 죽는다.**
2. 더 중요한 것 — **`cookies()`를 읽으면 그 라우트가 dynamic이 된다.** 스냅샷 6종은 전부 공개 데이터이고 쿠키가 필요 없다. 이대로면 `02_stack.md` §5의 캐시 설계와 `/api/revalidate`가 통째로 무의미해진다.

**코드 대응:** 클라이언트를 성격별로 넷으로 나눴다 — `public.ts`(쿠키 없음, 스냅샷 읽기), `server.ts`(쿠키, 제보·관리자), `browser.ts`, `admin.ts`.

**수정할 곳:** `04_data_model.md` §3.4 예시 코드.

---

## M. `09_test_and_ci.md` §7의 `force-dynamic` 지시가 캐시를 끈다 **[유도] ★**

§7이 CI 빌드를 통과시키려고 이렇게 지시한다.

```ts
export const revalidate = 3600;
export const dynamic = 'force-dynamic';   // ← 빌드 때 프리렌더하지 않는다
```
그리고 *"첫 요청에서 렌더되고 그 결과가 1시간 캐시된다"*고 적었다. **아니다.** `force-dynamic`은 라우트 캐시를 통째로 끄고 `revalidate`를 0으로 덮어쓴다. 결과는 **매 요청마다 DB 조회**이고 `revalidatePath()`는 비울 것이 없다.

**코드 대응:** `force-dynamic`을 쓰지 않았다. `[slug]` 라우트는 `generateStaticParams()`가 빈 배열을 돌려주므로 빌드가 아무것도 프리렌더하지 않고 첫 요청에서 렌더된 뒤 `revalidate` 동안 캐시된다. 파라미터가 없는 라우트는 `src/lib/data.ts`가 Supabase가 없을 때 `content/generated/*.json`을 읽으므로 빌드에 비밀값이 필요 없다. 빌드 출력에서 전 라우트가 `● (SSG)`로 확인된다.

**수정할 곳:** `09_test_and_ci.md` §7의 주.

---

## N. Zod 4에서 `z.record(z.enum([...]))`는 모든 키를 요구한다 **[유도]**

`04_data_model.md` §3.3의 `i18n: z.record(z.enum(['ko','en','ja','zh-CN']), …)`은 Zod 3에서 부분 맵이었지만 **Zod 4에서는 네 언어 전부를 요구한다.** UI가 한/영 2종이므로 수집한 관광지가 **전부 파싱에서 죽고**, 읽을 때마다 검증하는 구조이므로 **모든 페이지가 500**이 된다.

**코드 대응:** `z.partialRecord(...)`.

**수정할 곳:** `04_data_model.md` §3.3.

---

## O. 스펙 내부 숫자 불일치 2건 **[유도]**

| 위치 | 내용 |
|---|---|
| `03_external_data.md` §2.2 vs §2.9 (다) | §2.2가 *"박물관 3곳(타입 14)에는 이 값이 없다"*고 쓰는데 §2.9 표는 `국립공주박물관, 국립부여박물관 (2곳)`이다. 6곳 = 유적 4 + 박물관 2이므로 **2가 맞다** |
| `04_data_model.md` §3.2 | `accessibility` 스냅샷을 *"관광지별 항목 **32개**"*로 적는데 같은 문서 §3.3의 `isKtoScored` 주석과 `06_suitability.md` §6.7은 KTO 24 + 파생 8로 나눈다. 32는 맞지만 "그중 24가 갭 리포트 분모"라는 문장이 §3.2에 없어 오해를 만든다 |

---

## P. 인덱스 조건절 관련 — 스펙의 대가 설명이 거꾸로다 **[실측]**

`04_data_model.md` §5.2가 UTC 달력일 창의 대가를 *"23:50에 올린 사람이 00:10에 다시 올릴 수 있다"*고 적었다. Postgres 17에서 실제 생성 열 값을 측정한 결과 **반대다.**

```
2026-09-02 23:50 KST → created_day 2026-09-02
2026-09-03 00:10 KST → created_day 2026-09-02   ← 같은 날. 두 번째 제보 거부됨
2026-09-02 09:01 KST → created_day 2026-09-02   ← 창이 실제로 열리는 지점
```

UTC 기준이면 창은 **한국 시간 오전 9시**에 넘어간다. 자정이 아니다.

**코드 대응:** 생성 열을 `at time zone 'Asia/Seoul'`로 바꿨다 → [`03_deviations.md`](./03_deviations.md) D-1.

**수정할 곳:** `04_data_model.md` §5.2의 대가 설명.

---

## Q. `05_ingest.md` §4.2의 `resolveStatus()` 규칙은 확인된 장벽을 「모름」으로 만든다 **[실측 · 스펙에 직접 반영] ★**

스펙의 규칙 ②는 시설 부재를 복합어(`이용 불가`·`출입 불가`·`접근 불가`·`대여 불가`)로만 잡는다. **맨 `불가`와 「시설명사 + 없음」은 규칙 ④로 흘러가거나 `unknown`으로 떨어진다.** 실제 함수를 돌려서 확인한 값:

| 입력 | 스펙 규칙의 결과 | 맞는 답 |
|---|---|---|
| `계단만 있음` | `supported` | `unsupported` |
| `엘리베이터 없음` | `unknown` | `unsupported` |
| `보조견 동반 불가` | `unknown` | `unsupported` |
| `일부 구간 이용 불가` | `unsupported` | `partial` |

첫 줄이 최악이다 — 규칙 ④가 긍정 어휘를 **문장 어디서든** 매칭하므로, 계단뿐인 입구에 「확인된 항목: 엘리베이터」가 찍히고 필수인 「확인 필요」 블록은 렌더되지 않는다.

**스펙의 §4.2 논거 자체는 옳다** — 무장애 서술에서 `없음`은 좋은 상태를 말하는 경우가 많고(`단차 없음`), 이전 판이 그것들을 전부 뒤집어 실제 헛걸음을 만들었다. 문제는 그 논거가 **범용 `없음`을 아예 버리는 것**으로 이행됐다는 데 있다. 정규식은 `없음` 앞의 명사가 장애물인지 시설인지 볼 수 없다 — **그런데 호출 지점에는 capability 코드가 있다**(`ingest.ts`). 스펙의 규칙 집합은 그것을 쓰지 않는다.

**두 오류의 비용은 대칭이 아니다.** `단차 없음` → `unsupported`는 갈 수 있었던 여행을 놓치게 하고, **화면에 원문이 있으므로 방문자가 뒤집을 수 있다.** `엘리베이터 없음` → `unknown`은 확인된 장벽에 「확인 필요」를 붙여 **확인하러 가게 만들고, 도착해서 들어갈 수 없다.** 휠체어 이용자에게 잘못된 판정을 보여주는 것이 최악이라는 §1의 순위대로라면 후자가 더 무겁다.

**이 항목은 목록으로만 남기지 않고 스펙에 직접 반영했다.** 이전 규칙을 그대로 두면 다음 사람이 그것을 되살린다. 새 규칙은 부정어의 극성을 명사 옆 8자 안에서 읽는다 → `docs/spec/05_ingest.md` §4.2, 구현은 [`06_review_round.md`](./06_review_round.md) S1–S3.

---

## R. `04_data_model.md` §5는 RLS만 정하고 컬럼 권한을 정하지 않는다 **[실측 · 스펙에 직접 반영] ★**

**RLS는 어떤 행을 쓸 수 있는지만 정한다. 어떤 컬럼을 쓸 수 있는지는 정하지 못한다.** 스펙의 insert 정책은 `with check ((select auth.uid()) = reporter_id)` 하나이고, `created_at`은 평범한 쓰기 가능 열이며 `created_day`가 그것으로부터 생성된다. 따라서 `created_at`을 임의 날짜로 넣으면 하루 1건 unique 인덱스를 그대로 통과한다.

**Postgres 17.11에서 대조군까지 실측했다.** grant 블록이 없는 DB에서 같은 `authenticated` 호출자가 같은 (관광지, 분류)에 공개 제보 4건을 만들었고, 그중 하나는 `flagged_at`과 `hidden_reason`까지 스스로 세팅했다:

```
 detail | created_day | pre_flagged | hidden_reason
 y      | 2020-01-01  | f           |
 y2     | 2020-01-02  | f           |
 y3     | 2020-01-03  | t           | self-set
 legit  | 2026-09-02  | f           |
```

**스펙 자신이 논거를 이미 갖고 있었다.** §5의 주석 `-- 신고는 일반 사용자가 UPDATE 로 할 수 없다 (다른 컬럼까지 열리므로)`가 정확히 이 문제를 말하는데, 그 문장이 `flag_report` RPC로만 이행되고 insert 쪽에는 적용되지 않았다.

**읽기도 같다.** 스펙은 공개 읽기를 정책으로만 정한다 — 어떤 **행**을 읽을지는 정하지만 어떤 **컬럼**인지는 정하지 않는다. 테이블 전체 SELECT를 주면 PostgREST가 `?select=*`로 전부 공개하므로, `reporter_id`(방문자별 익명 식별자 — 이걸로 한 세션의 모든 제보를 묶을 수 있다)와 `flagged_at`(「이미 신고됐는지 알 수 없게」가 설계 목적)이 anon 키로 읽힌다. 실측으로 확인했고, 두 읽기 경로가 이름 붙인 컬럼만 주도록 좁혔다.

`docs/spec/04_data_model.md`에 §5.4를 새로 넣었다.

---

## S. Postgres 17의 `grant all on tables`는 여덟 개다 — 열거식 회수는 샌다 **[실측] ★**

R을 고치면서 배운 것이고, **스펙에 없는 것이 아니라 마이그레이션을 쓰는 방식에 관한 것**이므로 여기 적는다.

`config.toml`이 `major_version = 17`을 못 박고 있다. PG17에서 `grant all on tables`는 `arwdDxtm` — **여덟 개**다. 여덟 번째 `m` = `MAINTAIN`이 17에서 새로 생겼다. 이름을 열거해 회수하면 그것이 남는다. `anon`으로 실측:

```
LOCK TABLE data_snapshots IN ACCESS EXCLUSIVE MODE  → granted=t
VACUUM FULL barrier_reports                         → VACUUM
CLUSTER data_snapshots USING data_snapshots_pkey    → CLUSTER
REINDEX TABLE admin_users                           → (success)
```

전부 ACCESS EXCLUSIVE 락을 잡고, `VACUUM FULL`과 `CLUSTER`는 테이블을 다시 쓴다. **RLS는 그중 어느 것도 보지 않는다.**

**따라서 마이그레이션의 형태는 `revoke all` + 필요한 것만 grant여야 한다.** 열거식은 작성 시점의 Postgres를 영원히 가정하고, 다음 버전이 또 하나를 추가하면 그날부터 조용히 샌다. `TRUNCATE`도 같은 종류다 — 행 연산이 아니어서 RLS가 개입하지 않고, `authenticated`로 RLS 켜진 테이블을 실제로 비웠다.

---

## 확인해 준 것 — 스펙이 맞았던 것

틀린 것만 적으면 균형이 깨지므로 함께 남긴다. 매뉴얼 원문 대조로 **확인된** 스펙의 주장들:

- `detailWithTour2` 응답 = `contentid` + 무장애 28개 = 29개, 그중 24개가 점수 대상 **[원문 확인]**
- 필드 철자 28개 전부 일치. 특히 `braileblock`·`brailepromotion`의 `l` 하나, `infantsfamilyetc`의 복수형, 기타 4개의 서로 다른 접두사 **[원문 확인]**
- `handicaptoilet`/`handicapparking`/`nursingroom`은 **존재하지 않는다** (grep 0건) **[원문 확인]**
- `contentTypeId`에 **39 음식점 포함** — 코드표와 파라미터 설명 양쪽 **[원문 확인]**
- 개발계정 **"각 오퍼레이션별 일일 1,000건"** — 활용신청 매뉴얼 원문 그대로 **[원문 확인]**
- `storyBasedList` 응답의 `addr1`=경도 / `addr2`=위도, 둘 다 필수 **[원문 확인]**
- `themeBasedList`의 `addr1`/`addr2`는 **진짜 주소**(충청남도/부여군). 같은 이름이 두 오퍼레이션에서 다른 뜻이다 **[원문 확인]**
- `storyLocationBasedList`의 표(`mapX`/`mapY`/`langCode`) vs 예시 URL(`xCoord`/`yCoord`/`lang`) 갈라짐 **[원문 확인]**
- `DataLabService`에 **지역 파라미터가 없다** — 요청 파라미터 8개 중 데이터를 좁히는 것은 `startYmd`/`endYmd` 둘뿐 **[원문 확인]**
- 집중률 = **"현재일 기준으로 향후 30일"** 예측치. `cnctrRate`의 단위·분모·상한은 매뉴얼에 없다 **[원문 확인]**
- 행정표준코드 충남 `44` · 공주 `44150` · 부여 `44760` (xlsx 138행·146행) **[원문 확인]**
- `detailInfo2`의 `infoname`에 「장애인편의시설」이 타입 12·38에는 있고 **타입 14에는 없다** **[원문 확인]**
- `HS010200`/`HS010700`/`HS010800` → 12/76, `VE070100` → 14/78 **[원문 확인]**
- `gallerySearchList1` 실재 (P0-8 해소 근거) **[원문 확인]**
- `searchKeyword1` 응답에는 `tAtsCd`가 있고 `areaBasedList1` 응답 표에만 빠져 있다 **[원문 확인]**
- 생성 열 `(created_at at time zone '…')::date`가 IMMUTABLE이므로 인덱스에 쓸 수 있다 — `pg_proc.provolatile = 'i'`로 확인 **[실측]**
- 유니크 인덱스가 같은 날 두 번째 제보를 실제로 거부한다 **[실측]**
- `flag_report()`가 두 번째 호출에서 아무 일도 하지 않는다 **[실측]**
- RLS 6개 정책이 의도대로 동작한다 — 익명 2/3행, 작성자 3/3행(숨김 포함), 다른 사용자 2/3행, 관리자 3/3행 **[실측]**
- 컬럼 단위 권한 적용 후에도 정상 경로 전부 동작 — 5컬럼 insert, 관리자의 4컬럼 update(`returning id` 1행), `anon`의 `flag_report`, `service_role`의 만료 제보 삭제 **[실측]**
- `service_role`이 회수 대상에 없어 ingest와 `createAdminClient()`가 그대로 동작한다 **[실측]**
- `image-proxy`의 호스트 허용목록을 우회할 수 없다 — 대소문자·사용자정보·끝점·IPv6 전부 403, `redirect: 'error'`가 리다이렉트 탈출을 막는다 **[실측]**
