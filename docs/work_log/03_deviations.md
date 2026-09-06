# 03 — 스펙과 일부러 다르게 만든 것

> [`02_spec_corrections.md`](./02_spec_corrections.md)는 **스펙이 틀린 것**이다. 이 문서는 **스펙이 맞지만 다르게 만든 것**이고, 각 항목에 무엇이 나빠지는지를 함께 적었다.
>
> 스펙을 이기려는 목록이 아니다. 나중에 "왜 이렇게 돼 있지"를 묻는 사람이 근거 없이 되돌리지 않게 하려는 목록이다.

---

## D-1. 제보 중복 창의 시간대를 UTC → Asia/Seoul

**스펙:** `04_data_model.md` §5.2 — `created_day date generated always as ((created_at at time zone 'UTC')::date) stored`

**구현:** `at time zone 'Asia/Seoul'`

**왜:** 스펙이 UTC를 고른 **이유**는 "24시간 창은 인덱스로 강제할 수 없으니 달력일로 하자"였다. 그 이유는 시간대와 무관하다. 그런데 UTC를 쓰면 창이 **한국 시간 오전 9시**에 넘어가고, 제보 화면의 문구 「같은 날에는 같은 제보를 한 번만 올릴 수 있습니다」가 저녁에 제보하는 사람에게 거짓이 된다. `Asia/Seoul`도 똑같이 IMMUTABLE이라 인덱스에 쓸 수 있고, 스펙이 세운 논거를 그대로 만족시키면서 문구가 참이 된다.

**나빠지는 것:** 스펙 문장과 코드가 글자 단위로 다르다. 스펙을 diff하는 사람이 이 줄에서 멈춘다. 그래서 마이그레이션 주석에 이유를 적었다.

**뒤집히는 조건:** 서비스가 한국 밖 사용자를 상대하게 되면 "그 사람의 하루"가 다시 애매해진다. 그때는 창 자체를 다시 설계한다.

---

## D-2. Supabase 클라이언트를 3개 → 4개로

**스펙:** `02_stack.md` §2 폴더 트리 — `server.ts` / `browser.ts` / `admin.ts`

**구현:** `public.ts`를 추가. 스냅샷 읽기 전용, 쿠키를 만지지 않는다.

**왜:** [`02_spec_corrections.md`](./02_spec_corrections.md) L 참조. `@supabase/ssr`의 클라이언트는 `cookies()`를 읽고, 그러면 라우트가 dynamic이 되어 `02_stack.md` §5의 캐시 설계가 죽는다. 스냅샷은 전 방문자에게 동일한 공개 데이터이므로 세션이 필요 없다.

**나빠지는 것:** 파일이 하나 늘고, "어느 클라이언트를 쓰나"를 판단할 자리가 하나 늘었다. 각 파일 첫 줄이 그 판단을 적어 뒀다.

---

## D-3. 화면이 읽는 데이터 원천을 고를 수 있게 했다

**스펙:** 화면은 `data_snapshots`를 읽는다. 그 외의 원천은 없다.

**구현:** `src/lib/data.ts`가 `supabase` 또는 `fixtures`(= `content/generated/*.json`)를 고른다. `MODU_DATA_SOURCE`로 명시하거나, 비우면 Supabase 환경변수 유무로 결정한다.

**왜:** Supabase 프로젝트가 없는 상태에서 화면이 전부 「아직 수집된 데이터가 없습니다」만 보여주면 검토도 시연도 불가능하다. 그리고 `content/generated/`는 스펙이 이미 요구한 산출물이다(`05_ingest.md` §2 — git 이력용 사본). 새 데이터 원천을 만든 것이 아니라 이미 있는 파일을 읽게 한 것이다.

**안전장치:** **Vercel에서 fixtures로 떨어지면 예외를 던진다.** 환경변수를 잃은 배포가 조용히 예시 데이터를 서빙하는 것이 이 기능의 유일한 위험이고, 그 자리에서 죽는 쪽을 골랐다.

**나빠지는 것:** 판단 지점이 하나 늘었다. `resolveSource()` 한 함수에 모아 뒀다.

---

## D-4. 관광지 상세 ③에 분야 탭을 쓰지 않았다

**스펙:** `07_screens.md` S3 ③ — `[분야 탭] 진입 · 이동 · 편의시설 · 정보안내 · 휴식 · 상황`

**구현:** 탭 없이 6개 축을 `<h2>`로 나눠 전부 펼쳐 두고, 위에 축으로 이동하는 링크 목록을 둔다.

**왜:** 선택되지 않은 탭 패널은 접근성 트리에서 제거된다. 그런데 이 화면의 완료 기준은 **"32항목 전부가 상태·원문·출처·확인일과 함께 보인다"** 다. 같은 문서 S2가 지도 탭을 없앨 때 쓴 논거와 같다 — 목록이 진실이면 목록을 감추지 않는다.

**나빠지는 것:** 화면이 길어진다. 32항목 × 원문이 한 페이지에 다 있다. 축 이동 링크가 그 대가를 줄이지만 없애지는 못한다.

---

## D-5. 지도를 넣지 않았다

**스펙:** `11_open_items.md` **DEC-2** — *"목록만으로 시작. 여유 있으면 추가"*

**구현:** DEC-2의 기본값을 그대로 따랐다. `NEXT_PUBLIC_KAKAO_MAP_JS_KEY`는 `.env.example`에 남겨 뒀고 SDK를 로드하는 코드는 없다.

**부수 효과 — 개인정보 처리방침이 짧아졌다.** 처리 위탁에 **Kakao Corp.을 적지 않았다.** 쓰지 않는 위탁사를 처리방침에 적는 것은 그 자체로 부정확하다. 지도를 넣으면 그때 한 줄을 추가한다.

---

## D-6. 서체를 직접 호스팅한다

**스펙:** `02_stack.md` §1 — Pretendard (SIL OFL 1.1), 웹 폰트로만 사용

**구현:** Pretendard Variable의 unicode-range 서브셋 92개를 `public/fonts/pretendard/`에 넣고 `src/app/fonts.css`가 `@font-face`를 선언한다.

**왜:** 외부 서체 서비스를 부르면 **처리방침에 없는 위탁사가 생긴다.** 그리고 서브셋 방식이면 한 페이지가 실제로 쓰는 유니코드 범위만 내려받는다(전체 2.06MB 중 보통 150~250KB). 현장에서 통신이 나쁜 조건에 있을 사용자가 1급 대상인 서비스에서 이건 성능이 아니라 접근성 문제다.

**나빠지는 것:** 저장소에 3.1MB가 들어왔다. 그리고 서브셋 파일은 손으로 고칠 수 없다 — 다시 내려받아 URL을 다시 가리켜야 한다. `fonts.css` 머리에 적어 뒀다.

---

## D-7. 카탈로그에 `labelEn`을 추가했다

**스펙:** `05_ingest.md` §4.1의 `CAPABILITIES`에는 `labelKo`만 있다.

**구현:** `labelEn`을 함께 넣었다. `PERSONAS`·`AXIS_LABEL`도 같다.

**왜:** `01_scope.md` §4.2가 UI를 한/영 2종으로 정했고 완료 기준 D-9가 영문 모드에서 S1~S3을 요구한다. 그런데 스펙 어디에도 항목 32개·페르소나 5개·축 6개의 영어 이름이 없다. 영문 화면이 항목 코드(`braille_promotion`)를 그대로 보여주는 것보다 낫다.

**나빠지는 것:** 이 영어 이름들은 아무도 검수하지 않았다. 접근성 용어의 영어 표현은 번역이 아니라 업계 관용이 있는 영역이므로, 영문 화면을 실제로 내보내기 전에 한 번 봐야 한다 → [`04_open_items.md`](./04_open_items.md).

---

**검토 결과 (2026-09-07, 결정 5):** 32개 중 **20개를 고쳤다.** ADA 2010 Standards, ISO 21542:2021, VisitEngland Key Accessibility Features(2024), Assistance Dogs International, RNIB·NAD 표기 지침에 대고 확인했다.

가장 컸던 셋:

- **`help_dog` `Guide dog access` → `Assistance dogs`.** 보조견은 안내견·청도견·지체장애 보조견을 다 포함하는데 `guide dog`은 시각장애만이다. **`service animal`은 함정이다** — Assistance Dogs International 정의에서 service dog은 *시각·청각장애를 제외한* 부분집합이라, 국제 독자에게는 「안내견은 안 된다」로 읽힌다. ISO 21542 §10.12도 "guide and other assistance dogs"다
- **`wheelchair` `Wheelchair` → `Wheelchair rental`.** 영어가 아니라 **데이터가 틀렸던 것**이다. 이 KTO 필드는 `휠체어대여`(`03_external_data.md` §2.9)인데, 목록에서 홀로 선 `Wheelchair`는 「이곳이 휠체어로 접근 가능한가」로 읽힌다 — 데이터가 뒷받침하지 않는 훨씬 큰 주장이다
- **`hearing_room` `Room for deaf guests` → `Hearing-accessible room`.** 난청 방문자를 배제하는 표현이었고(그쪽이 더 많다), 시설이 아니라 사람을 이름 붙인다. Marriott·Hilton·IHG가 전부 "Hearing Accessible"을 쓴다. 짝이 되는 `room`도 `Wheelchair-accessible room`으로 바꿔 둘이 구분되게 했다

**일부러 안 바꾼 것 둘.** `elevator`는 ISO가 `lift`를 앞세우지만 **한국 현장 표지판이 ELEVATOR**라 그대로 뒀다 — 찾아 다녀야 하는 단어는 표지판과 맞는 편이 낫다. `stroller`도 인천공항·서울 다누림이 공식 영문에서 쓰는 말이라 유지했다.

**상태 단어도 축을 갈랐다.** `Confirmed / Partly available / Not available / No information` → **`Available / Partly available / Not available / Not known`**. 앞의 셋은 시설을, 마지막은 우리 정보를 말한다. 영국 정부 통계 표기 지침이 "not available"을 **자료 없음**의 뜻으로 쓰기 때문에, `Not available`과 `No information`이 같은 말로 읽히고 있었다 — 한국어(`이용 불가` / `정보 없음`)에는 없던 혼동이다.

원인 단어에서는 `(confirmed)`를 뺐다. 내부 기록 용어가 화면에 샌 것이고, 상태 단어 `Confirmed`와 충돌했으며, 같은 개념을 범례에서는 `(established)`로 쓰고 있었다.

## D-8. 스냅샷 `pois`에 필드 4개를 추가했다

**스펙:** `04_data_model.md` §3.3 `PoiSchema`

**추가:** `cityKo` · `cityEn` · `isUnescoComponent` · `unescoComponentNote`

**왜:**
- `cityKo`/`cityEn` — 카드에 시군명을 쓰려면 필요하다. 없으면 주소 문자열을 앞 두 토큰만 잘라 쓰게 되는데, 그건 데이터 형태에 의존하는 파싱이다.
- `isUnescoComponent`/`unescoComponentNote` — `_probe-results.md` P0-7이 **"6곳 중 4곳만 구성유산이고 부소산성은 구성유산의 일부"** 라고 확정했고, 스펙 여러 곳이 이 구분을 화면에서 지키라고 요구한다. `heritageLabel`이 `null`인지로는 표현할 수 없다 — 부소산성은 `heritageLabel`이 있으면서 구성유산의 일부다.

**나빠지는 것:** 스펙의 스키마와 코드의 스키마가 다르다. `snapshot-schema.ts`가 데이터 모델의 정의라는 원칙(§3.3) 덕에 코드가 단일 원천이지만, 스펙 문서를 읽고 온 사람은 어긋남을 본다.

---

## D-9. 코스 총 소요 시간에 휴식 시간을 더하지 않았다

**스펙:** `06_suitability.md` §7 — *"총 소요 시간 = Σ(체류 시간 × 페르소나 배수) + Σ(이동 시간) + **휴식 시간**"*

**구현:** 체류 + 이동만 더한다. 휴식은 경고로만 나온다.

**왜:** **휴식 시간의 값이 스펙 어디에도 정의돼 있지 않다.** 그리고 같은 스펙 `07_screens.md` S4의 계산 예시가 `(90×1.30) + 20 + (60×1.30) = 215분`으로 휴식을 빼고 계산한다. 값을 지어내면 화면에 근거 없는 숫자가 하나 생긴다.

**나빠지는 것:** 휴식을 실제로 하면 총 시간이 화면 값보다 길다. 휴식 경고가 그 자리에서 "여기서 쉬라"고 말하지만, 총 시간에는 반영되지 않는다.

---

## D-10. 골든 케이스가 24건이 아니라 27건이다

**스펙:** `06_suitability.md` §8 + `09_test_and_ci.md` §2 = 24건

**구현:** 골든 파일 27개.

| 늘어난 이유 | 개수 |
|---|---|
| `boundary-74-75`를 두 입력으로 분리 (§8이 "두 입력을 파일에 박는다"고 요구) | +1 |
| §8 14번의 두 갈래를 파일로 분리 (`alternatives-by-label` / `alternatives-none-better`) | +1 |
| `not-applicable-excluded` 신설 — §3이 요구하는 `not_applicable` 제외 동작에 골든이 없었다 | +1 |

**성질 테스트는 스펙대로 8건이다.** 총 60개 단위 테스트가 통과한다.

---

## D-11. 도슨트 플레이어가 자체 버튼 대신 브라우저 컨트롤을 쓴다

**스펙:** `07_screens.md` S6 규칙 4 — *"재생·일시정지·볼륨은 항상 보이는 실제 `<button>`"*

**구현:** `<audio controls>`.

**왜:** 네이티브 컨트롤은 실제 버튼이고, 키보드 조작·볼륨·탐색 바를 브라우저가 이미 정확하게 구현하고 스크린리더에 정확한 이름을 준다. 직접 만들면 그 셋을 다시 만들어야 하고, 세 개 다 틀리기 쉬운 것들이다. 규칙의 의도(항상 보이는 실제 컨트롤)는 그대로 충족된다.

**덧붙인 것:** 대본과 재생 시간으로 WebVTT를 만들어 `<track kind="captions">`로 붙였다. 재생 시간이 없으면 항목 전체를 덮는 큐 하나를 낸다 — 없는 타이밍을 지어내지 않으면서 자막 트랙이 실재하게 하는 형태다.

---

## D-12. `/admin`을 두 번째 루트 레이아웃으로 뒀다

**스펙:** `02_stack.md` §2 폴더 트리 — `src/app/admin/reports/page.tsx` (locale 밖)

**구현:** `src/app/(admin)/admin/reports/page.tsx` + `src/app/(site)/[locale]/...`. 라우트 그룹 두 개, 루트 `layout.tsx` 없음.

**왜:** `<html lang>`이 로케일에 따라 바뀌어야 하는데 Next의 루트 레이아웃은 `params`를 받지 못한다. 라우트 그룹마다 루트 레이아웃을 두는 것이 이 문제의 공식 해법이다. URL은 스펙 그대로 `/admin/reports`다.

**나빠지는 것:** 두 그룹 사이를 오갈 때 전체 페이지 로드가 일어난다. 관리자와 방문자는 다른 사람이므로 실제 비용은 없다.

---

## D-13. `report_category` 미러 검사를 추가했다

**스펙에 없다.** `src/domain/types.ts`의 `REPORT_CATEGORIES`와 `002_reports.sql`의 `report_category` enum은 같은 8개 값의 두 사본이고, 어긋나도 아무것도 실패하지 않는다 — 프로덕션에서 방문자가 제보를 올릴 때 insert가 죽는다.

`pnpm validate:content`가 마이그레이션 파일의 enum을 파싱해 비교한다. **오늘 데이터에서 실제로 빨간불이 될 수 있는 검사다.**

같은 이유로 `src/lib/kto/field-names.test.ts`가 무장애 필드 28개의 두 사본(`BARRIER_FREE_FIELD_NAMES` ↔ `CAPABILITIES[].ktoField` + `KTO_ETC_FIELDS`)을 비교한다. 철자 하나가 틀리면 그 항목이 **영원히 빈 채로** 남는데, 그건 화면에 「정보 없음」으로 보이므로 버그처럼 보이지 않는다. 두 검사 모두 일부러 깨뜨려 빨간불을 확인했다 → [`05_verification.md`](./05_verification.md).

---

## D-14. 프로덕션 빌드에서 픽스처를 쓰려면 명시해야 한다

**스펙:** `src/lib/data.ts`가 Supabase가 없으면 `content/generated/*.json`으로 떨어진다. 배포에서 그러지 않도록 `process.env.VERCEL === '1'`일 때 던진다.

**구현:** `VERCEL === '1' || NODE_ENV === 'production'`일 때 던진다. 픽스처를 프로덕션 모드로 돌리려면 `MODU_DATA_SOURCE=fixtures`를 말해야 하고, 그걸 하는 스크립트가 `pnpm build:fixtures`·`pnpm start:fixtures`다.

**이유:** Vercel만 보는 가드는 Vercel에서만 유효하다. `next build && next start`는 Docker에서도, VPS에서도, 심사용 노트북에서도 똑같이 프로덕션 배포이고, `pnpm seed:fixtures`가 서브될 바로 그 디렉터리에 파일을 쓴다. 예시 데이터를 수집한 데이터처럼 내려주는 것은 이 서비스가 존재하는 이유와 정면으로 어긋난다.

**대가:** CI와 Playwright의 `webServer`가 `pnpm build`에서 `pnpm build:fixtures`로 바뀌었다. 플레인 `pnpm build`를 Supabase 없이 돌리면 모든 스냅샷 라우트가 오류 화면으로 프리렌더된다 — 처음 보면 고장처럼 보이지만, 그게 정확한 동작이다.

---

## D-15. 화면마다 「예시 데이터」 배너를 띄운다

**스펙:** 데이터 원천을 알리는 UI 요구가 없다.

**구현:** `currentDataSource() === 'fixtures'`이면 모든 화면 상단에 `role="status"` 한 줄이 붙는다.

**이유:** `currentDataSource()`는 원래 이 목적으로 쓰인 함수인데 **어디서도 import되지 않았다.** 데이터가 어디서 왔는지를 논거로 삼는 서비스에서, 아무것도 수집되지 않은 유일한 상태를 화면이 말하지 않는 것은 앞뒤가 맞지 않는다. 심사위원이 픽스처 화면을 수집 결과로 오해하는 것도 막는다.

---

## D-16. 제보 성공이 화면을 넘기지 않고 확인 화면으로 바뀐다

**스펙:** S7 완료 기준은 등록 후 관광지 화면의 제보 절로 이동하는 것이다.

**구현:** 폼이 확인 패널로 교체된다. 패널이 포커스를 받고 `role="status"`이며, 관광지 화면으로 가는 링크가 그 안에 있다.

**이유:** `setAnnouncement(t('done')); router.push(...)`는 같은 tick에서 리전을 언마운트한다. 제보가 접수됐다는 **단 하나의 확인 문구가 절대 읽히지 않는다.** 스펙이 쓴 메시지 두 개(`report.done`, `report.goPlace`)가 둘 다 이 확인 패널을 전제로 쓰여 있었고 `goPlace`는 어디에도 쓰이지 않고 있었다 — 이 설계가 원래 의도였던 것으로 읽었다.

**대가:** 이동이 한 번 더 필요하다. 링크는 여전히 `#visitor-reports`로 간다.

---

## D-17. 관리자 화면이 메시지 파일을 쓴다

**스펙:** `/admin`은 로컬라이즈 트리 밖이고 운영자는 한 명이다.

**구현:** 로케일을 `ko`로 **고정**하고 `NextIntlClientProvider`에 `admin`·`common` 두 네임스페이스만 넘긴다.

**이유:** `admin` 네임스페이스 29개 키가 두 로케일에 다 있는데 **하나도 쓰이지 않았고**, 화면은 같은 한국어를 하드코딩하고 있었다. 그 상태에서 `admin.copied`의 뒷문장(「`content/curated-facts.json`에 붙여넣고 커밋하세요」)이 통째로 빠져 있었다 — 제보가 사실이 되는 유일한 경로를 지시하는 문장이다.

같은 작업에서 `hidden_reason`에 저장되는 값을 한국어 라벨에서 **안정된 코드**(`abuse`/`false`/`duplicate`/`privacy`/`other`)로 바꿨다. 몇 달 뒤 읽는 DB 컬럼에 표시 문자열을 넣으면 문구를 다듬는 순간 저장된 데이터에서 한 사유가 조용히 둘로 갈라진다.

---

## D-18. 이미지 URL을 수집 시점에 결정한다

**스펙:** ingest가 `http`를 `https`로 치환하고, 치환된 URL이 실제로 열리지 않는 자산은 `/api/image-proxy`로 우회한다.

**구현:** ingest가 `https` 형태를 HEAD로 찔러 보고, 열리지 않으면 스냅샷에 `/api/image-proxy?url=…` 경로를 저장한다. 스냅샷 스키마가 두 형태만 허용한다.

**이유:** 우회 경로가 **선택되는 지점이 없었다.** `/api/image-proxy`는 완성된 라우트인데 `src/` 어디서도 참조되지 않았고, 참조되지 않는 fetch 엔드포인트는 그냥 부채다. 판정을 수집 시점으로 옮기면 살아 있는 호스트에 대고 한 번 확인하고, 결과가 커밋된 파일에 남고, 코드가 아니라 데이터가 라우트를 참조한다.

**대가:** 이미지 1건당 HEAD 1회. 하루 한 번 돌고, 같은 URL은 실행 중 메모이즈한다.

---

## D-19. 메시지 파일 대칭 검사를 추가했다

**스펙:** `09_test_and_ci.md` §1의 테스트 집합에 없다.

**구현:** `src/i18n/messages.test.ts` 5건 — 두 로케일의 키 집합, 자리표시자 이름, 배열 길이, 빈 문자열 없음, 그리고 라우터가 서브하는 로케일이 실제로 둘인지.

**이유:** **키가 한쪽에만 있으면 next-intl은 던지지 않는다.** 서버 로그에 `MISSING_MESSAGE`를 남기고 화면에는 키 이름을 그대로 찍는다 — 문장이 있어야 할 자리에 `place.score`가 나온다. 브라우저만 보면 보이지 않고, 서버 로그를 읽는 사람만 안다.

**실제로 이 결함이 있었다.** 이번 라운드에서 새로 넣은 라이브 리전 문구를 `places` 네임스페이스에 넣었는데 `ReportsSection`은 `place`를 읽는다. E2E 첫 실행의 서버 로그에서 잡혔고, 그게 이 검사를 붙인 이유다. 자리표시자 검사도 같은 종류다 — `{score}`와 `{value}`가 갈리면 숫자가 사라지고 중괄호가 글자로 남는다.

일부러 깨뜨려 빨간불을 확인했다 → [`05_verification.md`](./05_verification.md) §5.2.
