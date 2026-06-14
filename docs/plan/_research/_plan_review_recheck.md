# 모두의 백제 — Plan-Review Recheck (post-revision consistency pass)

> **Role:** Blueprint editor, post-revision consistency pass. Report-only (no docs edited).
> **Authority:** `docs/plan/SPEC.md` (incl. §13 revisions) + `docs/plan/16_suitability_policy.md`.
> **Scope:** Verify the plan-review blocker/major fixes in `_research/_plan_review_findings.md` actually landed in the revised `00–15` docs and that nothing now contradicts SPEC §13 or doc 16.
> **Date:** 2026-06-14.

---

## Verdict

**NOT yet internally consistent — ONE blocker is only partially resolved (B-1), plus residual scope-cut drift in doc 12.** The bulk of the revision landed cleanly: locale unification (B-8), alternatives threshold (M-9), first-slice single definition (B-6), directory-ownership collisions (M-12/§13.10), and the scope cuts in the *feature* docs (01/05/06/09) are all correct. But the **`SuitabilityResult` contract still drifts in two docs (12 and 13)** — the exact failure B-1 was supposed to kill — and **doc 12's stream-deliverable table still carries the pre-cut scope** for F1.F (7요소), F2 (geofence-primary), F5 (히트맵), and 시간예산 (6단), contradicting both SPEC §13.2 and the now-cut feature docs.

These are doc-consistency defects, not new SPEC violations of the locked numerics. The locked values (`unknown=0.35`, Layer C `+0.12`, Layer D decay) and the user-approved guards are correctly retained and single-sourced to doc 16. But B-1's core promise — "ONE authoritative contract; other docs link, never copy" — is violated by 12 and 13.

---

## REMAINING CONTRADICTIONS

### RC-1 (BLOCKER residue — B-1 not fully resolved) — `SuitabilityResult` contract re-declared with divergent shapes in `12` and `13`

SPEC §13.1 + doc 16 §1 designate `packages/domain/policy/types.ts` (spec'd in **16 §1**) as the **single authority** for the `SuitabilityResult` shape; "other docs must link here, never re-state." Docs `02` (L227, L232) and `05` (L434, L441) comply — they import and explicitly refuse to re-declare. But **two docs still hand-declare a divergent interface:**

- **`12_workstreams_sequencing.md §1.1` (L70–L79)** — `export interface SuitabilityResult` with:
  - `axisContributions: { A: number; B: number; C: number; D: number }` — authority uses `axes: AxisContribution[]` (per-axis Layer-A breakdown) **plus** `layerA/layerB/layerC/layerD`. Different concept and different field name.
  - `label: … '정보 없음'` (**with space**) — authority (16 §1, L22) mandates `'정보없음'` (**no space**, "one spelling, no space").
  - `alternatives: ReadonlyArray<string>` — authority uses `AlternativePoi[]`.
  - **Missing** `evidenceConfidence`, `knownCriticalBlockers`, `layerA..D` (the M-2/M-4/M-6 guard fields that the revision added).
- **`13_testing_quality.md` (L121–L135)** — a **third** divergent `export interface SuitabilityResult` with:
  - `layerScores: { A, B, C, D }` **and** `axisContributions: Record<string, number>` (neither matches 16 §1's `layerA..D` + `axes: AxisContribution[]`).
  - `label: … '정보 없음'` (with space).
  - `dataDates: Record<string, string>` — authority uses `{ capability, verifiedAt }[]`.
  - `alternativePois: string[]` (renamed field) — authority uses `alternatives: AlternativePoi[]`.
  - **Missing** `evidenceConfidence`, `coverage`, `knownCriticalBlockers`.
  - Property tests (L213/L224/L230/L237) consume `result.layerScores.*` and `result.axisContributions['continuity']`, baking the divergent shape into test code.

**Impact:** This is exactly the B-1 defect ("a parallel agent team cannot consume an unstable return shape — F1.A, F4, F5 all read this object"). C0 freezes the Domain Contract from doc 12's signature; Q0 writes golden/property tests from doc 13's signature; both differ from the authority F1.A/F4/F5 import. The revision claims B-1 resolved (00 L99, SPEC §13.1) but the resolution was applied to 02/05 only, not 12/13.

**Fix needed (report-only):** Replace the inline interface bodies in `12 §1.1` and `13` with a one-line `import type { SuitabilityResult } from '@domain/policy/types'` + a link to 16 §1, exactly as 02/05 do. Do not re-state fields.

### RC-2 (BLOCKER residue, sub-case of B-1) — label literal `'정보없음'` vs `'정보 없음'` is not single-spelled

Doc 16 §1 (L22) freezes the enum literal as **`'정보없음'` (no space)** and says so explicitly. Yet:
- `12` L72 and `13` L123 declare the type literal as `'정보 없음'` (**with space**) → a TS union-type mismatch against the authority; code typed to one cannot assign the other.
- `13` is **internally** inconsistent: golden/cap rows use `'정보없음'` (L66, L76, L93, L166, L270) but the interface + axe test use `'정보 없음'` (L123, L673, L675).
- (Note: SPEC §7 prose, `01`, `04`, `05`, `09` use the spaced `"정보 없음"` form as **display/prose** Korean, which is acceptable as UI copy — the defect is specifically the two **TS enum-literal** declarations in 12/13 that must match doc 16's `'정보없음'`.)

**Fix needed:** Normalize the enum literal in 12/13 to `'정보없음'` (no space) per 16 §1; leave prose/UI copy untouched.

### RC-3 (MAJOR — scope-cut drift) — `12 §2.2` stream-deliverable table still lists PRE-CUT scope, contradicting SPEC §13.2 and the cut feature docs

SPEC §13.2 states the cuts are **applied** (not merely gated), and 01/05/06/09 present the reduced scope as the MVP baseline. But doc 12's authoritative stream table (the spec agents build deliverables from) still carries the un-cut scope:

- **F1.F — `12` L110:** "**7요소**(…보호자동반…단체모드) … `<PredictableMode>` **7 sub-components**". Also L233 ("예측가능 **7요소**"). Contradicts `01` L129/L144 and `05` L4/L592/L615 (MVP = **3요소**; the other 4 → 발전방향) and SPEC §13.2.
- **F2 — `12` L111 & L234:** "**consent-gated geofence** + map-tap **fallback**" (geofence primary). Contradicts `01` L130/L145/L307 and `06` L368 ("geofence **제거**; map-tap **단독** 트리거"; "GPS API 일절 미호출") and SPEC §13.2 ("F2 geofence 제거 (map-tap only)"). Doc 12 is echoing the superseded SPEC §8 feature line rather than the §13.2 applied cut.
- **F5 — `12` L114 & L237:** "completeness + visitor trends + **시군 히트맵**". Contradicts `09` L10/L58/L570/L585 and `01` L133 ("히트맵·방문자 추세 장식 **제거**; 발전방향") and SPEC §13.2 ("F5 single gap-priority report").
- **F1.D 시간예산 — `12` L106:** "F1.D 시간예산 **6단**". Contradicts `01` L128 and `05` L4/L17/L517 (MVP = **3단**; "6단" = expansion-ceiling label only) and SPEC §13.2/§13.3.

**Note:** doc 12's §13.4 scope-cut-gate callout (L224) *does* correctly enumerate the cut list (7→3, geofence 제거, single gap report, 3단). So doc 12 internally contradicts itself: §2.2 table = pre-cut; §13.4 callout = post-cut. Because SPEC §13.2 says the cuts are *applied* and the feature docs treat 3요소/map-tap-only/single-report/3단 as the unconditional MVP, the §2.2 table is the violating surface. (If the intent is "build 7, auto-cut to 3 at the 7/19 gate," that is a defensible reading — but it is **not** what §13.2 or 01/05/06/09 say, so the table must be reconciled to the applied-cut wording or explicitly annotated as pre-gate baseline.)

### RC-4 (MINOR — first-slice framing residue) — two stale slice framings coexist with the §13.3 single definition

SPEC §13.3 fixes ONE slice: **공산성 F1.A/D → 3-step verified route → HTML diary → 1 F5 gap**, "supersedes all others." This is correctly and identically stated in `12` (L17/L197/L208/L324/L361), `15` (L215/L219/L337), and largely `00` (L99). Residual drift:

- **`00` L119:** "공산성 1 POI가 **F1→F4**를 관통하는 첫 수직 슬라이스" — says F1→F4, dropping the F5 gap that §13.3 includes (F1→F5). Minor wording slip.
- **`01` L331 + `13` L1751:** "공산성·**국립공주박물관**" (two POIs) + "반나절+휠체어·시니어·가족" — this is the **old 6/28 contracts-milestone** framing (two POIs, persona combo), not the §13.3 single-POI 공산성 slice. It coexists with, and is narrower-scoped-differently than, the §13.3 definition. §13.3 says it supersedes all others, so these should align to "공산성 … → HTML diary → 1 F5 gap" or be clearly labelled as the separate contracts-freeze milestone.

Low severity (the canonical §13.3 line is dominant and unambiguous in 12/15), but it is a residual of the "three conflicting definitions" the revision claimed to collapse to one.

---

## CONFIRMED RESOLVED (spot-checked against authority)

- **B-8 locale `zh-CN`** — RESOLVED in the blueprint. All of `00–15` + `16` + SPEC use `zh-CN` uniformly (`01` L130/L134, `02` L93/L535, `03` L340/L730, `06` throughout, `08` L204/L898, `11` L367/L595). No `zh-Hans` remains in any `NN_*.md`. (Residual `zh-Hans` exists **only** in `_research/` source artifacts — `00_SYNTHESIS.md`, `_consistency_check.md`, `D2_tech_stack.md`, `_codex_run.log` — which document the original problem and are out of scope.)
- **M-9 alternatives threshold `<70`** — RESOLVED everywhere. `01` L177/L383, `04` L142, `05` L303/L489/L499/L526, `09`, `12` L77, `13` L73/L162/L248, `16` §10 all use `<70`. The old "75 미만" card is corrected (16 §10 L213 records the correction). `13` L92's "score < 75" is a *different* forced-rule (critical=partial), not the alternatives threshold — correct.
- **Alternatives = verified-card POIs only; TarRlteTar separated** — RESOLVED. `05` L526, `16` §10, `15` U-3, `00` U-3 all carry the M-8 guard ("관련 관광지 (접근성 미검증)" separate list).
- **Lock-preserving guards (M-2/M-5/M-6)** — RESOLVED and single-sourced. `coverage<0.65`→'주의' cap, cert-cannot-cross-boundary, `evidenceConfidence`/`coverage` separate output all live in `16 §5–§7` and are referenced (not re-stated) by `05` L326/L489, `13` L66/L69/L1711–1712, `15` U-3, `00` U-3. Locked numerics (`unknown=0.35`, C `+0.12`, D decay) retained.
- **Scope cuts in feature docs (01/05/06/09)** — RESOLVED. F1.F 3요소 (01 L129, 05 L592), F2 map-tap-only (01 L130, 06 L368), 시간예산 3단 (01 L128, 05 L517), F5 single report (01 L133, 09 L10/L570) all applied in the feature docs. (Drift is confined to doc 12's table — see RC-3.)
- **B-6 first-slice single definition** — RESOLVED in the authoritative surfaces (12/15), with minor residue (RC-4).
- **M-12 / §13.10 directory-ownership collisions** — FULLY RESOLVED in `12 §2.3/§2.4`: `packages/exports`→**CX** dedicated owner (F1-E/F4 import-only); `tests/e2e`→**E0** dedicated owner (I0/Q0 read-only); revalidate/context-refresh cron→**C2** server-only package (not `apps/web`, resolves M-13); root config/lockfile/env/app-routes/migrations each named owner. Stream count reconciled to 18 (L358).
- **B-2/B-4 산식 policy authority + sign-off gate** — RESOLVED. `16` freezes matrices/thresholds/tiers/conflict-rules; ≥30 golden cases + expert sign-off gate enforced (16 §11, 13 L60/L1619/L1637, "정책 검증 중 (β)" badge until signed).
- **B-3/§13.5 evidence-pack DoD** — RESOLVED. String-only `verified_by/date` banned as publish gate (12 L98/L207/L336, 13 L1640, 16 §11).

---

## Summary

The revision resolved the runtime-breaking and structural blockers (locale, directory ownership, threshold, policy authority, evidence-pack DoD) and applied the scope cuts in the feature docs. **It is NOT yet fully internally consistent** because the single most-important blocker, **B-1 (`SuitabilityResult` contract single-sourcing)**, was fixed in `02`/`05` but **left drifting in `12` and `13`** (RC-1, RC-2), and doc `12`'s stream-deliverable table still encodes the **pre-cut** F1.F/F2/F5/시간예산 scope (RC-3). Until `12 §1.1`/`13` defer the contract to doc 16 §1 (no inline re-declaration, no spaced `'정보 없음'` literal) and `12 §2.2` is reconciled to the §13.2 applied cuts, two parallel build streams (C0 Domain Contract, Q0 tests) will freeze a return shape that does not match what F1.A/F4/F5 import — the precise failure mode the revision set out to eliminate.
