# `_research/` — 1차 조사와 리뷰 기록

이 폴더는 **조사 원본**이다. 가공물이 아니라 출처다.

## 읽는 순서

| 파일 | 무엇인가 |
|---|---|
| `00_SYNTHESIS.md` | D1~D4(1차 조사) 대 R1~R5(재검증) 대조 결과. **여기서 시작한다** |
| `D1_kto_api.md` | 한국관광공사 API 매뉴얼 조사 |
| `D2_tech_stack.md` | 기술 스택 조사 |
| `D3_legal_a11y.md` | 법령·접근성 1차 조사 — `docs/spec/13_legal_citations.md`의 원 출처 |
| `D4_domain_external.md` | 충남·RTO·대상 관광지·외부 데이터셋 |
| `R1_kto_api_current.md` | 2026-06-13 실제 포털 검증. 인증키 인코딩 함정의 원 출처 |
| `R2_kwcag_a11y.md` | KWCAG 2.2 33항목·인증 절차·비용의 원 출처 |
| `R3_docgen_assets.md` | PDF·GPX·점자·픽토그램 라이선스 확인 |
| `R4_supabase_vercel.md` | Supabase·Vercel 서울 리전·RLS·비용 확인 |
| `R5_maps_geo.md` | 카카오맵 쿼터·요금 정정, VWorld DEM 보안 제한, NGII 공개 DEM의 원 출처 |
| `_pairing_reconcile.md` | 아키텍처 초안 2건의 수렴·발산 해소 기록 |
| `_plan_review_findings.md` · `_plan_review_v6_findings.md` | 리뷰 라운드의 findings 원본 |
| `_plan_review_resolved.md` | 리뷰 계보의 종결 기록 |

## ★ 줄번호 참조가 유효하지 않다

이 폴더의 리뷰 문서들은 위치를 **`docs/plan/NN_*.md:줄번호`** 형식으로 적는다.
**그 문서들은 2026-09-01에 삭제됐다** (`docs/spec/00_README.md` §6).

찾아야 하면:
```bash
git log --diff-filter=D -- docs/plan/          # 삭제 커밋 찾기
git show <그 커밋>^:docs/plan/16_suitability_policy.md
```

**리뷰 문서 자체는 고치지 않는다.** 그 시점의 기록이고, 고치면 무엇을 언제 알았는지가 사라진다.

## 값이 다르면

**`docs/spec/`가 이긴다.** 이 폴더의 조사에는 그 뒤 매뉴얼 원문 대조로 정정된 값이 남아 있다.
특히 `D1_kto_api.md`의 "`areaCode` 2025-12-31 일괄 종료" 서술은 **틀렸다** — 서비스별로 상태가 다르다
(`docs/spec/03_external_data.md` §2.1·§2.2).
