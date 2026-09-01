# 모두의 백제 adversarial plan/spec review v7

검증 기준은 현재 작업 트리의 `docs/spec` > `docs/plan` 순서다. DOCX 위치는 `python3 zipfile + regex`로 `word/document.xml`을 풀어 센 논리 문단(`OOXML ¶`), XLSX 위치는 worksheet cell, PDF 위치는 `pdftotext -layout` 결과의 line이다. `UNVERIFIED`는 문서만으로 참을 확인할 수 없다는 뜻이며, 필요한 확인물을 fix에 적었다.

## Findings

P0 | docs/spec/05_ingest.md:159 → docs/spec/05_ingest.md:168 | `resolveStatus()`가 `없음`을 일괄 부정으로 먼저 매칭해 `단차 없음`·`장애물 없음`을 `unsupported`로, `미확인`·`설치 여부 확인 필요`를 매칭 실패 후 `supported`로 뒤집는다 | 필드별 자유 문장이 실제 이용 가능/불가 판정을 반대로 만들어 장애인의 헛걸음과 심사위원의 즉시 반례를 초래한다 | 범용 `없음`·비어 있지 않은 기본 `supported`를 삭제하고, 명시적·필드별 규칙만 판정하며 매칭되지 않은 문장은 `unknown`으로 둔다.

P0 | docs/spec/05_ingest.md:178 → docs/spec/05_ingest.md:193 | 빈 KTO 필드가 증명하는 것은 “응답에 값이 없다”뿐인데 나머지 전부를 `operator_missing`으로 추론해 핵심 주장인 “빈칸의 원인을 추론하지 않는다”를 스펙 자신이 어긴다 | S10이 근거 없이 담당자 미입력·개선 가능으로 단정해 지자체 리포트의 신뢰를 무너뜨린다 | 빈값의 `absenceKind`는 `null`로 두고, `intrinsic`·`operator_missing`은 출처가 있는 `curated-facts.json`에서만 명시하며 `null`은 개선 우선순위에서 제외한다.

P0 | docs/spec/05_ingest.md:208 → docs/plan/03_operation_and_growth.md:46 | 출처 우선순위가 KTO 원문을 폐기한 단일 resolved fact만 남기는데 S10은 그 배열로 “공사 원문/우리가 확인/정보 없음”과 원자료 개선 성과를 측정한다 | 계획 문서도 우리가 한 칸을 채워도 지자체/KTO 성과처럼 올라간다고 인정하므로, 빈 필드를 지자체 개선 과제로 돌린다는 핵심 산출물이 자기 성과를 셀 수 있다 | S10의 24항목 KTO 채움/빈칸은 priority override 전 `detailWithTour2` 원응답으로 계산하고, curated 현재 판정은 별도 표시한다.

P0 | docs/spec/05_ingest.md:80 → docs/spec/05_ingest.md:93 | “중간 실패 시 아무것도 쓰지 않고 이전 snapshot을 서빙한다”는 규칙과 달리 routes/context 실패 시 accessibility를 직전 값이 아닌 `unknown`으로 덮어쓴다 | 사용자는 “정보가 없음”과 “이번 수집에서 확인에 실패함”을 구분할 수 없고, 첫 실행이면 정상 snapshot도 없다 | 의존 snapshot이 없거나 이번 실행에서 실패하면 accessibility 발행 전체를 중단하고 직전 snapshot을 유지하며, bootstrap 시에는 전체 발행을 실패시킨다.

P0 | docs/spec/09_test_and_ci.md:84 → docs/spec/09_test_and_ci.md:95 | `scripts/validate-content.ts`가 자신이 포함한 `scripts/`를 스캔하면 grep pattern 문자열 자체가 반드시 매칭되고, 반대로 `"150"`·`"760"`은 pattern에 없어 통과한다 | 스펙대로 구현하면 `pnpm validate:content`와 CI가 항상 실패하면서 일부 하드코딩은 못 잡는다 | 이 grep gate를 삭제하고 시군구 값은 기존 `content/pois.json` 입력과 Zod 구조 검증으로만 관리한다.

P0 | docs/spec/12_judging_and_demo.md:30 → docs/base/info.pdf:pdftotext-L127 | “일정과 자격 [확정]” 표가 대한민국 국민·국내 거주·팀당 5명 이하·동일 서비스 기수상/공사 지원사업 수혜자 제외를 누락한다 | 하나라도 어기면 제품 품질과 관계없이 심사 제외되며, 현재 자격은 `UNVERIFIED`다 | 기존 §1 표에 누락 4가지와 동일 서비스 타 부문 중복 금지·허위/결격 시 취소·상금 회수를 추가하고 참가자 현황으로 확인한다.

P1 | docs/spec/11_open_items.md:31 → docs/spec/05_ingest.md:284 | `resultCode 03`은 manual의 “데이터 없음”을 넘어 “관광지가 데이터셋에 미등록”을 증명하지 않는데 스펙이 등록 상태와 담당자 작업까지 단정한다 | 잘못된 contentId·일시적 no-data·실제 미등록을 구분하지 못해 지자체에 잘못된 “관광지 등록” 과제를 준다 | P0-1이 search/list와 detail을 같은 ID로 교차 확인하기 전에는 표시를 “해당 contentId의 무장애 응답 없음”으로 정정한다.

P1 | docs/spec/06_suitability.md:101 → docs/spec/04_data_model.md:168 | `SuitabilityInput.facts` 타입에 `isKtoScored`가 없는데 출력 계약은 그 플래그로 24항목을 세도록 요구한다 | 문서대로 TypeScript를 작성하면 프로퍼티 접근이 compile 오류이거나 24를 다른 catalogue에서 다시 추론해 단일 계약이 깨진다 | input fact에 snapshot schema와 동일한 `isKtoScored: boolean`을 추가한다.

P1 | docs/spec/05_ingest.md:183 → docs/spec/06_suitability.md:148 | `not_applicable`을 `status: unknown`으로 두면 해당 없는 항목도 축 평균·personaFit·coverage·24항목 분모에 0.35로 반영된다 | 비숙박 POI의 room 같은 N/A가 적합도와 채움률을 인위적으로 낮추고 “정보 없음” 수를 부풀린다 | `not_applicable`은 모든 평균·coverage·KTO 분모에서 제외하고 남은 가중치만 재정규화한다.

P1 | docs/spec/06_suitability.md:15 → docs/spec/06_suitability.md:310 | D에 신선도를 직접 곱해 score를 낮추면서 §6.3은 “오래되거나 비어 있음은 부적합이 아니라 불확실이므로 점수에 곱하지 않는다”고 말한다 | 같은 사실이 score와 confidence에 중복 반영되고 정책 설명과 식이 동시에 참일 수 없다 | 해당 설명을 지키려면 score 식에서 D를 삭제하고 신선도는 `evidenceConfidence`에만 남긴다.

P1 | docs/spec/06_suitability.md:319 → docs/spec/06_suitability.md:345 | 4a/4b의 “라벨 상한 `주의`”를 어떤 순서 함수로 적용하는지 없어 0~49점 `대체추천`을 `주의`로 올리는 구현도 문서와 부합한다 | “상한”이 오히려 라벨을 개선하는 단일 입력 다중 해석이 생긴다 | 4a/4b는 3단계 결과가 `방문가능`일 때만 `주의`로 낮추며 `주의`·`대체추천`은 그대로 둔다고 명시한다.

P1 | docs/spec/06_suitability.md:188 → docs/spec/06_suitability.md:392 | P0에는 critical이 없어 전 항목 unknown이면 22점 `대체추천`이 되는데 worked example은 `정보없음`이라고 쓴다 | 일반 방문 초기 상태에서 점수를 숨길지/대체지를 줄지가 구현자에 따라 달라진다 | 라벨 규칙 앞에 `P0 && coverage === 0 → 정보없음`을 명시하거나 worked example의 라벨을 `대체추천`으로 정정한다.

P1 | docs/spec/06_suitability.md:385 → docs/spec/06_suitability.md:392 | P0·C=1·최신 known 항목이라는 문서의 기본으로 재계산하면 80% supported/20% unknown은 84점, 50/50은 62점이지 76/56이 아니다 | 어떤 persona·항목 배치·D를 썼는지 없어 예제와 “75점에 약 80%” 근거를 재현할 수 없다 | 기본 fixture를 명시하고 숫자를 84/62/22로 고치거나, 정확히 76/56이 나오는 전체 input을 적는다.

P1 | docs/spec/09_test_and_ci.md:28 → docs/spec/09_test_and_ci.md:33 | `all-partial`은 C 최대 1.12에서도 49점 이하이므로 “중간대·주의”가 아니라 `대체추천`이며, `boundary-74-75`는 점수를 만드는 fixture 규칙이 없다 | 골든 23건을 스펙대로 쓰면 자체 산식과 부딪히거나 손으로 기대값을 조작하게 된다 | `all-partial` 기대를 44점·`대체추천`(C=1,D=1)으로 고치고, 74/75 fixture의 A/B/C/D 입력을 정확히 적는다.

P1 | docs/spec/09_test_and_ci.md:54 → docs/spec/09_test_and_ci.md:63 | property 7은 “confidence가 score에 영향을 안 준다”고 하면서 freshness 변경 후 A/B/C만 비교해 D와 score 변화를 검사하지 않는다 | 현 산식에서 freshness는 D를 통해 score를 바꾸므로, 검사는 잘못된 주장에서 실패할 수 없다 | D를 score에서 제거한 후 score 불변을 assert하거나, 현 식을 유지하면 property 7을 삭제한다.

P1 | docs/spec/06_suitability.md:402 → docs/spec/06_suitability.md:406 | `alternatives`는 더 높은 숫자 score만 보므로 자신도 `정보없음`·`대체추천`인 POI를 대체지로 제시할 수 있다 | 화면이 “다른 곳 권장 → 대신 이곳: 다른 곳 권장”을 내보내 핵심 판정을 스스로 무효화한다 | 대체지는 더 높은 score이면서 label이 `방문가능`·`주의`인 곳만 허용하고 없으면 빈 목록으로 둔다.

P2 | docs/spec/06_suitability.md:49 → docs/spec/06_suitability.md:54 | `Deduction.impact`를 “이 항목 때문에 잃은 점수”로 출력하지만 A·B·C·D가 얹힌 산식에서 항목별 impact 정의가 없다 | 순서·제거 방식에 따라 값이 달라져 “감점이 큰 항목” 표시를 재현할 수 없다 | `impact` 필드와 순위 표시를 삭제하고 이미 정의된 축별 weighted 값만 보여준다.

P2 | docs/spec/09_test_and_ci.md:54 → docs/spec/09_test_and_ci.md:65 | 반환타입이 단일 scalar label인 함수에서 “라벨은 정확히 1개” property는 중첩된 내부 분기가 실행됐는지 관찰할 수 없다 | 어떤 분기가 겹쳐도 마지막에 대입된 label 하나만 보여 검사가 항상 통과한다 | property 6을 삭제하고 규칙 우선순 경계는 구체 input/output 골든으로만 검사한다.

P1 | docs/spec/03_external_data.md:118 → docs/api_manual/1737596531873/한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx:OOXML-¶171 | spec이 “service(신청) 단위 1,000건”이라고 정정했지만 신청 manual은 “각 operation별 일일 1,000건”이라고 명시한다 | §5의 서비스별 백분율·합계 95건·최대 2.8%가 quota와 무관한 분모를 쓰고, 정정 12건 주장 자체가 manual 역대조로 실패한다 | §1.6과 §5를 operation별 1,000으로 고치고 서비스 합계 백분율을 삭제하며 operation별 최대 호출수만 검산한다.

P1 | docs/spec/03_external_data.md:124 → docs/api_manual/1737596531873/한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx:OOXML-¶198 | “이 10종 manual에 operating account 서술이 없고 유효기간도 미확인”이라는 설명과 달리 공통 신청 manual은 승인 1~3일·승인일로부터 24개월·연장 신청을 적는다 | 9월 운영계정 신청 시점과 10월 심사 유효성 계획이 근거 없이 미결로 남는다 | 공통 신청 manual 사실을 §1.6으로 옮기고 “없다/미확인” 문장을 삭제한다.

P1 | docs/spec/03_external_data.md:285 → docs/api_manual/1720672146251/한국관광공사_개방데이터_활용매뉴얼(오디)_v4.1.docx:OOXML-¶1355 | Odii `storyLocationBasedList` 요청 표는 `mapX/mapY/langCode`이지만 같은 manual의 URL은 `xCoord/yCoord/lang`이므로 spec의 `[확정][정정]`과 “이전 스펙이 틀렸다”는 단정은 근거가 없다 | 표만 믿고 구현하면 실제 endpoint가 URL 예시 계약을 쓸 때 전부 no-data/bad-parameter가 될 수 있다 | 전체 절을 `[미확인]`으로 낮추고 P0-9에서 두 parameter 조합을 실제 호출한 결과만 채택한다.

P1 | docs/spec/03_external_data.md:234 → docs/spec/03_external_data.md:502 | KorService·Odii·TatsCnctr·DataLab·TarRlteTar·PhotoGallery·Eng/Jpn/Chs의 dataset ID를 `[확정]` 문장에 넣었지만 해당 숫자는 제공된 manual `word/document.xml` 전체에 0건이다 | `UNVERIFIED`: ID가 바뀌거나 잘못 전사됐을 때 manual 근거로 검증했다는 주장을 못 지킨다 | 각 ID를 `[미확인—portal metadata]`로 낮추고 data.go.kr 상세 화면을 보존한 근거가 생긴 항목만 승격한다.

P1 | docs/spec/05_ingest.md:331 → docs/api_manual/1725501618773/한국관광공사_개방데이터_활용매뉴얼(관광지집중률방문자추이예측정보)_v4.0.docx:OOXML-¶731 | TatsCnctr를 시군당 `numOfRows=100` 한 페이지만 받고 목표 이름을 거르지만 manual의 이름필터 예시조차 `totalCount=1590`이다 | 첫 100행에 6곳이 없으면 실제로 있는 예측을 `unknown`으로 오판하고 P0-5 목록 전체도 못 본다 | `totalCount`까지 페이징하거나 6개 `tAtsNm`을 각각 호출해 필터 작동을 탐침으로 검증한다.

P1 | docs/spec/05_ingest.md:385 → docs/spec/05_ingest.md:398 | `cnctrRate` 예시가 64.65 같은 소수인데 경계를 `≤40 / 41–70 / 71–100`으로 써 40~41·70~71 사이 입력에 정의된 branch가 없다 | 실제 응답 40.5·70.5가 구현자에 따라 다른 라벨이거나 `undefined`가 된다 | 탐침 전에는 등급 분기를 삭제해 `unknown`으로 두고, 유지하려면 `rate <= 40`, `40 < rate && rate <= 70`, `70 < rate && rate <= 100`으로 정정한다.

P1 | docs/spec/05_ingest.md:368 → docs/api_manual/1725502022236/한국관광공사_개방데이터_활용매뉴얼(관광지별연관관광지정보)_v4.1.docx:OOXML-¶537 | related 수집은 시군당 default 첫 10행만 호출하지만 manual area 예시는 `totalCount=800`이다 | 우리 6곳이 첫 페이지에 없으면 연관 데이터가 있어도 목록을 숨기고, 2 call/반나절 계획도 거짓이 된다 | `searchKeyword1`을 대상 6곳에 쓰거나 `totalCount`까지 페이징하고 호출 예산을 다시 센다.

P1 | docs/spec/03_external_data.md:409 → docs/spec/05_ingest.md:347 | `740일일 행 = 229 시군구 × 3구분`은 229×3=687이고, ingest 문서는 다시 `740행 × 3구분`이라고 쓨 구분을 중복 계산한다 | manual의 `totalCount=740`에 이미 `touDivCd` 행이 포함되어 페이징·예산 설명이 서로 다르고 산수를 손계산한 티가 난다 | 시군구 229 근거를 삭제하고 “manual sample totalCount 740, 3구분 포함”으로 통일하며 ×3 문구를 삭제한다.

P1 | docs/spec/03_external_data.md:433 → docs/spec/05_ingest.md:366 | API manual에 없다고 명시한 “약 4일 지연”을 ingest와 S10은 확정 규칙·고정 문구로 쓴다 | 지연이 3일이면 최신 날짜를 버리고, 5일이면 빈 호출을 하며 화면에 실측하지 않은 출처 설명을 낸다 | P0 탐침이 반환한 최근 `baseYmd`를 기준으로 8일 창을 계산하고, 탐침 전에는 4일 단정 문구를 삭제한다.

P1 | docs/spec/03_external_data.md:222 → docs/plan/02_claims_and_validation.md:37 | KorWith 검색 필터가 없다는 manual 사실에서 “그 필드에 값이 거의 없다”를 추론하고 plan은 이를 관측 근거로 올린다 | 필터 부재는 UI/API 정책일 수 있어 대상 6곳의 빈칸을 증명하지 않으며, 데이터 공백을 문제 정의로 쓰면 심사에서 반박된다 | “값이 거의 없다” 문장을 삭제하고 P0-1의 6곳 실제 채움률만 증거로 쓴다.

P1 | docs/spec/03_external_data.md:520 → docs/spec/03_external_data.md:569 | 대상은 6곳인데 유적 4곳 외에 “박물관 3곳”을 더하고, 정림사지를 사적지 12/76과 박물관 14/78 두 분류에 동시에 넣는다 | 정림사지(+정림사지박물관) 하나의 contentId/contentTypeId를 선택할 수 없고, 잘못된 type은 detailIntro와 다국어 호출을 비운다 | P0-1의 실제 KTO record를 기준으로 정림사지 유적 또는 박물관 하나를 선택하고 “박물관 3곳”을 정정한다.

P2 | docs/spec/03_external_data.md:54 → docs/api_manual/1737596531873/한국관광공사_개방데이터_활용신청방법_매뉴얼_v3.3.docx:OOXML-¶172 | 발급 반영을 “수 분~1시간”과 “10~30분”으로 두 번 다르게 쓰지만 manual은 10~30분만 제시한다 | 착수 2일 일정의 대기 경계가 불필요하게 2배 벌어진다 | 지원되지 않는 “수 분~1시간”을 삭제하고 10~30분으로 통일한다.

P1 | docs/spec/09_test_and_ci.md:105 → docs/spec/10_build_order.md:126 | 필수 golden flow는 GPX download·실제 report 등록을 반드시 검사하지만 cut gate는 GPX와 S7 form을 삭제할 수 있게 한다 | 일정상 합법한 cut을 적용하면 §9의 “필수” E2E가 spec 자체 때문에 실패해 완료 판정이 불가능하다 | cut된 feature의 E2E step을 같은 gate에서 삭제하거나, 필수 flow에 남길 기능은 cut 목록에서 제거한다.

P1 | docs/spec/09_test_and_ci.md:138 → docs/spec/09_test_and_ci.md:150 | 위치정보 0-call 검사가 `getCurrentPosition`만 갈아끼워 `watchPosition`은 전혀 관찰하지 않는다 | 코드가 `watchPosition`으로 GPS를 수집해도 법적 비수집 증명이 통과한다 | 두 geolocation method를 모두 wrapper로 계수하고 0을 assert한다.

P1 | docs/spec/04_data_model.md:276 → docs/spec/12_judging_and_demo.md:116 | Supabase query가 empty row·network·auth·DB error 모두에서 throw하지만 screen spec은 없고 demo runbook만 “snapshot 읽기 실패 화면”이 있다고 가정한다 | 사용자가 “데이터가 없음”과 “Supabase에서 확인할 수 없음”을 구분할 화면·retry·stale fallback이 정의되지 않았다 | S2/S3/S10 기존 화면 규칙에 snapshot 미존재와 query 장애의 서로 다른 문구·재시도 동작을 적는다.

P1 | docs/spec/07_screens.md:410 → docs/spec/12_judging_and_demo.md:118 | Odii story가 없을 때 UI와 MP3 URL이 있지만 호스트 재생이 runtime에 실패할 때 UI가 없고 발표자 runbook만 있다 | 일반 사용자는 깨진 player를 보며 “오디오 미제공”과 “호스트 장애”를 구분할 수 없다 | 기존 S6 규칙에 `<audio>` error 시 “오디오를 불러오지 못했습니다”를 보이고 대본·TTS는 유지한다고 추가한다.

P1 | docs/spec/09_test_and_ci.md:191 → docs/spec/04_data_model.md:269 | CI의 `next build`은 Supabase env·migration·snapshot seed 단계가 없는데 page data reader는 `.single()`로 snapshot을 요구한다 | `UNVERIFIED`: Next route가 build-time에 실행되면 비밀키/행 부재로 build가 깨지고, runtime-only이면 통과하므로 현 spec만으로 CI 성립을 확인할 수 없다 | 정적/dynamic route 설정을 확정하고 build-time read이면 CI에 local Supabase·6 snapshot seed를 먼저 실행한다.

P2 | docs/spec/09_test_and_ci.md:79 → docs/spec/04_data_model.md:390 | `slopeNote` blacklist은 `%`와 `숫자+도`만 막아 `1:12`·`0.08`·`8°`·`8.5 퍼센트`같은 미실측 수치를 통과시킨다 | “재지 않은 경사를 빌드가 막는다”는 발표 주장이 간단한 표기 변형으로 깨진다 | 숫자 blacklist을 삭제하고 이미 허용한 정성 phrase enum/목록에 포함된 값만 받는다.

P2 | docs/spec/09_test_and_ci.md:81 → docs/spec/04_data_model.md:331 | `ktoContentId`가 비어 있지 않은지만 보면서 “임시값 배포 방지”라고 설명하고, 스펙 예시의 미확정 후보 `126121`도 그대로 통과한다 | 잘못된 non-empty ID를 탐침 완료처럼 배포해 다른 관광지 데이터를 보여줄 수 있다 | 검사 설명을 “빈 ID 방지”로 정정하고 확정성은 P0 probe 결과와 일치하는지로만 검증한다.

P2 | docs/spec/08_accessibility_legal.md:82 → docs/spec/08_accessibility_legal.md:99 | axe 대상을 “핵심 5개 경로”라고 하지만 바로 아래에 6개 URL을 나열하고 test spec도 5개라고 반복한다 | 검사 루프를 5로 구현하면 어느 페이지가 제외되는지 계약이 없다 | 개수를 6으로 통일하고 URL 목록을 단일 권위로 쓴다.

P2 | docs/spec/13_legal_citations.md:127 → docs/spec/09_test_and_ci.md:181 | `check-contrast` 스크립트는 나열된 foreground/background token pair만 계산하는데 실브라우저 대비율 검사를 대체한다고 쓴다 | `textLarge`가 실제로 large text size인지, 다른 배경에 쓰였는지, overlay/image 위인지는 전혀 못 보므로 사용 위치 오류가 통과한다 | 이 check의 주장을 “정의된 token pair 검사”로 축소하고 실제 page 대비는 axe/수동 검증 범위로 남긴다.

P2 | docs/spec/12_judging_and_demo.md:115 → docs/spec/12_judging_and_demo.md:117 | Vercel 장애는 발표자의 local server/백업 영상만 있고 일반 사용자가 보는 것이 정의되지 않았다 | 호스트가 없으면 앱 내 오류 화면조차 못 뜼므로, “이전 snapshot이 보인다”는 형태의 서비스 failure handling은 존재하지 않는다 | runbook에 “일반 사용자: browser connection error, in-app fallback 없음”을 정직하게 적고 시연 대체와 구분한다.

P1 | docs/spec/08_accessibility_legal.md:127 → docs/spec/08_accessibility_legal.md:138 | 수집 개인정보가 “제보 본문뿐”이라고 한 두 줄 뒤에 UUID와 제보 내용이라고 쓴다 | 처리방침이 스펙의 실제 schema/auth 데이터를 축소 고지해 개인정보 항목을 누락한다 | 129행을 “익명 식별자(UUID)와 제보 내용”으로 정정한다.

P1 | docs/spec/08_accessibility_legal.md:133 → docs/spec/13_legal_citations.md:185 | 08은 필수 기재 11항목을 구현 계약으로 주지만 단일 권위 13은 08에 없는 3개를 포함한 14항목이 최종이라고 한다 | 구현자가 authoritative 08만 따르면 자동수집장치·행태정보·가명정보 항목이 빠진다 | 08의 목록을 13의 최종 목록과 같게 고치거나 08에서 목록을 삭제하고 13만 참조한다.

P1 | docs/spec/13_legal_citations.md:214 → docs/spec/13_legal_citations.md:223 | Supabase UUID session이 미활동 30일 후 “자동” 삭제된다고 하지만 이 설정·job·SQL이 spec에 없다 | `UNVERIFIED`: 실제 Supabase project setting/job 증거 없이 보유기간을 고지하면 처리방침과 실제 삭제가 어긋난다 | 해당 행을 삭제하거나 기존 수집 script에 30일 inactive anonymous user 삭제를 명시하고 project setting 화면/실행 log로 확인한다.

P1 | docs/spec/13_legal_citations.md:216 → docs/spec/08_accessibility_legal.md:179 | 관리자 접근 log를 1년 보관한다고 하지만 schema·audit 기록 메커니즘이 없고 08은 감사 log를 하지 않는다고 명시한다 | 구현하지 않은 안전성 조치와 보유기간을 법적 문서에 약속한다 | 관리자 접근 log 1년 행을 삭제한다.

P1 | docs/spec/08_accessibility_legal.md:198 → docs/spec/13_legal_citations.md:249 | 08은 관광사진 gallery와 Odii를 공공누리 1유형으로 단정하지만 단일 권위 13과 API spec은 manual에 license 서술이 없어 미확인이라고 한다 | 변형·상업 이용 가능을 잘못 단정해 심사의 저작권 책임 항목에 직접 걸린다 | 08의 두 license를 `[미확인]`·변형 금지로 정정하고 portal 이용조건 증거가 생긴 후만 유형을 적는다.

P1 | docs/spec/08_accessibility_legal.md:141 → docs/spec/07_screens.md:467 | privacy는 개인정보가 Supabase Seoul에만 있다고 하지만 S7의 “server-side validation”이 Vercel route/server action인지 Supabase DB function인지 데이터 flow가 없다 | `UNVERIFIED`: UUID·제보 본문이 Vercel을 지나면 “국외 이전 항목은 공개 관광 정보와 request log뿐”이 거짓이 된다 | S7 기존 절에 browser→Supabase 직접 또는 browser→Vercel→Supabase 하나를 확정하고, 후자면 privacy의 국외 이전 항목을 정정한다.

P1 | docs/spec/04_data_model.md:498 → docs/spec/04_data_model.md:505 | `flag_report` SECURITY DEFINER RPC를 anon에게 열어 동일 사용자가 임의 report ID의 count를 무제한 증가시킬 수 있다 | 한 사람이 신고 순서를 조작해 관리자 moderation을 마비시키고 정상 제보를 노출 상단에서 밀어낸다 | 신고 버튼·count·RPC를 삭제하고 기존 관리자 시간순 목록으로 축소한다.

P1 | docs/spec/04_data_model.md:461 → docs/spec/07_screens.md:473 | 24시간 duplicate 방지를 app의 select 후 insert로 바꾸어 concurrent request 두 개가 동시에 검사를 통과할 수 있다 | 완료 기준은 “중복 제보가 거부된다”고 단정하지만 race에서 쉽게 깨진다 | DB에서 check+insert를 한 transaction/function으로 실행하거나 강한 보장 문구를 삭제하고 best-effort로 정정한다.

P2 | docs/spec/13_legal_citations.md:108 → docs/spec/13_legal_citations.md:113 | React가 duplicate `id`를 대부분 막는다는 설명은 거짓이며 React는 중복 ID를 그대로 render한다 | label/aria reference가 다른 element에 연결되어도 자동 방지된다는 잘못된 안심을 준다 | React 설명을 삭제하고 axe·markup 검증으로 unique ID를 확인한다고 고친다.

P1 | docs/plan/02_claims_and_validation.md:43 → docs/spec/13_legal_citations.md:19 | 코드 0줄·geolocation test 불완전·신고 의무 조문 `[미확인]`인데 위치정보법 비대상 주장을 `[확인]`으로 올렸다 | 설계 의도를 실제 구현·법적 결론으로 바꾸어 주장 원장의 status 의미를 깨뜨린다 | 코드 검색·두 geolocation method E2E·법제처 원문 확인 전까지 `[설계확정/법적 결론 UNVERIFIED]`로 낮춘다.

P1 | docs/base/info.pdf:pdftotext-L286 → docs/spec/12_judging_and_demo.md:30 | spec §1은 동일 서비스의 타 부문 중복 출품 금지, 5월 6일 16시까지 제출된 서류만 평가, 허위/결격 시 평가 제외·수상 취소·상금 회수를 누락한다 | 하위 delta는 제출본 불변을 알고도 authoritative 심사 checklist에 없어 완성 서비스만 보면 된다는 잘못된 판정을 유지한다 | §1 자격/일정 표에 세 조항을 그대로 추가하고 제출본 과장은 재제출이 아닌 심사 Q&A 차이로만 관리한다.

P1 | docs/base/proposal.txt:50 → docs/spec/_proposal-delta.md:65 | 제출본의 “10개 service를 4언어 동시 호출 구조” 약속은 실제로 관광지 basic info 4언어·Odii 2언어·나머지 단일언어/비언어 service인데 delta와 plan이 이 문장을 직접 정정하지 않는다 | 10종 활용 표와 “4언어 관광지 정보” 정정만으로는 서면 심사의 “전 10종×4언어” 해석을 반박할 수 없다 | delta의 기존 §3에 “4언어는 Kor/Eng/Jpn/Chs basic info만, Odii는 ko/en, 나머지는 언어 분기 없음” 한 행을 추가한다.

P1 | docs/spec/_proposal-delta.md:53 → docs/spec/11_open_items.md:122 | delta와 roadmap이 “8개 구성유산 중 공주·부여 6개”·“백제역사유적지구 6곳”을 정답처럼 써 놓고 P0-7은 바로 그 개수와 공식 명칭을 미확인으로 둔다 | `UNVERIFIED`: 제안서 해명 기준 문서가 자신의 증거 gate를 우회해 지역특화 사실 오류를 심사장에 재전파한다 | P0-7 전에는 개수·목록을 모두 삭제하고 “공주·부여에 구성유산이 모여 있다”로만 적는다.

P1 | docs/spec/12_judging_and_demo.md:145 → docs/spec/12_judging_and_demo.md:167 | 같은 문서가 P0-7 전에 개수를 말하지 말라고 하면서 roadmap에 공주·부여 6개·전체 8개를 확정형으로 배치한다 | 발표자가 Q&A 주의를 지켜도 발표 roadmap 슬라이드가 미확인 숫자를 먼저 노출한다 | P0-7 확인 전에는 roadmap의 6/8을 삭제하고 지명만 남긴다.

P1 | docs/spec/12_judging_and_demo.md:149 → docs/plan/03_operation_and_growth.md:85 | “`content/pois.json`에 한 줄을 더하면 수집·판정·경로·갭 report가 모두 따라온다”는 authoritative 발표 문구를 plan이 직접 거짓으로 판정한다 | 실제로는 ID·미등록·시설·인증·경로·쉽게 쓴 글을 사람이 추가해야 하므로 발전성 20점 주장이 demo에서 바로 반례된다 | 149행을 plan 03:119-121의 정확한 문장으로 교체한다.

P1 | docs/spec/10_build_order.md:107 → docs/spec/10_build_order.md:160 | 3주차 7일에 auth/RLS/중복·즉시공개/moderation 2화면, 도슨트, 세 export, gap/CSV, easy text까지 8개 work item을 넣고 다음 주 4일 후 freeze하는 계획은 1인이 보안·privacy·E2E까지 완료할 수 없다 | 실제로 report race·RPC abuse·privacy flow가 미정인 상태에서 “반나절”로 붙인 S7/S8이 4주차 접근성·배포 시간을 잠식한다 | cut gate 4·5를 9/21이 아니라 3주차 시작에 적용해 S7/S8·즉시 제보를 삭제하고, 배점 기여가 큰 S3 근거·S10 gap report·KTO 10종·KWCAG 검증을 남긴다.

P2 | docs/spec/05_ingest.md:10 → docs/spec/05_ingest.md:50 | 1인·일 1회 full ingest에 6개 `--only` mode를 두고 사용자가 의존 순서와 후속 accessibility 재실행을 수동으로 기억하게 한다 | 두 번째 writer/parallel job이 없는데도 잘못된 부분 실행으로 derived fact를 `unknown`으로 만드는 collision surface만 생긴다 | `--only` 6개를 삭제하고 full ingest와 `--dry-run`만 남긴다.

P2 | docs/plan/02_claims_and_validation.md:294 → docs/spec/09_test_and_ci.md:87 | plan의 “오늘 고칠 spec 결함” registry가 scanner는 `src/`만 본다·build는 TS를 node로 실행한다·S3은 일부 항목만 보인다 등 이미 수정된 항목 6~13을 현재 defect로 남겨 두었다 | authoritative spec과 복제 registry를 혼자 동기화하다 실패해 이미 해소된 일을 다시 할 위험이 생긴다 | 현행 spec에서 해소된 6~13행을 삭제하고 미해소 defect만 남긴다.

P2 | docs/spec/07_screens.md:102 → docs/spec/07_screens.md:110 | S2 동작이 먼저 “목록/지도 tab”을 요구한 뒤 바로 “이번 범위는 tab을 쓰지 않는다”고 선택한다 | 키보드/ARIA 구조와 E2E selector가 tab 구현 여부에 따라 갈린다 | 106·110행의 tab 안과 대안 (b)를 삭제하고 목록+아래 지도 구조만 남긴다.

P2 | docs/spec/00_README.md:25 → docs/spec/13_legal_citations.md:137 | README의 이전 defect 설명은 large text 기준을 3.5:1이라고 하며 “그게 맞다”고 쓰지만 단일 권위와 check는 3.0:1이다 | 숫자 정확성을 강조하는 문서 첫머리에 스타일 기준 오류가 남아 있다 | 3.5를 3.0으로 정정한다.

P2 | docs/spec/02_stack.md:275 → docs/spec/09_test_and_ci.md:69 | E2E를 CI에 넣지 않는 이유를 `09 §4`로 참조하지만 해당 절은 content validation이고 E2E/CI 판단은 §5·§6에 있다 | 구현자가 잘못된 절에서 운영 경계를 찾게 하는 stale cross-reference다 | 참조를 `09 §5·§6`으로 고친다.

## 요구된 재현 경계

- docs/spec/07_screens.md:178 → docs/spec/07_screens.md:192 | S3 ④는 반올림 전 `A=0.6174`, `100×0.6174×0.91×1.00×0.90=50.56506`, 정수 51로 재현되므로 finding이 아니다.
- docs/spec/05_ingest.md:99 → docs/spec/06_suitability.md:216 | capability catalogue와 persona grade table의 row set은 각각 같은 31개라 mismatch finding이 없다.
- docs/spec/13_legal_citations.md:133 → docs/spec/13_legal_citations.md:146 | 나열된 color pair 비율은 17.40/17.18/7.00/8.16/4.54/5.43 및 badge 4개가 재계산과 일치하지만, 실제 사용 위치를 못 보는 범위 defect는 위 P2와 같다.

## 먼저 고칠 5개

1. docs/spec/05_ingest.md:159–168 `resolveStatus()` — 실제 이용 가능성을 반대로 판정해 안전 피해를 만드므로, 지자체 리포트를 오염시키는 2위보다 먼저다.
2. docs/spec/05_ingest.md:178–193 빈값→`operator_missing` — 제품의 핵심 차별성을 근거 없는 지자체 책임 추론으로 바꾸고 3위의 출처 통계 오류까지 앞에서 주입하므로 더 먼저다.
3. docs/spec/05_ingest.md:208–216 원 KTO fact 폐기 — gap report가 자기 추가 데이터를 원자료 개선 성과로 읽어 핵심 municipal deliverable을 무효화하므로, CI만 막는 4위보다 앞선다.
4. docs/spec/09_test_and_ci.md:84–95 hardcode grep — 스펙대로 쓰면 CI가 항상 실패해 배포를 막고 항상 재현되므로, 참가자 현황에 따라 실격 여부가 결정되는 5위보다 앞선다.
5. docs/spec/12_judging_and_demo.md:30–40 자격 누락 — 조건을 어기면 전체 제외지만 참가자 상태를 확인해야 결함이 현실화되므로, 항상 재현되는 1–4위 후다.
