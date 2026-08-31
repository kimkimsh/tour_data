# 06 — 적합도 산식 (`src/domain/suitability.ts`)

> 이 문서가 **모든 수치의 단일 권위**다. 다른 문서는 링크만 하고 값을 다시 쓰지 않는다.
> 원본은 `docs/plan/16_suitability_policy.md`. 좋은 부분은 그대로 가져왔고, **정의되지 않았거나 구현 불가능했던 6곳을 메웠다** (§9에 변경 내역).

---

## 1. 이 산식이 하는 일

사용자가 고른 **동행 조건(페르소나)** 과 **관광지의 무장애 사실**을 넣으면
**0~100점 + 판정 라벨 + 그 판정이 나온 이유 전부**를 돌려주는 **순수 함수**다.

핵심은 점수가 아니라 **근거 공개**다. 심사에서도, 실제 사용자에게도, "왜 이 점수인가"를 화면에서 바로 확인할 수 있는 것이 이 서비스의 차별점이다.

```
score = round( clamp( 100 × A × B × C × D , 0, 100 ) )

A = 관광지 자체의 무장애 시설 목록      (페르소나 무관, 6개 축)
B = 내 조건에 얼마나 맞는가             (0.75 ~ 1.00, 여러 명이면 가장 낮은 사람 기준)
C = 공식 인증 보정                       (1.00 ~ 1.12, 상한 있음)
D = 데이터 신선도                        (0.75 ~ 1.00)
```

**순수 함수 규칙:** DB·네트워크·`Date.now()`·React를 쓰지 않는다. 현재 날짜는 `calculationDate` 인자로 주입한다. 같은 입력이면 언제나 같은 출력이다.

---

## 2. 출력 계약 (`src/domain/types.ts`)

```ts
export type CapabilityStatus = 'supported' | 'partial' | 'unsupported' | 'unknown';
export type AbsenceKind = 'intrinsic' | 'operator_missing' | 'not_applicable';
export type PersonaId = 'P1a' | 'P1b' | 'P2a' | 'P2b' | 'P3';
export type Axis = 'entry' | 'continuity' | 'facility' | 'information' | 'rest' | 'context';

/** 판정 라벨. 철자 고정. '정보없음'은 띄어쓰기 없음(값), 화면 문구는 '정보 없음'(표시). */
export type SuitabilityLabel = '방문가능' | '주의' | '대체추천' | '정보없음';

export interface AxisBreakdown {
  axis: Axis;
  labelKo: string;          // '진입' | '이동' | '편의시설' | '정보안내' | '휴식' | '상황'
  weight: number;           // 고정 가중치 (합 1.00)
  rawScore: number;         // 0..1
  weighted: number;         // weight × rawScore
  knownCount: number;       // 이 축에서 status ≠ unknown 인 항목 수
  totalCount: number;       // 이 축의 전체 항목 수
}

export interface Deduction {
  capabilityCode: string;
  labelKo: string;
  reason: string;           // '엘리베이터 없음' 등 한국어 문장
  impact: number;           // 이 항목 때문에 잃은 점수(근사치, 표시용)
}

export interface AlternativePoi {
  poiSlug: string;
  title: string;
  score: number;
  label: SuitabilityLabel;
}

export interface SuitabilityResult {
  /** 0..100 정수. label === '정보없음' 이면 화면에 표시하지 않는다(§6.4). */
  score: number;
  label: SuitabilityLabel;

  layerA: number;                    // 0..1
  layerB: number;                    // 0.75..1.00
  layerC: number;                    // 1.00..1.12
  layerD: number;                    // 0.75..1.00
  axes: AxisBreakdown[];             // 6개

  /** 선택한 페르소나에게 중요한 항목 중 상태를 아는 비율. 0..1 */
  coverage: number;
  /** 0..100. 점수와 곱하지 않는다. '데이터 신뢰도' 칩으로 따로 표시 */
  evidenceConfidence: number;

  /** 선택 페르소나의 critical 항목 중 unsupported 인 것 */
  knownCriticalBlockers: string[];
  /** 선택 페르소나의 critical 항목 중 unknown 인 것 */
  unknownCriticals: string[];

  deductions: Deduction[];
  alternatives: AlternativePoi[];    // score < 70 일 때만 채워진다

  /**
   * isKtoScored 인 24항목 중 상태가 unknown 인 개수.
   * 입력 facts 가 스냅샷 그대로이므로 갭 리포트(S10)도 같은 배열을 세고,
   * 두 화면의 숫자는 구조적으로 같을 수밖에 없다.
   */
  ktoUnknownCount: number;
  ktoTotalCount: number;             // 항상 24

  /** 화면의 '데이터 기준일' 표시용 */
  dataDates: { capabilityCode: string; verifiedAt: string | null; source: string }[];
  policyVersion: string;             // 'suitability-v2'
}
```

### 입력

```ts
export interface SuitabilityInput {
  /**
   * `accessibility` 스냅샷에서 그대로 온다 (04_data_model.md §3.3).
   * 출처 우선순위는 수집 시점에 이미 적용돼 있어 (poiSlug, capabilityCode) 조합이
   * 정확히 한 번만 나온다. 이 함수는 우선순위를 다시 계산하지 않는다.
   * ★ 방문자 제보는 여기 들어오지 않는다 — 사실이 아니라 발언이다.
   */
  facts: ReadonlyArray<{
    capabilityCode: string;
    status: CapabilityStatus;
    absenceKind: AbsenceKind | null;
    detail: string | null;
    source: string;                  // 'kto_with' | 'curated' | 'derived_*' | 'tats' | 'kma'
    verifiedAt: string | null;       // ISO 날짜
  }>;
  /** 빈 배열이면 §4.1의 P0(일반 방문)으로 계산한다 */
  personaIds: ReadonlyArray<PersonaId>;
  cognitiveOption: boolean;          // P3의 인지·발달 옵션
  certifications: ReadonlyArray<{ grade: string; validUntil: string | null }>;
  calculationDate: string;           // ISO. Date.now() 직접 호출 금지
  scoredAlternatives: ReadonlyArray<AlternativePoi>;  // 이미 점수가 계산된 다른 관광지들
}
```

---

## 3. Layer A — 관광지 시설 목록 (페르소나 무관)

```
A = 0.30·진입 + 0.18·이동 + 0.18·편의시설 + 0.14·정보안내 + 0.10·휴식 + 0.10·상황
```

| 축 | 코드 | 가중치 | 포함 항목 | 개수 |
|---|---|---|---|---|
| 진입 | `entry` | **0.30** | `access_route` `entrance_passage` `wheelchair` `elevator` `ticket_office` `help_dog` | 6 |
| 이동 | `continuity` | **0.18** | `public_transport` `braille_block` `guide_system` `path_continuity` | 4 |
| 편의시설 | `facility` | **0.18** | `restroom` `parking` `stroller` `nursing_room` `baby_chair` `room` `hearing_room` | 7 |
| 정보안내 | `information` | **0.14** | `audio_guide` `big_print` `braille_promotion` `promotion_material` `guide_human` `sign_guide` `video_caption` | 7 |
| 휴식 | `rest` | **0.10** | `auditorium` `rest_seating` `shade_indoor` | 3 |
| 상황 | `context` | **0.10** | `crowd_forecast` `weather_warning` `emergency_distance` `aed_distance` | 4 |
| | | **1.00** | | **31** |

### 축 안의 세부 가중치 — **균등**

각 축의 `rawScore`는 그 축에 속한 항목 값들의 **단순 평균**이다.

> **왜 명시하는가:** 기존 스펙은 "세부 가중치는 정책 JSON에 있다"고 썼는데 **그 JSON은 작성된 적이 없다.** 25개 항목의 세부 가중치를 지금 지어내는 것보다 균등이 낫다 — 근거 없이 어떤 항목이 다른 항목보다 1.5배 중요하다고 주장할 수 없기 때문이다. **항목의 중요도 차이는 Layer B(페르소나 등급)에서만 반영한다.** 이게 A와 B의 역할 분리이기도 하다.

### 항목 상태 → 값

| 상태 | 값 |
|---|---|
| `supported` | **1.00** |
| `partial` | **0.50** |
| `unsupported` | **0.00** |
| `unknown` | **0.35** |

> `unknown = 0.35`는 기존 스펙에서 사용자가 확정한 값이므로 유지한다. 의미는 "모르는 것은 없는 것(0.00)보다는 낫지만 있는 것(1.00)으로 치지 않는다"이다. 이 값이 낙관적으로 보일 수 있어 **§6의 라벨 규칙과 coverage 상한**이 안전장치로 붙는다.

---

## 4. Layer B — 내 조건에 맞는가

```
personaFit(p) = Σ(항목값 × 등급가중치(p, 항목)) / Σ(등급가중치(p, 항목))
등급가중치: critical = 4 · supporting = 2 · other = 1

B = 0.75 + 0.25 × min( 선택한 모든 페르소나의 personaFit )
```

**`min`이 핵심이다.** 휠체어를 쓰는 할아버지와 유아차를 미는 딸이 함께 가면, 딸에게 맞는 점수가 할아버지의 장벽을 가리면 안 된다. **가장 조건이 안 맞는 사람 기준**으로 판정한다.

`B`의 범위는 `0.75 ~ 1.00`이다. B 혼자서는 점수를 25%까지만 깎을 수 있고, **결정적인 차단은 §6의 강제 규칙이 한다.**

### 4.1 페르소나

| ID | 이름 | 설명 |
|---|---|---|
| `P1a` | 휠체어 이용 | 수동·전동 휠체어, 스쿠터 |
| `P1b` | 시니어·보행 약자 | 지팡이·보행기, 만성질환, 오래 걷기 어려움 |
| `P2a` | 시각장애 | 저시력 포함. 보조견 동반 |
| `P2b` | 청각장애 | 수어 사용 포함 |
| `P3` | 영유아 동반 가족 | 유아차. **인지·발달 옵션**을 켤 수 있음 |

| `P0` | *(조건 미선택)* | **합성 페르소나.** 아무것도 안 고르면 이걸로 계산한다 |

**`P0`(일반 방문)** — 사용자가 조건을 하나도 안 골랐을 때 쓰는 합성 페르소나다. **31개 항목 전부를 `other`(등급 가중치 1) 로 본다.**
- `personaFit(P0)` = 31개 항목값의 단순 평균
- `coverage`의 "관련 항목"은 **31개 전부**
- `critical`이 없으므로 §6.4의 1·2·4a 규칙이 발동하지 않는다

> 이걸 정의해 두지 않으면 `B = 0.75 + 0.25 × min(빈 집합)`과 `coverage = 0 / 0`이 되어 계산이 깨진다.

**인지·발달 옵션**은 별도 페르소나가 아니라 P3의 하위 옵션이다. 켜면
- 코스의 휴식 간격 권장값이 짧아지고 (§7)
- 경로 안내가 **한 번에 한 단계만** 보이는 모드로 바뀌며 (`07_screens.md` S5)
- 화면 애니메이션이 최소화된다

**등급을 바꾸지는 않는다.** (기존 스펙은 등급을 올렸는데, 그러면 §4.2의 규칙이 깨진다.)

### 4.2 설계 규칙 — `critical`은 KTO 24항목에만 준다

**파생 항목 7개(`path_continuity` `rest_seating` `shade_indoor` `crowd_forecast` `weather_warning` `emergency_distance` `aed_distance`)는 최대 `supporting`이다.**

> **왜:** 파생 항목은 우리가 콘텐츠 파일이나 부가 API로 채우는 것이라 **비어 있는 게 정상**이다. 이걸 `critical`로 두면 §6의 "critical이 unknown이면 정보없음" 규칙이 발동해서 **거의 모든 관광지가 모든 사용자에게 '정보없음'** 이 된다. 기존 스펙이 정확히 이 상태였다.
>
> `critical`은 "이게 안 되면 이 사람은 못 간다"는 뜻이고, 그런 판단은 **실제로 데이터가 있는 항목**에서만 해야 한다.

### 4.3 페르소나 × 항목 등급표

`C` = critical(×4) · `S` = supporting(×2) · `·` = other(×1)

| 항목 | 축 | P1a 휠체어 | P1b 시니어 | P2a 시각 | P2b 청각 | P3 가족 |
|---|---|:--:|:--:|:--:|:--:|:--:|
| `access_route` 접근로 | 진입 | **C** | **C** | S | · | S |
| `entrance_passage` 출입통로 | 진입 | **C** | **C** | · | · | S |
| `wheelchair` 휠체어 | 진입 | **C** | S | · | · | · |
| `elevator` 엘리베이터 | 진입 | **C** | **C** | · | · | S |
| `ticket_office` 매표소 | 진입 | S | S | S | S | · |
| `help_dog` 보조견 동반 | 진입 | · | · | **C** | · | · |
| `public_transport` 대중교통 | 이동 | S | S | S | · | S |
| `braille_block` 점자블록 | 이동 | · | · | **C** | · | · |
| `guide_system` 유도 안내 설비 | 이동 | · | S | **C** | S | · |
| `path_continuity` 경로 연속성 ※ | 이동 | S | S | S | · | S |
| `restroom` 화장실 | 편의시설 | **C** | **C** | S | · | **C** |
| `parking` 주차 | 편의시설 | S | S | · | · | S |
| `stroller` 유모차 | 편의시설 | · | · | · | · | **C** |
| `nursing_room` 수유실 | 편의시설 | · | · | · | · | S |
| `baby_chair` 유아용 보조의자 | 편의시설 | · | · | · | · | S |
| `room` 객실 | 편의시설 | · | · | · | · | · |
| `hearing_room` 객실(청각) | 편의시설 | · | · | · | S | · |
| `audio_guide` 오디오 가이드 | 정보안내 | · | S | **C** | · | · |
| `big_print` 큰 활자 홍보물 | 정보안내 | · | S | **C** | · | · |
| `braille_promotion` 점자 홍보물·표지 | 정보안내 | · | · | **C** | · | · |
| `promotion_material` 홍보물 | 정보안내 | · | · | S | S | · |
| `guide_human` 안내요원 | 정보안내 | S | S | **C** | S | · |
| `sign_guide` 수화 안내 | 정보안내 | · | · | · | **C** | · |
| `video_caption` 자막 영상 안내 | 정보안내 | · | · | · | **C** | S |
| `auditorium` 관람석 | 휴식 | S | S | · | · | S |
| `rest_seating` 휴식 좌석 ※ | 휴식 | S | S | S | · | S |
| `shade_indoor` 그늘·실내 휴게 ※ | 휴식 | · | S | · | · | S |
| `crowd_forecast` 예측 혼잡도 ※ | 상황 | S | S | · | · | S |
| `weather_warning` 기상 특보 ※ | 상황 | · | S | · | · | S |
| `emergency_distance` 응급실 거리 ※ | 상황 | S | S | · | · | S |
| `aed_distance` 자동심장충격기 거리 ※ | 상황 | · | S | · | · | · |

※ = 파생 항목 (§4.2에 따라 `critical` 불가)

**페르소나별 critical 항목 (§6 강제 규칙의 대상):**

| 페르소나 | critical 항목 |
|---|---|
| P1a 휠체어 | `access_route` `entrance_passage` `wheelchair` `elevator` `restroom` (5개) |
| P1b 시니어 | `access_route` `entrance_passage` `elevator` `restroom` (4개) |
| P2a 시각 | `help_dog` `braille_block` `guide_system` `audio_guide` `big_print` `braille_promotion` `guide_human` (7개) |
| P2b 청각 | `sign_guide` `video_caption` (2개) |
| P3 가족 | `restroom` `stroller` (2개) |

> **예상되는 결과 하나를 미리 적어 둔다.** 청각장애(P2b)의 critical 두 항목(`수화 안내`, `자막 영상 안내`)은 **6곳 대부분에서 비어 있을 가능성이 높다.** 그러면 청각장애 조건으로 조회했을 때 대부분이 `정보없음`으로 나온다.
> **이건 버그가 아니라 이 서비스가 밝히려는 사실이다.** 그리고 그것이 갭 리포트(S10)의 1순위 항목이 된다. 화면에 "이 관광지는 청각장애 관련 정보가 등록돼 있지 않습니다"라고 정확히 쓰고, 개선 필요 목록에 올린다.

---

## 5. Layer C — 인증 보정 (상한 있음)

```
C = 1.00 + min( 0.12,
                Σ[ BF 예비인증 +0.02 | BF 일반인증 +0.05 | BF 우수인증 +0.08 ]
              + [ 열린관광지 +0.04 ] )
→ 범위 1.00 ~ 1.12
```

- 유효기간이 지난 인증은 반영하지 않는다.
- **안전장치:** 인증만으로 라벨 구간을 넘지 못한다. `C = 1.00`으로 계산했을 때와 라벨이 달라지면, **라벨은 `C = 1.00` 기준으로 정하고** 인증은 신뢰도 배지로만 표시한다.
- **현실:** 6곳 중 BF 인증이나 열린관광지 지정이 있는 곳이 몇 곳인지 아직 모른다 → `content/certifications.json`. 없으면 전부 `C = 1.00`이고 그래도 산식은 정상 동작한다.

> 제안서의 "×1.30" 보정은 정밀도 과장이라 **+0.12 상한**으로 낮춘 것이 기존 스펙의 결정이고 그대로 유지한다.

---

## 6. Layer D · coverage · 라벨

### 6.1 Layer D — 데이터 신선도

```
D = 평균( 항목별 신선도 )          ← 단순 평균. 가중치 없음
    신선도: 확인일이 90일 이내 → 1.00 · 365일 이내 → 0.90 · 그보다 오래됨 → 0.75
```

- **`status ≠ unknown`인 항목만** 계산에 넣는다 (`unknown`은 확인일이라는 개념이 없다).
- 그런 항목이 하나도 없으면 `D = 0.75`.
- **§6.3의 `평균신선도`는 이 `D`와 같은 값**이다. 두 이름이 같은 것을 가리킨다.

> **단순 평균인 이유:** §3에서 축 안의 세부 가중치를 균등으로 정한 것과 같다. 어떤 항목의 신선도가 다른 항목보다 더 중요하다고 주장할 근거가 없다.
- KTO 항목의 확인일은 그 관광지의 KTO 최종 수정일이다 → [`05_ingest.md`](./05_ingest.md) §4.3.

### 6.2 coverage — "내게 중요한 것 중 아는 비율"

```
관련 항목 = 선택한 페르소나 중 누구라도 critical 또는 supporting 으로 취급하는 항목
coverage  = (관련 항목 중 status ≠ unknown 인 개수) / (관련 항목 개수)
```

> **기존 스펙의 구멍을 메운 부분.** 기존 스펙은 "relevant capabilities"를 정의하지 않았다. 31개 전부인지, 선택 페르소나에게 중요한 것만인지에 따라 §6.4의 상한이 발동하는 시점이 달라진다.
> **선택한 이유:** coverage는 "이 사람이 판단하기에 충분한 정보가 있는가"를 재는 값이다. 청각장애 사용자에게 유아차 정보의 유무는 판단에 영향을 주지 않는다.

### 6.3 evidenceConfidence — 점수와 분리해서 표시

```
evidenceConfidence = round( 100 × coverage × 평균신선도 )
```

**점수에 곱하지 않는다.** 화면에 "데이터 신뢰도 62%" 같은 별도 칩으로 표시한다.
이유: 데이터가 오래되거나 비어 있는 것은 **불확실**이지 **부적합**이 아니다. 두 개를 하나의 숫자로 섞으면 사용자가 오해한다.

### 6.4 라벨 결정 — 순서대로, 결과는 항상 하나

```
필수 = 선택한 페르소나 중 누구라도 critical 로 취급하는 항목
       (P1a 5개 · P1b 4개 · P2a 7개 · P2b 2개 · P3 2개 — §4.3)

1) 필수 중 status === 'unsupported' 인 것이 있으면
   → label = '대체추천', score = min(score, 49)
   → knownCriticalBlockers 에 기록
   ※ "안 된다는 걸 확실히 아는 것"은 결정적이다. 이 규칙이 최우선이다.

2) 아니고, 필수 중 unknown 이 과반이면  (unknownCriticals.length / 필수개수 > 0.5)
   → label = '정보없음'
   → 화면에 점수를 표시하지 않는다 (§6.6)
   ※ 필수의 절반 넘게 모르면 판정 자체가 성립하지 않는다.

3) 아니면 점수 구간으로:
   75~100 → '방문가능'
   50~74  → '주의'
   0~49   → '대체추천'

4) 3)의 라벨에 상한을 적용 (둘 중 하나라도 해당하면 '방문가능'이 될 수 없다):
   4a) 필수 중 unknown 이 1개 이상 있으면      → 라벨 상한 '주의'
   4b) coverage < 0.65 이면                    → 라벨 상한 '주의'

5) score < 70 이면 alternatives 를 채운다 (§6.5)
```

**입력 하나당 라벨은 정확히 하나다.** 골든 테스트가 이걸 검증한다.

#### 왜 "하나라도 unknown이면 정보없음"이 아니라 "과반"인가

**처음에는 필수 항목 중 하나라도 `unknown`이면 `정보없음`으로 정했다. 그건 틀렸다.**

실제 데이터에서 무장애 24항목 중 채워진 것은 **4~7개 수준**이다([`03_external_data.md`](./03_external_data.md) §2.1 참고 절 — 한국관광공사 자체 서비스가 청각장애 분야에 필터를 하나도 안 준다). 이 상태에서 "필수 5개가 전부 채워져 있을" 확률은 거의 0이다.

그러면 **모든 관광지가 모든 사용자에게 `정보없음`이 되고 점수가 전부 숨겨진다.** 이건 [`00_README.md`](./00_README.md) §1이 기존 스펙의 결함으로 지적한 "화면이 전부 빈칸이 된다"와 **정확히 같은 결과다.** 형태만 바꿔 재현한 것이었다.

**고친 방향 — 라벨이 불확실성의 '모양'을 담게 한다.**

| 상태 | 사용자에게 유용한 답 | 라벨 |
|---|---|---|
| 필수 중 안 되는 게 확실한 게 있다 | "여긴 못 갑니다" | `대체추천` |
| 필수의 과반을 모른다 | "판단할 정보가 없습니다" | `정보없음` (점수 숨김) |
| 필수를 대체로 알고 일부만 모른다 | **"대체로 괜찮은데 엘리베이터는 확인이 필요합니다"** | `주의` + 미확인 항목 명시 |
| 필수를 전부 알고 대체로 갖춰졌다 | "갈 수 있습니다" | `방문가능` |

**필수 5개 중 4개를 알고 1개를 모르는 것은 "정보 없음"이 아니다.** 그건 쓸모 있는 정보이고, 사용자는 "무엇을 확인해야 하는지"를 알고 출발할 수 있다. 4a 규칙이 그걸 `방문가능`으로는 못 올라가게 막는다 — 화장실이 있는지 모르면서 휠체어 사용자에게 "방문 가능"이라고 말할 수는 없다.

**화면 요구사항 (강제):** 라벨이 `주의`이고 `unknownCriticals`가 비어 있지 않으면, **라벨 바로 옆에 미확인 항목 이름을 반드시 표시한다.** "주의 필요"만 쓰고 무엇을 확인해야 하는지 안 알려주면 이 규칙의 의미가 없다.
→ 예: `⚠ 주의 필요 52점 · 확인 필요: 엘리베이터`

**과반 기준(> 0.5)의 경계 동작:**

| 필수 개수 | unknown | 비율 | 라벨 |
|---|---|---|---|
| 5 (P1a) | 1 | 0.20 | 정보없음 아님 → 주의 상한 |
| 5 | 2 | 0.40 | 정보없음 아님 → 주의 상한 |
| 5 | 3 | 0.60 | **정보없음** |
| 2 (P2b) | 1 | 0.50 | 정보없음 아님 (**초과**가 아님) → 주의 상한 |
| 2 | 2 | 1.00 | **정보없음** |

#### 구간 임계값은 1주차에 실데이터로 한 번 조정한다

이 산식을 실제 값으로 돌려 보면 **대부분의 관광지가 `주의`나 `정보없음`에 몰릴 가능성이 높다.**

계산해 보면 그렇다. `unknown = 0.35`이므로, `방문가능`(75점 이상)을 받으려면 관련 항목의 **약 80% 이상이 `supported`이고 데이터도 최신**이어야 한다. 무장애 항목이 절반쯤 비어 있는 사적지는 50점대에 앉는다.

| 상황 | 대략적인 점수 |
|---|---|
| 전 항목 확인·지원 | 100 |
| 80% 지원 + 20% 정보 없음 | 약 76 |
| 절반 지원 + 절반 정보 없음 | 약 56 |
| 전 항목 정보 없음 | 약 22 (그리고 라벨은 `정보없음`) |

**이건 산식이 잘못된 게 아니라 데이터가 실제로 그렇다는 뜻이다.** 그래도 라벨이 전부 `주의` 하나로 뭉치면 판정으로서의 쓸모가 없어진다.

**그래서:** 1주차에 6곳 실제 데이터로 점수를 뽑아 보고, **분포를 보고 `75 / 50` 두 임계값을 한 번만 조정한다.** 조정하면 정책 버전을 `suitability-v2.1`로 올리고 골든 파일을 재생성한다. 이후로는 건드리지 않는다.

**조정하지 않는 것:** `unknown = 0.35`, Layer C 상한 `+0.12`, Layer D 감쇠값. 이 셋은 그대로 둔다.

> **기존 스펙의 모순 하나를 정리했다.** 기존에는 §6에서 "coverage<0.65 → 주의 상한"이라고 하고 §9에서는 "coverage<0.65 → 정보없음"이라고 해서, 같은 입력에 두 라벨이 나올 수 있었다. **위 순서가 정답이다:** critical이 unknown이면 `정보없음`, critical은 다 알지만 전반적으로 데이터가 부족하면 `주의` 상한.

### 6.5 대체 관광지 (`alternatives`)

- `score < 70`일 때만 채운다.
- **우리가 점수를 계산한 6곳 중에서만** 고른다. 같은 조건으로 계산했을 때 점수가 더 높은 곳을 최대 3개.
- **연관 관광지 API(`TarRlteTarService1`) 결과는 절대 여기 넣지 않는다.** 그건 차량 이동 데이터 기반이고 접근성이 전혀 검증되지 않았다. 화면에는 **"관련 관광지 (접근성 미검증)"** 이라는 **별도 목록**으로, 경고 문구와 함께 보여준다.

### 6.6 화면 표시 규칙

| 상황 | 점수 | 라벨 | 반드시 함께 표시 |
|---|---|---|---|
| `label === '정보없음'` | **숨김 (`—`)** | `정보 없음` | "판단할 정보가 부족합니다 — 현장 확인 필요" + **모르는 필수 항목 이름 전부** |
| `unknownCriticals.length > 0` (라벨은 주의/대체추천) | 숫자 표시 | 라벨 배지 | **`확인 필요: {항목 이름들}`** ← §6.4의 강제 요구사항 |
| 그 외 | 숫자 표시 | 라벨 배지 | 데이터 신뢰도 칩 |

**모든 경우에 공통:** `정보 없음 {ktoUnknownCount}건 / {ktoTotalCount}건`을 항상 함께 보여준다. 점수만 있고 "몇 개를 모르는지"가 없으면 과신을 부른다.

> 라벨이 `정보없음`인데 점수 26점이 같이 보이면 사용자가 "26점짜리 관광지"로 읽는다. 모를 때는 **숫자를 보여주지 않는 게 맞다.**
>
> 반대로 `coverage < 0.30`을 별도의 점수 숨김 조건으로 두던 규칙은 **삭제했다.** §6.4와 별개로 존재해서 같은 입력에 두 라벨이 나올 수 있었다 — §6.4 하나만 라벨을 정한다.

라벨 배지는 **색 + 아이콘 + 글자 3가지를 함께** 쓴다(색만으로 구분 금지):

| 라벨 | 색 | 아이콘 | 글자 |
|---|---|---|---|
| 방문가능 | `#1B7A2E` (초록) | ✓ | 방문 가능 |
| 주의 | `#8A6100` (황갈, 흰 글자) | ⚠ | 주의 필요 |
| 대체추천 | `#C0392B` (빨강) | ✕ | 다른 곳 권장 |
| 정보없음 | `#5A5A5A` (회색) | ? | 정보 없음 |

### 6.7 KTO 항목 개수 (갭 리포트와의 정합성)

`ktoUnknownCount` / `ktoTotalCount`는 **페르소나와 무관하게** `isKtoScored`인 24항목 기준으로 센다.

입력 `facts`는 **`accessibility` 스냅샷 그대로**다. 출처 우선순위(콘텐츠 파일 > 파생 > 한국관광공사)는 **수집 시점에** 이미 적용돼 `(poiSlug, capabilityCode)` 조합이 정확히 한 번만 나온다 ([`05_ingest.md`](./05_ingest.md) §4.4).

갭 리포트(S10)도 **같은 배열을 센다.** 그래서 관광지 상세의 "정보 없음 n건"과 갭 리포트의 숫자는 구조적으로 같을 수밖에 없다.

**도메인 함수는 출처 우선순위를 다시 계산하지 않는다.** 계산이 두 곳에 있으면 반드시 갈라진다.

`coverage`(페르소나 기준)와는 **다른 값**이다. 화면에서 두 숫자를 나란히 놓지 않는다.

---

## 7. 코스 계산 (`src/domain/itinerary.ts`)

**최적화기가 아니라 선택기다.**

```ts
buildItinerary({ budgetMode, personaIds, cognitiveOption, templates, scores })
  → { template, pois, totalMinutes, restBreaks, warnings }
```

1. `content/itineraries.json`에서 `budgetMode`가 맞는 것을 고른다.
2. 총 소요 시간 = Σ(체류 시간 × 페르소나 배수) + Σ(이동 시간) + 휴식 시간
3. **페르소나 배수는 곱하지 않고 가장 큰 것 하나만 쓴다.** 여러 조건을 곱하면 시간이 폭발한다.

| 페르소나 | 체류 시간 배수 |
|---|---|
| P1a 휠체어 | 1.25 |
| P1b 시니어 | 1.30 |
| P2a 시각 | 1.20 |
| P2b 청각 | 1.00 |
| P3 가족 | 1.20 |
| P3 + 인지·발달 옵션 | 1.40 |

4. **휴식 권장 간격** — 이 간격을 넘는 이동 구간이 있으면 경고를 붙인다.

| 페르소나 | 연속 이동 권장 한계 |
|---|---|
| P1a | 25분 |
| P1b | 15분 |
| P2a | 30분 |
| P2b | 40분 |
| P3 | 20분 |
| P3 + 인지·발달 옵션 | 15분 |

여러 명이면 **가장 짧은 값**을 쓴다.

> **기존 스펙과 다른 점:** 기존에는 휴식 간격이 Layer A의 `rest` 축 점수를 계산하는 공식에 들어갔다. 그러려면 경로 구간별 소요 시간 데이터가 필요한데 A등급 2곳에만 있다. **점수에서 빼고 코스 화면의 경고로 옮겼다.** 사용자에게 더 유용하고, 데이터가 없어도 산식이 망가지지 않는다.

---

## 8. 골든 테스트 (`src/domain/__tests__/`)

**17건.** 기존 스펙은 30건 이상 + 전문가 서명을 요구했지만, 17건으로 모든 분기를 덮을 수 있다.

| # | 이름 | 검증하는 것 |
|---|---|---|
| 1 | `p1a-all-supported` | 전 항목 supported, 휠체어 → 방문가능, 점수 90+ |
| 2 | `p1b-all-supported` | 시니어 단독 |
| 3 | `p2a-all-supported` | 시각 단독 |
| 4 | `p2b-all-unknown` | 청각 필수 2개가 전부 unknown (비율 1.00) → **정보없음**, 점수 미표시 |
| 5 | `p3-all-supported` | 가족 단독 |
| 6 | `multi-persona-min` | P1a+P1b+P3 동시 선택 시 **가장 낮은 personaFit**이 쓰이는지 |
| 7 | `critical-unsupported` | 엘리베이터 unsupported + 휠체어 → **대체추천**, score ≤ 49 |
| 8 | `critical-unknown-minority` | P1a 필수 5개 중 1개(엘리베이터)만 unknown → **정보없음 아님.** 라벨 상한 `주의`, `unknownCriticals = ['elevator']` (§6.4 4a) |
| 9 | `critical-unknown-majority` | P1a 필수 5개 중 3개 unknown (비율 0.60) → **정보없음**, 점수 미표시 |
| 9b | `critical-unknown-boundary` | 필수 2개(P2b) 중 1개 unknown (비율 0.50, **초과 아님**) → 정보없음 아님, 라벨 상한 `주의` |
| 9c | `coverage-cap` | 필수는 전부 알지만 coverage = 0.60 → 점수는 80인데 라벨은 **주의** (§6.4 4b) |
| 10 | `coverage-boundary` | coverage = 0.65 정확히 → 상한 발동 안 함 (경계) |
| 11 | `layer-c-guard` | 인증 때문에 74 → 75가 되는 경우 → 라벨은 `C=1.00` 기준(주의) 유지 |
| 12 | `layer-c-cap` | 인증 4개 합산해도 C ≤ 1.12 |
| 13 | `stale-data` | 전 항목 400일 전 확인 → D = 0.75, evidenceConfidence 하락 |
| 14 | `alternatives-69-70` | 점수 69 → 대체 목록 채움 / 70 → 안 채움 (경계) |
| 15 | `determinism` | 같은 입력 100회 → 100회 같은 출력 |

**골든 파일 형식:** `{ name, input, expected }` JSON. `UPDATE_GOLDEN=1 pnpm test`로 재생성한다.
**관광지 상세 화면의 계산 예시 표는 골든 테스트 결과에서 생성한다.** 손으로 숫자를 적지 않는다.

---

## 9. 기존 스펙(`docs/plan/16_suitability_policy.md`)에서 바꾼 것

| # | 기존 | 지금 | 이유 |
|---|---|---|---|
| 1 | Layer A 축 7개 (`verifiedUgc` 0.07 포함) | **축 6개.** `verifiedUgc` 삭제, 가중치 재배분 | **제보가 0건일 때 이 축의 값이 정의된 적이 없다.** 출시 직후엔 항상 그 상태다. 사용자 제보는 경고 배너 + Layer D 확인일 갱신으로 반영한다 |
| 2 | 항목에 `axis: 'sensory'`가 붙어 있는데 출력 타입에는 `sensory`가 없음 | `information` 축을 정식으로 만듦 | **타입 불일치. 그대로 옮기면 컴파일 안 된다** |
| 3 | 축 안의 세부 가중치 = "정책 JSON 참조" | **균등 평균으로 확정** | 그 JSON은 존재한 적이 없다. 근거 없는 차등보다 균등이 방어 가능하다 |
| 4 | "relevant capabilities" 미정의 | **선택 페르소나가 critical/supporting으로 보는 항목**으로 확정 | 상한 발동 시점이 이것에 달려 있다 |
| 5 | 파생 항목(경로·혼잡도·응급실)도 `critical` 가능 | **파생 항목은 최대 `supporting`** | 그대로 두면 데이터가 없는 항목 때문에 **거의 모든 관광지가 '정보없음'** 이 된다 |
| 6 | §6 "coverage<0.65 → 주의 상한" vs §9 "coverage<0.65 → 정보없음" 모순 | **§6.4의 순서로 통일** | 같은 입력에 두 라벨이 나오면 안 된다 |
| 7 | `rest` 축을 "연속 이동 한계 대비 실제 구간"으로 계산 | **다른 축과 같은 평균.** 휴식 간격은 코스 화면 경고로 이동 | 구간별 소요 시간 데이터가 A등급 2곳에만 있다 |
| 8 | `continuity`를 구간 최솟값으로 계산 | 다른 축과 같은 평균 (최솟값 논리는 `path_continuity` 항목 안으로) | 축마다 계산 규칙이 다르면 설명도, 테스트도 어려워진다 |
| 9 | `evidenceConfidence`에 "2차 승인 증거 있으면 1.0, 없으면 0.85" 계수 | 계수 삭제 | 2차 승인 증거 팩을 만들지 않기로 했다. 항상 0.85면 상수일 뿐이다 |
| 10 | 항목 25개, 페르소나 6개(P4 포함) | **항목 31개, 페르소나 5개** | 실제 KTO 24항목에 맞춰 재구성. P4(단체)는 단체 기능을 안 만들므로 삭제 |
| 11 | 골든 케이스 30건 + 전문가 서명 전 배포 금지 | **15건**, 전문가 검수는 "미실시"로 화면에 표시 | 서명해 줄 전문가가 없다. 게이트를 지키지 못할 바엔 **정직하게 표시하는 것**이 낫다 |
| 12 | 점수와 라벨을 항상 함께 표시 | **`정보없음`이면 점수를 숨김** | "26점" 같은 숫자가 근거 없이 보이는 것을 막는다 |
| 13 | 필수 항목 중 **하나라도** unknown → `정보없음` | **과반(>50%)일 때만** `정보없음`. 소수면 라벨 상한 `주의` + **미확인 항목 이름 노출** | 실제 채움률이 24개 중 4~7개라, 원래 규칙이면 **모든 관광지가 모든 사용자에게 `정보없음`** 이 되어 점수 화면이 전부 빈칸이 된다. `00_README.md` §1이 기존 스펙의 결함으로 지적한 것과 같은 결과를 형태만 바꿔 재현한 것이었다. §6.4 하위 절에 상세 |
| 14 | `coverage < 0.30` → 점수 숨김 (표시 규칙에만 존재) | **삭제** | §6.4와 별개로 존재해서 같은 입력에 두 라벨이 나올 수 있었다. 라벨은 §6.4 한 곳에서만 정한다 |

**정책 버전:** `suitability-v2`. (라벨 규칙 개정 반영) 모든 결과에 `policyVersion`으로 붙는다. 값이 바뀌면 버전을 올리고 골든 파일을 재생성한다.
