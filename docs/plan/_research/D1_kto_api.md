# D1 — KTO OpenAPI Reality Digest
## 모두의 백제 (Modu Baekje) Implementation Brief

> Sources: KTO official manuals v4.0–v4.4 (local `docs/api_manual/**/*.docx`), public data portal metadata, and `docs/search/` digest files. All facts are traceable to those primary sources. No invention.

---

## 1. Authentication & Traffic Policy

| Item | Value |
|---|---|
| Provider code (data.go.kr) | **B551011** |
| Key issuance channel | https://www.data.go.kr/ (first-party; `api.visitkorea.or.kr` is guide-only) |
| Auth param | `serviceKey` (URL-encoded for keys issued before 2015-01; already encoded for 2015-01+) |
| Required common params | `serviceKey`, `MobileOS` (`IOS`/`AND`/`WEB`/`ETC`), `MobileApp` (service name, used for traffic stats — omitting causes data gap at KTO and disadvantages production-account review) |
| Optional common params | `numOfRows` (default 10), `pageNo` (default 1), `_type=json` (omit → XML) |
| Default response format | **XML**. JSON requires `&_type=json`. **Error responses are always XML regardless of `_type`** — parsers must handle both. |
| Character set | **UTF-8 fixed** |
| Dev-account traffic cap | **1,000 calls/day per operation** (auto-approved; 10–30 min activation lag) |
| Production account | Reviewed by KTO (1–3 days); requires registered use-case URL. **Valid 24 months**; renew via portal button |
| Cost | Free |
| Contact | tourapi@knto.or.kr / 070-4287-3219 |

### 1.1 Standard Response Envelope (JSON)

```json
{
  "response": {
    "header": { "resultCode": "0000", "resultMsg": "OK" },
    "body": {
      "items": { "item": [...] },
      "numOfRows": 10,
      "pageNo": 1,
      "totalCount": 100
    }
  }
}
```

### 1.2 Key Error Codes (KTO-side)

| Code | Meaning |
|---|---|
| `00` / `0000` | Normal |
| `03` | No data |
| `10` | Invalid request parameter |
| `11` | Missing required parameter |
| `22` | Daily traffic limit exceeded |
| `30` | Unregistered service key |
| `31` | Key expired |

---

## 2. Code Systems — Critical: New vs Legacy

### 2.1 Version Timeline (Breaking Changes)

| Version | Date | Key Change |
|---|---|---|
| v4.0 | 2022-08-02 | All operations renamed with `2` suffix (e.g., `areaBasedList2`) |
| v4.3 | 2025-05-12 | NEW: `lDongRegnCd`/`lDongSignguCd` (legal-dong region codes) + `lclsSystm1/2/3` classification added to all list operations; `ldongCode2` and `lclsSystmCode2` new operations; `oldContentid` added to sync |
| **v4.4** | **2026-02-10** | **`areaCode2`, `categoryCode2` DELETED from KorService2**; `areaCode`/`sigunguCode`/`cat1`/`cat2`/`cat3` removed from KorService2 requests/responses — full migration to ldong + lclsSystm |

### 2.2 New Code System (v4.3+ Standard — Use This for Modu Baekje)

#### Legal-dong Region Codes (`lDongRegnCd` / `lDongSignguCd`)

`lDongRegnCd` = 2-digit province code. `lDongSignguCd` = 3-digit district suffix (not the full 5-digit code).

**Critical codes for Modu Baekje (Chungnam 공주·부여):**

| Region | `lDongRegnCd` | District | `lDongSignguCd` |
|---|---|---|---|
| 충청남도 | `44` | 공주시 | `150` |
| 충청남도 | `44` | 부여군 | `760` |

**Example call** (Gongju historic sites):
```
GET https://apis.data.go.kr/B551011/KorService2/areaBasedList2?
    serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
    &lDongRegnCd=44&lDongSignguCd=150&lclsSystm1=HS&lclsSystm2=HS01
    &contentTypeId=12&arrange=C&numOfRows=50
```

Selected other region codes: 서울=11, 부산=26, 대전=30, 충북=43, 충남=44, 제주=50.

#### Classification System (`lclsSystm1/2/3`) — v4.3+

11 top-level categories, 62 mid-level, ~240 leaf codes (totalCount=243 via `lclsSystmCode2`).

**Codes relevant to Modu Baekje:**

| `lclsSystm1` | `lclsSystm2` | Meaning | → `contentTypeId` (KOR) |
|---|---|---|---|
| `HS` | `HS01` | 역사유적지 (historic sites — 공산성·부소산성·무령왕릉) | 12 |
| `HS` | `HS03` | 종교성지 (religious sites — 정림사지) | 12 |
| `VE` | `VE07` | 전시시설 (museums — 국립공주·부여박물관) | 14 |
| `EV` | `EV01` | 축제 (festivals — 백제문화제) | 15 |
| `AC` | `AC03` | 펜션/민박 (lodging — 백제관·한옥스테이) | 32 |
| `NA` | `NA04` | 자연공원 | 12 |
| `FD` | `FD01` | 한식 | 39 |

**Full tree retrieval:**
```
GET .../KorService2/lclsSystmCode2?...&lclsSystmListYn=Y
```
Response fields: `lclsSystm1Cd`, `lclsSystm1Nm`, `lclsSystm2Cd`, `lclsSystm2Nm`, `lclsSystm3Cd`, `lclsSystm3Nm`, `rnum`.

**Legal-dong code retrieval:**
```
GET .../KorService2/ldongCode2?...&lDongRegnCd=44&lDongListYn=Y
```
Response: `lDongRegnCd`, `lDongRegnNm`, `lDongSignguCd`, `lDongSignguNm`.

### 2.3 Legacy Code System (2025-12-31 Cutoff — DO NOT USE for New Development)

`KorWithService2` manual explicitly states: **"※ 25년12월말까지만 활용가능하며, 신규 법정동 지역코드로 대체될 예정."** Modu Baekje launches in 2026 — use only `ldongCode2` + `lclsSystmCode2`.

Legacy codes (for reference only — needed by `TatsCnctrRateService` which has NOT migrated):

| Legacy `areaCode` | Province |
|---|---|
| `34` | 충청남도 |
| `1` | 서울 (note: new system uses `11`) |

Legacy `sigunguCode` is a short sequential number per areaCode — incompatible with 5-digit legal-dong codes.

**TatsCnctrRateService still uses legacy codes:**
- `areaCd=34` for Chungnam
- `signguCd=34800` for 부여 (verify against `한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx`)

### 2.4 `contentTypeId` — Korean vs Multilingual

| Content Type | KorService2 | Eng/Jpn/Chs/Cht/Ger/Fre/Spn/RusService2 | KorWithService2 |
|---|---|---|---|
| 관광지 | **12** | **76** | 12 ✓ |
| 문화시설 | **14** | **78** | 14 ✓ |
| 행사·공연·축제 | **15** | **85** | 15 ✓ |
| 여행코스 | **25** | *not available* | *not supported* |
| 레포츠 | **28** | **75** | 28 ✓ |
| 숙박 | **32** | **80** | 32 ✓ |
| 쇼핑 | **38** | **79** | 38 ✓ |
| 음식점 | **39** | **82** | *not supported* |
| 교통 (deprecated KOR) | — | **77** | — |

**KorWithService2 supports only 6 types: 12/14/15/28/32/38.** Food (39) and travel courses (25) are excluded.

Calling `EngService2` with `contentTypeId=12` returns empty — must use `76`.

---

## 3. Services Used by Modu Baekje

Base URL pattern: `https://apis.data.go.kr/B551011/{ServiceID}/{operation}`

### 3.1 KorWithService2 — Barrier-Free Tourism (PRIMARY for F1)

**Base URL:** `https://apis.data.go.kr/B551011/KorWithService2`
**Manual:** v4.3 (`docs/api_manual/1737596514908/`)

Key operations:
- `areaBasedList2` — list with legacy `areaCode`/`cat` params still accepted (but use ldong for new dev)
- `detailWithTour2` — **barrier-free detail (unique to this service)**
- `ldongCode2`, `lclsSystmCode2` — code lookups
- `areaBasedSyncList2`, `locationBasedList2`, `searchKeyword2`
- `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`

#### `detailWithTour2` — 21 Barrier-Free Fields (Full Schema)

**Required param:** `contentId` (O)

| Category | English Field Keys |
|---|---|
| **Common (5 + 1 shared)** | `contentid`, `parking`, `route`, `publictransport`, `ticketoffice`, `promotion` |
| **Mobility/Physical (지체장애) — 7** | `wheelchair`, `exit`, `elevator`, `restroom`, `auditorium`, `room`, `handicapetc` |
| **Visual (시각장애) — 7+1** | `braileblock`, `helpdog`, `guidehuman`, `audioguide`, `bigprint`, `brailepromotion`, `guidesystem`, `blindhandicapetc` |
| **Hearing (청각장애) — 4** | `signguide`, `videoguide`, `hearingroom`, `hearinghandicapetc` |
| **Infant/Family (영유아가족) — 3+1** | `stroller`, `lactationroom`, `babysparechair`, `infantsfamilyetc` |

Total exposed fields: 21 named + 4 `*etc` catchalls = 25 fields per content item.

**Example call:**
```
GET https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2?
    serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json&contentId=988449
```

### 3.2 KorService2 — Korean Tourism Content (F1 route builder, F4 diary)

**Base URL:** `https://apis.data.go.kr/B551011/KorService2`
**Manual:** v4.4 (`docs/api_manual/1737596499508/`)

All 13 operations (v4.4):

| Operation | Purpose |
|---|---|
| `areaBasedList2` | Region-based list (ldong + lclsSystm filter) |
| `locationBasedList2` | Radius-based list; `mapX`/`mapY` required; `radius` max **20,000 m** |
| `searchKeyword2` | Keyword search (v4.3: `contentTypeId` param removed) |
| `searchFestival2` | Festival/event list; `eventStartDate` **required** (YYYYMMDD) since v3.6 |
| `searchStay2` | Accommodation list |
| `detailCommon2` | Common detail — `contentId` required |
| `detailIntro2` | Type-specific detail — `contentId` + `contentTypeId` required |
| `detailInfo2` | Repeating detail (room info for type 32; freeform key-value for others) |
| `detailImage2` | Images; `imageYN=Y` for general images |
| `areaBasedSyncList2` | Sync list; `showflag` 1/0; `oldContentid` for tracking renamed content |
| `detailPetTour2` | Pet-friendly info (KorService2-exclusive) |
| `ldongCode2` | Legal-dong code lookup |
| `lclsSystmCode2` | Classification code lookup |

**`areaBasedList2` key response fields:**
`addr1`, `addr2`, `contentid` (**required**), `contenttypeid` (**required**), `createdtime` (**required**), `modifiedtime` (**required**), `firstimage`, `firstimage2`, `cpyrhtDivCd` (Type1/Type3), `mapx` (WGS84 longitude), `mapy` (WGS84 latitude), `mlevel`, `tel`, `title` (**required**), `zipcode`, `lDongRegnCd`, `lDongSignguCd`, `lclsSystm1`, `lclsSystm2`, `lclsSystm3`.

**`detailIntro2` key fields by `contentTypeId`:**

| Type | Key Fields |
|---|---|
| 12 (관광지) | `chkbabycarriage`, `chkpet`, `heritage1/2/3` (UNESCO), `infocenter`, `parking`, `restdate`, `usetime` |
| 14 (문화시설) | `usefee`, `usetimeculture`, `restdateculture`, `spendtime`, `scale` |
| 15 (행사) | `eventstartdate`, `eventenddate`, `eventhomepage`, `program`, `playtime`, `festivalgrade` |
| 32 (숙박) | `checkintime`, `checkouttime`, `roomcount`, `reservationurl`, `parkinglodging` |

**Copyright field:** `cpyrhtDivCd`: `Type1` = attribution required; `Type3` = attribution + no modification.

### 3.3 Multilingual Services (F2 docent captions)

All share the same 12-operation set as KorService2 minus `detailPetTour2`.

| Service | Base URL | Manual |
|---|---|---|
| `EngService2` | `.../B551011/EngService2` | v4.4 |
| `JpnService2` | `.../B551011/JpnService2` | v4.4 |
| `ChsService2` | `.../B551011/ChsService2` | v4.4 |
| `ChtService2` | `.../B551011/ChtService2` | v4.4 |

Content is identical but in the target language. `contentTypeId` uses multilingual codes (76/78/85/75/80/79/82).

Travel course (contentTypeId=25) has **no multilingual equivalent** — omit from multilingual calls.

**Example (English, Buyeo festival):**
```
GET https://apis.data.go.kr/B551011/EngService2/areaBasedList2?
    serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&_type=json
    &lDongRegnCd=44&lDongSignguCd=760&contentTypeId=85&arrange=C
```

### 3.4 Odii — Audio Guide (F2 GPS-triggered docent)

**Base URL:** `https://apis.data.go.kr/B551011/Odii`
**Manual:** v4.1 (`docs/api_manual/1720672146251/`)

Operations:
- `themeBasedList`, `themeLocationBasedList`, `themeSearchList`
- `storyBasedList`, `storyLocationBasedList`, `storySearchList`
- `themeBaseSyncdList`, `storyBasedSyncList`

**Critical quirks — Odii is different from all other services:**
1. **Coordinate params are `xCoord`/`yCoord`**, NOT `mapX`/`mapY`
2. **Language param is `langCode`** (e.g., `ko`, `en`, `ja`, `zh-CN`) — no `contentTypeId` language mapping
3. **Does NOT use `lclsSystm` classification** — uses its own `themeNm` code
4. No legacy areaCode either

**Example (English stories near Busosanseong):**
```
GET https://apis.data.go.kr/B551011/Odii/storyLocationBasedList?
    serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje
    &langCode=en&xCoord=126.9060&yCoord=36.2765&radius=500
```

**Example (Korean theme list):**
```
GET https://apis.data.go.kr/B551011/Odii/themeBasedList?
    serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje&pageNo=1&numOfRows=10&langCode=ko
```

### 3.5 TatsCnctrRateService — Crowd Prediction (F1.D time-slot suitability)

**Base URL:** `https://apis.data.go.kr/B551011/TatsCnctrRateService`
**Manual:** v4.0 (`docs/api_manual/1725501618773/`)
**Operation:** `tatsCnctrRateList`

**Still uses legacy area codes — NOT migrated to ldong:**

| Param | Description | Modu Baekje Value |
|---|---|---|
| `areaCd` | Legacy areaCode | `34` (충청남도) |
| `signguCd` | Legacy sigungu code | `34800` (부여) — verify against xlsx |
| `tAtsNm` | Tourist attraction name | e.g., `부소산성` |

**Example:**
```
GET https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRateList?
    serviceKey={KEY}&MobileOS=ETC&MobileApp=ModuBaekje
    &areaCd=34&signguCd=34800&tAtsNm=부소산성&numOfRows=30
```

Output: predicted visitor concentration for next ~30 days. Used in F1.D Layer A "time-slot suitability" (weight 0.10 in the 4-layer scoring formula).

### 3.6 DataLabService — Tourism Big Data (F5 RTO dashboard)

**Base URL:** `https://apis.data.go.kr/B551011/DataLabService`
**Manual:** v4.1 (`docs/api_manual/1704160370032/`)

Operations:

| Operation | Scope | Required Params |
|---|---|---|
| `metcoRegnVisitrDDList` | Metro/province visitor counts | `startYmd`, `endYmd` (YYYYMMDD) |
| `locgoRegnVisitrDDList` | District-level visitor counts | `startYmd`, `endYmd` (YYYYMMDD) |

**Response fields:**
`areaCode`, `areaNm`, `signguCode`, `signguNm`, `daywkDivCd`, `daywkDivNm`, `touDivCd`, `touDivNm` (현지인/외지인/외국인), `touNum` (visitor count), `baseYmd`.

**Data sources:** KT (domestic visitors), SKT (foreign visitors) — mobile signal data.

**Mandatory disclosure (from manual):** "방문자는 관광객과 동일하게 정의되지 않음" (visitor ≠ tourist — travel purpose cannot be inferred from telecom data). Must display this caveat on F5 dashboard.

**Lag:** Daily data available ~4 days behind current date.

### 3.7 TarRlteTarService1 — Related Attractions (F1.D fallback, F3 alternate routes)

**Base URL:** `https://apis.data.go.kr/B551011/TarRlteTarService1`
**Manual:** v4.1 (`docs/api_manual/1725502022236/`)

Operations:
- `areaBasedList1` — by region
- `searchKeyword1` — by keyword

Key params: `baseYm` (YYYYMM), `areaCd` (legacy), `signguCd` (legacy), `keyword`.

Used when accessibility score < 70 to auto-suggest nearby alternatives, and after F3 barrier report approval to propose alternate routes.

### 3.8 PhotoGalleryService1 — Tourism Photo Gallery (F1.A entrance photos, F1.B step cards)

**Base URL:** `https://apis.data.go.kr/B551011/PhotoGalleryService1`
**Manual:** v4.2 (`docs/api_manual/1704160396374/`)

Operations:
- `galleryList1` — all gallery entries (supports `arrange=C`)
- `gallerySearchList1` — keyword search
- `galleryDetailList1` — detail by gallery item
- `gallerySyncDetailList1` — sync (with `showflag` filter)

Used to populate: entrance-by-entrance photo cards per POI, step-by-step visual guidance cards in F1.B, and diary visuals in F4.

---

## 4. Odii — Implementation Notes Summary

| Quirk | Detail |
|---|---|
| Coordinate param names | `xCoord` / `yCoord` (not `mapX`/`mapY`) |
| Language selection | `langCode=ko` / `en` / `ja` / `zh-CN` |
| Classification | `themeNm` (own scheme) — no `lclsSystm`, no `areaCode` |
| GPS trigger radius | Standard `radius` param in meters |
| No `contentTypeId` | No type filtering — returns all audio content in radius |
| Sync operations | `themeBaseSyncdList`, `storyBasedSyncList` available |

---

## 5. KorWithService2 — Critical Constraints

1. **`contentTypeId` supported: 12/14/15/28/32/38 only.** No 39 (restaurants) or 25 (travel courses).
2. **Legacy `areaCode2` / `categoryCode2` sunset: 2025-12-31.** Modu Baekje must use `ldongCode2` + `lclsSystmCode2` exclusively (2026 launch).
3. `detailWithTour2` is unique to this service — not available in KorService2.
4. Legacy params (`areaCode`, `sigunguCode`, `cat1`, `cat2`, `cat3`) still accepted by `areaBasedList2` for backward compat until 2025-12-31, but new code should only pass `lDongRegnCd`/`lDongSignguCd`/`lclsSystm*`.
5. When `detailWithTour2` fields are empty for a POI, classify as "정보 없음(현장 확인)" — not as "inaccessible". The absence is tracked in F5 gap report.

---

## 6. Rate-Limit Budget for Modu Baekje

| Service | Daily Dev Cap | Operations Used | Estimated Daily Calls |
|---|---|---|---|
| KorWithService2 | 1,000/op | `detailWithTour2` (6 POIs × detail) + list ops | ~50–100 |
| KorService2 | 1,000/op | `areaBasedList2`, `detailCommon2`, `detailIntro2`, `detailImage2`, `areaBasedSyncList2` | ~200–500 |
| EngService2 | 1,000/op | `areaBasedList2`, `detailCommon2` | ~100 |
| JpnService2 | 1,000/op | same | ~100 |
| ChsService2 | 1,000/op | same | ~100 |
| Odii | 1,000/op | `storyLocationBasedList` (6 POIs × 4 langs) | ~200 |
| TatsCnctrRateService | 1,000/op | `tatsCnctrRateList` (6 POIs) | ~20 |
| DataLabService | 1,000/op | `locgoRegnVisitrDDList` | ~30 |
| TarRlteTarService1 | 1,000/op | `areaBasedList1` (fallback) | ~50 |
| PhotoGalleryService1 | 1,000/op | `galleryList1`, `gallerySearchList1` | ~100 |

Dev-account limits are per-operation, not per-service — `areaBasedList2` and `detailCommon2` each count separately. Production account upgrade required before beta (September).

---

## 7. Legal / License Obligations

| Obligation | Trigger | Implementation |
|---|---|---|
| `cpyrhtDivCd` display | Every image from KTO APIs | `Type1` = show attribution; `Type3` = show attribution + "no modification" notice |
| AI disclosure badge | AI 기본법 (2026-01-22) | All AI-generated content (TTS, translation, route generation) must show "AI 음성 안내 / AI 번역 / AI 생성 코스" badge |
| Location service registration | 위치정보법 제9조의2 | File with 방통위 before launch; applies to F3 UGC location, F1.B GPS entry detection, F1.C SOS GPS send |
| PIPA (개인정보보호법) | User diary data, GPS consent | Diary v0 local-only storage; explicit GPS consent screen; F1.F-5 guardian mode sends no coordinates |
| DataLabService caveat | Showing visitor counts | Must display: "방문자는 관광객과 동일하게 정의되지 않음" |
| Image URL protocol | Most KTO images are HTTP | CSP/mixed-content policy — images from `http://tong.visitkorea.or.kr/cms/...`; some event images HTTPS; handle both |

---

## 8. Modu Baekje — Concrete API Call Map

| Feature | Service + Operation | Key Params |
|---|---|---|
| F1.A POI barrier-free card | `KorWithService2/detailWithTour2` | `contentId` |
| F1.A entrance photos | `PhotoGalleryService1/gallerySearchList1` | keyword = POI name |
| F1.B step-by-step visual | `KorService2/detailImage2` + `PhotoGalleryService1/galleryDetailList1` | `contentId`, `imageYN=Y` |
| F1.D region list (route builder) | `KorService2/areaBasedList2` | `lDongRegnCd=44`, `lDongSignguCd=150` or `760`, `lclsSystm1=HS` |
| F1.D type-specific detail | `KorService2/detailIntro2` | `contentId`, `contentTypeId` |
| F1.D time-slot suitability | `TatsCnctrRateService/tatsCnctrRateList` | `areaCd=34`, `signguCd=34800`, `tAtsNm` |
| F1.D fallback (low score) | `TarRlteTarService1/areaBasedList1` | `areaCd=34`, `signguCd` |
| F1.D sync (diary v0) | `KorService2/areaBasedSyncList2` | `oldContentid`, `modifiedtime`, `showflag=1` |
| F2 Korean docent | `Odii/storyLocationBasedList` | `langCode=ko`, `xCoord`, `yCoord`, `radius=500` |
| F2 English docent | `Odii/storyLocationBasedList` | `langCode=en`, `xCoord`, `yCoord` |
| F2 Japanese docent | `Odii/storyLocationBasedList` | `langCode=ja`, `xCoord`, `yCoord` |
| F2 Chinese docent | `Odii/storyLocationBasedList` | `langCode=zh-CN`, `xCoord`, `yCoord` |
| F2 multilingual captions | `EngService2/detailCommon2`, `JpnService2/detailCommon2`, `ChsService2/detailCommon2` | `contentId` |
| F5 RTO visitor dashboard | `DataLabService/locgoRegnVisitrDDList` | `startYmd`, `endYmd` |
| Code bootstrap (once) | `KorService2/ldongCode2` | `lDongRegnCd=44&lDongListYn=Y` |
| Code bootstrap (once) | `KorService2/lclsSystmCode2` | `lclsSystmListYn=Y` |

---

## 9. Open Questions / Risks

1. **TatsCnctrRateService `signguCd` for Gongju**: only Buyeo (`34800`) is confirmed in the blueprint. Gongju value must be verified against `한국관광공사_개방데이터_관광지_시군구_코드_정보_v1.0.xlsx` before May OT.
2. **`detailWithTour2` field sparsity**: many Chungnam POIs have empty barrier-free fields. F1.A must gracefully display "정보 없음" and route sparse records to F5 gap report.
3. **Odii content for Baekje POIs**: no guarantee that all 6 target POIs have Odii stories. Verify by `themeSearchList` keyword probe in May.
4. **Image URL protocol**: KTO images default to HTTP (`http://tong.visitkorea.or.kr/...`). Next.js CSP header must allow mixed-content or proxy images through an HTTPS route.
5. **Production-account lead time**: 1–3 days KTO review + registered app URL required. Submit before beta (August) to avoid traffic throttling during load testing.
6. **`areaBasedSyncList2` + `oldContentid`**: v4.3 feature for tracking content renamed between visits (F4 diary v0). Ensure `oldContentid` is stored locally alongside `contentid` on first sync.
