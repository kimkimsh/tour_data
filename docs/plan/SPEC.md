# 모두의 백제 (Modu Baekje) — 구현 기획 SPEC (frozen source of truth)

> **Status:** APPROVED DIRECTION (2026-06-14). This file is the single authoritative spec; every `docs/plan/NN_*.md` expands a section here and must not contradict it. Provenance: canonical proposal `docs/ideation/total/00_modu_baekje.md`, research `docs/plan/_research/00_SYNTHESIS.md` (+ 9 briefs), and the Claude⇆Codex pairing `_pairing_reconcile.md`.

## 0. One-line

> A **barrier-free (무장애) heritage tourism web app** for the **2026 KTO 관광데이터 활용 공모전 ① 웹·앱 개발 부문**, covering **공주·부여 백제역사유적지구 6 POIs**, where **one verified accessibility dataset flows through F1→F2→F3→F4→F5** — pre-trip decision → on-site guidance → field reports → education record → 충남 RTO improvement signal.

## 1. Contest frame & scoring targets (build phase; 기능심사 + PT in Oct 2026)

| Phase | Items (weights) |
|---|---|
| 1차 (서면·기능, 100) | 기획력 30 · 완성도 30 · **데이터활용 20** · 발전성 20 · (+지역특화 가점 **+2**, 충남) |
| 최종 PT (100) | 적정성 30 · 완성도 30 · 실용성 25 · 발표 15 |

**Design rule:** every feature must visibly earn one of these. The differentiator that earns **데이터활용 20 + 기획력**: the **transparent 4-Layer 적합도 evidence card** built on a **verified 6-POI content package**. The PT money shot for **실용성 + 발표**: the F4 6-channel diary. 충남 single-region = +2 + CACF RTO 특별상 candidacy.

## 2. Locked decisions

| # | Decision | Value |
|---|---|---|
| 2.1 | Topic | 「모두의 백제」 (confirmed) |
| 2.2 | Stack | **Next.js 15** (App Router, TS, React 19, Node 20) + **Supabase** (Postgres 17 + PostGIS; **no pgvector in MVP**) + **Vercel**, all **Seoul** (`icn1` / `ap-northeast-2`) |
| 2.3 | App shape | **PWA** (Serwist) — not native. Mobile-native KS X 3253 = 발전방향 |
| 2.4 | Cache model | Next 15 + `unstable_cache` (never wrap per-user data). No Next 16 Cache Components yet |
| 2.5 | Direction | **Narrow, contract-first, content-verified system** (not a broad platform) |
| 2.6 | Routing | **Curated static route packages** for 6 POIs. **NO dynamic pgRouting / DEM** in MVP |
| 2.7 | Data serving | **No runtime KTO calls.** All data published to Supabase by ETL; volatile data (crowd/weather/air) = short-interval snapshots. DB = primary cache + source of truth (demo-resilient) |
| 2.8 | Search/AI | **No pgvector / RAG / embeddings / OCR / 360° / multi-AI-provider** in MVP → 발전방향 |
| 2.9 | Messaging | **No FCM/APNs/알림톡** in MVP. In-app banner + Supabase Realtime for approved alerts |
| 2.10 | ETL scheduler | **GitHub Actions** for heavy batch; **Vercel Cron** only for short refresh; GH Actions → HMAC-protected internal endpoint → `revalidateTag`; bounded TTL recovers on failure |
| 2.11 | Auth | Core (탐색·도슨트·다이어리) works with **no login**. Supabase **Anonymous** auth only for UGC identity; social promotion optional |
| 2.12 | Payment | None in MVP (info+recommendation only → no 통신판매업/여행업) |
| 2.13 | A11y cert | **Self-assessment + manual screen-reader verification on the critical path**; formal WA/KWACC cert filing is **not** a pre-review blocker (→ 발전방향, file mid-Sept if buffered) |
| 2.14 | Layer C cap | Certification correction capped at **+0.12** (1.00–1.12); KQ = metadata only. Documented as a refinement of the proposal's ×1.30 |
| 2.15 | External data (MVP) | KTO (10 services) + BF인증 + 국가유산청 + 기상청 + 응급/AED + 충남(다도라/올담). Rest of the 24 → 발전방향 |
| 2.16 | Content authored | Only the 백제 마스코트 6컷 is custom; all pictograms/AAC/쉬운글 reuse open sets (ARASAAC/KS/복지부/KODDI/국립특수교육원) |

## 3. The 6 MVP POIs (공주 3 · 부여 3)

공주: **공산성** (史477) · **무령왕릉과 왕릉원** (史13) · **국립공주박물관**
부여: **부소산성** (史5) · **정림사지+정림사지박물관** (史301) · **국립부여박물관**
Demo-priority pair (deepest content): **공산성 · 부소산성**.

## 4. Architecture — three planes + pure-domain core

```
DATA PLANE        KTO + 공공 API ─► typed source adapters (string-first parse; JSON-ok/XML-error; Zod passthrough)
                    ─► ETL CLI (GitHub Actions): source_records(raw) → normalize → validate → PUBLISH txn
                    ─► Supabase (canonical POI, accessibility_facts, route_guides, docent_assets, approved UGC, dashboard snapshots)
DOMAIN PLANE      pure TS, framework-free, TDD: calculateSuitability · buildItinerary · resolveGuide · moderateReport · buildDiaryDocument
PRESENTATION      Next 15 RSC (unstable_cache, public read-models only) ─► Client: accessible LIST = source of truth; map = secondary; IndexedDB = profile/diary/offline guide
```
ETL failure ⇒ keep serving last successful publish (ingest ≠ publish transaction).

**Monorepo (packages enforce agent boundaries; `domain` cannot import Next.js):**
```
apps/web/src/{app/[locale], features/{f1-poi-card,f1-planner,f1-route-guide,f1-safety,f1-community,f1-predictable,f2-docent,f3-report,f4-diary,f5-dashboard}, admin, shared}
packages/{domain, application, db, kto-client, public-data-clients, etl, ui, exports, content-schema, test-fixtures}
content/{pois, route-guides, docent, pictograms, licenses}
supabase/{migrations, seed, tests}
scripts/{ingest, validate-content, publish}
tests/{contract, e2e, accessibility, demo}
.github/workflows/{ci.yml, kto-etl.yml, release-readiness.yml}
```

**Module map:** `domain/poi` · `domain/accessibility` (capability + persona matrix + suitability) · `domain/itinerary` · `domain/guide` · `domain/docent` · `domain/reporting` · `domain/diary` · `domain/rto` · `integrations/kto` · `integrations/public-data` · `application` · `features` · `admin` · `etl`.

## 5. Data model (Supabase) — raw/normalized separation, capability facts

**Source/publish:** `ingest_runs` · `source_records(source, source_id, raw_payload, hash, fetched_at)` · `dataset_versions(dataset, published_version, published_at)` · `source_code_mappings(service, code_type, source_code, label)` (bootstrapped from `ldongCode2`/`lclsSystmCode2` — never hardcoded).

**POI/accessibility (public read when published):** `pois(id, kto_content_id, geom, type, visibility)` · `poi_translations(poi_id, locale, title, description, provenance)` · `poi_media(url, license_code/cpyrhtDivCd, attribution, transform_policy)` · `poi_entrances(location, name, geometry, verified_at)` · **`accessibility_facts(poi_id, capability_code, status ∈ {supported|partial|unsupported|unknown}, detail, source, source_field, verified_at)`** ← decouples domain from KTO field names · `poi_certifications(grade, period, source)` · `nearby_facilities(kind ∈ {restroom|AED|hospital|equipment}, ...)` · `context_snapshots(weather, crowd, air, effective_period)`.

**Routes/docent (public):** `route_guides(poi, persona_flags, version, published)` · `route_steps(seq, action, geometry, photo, easy_text)` · `route_hazards(type, severity, permanent|temporary)` · `itinerary_templates(budget_mode, ordered_pois, slot_durations)` · `docent_stories(poi, locale, mode, source)` · `docent_assets(audio, transcript, braille, sign_video)`.

**UGC/admin (RLS):** `barrier_reports(reporter_id, poi, category, status, occurred_at)` — self insert/read, approved public · `report_evidence(private_storage_path)` — reporter+admin only · `moderation_events` — admin only · `reviews(persona, dimensions, status)` — approved public · `gpx_submissions(route, source, moderation_status)` · `admin_roles(user_id, role)` · `audit_events` — append-only, admin only. Pre-approval photos in a **private Storage bucket**; Realtime broadcasts **approved alert state only**, never raw reports.

**F4/F5:** diary defaults to **IndexedDB**; server stores only explicitly-submitted data. Views: `gap_metric_snapshots`, `poi_completeness_mv`, `report_trends_mv`, `rto_dashboard_snapshots` (PT-reproducible).

RLS default deny; anon-restrictive; admin via `admin_roles`.

## 6. KTO API contracts (10 services) + integration rules

Gateway `https://apis.data.go.kr/B551011/{ServiceID}/{op}` (provider B551011). Required every call: `serviceKey`, `MobileOS=ETC`, `MobileApp=ModuBaekje`. JSON via `&_type=json`; **errors are ALWAYS XML** → parse body-as-string first. Error codes: 00/0000 ok·03 no-data·10/11 bad/missing param·22 over-traffic·30 unregistered/double-encoded key·31 expired.

| Service | Key ops | Notes/gotchas |
|---|---|---|
| KorService2 | areaBasedList2/Sync2, locationBasedList2, searchKeyword2/Festival2, detailCommon2/Intro2/Info2/Image2, ldongCode2, lclsSystmCode2 | primary content; `*2`; festival needs `eventStartDate` |
| **KorWithService2** | **detailWithTour2** (barrier-free), list/detail | **authoritative accessibility source**; contentTypeId only 12/14/15/28/32/38 |
| Odii | storyLocationBasedList/storyBasedList/themeBasedList | **`xCoord`/`yCoord`/`langCode`(ko/en/ja/zh-CN)/`radius`(m)**, own `themeNm`, no lclsSystm |
| TatsCnctrRateService | tatsCnctrRateList | **legacy codes** (areaCd=34 충남; signguCd 부여=34800; **공주 TBD**); 0–100 index, not headcount |
| DataLabService | locgoRegnVisitrDDList, metcoRegnVisitrDDList | startYmd/endYmd; ~4-day lag; **"방문자≠관광객" caveat mandatory** |
| TarRlteTarService1 | areaBasedList1, searchKeyword1 | `1` suffix; legacy areaCd/signguCd+baseYm |
| PhotoGalleryService1 | galleryList1/SearchList1/DetailList1 | 공공누리 1유형 (free) |
| Eng/Jpn/Chs/ChtService2 | KorService2 op set (no detailPetTour2) | **multilingual contentTypeId: 관광지 76 / 문화 78 / 행사 85 / 레포츠 75 / 숙박 80 / 쇼핑 79 / 음식 82**; 여행코스25 has none |

**Typed client (`packages/kto-client`):** `request<TReq,TRaw>(op,req) → {ok,data,rawBody,fetchedAt} | {ok:false,error,rawBody}`. DECODING key in server-only env, encode exactly **once** (double-encode = code 30). Zod `passthrough()`, strict on identifiers. Every normalized fact carries `source/sourceField/sourceUpdatedAt/ingestedAt`. **No hidden cache in client** (quota/retry = ETL's job; serverless token buckets aren't shared). Saved real-response **fixtures** → contract tests run without the live API.

**New vs legacy codes (resolved):** standardize on `*2` + `lDong*`/`lclsSystm*`; treat legacy `areaCode`/`cat*` as read-only fallback. **Fetch lDong codes from `ldongCode2` at bootstrap — never hardcode 44/150/760.** `cat→lclsSystm` is NOT a rename → build label map empirically. Legacy `areaCd=34` (TatsCnctr/TarRlte/DataLab) ≠ lDong namespace.

**Accounts:** dev = 1,000 calls/op/day (auto); **operating ≈ 100,000/day (review 1–3d, needs a registered 활용사례 URL) — apply EARLY, well before Oct.**

## 7. 4-Layer 적합도 산식 (deterministic; `packages/domain/accessibility`)

```
calculateSuitability({ poiFacts, routeGuide, personaIds, timeContext, certifications, ugcSummary, calculationDate, policyVersion }) → SuitabilityResult

capability value: supported 1.00 · partial 0.50 · unsupported 0.00 · unknown 0.35  (always return coverage separately)

A (POI intrinsic) = 0.30 entry + 0.18 continuity + 0.15 amenities + 0.12 rest + 0.10 timeContext + 0.08 safety + 0.07 verifiedUgc
   continuity = min(segment scores) (worst-segment, not average); rest = max no-rest travel vs persona threshold
B (persona fit) = 0.75 + 0.25 × min(personaFit over selected personas)   ; personaFit = weightedMean (critical×4 / supporting×2 / other×1)
   multi-persona uses the LOWEST personaFit (할아버지 vs 손녀: one's barrier can't be masked by the other)
C (certification) = 1.00 + min(0.12, Σ[BF 예비+0.02|일반+0.05|우수+0.08] + [열린관광지+0.04])   → 1.00..1.12 ; KQ = metadata only
D (freshness) = weightedMean(per-fact decay: ≤90d 1.00 / ≤365d 0.90 / >365d 0.75)   ; approved UGC refreshes only the related capability's date

score = round(clamp(100 · A · B · C · D, 0, 100))

Forced rules:
  - any selected-persona CRITICAL capability = unsupported → score ≤ 49
  - critical = unknown OR evidence coverage < 65% → label "정보 없음"
  - else label: 75–100 방문가능 · 50–74 주의 · 0–49 대체추천
  - score < 70 → also surface alternative POIs (TarRlteTar)
  - return: total + per-axis contribution + deductions + data dates + policyVersion  (drives the F1.A transparent card)
Null rule: empty field ⇒ "정보 없음 — 현장 확인 필요", split (a) 본질 제약 vs (b) 운영자 미입력. NEVER infer.
```

**Time budget:** select from curated `itinerary_templates` (not a general optimizer). total = POI stay + fixed transfer matrix + persona rest + meals + lodging-switch cost; persona multipliers take the **max**, not product (anti-explosion). 반나절→1박2일 = expansion within the same template family (PT-stable, identical result every run).

## 8. Features → modules (canonical F1–F5)

- **F1 무장애 토털 가이드 OS** — A POI 무장애 상세 카드 (`accessibility`,`features/f1-poi-card`) · B 사전 베리어프리 정적 경로 (`guide`,`features/f1-route-guide`) · C SOS·콜택시·보조기기+AAC (`features/f1-safety`, static directory) · D 시간예산 6단 + 4-Layer 산식 (`accessibility`,`itinerary`,`features/f1-planner`) · E 페르소나 후기 + GPX 환류 (`reporting`,`features/f1-community`,exports) · F **예측 가능 백제** 7요소 (`features/f1-predictable`, reuses F1.B step data).
- **F2 Odii 4채널 도슨트** — 음성·자막·점자·수어 × ko/en/ja/zh-CN (`docent`,`features/f2-docent`); consent-gated geofence + **map-tap fallback**; "AI 음성 안내" badge; transcript always visible; `aria-live`.
- **F3 배리어 제보 + 검수 큐** — structured report + photo → admin queue → approve → Realtime alert (`reporting`,`features/f3-report`,`admin/moderation`); **no auto-recalc**; reporter-trust filter.
- **F4 다중 출력 다이어리** — local-first diary + quiz + 6 outputs: 학생PDF(충남교육청 form via pdf-lib) · 교사루브릭 · 점자.brf(braillify) · 쉬운글PDF · GPX · 단체합본 (`diary`,`features/f4-diary`,`exports`); react-pdf for new reports, **HTML alternative always**, **no Chromium in MVP**.
- **F5 충남 RTO 갭 리포트** — completeness aggregates + visitor trends ("방문자≠관광객" caveat) (`rto`,`features/f5-dashboard`); doubles as B2G gap view.
- **외국인 4언어** = cross-cutting locale/content layer over every public feature.

## 9. Workstreams, contracts, dependency graph, timeline

**Freeze first (one owner each, versioned):** ① DB Contract v1 (tables/enums/RLS/Storage) ② KTO Contract v1 (transport + raw fixtures + normalized types) ③ Domain Contract v1 (the 5 signatures) ④ Design Contract v1 (tokens + a11y primitives) ⑤ **Content Package Contract v1** (6-POI Zod schema: entrances/steps/photos/slope/단차/rest/AAC/docent/source/verified-date).

**Streams:** C0 Contracts · C1 Data Platform · C2 KTO/ETL · C3 Design/A11y · **C4 Content (6-POI)** · F1-AD · F1-B · F1-C · F1-E · F1-F · F2 · F3 · F4 · F5 · I0 Integration (D.1 assembly) · Q0 Quality.

```
C0 ├─► C1 ─► C2 ─► F1-AD, F2, F5
   ├─► C3 ──────► all features
   └─► C4 ─► F1-AD, F1-B, F1-C, F1-F, F2, F4
C1 ─► F3 ;  F1-B ─► F1-F, F1-E, F4 ;  F3 approve ─► F1-B alerts, F5
(F1-AD+F1-B+F2+F3+F4+F5) ─► I0 ─► Q0
```

**Timeline (we are at 6/14):** 6/14–6/28 contracts + first vertical slice (공산성·국립공주박물관 data; 반나절+휠체어·시니어·가족 works on one screen; CI: typecheck/unit/axe/core-E2E) → 6/29–7/19 6-POI ETL/publish + F1.A/D + F1.B 공주 3 + F3 state machine + F4 PDF/BRF/GPX spike → 7/20–8/9 F1.B 부여 3 + F1.C/E/F + F2 4-lang/4-channel + F3 approve-alert + F4 6 outputs + F5 → 8/10–8/31 D.1 golden flow + Serwist offline (6-POI bundles) + manual NVDA/VoiceOver/TalkBack + license/AI-label/위치동의 audit + fallback drills → 9/1–9/15 real 관광약자 + a11y-expert validation; snapshot all demo API responses → 9/16–9/30 RC: feature freeze, PT scenario + backup video, demo seed vs prod separation, judge/admin accounts + incident runbook.

## 10. KWCAG 2.2 + legal (condensed; see 06/07)

**KWCAG 2.2** = 33 검사항목 (KS X OT0003). CI gates (fail PR): `@axe-core/playwright` violations=0 on core routes (exclude `.map-canvas`→manual), `jest-axe` components, Storybook `addon-a11y` (catches contrast), Lighthouse a11y ≥0.95, `eslint-plugin-jsx-a11y`. Dev-critical: route-change focus reset + `aria-live`; map keyboard/list alternative; docent consent + transcript + controls; contrast 4.5/3:1; `prefers-reduced-motion`; one h1 + landmarks + skip-link; labeled inputs; Radix/React-Aria focus traps. Voluntary: target ≥24px, focus-ring 3:1. **Manual NVDA/센스리더 is the cert-direct gate.**

**Legal:** **위치정보법 제9조의2** 방통위 신고 before real-time GPS (MVP map-tap defers it); no raw-GPS persistence (§23 secure-wipe). **PIPA** separate consent checkboxes; PII only in Supabase Seoul Postgres (never CDN/Edge); disclose Vercel(US)/Kakao 위탁·국외이전. **AI 기본법** labels "AI 음성 안내/AI 번역/AI 생성 코스" (visible + SR). **KOGL** store `cpyrhtDivCd`; Type3 = no transform; per-asset attribution. Most-restrictive-wins handled per-asset (don't transform restricted assets); prefer OFL/CC-BY/ARASAAC for anything transformed.

## 11. Risks & verify-at-build-time gates

Top mitigations: raw-store + adapter isolation + fixture contract tests (API field drift); no auto-generated routes, per-POI verified-by/date (route error); unknown-separation + coverage + caps (false precision); 1 contract owner + versioned schema + dir ownership (agent drift); 1 vertical slice per F1–F5 (feature glut); snapshot data + pre-gen media + backup video (demo-day outage); **expert validation (관광약자/특수교육/점자) is non-negotiable and separate from dev**. **Verify-at-build-time (Foundation):** detailWithTour2 exact field keys vs guide v4.3 + live probe; lDong codes via ldongCode2; gateway suffixes via Swagger; TatsCnctr 공주 signguCd; Odii coverage for the 6 POIs.

## 12. PT narrative (D.1 = the whole product as one story)

No login → select 휠체어 할아버지 + 시니어 + 초등 손녀 → 반나절 공산성: entrance/rest/restroom/alert + **score evidence** → approved "동문 공사" report emphasizes 서문 static guide (no auto-reroute) → on-site Odii 음성·자막·점자·수어 → switch to 1박2일 → same verified template family extends to 부여 → 손녀's record → 학생PDF·쉬운글PDF·BRF·GPX → same data's gaps appear on the F5 충남 RTO dashboard.
> **"한 번 수집한 무장애 데이터가 여행 전 판단, 현장 안내, 교육 기록, 다음 방문자의 경고, 충남의 시설 개선 우선순위까지 연결됩니다."**
The win condition is **evidence that the same dataset traverses F1→F5**, not feature count.

## 13. Plan-review revisions (2026-06-14) — amends §2/§7/§8/§9/§11

> Source: Claude⇆Codex plan-review + 4 persona reviews (`_research/_plan_review_findings.md`); two user adjudications (lock-preserving guards; recommended scope cuts + PT strategy). The reviewers rated the prior draft "not yet contest-ready" with fixable gaps; these revisions resolve them. **Locked numeric values (§2.14, §7) are retained; guards are added.**

**13.1 Formula authority & guards.** `16_suitability_policy.md` (+ `packages/domain/policy/suitability-policy-v1.json`) is now the **single authority** for all formula policy values and the `SuitabilityResult` contract; §7 keeps the formula *shape*. Lock-preserving guards (user-approved): (a) emit **`evidenceConfidence`/`coverage` separately** from `score`; (b) **`coverage < 0.65` caps the label at '주의'**; (c) **certification alone cannot cross a label boundary**; (d) alternatives trigger at **`<70`**, contain **only verified-card POIs**, and `TarRlteTar` is a separate "관련 관광지(접근성 미검증)" list. `unknown=0.35`, Layer C `+0.12`, Layer D decay values retained. Layer A is **persona-neutral** (objective inventory); Layer B is the persona-fit multiplier (no double-count). No score code ships until the policy is **expert-signed-off + ≥30 golden cases pass**.

**13.2 Scope cuts (applied; behind the §13.4 gates).** F1.F **7→3 요소** (시각 일정·1단계 1행동·calm+AAC; 보호자 동기·60초 변경·단체 모드 → 발전방향). F2 **geofence 제거** (map-tap only); **4채널·수어 deep only for 공산성·부소산성**, foreign langs = text/caption/voice. F1.E 후기 + UGC GPX 제출 → 발전방향 (**F3 is the sole UGC entry**; curated GPX *download* stays). F4 outputs prioritized: HTML + 학생 PDF + 쉬운글 PDF + **expert-verified BRF**; 교사 루브릭/단체 합본 only as thin derivatives. F5 = **single gap-priority report** (`impact × severity × confidence × feasibility` + action items), not heatmap/visit-trend decoration. **6-POI depth tiering**: 공산성·부소산성 = full evidence pack + route; other 4 = verification cards. **시간예산 MVP = 3단** (반나절/당일/1박2일); 2박3일 + 익산/논산 → 발전방향 ("6단" = expansion ceiling label).

**13.3 First vertical slice (single definition; supersedes all others).** 공산성 **F1.A/D → 3-step verified route → HTML diary → 1 F5 gap**, with an assigned owner, fixtures, and an E2E test.

**13.4 Scope-cut gates.** Automatic gates at **7/19 and 8/9**: if the core F1→F5 path is behind, apply the §13.2 cut list (and demote T2/T3 demo features) without re-asking.

**13.5 "Verified" = evidence pack (DoD).** A capability is "현장 검증" only with an **evidence pack**: original photo, measured value, measurement method, verifier + qualification, second approval, validity period, change history. **String-only `verified_by/date` is banned as a publish gate.**

**13.6 Validation schedule (was September-only).** **July** demo-pair 1st validation → **August** full-flow 2nd → **September** regression. Recruitment / compensation / venue / owner / **pass-bars** (task-completion rate, critical-error count, help-request rate, comprehension, route-judgment accuracy) locked **in June**.

**13.7 충남 evidence chain = P0 this sprint.** 공주 `lDong` + TatsCnctr `signguCd` probes run **now** (they gate the F5/특별상 story). Obtain a CACF letter-of-intent by **7월 말**; if none, soften "B2G to CACF" to "designed for RTO handoff" before it enters slides.

**13.8 PT strategy.** **Pre-recorded F1→F5 golden flow is the PRIMARY artifact** (1:00–7:00); live app used for **3 hero moments** only (4-Layer card reveal · 6-channel export · F5 gap report). **STT replaced by pre-typed entry** in the opener. Add a **Wheelmap-pin vs 4-Layer-card** side-by-side in the 0:00–0:30 problem slide. Re-budget so shot 7 (the F1→F5 diagram) + closing get **60+ s**. Demo tiers: **T1 flawless-live** (F1.A card, F1.B route+offline, F4 exports, F5 gap, F1→F5 diagram) · **T2 brief/video** (F2 4-channel, F1.F, F3 alert) · **T3 mention-only** (D.2–D.6, 수어, ja/zh-CN).

**13.9 Architecture/data hardening.** Context-refresh (weather/Tats/air) moves to **GH Actions / a server-only cron package exception** (not `apps/web`). Publishing uses **staging tables + atomic active-version pointer swap** (handles deleted/failed/stale rows). **Per-POI cache invalidation** (`poi:{id}` factory + contract test). **Live-API probes leave PR CI** → manual/scheduled integration workflow; PR CI = signed fixtures + schema-drift only. UGC gets **rate limits, file size/MIME/dup-hash limits, admin MFA, audit retention**. KOGL **Type3 = no transform** (license-aware bundle manifest, single storage, asset hash; full text-step fallback). Claim wording: **"zero runtime KTO/Odii dependency"** (not "zero external"); Kakao failure → list-only fallback.

**13.10 Directory ownership (resolves collisions).** `packages/exports` and `tests/e2e` get **dedicated owner streams**; root config / lockfile / env / `app` routes / `supabase/migrations` each get a named owner. Contract freezes sequence in **48–72h units** (C1→C2→C4→F1 is real, not parallel); stub-UI and real-data integration are separate milestones.
