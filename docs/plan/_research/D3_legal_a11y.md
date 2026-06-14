# D3 — Legal, License & Accessibility Brief
## 모두의 백제 (Modu Baekje) — Barrier-Free Heritage Tourism Web/App

**Role**: D3 Digest · Sources: docs 23, 24, 25, 26, 06, codex/05  
**Date**: 2026-06-13 · Applies to: Next.js + Supabase + Vercel (Seoul region)

---

## 1. KOGL — License Types and Combined-Data Rule

### 1.1 Six KOGL Types

| Code | Name (공공누리) | Attribution | Commercial | Derivative |
|------|----------------|-------------|------------|------------|
| **Type 0** | 자유 이용 | Not required | Yes | Yes |
| **Type 1** | 출처표시 | **Required** | Yes | Yes |
| **Type 2** | 출처표시 + 상업적 이용금지 | **Required** | **No** | Yes |
| **Type 3** | 출처표시 + 변경금지 | **Required** | Yes | **No** |
| **Type 4** | 출처표시 + 상업적 이용금지 + 변경금지 | **Required** | **No** | **No** |
| **AI유형** | AI 학습/이용 허용 | Not required | Yes | Yes |

**Source**: https://www.kogl.or.kr/info/license.do

### 1.2 KTO TourAPI Data License

- **TourAPI text data** (관광정보 텍스트) → **KOGL Type 1** (출처표시, commercial OK, derivative OK)
- **TourAPI images/photos** → majority Type 1, but **Type 3 cases exist** — no cropping, filtering, compositing, or resizing that constitutes "변경" is allowed on Type 3 assets
- Implementation constraint: store `cpyrhtDivCd` per image record and branch render logic:
  - `Type1` → display with attribution; thumbnailing/resizing permitted
  - `Type3` → display with attribution; **no crop / filter / watermark overlay / AI-generated augmentation** on the image itself
- KTO copyright policy: https://knto.or.kr/helpdeskCopyrightguide

### 1.3 Most-Restrictive License Wins on Combined Data

When datasets with different KOGL types are joined into a single output, the entire combined output inherits the most restrictive type:
- KTO Type 1 + 기상청 Type 1 → Type 1 for combined output (both attributions required)
- Any single Type 2 dataset in the combination → entire combined output becomes **non-commercial**
- Any single Type 3 dataset in the combination → entire combined output becomes **no-derivative**

**Checklist for each dataset used**: open the dataset detail page on data.go.kr → verify the "라이선스" field before ingesting.

### 1.4 `cpyrhtDivCd` Field Handling

This field is returned in TourAPI image responses (e.g., in the `detailImage` and `detailCommon` endpoints). Known observed values: `"Type1"`, `"Type3"`. Store the value in the Supabase `images` table and apply the branching policy above at render time. Do not assume all images are Type 1.

### 1.5 Attribution Format (mandatory on all pages using KTO data)

```
출처: 한국관광공사 TourAPI (https://api.visitkorea.or.kr/)
공공누리 제1유형 (출처표시) 조건에 따라 이용
```

Must appear in: site footer, `/about` or data-credits page, and inline with any image that has a photographer credit in the API response.

Required attribution fields per KOGL standard:
1. 저작물의 명칭 (content title or dataset name)
2. 저작물 작성 공공기관명 (한국관광공사)
3. 저작물의 작성자 성명 (if exposed in API response)
4. 공공기관의 홈페이지 URL (https://api.visitkorea.or.kr/)
5. 공공누리 유형 표시

---

## 2. KWCAG 2.2 — Accessibility Structure and Implementation Checkpoints

### 2.1 Structure

- Standard: **KWCAG 2.2** (Korean Web Content Accessibility Guidelines 2.2)
- National standard identifier: **KS X 6308** series (TTAK.OT-10.0003/R3)
- Primary source: https://a11ykr.github.io/kwcag22/
- **4 Principles → 14 Guidelines → 33 Checkpoints**
- Legal basis: 디지털포용법 §21 + 시행령 §20; 장차법 §20–21

| Principle | Korean | Guidelines | Core Focus |
|-----------|--------|------------|------------|
| **Perceivable** | 인식의 용이성 | 5 | alt text, captions, color independence, contrast ≥ 4.5:1 (large text 3:1) |
| **Operable** | 운용의 용이성 | 4 | keyboard access, timing, flash/flicker, navigation |
| **Understandable** | 이해의 용이성 | 3 | readability, predictability, input assistance |
| **Robust** | 견고성 | 2 | valid markup, WAI-ARIA |

### 2.2 Implementation-Critical Checkpoints (subset affecting dev directly)

#### 2.2.1 Contrast — Checkpoint 1.3.2
- Normal text: **≥ 4.5:1** against background
- Large text (18pt / 14pt bold): **≥ 3:1**
- Apply via Tailwind custom color palette; validate with axe-core in CI

#### 2.2.2 Flash/Flicker — Checkpoint 2.3.1 (광과민성 발작 방지)
- Content that flashes **between 3 Hz and 50 Hz** is prohibited
- Heritage animation or audio-guide waveform visualizations must stay below 3 flashes/second

#### 2.2.3 `aria-live` — Checkpoint 4.1.2 (웹 애플리케이션 접근성)
- Dynamic route changes in Next.js App Router **must announce the new page title** to screen readers
- Pattern: `<div aria-live="polite" aria-atomic="true">` updated on `router.events` (or `usePathname` side-effect)
- Required on: AI-course generation results, filter/search result count updates, map marker selection panels

#### 2.2.4 Focus Management — Checkpoint 2.1.1 + 4.1.2
- All interactive elements reachable and operable via keyboard Tab/Enter/Space/Esc
- Modal dialogs: focus must trap inside; on close, return to trigger element
- Map component: keyboard arrow key navigation for markers; accessible popups via `role="dialog"`
- Skip navigation link: `<a href="#main-content">` as first focusable element on every page (Checkpoint 2.4.1)

#### 2.2.5 Reduce-Motion — Checkpoint 2.2.2 + 2.3.1
- Respect `prefers-reduced-motion` CSS media query
- Route transition animations, parallax, auto-playing heritage video loops → disable or offer pause control
- WCAG SC 2.3.1 cross-mapped: barrier-free app specifically targets users with motion sensitivity and vestibular disorders — this is high-priority given the target audience (장애인, 고령자)

#### 2.2.6 Predictability — Guideline 3.2 (예측 가능성), Checkpoint 3.2.1
- "사용자 요구에 따른 실행": UI state changes (filter toggles, map zoom, course generation) must only occur on explicit user action — not on focus, hover, or automatic timers without user consent
- Auto-play audio guide must have a visible **정지** control (Checkpoint 2.2.2)

#### 2.2.7 Other Mandatory Checkpoints
- `lang` attribute on `<html>`: Checkpoint 3.1.1 — set `lang="ko"` by default; for multilingual content, set on the containing element (`lang="en"` etc.)
- Form labels: Checkpoint 3.3.2 — every `<input>` must have an associated `<label>` or `aria-label`
- Page title: Checkpoint 2.4.2 — unique `<title>` per route; use Next.js `metadata` export
- Markup validity: Checkpoint 4.1.1 — run HTMLHint or similar in CI

### 2.3 Mobile App Accessibility (if native app built later)
- Standard: **모바일 애플리케이션 콘텐츠 접근성 지침 2.0** (KS X 3253)
- Touch target: ≥ 44 × 44 pt
- TalkBack (Android) / VoiceOver (iOS) compatibility
- Dynamic font size support

### 2.4 Accessibility Certification Bodies

| Body | URL | Mark validity |
|------|-----|---------------|
| **한국정보접근성인증평가원 (WA)** | https://www.wa.or.kr/ | 1 year |
| **한국디지털접근성진흥원 (KWACC)** | http://www.kwacc.or.kr/ | 1 year |

Certification is labeled "정보통신접근성 품질인증마크". Annual re-certification required. Both bodies evaluate against KWCAG 2.2 (web) and KS X 3253 (mobile). Fees and timelines vary by product complexity — plan 4–8 weeks for evaluation. The 모두의 백제 project targets barrier-free tourism; voluntary certification strengthens the scoring rubric "접근성" dimension.

---

## 3. 위치정보법 §9의2 — LBS Business Registration

### 3.1 Obligation

The app uses GPS/location for nearby barrier-free POI recommendations → **위치기반서비스사업자** status applies.

- **법령**: 위치정보의 보호 및 이용 등에 관한 법률 §9 (and §9의2 for amendments)
- **Regulatory body**: 방송통신위원회 (방통위, KCC)
- **Registration portal**: https://www.lbsc.kr/front/content/contentViewer.do?contentId=CONTENT_0000081
- **Gov24 link**: https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A09001&CappBizCD=15701000085

### 3.2 Who Must Register

| Category | Definition | Registration |
|----------|------------|--------------|
| 위치정보사업자 | Collects and provides location data (telecom carrier, OS vendor) | 방통위 **허가** |
| **위치기반서비스사업자** | Provides services _using_ location data | 방통위 **신고** ← applies to this app |

소상공인 exemption: direct revenue < 50억 over prior 3 years may qualify — confirm against 위치정보법 시행령 before service launch.

### 3.3 Filing Documents

1. 사업계획서 (사업자 현황, 사업 내용)
2. 사업용 주요설비 내용 및 설치 장소 확인 서류
3. 위치정보 보호조치 증명 서류 (위치정보법 §16)

### 3.4 Core Obligations Post-Registration

| Article | Obligation | Implementation |
|---------|------------|----------------|
| §15 | Prior consent + terms before collecting personal location data | Location permission dialog; terms must list purpose, retention, right to refuse |
| §16 | Technical and managerial protective measures | Encrypt location at rest; access control; audit log |
| §18 | Consent: purpose, retention period, right to refuse | Separate consent UI from PIPA consent |
| §19 | Third-party provision: prior consent + notification | If passing GPS coords to Kakao/Naver Maps API, disclose in privacy policy |
| §21 | Retain usage/provision records ≥ **6 months** | Log table in Supabase with 6-month TTL |
| §23 | **Immediate destruction** of personal location data after purpose achieved | Do not persist raw GPS coordinates in user profile; process and discard |
| §40 | Fine up to 3,000만원 | — |

**2024 amendment key changes**:
- 과징금 신설 (non-consensual collection now attracts fine, not only criminal penalty)
- Personal location data destruction must now include **복구·재생 방지 조치** (secure wipe, not just delete flag)
- 미파기 형사처벌 신설

---

## 4. PIPA 2024 Enforcement Enhancements

### 4.1 Effective Dates
- 2023-09-15: Rights strengthening, processing policy assessment regime, penalty increases
- 2024-03-12: Enforcement regulation amendment
- **2024-09-15**: 안전성 확보조치 기준 강화 (strengthened security standards) — **currently in force**
- Source: https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000265956

### 4.2 TLS and Encryption Obligations (§29 + 안전성 확보조치 기준 고시)

All processors (all sizes) must:
- Encrypt personal data **at rest and in transit** (TLS required for all endpoints)
- Passwords: one-way hash (bcrypt/Argon2) — plaintext or reversible encryption is a violation
- Access log retention: **1 year** (2 years if processing sensitive/unique ID data for > 50,000 subjects)
- Access log review: **monthly minimum**
- Principle of least privilege: record grant/change/revoke actions for 5 years

Vercel + Supabase (Seoul region) default to TLS — confirm all Supabase RLS policies and service-role key usage comply.

### 4.3 Retention Limits

- Collect only for the stated purpose; destroy when purpose is achieved
- Define and publish in privacy policy: per-category retention periods (account data, location, usage logs, AI interaction logs)
- No "keep indefinitely until user deletes" — must set a concrete term

### 4.4 Consent Separation (§22)

Each of the following requires a **separate checkbox** with independent toggle — bundling is a §22 violation:

1. 개인정보 수집·이용 (purpose, items, retention, refusal right) — **required**
2. 제3자 제공 (recipient, purpose, items, retention) — **required if applicable**
3. 마케팅/광고 활용 — **optional, must not gate service**
4. **위치정보 수집·이용** (separate under 위치정보법 §18) — **required if GPS used**
5. 민감정보 (none expected in this app's core scope)

### 4.5 Data Subject Rights (all services)

Must provide a mechanism for: 열람 (§35), 정정·삭제 (§36), 처리정지 (§37). For a Next.js app, implement a `/account/data` page with self-service export + deletion request.

### 4.6 Overseas Transfer (§28의8) — Vercel/Supabase Seoul

- Supabase **Seoul region** (ap-northeast-2): data stays in Korea → no overseas transfer triggered for Supabase storage
- Vercel edge functions may route through non-Seoul PoPs → if any personal data is processed at edge, disclose in privacy policy: transfer country, Vercel Inc. as recipient, data items, retention
- Any non-Seoul S3 bucket, CDN, or analytics SDK triggers §28의8 disclosure obligation

### 4.7 Penalties

- Administrative fine: up to **3% of total revenue**
- Per-subject statutory damages: up to **3,000만원** (§39)
- Criminal: up to 5 years imprisonment or 50,000,000 KRW fine for unconsented collection/use

---

## 5. AI 기본법 — Effective 2026-01-22

### 5.1 Law

- 정식 명칭: **인공지능 발전과 신뢰 기반 조성 등에 관한 기본법** (AI 기본법)
- 제정: 2025-01-21 / **시행: 2026-01-22** (already in force as of 2026-06-13)
- Source: https://www.law.go.kr/lsInfoP.do?lsiSeq=268543
- Fine for violation: up to 3,000만원; enforcement grace period estimated until 2027

### 5.2 Transparency / AI-Generated Content Labeling Obligation (§31)

Any output generated by generative AI (text, image, audio, video) must be **clearly disclosed** to the user. This directly affects all three AI-generated content types planned in 모두의 백제:

| Feature | Required Label |
|---------|---------------|
| AI-narrated audio guide (TTS from KTO story data) | **"AI 음성 안내"** label on the audio player UI |
| AI-translated descriptions (e.g., EN/JA/ZH output from LLM) | **"AI 번역"** label adjacent to translated text |
| AI-generated course itineraries (LLM-assembled from TourAPI POIs) | **"AI 생성 코스"** label on the course card/header |

Implementation: add a small `<Badge>` or `aria-label`-equipped icon next to each AI-generated element. Screen-reader users must also receive the disclosure (do not hide it in CSS-only tooltip).

### 5.3 Additional AI Obligations

- **Hallucination disclosure**: inform users that AI results may contain errors, especially for operational details (opening hours, admission fees) that change frequently
- **Training data source**: if KOGL Type 1 data is used for fine-tuning or RAG, record the fact and publish in the app's data-credits section
- **User input**: if user-provided text is sent to an LLM, declare in privacy policy whether it is used for model improvement

### 5.4 High-Impact AI Exclusion

The app's AI scope (tourist course recommendation, audio guide, translation) does not fall under "고영향 AI" categories (의료/금융/공공/교통/에너지/채용) — no AI impact assessment obligation under current text.

---

## 6. Tourism Business Law — Scope Applicable to This App

The app provides **information + recommendation** only, with no direct booking, payment processing, or travel-package sales at launch. Under this scope:

| Act | Obligation | Status for this app |
|-----|------------|---------------------|
| 관광진흥법 §3 (여행업 등록) | Required only for direct trip sales + fee collection | **Not required** — information service only |
| 전자상거래법 §12 (통신판매업 신고) | Required if ≥ 50 transactions/year or taxable revenue | **Likely exempt** during contest/MVP phase |
| 전자상거래법 §20 (통신판매중개자 책임) | If external booking links are added | Add "우리는 통신판매중개자가 아닙니다" disclaimer if deep-linking to external OTAs |

**If direct booking or payment is added post-MVP**, the following become mandatory:
- 통신판매업 신고 at 지자체 (Gov24)
- 청약철회 policy (7-day right for digital goods has exceptions)
- 여행업 등록 (if packaging tours with fee)

---

## 7. Implementation Checklist — Pre-Launch Legal Gates

### 7.1 License / Attribution
- [ ] `cpyrhtDivCd` stored per image in DB; Type3 images: no crop/filter/composite
- [ ] Attribution footer present on all pages using TourAPI data (Type 1 standard text)
- [ ] Separate attribution entry for each additional dataset with its KOGL type
- [ ] AI-generated content (audio, translation, course) labeled per AI 기본법 §31
- [ ] Data-credits page listing all source datasets and their KOGL types

### 7.2 Privacy / Security
- [ ] 개인정보 처리방침 with all 13 required items (§30) — published before first user interaction
- [ ] Consent UI: separate checkboxes for 수집·이용 / 제3자 제공 / 위치 / 마케팅
- [ ] TLS enforced on all endpoints (Vercel default — confirm no HTTP fallback)
- [ ] Passwords hashed (bcrypt/Argon2 — use Supabase Auth defaults)
- [ ] Access logs retained ≥ 1 year; reviewed monthly
- [ ] Raw GPS coordinates not persisted after proximity query; destroyed immediately

### 7.3 Location (위치정보법)
- [ ] 위치기반서비스사업자 신고 filed at 방통위 before public launch
- [ ] Location usage/provision log retained ≥ 6 months (separate from PIPA access log)
- [ ] Location consent UI separate from PIPA consent
- [ ] 위치정보 보호책임자 designated

### 7.4 Accessibility (KWCAG 2.2)
- [ ] Contrast ≥ 4.5:1 on all text elements (verify with axe-core)
- [ ] `aria-live="polite"` region for AI course generation status updates
- [ ] Focus trap in all modals; focus return on close
- [ ] Skip-to-main link as first focusable element
- [ ] Unique page `<title>` per route via Next.js `metadata`
- [ ] `lang="ko"` on `<html>`; per-element override for multilingual content
- [ ] All `<input>` elements have `<label>` or `aria-label`
- [ ] Flash/flicker < 3 Hz (Checkpoint 2.3.1)
- [ ] `prefers-reduced-motion` respected for transitions and auto-play
- [ ] Audio guide has visible pause/stop control (Checkpoint 2.2.2)
- [ ] All interactive elements keyboard-accessible

### 7.5 AI Content Labels
- [ ] `"AI 음성 안내"` badge on TTS audio player
- [ ] `"AI 번역"` badge adjacent to LLM-translated text
- [ ] `"AI 생성 코스"` badge on generated itinerary cards
- [ ] Hallucination disclaimer on AI course and recommendation screens

---

## 8. Canonical Source References

| Topic | Document / URL |
|-------|----------------|
| KOGL types | https://www.kogl.or.kr/info/license.do |
| KTO copyright policy | https://knto.or.kr/helpdeskCopyrightguide |
| KWCAG 2.2 full text | https://a11ykr.github.io/kwcag22/ |
| WA certification | https://www.wa.or.kr/ |
| KWACC certification | http://www.kwacc.or.kr/Accessibility/Certification |
| 위치정보법 full text | https://www.law.go.kr/법령/위치정보의보호및이용등에관한법률 |
| LBS 신고 (LBSC) | https://www.lbsc.kr/ |
| 위치정보법 2024 개정 해설 | https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=24893 |
| PIPA full text | https://www.law.go.kr/lsEfInfoP.do?lsiSeq=195062 |
| 안전성 확보조치 기준 | https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000265956 |
| 개인정보 국외이전 규정 | https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulSeq=2100000230332 |
| AI 기본법 full text | https://www.law.go.kr/lsInfoP.do?lsiSeq=268543 |
| 처리방침 작성지침 (2025-04) | https://www.privacy.go.kr/front/bbs/bbsView.do?bbsNo=BBSMSTR_000000000049&bbscttNo=20806 |
