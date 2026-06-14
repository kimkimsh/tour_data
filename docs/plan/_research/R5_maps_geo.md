# R5 — Maps, Geocoding, Slope/DEM, Offline Route Packaging

**Project:** 모두의 백제 (Modu Baekje) — Next.js + Supabase + Vercel (Seoul), KTO TourAPI 4.0, KWCAG 2.2, Korean tourism-data contest (functional review Oct 2026).
**Research date:** 2026-06-13. **Scope:** map SDK choice, geocoding, DEM/slope for wheelchair routing, static pedestrian routing, offline-first PWA packaging, polygon/marker rendering.
**Verification:** all claims cross-checked against primary/official sources (Kakao Developers, Kakao Mobility Developers, vworld.kr, juso.go.kr, data.go.kr, Mapbox docs, Serwist/Next.js docs). See **Sources**.

---

## 0. TL;DR / 핵심 결론

- **Base map + Korean POI/address: Kakao Maps JavaScript SDK is the right primary choice.** Best Korean address/POI quality, free quota is generous (Map SDK 300,000 calls/day; Local/geocoding 100,000 calls/day **per API per app**), and excess usage is extremely cheap (Map SDK **0.1 KRW/call**, Local **0.5 KRW/call**). Mapbox is unsuitable for Korea (KR has **no address-level geocoding coverage**, and KR law requires map data hosted in-country). VWorld is a strong **free government complement** (background tiles, geocoder, admin-boundary polygons) but is not the best interactive base map for a consumer accessibility app.
- **⚠️ Correction to "2026 Kakao discount" in prior research.** The widely-cited **"80% discount → 10 KRW/call (Feb 2 – Dec 31, 2026)" applies ONLY to Kakao Talk Share (카카오톡 공유 메시지 발송)** — NOT to Kakao Map. Kakao Map's paid overage is governed by a **separate, much cheaper price table** (0.1 KRW/call Map, 0.5 KRW/call Local). Do not budget Kakao Map at "10 KRW/call." (Source: developers.kakao.com quota page, verified 2026-06.)
- **⚠️ Kakao Mobility 도보(보행) 길찾기 = partner-only.** The pedestrian directions API (`/affiliate/walking/v1/directions`) is a **제휴 파트너 전용 (affiliate/partnership-only)** product requiring a prior signed contract + business-account approval. A Nov 2025 DevTalk request for exactly our use case (visually-impaired walking support) was told "제휴 문의 필요." **Plan B is mandatory** — do not assume open access for a contest MVP.
- **Slope/DEM:** VWorld serves DEM, **but its 3D terrain DEM (terrainDEM via XDServer) is classified 공개제한 (security-restricted)** — storing/exporting/bulk-caching it likely violates the 국가공간정보 보안관리규정 and VWorld API terms. **Use the NGII 공개 DEM file (data.go.kr, "이용허락범위 제한 없음")** as the offline slope source: pre-compute slope server-side, store derived 경사도 per path segment in Supabase. Do NOT bulk-crawl VWorld DEM tiles at runtime.
- **Offline PWA:** **Serwist** (`@serwist/next`, current **9.5.11**, ESM-only, supports Next.js 14→16) for the service-worker / app-shell precache; **IndexedDB** (via `idb` or `localForage`) for the POI-guide bundle (photos + text + GPX + braille). Note: `output: 'export'` static export conflicts with Supabase SSR/auth — use Serwist's runtime-caching strategies on a normal Vercel deploy instead of full static export.

---

## 1. Map SDK Comparison — Kakao vs VWorld vs Mapbox

### 1.1 Decision matrix (Korean accessibility public service)

| Axis | **Kakao Maps JS SDK** | **VWorld (브이월드)** | **Mapbox GL JS** |
|---|---|---|---|
| Korean address quality | Excellent (도로명+지번, 우편번호) | Excellent (gov 도로명주소 source) | **Poor** — KR Address level = not covered (only region/postcode/place/locality/neighborhood) |
| Korean POI quality | Excellent (카카오 장소 DB) | Limited (gov features, not consumer POI) | Weak in KR; Search Box improving but KR POI thin |
| License for public service | Free quota + cheap paid; ToS allows public service | **Free** (공공데이터, 영리 이용도 원칙 허용) | Commercial; **KR map-data-residency regulation** forces Korea-hosted tiles (Hyundai AutoEver had to build hybrid w/ in-country tiles) |
| Polygon/marker rendering | Native `Polygon`/`Marker`/`CustomOverlay` + `drawing` lib | OpenLayers3 (2D) / Cesium (3D WebGL) overlays | Best raw render perf for dense markers/polygons (per HAE benchmark) but Korea data gap kills it |
| Slope/DEM | none | **DEM available** (but 3D DEM is 공개제한) | terrain-RGB tiles (not Korea-authoritative) |
| Offline/self-host tiles | No (online SDK only) | No (외부망 전용; tiles online) | Yes (can self-host vector tiles) but pointless without KR data |
| Cost at MVP scale | ~free (well within quota) | free | $ (per-load/geocode billing) |

**Recommendation:** **Kakao Maps JS SDK as the primary interactive base map + Kakao Local for geocoding/POI**, with **VWorld as a free fallback/complement** for (a) government admin-boundary polygons (`LT_C_ADSIDO_INFO` etc.), (b) a secondary geocoder, and (c) WMS thematic layers. **Reject Mapbox** for the Korea-facing accessibility product.

### 1.2 Kakao Maps JS SDK — load + libraries

```html
<!-- JavaScript key required (NOT REST key). autoload=false to defer init.
     ⚠ Quota is consumed when the SDK script is requested, regardless of the load callback. -->
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_JS_KEY&autoload=false&libraries=services,clusterer,drawing"></script>
```
- Libraries: `services` (place search + address↔coord), `clusterer` (marker clustering), `drawing` (polygon/marker drawing UI).
- **Security note:** the Kakao/VWorld SDK loader URLs are dynamically versioned by the vendor, so a fixed `integrity="sha384-..."` SRI hash is not applicable; mitigate CDN-compromise risk instead via a strict CSP (`script-src` limited to `*.kakao.com`/`*.vworld.kr`), `crossorigin="anonymous"`, and registered-domain restriction in the Kakao console. Apply SRI to any self-hosted/static third-party script you do pin to a fixed URL.
- Platform key rule: **JavaScript SDK → JavaScript key**; **REST calls (geocoding via Local REST) → REST API key**. Wrong key type = error. Register allowed service domain in the Kakao Developers console.
- New apps since 2024-12-01 must **activate the Kakao Map feature** in app settings before use.
- React: community wrapper `react-kakao-maps-sdk` (`<Polygon>`, `<Marker>`, `<CustomOverlay>`, `<DrawingManager>`) is well-maintained and idiomatic for our Next.js stack.

### 1.3 Kakao quota & pricing (verified 2026-06, official quota page)

- **Monthly free quota:** 3,000,000 calls across all APIs (per app). Note: paid-overage calls are NOT deducted from this free monthly pool.
- **Daily free quota (per API, per app):**
  - 지도(Map) SDK JavaScript: **300,000 / day**; Map SDK iOS/Android: 300,000/day
  - 로컬(Local) — 주소↔좌표 변환, 좌표→행정구역, 좌표계 변환, 키워드/카테고리 장소 검색: **100,000 / day each**
- **Paid overage unit prices (Kakao Map's own table — NOT the Talk-Share table):**
  - Map SDK (JS / iOS-Android): **0.1 KRW/call**
  - Local (주소→좌표, 좌표→행정구역, 좌표→주소, 좌표계 변환): **0.5 KRW/call**
  - 키워드/카테고리 장소 검색: **2 KRW/call**
- Exceeding free quota without paid setup → **HTTP 429**. Paid use requires linking a **비즈월렛 (Biz Wallet)** and enabling [Paid API] for Kakao Map. You can set daily/monthly spend caps.
- **The "2026 80% discount (10→… actually 50→10 KRW/call)" is Kakao Talk Share only**, valid 2026-02-02 ~ 2026-12-31, reverts to 50 KRW after. Irrelevant to map/geocoding cost.

> **Budget takeaway:** at contest/MVP traffic the app stays inside the free daily quotas. Even a heavy day (e.g. 500k map loads) costs ~50,000 KRW for the 200k overage at 0.1 KRW/call — trivial. Geocoding should be **cached** (see §4) to stay under 100k/day Local and avoid repeated billed calls.

---

## 2. Geocoding & Address — 도로명주소 (juso.go.kr) + VWorld

### 2.1 도로명주소 API (행정안전부, juso.go.kr) — the authoritative address source

Application portal: `https://m1.juso.go.kr/addrlink/openApi/apiReqst.do` (also mirrored on data.go.kr).

| API | Identity verification | Notes |
|---|---|---|
| 공개 도로명주소 API (검색/팝업) | Not required | Address text search; **no daily call limit** ("도로명주소 조회는 일일호출횟수 제한이 없습니다") |
| 공개 영문주소 API (검색) | Not required | English road-name + jibun, postcode, admin codes — **needed for our bilingual / foreign-visitor requirement** |
| **제공 좌표제공 API (좌표제공)** | **본인인증 + 승인절차 필수** | Returns X/Y coordinates (geocoding). Requires identity auth and an approval step before activation. |
| 제공 지도제공 API | (varies) | Map display |
| 공개 상세주소 API | Not required | Detailed/sub-address |

- 1 system → 1 승인키 (approval key). 서비스 용도 = 운영/개발; 개발 키 issuable for 7/30/90 days without identity auth.
- **Hard constraint:** SQL-keyword / special-char filtering on the search term is **mandatory** — the security appliance treats `OR/SELECT/UNION/...`, `% = > <` as SQL-injection and will **block your IP**. Implement `checkSearchedWord()`-style filtering before every call (sample provided on the apiReqst page).
- Legal: use must comply with 도로명주소법, 국가공간정보기본법, 공간정보 구축·관리법, 행안부 공간정보 보안관리 규정.

**Recommendation:** use **공개 도로명주소 API + 공개 영문주소 API** for text address search (KO + EN, no limit, no auth), and obtain the **좌표제공 API** approval early (it gates geocoding and needs 본인인증 + 승인). For interactive POI/address-to-coord at runtime, Kakao Local geocoding is faster to integrate; juso 좌표제공 is the authoritative gov fallback.

### 2.2 VWorld Geocoder API 2.0 (free gov geocoding, ~30k/day)

- **Address → coordinate (getcoord):**
  `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326&type=ROAD&address={addr}&format=json&key={KEY}` (`type=ROAD` 도로명 / `PARCEL` 지번; `refine=false` optional).
- **Coordinate → address (getaddress):**
  `https://api.vworld.kr/req/address?service=address&request=getaddress&version=2.0&crs=EPSG:4326&type=ROAD&point={lng},{lat}&format=json&errorformat=json&key={KEY}`
- Default daily limit ≈ **30,000 geocoding requests/day**; excess via VWorld 제한사용초과요청 form.
- **Browser/JS calls require `&domain=` param** matching the registered service URL (key의 서비스유형이 "웹사이트"일 때 필수) — common cause of "인증키 정보가 올바르지 않음."
- Key lifetime: **6 months, renewable 3× (max ~12 months)** — must build key-rotation/renewal into ops. (data.go.kr-issued VWorld links list 2-year usage; the vworld.kr직접 key is 6mo.)
- License: VWorld open-API map/data are **저작자표시 / 공공저작물_출처표시** (attribution) and free; 영리적 이용 not prohibited in principle (공공데이터법 §3④). **BUT** the 3D/DEM tier has extra restrictions — see §3.

---

## 3. DEM / 경사도 (Slope) for Wheelchair Routing

### 3.1 What VWorld offers — and the critical restriction

- VWorld serves **terrain DEM** through the **XDServer 3D Data API**:
  `http://xdworld.vworld.kr:8080/XDServer/3DData?Version=2.0.0.0&Request=GetLayer&Key={KEY}&Layer=dem&Level={0..15}&IDX={idx}&IDY={idy}` — returns binary **`.bil`** tiles of grid elevation values (Level 15 ≈ ~1.5 m cells, not present in all regions; resolution varies by region). Capability discovery via `Request=GetCapabilities` (lists `Layer Name="dem" Type="terrainDEM" MinLevel=0 MaxLevel=15`).
- **⚠️ Restriction (load-bearing):** VWorld's 3-D data (incl. terrain DEM) is officially classified **기타공간정보 "공개제한"** under the **국토교통부 국가공간정보 보안관리규정 (제10조 1항 3호 — 복제·출력 제한)**: restricted spatial info **may not be copied/exported without a security officer's permission**. VWorld API 이용약관 제10조·제12조 also constrain reuse. VWorld itself has issued takedown notices to projects that bulk-saved DEM tiles. **=> Do not bulk-crawl/cache VWorld DEM as our offline slope dataset.**

### 3.2 Safer DEM source — NGII 공개 DEM (data.go.kr)

- **국토교통부 국토지리정보원_DEM** (data.go.kr id `15059920`): **이용허락범위 = 제한 없음** (no use restriction), 무료, IMG format, updated 2025-06-17. Download via 국토정보플랫폼 (map.ngii.go.kr) — requires the 대용량 파일전송 S/W and GIS tooling (지리OneView / QGIS / GDAL). Public open DEM also available at 90 m via 국토정보플랫폼 (coarse) and higher-res via the simple-map 공개DEM picker.
- **This is the dataset to base offline slope on** (clear, unrestricted license), processed offline into per-segment slope and stored in Supabase.

### 3.3 How to derive slope (경사도) for routing

1. Acquire NGII 공개 DEM for the Baekje target regions (부여/공주/익산 etc.); reproject to EPSG:5186/5179 (KR) or work in EPSG:4326 with care.
2. Server-side / offline pipeline (GDAL/`rasterio`/`richdem`/QGIS): `gdaldem slope` (Horn or Zevenbergen-Thorne) → slope raster (degrees or %), optionally `gdaldem aspect`.
3. For each pedestrian path segment / node (from KTO TourAPI무장애 data + our own surveyed routes), sample DEM elevation at vertices (QuadTree lookup over DEM tiles is the published efficient pattern), compute **rise/run = grade (%)** along the segment, and tag each segment with a wheelchair-feasibility class (e.g. ≤1/18 ≈ 5.6% preferred, KWCAG/BF ramp thresholds; flag >8.3% as barrier).
4. Persist derived slope + 단차(step/level-difference) flags as **static attributes in Supabase** (PostGIS). Routing then runs over this pre-tagged graph — **no runtime DEM calls**, which also fixes the VWorld restriction and offline use.

> Wheelchair routing is fundamentally a **graph problem with slope/단차/surface costs**, not a DEM-at-runtime problem. Precompute once; serve as static GeoJSON + Supabase rows; ship in the offline bundle.

---

## 4. Static Pedestrian Routing + Duration Caching (not realtime)

### 4.1 Kakao Mobility 도보 길찾기 — endpoints, params, and the access gate

- **Endpoint:** `GET https://apis-navi.kakaomobility.com/affiliate/walking/v1/directions`
  - Headers: `Authorization: KakaoAK {REST_API_KEY}`, `service: <string>`, `Content-Type: application/json`.
  - Query: `origin={lng},{lat}`, `destination={lng},{lat}`, `waypoints={lng,lat|lng,lat}` (max 5), `priority=DISTANCE|MAIN_STREET` (default DISTANCE), `summary=true|false`, `default_speed` (0 ⇒ 4 km/h ETA).
  - Response: `routes[].summary.distance` (m), `summary.duration` (s), `sections[].roads[]` (per-road distance/duration) — i.e. polyline geometry + duration, exactly what we need to cache.
  - Multi-waypoint variants: `/affiliate/walking/v1/waypoints/directions` (POST, up to 100), `/origins/directions`, `/destinations/directions`.
- **⚠️ ACCESS = partner-only.** Official page states verbatim: **"해당 API는 제휴 파트너 전용 API입니다. 사용을 위해서는 사전 제휴 계약이 필요합니다."** Onboarding = create a 카카오비즈니스 account, email app info to the Kakao Mobility 제휴 contact (`russel.ht@kakaomobility.com`), await approval. A Nov-2025 DevTalk request for a **시각장애인 보행지원** app (non-commercial, research/personal) was answered: **"제휴가 필요한 내용으로 보이며 제휴 문의로 요청해 주세요."** => assume **not granted by default** for a contest MVP timeline.

### 4.2 Recommended routing strategy (resilient to the partner gate)

- **Primary (if 제휴 approved):** call Kakao Mobility walking directions **once per OD pair at curation time**, store `{polyline, distance, duration, sections}` in Supabase, serve statically. Re-fetch only when a route's underlying path changes. This matches the brief's "STATIC polyline + duration caching (not realtime)" goal and minimizes API volume.
- **Plan B (no 제휴):** self-route over our own **pedestrian/accessibility graph** (KTO 무장애 routes + surveyed segments, slope-tagged from §3) using PostGIS `pgrouting` (Dijkstra/A*) on Supabase. Compute polyline + ETA server-side; full control over wheelchair cost (slope, 단차, surface, curb-cut). **This is also the only fully offline-capable option** and is the safer default for a public accessibility service.
- **Plan C (display-only fallback):** Kakao Maps URL scheme `/link/...` to hand off to the Kakao Map app for turn-by-turn, while our app shows the cached static guide. No partner contract needed for URL links.

> For wheelchair accessibility, generic pedestrian routing is anyway insufficient (it ignores 단차/slope/surface). The **own-graph (Plan B)** is both the contractual-risk hedge and the functionally correct choice; treat Kakao Mobility as an optional enhancement.

---

## 5. Offline-First PWA Packaging (photos + text + GPX + braille)

### 5.1 Service worker — Serwist (current)

- **`@serwist/next` v9.5.11** (Mar 2026), ESM-only, peer `next >=14`, works with **Next.js 15/16**; v10 is preview (Next 15+ only). Modern successor to `next-pwa`.
- Wiring (App Router, webpack): wrap `next.config` with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", cacheOnNavigation: true, reloadOnOnline: true })`; SW enabled in production only (dev disabled so cache doesn't mask changes). Turbopack path: `@serwist/turbopack` `createSerwistRoute(...)` route handler + `<SerwistProvider swUrl=...>`.
- Service worker core:
  ```ts
  const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST, // app shell (HTML/CSS/JS)
    skipWaiting: true, clientsClaim: true, navigationPreload: true,
    runtimeCaching: defaultCache,
    fallbacks: { entries: [{ url: "/~offline", matcher: ({request}) => request.destination === "document" }] },
  });
  ```
- **Caching strategy per asset class:**
  - App shell (HTML/CSS/JS): **precache** + StaleWhileRevalidate for pages.
  - POI **photos** (png/jpg/webp): **CacheFirst** (long expiration, capped `maxEntries`).
  - **Tourism/route API JSON**: **NetworkFirst** with `networkTimeoutSeconds: 3` → falls back to cache offline.
  - **GPX / braille / guide bundle**: precache the specific bundle URLs the user "downloads," or store in IndexedDB (below).
- **⚠️ Next.js note:** full `output: 'export'` (pure static) is the cleanest for SW precaching but **breaks Supabase SSR/auth + dynamic routes**. For this stack, deploy normally on Vercel and rely on Serwist runtime caching + an explicit "download this guide for offline" action; do not force static export.

### 5.2 IndexedDB — the POI guide bundle store

- Use **IndexedDB** (not localStorage: 5 MB, string-only, sync) for the structured offline bundle — hundreds of MB capacity, async, binary blobs, indexes. Wrap with **`idb`** or **`localForage`** for ergonomics.
- Suggested object stores:
  - `poiGuides` — `{ id, title_ko, title_en, text, brailleUnicode/brf, photos: Blob[] | refs, gpxRef, slopeTags, updatedAt }`
  - `media` — photo/audio Blobs keyed by hash (compress client-side via Canvas API before store).
  - `routes` — `{ odKey, polyline (encoded/GeoJSON), distance, duration, segments[] with slope/단차 }` (the cached static routes from §4).
  - `syncQueue` — optional, for user notes/feedback when offline → replay on reconnect (TanStack Query persister + mutation queueing is the proven pattern).
- **GPX**: store as text/Blob in IndexedDB + offer file export; render the track on Kakao map as a `Polyline` from parsed coordinates. **Braille**: store Unicode braille (U+2800 block) and/or `.brf`; render in a high-contrast braille-font view; never lossy-transform.
- "Download for offline" UX: on tap, fetch bundle (photos + text + GPX + braille) → write to IndexedDB; SW serves the app shell; subsequent visits work fully offline. Show explicit offline/online state + sync feedback (the common failure is a PWA that "opens offline" but silently can't read/save data).

---

## 6. Rendering Polygons (wheelchair turning areas) + Markers (단차) on Kakao

### 6.1 Polygons — wheelchair turning areas / service zones

```js
const path = coords.map(c => new kakao.maps.LatLng(c[1], c[0])); // GeoJSON [lng,lat] → LatLng(lat,lng)
const polygon = new kakao.maps.Polygon({
  map, path, strokeWeight: 2, strokeColor: '#004c80', strokeOpacity: 0.8,
  fillColor: '#CFE7FF', fillOpacity: 0.6,
});
kakao.maps.event.addListener(polygon, 'click', (e) => { /* show info / a11y label */ });
```
- Load from GeoJSON; handle both `Polygon` (`coordinates[0]`) and `MultiPolygon` (`coordinates[][0]`) rings.
- `polygon.getArea()` gives m² (useful to validate a turning area meets the min wheelchair turning footprint, ~1.5 m diameter / ~1.5 m × 1.5 m).
- Label a zone with a **`CustomOverlay`** placed at the polygon centroid (compute centroid; libraries like `@turf/centroid` or a small centroid fn).
- VWorld admin-boundary polygons (if needed) come from VWorld 데이터 API `getfeature` (`data=LT_C_ADSIDO_INFO` / `LT_C_ADSIGG_INFO` / `LT_C_ADEMD_INFO`) returning GeoJSON featureCollection — render with the same Kakao `Polygon` code.

### 6.2 Markers — 단차 (level differences / steps / curbs) & POIs

- `kakao.maps.Marker({ map, position, image: new kakao.maps.MarkerImage(src, size, opts) })` with custom 단차 icons; or **`CustomOverlay`** for fully styled, ARIA-labeled HTML markers (preferred for KWCAG 2.2 — real DOM = focusable/labelable; plain `Marker` images are not screen-reader friendly).
- Use the **`clusterer`** library when many 단차/POI markers overlap at low zoom.
- **`drawing`** library (`DrawingManager` with `OverlayType.POLYGON / POLYLINE / MARKER`) for an admin/curation tool to draw turning areas and drop 단차 markers, with built-in undo/redo (`manager.undo()/redo()/undoable()/redoable()`).

### 6.3 Accessibility (KWCAG 2.2) note for map UI

- Canvas-based map markers are invisible to screen readers → provide a parallel **text/list view** of POIs, 단차, and routes (name, distance, slope, 단차 count) as the accessible source of truth; the map is an enhancement. Prefer `CustomOverlay` (real DOM, `role`/`aria-label`) over raster `Marker` where SR access matters. Ensure non-color cues for slope/단차 severity.

---

## 7. Terms-of-Service Constraints (government-data public service) — summary

| Source | Key constraint for our public service |
|---|---|
| **Kakao Map/Local** | Free within daily quota; over-quota → 429 unless Biz Wallet + Paid API enabled (Map 0.1, Local 0.5, place-search 2 KRW/call). JS key for SDK, REST key for geocoding; register domain. Don't exceed token-issue rate limits on login. |
| **Kakao Mobility (도보 길찾기)** | **제휴 계약 필수** (partner-only). No open access; email approval required. Plan for own-graph routing as default. |
| **도로명주소 (juso.go.kr)** | 공개 도로명/영문 주소 API: no auth, **no daily limit**. **좌표제공 API: 본인인증 + 승인 필수.** Mandatory SQL/special-char input filtering (else IP block). Comply w/ 도로명주소법 등. |
| **VWorld (2D map/geocoder/data)** | Free, attribution (저작자표시/출처표시). Geocoder ~30k/day (excess form). JS calls need `&domain=`. Keys 6-month renewable. **외부망 전용** (대국민 서비스). 영리 이용 원칙 허용. |
| **VWorld 3D / terrain DEM** | **공개제한 (security-restricted)** under 국가공간정보 보안관리규정 §10; copy/export needs security-officer permission; bulk caching breaches API 이용약관 §10/§12. **Avoid as offline DEM source.** |
| **NGII 공개 DEM (data.go.kr)** | **이용허락범위 = 제한 없음** — safe to download, process, and ship derived slope. Use this for offline routing. |
| **Mapbox** | KR map-data residency regulation (in-country hosting); KR address-level geocoding not covered; storage/permanent-geocoding billed separately. **Not recommended for KR.** |

---

## Sources

**Kakao Maps / Local / Quota / Pricing**
- Kakao Developers — Quota (KO): https://developers.kakao.com/docs/ko/getting-started/quota
- Kakao Developers — Quota (EN): https://developers.kakao.com/docs/en/getting-started/quota
- Kakao Developers — Paid API: https://developers.kakao.com/docs/ko/app-setting/paid-api  ·  https://developers.kakao.com/docs/en/app-setting/paid-api
- Kakao Developers — Kakao Map common/usage policy: https://developers.kakao.com/docs/ko/kakaomap/common  ·  https://developers.kakao.com/docs/en/kakaomap/common
- Kakao Developers — Local common: https://developers.kakao.com/docs/en/local/common
- Kakao Developers — Stat / quota notifications: https://developers.kakao.com/docs/en/getting-started/stat
- DevTalk — 카카오맵 유료 쿼터/요금제 문의 (2026): https://devtalk.kakao.com/t/topic/149017  ·  https://devtalk.kakao.com/t/api/149963  ·  https://devtalk.kakao.com/t/api/141571
- DevTalk Notice — API 추가 쿼터 / 카카오맵 API 설정 (2024-10): https://devtalk.kakao.com/t/api-api/140424
- Kakao Maps JS load + drawing/polygon/cluster patterns: https://blog.pages.kr/3677
- react-kakao-maps-sdk docs (Polygon/Marker/Drawing): https://react-kakao-maps-sdk.jaeseokim.dev/docs/sample/overlay/drawShape  ·  .../docs/sample/library/drawingUndo
- DevTalk — Polygon + CustomOverlay centroid example: https://devtalk.kakao.com/t/topic/121618  ·  https://devtalk.kakao.com/t/topic/136287

**Kakao Mobility (walking directions — partner-only)**
- 도보 길찾기 API: https://developers.kakaomobility.com/affiliate/walking/directions.html  ·  EN: https://developers.kakaomobility.com/affiliate-en/walking/directions.html
- 시작하기 (도보): https://developers.kakaomobility.com/affiliate/walking/start.html
- 다중 경유지/출발지 도보: https://developers.kakaomobility.com/affiliate/walking/waypoints.html  ·  .../origins.html
- 제휴 API 안내: https://developers.kakaomobility.com/affiliate/
- 길찾기 API (자동차) start/product: https://developers.kakaomobility.com/affiliate/navi-api/start.html  ·  https://developers.kakaomobility.com/guide/navi-api/start.html  ·  https://developers.kakaomobility.com/product/naviapi.html
- DevTalk — Directions API 사용신청 (시각장애인 보행지원, 2025-11 / 2026-04): https://devtalk.kakao.com/t/directions-api-navigation-api/147260  ·  https://devtalk.kakao.com/t/directions-api-navigation-api/149487

**도로명주소 (juso.go.kr) / 영문주소**
- API 신청하기 (좌표제공 본인인증, SQL 필터링, 일일제한 없음): https://m1.juso.go.kr/addrlink/openApi/apiReqst.do
- API 체험하기: https://m1.juso.go.kr/addrlink/openApi/apiExprn.do
- 행안부_실시간 영문주소정보 조회(검색API) (data.go.kr): https://www.data.go.kr/data/15057413/openapi.do
- 주소기반산업지원서비스: https://business.juso.go.kr/

**VWorld (브이월드) — geocoder, data API, DEM, terms**
- Geocoder 2.0 getaddress/getcoord 예제: https://lsw3210.tistory.com/entry/vworld-지도-만들기8-좌표에-대한-주소-검색하기-1  ·  https://mskim8717.tistory.com/73  ·  https://egtools.tistory.com/entry/vWorldGeocoding
- 인증키 신청/도메인/6개월 만료: https://lsw3210.tistory.com/entry/vworld-지도-만들기1-인증키-신청-관리  ·  https://foss4g.tistory.com/2059
- 데이터 API getfeature(행정구역 폴리곤)/WMS/WMTS 예제: https://github.com/V-world/V-world_API_sample (Readme + sample HTML)
- WMS/WFS 구현: https://lsw3210.tistory.com/entry/VWorld의-WFS-면적-오류
- DEM via XDServer 3DData (GetLayer/GetCapabilities, .bil): https://surpassing.tistory.com/895  ·  https://www.vw-lab.com/52
- VWorld 3D/DEM **공개제한** + 보안관리규정 §10 + API 이용약관 §10/§12: https://www.vw-lab.com/54
- VWorld DEM QuadTree elevation extraction (2024/25 paper): https://www.koreascience.kr/article/JAKO202514054004062.page  ·  https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003179024
- VWorld 공공데이터포털 2D/3D/WMTS 항목 (무료, 출처표시): https://www.data.go.kr/data/3052419/openapi.do  ·  https://www.data.go.kr/data/3073144/openapi.do  ·  https://www.data.go.kr/data/3046388/openapi.do
- 나무위키 V-World (지오코더 일일제한·외부망·무료): https://namu.wiki/w/V-World
- 공간정보산업진흥원 (브이월드 3D 경사도 분석 기능): http://www.spacen.or.kr/vworld_mgm/business_info.do

**DEM (NGII 공개 DEM — unrestricted)**
- 국토교통부 국토지리정보원_DEM (data.go.kr, 이용허락 제한 없음): https://www.data.go.kr/data/15059920/fileData.do
- 국토정보플랫폼: http://map.ngii.go.kr/ms/map/NlipMap.do?tabGb=total

**Mapbox (Korea data gap / residency)**
- Data coverage table (KR no Address level): https://docs.mapbox.com/help/dive-deeper/mapbox-data/
- Hyundai AutoEver — KR map-data residency / hybrid tiles: https://www.mapbox.com/showcase/hyundai-autoever
- Mapbox Search Box / geocoding coverage & storage model: https://www.mapbox.com/blog/mapbox-search-box-api-expanded-poi-coverage-smarter-search  ·  https://coordable.co/provider/mapbox-geocoding-api/

**Offline PWA (Serwist / Next.js / IndexedDB)**
- Serwist @serwist/next npm (9.5.x, Next 16): https://www.npmjs.com/package/@serwist/next  ·  changelog: https://raw.githubusercontent.com/serwist/serwist/main/packages/next/CHANGELOG.md
- Serwist getting-started (webpack) + Turbopack: https://serwist.pages.dev/docs/next/getting-started  ·  https://serwist.pages.dev/docs/next/turbo
- Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- Next.js 16 PWA offline (Serwist + IndexedDB/idb): https://blog.logrocket.com/nextjs-16-pwa-offline-support/
- Offline-first PWA (output:export, next-pwa/Workbox, IndexedDB, image caching): https://www.stripesys.com/blog/offline-first-pwa-nextjs
- Serwist + TanStack Query + LocalForage offline-first reference: https://github.com/nomomon/offline-first-todo-app
- Serwist caching-strategy example (RSC/pages SWR): https://locallytools.com/blog/build-offline-app-with-nextjs-and-serwist
