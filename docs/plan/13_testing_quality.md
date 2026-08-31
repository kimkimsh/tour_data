# 13 테스트·품질·CI (Testing, Quality & CI)

> **Authority**: SPEC.md §4·§9·§10·§11 확장. 모든 결정은 SPEC을 우선한다.
> **Golden rule**: CI gate가 통과된 코드만 `main` 브랜치에 합류하고, 수동 스크린리더 과업 성공이 Release Candidate 승인의 필요충분조건이다.

---

## 1. 테스트 전략 개요

### 1.1 품질 목표 (contest scoring 직결)

| 심사 항목 | 테스트 커버리지 연결 |
|---|---|
| 기획력 30 | `calculateSuitability` 골든 파일 — 산식 결과 재현 가능성 |
| 완성도 30 | D.1 E2E 골든 플로우 통과 + Lighthouse perf ≥ 0.90 |
| 데이터활용 20 | KTO contract 테스트 — fixture 기반 필드 매핑 검증 |
| 발전성 20 | 아키텍처 경계 테스트 (domain이 Next.js를 import하지 않음) |
| 지역특화 가점 +2 | 6-POI 콘텐츠 패키지 Zod 검증 통과 |
| PT 완성도 | 데모 resilience 테스트 — snapshot data·오프라인·fallback |
| PT 실용성 | 수동 스크린리더 과업 성공 (NVDA + 센스리더 + VoiceOver + TalkBack) |

### 1.2 테스트 피라미드

```
                    ┌─────────────────────┐
                    │  E2E Playwright     │  ~20 시나리오
                    │  (D.1 golden flow   │  (모든 PR, 30분 max)
                    │   + a11y 라우트 스캔) │
                    ├─────────────────────┤
                    │  통합·계약 테스트    │  ~40 케이스
                    │  (KTO fixture,      │  (모든 PR)
                    │   DB RLS, Supabase) │
                    ├─────────────────────┤
                    │  컴포넌트 + jest-axe │  ~120 케이스
                    │  (각 feature 컴포넌트│  (모든 PR)
                    │   RTL + axe 조합)   │
                    ├─────────────────────┤
                    │  도메인 유닛 테스트  │  ~200 케이스
                    │  (순수 TS, 빠름,    │  (모든 commit)
                    │   골든 파일 포함)   │
                    └─────────────────────┘
```

**레이어 책임 분리:**
- **도메인 유닛**: `packages/domain/` 순수 TS — 프레임워크 0, Node.js globals 0, 결정론적 입출력
- **컴포넌트**: `apps/web/src/features/**` — RTL + jest-axe, jsdom, 시각 계산 제외
- **통합·계약**: KTO fixture 응답 vs Zod 스키마; Supabase RLS 정책 SQL; DB 마이그레이션 smoke
- **E2E**: 실제 Next.js dev server + Playwright — 라우팅·포커스·오디오 재생·PDF 다운로드 트리거

---

## 2. 도메인 유닛 테스트 (`packages/domain`)

### 2.1 `calculateSuitability` 골든 파일 테스트

`calculateSuitability`는 4-Layer 산식의 유일한 구현체(SPEC §7)이며, 결과 재현 가능성이 기획력 30점의 핵심 증거다.

#### 골든 입력 픽스처 (`packages/test-fixtures/suitability/`)

`16_suitability_policy.md §11`에 따라 **최소 30개** 케이스가 필요하다. 정책 전문가 sign-off 전까지 엔진은 동작하지만 UI는 **"정책 검증 중 (β)"** 배지를 렌더링한다. → [정책 값·임계값 전체 목록은 `16_suitability_policy.md`를 참조]

| 파일 (케이스) | 설명 | 검증 포인트 |
|---|---|---|
| `gongsan-wheelchair-halfday` | 공산성, P1a, 반나절, full fact set | score 75–100, label `방문가능` |
| `gongsan-wheelchair-critical-missing` | 공산성, P1a, 진입 `unsupported` | score ≤ 49, label `대체추천` |
| `buyeo-unknown-coverage-low` | 부소산성, coverage < 0.65 | label `정보없음` (coverage cap — §16 §6) |
| `gongsan-multi-persona` | P1a + P3, lowest personaFit | B = 0.75 + 0.25 × min(personaFits) |
| `layer-c-cap` | BF 우수 + 열린관광지 | C ≤ 1.12; label boundary guard |
| `layer-c-boundary-guard` | C 없이 score=74, with C score=75 | label은 C=1 기준 유지 (`주의`) — 인증 단독 경계 이동 금지 (§16 §5) |
| `layer-d-stale-365` | 모든 fact > 365일 | D = 0.75 평균 |
| `zero-score-clamp` | 모든 critical unsupported | score = 0, clamp 확인 |
| `alternatives-at-69` | score = 69 | alternatives 목록 비어있지 않음 |
| `alternatives-at-70` | score = 70 | alternatives 목록 비어있음 (< 70 트리거) |
| `boundary-74` | score = 74 | label `주의` |
| `boundary-75` | score = 75 | label `방문가능` |
| `coverage-0.64` | coverage = 0.64 | label 강제 `정보없음` 또는 `주의` 이하 cap |
| `coverage-0.65` | coverage = 0.65 | cap 해제 — score 기반 label 적용 |
| `known-blocker-and-unknown` | critical unsupported + critical unknown 동시 | `knownCriticalBlockers` 및 evidence gap 둘 다 표면화 |
| `evidence-confidence-stale` | 모든 fact > 365일, coverage = 0.8 | evidenceConfidence 낮음, score와 별도 표시 |
| `p1b-senior-solo` | P1b 시니어 단독 | rest 임계값 15분 적용 |
| `p2a-visually-impaired` | P2a 시각 단독, tactile_path unsupported | label `대체추천` (critical) |
| `p2b-hearing-impaired` | P2b 청각 단독, sign_guide unknown | coverage 영향 확인 |
| `p3-family` | P3 가족, stroller unsupported | score 영향 확인 |
| `d1-multi-persona` | P1a + P1b + P3 (D.1 시나리오) | min(personaFit) 적용, 최저 fit 검증 |
| `crowd-high-no-indoor` | TatsCnctr 71–100, indoor_alternative unsupported | timeContext axis 페널티 |
| `aed-far` | AED 거리 > 1 km | safety axis 0점 |
| `single-ugc-approved` | UGC 1건 승인 | authoritative status 변경 불가 (§16 §8) |
| `ugc-date-refresh-only` | UGC 1건 — fact date만 갱신 | score 변동 ≤ D layer 영향 |
| `multi-source-conflict` | field-survey vs KTO 불일치 | field-survey 우선 적용 (§16 §8) |
| `zero-certifications` | 인증 0건 | C = 1.00, score 정상 계산 |
| `partial-capabilities` | 모든 capability `partial` | score 중간 범위, label `주의` 또는 `방문가능` |
| `p1a-critical-partial` | P1a critical = partial | score < 75 가능; ≤ 49 강제 없음 |
| `all-unknown` | 모든 capability `unknown` | coverage 0, label `정보없음` |

#### TypeScript 인터페이스 (테스트 입력)

```typescript
// packages/domain/accessibility/types.ts

export type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';

export interface AccessibilityFact {
  capabilityCode: string;
  status: CapabilityStatus;
  verifiedAt: string; // ISO 8601
  source: string;
  sourceField: string;
}

export interface SuitabilityInput {
  poiFacts: AccessibilityFact[];
  routeGuide: RouteGuide | null;
  personaIds: PersonaId[];
  timeContext: TimeContext;
  certifications: Certification[];
  ugcSummary: UgcSummary;
  calculationDate: string; // ISO 8601
  policyVersion: string;
}

// SuitabilityResult — AUTHORITATIVE shape is packages/domain/policy/types.ts (16_suitability_policy.md §1).
// Tests import it; this doc does NOT redeclare it. Canonical fields: score, label ('정보없음' — no space),
// layerA, layerB, layerC, layerD, axes[] (AxisContribution[] — NOT a Record), evidenceConfidence, coverage,
// deductions, knownCriticalBlockers, alternatives (AlternativePoi[]; verified-card only), policyVersion, dataDates.
export type { SuitabilityResult } from '@modu/domain/policy/types';
```

#### 골든 파일 테스트 패턴

```typescript
// packages/domain/accessibility/__tests__/calculateSuitability.golden.test.ts

import { calculateSuitability } from '../calculateSuitability';
import { readGoldenInput, matchGoldenOutput } from '../../test-fixtures/utils';

const GOLDEN_DIR = 'packages/test-fixtures/suitability';

// Minimum 30 cases required before policy sign-off (16_suitability_policy.md §11).
// Until expert sign-off, score rendering shows a "정책 검증 중 (β)" badge.
describe('calculateSuitability golden files', () => {
  const cases = [
    // Core forced-rule branches
    'gongsan-wheelchair-halfday',
    'gongsan-wheelchair-critical-missing',
    'buyeo-unknown-coverage-low',
    'gongsan-multi-persona',
    'layer-c-cap',
    'layer-d-stale-365',
    'zero-score-clamp',
    // Boundary tests (doc-16 §10 / §11 requirement)
    'alternatives-at-69',    // score=69 → alternatives populated
    'alternatives-at-70',    // score=70 → alternatives empty (< 70 trigger)
    'boundary-74',           // label 주의
    'boundary-75',           // label 방문가능
    // Coverage cap (doc-16 §6)
    'coverage-0.64',         // forced 정보없음/주의 cap
    'coverage-0.65',         // cap released
    // Layer C boundary-guard (doc-16 §5)
    'layer-c-boundary-guard',
    // Evidence confidence
    'evidence-confidence-stale',
    // Per-persona forced rules
    'known-blocker-and-unknown',
    'p1b-senior-solo',
    'p2a-visually-impaired',
    'p2b-hearing-impaired',
    'p3-family',
    'd1-multi-persona',
    // timeContext & safety
    'crowd-high-no-indoor',
    'aed-far',
    // UGC & multi-source
    'single-ugc-approved',
    'ugc-date-refresh-only',
    'multi-source-conflict',
    // Capability status combinations
    'zero-certifications',
    'partial-capabilities',
    'p1a-critical-partial',
    'all-unknown',
  ];

  cases.forEach((name) => {
    it(`golden: ${name}`, () => {
      const input = readGoldenInput(`${GOLDEN_DIR}/${name}.input.json`);
      const result = calculateSuitability(input);
      matchGoldenOutput(result, `${GOLDEN_DIR}/${name}.output.json`);
    });
  });
});
```

**골든 파일 갱신 정책:** `UPDATE_GOLDEN=1 pnpm test:domain` 실행 시에만 `.output.json` 덮어쓰기. CI에서는 갱신 금지. 갱신 PR은 반드시 산식 변경 이유를 커밋 메시지에 기술.

#### 핵심 산식 속성 테스트 (property-based)

```typescript
// 산식 불변성 속성 — fast-check 또는 수동 parametrize

it('C layer is capped at 1.12', () => {
  // BF 우수(+0.08) + 열린관광지(+0.04) = +0.12, 추가 인증이 있어도 max
  const result = calculateSuitability(withMaxCertifications(baseInput));
  expect(result.layerC).toBeLessThanOrEqual(1.12);
});

it('critical unsupported forces score ≤ 49', () => {
  const result = calculateSuitability(withCriticalUnsupported(baseInput, 'entry'));
  expect(result.score).toBeLessThanOrEqual(49);
});

it('multi-persona uses lowest personaFit', () => {
  const single = calculateSuitability(withPersonas(['P1a']));
  const multi = calculateSuitability(withPersonas(['P1a', 'P3']));
  expect(multi.layerB).toBeLessThanOrEqual(single.layerB);
});

it('continuity uses worst segment, not average', () => {
  // 구간 scores [1.0, 0.0, 1.0] → continuity = 0.0
  const result = calculateSuitability(withSegments([1.0, 0.0, 1.0]));
  expect(result.axes.find((a) => a.axis === 'continuity')!.rawScore).toBe(0);
});

it('unknown status maps to 0.35', () => {
  // 알려진 상수 검증
  const result = calculateSuitability(allUnknownInput);
  // coverage = unknownCount / totalCount
  expect(result.layerA).toBeLessThan(0.36 * /* weight sum */ 1.0);
});

it('score is clamped to 0–100', () => {
  const result = calculateSuitability(extremeInput);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(100);
});

// --- doc-16 policy gates (§10 / §11) ---

it('alternatives trigger at score < 70, not < 75 (boundary: 69)', () => {
  const result = calculateSuitability(withScore(69));
  expect(result.alternatives.length).toBeGreaterThan(0);
});

it('alternatives NOT triggered at score = 70 (boundary: 70)', () => {
  const result = calculateSuitability(withScore(70));
  expect(result.alternatives).toHaveLength(0);
});

it('label boundary 74 → 주의', () => {
  const result = calculateSuitability(withScore(74));
  expect(result.label).toBe('주의');
});

it('label boundary 75 → 방문가능', () => {
  const result = calculateSuitability(withScore(75));
  expect(result.label).toBe('방문가능');
});

it('coverage < 0.65 caps label at 주의 regardless of score (doc-16 §6)', () => {
  const result = calculateSuitability(withCoverage(0.64, /* score= */ 80));
  expect(['주의', '정보없음']).toContain(result.label);
  expect(result.label).not.toBe('방문가능');
});

it('coverage = 0.65 lifts cap — label determined by score (doc-16 §6)', () => {
  const result = calculateSuitability(withCoverage(0.65, /* score= */ 80));
  expect(result.label).toBe('방문가능');
});

it('Layer C alone cannot move label across boundary (doc-16 §5 guard)', () => {
  // Without C: score = 74 → 주의; with C (+0.12): score = 82.88 → 방문가능?
  // Guard: compute label at C=1.00 when C is the sole boundary-mover
  const withC = calculateSuitability(withBaseScore(74, { withCertification: true }));
  const withoutC = calculateSuitability(withBaseScore(74, { withCertification: false }));
  // If removing C would change the label, label must equal the C=1 label
  if (withC.label !== withoutC.label) {
    expect(withC.label).toBe(withoutC.label); // guard: cert alone cannot flip label
  }
});

it('evidenceConfidence is emitted separately from score (doc-16 §7)', () => {
  const result = calculateSuitability(allUnknownInput);
  expect(result).toHaveProperty('evidenceConfidence');
  expect(result).toHaveProperty('coverage');
  // evidenceConfidence is independent — stale/unknown lowers confidence, not score directly
  expect(typeof result.evidenceConfidence).toBe('number');
});
```

### 2.2 `buildItinerary` 유닛 테스트

```typescript
// packages/domain/itinerary/__tests__/buildItinerary.test.ts

describe('buildItinerary', () => {
  it('selects from curated itinerary_templates, never computes route', () => {
    const result = buildItinerary({ budget: '반나절', personas: ['P1a'] });
    expect(result.source).toBe('template');
    expect(result.templateId).toBeTruthy();
  });

  it('persona time multiplier uses max, not product', () => {
    // P1b 시니어 휴식 25% + P3 가족 식사 20% → max = 25%, not 25% × 20%
    const p1b = buildItinerary({ budget: '당일', personas: ['P1b'] });
    const p3 = buildItinerary({ budget: '당일', personas: ['P3'] });
    const multi = buildItinerary({ budget: '당일', personas: ['P1b', 'P3'] });
    expect(multi.restRatio).toBe(Math.max(p1b.restRatio, p3.restRatio));
  });

  it('반나절→1박2일 expansion stays in same template family', () => {
    const half = buildItinerary({ budget: '반나절', personas: ['P1a'], anchorPoi: 'gongsan' });
    const overnight = buildItinerary({ budget: '1박2일', personas: ['P1a'], anchorPoi: 'gongsan' });
    expect(overnight.templateFamily).toBe(half.templateFamily);
  });
});
```

### 2.3 `buildDiaryDocument` 출력 골든 파일

PDF/BRF/GPX 출력은 바이트 레벨이 아닌 구조 레벨로 검증. 실제 파일 바이너리 골든은 `packages/test-fixtures/exports/` 에 커밋하고, 매 빌드에서 SHA-256 체크섬으로 비교.

```typescript
// packages/exports/__tests__/buildDiaryDocument.golden.test.ts

describe('export golden files', () => {
  it('학생PDF structure matches golden', async () => {
    const doc = buildDiaryDocument(SAMPLE_DIARY_INPUT, 'student-pdf');
    const sha = await sha256(doc.buffer);
    expect(sha).toBe(readGoldenChecksum('student-pdf-gongsan.sha256'));
  });

  it('BRF braille output matches golden', async () => {
    const doc = buildDiaryDocument(SAMPLE_DIARY_INPUT, 'brf');
    const sha = await sha256(doc.buffer);
    expect(sha).toBe(readGoldenChecksum('diary-gongsan.brf.sha256'));
  });

  it('GPX waypoints match golden', async () => {
    const gpx = buildDiaryDocument(SAMPLE_DIARY_INPUT, 'gpx');
    // XML 파싱 후 waypoint count와 첫 번째 waypoint lat/lon 검증
    const parsed = parseGpx(gpx.text);
    expect(parsed.wpts).toHaveLength(EXPECTED_WAYPOINT_COUNT);
    expect(parsed.wpts[0].lat).toBeCloseTo(GONGSAN_ENTRY_LAT, 5);
  });

  it('쉬운글PDF has no image-only pages (HTML fallback exists)', async () => {
    const easyPdf = buildDiaryDocument(SAMPLE_DIARY_INPUT, 'easy-pdf');
    expect(easyPdf.htmlFallback).toBeTruthy();
  });
});
```

**골든 파일 갱신 트리거:** `packages/exports` 소스 변경 PR에서만 `UPDATE_GOLDEN=1` 허용. 심사 1주 전(9/23 이후) 골든 파일 freeze — 이후 변경은 PM 승인 필요.

### 2.4 `moderateReport` 도메인 테스트

```typescript
describe('moderateReport state machine', () => {
  it('pending → approved transition emits broadcastPayload', () => {
    const result = moderateReport({ current: 'pending', action: 'approve', adminId: 'a1' });
    expect(result.newStatus).toBe('approved');
    expect(result.broadcastPayload).toBeDefined();
  });

  it('approved → cannot auto-recalc suitability (no-op)', () => {
    const result = moderateReport({ current: 'approved', action: 'approve', adminId: 'a1' });
    // SPEC §8 F3: no auto-recalc
    expect(result.suitabilityRecalcTriggered).toBe(false);
  });

  it('reporter trust score affects ugcSummary weight', () => {
    const high = moderateReport({ ..., reporterTrustScore: 0.9 });
    const low = moderateReport({ ..., reporterTrustScore: 0.1 });
    expect(high.ugcWeight).toBeGreaterThan(low.ugcWeight);
  });
});
```

---

## 3. KTO API 계약 테스트 (`tests/contract/`)

### 3.1 Fixture 기반 계약 테스트 전략

**원칙 (SPEC §6 / M-16):** PR CI 및 weekly CI에서 실제 KTO API를 호출하지 않는다. 저장된 실제 응답 fixture를 사용해 타입 파싱 계약과 스키마 drift를 검증한다. 라이브 API 프로브(detailWithTour2 field-key 확인, lDong 코드 부트스트랩, signguCd 검증 등)는 **별도 manual/scheduled integration workflow** (`.github/workflows/kto-integration.yml`) 에서만 실행하고, PR CI에는 포함하지 않는다. 이 workflow는 `workflow_dispatch` 또는 주간 스케줄로 트리거하며, 실패해도 PR 차단 없이 알림만 발송한다.

#### Fixture 수집 절차

```bash
# scripts/ingest/capture-fixtures.sh
# 개발 시 1회 실행 — CI에서는 실행 금지
KTO_SERVICE_KEY=$DEV_KEY pnpm run capture-fixtures \
  --ops "detailWithTour2,areaBasedList2,ldongCode2,lclsSystmCode2,tatsCnctrRateList" \
  --content-ids "264736,126508,126327,1970009698,126382,126375" \
  --out packages/test-fixtures/kto/
```

Fixture 파일 구조:

```
packages/test-fixtures/kto/
  detailWithTour2/
    gongsan-264736.json          # 공산성 raw response (실제 API 응답)
    buyeo-busosan-1970009698.json
    gongsan-264736.error-03.json # no-data 오류 응답 (XML 본문)
    gongsan-264736.error-22.json # over-traffic (XML 본문)
  areaBasedList2/
    chungnam-area-page1.json
  ldongCode2/
    all-codes.json
  tatsCnctrRateList/
    gongju-34800.json            # signguCd 확정 후 갱신
```

### 3.1a ETL Publish Gate 1 — 필드 검증 정책 (M-17)

`etl:validate` 단계의 Gate 1은 **필수 envelope 필드**와 **선택 capability 필드**를 분리하여 검증한다. KTO API는 값이 없는 필드를 응답에서 생략하므로(empty-field omission), capability 필드 누락은 오류가 아니라 `unknown` 상태로 처리한다.

| 필드 분류 | 예시 | 누락 시 처리 |
|---|---|---|
| 필수 envelope | `contentId`, `contentTypeId`, `title`, `addr1` | Gate 실패 — publish 차단 |
| 선택 capability | `wheelchair`, `elevator`, `restroom`, ... | `unknown` 상태로 수용 — 차단 없음 |
| 알 수 없는 키 | fixture에 없던 신규 필드 | **log + warn** (콘솔 + CI 어노테이션); **publish는 차단하지 않음** — 단, 스키마 drift 테스트(`kto-schema-drift.contract.test.ts`)가 이를 감지해 PR 주석으로 통보 |

```typescript
// packages/etl/src/validatePublishGate1.ts

export function validatePublishGate1(rawRecord: unknown): Gate1Result {
  // 필수 envelope 필드 부재 → throw (publish 차단)
  const envelope = EnvelopeSchema.parse(rawRecord);

  // 선택 capability 필드: passthrough + unknown 기본값
  const capabilities = CapabilitySchema.passthrough().safeParse(rawRecord);

  // 알 수 없는 키 감지 + warn (차단 안 함)
  const knownKeys = new Set([...ENVELOPE_KEYS, ...CAPABILITY_KEYS]);
  const unknownKeys = Object.keys(rawRecord as object).filter(k => !knownKeys.has(k));
  if (unknownKeys.length > 0) {
    logger.warn('KTO response contains unknown capability keys — review for schema drift', { unknownKeys });
    // CI 어노테이션으로도 기록
    reportSchemaDrift(unknownKeys);
  }

  return { envelope, capabilities: capabilities.data ?? {}, unknownKeys };
}
```

#### 계약 테스트 파일

```typescript
// tests/contract/kto-detailWithTour2.contract.test.ts

import { parseDetailWithTour2Response } from 'packages/kto-client/parsers';
import fixture from 'packages/test-fixtures/kto/detailWithTour2/gongsan-264736.json';

describe('KTO detailWithTour2 contract', () => {
  it('parses wheelchair field as string (not boolean)', () => {
    const parsed = parseDetailWithTour2Response(fixture);
    expect(typeof parsed.items[0].wheelchair).toBe('string');
  });

  it('maps braileblock field to capability_code tactile_path (16 §2 canonical, SPEC §14.2)', () => {
    const parsed = parseDetailWithTour2Response(fixture);
    const fact = parsed.accessibilityFacts.find(
      (f) => f.capabilityCode === 'tactile_path'
    );
    expect(fact).toBeDefined();
    expect(fact!.sourceField).toBe('braileblock');
  });

  it('handles XML error body (code 22 over-traffic)', () => {
    const errorFixture = readFixture('detailWithTour2/gongsan-264736.error-22.json');
    const result = parseRawKtoResponse(errorFixture.rawBody);
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('22');
  });

  it('every fact carries source and sourceField', () => {
    const parsed = parseDetailWithTour2Response(fixture);
    parsed.accessibilityFacts.forEach((fact) => {
      expect(fact.source).toBeTruthy();
      expect(fact.sourceField).toBeTruthy();
    });
  });
});
```

```typescript
// tests/contract/kto-ldongCode2.contract.test.ts

describe('ldongCode2 contract', () => {
  it('충남 lDong codes are fetched, never hardcoded', () => {
    const parsed = parseLdongCode2Response(ldongFixture);
    // 코드값은 fixture에서만 — 소스 코드에서 '44150' 같은 하드코딩 검출
    expect(parsed.codes.length).toBeGreaterThan(0);
    // 소스 파일에서 lDong 하드코딩 탐지 (별도 grep 테스트)
  });
});
```

```typescript
// tests/contract/kto-hardcode-guard.test.ts

import { execSync } from 'child_process';

it('no hardcoded lDong area codes in source', () => {
  // SPEC §6: "never hardcode 44/150/760"
  const result = execSync(
    'grep -rn "44150\\|44760\\|44800" packages/kto-client/src packages/domain/src',
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
  expect(result).toBe('');
});

it('no hardcoded KTO area legacy codes in *2 service paths', () => {
  const result = execSync(
    'grep -rn "areaCode.*=.*["\']34["\']" packages/',
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  ).trim();
  expect(result).toBe('');
});
```

```typescript
// tests/contract/kto-schema-drift.contract.test.ts
// Runs in PR CI (signed fixtures only — no live calls). Detects new keys vs the known
// capability catalog; does not block publish, but must not be silently suppressed.

import { validatePublishGate1 } from 'packages/etl/src/validatePublishGate1';
import fixture from 'packages/test-fixtures/kto/detailWithTour2/gongsan-264736.json';

describe('Gate 1 field-classification tests (M-17)', () => {
  it('required envelope fields pass Gate 1', () => {
    const result = validatePublishGate1(fixture.items[0]);
    expect(result.envelope.contentId).toBeTruthy();
  });

  it('omitted optional capability field does not fail Gate 1', () => {
    const stripped = { ...fixture.items[0] };
    delete (stripped as any).elevator; // simulate API empty-field omission
    expect(() => validatePublishGate1(stripped)).not.toThrow();
  });

  it('unknown keys are warned, not thrown', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const withExtra = { ...fixture.items[0], newFutureField: 'value' };
    const result = validatePublishGate1(withExtra);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown capability keys'), expect.any(Object));
    expect(result.unknownKeys).toContain('newFutureField');
    warnSpy.mockRestore();
  });
});
```

### 3.2 Odii 계약 테스트

```typescript
// tests/contract/odii-story.contract.test.ts

describe('Odii storyLocationBasedList contract', () => {
  it('uses xCoord/yCoord params, not mapX/mapY', () => {
    // SPEC §6: Odii xCoord/yCoord/langCode/radius(m) 고유 파라미터
    const req = buildOdiiRequest({ lat: 36.46, lon: 127.12, radius: 500 });
    expect(req.params).toHaveProperty('xCoord');
    expect(req.params).toHaveProperty('yCoord');
    expect(req.params).not.toHaveProperty('mapX');
  });

  it('handles missing lclsSystm gracefully', () => {
    const item = parseOdiiItem(odiiFixtureWithoutLclsSystm);
    expect(item.category).toBeNull(); // Odii has own themeNm
    expect(item.themeNm).toBeTruthy();
  });
});
```

### 3.3 콘텐츠 패키지 계약 테스트 (6-POI Zod 스키마)

```typescript
// tests/contract/content-package.contract.test.ts

import { PoiContentPackageSchema } from 'packages/content-schema/src';
import gongsanPackage from 'content/pois/gongsan/package.json';
import busosanPackage from 'content/pois/busosan/package.json';

describe('6-POI content package Zod validation', () => {
  const packages = [
    { id: 'gongsan', data: gongsanPackage },
    { id: 'busosan', data: busosanPackage },
    // ... 6 POIs
  ];

  packages.forEach(({ id, data }) => {
    it(`${id} package passes Zod schema`, () => {
      const result = PoiContentPackageSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it(`${id} has required accessibility facts with verified dates`, () => {
      const pkg = PoiContentPackageSchema.parse(data);
      const entryFact = pkg.accessibilityFacts.find(
        (f) => f.capabilityCode === 'entrance_step_free'
      );
      expect(entryFact).toBeDefined();
      expect(entryFact!.verifiedAt).toBeTruthy();
    });

    it(`${id} route guide has ≥5 steps`, () => {
      const pkg = PoiContentPackageSchema.parse(data);
      expect(pkg.routeGuide.steps.length).toBeGreaterThanOrEqual(5);
    });
  });
});
```

---

## 4. 컴포넌트 테스트 + jest-axe (`apps/web/src/features/`)

### 4.1 테스트 환경 설정

```typescript
// apps/web/jest.setup.ts
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// jsdom에서 color-contrast는 부정확 → Playwright E2E에서 검증
```

```jsonc
// apps/web/jest.config.ts (axe 컴포넌트 프리셋)
{
  "projects": [
    {
      "displayName": "axe-components",
      "testMatch": ["**/*.axe.test.{ts,tsx}"],
      "testEnvironment": "jsdom",
      "setupFilesAfterFramework": ["<rootDir>/jest.setup.ts"]
    }
  ]
}
```

### 4.2 F1 POI 카드 컴포넌트 테스트

```typescript
// apps/web/src/features/f1-poi-card/__tests__/PoiAccessibilityCard.axe.test.tsx

import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { PoiAccessibilityCard } from '../PoiAccessibilityCard';
import { GONGSAN_MOCK_PROPS } from 'packages/test-fixtures/components';

describe('PoiAccessibilityCard a11y', () => {
  it('has no axe violations (방문가능 state)', async () => {
    const { container } = render(
      <PoiAccessibilityCard {...GONGSAN_MOCK_PROPS} suitabilityLabel="방문가능" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations (정보 없음 state)', async () => {
    const { container } = render(
      <PoiAccessibilityCard {...GONGSAN_MOCK_PROPS} suitabilityLabel="정보없음" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders evidence card with per-axis contributions', () => {
    const { getByRole } = render(
      <PoiAccessibilityCard {...GONGSAN_MOCK_PROPS} showEvidence />
    );
    expect(getByRole('table', { name: /적합도 근거/ })).toBeInTheDocument();
  });

  it('score label has accessible description, not only color', () => {
    const { queryByText } = render(
      <PoiAccessibilityCard {...GONGSAN_MOCK_PROPS} suitabilityLabel="주의" />
    );
    // color만으로 구분하지 않음 — 텍스트 라벨 존재 (KWCAG 1.4.1)
    expect(queryByText('주의')).toBeInTheDocument();
  });
});
```

### 4.3 F2 도슨트 컴포넌트 테스트

```typescript
// apps/web/src/features/f2-docent/__tests__/DocentPlayer.axe.test.tsx

describe('DocentPlayer a11y', () => {
  it('has no axe violations in consent state', async () => {
    const { container } = render(<DocentPlayer consentGiven={false} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no axe violations in playing state', async () => {
    const { container } = render(
      <DocentPlayer consentGiven={true} isPlaying={true} transcript={SAMPLE_TRANSCRIPT} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('transcript is always visible when playing (KWCAG 1.2.1)', () => {
    const { getByRole } = render(
      <DocentPlayer consentGiven={true} isPlaying={true} transcript={SAMPLE_TRANSCRIPT} />
    );
    expect(getByRole('region', { name: /도슨트 대본/ })).toBeVisible();
  });

  it('aria-live polite region exists for docent updates', () => {
    const { container } = render(<DocentPlayer consentGiven={true} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('pause/stop buttons are keyboard accessible', () => {
    const { getAllByRole } = render(
      <DocentPlayer consentGiven={true} isPlaying={true} transcript={SAMPLE_TRANSCRIPT} />
    );
    const buttons = getAllByRole('button');
    const pauseBtn = buttons.find((b) => b.getAttribute('aria-label')?.includes('일시정지'));
    expect(pauseBtn).toBeInTheDocument();
  });
});
```

### 4.4 F3 배리어 제보 폼 테스트

```typescript
describe('BarrierReportForm a11y', () => {
  it('all inputs have labels (KWCAG 3.3.2)', async () => {
    const { container } = render(<BarrierReportForm poiId="gongsan" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('error messages are associated with inputs (KWCAG 3.3.1)', async () => {
    const { getByRole, getByText } = render(<BarrierReportForm poiId="gongsan" />);
    await userEvent.click(getByRole('button', { name: /제출/ }));
    const errorMsg = getByText(/카테고리를 선택해 주세요/);
    expect(errorMsg).toHaveAttribute('role', 'alert');
  });
});
```

### 4.5 F4 다이어리 내보내기 버튼 테스트

```typescript
describe('DiaryExportPanel a11y', () => {
  it('6 export buttons are all labeled (no icon-only)', async () => {
    const { container, getAllByRole } = render(
      <DiaryExportPanel diary={SAMPLE_DIARY} />
    );
    const buttons = getAllByRole('button');
    buttons.forEach((btn) => {
      // 각 버튼에 aria-label 또는 visible text
      const label = btn.getAttribute('aria-label') || btn.textContent;
      expect(label?.trim().length).toBeGreaterThan(0);
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

---

## 5. E2E Playwright 테스트 (`tests/e2e/`)

### 5.1 Playwright 설정

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html'], ['github']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'ko-KR',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'pnpm run start:test', // demo seed DB 사용
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### 5.2 D.1 골든 플로우 E2E (PT 핵심 시나리오)

SPEC §12의 PT narrative를 그대로 테스트로 구현. 이 테스트가 실패하면 Release Candidate 불가.

```typescript
// tests/e2e/d1-golden-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('D.1 Golden Flow — 모두의 백제 PT 시나리오', () => {
  test('전체 F1→F5 데이터 플로우', async ({ page }) => {
    // 1. 로그인 없이 진입
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('모두의 백제');

    // 2. 페르소나 선택: 휠체어 할아버지 + 시니어 + 초등 손녀
    await page.click('[data-testid="persona-P1a"]');
    await page.click('[data-testid="persona-P1b"]');
    await page.click('[data-testid="persona-P3"]');
    await page.click('[data-testid="budget-반나절"]');

    // 3. 공산성 POI 카드 진입
    await page.click('[data-testid="poi-gongsan"]');
    await expect(page.locator('[data-testid="suitability-score"]')).toBeVisible();

    // 4. 적합도 근거 카드 확인 (데이터활용 20점 증거)
    await page.click('[data-testid="show-evidence"]');
    await expect(page.locator('[data-testid="layer-A-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="layer-B-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="layer-C-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="layer-D-score"]')).toBeVisible();

    // 5. 승인된 "동문 공사" 제보 배너 → 서문 정적 가이드 강조 (auto-reroute 없음)
    await expect(page.locator('[data-testid="approved-alert-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-auto-reroute-notice"]')).toBeVisible();

    // 6. F2 Odii 도슨트 — 지도 탭 대신 목록 탭에서 트리거 (consent 없이 지도 GPS 없음)
    await page.click('[data-testid="docent-map-tap-fallback"]');
    await page.click('[data-testid="docent-consent-agree"]');
    await expect(page.locator('[data-testid="docent-transcript"]')).toBeVisible();

    // 7. 1박2일로 여행 확장 — 동일 template family
    await page.click('[data-testid="budget-1박2일"]');
    await expect(page.locator('[data-testid="itinerary-family"]')).toHaveAttribute(
      'data-family', /.+/
    );
    const familyBefore = await page.getAttribute('[data-testid="itinerary-family"]', 'data-family');

    // 부여 포함 확장 후 family 동일 확인
    await expect(page.locator('[data-testid="poi-busosan"]')).toBeVisible();
    const familyAfter = await page.getAttribute('[data-testid="itinerary-family"]', 'data-family');
    expect(familyAfter).toBe(familyBefore);

    // 8. F4 손녀 다이어리 → 학생PDF 다운로드 트리거
    await page.click('[data-testid="open-diary"]');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-student-pdf"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/모두의백제.*\.pdf/);

    // 9. 점자BRF 다운로드
    const [brfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-brf"]'),
    ]);
    expect(brfDownload.suggestedFilename()).toMatch(/\.brf$/);

    // 10. GPX 다운로드
    const [gpxDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-gpx"]'),
    ]);
    expect(gpxDownload.suggestedFilename()).toMatch(/\.gpx$/);

    // 11. F5 RTO 대시보드 — 동일 데이터의 갭 확인
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="poi-completeness-mv"]')).toBeVisible();
    await expect(page.locator('[data-testid="caveat-방문자-관광객"]')).toBeVisible();
  });
});
```

### 5.3 접근성 E2E (`@axe-core/playwright`)

```typescript
// tests/e2e/a11y-routes.spec.ts

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const CORE_ROUTES = [
  { path: '/', name: '홈' },
  { path: '/poi/gongsan', name: '공산성 POI 상세' },
  { path: '/poi/gongsan/route', name: '베리어프리 경로 안내' },
  { path: '/planner', name: '시간 예산 플래너' },
  { path: '/docent/gongsan', name: '도슨트' },
  { path: '/report/new?poi=gongsan', name: '배리어 제보 폼' },
  { path: '/diary', name: '다이어리' },
  { path: '/dashboard', name: 'F5 RTO 대시보드' },
];

CORE_ROUTES.forEach(({ path, name }) => {
  test(`${name} (${path}) — axe violations 0`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('.map-canvas') // 지도 캔버스 — 수동 체크리스트로 이관
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test('지도 대안 목록이 키보드로 접근 가능', async ({ page }) => {
  await page.goto('/poi/gongsan');
  // 지도 대신 텍스트 목록 대안 탭 접근
  await page.keyboard.press('Tab');
  const listTab = page.locator('[data-testid="map-list-alternative"]');
  await listTab.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="poi-list"]')).toBeVisible();
});
```

### 5.4 포커스 관리 E2E

```typescript
// tests/e2e/focus-management.spec.ts

test('라우트 전환 시 포커스가 메인 콘텐츠로 이동', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="nav-planner"]');

  // RouteFocusReset 컴포넌트가 focus를 main으로 이동했는지 확인
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(['DIV', 'MAIN', 'H1']).toContain(focusedElement);
});

test('모달 열릴 때 focus trap 동작', async ({ page }) => {
  await page.goto('/poi/gongsan');
  await page.click('[data-testid="show-evidence"]');

  // 모달 내부에서 Tab이 modal 밖으로 나가지 않음
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  // Tab 5회 — 모달 내부 순환
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
  }
  const focusedEl = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]'));
  expect(focusedEl).toBeTruthy();
});

test('skip-link가 첫 번째 tab stop이고 동작함', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focusedText = await page.evaluate(() => document.activeElement?.textContent);
  expect(focusedText).toMatch(/본문 바로가기/);
  await page.keyboard.press('Enter');
  const mainFocused = await page.evaluate(
    () => document.activeElement?.id === 'main-content'
  );
  expect(mainFocused).toBe(true);
});
```

### 5.5 데모 Resilience E2E (심사일 대비)

```typescript
// tests/e2e/demo-resilience.spec.ts

test.describe('Demo resilience — 심사일 API 장애 시나리오', () => {
  test('KTO API 장애 시 스냅샷 데이터로 서빙', async ({ page, context }) => {
    // SPEC §14.10: 브라우저/RSC는 런타임 KTO를 호출하지 않으므로 'KTO 차단'만으로는 아무것도 증명 못 함(no-op).
    // (a) 아래 라우트 차단 + 페이지가 apis.data.go.kr 로 0건 요청함을 함께 단언(no-runtime-KTO 회귀),
    // (b) Supabase 읽기를 마지막 성공 publish(스냅샷)로 고정해 last-good-served 경로를 검증.
    await context.route('**/apis.data.go.kr/**', (route) => route.abort());

    await page.goto('/poi/gongsan');

    // Supabase DB 스냅샷 데이터로 POI 카드 렌더링
    await expect(page.locator('[data-testid="suitability-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-source-badge"]')).toContainText('스냅샷');
  });

  test('기상청 API 장애 시 weather context 없이 score 계산', async ({ page, context }) => {
    await context.route('**/apis.data.go.kr/1360000/**', (route) => route.abort());

    await page.goto('/poi/gongsan');
    // timeContext 없어도 A layer 부분 점수로 렌더링
    await expect(page.locator('[data-testid="suitability-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="weather-unavailable"]')).toBeVisible();
  });

  test('offline: IndexedDB에서 다이어리 로드', async ({ page, context }) => {
    // 먼저 온라인에서 다이어리 저장
    await page.goto('/diary');
    await page.evaluate(() =>
      window.__testSeedDiary({ poi: 'gongsan', entries: 3 })
    );

    // 네트워크 차단
    await context.setOffline(true);
    await page.reload();

    // IndexedDB에서 오프라인 로드
    await expect(page.locator('[data-testid="diary-offline-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="diary-entry"]')).toHaveCount(3);
  });

  test('offline: 6-POI Serwist 캐시에서 가이드 로드', async ({ page, context }) => {
    // 사전 캐시된 공산성 가이드 패키지
    await page.goto('/poi/gongsan/route');
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);
    await page.goto('/poi/gongsan/route');

    await expect(page.locator('[data-testid="route-step"]')).toHaveCount.above(0);
    await expect(page.locator('[data-testid="offline-badge"]')).toBeVisible();
  });
});
```

### 5.6 Lighthouse CI (성능·접근성 게이트)

```jsonc
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/poi/gongsan",
        "http://localhost:3000/planner",
        "http://localhost:3000/docent/gongsan"
      ],
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": { "cpuSlowdownMultiplier": 2 }
      }
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:performance":   ["warn",  { "minScore": 0.90 }],
        "categories:best-practices": ["warn", { "minScore": 0.90 }],
        "first-contentful-paint":   ["warn",  { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["warn",  { "maxNumericValue": 3000 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**접근성 1.0 목표:** Lighthouse a11y 1.0은 axe 검사의 부분 집합이지만, PR 리그레션 감지로서 `minScore 0.95` error gate + `1.0` warn gate를 병행 운영.

---

## 6. 접근성 CI 게이트 전략

### 6.1 게이트 레이어 요약

| 레이어 | 도구 | 임계값 | 실패 시 |
|---|---|---|---|
| 컴포넌트 (jsdom) | `jest-axe` | violations === 0 | PR 차단 |
| 컴포넌트 (브라우저) | Storybook addon-a11y | `test: 'error'` (contrast 포함) | PR 차단 |
| 정적 분석 | `eslint-plugin-jsx-a11y` | 모든 권장 룰 | build 차단 |
| E2E 라우트 스캔 | `@axe-core/playwright` `wcag2a/aa/21aa/22aa` | violations === 0 (지도 제외) | PR 차단 |
| 성능·접근성 종합 | Lighthouse CI | a11y ≥ 0.95 (error), perf ≥ 0.90 (warn) | a11y만 PR 차단 |
| 수동 스크린리더 | NVDA + 센스리더 + VoiceOver + TalkBack | 과업 성공률 100% | **RC 차단** |

### 6.2 Storybook addon-a11y 설정

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    a11y: {
      // 모든 스토리 기본: 위반 = error (테스트 실패)
      test: 'error',
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      },
    },
  },
};

export default preview;
```

```typescript
// apps/web/src/features/f2-docent/DocentPlayer.stories.tsx
export default {
  title: 'F2/DocentPlayer',
  component: DocentPlayer,
  parameters: {
    a11y: {
      test: 'error', // 색 대비 위반도 에러로 처리
    },
  },
};
```

### 6.3 eslint-plugin-jsx-a11y 설정

```jsonc
// .eslintrc.json (apps/web)
{
  "extends": ["plugin:jsx-a11y/recommended"],
  "rules": {
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/no-noninteractive-element-interactions": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/role-has-required-aria-props": "error"
  }
}
```

---

## 7. 수동 스크린리더 과업 체크리스트 (Release Gate)

이 섹션의 모든 과업은 **RC 승인을 위한 필수 완료 조건**이다 (SPEC §2.13). 자동화 게이트는 리그레션 방지이고, 실제 인증 심사는 사람이 수행한다.

### 7.1 테스트 환경 매트릭스

| 플랫폼 | 스크린리더 | 브라우저 | 우선순위 |
|---|---|---|---|
| Windows 11 | NVDA (최신) | Chrome 최신 | 1순위 (KTO 인증 심사 기준) |
| Windows 11 | 센스리더 최신 | Chrome 최신 | 1순위 (국내 인증 필수) |
| macOS (최신) | VoiceOver | Safari | 2순위 |
| iOS (최신) | VoiceOver | Safari | 2순위 (모바일 심사) |
| Android (최신) | TalkBack | Chrome | 2순위 (모바일 심사) |

### 7.2 핵심 과업 목록 (KWCAG 33항목 대응)

#### 과업 A — 페르소나 선택 + 공산성 POI 카드 탐색 (KWCAG 2.1.1, 2.1.2, 2.4.2, 3.3.2)
```
□ 스크린리더로 홈 랜딩 후 "본문 바로가기" skip link 인식
□ 페르소나 체크박스 3개 선택 (키보드만으로)
□ 공산성 카드 클릭 → 새 페이지 title이 "공산성 — 모두의 백제"로 announce됨
□ 적합도 점수 및 라벨이 읽힘 (숫자 + 텍스트 라벨, 색만으로 구분 아님)
□ "근거 보기" → 테이블 구조가 올바르게 announce됨 (행/열 헤더)
```

#### 과업 B — F1.B 베리어프리 경로 단계 탐색 (KWCAG 2.1.1, 1.3.1)
```
□ 경로 단계 카드가 순서대로 읽힘 (1단계 → N단계)
□ 단차·경사도 정보가 각 단계에서 읽힘
□ "다음 단계" 버튼이 aria-label로 명확히 announce됨
□ 오프라인 모드에서도 경로 데이터 읽힘
```

#### 과업 C — F2 도슨트 음성/자막 (KWCAG 1.2.1, 1.4.2, 2.2.2)
```
□ 지도 탭 대신 목록 탭에서 도슨트 트리거 가능 (map-tap fallback)
□ 동의 화면 → 동의 버튼 키보드 접근
□ 재생 중 aria-live="polite"로 도슨트 텍스트 announce됨
□ 일시정지·정지 버튼 키보드 접근 및 정확히 announce됨
□ 대본 텍스트가 재생과 동시에 화면에 노출됨
□ 소리 자동재생 없음 — 동의 전 audio.play() 호출 없음
```

#### 과업 D — F3 배리어 제보 폼 제출 (KWCAG 3.3.1, 3.3.2, 3.3.3, 3.3.4)
```
□ 모든 폼 필드에 연관된 label이 읽힘
□ 유효성 오류 메시지가 role="alert"로 announce됨
□ 파일 업로드 버튼 accessible label이 있음
□ 제출 성공 메시지가 스크린리더에 전달됨
```

#### 과업 E — F4 다이어리 + 내보내기 (KWCAG 2.4.3, 1.1.1)
```
□ 6개 내보내기 버튼이 각각 명확한 라벨로 announce됨
□ PDF 링크에 형식 및 파일 크기 정보가 포함됨
□ 다운로드 완료 상태가 announce됨
□ HTML 대체본 링크가 PDF 버튼 옆에 존재하고 접근 가능
```

#### 과업 F — 지도 대안 접근 (KWCAG 2.5.1, 2.1.1, 1.4.1)
```
□ 지도 "목록으로 보기" 탭이 키보드로 접근 가능
□ 지도 캔버스 영역에 aria-hidden 또는 accessible 대안 설명
□ 핀 정보가 색 외 아이콘/텍스트로도 구분됨
□ 줌인/아웃 버튼이 드래그 없이 키보드로 동작
```

#### 과업 G — 전체 prefers-reduced-motion (KWCAG 2.3.1)
```
□ OS "동작 줄이기" 설정 후 지도 패닝 애니메이션 없음
□ 페이지 전환 슬라이드 없음
□ F1.F-3 60초 카운트다운이 reduced-motion 시 즉시 전환
```

### 7.3 과업 성공 기준 (WA/KWACC 사용자심사 기준 반영)

| 과업 | 성공 기준 | 실패 예시 |
|---|---|---|
| A — POI 탐색 | 제한시간 내 (5분) 페르소나 선택 + 공산성 카드 열기 완료 | 체크박스가 스크린리더로 읽히지 않음 |
| B — 경로 단계 | 제한시간 내 (3분) 3개 단계 순서대로 읽기 | 단계 순서가 DOM 순서와 불일치 |
| C — 도슨트 | 제한시간 내 (4분) 동의 후 재생 + 일시정지 완료 | 자동재생으로 소리가 먼저 남 |
| D — 제보 폼 | 제한시간 내 (5분) 폼 완성 + 제출 | 오류 메시지가 announce되지 않음 |
| E — 내보내기 | 제한시간 내 (3분) 학생PDF + GPX 다운로드 | 다운로드 버튼 라벨이 "버튼" 뿐 |

---

## 8. GitHub Actions 워크플로우

### 8.1 `ci.yml` — 메인 PR 게이트

```yaml
# .github/workflows/ci.yml

name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  typecheck:
    name: TypeScript typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - name: Verify domain cannot import Next.js
        run: |
          if grep -r "from 'next'" packages/domain/src; then
            echo "domain imports Next.js — SPEC violation"
            exit 1
          fi

  lint:
    name: ESLint + jsx-a11y
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run lint

  unit-domain:
    name: Domain unit tests (+ golden files)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter domain test --coverage
      - name: Fail if golden files were modified in CI
        run: |
          if [[ -n "$(git diff packages/test-fixtures/)" ]]; then
            echo "Golden files modified — run UPDATE_GOLDEN=1 locally"
            exit 1
          fi

  contract:
    name: KTO contract + content Zod tests (fixture-only; M-16)
    runs-on: ubuntu-latest
    # Live-API probes (detailWithTour2 field-key verification, lDong bootstrap, signguCd probe)
    # are NOT run here — see .github/workflows/kto-integration.yml (manual/scheduled only).
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:contract  # includes kto-schema-drift.contract.test.ts (M-17)
      - name: Verify no KTO live calls in contract tests
        run: |
          if grep -r "apis.data.go.kr" tests/contract/; then
            echo "Live KTO calls in contract tests — use fixtures (SPEC §6 / M-16)"
            exit 1
          fi

  component-axe:
    name: jest-axe component tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter web test --testPathPattern="axe.test"

  build:
    name: Next.js build (demo seed)
    runs-on: ubuntu-latest
    needs: [typecheck, lint]
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
      USE_DEMO_SEED: 'true'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/upload-artifact@v4
        with:
          name: nextjs-build
          path: apps/web/.next
          retention-days: 1

  e2e:
    name: E2E Playwright (D.1 golden flow + a11y routes)
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - uses: actions/download-artifact@v4
        with: { name: nextjs-build, path: apps/web/.next }
      - name: Start app with demo seed
        run: pnpm run start:demo &
        env:
          USE_DEMO_SEED: 'true'
      - run: pnpm exec playwright test tests/e2e/d1-golden-flow.spec.ts tests/e2e/a11y-routes.spec.ts tests/e2e/focus-management.spec.ts
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    name: Lighthouse CI (a11y ≥ 0.95, perf ≥ 0.90)
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with: { name: nextjs-build, path: apps/web/.next }
      - name: Start app
        run: pnpm run start:demo &
        env: { USE_DEMO_SEED: 'true' }
      - uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
          temporaryPublicStorage: true

  demo-resilience:
    name: Demo resilience (offline + API fallback)
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - uses: actions/download-artifact@v4
        with: { name: nextjs-build, path: apps/web/.next }
      - name: Start app (snapshot data mode)
        run: pnpm run start:demo &
        env: { USE_DEMO_SEED: 'true', USE_SNAPSHOT_DATA: 'true' }
      - run: pnpm exec playwright test tests/e2e/demo-resilience.spec.ts
```

### 8.2 `kto-etl.yml` — KTO ETL 배치

```yaml
# .github/workflows/kto-etl.yml

name: KTO ETL Batch

on:
  schedule:
    # KST 04:00 = UTC 19:00 (전날)
    - cron: '0 19 * * *'
  workflow_dispatch:
    inputs:
      force_publish:
        description: 'Force publish even if no changes detected'
        type: boolean
        default: false

jobs:
  etl:
    name: KTO ETL → Supabase publish
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      KTO_SERVICE_KEY: ${{ secrets.KTO_SERVICE_KEY }}
      SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.PROD_SUPABASE_SERVICE_ROLE }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Ingest — source_records (raw store, idempotent)
        run: pnpm run etl:ingest
        # KTO 오류 시 이전 raw 유지 — ingest 실패가 publish를 막지 않음

      - name: Validate — Zod + content-schema
        run: pnpm run etl:validate

      - name: Publish — normalize + PUBLISH txn (atomic)
        run: pnpm run etl:publish ${{ github.event.inputs.force_publish == 'true' && '--force' || '' }}
        # 실패 시 이전 dataset_version 유지 — 서버는 계속 이전 published 데이터 서빙

      - name: Revalidate Next.js cache
        run: |
          curl -X POST "${{ secrets.VERCEL_REVALIDATE_URL }}" \
            -H "Authorization: Bearer ${{ secrets.REVALIDATE_HMAC_TOKEN }}" \
            -d '{"tags":["poi:all","route:all","snapshot:latest"]}'

      - name: Update snapshot checksums
        run: pnpm run etl:snapshot-checksums

      - name: Notify on failure
        if: failure()
        run: |
          echo "KTO ETL failed — previous published data still serving"
          # 추가 알림 (이메일/Slack 등) 필요 시 여기에
```

### 8.3 `release-readiness.yml` — RC 게이트

```yaml
# .github/workflows/release-readiness.yml

name: Release Readiness Check

on:
  workflow_dispatch:
    inputs:
      release_tag:
        description: 'Release candidate tag (e.g., rc-2026-09-15)'
        required: true

jobs:
  full-test-suite:
    name: Full test suite (all E2E + demo resilience)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.inputs.release_tag }} }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps
      - run: pnpm run build
        env:
          USE_DEMO_SEED: 'true'
          SNAPSHOT_ONLY: 'true' # 데모 데이터 freeze
      - name: Start app
        run: pnpm run start:demo &
      - name: All E2E tests
        run: pnpm exec playwright test
      - name: Upload full Playwright report
        uses: actions/upload-artifact@v4
        with:
          name: rc-playwright-report-${{ github.event.inputs.release_tag }}
          path: playwright-report/
          retention-days: 30

  export-golden-verification:
    name: Verify PDF/BRF/GPX golden checksums
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.inputs.release_tag }} }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:exports-golden
        # sha256 비교 — 단일 바이트 변화도 실패

  content-package-freeze:
    name: 6-POI content package freeze verification
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.inputs.release_tag }} }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test:content-package
      - name: Verify all 6 POIs have verifiedAt within 90 days
        run: pnpm run validate-content --max-age-days=90

  license-audit:
    name: License + KOGL + AI label audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.inputs.release_tag }} }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --production
      - name: Verify AI label badge exists on docent features
        run: pnpm run validate-ai-labels
        # "AI 음성 안내" 배지가 DocentPlayer 컴포넌트에 있는지 AST 검사
      - name: Verify cpyrhtDivCd is stored for all KTO media
        run: pnpm run validate-media-license

  demo-seed-separation:
    name: Verify demo seed ≠ prod data
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.event.inputs.release_tag }} }
      - name: Check demo seed uses snapshot fixtures, not live Supabase
        run: |
          if grep -r "PROD_SUPABASE_URL" scripts/seed/demo/; then
            echo "Demo seed references prod DB — separation violation"
            exit 1
          fi

  rc-summary:
    name: RC summary report
    needs:
      - full-test-suite
      - export-golden-verification
      - content-package-freeze
      - license-audit
      - demo-seed-separation
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Print RC gate summary
        run: |
          echo "## Release Candidate Gate Summary: ${{ github.event.inputs.release_tag }}"
          echo ""
          echo "### Automated Gates"
          echo "- Full E2E: ${{ needs.full-test-suite.result }}"
          echo "- Export Golden: ${{ needs.export-golden-verification.result }}"
          echo "- Content Package: ${{ needs.content-package-freeze.result }}"
          echo "- License Audit: ${{ needs.license-audit.result }}"
          echo "- Demo Separation: ${{ needs.demo-seed-separation.result }}"
          echo ""
          echo "### Manual Gates (외부 확인 필요)"
          echo "- [ ] NVDA + 센스리더 과업 A–G 체크리스트 완료"
          echo "- [ ] VoiceOver (macOS/iOS) 과업 A–G 체크리스트 완료"
          echo "- [ ] TalkBack (Android) 과업 A–G 체크리스트 완료"
          echo "- [ ] 관광약자 실사용자 현장 검증 완료 (SPEC §9 비협상 사항)"
          echo "- [ ] K-WAH 자가진단 결과서 작성 완료"
          echo "- [ ] 개인정보처리방침 국외이전 고지 검토 완료"
          echo "- [ ] PT 시연 백업 영상 촬영 완료"
```

---

## 9. 워크스트림별 완료 정의 (Definition of Done)

### 9.1 C0 Contracts (기반 계약)

| 항목 | 완료 기준 |
|---|---|
| DB Contract v1 | `supabase/migrations/` SQL 파일 리뷰 완료, `supabase db test` 통과 |
| KTO Contract v1 | `packages/kto-client` TS 타입 + 6-POI 실 fixture 수집 완료 |
| Domain Contract v1 | `calculateSuitability` 시그니처 freeze + 골든 파일 **≥30개** 커밋 (`16_suitability_policy.md §11` 요구) |
| Design Contract v1 | design token 색 대비비 문서화, Storybook stories 기본 세트 |
| Content Package Contract v1 | `PoiContentPackageSchema` Zod 완성 + 6 POI Zod 통과 |

### 9.2 C1 Data Platform (데이터 플랫폼)

| 항목 | 완료 기준 |
|---|---|
| Supabase 마이그레이션 | `supabase/migrations/` 모든 마이그레이션 smoke 통과 |
| RLS 정책 | `supabase/tests/` RLS policy SQL 테스트 (service_role·anon·authenticated·admin 각 역할) |
| ETL CLI | `kto-etl.yml` dry-run 통과, ingest/validate/publish 단계 분리 확인 |
| cache invalidation | `revalidateTag` 호출 후 Next.js 캐시 갱신 E2E 확인 |

### 9.3 F1-AD (POI 카드 + 플래너 + 산식)

| 항목 | 완료 기준 |
|---|---|
| POI 카드 UI | `PoiAccessibilityCard.axe.test.tsx` 통과 |
| 적합도 산식 — 골든 케이스 | `calculateSuitability.golden.test.ts` **≥30개 케이스** 통과 (`16_suitability_policy.md §11` 필수) |
| 적합도 산식 — 경계 테스트 | score 69/70 alternatives 트리거, score 74/75 label 경계, coverage 0.64/0.65 cap 테스트 통과 |
| 적합도 산식 — Layer C guard | 인증 단독 label 경계 이동 금지 테스트 통과 (§16 §5) |
| 적합도 산식 — evidence-pack DoD | `validated_by/date` string-only 게이트 폐지 확인; evidence pack 구조(photo·measured value·method·verifier·second-approval·validity·change-history) Zod 검증 통과 (§16 §13.5) |
| 점수 코드 publish gate | 전문가 sign-off 전까지 `score` 렌더링 시 "정책 검증 중 (β)" 배지 존재 확인 (§16 §11) |
| 적합도 evidence 카드 | 4-layer 기여도 + `evidenceConfidence` + `coverage` 가 화면에 표시되고 스크린리더로 읽힘 |
| 플래너 | `buildItinerary` 유닛 테스트 통과 + E2E 플래너 흐름 통과 |

### 9.4 F1-B (베리어프리 경로 안내)

| 항목 | 완료 기준 |
|---|---|
| 공주 3 POI 경로 | Zod 통과 + 과업 B 스크린리더 수동 테스트 통과 |
| 부여 3 POI 경로 | Zod 통과 + Playwright E2E 라우트 axe 통과 |
| GPX 골든 파일 | `diary-*.gpx.sha256` 매칭 |
| 오프라인 Serwist 캐시 | `demo-resilience.spec.ts` offline E2E 통과 |

### 9.5 F2 (Odii 도슨트)

| 항목 | 완료 기준 |
|---|---|
| 동의 게이트 | 동의 없이 audio.play() 호출 없음 (테스트에서 확인) |
| 4채널 렌더링 | 음성·자막·점자·수어 채널 각각 axe 통과 |
| aria-live | `DocentPlayer.axe.test.tsx` polite region 존재 확인 |
| AI 배지 | "AI 음성 안내" 배지 존재, RC 배포 시 AST 검사 통과 |
| 스크린리더 | 과업 C (NVDA·VoiceOver) 수동 통과 |

### 9.6 F3 (배리어 제보)

| 항목 | 완료 기준 |
|---|---|
| 폼 axe | `BarrierReportForm.axe.test.tsx` 통과 |
| state machine | `moderateReport` 유닛 테스트 통과 (no auto-recalc 확인) |
| RLS | anon이 insert 못하고 owner만 read 가능 (RLS SQL 테스트) |
| Realtime | 승인 시에만 broadcast — `report_approved_broadcast` 트리거 SQL 테스트 |
| 스크린리더 | 과업 D 수동 통과 |

### 9.7 F4 (다이어리·내보내기)

| 항목 | 완료 기준 |
|---|---|
| 학생PDF 골든 | `student-pdf-gongsan.sha256` 매칭 |
| BRF 골든 | `diary-gongsan.brf.sha256` 매칭 |
| GPX 골든 | waypoint count + 첫 좌표 unit 테스트 통과 |
| 쉬운글PDF | HTML 대안 존재, PDF 단독 화면 없음 |
| 단체합본 | PDF 구조 unit 테스트 통과 |
| 스크린리더 | 과업 E 수동 통과 |
| 오프라인 다이어리 | demo-resilience IndexedDB E2E 통과 |

### 9.8 F5 (RTO 대시보드)

| 항목 | 완료 기준 |
|---|---|
| 방문자 caveat | "방문자≠관광객" 경고 문구 DOM에 존재, axe 통과 |
| 스냅샷 MV | `rto_dashboard_snapshots` 조회 E2E 통과 |
| F5 axe | `/dashboard` 라우트 `a11y-routes.spec.ts` 통과 |

---

## 10. Release Candidate 게이트 (RC Checklist)

아래 항목 중 하나라도 미완료이면 RC 승인 불가.

### 10.1 자동화 게이트 (CI 통과 필요)

```
[RC-A1] ci.yml 모든 job PASS (typecheck / lint / unit / contract / component-axe / build / e2e / lighthouse / demo-resilience)
[RC-A2] release-readiness.yml PASS (full E2E / export golden / content package / license audit / demo separation)
[RC-A3] Lighthouse a11y ≥ 0.95 (3회 median 기준)
[RC-A4] @axe-core/playwright 핵심 8개 라우트 violations 0
[RC-A5] jest-axe 모든 컴포넌트 테스트 violations 0
[RC-A6] 도메인 골든 파일 ≥30개 매칭 (UPDATE_GOLDEN 미실행 상태); 경계 테스트 69/70/74/75 포함 (16_suitability_policy.md §11)
[RC-A7] PDF/BRF/GPX 골든 체크섬 매칭
[RC-A8] 6-POI content package Zod 통과 + verifiedAt ≤ 90일
[RC-A9] Layer C boundary-guard 테스트 통과 — 인증 단독 label 경계 이동 없음 (16_suitability_policy.md §5)
[RC-A10] coverage < 0.65 cap 테스트 통과 — label 강제 '주의' 이하 (16_suitability_policy.md §6)
[RC-A11] evidence-pack DoD 구조 Zod 검증 통과 (string-only verified_by/date 게이트 폐지 확인, SPEC §13.5)
[RC-A12] 전문가 sign-off 전 "정책 검증 중 (β)" 배지 존재 CI 확인 (16_suitability_policy.md §11)
[RC-A13] ETL Gate 1 — envelope 필수 필드 vs capability 선택 필드 분리 검증; unknown keys warn 로그 확인 (M-17)
```

### 10.2 수동 게이트 (사람이 확인하고 체크리스트에 서명)

```
[RC-M1] NVDA + Chrome — 과업 A–G 100% 성공 (담당자 서명 + 일시 기록)
[RC-M2] 센스리더 최신 + Chrome — 과업 A–G 100% 성공
[RC-M3] VoiceOver (macOS) + Safari — 과업 A–G 100% 성공
[RC-M4] VoiceOver (iOS) + Safari Mobile — 과업 A–G 100% 성공
[RC-M5] TalkBack (Android) + Chrome — 과업 A–G 100% 성공
[RC-M6] 관광약자 실사용자 (휠체어·시각장애 각 최소 1명) 현장 검증 완료 (SPEC §11 비협상)
[RC-M7] 특수교육·점자 전문가 F4 BRF 출력 검증 완료
[RC-M8] K-WAH 자가진단 결과서 작성 완료 (인증 신청 준비)
[RC-M9] PT 데모 시나리오 리허설 — D.1 플로우 5분 내 완료 확인
[RC-M10] 데모 백업 영상 (화면 녹화 + 오디오) 촬영 완료
[RC-M11] 개인정보처리방침 — Vercel(미국)·Supabase(서울)·카카오/구글 국외이전 고지 검토
[RC-M12] 위치정보법 제9조의2 동의 화면 — GPS 사용 전 표시 확인
[RC-M13] KOGL 라이선스 — Type3 자산에 변형 없음, 모든 미디어 cpyrhtDivCd 저장 확인
[RC-M14] KTO 활용사례 URL 등록 + 관광데이터 활용 사례 제출 (100,000/day 한도 신청)
```

### 10.3 RC 완료 선언 절차

1. `release-readiness.yml`을 `rc-YYYY-MM-DD` 태그로 실행하여 자동화 게이트 통과 확인
2. RC summary job 출력물을 PM이 확인하고 수동 게이트 체크리스트에 서명
3. `main` 브랜치에 RC 태그 푸시 (`v0.9.0-rc.N`)
4. Vercel 프로덕션 배포 (심사용 URL 고정)
5. 심사 1주 전 기능 freeze: `main`에 병합 차단 (`branch protection → required reviewers × 2`)

---

## 11. 타임라인별 테스트 마일스톤

| 기간 | 목표 마일스톤 | 핵심 테스트 활동 |
|---|---|---|
| 6/14–6/28 | 첫 수직 슬라이스 | 골든 파일 초판 (최소 7개 핵심 케이스) 커밋, ci.yml skeleton, 공산성·국립공주박물관 계약 테스트 통과; 경계 케이스 포함 ≥30개 전체는 Domain Contract v1 freeze 시 완료 목표 |
| 6/29–7/19 | 6-POI ETL + F1.A/D + F4 spike | KTO 계약 테스트 전체, PDF/BRF/GPX 골든 파일 초판, RLS SQL 테스트 |
| 7/20–8/9 | F1-F5 전체 + 4언어 | 모든 컴포넌트 axe 테스트, D.1 E2E 초판, Odii 계약 테스트 |
| 8/10–8/31 | D.1 골든 플로우 + Serwist + 수동 | NVDA·VoiceOver 1차 수동 테스트, demo-resilience E2E, offline E2E |
| 9/1–9/15 | 관광약자 현장 + 전문가 검증 | 수동 과업 A–G 전체 매트릭스 완료, BRF 점자 전문가 검증 |
| 9/16–9/30 | RC | `release-readiness.yml` 실행, 모든 RC 체크리스트 서명, 백업 영상 촬영 |

---

## 12. 테스트 환경 및 데이터 격리

### 12.1 환경 분리

| 환경 | DB | KTO 데이터 | 용도 |
|---|---|---|---|
| `local` | Supabase CLI로컬 (`supabase start`) | fixtures 전용 | 개발·유닛·계약 |
| `ci` | CI 전용 Supabase 프로젝트 (`secrets.TEST_SUPABASE_URL`) | demo seed + fixtures | PR E2E |
| `demo` | CI 전용 Supabase + snapshot fixture | snapshot only | 심사 데모 |
| `prod` | `ap-northeast-2` Supabase Pro | ETL 실 데이터 | 실 서비스 |

### 12.2 Demo Seed vs Prod 데이터 격리 원칙

```typescript
// packages/db/src/demoSeed.ts

export async function seedDemoData(supabase: SupabaseClient) {
  // 실 KTO API 호출 없음 — fixtures 파일에서만
  const gongsanFixture = require('packages/test-fixtures/kto/detailWithTour2/gongsan-264736.json');
  // ...
}
```

```bash
# 심사 1주 전 스냅샷 확정
pnpm run etl:snapshot-freeze --tag rc-2026-09-15
# 이후 demo 환경은 frozen snapshot만 사용
```

### 12.3 Supabase RLS SQL 테스트

```sql
-- supabase/tests/rls_barrier_reports.test.sql

begin;
select plan(6);

-- anon은 제보 작성 불가
set local role anon;
select throws_ok(
  $$ insert into barrier_reports (poi_id, category, reporter_id) values ('gongsan', 'entry', auth.uid()) $$,
  'new row violates row-level security policy'
);

-- authenticated non-anonymous는 제보 작성 가능
set local role authenticated;
set local request.jwt.claims to '{"sub":"user-1","is_anonymous":false}';
select lives_ok(
  $$ insert into barrier_reports (poi_id, category, reporter_id) values ('gongsan', 'entry', 'user-1') $$
);

-- anon이 승인된 제보만 읽을 수 있음
set local role anon;
select results_eq(
  $$ select count(*)::int from barrier_reports where status = 'approved' $$,
  $$ values (1) $$
);

-- admin은 pending 포함 전체 읽기
set local request.jwt.claims to '{"sub":"admin-1","is_anonymous":false}';
insert into platform_admins (user_id) values ('admin-1');
set local role authenticated;
select results_eq(
  $$ select count(*)::int from barrier_reports $$,
  $$ values (2) $$ -- pending 1 + approved 1
);

select * from finish();
rollback;
```

---

## 부록 A. 패키지별 테스트 커맨드

```jsonc
// 루트 package.json scripts (선발췌)
{
  "scripts": {
    "test": "pnpm -r run test",
    "test:domain": "pnpm --filter domain test",
    "test:contract": "jest --testPathPattern='tests/contract'",
    "test:exports-golden": "jest --testPathPattern='exports/__tests__.*golden'",
    "test:content-package": "jest --testPathPattern='content-package.contract'",
    "e2e": "playwright test",
    "e2e:golden": "playwright test tests/e2e/d1-golden-flow.spec.ts",
    "e2e:a11y": "playwright test tests/e2e/a11y-routes.spec.ts",
    "e2e:resilience": "playwright test tests/e2e/demo-resilience.spec.ts",
    "lighthouse": "lhci autorun",
    "start:demo": "USE_DEMO_SEED=true node apps/web/server.js",
    "validate-content": "ts-node scripts/validate-content/index.ts",
    "validate-ai-labels": "ts-node scripts/validate-ai-labels/index.ts",
    "validate-media-license": "ts-node scripts/validate-media-license/index.ts"
  }
}
```

## 부록 B. 핵심 의존 라이브러리 버전 (2026-06 기준)

| 라이브러리 | 버전 | 용도 |
|---|---|---|
| `@playwright/test` | ~1.50.x | E2E + a11y E2E |
| `@axe-core/playwright` | ~4.11.x | E2E axe 스캔 |
| `axe-core` | ~4.11.4 | 엔진 (lockstep) |
| `jest-axe` | 10.0.0 | 컴포넌트 axe (jsdom) |
| `@storybook/addon-a11y` | Storybook 9 | 컴포넌트 대비 검사 |
| `@storybook/addon-vitest` | Storybook 9 | Storybook CI 연동 |
| `eslint-plugin-jsx-a11y` | 최신 | 정적 a11y lint |
| `treosh/lighthouse-ci-action` | @v12 | Lighthouse CI |
| `@supabase/ssr` | ~0.12.x | Supabase 서버 클라이언트 |
| `fast-check` | 최신 | 속성 기반 테스트 (선택) |
