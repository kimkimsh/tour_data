# total/ — 베리어프리 통합 간이 기획

3개 에이전트가 각각 제출한 베리어프리 관련 Top 안 (`claude_top_3/02_modong.md`, `codex_top_3/03_barrier_free_baekje_diary.md`, `gemini_top_3/01_barrier_free_navigator.md`)을 통합하여 단일 컨셉으로 정리한 결과물이다.

## 통합 컨셉 한 줄

> **모두의 백제 (Modu Baekje)** — 충남 공주·부여 백제역사유적지구를 **장애 유형과 시간 예산에 맞춰** 동선·도슨트·다이어리·현장 검증으로 연결하는 **무장애 헤리티지 관광 OS**.

## 파일 구성

### 메인 기획 (제출 대상)

| 파일 | 내용 |
|---|---|
| **`00_modu_baekje.md`** | **메인 통합 간이 기획** — format.txt 4대주제 모두 작성 + 부록 5개 (로드맵·위험·채점·시연·출처) |
| `README.md` | 본 파일 |

### 페어 분석 이력 (검증 증빙)

본 통합은 CLAUDE.md "Codex Agent Invocation Policy — 1:1 Claude+Codex Pairing" + "Subagent vs Teammate Mode" 정책에 따라 **4회차 페어 분석**을 거쳤다. 각 회차 산출물은 별도 보관:

| 회차 | reconcile 노트 | Codex 원본 | 주제 |
|---|---|---|---|
| 1 | `01_pair_reconcile_notes.md` | `02_codex_raw_output.md` | 통합 컨셉 결정 (Claude+Codex 1:1) |
| 2 | `03_plan_review_v2_notes.md` | `04_codex_raw_output_v2.md` (+full transcript) | plan-review — 매뉴얼 정합성 + 외부 API 14종 |
| 3 | `05_v3_reconcile_notes.md` | `06_codex_v3_raw_output.md` | 배리어프리 깊이 + 기간 포괄 |
| 4 | `07_v3_1_reconcile_notes.md` | `08_codex_v3_1_raw_output.md` | F1.B 대체·F1.C 축소·F1.F 신규 |

## 핵심 결정 요약

| 축 | 결정 |
|---|---|
| 단일 RTO (지역특화 가점 +2) | **충남 (CACF)** — 백제역사유적지구(유네스코) + 공주 야간관광 특화도시 + 다도라 + 올담 |
| MVP 페르소나 | 4명 + 외국인 횡단 모드 (P1 휠체어·시니어 / P2 시각·청각 / P3 가족·자녀(인지·발달 옵션 흡수) / P4 단체 인솔자) — P5 페르소나 신설 X |
| MVP 핵심 기능 | 5개 — F1 무장애 토털 가이드 OS (6 sub-feature: A~F) / F2 Odii 다국어 4채널 도슨트 / F3 Waze UGC 검수 큐 / F4 다중 출력 다이어리 (6 채널) / F5 RTO 갭 리포트 |
| F1 6 sub-feature | A POI 무장애 상세 카드 / B 상세 베리어프리 경로 안내(사전 준비) / C SOS·보조기기·콜택시 + AAC / D 시간 예산 6단 + 적합도 산식 4 Layer / E 후기 분리·GPX 환류 / **F 예측 가능 백제** (발달·인지 친화) |
| 시간 예산 모드 | 반나절·당일·1박 2일·2박 3일 (MVP 4단계) / 다회차·시즌 패스·1년 학년 패스 (발전방향) |
| 발전방향 | 동행 매칭 / AR·3D / 익산·논산 / 다국어 8개국어 / 반려동물 / 시즌 패스·시민 패스 / 자동 코스 재계산 / KWCAG 정식 인증 / 12권역 헤리티지 패스포트 |
| KTO API | 10개 서비스 30+ 오퍼레이션 — KorWithService2·KorService2·EngService2·JpnService2·ChsService2·Odii·TatsCnctrRate·DataLabService·TarRlteTarService1·PhotoGalleryService1 |
| 외부 데이터 | **12축 24종** — 충남 RTO·시군 / 무장애 인증(BF·열린관광지·KQ) / 헤리티지(국가유산청) / 교육(충남교육청·문화공공) / 공간·주소(카카오·VWorld) / 기상·안전(기상청·응급의료/AED) / 외국인(1330·영사콜센터) / 통계(KOSIS) / 보조기기·교통(콜택시·KODDI) / 점자·수어(점자도서관·국립국어원·다누림) / STT·픽토그램(Clova·KS) / 발달·인지(KODDI·국립특수교육원·AAC) |
| 추정 채점 | 1차 **98/100** + 최종 PT **95~96/100** + 충남 RTO 특별상 강력 후보 + 대상(문체부 장관상) 후보 경쟁권 |

## 다음 단계 (제안)

- **5월 6일 16:00 제출 마감** — 5페이지 이내 PDF 제안서로 압축 (info.pdf p.10 양식). F1 6 sub-feature는 카드 1개로 시각화 (A~F)
- **5월 OT** :
  - 협력 채널 가동 — 충남 CACF + 충남교육청 + 한국장애인관광협회 + 서울관광재단 다누림 + 한국장애인개발원 + 국립특수교육원
  - 외부 API 키 일괄 발급 (BF / 응급 / AED / 국가유산청 / 충남 올담 / 문화공공데이터광장 / 기상청 특보)
  - F1.F 백제 마스코트 일러스트 6컷 외주 발주
  - AAC 학회·KS·정부24·보건복지부 사회보장 픽토그램 통합 큐레이션
  - `1725501618773/...관광지_시군구_코드정보_v1.0.xlsx` 직접 파싱 검증
  - KWCAG 2.2 핵심 4축 자체점검 디자인 시스템 + axe-core CI 구축
- **6월 중** — 위치정보법 **제9조의2** (위치기반서비스 신고) 방통위 신고
- **9월 시연 영상** — D.1 반나절→1박 2일 전환 + D.5 자폐 자녀 + D.6 발달장애 단체 30명 (분량 관리)
- **출시 후 3개월 (예상 12월)** — 한국정보접근성인증평가원(WA, `wa.or.kr`) 또는 한국디지털접근성진흥원(KWACC, `kwacc.or.kr`) 정식 인증 신청
