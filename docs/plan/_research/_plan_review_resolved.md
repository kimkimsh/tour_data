# Plan-review recheck residues — RESOLVED (2026-06-15)

The post-revision recheck (`_plan_review_recheck.md`) flagged 4 residues. All fixed + verified by grep:

| ID | Residue | Resolution |
|---|---|---|
| **RC-1** (B-1 residue) | docs 12 & 13 re-declared divergent `SuitabilityResult` interfaces | Both now `export type { SuitabilityResult } from '@modu/domain/policy/types'` — the interface is declared **only** in `16_suitability_policy.md` (authority). Doc 14's return-field list aligned to the canonical shape. |
| **RC-2** (B-1 residue) | label enum literal `'정보 없음'` (spaced) in 12/13 TS + a JSX prop | Removed with the inline interfaces; the typed `suitabilityLabel` prop normalized to `'정보없음'` (no space). Prose/UI copy may still use the spaced display form. |
| **RC-3** (scope-cut drift) | doc 12 §2.2 stream table still listed pre-cut scope (F1.F 7요소, F2 geofence-primary, F5 히트맵, 시간예산 6단) | Table reconciled to SPEC §13.2: F1.F 3요소, F2 map-tap only, F5 single gap-priority report, 시간예산 MVP 3단; the §2.3/§2.4 quick-table rows too. |
| **RC-4** (first-slice framing) | 00 said slice traverses "F1→F4"; 01 used the two-POI framing | 00 → "F1→F5 (… F5 갭 1건)"; 01 → "공산성 단일 POI … SPEC §13.3". |

Doc-13 property tests updated to the canonical contract (`layerA/B/C`, `axes[].rawScore`). Verified: the authoritative `interface SuitabilityResult` exists in `16` only; no `layerScores`/`axisContributions`/`alternativePois` in any doc; no `zh-Hans`; no `<75` alternatives threshold; no `F1→F4` first-slice. **The plan-review blockers (B-1…B-8) are closed.**

---

**v6 (2026-06-15):** A sixth review pass (Claude 6-lens + independent Codex `gpt-5.5`/`xhigh` + 8 live web re-verifications) ran on top of this. New findings + resolutions are recorded in [`_plan_review_v6_findings.md`](./_plan_review_v6_findings.md) (and Codex raw in `_codex_review_v6_raw.md`), authoritatively in **SPEC §14**. Two locked-decision adjudications applied: coverage<0.65 **two-tier label** (§14.3) and **anonymous-auth UGC allowed** (§14.4). Highest-leverage new fix: the `capability_code` single-vocabulary unification (§14.2) — propagated into docs 16/04/03/09/13.
