# 05 — 평소 운영

> **이 문서가 무엇인가**
> 설정이 끝난 뒤 실제로 하는 일들. 수집을 돌리고, 배포하고, 데이터가 이상해 보일 때 어디를 보는가.
>
> 01–03번은 **처음 붙일 때** 보는 문서다. 이건 **지금** 보는 문서다.

---

## 1. 매일 저절로 도는 것

`.github/workflows/ingest.yml` — **매일 04:00 KST** (cron은 UTC `0 19 * * *`).

```
pnpm ingest
   → 공공데이터포털·기상청 호출
   → Supabase data_snapshots 6개 갱신
   → POST /api/revalidate  (캐시 무효화)
   → content/generated/*.json 변경분을 main에 커밋
   → Vercel이 그 커밋을 배포
```

**직접 돌리려면** GitHub의 Actions 탭에서 `ingest` → `Run workflow`.

### 필요한 저장소 시크릿 5개

| 이름 | 무엇 |
|---|---|
| `KTO_SERVICE_KEY_DECODING` | 공공데이터포털 일반 인증키 — **Decoding 쪽** |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키. 스냅샷을 쓰는 유일한 권한 |
| `NEXT_PUBLIC_SITE_URL` | `https://www.modubaekje.com` — 캐시 무효화를 부를 주소. **`www.`가 붙은 쪽이다** (§8) |
| `REVALIDATE_SECRET` | `/api/revalidate`의 공유 비밀 |

같은 다섯 개가 로컬 `.env.local`에도 있다.

**세 곳이 서로 다른 것을 필요로 한다.** 하나만 고치고 끝내는 것이 흔한 실수다.

| | 필요한 것 |
|---|---|
| **로컬 `.env.local`** | 다섯 개 전부 (수집도 돌리고 화면도 띄우므로) |
| **GitHub 저장소 시크릿** | 위 표의 다섯 개 |
| **Vercel 환경변수** | `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `REVALIDATE_SECRET` · `NEXT_PUBLIC_SITE_URL` · `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` |

Vercel에 `SUPABASE_SERVICE_ROLE_KEY`와 `KTO_SERVICE_KEY_DECODING`은 **필요 없다.** 화면은 수집을 하지 않기 때문이고, 그건 구조로 강제돼 있다 — `src/lib/supabase/admin.ts`(서비스 롤 키를 읽는 유일한 파일)와 `src/lib/kto/transport.ts`는 **`scripts/ingest.ts`에서만** 불린다. `src/app`과 `src/components`가 `src/lib/kto/`를 import하는 것은 ESLint `no-restricted-imports`가 막는다(`docs/spec/02_stack.md` §2 규칙2).

반대로 `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`는 **화면에만** 필요하다. 방문자 제보의 익명 세션이 앞의 키로 만들어지고, 지도는 뒤의 키로 그려진다. 수집은 둘 다 쓰지 않는다.

### 배포 뒤 지도는 브라우저로 한 번 열어 봐야 한다

지도 제공사는 **http와 https에서 다른 호스트를 쓴다.** 개발 서버(http)에서는 `nrbe.map.naver.net`·`static.naver.net`, 배포본(https)에서는 `nrbe.pstatic.net`·`ssl.pstatic.net`이다. 그래서 로컬에서 본 것만으로 Content-Security-Policy를 쓰면 로컬은 통과하고 배포본은 타일이 전부 막힌다 — 실제로 한 번 그랬고, 화면에는 회색 사각형 위에 마커 13개만 떠 있었다.

`curl`로는 안 잡힌다. 캔버스는 하이드레이션 뒤에 만들어지므로 HTML에는 없다. 배포가 끝나면 브라우저로 열어서 **콘솔에 CSP 위반이 NELO 하나뿐인지** 보면 된다.

```bash
pnpm exec node -e "
const {chromium}=require('@playwright/test');
(async()=>{const b=await chromium.launch();const p=await (await b.newContext()).newPage();
const e=[];p.on('console',m=>{if(m.type()==='error')e.push(m.text().slice(0,90))});
await p.goto('https://www.modubaekje.com/ko/places',{waitUntil:'networkidle'});
await p.waitForTimeout(6000);
console.log(await p.evaluate(()=>({canvas:!!document.querySelector('.map-canvas'),pins:document.querySelectorAll('.map-pin').length})));
console.log([...new Set(e)]);await b.close();})()"
```

`{canvas:true, pins:13}`이고 오류가 `kr-col-ext.nelo.navercorp.com` 하나면 정상이다. `nrbe`나 `pstatic`이 오류에 보이면 그 호스트가 `next.config.ts`의 목록에서 빠진 것이다.

### 지도 키는 값보다 등록이 중요하다

`NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`는 비밀이 아니다. 브라우저가 내려받는 스크립트 주소에 그대로 실린다. 실제로 이 키를 제한하는 것은 **NCP 콘솔의 Web 서비스 URL 목록**이다.

> console.ncloud.com → Services → AI·NAVER API → Application → `modu-baekje` → 변경 → Web 서비스 URL

여기에 개발용 `http://localhost:3000`과 배포 도메인을 **둘 다** 넣어야 한다. 하나라도 빠지면 그쪽에서는 타일마다 「네이버 지도 Open API 인증이 실패했습니다」가 뜬다. 앱은 그 상황을 알아채고 지도 자리에 「지도를 불러오지 못했습니다. 위 목록으로 모든 기능을 이용할 수 있습니다」를 대신 띄우므로 화면이 깨지지는 않는다.

Client Secret은 서버 간 API용이다. `.env.local`에도, Vercel에도, 코드 어디에도 들어가지 않는다.

---

## 2. 손으로 수집 돌리기

```bash
pnpm ingest --dry-run          # 파일에만 쓴다. 데이터베이스는 건드리지 않는다
pnpm ingest                    # 진짜. Supabase에 쓰고 캐시를 무효화한다
pnpm ingest --only=docent      # 한 단계만
```

단계 이름은 `bootstrap, pois, routes, context, accessibility, docent, related`.

**캐시를 무효화하는 대상은 `NEXT_PUBLIC_SITE_URL`이 가리키는 곳이다.** 로컬 `.env.local`이 `http://localhost:3000`을 가리키고 있으면, 손으로 돌린 수집은 Supabase에는 새 스냅샷을 쓰지만 **배포된 사이트의 캐시는 건드리지 않는다.** 마지막 줄이 어느 호스트를 무효화했는지 적으므로 그것을 보고 판단하면 된다.

```
ok       cache invalidated on localhost:3000      ← 배포본은 그대로다
ok       cache invalidated on www.modubaekje.com
```

배포본을 즉시 갱신하려면 직접 부른다.

```bash
curl -X POST https://www.modubaekje.com/api/revalidate \
  -H "authorization: Bearer $REVALIDATE_SECRET"
```

부르지 않아도 각 화면은 한 시간 안에 스스로 갱신한다.

**단계끼리 의존한다.** `aed_distance`와 `emergency_distance`는 `pois` 단계가 계산한 `facilities[].distanceM`을 읽는다. `content/facilities.json`에 좌표를 넣고 `--only=accessibility`만 돌리면 **아무것도 안 바뀐다** — `--only=pois,accessibility`로 돌려야 한다.

### 수집이 스스로 멈추는 경우

| 메시지 | 뜻 | 할 일 |
|---|---|---|
| `daily quota reached` | 하루 한도(오퍼레이션당 1,000건) 초과 | 내일 다시. **아무것도 저장되지 않았다** |
| `gateway was never reached` | 게이트웨이에 한 번도 못 닿았다 | 네트워크. **아무것도 저장되지 않았다** |
| `resultCode 12` | 없거나 폐기된 오퍼레이션 | `docs/spec/03_external_data.md` 확인 |

**「아무것도 저장되지 않았다」가 설계다.** 절반만 저장하면 다음 실행이 「데이터가 있다」고 보고 나머지를 영영 안 가져온다. 그리고 「못 물어봤다」와 「물어봤는데 없다더라」가 빈 배열로는 구분이 안 되므로, 못 물어본 실행은 발행 자격이 없다.

### 경고는 나오지만 멈추지는 않는 것

**`Odii theme NNN (이름) is NNNm from <관광지> and is claimed by no place.`**
근처에 있는데 어느 관광지도 자기 것이라고 선언하지 않은 오디오 테마다. **거리는 선택 기준이 아니라 점검 기준이다** — 「백제문화단지」 테마가 무령왕릉에서 115m, 「공주 공산성」 테마가 공산성에서 341m이므로 반경으로는 갈라지지 않는다. 새 테마가 정말 그 관광지 것이면 `content/pois.json`의 `odiiThemeIds`에 tid를 넣고, 아니면 그대로 둔다. 지금 네 건(371 공주 산성시장 · 2838 전설따라 설화따라-부여군 · 2968 부여 궁남지 · 2980 부여 관북리 유적)은 **일부러 뺀 것**이다.

**`weather warnings unavailable`** — 기상특보 조회 실패. 6곳 전부 「정보 없음」이 되고 **「특보 없음」이 되지는 않는다.**

**`특보 문구가 도 단위이거나…`** — 특보는 있는데 이 시군구에 해당하는지 확정 불가. 이것도 「정보 없음」이다.

---

## 3. 배포

`main`에 푸시하면 Vercel이 배포한다. 그게 전부다.

```bash
pnpm typecheck && pnpm lint && pnpm validate:content && pnpm test && pnpm build:fixtures && pnpm e2e
git push origin main
```

CI(`.github/workflows/ci.yml`)가 e2e까지 포함해 같은 것을 돌린다.

### 배포 뒤 확인하는 것

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.modubaekje.com/
# 307 https://www.modubaekje.com/ko   ← 307이 아니면 프록시가 안 실린 것이다
```

**`/`가 404면 `src/proxy.ts`를 확인한다.** 이 프로젝트는 `src/app`을 쓰므로 Next 16은 `src/proxy.ts`에서만 프록시를 찾는다. 저장소 루트에 두면 **조용히** 프록시 0개로 빌드되고, `/` → `/ko`를 보내는 것이 프록시뿐이라 첫 화면이 404가 된다. 증거는 `.next/server/middleware-manifest.json`에 `"middleware": {}`로 남는다. (`../work_log/10_second_audit.md` §1)

---

## 4. 봇이 `main`에 커밋한다 — 푸시 전에 rebase

야간 수집이 `chore(ingest): daily snapshot`을 직접 올린다. 로컬에서 `pnpm ingest`를 돌린 뒤 그냥 푸시하면 거절당한다.

```bash
git fetch origin
git rebase origin/main
# content/generated/* 충돌이 나면 로컬 쪽을 택한다
git checkout --theirs content/generated/<파일>
git add content/generated/<파일> && git rebase --continue
```

**로컬 쪽을 택하는 이유**: 그 파일은 같은 실행이 Supabase에 쓴 것과 **같아야 한다.** 화면은 Supabase를 읽고 파일은 git 이력용이므로, 둘이 갈라지면 이력이 화면을 설명하지 못한다.

---

## 5. 화면이 이상할 때 어디를 보는가

| 증상 | 먼저 볼 곳 |
|---|---|
| 수집은 됐는데 화면이 안 바뀐다 | `/api/revalidate`가 200 `{"ok":true}`를 주는지. 그리고 **정말 무효화됐는지** — 예전에 이 엔드포인트는 성공을 보고하면서 아무것도 안 했다 (`../work_log/10_second_audit.md` §2) |
| 어떤 항목이 「확인됨」인데 틀렸다 | `content/curated-facts.json`에 출처·확인일을 붙여 한 줄 넣으면 그게 이긴다. 규칙 자체가 틀렸으면 `src/domain/capabilities.ts`의 `resolveStatus` |
| 사진이 안 뜬다 | `<img>` 개수가 아니라 **디코드된 픽셀**을 센다. 예전에 태그는 다 있는데 한 장도 렌더된 적이 없었다 (`../work_log/09_review_and_polish.md` §12b) |
| 오디오 해설에 딴 곳 이야기가 있다 | `content/pois.json`의 `odiiThemeIds` |
| 「정보 없음」이 갑자기 늘었다 | 조건을 여러 개 골랐는지 본다. 판정은 **그중 가장 조건이 안 맞는 사람**을 기준으로 한다 (`10_second_audit.md` §5) |

### 현장 사실을 손으로 고치는 법

`content/curated-facts.json`에 한 줄 추가한다. 같은 `(poiSlug, capabilityCode)`가 수집값을 덮어쓴다.

```json
{
  "poiSlug": "gongsanseong",
  "capabilityCode": "elevator",
  "status": "unsupported",
  "detail": "무엇을 확인했는지 한 문장",
  "source": "https://… 또는 기관 이름",
  "checkedAt": "2026-09-14"
}
```

`source`와 `checkedAt`은 **필수**다. `pnpm validate:content`가 막는다.

시설 좌표(응급실·자동심장충격기)는 `content/facilities.json`이다. 좌표를 넣었으면 `pnpm ingest --only=pois,accessibility`를 돌려야 거리가 생긴다.

---

## 6. 좌표를 못 찾을 때 — 이름으로 말고 위치로 찾는다

응급실과 자동심장충격기 거리는 `content/facilities.json`의 좌표에서 계산한다. 공공 API(`B552657` 응급의료·AED)는 이 계정이 **신청하지 않아 `resultCode 30`**이므로, 좌표는 OpenStreetMap에서 가져와 두 경로로 교차 확인한다.

**이름으로 검색하면 자주 실패한다.** 웅진백제역사관은 Nominatim 이름 검색에 걸리지 않았다 — OSM에 **「웅진백제문화역사관」**으로, 어순이 다르게 들어 있기 때문이다. 그래서 한 건이 오래 빈칸으로 남아 있었다.

**되는 방법은 좌표 주변을 훑는 것이다.** Overpass로 관광지 좌표 반경 안의 실제 지물을 받아 이름을 눈으로 고르고, 그 OSM id를 Nominatim으로 다시 조회해 좌표가 일치하는지 본다.

```bash
# 1) 관광지 좌표 반경 600m 안의 후보
curl -s --data-urlencode 'data=
[out:json][timeout:40];
(
  nwr(around:600,36.46052611578204,127.11250769165848)["tourism"="museum"];
  nwr(around:600,36.46052611578204,127.11250769165848)["amenity"="defibrillator"];
);
out center tags;' https://overpass-api.de/api/interpreter

# 2) 고른 id를 Nominatim으로 교차 확인
curl -s -H 'User-Agent: modu-baekje/1.0' \
  'https://nominatim.openstreetmap.org/lookup?osm_ids=W558646581&format=json&extratags=1'
```

두 값이 몇 미터 안에서 일치하면 쓴다. 지금 들어간 아홉 건은 **1–27m** 안에서 일치했다.

**`sourceNote`에 OSM id와 ODbL을 반드시 적는다.** 이름이 출처와 다르면 그 차이도 적는다 — 나중에 누가 같은 건물인지 되짚을 수 있어야 한다.

```
좌표는 OpenStreetMap way/558646581 웅진백제문화역사관 (tourism=museum, ODbL)
— OSM 표기는 「문화역사」로 어순이 다르지만 주소가 왕릉로 37로 같고 …
```

**직선거리라는 말을 문장 안에 넣는다.** 산성에서는 걸어가는 길이 훨씬 길다. 출처 주석에만 적고 화면 문장에 안 적으면, 읽는 사람은 걷는 거리로 읽는다.

---

## 7. 관리자 화면

`https://www.modubaekje.com/admin/reports` — 이메일·비밀번호 로그인.

들어갈 수 있는 계정은 `admin_users` 테이블에 있는 것뿐이다. 추가는 [`02_supabase.md`](./02_supabase.md) 마지막의 SQL 한 줄.

**할 수 있는 것**: 제보 숨기기(사유 포함), 숨김 해제, 항목으로 복사. 마지막 것은 클립보드에 JSON 한 줄을 넣어 줄 뿐이고 — `capabilityCode`와 `status`는 사람이 채워서 `curated-facts.json`에 붙여 넣는다. **제보가 저절로 사실이 되는 경로는 없다.**

---

## 8. 아직 안 된 것

| | 왜 |
|---|---|
| **NVDA 수동 접근성 점검** | Windows가 필요하다. 그때까지 화면 문구가 「아직 안 했다」고 말한다 |
| **`flag_report` 호출 제한** | 익명 세션도 `authenticated`라서 지금 제한이 아무도 막지 못한다. 피해 경로는 관리자 화면 쪽에서 막혀 있다. 고치려면 `003_report_flags.sql`이 필요하다 |
| **`.kr` 도메인** | `www.modubaekje.com`을 쓴다. Vercel은 `.kr`·`.co.kr`을 팔지 않으므로, 그쪽으로 가려면 한국 등록기관에서 사서 DNS를 직접 넘겨야 한다 |

---

## 9. 도메인 — `www.modubaekje.com`

정식 주소는 **`www.`가 붙은 쪽**이다. `modubaekje.com`은 거기로 308을 넘긴다.

```
https://modubaekje.com/            308 → https://www.modubaekje.com/
https://www.modubaekje.com/        307 → /ko
https://www.modubaekje.com/ko      200
```

### 주소를 바꾸면 같이 바뀌어야 하는 것 넷

한 곳만 고치고 끝내면 **새 주소에서만** 조용히 깨진다. 옛 주소에서는 멀쩡하므로 브라우저로 새 주소를 직접 열기 전까지 안 보인다.

| 무엇 | 어디 | 안 고치면 |
|---|---|---|
| **네이버 지도 서비스 URL** | NCP 콘솔 → AI·NAVER API → Application → `modu-baekje` → Web 서비스 URL | 새 주소에서만 타일이 안 뜬다. 키는 비밀이 아니고, **실제로 키를 제한하는 것이 이 목록**이다 |
| `NEXT_PUBLIC_SITE_URL` | Vercel 프로젝트 환경변수 | — |
| `NEXT_PUBLIC_SITE_URL` | GitHub 저장소 시크릿 | 야간 수집이 옛 주소의 캐시를 지운다. 새 주소는 최대 한 시간 동안 옛 화면을 내보낸다 |
| 주소가 적힌 문서 | `00_README.md` · 이 문서 | — |

기존 `*.vercel.app` 주소는 **지우지 않는다.** Vercel이 계속 같은 배포를 서비스하고, NCP 목록에도 남겨 둬야 전환 중에 둘 다 동작한다.

**정식 주소를 apex(`modubaekje.com`)로 바꾸려거든 NCP 목록에 apex도 넣어야 한다.** 지금은 브라우저가 항상 `www.`로 넘어가므로 지도가 도는 origin은 `www.` 하나뿐이다.

### 확인

`curl`로는 지도를 볼 수 없다 — 캔버스는 하이드레이션 뒤에 생기므로 HTML에는 `map-canvas`가 없다. §3의 헤드리스 검사를 새 주소로 돌린다.
