# 05 — 수집 파이프라인 (`scripts/ingest.ts`)

> **수집(ingest)** = 외부 API에서 데이터를 받아 우리 저장소에 넣는 작업. 업계에서 ETL(추출-변환-적재)이라고도 한다.
> 사용자 요청과 **무관하게** 하루 한 번 돈다. 이게 있어야 화면이 실행 중에 외부 API를 안 부를 수 있다 ([`00_README.md`](./00_README.md) §4 원칙 3).
>
> 기존 계획은 GitHub Actions 워크플로 + 스테이징 테이블 + 원자 버전 포인터 교체 + HMAC 서명 재검증 엔드포인트 + 4단 파이프라인을 요구했다. 여기서는 **`pnpm ingest` 한 줄로 도는 스크립트 하나**다.

---

## 1. 실행 방법

```bash
pnpm ingest                       # 전체 (스냅샷 6개 다 갱신)
pnpm ingest --only=pois           # 단계별 (§2의 실행 순서와 같은 순서로 적는다)
pnpm ingest --only=routes
pnpm ingest --only=context
pnpm ingest --only=accessibility  # ← routes·context·pois 가 먼저 있어야 파생 항목이 채워진다
pnpm ingest --only=docent
pnpm ingest --only=related
pnpm ingest --dry-run             # 스냅샷을 쓰지 않고 결과만 출력
```

**빌드도 배포도 하지 않는다.** `data_snapshots` 테이블의 행 몇 개를 갈아끼우고 캐시를 비울 뿐이다. 몇 초 안에 화면에 반영된다.

GitHub Actions가 매일 KST 04:00(`0 19 * * *` UTC)에 **전체를 한 번** 돌린다. 수동 실행(`workflow_dispatch`)도 열어 둔다.

> **`context`를 시간마다 돌리지 않는 이유:** 집중률은 **향후 30일 예측치**(§2.4)이고 방문자 추이는 **약 4일 지연** 데이터다(§2.5). 둘 다 한 시간 사이에 바뀌는 값이 아니다. 시간당 수집은 호출만 24배로 늘리고 화면에 새 정보를 주지 않는다. 워크플로도 2개로 유지된다 ([`02_stack.md`](./02_stack.md) §6).

---

## 2. 단계

```
0. bootstrap   (최초 1회)  ldongCode2 + lclsSystmCode2 → content/generated/codes.json
1. pois                    content/pois.json + KorService2 + 다국어 + 사진 + content/*.json
                             → 스냅샷 'pois'            (facilities 포함)
2. routes                  content/routes/*.json        → 스냅샷 'routes'
3. context                 TatsCnctr + DataLab (+기상청) → 스냅샷 'context'
4. accessibility           KorWithService2/detailWithTour2 + 파생 8개(§5.7) + curated-facts
                             → 스냅샷 'accessibility'
5. docent                  Odii + content/docent-easy/*.md → 스냅샷 'docent'
6. related                 TarRlteTar1                     → 스냅샷 'related'
7. revalidate              POST /api/revalidate
```

> **★ `accessibility`가 `routes`·`context` 뒤에 온다. 이 순서는 바꿀 수 없다.**
> §5.7의 파생 항목 8개 중 **`path_continuity`는 `routes`에서, `crowd_forecast`·`weather_warning`은 `context`에서** 값을 얻는다. 그런데 그 값들은 `accessibility` 스냅샷 안으로 들어간다.
> 앞 판의 순서(`pois → accessibility → routes → docent → context → related`)대로 짜면 **파생 3개가 계산될 때 소스가 아직 없어서 전부 `unknown`이 되고, 그 뒤에 `routes`·`context`를 만들어도 이미 저장된 `accessibility`는 바뀌지 않는다.** 화면에는 영원히 `unknown`이 뜬다.
>
> **`--only=` 단계 실행의 규칙:** `--only=accessibility`는 `routes`·`context`·`pois` 스냅샷이 **이미 있어야** 정상이다. 없으면 그 파생 항목이 `unknown`이 된다 — 스크립트는 이때 **중단하지 않고 경고를 출력한다**(부분 실행은 개발 중의 정상 사용이다). `--only=routes` 또는 `--only=context`를 돌린 뒤에는 **`--only=accessibility`를 이어서 돌려야** 파생 항목이 갱신된다.
>
> **§5의 절 번호는 스냅샷 이름 순서이고 실행 순서가 아니다.** 실행 순서는 위 목록이 단일 권위다.

각 단계는 **payload를 통째로 만들어 한 번에 쓴다.**

```ts
// 각 단계의 마지막
const payload = SomePayloadSchema.parse(built);       // ★ 쓰기 전에도 검증한다
await sbAdmin.from('data_snapshots').upsert({
  key: 'accessibility',
  payload,
  row_count: payload.length,
  source_note: '한국관광공사 detailWithTour2 + content/curated-facts.json',
  updated_at: new Date().toISOString(),
});
await fs.writeFile('content/generated/accessibility.json',
                   JSON.stringify(payload, null, 2));  // ★ git 이력용 사본
```

**두 군데에 쓴다:**
- `data_snapshots` — 앱이 읽는 곳. 즉시 반영
- `content/generated/*.json` — **git이 이력을 관리하는 곳.** "어제 대비 뭐가 바뀌었나"를 `git diff`로 본다

GitHub Actions는 수집 후 변경분을 커밋한다. 이게 기존 계획의 `source_records` 테이블을 대체한다.

---

## 3. 실패 처리

기존 계획의 걱정은 정당했다: "수집 중간에 실패하면 반쪽짜리 데이터가 발행된다." 스냅샷 구조에서는 이게 **저절로 해결된다.**

1. **payload를 메모리에서 다 만든 다음 한 번에 쓴다.** 중간에 실패하면 **아무것도 안 쓴다.** 이전 스냅샷이 그대로 서빙된다.
2. **쓰기 직전에 Zod로 검증한다.** 형태가 깨진 payload는 애초에 저장되지 않는다.
3. **스냅샷끼리는 거의 독립이다 — 예외는 하나.** `docent`·`related` 수집이 실패해도 앞 단계는 이미 갱신됐고 전부 유효하다.
   **예외:** `routes`나 `context`가 실패하면 그다음 `accessibility`의 파생 항목 3개(`path_continuity`·`crowd_forecast`·`weather_warning`)가 **직전 값이 아니라 `unknown`이 된다** — 이건 조용한 품질 저하다. 그래서 `accessibility` 단계는 **읽어야 할 스냅샷이 없거나 이번 실행에서 실패했으면 그 사실을 표준 출력에 경고로 남긴다.** 화면에는 원래대로 "정보 없음"이 뜨므로 사용자에게 거짓말을 하지는 않지만, **로그를 보지 않으면 원인을 모른다.**
4. **`resultCode 22`(일일 한도 초과)를 만나면 그 단계를 중단하고 아무것도 쓰지 않는다.** 다음 실행에서 재시도한다.
4b. **재시도하는 코드와 즉시 중단하는 코드를 구분한다** ([`03_external_data.md`](./03_external_data.md) §1.5).
   - 재시도(최대 3회, 지수 백오프): `02` DB 오류 · `04` HTTP 오류 · **`05` 서비스 연결 실패(타임아웃)** · `21` 일시 사용 불가 키 · `99` 기타
   - 즉시 중단: `10` `11` `20` `30` `31` `32` — 전부 코드 버그나 키 문제다
   - **`12`(오픈API 서비스 없음·폐기)** 를 만나면 그 오퍼레이션이 사라진 것이다. 재시도하지 않고 사람에게 알린다
5. 실행 결과는 표준 출력과 GitHub Actions 로그에 남는다. 별도 실행 이력 테이블을 두지 않는다.

**스테이징 테이블도, 버전 포인터 교체도, 원자 스왑 함수도 필요 없다.** "통째로 만들어서 한 번에 쓴다"가 같은 보장을 준다.

---

## 4. 단계 2 — 무장애 항목 정규화 (가장 중요한 로직)

### 4.1 한국관광공사 필드 → 항목 코드 매핑

매핑 표는 **`src/domain/capabilities.ts` 한 곳에만** 존재한다. 수집 스크립트·화면·갭 리포트가 전부 이 파일을 import 한다. 기존 계획의 "세트 동일성 CI 게이트"는 이걸로 대체된다 — 타입 시스템이 강제한다.

```ts
// src/domain/capabilities.ts
export const CAPABILITIES = [
  // ── 진입 (entry) ──────────────────────────────────────
  { code: 'access_route',      ktoField: 'route',            labelKo: '접근로',            axis: 'entry' },
  { code: 'entrance_passage',  ktoField: 'exit',             labelKo: '출입통로',          axis: 'entry' },
  { code: 'wheelchair',        ktoField: 'wheelchair',       labelKo: '휠체어',            axis: 'entry' },
  { code: 'elevator',          ktoField: 'elevator',         labelKo: '엘리베이터',        axis: 'entry' },
  { code: 'ticket_office',     ktoField: 'ticketoffice',     labelKo: '매표소',            axis: 'entry' },
  { code: 'help_dog',          ktoField: 'helpdog',          labelKo: '보조견 동반',       axis: 'entry' },
  // ── 이동 (continuity) ─────────────────────────────────
  { code: 'public_transport',  ktoField: 'publictransport',  labelKo: '대중교통',          axis: 'continuity' },
  { code: 'braille_block',     ktoField: 'braileblock',      labelKo: '점자블록',          axis: 'continuity' },
  { code: 'guide_system',      ktoField: 'guidesystem',      labelKo: '유도 안내 설비',    axis: 'continuity' },
  { code: 'path_continuity',   ktoField: null,               labelKo: '경로 연속성',       axis: 'continuity' },
  // ── 편의시설 (facility) ───────────────────────────────
  { code: 'restroom',          ktoField: 'restroom',         labelKo: '화장실',            axis: 'facility' },
  { code: 'parking',           ktoField: 'parking',          labelKo: '주차',              axis: 'facility' },
  { code: 'stroller',          ktoField: 'stroller',         labelKo: '유모차',            axis: 'facility' },
  { code: 'nursing_room',      ktoField: 'lactationroom',    labelKo: '수유실',            axis: 'facility' },
  { code: 'baby_chair',        ktoField: 'babysparechair',   labelKo: '유아용 보조의자',   axis: 'facility' },
  { code: 'room',              ktoField: 'room',             labelKo: '객실',              axis: 'facility' },
  { code: 'hearing_room',      ktoField: 'hearingroom',      labelKo: '객실(청각)',        axis: 'facility' },
  // ── 정보안내 (information) ────────────────────────────
  { code: 'audio_guide',       ktoField: 'audioguide',       labelKo: '오디오 가이드',     axis: 'information' },
  { code: 'big_print',         ktoField: 'bigprint',         labelKo: '큰 활자 홍보물',    axis: 'information' },
  { code: 'braille_promotion', ktoField: 'brailepromotion',  labelKo: '점자 홍보물·표지',  axis: 'information' },
  { code: 'promotion_material',ktoField: 'promotion',        labelKo: '홍보물',            axis: 'information' },
  { code: 'guide_human',       ktoField: 'guidehuman',       labelKo: '안내요원',          axis: 'information' },
  { code: 'sign_guide',        ktoField: 'signguide',        labelKo: '수화 안내',         axis: 'information' },
  { code: 'video_caption',     ktoField: 'videoguide',       labelKo: '자막 영상 안내',    axis: 'information' },
  { code: 'visual_alarm',      ktoField: null,               labelKo: '시각 경보기',       axis: 'information' },
  // ── 휴식 (rest) ───────────────────────────────────────
  { code: 'auditorium',        ktoField: 'auditorium',       labelKo: '관람석',            axis: 'rest' },
  { code: 'rest_seating',      ktoField: null,               labelKo: '휴식 좌석',         axis: 'rest' },
  { code: 'shade_indoor',      ktoField: null,               labelKo: '그늘·실내 휴게',    axis: 'rest' },
  // ── 상황 (context) ────────────────────────────────────
  { code: 'crowd_forecast',    ktoField: null,               labelKo: '예측 혼잡도',       axis: 'context' },
  { code: 'weather_warning',   ktoField: null,               labelKo: '기상 특보',         axis: 'context' },
  { code: 'emergency_distance',ktoField: null,               labelKo: '응급실 거리',       axis: 'context' },
  { code: 'aed_distance',      ktoField: null,               labelKo: '자동심장충격기 거리', axis: 'context' },
] as const;

export type CapabilityCode = typeof CAPABILITIES[number]['code'];
export type Axis = typeof CAPABILITIES[number]['axis'];
```

- **`ktoField`가 있는 24개** = `detailWithTour2`에서 그대로 온다. 이 24개가 갭 리포트의 분모이고 `isKtoScored: true`가 붙는다.
- **`ktoField`가 `null`인 8개** = 파생 항목. 경로 데이터·콘텐츠 파일·혼잡도/날씨에서 온다. 소스가 없으면 `unknown`.
  - 그중 **`visual_alarm`(시각 경보기)** 은 한국관광공사 필드가 없고 **우리가 6곳 전부를 조사해 `curated-facts.json`으로 채우기로 한 항목**이다. 화재·비상 시 시각 경보기는 청각장애 사용자에게 실재하는 안전 항목이고, **원 데이터가 비어 있어도 우리가 채울 수 있는 몇 안 되는 항목**이다 ([`06_suitability.md`](./06_suitability.md) §10.4).
- **기타 4개(`handicapetc`, `blindhandicapetc`, `hearinghandicapetc`, `infantsfamilyetc`)는 항목이 아니다.** 값이 있으면 `pois[].etcNotes`에 넣어 관광지 상세의 "기타 안내"로 보여주고, 점수 계산에는 넣지 않는다.

### 4.2 자유 텍스트 → 상태 판정

한국관광공사 값은 `Y/N`이 아니라 자유 문장이다(`"대여가능(수동휠체어 2대)"`, `"장애인 화장실 있음"`, `""`).

```ts
// src/domain/capabilities.ts
//
// ★ 판정 방향이 앞 판과 반대다. 앞 판은 "내용이 있으면 supported"였고,
//   그 기본값이 실제 문장에서 정반대 판정을 만들었다 — 아래 주 참조.
//   지금은 "명시적으로 알아본 패턴만 판정하고, 나머지는 unknown"이다.
export function resolveStatus(raw: string | null | undefined): CapabilityStatus {
  const s = (raw ?? '').trim();
  if (s === '') return 'unknown';                       // 빈 값은 '없음'이 아니라 '모름'

  // ① 확인이 필요하다는 서술이 먼저다 — 아래 어떤 규칙보다 앞선다
  if (/(미확인|확인\s*필요|확인\s*요|문의\s*필요|파악\s*중)/.test(s)) return 'unknown';

  // ② 시설·서비스의 부재를 명시한 것만 unsupported
  //    ★ 범용 '없음'을 쓰지 않는다. '단차 없음'·'장애물 없음'은 좋은 상태다
  if (/(설치되지\s*않|설치\s*안|미설치|운영하지\s*않|미운영|제공하지\s*않|미제공|이용\s*불가|출입\s*불가|접근\s*불가|해당\s*없음|대여\s*불가)/.test(s))
    return 'unsupported';

  // ③ 조건부·부분
  if (/(일부|제한|사전\s*문의|예약\s*필요|협의|평일만|우천\s*시|동절기)/.test(s)) return 'partial';

  // ④ 시설·서비스의 존재를 명시한 것만 supported
  if (/(있음|있습니다|설치되어|설치돼|가능|운영|대여|비치|제공)/.test(s)) return 'supported';

  // ⑤ 그 밖에는 판정하지 않는다 ← 여기가 앞 판과 갈리는 지점
  return 'unknown';
}
```

> **★ 앞 판의 정규식은 판정을 정반대로 뒤집었다.** 두 가지가 겹쳐 있었다.
>
> 1. **부정 패턴에 범용 `없음`이 들어 있었다.** 무장애 서술에서 `없음`이 붙는 문장은 **좋은 상태인 경우가 많다** — `단차 없음`, `장애물 없음`, `문턱 없음`, `계단 없음`. 이것들이 전부 `unsupported`로 찍혔다. **이 서비스는 "여기 갈 수 있습니다"를 말하는 서비스이고, 그 판정이 반대로 나오면 실제로 헛걸음을 만든다.**
> 2. **매칭 실패의 기본값이 `supported`였다.** 그래서 `미확인`·`설치 여부 확인 필요` 같은 문장이 **"있음"으로 승격**됐다. 원칙 1이 금지한 추론을 기본값이 하고 있었다.
>
> **고친 방향:** 부재도 존재도 **명시적으로 알아본 어휘만** 판정하고, 나머지는 `unknown`이다. `unknown`이 늘어나는 대가를 치르지만, **틀린 판정보다 "모른다"가 낫다** — 그게 원칙 1이고, 화면은 원문을 그대로 보여주므로 사용자가 직접 읽는다.

**중요한 안전장치:** 이 정규식은 여전히 완벽하지 않다. 그래서

1. **`detail`에 원문을 그대로 저장하고 화면에도 원문을 그대로 보여준다.** 사용자는 앱의 판정이 아니라 원문을 읽고 판단할 수 있다.
2. 근거 카드에 원문·필드명·출처를 함께 보여준다.
3. 정규식이 잘못 판정한 사례를 발견하면 `content/curated-facts.json`으로 덮어쓴다(§4.4).
4. **1주차에 144개 실제 문장을 눈으로 대조하고 규칙을 조정한다** ([`11_open_items.md`](./11_open_items.md) **O-1**). 그때 이 함수는 **판정 결과와 원문을 나란히 출력**해서 사람이 훑을 수 있게 한다 — 규칙만 보고는 어떤 문장이 어디로 가는지 알 수 없다.

`unknown`인 경우 `absenceKind`를 정한다.

| 조건 | `absenceKind` | 근거 |
|---|---|---|
| 이 관광지 유형에 애초에 없는 항목 (숙박이 아닌 곳의 `room`, `hearing_room`) | `not_applicable` | `contentTypeId`로 판정 |
| **`detailWithTour2`가 `resultCode 03`** — 그 `contentId`로는 무장애 응답이 없다 | **`not_registered`** | §5.2. **P0-11 목록 조회로 교차 확인한 뒤에만 쓴다** |
| `curated-facts.json`에 `"absenceKind": "intrinsic"`으로 **명시된 것** | `intrinsic` | 사람이 출처를 대고 지정 |
| `curated-facts.json`에 `"absenceKind": "operator_missing"`으로 **명시된 것** | `operator_missing` | 사람이 출처를 대고 지정 (예: 담당 부서 통화 확인) |
| **그 외 전부 — 값이 그냥 비어 있다** | **`null`** | **기본값. 왜 비었는지 우리는 모른다** |

> **★ 앞 판은 기본값이 `operator_missing`이었다. 그게 원칙 1 위반이다.**
>
> 빈 응답이 증명하는 것은 **"이 필드에 값이 없다"** 뿐이다. 거기서 **"담당자가 입력하지 않았다"** 로 가는 것은 **추론**이고, 이 스펙이 다른 모든 자리에서 금지한 바로 그 추론이다. 실제로는 등록 절차상 해당 항목을 입력할 화면이 없었을 수도, 조사 시점에 시설이 공사 중이었을 수도, 우리가 모르는 다른 이유일 수도 있다.
>
> **그리고 이 추론이 그대로 지자체에 출력된다.** 갭 리포트가 "이 항목은 담당자 미입력이니 채우세요"라고 말하는데 근거가 없으면, **리포트를 받은 담당자가 첫 줄에서 반박할 수 있다.** 이 서비스가 지자체에 돌려주려는 가치가 거기서 끝난다.
>
> **고친 뒤 갭 리포트가 말하는 것:** "이 24칸 중 17칸이 비어 있다" — 이건 **관측이고 반박할 수 없다.** 그중 원인이 확인된 것만 `intrinsic`/`operator_missing`으로 나뉘고, 나머지는 **"원인 미확인 — 확인 필요"** 다. 담당자에게 첫 번째로 유용한 것은 정확히 그 목록이다.

> **★ `not_registered`를 `operator_missing`과 섞으면 안 된다.** 앞 판은 `resultCode 03`일 때도 24항목을 전부 `operator_missing`으로 찍었다. 그런데 둘은 **고치는 사람과 고치는 방법이 다르다.**
> - `operator_missing` — 등록은 됐고 담당자가 **그 항목 하나**를 입력하면 된다
> - `not_registered` — **관광지를 데이터셋에 등록하는 것**이 선행 작업이다. 항목별 입력이라는 개념이 아직 없다
>
> 섞으면 갭 리포트가 "이 24개 항목을 입력하세요"라고 말하는데 담당자가 입력할 화면 자체가 없다. **그 상태로 지자체에 넘기면 리포트를 한 번 읽고 버린다.**

**빈칸 목록 전체가 갭 리포트(S10)의 항목별 내용**이고, `absenceKind`는 그 안에서 **원인이 확인된 것과 안 된 것을 나누는 열**이다. **`not_registered`는 관광지 단위 한 줄**로 올라간다 ([`07_screens.md`](./07_screens.md) S10). 이게 이 서비스가 지자체에 돌려주는 값이다.

### 4.3 출처와 날짜

| 필드 | 한국관광공사 항목 | 콘텐츠 파일 항목 | 파생 항목 |
|---|---|---|---|
| `source` | `kto_with` | `curated` | `derived_route` · `derived_facility` · `tats` · `kma` |
| `sourceField` | `wheelchair` 등 원래 필드명 | `null` | `null` |
| `verifiedAt` | **관광지의 한국관광공사 `modifiedtime`** | `checkedAt` | 수집 시각 |
| `isKtoScored` | `true` | 해당 코드의 `ktoField`가 있으면 `true` | `false` |

> **`verifiedAt`을 어떻게 정하나 — 기존 계획의 구멍을 메운 부분.**
> 기존 계획은 신선도를 "항목별 확인 날짜"로 계산한다고 했지만, **한국관광공사는 항목별 날짜를 주지 않는다.** 관광지 단위 `modifiedtime` 하나뿐이다.
> 그래서 **한국관광공사에서 온 항목의 `verifiedAt`은 그 관광지의 `modifiedtime`으로 통일**한다. 근사치이고, 화면에 "한국관광공사 최종 수정일 기준"이라고 명시한다.

### 4.4 출처가 충돌할 때 — 여기서 한 번만 결정한다

같은 `(관광지, 항목)`에 여러 출처의 값이 있을 수 있다. 수집 스크립트가 **하나를 골라** 스냅샷에 넣는다.

```
curated  >  derived_route / derived_facility / tats / kma  >  kto_with
```

결과 payload에는 `(poiSlug, capabilityCode)` 조합이 **정확히 한 번만** 나온다. 화면도 도메인 함수도 이 계산을 다시 하지 않는다 — 계산이 두 곳에 있으면 반드시 갈라진다.

> **방문자 제보는 이 목록에 없다.** 제보는 **사실이 아니라 발언**이므로 `accessibility` 스냅샷에 들어가지 않고, 적합도 점수에도 영향을 주지 않는다.
> 제보가 사실이 되는 경로는 하나뿐이다 — **사람이 검토해서 `content/curated-facts.json`에 옮겨 적고 커밋한다.** 그때 출처 칸에 제보 ID를 남긴다 ([`04_data_model.md`](./04_data_model.md) §4.2).
>
> 기존 계획은 "승인된 제보가 확인일을 갱신하되 상태는 못 뒤집는다"는 규칙을 뒀는데, 규칙이 두 군데에 서로 다르게 적혀 모순이 있었고 저장 구조상 "제보 2건 이상"을 표현할 수도 없었다. **제보를 사실에서 완전히 분리하니 이 문제가 통째로 사라졌다.**

---

## 5. 단계별 세부

### 5.0 bootstrap (최초 1회)

```
GET KorService2/ldongCode2?lDongRegnCd=44&lDongListYn=Y    → 충남 시군구 코드·이름
GET KorService2/lclsSystmCode2?lclsSystmListYn=Y           → 분류체계 243건
→ content/generated/codes.json  (코드 → 한글명 표시용)
```
5자리 시군구 코드(`44150`,`44760`)는 `content/pois.json`에 적힌 값을 쓴다. **하드코딩 금지 규칙은 검증 스크립트가 확인한다** ([`09_test_and_ci.md`](./09_test_and_ci.md) §4).

### 5.1 pois

```
content/pois.json 에서 6곳의 slug ↔ ktoContentId 대응을 읽는다

for each poi:
  GET KorService2/detailCommon2?contentId=…      → 주소·전화·홈페이지·개요·modifiedtime
  GET KorService2/detailIntro2?contentId=…&contentTypeId=…
                                                  → 이용시간·쉬는날·주차·문의처
  GET KorService2/detailImage2?contentId=…&imageYN=Y
                                                  → 이미지 + cpyrhtDivCd
  GET EngService2/detailCommon2?contentId=…       → 영문 제목·개요·주소
  GET JpnService2/detailCommon2?contentId=…       → 일문
  GET ChsService2/detailCommon2?contentId=…       → 중문 간체

GET PhotoGalleryService1/gallerySearchList1?keyword={관광지명}   (6콜)
GET PhotoGalleryService1/gallerySearchList1?keyword=백제          (1콜)
  → 결과를 합치고 galContentId 로 중복 제거
  → 전수 페이징(48콜) 은 하지 않는다. 검색 오퍼레이션이 있다 (03 §2.7)

content/facilities.json      → pois[].facilities
content/certifications.json  → pois[].certifications

→ 스냅샷 'pois' 통째로 쓰기
```

**이미지 처리:**
- `cpyrhtDivCd = 'Type3'` → `noTransform: true`. 화면에서 `next/image` 최적화를 태우지 않는다
- `attribution` 문구를 **저장 시점에 완성해서** 넣는다. 화면에서 조합하지 않는다
- `http://` URL은 `https://`로 치환하고 실제 접속을 확인한다. 안 되면 `/api/image-proxy`를 태운다

**다국어 주의:** 목록 조회(`areaBasedList2`)를 쓸 때는 `contentTypeId`를 변환해야 한다(12→76, 14→78). `detailCommon2`에는 `contentTypeId` 파라미터가 없어 변환이 불필요하지만, **변환 함수는 만들어 둔다** ([`03_external_data.md`](./03_external_data.md) §2.8).

### 5.2 accessibility

```
for each poi:
  GET KorWithService2/detailWithTour2?contentId={ktoContentId}
  → 응답 29항목 중 24개를 CAPABILITIES 매핑으로 변환 (§4.1)
  → resolveStatus() 로 상태 판정, 원문은 detail 에 그대로 (§4.2)
  → *etc 4개는 pois[].etcNotes 로

파생 항목 8개 계산 (§5.7) — routes·context·pois 스냅샷이 이미 있어야 한다
content/curated-facts.json 적용 (§4.4 우선순위)

→ 스냅샷 'accessibility' 통째로 쓰기
```

**`resultCode 03`(데이터 없음)이면:** 그 `contentId`로는 무장애 응답이 없다. KTO 24항목을 전부 `unknown`으로 넣고 경고를 출력한다.

> **★ `03` 하나만으로 "미등록"이라고 쓰지 않는다.** `03`이 오는 이유는 최소 세 가지다 — ① 그 관광지가 무장애여행 데이터셋에 없다 ② **`contentId`가 틀렸다**(다른 관광지 ID를 넣었다) ③ 일시적 무응답. **셋을 구별하는 것은 P0-11의 목록 조회다** — `areaBasedSyncList2`에 그 관광지 이름이 없으면 ①이 확인된다.
>
> - **P0-11로 ①이 확인된 관광지** → `absenceKind: 'not_registered'`, 화면에 **"한국관광공사 무장애여행 데이터셋에 등록돼 있지 않습니다"**
> - **확인 전** → `absenceKind: null`, 화면에 **"이 관광지의 무장애 응답을 받지 못했습니다"** — 원인을 말하지 않는다

6곳 중 몇 곳이 이런지가 프로젝트의 형태를 바꾼다 → [`11_open_items.md`](./11_open_items.md) **P0-1**.

> `curated-facts.json`으로 채운 항목은 그 관광지가 미등록이어도 **`curated`가 우선(§4.4)** 이므로 정상적으로 값이 들어간다. 미등록은 "KTO가 준 것이 없다"는 뜻이고 "우리가 아는 것이 없다"는 뜻이 아니다.

### 5.3 routes

```
content/routes/*.json 을 읽어 Zod 검증 → 스냅샷 'routes'
※ path_continuity 는 여기서 계산하지 않는다. §5.7이 accessibility 단계에서 이 스냅샷을 읽어 계산한다
```

발행 플래그가 없다. **파일에 있으면 화면에 나온다.**

### 5.4 docent

```
# 1단계 — Odii 관광지 전수 열거 (키워드 추측을 쓰지 않는다)
pageNo = 1
loop:
  GET Odii/themeBasedList?langCode=ko&numOfRows=100&pageNo={pageNo}
  → 매뉴얼 예시의 totalCount 는 1,504. 약 16페이지면 전수
  → 응답 좌표(경도/위도)가 우리 6곳 반경 1km 안인 것만 골라 tid, tlid 확보

  ★ 전수 열거가 keyword 검색보다 결정적이다 (03 §2.3).
    keyword 는 "'공산성'이라는 이름으로 등록됐는가"라는 가정이 필요하고,
    전수 열거는 좌표로 매칭하므로 그 가정이 없다.

# 2단계 — 이야기 목록
for each 확보한 (tid, tlid):
  for langCode in [ko, en]:
    GET Odii/storyBasedList?tid=…&tlid=…&langCode={langCode}
    → title, script, audioUrl, imageUrl, playTime
    → ★ 좌표는 addr1(경도)/addr2(위도) 로 온다. mapX/mapY 도 함께 읽어
       먼저 값이 있는 쪽을 쓴다 (03 §2.3 · 11 P0-9 4번)

content/docent-easy/{slug}.{locale}.md → easyScript (A등급 2곳만)

→ 스냅샷 'docent'
```

- `easyScript`(쉬운 글)는 API가 주지 않는다. **사람이 `script`를 보고 다듬어 파일에 넣는다.**
- Odii 이야기가 없는 관광지는 payload에 안 들어가고, 도슨트 화면 대신 안내 문구가 나온다.
- `langCode` 실제 값은 **P0-4 탐침 결과**를 따른다.

### 5.5 context

```
GET TatsCnctrRateService/tatsCnctrRateList?areaCd=44&signguCd=44150&numOfRows=100   (공주)
GET TatsCnctrRateService/tatsCnctrRateList?areaCd=44&signguCd=44760&numOfRows=100   (부여)
  → ★ numOfRows 를 반드시 준다. 응답이 관광지당 향후 30일 × 1행이라
     기본값 10 이면 30일 중 10일만 온다 (03 §2.4)
  → ★ 한 페이지로 끝난다고 가정하지 않는다. totalCount 까지 페이징하거나
     tAtsNm 을 관광지별로 넣어 6번 부른다. 어느 쪽인지는 P0-5 가 정한다.
     첫 100행에 우리 6곳이 없으면 있는 예측을 unknown 으로 오판한다 (03 §2.4)
  → tAtsNm 이 content/pois.json 의 tatsName 과 일치하는 행만
  → 관광지별로 baseYmd 가 오늘에 가장 가까운 행 1건을 골라 context.crowd
     (isPredicted: true 고정)

# ★ 창의 끝은 '오늘-4'가 아니라 탐침이 실측한 최신 baseYmd 다 (03 §2.5).
#   4 를 상수로 박지 않는다 — 지연이 3일이면 최신 하루를 버리고, 5일이면 빈 호출을 한다.
endYmd   = _probe-results.md 에 기록된 관측 최신 baseYmd
startYmd = endYmd - 7일                    # 8일 창

for ymd in [startYmd .. endYmd]:           # ★ 하루씩 8회. 한 번에 8일을 부르지 않는다
  pageNo = 1
  loop:
    GET DataLabService/locgoRegnVisitrDDList
        ?startYmd={ymd}&endYmd={ymd}&numOfRows=1000&pageNo={pageNo}
    → totalCount 를 보고 다 받을 때까지 pageNo 증가
  → 전국이 오므로 signguCode in ('44150','44760') 만 필터

  ★ 왜 하루씩 나누나: 지역 필터 파라미터가 없어서 전국이 온다.
    기초 기준 하루 약 740행 × 3구분이므로 8일을 한 번에 부르면
    numOfRows=1000 에서 잘리고, 정렬 순서에 따라 44150·44760 행이
    응답에 아예 없을 수 있다 — 조용히 빈 결과가 된다 (03 §2.5)
  → ★ touDivCd 로 한 번 더 거른다. 응답은 하루·시군구당 3행이다
       ('1' 내국인 현지인 / '2' 내국인 외지인 / '3' 외국인)
     거르지 않고 평균하면 행 3개를 하루 3일로 세어 3배 어긋난다 (03 §2.5)
  → 우리가 쓰는 값: touDivCd 를 합산하지 않고 '2'(외지인) 만 쓴다
       이유 — 관광 목적 방문에 가장 가까운 구분이고, 현지인 통행량이
       유적지 혼잡도를 대표하지 않는다. 화면에 구분명을 함께 쓴다
  → 8일치를 평균내어 context.visitors 에 dailyAverage 로 저장 (소수 유지)
  → windowStart/windowEnd/days/touDivNm 을 함께 저장
     (화면 표기: "최근 8일 일평균 · 내국인 외지인 기준")

(선택) 기상청 단기예보 → context.weather

→ 스냅샷 'context'
```

> **지연 일수는 실측값을 쓴다** ([`03_external_data.md`](./03_external_data.md) §2.5). 어느 쪽이든 **월 단위 통계는 만들 수 없다** — 창이 8일이다. 화면에는 **"{endYmd} 기준 최근 8일 일평균"** 이라고 관측 날짜와 함께 쓴다. 기존 화면 초안의 "2026-08 일평균"은 이 파이프라인으로 얻을 수 없는 값이었고, **"약 4일 지연"도 우리가 재기 전에는 쓸 수 없는 값이다.**

### 5.6 related

```
# ★ 지역 목록은 기본 numOfRows=10 이고 매뉴얼 지역 예시의 totalCount 는 800 이다.
#   첫 10행에 우리 6곳이 없으면 연관 데이터가 있어도 목록이 비어 보인다 (03 §2.6).
#   그래서 지역 목록이 아니라 관광지별 키워드 조회를 쓴다.
for each poi (6곳):
  GET TarRlteTarService1/searchKeyword1?keyword={관광지명}&baseYm={지난달}
      &areaCd=44&signguCd={44150|44760}&numOfRows=100
  → tAtsNm 이 우리 관광지 이름과 정확히 일치하는 행만
  → 같은 회차에 tAtsCd(기준 관광지 코드)를 확보해 content/pois.json 에 적는다 (03 §2.6 3번)
  → 이름이 안 맞으면 그 관광지는 관련 목록을 표시하지 않는다 (추측 매칭 금지)
→ 스냅샷 'related'
```

### 5.7 파생 항목 8개 계산

| 항목 | 계산 방법 | `source` | 소스 없을 때 |
|---|---|---|---|
| `path_continuity` | 경로 단계가 있으면 `hazard` 있는 단계 수로 판정 — 0건 `supported` / 1건 이상 `partial` | `derived_route` | `unknown` + `operator_missing` |
| `rest_seating` | `curated-facts.json` 또는 `facilities` 중 `kind='rest_area'` | `derived_facility` | `unknown` |
| `shade_indoor` | `curated-facts.json` | `curated` | `unknown` |
| `visual_alarm` | `curated-facts.json` — 관광지 공식 홈페이지·시설 안내 조사 | `curated` | `unknown` |
| `crowd_forecast` | `rate ≤ 40` → `supported` · `40 < rate ≤ 70` → `partial` · `70 < rate ≤ 100` → `unsupported` · **그 밖(0 미만·100 초과)** → `unknown`. 아래 주 | `tats` | `unknown` |
| `weather_warning` | 특보 없음 `supported` / 발효 `unsupported` | `kma` | `unknown` |
| `emergency_distance` | 가장 가까운 `kind='hospital'`까지 ≤500m `supported` / ≤1km `partial` / 초과 `unsupported` | `derived_facility` | `unknown` |
| `aed_distance` | 가장 가까운 `kind='aed'`까지 ≤300m `supported` / ≤1km `partial` / 초과 `unsupported` | `derived_facility` | `unknown` |

거리는 **하버사인 공식 함수 10줄**로 계산한다(`src/domain/geo.ts`). PostGIS가 필요 없다.

**`unknown`이면 그냥 `unknown`이다.** 없다고 추론하지 않는다.

> **★ 경계는 반열린 구간으로 쓴다.** 앞 판은 `≤40 / 41–70 / 71–100`이라 **`40.5`와 `70.5`에 정의된 분기가 없었다.** `cnctrRate`는 매뉴얼 샘플이 `64.65`인 **소수**이므로 그 구간에 실제 값이 온다.
>
> **★ 그리고 40 / 70이라는 값 자체가 잠정값이다 [미확인].** [`03_external_data.md`](./03_external_data.md) §2.4가 확인한 대로 `cnctrRate`의 **단위·분모·상한이 매뉴얼에 없다.** 0~100 지수라고 단정한 적이 없는데 이 표만 그 가정 위에 서 있었다.
> **그래서 이렇게 한다:**
> 1. **`rate`가 0 미만이거나 100을 넘으면 그 항목을 `unknown`으로 둔다.** 스케일 가정이 깨진 것이므로 등급을 매기지 않는다 — **틀린 등급이 `unknown`보다 나쁘다.**
> 2. **P0-5 탐침이 관측한 `cnctrRate`의 최소·최대를 `_probe-results.md`에 기록한다.** 실제 분포가 0~100 안이면 이 표를 `[확정]`으로 올리고, 아니면 경계값을 관측 분포로 다시 잡는다.
> 3. 그때까지 화면의 혼잡도 표기는 **지수 원값과 "상대 지표"** 만 쓴다([`03_external_data.md`](./03_external_data.md) §2.4). 등급 라벨을 단독으로 쓰지 않는다.

---

## 6. 재검증 호출

```ts
// scripts/ingest.ts 마지막
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`, {
  method: 'POST',
  headers: { authorization: `Bearer ${process.env.REVALIDATE_SECRET}` },
  body: JSON.stringify({ keys: ['pois', 'accessibility', 'routes', 'docent', 'context', 'related'] }),
});
```

```ts
// src/app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

// 스냅샷은 전 페이지에 영향을 주므로 레이아웃 단위로 비운다.
const LOCALES = ['ko', 'en'] as const;

export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return new Response('forbidden', { status: 403 });
  }
  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout');
  return Response.json({ ok: true });
}
```

실패해도 각 페이지의 `revalidate = 3600`이 1시간 뒤에 갱신하므로 치명적이지 않다.

> 기존 계획의 HMAC 서명(`body + timestamp` 서명, `x-etl-signature` 헤더, 5분 재생 방지 창)은 **임의 호출당하면 곤란한 엔드포인트**를 위한 장치다. 이 엔드포인트가 하는 일은 캐시를 비우는 것뿐이고 최악의 피해가 캐시 미스다. 공유 시크릿 비교로 충분하다.

---

## 7. 제보 정리 (관리자, 수동)

제보는 수집 파이프라인과 **완전히 분리돼 있다.** 자동으로 아무 데도 흘러가지 않는다.

```
1. 관리자가 /admin/reports 에서 제보 목록을 본다
2. 부적절한 것(욕설·허위·개인정보·중복)은 [숨기기] → is_hidden = true
3. "이건 사실이다" 싶은 것은
   [항목으로 복사] 버튼 → curated-facts.json 조각이 클립보드에 복사된다
     {
       "poiSlug": "gongsanseong",
       "capabilityCode": "",              ← 관리자가 채운다
       "status": "",                      ← 관리자가 채운다
       "detail": "동문 쪽 계단 보수 공사로 통행 불가",
       "source": "방문자 제보 #a1b2c3 확인 후 ○○ 로 교차 확인",
       "checkedAt": "2026-09-18"
     }
4. content/curated-facts.json 에 붙여넣고 커밋
5. pnpm ingest → 다음 화면부터 반영
```

**이 흐름이 감사 기록 그 자체다.** "왜 이 값이 바뀌었나"는 `git log`가 답한다. 별도 이력 테이블이 필요 없다.

**부적절한 제보 삭제:** `is_hidden = true`인 제보 중 90일 지난 것은 수집 스크립트가 실제로 지운다. 개인정보 처리방침에 적은 내용을 지키기 위한 것이고, 10줄이면 된다.

```ts
// scripts/ingest.ts — 매 실행 시 1회
await sbAdmin.from('barrier_reports').delete()
  .eq('is_hidden', true)
  .lt('hidden_at', new Date(Date.now() - 90 * 864e5).toISOString());
```

---

## 8. 탐침 스크립트 (`scripts/probe.ts`)

수집 전에 **가정을 실제 호출로 확인**한다. **자동 탐침 대상은 9건**이고 범위의 단일 권위는 [`11_open_items.md`](./11_open_items.md) §1의 표다 — P0-7은 사람이 국가유산청 포털에서 확인하고, P0-8은 매뉴얼 v4.2로 이미 해소됐다.

```
pnpm probe

[P0-1] KorWithService2/detailWithTour2 — 6곳 등록 여부
  ✓ 공산성 (126121)        resultCode=0000, 채워진 항목 7/24
  ✗ 국립부여박물관 (…)     resultCode=03  → 무장애 데이터 없음
[P0-2] 인증키 인코딩          ✓ resultCode=0000 (30 아님)
[P0-3] Odii 커버리지          themeBasedList 전수 열거 후 좌표 매칭
                              공산성 ✓ 이야기 3건 / 부소산성 ✓ 5건 / 나머지 ✗
[P0-4] Odii langCode 후보     ko ✓ / en ✓ / ja ✗ / jp ✓ / zh-CN ✗ / cn1 ✓
                              themeSearchList 언어 파라미터: lang ✗ / langCode ✓
[P0-5] TatsCnctr tAtsNm       '공산성' ✓ / '부소산성' ✗ → 시군 단위만 사용
[P0-6] lDong 코드             44 = 충청남도 ✓ / 150 = 공주시 ✓ / 760 = 부여군 ✓
[P0-9] 매뉴얼 표기 불일치 5건  tatsCnctrRateList ✓ / themeBasedSyncList ✓ /
                              areaBasedList1 ✓ / storyBasedList 좌표=addr1·addr2 ✓ /
                              TarRlteTarService1 경로에 '1' 필요 ✓
[P0-10] contentId 국문↔다국어  EngService2/detailCommon2 동일 ID → 영문 제목 ✓
[P0-11] 무장애 목록 일괄 조회  areaBasedSyncList2 + lDong 필터 동작 ✓ (6곳 중 4곳 발견)
```

> **탐침 방법은 수집이 실제로 쓰는 방법과 같아야 한다.** P0-3은 `themeSearchList` 키워드 검색이 아니라 **`themeBasedList` 전수 열거 + 좌표 매칭**으로 확인한다 — 수집(§5.4)이 그 방법을 쓰기 때문이다. 다른 방법으로 확인하면 "확인했지만 수집은 여전히 실패하는" 상태가 된다.

**모든 결과를 `docs/spec/_probe-results.md`에 자동 기록한다.** 이 파일이 "우리가 실제로 확인한 것"의 단일 기록이 된다.
