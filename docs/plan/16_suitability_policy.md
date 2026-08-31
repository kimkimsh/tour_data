# 16 적합도 산식 정책 — `suitability-policy-v1` (단일 권위 문서)

> **Status:** authoritative for the 4-Layer 적합도 산식 **policy values + return contract**. SPEC §7 owns the *formula shape*; THIS file owns every *number, matrix, threshold, conflict rule, and the `SuitabilityResult` TypeScript contract*. Resolves plan-review blockers **B-1 / B-2** and majors **M-1…M-9**. Created 2026-06-14 after the Claude⇆Codex plan-review + user adjudication (lock-preserving guards).
> **Rule:** other docs (`05`, `03`, `13`) must **link** here, never re-state values. The policy ships as `packages/domain/policy/suitability-policy-v1.json`; this doc is its human spec. **No score code merges until this policy is expert-signed-off and ≥30 golden cases pass.**

---

## 0. Why this document exists

The plan review found the formula's *shape* was specified (SPEC §7) but its *policy* (the actual matrices, thresholds, conflict rules) and its *return contract* were undefined and drifting across docs — making the prize-axis engine (데이터활용 20 + 기획력 30) un-implementable and undefendable. This file freezes both.

**Two-factor design (resolves M-1 double-count):** Layer A = **objective, persona-NEUTRAL** physical/operational inventory of the POI ("does this capability exist here"). Layer B = **persona-fit multiplier** ("do this persona's *critical* needs get met"). The same capability legitimately appears in both with *different roles* (existence vs. fit) — this is a quality × fit model, not erroneous double-counting. B is bounded `[0.75, 1.00]` and uses `min` across personas, so it can only **constrain**, never inflate. A sensitivity note ships with the golden cases.

---

## 1. Authoritative `SuitabilityResult` contract (B-1)

Single source: `packages/domain/policy/types.ts`. Every consumer (F1.A card, F4 diary, F5 dashboard) imports this exact shape; a golden fixture of it runs in each consumer's CI.

```ts
// packages/domain/policy/types.ts — THE authoritative contract. Do not copy values into other docs.
export type SuitabilityLabel = '방문가능' | '주의' | '대체추천' | '정보없음'; // one spelling, no space

export interface AxisContribution {
  axis: 'entry' | 'continuity' | 'amenities' | 'rest' | 'timeContext' | 'safety' | 'verifiedUgc';
  weight: number;        // fixed Layer-A weight (Σ = 1.00)
  rawScore: number;      // 0..1 objective axis score
  weighted: number;      // weight × rawScore
  coverage: number;      // 0..1 fraction of this axis's capabilities that are NOT unknown
}

export interface SuitabilityResult {
  score: number;                       // 0..100 integer (canonical name is `score`, never `total`)
  label: SuitabilityLabel;
  layerA: number;                      // Σ weighted (0..1)
  layerB: number;                      // 0.75..1.00 persona fit (min across personas)
  layerC: number;                      // 1.00..1.12 cert multiplier (capped, guarded)
  layerD: number;                      // 0..1 freshness multiplier
  axes: AxisContribution[];            // per-axis breakdown (drives the F1.A transparent card)
  evidenceConfidence: number;          // 0..100 — SEPARATE from score (M-2/M-6 guard)
  coverage: number;                    // 0..1 — fraction of relevant capabilities with known status
  deductions: { reason: string; capability: string; impact: number }[];
  knownCriticalBlockers: string[];     // capabilities that are critical-AND-unsupported (M-4)
  alternatives: AlternativePoi[];      // only verified-card POIs (M-8); never bare TarRlteTar
  policyVersion: string;               // e.g. 'suitability-policy-v1'
  dataDates: { capability: string; verifiedAt: string }[];
}

export interface AlternativePoi {
  poiId: string;
  hasVerifiedCard: boolean;            // MUST be true to appear here (M-8 guard)
  score: number;
  relation: 'scored-alternative';      // TarRlteTar "related" sites are a SEPARATE list, labelled 접근성 미검증
}
```

The worked example in `05 §4.5` MUST be generated from a golden test and injected — **no hand-maintained numbers** (kills M-3).

---

## 2. Capability catalog (abstract codes ↔ axis ↔ source_field)

Domain code is abstract (never a raw KTO field name → resolves the verify-at-build-time risk). `source_field` is the *hypothesis* to confirm against `detailWithTour2` guide v4.3 + a live probe before freezing.

> **Single vocabulary authority (SPEC §14.2).** The `capability_code` strings in this table are THE canonical vocabulary. The ETL normalizer (`04`), DB catalog (`03`), F1 mapping (`05`), F5 field list (`09`), and tests (`13`) MUST use these exact strings — no `entry.wheelchair` / `MOBILITY_WHEELCHAIR_ENTRY` / `BF_BRAILLE_BLOCK` / raw-`wheelchair` variants. A CI **set-equality** test enforces `{ETL emits} = {this catalog} = {domain switches on} = {F5 reads}`, plus one contract test tracing a single capability KTO→F1→F3→F5 with the same code at every hop. No stream freezes (C0/C1/C2/C4) until both are green. The exported constant lives in `packages/domain/policy/capabilities.ts`.

| capability_code | axis | persona relevance | source_field hypothesis (verify) |
|---|---|---|---|
| `entrance_step_free` | entry | P1a,P1b,P3 | `exit` / `wheelchair` |
| `wheelchair_access` | entry | P1a | `wheelchair` |
| `elevator` | entry | P1a,P1b | `elevator` |
| `path_continuity` | continuity | P1a,P1b,P3 | derived (route_steps slope/step) |
| `internal_step_free` | continuity | P1a | route_steps |
| `tactile_path` | continuity | P2a | `braileblock` |
| `accessible_restroom` | amenities | P1a,P1b,P3 | `restroom` |
| `accessible_parking` | amenities | P1a,P1b | `parking`/BF |
| `rest_seating` | rest | P1b,P3 | BF/UGC/site survey |
| `shade_indoor_rest` | rest | P1b | BF/site survey |
| `stroller` | amenities | P3 | `stroller` |
| `nursing_room` | amenities | P3 | `lactationroom` |
| `audio_guide` | sensory(amenities) | P2a | `audioguide` |
| `braille_print` | sensory | P2a | `brailepromotion`/`bigprint` |
| `guide_human` | sensory | P2a | `guidehuman` |
| `helpdog_ok` | sensory | P2a | `helpdog` |
| `sign_guide` | sensory | P2b | `signguide` |
| `video_caption` | sensory | P2b | `videoguide` |
| `visual_alarm` | sensory | P2b | `signguide`/site survey |
| `crowd_index` | timeContext | all | TatsCnctr (live snapshot) |
| `heat_air_warning` | timeContext | P1b,P3 | KMA/AirKorea snapshot |
| `indoor_alternative` | timeContext | P1b | route_guides flag |
| `emergency_distance` | safety | all | E-Gen dataset |
| `aed_distance` | safety | all | AED dataset |
| `ugc_recent_status` | verifiedUgc | all | barrier_reports (≤30d) |

> Sensory capabilities feed Layer A via the `amenities` axis as an objective inventory; their *persona weighting* (so 시각 needs braille, 청각 needs caption) lives entirely in Layer B (§4). This is the M-1 separation.

---

## 3. Layer A — objective POI inventory (persona-neutral, Σw = 1.00)

```
A = 0.30·entry + 0.18·continuity + 0.15·amenities + 0.12·rest + 0.10·timeContext + 0.08·safety + 0.07·verifiedUgc
```
Each axis `rawScore` = weighted mean of its capabilities' values, **persona-neutral** (every capability counted once, fixed sub-weights in the policy JSON). Capability value map:

| status | value | note |
|---|---:|---|
| `supported` | 1.00 | |
| `partial` | 0.50 | |
| `unsupported` | 0.00 | |
| `unknown` | 0.35 | **locked value retained** (user decision) — guarded by §6 coverage + cap |

- `continuity.rawScore` = **min** of per-segment scores (worst segment, not mean) — a single impassable segment caps continuity.
- `rest.rawScore` derives from `max no-rest travel minutes` vs the persona threshold (§4.3); persona-neutral baseline uses P1b thresholds.
- `safety` uses the 500 m / 1 km cutoffs (§4.4).

---

## 4. Layer B — persona-fit multiplier

```
personaFit(p) = weightedMean over capabilities of (value × tierWeight(p, capability)) / Σ tierWeight
tierWeight: critical = 4 · supporting = 2 · other = 1
B = 0.75 + 0.25 × min over selected personas of personaFit     // 0.75..1.00; min = no persona's barrier is masked
```

### 4.1 Persona × capability tier matrix (v1 — expert to ratify)

`C`=critical(×4) · `S`=supporting(×2) · `·`=other(×1). Personas: P1a 휠체어 · P1b 시니어/만성질환 · P2a 시각 · P2b 청각 · P3 가족·자녀(인지·발달 옵션) · P4 단체 인솔자.

| capability | P1a | P1b | P2a | P2b | P3 |
|---|:--:|:--:|:--:|:--:|:--:|
| entrance_step_free | C | C | · | · | S |
| wheelchair_access | C | S | · | · | S |
| elevator | C | C | · | · | S |
| path_continuity | C | C | S | · | S |
| internal_step_free | C | S | · | · | S |
| tactile_path | · | · | C | · | · |
| accessible_restroom | C | C | S | · | C |
| accessible_parking | S | S | · | · | S |
| rest_seating | S | C | S | · | S |
| shade_indoor_rest | · | C | · | · | S |
| stroller | · | · | · | · | C |
| nursing_room | · | · | · | · | S |
| audio_guide | · | · | C | · | · |
| braille_print | · | · | C | · | · |
| guide_human | S | S | C | S | · |
| helpdog_ok | · | · | C | · | · |
| sign_guide | · | · | · | C | · |
| video_caption | · | · | · | C | S |
| visual_alarm | · | S | · | C | · |
| crowd_index | S | C | S | · | C |
| heat_air_warning | · | C | · | · | C |
| indoor_alternative | S | C | · | · | S |
| emergency_distance | S | C | S | S | S |
| aed_distance | S | C | · | · | · |
| ugc_recent_status | S | S | S | S | S |

> **인지·발달 옵션 (P3 sub-mode):** does not add a persona; it raises `rest_seating`, `crowd_index`, `indoor_alternative` to `C` and activates the 예측가능 백제 UI (F1.F). **P4 단체:** inherits the group's strictest member's tiers + raises `rest_seating`/`accessible_restroom` to `C`. **외국인 횡단:** no tier change; adds language-availability as a separate display flag, not a suitability input.

### 4.2 Multi-persona rule
`B = 0.75 + 0.25 × min(personaFit)` across all selected personas — the 할아버지(P1a+P1b) + 손녀(P3) case cannot let the granddaughter's high fit mask the grandfather's barrier.

### 4.3 Rest thresholds (minutes of continuous travel before a required rest)
P1a 25 · **P1b 15** · P2a 30 · P2b 40 · P3 20 · P3+인지옵션 15 · P4 15. `rest.rawScore = clamp(threshold / actualMaxNoRestSegment, 0, 1)`.

### 4.4 timeContext & safety mappings
- crowd_index (TatsCnctr 0–100): `≤40→1.0 · 41–70→0.6 · 71–100→0.2`.
- heat/air: 특보 발효 또는 PM2.5 '나쁨' 이상 → axis ×0.5 unless `indoor_alternative` supported.
- safety: emergency ≤500 m →1.0 · ≤1 km →0.6 · >1 km →0.2; AED ≤300 m →1.0 · ≤1 km →0.5 · else 0.

---

## 5. Layer C — certification (capped, guarded) (M-5 guard)

```
C = 1.00 + min(0.12, Σ[BF 예비 +0.02 | 일반 +0.05 | 우수 +0.08] + [열린관광지 +0.04])   // 1.00..1.12
```
KQ = metadata only (never a score input). **Guard (user-approved):** certification alone **cannot move the label across a band boundary** — if removing Layer C would change the label, the label is computed at `C = 1.00` and certification is shown only as a confidence/credibility badge. (Locked +0.12 value retained.)

## 6. Layer D — freshness (guarded) (M-2 / M-6 guards)

```
D = weightedMean(per-fact freshness: ≤90d 1.00 / ≤365d 0.90 / >365d 0.75)   // locked values retained
```
Approved UGC refreshes ONLY the related capability's date, not the POI's. **Guards (user-approved):**
- **`evidenceConfidence` (0–100) is emitted separately** from `score` — staleness and `unknown` lower *confidence*, surfaced as a distinct "데이터 신뢰도" chip on the card, so old/missing data reads as *uncertainty*, not *unsuitability*.
- **Coverage cap (M-2 · two-tier per SPEC §14.3):** when criticals are all known but `coverage < 0.65`, the label is capped at **'주의'** regardless of score (sparse data can never present as '방문가능'); this case does **not** become `정보없음` — that is reserved for a critical-`unknown` (§9 step 2). `unknown` keeps its 0.35 value but cannot, via low coverage, produce a high-confidence high score. §9 step 3 is the single place this cap is applied (resolves the prior §6-vs-§9 contradiction).

## 7. evidenceConfidence & coverage

```
coverage = (relevant capabilities with status ≠ unknown) / (relevant capabilities)
evidenceConfidence = round(100 × coverage × meanFreshness × (1 if any second-approved evidence else 0.85))
```
Displayed beside the score; never multiplied into it.

---

## 8. Multi-source conflict resolution (was undefined)

Precedence when sources disagree on a capability status: **second-approved field survey (evidence pack) > BF/공공 인증 dataset > KTO `detailWithTour2` > single approved UGC > unverified UGC.** A single approved UGC report can **flag for re-verification** and refresh a date, but **cannot alone flip an authoritative `supported`↔`unsupported`** (M-7) — promotion to authoritative requires either a field-survey evidence pack or ≥2 corroborating approved reports from distinct reporters. Conflicts are logged to `audit_events`.

## 9. Forced rules & label ordering (M-4)

Evaluate in this order; surface BOTH a known blocker and an evidence gap if both exist:
1. **Known critical blocker first:** any selected-persona `critical` capability = `unsupported` → label **`대체추천`**, `score ≤ 49`, list it in `knownCriticalBlockers`.
2. **Then critical-unknown gap:** else if any selected-persona `critical` = `unknown` → label **`정보없음`** (현장 확인 필요), split absence reason (a) 본질 제약 / (b) 운영자 미입력. (SPEC §14.3: low overall `coverage` alone no longer forces `정보없음` — it is handled by the §6 주의-cap in step 3.)
3. Else by score: `75–100 방문가능 · 50–74 주의 · 0–49 대체추천` — **then apply the §6 coverage cap**: if `coverage < 0.65` (criticals all known) the label is capped at **`주의`** (never `방문가능`). This is the SPEC §14.3 two-tier resolution (critical-`unknown` ⇒ `정보없음`; criticals-known-but-sparse ⇒ `주의`-cap), making the label deterministic — exactly one label per input.
4. `score < 70` → also populate `alternatives` (§10).
Null capability ⇒ `unknown` + "정보 없음 — 현장 확인 필요"; **never infer a value.**

## 10. Alternatives policy (M-8 / M-9)

- Trigger at **`score < 70`** (single constant; boundary tests `69/70/74/75`). The `05 §2.4` card's "75 미만" is corrected to `<70`.
- `alternatives[]` contains **only POIs that have a verified accessibility card and a computed score** (the 6 MVP POIs). `TarRlteTar` "related sites" are shown in a **separate** list explicitly labelled **"관련 관광지 (접근성 미검증)"** with a warning — never as accessibility-safe substitutes.

---

## 11. Golden cases & expert sign-off gate (B-2 / B-4)

- `packages/domain/policy/__golden__/` holds **≥30 cases** covering: each persona alone; the D.1 multi-persona (P1a+P1b+P3); each forced-rule branch; coverage `<0.65` (**two §14.3 fixtures — critical-`unknown` ⇒ `정보없음` vs criticals-known + coverage 0.64 ⇒ `주의`-cap — each asserting exactly one label**); Layer C boundary-flip (74↔75 guard); stale-data confidence; multi-source conflict; alternatives at `69/70`. Each case = `{input, expected SuitabilityResult}`, regenerated to feed the doc worked-example.
- **Sign-off gate:** the v1 policy JSON (matrices, thresholds, tiers) must be reviewed and signed by a 관광약자 접근성 전문가 (per SPEC §11 "non-negotiable") **before** any consumer ships scores. Recorded in `15` validation schedule (July demo-pair pass). Until signed, the engine runs but renders a **"정책 검증 중 (β)"** badge.
- Policy is **versioned** (`policyVersion` in every result); a policy change requires a new version + golden re-baseline.
