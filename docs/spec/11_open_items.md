# 11 — 시작 전 확인 항목 (P0) + 남은 미결

---

## 1. P0 — 착수 이틀 안에 실제 호출로 확인할 것

전부 `scripts/probe.ts`가 자동으로 확인하고 결과를 `docs/spec/_probe-results.md`에 기록한다.
**여기서 답이 갈리면 계획이 바뀌므로 첫날에 한다.**

---

### P0-1 ★★★ — 6곳이 무장애여행 API에 등록돼 있는가

**이 프로젝트에서 가장 중요한 질문이다.**

```
GET KorWithService2/detailWithTour2?contentId={각 6곳}
```

| 결과 | 의미 |
|---|---|
| `resultCode = 0000` + 항목에 값이 있음 | 정상. 계획대로 |
| `resultCode = 0000` + 전 항목 빈 문자열 | 등록은 됐지만 운영자가 안 채움. **이게 갭 리포트의 정확한 근거가 된다** |
| `resultCode = 03` | **무장애여행 서비스에 없음.** 그 관광지는 24항목 전부 `unknown` |

**분기 판단은 [`10_build_order.md`](./10_build_order.md) Day 1~2 참조.**

**선행 작업:** 6곳의 `contentId`를 먼저 찾아야 한다.
```
GET KorService2/areaBasedList2?lDongRegnCd=44&lDongSignguCd=150&contentTypeId=12&numOfRows=100
GET KorService2/areaBasedList2?lDongRegnCd=44&lDongSignguCd=150&contentTypeId=14&numOfRows=100
GET KorService2/areaBasedList2?lDongRegnCd=44&lDongSignguCd=760&contentTypeId=12&numOfRows=100
GET KorService2/areaBasedList2?lDongRegnCd=44&lDongSignguCd=760&contentTypeId=14&numOfRows=100
→ title 로 6곳을 찾아 contentid 확보 → content/pois.json
```
(`KorWithService2/areaBasedList2`로도 같은 조회를 해서 **무장애 대상 목록에 있는지 교차 확인**한다. 이쪽이 더 직접적인 답이다.)

---

### P0-2 — 인증키가 실제로 동작하는가

```
아무 오퍼레이션이나 1회 호출
```
- `resultCode = 30` → **이중 인코딩.** `.env.local`에 Encoding 키를 넣었을 가능성이 크다. Decoding 키로 교체 ([`03_external_data.md`](./03_external_data.md) §1.3)
- `resultCode = 0000` → 통과

---

### P0-3 — Odii에 6곳 콘텐츠가 있는가

```
GET Odii/themeSearchList?keyword={관광지명}&langCode=ko
GET Odii/storyLocationBasedList?mapX={경도}&mapY={위도}&radius=1000&langCode=ko
```

**두 방법 다 시도한다.** 어느 하나라도 `tid`가 나오면 `storyBasedList`로 이야기 목록을 확인한다.

| 결과 | 대응 |
|---|---|
| 공산성·부소산성 둘 다 있음 | 도슨트 화면 정상 진행 |
| 한 곳만 | 있는 곳만 도슨트 제공. 없는 곳은 안내 문구 |
| 둘 다 없음 | **도슨트 화면을 국가유산청 해설 + 기기 음성 합성으로 대체**하거나 기능을 뺀다 |

> **좋은 신호:** Odii 매뉴얼의 예시 응답이 `themeCategory: "백제역사여행"`, `title: "백제문화단지"`, `addr2: "부여군"` 이다. 백제권 콘텐츠가 실제로 있다는 뜻이다.

---

### P0-4 — Odii `langCode`의 실제 값

**매뉴얼에 값 목록이 없다.** 기존 문서들이 서로 다른 주장을 한다.

```
같은 호출을 langCode 값만 바꿔가며 6회:
  ko / en / ja / jp / zh-CN / cn1
→ resultCode 와 totalCount 를 기록
```

추가로: `themeSearchList`의 파라미터 이름이 **`lang`인지 `langCode`인지** 확인한다 (매뉴얼의 표와 예시 URL이 서로 다르다).

---

### P0-5 — 집중률 API에 우리 관광지가 있는가

```
GET TatsCnctrRateService/tatsCnctrRateList?areaCd=44&signguCd=44150&numOfRows=100
GET TatsCnctrRateService/tatsCnctrRateList?areaCd=44&signguCd=44760&numOfRows=100
→ 반환된 tAtsNm 목록 전체를 출력
```

목록에서 "공산성", "부소산성"과 정확히 일치하는 이름을 찾는다. 없으면 비슷한 이름(`공산성(공주)` 등)을 찾아 `content/pois.json`의 `tatsName`에 적는다.
**끝내 없으면** `crowd_forecast` 항목을 `unknown`으로 두고, 화면에는 시군 단위 값만 참고로 보여준다.

---

### P0-6 — 법정동 코드 확인

```
GET KorService2/ldongCode2?lDongRegnCd=44&lDongListYn=Y
```
`44 = 충청남도`, `150 = 공주시`, `760 = 부여군` 확인. **[구조확정]** 이지만 부트스트랩으로 실측한다.

---

### P0-7 — 6곳의 국가유산 지정번호

제안서에 `史477`, `史13`, `史5`, `史301`로 적혀 있는데 **출처가 불분명하고 표기 방식도 옛 것**이다(2021년 이후 문화재 지정번호는 공식적으로 사용하지 않는다).

**확인처:** 국가유산청 국가유산포털(`heritage.go.kr`) 또는 각 관광지 공식 안내
**결과에 따라:** 정확한 명칭만 쓰거나(`사적 「공주 공산성」`), 확인된 번호를 쓴다. **불확실하면 번호를 아예 안 쓴다.**

> 부수 효과: 한자를 안 쓰면 폰트 글리프 문제(Pretendard에 한자가 없다)도 사라진다.

---

### P0-8 — 관광사진갤러리 오퍼레이션

```
GET PhotoGalleryService1/galleryList1?arrange=C&numOfRows=1&pageNo=1     → 200 기대
GET PhotoGalleryService1/gallerySearchList1?keyword=공산성&numOfRows=1   → 있는지 확인
```
매뉴얼 v4.2에는 `galleryList1` 하나뿐이지만 포털에 더 있을 수 있다. 검색 오퍼레이션이 있으면 48번 페이징이 불필요해진다.

---

### P0-9 — 오퍼레이션 이름 오타 확인

매뉴얼 자체에 표와 예시 URL이 어긋나는 곳이 3군데 있다. 각각 두 이름을 다 호출해서 200이 나오는 쪽을 쓴다.

| 서비스 | 표기 A | 표기 B |
|---|---|---|
| TatsCnctrRateService | `tatsCnctrRateList` (표) | `tatsCnctrRatedList` (예시 URL) |
| Odii | `themeBaseSyncdList` (표) | `themeBasedSyncList` (예시 URL) |
| TarRlteTarService1 | `AreaBasedList1` (표) | `areaBasedList1` (예시 URL) |

---

## 2. 결정이 필요한 것 (개발자가 판단할 수 없는 것)

| # | 항목 | 선택지 | 기본값 |
|---|---|---|---|
| **D-1** | Supabase / Vercel 유료 플랜 | 심사 기간(10월) 두 서비스 Pro ≈ 월 $45 vs Free + 매일 킵얼라이브 | **Pro 권장.** Free는 7일 무활동 시 일시정지되고, Vercel 서울 리전 고정이 Pro 기능이다 |
| **D-2** | 지도 표시 여부 | 접근 가능한 Kakao 지도(1일) vs 목록만 | **목록만으로 시작.** 여유 있으면 추가 |
| **D-3** | 관광지 6곳 유지 여부 | P0-1 결과에 따라 | 무장애 데이터가 있는 곳으로 교체 가능 |
| **D-4** | 대표 지역 표기 | "충남 공주·부여" 로 유지 | 유지 (지역특화 가점 대상) |

> **ID 주의:** 위 `D-1`~`D-4`는 **결정 항목**이고, [`01_scope.md`](./01_scope.md) §6의 `D-1`~`D-12`는 **완료 기준**이다. 서로 다른 목록이다.

---

## 3. 남은 미결 (진행하면서 해소)

| # | 항목 | 언제 |
|---|---|---|
| O-1 | `resolveStatus()` 정규식이 실제 KTO 문장을 얼마나 정확히 판정하는가 | 1주차. 6곳 × 24항목 = 144개 실제 문장을 눈으로 확인하고 규칙을 조정한다. 잘못 판정된 것은 `curated-facts.json`으로 덮어쓴다 |
| O-6 | 라벨 구간 임계값(75 / 50)이 실데이터 분포에 맞는가 | 1주차. 6곳 점수를 뽑아 보고 **한 번만** 조정한다 ([`06`](./06_suitability.md) §6.4) |
| O-2 | BF 인증·열린관광지가 6곳 중 어디에 있는가 | 2주차. 없으면 Layer C는 전부 1.00이고 그래도 정상 동작한다 |
| O-3 | KTO 이미지 URL이 HTTPS로 접근되는가 | 1주차 media 수집 때. 안 되면 프록시 라우트 |
| O-4 | 쉬운 글(easy text) 작성 분량 | 3주차. 공산성·부소산성 각 5~8문단 |
| O-5 | 운영계정 신청 여부 | 개발계정 1,000건/일로 충분하다는 계산([`03`](./03_external_data.md) §5)이지만, 심사 대비로 9월 중 신청해 두면 좋다. **없어도 서비스는 동작한다** |

---

## 4. 명시적으로 포기한 것 (다시 꺼내지 않는다)

기존 스펙에 미결 항목으로 올라 있었지만, 이번 조건에서는 **되살릴 방법이 없다.** 발표에서는 "발전 방향"으로 말한다.

| 항목 | 왜 포기하는가 |
|---|---|
| 현장 실측 (경사도·단차·회전반경) | 공주·부여 답사 일정 없음 |
| 2차 승인자가 서명한 증거 팩 | 검증자가 1명. 2차 승인자가 존재할 수 없다 |
| 관광약자 접근성 전문가의 산식 검수 서명 | 섭외 없음. **화면에 "전문가 검수 미실시"로 표시한다** |
| 정식 점자 지원 (점역 + 점자 전문가 검수 + 엠보서 출력 검증) | 셋이 한 묶음이고 하나도 확보되지 않았다. **텍스트 파일로 대체하지도 않는다** — 점자 지원은 접근성 있는 HTML 자체다 ([`01_scope.md`](./01_scope.md) §4.4 (2)) |
| 제보 사진 | 즉시 공개 모델에서 초상권·개인정보 위험이 이득보다 크다 ([`01_scope.md`](./01_scope.md) §4.4 (4)) |
| 제보 사전 검수 큐 | 댓글 모델로 바꿨다. 관리자는 사후 숨김만 한다 |
| 수어 영상 | 국립국어원 클립별 라이선스 확인 + 다누림 협약 + 수어 전문가 + 촬영. 외부 기관 3곳 |
| 충남문화관광재단 업무협약(LOI) | 7월 말 기한이 이미 지났다. 리포트는 **CSV 내려받기**까지만 만들고, "지자체 인계를 염두에 두고 설계"라고 표현한다 |
| 충남교육청 체험학습 서식 정합 PDF | 서식 원본 미확보. 인쇄용 HTML로 대체 |
| 마스코트 6컷 | 외주 제작 |
| 실제 이용자 3회차 사용성 검증 | 모집·보상·장소 섭외 |
| KWCAG 정식 인증 (WA/KWACC) | 110~150만원 + 5~10영업일 + 보완 라운드. **자체 점검으로 표기한다** |

---

## 5. 탐침 결과 기록 (`_probe-results.md` 서식)

```markdown
# 탐침 결과 — 2026-09-01 14:32 실행

## P0-1 무장애 데이터 등록 여부
| 관광지 | contentId | resultCode | 채워진 항목 |
|---|---|---|---|
| 공산성 | 126121 | 0000 | 11 / 24 |
| 무령왕릉과 왕릉원 | ... | 0000 | 7 / 24 |
| ... |

## P0-4 Odii langCode
| 값 | resultCode | totalCount |
|---|---|---|
| ko | 0000 | 3 |
| en | 0000 | 3 |
| ja | 03 | 0 |
| jp | 0000 | 3 |
...
```

**이 파일이 "우리가 실제로 확인한 것"의 유일한 기록이다.** 문서에 [미확인]으로 남아 있는 항목은 여기서 [확정]으로 승격된다.
