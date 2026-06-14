# Claude ⇆ Codex Architecture Pairing — Reconcile (planning phase)

> 1:1 cross-model planning pairing per CLAUDE.md. Both halves drafted INDEPENDENTLY from the same inputs (canonical proposal `00_modu_baekje.md` + research `00_SYNTHESIS.md`) without seeing each other.
> - Claude half: `_claude_arch_draft.md` (Opus)
> - Codex half: `_codex_arch_draft.md` (gpt-5.5, xhigh, danger-full-access; run direct via CLI after the companion sandbox blocked file I/O)
> Date: 2026-06-14.

## Headline positions (side by side)

| | Claude | Codex |
|---|---|---|
| Core thesis | 3-plane arch with a **pure-domain scoring core**; transparent 4-Layer card is the differentiator | A **narrow, verified 6-POI content system** that flows one dataset F1→F2→F3→F4→F5; data trust beats platform breadth |
| #1 leverage | Transparent 4-Layer 적합도 card (F1.A evidence) | The **6-POI verified barrier-free content package** (the substrate the card renders) |

**Verdict: set converges; Codex wins on several specific refinements.** Not full convergence (Codex de-scopes more aggressively and proposes a cleaner schema), not a divergent set needing a judge round — Codex's deltas are strict improvements that align with the *proposal's own risk register*. Adopt the union with Codex's refinements. No judge round required.

## Convergence (independent agreement — high confidence)
1. **Pure-domain `calculateSuitability` as a deterministic function** — identical Layer A weights (0.30/0.18/0.15/0.12/0.10/0.08/0.07), persona matrix (critical×4/aux×2/other×1), Layer D decay (≤90d×1.0/≤365d×0.9/>365d×0.75); null→"정보 없음, never infer"; return a breakdown.
2. **Split F1** into multiple workstreams (too big as one).
3. **Canonical F1–F5**, reject synthesis re-numbering; 외국인 = cross-cutting.
4. **Accessible list = source of truth; map = secondary.**
5. **Local-first diary (IndexedDB), no raw-GPS persistence (PIPA).**
6. **Freeze contracts first** (schema + KTO client + design system + domain signatures).
7. **Manual screen-reader verification > formal cert on the critical path.**
8. **GitHub Actions = heavy batch ETL; Vercel Cron = short refresh only** (both diverge from synthesis's Vercel-Cron-primary).
9. **D.1 demo as the single narrative** proving one dataset traverses F1→F5.
10. **De-scope to demo depth** (수어 few POIs, UGC manual, geofence consent+tap fallback, no auto-recalc, thin STT).

## Divergence → resolution (Codex refinements adopted)
| # | Topic | Claude | Codex | RESOLVED |
|---|---|---|---|---|
| D1 | #1 leverage | scoring card | 6-POI content package | **Both — content package is the substrate (Codex's #1), transparent card is how it's surfaced (Claude's). Complementary.** |
| D2 | Wheelchair routing | WS1-GeoPipeline (pgRouting+NGII DEM) | **DROP** — heritage-site steps/doors/surface can't be DEM-inferred; use **curated static route packages** | **Codex.** The proposal's F1.B itself specifies *static pre-verified guides*, not dynamic routing. Synthesis & Claude over-engineered. Removes a risky workstream. |
| D3 | pgvector / RAG | kept as nice-to-have | **REMOVE** (6 POIs need neither vector nor FTS) | **Codex.** Drop pgvector/RAG/embeddings → 발전방향. Removes an AI provider + extension. |
| D4 | Caching / runtime KTO | token-bucket + TTL + some live calls | **No runtime KTO calls**; serve from Supabase published snapshots (even Tats/DataLab/weather = short-interval snapshots); serverless token bucket is unshared/unreliable; drop Upstash | **Codex.** DB snapshot = primary cache + source of truth → demo-resilient (no external dep at PT). |
| D5 | Layer C cert multiplier | proposal ×1.00–1.30 | cap **+0.12** (1.00–1.12); KQ = metadata, not a score boost | **USER DECISION** (changes published formula). Recommend Codex's capped+documented version. |
| D6 | F1 split granularity | F1-core + F1-assist (2) | F1-AD / F1-B / F1-C / F1-E / F1-F (5) | **Codex** — finer split matches dependency differences. |
| D7 | Barrier-free schema | `poi_barrier_free(jsonb)` | **`accessibility_facts(capability_code, status∈{supported,partial,unsupported,unknown}, source_field, provenance)`** | **Codex.** Decouples domain from KTO field names (unverified), models partial/unknown explicitly (feeds scoring), per-fact provenance. |
| D8 | Content as contract | late-phase WS3-Content | **early frozen Content Package Contract + workstream (C4)** | **Codex** — it's the substrate + #1 leverage; must be early/central. |
| D9 | Repo structure | single Next app + /lib | **monorepo**: `apps/web` + `packages/{domain,application,db,kto-client,public-data-clients,etl,ui,exports,content-schema,test-fixtures}` + `content/` | **Codex** — separate pure `domain` package enforces isolation, gives agents clean ownership boundaries. |
| D10 | Auth | anon-first | core features need **NO login**; anon Auth only for UGC identity | **Codex** (sharpening). |
| D11 | External data | trim (implicit) | explicit MVP set: KTO + BF + 국가유산청 + 기상 + 응급 + 충남 | **Codex.** Rest → 발전방향. |
| D12 | PDF | react-pdf + Chromium | react-pdf (new) + pdf-lib (official form) + **always HTML alt; no Chromium in MVP** | **Codex** (sharpening). |
| D13 | Cache invalidation | (unspecified) | GH Actions → HMAC-protected internal endpoint → `revalidateTag`; bounded TTL recovers on failure | **Codex** — concrete robust pattern. |

## Adopted unified stance
A **narrow, contract-first, content-verified system** (Codex's spine) with a **pure-domain scoring core surfaced as a transparent evidence card** (Claude's differentiator). Drop from MVP: dynamic routing/DEM, pgvector/RAG, Upstash, messaging (FCM/APNs/알림톡), OCR, 360°, multi-AI-provider, full 24-dataset integration, formal-cert-as-blocker. Schema centers on `accessibility_facts` capability model + raw/normalized separation. Monorepo packages enforce agent boundaries.

## Open decisions for the user
1. **Layer C cap** — proposal ×1.30 vs Codex +0.12 (recommend Codex, documented as a refinement).
2. Confirm the **narrow content-system direction** (the de-scope list above) vs keeping more of the synthesis platform.
