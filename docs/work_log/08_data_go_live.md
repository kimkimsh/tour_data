# 08 — 키가 들어오고 실제 데이터가 붙기까지

> **한 줄:** 공공데이터포털 API 11종과 Supabase가 모두 연결됐고, **`pnpm ingest`가 처음으로 경고 0건으로 완주해 6개 스냅샷을 실제 데이터베이스에 올렸다.** 화면의 무장애 항목이 더 이상 전부 「정보 없음」이 아니다.
>
> 04번이 「키가 없어서 막힌 것」으로 잡아 둔 항목 대부분이 여기서 닫힌다. **닫히지 않은 것은 §7에 남긴다.**

---

## 1. 무엇이 열렸나

### 1.1 API 11종, 전부 실호출로 확인

승인 상태를 추측하지 않고 매번 실제로 호출해서 확인했다. 게이트웨이는 **경로를 먼저 해석하고 키를 나중에 검증**하므로 `resultCode 12`(그 주소에 서비스 없음)와 `30`(주소는 맞고 키에 권한 없음)이 서로 다른 답이고, 이 구분이 「코드가 틀렸다」와 「신청을 안 했다」를 가른다.

| # | 데이터셋 | 서비스ID | 확인 |
|---|---|---|---|
| 1 | `15101897` | `KorWithService2` | `detailWithTour2` 6곳 응답 |
| 2 | `15101578` | `KorService2` | `areaCode2` → `0000` |
| 3 | `15101753` | `EngService2` | `areaCode2` → `0000` |
| 4 | `15101971` | `Odii` | `storyBasedList?langCode=ko` → 백제문화단지 스크립트 |
| 5 | `15128555` | `TatsCnctrRateService` | `areaCd=44&signguCd=44150` → totalCount 1740 |
| 6 | `15101972` | `DataLabService` | `locgoRegnVisitrDDList` → §3 참조 |
| 7 | `15128560` | `TarRlteTarService1` | `searchKeyword1` → 3곳 응답 |
| 8 | `15101914` | `PhotoGalleryService1` | `gallerySearchList1` → 사진 419장 |
| 9 | `15000415` | `WthrWrnInfoService` | `getPwnStatus` → `t6: "o 없 음"` |
| 10 | `15084084` | `VilageFcstInfoService_2.0` | `getVilageFcst` → 공주 21시 19℃ |
| 11 | `15059468` | `MidFcstInfoService` | `getMidLandFcst`·`getMidTa` → +5~10일 |

`JpnService2`·`ChsService2`는 **범위에서 뺐다** (§5).

### 1.2 Supabase — 서울 리전으로 다시 만들었다

처음 만든 프로젝트가 `ap-south-1`(뭄바이)이었다. 데이터가 0행일 때 옮기는 비용이 거의 없어서 **`ap-northeast-2`(서울)** 로 다시 만들고 뭄바이 쪽은 삭제했다.

| 항목 | 값 |
|---|---|
| 프로젝트 | `modu-baekje-seoul` (`fknalohsrflajuukcxgl`) |
| 마이그레이션 | `001_snapshots` · `002_reports` 적용, 원격 버전 기록도 `001`/`002`로 맞춤 |
| 컬럼 권한 | anon 6컬럼 SELECT · authenticated 9 SELECT / 5 INSERT / 4 UPDATE — `information_schema.column_privileges`로 대조 |
| 익명 로그인 | 켜짐. `POST /auth/v1/signup` → `is_anonymous: true` |

원격 마이그레이션 버전을 `001`/`002`로 되돌려 놓은 이유: MCP가 붙이는 타임스탬프 버전을 그대로 두면 나중에 `supabase db push`가 저장소의 `001_*.sql`·`002_*.sql`을 미적용으로 보고 다시 실행하려 든다.

### 1.3 새 키 체계

Supabase가 키 이름을 바꿨다. 대시보드가 기본으로 보여주는 것은 **Publishable key**(`sb_publishable_…`)와 **Secret key**(`sb_secret_…`)이고, `anon`/`service_role` JWT는 같은 화면의 **Legacy API keys**를 펼쳐야 나온다 (2026년 말까지 동작).

환경변수 이름은 그대로 두고 값만 새 형식을 넣었다. 역할 매핑이 같아서 `supabase/migrations/`의 권한 설계는 손댈 게 없다. 실제로 경계를 확인했다:

```
secret key      → data_snapshots 쓰기   HTTP 201
publishable key → data_snapshots 쓰기   HTTP 401
publishable key → barrier_reports.reporter_id 읽기   42501 permission denied
```

`data_snapshots`에는 write policy가 아예 없으므로, 쓰기가 통했다는 것 자체가 secret key가 `service_role`로 매핑됐다는 증거다.

---

## 2. `pnpm ingest`는 실행조차 되지 않고 있었다

```
ERROR: Top-level await is currently not supported with the "cjs" output format
  scripts/ingest.ts:1048:0
```

`package.json`에 `"type": "module"`이 없어서 tsx가 esbuild에 `cjs` 포맷을 넘기고, CJS는 top-level await를 담지 못한다. `scripts/ingest.ts`의 마지막 줄 `await main();`이 저장소에서 유일한 top-level await였다.

같은 폴더의 `scripts/probe.ts`는 `main().then(...)` 형태라 멀쩡히 돌았다. 그 패턴에 맞췄다. 설정 파일도 파일 이름도 안 건드렸다.

> **이 버그는 04번 어디에도 없었다.** 키가 없으면 `requireKey()`가 먼저 죽어서 이 지점까지 도달하지 않기 때문이다. 키가 들어오는 순간 처음 드러난 종류의 실패다.

---

## 3. 방문자 수가 비던 진짜 원인 — 발행 지연 30일

`context.visitors`가 매번 빈 배열이었다. 스펙은 지연을 4일 정도로 **가정**하고 `[미확인]`으로 뒀고, 수집기는 오늘부터 14일까지만 뒤로 걸었다.

하루에 한 콜씩 실제로 재 본 결과:

```
20260913 … 20260815  →  resultCode 0000, totalCount 0   (30일 연속)
20260814             →  resultCode 0000, totalCount 807
```

**빈 날은 오류가 아니고 데이터의 끝도 아니다.** `resultCode`가 `0000`이라 「아직 발행 안 됨」과 「그날 방문자가 없음」이 구별되지 않는다. 탐색 상한이 지연보다 짧으면 모든 호출이 성공하고 모든 호출이 비어서, **멀쩡한 서비스가 죽은 것처럼 보인다.**

원래 코드의 설계 — 「지연을 가정하지 말고 매번 측정한다」 — 는 맞았고 상한만 틀렸다. 상한을 `VISITOR_LAG_SCAN_DAYS = 45`로 이름 붙여 빼내고 근거를 주석에 남겼다.

결과: 공주시 일평균 **79,241명**, 부여군 **28,789명** (20260807–20260814 8일 평균, `touDivCd=2` 외지인).

---

## 4. `contentId` 6개 — 값은 이미 저장소 안에 있었다

`content/pois.json`의 `ktoContentId`가 6곳 모두 `"UNRESOLVED"`였고, 그것이 화면이 전부 「정보 없음」이던 직접 원인이었다.

값 자체는 `docs/spec/_probe-results.md` P0-11이 `areaBasedSyncList2`로 이미 찾아 적어 두었는데 `pois.json`으로 옮겨지지 않은 상태였다. 옮기기 전에 6개 전부 `detailCommon2`로 실호출해 좌표를 대조했다.

| slug | contentId | 좌표 오차 | contentTypeId |
|---|---|---|---|
| gongsanseong | 125949 | 0.0m | 12/12 |
| muryeong-royal-tombs | 126681 | 5.4m | 12/12 |
| gongju-national-museum | 129787 | 5.5m | 14/14 |
| busosanseong | 125988 | 0.0m | 12/12 |
| jeongnimsaji | 126650 | 0.0m | 12/12 |
| buyeo-national-museum | 130062 | 0.0m | 14/14 |

집중률 API가 쓰는 `tatsName`도 비어 있었다. `tAtsNm` 전수 열거(공주 58건·부여 51건)에서 정확히 일치하는 이름을 찾고, 각각 `tAtsNm` 필터로 다시 호출해 30일치 예보가 오는 것을 확인한 뒤 넣었다.

`pnpm validate:content`가 이 시점에 초록이 됐다.

---

## 5. 일문·중문을 범위에서 뺐다

화면도 데이터도 한/영 2종으로 확정됐다. 지운 곳은 두 군데뿐이다.

- `src/domain/types.ts` — `CONTENT_LOCALES`를 `LOCALES`에서 **파생**시켰다. 값을 다시 적지 않았다
- `src/lib/kto/services.ts` — `SERVICE_IDS`에서 `jpn`/`chs`, `MULTILINGUAL_SERVICE_IDS`에서 `ja`/`zh-CN`

**둘을 따로 고치면 조용히 깨진다.** `MULTILINGUAL_SERVICE_IDS`만 지우면 ingest 루프가 여전히 `'ja'`를 뱉고, `MULTILINGUAL_SERVICE_IDS['ja']`가 `undefined`가 되어 `https://apis.data.go.kr/B551011/undefined/detailCommon2`를 요청한다. 그리고 그 줄의 `as MultilingualLocale` 캐스팅이 **컴파일 에러를 정확히 그 지점에서 막는다.** 값을 다시 적는 대신 파생시킨 이유가 이것이다.

`content/generated/pois.json`의 `i18n` 키는 **처음부터 `ko`·`en` 둘뿐이었다.** 일문·중문 행은 한 번도 수집된 적이 없다. 이 변경으로 코드·데이터·서술이 처음으로 일치한다 — `docs/spec/_proposal-delta.md`의 「기본 정보만 4언어」 답변이 제출 시점에도 이미 사실이 아니었다.

---

## 6. 기상 예보 2종을 붙였다

### 6.1 특보와 예보는 다른 계약이다

`src/lib/kma/warnings.ts`(특보)와 별도로 `src/lib/kma/forecast.ts`를 만들었다. 합치지 않은 이유는 **틀렸을 때의 결과가 다르기 때문**이다.

- **특보**는 지금 무슨 일이 벌어지고 있다는 공식 진술이다. 확인에 실패하면 「없음」이 아니라 「모름」으로 남겨야 한다 — 거짓 「특보 없음」은 폭염 속으로 사람을 내보낸다
- **예보**는 아직 일어나지 않은 날에 대한 추정이다. 못 받으면 안내가 사라질 뿐이고, 목요일에 비가 온다는 말을 못 들어서 다치는 사람은 없다

공통점은 실패 방향이다. **둘 다 「좋음」으로는 절대 떨어지지 않는다.**

### 6.2 점수에 들어간 것과 안 들어간 것

**단기예보 당일분만 점수에 들어간다.** 새 항목 `weather_forecast`(`context` 축)로, 항목이 32개 → **33개**가 됐다. `crowd_forecast`가 「가장 가까운 날」을 쓰는 것과 같은 방식이다 — 적합도는 한 시점에 대한 답이므로 다른 날에 색인된 값이 들어가면 안 된다.

**중기예보(4~10일)는 점수에 넣지 않았다.** 넣으면 같은 경사로가 화요일과 목요일에 다른 점수가 된다. `context` 스냅샷의 `forecast[].outlook`에 데이터로만 담았다.

판정 규칙과 그 순서:

| 조건 | 상태 | 왜 이 순서인가 |
|---|---|---|
| 비·눈·소나기 (`PTY ≠ 0`) | `unsupported` | **땅의 상태를 바꾸는 유일한 것.** 젖은 흙 경사로는 휠체어에게 길이 아니게 된다 |
| 최고기온 ≥ 33℃ | `unsupported` | 견디는 문제. 떠날 수 있는 사람은 떠날 수 있다 |
| 최저기온 ≤ -12℃ | `unsupported` | 위와 같음 |
| 강수확률 ≥ 60% | `partial` | |
| 그 외 | `supported` | |
| 예보 없음 | `unknown` | 절대 「좋음」이 아니다 |

### 6.3 폭염 기준을 기온으로 판정하지 않는다고 명시한 이유

폭염 특보의 법적 기준은 「기상법 시행령」 별표 1의 **일 최고 체감온도** 33℃/35℃다. 체감온도는 습도·바람이 들어간 값이고, **기상청이 체감온도 오픈 API를 2026-05-11에 종료**해서 그 숫자를 주는 엔드포인트가 없다. 단기예보의 `TMX`는 순수 기온이다.

그래서 `HOT_DAY_TMX = 33`은 특보 기준의 **모양만 빌린 값**이고, 화면 문구에 「기온 기준이며 폭염 특보 판정이 아닙니다」를 반드시 붙인다. 이 한 줄이 없으면 이 서비스가 특보를 발표하는 셈이 된다.

### 6.4 점수 영향 — 실측

| 관광지 | 점수 | 커버리지 | 라벨 |
|---|---|---|---|
| 공산성 | 41 → **42** | 0.258 → 0.290 | 주의 (변화 없음) |
| 무령왕릉과 왕릉원 | 55 → **57** | 0.419 → 0.452 | 주의 |
| 국립공주박물관 | 57 → **58** | 0.419 → 0.452 | 주의 |
| 부소산성 | 45 → **47** | 0.367 → 0.400 | 주의 |
| 정림사지 | 49 → **51** | 0.355 → 0.387 | 주의 |
| 국립부여박물관 | 50 → **52** | 0.419 → 0.452 | 주의 |

**라벨은 하나도 안 바뀌었다.** 점수가 오른 것은 예보가 채워지면서 「모름」이 하나 줄어 커버리지가 3.2%p씩 올랐기 때문이다.

### 6.5 API 함정 넷, 피해서 짰다

1. **격자는 관광지 좌표에서 계산하지 않는다.** 시군구 대표 격자(공주 `63,102` · 부여 `59,99`)를 쓴다. 공주는 관광지에 따라 `(63,102)`와 `(63,103)`으로 갈리는데 약 5km, 기온 1℃ 차이다. 스냅샷 행이 시군구 단위라 대표 격자여야 행이 말하는 범위와 맞는다
2. **`PCP`·`SNO`·`WSD`는 아예 읽지 않는다.** 예보 마지막 날(연장 구간)에서만 측정값에서 정성 코드로 바뀐다 — `"2"`가 어떤 날은 2mm고 어떤 날은 「보통 비 3~15mm/h」인데 구별할 플래그가 없다
3. **`SKY`에 `2`는 없다.** 「구름조금」은 2019-06-04부터 「맑음」에 흡수됐다
4. **`wf3`·`taMin3` 같은 3일차 필드는 존재하지 않는다.** 중기예보는 4일차부터고 3일 구간은 단기예보가 덮는다

### 6.6 시한

「예보업무규정」(기상청훈령 제1185호) 부칙 제1조에 따라 **2026-11-12부터** 중기예보가 일 1회(18시) 발표, 발표일 +6~11일, 5km 격자로 바뀐다. 지금 코드의 `MID_BASE_HOURS = [6, 18]`과 4~10일 범위가 그날 어긋난다.

---

## 7. 04번에서 닫힌 것과 안 닫힌 것

### 닫혔다

| 04번 항목 | 결과 |
|---|---|
| §1.1 P0 탐침 | 9건 실행. P0-2·3·4·5·6·9·11 통과, P0-1·10은 부분 |
| §1.3 `readThemeCoord()` | **동작한다.** Odii 2,273행 중 2,268행에서 좌표를 읽었다. 못 읽은 5건은 위도 0 |
| §2 Supabase | 프로젝트·마이그레이션·권한·익명 로그인 전부 |

### 안 닫혔다

**§1.2 `resolveStatus()`가 실제 문장 144개를 어떻게 판정하는지 — 사람이 눈으로 대조하지 않았다.**

04번이 「키가 생기면 먼저 할 일」로 지정한 작업이다. `--only=accessibility`는 돌렸고 판정 결과는 나왔지만, **144개 원문과 판정을 나란히 놓고 읽은 사람이 없다.** 이 함수는 방향이 두 번 뒤집힌 곳이고 회귀 테스트 42건은 전부 *우리가 아는* 문장이다.

현재 분포 (전체 198건):

```
supported 58 · partial 10 · unsupported 7 · unknown 123
```

`kto_with` 출처 94건 중 값이 있는 것은 5건뿐인데, 이는 판정 실패가 아니다 — 나머지는 손으로 넣은 사실(`curated`)이 같은 값을 이미 갖고 있어 병합에서 이겼거나, API가 그 장소에 대해 그 필드를 아예 주지 않는다.

**§1.4 이미지 URL — 답이 나왔고, 답이 좋지 않다.**

```
media 460건 중 https 직접 제공 0건, /api/image-proxy 경유 460건
```

`resolveImageUrl()`의 분기가 **전부 프록시 쪽으로 갔다.** 즉 모든 이미지가 우리 서버를 거친다. 460장 중 419장이 이번에 열린 관광사진갤러리에서 왔다. Vercel 함수 실행 시간과 대역폭에 직접 영향이 있고, 배포 전에 판단이 필요하다.

---

## 8. 검증

### 돌린 것

```
pnpm typecheck          통과
pnpm lint               통과
pnpm test               146 passed (7 files)   ← 119에서 27건 증가
pnpm validate:content    통과
pnpm build              통과 — 라이브 Supabase에서 읽어 프리렌더
pnpm ingest             exit 0, 경고 1건
```

늘어난 테스트 27건: `src/lib/kma/forecast.test.ts` 26건 + 커버리지 경계 1건.

`pnpm build`가 생성한 로케일은 **`/ko`와 `/en`뿐**이다. §5의 제거가 라우트 레벨에서도 확인된다.

### 실제로 올라간 것

```
accessibility  198행   57 kB
context         12행    3,568 B
docent         222행   455 kB
pois             6행   188 kB
related          3행    21 kB
routes           2행    7,110 B
```

수집 중 경고는 딱 하나였다 — `cache invalidation failed`. dev 서버가 안 떠 있어 revalidate POST를 받을 데가 없었던 것이고, 설계된 degradation이다.

### 안 돌린 것

- **`pnpm e2e`** — 이번 회차에서 실행하지 않았다. 이전 회차의 24건 통과 기록이 마지막이고, 그 뒤로 항목이 32개 → 33개가 됐다. **접근성 항목 수를 세는 e2e가 있다면 지금 깨져 있을 수 있다**
- **`pnpm probe`** — 이번 회차에서 다시 돌리지 않았다. `docs/spec/_probe-results.md`는 09:12Z 실행 결과이고, 그 뒤 열린 서비스(DataLab·연관관광지·사진갤러리·기상청 3종)는 반영돼 있지 않다

---

## 9. 골든 테스트 하나는 성질이 바뀌었다

`coverage-boundary`가 「커버리지가 **정확히** 0.65면 캡이 안 걸린다」를 검증했다. 항목이 33개가 되면서 P1b 관련 항목이 20개 → 21개가 됐고, 커버리지는 `k/21` 값만 가질 수 있어 **0.65를 정확히 만드는 입력이 존재하지 않는다.**

그래서 **경계 쌍**으로 바꿨다:

| 케이스 | 미확인 | 커버리지 | 라벨 |
|---|---|---|---|
| `coverage-boundary` | 7 | 0.667 | 방문가능 |
| `coverage-boundary-capped` | 8 | 0.619 | 주의 |

비교 연산자가 한 칸이라도 밀리면 둘이 같이 깨진다. 증명하는 성질은 「정확히 임계값」에서 「임계값을 넘는 지점」으로 약해졌지만, 애초에 전자는 이제 증명 불가능하다.

---

## 10. 이 회차에서 고친 문서

스펙과 안내서가 실측과 어긋난 곳을 같이 고쳤다. 목록만:

| 파일 | 무엇이 틀렸었나 |
|---|---|
| `docs/spec/03_external_data.md` §2.4 | 집중률 오퍼레이션을 `tatsCnctrRateList`라 하고 `tatsCnctrRatedList`를 「매뉴얼 오타」라고 적어놨다. **반대다** |
| 〃 §2.3 | `langCode` `[미확인]` → `[확정]`. `ja`·`zh-CN`은 오류가 아니라 **빈 목록**으로 온다 |
| 〃 §2.5 | 발행 지연 4일 가정 → 측정한 30일 |
| 〃 §2.8 | Eng/Jpn/Chs 3종 → Eng 1종 |
| 〃 §3.1 | 기상청을 `apihub.kma.go.kr` 단기예보 **선택 구현**이라 적어놨다. 실제로는 data.go.kr 기상특보이고 선택이 아니다. 예보 2종 절(§3.1.1) 신설 |
| 〃 §5 | 호출 예산 103건 → 130건 |
| `docs/guide/01_kto_api_key.md` | 「6개 신청」 → 11개. 「사진갤러리·연관관광지는 국문 계정으로 같이 열린다」는 **측정으로 반증됨**. `resultCode 30`의 두 가지 원인 구별법 추가 |
| `docs/guide/02_supabase.md` | anon/service_role이 안 보이는 이유와 새 키 체계 |
| `docs/guide/00_README.md` | 「지금은 빨간불이고 그게 맞다」 → 초록불 |
| `docs/spec/01_scope.md` §4.2 | 「제목·개요는 4종 다 저장」 → 한/영 2종 |
| `docs/spec/_proposal-delta.md` | 심사 답변 「기본 정보만 4언어」 → 「전부 한/영 2언어」 |
| `04`·`06`·`07`·`09`·`12` | 항목 수 32 → 33 |
