# D2 — Tech Stack & Infrastructure Brief
## 모두의 백제 (Modu Baekje) | Barrier-Free Heritage Tourism | Gongju·Buyeo

> Digest role: D2 (tech stack & infrastructure). All facts extracted from source files 14–18, 27–28 (claude_search), 03 (codex_search), 04 (gemini_search). No invented recommendations — every claim is traceable to a source document.

---

## 1. Core Framework: Next.js 15 + App Router

**Chosen stack:** Next.js 15.x (stable) on Vercel, React 19, TypeScript.

| Rendering mode | Trigger | Applied to |
|---|---|---|
| SSG | default (static fetch) | Heritage site detail pages (`/sites/[id]`) |
| ISR | `export const revalidate = 3600` | KTO attraction list (re-fetched from DB, not directly from KTO API per request) |
| Tag-based revalidation | `revalidateTag('attractions')` | Admin console forces immediate update |
| Path revalidation | `revalidatePath('/tour/[id]')` | Single content update |
| SSR | `dynamic = 'force-dynamic'` | Personalized recommendation, logged-in user views |

**Bundler:** Turbopack (Next 15 dev default). Build target: Vercel Seoul region (`icn1`).

**Key constraint:** All KTO OpenAPI calls MUST go through a Next.js Route Handler (App Router API route) — never from the browser client directly. Reason: API key exposure in network tab + CORS (documented in codex_search/03 §2 and §10).

```
Browser → /api/tour/* (Next.js Route Handler, Vercel Serverless Function)
            → Supabase DB cache (primary)
            → KTO OpenAPI (fallback / daily batch refresh)
```

---

## 2. UI Layer

| Library | Version | Role |
|---|---|---|
| Tailwind CSS | v4 (`@theme` directive, OKLCH, native CSS vars) | All styling |
| shadcn/ui | code-copy model (no npm), Radix UI base | Component primitives |
| Radix UI Primitives | WAI-ARIA complete | Accessibility foundation (barrier-free requirement) |

**Accessibility note:** Radix UI is unstyled and WAI-ARIA compliant — critical for the barrier-free (무장벽 관광) positioning. shadcn/ui components inherit this. `tw-animate-css` replaces `tailwindcss-animate` in the v4 setup.

**PDF generation** (tour guides, accessibility route cards): not explicitly covered in source docs. Candidates from general knowledge: `@react-pdf/renderer` or `puppeteer` via a Vercel Serverless Function. Recommend a dedicated `/api/pdf/[id]` route that renders HTML and calls a headless browser or `jsPDF`. Keep this as an open question.

---

## 3. State & Data Fetching

| Layer | Library | Config |
|---|---|---|
| Server state / KTO data | TanStack Query v5 | `staleTime: 60_000`, `gcTime: 300_000` |
| Global client state | Zustand | Filter state, accessibility prefs, language |
| Form state | React Hook Form + Zod | Search forms, booking intent forms |
| Local component | `useState` / `useReducer` | — |

**Pattern on Vercel:** TanStack Query runs client-side; initial data is hydrated from RSC/Server Actions (Next.js App Router dehydration pattern). No separate Express/NestJS backend is needed — all server logic lives in Route Handlers and Server Actions.

---

## 4. i18n — 4 Languages (KO / EN / ZH-Hans / JA)

**Library:** `next-intl` v3 (App Router first-class, RSC support, ICU message format).

```
app/[locale]/page.tsx    → locale param from next-intl middleware
messages/ko.json
messages/en.json
messages/zh-Hans.json
messages/ja.json
```

**KTO OpenAPI language parameter mapping:**

| Locale | KTO `_type=json` language suffix | KTO service code |
|---|---|---|
| `ko` | `KorService2` | Korean |
| `en` | `EngService2` | English |
| `ja` | `JpnService2` | Japanese |
| `zh-Hans` | `ChtService2` | Simplified Chinese |

The KTO TourAPI provides 13 languages via separate service endpoints — map the `[locale]` route segment to the correct service endpoint in the Route Handler.

**ICU plural/gender** example for review counts:
```
{count, plural, =0 {No reviews} =1 {1 review} other {# reviews}}
```

---

## 5. Map SDK Selection

**Decision:** Kakao Maps JavaScript SDK (primary) + VWorld (supplemental for public spatial data).

| Criterion | Kakao | VWorld | Naver | Google |
|---|---|---|---|---|
| Korean POI accuracy | ★★★★★ | ★★★ | ★★★★★ | ★★★ |
| Cost | 10원/건 (2026.2–12.31 80% discount), 0.1원/건 추가쿼터 | Free | 3M calls/month free | $7/1K (Dynamic Maps) |
| Foreign-tourist UX | Medium (EN partial) | Korean only | Medium | ★★★★★ |
| Public data integration | Partial | ★★★★★ | Partial | None |
| License | Commercial OK | Commercial OK (공공데이터법) | Commercial OK | Commercial OK |

**Kakao Maps SDK setup:**
```html
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_JS_APP_KEY&libraries=services,clusterer"></script>
```

**VWorld** (국토교통부 / 공간정보산업진흥원): `https://www.vworld.kr/` — authentication key required (free registration). Used for: administrative boundaries (행정경계), building footprints, address geocoding backup.

**Coordinate system:** TourAPI returns `mapX` (longitude) and `mapY` (latitude) in WGS84 (EPSG:4326). No conversion needed for Kakao/Naver/Google. For VWorld / government data (EPSG:5179 Korea 2000 중부원점), use `proj4js` for client-side conversion or `pyproj` in a Python ETL script.

**Mapbox / MapLibre:** Not primary. Can be used for specialized visualization layers (deck.gl `ArcLayer` for OD flow maps on the RTO dashboard) without serving as the main map provider.

---

## 6. Database: Supabase (PostgreSQL 17)

**Supabase** is the chosen BaaS (docs: `https://supabase.com/pricing`). Deployed on **AWS Seoul** (`ap-northeast-2`) which is the closest available Supabase region to Gongju/Buyeo.

| Feature | Used for |
|---|---|
| PostgreSQL 17 + **PostGIS** | Geospatial queries: `ST_DWithin`, `ST_Distance`, barrier-free route geometry |
| **pgvector** | RAG embeddings for AI travel guide chatbot |
| Supabase Auth | Social login (Kakao, Naver, Google, Apple) |
| Supabase Storage | User-uploaded accessibility photos |
| Supabase Realtime | Live congestion dashboard (optional) |
| Supabase Edge Functions (Deno) | Lightweight webhook handlers |

**PostGIS proximity query (5km radius example):**
```sql
SELECT id, name, ST_Distance(geom, ST_MakePoint(127.0, 36.5)::geography) AS dist_m
FROM attractions
WHERE ST_DWithin(geom, ST_MakePoint(127.0, 36.5)::geography, 5000)
ORDER BY dist_m;
```

**pgvector for RAG:**
```sql
SELECT title, overview FROM tour_attractions
ORDER BY embedding <=> %s::vector LIMIT 5;
```

**Pricing:** Supabase Pro $25/month (500MB DB, 5GB bandwidth on free; Pro: larger limits). Firebase comparison: Supabase 40–60% cheaper for production workloads (2026 benchmark).

**Korean text search:** Use PostgreSQL full-text search with `pg_trgm` for partial match + a separate `tsvector` column. For advanced Korean morpheme search, self-host Meilisearch (MIT, Rust, built-in Korean support) or Typesense (GPL-3, C++) as a sidecar and sync via Supabase pg webhooks → Vercel Edge Function.

---

## 7. Caching / ETL Pattern: KTO Daily Batch → Supabase → Vercel ISR

```
[KTO OpenAPI / public.data.go.kr]
    ↓  Daily GitHub Actions cron (or Supabase pg_cron)
[ETL Batch]
    areaBasedList2      → attractions table
    areaBasedSyncList2  → incremental update (showflag, modifiedtime)
    detailCommon2       → detail enrichment
    detailImage2        → image_url, image_license_code
    ↓
[Supabase PostgreSQL]
    ↓  Vercel ISR (revalidate = 3600) or revalidateTag('attractions')
[Vercel Edge Cache / CDN]
    ↓
[Browser / Mobile]
```

**KTO API sync fields used (from codex_search/03 §5–6):**

| Internal field | KTO source field |
|---|---|
| `source_id` | `contentid` |
| `content_type` | `contenttypeid` |
| `lat` / `lng` | `mapY` / `mapX` (WGS84) |
| `image_url` | `firstimage`, `firstimage2` |
| `image_license_code` | `cpyrhtDivCd` |
| `modified_at_source` | `modifiedtime` (format: `yyyyMMddHHmmss`) |
| `is_visible_source` | `showflag` (0 = hidden) |

**Cache TTL guidelines (from codex_search/03 §10):**

| Data type | Cache duration |
|---|---|
| Tourism POI list | Daily (or `modifiedtime`-based incremental) |
| Tourism detail | On source modification only |
| Images | URL/serial-based, check license |
| Festivals/events | Daily; deactivate past end-date |
| Weather | Short TTL (base_time-based) |
| Holidays | Annual cache; re-sync for ad-hoc holidays |

**Upstash Redis** (Serverless Redis, $0.2/100K req): for short-TTL caching of KTO API responses, weather data, and rate-limiting KTO call quota (1,000–10,000 calls/day limit). Integrates natively with Vercel via environment variables.

---

## 8. Auth: Supabase Auth + Social Providers

**Provider priority for Korean tourists:**

| Provider | Korean user share | Cost |
|---|---|---|
| Kakao Login | Highest | Free |
| Naver Login | Very high | Free |
| Google | High (Android default) | Free |
| Apple | iOS users | $99/year (Apple Developer) |

**Implementation via Supabase Auth** (not Auth.js, to keep Supabase as single auth+DB layer). Supabase supports custom OAuth providers. Apple Login is mandatory when any third-party social login is offered in an iOS app (App Store guideline 4.8).

Kakao OAuth endpoints:
- Auth: `https://kauth.kakao.com/oauth/authorize`
- Token: `https://kauth.kakao.com/oauth/token`
- User info: `https://kapi.kakao.com/v2/user/me`

---

## 9. AI / LLM Integration

### 9.1 Use-case Matrix

| Feature | Model/Service | Rationale |
|---|---|---|
| Multilingual description generation (12 languages) | `claude-haiku-4-5` ($0.80/M in, $4/M out) | Cost-efficient for bulk translation at ETL time |
| Natural-language search chatbot ("wheelchair-accessible indoor sites near Gongju") | `claude-sonnet-4-6` ($3/M in, $15/M out) via RAG | Balance of quality and cost; 1M context |
| Audio guide script generation | `claude-haiku-4-5` + CLOVA Voice (TTS) | Batch generation, cached as MP3 |
| Photo → attraction recognition (camera feature) | `claude-sonnet-4-6` Vision or Google Vision API | Multimodal |
| Menu/signboard OCR → multilingual | Naver CLOVA OCR + Papago | Korean OCR best-in-class |
| Semantic attraction embedding (RAG) | `text-embedding-3-small` ($0.020/M tokens) | Stored in pgvector |

**Prompt caching:** Anthropic prompt caching gives up to 90% discount on cache reads. Apply to the tourism knowledge base system prompt (KTO data context) which is reused across chat turns.

### 9.2 Vercel AI SDK 5 (Primary Integration Layer)

```ts
import { generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

// Streaming chat (in a Next.js Route Handler)
const { textStream } = await streamText({
  model: anthropic('claude-sonnet-4-6'),
  system: '당신은 백제 역사 관광 가이드입니다. 무장벽 접근성 정보를 우선합니다.',
  messages,
});
```

**Vercel AI Gateway** (`https://vercel.com/docs/ai-gateway`): routes all LLM calls through Vercel's gateway for cost tracking and failover. No markup added. Free tier included with Vercel teams.

### 9.3 STT for Voice Guide Input

| Option | Price | Korean quality |
|---|---|---|
| OpenAI Whisper API / `gpt-4o-transcribe` | $0.006/min | ★★★★ |
| Naver CLOVA Speech (CSR) | by negotiation | ★★★★★ |

For barrier-free voice navigation, Naver CLOVA Speech is preferred for Korean users; Whisper for multilingual (EN/ZH/JA).

### 9.4 TTS for Audio Guide

| Option | Korean voice count | Notes |
|---|---|---|
| Naver CLOVA Voice (NeuVis engine) | 100+ Korean voices | Best natural Korean |
| ElevenLabs Multilingual v2 | Many (includes Korean) | Best for EN/ZH/JA guide tracks |

**Audio guide pipeline:**
```
[POI description text (KO)] → claude-haiku-4-5 translation (12 langs)
  → CLOVA Voice (KO) / ElevenLabs (EN, ZH, JA)
  → MP3 → Supabase Storage (signed URL)
  → Mobile app: geofence trigger → auto-play
```

### 9.5 RAG Architecture (Supabase pgvector)

```python
# ETL: embed KTO overviews and store in pgvector
from openai import OpenAI
client = OpenAI()
vec = client.embeddings.create(model="text-embedding-3-small", input=overview_text).data[0].embedding
# INSERT INTO tour_attractions (title, overview, embedding) VALUES (?, ?, ?)
```

```sql
-- Similarity search at query time
SELECT title, overview
FROM tour_attractions
ORDER BY embedding <=> query_vec::vector
LIMIT 5;
```

---

## 10. Charting / Visualization for RTO Dashboard

The RTO (regional tourism operator) dashboard needs: visitor trend charts, accessibility audit scores, congestion heat maps.

| Need | Library | License | Notes |
|---|---|---|---|
| Line/bar/area charts (visitor trends) | **Recharts** | MIT | React composable, D3 wrapper |
| Geospatial heat map (crowding) | **deck.gl** `HexagonLayer` + **MapLibre GL JS** | MIT | WebGL, handles large datasets |
| Flow/OD arc maps | **deck.gl** `ArcLayer` | MIT | For visitor origin analysis |
| Korean map base layer | Kakao Maps or MapLibre + VWorld tiles | — | |
| Time-series aggregate | **ECharts** (Apache 2.0) | Apache-2.0 | 30+ chart types, Korean-friendly, calendar heatmap built-in |
| Admin BI (self-hosted) | **Apache Superset** or **Metabase** | Apache-2.0 / AGPL | Direct Supabase/PostgreSQL connection |

**Scoring rubric weights** are not defined in source docs — flag as open question for the competition brief (공모전 심사 기준).

---

## 11. Image & Media Infrastructure

### 11.1 Image Optimization

`next/image` handles AVIF/WebP negotiation, `srcset`, blur placeholder, lazy loading, and `priority` for LCP candidates automatically.

**Required config in `next.config.js`:**
```js
images: {
  remotePatterns: [
    { hostname: 'tong.visitkorea.or.kr' },  // KTO image CDN
    { hostname: '*.visitkorea.or.kr' },
    { hostname: 'cdn.supabase.co' },         // user-uploaded via Supabase Storage
  ]
}
```

**LQIP (blur placeholder):** Use `plaiceholder` (`https://plaiceholder.co`) at ETL time to generate base64 blur strings; store in DB alongside `image_url`.

**KTO image licensing:** `firstimage`/`firstimage2` fields in TourAPI responses carry the `cpyrhtDivCd` field (공공누리 type code). Display the corresponding 공공누리 (KOGL) badge (유형 1–4) in the UI. Commercial use: verify per content item; KOGL type 1 (출처 표시 only) is safest for display.

### 11.2 Video

Heritage promotion videos (KTO YouTube channel) → embed via YouTube IFrame API (free, unlimited). No self-hosted video infra needed for MVP.

### 11.3 360° Virtual Tour (Baekje sites)

| Library | License | Notes |
|---|---|---|
| **Pannellum** | MIT | Lightweight, hot spots, multi-scene — good for equirectangular heritage photos |
| **Photo Sphere Viewer** | MIT | Three.js-based, VR plugin available |

Source: KTO VR Korea (`https://kto.visitkorea.or.kr`) and 국가유산청 디지털 헤리티지 (`https://www.heritage.go.kr`) provide existing 360° content.

### 11.4 OCR / AR

| Use case | Service |
|---|---|
| Menu board / signboard → multilingual | Naver CLOVA OCR + Papago |
| Attraction recognition from photo | Claude Vision or Google Cloud Vision |
| WebAR overlay on heritage sites | MindAR (MIT) or `<model-viewer>` for glTF 3D models |

---

## 12. Messaging & Notifications

| Channel | Service | Cost |
|---|---|---|
| Booking confirmation (Korean users) | Kakao 알림톡 via SOLAPI | 8원/건 (부가세 별도) |
| Push notifications (mobile) | FCM (Android) + APNs (iOS) | Free (unlimited) |
| Transactional email | Resend | 3K/month free, $20/month 50K |
| SMS fallback | NHN Cloud SMS | 8원/건 |

**Kakao 알림톡** requires: (a) Kakao Business Channel registration, (b) template pre-approval, (c) CPaaS provider (SOLAPI recommended for developer-friendly SDK).

---

## 13. Analytics & Monitoring

| Tool | Purpose | Cost |
|---|---|---|
| Microsoft Clarity | Heatmaps, session replay | Free (unlimited) |
| PostHog | Product analytics + feature flags + A/B | 1M events/month free |
| Sentry | Error tracking | 5K errors/month free |
| Vercel Speed Insights | Core Web Vitals (LCP, CLS, INP) | Included with Vercel Pro |

---

## 14. CI/CD

**GitHub Actions + Vercel**: Git push → Vercel preview deploy (automatic). Production: `amondnet/vercel-action@v25` with `--prod` flag. Node 20 (LTS) required (Node 18 EOL: 2025-04-30).

**ETL batch (KTO data sync):** GitHub Actions scheduled workflow (`schedule: cron`) → Python script → Supabase upsert. Alternatively use Supabase `pg_cron` extension for pure-SQL incremental sync.

---

## 15. Deployment Topology Summary

```
[Vercel (Seoul / icn1)]
  Next.js 15 App (SSG/ISR/SSR/RSC)
  Route Handlers (API proxy for KTO, AI, map)
  Vercel AI Gateway (LLM cost tracking)
  Vercel Image Optimization (next/image)

[Supabase (AWS ap-northeast-2)]
  PostgreSQL 17 + PostGIS + pgvector
  Supabase Auth (Kakao/Naver/Google/Apple OAuth)
  Supabase Storage (user photos, MP3 audio guides)
  Supabase Edge Functions (webhooks)

[Upstash Redis (Seoul)]
  Short-TTL cache: weather, KTO quota guard, rate limit

[KTO TourAPI (apis.data.go.kr)]
  Daily ETL batch → Supabase (GitHub Actions cron)
  On-demand: Route Handler proxy only

[Kakao Maps SDK]
  Client-side JS (attraction markers, routing)
  REST API (geocoding) → server-side only

[AI Services]
  Anthropic Claude (claude-sonnet-4-6 / claude-haiku-4-5) via Vercel AI SDK 5
  OpenAI text-embedding-3-small → pgvector
  Naver CLOVA Voice → MP3 in Supabase Storage
  Naver CLOVA OCR + Papago → Route Handler

[Messaging]
  Kakao 알림톡 (SOLAPI) — booking notifications
  FCM / APNs — push
  Resend — email
```

---

## 16. Open Questions

1. **PDF generation approach:** `@react-pdf/renderer` (pure JS, runs in Vercel Functions) vs. Puppeteer (requires container, not available on Vercel serverless) — decide before sprint 1.
2. **Map SDK for foreign tourists:** Kakao Maps has partial English support. For the non-Korean tourist flow, consider overlaying Google Maps Embed API (free, unlimited embed) for directions while keeping Kakao for POI search.
3. **Scoring rubric weights (공모전 심사 기준):** Not found in source documents — must obtain from the official competition brief.
4. **Meilisearch deployment:** If Korean full-text search beyond `pg_trgm` is required, Meilisearch needs a persistent container (Fly.io, Railway, or NHN Cloud VM); Vercel serverless cannot host it.
5. **Payment (결제):** If ticketing or booking payment is in scope, PortOne V2 SDK (`https://developers.portone.io/`) covers all Korean PG providers with a single integration.
6. **CSAP compliance:** Not required if this is a private/non-public-institution service. If the client is a government agency (충남 공주시 / 부여군), NCloud or NHN Cloud (both CSAP-certified) may be required instead of Vercel/Supabase.
7. **Mobile app scope:** Source docs mention React Native (Expo SDK 53, React Native 0.79) and Flutter 3.41.5 as candidates. PWA via `next-pwa` / Serwist is a lower-cost alternative if native app store submission is not required.

---

*Sources: docs/search/claude_search/14–18, 27–28; docs/search/codex_search/03; docs/search/gemini_search/04.*
