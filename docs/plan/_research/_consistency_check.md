# Blueprint Consistency Check — `SPEC.md` vs `01`–`15`

> **목적:** 15개 확장 문서가 frozen `SPEC.md`와 충돌하는 지점(CONTRADICTION)과, SPEC이 명시했으나 어떤 문서도 다루지 않은 항목(GAP)을 기록한다. **문서를 고치지 않는다 — 보고만 한다.** 권위 원천은 항상 SPEC. 점검일: 2026-06-14.
> 점검 범위: `SPEC.md` 전문 + `00_README.md` + `01`–`15` 헤더/핵심 절 + 결정 로그(`15 §3`) + 워크스트림 계약(`12`) + 페어링(`_pairing_reconcile.md`).

---

## A. CONTRADICTIONS (SPEC 또는 문서 간 상충 — 해소 필요)

### C-1 — 중문 로케일 코드 분열: `zh-CN` vs `zh-Hans` (load-bearing)

같은 "중국어 간체" 로케일이 두 가지 비호환 코드로 표기되어, 라우팅 파라미터와 DB CHECK 제약·도슨트 enum이 서로 맞물리지 않는다.

| 표기 | 위치 |
|---|---|
| **`zh-CN`** | `SPEC.md` §6 (Odii `langCode(ko/en/ja/zh-CN)`) · §8 F2 (`× ko/en/ja/zh-CN`) · `06_feature_F2_docent.md` 다수 (§0, §1.2 채널 행렬, `docent_stories`/`docent_assets`의 `locale ... CHECK (locale IN ('ko','en','ja','zh-CN'))` L56·L76, `LocaleSchema = z.enum([...,'zh-CN'])` L561, `langCode` 타입 L149) · `12_workstreams_sequencing.md` F2 행 (L111) |
| **`zh-Hans`** | `01_overview_goals_scope.md` (§3.3 F2 행 L129, 외국인 4언어 L133, 발전방향 L153, AC-08 L308) · `02_architecture.md` (`app/[locale]` next-intl 라우팅 `ko/en/ja/zh-Hans` L92, i18n 스택 표 L507) |

**충돌의 실질:** `02_architecture.md`의 next-intl `[locale]` 라우트 세그먼트는 `zh-Hans`인데, `06_feature_F2_docent.md`의 `docent_stories.locale`/`docent_assets.locale` DB CHECK 및 Zod enum은 `zh-CN`이다. 같은 사용자 세션에서 라우트 locale(`zh-Hans`)로 도슨트 read-model을 조회하면 DB 저장 locale(`zh-CN`)과 문자열 불일치로 **빈 결과**가 난다. SPEC 자체는 §6/§8에서 `zh-CN`만 사용하므로 **SPEC 기준으로는 `zh-Hans`를 쓰는 `01`·`02`가 SPEC과 충돌**한다. 하나로 통일 필요(SPEC을 따른다면 `zh-CN`).

### C-2 — `01_overview_goals_scope.md` 부록 B의 문서 인덱스가 실제 파일명과 불일치 (stale numbering)

`01_overview_goals_scope.md` 부록 B(L388–403, "관련 문서 인덱스")와 §6.3(L324)이 **실제로 존재하지 않는 이전 번호 체계**의 파일명을 가리킨다.

| 부록 B가 가리키는 (존재 X) | 실제 파일 (현재 블루프린트) |
|---|---|
| `02_data_model.md` | `02_architecture.md` (데이터 모델은 `03_data_model.md`) |
| `03_kto_api_contracts.md` | `03_data_model.md` (KTO는 `04_kto_data_integration.md`) |
| `04_domain_logic.md` | `04_kto_data_integration.md` (도메인 산식은 `05`/`12`에 분산) |
| `05_features_f1.md` | `05_feature_F1_total_guide.md` |
| `06_features_f2.md` | `06_feature_F2_docent.md` |
| `07_features_f3_f4_f5.md` | `07_feature_F3_ugc_review.md` (F4는 `08`, F5는 `09`로 분리됨) |
| `08_a11y_legal.md` | `08_feature_F4_diary.md` (a11y는 `10`, 법무는 `11`로 분리됨) |
| `09_timeline_workstreams.md` | `09_feature_F5_rto_dashboard.md` (타임라인은 `12_workstreams_sequencing.md`) |
| `10_content_package.md` | `10_accessibility_kwcag.md` (콘텐츠 패키지 전용 문서 없음 — `12 C4`/`03`에 분산) |

또한 `01` §6.3(L324)은 `docs/plan/09_timeline_workstreams.md` 참조를 지시하지만 그 경로는 `09_feature_F5_rto_dashboard.md`다(타임라인은 `12`). 독자가 잘못된 문서로 유도된다 — SPEC과의 직접 충돌은 아니나 블루프린트 내부 무결성 위반.

### C-3 — `01_overview_goals_scope.md`가 다국어 contentTypeId를 SPEC의 부분집합으로 축약 표기

`SPEC.md` §6은 다국어 contentTypeId를 **7개**로 명시한다: `관광지 76 / 문화 78 / 행사 85 / 레포츠 75 / 숙박 80 / 쇼핑 79 / 음식 82`. 반면 `01_overview_goals_scope.md`는 세 곳(L133 외국인 4언어, L168 EngService2, L208 횡단 페르소나)에서 **`76/78/85`만** 기재한다. 6 POI가 주로 관광지/문화/행사 타입이라 실무 영향은 작지만, "4언어 contentTypeId 매핑: 76/78/85"라는 단정형 표기는 SPEC의 7개 매핑과 형식상 모순된다(75/80/79/82 누락). `04_kto_data_integration.md`·`06_feature_F2_docent.md`는 7개를 다룬다 → `01`만 축약. 최소한 "(주요 3종)" 같은 한정이 필요.

---

## B. GAPS (SPEC 항목인데 전개 문서가 부족하거나 누락)

### G-1 — 콘텐츠 패키지(Content Package Contract v1) 전용 문서 부재

SPEC §9는 5개 frozen contract 중 ⑤ **Content Package Contract v1**(6-POI Zod 스키마: entrances/steps/photos/slope/단차/rest/AAC/docent/source/verified-date)을 명시하고, 페어링 D8은 이를 "조기 동결 + C4 스트림"으로 채택했다. 그러나 **이 계약 전용 확장 문서가 없다.** 내용은 `01 §7`(요약 표), `03_data_model.md`(테이블), `12 §2.1 C4`(스트림 DoD)에 분산되어 있다. `01` 부록 B가 가리키던 `10_content_package.md`는 실재하지 않으며 그 슬롯은 `10_accessibility_kwcag.md`가 차지했다. C4가 가장 이른 기반 계약(F1-AD·F1-B·F1-C·F1-F·F2·F4 차단)이라는 점에서 전용 문서 없음은 실질 갭 — 최소한 `00_README.md`나 `03`에서 "C4 계약의 단일 소유 문서가 어디인가"를 명시해야 한다.

### G-2 — SPEC §5의 `dataset_versions` / `ingest_runs` 라이프사이클 전개 위치 미명시

SPEC §5는 source/publish 테이블로 `ingest_runs`·`source_records`·`dataset_versions`·`source_code_mappings`를 명시한다. `03_data_model.md`(DDL)와 `04_kto_data_integration.md`(ETL ingest≠publish 트랜잭션)가 각각 절반씩 다루지만, **"published_version 증가 ↔ revalidateTag ↔ last-good 유지"의 한 곳 통합 서술**이 어느 문서 소유인지 README/문서 헤더에서 명확히 위임되지 않는다. 충돌은 아니나, ETL 실패 복구 경로(SPEC §4 "ingest ≠ publish transaction")가 `03`/`04` 경계에 걸쳐 독자가 둘 다 읽어야 완성된다 — 소유 경계 명시 권장.

> 위 두 GAP은 "SPEC 항목을 어떤 문서도 전혀 다루지 않음"보다는 "분산되어 단일 소유 문서가 없음"에 가깝다. SPEC §0–§12 모든 절은 최소 한 문서에서 다뤄진다(완전 미커버 항목 없음).

---

## C. 충돌 아님 — 의도된 정제(refinement) / 경미 (참고용, 조치 불필요)

- **시간예산 "6단" vs "MVP 4단계":** SPEC §8은 F1.D를 "시간예산 6단"으로 부른다. `01 §3.3`(L126)·`05 §4`는 라벨 "6단"을 유지하되 "반나절·당일·1박2일·2박3일 = MVP 4단계"로 **명시적 범위 축소**를 적어 둔다. SPEC §7의 "반나절→1박2일 expansion within the same template family"와 정합하는 의도된 정제 — 충돌 아님.
- **Lighthouse perf ≥ 0.90:** SPEC §10은 Lighthouse **a11y ≥0.95**만 게이트로 규정. `13_testing_quality.md`가 추가한 perf ≥0.90은 **warn 게이트**(PR 비차단)이고 a11y 0.95는 그대로 error 게이트 — SPEC을 확장할 뿐 모순 없음.
- **데모 세션 "≈30분":** `01 §6.1`(L297)의 "데모 세션(≈30분)"은 SPEC에 없는 수치이나 SPEC은 시간을 규정하지 않으므로 충돌 아님(`14_demo_pt.md`의 PT 12분+Q&A 3분과도 별개 맥락).
- **문서 06 제목/명칭 경미:** `06_feature_F2_docent.md`의 H1이 `# F2 Odii 다채널 도슨트`로 **유일하게 `06` 번호 접두어 누락**(나머지 14개 문서는 번호 접두). 또 §0에서 "다채널"로 적었으나 SPEC/01/12는 "**4채널**". 순수 표기 일관성 문제 — SPEC 계약과 무관.

---

## D. 최종 판정 (VERDICT)

**전반적으로 15개 문서는 SPEC §2 잠금 결정 16개·§7 4-Layer 산식·§5 데이터 모델·§9 워크스트림과 강하게 정합한다.** Layer C cap +0.12, 런타임 KTO 호출 없음, 정적 큐레이션 경로, `accessibility_facts` 경계, 모노레포, no-Chromium PDF, 로그인 불필요 등 핵심 결정은 전 문서에서 일관되게 반복된다. 결정 로그(`15 §3`)와 페어링 결과도 SPEC §2와 1:1 대응한다.

**해소 필요(우선순위 순):**
1. **C-1 (High):** `zh-CN` ↔ `zh-Hans` 로케일 코드 통일. 라우트(`02`)와 DB enum(`06`)이 불일치하면 런타임에 도슨트 read-model이 빈 결과를 낸다. SPEC이 `zh-CN`이므로 `01`·`02`를 `zh-CN`으로 정렬하는 것이 SPEC-우선 해소.
2. **C-2 (Medium):** `01` 부록 B + §6.3의 문서 인덱스를 실제 파일명(또는 `00_README.md` 목차)으로 교체. 현재 stale numbering이 독자를 잘못된 문서로 유도.
3. **C-3 (Low):** `01`의 contentTypeId `76/78/85`를 SPEC의 7개로 보완하거나 "(주요 타입)"으로 한정.
4. **G-1 (Medium):** Content Package Contract v1의 단일 소유 문서를 지정(전용 문서 신설 또는 `00`/`03`에서 소유 위임 명시).

이 4건(특히 C-1)을 정리하면 블루프린트는 SPEC과 충돌 없는 상태가 된다. **차단성 모순(빌드를 막는 SPEC 위반)은 없으며**, C-1만이 런타임 동작에 영향을 주는 실질 충돌이다.
