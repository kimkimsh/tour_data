# 06 F2 Odii 4채널 도슨트 — 구현 기획서

> 본 문서는 SPEC §8(F2) + 제안서 §F2를 구체화한다. SPEC과 모순 시 SPEC 우선.
> 참조: `D1_kto_api.md` (Odii API), `R3_docgen_assets.md` (점자/수어/에셋), SPEC §10 (KWCAG/법적)

---

## 0. F2 한 줄 정의

> **현장 도착 순간부터 퇴장까지, 음성·자막·점자·수어 4채널을 ko/en/ja/zh-CN 4개 언어 × 어린이/어른/쉬운글 3모드로 출력하는 백제 유산 도슨트** — 지도 탭으로 수동 트리거; 모든 Odii 미커버 구간은 국가유산청 원문 → 사전 생성 TTS로 100% 커버. **4채널 전체(점자·수어 포함)는 공산성·부소산성 데모 페어에서만 MVP 심층 구현**; 외국어(en/ja/zh-CN)는 음성·자막 한정 (§1.2 커버리지 스코핑 참조).

---

## 1. 기능 범위 (MVP)

### 1.1 커버리지 행렬

| POI | Odii 커버 (확인 필요) | 수어 영상 | 비고 |
|---|:---:|:---:|---|
| 공산성 (史 477) | TBD (build-time probe) | **MVP 데모 포함** | 데모-priority pair |
| 무령왕릉과 왕릉원 (史 13) | TBD | 발전방향 | |
| 국립공주박물관 | TBD | 발전방향 | |
| 부소산성 (史 5) | TBD | **MVP 데모 포함** | 데모-priority pair |
| 정림사지+박물관 (史 301) | TBD | 발전방향 | |
| 국립부여박물관 | TBD | 발전방향 | |

> **verify-at-build-time gate:** `Odii/storyLocationBasedList` × 6 POI 좌표 × 4 langCode probe를 C2 ETL 1차 배포 시 실행하여 `docent_assets` 테이블 `odii_coverage` 필드에 `true|false` 저장. false → 폴백 파이프라인 자동 활성.

### 1.2 채널 × 언어 행렬 (커버리지 스코핑)

> **커버리지 스코핑 (SPEC §13.2):** 4채널(음성·자막·점자·수어) 심층 구현은 **공산성·부소산성 데모 페어에만 적용**한다. 나머지 4 POI는 음성+자막 기본 세트만 MVP 범위로 한다. 외국어(en/ja/zh-CN)는 음성·자막만 제공하며, 점자는 한국어(`ko`)에만, 수어는 한국수어(KSL)만 MVP 대상이다 — 외국어 점자·수어는 발전방향.

#### 채널 × 언어 (공산성·부소산성 — 데모 페어, 심층)

| 채널 | ko | en | ja | zh-CN |
|---|:---:|:---:|:---:|:---:|
| 음성 (MP3) | Odii 원음 + TTS 폴백 | Odii + TTS 폴백 | Odii + TTS 폴백 | Odii + TTS 폴백 |
| 자막 (transcript) | ✅ | ✅ | ✅ | ✅ |
| 점자 호환 텍스트 | ✅ (한국점자) | 발전방향 | 발전방향 | 발전방향 |
| 수어 영상 (MP4) | ✅ MVP | 발전방향 | 발전방향 | 발전방향 |

#### 채널 × 언어 (나머지 4 POI — 기본 세트)

| 채널 | ko | en | ja | zh-CN |
|---|:---:|:---:|:---:|:---:|
| 음성 (MP3) | Odii 원음 + TTS 폴백 | Odii + TTS 폴백 | Odii + TTS 폴백 | Odii + TTS 폴백 |
| 자막 (transcript) | ✅ | ✅ | ✅ | ✅ |
| 점자 호환 텍스트 | 발전방향 | 발전방향 | 발전방향 | 발전방향 |
| 수어 영상 (MP4) | 발전방향 | 발전방향 | 발전방향 | 발전방향 |

### 1.3 모드 × 페르소나 매핑

| 모드 | 1차 대상 페르소나 | 어휘 기준 | 문장 길이 |
|---|---|---|---|
| **어린이** | P3 가족·자녀 (초등 저학년) | 초등 3학년 수준 어휘 | ≤ 2문장/단락 |
| **어른** | P1a/P1b, P2a/P2b, P4 단체 인솔 | 전문 역사 해설 어휘 | 제한 없음 |
| **쉬운글** | P3 인지·발달·자폐 옵션 / P1b 시니어 인지저하 | 7세 어휘, 능동태, 추상어 X | ≤ 1문장/단락, 픽토그램 보조 |

---

## 2. 데이터 모델

### 2.1 `docent_stories` 테이블

```sql
CREATE TABLE docent_stories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poi_id       uuid NOT NULL REFERENCES pois(id),
  locale       text NOT NULL CHECK (locale IN ('ko','en','ja','zh-CN')),
  mode         text NOT NULL CHECK (mode IN ('child','adult','easy')),
  seq          smallint NOT NULL,         -- 스토리 내 순서
  title        text NOT NULL,
  body         text NOT NULL,             -- transcript 원문
  source       text NOT NULL,             -- 'odii' | 'heritage_office' | 'manual'
  odii_story_id text,                     -- Odii API의 고유 story id (null → 비-Odii)
  verified_at  timestamptz,
  published_at timestamptz,
  UNIQUE (poi_id, locale, mode, seq)
);
```

### 2.2 `docent_assets` 테이블

```sql
CREATE TABLE docent_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        uuid NOT NULL REFERENCES docent_stories(id),
  channel         text NOT NULL CHECK (channel IN ('audio','transcript','braille','sign_video')),
  locale          text NOT NULL CHECK (locale IN ('ko','en','ja','zh-CN')),
  storage_path    text,                   -- Supabase Storage object path
  public_url      text,                   -- CDN URL (non-null when published)
  mime_type       text,                   -- 'audio/mpeg' | 'text/plain' | 'video/mp4'
  duration_ms     int,                    -- 음성/수어 영상 길이(ms)
  tts_provider    text,                   -- 'clova' | 'elevenlabs' | 'odii_native' | null
  license_code    text NOT NULL,          -- KOGL 유형 또는 자체 제작 명시
  attribution     text,                   -- 저작권자 표기 문자열
  odii_coverage   boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX ON docent_assets (story_id, channel, locale);
```

### 2.3 `docent_sign_items` 테이블 (수어 에셋 개별 관리)

```sql
CREATE TABLE docent_sign_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        uuid NOT NULL REFERENCES docent_stories(id),
  keyword         text NOT NULL,          -- 수어 단어/어구
  source          text NOT NULL CHECK (source IN ('korean_sign_dict','danoorim','self_produced')),
  source_url      text,                   -- 국립국어원 사전 딥링크 or 다누림 URL
  kogl_type       text,                   -- 공공누리 유형 (e.g. '제1유형', '제4유형')
  license_verified boolean NOT NULL DEFAULT false,
  asset_id        uuid REFERENCES docent_assets(id),
  notes           text
);
```

### 2.4 RLS 정책

```sql
-- docent_stories: published + public
ALTER TABLE docent_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published" ON docent_stories
  FOR SELECT USING (published_at IS NOT NULL);

-- docent_assets: public read
ALTER TABLE docent_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON docent_assets
  FOR SELECT USING (public_url IS NOT NULL);

-- sign_items: public read (license_verified 여부와 무관하게 select; display 시 license_verified 체크)
ALTER TABLE docent_sign_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON docent_sign_items FOR SELECT USING (true);
```

### 2.5 Storage 버킷 구조

```
docent-assets/                       # public bucket (read)
  {poi_id}/
    {locale}/
      {mode}/
        audio_{seq}.mp3              # TTS 또는 Odii 캐시
        sign_{seq}.mp4               # 수어 영상
```

---

## 3. Odii API 통합

### 3.1 `storyLocationBasedList` 파라미터

```typescript
// packages/kto-client/src/odii.ts

interface OdiiLocationRequest {
  serviceKey: string;        // 서버사이드 전용 — Edge에 노출 금지
  MobileOS: 'ETC';
  MobileApp: 'ModuBaekje';
  langCode: 'ko' | 'en' | 'ja' | 'zh-CN';
  xCoord: number;            // WGS84 경도 (mapX 아님)
  yCoord: number;            // WGS84 위도 (mapY 아님)
  radius: number;            // 단위: 미터; MVP 기본값 500
  pageNo?: number;
  numOfRows?: number;
}

interface OdiiStoryItem {
  storyid: string;
  title: string;
  overview: string;
  audioUrl?: string;
  langCode: string;
  themeNm?: string;
  mapx?: string;
  mapy?: string;
}

type OdiiLocationResponse = KtoApiResponse<OdiiStoryItem>;

function fetchOdiiStories(req: OdiiLocationRequest): Promise<OdiiLocationResponse>;
```

> `xCoord`/`yCoord` 파라미터명은 Odii 서비스 고유값 — 다른 KTO 서비스의 `mapX`/`mapY`와 다름 (D1 §4 확인).

### 3.2 POI 좌표 테이블 (ETL bootstrap 시 seed)

| POI | xCoord (경도) | yCoord (위도) | ETL radius |
|---|---|---|---|
| 공산성 | 127.1247 | 36.4654 | 500m |
| 무령왕릉과 왕릉원 | 127.1217 | 36.4592 | 300m |
| 국립공주박물관 | 127.1282 | 36.4548 | 200m |
| 부소산성 | 126.9060 | 36.2765 | 500m |
| 정림사지 | 126.9193 | 36.2728 | 300m |
| 국립부여박물관 | 126.9178 | 36.2694 | 200m |

> 좌표는 KTO `detailCommon2` `mapx`/`mapy` 값에서 추출. ETL 시 실제 응답값으로 대체.

### 3.3 ETL 흐름 (GitHub Actions `kto-etl.yml`)

```
1. probe_odii_coverage
   └─ 6 POI × 4 langCode → storyLocationBasedList
   └─ 응답 storyid 목록 → docent_assets.odii_coverage = true|false

2. fetch_odii_stories
   └─ coverage = true → storyid별 storyBasedList 상세 호출
   └─ body(overview) → docent_stories (source='odii') INSERT
   └─ audioUrl 존재 → Storage 복사 → docent_assets (channel='audio', tts_provider='odii_native')

3. fallback_pipeline (coverage = false 또는 audioUrl 없음)
   └─ 국가유산청 원문 조회 → docent_stories (source='heritage_office') INSERT
   └─ TTS 파이프라인 실행 (§4)

4. braille_pipeline
   └─ docent_stories.body → braillify WASM → UTF-8 점자 텍스트
   └─ Storage upload → docent_assets (channel='braille')

5. publish_txn
   └─ dataset_versions INSERT → docent_stories.published_at SET
```

### 3.4 Odii 미커버 폴백 데이터 소스

| 소스 | 호출 방법 | 사용 조건 |
|---|---|---|
| 국가유산청 OpenAPI | `cha.go.kr/openapi` 지정문화재 현황 | Odii 미커버 어른 모드 원문 |
| 국가유산청 어린이 학습 | 어린이 학습 콘텐츠 API | Odii 미커버 어린이 모드 |
| 수동 큐레이션 (`content/docent/`) | 콘텐츠 패키지 Zod 스키마 | 쉬운글 모드 (자동 추출 불가) |

---

## 4. TTS 파이프라인

### 4.1 공급자 선택

| 공급자 | 사용 조건 | 언어 | 비고 |
|---|---|---|---|
| **CLOVA Voice** (Naver) | ko 1차 | ko | `AI 음성 안내` 배지 필수 |
| **ElevenLabs** | en/ja/zh-CN | en, ja, zh-CN | API 키 서버사이드 격리 |
| Odii 원음 | Odii 커버 + audioUrl 있음 | ko/en/ja/zh-CN | TTS 아님, 배지 불필요 |

> AI 기본법 2026.1.22: CLOVA/ElevenLabs 생성 음성에는 `AI 음성 안내` 배지 화면 표시 + `<audio>` aria-label에 "AI 생성 음성" 포함 필수.

### 4.2 TTS 생성 API Route

```typescript
// apps/web/src/app/api/docent/tts/route.ts
// 서버 전용 Node runtime — Edge 불가 (API 키 격리)

interface TtsGenerateRequest {
  storyId: string;
  locale: 'ko' | 'en' | 'ja' | 'zh-CN';
  mode: 'child' | 'adult' | 'easy';
}

interface TtsGenerateResponse {
  storagePath: string;
  publicUrl: string;
  durationMs: number;
  provider: 'clova' | 'elevenlabs';
}

// POST /api/docent/tts — ETL GitHub Actions에서만 호출 (HMAC 인증)
export async function POST(req: Request): Promise<Response>;
```

### 4.3 음성 파일 사양

| 항목 | 값 |
|---|---|
| 포맷 | MP3 (audio/mpeg) |
| 샘플레이트 | 22,050 Hz |
| 비트레이트 | 64 kbps (모바일 대역폭 고려) |
| 명명 규칙 | `{poi_id}/{locale}/{mode}/audio_{seq}.mp3` |
| 최대 길이 | 어린이/쉬운글 ≤ 90초, 어른 ≤ 180초 |

---

## 5. 점자 텍스트 파이프라인

### 5.1 `braillify` 통합

```typescript
// packages/etl/src/braille.ts

import { braillify } from 'braillify';  // Apache-2.0, WASM, 2024 개정 한국점자규정

interface BrailleOutput {
  unicodeText: string;   // UTF-8 점자 문자열 (U+2800–U+28FF) — 화면 표시용
  brfText: string;       // Braille ASCII, 40cells×25lines, FF 삽입 — .brf 다운로드용
}

function generateBraille(koreanText: string): BrailleOutput;
```

### 5.2 .brf 생성 규칙 (R3 §3.2 기반)

```typescript
// packages/etl/src/braille.ts

const BRF_CELLS_PER_LINE = 40;
const BRF_LINES_PER_PAGE = 25;
const BRF_FORM_FEED = '\x0C';

function toBrfFormat(unicodeText: string): string {
  // 1. 유니코드 점자 → Braille ASCII (U+2800 offset 매핑)
  // 2. 줄바꿈: 40 cells 초과 시 강제 개행
  // 3. 페이지 나눔: 25 lines → Form Feed(0x0C) 삽입
  // 4. 인코딩: ASCII (BRF = Plain ASCII + CR/LF/FF)
}
```

### 5.3 Storage 저장

```
docent-assets/{poi_id}/{locale}/braille_{mode}.txt   # UTF-8 유니코드 점자 (화면/스크린리더용)
docent-assets/{poi_id}/{locale}/braille_{mode}.brf   # Braille ASCII 40×25 (임베서용)
```

> 화면의 `DocentPlayer`는 `braille.txt`를 `<pre>` 태그 + `aria-label="점자 텍스트"` 로 표시. `.brf` 는 다운로드 버튼으로만 제공.

---

## 6. 수어 영상 (수어 채널)

### 6.1 MVP 범위

- **대상 POI:** 공산성, 부소산성 (데모-priority pair)
- **언어:** 한국수어 (KSL) 전용; 외국어 수어는 발전방향
- **콘텐츠 단위:** 각 POI 어른 모드 핵심 키워드 10~15어구 (단어 단위 수어 영상 조합)

### 6.2 출처 및 라이선스 처리

| 출처 | 포함 여부 | 라이선스 | 처리 방침 |
|---|---|---|---|
| 국립국어원 한국수어사전 (`sldict.korean.go.kr`) | 1차 | 공공누리 유형별 상이 — **콘텐츠마다 개별 확인 필수** | 직접 다운로드 대신 딥링크/임베드 우선; 다운로드 시 유형 저장 후 표시 |
| 서울관광재단 다누림 (`daanoorimnuri.kr`) | 보조 | 협력 확인 필요 | 콘텐츠 사용 전 서면 협력 확약 |
| 자체 제작 | 예외적 | 자체 저작권 | 비용·일정 감안, 국립국어원 우선 |

### 6.3 수어 아이템 라이선스 체크 워크플로우

```
ETL sign_pipeline:
  1. docent_sign_items에 keyword, source, source_url 등록
  2. license_verified = false 초기값
  3. 관리자 /admin/sign-license 화면에서 수동 확인 후 license_verified = true 설정
  4. DocentPlayer는 license_verified = true 인 수어만 표시
  5. license_verified = false 아이템 → 수어 채널 탭 비활성 + "검토 중" 안내
```

### 6.4 수어 영상 파일 사양

| 항목 | 값 |
|---|---|
| 포맷 | MP4 (H.264, video/mp4) |
| 해상도 | 480×270 (모바일 최적) |
| 배경 | 단색 (고대비 — KWCAG 1.4.3) |
| 명명 규칙 | `{poi_id}/sign/{keyword_slug}.mp4` |
| 최대 크기 | 10MB/파일 |

---

## 7. 트리거 + 폴백 (SPEC §13.2)

> **MVP 트리거: 지도 탭(map-tap) 단독.** 지오펜스(GPS 반경 자동 진입) 트리거는 MVP에서 제거되었다 — 방통위 위치기반서비스 신고 + 실사용 검증 이후 발전방향으로 구현한다. 아래 §7.2는 발전방향 설계 메모로 보존한다.

### 7.1 지도 탭 트리거 (MVP — 단독 트리거)

```typescript
// apps/web/src/features/f2-docent/components/DocentMapTrigger.tsx

// MVP 유일 트리거: 지도(Kakao Map embed)에서 POI 탭 → DocentPlayer 수동 시작
// "지도에서 유적지를 탭하면 도슨트를 시작합니다" 안내 문구
// GPS/위치 권한을 요청하지 않음 — 방통위 신고 불필요
interface DocentMapTriggerProps {
  pois: Array<{ poiId: string; lat: number; lng: number; title: string }>;
  locale: Locale;
  mode: DocentMode;
  onPoiSelect: (poiId: string) => void;
}
```

### 7.2 지오펜스 자동 트리거 (발전방향)

> GPS 반경 자동 진입 트리거는 MVP 범위 밖이다 (SPEC §13.2). 발전방향 구현 시 아래 동의·설계 포인트를 반드시 적용한다.

**발전방향 동의 설계 (위치정보법 제9조의2):**
- 방통위 위치기반서비스 신고 완료 이후에만 GPS 취득 시작.
- 최초 F2 진입 시 `ConsentGate` 모달: "반경 {radius}m 내 백제 유적 진입 시 도슨트가 자동 시작됩니다. 위치 정보는 서버에 저장되지 않습니다."
- 동의 거부 → §7.1 지도 탭 모드 유지; GPS 미취득.
- GPS 좌표는 클라이언트 메모리 한정 — 서버 전송·IndexedDB 저장 금지.
- 동의 기록: IndexedDB `docent_location_consent = true`.

---

## 8. `DocentPlayer` 컴포넌트

### 8.1 컴포넌트 트리

```
DocentPlayer
├── DocentHeader
│   ├── PoiTitle (h2)
│   ├── ModeSelector (어린이 | 어른 | 쉬운글)
│   ├── LocaleSelector (ko | en | ja | zh-CN)
│   └── AiBadge ("AI 음성 안내" — TTS 시 표시; Odii 원음 시 비표시)
├── ChannelTabs
│   ├── AudioTab (음성)
│   ├── TranscriptTab (자막)
│   ├── BrailleTab (점자 — ko × 공산성·부소산성만 활성; 기타 POI/외국어 비활성)
│   └── SignTab (수어 — ko × 공산성·부소산성만 활성; 외국어·기타 POI 비활성)
├── DocentAudioPlayer (AudioTab 활성 시)
│   ├── <audio> (preload="metadata", aria-label)
│   ├── PlayPauseButton
│   ├── VolumeSlider (0–100, aria-valuemin/max/now)
│   ├── ProgressBar (aria-valuenow, aria-valuetext)
│   └── TranscriptHighlight (음성 재생 구간 동기 강조)
├── DocentTranscript (항상 표시 — 음성 재생 중에도)
│   └── <section aria-live="polite" aria-atomic="false">
│       └── 문단별 <p> (현재 재생 구간 aria-current="true")
├── DocentBraille
│   ├── <pre aria-label="점자 텍스트">{unicodeText}</pre>
│   └── DownloadButton (.brf, .txt)
└── DocentSign (SignTab 활성 시)
    ├── <video> (자동재생X; 재생 버튼 명시)
    ├── SignKeywordList (어구 목록, 탭으로 이동)
    └── AttributionNotice (출처 표기)
```

### 8.2 TypeScript 인터페이스

```typescript
// apps/web/src/features/f2-docent/types.ts

type Locale = 'ko' | 'en' | 'ja' | 'zh-CN';
type DocentMode = 'child' | 'adult' | 'easy';
type DocentChannel = 'audio' | 'transcript' | 'braille' | 'sign';

interface DocentStory {
  id: string;
  poiId: string;
  locale: Locale;
  mode: DocentMode;
  seq: number;
  title: string;
  body: string;
  source: 'odii' | 'heritage_office' | 'manual';
}

interface DocentAsset {
  id: string;
  storyId: string;
  channel: DocentChannel;
  locale: Locale;
  publicUrl: string | null;
  mimeType: string;
  durationMs: number | null;
  ttsProvider: 'clova' | 'elevenlabs' | 'odii_native' | null;
  licenseCode: string;
  attribution: string;
  odiiCoverage: boolean;
}

interface DocentPlayerProps {
  poiId: string;
  initialLocale: Locale;
  initialMode: DocentMode;
  autoPlay: boolean;        // MVP에서는 항상 false (map-tap 수동 시작)
  onComplete?: () => void;
}
```

### 8.3 접근성 요구사항

| 항목 | 구현 방법 | KWCAG 2.2 검사항목 |
|---|---|---|
| 음성 자동재생 방지 | MVP는 map-tap 수동 시작(autoPlay=false); 발전방향 자동트리거 추가 시 `prefers-reduced-motion` + 음소거 default + 재생 버튼 초점 적용 필수 | 2.1.2 (방해 금지) |
| 스크린리더 도슨트 진입 알림 | `<div role="status" aria-live="polite">도슨트가 시작됩니다</div>` | 4.1.3 상태 메시지 |
| 현재 재생 구간 강조 | `aria-current="true"` 동적 이동 | 1.3.1 정보와 관계 |
| 자막 항상 표시 | `DocentTranscript`는 탭 전환 관계없이 DOM에 유지 | 1.2.2 자막 |
| 수어 영상 텍스트 대안 | `DocentTranscript` 동일 콘텐츠 | 1.2.6 수어 |
| 점자 텍스트 다운로드 | 키보드로 접근 가능한 버튼 | 1.1.1 비텍스트 콘텐츠 |
| 볼륨 슬라이더 | `role="slider"`, `aria-valuemin="0"` `aria-valuemax="100"` | 4.1.2 이름·역할·값 |
| 언어 변경 | `<html lang="">` 동적 변경 | 3.1.1 페이지 언어 |
| 초점 이동 | 채널 탭 전환 시 탭 패널로 초점 이동 | 2.4.3 초점 순서 |
| AI 배지 스크린리더 | `<span aria-label="AI가 생성한 음성입니다">AI 음성 안내</span>` | 1.1.1 비텍스트 |

### 8.4 DocentPlayer 상태 기계

```
IDLE
  └─[지도 탭]──────────────────► LOADING (스토리+에셋 fetch)
       └─[에셋 준비 완료]────────► READY
            ├─[재생 버튼]─────────► PLAYING
            │    ├─[일시정지]──────► PAUSED
            │    └─[종료]──────────► COMPLETED
            └─[채널/모드/언어 변경]─► LOADING (재fetch)
```

---

## 9. 서버 데이터 계층

### 9.1 RSC 데이터 로더

```typescript
// apps/web/src/features/f2-docent/loaders.ts (서버 전용)

import { unstable_cache } from 'next/cache';

interface DocentPageData {
  stories: DocentStory[];
  assets: DocentAsset[];
  signItems: DocentSignItem[];
}

// 공개 read-model — 로그인 불필요
const loadDocentData = unstable_cache(
  async (poiId: string, locale: Locale, mode: DocentMode): Promise<DocentPageData> => {
    // Supabase: docent_stories JOIN docent_assets WHERE published_at IS NOT NULL
  },
  ['docent-data'],
  { tags: ['docent', 'poi'], revalidate: 3600 }
);
```

### 9.2 API 라우트

| 경로 | 메서드 | 인증 | 용도 |
|---|---|---|---|
| `/api/docent/tts` | POST | HMAC (ETL 전용) | TTS 생성 및 Storage 업로드 |
| `/api/docent/braille` | POST | HMAC (ETL 전용) | 점자 텍스트 생성 |
| `/api/docent/sign-license` | POST | admin role | 수어 라이선스 확인 처리 |

---

## 10. 콘텐츠 Zod 스키마 (Content Package Contract)

```typescript
// packages/content-schema/src/docent.ts

import { z } from 'zod';

const DocentModeSchema = z.enum(['child', 'adult', 'easy']);
const LocaleSchema = z.enum(['ko', 'en', 'ja', 'zh-CN']);

const DocentStorySchema = z.object({
  poiId: z.string().uuid(),
  locale: LocaleSchema,
  mode: DocentModeSchema,
  seq: z.number().int().min(1),
  title: z.string().min(1),
  body: z.string().min(10),
  source: z.enum(['odii', 'heritage_office', 'manual']),
  odiiStoryId: z.string().optional(),
  verifiedBy: z.string(),
  verifiedAt: z.string().datetime(),
});

const DocentSignItemSchema = z.object({
  keyword: z.string().min(1),
  source: z.enum(['korean_sign_dict', 'danoorim', 'self_produced']),
  sourceUrl: z.string().url().optional(),
  koglType: z.string().optional(),
  licenseVerified: z.boolean(),
  notes: z.string().optional(),
});

const DocentPoiPackageSchema = z.object({
  poiId: z.string().uuid(),
  packageVersion: z.string(),
  stories: z.array(DocentStorySchema),
  signItems: z.array(DocentSignItemSchema).optional(),
});

export type DocentPoiPackage = z.infer<typeof DocentPoiPackageSchema>;
```

---

## 11. 페이지 라우팅

```
/[locale]/pois/[poiId]/docent
  └── page.tsx (RSC)
      ├── DocentMapTrigger (client) ── POI 탭 선택 (MVP 단독 트리거)
      └── DocentPlayer (client) ── 메인
```

> `ConsentGate` (위치 동의 모달)은 발전방향 지오펜스 구현 시 추가된다 (§7.2).

### 11.1 `generateStaticParams`

```typescript
// apps/web/src/app/[locale]/pois/[poiId]/docent/page.tsx

export async function generateStaticParams() {
  // 6 POI × 4 locale = 24 정적 경로
  return POI_IDS.flatMap(poiId =>
    LOCALES.map(locale => ({ locale, poiId }))
  );
}
```

---

## 12. 오프라인 지원 (PWA / Serwist)

```typescript
// apps/web/src/service-worker.ts (Serwist)

// 도슨트 에셋 사전 캐시 전략
// 6 POI × 4 locale × 3 mode = 최대 72개 오디오 파일
// StaleWhileRevalidate for audio MP3 (대용량 — 네트워크 우선)
// CacheFirst for braille .txt (소용량 — 오프라인 완전 지원)
// 수어 MP4는 오프라인 미지원 (용량 제약)
```

캐시 우선순위:
1. 점자 텍스트 `.txt` — CacheFirst, 완전 오프라인
2. 트랜스크립트 텍스트 — CacheFirst
3. 오디오 MP3 — NetworkFirst (오프라인 시 cached fallback)
4. 수어 MP4 — NetworkOnly (오프라인 미지원 안내)

---

## 13. 멀티랭귀지 자막 소스

### 13.1 자막 원문 계층

| 우선순위 | 소스 | 언어 | 적용 조건 |
|:---:|---|---|---|
| 1 | Odii `overview` 필드 | 해당 langCode | Odii 커버 + 해당 언어 존재 |
| 2 | KTO 다국어 서비스 (`EngService2`/`JpnService2`/`ChsService2`) `detailCommon2` overview | en/ja/zh-CN | Odii 미커버 또는 언어 부재 |
| 3 | 국가유산청 원문 (ko) → 번역 | en/ja/zh-CN | KTO 다국어 미제공 |
| 4 | 수동 큐레이션 (`content/docent/`) | 모든 언어 | 쉬운글 모드 |

> KTO 다국어 서비스 `contentTypeId`: 관광지 76 / 문화시설 78 / 행사 85. `EngService2` 호출 시 ko용 12가 아닌 76 사용 필수 (D1 §2.4).

---

## 14. "AI 음성 안내" 배지 규격

```typescript
// apps/web/src/shared/components/AiBadge.tsx

type AiBadgeVariant = 'audio' | 'translation' | 'route';

const BADGE_LABELS: Record<AiBadgeVariant, string> = {
  audio: 'AI 음성 안내',
  translation: 'AI 번역',
  route: 'AI 생성 코스',
};

interface AiBadgeProps {
  variant: AiBadgeVariant;
}

// AI 기본법(2026.1.22) 의무 표시
// 위치: DocentHeader 우상단
// 표시 조건: ttsProvider in ('clova','elevenlabs') → audio 배지 표시
//            번역 경유 자막 → translation 배지 표시
// Odii 원음(odii_native) → 배지 미표시
```

---

## 15. 인수 기준 (Acceptance Criteria)

### 15.1 기능 인수 기준

| ID | 기준 | 검증 방법 |
|---|---|---|
| AC-F2-01 | 6 POI × 4 언어 도슨트 텍스트(자막) 100% DB 적재 | ETL 완료 후 `docent_stories` 쿼리 |
| AC-F2-02 | 지도에서 POI 탭 시 3초 이내 도슨트 플레이어 시작 | E2E: map tap → player 상태 확인 |
| AC-F2-03 | GPS API를 일절 호출하지 않음 (map-tap MVP — geofence 없음) | E2E: 페이지 전체 동안 `navigator.geolocation` 미호출 확인 |
| AC-F2-04 | Odii 미커버 POI에서도 도슨트 재생 가능 (폴백 TTS) | 공산성 제외 POI에서 player 기능 확인 |
| AC-F2-05 | 어린이/어른/쉬운글 모드 전환 시 올바른 콘텐츠 로드 | jest: 모드별 storyId 매핑 |
| AC-F2-06 | 점자 텍스트(.txt) 다운로드 — 한국점자규정 준수 | `braillify` 유닛테스트 |
| AC-F2-07 | 수어 영상 — 공산성·부소산성 각 10개 이상 키워드 | 수어 아이템 목록 검수 |
| AC-F2-08 | 수어 `license_verified=false` 아이템은 수어 탭 비활성 | jest: SignTab 조건부 렌더링 |
| AC-F2-09 | TTS 생성 음성에 "AI 음성 안내" 배지 표시 | 스크린샷 테스트 |
| AC-F2-10 | Odii 원음에는 배지 미표시 | jest: ttsProvider='odii_native' → badge hidden |
| AC-F2-11 | 음성 재생 중 transcript 구간 강조 동기 | Playwright: audio currentTime → aria-current 확인 |
| AC-F2-12 | 오프라인 시 점자·자막 표시 (음성 캐시 없으면 캐시 fallback) | Serwist offline 시뮬레이션 |

### 15.2 KWCAG 2.2 음성 체크포인트

| 검사항목 | 적용 내용 | 검증 도구 |
|---|---|---|
| **1.1.1 비텍스트 콘텐츠** | 모든 버튼·아이콘 aria-label, 수어 영상 텍스트 대안(transcript) | axe-core |
| **1.2.1 음성만 제공 (녹음된 것)** | 오디오 파일에 동기화 자막 제공 | 수동 확인 |
| **1.2.2 자막 (녹음된 것)** | transcript 항상 표시 | axe-core + 수동 |
| **1.2.6 수어 (녹음된 것)** | 수어 채널 제공 (MVP 2 POI) | 수동 확인 |
| **1.4.1 색에 무관한 정보** | 현재 구간 강조: 색 + 밑줄 + aria-current | axe-core |
| **1.4.3 명도 대비** | 텍스트 4.5:1, UI 컴포넌트 3:1 | Storybook addon-a11y |
| **2.1.1 키보드** | 모든 컨트롤 키보드 접근 | Playwright keyboard nav |
| **2.1.2 방해 금지** | 자동재생 시 볼륨 0 default + 중지 버튼 최우선 노출 | 수동 확인 |
| **2.4.3 초점 순서** | 탭 전환 시 탭 패널로 초점 이동 | Playwright focus trap |
| **3.1.1 페이지 언어** | 언어 변경 시 `<html lang>` 동적 변경 | axe-core |
| **4.1.2 이름·역할·값** | volume slider `role="slider"` + aria-value | axe-core |
| **4.1.3 상태 메시지** | 도슨트 시작/일시정지 상태 `role="status"` | axe-core |

### 15.3 법적 체크리스트

| 항목 | 요구사항 | 담당 |
|---|---|---|
| 위치정보법 제9조의2 | MVP는 GPS 비사용 (map-tap 트리거); 발전방향 지오펜스 추가 시 방통위 신고 선행 필수 | 법무 |
| GPS 좌표 미저장 | 발전방향 지오펜스 구현 시: 서버 전송 금지, 클라이언트 메모리 한정 | 개발 (발전방향 시 단위 테스트) |
| AI 기본법 배지 | TTS 생성 콘텐츠 전체에 "AI 음성 안내" | 개발 |
| 수어 라이선스 개별 확인 | `docent_sign_items.license_verified = true` 후 표시 | 콘텐츠 |
| 국립국어원 출처 표기 | `AttributionNotice` 컴포넌트 필수 포함 | 개발 |
| KOGL `cpyrhtDivCd` | 자막 원문이 KTO API 출처일 경우 Type1/Type3 표시 | 개발 |

---

## 16. 연동 경계 (다른 F와의 계약)

| 연동 대상 | 데이터 방향 | 계약 |
|---|---|---|
| **F1.F-3 예측 가능 백제** | F2 → F1.F | 쉬운글 모드 `body` 텍스트를 60초 카운트다운 화면에 표시; `docent_stories` 직접 쿼리 |
| **F4 다이어리** | F2 → F4 | `DocentStory.body` (어린이 모드) → 자동 퀴즈 생성 source; F4는 storyId 참조 |
| **F4 점자 출력** | F2 → F4 | `docent_assets` (channel='braille') → F4(c) .brf 다운로드 재활용 |
| **F1.B 정적 경로** | 공유 없음 | F2는 도슨트 전용; 경로 안내는 F1.B 단독 |
| **F3 배리어 제보** | F3 approve → F2 알림 | 도슨트 재생 중 F3 alert 발생 시 `aria-live="assertive"` 오버레이 (일시정지 후) |

---

## 17. 개발 타임라인 (SPEC §9 기준)

| 기간 | F2 마일스톤 |
|---|---|
| 6/14–6/28 (Contract) | DB 스키마 v1, Zod 스키마 v1, Odii probe 스크립트, DocentMapTrigger 컴포넌트 골격 |
| 6/29–7/19 (ETL/Content) | Odii ETL 전체 6 POI, 폴백 파이프라인, TTS 생성 (ko 완료), 점자 파이프라인 (공산성·부소산성) |
| 7/20–8/9 (Feature) | DocentPlayer 4채널 완성 (공산성·부소산성), 나머지 4 POI 음성+자막, 4언어 TTS, 수어 라이선스 확인, 전체 E2E 테스트 |
| 8/10–8/31 (Quality) | NVDA/VoiceOver 수동 테스트, 오프라인 드릴, 배지 감사 |
| 9/1–9/15 (Validation) | 청각·시각장애인 전문가 검증, 점자 임베서 출력 테스트 |

---

## 18. 미결 항목 (Open Items)

| # | 항목 | 담당 | 기한 |
|---|---|---|---|
| OI-F2-01 | 6 POI Odii 실제 커버리지 probe 실행 및 `odii_coverage` 필드 확정 | C2 ETL 담당 | C2 1차 배포 시 |
| OI-F2-02 | 방통위 위치기반서비스 신고 완료 확인 | 법무 | 7월 베타 전 |
| OI-F2-03 | 다누림(서울관광재단) 수어 영상 협력 서면 확약 | BD | 7월 초 |
| OI-F2-04 | 국립국어원 수어사전 임베드/딥링크 정책 확인 (개별 콘텐츠 유형) | 콘텐츠 | 6/28 |
| OI-F2-05 | CLOVA Voice API 키 발급 및 사용량 견적 | 인프라 | 7월 초 |
| OI-F2-06 | ElevenLabs en/ja/zh-CN 음성 화자 선택 및 품질 검증 | 콘텐츠 | 7/20 |
| OI-F2-07 | 공산성·부소산성 수어 키워드 10~15어구 목록 확정 | 콘텐츠 + 수어 전문가 | 7/20 |
| OI-F2-08 | 쉬운글 모드 원문 수동 큐레이션 기준 문서화 (7세 어휘 기준) | 콘텐츠 | 7월 초 |
