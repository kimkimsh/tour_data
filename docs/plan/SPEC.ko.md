# 모두의 백제 (Modu Baekje) — 구현 기획 SPEC (확정 단일 기준 문서)

> **상태:** 방향 승인 완료 (2026-06-14). **이 파일은 영문 정본 [`SPEC.md`](./SPEC.md)의 한국어 번역본이다 — 권위는 `SPEC.md`에 있으며, 두 문서가 충돌하면 `SPEC.md`가 우선한다 (plan-review v6, 2026-06-15). v6 개정사항(SPEC.md §14)은 아직 이 번역본에 반영되지 않았을 수 있으니 정본을 확인하라.** 모든 `docs/plan/NN_*.md`는 `SPEC.md`의 한 절(section)을 확장한 것으로서 정본과 모순되어서는 안 된다. 출처(Provenance): 정본 제안서 `docs/ideation/total/00_modu_baekje.md`, 리서치 `docs/plan/_research/00_SYNTHESIS.md` (+ 9개 브리프), 그리고 Claude⇆Codex 페어링 `_pairing_reconcile.md`.

## 0. 한 줄 요약

> **2026 KTO 관광데이터 활용 공모전 ① 웹·앱 개발 부문**을 위한 **무장애(barrier-free) 유산 관광 웹 앱**으로, **공주·부여 백제역사유적지구 6개 POI**를 대상으로 한다. **하나의 검증된 접근성 데이터셋이 F1→F2→F3→F4→F5로 흐른다** — 여행 전 의사결정 → 현장 안내 → 현장 제보 → 교육 기록 → 충남 RTO 개선 신호.

## 1. 공모전 프레임 & 점수 목표 (빌드 단계; 기능심사 + PT는 2026년 10월)

| 단계 | 항목 (배점) |
|---|---|
| 1차 (서면·기능, 100) | 기획력 30 · 완성도 30 · **데이터활용 20** · 발전성 20 · (+지역특화 가점 **+2**, 충남) |
| 최종 PT (100) | 적정성 30 · 완성도 30 · 실용성 25 · 발표 15 |

**설계 원칙:** 모든 기능은 위 항목 중 하나를 눈에 보이게 획득해야 한다. **데이터활용 20 + 기획력**을 획득하는 차별화 요소는, **검증된 6-POI 콘텐츠 패키지** 위에 구축된 **투명한 4-Layer 적합도 근거 카드**다. **실용성 + 발표**를 위한 PT의 결정적 장면(money shot)은 F4 6채널 다이어리다. 충남 단일 지역 = +2 + CACF RTO 특별상 후보 자격.

## 2. 확정된 결정 사항

| # | 결정 | 값 |
|---|---|---|
| 2.1 | 주제 | 「모두의 백제」 (확정) |
| 2.2 | 스택 | **Next.js 15** (App Router, TS, React 19, Node 20) + **Supabase** (Postgres 17 + PostGIS; **MVP에서 pgvector 없음**) + **Vercel**, 전부 **서울** (`icn1` / `ap-northeast-2`) |
| 2.3 | 앱 형태 | **PWA** (Serwist) — 네이티브 아님. 모바일 네이티브 KS X 3253 = 발전방향 |
| 2.4 | 캐시 모델 | Next 15 + `unstable_cache` (사용자별 데이터는 절대 감싸지 않음). Next 16 Cache Components는 아직 미사용 |
| 2.5 | 방향 | **좁고, 계약 우선, 콘텐츠 검증된 시스템** (넓은 플랫폼이 아님) |
| 2.6 | 라우팅 | 6개 POI에 대한 **큐레이션된 정적 경로 패키지**. MVP에서 **동적 pgRouting / DEM 없음** |
| 2.7 | 데이터 서빙 | **런타임 KTO 호출 없음.** 모든 데이터는 ETL로 Supabase에 발행됨; 변동성 데이터(혼잡/날씨/대기) = 짧은 주기 스냅샷. DB = 1차 캐시 + 단일 진실 원천(데모 내성 보장) |
| 2.8 | 검색/AI | MVP에서 **pgvector / RAG / 임베딩 / OCR / 360° / 멀티 AI 공급자 없음** → 발전방향 |
| 2.9 | 메시징 | MVP에서 **FCM/APNs/알림톡 없음**. 승인된 알림용 인앱 배너 + Supabase Realtime |
| 2.10 | ETL 스케줄러 | 무거운 배치는 **GitHub Actions**; 짧은 갱신만 **Vercel Cron**; GH Actions → HMAC 보호 내부 엔드포인트 → `revalidateTag`; 실패 시 제한된 TTL로 복구 |
| 2.11 | 인증 | 핵심(탐색·도슨트·다이어리)은 **로그인 없이** 동작. UGC 신원용으로만 Supabase **익명(Anonymous)** 인증; 소셜 전환은 선택 |
| 2.12 | 결제 | MVP에서 없음 (정보+추천만 → 통신판매업/여행업 해당 없음) |
| 2.13 | 접근성 인증 | **자체 평가 + 핵심 경로에 대한 수동 스크린리더 검증**; 공식 WA/KWACC 인증 신청은 사전 심사 차단 요소가 **아님** (→ 발전방향, 버퍼가 있으면 9월 중순 신청) |
| 2.14 | Layer C 상한 | 인증 보정은 **+0.12**로 상한 (1.00–1.12); KQ = 메타데이터 전용. 제안서의 ×1.30을 정제한 것으로 문서화 |
| 2.15 | 외부 데이터 (MVP) | KTO (10개 서비스) + BF인증 + 국가유산청 + 기상청 + 응급/AED + 충남(다도라/올담). 나머지 24개 → 발전방향 |
| 2.16 | 자체 제작 콘텐츠 | **백제 마스코트 6컷**만 커스텀; 모든 픽토그램/AAC/쉬운글은 오픈 세트 재사용 (ARASAAC/KS/복지부/KODDI/국립특수교육원) |

## 3. 6개 MVP POI (공주 3 · 부여 3)

공주: **공산성** (史477) · **무령왕릉과 왕릉원** (史13) · **국립공주박물관**
부여: **부소산성** (史5) · **정림사지+정림사지박물관** (史301) · **국립부여박물관**
데모 우선 페어(가장 깊은 콘텐츠): **공산성 · 부소산성**.

## 4. 아키텍처 — 3개 평면(plane) + 순수 도메인 코어

```
DATA PLANE        KTO + 공공 API ─► 타입 지정 소스 어댑터 (string-first 파싱; JSON-ok/XML-error; Zod passthrough)
                    ─► ETL CLI (GitHub Actions): source_records(raw) → normalize → validate → PUBLISH txn
                    ─► Supabase (canonical POI, accessibility_facts, route_guides, docent_assets, 승인된 UGC, 대시보드 스냅샷)
DOMAIN PLANE      순수 TS, 프레임워크 무관, TDD: calculateSuitability · buildItinerary · resolveGuide · moderateReport · buildDiaryDocument
PRESENTATION      Next 15 RSC (unstable_cache, 공개 read-model만) ─► Client: 접근 가능한 LIST = 단일 진실 원천; map = 보조; IndexedDB = 프로필/다이어리/오프라인 가이드
```
ETL 실패 ⇒ 마지막으로 성공한 발행을 계속 서빙 (수집(ingest) ≠ 발행(publish) 트랜잭션).

**Monorepo (패키지가 에이전트 경계를 강제; `domain`은 Next.js를 import할 수 없음):**
```
apps/web/src/{app/[locale], features/{f1-poi-card,f1-planner,f1-route-guide,f1-safety,f1-community,f1-predictable,f2-docent,f3-report,f4-diary,f5-dashboard}, admin, shared}
packages/{domain, application, db, kto-client, public-data-clients, etl, ui, exports, content-schema, test-fixtures}
content/{pois, route-guides, docent, pictograms, licenses}
supabase/{migrations, seed, tests}
scripts/{ingest, validate-content, publish}
tests/{contract, e2e, accessibility, demo}
.github/workflows/{ci.yml, kto-etl.yml, release-readiness.yml}
```

**모듈 맵:** `domain/poi` · `domain/accessibility` (capability + persona matrix + suitability) · `domain/itinerary` · `domain/guide` · `domain/docent` · `domain/reporting` · `domain/diary` · `domain/rto` · `integrations/kto` · `integrations/public-data` · `application` · `features` · `admin` · `etl`.

## 5. 데이터 모델 (Supabase) — raw/normalized 분리, capability fact

**소스/발행:** `ingest_runs` · `source_records(source, source_id, raw_payload, hash, fetched_at)` · `dataset_versions(dataset, published_version, published_at)` · `source_code_mappings(service, code_type, source_code, label)` (`ldongCode2`/`lclsSystmCode2`에서 부트스트랩 — 절대 하드코딩 금지).

**POI/접근성 (발행 시 공개 read):** `pois(id, kto_content_id, geom, type, visibility)` · `poi_translations(poi_id, locale, title, description, provenance)` · `poi_media(url, license_code/cpyrhtDivCd, attribution, transform_policy)` · `poi_entrances(location, name, geometry, verified_at)` · **`accessibility_facts(poi_id, capability_code, status ∈ {supported|partial|unsupported|unknown}, detail, source, source_field, verified_at)`** ← 도메인을 KTO 필드명으로부터 분리 · `poi_certifications(grade, period, source)` · `nearby_facilities(kind ∈ {restroom|AED|hospital|equipment}, ...)` · `context_snapshots(weather, crowd, air, effective_period)`.

**경로/도슨트 (공개):** `route_guides(poi, persona_flags, version, published)` · `route_steps(seq, action, geometry, photo, easy_text)` · `route_hazards(type, severity, permanent|temporary)` · `itinerary_templates(budget_mode, ordered_pois, slot_durations)` · `docent_stories(poi, locale, mode, source)` · `docent_assets(audio, transcript, braille, sign_video)`.

**UGC/관리 (RLS):** `barrier_reports(reporter_id, poi, category, status, occurred_at)` — 본인 insert/read, 승인 시 공개 · `report_evidence(private_storage_path)` — 제보자+관리자만 · `moderation_events` — 관리자만 · `reviews(persona, dimensions, status)` — 승인 시 공개 · `gpx_submissions(route, source, moderation_status)` · `admin_roles(user_id, role)` · `audit_events` — append-only, 관리자만. 승인 전 사진은 **비공개 Storage 버킷**에; Realtime은 **승인된 알림 상태만** 브로드캐스트하며 원시 제보(raw report)는 절대 안 함.

**F4/F5:** 다이어리는 기본 **IndexedDB**; 서버는 명시적으로 제출된 데이터만 저장. 뷰: `gap_metric_snapshots`, `poi_completeness_mv`, `report_trends_mv`, `rto_dashboard_snapshots` (PT 재현 가능).

RLS 기본 거부(default deny); 익명은 제한적(anon-restrictive); 관리자는 `admin_roles`를 통함.

## 6. KTO API 계약 (10개 서비스) + 통합 규칙

게이트웨이 `https://apis.data.go.kr/B551011/{ServiceID}/{op}` (provider B551011). 매 호출 필수: `serviceKey`, `MobileOS=ETC`, `MobileApp=ModuBaekje`. JSON은 `&_type=json`으로; **에러는 항상 XML** → body를 문자열로 먼저 파싱. 에러 코드: 00/0000 ok · 03 no-data · 10/11 bad/missing param · 22 over-traffic · 30 unregistered/double-encoded key · 31 expired.

| 서비스 | 주요 op | 비고/주의점 |
|---|---|---|
| KorService2 | areaBasedList2/Sync2, locationBasedList2, searchKeyword2/Festival2, detailCommon2/Intro2/Info2/Image2, ldongCode2, lclsSystmCode2 | 주 콘텐츠; `*2`; festival은 `eventStartDate` 필요 |
| **KorWithService2** | **detailWithTour2** (무장애), list/detail | **권위 있는 접근성 소스**; contentTypeId는 12/14/15/28/32/38만 |
| Odii | storyLocationBasedList/storyBasedList/themeBasedList | **`xCoord`/`yCoord`/`langCode`(ko/en/ja/zh-CN)/`radius`(m)**, 고유 `themeNm`, lclsSystm 없음 |
| TatsCnctrRateService | tatsCnctrRateList | **레거시 코드** (areaCd=34 충남; signguCd 부여=34800; **공주 TBD**); 0–100 지수, 인원수 아님 |
| DataLabService | locgoRegnVisitrDDList, metcoRegnVisitrDDList | startYmd/endYmd; 약 4일 지연; **"방문자≠관광객" 단서 필수** |
| TarRlteTarService1 | areaBasedList1, searchKeyword1 | `1` 접미사; 레거시 areaCd/signguCd+baseYm |
| PhotoGalleryService1 | galleryList1/SearchList1/DetailList1 | 공공누리 1유형 (무료) |
| Eng/Jpn/Chs/ChtService2 | KorService2 op 세트 (detailPetTour2 없음) | **다국어 contentTypeId: 관광지 76 / 문화 78 / 행사 85 / 레포츠 75 / 숙박 80 / 쇼핑 79 / 음식 82**; 여행코스25는 없음 |

**타입 지정 클라이언트 (`packages/kto-client`):** `request<TReq,TRaw>(op,req) → {ok,data,rawBody,fetchedAt} | {ok:false,error,rawBody}`. DECODING된 키는 서버 전용 환경에, 정확히 **한 번만** 인코딩 (이중 인코딩 = 코드 30). Zod `passthrough()`, 식별자에는 strict. 모든 정규화된 fact는 `source/sourceField/sourceUpdatedAt/ingestedAt`를 보유. **클라이언트에 숨은 캐시 없음** (쿼터/재시도 = ETL의 일; 서버리스 토큰 버킷은 공유되지 않음). 저장된 실제 응답 **fixture** → 라이브 API 없이 계약 테스트 실행.

**신규 vs 레거시 코드 (해결됨):** `*2` + `lDong*`/`lclsSystm*`로 표준화; 레거시 `areaCode`/`cat*`는 읽기 전용 폴백으로 취급. **lDong 코드는 부트스트랩 시 `ldongCode2`에서 가져옴 — 44/150/760 하드코딩 금지.** `cat→lclsSystm`은 단순 이름 변경이 아님 → 라벨 맵을 경험적으로 구축. 레거시 `areaCd=34` (TatsCnctr/TarRlte/DataLab) ≠ lDong 네임스페이스.

**계정:** dev = 1,000 calls/op/day (자동); **운영 ≈ 100,000/day (심사 1–3일, 등록된 활용사례 URL 필요) — 일찍, 10월 한참 전에 신청.**

## 7. 4-Layer 적합도 산식 (결정론적; `packages/domain/accessibility`)

```
calculateSuitability({ poiFacts, routeGuide, personaIds, timeContext, certifications, ugcSummary, calculationDate, policyVersion }) → SuitabilityResult

capability 값: supported 1.00 · partial 0.50 · unsupported 0.00 · unknown 0.35  (coverage는 항상 별도로 반환)

A (POI 본질) = 0.30 entry + 0.18 continuity + 0.15 amenities + 0.12 rest + 0.10 timeContext + 0.08 safety + 0.07 verifiedUgc
   continuity = min(segment scores) (평균이 아닌 최악 구간); rest = persona 임계값 대비 최대 무휴식 이동
B (persona 적합) = 0.75 + 0.25 × min(선택된 persona들의 personaFit)   ; personaFit = weightedMean (critical×4 / supporting×2 / other×1)
   다중 persona는 가장 낮은(LOWEST) personaFit 사용 (할아버지 vs 손녀: 한쪽의 장벽을 다른 쪽이 가릴 수 없음)
C (인증) = 1.00 + min(0.12, Σ[BF 예비+0.02|일반+0.05|우수+0.08] + [열린관광지+0.04])   → 1.00..1.12 ; KQ = 메타데이터 전용
D (신선도) = weightedMean(fact별 decay: ≤90d 1.00 / ≤365d 0.90 / >365d 0.75)   ; 승인된 UGC는 관련 capability의 날짜만 갱신

score = round(clamp(100 · A · B · C · D, 0, 100))

강제 규칙:
  - 선택된 persona의 CRITICAL capability가 unsupported → score ≤ 49
  - critical = unknown 또는 근거 coverage < 65% → 라벨 "정보 없음"
  - 그 외 라벨: 75–100 방문가능 · 50–74 주의 · 0–49 대체추천
  - score < 70 → 대체 POI도 노출 (TarRlteTar)
  - 반환값: total + 축별 기여도 + 감점 + 데이터 날짜 + policyVersion  (F1.A 투명 카드를 구동)
Null 규칙: 빈 필드 ⇒ "정보 없음 — 현장 확인 필요", (a) 본질 제약 vs (b) 운영자 미입력으로 분리. 절대 추론(infer)하지 않음.
```

**시간 예산:** 큐레이션된 `itinerary_templates`에서 선택 (범용 최적화기가 아님). total = POI 체류 + 고정 환승 행렬 + persona 휴식 + 식사 + 숙박 전환 비용; persona 배수는 곱(product)이 아닌 **max**를 취함 (폭발 방지). 반나절→1박2일 = 동일 템플릿 패밀리 내 확장 (PT 안정적, 매 실행 동일 결과).

## 8. 기능 → 모듈 (정본 F1–F5)

- **F1 무장애 토털 가이드 OS** — A POI 무장애 상세 카드 (`accessibility`,`features/f1-poi-card`) · B 사전 베리어프리 정적 경로 (`guide`,`features/f1-route-guide`) · C SOS·콜택시·보조기기+AAC (`features/f1-safety`, 정적 디렉터리) · D 시간예산 6단 + 4-Layer 산식 (`accessibility`,`itinerary`,`features/f1-planner`) · E 페르소나 후기 + GPX 환류 (`reporting`,`features/f1-community`,exports) · F **예측 가능 백제** 7요소 (`features/f1-predictable`, F1.B 스텝 데이터 재사용).
- **F2 Odii 4채널 도슨트** — 음성·자막·점자·수어 × ko/en/ja/zh-CN (`docent`,`features/f2-docent`); 동의 기반 지오펜스 + **지도 탭(map-tap) 폴백**; "AI 음성 안내" 배지; 자막(transcript) 항상 노출; `aria-live`.
- **F3 배리어 제보 + 검수 큐** — 구조화된 제보 + 사진 → 관리자 큐 → 승인 → Realtime 알림 (`reporting`,`features/f3-report`,`admin/moderation`); **자동 재계산 없음**; 제보자 신뢰도(reporter-trust) 필터.
- **F4 다중 출력 다이어리** — 로컬 우선(local-first) 다이어리 + 퀴즈 + 6종 출력: 학생PDF(pdf-lib로 충남교육청 양식) · 교사루브릭 · 점자.brf(braillify) · 쉬운글PDF · GPX · 단체합본 (`diary`,`features/f4-diary`,`exports`); 새 보고서는 react-pdf, **HTML 대안 항상 제공**, **MVP에서 Chromium 없음**.
- **F5 충남 RTO 갭 리포트** — 완성도 집계 + 방문자 추이 ("방문자≠관광객" 단서) (`rto`,`features/f5-dashboard`); B2G 갭 뷰로도 활용.
- **외국인 4언어** = 모든 공개 기능에 걸친 횡단(cross-cutting) 로케일/콘텐츠 레이어.

## 9. 워크스트림, 계약, 의존성 그래프, 타임라인

**먼저 동결(Freeze first) (각각 단일 소유자, 버전 관리):** ① DB Contract v1 (tables/enums/RLS/Storage) ② KTO Contract v1 (transport + raw fixtures + normalized types) ③ Domain Contract v1 (5개 시그니처) ④ Design Contract v1 (tokens + a11y primitives) ⑤ **Content Package Contract v1** (6-POI Zod 스키마: entrances/steps/photos/slope/단차/rest/AAC/docent/source/verified-date).

**스트림:** C0 Contracts · C1 Data Platform · C2 KTO/ETL · C3 Design/A11y · **C4 Content (6-POI)** · F1-AD · F1-B · F1-C · F1-E · F1-F · F2 · F3 · F4 · F5 · I0 Integration (D.1 조립) · Q0 Quality.

```
C0 ├─► C1 ─► C2 ─► F1-AD, F2, F5
   ├─► C3 ──────► 모든 기능
   └─► C4 ─► F1-AD, F1-B, F1-C, F1-F, F2, F4
C1 ─► F3 ;  F1-B ─► F1-F, F1-E, F4 ;  F3 승인 ─► F1-B 알림, F5
(F1-AD+F1-B+F2+F3+F4+F5) ─► I0 ─► Q0
```

**타임라인 (현재 6/14):** 6/14–6/28 계약 + 첫 수직 슬라이스(vertical slice) (공산성·국립공주박물관 데이터; 반나절+휠체어·시니어·가족이 한 화면에서 동작; CI: typecheck/unit/axe/core-E2E) → 6/29–7/19 6-POI ETL/발행 + F1.A/D + F1.B 공주 3 + F3 상태 머신 + F4 PDF/BRF/GPX 스파이크 → 7/20–8/9 F1.B 부여 3 + F1.C/E/F + F2 4언어/4채널 + F3 승인-알림 + F4 6종 출력 + F5 → 8/10–8/31 D.1 골든 플로우 + Serwist 오프라인 (6-POI 번들) + 수동 NVDA/VoiceOver/TalkBack + 라이선스/AI-라벨/위치동의 감사 + 폴백 훈련(drill) → 9/1–9/15 실제 관광약자 + a11y 전문가 검증; 모든 데모 API 응답 스냅샷 → 9/16–9/30 RC: 기능 동결, PT 시나리오 + 백업 영상, 데모 시드 vs 프로덕션 분리, 심사위원/관리자 계정 + 인시던트 런북.

## 10. KWCAG 2.2 + 법무 (요약; 06/07 참조)

**KWCAG 2.2** = 33 검사항목 (KS X OT0003). CI 게이트(PR 실패 처리): 핵심 라우트에서 `@axe-core/playwright` violations=0 (`.map-canvas`는 제외→수동), `jest-axe` 컴포넌트, Storybook `addon-a11y` (대비 검출), Lighthouse a11y ≥0.95, `eslint-plugin-jsx-a11y`. 개발-필수(Dev-critical): 라우트 변경 시 포커스 리셋 + `aria-live`; 지도 키보드/리스트 대안; 도슨트 동의 + 자막 + 컨트롤; 대비 4.5/3:1; `prefers-reduced-motion`; h1 하나 + 랜드마크 + skip-link; 라벨링된 입력; Radix/React-Aria 포커스 트랩. 권장(Voluntary): 타깃 ≥24px, 포커스 링 3:1. **수동 NVDA/센스리더가 인증 직결(cert-direct) 게이트.**

**법무:** **위치정보법 제9조의2** 실시간 GPS 전 방통위 신고 (MVP의 지도 탭이 이를 유예); 원시 GPS 비영속화(no raw-GPS persistence) (§23 보안 삭제); **PIPA** 분리 동의 체크박스; PII는 Supabase 서울 Postgres에만 (CDN/Edge 절대 금지); Vercel(US)/Kakao 위탁·국외이전 고지. **AI 기본법** "AI 음성 안내/AI 번역/AI 생성 코스" 라벨 (가시적 + SR). **KOGL** `cpyrhtDivCd` 저장; Type3 = 변형 금지; 자산별 출처 표기. 자산별로 가장 제한적인 규칙 우선(most-restrictive-wins) 처리 (제한 자산은 변형하지 않음); 변형 대상은 OFL/CC-BY/ARASAAC 선호.

## 11. 리스크 & 빌드 시점 검증 게이트

주요 완화책: raw 저장 + 어댑터 격리 + fixture 계약 테스트 (API 필드 드리프트); 자동 생성 경로 없음, POI별 verified-by/date (경로 오류); unknown 분리 + coverage + 상한 (거짓 정밀도); 계약 소유자 1명 + 버전 관리 스키마 + 디렉터리 소유권 (에이전트 드리프트); F1–F5당 수직 슬라이스 1개 (기능 과잉); 스냅샷 데이터 + 사전 생성 미디어 + 백업 영상 (데모 당일 장애); **전문가 검증(관광약자/특수교육/점자)은 타협 불가이며 개발과 분리.** **빌드 시점 검증(Foundation):** detailWithTour2의 정확한 필드 키 vs 가이드 v4.3 + 라이브 프로브; lDong 코드는 ldongCode2 경유; 게이트웨이 접미사는 Swagger 경유; TatsCnctr 공주 signguCd; 6개 POI에 대한 Odii 커버리지.

## 12. PT 내러티브 (D.1 = 전체 제품을 하나의 스토리로)

로그인 없음 → 휠체어 할아버지 + 시니어 + 초등 손녀 선택 → 반나절 공산성: 입구/휴식/화장실/알림 + **점수 근거** → 승인된 "동문 공사" 제보가 서문 정적 가이드를 강조 (자동 리라우팅 없음) → 현장 Odii 음성·자막·점자·수어 → 1박2일로 전환 → 동일 검증 템플릿 패밀리가 부여로 확장 → 손녀의 기록 → 학생PDF·쉬운글PDF·BRF·GPX → 동일 데이터의 갭이 F5 충남 RTO 대시보드에 나타남.
> **"한 번 수집한 무장애 데이터가 여행 전 판단, 현장 안내, 교육 기록, 다음 방문자의 경고, 충남의 시설 개선 우선순위까지 연결됩니다."**
승리 조건은 동일 데이터셋이 F1→F5를 관통한다는 **근거(evidence)**이지, 기능 개수가 아니다.

## 13. 기획 리뷰 개정 (2026-06-14) — §2/§7/§8/§9/§11 수정

> 출처: Claude⇆Codex 기획 리뷰 + 4개 페르소나 리뷰 (`_research/_plan_review_findings.md`); 두 건의 사용자 결정 (lock 보존 가드; 권장 스코프 컷 + PT 전략). 리뷰어들은 이전 초안을 "아직 공모전 준비가 안 됨, 수정 가능한 갭 있음"으로 평가했고, 이 개정이 이를 해소한다. **확정된 수치(§2.14, §7)는 유지; 가드만 추가.**

**13.1 산식 권위 & 가드.** `16_suitability_policy.md` (+ `packages/domain/policy/suitability-policy-v1.json`)가 이제 모든 산식 정책 값과 `SuitabilityResult` 계약의 **단일 권위**다; §7은 산식의 *형태(shape)*만 유지. Lock 보존 가드(사용자 승인): (a) **`evidenceConfidence`/`coverage`를 `score`와 별도로** 방출; (b) **`coverage < 0.65`는 라벨을 '주의'로 상한**; (c) **인증만으로는 라벨 경계를 넘을 수 없음**; (d) 대체안은 **`<70`**에서 트리거되며 **검증된 카드 POI만** 포함, `TarRlteTar`는 별도 "관련 관광지(접근성 미검증)" 리스트. `unknown=0.35`, Layer C `+0.12`, Layer D decay 값 유지. Layer A는 **페르소나 중립**(객관적 인벤토리); Layer B가 페르소나 적합 배수(이중 계산 없음). 정책이 **전문가 사인오프 + ≥30개 골든 케이스 통과**되기 전까지 어떤 점수 코드도 출시 안 함.

**13.2 스코프 컷 (적용됨; §13.4 게이트 뒤에서).** F1.F **7→3 요소** (시각 일정·1단계 1행동·calm+AAC; 보호자 동기·60초 변경·단체 모드 → 발전방향). F2 **지오펜스 제거** (map-tap만); **4채널·수어는 공산성·부소산성만 깊게**, 외국어는 텍스트/자막/음성. F1.E 후기 + UGC GPX 제출 → 발전방향 (**F3가 유일한 UGC 진입점**; 큐레이션된 GPX *다운로드*는 유지). F4 출력 우선순위: HTML + 학생 PDF + 쉬운글 PDF + **전문가 검증 BRF**; 교사 루브릭/단체 합본은 얇은 파생물(thin derivative)로만. F5 = **단일 갭-우선 리포트** (`impact × severity × confidence × feasibility` + 액션 아이템), 히트맵/방문 추이 장식 아님. **6-POI 깊이 계층화(depth tiering)**: 공산성·부소산성 = 전체 근거 팩 + 경로; 나머지 4개 = 검증 카드. **시간예산 MVP = 3단** (반나절/당일/1박2일); 2박3일 + 익산/논산 → 발전방향 ("6단" = 확장 상한 라벨).

**13.3 첫 수직 슬라이스 (단일 정의; 다른 모든 정의를 대체).** 공산성 **F1.A/D → 3-스텝 검증 경로 → HTML 다이어리 → 1개 F5 갭**, 지정된 소유자, fixture, E2E 테스트 포함.

**13.4 스코프 컷 게이트.** **7/19와 8/9** 자동 게이트: 핵심 F1→F5 경로가 지연되면, 재확인 없이 §13.2 컷 리스트를 적용 (및 T2/T3 데모 기능 강등).

**13.5 "검증됨" = 근거 팩 (DoD).** capability는 **근거 팩(evidence pack)**이 있어야만 "현장 검증"임: 원본 사진, 측정값, 측정 방법, 검증자 + 자격, 2차 승인, 유효 기간, 변경 이력. **문자열만 있는 `verified_by/date`는 발행 게이트로 금지.**

**13.6 검증 일정 (기존 9월 단독에서 변경).** **7월** 데모 페어 1차 검증 → **8월** 전체 플로우 2차 → **9월** 회귀(regression). 모집 / 보상 / 장소 / 소유자 / **통과 기준(pass-bars)** (과업 완료율, 치명적 오류 수, 도움 요청률, 이해도, 경로 판단 정확도)는 **6월에 확정**.

**13.7 충남 근거 체인 = 이번 스프린트 P0.** 공주 `lDong` + TatsCnctr `signguCd` 프로브를 **지금** 실행 (F5/특별상 스토리를 좌우). **7월 말**까지 CACF 의향서(letter-of-intent) 확보; 없으면 슬라이드에 들어가기 전에 "CACF로의 B2G"를 "RTO 핸드오프를 위해 설계됨"으로 완화.

**13.8 PT 전략.** **사전 녹화된 F1→F5 골든 플로우가 1차 아티팩트** (1:00–7:00); 라이브 앱은 **3개 히어로 모먼트**에만 사용 (4-Layer 카드 공개 · 6채널 익스포트 · F5 갭 리포트). 오프닝에서 **STT를 사전 입력 텍스트로 대체**. 0:00–0:30 문제 슬라이드에 **Wheelmap-핀 vs 4-Layer-카드** 나란히 비교 추가. shot 7 (F1→F5 다이어그램) + 마무리에 **60초+**를 확보하도록 재예산. 데모 티어: **T1 완벽한 라이브** (F1.A 카드, F1.B 경로+오프라인, F4 익스포트, F5 갭, F1→F5 다이어그램) · **T2 간략/영상** (F2 4채널, F1.F, F3 알림) · **T3 언급만** (D.2–D.6, 수어, ja/zh-CN).

**13.9 아키텍처/데이터 강화.** 컨텍스트 갱신(날씨/Tats/대기)은 **GH Actions / 서버 전용 cron 패키지 예외**로 이동 (`apps/web` 아님). 발행은 **스테이징 테이블 + 원자적 active-version 포인터 스왑** 사용 (삭제/실패/오래된 행 처리). **POI별 캐시 무효화** (`poi:{id}` 팩토리 + 계약 테스트). **라이브 API 프로브를 PR CI에서 제외** → 수동/스케줄 통합 워크플로우로; PR CI = 서명된 fixture + 스키마 드리프트만. UGC에 **레이트 리밋, 파일 크기/MIME/중복 해시 제한, 관리자 MFA, 감사 보존** 적용. KOGL **Type3 = 변형 금지** (라이선스 인식 번들 매니페스트, 단일 스토리지, 자산 해시; 전체 텍스트-스텝 폴백). 주장 문구: **"런타임 KTO/Odii 의존성 제로"** ("외부 의존성 제로"가 아님); Kakao 실패 → 리스트 전용 폴백.

**13.10 디렉터리 소유권 (충돌 해결).** `packages/exports`와 `tests/e2e`에 **전담 소유자 스트림** 부여; 루트 config / lockfile / env / `app` 라우트 / `supabase/migrations`에 각각 지정된 소유자. 계약 동결은 **48–72시간 단위**로 순차 (C1→C2→C4→F1은 실제 순차이며 병렬 아님); 스텁 UI와 실데이터 통합은 별도 마일스톤.
