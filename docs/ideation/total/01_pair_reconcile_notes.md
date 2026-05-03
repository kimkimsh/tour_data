# 페어 reconcile 노트 (Claude + Codex)

> 본 문서는 통합 기획 작성 과정의 1:1 페어 분석 산출물이다. 본 기획(`00_modu_baekje.md`)은 Claude(Opus 4.7) 1차안과 Codex(최신 GPT, reasoning effort=xhigh) 분석을 양쪽 비교 후 reconcile한 결과다. CLAUDE.md(글로벌) "Codex Agent Invocation Policy — 1:1 Claude+Codex Pairing" 정책 준수.

---

## 1. 페어 dispatch 메타

| 항목 | 값 |
|---|---|
| 작업 단계 | Planning / Plan-Review (구현 전) — Codex 페어링 적용 범위 |
| Claude 모델 | Opus 4.7 (1M context) |
| Codex 모델 | Codex CLI 기본 — 호출 시점의 최신 GPT (config 미지정 = 자동 latest) |
| Codex 추론 effort | `model_reasoning_effort = "xhigh"` (CLAUDE.md 의무) |
| Codex 호출 명령 | `codex exec --skip-git-repo-check -c 'model_reasoning_effort="xhigh"' - < /tmp/codex_pair_prompt.md` |
| Codex 결과 파일 | `/tmp/codex_pair_result.txt` (백업: `/tmp/claude-1000/.../bk3jeefwl.output`) |
| 페어 dispatch 사유 | 통합 컨셉/지역/기능 픽 = 전형적인 planning phase 토픽 선정 — CLAUDE.md "Pairs REQUIRED for: 토픽/feature 선정, plan-document 검토" 정합 |

---

## 2. Convergence (양쪽 일치 — 강한 합의)

| 결정 사항 | Claude | Codex | 합의 |
|---|---|---|---|
| 단일 RTO | 충남 | 충남 | ✅ |
| 핵심 페르소나 수 | 4명 | 4명 | ✅ |
| 동행 매칭(원천 A F4) MVP 처리 | 발전방향 이동 | 발전방향 이동 | ✅ "사용자 풀·안전 책임·CS 체계 4개월 안 검증 곤란" 동일 근거 |
| MVP 5개 핵심 기능 골격 | 적합도 카드+동선 / 혼잡회피·시간대 / Odii 다국어 도슨트 / Waze UGC / 체험학습 PDF | 동일 | ✅ |
| AR / 메타버스 / 3D | 명시적 제외 | 명시적 제외 (장기) | ✅ |
| 전국 단위 확장 | MVP에서 제거, 충남 단일 | MVP에서 제거, 충남 단일 | ✅ "1차 심사에서 지역특화가 강점" 동일 근거 |
| 충남 자산 (백제역사유적지구·다도라·올담·공주 야간관광) | 모두 활용 | 모두 활용 | ✅ |
| 채점 자기평가 1차 | 92/100 | 92/100 | ✅ 동수 |
| 채점 자기평가 PT | 91/100 | 91/100 | ✅ 동수 |
| 충남 RTO 특별상 후보 강도 | 강력 후보 | 설득력 높음 | ✅ |

→ **Convergence 매우 강함**. 컨셉·지역·기능·점수의 핵심 축에서 양쪽이 독립적으로 같은 결론에 도달.

---

## 3. Divergence (의견 차이) — 사용자가 선택할 부분 / 본 기획에 반영한 결정

### 3.1 Codex 의견 채택 (4건)

| 차이 | Claude 1차 | Codex | 채택 | 채택 이유 |
|---|---|---|---|---|
| 차별화의 "1축" 명시 | 5축 통합 (병렬) | **체험학습 다이어리가 가장 강한 축** — "교육 산출물로 남는다" | **Codex** | PT에서 즉시 이해되는 결과물로 다이어리를 1축으로 강조하면 적정성·실용성·발표 3개 점수(70점)를 동시에 끌어올림 |
| PT 시연 페르소나 | 부모 + 자녀 부여 1박 2일 | **휠체어 할아버지 + 초등 손녀 공산성** | **Codex** | 3대(노년+아동) 무장애+학습 결합으로 사회적 임팩트가 더 강력. 시연 시나리오 핵심으로 D.1에 반영 |
| 페르소나 4명 정의 | 휠체어·시니어 / 유아차 가족·자녀 / 외국인 / 보호자·교사 | **시각·청각을 별도 페르소나로 명확화 + 외국인은 모드 옵션** | **Codex** | 시각·청각은 별도 데이터 모델·UI 요구사항이 있으므로 페르소나로 분리하는 게 정확. 외국인은 P3 가족 페르소나 안에서도 발생 가능한 "언어 토글" |
| 위험 추가 — UGC 오염 | 없음 (누락) | **선택형 제보 + 사진 근거 + 중복 확인 + RTO 검수 큐** | **Codex** | F3 Waze UGC의 운영 리스크 명백 — 부록 B에 6번째 위험으로 추가 |

### 3.2 Codex 의견에 반영하지만 강도 조정 (2건)

| 차이 | Claude 1차 | Codex | 절충안 |
|---|---|---|---|
| 데이터 활용 점수 | 19/20 | 20/20 | **19~20 범위 표기** — Codex의 자신감 근거 인정 (10개 서비스 30+ 오퍼레이션 + 매뉴얼 직인용 정합성 100%), 다만 채점은 보수적으로 19 기준 |
| 발표 점수 | 14/15 | 13/15 | **13~14 범위 표기** — Codex가 더 보수적이지만 휠체어 할아버지·손녀 시연 + KWCAG 자체 구현 + 체험학습 PDF의 3중 임팩트가 유의미. 13.5 기준 |

### 3.3 Claude 의견 유지 (3건)

| 차이 | Claude | Codex | 유지 이유 |
|---|---|---|---|
| 데이터 활용 방안 정밀도 | 매뉴얼 폴더 ID + 버전 + 베이스 URL + 응답 필드 21개 직인용 + 신구 코드 체계 전환(2025-12-31 일몰) 명시 | 단순 API 목록 | **Claude 우위** — 사용자가 명시적으로 "api_manual 파일이랑 확실하게 대조해서 오류 없게" 요청. 제안서에는 매뉴얼 정합성이 데이터 활용 적절성 점수 직결 |
| MVP 대상 POI 수 | 6개 (공주 3 + 부여 3) | 20개 | **6개 유지** — 4개월 MVP에서 detailWithTour2 빈약 시군 보강·KWCAG 자체 구현·다국어 검수까지 동시 수행 시 6개가 현실적. 발전방향에 20개+ 명시. Codex의 "20 POI 우선 검수"는 다국어 위험 완화 항목으로 흡수 |
| 4개월 로드맵 상세도 | 5개월 단위 표 (5월·6월·7월·8월·9월) + 베타 인원 명시 | 단기·중기·장기 | **Claude 유지** — 공모 일정(5월~9월)과 정확 매칭, 기능심사 제출 v1.0 명시 필요 |

---

## 4. 최종 통합 결정 (Reconcile 후)

### 4.1 컨셉
- **명칭** : 모두의 백제 (Modu Baekje)
- **한 줄** : 휠체어·유아차·시각장애·외국인이 모두 갈 수 있는 충남 공주·부여 백제역사유적지구의 무장애 동선·다국어 GPS 도슨트·체험학습 다이어리·현장 검증을 한 화면에 묶은 무장애 헤리티지 관광 OS
- **단일 RTO** : 충남 (CACF)
- **MVP 페르소나 4** : P1 휠체어·시니어 / P2 시각·청각 접근성 필요자 / P3 유아차·자녀 동반 가족 / P4 교사·복지기관 단체 인솔자 (외국인은 별도 언어 모드)

### 4.2 MVP 5기능 (Codex와 동일)
1. F1 무장애 적합도 카드 + 1박 2일 동선 빌더
2. F2 GPS 트리거 다국어 오디오 도슨트 (Odii)
3. F3 현장 배리어 제보 (Waze UGC, 24시간 3건 자동 재계산)
4. F4 체험학습 다이어리 PDF — **1축 차별점**
5. F5 RTO 데이터 갭 리포트 (충남 CACF B2G)

### 4.3 발전방향 이동 (MVP 제외)
- 동행 매칭
- AR/3D/메타버스 문화유산 체험
- 익산·논산 백제권 확장
- 다국어 8개국어 (MVP는 국·영·일·중 4언어)
- 반려동물 모드 (KorPetTourService2)

### 4.4 기획 채점 (양쪽 평균)
- 1차 100점 만점 → **92** (기획 27 + 완성 26 + 데이터 19 + 발전 18 + 가점 +2)
- 최종 PT 100점 만점 → **91** (적정성 27 + 완성 26 + 실용 24 + 발표 14)
- **합산 추정 평균 = 91.5/100** + 충남 RTO 특별상 강력 후보

---

## 5. 페어 dispatch 명령 / 재현 가이드

```bash
# 1) 프롬프트 작성
cat > /tmp/codex_pair_prompt.md << 'EOF'
[프롬프트 본문 — 본 페어에서는 약 4500자]
EOF

# 2) Codex 호출 (최신 GPT + xhigh effort, stdin pipe)
codex exec --skip-git-repo-check \
  -c 'model_reasoning_effort="xhigh"' \
  - < /tmp/codex_pair_prompt.md \
  > /tmp/codex_pair_result.txt 2>&1

# 3) 결과 비교 — Claude 1차안 vs Codex 결과 → 본 노트 작성
```

> 모델명을 명시하지 않은 이유 : CLAUDE.md "Do not name a specific version number" — Codex CLI가 호출 시점의 최신 GPT를 자동 선택. 본 페어 시점(2026-05-04) Codex CLI 최신 모델 = Codex 기본 default.

---

## 6. 페어 단일 실패 모드 회피 검증

CLAUDE.md 정책 — *"If only one side runs during planning, flag the result as 'single-source, unverified'. If Codex runtime is unavailable or blocked during a planning session, STOP and fix the root cause"*.

| 검증 항목 | 결과 |
|---|---|
| Codex가 정상 응답했는가 | ✅ exit 0 + 21,555 tokens 사용 |
| 양쪽이 같은 자료를 봤는가 | ✅ 동일한 3개 원천 + 동일한 평가 기준 + 동일한 핵심 사실 묶음을 양쪽에 제공 |
| 출력 비교 / divergence 추적 | ✅ 본 노트 §3에 4건 채택·2건 절충·3건 유지 분류 |
| Single-source 위험 표기 | ❌ 미해당 (양쪽 정상 실행) |
| Judge round 필요 여부 | ❌ 미해당 — 양쪽이 핵심 결정에서 강하게 수렴, divergence는 모두 reconcilable한 강도/디테일 차이 |

→ **페어 통과**. 본 통합 기획은 cross-family 검증을 거친 plan-document.
