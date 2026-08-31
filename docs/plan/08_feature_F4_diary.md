# 08 — F4 다중 출력 다이어리 (Multi-Channel Heritage Diary)

> **SPEC §8(F4) 구현 기획.** SPEC.md가 единственный source of truth; 이 문서는 SPEC §8 F4 항목을 개발자가 추가 추론 없이 구현할 수 있도록 확장한다.
> Stack: Next.js 15 (App Router) · Supabase (Postgres 17 + PostGIS) · Vercel Seoul (`icn1`) · PWA (Serwist) · **no Chromium in MVP**
> PT money shot: F4는 "한 번 수집한 무장애 데이터가 여행 전 판단→현장 안내→교육 기록→다음 방문자의 경고→충남 RTO 개선"으로 흐르는 증거물 — PT 실용성 25점 + 발표 15점의 핵심 시연.

---

## 0. F4 위치 요약 (SPEC 기준)

```
F1.B 검수 GPX ─► F4 diary (IndexedDB) ─► 출력 채널 (우선순위 순)
                                           ├─ [P1] HTML 폴백    ← 항상 생성 (KWCAG 2.2)
                                           ├─ [P1] 학생 PDF     ← pdf-lib + 충남교육청 양식
                                           ├─ [P1] 쉬운글 PDF   ← react-pdf + 픽토그램
                                           ├─ [P1] BRF (점자)   ← braillify + 한국점자규정 + 전문가 대조 검수 필수
                                           ├─ [P1] 무장애 GPX   ← GPX 1.1 XML (큐레이션 다운로드)
                                           ├─ [P2] 교사 루브릭  ← P1 문서 모델의 thin derivative
                                           └─ [P2] 단체 합본    ← P1 문서 모델의 thin derivative
```

> **SPEC §13.2 우선순위 규칙:** P1 채널(HTML · 학생 PDF · 쉬운글 PDF · expert-verified BRF)이 완성되지 않으면 P2 채널(교사 루브릭 · 단체 합본)은 구현하지 않는다. P2는 동일한 `DiaryDocumentRequest` 모델의 thin derivative일 뿐이므로 P1 완성 후 추가 공수가 적다.

| SPEC 결정 항목 | 값 |
|---|---|
| 다이어리 기본 저장소 | **IndexedDB** (로컬 우선). 서버는 명시 제출 데이터만 |
| PDF 엔진 (신규 문서) | **`@react-pdf/renderer`** (Node 런타임; no Chromium) |
| PDF 엔진 (기존 양식 채우기) | **`pdf-lib`** + `@pdf-lib/fontkit` (충남교육청 양식) |
| HTML 대안 | **항상 제공** (모든 출력에 HTML 폴백, 다운로드 or 인쇄) |
| 한글 폰트 | **Pretendard 정적 TTF** (SIL OFL 1.1) |
| CJK 줄바꿈 | `Font.registerHyphenationCallback` + `Intl.Segmenter("ko")` |
| 점자 | **`braillify` npm 2.0.1** (Apache-2.0, WASM, 2024 개정 한국점자규정) |
| GPX | **GPX 1.1** 직접 XML 생성 (WGS84/metric, `rte`/`rtept`) |
| 지도 딥링크 | 카카오맵 1차 / 구글맵 2차 |
| Chromium | **MVP 불가** (250MB 서버리스 한도 + cold start) |
| 테스트 | golden-file 테스트 (PDF 바이트 해시 / GPX schema / .brf 셀 수) |

---

## 1. 모듈 경계 및 패키지 배치

```
packages/
  domain/diary/          ← pure TS, framework-free
    DiaryEntry.ts        ← 핵심 엔터티
    DiaryQuiz.ts
    DiaryRepository.ts   ← interface (IndexedDB impl은 features에서)
    buildDiaryDocument.ts ← SPEC §4 domain function (5 signatures 중 하나)

  exports/               ← 출력 채널 전용 패키지
    pdf/
      StudentPdfBuilder.ts      ← pdf-lib (충남교육청 양식 채우기)
      RubricPdfBuilder.ts       ← react-pdf
      EasyReadPdfBuilder.ts     ← react-pdf
      GroupPdfBuilder.ts        ← react-pdf
      fonts.ts                  ← Pretendard TTF 등록 + CJK hyphenation callback
    braille/
      BrailleBuilder.ts         ← braillify → Unicode → .brf
    gpx/
      GpxBuilder.ts             ← GPX 1.1 XML 생성
    html/
      DiaryHtmlBuilder.ts       ← HTML 폴백 (항상)
    index.ts                    ← ExportRequest / ExportResult 타입 + dispatch

apps/web/src/
  features/f4-diary/
    components/
      DiaryRecorder.tsx         ← 현장 기록 UI (IndexedDB write)
      DiaryViewer.tsx           ← 누적 다이어리 목록
      ExportPanel.tsx           ← 6채널 선택 + 다운로드 버튼
      QuizModule.tsx            ← Odii 연동 퀴즈
    hooks/
      useDiary.ts               ← IndexedDB CRUD (idb wrapper)
      useExport.ts              ← API Route 호출 + blob download
    server/
      actions.ts                ← Server Actions (diary metadata 제출)

  app/[locale]/diary/
    page.tsx                    ← RSC 외곽; 인증 없이 접근 가능 (SPEC §2.11)
    [entryId]/export/route.ts   ← API Route: POST → ExportResult (Node runtime)
```

---

## 2. DB 모델 (Supabase)

> F4는 로컬 우선이다. 서버 테이블은 **명시 제출된 UGC만** 저장한다(SPEC §5 "server stores only explicitly-submitted data").

### 2.1 IndexedDB 스키마 (domain 레이어에서 정의)

```typescript
// packages/domain/diary/DiaryEntry.ts

export interface DiaryEntry {
  id: string;                   // crypto.randomUUID()
  schemaVersion: number;        // 마이그레이션용 (현재 1)
  poiId: string;                // SPEC pois.id 참조
  poiTitle: string;             // 오프라인 스냅샷
  visitedAt: string;            // ISO 8601
  personaIds: string[];         // 선택된 페르소나 코드
  timeMode: TimeMode;           // '반나절'|'당일'|'1박2일' (MVP 3단; '2박3일'=발전방향)
  routeGuideVersion: string;    // route_guides.version 스냅샷
  steps: DiaryStep[];
  quizAnswers: QuizAnswer[];
  photos: DiaryPhoto[];         // base64 썸네일 + full URL (로컬 or Storage)
  voiceMemoUrl: string | null;
  accessibilityNotes: string;   // 무장애 동선 현장 메모
  gpxWaypoints: GpxWaypoint[]; // 검수 통과 GPX 경유점 (F1.B 환류)
  submittedToServer: boolean;   // 서버 제출 여부
  createdAt: string;
  updatedAt: string;
}

export interface DiaryStep {
  seq: number;
  stepId: string;               // route_steps.id 참조
  label: string;
  completedAt: string | null;
  barrierNote: string | null;   // F3 제보 트리거용
}

export interface QuizAnswer {
  questionId: string;
  question: string;
  answer: string;
  isCorrect: boolean | null;
  answeredAt: string;
}

export interface DiaryPhoto {
  localId: string;
  storageUrl: string | null;    // 업로드 후 채워짐
  caption: string;
  takenAt: string;
}

export interface GpxWaypoint {
  seq: number;
  lat: number;
  lon: number;
  name: string;
  ele: number | null;
}

export type TimeMode = '반나절' | '당일' | '1박2일'; // MVP 3단 (SPEC §13.2); '2박3일' = 발전방향 확장 상한
```

### 2.2 IndexedDB 스토어 정의

```typescript
// features/f4-diary/hooks/useDiary.ts

const DB_NAME = 'modu-baekje-diary';
const DB_VERSION = 1;

// openDB stores:
// 'entries'  : keyPath='id', indexes: ['poiId', 'visitedAt', 'submittedToServer']
// 'photos'   : keyPath='localId' (blob storage)
// 'settings' : keyPath='key' (personaIds, timeMode 기본값 등)
```

### 2.3 Supabase 테이블 (명시 제출분)

```sql
-- INSERT only when the user explicitly taps "공유" (diary metadata submission).
-- UGC GPX re-submission to gpx_submissions is deferred to 발전방향 (SPEC §13.2:
-- F1.E 후기 + UGC GPX 제출 → 발전방향; F3 is the sole UGC entry in MVP).
-- The curated GPX *download* (channel e) stays in MVP.

create table diary_submissions (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid references auth.users(id),   -- anon ok
  poi_id         uuid references pois(id),
  entry_snapshot jsonb not null,                    -- full DiaryEntry snapshot
  persona_ids    text[] not null,
  time_mode      text not null,
  visited_at     timestamptz not null,
  submitted_at   timestamptz default now()
  -- gpx_submitted column removed: UGC GPX loop is 발전방향
);

-- RLS
alter table diary_submissions enable row level security;
create policy "insert own" on diary_submissions
  for insert with check (auth.uid() = reporter_id);
create policy "select own" on diary_submissions
  for select using (auth.uid() = reporter_id);
```

---

## 3. Domain Function: `buildDiaryDocument`

SPEC §4 pure-domain core의 5번째 signature.

```typescript
// packages/domain/diary/buildDiaryDocument.ts

export interface DiaryDocumentRequest {
  entry: DiaryEntry;
  poiMeta: PoiMeta;             // title, heritage number, region
  routeGuide: RouteGuideMeta;   // verified_at, version
  channels: ExportChannel[];
  locale: 'ko' | 'en' | 'ja' | 'zh-CN';
  groupEntries?: DiaryEntry[];  // (f) 단체 합본용
  rubricConfig?: RubricConfig;  // (b) 교사 루브릭용
}

// P1 = must ship before P2; 교사 루브릭 / 단체 합본 are thin derivatives (SPEC §13.2).
export type ExportChannel =
  | 'html'           // [P1] always generated; KWCAG 2.2 fallback
  | 'student-pdf'    // [P1] 충남교육청 양식
  | 'easy-read-pdf'  // [P1] 쉬운글 PDF
  | 'braille-brf'    // [P1] expert-verified BRF; "BRF 지원" claim gated on contrast review
  | 'route-gpx'      // [P1] curated download (UGC re-submission → 발전방향)
  | 'rubric-pdf'     // [P2] 교사 루브릭 — thin derivative of P1 document model
  | 'group-pdf';     // [P2] 단체 합본 — thin derivative of P1 document model

export interface DiaryDocumentResult {
  channel: ExportChannel;
  contentType: string;
  filename: string;
  buffer: Buffer | string;      // Buffer for binary, string for HTML/GPX
  warnings: string[];           // 전문가 검수 필요 등 경고
}

export function buildDiaryDocument(
  request: DiaryDocumentRequest
): DiaryDocumentResult[] {
  // 1. validate: entry.visitedAt, gpxWaypoints 존재 여부
  // 2. channels.map → 각 빌더 호출
  // 3. 'html' always append if not in channels
  // 4. return array
}
```

---

## 4. 출력 채널 상세 구현

### 4.1 (a) 학생용 학교제출 PDF — `pdf-lib` + 충남교육청 양식

**목적:** 충남교육청 체험학습 결과보고서 양식을 그대로 사용. 필드 채우기(form fill)이므로 react-pdf가 아닌 `pdf-lib`.

#### 의존성

```jsonc
// packages/exports/package.json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "@pdf-lib/fontkit": "^1.1.1",
    "@react-pdf/renderer": "^4.x",   // (b)(d)(f) 채널용
    "braillify": "^2.0.1"
  }
}
```

#### 충남교육청 양식 필드 매핑

충남교육청 체험학습 결과보고서 PDF 양식(`content/templates/chungnam-edu-form.pdf`)을 ETL로 취득 후 `pdf-lib`으로 다음 필드를 채운다. 양식 취득 전까지는 직접 레이아웃 PDF를 `pdf-lib`으로 생성한다.

| 양식 필드 | 매핑 소스 | 비고 |
|---|---|---|
| 학교명 / 학년 / 반 | `rubricConfig.school`, `grade`, `class` | 입력 필수 |
| 학생 성명 | `rubricConfig.studentName` | 입력 필수 |
| 체험학습 기간 | `entry.visitedAt` | ISO → `YYYY년 M월 D일` |
| 체험학습 장소 | `entry.poiTitle` + 소재지 | `poiMeta.address` |
| 체험학습 목적 | 고정 문구 "충남 백제역사유적지구 무장애 문화유산 체험" | |
| 체험학습 내용 | `entry.steps` 완료 단계 요약 (최대 300자) | |
| 소감 / 느낀 점 | `entry.voiceMemoUrl` STT 텍스트 or 빈칸 | AI 생성 시 배지 |
| 학부모 확인 서명 | 빈칸 (서명란 보존) | |
| 지도교사 확인 | 빈칸 | |
| 출처 표기 | 자동 삽입 (§5 라이선스 참조) | |

```typescript
// packages/exports/pdf/StudentPdfBuilder.ts

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import path from 'path';

export async function buildStudentPdf(
  request: DiaryDocumentRequest
): Promise<DiaryDocumentResult> {
  const formBytes = readFileSync(
    path.join(process.cwd(), 'content/templates/chungnam-edu-form.pdf')
  );
  const pdfDoc = await PDFDocument.load(formBytes);
  pdfDoc.registerFontkit(fontkit);

  const pretendardBytes = readFileSync(
    path.join(process.cwd(), 'content/fonts/Pretendard-Regular.ttf')
  );
  const font = await pdfDoc.embedFont(pretendardBytes);

  const form = pdfDoc.getForm();
  // 양식 필드가 있는 경우
  tryFillField(form, '학교명', request.rubricConfig?.school ?? '', font);
  tryFillField(form, '학년반', buildGradeClass(request.rubricConfig), font);
  // ... 나머지 필드

  // 양식 필드 없이 좌표 기반 텍스트 배치 (fallback)
  if (form.getFields().length === 0) {
    await overlayTextOnTemplate(pdfDoc, font, request);
  }

  // 출처 표기 푸터 삽입
  appendAttributionFooter(pdfDoc, font, request);

  const pdfBytes = await pdfDoc.save();
  return {
    channel: 'student-pdf',
    contentType: 'application/pdf',
    filename: `모두의백제_체험학습_${sanitizeFilename(request.entry.poiTitle)}.pdf`,
    buffer: Buffer.from(pdfBytes),
    warnings: []
  };
}

function tryFillField(form: PDFForm, fieldName: string, value: string, font: PDFFont): void {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value);
    field.updateAppearances(font);
  } catch {
    // 필드 없음 → overlayText fallback에서 처리
  }
}
```

**양식 폴백:** 충남교육청 양식 PDF 취득 전 개발 단계에서는 `pdf-lib`으로 A4 레이아웃을 직접 그린다. 양식 취득 후 위 `PDFDocument.load` 경로로 교체.

---

### 4.2 (b) 교사용 루브릭 PDF — `react-pdf`

교사가 학급 단위로 채점할 수 있는 루브릭. 학년별 백제 교과 단원(초등 5학년 사회, 중학교 역사 등)과 연계.

#### 폰트 초기화 (exports/pdf/fonts.ts) — 한 번만 호출

```typescript
import path from 'node:path';
import { Font } from '@react-pdf/renderer';

export function initKoreanFonts(): void {
  Font.register({
    family: 'Pretendard',
    fonts: [
      // web-absolute '/fonts/..' throws ENOENT under renderToBuffer in a Node route → use cwd path (SPEC §14.9);
      // also: outputFileTracingIncludes for content/fonts/**, preload Buffers before render, + Noto Sans KR fallback for Hanja (史).
      { src: path.join(process.cwd(), 'content/fonts/Pretendard-Regular.ttf'), fontWeight: 400 },
      { src: path.join(process.cwd(), 'content/fonts/Pretendard-SemiBold.ttf'), fontWeight: 600 },
      { src: path.join(process.cwd(), 'content/fonts/Pretendard-Bold.ttf'), fontWeight: 700 },
    ],
  });

  // CJK 줄바꿈 — 글자 단위, hyphen 없음 (R3 §1.2 이슈 #1568/#1662 우회)
  Font.registerHyphenationCallback((word: string) =>
    Array.from(word).flatMap((char) => [char, ''])
  );
}
```

#### 루브릭 컴포넌트 구조

```
RubricDocument (react-pdf Document)
  ├─ RubricHeader     ← 학교명, 학년, 단원명, 방문일
  ├─ EvidenceSection  ← 다이어리 항목 요약 (방문 POI, 완료 단계 수, 퀴즈 점수)
  ├─ RubricTable      ← 채점 기준표
  └─ AttributionBlock ← 출처 표기 (§5)
```

#### 루브릭 채점 기준표 DDL

```typescript
export interface RubricRow {
  dimension: string;      // "역사 이해", "현장 관찰", "무장애 인식", "협력·배려"
  excellent: string;      // 4점 기준 설명
  good: string;           // 3점
  developing: string;     // 2점
  beginning: string;      // 1점
  evidence: string;       // 다이어리에서 추출한 근거 (quizAnswers, steps 완료율)
  score: number | null;   // 교사 채점란 (빈칸)
}
```

```typescript
// packages/exports/pdf/RubricPdfBuilder.ts

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { initKoreanFonts } from './fonts';

export async function buildRubricPdf(
  request: DiaryDocumentRequest
): Promise<DiaryDocumentResult> {
  initKoreanFonts();

  const rows = deriveRubricRows(request.entry, request.rubricConfig);
  const pdfBuffer = await renderToBuffer(
    <RubricDocument
      entry={request.entry}
      poiMeta={request.poiMeta}
      rows={rows}
      rubricConfig={request.rubricConfig!}
    />
  );

  return {
    channel: 'rubric-pdf',
    contentType: 'application/pdf',
    filename: `교사루브릭_${sanitizeFilename(request.entry.poiTitle)}.pdf`,
    buffer: Buffer.from(pdfBuffer),
    warnings: []
  };
}
```

#### 루브릭 채점 기준 (백제 체험학습, 초등 5학년 기준)

| 차원 | 4점 (우수) | 3점 (보통) | 2점 (노력 필요) | 1점 (미흡) |
|---|---|---|---|---|
| **역사 이해** | 백제 건국~멸망 연대 및 3개 이상 유적지 의의를 정확히 서술 | 핵심 역사 사실 2개 이상 서술 | 1개 역사 사실 서술 | 역사 사실 미서술 |
| **현장 관찰** | 방문 단계 전부 완료 + 음성/사진 기록 3건 이상 | 단계 70% 이상 완료 | 단계 50% 이상 완료 | 50% 미만 |
| **퀴즈 수행** | 퀴즈 80% 이상 정답 | 60% 이상 | 40% 이상 | 40% 미만 |
| **무장애 인식** | 무장애 동선 메모 + 배리어 관찰 기록 있음 | 무장애 동선 메모만 있음 | 메모 미작성 | — |

---

### 4.3 (c) 점자 BRF — `braillify` + 한국점자규정

> **B-5 수정 (SPEC §13.2):** Unicode 점자(U+2800–U+28FF)와 `.brf`(Braille ASCII)는 별개 형식이다. 파이프라인은 이 두 단계를 명시적으로 분리한다. "BRF 지원" 문구는 점자 사용자의 대조 검수(contrast review) 완료 전에는 심사 자료에 사용할 수 없다.

#### 목표 점역 규정 및 임베서 타깃

| 항목 | 값 |
|---|---|
| 점역 규정 | **한국점자규정** (문화체육관광부 고시 제2020-38호, 2020.11 개정) |
| 임베서 타깃 | **Index Braille Basic-D V5** (40 cells/line, 25 lines/page) — 학교·복지관 보급 표준 기종 |
| 수학·부호 규칙 | 수식 포함 시 **한국 수학점자규정** (별도 변환 필요; braillify 미지원 → `braille-camp` 또는 수동 변환 + 전문가 검수) |
| 대조 검수 주체 | 한국점자도서관 또는 시각장애인 점자 전문가; 베타(9월) 전 검수 완료 필수 |
| "BRF 지원" 클레임 조건 | 전문가 대조 검수 통과 + 임베서 실출력 확인 후에만 심사 자료에 기재 |

#### 변환 파이프라인

```
DiaryEntry
  → formatBrailleText(entry)           ← 평문 텍스트 정리 (이모지·특수문자 제거)
  → translateToUnicode(text)           ← [단계 1] Unicode 점자 문자열 (U+2800–U+28FF)
                                            ※ 이 시점의 출력은 점자 디스플레이 렌더용이며,
                                               임베서 파일(.brf)이 아님
  → unicodeBrailleToAscii(unicode)     ← [단계 2] Braille ASCII(North American) 64조합으로 변환
                                            ※ U+2800–U+28FF 각 코드포인트를 ASCII 0x20–0x5F에 매핑
  → wrapToLines(ascii, 40)             ← 40 cells/line 줄바꿈 (Index Basic-D V5 기준)
  → insertFormFeeds(lines, 25)         ← 25 lines/page → \x0C (Form Feed)
  → Buffer.from(brf, 'ascii')          ← .brf 파일 (Braille ASCII 인코딩)
```

```typescript
// packages/exports/braille/BrailleBuilder.ts

import { translateToUnicode } from 'braillify'; // braillify 2.0.1 export (NOT 'translate'); SPEC §14.9. Stage-2는 한국어-인지 transcriber + 명시적 target profile로 8점↔6점 손상 방지

// Target: Index Braille Basic-D V5 (school/welfare standard embosser).
const MAX_CELLS_PER_LINE = 40;   // adjust after confirming actual embosser spec (§15 OI)
const LINES_PER_PAGE = 25;

export async function buildBrailleBrf(
  request: DiaryDocumentRequest
): Promise<DiaryDocumentResult> {
  const plainText = formatBrailleText(request.entry, request.poiMeta);

  // Stage 1: Korean text → Unicode braille (U+2800–U+28FF) per 한국점자규정.
  // This is a display/screen-reader format, NOT yet a .brf file.
  const unicodeBraille: string = translateToUnicode(plainText);

  // Stage 2: Unicode braille → Braille ASCII (North American, 0x20–0x5F).
  // This is the embosser-compatible .brf encoding.
  const asciiLines = unicodeToBrailleAsciiLines(unicodeBraille);
  const brf = assemblePages(asciiLines);

  return {
    channel: 'braille-brf',
    contentType: 'application/octet-stream',
    filename: `모두의백제_점자_${sanitizeFilename(request.entry.poiTitle)}.brf`,
    buffer: Buffer.from(brf, 'ascii'),
    warnings: [
      '이 파일은 Unicode 점자(U+2800–U+28FF)를 Braille ASCII로 변환한 .brf입니다.',
      '한국점자규정(2020.11 개정) 기반 자동 생성이며, 수식·특수부호는 미변환입니다.',
      '임베서 출력 및 심사 자료 사용 전 반드시 점자 전문가(한국점자도서관 등)의 대조 검수가 필요합니다.',
      '수식이 포함된 경우 한국 수학점자규정에 따른 별도 변환(braille-camp 또는 전문가 수동 변환)이 필요합니다.'
    ]
  };
}

function formatBrailleText(entry: DiaryEntry, poiMeta: PoiMeta): string {
  const sections: string[] = [
    `모두의 백제 체험학습 기록`,
    `방문지: ${poiMeta.title}`,
    `방문일: ${formatDate(entry.visitedAt)}`,
    ``,
    `방문 동선:`,
    ...entry.steps
      .filter((s) => s.completedAt !== null)
      .map((s) => `  ${s.seq}단계. ${s.label}`),
    ``,
    `퀴즈 결과:`,
    ...entry.quizAnswers.map(
      (q) => `  질문: ${q.question}\n  답: ${q.answer}`
    ),
    ``,
    `무장애 동선 메모:`,
    entry.accessibilityNotes || '(메모 없음)',
  ];
  return sections.join('\n');
}

function unicodeToBrailleAsciiLines(unicode: string): string[] {
  // Converts Unicode braille (U+2800–U+28FF, stage-1 output from braillify)
  // to Braille ASCII (North American, 0x20–0x5F) required by embosser .brf files (stage 2).
  // These are distinct encodings; do not treat the stage-1 Unicode string as a .brf file.
  const asciiChars = Array.from(unicode).map(unicodeBrailleToAscii);
  const joined = asciiChars.join('');
  return chunkString(joined, MAX_CELLS_PER_LINE);
}

function assemblePages(lines: string[]): string {
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    const page = lines.slice(i, i + LINES_PER_PAGE).join('\r\n');
    pages.push(page + '\x0C'); // Form Feed = 페이지 구분
  }
  return pages.join('');
}
```

> **전문가 대조 검수 (필수 게이트, B-5):** `.brf` 자동 생성은 한국점자규정(2020.11 개정) 기반이나, Unicode 점자→Braille ASCII 변환의 한국어 완전 정확성 및 수학·특수부호 규칙은 미검증이다. **점자 사용자의 대조 검수(contrast review) 완료 전까지 "BRF 지원"을 심사 자료에 기재하지 않는다.** UI에서 경고 배너를 표시하고, 파일 첫 줄에도 검수 미완료 안내문을 삽입한다. 전문가 검수 파트너 확보 상태는 §15 미결 사항 참조.

---

### 4.4 (d) 쉬운글 PDF — `react-pdf` + 픽토그램

P3 인지·발달장애 / P1b 시니어 대상. 7세 어휘, 짧은 문장, 픽토그램 동반.

#### 컴포넌트 트리

```
EasyReadDocument (react-pdf Document)
  ├─ EasyReadCover
  │   ├─ MascotImage (백제 마스코트 6컷 중 선택)
  │   └─ TitleBlock (큰 글씨, Pretendard Bold 24pt)
  ├─ VisitSummaryPage
  │   └─ StepCard × N  ← 1단계 1행동, 픽토그램 + 짧은 문장
  ├─ QuizResultPage
  │   └─ QuizCard × N  ← 질문 + 학생 답변 + 정오표시 픽토그램
  ├─ MemoryPage        ← 방문 사진 + 한 줄 감상
  └─ AttributionPage
```

```typescript
// packages/exports/pdf/EasyReadPdfBuilder.ts

const EASY_READ_STYLES = StyleSheet.create({
  page: { fontFamily: 'Pretendard', fontSize: 18, padding: 40 },
  stepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F0F7FF',
    padding: 12,
    borderRadius: 8,
  },
  pictogram: { width: 60, height: 60, marginRight: 16 },
  stepText: { fontSize: 20, fontWeight: 600, flex: 1 },
  // grid layout: flexDirection row + flexBasis % (grid 미지원 우회, R3 §1.2)
});

export async function buildEasyReadPdf(
  request: DiaryDocumentRequest
): Promise<DiaryDocumentResult> {
  initKoreanFonts();
  const pdfBuffer = await renderToBuffer(<EasyReadDocument {...request} />);
  return {
    channel: 'easy-read-pdf',
    contentType: 'application/pdf',
    filename: `쉬운글_${sanitizeFilename(request.entry.poiTitle)}.pdf`,
    buffer: Buffer.from(pdfBuffer),
    warnings: []
  };
}
```

---

### 4.5 (e) 무장애 동선 GPX — GPX 1.1

F1.B에서 검수 통과한 `route_steps`의 좌표를 사용자 실제 방문 경로로 확인 후 `diary.gpxWaypoints`에 저장. 검수 통과분만 GPX로 출력 (SPEC §8 "UGC 검수 통과 동선만 환류").

#### GPX 1.1 구조

```
gpx[version=1.1, creator=ModuBaekje]
  └─ metadata
      └─ name, desc, time
  └─ rte (= 관광 경로, 턴포인트 목록)
      └─ name
      └─ rtept × N   ← lat, lon, name, desc (장애요소 메모)
          └─ extensions
              └─ modu:barrierNote  ← 무장애 현장 메모
              └─ modu:verified     ← 검수 통과 여부
```

```typescript
// packages/exports/gpx/GpxBuilder.ts

export function buildGpxXml(
  entry: DiaryEntry,
  poiMeta: PoiMeta
): string {
  const now = new Date().toISOString();
  const waypoints = entry.gpxWaypoints;

  if (waypoints.length === 0) {
    return buildEmptyGpx(poiMeta, now);
  }

  const rteptXml = waypoints
    .map(
      (wp) => `    <rtept lat="${wp.lat}" lon="${wp.lon}">
      <name>${escapeXml(wp.name)}</name>
      ${wp.ele !== null ? `<ele>${wp.ele}</ele>` : ''}
      <extensions>
        <modu:verified>true</modu:verified>
      </extensions>
    </rtept>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ModuBaekje"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:modu="https://modubakje.kr/gpx-ext/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(poiMeta.title)} 무장애 동선</name>
    <desc>모두의 백제 검수 완료 무장애 경로 | 방문일: ${entry.visitedAt.slice(0, 10)}</desc>
    <time>${now}</time>
    <copyright author="ModuBaekje">
      <year>${new Date().getFullYear()}</year>
    </copyright>
  </metadata>
  <rte>
    <name>${escapeXml(poiMeta.title)} 무장애 코스</name>
${rteptXml}
  </rte>
</gpx>`;
}

export function buildGpxResult(
  entry: DiaryEntry,
  poiMeta: PoiMeta
): DiaryDocumentResult {
  const xml = buildGpxXml(entry, poiMeta);
  const warnings: string[] = [];
  if (entry.gpxWaypoints.length === 0) {
    warnings.push('검수 통과 GPX 경유점이 없습니다. F1.B 동선 이용 후 재출력하세요.');
  }
  return {
    channel: 'route-gpx',
    contentType: 'application/gpx+xml',
    filename: `무장애동선_${sanitizeFilename(poiMeta.title)}.gpx`,
    buffer: xml,
    warnings
  };
}
```

#### 지도 앱 딥링크 (ExportPanel.tsx)

GPX 다운로드와 별도로, 지도 앱 열기 버튼을 제공한다 (R3 §2.2 기준).

```typescript
// features/f4-diary/components/ExportPanel.tsx

function buildKakaoRouteUrl(waypoints: GpxWaypoint[]): string {
  if (waypoints.length < 2) {
    return '';
  }
  const sp = `${waypoints[0].lat},${waypoints[0].lon}`;
  const ep = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lon}`;
  const vps = waypoints
    .slice(1, -1)
    .slice(0, 5)  // kakao 최대 vp5
    .map((wp, i) => `&vp${i > 0 ? i + 1 : ''}=${wp.lat},${wp.lon}`)
    .join('');
  // 앱 스킴 (모바일)
  const appScheme = `kakaomap://route?sp=${sp}&ep=${ep}${vps}&by=foot`;
  // 웹 fallback
  const webUrl = `https://m.map.kakao.com/scheme/route?sp=${sp}&ep=${ep}${vps}&by=foot`;
  return isMobile() ? appScheme : webUrl;
}

function buildGoogleRouteUrl(waypoints: GpxWaypoint[]): string {
  if (waypoints.length < 2) {
    return '';
  }
  const origin = `${waypoints[0].lat},${waypoints[0].lon}`;
  const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lon}`;
  const viaPoints = waypoints
    .slice(1, -1)
    .slice(0, 3)  // 모바일 최대 3
    .map((wp) => `${wp.lat}%2C${wp.lon}`)
    .join('%7C');
  const waypointsParam = viaPoints ? `&waypoints=${viaPoints}` : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking${waypointsParam}`;
}
```

---

### 4.6 (f) 단체 합본 PDF — `react-pdf`

P4 단체 인솔자 전용. 학급 30명의 다이어리를 한 PDF로 합본. 표지 + 인솔 보고서 + 개인 다이어리 요약 × N.

```typescript
// packages/exports/pdf/GroupPdfBuilder.ts

export async function buildGroupPdf(
  request: DiaryDocumentRequest
): Promise<DiaryDocumentResult> {
  const { entry, groupEntries = [], poiMeta, rubricConfig } = request;
  const allEntries = [entry, ...groupEntries];

  initKoreanFonts();
  const pdfBuffer = await renderToBuffer(
    <GroupDocument
      entries={allEntries}
      poiMeta={poiMeta}
      rubricConfig={rubricConfig}
    />
  );

  return {
    channel: 'group-pdf',
    contentType: 'application/pdf',
    filename: `단체합본_${sanitizeFilename(poiMeta.title)}_${allEntries.length}명.pdf`,
    buffer: Buffer.from(pdfBuffer),
    warnings: allEntries.length > 30
      ? ['30명 초과 합본은 PDF 크기가 커질 수 있습니다. 그룹별 분리 출력을 권장합니다.']
      : []
  };
}
```

#### GroupDocument 컴포넌트 트리

```
GroupDocument
  ├─ GroupCoverPage
  │   ├─ 기관명 / 방문일 / POI명 / 인솔자명
  │   └─ 참여 학생 수 + 그룹 구성
  ├─ InstructorReportPage
  │   ├─ 단계 완료율 통계 (전체 평균)
  │   ├─ 퀴즈 정답률 분포
  │   ├─ 무장애 현장 메모 집계
  │   └─ GPX 코드 (QR) — 다음 단체가 스캔해서 동선 재사용
  └─ IndividualSummaryPage × N
      ├─ 학생 성명 / 완료 단계 / 퀴즈 점수
      └─ 대표 사진 1장 + 한 줄 감상
```

---

### 4.7 HTML 폴백 — 항상 제공

모든 채널에 HTML 대안을 함께 생성한다. KWCAG 2.2 준수 (PDF는 접근성 보장이 불완전함).

```typescript
// packages/exports/html/DiaryHtmlBuilder.ts

export function buildDiaryHtml(
  request: DiaryDocumentRequest
): DiaryDocumentResult {
  const html = `<!DOCTYPE html>
<html lang="${request.locale}" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${request.poiMeta.title} 체험학습 기록 — 모두의 백제</title>
  <style>
    body { font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
           font-size: 1.125rem; line-height: 1.75; max-width: 800px; margin: auto; padding: 2rem; }
    h1 { font-size: 2rem; }
    .step { background: #f0f7ff; border-radius: 8px; padding: 1rem; margin: 0.5rem 0; }
    .attribution { font-size: 0.8rem; color: #666; border-top: 1px solid #eee; margin-top: 2rem; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(request.poiMeta.title)} 체험학습 기록</h1>
  <p>방문일: <time datetime="${request.entry.visitedAt}">${formatDate(request.entry.visitedAt)}</time></p>
  <section aria-label="방문 동선">
    <h2>방문 동선</h2>
    ${request.entry.steps
      .filter((s) => s.completedAt !== null)
      .map((s) => `<div class="step" role="listitem"><strong>${s.seq}단계:</strong> ${escapeHtml(s.label)}</div>`)
      .join('')}
  </section>
  <section aria-label="퀴즈 결과">
    <h2>퀴즈</h2>
    ${request.entry.quizAnswers
      .map((q) => `<p><strong>Q.</strong> ${escapeHtml(q.question)}<br><strong>A.</strong> ${escapeHtml(q.answer)}</p>`)
      .join('')}
  </section>
  <div class="attribution">${buildAttributionHtml(request)}</div>
</body>
</html>`;

  return {
    channel: 'html',
    contentType: 'text/html; charset=utf-8',
    filename: `모두의백제_${sanitizeFilename(request.poiMeta.title)}.html`,
    buffer: html,
    warnings: []
  };
}
```

---

## 5. 라이선스 출처 표기 (자동 삽입)

모든 출력 채널의 푸터/마지막 페이지에 자동 삽입.

```typescript
// packages/exports/attribution.ts

export interface AttributionSource {
  name: string;
  licenseType: string;   // '공공누리 제1유형' | 'SIL OFL 1.1' | 'CC BY-NC-SA 4.0' 등
  url: string;
}

export const FIXED_ATTRIBUTION_SOURCES: AttributionSource[] = [
  {
    name: '한국관광공사 TourAPI (KorService2, KorWithService2)',
    licenseType: '공공누리 제1유형 (출처표시)',
    url: 'https://apis.data.go.kr'
  },
  {
    name: '국가유산청 문화재 정보',
    licenseType: '공공누리 제1유형 (출처표시)',
    url: 'https://www.cha.go.kr/openapi'
  },
  {
    name: 'Pretendard (폰트)',
    licenseType: 'SIL OFL 1.1',
    url: 'https://github.com/orioncactus/pretendard'
  },
  {
    name: 'ARASAAC AAC 상징 (사용한 경우)',
    licenseType: 'CC BY-NC-SA 4.0 / Sergio Palao, ARASAAC',
    url: 'https://arasaac.org'
  },
  {
    name: '충남교육청 체험학습 양식',
    licenseType: '충남교육청 정보공개',
    url: 'https://edu.cne.go.kr'
  },
];

export function buildAttributionText(
  entry: DiaryEntry,
  extraSources: AttributionSource[] = []
): string {
  const sources = [...FIXED_ATTRIBUTION_SOURCES, ...extraSources];
  const lines = sources.map(
    (s) => `· ${s.name} — ${s.licenseType} (${s.url})`
  );
  const aiNote = '이 문서의 일부 콘텐츠는 AI 음성 안내 / AI 번역 기술로 생성되었습니다 (AI 기본법 표시 의무).';
  return ['출처:', ...lines, '', aiNote].join('\n');
}
```

---

## 6. 퀴즈 모듈 (QuizModule)

Odii 어린이 모드 콘텐츠를 기반으로 POI별 3~5문항 퀴즈를 제공한다.

### 6.1 퀴즈 데이터 모델 (Supabase)

```sql
create table docent_quizzes (
  id           uuid primary key default gen_random_uuid(),
  poi_id       uuid references pois(id),
  locale       text not null,              -- 'ko'|'en'|'ja'|'zh-CN'
  source_story_id text,                    -- Odii storyId 참조
  question     text not null,
  options      text[] not null,            -- 4지선다
  correct_idx  smallint not null,          -- 0-based
  difficulty   smallint not null default 1, -- 1(초등)~3(중등)
  heritage_ref text,                       -- 국가유산 지정번호 참조 (예: 史477)
  created_at   timestamptz default now()
);

-- RLS: 모두 public read (인증 불필요)
create policy "public read" on docent_quizzes for select using (true);
```

### 6.2 퀴즈 컴포넌트

```typescript
// features/f4-diary/components/QuizModule.tsx

interface QuizModuleProps {
  poiId: string;
  locale: string;
  onComplete: (answers: QuizAnswer[]) => void;
}

// 렌더링 흐름:
// 1. useQuery → /api/quizzes?poiId=&locale= (public API Route, unstable_cache)
// 2. QuizCard 순차 표시 (1문항씩, 이전 답변 숨김 — F1.F-2 인지 패턴 동일)
// 3. 정답 시 백제 마스코트 애니메이션 (prefers-reduced-motion 감지)
// 4. 완료 시 onComplete(answers) 호출 → IndexedDB write
```

---

## 7. API Route: 내보내기 엔드포인트

```typescript
// app/[locale]/diary/[entryId]/export/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { buildDiaryDocument } from 'packages/domain/diary/buildDiaryDocument';
import type { ExportChannel } from 'packages/exports';

export const runtime = 'nodejs';      // Chromium 불가 → Node 런타임 명시
export const maxDuration = 30;        // react-pdf 생성 여유

export async function POST(
  req: NextRequest,
  { params }: { params: { entryId: string } }
): Promise<NextResponse> {
  const body = await req.json() as {
    entry: DiaryEntry;
    channels: ExportChannel[];
    rubricConfig?: RubricConfig;
    locale: string;
  };

  // 1. entry 검증 (Zod)
  // 2. poiMeta 조회 (Supabase, unstable_cache)
  // 3. routeGuide 조회 (검수 통과 gpxWaypoints 포함)
  // 4. buildDiaryDocument 호출
  // 5. 단일 채널이면 직접 반환, 다중이면 JSZip으로 묶어 .zip 반환

  const results = buildDiaryDocument({
    entry: body.entry,
    poiMeta: await getPoiMeta(params.entryId),
    routeGuide: await getRouteGuide(body.entry.poiId),
    channels: body.channels,
    locale: body.locale as any,
    rubricConfig: body.rubricConfig,
  });

  if (results.length === 1) {
    const r = results[0];
    return new NextResponse(r.buffer, {
      headers: {
        'Content-Type': r.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(r.filename)}`,
        'X-Export-Warnings': JSON.stringify(r.warnings),
      },
    });
  }

  // 다중 채널 → .zip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const r of results) {
    zip.file(r.filename, r.buffer);
  }
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('모두의백제_다이어리_내보내기.zip')}`,
    },
  });
}
```

---

## 8. UI 컴포넌트 트리 (features/f4-diary)

```
/diary
  DiaryRecorder               ← 현장 기록 (방문 인증, 단계 체크, 사진, 음성메모)
    ├─ VisitVerifier           ← QR 또는 GPS 진입 확인 (GPS = 위치동의 필수)
    ├─ StepChecklist           ← route_steps 기반 체크리스트
    ├─ PhotoCapture            ← PWA File API (EXIF 스트립)
    ├─ VoiceMemo               ← MediaRecorder API (최대 60초)
    └─ AccessibilityNotepad    ← 무장애 현장 메모 (F3 제보 트리거 버튼 포함)

  QuizModule                  ← Odii 연동 퀴즈 (위 §6)

  DiaryViewer                 ← 누적 다이어리 목록 (IndexedDB read)
    └─ DiaryCard × N          ← 방문일, POI명, 퀴즈 점수, 내보내기 버튼

  ExportPanel                 ← 6채널 선택 + 내보내기
    ├─ ChannelSelector         ← 채널별 체크박스
    ├─ RubricConfigForm        ← 학교명, 학년, 반, 교사명 (선택)
    ├─ GroupModeToggle         ← P4 단체 모드 (groupEntries 추가)
    ├─ ExportButton            ← POST /diary/[id]/export
    ├─ MapDeepLinks            ← 카카오맵 / 구글맵 열기
    └─ BrailleReviewGateBanner ← 점자 전문가 대조 검수 미완료 시 게이트 경고 (channel=braille-brf 시); 검수 완료 시 배지로 전환
```

### 접근성 요구사항 (KWCAG 2.2)

| 요소 | 요구사항 |
|---|---|
| ExportButton | `aria-busy` 내보내기 진행 중 |
| ChannelSelector | `<fieldset><legend>` 묶기 |
| 다운로드 링크 | `download` attribute + `aria-label` 파일명 포함 |
| BrailleReviewGateBanner | `role="alert"` |
| QuizCard | 정답/오답 `aria-live="polite"` |
| DiaryCard 목록 | `<ul role="list">` + `<li>` |
| 진행 상태 | `aria-valuenow` / `aria-valuemax` (단계 완료율) |

---

## 9. 오프라인 PWA 동작

SPEC §2.3 (PWA, Serwist) 준수. 다이어리는 IndexedDB 우선이므로 오프라인 핵심 흐름이 별도 서비스워커 전략 없이 동작한다.

| 자원 | 오프라인 전략 |
|---|---|
| `DiaryRecorder`, `QuizModule`, `DiaryViewer` | CacheFirst (Serwist precache) |
| 퀴즈 데이터 (`docent_quizzes`) | Stale-While-Revalidate; IndexedDB 캐시 |
| POI 메타 (`pois`, `poi_translations`) | CacheFirst; POI별 오프라인 패키지 |
| 내보내기 API (`/diary/[id]/export`) | NetworkOnly (PDF 생성은 서버 필요) → 오프라인 시 "온라인 연결 후 내보내기" 안내 |
| IndexedDB DiaryEntry | 로컬 영속; 오프라인 완전 동작 |

---

## 10. 골든 파일 테스트 (Golden-File Testing)

```
tests/
  exports/
    golden/
      공산성_student.pdf.sha256
      공산성_rubric.pdf.sha256
      공산성_easy-read.pdf.sha256
      공산성_group.pdf.sha256
      공산성_route.gpx                 ← XML 전문 (스냅샷)
      공산성_braille.brf.lines         ← 줄 수 + 첫 3줄 스냅샷 (바이트 해시 X)
      공산성_diary.html.snapshot       ← HTML 구조 스냅샷
    __tests__/
      studentPdf.test.ts
      rubricPdf.test.ts
      brailleBrf.test.ts
      gpxBuilder.test.ts
      htmlBuilder.test.ts
      buildDiaryDocument.test.ts
```

```typescript
// tests/exports/__tests__/gpxBuilder.test.ts

import { buildGpxXml } from 'packages/exports/gpx/GpxBuilder';
import { XMLValidator } from 'fast-xml-parser';
import { readFileSync } from 'fs';

describe('GPX 1.1 builder', () => {
  const sampleEntry = createSampleDiaryEntry(); // test-fixtures 패키지

  it('유효한 GPX 1.1 XML을 생성한다', () => {
    const xml = buildGpxXml(sampleEntry, samplePoiMeta);
    const result = XMLValidator.validate(xml, {
      allowBooleanAttributes: false
    });
    expect(result).toBe(true);
  });

  it('네임스페이스가 GPX 1.1 표준과 일치한다', () => {
    const xml = buildGpxXml(sampleEntry, samplePoiMeta);
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
  });

  it('경유점이 없으면 warnings를 반환한다', () => {
    const emptyEntry = { ...sampleEntry, gpxWaypoints: [] };
    const result = buildGpxResult(emptyEntry, samplePoiMeta);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('골든 파일 스냅샷과 일치한다', () => {
    const xml = buildGpxXml(sampleEntry, samplePoiMeta);
    const golden = readFileSync('tests/exports/golden/공산성_route.gpx', 'utf-8');
    expect(xml).toBe(golden);
  });
});
```

```typescript
// tests/exports/__tests__/brailleBrf.test.ts

import { buildBrailleBrf } from 'packages/exports/braille/BrailleBuilder';

describe('.brf 생성', () => {
  it('줄 길이가 40 cells를 초과하지 않는다', async () => {
    const result = await buildBrailleBrf(sampleRequest);
    const lines = result.buffer.toString('ascii').split('\r\n');
    for (const line of lines) {
      const cellLine = line.replace(/\x0C/, '');
      expect(cellLine.length).toBeLessThanOrEqual(40);
    }
  });

  it('warnings 배열에 전문가 검수 권고문이 포함된다', async () => {
    const result = await buildBrailleBrf(sampleRequest);
    expect(result.warnings.some((w) => w.includes('전문가'))).toBe(true);
  });

  it('contentType이 application/octet-stream이다', async () => {
    const result = await buildBrailleBrf(sampleRequest);
    expect(result.contentType).toBe('application/octet-stream');
  });
});
```

```typescript
// tests/exports/__tests__/studentPdf.test.ts

import { buildStudentPdf } from 'packages/exports/pdf/StudentPdfBuilder';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';

describe('학생용 PDF', () => {
  it('PDF 매직 바이트로 시작한다', async () => {
    const result = await buildStudentPdf(sampleRequest);
    const buf = result.buffer as Buffer;
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('골든 파일 SHA-256과 일치한다 (결정적 빌드)', async () => {
    const result = await buildStudentPdf(sampleRequest);
    const buf = result.buffer as Buffer;
    const hash = createHash('sha256').update(normalizePdfBytes(buf)).digest('hex'); // normalizePdfBytes: 고정 CreationDate/ModDate/Producer + ID 제거 (pdf-lib/react-pdf 기본 임베드로 인한 비결정성 제거; SPEC §14.10)
    const golden = readFileSync('tests/exports/golden/공산성_student.pdf.sha256', 'utf-8').trim();
    expect(hash).toBe(golden);
  });
});
```

> **골든 파일 갱신 절차:** 의도적 변경(양식 업데이트, 폰트 교체 등) 시 `pnpm run exports:update-golden` 스크립트로 재생성 후 PR에 diff 첨부. 비의도적 변경은 CI 실패로 탐지.

---

## 11. 수락 기준 (Acceptance Criteria)

### 11.1 채널별 기능 완성 기준

| 채널 | 기준 | 검증 방법 |
|---|---|---|
| (a) 학생 PDF | 충남교육청 양식 필드 100% 채워짐; Pretendard TTF 임베드 확인; 한글 깨짐 0; **한자 깨짐 0** (Pretendard 한자 미지원 → 史477 등은 '사적 제477호' 한글 표기 치환 또는 Noto Sans KR 폴백; SPEC §14.9) | PDF 열기 + 폰트 추출 검사 |
| (b) 교사 루브릭 | 4×4 루브릭 표 정상 렌더; 학년 단원 매핑 정확; 1페이지 이내 | 시각 검수 |
| (c) BRF (점자) | 줄 ≤40 cells; Form Feed 있음; Unicode 점자→Braille ASCII 2단계 변환; 전문가 대조 검수 미완료 시 UI 게이트 배너 표시; "BRF 지원" 클레임은 검수 완료 후만 허용 | 단위 테스트(줄 길이, contentType) + 전문가 대조 검수 통과 리포트 |
| (d) 쉬운글 PDF | 글씨 ≥18pt; 픽토그램 있음; 1단계 1행동 레이아웃; 한글 깨짐 0 | 시각 검수 |
| (e) GPX | GPX 1.1 스키마 유효; WGS84 좌표; 빈 경유점 경고 있음 | XMLValidator + 단위 테스트 |
| (f) 단체 합본 | 30명 기준 PDF ≤5MB; 표지 + 인솔 보고서 + 개인 요약; QR 포함 | PDF 열기 + 파일 크기 |
| HTML 폴백 | 모든 채널에 항상 생성; KWCAG 2.2 axe-core violations=0; 인쇄 스타일 있음 | jest-axe |

### 11.2 비기능 기준

| 항목 | 기준 |
|---|---|
| 내보내기 응답 시간 | 단일 채널 ≤3s (react-pdf); 6채널 ZIP ≤10s (서버리스 30s maxDuration) |
| 폰트 | Pretendard 정적 TTF만 사용 (OTF·가변폰트 금지, R3 §1.2 이슈 #806) |
| CJK 줄바꿈 | `registerHyphenationCallback` 항상 적용; hyphen 삽입 0 |
| Chromium | **MVP에서 일절 사용 안 함** |
| HTML 폴백 | 단 하나의 채널 요청에도 HTML 함께 반환 |
| 라이선스 표기 | PDF 마지막 페이지 / HTML 푸터에 `FIXED_ATTRIBUTION_SOURCES` 전체 출력 |
| AI 배지 | STT·번역·AI 생성 콘텐츠 포함 시 "AI 음성 안내 / AI 번역" 문구 포함 (AI 기본법) |
| 점자 전문가 대조 검수 게이트 | `.brf` 출력 시 UI 배너 + 파일 내 검수 미완료 안내 명시; 검수 완료 전 "BRF 지원" 심사 클레임 불가 (B-5) |
| 오프라인 | DiaryRecorder·QuizModule·DiaryViewer는 오프라인 완전 동작; 내보내기는 온라인 필요 |
| 접근성 | ExportPanel axe-core violations=0; QuizModule aria-live 검증 |

### 11.3 PT 시연 체크리스트 (D.1 시나리오)

```
□ 손녀 Odii 퀴즈 3문항 완료 → DiaryEntry 저장 확인
□ "P1 채널" 선택 → ZIP 다운로드 완료 (<10s)
□ [P1] HTML 폴백 → 동일 내용, axe-core 오류 없음
□ [P1] 학생 PDF 열기 → 충남교육청 양식 확인, 한글 정상
□ [P1] 쉬운글 PDF → 18pt 이상 글씨, 픽토그램 확인
□ [P1] BRF 다운로드 → 전문가 대조 검수 미완료 시 게이트 배너 표시 확인; 검수 완료분이라면 임베서 출력 확인
□ [P1] GPX → 카카오맵 딥링크 열림 확인 (모바일)
□ [P2] 교사 루브릭 PDF → 4차원 채점표 확인 (P1 완성 후)
□ [P2] 단체 합본 PDF → 표지 + 인솔 보고서 + QR 확인 (P1 완성 후)
□ 충남교육청 양식 출처 표기 확인
□ AI 번역 배지 표시 확인 (locale=en 시)
```

---

## 12. PT 연결 서사 (money shot 프레이밍)

F4는 SPEC §1 및 §12가 명시한 PT의 결정적 시연 포인트다.

> **"무장애 여행이 자녀의 교육 산출물로 남고, 다음 사용자가 그대로 따라갈 수 있는 검증된 코스로 환류됩니다."**

PT D.1 시나리오에서 F4가 담당하는 역할:

| PT 판정 기준 | F4 기여 |
|---|---|
| 실용성 25점 | 학생 PDF → 교사 루브릭 → 학교 제출 흐름이 1화면에서 완결; P4 단체 합본으로 30명 일괄 |
| 발표 15점 | 6채널 ZIP 다운로드 1회로 시연 완결 — 판사가 직접 PDF·GPX·HTML 열어볼 수 있음 |
| 적정성 30점 | 충남교육청 양식 1:1 정합 + 국가유산청 공식 해설 인용 = "구체적 지역 밀착성" |
| 완성도 30점 | golden-file 테스트 통과 + HTML 폴백 항상 존재 = 운영 가능한 완성품 증명 |

F4의 GPX(e)는 F1.B에서 큐레이션된 무장애 동선을 사용자가 다운로드하는 채널이다. "동일 데이터가 F1→F2→F3→F4→F5를 흐른다"는 SPEC §12 핵심 서사의 물리적 증거가 되며, 시연 중 GPX를 카카오맵에서 여는 동작이 이 서사를 시각적으로 닫는다. 단, UGC GPX 재제출(F1.E 검수 큐 연동)은 SPEC §13.2에 따라 발전방향으로 이동했다 — MVP에서 F4는 큐레이션 GPX를 다운로드하는 방향(단방향)만 지원하며, F3이 MVP의 유일한 UGC 진입점이다.

---

## 13. 의존성 요약 (packages/exports)

```jsonc
{
  "name": "@modu/exports",
  "private": true,
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "@pdf-lib/fontkit": "^1.1.1",
    "@react-pdf/renderer": "^4.x",
    "braillify": "^2.0.1",
    "jszip": "^3.10.1",
    "fast-xml-parser": "^4.4.x"
  },
  "devDependencies": {
    "vitest": "latest"
  },
  "exports": {
    ".": "./index.ts"
  }
}
```

> `@sparticuz/chromium` / `puppeteer-core`는 이 패키지에 **포함하지 않는다** (MVP no-Chromium 결정). 추후 pixel-perfect 디자인 요건이 생기면 별도 `exports-chromium` 패키지로 분리.

---

## 14. 스트림 의존성 (SPEC §9)

```
C4 Content (6-POI, route_steps 검수 완료)
  └─► F1.B (GPX 경유점 생성)
        └─► F4 (e) GPX 출력        ← F1.B 없으면 GPX 빈 파일 + warning

C3 Design/A11y (토큰, 폰트)
  └─► F4 (a)(b)(d)(f) PDF 폰트 임베드

F2 Odii 도슨트
  └─► F4 QuizModule (퀴즈 데이터 docent_quizzes)

F3 배리어 제보
  └─► F4 (e) GPX — 검수 통과분만 포함 (F3 = MVP의 유일한 UGC 진입점)

F4 ─► F5 RTO 갭 리포트
        (diary_submissions 집계 → 방문 POI 빈도 + 접근성 메모 내용 분석)

[발전방향] F4 (e) GPX ─► F1.E 검수 큐 UGC 재제출 (SPEC §13.2 cut)
```

---

## 15. 미결 사항 (Open Items)

| 항목 | 현재 상태 | 필요 액션 |
|---|---|---|
| 충남교육청 체험학습 양식 PDF | 정보공개 청구 또는 직접 취득 필요 | 취득 전까지 pdf-lib 직접 레이아웃으로 개발 후 교체 |
| `.brf` 목표 임베서 cells/line | 타깃: Index Braille Basic-D V5 (40 cells/25 lines 관례); 납품 기관 실제 사양 미확인 | 납품 임베서 확인 후 `MAX_CELLS_PER_LINE`/`LINES_PER_PAGE` 조정 |
| 점자 전문가 대조 검수 파트너 | **B-5 게이트:** "BRF 지원" 심사 클레임은 이 검수 완료 전 불가 — 한국점자도서관 또는 전문 출판기관 협의 중 | 베타 테스트(9월) 전 MOU 또는 자문 계약; 수학점자규정 적용 여부 판정 포함 |
| 백제 마스코트 6컷 | 외주 발주 계획 (SPEC §2.16) | 쉬운글 PDF · GroupCoverPage 삽입용; 취득 전 placeholder |
| ARASAAC 픽토그램 키 | API 키 없이도 REST 조회 가능하나, 콘텐츠 패키지에 정적 캐시 필요 | ETL 단계에서 6-POI 관련 픽토그램 사전 다운로드 + `content/pictograms/` 저장 |
| VoiceMemo STT → 소감 자동 채우기 | AI 기본법 표시 의무 이행 방법 확인 | "AI 생성 소감" 배지 + 사용자 수정 권장 문구 |
