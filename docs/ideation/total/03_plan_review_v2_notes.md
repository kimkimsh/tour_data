# 2회차 plan-review 페어 reconcile (Claude + Codex + subagent A + subagent B)

> 본 문서는 통합 기획안 `00_modu_baekje.md` v2 갱신의 4축 분석 reconcile 노트다. 사용자가 (1) api_manual 정합성 (2) 외부 API 보강 (3) 수정점 식별 (4) 에이전트팀 활용을 명시 요청하여, **subagent A (매뉴얼 정합성) + subagent B (외부 API) + Codex pair 2회차 (큰그림 비평) + Claude (메인 reconcile)** 4축 병렬 분석을 수행했다.

---

## 1. 4축 dispatch 메타

| 축 | 모델 / 에이전트 | 결과 위치 |
|---|---|---|
| Claude (메인) | Opus 4.7 (1M context) | 본 문서 + 메인 기획 v2 직접 편집 |
| Subagent A (매뉴얼 정합성) | general-purpose | task `accd7d8453b69e417` 결과 |
| Subagent B (외부 API 보강) | general-purpose | task `a15150c18c4c87eb0` 결과 |
| Codex pair 2회차 (큰그림 비평) | Codex CLI (gpt-5.5, reasoning effort=xhigh) | `04_codex_raw_output_v2.md` |

| 정책 근거 | CLAUDE.md |
|---|---|
| Codex 페어 의무 | "Pairs REQUIRED for: plan-document review rounds, pre-implementation red-team exercises on the plan" — 본 작업은 plan-review |
| Subagent vs teammate | "Multi-role review/planning that fits one turn → subagent" — teammate signal(persistent state, live visibility, >5min spawn) 미해당 |
| Codex 모델 | "highest available GPT model" — Codex CLI default = gpt-5.5 |
| Codex 추론 | `model_reasoning_effort = "xhigh"` |

---

## 2. Convergence (4축 강한 합의)

| 결정 사항 | Claude | Subagent A | Subagent B | Codex | 합의 |
|---|---|---|---|---|---|
| 매뉴얼 폴더 ID 10개 매핑 정확 | OK | OK | (out of scope) | OK | ✅ |
| detailWithTour2 21필드 직인용 정확 | OK | OK 100% | (out of scope) | (out of scope) | ✅ |
| KorWithService2 contentTypeId 6종 (음식점·여행코스 제외) | OK | OK | (out of scope) | (out of scope) | ✅ |
| 외부 API 보강 필요 | 동의 | (out of scope) | 14종 추천 | TOP 5 추천 | ✅ |
| **국가유산청 OpenAPI 추가 필수** | (검토 중) | (out of scope) | 필수 | TOP 3 | ✅ |
| **충남 시군 OpenAPI / 충남 올담** | (보조만 명시) | (out of scope) | 필수 | TOP 2 | ✅ |
| **응급의료/AED 안전 결합** | (미검토) | (out of scope) | 권장 | TOP 5 | ✅ Codex+B 합의 |
| **F3 자동 재계산 위험** | (1차 페어에서 미식별) | (out of scope) | (out of scope) | TOP 4 약점 | ✅ Codex 단독 발견 → Claude 채택 |
| **F4 PDF 일반화 위험** | (미식별) | (out of scope) | (간접 언급) | TOP 5 약점 | ✅ Codex 단독 발견 → Claude 채택 |

→ **subagent B + Codex가 외부 API 추가 필요성에서 강하게 합의**, F3/F4 위험은 Codex가 단독 식별하여 reconcile 시 채택.

---

## 3. Divergence (의견 차이) — 메인 기획 v2 반영 결정

### 3.1 Subagent A 발견 — 사실 오류 1건 (즉시 정정)

| 항목 | 발견 | v2 반영 |
|---|---|---|
| § 3.2-(2) 음식점 39 `chkbabycarriage` | **FAIL** — `chkbabycarriage`는 12(관광지) 전용, 39(음식점)에는 `kidsfacility`만 존재 | ✅ 정정 — "관광지 12 `chkbabycarriage` / 음식점 39 `kidsfacility`"로 분리 표기 |
| 위치정보법 제9조 | "제9조의2(위치기반서비스 신고)"가 정확 | ✅ F3 + 부록 D.4에서 "제9조의2"로 정정 |
| lDongSignguCd 공주=150·부여=760 | 표준 행정코드와 정리본 규칙으로는 OK, 부속 xlsx 직접 미확인 | ✅ 부록 B 위험 12번에 "5월 OT 단계 xlsx 1회 검증" 명시 |
| TatsCnctr signguCd 부여=34800 | 부속 xlsx 미확인 | ✅ 부록 B 위험 12번에 함께 표기 |

### 3.2 Subagent B 14종 외부 데이터 후보 — 메인 기획 § 3.3 14종 표로 반영

| 채택한 외부 데이터 | v2 § 3.3 결합 위치 |
|---|---|
| 공주시·부여군 OpenAPI | 충남 시군 — F1 시 직영 보강 |
| 국가유산청 OpenAPI / 헤리티지 | 헤리티지 — F2 어른 모드 + F4 PDF 공식 해설 |
| BF 인증정보 + 장애인편의시설 현황 | 무장애 인증 — F1 가점 + F5 갭 리포트 (Codex web 검증 URL) |
| KTO 열린관광지 / KQ 인증 | 무장애 인증 — F1 가산점 |
| 전국 공중화장실 표준 | 무장애 인증 — F1 길거리 화장실 좌표 |
| e뮤지엄 (KCISA) | 헤리티지 — F2 어린이 학습 |
| 충남교육청 체험학습 양식 | 교육 — F4 PDF 학교 양식 정합 |
| 문화공공데이터광장 다국어 시설 | 교육 — F2 다국어 교차검증 |
| 도로명주소 API + VWorld | 공간·주소 — F1 좌표·경사도 |
| 기상청 특보 (`getWthrWrnList`) | 기상·안전 — F1 폭염·우천 (이미 일부 포함, API 명시 격상) |
| 에어코리아 + 안전디딤돌 | 기상·안전 — F1 미세먼지 + 다국어 재난 알림 |
| 응급의료기관 + AED | 기상·안전 — F1 응급 버튼 (Codex web 검증 URL) |
| 영사콜센터 + Papago/DeepL | 외국인 — F2 외국인 모드 |
| KOSIS 등록장애인 통계 | 통계 보조 — 1.1 기획배경 |
| 충남역사박물관 디지털 아카이브 | 헤리티지 — F2 어른 모드 보강 |

→ **외부 데이터 6종 → 14종 (9축 분류)**, KTO/비KTO 역할 분담표 신설.

### 3.3 Codex 7개 수정 권고 — 메인 기획 v2 반영 매트릭스

| Codex 수정 권고 | v2 반영 위치 | 변경 강도 |
|---|---|---|
| 1. "매뉴얼 정합성 100%" → 검증표(완료/검증중/운영확인필요) | § 3.1 표 우측에 검증 상태 별도 추가는 분량 부담으로 보류, 부록 B 위험 12번에 "lDongSignguCd / TatsCnctr signguCd 부속 xlsx 운영 직전 1회 확인" 명시 | 부분 채택 |
| 2. KTO vs 비KTO 역할 분담표 추가 | § 3.3 도입부에 "KTO/비KTO 역할 분담" 박스 명시 | ✅ 채택 |
| 3. F3 자동 재계산 → 검수 큐로 강도 조정 | F3 본문 전체 재작성, 부록 B 위험 5번 추가 | ✅ 채택 |
| 4. 외국인 P5로 분리 또는 표현 낮춤 | 메타 표 + F1 입력 + 부록 B 위험 4번 — "횡단 모드"로 명시, 보조 시연 D.2 강화 | ✅ 채택 |
| 5. F4 PDF에 국가유산청 해설 + 교사용 루브릭 | F4 본문 4축 결합 + 5축 차별성, § 2.3 교육 산출물 한 줄 강조 | ✅ 채택 |
| 6. F1 진입점 음성 검색 추가 | F1 입력 마지막 줄에 음성 검색 진입점 명시, 부록 D.1 첫 컷 시연으로 활용 | ✅ 채택 |
| 7. 점수표 "현재/보강 후" 2열 | 부록 C.1 / C.2 모두 2열로 재작성 | ✅ 채택 |

### 3.4 Codex 단독 발견 — "한국 0" 표현 약화

Codex 비평 — "한국 0 주장은 근거 없으면 감점". § 2.3 본문을 **"체험학습 PDF·헤리티지 메타데이터·다국어 GPS 도슨트·관리자 검수 UGC가 모두 부재 (KTO 「모두의 여행」·Wheelmap·Wheelmate 공식 사이트 검증 기준)"** 로 구체화. 부록 D.4 예상 질의에도 동일 구체화 답변 준비.

### 3.5 Codex가 web search로 직접 검증한 외부 API URL

Codex pair 2회차에서 web search 도구를 사용해 다음 URL이 실제 존재함을 검증 — 부록 E.2 표에 그대로 인용:
- `data.go.kr/data/15092317/openapi.do` (장애인편의시설 현황)
- `data.go.kr/data/3051093/fileData.do?recommendDataYn=Y` (BF 인증정보)
- `data.go.kr/data/15034324/openapi.do` (국가유산청 지정문화재 현황)
- `data.go.kr/dataset/15000563/openapi.do` (응급의료기관 정보)
- `data.go.kr/data/15147982/openapi.do` (AED 데이터)
- `culture.go.kr/data/openapi/openapiInfo.do` (문화공공데이터광장)
- `alldam.chungnam.go.kr/index.chungnam?menuCd=DOM_000000201001003000` (충남 올담 OpenAPI)

→ Claude의 search 폴더 정리본(31번)이 정리한 일반 카테고리를 Codex가 **공모전 기간 실제 사용 가능 여부까지** 검증한 가치.

---

## 4. v2 채점 추정 변화

### 4.1 1차 100점 (현재 → 보강 후)

| 항목 | 1회차 페어 (v1) | v2 현재 (Codex 비평 반영) | v2 보강 후 (외부 API 14종 결합) |
|---|:--:|:--:|:--:|
| 기획력 | 27 | 27 | **28** (+1) |
| 완성도 | 26 | **25** (Codex 비평으로 -1, F3 자동 재계산이면) | **26** (검수 큐로 회복) |
| 데이터 활용 | 19~20 | **19** | **20 (만점)** (비KTO 데이터가 F1·F4·F5 결합) |
| 발전성 | 18 | 18 | **19** (+1) |
| 가점 | +2 | +2 | +2 |
| **합계** | **92** | **91** | **95** |

### 4.2 최종 PT 100점

| 항목 | 1회차 페어 (v1) | v2 현재 | v2 보강 후 |
|---|:--:|:--:|:--:|
| 적정성 | 27~28 | 27 | **29** (+2 — KOSIS 등록장애인 통계 + 충남교육청 양식 정합) |
| 완성도 | 26 | **25** | **26** |
| 실용성 | 24 | **23** | **24** (+1 — F4 + 교사 루브릭 = P4 B2B 가치 명확) |
| 발표 | 13~14 | **13** | **14** (외국인 보조 + 응급 결합 시연) |
| **합계** | **91** | **88** | **93** |

→ 보강 전후 격차 **+5점 (PT)**. 외부 데이터 통합 진척도가 PT 점수의 결정타.

---

## 5. v2 페어 통과 검증

| 검증 항목 | 결과 |
|---|---|
| 4축 모두 정상 응답 | ✅ Codex (exit 0 + 229,993 tokens) + subagent A (143,820ms 완료) + subagent B (149,785ms 완료) + Claude 본 turn |
| 같은 자료 공유 | ✅ 메인 기획 + search 폴더 + api_manual 폴더 동일 컨텍스트 제공 |
| 출력 비교 / divergence 추적 | ✅ 본 문서 §3 (4가지 카테고리로 분류) |
| Codex web search 도구 활용 | ✅ Codex가 BF 인증·국가유산청·응급의료·AED·문화공공데이터광장 URL 모두 실제 검증 |
| Single-source 위험 | ❌ 미해당 |
| Judge round 필요성 | ❌ 미해당 — 양쪽이 같은 결정에 강하게 수렴 |

→ **2회차 plan-review 페어 통과**. 메인 기획 v2는 cross-family 검증을 거친 plan-document.

---

## 6. v2 미반영 / 보류 사항 (사용자 결정 대기)

| 사항 | 보류 이유 |
|---|---|
| § 3.1 KTO API 표에 검증 상태 컬럼 추가 | 분량 부담 — 부록 B 위험 12번에 "운영 직전 1회 확인 권장"으로 갈음 |
| F1 음성 검색의 STT 엔진 선택 (KTO Odii STT? 자체 구현? Whisper?) | 4개월 MVP 구현 단계에서 결정 — 기획 단계 명시 불필요 |
| 충남교육청 체험학습 양식 직접 매칭 검증 | 5월 OT 단계 충남교육청 협력 채널 가동 후 검증 |
| 동행 매칭 부활 시점 | 발전방향 장기 (사용자 풀 + 안전 책임 검증 후) |

---

## 7. v2 다음 단계 제안

1. **5월 OT (5월 6일 16:00 마감 후)** — 충남 CACF + 충남교육청 + 한국장애인관광협회 협력 채널 가동
2. **5월 중** — `1725501618773/한국관광공사_개방데이터_관광지_시군구_코드정보_v1.0.xlsx` 직접 파싱 → 공주·부여 시군구코드 1회 검증
3. **6월 중** — 위치기반서비스 신고 (위치정보법 제9조의2, 방통위) 완료
4. **5월 OT** — KWCAG 2.2 핵심 4축 (명도 4.5:1·44pt 터치·키보드·스크린리더) 디자인 시스템 우선 확정 + axe-core CI 구축
5. **5월 OT** — 외부 API 키 발급 일괄 신청 (BF / 응급 / AED / 국가유산청 / 충남 올담 / 문화공공데이터광장 / 기상청 특보)
