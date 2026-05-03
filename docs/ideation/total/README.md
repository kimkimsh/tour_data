# total/ — 베리어프리 통합 간이 기획

3개 에이전트가 각각 제출한 베리어프리 관련 Top 안 (`claude_top_3/02_modong.md`, `codex_top_3/03_barrier_free_baekje_diary.md`, `gemini_top_3/01_barrier_free_navigator.md`)을 통합하여 단일 컨셉으로 정리한 결과물이다. **2회차 plan-review 페어**(Claude+Codex+subagent A 매뉴얼 정합성+subagent B 외부 API)를 거쳐 v2로 갱신됨.

## 파일 구성

| 파일 | 내용 |
|---|---|
| **`00_modu_baekje.md`** | **메인 통합 간이 기획 v2** — format.txt 4대주제(기획배경/필요성·서비스개요·데이터 활용·발전방향) 모두 작성. 부록에 4개월 MVP 로드맵·위험 완화·채점 자기평가·PT 시연 시나리오 포함. 외부 데이터 14종(9축) + KTO/비KTO 역할 분담표 + "현재/보강 후" 점수 2열 |
| `01_pair_reconcile_notes.md` | **1회차 페어** — Claude(Opus 4.7) + Codex(xhigh) 1:1 페어 reconcile (통합 컨셉 결정) |
| `02_codex_raw_output.md` | 1회차 Codex 원본 |
| `03_plan_review_v2_notes.md` | **2회차 plan-review** — Claude + Codex + subagent A (매뉴얼 정합성 1:1 검증) + subagent B (외부 API 14종 추천) 4축 reconcile |
| `04_codex_raw_output_v2.md` | 2회차 Codex 핵심 응답 (web search로 외부 API URL 직접 검증) |
| `04_codex_raw_output_v2_full.txt` | 2회차 Codex 전체 transcript (1709줄, raw) |
| `README.md` | 본 파일 |

## 통합 컨셉 한 줄

> **모두의 백제 (Modu Baekje)** — 휠체어·유아차·시각장애·외국인이 모두 갈 수 있는 **충남 공주·부여 백제역사유적지구**의 무장애 동선·다국어 GPS 도슨트·체험학습 다이어리·현장 검증을 한 화면에 묶은 **무장애 헤리티지 관광 OS**

## v2 통합 결과 요약

| 축 | v1 결정 | v2 보강 |
|---|---|---|
| 단일 RTO (지역특화 가점 +2) | 충남 (CACF) | 동일 — 백제역사유적지구(유네스코) + 공주 야간관광 특화도시 + 다도라 + 올담 |
| MVP 페르소나 | 4명 | 4명 + **외국인 4언어 횡단 모드** (P2 시각·청각은 내부 P2a/P2b 분리) |
| MVP 핵심 기능 | 5개 | 5개 + **F1 음성 검색 진입점**, F3 자동 재계산 → **관리자 검수 큐**, F4에 **국가유산청 해설 + 교사 루브릭** 결합 |
| KTO OpenAPI 활용 | 10개 서비스 30+ 오퍼레이션 | 동일 (매뉴얼 정합성 95% OK, 1건 minor 정정: § 3.2-(2) `chkbabycarriage`→`kidsfacility`) |
| **외부 데이터** | **6종** | **14종 9축** (BF 인증·장애인편의시설·국가유산청 OpenAPI·KQ·열린관광지·공중화장실 표준·응급의료/AED·문화공공데이터광장·충남교육청·KOSIS 등록장애인 통계 등) — Codex web search로 URL 검증 |
| KTO/비KTO 역할 분담표 | 없음 | **§ 3.3에 신설** (KTO=관광 POI / 외부=접근성·교육·안전·RTO 근거) |
| 추정 채점 | 1차 92 + PT 91 (1회차 합의) | **현재 1차 91 + PT 88 / 보강 후 1차 95 + PT 93** (2열 표기) |
| 위험 항목 | 6개 | **12개** (F3 자동재계산·F4 일반화·외국인 토글·xlsx 미확인 추가) |

## 작업 방법

본 통합은 CLAUDE.md "Codex Agent Invocation Policy — 1:1 Claude+Codex Pairing for planning" + "Subagent vs Teammate Mode" 정책에 따라 2회차 진행:

**1회차 (통합 컨셉 결정)** :
1. Claude Opus 4.7가 3개 원천 + 공모 요강 + KTO 매뉴얼 읽고 1차안 작성
2. Codex (xhigh)가 동시에 독립 분석
3. 양쪽 reconcile (4건 Codex 채택, 2건 절충, 3건 Claude 유지)

**2회차 (plan-review v2)** :
1. Subagent A (general-purpose) — KTO 매뉴얼 1:1 정합성 검증 (95% OK, 1건 minor 정정)
2. Subagent B (general-purpose) — 외부 API/데이터 보강 14종 추천 (9축 분류)
3. Codex pair (xhigh + web search) — 큰그림 비평 + 7개 수정 권고 + URL 직접 검증
4. Claude 본 turn — 4축 reconcile + 메인 기획 v2 갱신

## 다음 단계 (제안)

- **5월 6일 16:00 제출 마감** — 5페이지 이내 PDF 제안서로 압축 (info.pdf p.10 양식)
- **5월 OT 단계** :
  - 충남문화관광재단(CACF) + 충남교육청 + 한국장애인관광협회 협력 채널 가동
  - 외부 API 키 일괄 발급 신청 (BF 인증 / 응급의료 / AED / 국가유산청 / 충남 올담 / 문화공공데이터광장 / 기상청 특보)
  - `1725501618773/...관광지_시군구_코드정보_v1.0.xlsx` 직접 파싱하여 공주=44150·부여=44760·TatsCnctr signguCd 부여=34800 1회 검증
  - KWCAG 2.2 핵심 4축 (명도 4.5:1·44pt 터치·키보드·스크린리더) 디자인 시스템 우선 확정 + axe-core CI 구축
- **6월 중** — 위치정보법 **제9조의2** (위치기반서비스 신고) — 방통위 신고 완료
