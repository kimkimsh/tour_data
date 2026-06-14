# Claude — Independent Architecture Draft (pairing half A)

> Written 2026-06-13 BEFORE seeing Codex's `_codex_arch_draft.md`. Basis: the canonical proposal `docs/ideation/total/00_modu_baekje.md` + research `00_SYNTHESIS.md`. Stack locked: Next.js 15 (App Router, TS) + Supabase (Postgres/PostGIS/pgvector/Auth/Storage/Realtime) + Vercel, Seoul. Built by a parallel agent team. Target: win the 2026 KTO contest (1차 기능심사 + PT, Oct 2026).

## 1. Framing: F1 is the OS shell, not a feature

The proposal's F1 (6 sub-features A–F) is the **primary app surface** — a single guided experience. F2–F5 are discrete surfaces invoked around it. Architectural surfaces:

| Proposal feature | Surface | Nature |
|---|---|---|
| **F1** 무장애 토털 가이드 OS | `/(home) 코스 OS` — input panel → map+list → POI card → route → SOS/AAC overlay → 예측가능백제 mode | core shell |
| **F2** Odii 4채널 도슨트 | `DocentPlayer` (modal/sheet, GPS or tap-triggered, from POI/route) | embedded player |
| **F3** 배리어 제보 + 검수 큐 | user `ReportForm` + admin `/admin/review` queue | two surfaces |
| **F4** 다중출력 다이어리 | `/diary` + export pipeline | post-visit |
| **F5** RTO 갭 리포트 | `/rto` dashboard (B2G) | analytics surface |
| 외국인 4언어 | `[locale]` cross-cutting via next-intl | horizontal mode |

## 2. Architecture style — three planes with a PURE DOMAIN CORE

1. **Data plane** — Supabase Postgres = system of record. Nightly ETL normalizes KTO + external public data into our schema. Live-call only for volatile data (crowd index, weather/air, geocoding, RAG chat). Browser NEVER touches KTO directly.
2. **Domain plane** — framework-free, fully unit-tested pure TypeScript: the **scoring engine (4-Layer 적합도 산식)**, the **time-budget 5-slot allocator**, the **persona×field 5×21 weight matrix**, the **route planner** (pgrouting wrapper + fallback). Deterministic, TDD'd with golden tests. **These are the crown jewels and must be isolated from I/O.**
3. **Presentation plane** — Next.js App Router (RSC + client islands), accessible-first. The **accessible parallel list is the source of truth**; the Kakao map (CustomOverlay DOM markers, turning-area polygons) is a progressive enhancement layered on top.

**KTO client** = one server-only typed module (WS0, frozen interface): single-encode DECODING key, dual-format parse (JSON + always-XML errors), token bucket (~10/min), TTL cache, code-table bootstrap (`ldongCode2`/`lclsSystmCode2`), per-service wrappers. `getPoiList / getBarrierFree(contentId) / getDocentStories(...) / getCrowdIndex / ...`.

## 3. Data model (concrete)

- `code_ldong`, `code_lcls` — bootstrapped from KTO, never hardcoded.
- `poi(source_id, content_type, name_i18n jsonb, geom geography, lcls1/2, ldong_regn/signgu, embedding vector(1536), modified_at_source, is_visible)`.
- `poi_image(poi_id, url, cpyrht_div_cd, kind[entrance|promo|gallery|ugc])` — license drives render policy (Type3 = no transform).
- `poi_barrier_free(poi_id, fields jsonb, field_provenance jsonb, source_updated_at)` — **jsonb** because exact `detailWithTour2` keys are verify-at-build-time; typed accessor view on top once schema is locked vs guide v4.3.
- `poi_docent(poi_id, lang, odii_story_id, transcript, audio_asset_url, mode[child|adult|easy], channels[voice|caption|braille|sign])`.
- `barrier_report(poi_id, reporter_id, type, photo_url, status[pending|approved|rejected], reporter_trust)` + RLS deny-by-default.
- `report_review(report_id, admin_id, decision, alt_route_poi_id)` — 검수 큐.
- `route(owner, persona[], time_budget_min, poi_ids[], gpx)` + `route_segment(geom, slope_pct, step_height_cm, surface, cost)` (slope from NGII DEM).
- `diary(owner, is_local)` + `diary_entry(poi_id, photos[], audio_memo, quiz_result jsonb, heritage_meta jsonb)`.
- `gap_report` — **materialized view**: POIs with null barrier-free fields grouped by 시군구, refreshed post-ETL → F5.
- `persona_field_weight(persona, field, tier[critical|aux|irrelevant])` — seeds the 5×21 matrix.
- `platform_admin`, `audit_log`.

## 4. The 4-Layer 적합도 산식 as a deterministic function

```
computeSuitability(poi, persona[], ctx) -> { score:0..100, label, breakdown }

score = (LayerA · LayerB) × LayerC × LayerD
LayerA  POI intrinsic 7-axis weighted sum (Σw = 1.00):
  0.30 진입가능성  wheelchair/exit/elevator
  0.18 동선연속성  prev/next POI barrier-free + slope
  0.15 편의시설    restroom/auditorium/room/lactationroom/stroller
  0.12 휴식인프라  bench/shade/indoor/aircon (BF data)
  0.10 시간대적합  TatsCnctr + KMA 특보 + AirKorea
  0.08 사회적안전  ER/AED 500m·1km cutoff
  0.07 UGC검증     last 30d, reporter-trust weighted
LayerB  persona×field matrix: critical×4 / aux×2 / irrelevant×1; multi-persona ⇒ AND-intersection penalty
LayerC  cert multiplier 1.00–1.30 (BF grade / 열린관광지 ×1.10 / KQ ×1.05) — multiplicative
LayerD  freshness decay (≤90d ×1.00 / ≤365d ×0.90 / >365d ×0.75) + UGC reinforcement
Null rule: empty field ⇒ "정보 없음 — 현장 확인 필요", split (a) 본질 제약 vs (b) 운영자 미입력. NEVER infer a value.
```

`breakdown` is rendered in the F1.A card as **transparent evidence** — this is the single biggest differentiator (see §6).

## 5. Workstream decomposition (my version)

**Frozen contract between streams** (freeze in Phase 0/1 before features fan out): (1) Supabase schema + generated TS types, (2) typed KTO client API surface, (3) design-token + component library, (4) domain-core signatures (`computeSuitability`, `allocateTimeBudget`, `planRoute`).

| Phase | Workstreams (parallel within phase) |
|---|---|
| **P0 Foundation** (blocking, ~2wk) | WS0-Schema · WS0-KTOClient (incl. code bootstrap + **detailWithTour2 field verification vs guide v4.3 — FIRST task**) · WS0-DesignSystem (a11y primitives: skip-link, RouteFocusReset, aria-live, focus-trap) · WS0-Infra (vercel.json icn1+cron, CI a11y gates) |
| **P1 Data + platform** | WS1-ETL · WS1-Auth (anon-first + PIPA consent) · WS1-GeoPipeline (NGII DEM→slope→pgrouting graph) · **WS1-ScoreEngine (pure domain — 산식 + 5×21 matrix + labeler, TDD)** · WS1-AssetPipeline (PDF/GPX/braille/AAC registry) |
| **P2 Features** | **WS2-F1core** (input·map·list·POI card·scoring display·route·time-budget) · **WS2-F1assist** (C SOS/AAC + F 예측가능백제) · WS2-F2 (docent) · WS2-F3 (UGC+검수) · WS2-F4 (diary+export) · WS2-F5 (RTO dashboard) |
| **P3 Cross-cutting** | WS3-Offline (Serwist+IndexedDB bundles) · WS3-Content (2–3 POI 수어/점자, mascot 6컷, AAC/픽토그램 curation) · WS3-A11yCert (manual NVDA/센스리더/VoiceOver/TalkBack + K-WAH report) · WS3-Legal (LBS 신고, privacy policy, AI labels, KOGL audit) · WS3-QA |

**Deltas vs synthesis §8:** (a) added **WS1-ScoreEngine** as its own pure-domain stream (the differentiator deserves isolation + TDD); (b) **split F1** into core/assist (different dependency profiles); (c) WS3 adds an explicit **Content** stream (the 수어/AAC/mascot curation is real work, not a side task).

**Critical path:** WS0-KTOClient (field verification) → WS1-ETL + WS1-ScoreEngine → WS2-F1core → WS2-F2/F4. Barrier-free data + the scoring engine gate the product's identity.

**Timeline (mid-June → Sept):** P0 by end-June → P1 through July → P2 July–Aug → P3 + beta + KWCAG self-assessment Aug–early Sept → freeze + cert filing + demo video mid-Sept.

## 6. De-scope, emphasis, highest-leverage

**De-scope to demo-depth** (consistent with the proposal's own risk register):
- 수어 영상: **2–3 polished POI** for the demo (proposal says 6 — reduce for realism, rest 발전방향).
- UGC 검수: manual admin queue + seeded demo reports; no auto-recalc.
- Geofence: consent-gated + **map-tap fallback** → demo works without the live LBS 신고.
- 예측가능백제: all 7 elements, content reused; only mascot 6컷 custom.
- STT voice search: keep ONE-SHOT (D.1 opener "휠체어로 갈 수 있는 반나절 공산성 코스") — not a conversational agent.

**Emphasis (score-winning surfaces):** F1.A rich evidence card + F1.D scoring transparency (완성도+기획력) · F2 4-channel docent with 점자/수어 visible (데이터활용+기획력) · **F4 6-channel diary = PT 결과물 money shot** (실용성+발표) · F5 RTO gap report (B2G 발전성) · the D.1 end-to-end flow.

**Single highest-leverage thing:** the **4-Layer 산식 rendered as transparent evidence in the F1.A card** — e.g. *"방문가능 82점 · 진입 30/30 (정문 평탄·엘리베이터 有) · 휴식 9/12 · 시간대 8/10 (현재 혼잡) · 신선도 ×0.90 (최종확인 4개월 전)."* This one artifact proves "not a list — an evidence-backed decision engine," and is the literal embodiment of 데이터 활용 적절성 (20점 만점 target). Runner-up: F4 diary as the tangible PT outcome.

## 7. Anticipated divergences from Codex (to check on reconcile)
- **ETL scheduler**: I favor Vercel Cron for nightly incremental + a one-shot GitHub Actions workflow for heavy backfill/embeddings. Codex may push a standalone worker/service.
- **Scope of compute on Vercel**: I keep heavy transforms (braille/PDF/TTS) in Node route handlers / occasional GH Actions, not a separate always-on service.
- **수어 channel** is the biggest content (not eng) risk — I'd cut to 2–3 POI; Codex may keep 6 or cut entirely.
- **F1 split** — Codex may keep F1 monolithic or split differently.
