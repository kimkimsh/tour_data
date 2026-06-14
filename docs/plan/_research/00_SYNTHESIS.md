# 00 — 모두의 백제 (Modu Baekje) Architecture-Ready Synthesis

> Synthesis lead consolidation of nine research briefs (D1–D4, R1–R5).
> Stack: Next.js (App Router) + Supabase + Vercel (Seoul / `icn1`) · KTO TourAPI 4.0 · KWCAG 2.2 · functional review **2026-10** · built by a parallel AI agent team.
> Synthesis date: 2026-06-13. Every claim below is traceable to a named brief section. Contradictions between D-briefs (digest-era) and R-briefs (current-reality verification) are resolved explicitly; **R-briefs win on any factual conflict** because they verified against live data.go.kr / vendor pages on 2026-06-13.

---

## 0. How to read this document

- **D1–D4** are digest briefs built from local manuals and search digests (the "as-documented" view).
- **R1–R5** are current-reality verification briefs (the "as-live-on-2026-06-13" view).
- Where they disagree, §2 (API reality) flags **[CONTRADICTION]** and states the resolved truth + why.
- Feature codes used throughout: **F1** 코스 빌더/지도 · **F2** 접근성 프로필 · **F3** 오디오 도슨트 · **F4** 체험학습 다이어리 · **F5** 외국인/다국어. (Note: D1 and D4 use *slightly different* F-numbering — reconciled in §7.)

---

## 1. Confirmed Tech Stack & Exact Libraries/Versions

### 1.1 Core platform (confirmed)

| Layer | Choice | Version / config | Source |
|---|---|---|---|
| Framework | Next.js App Router | **15.x** to start; Next 16 (Cache Components) is the forward path but optional — see §3.4 | D2 §1; R4 §6.2 |
| Runtime | React 19, TypeScript | Node **20 LTS** (Node 18 EOL 2025-04-30) | D2 §1, §14 |
| Bundler | Turbopack (dev default) | — | D2 §1 |
| Hosting | Vercel, region pinned **`icn1`** (Seoul = `ap-northeast-2`) | `vercel.json` `"regions":["icn1"]` (default `iad1` Washington is wrong — forces Pacific round-trips to Seoul DB) | R4 §0, §7.2 |
| DB / BaaS | Supabase, region **`ap-northeast-2`** (Seoul) | PostgreSQL 17 + PostGIS + pgvector (`vector` ext) | D2 §6; R4 §1.1 |
| Edge cache | Upstash Redis (Seoul) | short-TTL KTO quota guard + weather | D2 §7 |

### 1.2 UI / styling (confirmed)

| Library | Version | Role | Source |
|---|---|---|---|
| Tailwind CSS | **v4** (`@theme`, OKLCH, native CSS vars; `tw-animate-css`) | all styling | D2 §2 |
| shadcn/ui | code-copy (no npm), Radix base | primitives | D2 §2 |
| Radix UI / React Aria | WAI-ARIA complete | **focus trap + ARIA for modals/map overlays — do not hand-roll** | D2 §2; R2 §2.2, §5.3 |
| Font | **Pretendard static TTF** (SIL OFL 1.1) | UI + PDF embed | R3 §1.3 |

### 1.3 State / data / i18n (confirmed)

| Concern | Library | Config | Source |
|---|---|---|---|
| Server state | TanStack Query v5 | `staleTime 60_000`, `gcTime 300_000`; hydrate from RSC | D2 §3 |
| Client state | Zustand | filters, a11y prefs, language | D2 §3 |
| Forms | React Hook Form + Zod | search/intent forms | D2 §3 |
| i18n | **next-intl v3** | `app/[locale]/…`, ICU; locales `ko / en / ja / zh-Hans` | D2 §4 |
| Supabase client | `@supabase/ssr` **0.12.0** | `getAll/setAll` cookie methods; `getUser()`/`getClaims()` for authz (never `getSession()`) | R4 §10 |

### 1.4 Maps / geo (confirmed, with corrections)

| Concern | Choice | Source |
|---|---|---|
| Base map + Korean POI/address | **Kakao Maps JS SDK** (JS key, `libraries=services,clusterer,drawing`); React wrapper `react-kakao-maps-sdk` | R5 §1 |
| Gov complement | **VWorld** (admin-boundary polygons, secondary geocoder, WMS) | R5 §1, §2.2 |
| Authoritative address | **도로명주소 API** (juso.go.kr) — 공개 도로명 + 영문 (no auth, no daily limit); 좌표제공 API needs 본인인증+승인 | R5 §2.1 |
| Coord conversion | `proj4js` (client) / `pyproj` (ETL) for EPSG:5179/5186 ↔ 4326 | D2 §5; D4 §8-2 |
| **Rejected** | Mapbox (no KR address-level geocoding + KR map-residency law) | R5 §1 |

### 1.5 AI / media / docs (confirmed)

| Concern | Choice | Source |
|---|---|---|
| LLM SDK | **Vercel AI SDK 5** + `@ai-sdk/anthropic`, via Vercel AI Gateway | D2 §9.2 |
| Translation (bulk, ETL) | `claude-haiku-4-5` | D2 §9.1 |
| RAG chat | `claude-sonnet-4-6` + pgvector | D2 §9.1 |
| Embeddings | `text-embedding-3-small` (1536-d, $0.02/M) — hybrid w/ Postgres FTS for proper nouns (정림사지, 공산성) | D2 §9.5; R4 §1.2 |
| TTS | CLOVA Voice (KO) / ElevenLabs (EN/ZH/JA) → MP3 in Supabase Storage | D2 §9.4 |
| STT | CLOVA Speech (KO) / Whisper (multi) | D2 §9.3 |
| OCR | CLOVA OCR + Papago | D2 §11.4 |
| **PDF** | **`@react-pdf/renderer`** (Node route, no Chromium) + Pretendard TTF + `registerHyphenationCallback` for CJK; `pdf-lib` for filling existing forms; Puppeteer+`@sparticuz/chromium-min` only for pixel-perfect pages | R3 §1 — **resolves D2 §16 open question** |
| GPX | hand-written **GPX 1.1** XML (WGS84/metric) | R3 §2 |
| Braille | **`braillify`** (npm 2.0.1, Apache-2.0, WASM, 2024 규정) → Unicode braille + `.brf` (40 cells × 25 lines + FF) | R3 §3 |
| Charts | Recharts (MIT) + ECharts (Apache-2.0, calendar heatmap); deck.gl + MapLibre for OD/heat (RTO dashboard only) | D2 §10 |
| 360° | Pannellum / Photo Sphere Viewer (MIT) | D2 §11.3 |
| Offline PWA | **Serwist `@serwist/next` 9.5.11** (ESM, Next 14→16) + IndexedDB (`idb`/`localForage`) | R5 §5 |
| a11y test | `axe-core ~4.11.4`, `@axe-core/playwright`, `jest-axe 10` / `vi-axe`, `@storybook/addon-a11y`, Lighthouse v12, `eslint-plugin-jsx-a11y` | R2 §5.3 |

### 1.6 Auth / messaging / ops (confirmed)

| Concern | Choice | Source |
|---|---|---|
| Auth | **Supabase Auth** (single auth+DB layer) — Kakao/Naver/Google/Apple; **Anonymous Sign-In** as guest-first | D2 §8; R4 §4 |
| Messaging | Kakao 알림톡 (SOLAPI), FCM/APNs, Resend (email) | D2 §12 |
| Analytics | Microsoft Clarity, PostHog, Sentry, Vercel Speed Insights | D2 §13 |
| ETL scheduler | **Vercel Cron** (`vercel.json crons`, UTC) — KST 04:00 = `0 19 * * *` | R4 §7.1 |

### 1.7 Cost envelope (contest MVP)

~**$45/mo** = Supabase Pro $25 + Vercel Pro $20 (+ negligible OpenAI). Upgrade both to Pro **for the review period (around 2026-10)**: Free Supabase auto-pauses after 1 week idle (review-eve risk) and Hobby Vercel cron is 1×/day only. (R4 §9)

---

## 2. KTO API Reality Table — D1 vs R1 Reconciled

Gateway prefix: **`https://apis.data.go.kr/B551011/{ServiceID}/{operation}`** (HTTPS works for all; HTTP is the doc default). Provider code **B551011** = 한국관광공사. (D1 §1; R1 §1)

### 2.1 Service catalog (reconciled)

| Service | Base path | Key ops for us | Confirmed by | Notes / gotchas |
|---|---|---|---|---|
| 국문 관광정보 | `/KorService2` | `areaBasedList2`, `locationBasedList2`, `searchKeyword2`, `searchFestival2`, `searchStay2`, `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`, `areaBasedSyncList2`, `detailPetTour2`, `ldongCode2`, `lclsSystmCode2` | D1 §3.2; R1 §2 | Primary content. data.go.kr id 15101578, guide v4.4, edited 2026-02-13 |
| 무장애 여행 | `/KorWithService2` | **`detailWithTour2`** (unique), + same list/detail ops | D1 §3.1; R1 §3 | id 15101897, guide **v4.3**, edited 2025-11-25. Authoritative barrier-free source |
| 오디오가이드 (Odii) | `/Odii` | `storyLocationBasedList`, `storyBasedList`, `themeBasedList`, sync ops | D1 §3.4; R1 §4 | id 15101971, guide v4.1. **Different param naming — see §2.4** |
| 집중률·방문자추이 | `/TatsCnctrRateService` | `tatsCnctrRateList` | D1 §3.5; R1 §5.1 | id 15128555, guide v4.0. **Legacy area codes only.** 0–100 index, **not headcount** |
| 데이터랩 | `/DataLabService` | `locgoRegnVisitrDDList`, `metcoRegnVisitrDDList` | D1 §3.6; R1 §5.2 | id 15101972. KT(내국인)+SKT(외국인). **"방문자 ≠ 관광객" caveat mandatory** |
| 연관관광지 | `/TarRlteTarService1` | `areaBasedList1`, `searchKeyword1` | D1 §3.7; R1 §5.3 | id 15128560. **`1` suffix (migrated 2025-05-23).** Legacy `areaCd`/`signguCd`+`baseYm` |
| 관광사진 | `/PhotoGalleryService1` | `galleryList1`, `gallerySearchList1`, `galleryDetailList1` | D1 §3.8; R1 §5.5 | id 15101914. 공공누리 **1유형** (free reuse) |
| 다국어 | `/EngService2`,`/JpnService2`,`/ChsService2`,`/ChtService2` | same op set as KorService2 (minus `detailPetTour2`) | D1 §3.3; R1 §1 (note) | **Multilingual contentTypeId codes — see §2.3** |

### 2.2 Common params & error handling (agreed by D1 + R1)

- Required: `serviceKey`, `MobileOS` (`IOS`/`AND`/`WEB`/`ETC` — use **`ETC`** server-to-server), `MobileApp` (= `ModuBaekje`; omitting hurts KTO traffic-stat review). Optional: `numOfRows` (def 10), `pageNo` (def 1), `_type=json` (omit ⇒ XML). UTF-8 fixed. (D1 §1; R1 §2.4)
- **Default response = XML; JSON requires `&_type=json`. Error envelopes are ALWAYS XML even when JSON requested** — parser must read body as string first / handle both. (D1 §1.1; R1 §7)
- Error codes: `00/0000` OK · `03` no data · `10` bad param · `11` missing param · `22` traffic exceeded · `30` unregistered key · `31` expired. (D1 §1.2)

### 2.3 Content-type IDs — Korean vs multilingual (agreed)

`12` 관광지 · `14` 문화시설 · `15` 행사/축제 · `25` 여행코스 · `28` 레포츠 · `32` 숙박 · `38` 쇼핑 · `39` 음식점. (D1 §2.4; R1 §2.3; D4 §3-1)

Multilingual services use **different codes**: 관광지=**76**, 문화시설=78, 행사=85, 레포츠=75, 숙박=80, 쇼핑=79, 음식점=82. Calling `EngService2` with `contentTypeId=12` returns empty. Travel course (25) has **no multilingual equivalent**. (D1 §2.4, §3.3)

`KorWithService2` supports only **12/14/15/28/32/38** (no 39 food, no 25 course). (D1 §5.1)

### 2.4 Odii quirks (agreed — easy-to-miss)

`xCoord`/`yCoord` not `mapX`/`mapY`; `langCode` (`ko`/`en`/`ja`/`zh-CN`) not contentTypeId mapping; own `themeNm` scheme (no `lclsSystm`, no areaCode); `radius` in meters. (D1 §3.4, §4; R1 §4)

### 2.5 New vs legacy code system — **[CONTRADICTION RESOLVED]**

This is the single most important reconciliation. The two briefs agree on the destination (lDong + lclsSystm) but **disagree on hard facts**:

| Topic | D1 claim | R1 claim (verified on live page) | **RESOLVED TRUTH** |
|---|---|---|---|
| `areaCode2`/`categoryCode2` deletion | "**v4.4 (2026-02-10) DELETED `areaCode2`,`categoryCode2` from KorService2**" (D1 §2.1) | KorService2 still lists **15 ops including `areaCode2`,`categoryCode2`**; the *request params* `areaCode/sigunguCode/cat1-3` are marked "미사용 — 삭제 예정" with **no date** (R1 §2, §2.1) | **R1 wins.** The operations still exist; only the legacy *filter params* are deprecated-not-yet-removed. **There is NO single hard cutoff date.** Deprecation is **rolling per-service** (ver-bump + 90-day). D1's "2025-12-31 cutoff" and "v4.4 deleted" are overstated. (R1 §10) |
| `lDongRegnCd` for 충남 | **`44`** (D1 §2.2) | sample shows `11`=서울; province value not asserted for 충남; says fetch from `ldongCode2` (R1 §6.2) | **UNVERIFIED — must fetch from `ldongCode2` at bootstrap.** D1's `44` (and `150`공주/`760`부여 district) is a *digest claim, not live-verified*. R1 explicitly says build the map from `ldongCode2` output. **Do not hardcode `44/150/760`** until confirmed. (Open Q) |
| Legacy `areaCode` for 충남 | D1 says `34` (TatsCnctr) **and** `44` (new lDong) — two different numbers for the same province | D4 §1-1 says KTO 시도코드 **`34`**; R1 confirms legacy `areaCode` ≠ `lDongRegnCd` (different namespaces) | **Both are right for their namespace.** Legacy `areaCd=34` (TatsCnctr/TarRlte/DataLab); new `lDongRegnCd` is a *different value* to be fetched. The `34` vs `44` is **not a contradiction** once you separate namespaces — but D1 conflating them in one table is a trap. |
| cat → lclsSystm | D1 maps `HS/HS01`→역사유적 etc. as if stable (D1 §2.2) | "**cat→lclsSystm is NOT a rename**; build empirically from `lclsSystmCode2`" (R1 §6.1) | **R1 wins.** Treat D1's `HS`/`VE`/`EV` examples as *plausible hypotheses to verify*, not ground truth. Generate the label map from `lclsSystmCode2` output at bootstrap. |
| `detailWithTour2` fields | D1 lists **21 named + 4 etc** fields verbatim (D1 §3.1) | R1: "**field names NOT machine-readable from live page — download guide v4.3 to lock**" (R1 §3, OpenQ3) | **D1's field list is the working spec but UNVERIFIED against the live schema.** D4 §3-1 lists a *different* set (`handicaptoilet`,`handicapparking`,`nursingroom` vs D1's `restroom`,`parking`,`lactationroom`). **Must verify exact field keys against guide v4.3 before coding F2.** (Open Q — critical) |

**Build rule (both briefs agree):** standardize on `*2` services + `lDong*`/`lclsSystm*` from day one; treat legacy `areaCode`/`cat*` as **read-only fallback** for cached records, never emit as new filters. **Dual-read, single-write-new.** (D1 §6; R1 §12)

### 2.6 serviceKey encoding — the #1 integration failure (R1, not in D1)

`resultCode 30` is usually **double-encoding**, not a bad key. With the Encoding key, `+`→`%2B` is already encoded; if the HTTP client re-encodes, `%2B`→`%252B` → rejected. **Next.js fix: store the DECODING key in a server-only env var; let `URLSearchParams`/`new URL()` encode exactly once; never expose to client; strip from logs.** Newly issued keys need minutes–1h to propagate. (R1 §8)

### 2.7 Quotas (reconciled)

Dev account **1,000 calls/day per operation** (auto-approved). Operating account **~100,000/day** (review 1–3 days, requires registered 활용사례 URL, valid 24 months, **re-apply within 90 days on any migration notice**). **Apply for operating accounts early** (well before the Oct 2026 review). Add a token bucket (~10 req/min) + TTL cache (static 1h, search 5min). (D1 §1, §6; R1 §9)

---

## 3. Data Layer & ETL Plan

### 3.1 The canonical flow (D2 §7; R4 §6)

```
KTO TourAPI ──(Vercel Cron, KST 04:00 = UTC 0 19 * * *)──► ETL route (service_role)
   ► Supabase Postgres (PostGIS + pgvector)  ─── revalidateTag('poi:all') ──► Vercel Data Cache ──► Browser
Browser never calls KTO directly. All KTO calls are server-side (Route Handler / Server Action / Server Component).
```

### 3.2 Sync daily (batch → Supabase)

| Internal field | KTO source | Op |
|---|---|---|
| `source_id` | `contentid` | `areaBasedList2` / `areaBasedSyncList2` |
| `content_type` | `contenttypeid` | — |
| `lat`/`lng` | `mapY`/`mapX` (WGS84) | — |
| `image_url` | `firstimage`/`firstimage2` | `detailImage2` |
| `image_license_code` | **`cpyrhtDivCd`** (Type1/Type3) | — (store per image, drives render policy §4/§6) |
| `modified_at_source` | `modifiedtime` (`yyyyMMddHHmmss`) | incremental key |
| `is_visible_source` | `showflag` (0=hidden) | sync filter |
| `old_content_id` | `oldContentid` (v4.3) | track renamed content (F4 diary) |
| `lDong*` / `lclsSystm*` | new code fields | filter dimensions |
| barrier-free fields | `detailWithTour2` (per POI) | F2 core |

**Sync targets:** POI master (areaBasedSyncList2 incremental on `modifiedtime`/`showflag`), detail enrichment (detailCommon2/detailIntro2), images+license (detailImage2), festivals (searchFestival2 — `eventStartDate` **required** YYYYMMDD), barrier-free profile (detailWithTour2 per the 6 MVP POIs), photo gallery, and **bootstrap-once** code tables (`ldongCode2`, `lclsSystmCode2`). (D1 §8; D2 §7; D4 §3-1)

### 3.3 Call live (not synced)

- **Crowd index** TatsCnctr (30-day forecast — short TTL).
- **Visitor counts** DataLab (lag ~4 days behind; daily cache, "방문자≠관광객" caveat).
- **RAG chat** (sonnet over pgvector).
- **Geocoding** (Kakao Local, cached aggressively to stay <100k/day).
- Weather/air/emergency datasets (KMA, AirKorea, E-Gen) — short TTL per their refresh cadence. (D2 §7; D4 §4)

### 3.4 Caching model — Next 15 vs 16 **[decision required]**

- **Next 15 (recommended start):** `fetch` `next:{tags,revalidate}` + `unstable_cache` for non-fetch (ORM/RPC). **Never wrap per-user data in `unstable_cache`** (no cookies/headers access → cross-user leak risk). ETL ends with `revalidateTag('poi:all')`. (R4 §6.2)
- **Next 16 (forward):** `use cache` + `cacheLife`/`cacheTag`; **but `cacheComponents:true` removes automatic fetch caching** → silent perf regression if a function lacks `use cache`. Don't mix. (R4 §6.2, §11)
- **Resolution:** start Next 15 + `unstable_cache` (ecosystem maturity); migrate to 16 only after risk assessment. POI master = long TTL + `poi:all`/`poi:{id}` tags; per-user/RLS data = **never** in Data Cache. (R4 §6.3)

### 3.5 PostGIS + pgvector

- Proximity: `ST_DWithin(geom, point::geography, 5000)` for nearby POI. (D2 §6)
- Wheelchair routing graph: **PostGIS `pgrouting`** over a pre-tagged pedestrian graph (slope/단차/surface costs) — this is **Plan B and the correct default** (Kakao Mobility walking API is partner-only, §9). (R5 §4.2)
- Vector search: HNSW (`vector_cosine_ops`) wrapped in a `match_poi` RPC (PostgREST can't do distance operators directly); **hybrid vector + FTS (RRF)** for proper-noun POI accuracy. (R4 §1.2)

---

## 4. KWCAG 2.2 Implementation Checklist (CI-gated)

### 4.1 Standard reality **[CONTRADICTION RESOLVED]**

D3 §2.1 says "**4 principles → 14 guidelines → 33 checkpoints**, KS X 6308". R2 §1.1 says "**33 검사항목** (9/15/7/2 per principle), national standard **KS X OT0003**, dated 2022-12-28". **R2 wins on specifics** (it verified the RRA/TTA standard pages and gives the exact 33-item list + per-principle counts). Net agreement: **33 checkpoints**. Note the standard id is **KS X OT0003** (R2), not D3's "KS X 6308" — use R2's. (R2 §1.1; D3 §2.1)

**Critical KWCAG≠WCAG gap (R2 §1.3):** KWCAG 2.2 did **NOT** adopt WCAG 2.2's Target Size 2.5.8 (24px), Focus Appearance 2.4.13, Focus Not Obscured 2.4.11/12, Dragging 2.5.7, Consistent Help 3.2.6 in the same form. So legal cert needs only the 33 KWCAG items, **but we adopt target≥24px + focus-ring 3:1 voluntarily** (near-zero cost, helps the user-test panel and global WCAG). Automated tools catch only **~30–50%** of KWCAG violations — CI gates regression; **certification passes on manual + screen-reader review**.

### 4.2 CI gate (fail the PR) — R2 §3, §5.1

- [ ] `@axe-core/playwright` on core routes (home/map/docent/detail/search/PDF-list) → **violations === 0** with tags `['wcag2a','wcag2aa','wcag21a','wcag21aa']`.
- [ ] `wcag22aa` + `best-practice` tags → **warn** (target-size, region, skip-link, page-h1) — progressive.
- [ ] `jest-axe`/`vi-axe` component tests (buttons/forms/modals/cards/nav).
- [ ] Storybook `addon-a11y` + `addon-vitest`, core components `parameters.a11y.test='error'` (**browser render catches color-contrast** that jsdom can't).
- [ ] Lighthouse a11y `minScore ≥ 0.95` (median of 3), target 1.0.
- [ ] `eslint-plugin-jsx-a11y` build-blocking.
- [ ] **Exclude** the map canvas from axe (`.exclude('.map-canvas')`) but route it to the manual checklist — never silently disable.

### 4.3 Implementation-critical checkpoints (dev-facing) — R2 §1.4, §2; D3 §2.2

- **Route change (App Router does NOT auto-reset focus):** on `usePathname` change move focus to main heading (`tabIndex={-1}` + `ref.focus()`) **and** update `document.title` so the built-in announcer reads it; `aria-live="polite"` region for AI-course status / result counts / map selection. (R2 §2.2–2.3; D3 §2.2.3)
- **Map:** keyboard pan/zoom buttons + arrow-key marker nav; **drag/pinch must have button alternatives** (2.5.1/2.5.4); pins distinguished by **icon/label not color alone** (1.4.1); **parallel text/list view is the accessible source of truth** (canvas is invisible to SR); prefer `CustomOverlay` (real DOM, ARIA) over raster `Marker`. (R2 §1.4, §5.2; R5 §6.3)
- **Audio docent:** GPS auto-play risks 1.4.2 — require one-time "오디오 도슨트 켜기" consent per session, always show **정지/일시정지/볼륨**, expose **transcript text** (1.2.1), progress via `aria-live="polite"`. (R2 §1.4, §5.2; D3 §2.2.6)
- **Contrast:** body 4.5:1, large text/UI borders 3:1, light+dark documented as token pairs. (R2 §2.5; D3 §2.2.1)
- **Reduce-motion:** CSS-first `prefers-reduced-motion` kills map auto-pan/carousel/transition/bg-video. (R2 §2.4; D3 §2.2.5)
- **Flash:** none between 3–50 Hz (광과민, 2.3.1). (D3 §2.2.2)
- **Structure:** one `<h1>`/page, landmarks, **skip link "본문 바로가기" first focusable**, `lang="ko"` (+ per-element override), unique `<title>` via Next `metadata`, every input labeled, focus-trap modals via Radix/React Aria. (R2 §2.1; D3 §2.2.4, §2.2.7)
- **Auth:** no CAPTCHA-only cognitive test; allow SSO/magic-link/password-autocomplete (3.3.3); redundant-entry auto/optional (3.3.4). (R2 §5.2)
- **PDF:** link states format+size (2.4.3); provide HTML alternative; never PDF-only screen in the cert sample. (R2 §1.4)

### 4.4 Manual / screen-reader matrix (cert-direct, automation blind spot)

NVDA + 센스리더 (Windows, primary), VoiceOver (mac/iOS), TalkBack (Android); test target = **Chrome latest + NVDA/센스리더**. Keep a K-WAH self-assessment report (required cert document). (R2 §2.6, §5.2)

### 4.5 Korean certification (WA / KWACC / WebWatch) — R2 §4

- Standard since 2025-01 = **KWCAG 2.2**. Mark validity **1 year**. Three bodies: **WA (wa.or.kr), 웹와치, KWACC**.
- **Pass bar (strict):** expert review **≥95% across 33 items**; user review **100% task success for every disability type**. 2nd-chance only if 85–95% / 85–100%.
- **Cost:** small–medium SPA ≈ **₩1.1M–1.5M (+VAT)** new; nonprofit/disability-org 30% discount; renew yearly.
- **Timeline → project gate:** cert 7–30 days incl. remediation. **Finish dev + self-assessment by early Sept; file by mid-Sept** to buffer for the Oct 2026 functional review.

---

## 5. Document / Asset Pipeline (with licenses)

### 5.1 Generation (R3)

| Output | Tool | Key detail |
|---|---|---|
| 학교제출 PDF | `@react-pdf/renderer` (Node route) | Pretendard static TTF (OFL) embed; `registerHyphenationCallback` per-char no-hyphen for CJK; flex (no grid); `renderToBuffer` → `Content-Disposition: attachment` |
| Pixel-perfect PDF (rare) | Puppeteer + `@sparticuz/chromium-min` | ≥512MB (rec 1600MB), `runtime='nodejs'`, `serverExternalPackages`; only if react-pdf fidelity insufficient |
| Fill existing form PDF | `pdf-lib` + `@pdf-lib/fontkit` | for 충남교육청 체험학습 서식 |
| GPX | hand-written GPX 1.1 | WGS84/metric; `rte`/`rtept` or `trk`/`trkpt`; ship `.gpx` download + map-app deep links |
| Braille | `braillify` (Apache-2.0, WASM) | Unicode U+2800 for screen/UTF-8; `.brf` = ASCII-braille, 40 cells × 25 lines, FF (0x0C) page breaks; math → `braille-camp`/`kmathbraille` |
| Map-app open | Kakao deep link primary | `kakaomap://route?sp=&vp=&ep=&by=foot` (vp..vp5 waypoints) + web fallback `m.map.kakao.com/scheme/route`; Google `dir/?api=1` secondary; Naver needs `appname` |

### 5.2 Open assets + license matrix (R3 §4–5; D3 §1; D4 §4)

| Asset | Source | License | Rule |
|---|---|---|---|
| AAC symbols | **ARASAAC** (primary, REST API) | CC BY-NC-SA 4.0 | nonprofit OK; attribution; **no commercialization** |
| AAC (Korean) | KAAC | © 박은혜 외; no 2차가공/상업 | personal/noncommercial only, email pre-notice; **embed/transform = risk** → secondary use only |
| Pictograms | **KS X ISO 7001** (norm) | standard is norm; ai/eps **paid (KSSN)** | follow KS form; source free SVGs separately (PD/Wikimedia) |
| Welfare pictograms | 복지부 복지서비스 | **공공누리 2유형** (출처+비상업) | nonprofit OK, no commercialization |
| Easy-read illustrations | KODDI | **공공누리 4유형** (출처+비상업+변경금지) | insert **as-is only**, no redesign |
| 수어 (sign) | 국립국어원 한국수어사전 | 공공누리 **per-item varies** (0–4 + AI) | **check each item's type**; prefer embed/deep-link over redistribute |
| KTO photos | PhotoGallery / detailImage2 | 공공누리 **1유형** mostly; **Type3 exists** | store `cpyrhtDivCd`; Type3 = no crop/filter/composite |
| Font | Pretendard / Noto Sans KR | SIL OFL | embed in PDF/app OK |

**공공누리 quick matrix (R3 §5):** 1=free · 2=no-commercial · 3=no-derivative · 4=no-commercial+no-derivative · AI=AI-train OK. **Most-restrictive-wins on combined data** (D3 §1.3): one Type-2 dataset makes the whole output non-commercial; one Type-3 makes it no-derivative. **Prefer OFL/CC-BY/ARASAAC for anything we transform.**

---

## 6. Legal / Compliance Checklist

### 6.1 LBS 신고 (위치정보법) — D3 §3; D4 §8-6

- App = **위치기반서비스사업자** → **방통위 신고** (not 허가) before public launch. Triggered by F2 nearby-POI, F1 GPS entry detection, F3 GPS docent, SOS GPS.
- Filing: 사업계획서 + 주요설비 + 위치정보 보호조치 증명. Designate a 위치정보 보호책임자.
- Post-reg: §15/§18 prior+separate consent; §16 encrypt-at-rest+access-control+audit; §21 retain location usage/provision logs **≥6 months**; §23 **immediate secure-wipe** of raw GPS after purpose (2024 amendment: must prevent recovery, not just delete-flag). **Do not persist raw GPS in user profile.**
- **MVP de-risk:** start manual map-tap mode; real-time GPS triggering needs the 신고 in place. (D4 §8-6)

### 6.2 PIPA — D3 §4; R4 §5

- TLS everywhere (Vercel/Supabase Seoul default — confirm no HTTP fallback); passwords bcrypt/Argon2 (Supabase default); access logs **≥1 year**, reviewed **monthly**.
- **Separate consent checkboxes** (§22): 수집·이용 / 제3자제공 / 위치 / 마케팅(optional, must not gate). Subject rights pages: 열람/정정·삭제/처리정지 (`/account/data`).
- **Cross-border (§28의8):** Supabase Seoul keeps origin in Korea (no transfer), **but Vercel's primary processing is US + global backups**, and Supabase Storage CDN + Vercel Edge cache to global PoPs. → **Keep all PII (제보 작성자 식별·연락처·소셜 프로필) in Supabase Postgres (Seoul) only; never on CDN/Edge/Blob; disclose Vercel(US)/Kakao/Google as 처리위탁·국외이전 in the privacy policy.** Public tourism assets only on CDN. (R4 §5.2)
- Anonymous Sign-In minimizes consent surface (PII=0 for guests); consent UX only at social-promotion. (R4 §4.3)

### 6.3 AI 기본법 labeling (in force 2026-01-22) — D3 §5; D4 §8-5

| AI output | Required label (visible + screen-reader, not CSS-only) |
|---|---|
| TTS audio docent | **"AI 음성 안내"** |
| LLM translation | **"AI 번역"** |
| LLM course itinerary | **"AI 생성 코스"** |

Plus hallucination disclaimer on AI course/recommendation (esp. hours/fees); record KOGL-Type-1 RAG/train-data use in data-credits; declare in privacy policy if user input feeds the model. Scope is **not** 고영향 AI → no impact assessment. (D3 §5.3–5.4)

### 6.4 KOGL / attribution — D3 §1; D2 §11.1; D4 §8-1

- Store `cpyrhtDivCd` per image; **Type1** = attribution + resize OK; **Type3** = attribution + **no crop/filter/watermark/AI-augment**.
- Mandatory attribution (footer + `/about` data-credits + inline on credited images): "출처: 한국관광공사 TourAPI (https://api.visitkorea.or.kr/) / 공공누리 제1유형". Separate entry per additional dataset with its KOGL type.

### 6.5 Tourism / e-commerce — D3 §6

Information+recommendation only ⇒ 여행업 등록 **not required**, 통신판매업 신고 likely exempt at MVP. If external OTA deep-links added: show "통신판매중개자가 아닙니다" disclaimer. Direct booking/payment post-MVP would trigger 통신판매업 신고 + 청약철회 + possibly 여행업.

### 6.6 CSAP caveat — D2 §16

If the client becomes a government agency (공주시/부여군), CSAP may force NCloud/NHN Cloud instead of Vercel/Supabase. **Open question to confirm contracting status.**

---

## 7. F1–F5 → Component / Module Breakdown

> **Numbering reconciliation:** D1/D2/D4 use slightly different F-labels (D1's F2 docent vs D4's F3 docent). This synthesis adopts: **F1 코스빌더/지도 · F2 접근성 프로필 · F3 오디오 도슨트 · F4 체험학습 다이어리 · F5 외국인/다국어**, mapping D1's "F2 docent" → **F3** here. The 4-layer suitability score (D4 §6) lives inside F1+F2.

### F1 — 코스 빌더 / 지도 (route builder + map)

- `MapView` (Kakao SDK, `CustomOverlay` markers, polygon turning-areas) + `PoiListView` (accessible parallel source of truth).
- `RouteBuilder` (select POIs → ordered course); `RouteEngine` = PostGIS `pgrouting` over slope/단차-tagged graph (NGII DEM-derived).
- `SuitabilityScorer` — **4-layer formula** (D4 §6): L1 이동접근성, L2 감각접근성, L3 가족접근성, L4a 일정안정성 (route/weather/air/night/indoor-alt), L4b 역사경험성 (Odii/heritage/quiz/photo). Output class: 방문가능 / 주의필요 / 대체추천. **Null rule: "정보 없음 — 현장 확인 필요", never infer.**
- `TimeSlotAdvisor` (TatsCnctr crowd index, weight 0.10). `AlternativeSuggester` (TarRlteTar when score <70).
- Data: KorService2 areaBasedList2/locationBasedList2/detailIntro2; weather (KMA), air (AirKorea), emergency (E-Gen/AED). (D1 §8; D4 §6; R5 §3–4)

### F2 — 접근성 프로필 (barrier-free profile)

- `BarrierFreeCard` (renders the `detailWithTour2` fields — **schema TBD vs guide v4.3**), `AccessibilityScoreBadge`, `EntrancePhotoGallery` (PhotoGallery `gallerySearchList1`), `GapReporter` (UGC barrier report → admin queue).
- Persona overlays (D4 §5): 휠체어·시니어 / 유아차 / (children handled by F3+F4) / RTO gap-view → drives which sub-fields surface.
- External layers: BF인증, 행안부 장애인화장실/주차구역, KODDI. (D1 §3.1; D4 §5–6)

### F3 — 오디오 도슨트 (GPS/tap audio guide)

- `DocentPlayer` (transcript-synced, pause/stop/volume, "AI 음성 안내" badge, `aria-live`), `GeofenceTrigger` (consent-gated; map-tap fallback for MVP), `LangSwitcher`.
- Data: **Odii** `storyLocationBasedList` (`xCoord`/`yCoord`/`langCode`/`radius`) for KO/EN/JA/ZH-CN; CLOVA/ElevenLabs TTS cached as MP3 in Storage; children mode via 국립특수교육원 쉬운말. (D1 §3.4; D4 §5; D3 §5.2)

### F4 — 체험학습 다이어리 (experiential-learning diary + PDF)

- `DiaryEditor` (local-first/PIPA v0), `QuizModule`, `ReportGenerator` (`@react-pdf/renderer` → 충남교육청 서식, Pretendard), `BrailleExport` (`braillify` → .brf/Unicode), `GpxExport`.
- Tracks `oldContentid` for renamed content; heritage meta from 국가유산청/e뮤지엄. (D1 §6; R3 §1–3; D4 §4)

### F5 — 외국인 / 다국어 (foreign-visitor)

- `MultilingualContent` (Eng/Jpn/Chs/ChtService2 — codes 76/78/85), `EmergencyPanel` (1330, 영사콜센터, E-Gen foreign-desk deep links), `RtoDashboard` (DataLab visitor trends — "방문자≠관광객" caveat, Recharts/ECharts).
- F5 RTO dashboard doubles as the 지자체 gap-report view (D4 persona 5). (D1 §3.3, §3.6; D4 §4–5)

---

## 8. Parallel Workstream Decomposition (for the agent team)

Goal: maximally independent units with stable interfaces so parallel agents don't collide. **The contract between streams is the Supabase schema + the typed KTO client + the design-token/component library** — freeze those first.

### Phase 0 — Foundation (BLOCKING, do first, small)

| WS | Deliverable | Interface it exposes | Depends on |
|---|---|---|---|
| **WS0-Schema** | Supabase migrations: POI master, images(+`cpyrhtDivCd`), barrier_reports(+RLS deny-by-default, anon-restrictive, admin), platform_admins, audit log, routes/segments(slope/단차), pgvector `match_poi` RPC | DB schema + RLS policies | — |
| **WS0-KTOClient** | Typed server-only KTO client: decoding-key handling (single-encode), `_type=json`+XML-error fallback, token bucket, TTL cache, all service wrappers; **bootstrap fetch of `ldongCode2`+`lclsSystmCode2`**; verify `detailWithTour2` fields vs guide v4.3 | `getPoiList()`, `getBarrierFree(contentId)`, `getDocentStories(...)`, code maps | — |
| **WS0-DesignSystem** | Tailwind v4 tokens (contrast-verified pairs), shadcn/Radix base, Pretendard, a11y primitives (skip-link, RouteFocusReset, aria-live region, focus-trap modal), pictogram set | component library | — |
| **WS0-Infra** | `vercel.json` (`icn1` + cron), env scaffolding, CI: axe/jest-axe/Storybook-a11y/Lighthouse/eslint-jsx-a11y gates, Supabase Pro toggle plan | CI gates green-on-empty | — |

### Phase 1 — Data + platform services (parallel, after Phase 0)

| WS | Deliverable | Depends on |
|---|---|---|
| **WS1-ETL** | Cron ETL: areaBasedSyncList2 incremental, detail/image enrich, festival, **detailWithTour2 per 6 POIs**, photo gallery; `revalidateTag`; embedding refresh | WS0-Schema, WS0-KTOClient |
| **WS1-Auth** | Anonymous-first sign-in, social promotion (`linkIdentity`), PIPA consent UI (separate checkboxes), `/account/data` rights, 30-day anon cleanup | WS0-Schema |
| **WS1-GeoPipeline** | NGII DEM → `gdaldem slope` → per-segment slope/단차 tags in PostGIS; pedestrian graph for pgrouting | WS0-Schema |
| **WS1-AssetPipeline** | PDF (react-pdf+Pretendard+CJK callback), GPX 1.1, braille (braillify→.brf), ARASAAC/KOGL asset registry + attribution component | WS0-DesignSystem |

### Phase 2 — Features (parallel, after Phase 1)

| WS | Feature | Depends on |
|---|---|---|
| **WS2-F1** | Map + RouteBuilder + 4-layer SuitabilityScorer + TimeSlot/Alternative | WS1-ETL, WS1-GeoPipeline, WS0-DesignSystem |
| **WS2-F2** | BarrierFreeCard + ScoreBadge + GapReporter (UGC→admin queue + Realtime broadcast on approve) | WS1-ETL, WS1-Auth |
| **WS2-F3** | DocentPlayer + Geofence(consent) + TTS pipeline + AI labels | WS1-ETL (Odii), WS1-AssetPipeline (MP3) |
| **WS2-F4** | Diary + Quiz + ReportGenerator + Braille/GPX export | WS1-AssetPipeline |
| **WS2-F5** | Multilingual content + EmergencyPanel + RtoDashboard | WS1-ETL (multilingual+DataLab), WS0-DesignSystem |

### Phase 3 — Cross-cutting (after features land)

| WS | Deliverable | Depends on |
|---|---|---|
| **WS3-Offline** | Serwist SW + IndexedDB guide bundles (photos/text/GPX/braille/routes) | all F-streams |
| **WS3-A11yCert** | Manual NVDA/센스리더/VoiceOver/TalkBack pass; K-WAH report; cert filing prep | all F-streams |
| **WS3-Legal** | LBS 신고 filing, privacy policy (위탁/국외이전), AI labels audit, KOGL attribution audit | all F-streams |
| **WS3-Compliance-QA** | End-to-end KWCAG manual checklist, license/most-restrictive audit, "방문자≠관광객"/disclaimer placement | all F-streams |

### Build sequence

**Phase 0 (all 4 in parallel, blocking) → Phase 1 (4 parallel) → Phase 2 (5 parallel features) → Phase 3 (4 parallel cross-cutting).** Critical path runs through WS0-KTOClient → WS1-ETL → WS2-F2 (barrier-free is the product's differentiator and gates the cert/legal streams). Front-load WS0 field-verification (detailWithTour2, ldong codes) since downstream F2/F1 schema depends on it.

---

## 9. Top Risks + Mitigations

| # | Risk | Source | Mitigation |
|---|---|---|---|
| 1 | **`detailWithTour2` field names unverified** (D1, D4, D3 give 3 partly-different sets); F2 schema blocked | D1§3.1 vs D4§3-1 vs R1§3 | WS0-KTOClient downloads guide v4.3 + probes a real 부여/공주 contentId **first task**; F2 codes against the verified schema only |
| 2 | **lDong codes for 충남/공주/부여 hardcoded wrong** (`44/150/760` is digest-only) | D1§2.2 vs R1§6.2 | bootstrap `ldongCode2` at WS0; never hardcode; keep legacy `34/34800` only for TatsCnctr/TarRlte/DataLab namespace |
| 3 | **cat→lclsSystm assumed a rename** → wrong filters | R1§6.1 | build label map empirically from `lclsSystmCode2`; treat D1's HS/VE examples as hypotheses |
| 4 | **serviceKey double-encoding** → resultCode 30 | R1§8 | store DECODING key server-only; encode once via `URLSearchParams`; strip from logs |
| 5 | **Kakao Mobility walking API is partner-only** (digest assumed open) | R5§4.1 | Plan B = own pgrouting graph is the default + offline-capable; Kakao Mobility only as optional enhancement if 제휴 approved |
| 6 | **VWorld DEM is 공개제한** (security-restricted) | R5§3.1 | use NGII open DEM (data.go.kr 15059920, 제한없음); precompute slope offline; never bulk-crawl VWorld tiles |
| 7 | **Cert pass bar is strict (95% expert / 100% user)** and review is Oct 2026 | R2§4.3–4.4 | freeze dev + self-assessment by early Sept; file mid-Sept; voluntary target≥24px/focus-ring; manual SR loop in WS3 |
| 8 | **KTO image HTTP / mixed-content** + Type3 license | D1§7; D3§1.2 | proxy images through HTTPS Next route or `next/image remotePatterns`; branch render on `cpyrhtDivCd` (Type3 no transform) |
| 9 | **PIPA cross-border** via Vercel-US + global CDN | R4§5 | PII only in Supabase Seoul Postgres; public assets only on CDN; disclose 위탁/국외이전; legal review of consent text |
| 10 | **Production KTO account lead time** (1–3 day review + URL) | D1§9.5; R1§9 | apply for operating accounts (per-service 활용신청) well before review; treat 1,000/day dev cap as hard ceiling until then |
| 11 | **Supabase Free auto-pause (1wk idle) + Cron 1×/day** on review-eve | R4§9 | both to Pro for Sept–Oct; cron KST 04:00 = `0 19 * * *` UTC |
| 12 | **Next 15↔16 cache model divergence** | R4§11 | start Next 15 + `unstable_cache`; never wrap per-user data; migrate to 16 only post-assessment |
| 13 | **License contamination** (most-restrictive-wins; KAAC/KODDI no-derivative) | D3§1.3; R3§4–5 | OFL/CC-BY/ARASAAC for anything transformed; KAAC/KODDI as-is only; per-dataset KOGL audit (WS3) |
| 14 | **Odii coverage for the 6 POIs not guaranteed** | D1§9.3 | `themeSearchList`/keyword probe early; fallback to self-authored TTS from heritage meta |
| 15 | **Map canvas invisible to screen readers** | R2§5.2; R5§6.3 | parallel accessible list view is the source of truth; `CustomOverlay` (DOM/ARIA) over raster markers |

---

## 10. Open Questions for the Architect

1. **detailWithTour2 exact field schema** — D1, D4, D3 disagree (`restroom` vs `handicaptoilet`, `lactationroom` vs `nursingroom`, etc.). Lock against guide v4.3 + a live probe before F2 schema. **[blocking F2]** (D1§3.1; D4§3-1; R1§3)
2. **lDong code values** for 충남/공주/부여 — fetch from `ldongCode2`, confirm vs D1's `44/150/760`. And confirm TatsCnctr 공주 `signguCd` (only 부여 `34800` is in the brief). **[blocking F1 region filters]** (D1§9.1; R1§6.2)
3. **Gateway path suffix** for TatsCnctr / DataLab / PhotoGallery / Odii — R1 flags the live param tables rendered empty; D1 asserts no-suffix forms. Confirm `1`-suffix vs none from guide zips/Swagger. (R1 OpenQ2)
4. **Next 15 vs 16** — does the team want Cache Components now or the mature 15 path? Affects all caching code. (R4§11)
5. **Scoring rubric weights (공모전 심사 기준)** — not in any source; obtain official 2026 contest brief (submission window was 2026-03-30~05-06; confirm whether we're still eligible or post-deadline build). (D2§16; D4§7-3)
6. **Native app vs PWA** — D2 lists RN/Flutter candidates; R5 favors Serwist PWA (no app-store overhead). Decide scope (affects mobile a11y standard KS X 3253, Apple Login requirement). (D2§16; R5§5)
7. **CSAP / client identity** — is the client a government agency (공주시/부여군)? If so, Vercel/Supabase may be disallowed → NCloud/NHN. **[architecture-altering]** (D2§16)
8. **GPS real-time vs map-tap for F3** — MVP map-tap avoids needing the LBS 신고 live; confirm launch timing vs 방통위 filing lead time. (D4§8-6; D3§3)
9. **Kakao Mobility 제휴** — attempt the partnership application, or commit fully to own-graph routing? Affects F1 route fidelity and timeline. (R5§4.1)
10. **juso 좌표제공 API** approval (본인인증+승인) — start early; decide if Kakao Local geocoding suffices for runtime with juso as gov fallback. (R5§2.1)
11. **Payment scope** — any ticketing/booking post-MVP? Triggers 통신판매업 신고 + PortOne. (D2§16; D3§6)
12. **RTO partnership evidence** — Chungnam is not in the official 7-RTO contest list (D4§1-2); confirm the 지역특화 특별상 eligibility path and any CACF/다도라/올담 data-sharing agreement. (D4§1)

---

*Synthesis complete. Brief provenance is cited inline per claim. Any conflict between a D-brief (digest) and an R-brief (2026-06-13 live verification) was resolved in favor of the R-brief; the four load-bearing reversals are: (a) no single cat/areaCode cutoff date — rolling per-service; (b) lDong codes must be fetched, not hardcoded; (c) cat→lclsSystm is not a rename; (d) Kakao Mobility walking + VWorld DEM are gated, so own-graph routing + NGII DEM are the defaults.*
