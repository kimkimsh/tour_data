# 모두의 백제 독립 아키텍처·빌드 계획

## 0. 결론

이 프로젝트의 승부처는 기능 수가 아니라 **6개 POI에 대한 신뢰 가능한 무장애 데이터가 F1 경로·F2 도슨트·F3 제보·F4 다이어리·F5 갭 리포트를 하나의 폐쇄 루프로 연결하는가**이다.

Synthesis는 기술 선택은 풍부하지만 제품 범위를 과도하게 플랫폼화했다. 특히 동적 휠체어 라우팅, RAG, pgvector, 다중 AI 공급자, Upstash, 메시징, OCR, 360도는 10월 심사에서 완성도를 떨어뜨릴 가능성이 높다.

핵심 결정은 다음과 같다.

1. **동적 라우팅 대신 6개 POI의 검수된 정적 경로 패키지**를 사용한다.
2. **KTO 원본 스키마와 도메인 스키마를 분리**해 API 필드 변경을 격리한다.
3. F1은 하나의 작업 스트림이 아니라 **A/D, B, C, E, F로 분리**한다.
4. 배치 ETL은 **GitHub Actions**, Vercel Cron은 짧은 갱신 작업에만 사용한다.
5. 런타임 요청은 가능한 한 KTO를 호출하지 않고 **Supabase 발행 데이터**만 읽는다.
6. 심사 전 정식 접근성 인증보다 **실제 화면의 수동 스크린리더 검증과 증거 자료**를 우선한다.

아키텍처 판단 신뢰도: **높음(0.90)**. API 필드·라이선스·법률 세부 판단: **중간(0.65~0.75)**이며 Foundation에서 검증해야 한다.

---

# 1. 시스템 아키텍처

## 1.1 전체 데이터 흐름

```text
KTO·공공 API
    │
    ▼
Typed source adapters
  - 원문 문자열 우선 파싱
  - JSON 정상 응답 / XML 오류 응답
  - Zod tolerant validation
    │
    ▼
ETL CLI (GitHub Actions)
    ├─ source_records: 원본 JSON/XML 보존
    ├─ normalize: 도메인 capability로 변환
    ├─ validate: 필수 필드·라이선스·좌표 검사
    └─ publish transaction
            │
            ▼
Supabase
  - canonical POI
  - accessibility facts
  - curated route guides
  - docent assets
  - approved UGC
  - dashboard aggregates
            │
            ▼
Next.js 15 Server Components
  - unstable_cache: 공개 read model만
  - tag invalidation + bounded TTL
            │
            ▼
Client
  - 접근 가능한 리스트가 source of truth
  - 지도는 보조 표현
  - IndexedDB: 프로필·다이어리·오프라인 가이드
```

ETL 실패 시 마지막 성공 발행본을 계속 제공한다. 데이터 수집과 발행을 같은 트랜잭션으로 취급하지 않는다.

## 1.2 모듈 맵

| 모듈 | 책임 |
|---|---|
| `domain/poi` | POI, 입구, 시설, 출처, 라이선스 |
| `domain/accessibility` | capability 상태, 페르소나 매트릭스, 적합도 |
| `domain/itinerary` | 시간 예산, 정적 코스 템플릿, 5슬롯 계산 |
| `domain/guide` | POI 내부 경로와 단계 카드 |
| `domain/docent` | Odii 스토리, 언어, 채널, 재생 정책 |
| `domain/reporting` | F3 제보 상태 머신과 검수 |
| `domain/diary` | 방문·퀴즈·메모·출력 문서 모델 |
| `domain/rto` | 데이터 완전성, 갭 지표, 시군 집계 |
| `integrations/kto` | KTO 서비스별 typed adapter |
| `integrations/public-data` | 기상·응급·BF·국가유산청 adapter |
| `application` | use case 조정, 트랜잭션 경계 |
| `features` | F1–F5 사용자 UI |
| `admin` | 제보 검수와 데이터 품질 관리 |
| `etl` | 수집·정규화·검증·발행 |

## 1.3 F1–F5 배치

| 기능 | 구현 위치 |
|---|---|
| F1.A | `accessibility`, `features/f1-poi-card` |
| F1.B | `guide`, `features/f1-route-guide` |
| F1.C | `features/f1-safety`, 정적 연락처·AAC 데이터 |
| F1.D | `accessibility`, `itinerary`, `features/f1-planner` |
| F1.E | `reporting`, `features/f1-community`, GPX exporter |
| F1.F | `features/f1-predictable`, F1.B 단계 데이터 재사용 |
| F2 | `docent`, `features/f2-docent` |
| F3 | `reporting`, `features/f3-report`, `admin/moderation` |
| F4 | `diary`, `features/f4-diary`, `exports` |
| F5 | `rto`, `features/f5-dashboard` |
| 4개 언어 | 모든 공개 feature 위의 locale/content resolution 계층 |

외국인 모드를 독립 F5로 둔 synthesis의 번호 체계는 사용하지 않는다.

---

## 1.4 Supabase 스키마 스케치

### 원천·발행

| 테이블 | 핵심 열 | RLS 의도 |
|---|---|---|
| `ingest_runs` | source, status, counts, error summary | service role/admin만 |
| `source_records` | source, source_id, raw_payload, hash, fetched_at | service role만 |
| `dataset_versions` | dataset, published_version, published_at | 공개 읽기 |
| `source_code_mappings` | service, code_type, source_code, label | 공개 읽기 |

### POI·무장애

| 테이블 | 핵심 열 | RLS 의도 |
|---|---|---|
| `pois` | id, KTO content ID, location, type, visibility | published 공개 |
| `poi_translations` | poi_id, locale, title, description, provenance | published 공개 |
| `poi_media` | URL, license code, attribution, transform policy | 공개 |
| `poi_entrances` | location, name, geometry, verified_at | 공개 |
| `accessibility_facts` | capability_code, status, detail, source, verified_at | published 공개 |
| `poi_certifications` | BF/Open Tourism 등급, 기간, 출처 | 공개 |
| `nearby_facilities` | restroom, AED, hospital, equipment | 공개 |
| `context_snapshots` | weather, crowd, air, effective period | 공개 |

`accessibility_facts.status`는 `supported | partial | unsupported | unknown`으로 제한한다. KTO의 정확한 필드 이름을 테이블 열로 만들지 않는다. 원본 필드는 `source_field`에 기록한다.

### 경로·도슨트

| 테이블 | 핵심 열 | RLS 의도 |
|---|---|---|
| `route_guides` | POI, persona flags, version, published status | 공개 |
| `route_steps` | sequence, action, geometry, photo, easy text | 공개 |
| `route_hazards` | type, severity, permanent/temporary | 공개 |
| `itinerary_templates` | budget mode, ordered POIs, slot durations | 공개 |
| `docent_stories` | POI, locale, mode, source | 공개 |
| `docent_assets` | audio, transcript, braille, sign video | 공개 |

MVP에는 일반 목적 도로 그래프나 pgRouting 테이블을 두지 않는다.

### UGC·관리자

| 테이블 | 핵심 열 | RLS 의도 |
|---|---|---|
| `barrier_reports` | reporter_id, POI, category, status, occurred_at | 본인 insert/read, 승인본 공개 |
| `report_evidence` | private storage path, metadata | 신고자·관리자만 |
| `moderation_events` | report_id, from/to status, reason | 관리자만 |
| `reviews` | persona, rating dimensions, status | 승인본 공개 |
| `gpx_submissions` | route, source, moderation status | 본인·관리자, 승인본 공개 |
| `admin_roles` | user_id, role | service role 관리 |
| `audit_events` | actor, action, object, timestamp | append-only, 관리자만 |

승인 전 사진은 private Storage bucket에 둔다. Realtime은 원본 제보가 아니라 **승인된 경고 상태**만 전달한다.

### F4·F5

다이어리는 기본적으로 IndexedDB에 둔다. 서버에는 사용자가 명시적으로 제출한 데이터만 저장한다.

| 테이블/뷰 | 책임 |
|---|---|
| `gap_metric_snapshots` | 시군·POI·capability별 누락 수 |
| `poi_completeness_mv` | 예상 필드 대비 입력·검증 완전성 |
| `report_trends_mv` | 승인 제보 빈도와 해결 시간 |
| `rto_dashboard_snapshots` | PT용 재현 가능한 일·주·월 지표 |

---

## 1.5 Typed KTO client

```ts
interface KtoTransport
{
    request<TRequest, TRaw>(
        operation: KtoOperation<TRequest, TRaw>,
        request: TRequest
    ): Promise<KtoResponse<TRaw>>;
}

type KtoResponse<T> =
    | { ok: true; data: T; rawBody: string; fetchedAt: string }
    | { ok: false; error: KtoApiError; rawBody: string };
```

설계 원칙:

- decoding key를 서버 환경변수에 두고 URL encoder가 한 번만 인코딩한다.
- 응답을 먼저 문자열로 읽은 뒤 JSON/XML을 판별한다.
- API별 요청 타입, raw response 타입, normalized mapper를 분리한다.
- Zod는 `passthrough()`로 미지 필드를 보존하되 필수 식별자는 엄격히 검사한다.
- 모든 normalized fact에 `source`, `sourceField`, `sourceUpdatedAt`, `ingestedAt`을 남긴다.
- client 자체에 숨은 캐시를 넣지 않는다. 호출 예산과 재시도는 ETL orchestration 책임이다.
- 실제 응답 fixture를 저장해 외부 API 없이 contract test를 실행한다.
- `detailWithTour2`, lDong, endpoint suffix 검증은 adapter 작업이지 DB 구조를 막는 아키텍처 blocker가 아니다.

서버리스 프로세스 내부 token bucket은 인스턴스 간 공유되지 않으므로 synthesis의 단순 token bucket 제안은 신뢰할 수 없다. 런타임 KTO 호출을 제거하고 ETL에서 제한된 concurrency를 사용하는 편이 낫다.

---

## 1.6 결정론적 4-Layer 적합도

### 입력

```ts
calculateSuitability({
    poiFacts,
    routeGuide,
    personaIds,
    timeContext,
    certifications,
    ugcSummary,
    calculationDate,
    policyVersion
}): SuitabilityResult
```

각 capability 값:

| 상태 | 수치 |
|---|---:|
| `supported` | 1.00 |
| `partial` | 0.50 |
| `unsupported` | 0.00 |
| `unknown` | 0.35 |

`unknown`은 실패와 구분하지만 보수적으로 계산한다. 별도의 coverage를 반드시 반환한다.

### Layer A: POI 본질 점수

```text
A =
  0.30 entry
+ 0.18 continuity
+ 0.15 amenities
+ 0.12 rest
+ 0.10 timeContext
+ 0.08 safety
+ 0.07 verifiedUgc
```

- `entry`: 선택 입구의 휠체어·출입·엘리베이터 capability.
- `continuity`: 경로 구간 중 최저 accessibility score 중심. 평균만 사용하지 않는다.
- `amenities`: 화장실·수유·좌석·안내시설 중 페르소나 관련 항목.
- `rest`: 최대 무휴식 이동시간을 페르소나 기준과 비교.
- `timeContext`: 혼잡·폭염·우천·실내 대안.
- `safety`: AED·응급시설 거리와 연락 가능성.
- `verifiedUgc`: 최근 승인 제보와 현장 검증 상태.

### Layer B: 페르소나 적합 계수

각 페르소나의 21필드 가중 평균:

```text
critical weight = 4
supporting weight = 2
other weight = 1

personaFit = weightedMean(capability values)
B = 0.75 + 0.25 × min(selected personaFit)
```

다중 페르소나는 평균이 아니라 **가장 낮은 personaFit**을 사용한다. 이는 할아버지와 손녀 중 한 사람의 접근 불가를 다른 사람의 높은 점수가 상쇄하지 못하게 한다.

### Layer C: 인증 보정

제안서의 최대 1.30은 인증 배지가 실제 장벽을 과도하게 상쇄할 수 있다. 구현은 다음으로 제한한다.

```text
BF 예비 +0.02 / 일반 +0.05 / 우수 +0.08
열린관광지 +0.04
총 보정 상한 +0.12
C = 1.00 ... 1.12
```

KQ는 서비스 품질 메타데이터로 표시하되 무장애 점수를 올리지 않는다. 이 부분은 제안서 산식과 의도적으로 다르다.

### Layer D: 신뢰도 감쇠

각 fact별 freshness를 계산한다.

```text
≤ 90일   1.00
≤ 365일  0.90
> 365일  0.75
```

승인 UGC는 관련 capability의 날짜만 갱신한다. POI 전체 갱신일을 바꾸지 않는다.

```text
D = weightedMean(fact freshness)
score = round(clamp(100 × A × B × C × D, 0, 100))
```

### 강제 규칙과 라벨

1. 선택 페르소나의 critical capability가 `unsupported`이면 점수를 최대 49로 제한한다.
2. critical capability가 `unknown`이거나 evidence coverage가 65% 미만이면 라벨은 `정보 없음`이다.
3. 그 외에는:
   - `75–100`: 방문 가능
   - `50–74`: 주의
   - `0–49`: 대체 추천
4. 점수 70 미만이면 라벨과 별개로 대체 POI를 함께 제시한다.
5. 결과에는 총점뿐 아니라 기여도, 감점 사유, 데이터 날짜, 정책 버전을 반환한다.

### 시간 예산

일반 최적화 문제로 풀지 않는다. 검수된 `itinerary_templates` 중에서 선택한다.

```text
총 시간 =
  POI 체류
+ 고정 이동 매트릭스
+ 페르소나별 휴식
+ 식사
+ 숙박 전환 비용
```

휠체어·시니어·인지 옵션의 시간 배율은 곱하지 않고 가장 큰 배율을 사용해 폭증을 방지한다. 반나절→1박 2일 변경은 동일 템플릿 계열의 확장으로 구현해 PT에서 항상 같은 결과를 보장한다.

---

# 2. 병렬 Workstream

## 2.1 먼저 동결할 계약

1. **DB Contract v1**  
   테이블, enum, RLS, Storage bucket, migration ownership.

2. **KTO Contract v1**  
   transport, raw fixture, normalized POI/capability/provenance 타입.

3. **Domain Contract v1**  
   `calculateSuitability`, `buildItinerary`, `resolveGuide`, `moderateReport`, `buildDiaryDocument`.

4. **Design Contract v1**  
   색상·간격·타이포·focus·motion token과 공통 접근성 컴포넌트.

5. **Content Package Contract v1**  
   6 POI의 입구·단계·사진·AAC·도슨트·출처를 표현하는 Zod schema.

공유 계약 변경은 한 agent만 소유하고, 다른 stream은 직접 수정하지 않는다.

## 2.2 작업 스트림

| WS | 범위 |
|---|---|
| C0 Contracts | 도메인 타입, Zod schema, fixtures, constants |
| C1 Data Platform | Supabase schema, RLS, Storage, read models |
| C2 KTO/ETL | adapters, raw ingest, normalization, publishing |
| C3 Design/A11y | tokens, primitives, route focus, live region, map/list pattern |
| C4 Content | 6 POI 검수 데이터와 정적 route package |
| F1-AD | POI 카드, 적합도, 시간 예산, 템플릿 선택 |
| F1-B | 단계별 정적 경로, 지도·사진·쉬운글·오프라인 bundle |
| F1-C | SOS, 콜택시·보조기기 directory, AAC |
| F1-E | 페르소나 후기, GPX 제출·다운로드 |
| F1-F | 예측 가능 백제 7요소 |
| F2 | Odii, 자막, 점자 텍스트, 수어, 언어·모드 |
| F3 | 현장 제보, 관리자 검수, 승인 경고 |
| F4 | 다이어리, 퀴즈, PDF/BRF/GPX/단체 출력 |
| F5 | 데이터 완전성 집계와 RTO 대시보드 |
| I0 Integration | canonical pages와 D.1 시나리오 조립 |
| Q0 Quality | E2E, 접근성, 성능, 라이선스, demo resilience |

F1을 하나의 stream으로 두면 충돌과 책임 혼합이 발생한다. 특히 F1.B와 F1.F는 데이터는 공유하지만 UX 구현은 독립적이어야 한다.

## 2.3 의존 그래프

```text
C0 Contracts
 ├─► C1 Data Platform ─► C2 KTO/ETL ─► F1-AD, F2, F5
 ├─► C3 Design/A11y ────────────────► 모든 feature
 └─► C4 Content ─► F1-AD, F1-B, F1-C, F1-F, F2, F4

C1 ─► F3
F1-B ─► F1-F, F1-E, F4
F3 승인 이벤트 ─► F1-B 경고, F5 집계
F1-AD + F1-B + F2 + F3 + F4 + F5 ─► I0 ─► Q0
```

## 2.4 일정

### 6월 14일–6월 28일: 계약과 첫 vertical slice

- DB/KTO/domain/design/content schema 동결.
- 실제 KTO fixture 확보와 필드 검증.
- 공산성·국립공주박물관 우선 데이터 작성.
- `반나절 + 휠체어·시니어·가족` 결과가 한 화면에서 작동.
- CI에 typecheck, unit, axe, 핵심 E2E 설치.

### 6월 29일–7월 19일: 데이터와 F1 기반

- 6 POI ETL·발행 파이프라인.
- F1.A/D 전체.
- F1.B 공주 3 POI 경로 패키지.
- F3 제보 상태 머신·관리자 큐.
- F4 PDF/BRF/GPX 기술 spike 완료.

### 7월 20일–8월 9일: canonical F1–F5 병렬 구현

- F1.B 부여 3 POI.
- F1.C/E/F.
- F2 4언어 shell과 4채널.
- F3 승인 후 경고.
- F4 출력 6종의 최소 유효본.
- F5 동일 데이터 기반 갭 지표.

### 8월 10일–8월 31일: 통합·오프라인·접근성

- D.1 golden flow end-to-end.
- Serwist는 6 POI guide bundle에만 적용.
- NVDA, VoiceOver, TalkBack 수동 점검.
- 라이선스·AI 표시·위치 동의 감사.
- 장애·API 중단·cold start fallback 검증.

### 9월 1일–9월 15일: 검증과 수정

- 실제 관광약자·접근성 전문가 검증.
- 경로·쉬운글·점자 출력 오류 수정.
- 모든 demo API 응답 snapshot 고정.
- 성능·모바일·저속 네트워크 검증.

### 9월 16일–9월 30일: Release Candidate

- 기능 freeze.
- PT 시나리오와 백업 영상.
- production snapshot과 demo seed 분리.
- 심사 계정, 관리자 계정, 장애 대응 runbook 확정.

---

# 3. Repository 구조

```text
tour_data/
├── apps/
│   └── web/
│       └── src/
│           ├── app/[locale]/
│           ├── features/
│           │   ├── f1-poi-card/
│           │   ├── f1-planner/
│           │   ├── f1-route-guide/
│           │   ├── f1-safety/
│           │   ├── f1-community/
│           │   ├── f1-predictable/
│           │   ├── f2-docent/
│           │   ├── f3-report/
│           │   ├── f4-diary/
│           │   └── f5-dashboard/
│           ├── admin/
│           └── shared/
├── packages/
│   ├── domain/
│   ├── application/
│   ├── db/
│   ├── kto-client/
│   ├── public-data-clients/
│   ├── etl/
│   ├── ui/
│   ├── exports/
│   ├── content-schema/
│   └── test-fixtures/
├── content/
│   ├── pois/
│   ├── route-guides/
│   ├── docent/
│   ├── pictograms/
│   └── licenses/
├── supabase/
│   ├── migrations/
│   ├── seed/
│   └── tests/
├── scripts/
│   ├── ingest/
│   ├── validate-content/
│   └── publish/
├── tests/
│   ├── contract/
│   ├── e2e/
│   ├── accessibility/
│   └── demo/
└── .github/workflows/
    ├── ci.yml
    ├── kto-etl.yml
    └── release-readiness.yml
```

---

# 4. Synthesis와의 명시적 불일치

| 영역 | 내 판단 |
|---|---|
| §7 기능 번호 | 잘못됐다. canonical F1–F5를 훼손했고 외국어를 독립 기능으로 만들었다. |
| §8 workstream | F1이 지나치게 크고 canonical F3/F5 책임이 다른 stream에 섞였다. F1은 최소 5개 stream으로 분리해야 한다. |
| 동적 routing | pgRouting+NGII DEM은 MVP에서 제외한다. 사적지 내부 단차·문·노면은 DEM으로 신뢰성 있게 추론할 수 없다. |
| Kakao routing | inter-POI 표시·시간 참고만 사용한다. 무장애 가능성을 Kakao 결과에서 추론하지 않는다. |
| 캐싱 | Upstash는 초기에는 필요 없다. 서버리스 token bucket도 불완전하다. DB snapshot이 1차 캐시이자 source of truth다. |
| live API | Tats/DataLab/weather도 사용자 요청 중 직접 호출하지 않고 짧은 주기의 snapshot으로 발행한다. |
| ETL scheduler | 대형 배치는 GitHub Actions가 낫다. 재시도·수동 실행·로그·artifact·긴 실행에 유리하다. Vercel Cron은 짧은 refresh에만 쓴다. |
| `revalidateTag` | GitHub Actions가 HMAC 보호된 내부 endpoint를 호출해 tag를 무효화한다. 실패해도 bounded TTL로 회복한다. |
| API reality | 필드·코드 검증은 중요하지만 아키텍처 blocker는 아니다. raw payload와 normalized capability를 분리하면 병렬 개발이 가능하다. |
| PDF | 모든 문서를 react-pdf로 통일하지 않는다. 공식 양식은 `pdf-lib`, 신규 보고서는 react-pdf, HTML 대안을 항상 제공한다. Chromium은 MVP에서 제외한다. |
| Braille | 패키지가 변환된다고 한국점자규정 준수를 주장할 수 없다. 최소 샘플을 전문가가 검수해야 한다. |
| RAG/pgvector | PT 핵심 가치가 아니므로 제거한다. 검색은 6 POI에서 일반 FTS도 필요 없다. |
| AI 모델·OCR·360 | 제거한다. 공급자 수와 운영 위험만 늘어난다. |
| Auth | 여행 탐색·도슨트·다이어리는 로그인 없이 동작해야 한다. 익명 Auth는 UGC 식별에만 쓴다. |
| Messaging | FCM/APNs/SOLAPI는 제외한다. 승인 경고는 앱 내 banner와 Realtime로 충분하다. |
| 공식 KWCAG 인증 | 9월 인증 신청을 critical path에 두지 않는다. canonical proposal처럼 자체점검과 실제 사용자 검증을 우선한다. |
| 라이선스 | “가장 제한적인 라이선스가 전체 산출물에 자동 적용”은 지나친 일반화다. 자산별 출처·변형 정책을 유지하되 제한 자산의 합성·변형을 피한다. |
| 라이브러리 버전 | 정확한 최신 버전은 implementation lockfile에서 결정할 사항이지 장기 아키텍처 계약이 아니다. |

Claude의 기본 선택은 더 일반적인 플랫폼, 동적 라우팅, Vercel 중심 운영, 단일 F1 stream에 가까울 가능성이 높다. 나는 심사일까지의 신뢰성 때문에 **좁은 지역의 검수된 콘텐츠 시스템**을 선택한다.

---

# 5. 주요 위험과 완화

| 위험 | 완화 |
|---|---|
| API 필드 변경 | raw 저장, adapter 격리, fixture contract test |
| 경로 정보 오류 | 자동 생성 금지, POI별 버전·검수자·검수일 표시 |
| 점수의 허위 정밀성 | unknown 분리, coverage 공개, 강제 cap, 설명 가능한 결과 |
| 에이전트 간 계약 drift | contract owner 1명, versioned schema, feature별 디렉터리 소유 |
| 기능 과밀 | 각 F1–F5에 한 개의 완성된 vertical slice만 보장 |
| Odii 콘텐츠 부족 | 국가유산청 원문 기반 사전 생성 음성 fallback |
| 4언어 품질 편차 | 한국어·영어는 검수, 일·중은 KTO 원문 우선 |
| UGC 오염 | 구조화 양식, 사진, 중복 검사, 관리자 승인 전 비공개 |
| 위치·개인정보 | 세션 동의, 원시 GPS 미저장, local-first diary |
| PDF·BRF 품질 | golden-file test와 전문가 샘플 검수 |
| 접근성 자동검사 과신 | 스크린리더 수동 task test를 release gate로 설정 |
| 심사 당일 외부 장애 | snapshot 데이터, pre-generated media, demo seed, 백업 영상 |
| AI-only 개발의 도메인 한계 | 관광약자·특수교육·점자 전문가 검증은 개발과 별개로 반드시 확보 |

---

# 6. MVP에서 자를 것

완전히 제거:

- RAG 챗봇, embeddings, pgvector 검색.
- OCR, 360도, deck.gl, OD 분석.
- 동적 휠체어 경로 계산과 DEM 파이프라인.
- FCM/APNs/알림톡.
- 소셜 로그인 다종 연동.
- 결제·예약.
- 사용자 행동 기반 자동 재계산.
- formal KWCAG 인증을 심사 전 필수 일정으로 두는 것.
- 24개 외부 데이터 전체 연동.

축소:

- 2박 3일은 curated template 한 개만 제공.
- 다회차·시즌 패스는 UI 설명과 저장 모델까지만.
- 수어는 POI당 대표 영상 한 개.
- GPX는 검수된 경로 다운로드가 우선이며 사용자 기록 업로드는 단순 제출만.
- P4 단체 모드는 실시간 30명 동기화가 아니라 그룹 카드와 합본 출력.
- 일·중 언어는 핵심 안전·POI·도슨트 화면에 한정.
- 외부 데이터는 KTO, BF, 국가유산청, 기상, 응급, 충남 데이터 정도로 제한.

---

# 7. PT에서 강조할 것

D.1을 제품 전체의 단일 서사로 사용한다.

1. 로그인 없이 휠체어 할아버지·시니어·초등 손녀를 선택한다.
2. 반나절 코스에서 공산성 입구, 휴식, 화장실, 경고와 **점수 근거**를 보여준다.
3. 승인된 “동문 공사” 제보가 서문 정적 안내를 강조하지만 자동으로 경로를 바꾸지는 않는다.
4. 현장에서 Odii가 음성·자막·점자 텍스트·수어를 제공한다.
5. 시간을 1박 2일로 바꾸면 검수된 같은 템플릿 계열이 부여까지 확장된다.
6. 손녀 기록에서 학생 PDF·쉬운글 PDF·BRF·GPX가 생성된다.
7. 동일 데이터의 누락과 제보가 F5 충남 RTO 대시보드에 나타난다.

강조 문장은 다음이어야 한다.

> 한 번 수집한 무장애 데이터가 여행 전 판단, 현장 안내, 교육 기록, 다음 방문자의 경고, 충남의 시설 개선 우선순위까지 연결됩니다.

기능의 수보다 **동일한 데이터가 F1→F2→F3→F4→F5를 관통한다는 증거**가 1등 가능성을 높인다.

# 8. 단일 최고 레버리지

**6개 POI의 버전 관리되고 출처가 명확하며 실제로 검증된 “무장애 콘텐츠 패키지”를 완성하는 것**이다.

특히 공산성과 부소산성에 대해 입구, 단계, 사진, 경사·단차, 휴식, AAC, Odii, GPX, 출처, 검수일을 하나의 계약으로 만들면 거의 모든 기능이 단순한 표현 계층이 된다. 반대로 이 데이터가 부정확하면 지도·AI·PDF·대시보드가 아무리 화려해도 제품 전체가 신뢰를 잃는다.
