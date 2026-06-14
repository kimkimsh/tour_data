# 모두의 백제 — Consolidated Plan-Review Findings

> **Role:** Review editor. Consolidates ALL prior persona-review findings (CEO / Eng / DevEx / Office-hours lenses) plus the independent Codex plan-review (`_codex_review_raw.md`) and the SPEC↔docs consistency check (`_consistency_check.md`).
> **Grounding:** `docs/plan/SPEC.md` (frozen source of truth). Compiled 2026-06-14.
> **Method:** Overlapping items deduped; grouped by severity (blocker → major → minor). Each item: title · persona(s) · where · issue · recommended fix · **CONFLICT-with-locked-SPEC flag** (✅ flagged for user where a fix would override a §2 locked decision or the §7 frozen formula).
> **Scope note:** Findings are about the *plan document*, not yet-written code. A "fix" that contradicts a locked decision is surfaced for the **user to adjudicate**, never silently applied.

---

## 0. How locked-SPEC conflicts are flagged

Several reviewer fixes target the **§7 4-Layer formula** or a **§2 locked decision**. Those are frozen. Where a recommended fix would *change a locked value*, the item is tagged **`⚠ CONFLICTS WITH LOCKED SPEC — USER DECISION REQUIRED`** and the locked anchor is cited. The user must choose: (a) keep the lock and reject the fix, (b) keep the lock but add the reviewer's concern as a mitigation/secondary output, or (c) amend the lock. Reviewers may be right on the merits *and* still be blocked by a lock — both facts are recorded.

---

## 1. BLOCKERS (must resolve before parallel build / before contest claims hold)

### B-1 — `SuitabilityResult` contract diverges across documents
- **Persona(s):** Eng, DevEx (Codex review; consistency lens)
- **Where:** `SPEC §7` · `05 §4` · `12 §1.1`
- **Issue:** Field names differ doc-to-doc: `total` vs `score`; `axes` / `perAxisContribution` / `axisContributions`; `"정보없음"` vs `"정보 없음"`. A parallel agent team cannot consume an unstable return shape — F1.A, F4, F5 all read this object.
- **Fix:** Designate ONE TypeScript contract file as the authoritative source; docs **link**, never copy. Ship a golden fixture of the result and run it in every consumer's CI. Normalize the label string set (one spelling).
- **Conflict:** None. Pure consistency tightening; SPEC §7 stays authoritative for semantics.

### B-2 — Core 산식 inputs are undefined → not implementable from the spec
- **Persona(s):** Eng, CEO (data-활용 is the prize axis)
- **Where:** `05 §4.3` · `SPEC §7` · `§10`
- **Issue:** persona×capability matrix, the capability set per axis, rest thresholds, crowd/weather→score mapping, freshness weights, and multi-source conflict rules are all missing. "Implementable from the spec alone" fails. This directly threatens 데이터활용 20 + 기획력 30.
- **Fix:** Before coding, freeze `suitability-policy-v1.json` quantifying every matrix/curve/priority/threshold; have a domain expert sign off ≥30 golden cases. Generate the doc's worked examples FROM the golden tests (kills B-3/major drift below).
- **Conflict:** None. This *operationalizes* §7; it does not change locked values.

### B-3 — "현장 검증" accepted on `verified_by/date` existence alone
- **Persona(s):** CEO, Eng (Codex review)
- **Where:** `C4` · `12 Window 1–2` · `15 R-V2`
- **Issue:** A bare string/date is treated as field verification. No measurement method, equipment, photo evidence, verifier qualification, re-verify cycle, or tolerance. The entire "verified accessibility dataset" thesis — the contest differentiator — rests on this and is currently undefendable.
- **Fix:** Make a per-POI **evidence pack** the Definition of Done: original photo, measured value, measurement method, verifier, second-approval, validity period, change history. Ban string-only verification as a publish gate.
- **Conflict:** None. Strengthens SPEC §11 "per-POI verified-by/date" intent.

### B-4 — Real-user / braille / special-education validation slips to September
- **Persona(s):** CEO, Office-hours (Codex review; SPEC §11 "non-negotiable")
- **Where:** `12 §4` · `15 OI-10`
- **Issue:** Expert + 관광약자 validation lands right at feature-freeze; recruitment unresolved. SPEC §11 calls this "non-negotiable and separate from dev," yet there is no early gate. Findings would arrive too late to act on.
- **Fix:** Split into 3 passes: **July** demo-pair 1st validation, **August** full-flow 2nd, **September** regression. Lock recruitment / compensation / venue / owner / pass-bar **in June**.
- **Conflict:** None. Implements SPEC §11/§9 timeline intent earlier.

### B-5 — Unicode 점자 and `.brf` treated as effectively identical
- **Persona(s):** Eng, Office-hours
- **Where:** `F4` · `02 §8.5` · `15 R-F2`
- **Issue:** Korean braille translation correctness, Braille-ASCII/embosser compatibility, and math/punctuation rules are unverified. "BRF 지원" is currently an unbacked contest claim.
- **Fix:** Name the target 점역 ruleset and a real embosser first. Do NOT claim "BRF 지원" in judging without a braille user's contrast review.
- **Conflict:** None.

### B-6 — First vertical slice is defined three different ways
- **Persona(s):** Eng, DevEx
- **Where:** `12 Window 1` (F1-AD only) vs `§6.1` (adds F1.B + F4) vs `15 R-F1` (claims full F1→F5 slice)
- **Issue:** Three incompatible "first slice" definitions block a clean kickoff and CI gate.
- **Fix:** Fix ONE explicitly reduced slice: **공산성 F1.A/D → 3-step verified route → HTML diary → 1 F5 gap.** Assign owner, fixtures, and E2E to it.
- **Conflict:** None.

### B-7 — No real scope-cut gate behind a 4-month, everything-"완성" plan
- **Persona(s):** CEO, Eng (Codex review)
- **Where:** `15 R-F1` + whole timeline (§9 / `12`)
- **Issue:** 6 field routes × 4 languages × 수어 × 점자 × 6 outputs × UGC × admin × offline × F5, all "완성" in 4 months, with no staffing/content-throughput basis. Risks are *listed* but there is no enforced cut.
- **Fix:** Add automatic scope-cut gates at **7/19 and 8/9**. If the core path is behind, apply the predefined cut list (see §4 below) without re-asking.
- **Conflict:** None.

### B-8 — `zh-CN` ↔ `zh-Hans` locale split (runtime-breaking)
- **Persona(s):** DevEx, Eng (consistency check C-1)
- **Where:** `02 §2.3` next-intl route `[locale]=ko/en/ja/zh-Hans` (L92, L507) vs `06` DB CHECK + Zod enum `zh-CN` (L56/L76/L561) · `01` uses `zh-Hans`
- **Issue:** Route locale `zh-Hans` queries a docent read-model keyed `zh-CN` → string mismatch → **empty docent results** for Chinese. This is a real runtime defect, not just a doc nit.
- **Fix:** Unify on one code. **SPEC §6/§8 use `zh-CN`** → align `01` and `02` to `zh-CN`.
- **Conflict:** None — the fix is *SPEC-conforming* (`01`/`02` are the ones violating SPEC).

---

## 2. MAJORS (correctness, exploitability, sequencing, scope realism)

### M-1 — Layer A/B double-count the same capability
- **Persona(s):** Eng
- **Where:** `SPEC §7` · `05 §4.3`
- **Issue:** Layer A ("POI intrinsic") mixes wheelchair/infant capabilities that Layer B re-evaluates → the same fact is scored twice (multiplicatively).
- **Fix:** Define A as physical/operational axes only, OR compute A per-persona. If a capability appears in both, document the dual purpose and provide a sensitivity analysis.
- **Conflict:** Touches the §7 axis weights but does not *change a locked numeric value* — A's weight vector and B's `0.75 + 0.25×min` form are specified in §7 but the *capability-to-axis assignment* is undefined (see B-2), so this can be resolved inside B-2's policy file. **Not flagged**, but note the resolution must keep §7's A-weight totals.

### M-2 — `unknown = 0.35` rewards absence of evidence
- **Persona(s):** Eng, CEO (false-precision risk to 기획력)
- **Where:** `SPEC §7`
- **Issue:** Once coverage clears 65%, remaining `unknown` capabilities can *raise* the score (0.35 > 0.00). Missing data should never inflate suitability.
- **Fix (reviewer):** Treat `unknown` as 0 contribution or exclude from the mean; show confidence separately so sparse data can't produce a high score.
- **Conflict:** **`⚠ CONFLICTS WITH LOCKED SPEC — USER DECISION REQUIRED`.** SPEC §7 line "capability value: … unknown 0.35" is the frozen formula (`SPEC §7`, and `2.14`-adjacent formula lock). Changing 0.35→0 alters every score. **Recommended user path:** keep 0.35 but emit a separate `evidenceConfidence`/`coverage` output (§7 already says "always return coverage separately") and add a forced rule that low-coverage cannot exceed the '주의' band. That captures the reviewer's intent without breaking the locked constant — user to confirm.

### M-3 — Worked example contradicts the rules
- **Persona(s):** Eng, DevEx
- **Where:** `05 §4.5`
- **Issue:** Example says `verifiedUgc unknown=0.35` but computes contribution as `0.07×0.50=0.035`. (Confirmed inconsistency; the §2.4 card uses `B=0.875` while §4.5 uses `B=0.945`, only partially reconciled in the L563/L734 note.)
- **Fix:** Generate the worked example directly from a golden test and inject it; stop hand-maintaining numbers (subsumed by B-2).
- **Conflict:** None.

### M-4 — `"정보없음"` can mask a KNOWN critical blocker
- **Persona(s):** Eng, CEO (safety/trust)
- **Where:** `05 §4.4` · `SPEC §7` forced rules
- **Issue:** When a known critical-unsupported AND a critical-unknown coexist, the "정보없음" label can hide the known hazard.
- **Fix:** Reorder forced rules: `known critical blocker → 대체추천` FIRST, then `insufficient evidence → 정보없음`. If both states exist, surface BOTH.
- **Conflict:** Minor interaction with §7 forced-rule ordering. The §7 rules list both conditions but don't fix precedence; this clarifies ordering without changing a locked value. **Not flagged** — resolvable as a §7 clarification (recommend user ratify the ordering).

### M-5 — Layer C certification multiplier double-counts & flips label boundaries
- **Persona(s):** Eng, CEO
- **Where:** `SPEC §7 Layer C` · `SPEC 2.14`
- **Issue:** Certification adds up to +12% to an accessibility score that already counts the same facts as capabilities; it can flip 74→75 ('주의'→'방문가능').
- **Fix (reviewer):** Use certification as confidence/coverage evidence, not a score multiplier; if kept as multiplier, forbid certification-alone from crossing a label boundary.
- **Conflict:** **`⚠ CONFLICTS WITH LOCKED SPEC — USER DECISION REQUIRED`.** SPEC `2.14` + §7 lock Layer C as a multiplier capped at **+0.12 (1.00–1.12)**, explicitly framed as "a refinement of the proposal's ×1.30." Removing the multiplier overrides a §2 locked decision. **Recommended user path (lock-preserving):** keep the capped multiplier but add the reviewer's guard — "certification alone cannot move the suitability label across a band boundary." User to confirm whether to add that guard.

### M-6 — Layer D freshness expresses uncertainty as low suitability
- **Persona(s):** Eng
- **Where:** `SPEC §7 Layer D`
- **Issue:** Old positive AND old negative evidence are both multiplicatively penalized; staleness is *uncertainty*, not *unsuitability*, yet it lowers the suitability score.
- **Fix (reviewer):** Decay stale facts toward `unknown`/lower confidence; output suitability and evidence-confidence separately.
- **Conflict:** **`⚠ CONFLICTS WITH LOCKED SPEC — USER DECISION REQUIRED`.** SPEC §7 Layer D decay multipliers (`≤90d 1.00 / ≤365d 0.90 / >365d 0.75`) are frozen. **Recommended user path:** keep the D multiplier but ALSO emit a separate confidence signal (pairs naturally with M-2's resolution). User to confirm.

### M-7 — One approved UGC report can be triple-counted / gamed
- **Persona(s):** Eng (exploitability), CEO (trust)
- **Where:** `SPEC §7` · `F3`
- **Issue:** UGC can flow into Layer A, refresh a capability date, AND update the underlying fact → a single approved report can move the score multiple ways.
- **Fix:** UGC alone cannot change authoritative status; require explicit promotion rules (corroboration count, verifier, evidence level).
- **Conflict:** None (F3 says "no auto-recalc" already; this hardens it).

### M-8 — `TarRlteTar` "alternatives" are not accessibility-safe substitutes
- **Persona(s):** CEO (user trust), Eng
- **Where:** `SPEC §7 alternatives` · `05 §2.4`
- **Issue:** TarRlteTar "related tourist sites" carry no accessibility guarantee; presenting them as safe alternatives misleads 관광약자.
- **Fix (reviewer):** Pick alternatives only from the 6 scored+verified POIs; label TarRlteTar separately as "related," not "alternative."
- **Conflict:** **`⚠ CONFLICTS WITH LOCKED SPEC — USER DECISION REQUIRED`.** SPEC §7 explicitly states `score < 70 → also surface alternative POIs (TarRlteTar)`. The fix narrows a locked behavior. **Recommended user path (lock-respecting):** keep TarRlteTar but (a) only surface entries that also have a verified accessibility card, and (b) relabel as "관련 관광지(접근성 미검증)" with a warning. User to confirm.

### M-9 — Alternatives threshold inconsistent: `<75` vs `<70`
- **Persona(s):** Eng, DevEx
- **Where:** `05 §2.4` evidence card says "75 미만 → 대체 POI" (L301) vs authoritative `05 §4` / `SPEC §7` `score < 70` (L482/L524)
- **Issue:** Confirmed contradiction in the same feature doc. (Verified directly: L301 vs L482/L524.)
- **Fix:** Unify to ONE policy constant. **SPEC §7 says `< 70`** → fix the §2.4 card to `<70`. Add boundary tests `69/70/74/75`.
- **Conflict:** None — `<70` is the SPEC-locked value; the card is the violator.

### M-10 — "시간예산 6단" labels 4 steps; 2박3일 leaves the locked 6 POIs
- **Persona(s):** CEO (scope), Eng
- **Where:** `05 §4.6` table (L590–593) · `SPEC §8` ("6단") · `SPEC §3` (locked 6 POIs)
- **Issue:** Doc repeats "6단" but the table has only 4 rows (반나절/당일/1박2일/2박3일); `2박3일` includes 익산·논산 — **outside the locked 6-POI scope (SPEC §3)**. (Verified L590–593.)
- **Fix:** Reduce MVP to 3 steps (반나절/당일/1박2일); move 2박3일 + other regions to 발전방향.
- **Conflict:** **Partial flag.** Cutting 익산/논산 from MVP is SPEC-conforming (§3 locks 6 POIs; §2.15 sends extras to 발전방향) — no conflict. BUT the literal label "**시간예산 6단**" is repeated in **SPEC §8** itself; dropping it to "3단" is a label change vs SPEC §8 wording. **Recommend:** keep §8's "6단" naming as the *expansion ceiling* (발전방향) but ship 3 MVP steps — user to confirm the label treatment. The 익산/논산 removal needs no user sign-off (already implied by §3).

### M-11 — Contracts claimed "all green before features," but C1→C2→C4→F1 is really sequential
- **Persona(s):** Eng, DevEx (Office-hours: timeline realism)
- **Where:** `12 §1–5`
- **Issue:** C0–C4 and the F1 slice are scheduled in parallel while the real dependency chain (C1→C2→C4→F1) is hidden → false parallelism, hidden critical path.
- **Fix:** Sequence contract freezes in 48–72h units; split stub-UI vs real-data-integration into separate milestones.
- **Conflict:** None.

### M-12 — Directory ownership actually collides
- **Persona(s):** DevEx, Eng
- **Where:** `12 §2`
- **Issue:** F1-E and F4 both own `packages/exports`; I0 and Q0 both own `tests/e2e`; C2 edits a revalidate route outside its scope. SPEC §11 lists "1 contract owner + dir ownership" as a top mitigation — this violates it.
- **Fix:** Make shared packages their own owner stream OR split ownership down to subpaths; assign owners to root config, lockfile, env, app routes, migrations too.
- **Conflict:** None (enforces SPEC §11 intent).

### M-13 — `apps/web` forbidden from importing public-data clients, but a Vercel Cron route refreshes weather/Tats/air directly
- **Persona(s):** Eng, DevEx
- **Where:** `02 §2.3` vs `§5–6`; relates to `SPEC 2.10`
- **Issue:** Architecture boundary ("`domain`/`apps/web` cannot import data clients") contradicts a cron route in `apps/web` doing context refresh.
- **Fix:** Move context refresh to GH Actions / a separate worker, OR explicitly carve a server-only cron package exception in the contract.
- **Conflict:** None — SPEC 2.10 already says "Vercel Cron only for short refresh"; this is about *where* that code lives. Resolve in the boundary contract.

### M-14 — "Single publish transaction" doesn't guarantee dataset version integrity
- **Persona(s):** Eng
- **Where:** `02 §6.2` · `SPEC §4` ("ingest ≠ publish")
- **Issue:** No rules for deleted facts, a failed POI mid-batch, or leftover rows from the prior version.
- **Fix:** Build a full snapshot into staging/versioned tables, then atomically flip the active-version pointer; test replace/delete semantics.
- **Conflict:** None (implements SPEC §4 "last successful publish" guarantee).

### M-15 — Example `unstable_cache` can't do the documented `poi:{id}` invalidation
- **Persona(s):** Eng
- **Where:** `02 §4.2`; relates to `SPEC 2.4`
- **Issue:** The sample sets only a static tag `poi:all`, so per-POI invalidation described elsewhere is unachievable.
- **Fix:** Per-POI cached factory or explicit key/tag builder; add a per-POI invalidation contract test.
- **Conflict:** None.

### M-16 — Live-API validation in PR/weekly CI breaks the "fixture-only" principle
- **Persona(s):** DevEx, Eng
- **Where:** `15 §2`; relates to `SPEC §6` ("contract tests run without the live API")
- **Issue:** Live probes in normal/weekly CI let quota/secret/outage block PRs — and contradict the fixture-only contract-test principle.
- **Fix:** Move live probes to a manual/scheduled integration workflow; PR CI uses signed fixtures + schema-drift tests only.
- **Conflict:** None — aligns CI with SPEC §6.

### M-17 — "6 POI ≥15 keys each" gate fights `Zod passthrough` and empty-field omission
- **Persona(s):** Eng, DevEx
- **Where:** `Gate 1`; relates to `SPEC §6`
- **Issue:** APIs omit empty fields, so a "≥15 keys" gate can fail spuriously; also contradicts the "register without passthrough" criterion.
- **Fix:** Separate required envelope fields from optional capability fields; log+warn unknown keys but decide explicitly whether they block publish.
- **Conflict:** None.

### M-18 — "4 languages × voice·caption·braille·sign" is over-claimed
- **Persona(s):** CEO (over-promise), Office-hours, Eng (content throughput)
- **Where:** `F2` · `15 R-F4/F5`; relates to `SPEC §8` F2
- **Issue:** Korean Sign Language is not a per-language channel; per-language braille needs separate verification. Content production is unrealistic at this breadth.
- **Fix:** Complete the Korean 4-channel for the demo pair only; restrict foreign languages to text/caption/voice; claim 수어/점자 only for verified languages.
- **Conflict:** None — SPEC §8 names the channels but doesn't mandate full-breadth completion; this is a depth/coverage scoping choice (reinforces §11 demo-pair priority).

### M-19 — F1.B canvas photo compression conflicts with KOGL Type3 "no transform"
- **Persona(s):** Eng (legal), DevEx
- **Where:** `F1.B §3.3`; relates to `SPEC §10` KOGL
- **Issue:** Canvas compression of Type3 assets violates "no transform"; also CORS taint + IndexedDB quota + asset duplication across Cache Storage and IndexedDB.
- **Fix:** Define a license-aware bundle manifest, max size, asset hash, single storage location; guarantee full text-step fallback instead of offline map tiles.
- **Conflict:** None — enforces SPEC §10 most-restrictive-wins.

### M-20 — Anonymous UGC has no abuse controls
- **Persona(s):** Eng (security), DevEx
- **Where:** `F3` · `C1`; relates to `SPEC 2.11`
- **Issue:** No rate limit, upload size/MIME limits, CAPTCHA/abuse control, or admin permanent-auth method for anonymous UGC.
- **Fix:** Add report-count / file-size+MIME / duplicate-hash limits, server-side rate limiting, admin MFA, audit retention — as acceptance criteria.
- **Conflict:** None.

### M-21 — F5 has no completeness / gap-priority definition → decorative dashboard
- **Persona(s):** CEO (실용성/B2G value), Eng
- **Where:** `F5`; relates to `SPEC §8` F5
- **Issue:** Showing only visitor trends + report counts is not an "RTO improvement signal."
- **Fix:** Define priority as `impact × severity × confidence × feasibility` with concrete action items; state which RTO decision each metric supports.
- **Conflict:** None.

### M-22 — "20-user test" has no pass criteria
- **Persona(s):** CEO, Office-hours
- **Where:** `15 R-V1`
- **Issue:** Participant count is not quality evidence; no success bar.
- **Fix:** Set pass-bars on task-completion rate, critical-error count, help-request rate, comprehension, and route-judgment accuracy.
- **Conflict:** None.

---

## 3. MINORS

### m-1 — "Zero external dependency on demo day" is overstated
- **Persona(s):** CEO, DevEx · **Where:** `02 §0` · `15 R-O1`
- **Issue:** Still depends on Vercel, Supabase, Kakao SDK, Storage.
- **Fix:** State precisely "zero runtime KTO/Odii dependency"; demo a list-only fallback if Kakao fails. **Conflict:** None.

### m-2 — "PII only in Supabase Seoul" is hard to guarantee
- **Persona(s):** Eng (legal), DevEx · **Where:** `SPEC §10` · `15 R-A4`
- **Issue:** Server Actions, Vercel logs, Storage/CDN handling can leak PII paths.
- **Fix:** Produce a real data-flow diagram + log-redaction check; finalize legal claims after professional review. **Conflict:** None (refines §10 wording, doesn't change a lock).

### m-3 — `01` appendix-B document index is stale (wrong filenames)
- **Persona(s):** DevEx · **Where:** `01` appendix B (L388–403) + §6.3 (L324) (consistency check C-2)
- **Issue:** Points to a non-existent old numbering scheme (`02_data_model.md`, `09_timeline_workstreams.md`, etc.).
- **Fix:** Replace with actual filenames or point at `00_README.md` TOC. **Conflict:** None.

### m-4 — `01` lists multilingual contentTypeId as a subset (`76/78/85`)
- **Persona(s):** DevEx · **Where:** `01` L133/L168/L208 vs `SPEC §6` (7 IDs) (consistency check C-3)
- **Issue:** SPEC §6 lists 7 (`76/78/85/75/80/79/82`); `01` shows only 3 as a flat assertion.
- **Fix:** Complete to 7 or qualify "(주요 타입)". **Conflict:** None.

### m-5 — Content Package Contract v1 has no single owning document
- **Persona(s):** DevEx, Eng · **Where:** `SPEC §9 ⑤` (consistency check G-1)
- **Issue:** C4 (the earliest blocking contract) is scattered across `01 §7` / `03` / `12 §2.1 C4`; the `10_content_package.md` slot is now `10_accessibility_kwcag.md`.
- **Fix:** Designate one owning doc (new file or explicit delegation in `00`/`03`). **Conflict:** None.

### m-6 — `dataset_versions` / `ingest_runs` lifecycle ownership unassigned
- **Persona(s):** DevEx · **Where:** `SPEC §5` split across `03`/`04` (consistency check G-2)
- **Issue:** "published_version↑ ↔ revalidateTag ↔ last-good retained" lives across two docs with no single owner.
- **Fix:** Assign ownership boundary in README/header. **Conflict:** None.

### m-7 — Doc `06` H1 missing the `06` prefix + says "다채널" not "4채널"
- **Persona(s):** DevEx · **Where:** `06` H1/§0 (consistency check minor)
- **Issue:** Cosmetic naming inconsistency vs SPEC/01/12 ("4채널").
- **Fix:** Add `06` prefix; standardize "4채널". **Conflict:** None.

---

## 4. Further scope to CUT (reviewer-recommended; CEO + Eng convergent)

1. **F1.F 7요소 → 3요소:** keep visual schedule, one-step-one-action, calm-mode+AAC; move guardian-sync / 60s-change / group-mode → 발전방향.
2. **F2 geofence removed:** map-tap only for MVP; complete Korean 4-channel deeply only for 공산성·부소산성.
3. **F1.E reviews + UGC GPX submission removed:** F3 is the single UGC entry; curated GPX *download* stays, community loop defers.
4. **F4 output quality first:** HTML + 학생 PDF + 쉬운글 PDF + expert-verified BRF prioritized; 교사 루브릭 / 단체합본 only if thin derivatives of the same document model.
5. **F5 → single gap report:** one screen of "which facility to fix first and why," not heatmaps/visit trends.
6. **6-POI depth tiering:** 공산성·부소산성 get full evidence pack + route; the other 4 limited to verification cards.

> These are NOT locked-SPEC conflicts — SPEC §1/§12 explicitly say "win condition = dataset traverses F1→F5, not feature count," and §11 lists "1 vertical slice per F1–F5" + demo-pair priority. The cuts *implement* that intent. Apply behind the 7/19 & 8/9 gates (B-7).

---

## 5. PRIORITIZED ACTION LIST (highest leverage first)

1. **Freeze the 산식 policy + return contract, validated by expert-approved golden cases.** Resolves B-1, B-2, M-1, M-3, M-9; it is the direct lever on 데이터활용 20 + 기획력 30. *(Includes deciding M-2/M-6 confidence outputs and M-5/M-8 lock-preserving guards — surface those to the user.)*
2. **Make 공산성·부소산성 evidence packs + early (July) real-user validation the critical path.** Resolves B-3, B-4, B-5; this is what makes "verified dataset" defendable at PT.
3. **Cut F1.F / F1.E / F2-multilingual scope now and lock ONE first vertical slice with a scope-cut gate.** Resolves B-6, B-7, M-10, M-18 + §4 cuts; concentrate on the single F1→F5 lineage.
4. **Fix the runtime-breaking + collision defects:** `zh-CN` unification (B-8), directory ownership (M-12), false-parallel sequencing (M-11), publish-version atomicity (M-14), per-POI cache invalidation (M-15). These silently break the build/demo if left.
5. **Harden data-trust & abuse surfaces:** UGC promotion rules (M-7), anonymous-UGC abuse controls (M-20), KOGL Type3 no-transform (M-19), live-API-out-of-PR-CI (M-16).
6. **Make F5 a real gap-priority engine, not a decoration** (M-21) and **set validation pass-bars** (M-22) — these earn 실용성 + 발표.
7. **Sweep the consistency minors** (m-3–m-7) and overstated claims (m-1, m-2) before the PT script is written.
8. **Adjudicate the 4 locked-SPEC conflicts** (M-2, M-5, M-6, M-8 + the M-10 label) — user decides lock vs. lock-preserving guard vs. amend.

---

## 6. Honest contest-readiness assessment

**Not yet contest-ready — strong architecture and PT narrative, but the core claim is undefended.**

The blueprint's *direction* is genuinely strong: the F1→F5 single-dataset lineage is a real differentiator for 데이터활용 + 기획력, the locked decisions (no runtime KTO, static curated routes, Layer C cap, no-login core, raw/normalized separation) are coherent and consistently echoed across all 15 docs, and the demo story is compelling. The consistency check confirms no build-blocking SPEC violations except the one runtime locale defect (B-8).

What blocks "ready" is that the **three load-bearing pillars are not yet defensible**:
1. **The 산식 is not implementable from the spec** (B-2) and its contract drifts across docs (B-1) — the very thing that earns the prize axis.
2. **"Verified accessibility data" rests on a bare date string** (B-3) and **real-user/braille validation is too late** (B-4, B-5) — the differentiator is unbacked at judging time.
3. **A 4-month everything-"완성" plan has no enforced scope gate** (B-7) and three conflicting first-slice definitions (B-6) — high risk of "screens done, trust undefendable."

These are fixable in June without touching most locked decisions. The single highest-leverage move is unchanged from the independent review: **show one auditable lineage line** — original photo/measurement → `accessibility_fact` → 산식 bottleneck → 서문 route step → diary record → F5 improvement priority — and make *that* flow bulletproof, rather than maximizing feature count.

**Four reviewer fixes collide with locked SPEC values** (unknown=0.35, Layer C ×multiplier cap, Layer D decay, TarRlteTar alternatives). The merits favor the reviewers, but the values are frozen — each is flagged for **user adjudication** with a lock-preserving alternative proposed. Do not silently change them.
