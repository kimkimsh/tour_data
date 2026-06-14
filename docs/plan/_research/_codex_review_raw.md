# 독립 PLAN-REVIEW — 모두의 백제

## 핵심 판단

현재 청사진은 **아키텍처 방향은 강하지만 contest-ready는 아니다.** 가장 큰 문제는 기능 수가 아니라, 핵심 주장인 “검증된 무장애 데이터”의 검증 절차와 산식이 아직 구현 계약으로 동결될 수준까지 정의되지 않았다는 점이다. 이 상태로 병렬 개발하면 화면은 완성돼도 심사에서 데이터 신뢰성과 실용성을 방어하기 어렵다.

## 주요 발견

| 심각도 | 위치 | 문제 | 구체적 수정 |
|---|---|---|---|
| **blocker** | `SPEC §7`, `05 §4`, `12 §1.1` | `SuitabilityResult` 계약이 문서마다 다르다. `total`/`score`, `axes`/`perAxisContribution`/`axisContributions`, `"정보없음"`/`"정보 없음"`이 불일치한다. | 단일 TS 계약 파일을 권위 원천으로 정하고 문서에는 복사하지 말고 링크만 둔다. 계약 golden fixture를 consumer CI에 포함한다. |
| **blocker** | `05 §4.3`, `§10` | 산식의 핵심 입력이 미정이다. persona×capability 매트릭스, axis별 capability 집합, 휴식 임계값, 혼잡·날씨 매핑, freshness 가중치, 다중 source 충돌 규칙이 없다. 스펙만으로 구현할 수 없다. | 코딩 전 `suitability-policy-v1.json`으로 모든 매트릭스·곡선·우선순위·임계값을 수치화하고, 최소 30개 golden case를 전문가가 승인한다. |
| **blocker** | `C4`, `12 Window 1–2`, `15 R-V2` | `verified_by/date` 존재만으로 현장 검증을 인정한다. 측정 방법, 장비, 사진 증거, 검수자 자격, 재검수 주기, 오차 허용치가 없다. | POI별 evidence pack을 DoD로 지정한다: 원본 사진, 측정값, 측정법, 검수자, 2차 승인, 유효기간, 변경 이력. 단순 문자열 검증은 금지한다. |
| **blocker** | `12 §4`, `15 OI-10` | 실사용자·점자·특수교육 검증이 9월로 밀려 있고 참가자 모집도 미해결이다. 결과가 나올 때는 feature freeze 직전이다. | 7월에 demo-pair 1차 검증, 8월 전체 흐름 2차 검증, 9월 회귀 검증으로 분할한다. 모집·보상·장소·담당자·합격 기준을 6월에 확정한다. |
| **blocker** | `F4`, `02 §8.5`, `15 R-F2` | Unicode 점자와 `.brf`를 사실상 동일하게 취급한다. 한국어 점역 정확성, Braille ASCII/embosser 호환성, 수학·구두점 규칙이 검증되지 않았다. | 대상 점역 규칙과 실제 점자 프린터를 먼저 지정한다. 점자 사용자의 대조 검수 없이는 “BRF 지원”을 심사 주장으로 사용하지 않는다. |
| **blocker** | `12 Window 1`, `§6.1` | 첫 vertical slice 정의가 서로 다르다. Window 1 표에는 F1-AD만 있으나 §6.1은 F1.B와 F4까지 요구하고, 위험 문서는 F1→F5 slice라고 주장한다. | 첫 slice를 명시적으로 축소해 하나로 고정한다: 공산성 F1.A/D → 검증 경로 3단계 → HTML 다이어리 → F5 gap 1개. 담당·fixture·E2E를 함께 지정한다. |
| **blocker** | `15 R-F1`, 전체 일정 | 4개월에 6개 현장 경로, 4언어, 수어, 점자, 6개 출력, UGC, admin, offline, F5를 모두 “완성”하는 것은 인력·콘텐츠 생산량 기준이 없다. 위험을 나열했지만 실제 scope gate가 없다. | 7/19과 8/9에 자동 scope-cut gate를 둔다. 핵심 경로 미달 시 후술한 컷 목록을 질문 없이 적용하도록 결정한다. |
| **major** | `SPEC §7`, `05 §4.3` | Layer A가 “POI intrinsic”이라면서 휠체어·유아 capability를 섞는다. Layer B에서도 같은 사실을 다시 평가해 이중 계산한다. | A는 물리·운영 축으로 정의하거나, persona별 A를 계산한다. 같은 capability가 A와 B에 들어가면 중복 목적을 문서화하고 민감도 분석을 제공한다. |
| **major** | `SPEC §7` | `unknown=0.35`는 근거 부재를 부분 적합으로 보상한다. coverage 65%만 넘으면 나머지 unknown이 점수를 올릴 수 있다. | unknown은 점수 기여 0 또는 계산 제외로 처리하고, 별도 confidence를 표시한다. 부족한 데이터가 높은 점수를 만들 수 없게 한다. |
| **major** | `05 §4.5` | 예시 자체가 규칙과 모순된다. `verifiedUgc unknown=0.35`라면서 contribution은 `0.07×0.50=0.035`로 계산한다. | worked example을 golden test에서 직접 생성해 문서에 삽입한다. 수기 숫자를 유지하지 않는다. |
| **major** | `05 §4.4` | 알려진 critical unsupported와 critical unknown이 동시에 있으면 `"정보없음"`이 알려진 위험을 덮을 수 있다. | 우선순위를 `known critical blocker → 대체추천`, 그 다음 `insufficient evidence → 정보없음`으로 변경한다. 두 상태가 있으면 둘 다 노출한다. |
| **major** | `SPEC §7 Layer C` | 인증이 실제 접근성 점수를 최대 12% 올린다. 인증은 이미 capability facts와 중복되며 74점을 75점으로 바꿀 수 있다. | 인증은 점수 승수보다 confidence/coverage 증거로 사용한다. 승수를 유지한다면 인증만으로 라벨 경계를 넘지 못하도록 한다. |
| **major** | `SPEC §7 Layer D` | 오래된 긍정·부정 증거를 모두 동일하게 곱셈 감점한다. freshness는 적합성이 아니라 불확실성인데 낮은 적합도로 표현된다. | stale fact를 점차 `unknown`으로 전환하거나 confidence를 낮춘다. suitability와 evidence confidence를 별도 출력한다. |
| **major** | `SPEC §7`, `F3` | UGC가 Layer A, capability 날짜 갱신, 원본 fact로 중복 반영될 수 있다. 한 번 승인된 제보로 점수 조작이 가능하다. | UGC는 단독으로 authoritative status를 변경하지 못하게 하고, corroboration 수·검수자·증거 수준에 따른 명시적 승격 규칙을 둔다. |
| **major** | `SPEC §7 alternatives` | `TarRlteTar`의 연관 관광지는 접근성 대체지라는 보장이 없다. 관련성 데이터를 안전 대안으로 표시하는 것은 오해를 만든다. | 대체지는 점수가 계산되고 검증 경로가 있는 6 POI에서만 선택한다. TarRlteTar는 “관련 관광지”로 별도 표시한다. |
| **major** | `05 §2.4`, `§4.4` | 대체지 노출 기준이 한 곳은 `<75`, 권위 산식은 `<70`이다. | 하나의 정책 상수로 통합하고 boundary test `69/70/74/75`를 추가한다. |
| **major** | `05 §4.6` | “시간예산 6단”이라면서 타입과 표에는 4개뿐이다. `2박3일`에는 잠금된 6 POI 밖의 익산·논산도 포함된다. | MVP를 `반나절/당일/1박2일` 3단으로 축소한다. 2박3일과 타 지역은 발전방향으로 이동한다. |
| **major** | `12 §1–5` | 계약이 모두 green이어야 feature가 시작된다면서 C0–C4와 F1 slice를 같은 기간 병렬 실행한다. C1→C2→C4→F1의 실질 순차 의존이 감춰져 있다. | 계약 freeze를 48–72시간 단위로 순차화하고, stub UI와 real-data integration을 별도 milestone로 분리한다. |
| **major** | `12 §2` | 디렉터리 ownership이 실제로 충돌한다. F1-E와 F4가 `packages/exports`, I0와 Q0가 `tests/e2e`, C2가 소유 범위 밖 revalidate route를 수정한다. | shared package를 별도 owner stream으로 만들거나 하위 경로까지 소유권을 분할한다. root config, lockfile, env, app routes, migrations에도 owner를 지정한다. |
| **major** | `02 §2.3`, `§5–6` | `apps/web`는 public-data client를 import할 수 없다면서 Vercel Cron route가 날씨/Tats/대기 refresh를 직접 수행한다. | context refresh를 GH Actions/별도 worker로 이동하거나 server-only cron package 예외를 계약에 명시한다. |
| **major** | `02 §6.2` | “단일 publish transaction”만으로 데이터셋 버전 정합성이 보장되지 않는다. 삭제된 fact, 실패한 POI, 이전 버전 잔존 행 처리 규칙이 없다. | staging/versioned tables에 완전한 snapshot을 생성한 뒤 active version 포인터를 원자적으로 교체한다. replace/delete semantics를 테스트한다. |
| **major** | `02 §4.2` | 예제 `unstable_cache`는 정적 태그 `poi:all`만 설정해 문서의 `poi:{id}` 무효화를 구현하지 못한다. | POI별 cached factory 또는 명시적 key/tag builder를 만들고 POI 단위 invalidation contract test를 추가한다. |
| **major** | `15 §2` | live API 검증을 일반 CI와 weekly CI에 넣으면 quota·secret·외부 장애로 PR이 막힌다. “fixture-only contract test” 원칙과도 충돌한다. | live probes를 수동/예약된 integration workflow로 분리한다. PR CI는 signed fixture와 schema drift test만 사용한다. |
| **major** | `Gate 1` | “6 POI 모두 최소 15개 키”는 API가 빈 필드를 생략하면 실패한다. 동시에 `Zod passthrough` 원칙과 “passthrough 없이 등록” 기준도 모순이다. | envelope 필수 필드와 optional capability 필드를 구분한다. unknown key는 기록·경고하되 publish를 막을지 명시한다. |
| **major** | `F2`, `15 R-F4/F5` | “4언어 × 음성·자막·점자·수어”는 콘텐츠 생산·언어학적으로 과장돼 있다. 한국수어는 단순 다국어 채널이 아니며 언어별 점자도 별도 검증이 필요하다. | 한국어 4채널은 demo pair만 완성한다. 외국어는 텍스트·자막·음성으로 제한하고 수어/점자는 검증된 언어만 주장한다. |
| **major** | `F1.B §3.3` | Canvas 사진 압축은 Type3 변형 금지와 충돌하고 CORS taint·IndexedDB quota 문제도 있다. Cache Storage와 IndexedDB에 자산이 중복된다. | license-aware bundle manifest, 최대 용량, 자산 hash, 저장소 하나를 정의한다. 오프라인 지도 대신 완전한 텍스트 단계 사용을 보장한다. |
| **major** | `F3`, `C1` | anonymous UGC에 rate limit, upload 제한, CAPTCHA/abuse control, admin permanent-auth 방식이 없다. | 제보 횟수·파일 크기/MIME·중복 hash 제한, server-side rate limit, admin MFA, audit retention을 acceptance criteria에 추가한다. |
| **major** | `F5` | completeness와 gap priority의 계산 정의가 없다. 6 POI의 방문자 추세와 제보 수만 보여주면 “RTO 개선 신호”가 아니라 장식 대시보드가 된다. | `impact × severity × confidence × feasibility` 기반 우선순위와 실제 조치 항목을 정의한다. 각 지표가 어떤 RTO 결정을 지원하는지 명시한다. |
| **major** | `15 R-V1` | “20명 테스트”만 있고 성공 기준이 없다. 참가자 수는 품질 증거가 아니다. | 핵심 과업 완료율, critical error 수, 도움 요청률, 정보 이해도, 경로 판단 정확도에 합격선을 둔다. |
| **minor** | `02 §0`, `15 R-O1` | “데모 당일 외부 의존 0”은 과장이다. Vercel, Supabase, Kakao SDK, Storage에는 여전히 의존한다. | “런타임 KTO/Odii 의존 0”으로 정확히 표현하고 Kakao 실패 시 list-only fallback을 시연한다. |
| **minor** | `SPEC §10`, `15 R-A4` | “PII는 Supabase Seoul에만”이라는 표현은 Server Action, Vercel 로그, Storage/CDN 처리까지 고려하면 보장하기 어렵다. | 실제 data-flow diagram과 로그 redaction 검사를 만들고 법률 주장은 전문 검토 후 확정한다. |

## 추가로 줄여야 할 범위

1. **F1.F 7요소를 3요소로 축소:** 시각 일정, 1단계 1행동, calm mode + AAC만 유지. 보호자 동기화·60초 변경·단체모드는 발전방향으로 이동.
2. **F2 geofence 제거:** map-tap만 MVP로 유지. 한국어 4채널은 공산성·부소산성에만 깊게 구현.
3. **F1.E 후기와 UGC GPX 제출 제거:** F3만 UGC 진입점으로 유지. curated GPX 다운로드는 가능하지만 community loop는 연기.
4. **F4 출력 품질 우선:** HTML, 학생 PDF, 쉬운글 PDF, 전문가 검증 BRF를 우선한다. 교사 루브릭·단체합본은 동일 문서 모델의 얇은 파생물일 때만 포함.
5. **F5를 단일 gap report로 축소:** 히트맵·일반 방문 추세보다 “어떤 시설을 왜 먼저 개선할지” 한 화면에 집중.
6. **6 POI 깊이 차등화:** 공산성·부소산성은 완전한 evidence pack과 route를 제공하고 나머지 4곳은 검증 카드 중심으로 제한한다.

## 가장 높은 레버리지

**“하나의 검증된 barrier fact가 어디서 왔고, 사용자 판단을 어떻게 바꾸며, 현장 경로·다이어리·RTO 개선 항목까지 어떻게 이어지는지”를 감사 가능한 한 줄의 lineage로 보여주는 것**이다.

예: 원본 사진·측정 → `accessibility_fact` → 산식 병목 → 서문 경로 단계 → 다이어리 기록 → F5 개선 우선순위. 이것이 기능 개수보다 데이터활용·기획력·실용성 점수를 훨씬 직접적으로 얻는다.

## 최종 판정

**현재는 contest-ready가 아니다.** 좋은 구현 방향과 발표 서사는 있지만, 핵심 데이터의 신뢰성, 산식 계약, 일정의 실행 가능성이 아직 방어되지 않는다.

가장 중요한 변경 3가지는 다음이다.

1. 산식 정책과 반환 계약을 완전히 동결하고 전문가 승인 golden cases로 검증한다.
2. 공산성·부소산성 evidence pack과 조기 실사용자 검증을 최우선 critical path로 만든다.
3. F1.F/F1.E/F2 다국어 범위를 즉시 줄이고, F1→F5 데이터 lineage 한 흐름의 완성도에 집중한다.
