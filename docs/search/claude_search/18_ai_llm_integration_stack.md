# 18. AI / LLM 통합 스택 — 생성형 AI 부문 대비

> 조사 기준일: 2026-05-03
> **2026 공모전 신설 "생성형 AI 부문" 대응을 위한 사실 정리**

---

## 1. LLM API 가격 비교 (2026 기준)

### 1.1 Frontier 모델 비교

| 모델 | 출시일 | 입력 가격 | 출력 가격 | Context |
|---|---|---|---|---|
| Claude Opus 4.7 | 2026-04-16 | $5/M | $25/M | 1M |
| Claude Sonnet 4.6 | 2026-Q1 | $3/M | $15/M | 1M |
| Claude Haiku 4.5 | 2026-Q1 | $0.80/M | $4/M | 200K |
| GPT-5.5 | 2026-04-23 | $5/M | $30/M | 1M |
| GPT-5 | 2026-Q1 | $3/M | $15/M | 1M |
| GPT-4.1 | 2025 | $2/M | $8/M | 1M |
| Gemini 2.5 Pro | 2026 | $1.25/M | $10/M | 2M |
| Gemini 2.5 Flash | 2026 | $0.30/M | $2.50/M | 1M |
| Grok 4 | 2026 | $5/M | $15/M | 256K |
| HyperCLOVA X (Basic) | - | 협의 (토큰 기반) | 협의 | - |
| Solar Pro 2 (Upstage) | 2025 | $1/M | $1/M | 64K |

> **주의**: Claude Opus 4.7은 새 토크나이저로 같은 입력에 대해 최대 35% 더 많은 토큰 생성. 단가 $5 동일하지만 실제 청구액은 상승 가능.

### 1.2 캐싱/배치 할인

| 제공자 | Prompt Caching | Batch |
|---|---|---|
| Anthropic | 최대 90% 할인 (cache read) | 50% 할인 |
| OpenAI | 50% 할인 (자동) | 50% 할인 |
| Google | 75% 할인 (Context Caching) | - |
| AWS Bedrock | 캐싱 지원 | - |

---

## 2. 주요 LLM 제공자 상세

### 2.1 Anthropic Claude

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://docs.claude.com/ |
| API 엔드포인트 | https://api.anthropic.com/v1/messages |
| 모델 (2026) | Opus 4.7 / Sonnet 4.6 / Haiku 4.5 |
| 강점 | 코딩, 긴 컨텍스트, agentic |
| Tool Use | O |
| Vision | O |
| Prompt Caching | O (cache_control) |
| MCP (Model Context Protocol) | 1급 지원 |

```python
import anthropic
client = anthropic.Anthropic()
msg = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1024,
    messages=[{"role": "user", "content": "제주도 3박4일 여행 코스 추천"}]
)
```

### 2.2 OpenAI

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://platform.openai.com/docs |
| 모델 (2026) | GPT-5.5 / GPT-5 / GPT-4.1 / o3, o4-mini (reasoning) |
| Realtime API | O (음성/영상 실시간) |
| Assistants API | O |
| Responses API | O (2025+ 신규) |

### 2.3 Google Gemini

| 항목 | 내용 |
|---|---|
| 공식 문서 | https://ai.google.dev/ |
| 모델 (2026) | Gemini 2.5 Pro / Flash / Flash-Lite |
| 무료 티어 | AI Studio 무료 (1.5M token/일 등 제한) |
| Vision | O (네이티브 멀티모달) |
| 음성 입출력 | Gemini Live API |
| Context | 최대 2M token |

### 2.4 네이버 HyperCLOVA X

| 항목 | 내용 |
|---|---|
| 공식 | https://clova.ai/clova-studio |
| API 가이드 | https://api.ncloud-docs.com/docs/ai-naver-clovastudio-summary |
| 상품 | Basic / Exclusive / Neurocloud for HyperCLOVA X |
| 과금 | 토큰 수 기반 (Basic), 협의 (Exclusive/Neurocloud) |
| 한국어 강점 | 국내 데이터 학습, 한국 문화/맥락 이해 |
| 사용 조건 | NCP 가입 + 기업용 결제 수단 등록 |

### 2.5 Upstage Solar

| 항목 | 내용 |
|---|---|
| 공식 | https://www.upstage.ai/ |
| 모델 | Solar Pro 2 / Solar Mini |
| 강점 | 한국어 1급, 가격 경쟁력, RAG 통합 |
| Document Parse | 표/이미지 포함 PDF 파싱 |
| AWS Marketplace | 배포 가능 |

---

## 3. AI SDK / 통합 라이브러리

### 3.1 비교

| 라이브러리 | 언어 | 특징 | 라이선스 |
|---|---|---|---|
| Vercel AI SDK 5 | TS/JS | 멀티 프로바이더 추상화, useChat 훅, 도구 호출, 구조화 출력 | Apache 2 |
| LangChain | Python/JS | 체인, 에이전트, 100+ 통합 | MIT |
| LangGraph | Python/JS | 그래프 기반 에이전트, LangChain 후속 | MIT |
| LlamaIndex | Python/TS | RAG 1급, 데이터 인덱싱 | MIT |
| Pydantic AI | Python | type-safe, structured output | MIT |
| DSPy (Stanford) | Python | 프롬프트 자동 최적화 | MIT |
| Haystack (deepset) | Python | RAG 파이프라인 | Apache 2 |
| Mastra | TS | TS-first, agentic | Apache 2 |

### 3.2 Vercel AI SDK 5 코드 예제

```ts
import { generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

// 프로바이더 추상화
const result = await generateText({
  model: anthropic('claude-opus-4-7'),
  prompt: '제주도 3박4일 코스 추천',
});

// 스트리밍
const { textStream } = await streamText({
  model: openai('gpt-5'),
  prompt: '경복궁 역사 설명',
});
for await (const chunk of textStream) process.stdout.write(chunk);
```

```tsx
// useChat 훅 (React)
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
  });
  return (
    <form onSubmit={handleSubmit}>
      {messages.map(m => <div key={m.id}>{m.role}: {m.content}</div>)}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

### 3.3 Vercel AI Gateway

| 항목 | 내용 |
|---|---|
| 공식 | https://vercel.com/docs/ai-gateway |
| 가격 모델 | Pay-as-you-go, **마크업 없음** |
| 무료 티어 | 모든 Vercel 팀 (크레딧 일부) |
| 특징 | 라우팅, 페일오버, 비용 추적, 한 키로 다수 모델 |

---

## 4. 임베딩 모델 (RAG/검색용)

### 4.1 비교

| 모델 | 차원 | 가격 | 한국어 |
|---|---|---|---|
| OpenAI text-embedding-3-small | 1536 (조정 가능) | $0.020/M tokens | △ |
| OpenAI text-embedding-3-large | 3072 (조정 가능) | $0.130/M tokens | △ |
| Voyage AI voyage-3-large | 1024 | $0.18/M | ★★★ |
| Cohere embed-multilingual-v3 | 1024 | $0.10/M | ★★★★ |
| Google text-embedding-004 | 768 | $0.025/M | ★★★ |
| Google text-multilingual-embedding-002 | 768 | $0.025/M | ★★★★ |
| BAAI BGE-M3 | 1024 | OSS (자체호스팅) | ★★★★ |
| Upstage Embedding | - | 협의 | ★★★★★ |
| Naver HyperCLOVA Embedding | - | 협의 | ★★★★★ |

### 4.2 RAG 패턴

```
[사용자 질의]
  ↓ Embedding (text-embedding-3-small 등)
[질의 벡터]
  ↓ Vector DB Similarity Search (top-k)
[관련 문서 청크 k개]
  ↓ LLM 프롬프트 컨텍스트 주입
[LLM (Claude/GPT/Gemini)]
  ↓ 답변 생성
[사용자에게 응답]
```

### 4.3 RAG 구현 — 한국 관광 데이터 적용

```python
from anthropic import Anthropic
from openai import OpenAI
import psycopg

openai = OpenAI()
claude = Anthropic()

def embed(text: str) -> list[float]:
    res = openai.embeddings.create(model="text-embedding-3-small", input=text)
    return res.data[0].embedding

def search(query: str, k: int = 5):
    qv = embed(query)
    with psycopg.connect("...") as conn:
        rows = conn.execute(
            "SELECT title, overview FROM tour_attractions ORDER BY embedding <=> %s::vector LIMIT %s",
            (qv, k)
        ).fetchall()
    return rows

def ask(question: str):
    docs = search(question)
    context = "\n\n".join(f"## {t}\n{o}" for t, o in docs)
    msg = claude.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system="당신은 한국 관광 가이드입니다. 제공된 자료에만 근거해 답변하세요.",
        messages=[{
            "role": "user",
            "content": f"<자료>\n{context}\n</자료>\n\n질문: {question}"
        }]
    )
    return msg.content[0].text
```

---

## 5. 이미지 생성

| 서비스 | 모델 | 가격 (참고) | API |
|---|---|---|---|
| OpenAI DALL·E 3 | DALL-E 3 | $0.04/image (1024) | O |
| OpenAI gpt-image-1 | gpt-image | $0.011-0.167/image | O (2025+) |
| Stability AI | SD3.5 / SDXL | $0.04/image (Core) | O |
| Midjourney | v7 | Discord/Web only ($10/월부터) | 비공식만 |
| Google Imagen 3/4 | Imagen | $0.03-0.04/image | O (Vertex) |
| Adobe Firefly | Firefly | 크레딧 기반 ($4.99/월부터) | O |
| Black Forest Labs FLUX | FLUX.1 [pro/dev/schnell] | OSS + API | O (Replicate) |
| Replicate | 다양 | 모델별 | O |
| Naver SmartLens / Image | - | 협의 | NCP |

### 5.1 DALL·E 3 코드

```python
from openai import OpenAI
client = OpenAI()
res = client.images.generate(
    model="dall-e-3",
    prompt="Hanbok-themed welcome poster for Gyeongbokgung Palace",
    size="1024x1024",
    quality="hd",
    n=1
)
print(res.data[0].url)
```

---

## 6. 음성 (STT / TTS)

### 6.1 STT (Speech-to-Text)

| 서비스 | 가격 | 한국어 |
|---|---|---|
| OpenAI Whisper API | $0.006/분 | ★★★★ |
| OpenAI gpt-4o-transcribe | $0.006/분 | ★★★★★ |
| Google Speech-to-Text | $0.024/분 (standard) | ★★★★ |
| Azure Speech | $1/시간 | ★★★★ |
| Naver CLOVA Speech (CSR) | 협의 | ★★★★★ |
| Naver CLOVA Speech (장문 STT) | 협의 | ★★★★★ |
| AssemblyAI | $0.37/시간 | ★★★ |
| Deepgram Nova-3 | $0.43/시간 | ★★★ |
| ReturnZero | 협의 | ★★★★ (한국 스타트업) |

### 6.2 TTS (Text-to-Speech)

| 서비스 | 가격 | 한국어 음성 수 |
|---|---|---|
| ElevenLabs | $5/월 30K char ~ | 다국어 다수 (한국어 포함) |
| OpenAI TTS (gpt-4o-mini-tts) | $0.015/M char | △ |
| Google TTS (Neural2) | $16/M char | 多 |
| Azure TTS Neural | $16/M char | 多 |
| Naver CLOVA Voice | 협의 | **100+ 한국어 음성 (NeuVis 엔진)** |
| Typecast | 월 정액 ~ | 다수 한국 음성 |
| Speechify | 월 정액 | △ |
| Murf | $19/월부터 | 일부 |

### 6.3 음성 가이드 활용 시나리오 (관광)

```
[명소 소개 텍스트] (다국어)
  → DeepL/Papago로 다국어 번역
  → CLOVA Voice / ElevenLabs TTS
  → 오디오 파일 생성 (S3 업로드)
  → 모바일 앱에서 재생 (위치 기반 자동 재생)
```

---

## 7. 번역 API

### 7.1 가격 비교 (2026)

| 서비스 | 단가 | 무료 티어 | 한국어 품질 |
|---|---|---|---|
| Google Cloud Translation v3 | $20/M chars | 500K chars/월 | ★★★★ |
| Google Cloud Translation (LLM mode) | $10 input + $10 output /M | - | ★★★★★ |
| DeepL API Pro | $25/M + $5.49/월 base | 500K chars/월 | ★★★★ (한국어 약함) |
| DeepL API Free | 0 | 500K chars/월 | ★★★★ |
| Microsoft Translator | $10/M chars | 2M chars/월 | ★★★★ |
| Amazon Translate | $15/M chars | 2M chars/월 (12개월) | ★★★★ |
| **Naver Papago** | 협의 (NCP) | 일부 무료 | **★★★★★ (한·중·일 1위)** |
| Kakao 번역 | 협의 | - | ★★★★ |
| OpenAI GPT-5 (translation) | $5 input + $30 output /M | - | ★★★★★ (맥락 이해) |

### 7.2 다국어 관광 번역 — 한국어 → 12언어 자동화

```ts
// Vercel AI SDK + multi-provider
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const langs = ['en', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru', 'vi', 'th', 'id', 'ar'];

async function translateOverview(ko: string, target: string) {
  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5'),
    system: 'You are a tourism translator. Preserve proper nouns. Output target language only.',
    prompt: `Source (Korean):\n${ko}\n\nTranslate to: ${target}`,
  });
  return text;
}
```

---

## 8. 음성 에이전트 / 멀티모달

| 서비스 | 특징 |
|---|---|
| OpenAI Realtime API | 음성↔음성 실시간 (WebRTC), 200ms 지연 |
| Gemini Live API | 음성/영상 실시간 |
| Vapi | 전화 음성 에이전트 ($0.05/분~) |
| Retell AI | 음성 에이전트 SDK |
| LiveKit Agents | 오픈소스 음성 에이전트 |
| ElevenLabs Conversational AI | 음성 에이전트 (TTS 통합) |

---

## 9. AI 에이전트 / 도구 생태계

### 9.1 Agent 프레임워크

| 라이브러리 | 언어 | 비고 |
|---|---|---|
| Anthropic Agent SDK | Python/TS | Claude Code 기반 |
| OpenAI Agents SDK | Python/TS | Swarm 후속 |
| LangGraph | Python/TS | 그래프 |
| CrewAI | Python | 다중 에이전트 |
| AutoGen (Microsoft) | Python | 다중 에이전트 |
| Mastra | TS | TS 1급 |

### 9.2 MCP (Model Context Protocol)

| 항목 | 내용 |
|---|---|
| 표준 | Anthropic 발의 (2024-11), 2025-2026 업계 표준화 |
| 공식 | https://modelcontextprotocol.io/ |
| 클라이언트 | Claude Desktop/Code, Cursor, Cline, Zed, JetBrains, Warp 등 |
| 서버 SDK | Python · TypeScript · Java · Kotlin · C# · Rust · Go |

---

## 10. 한국 AI 서비스 통합 옵션

### 10.1 한국 AI 모델/서비스

| 서비스 | 운영사 | 특징 |
|---|---|---|
| HyperCLOVA X | NAVER | 한국어 1급, NCP |
| Solar Pro / Solar Mini | Upstage | 한국어 강함, AWS 마켓플레이스 |
| KT 믿음 (Mi:dm) | KT | 한국어, 통신사 데이터 |
| LG EXAONE 3.5/4.0 | LG AI Research | 오픈 모델 (32B/2.4B) |
| 카카오 KoGPT / Kanana | Kakao | 일부 공개 |
| ETRI 다양 모델 | 정부 출연 | 일부 공개 |

### 10.2 한국 AI 서비스 (서비스형)

| 서비스 | 분야 |
|---|---|
| Naver CLOVA Studio | LLM/임베딩 |
| Naver CLOVA Voice | TTS |
| Naver CLOVA Speech | STT |
| Naver CLOVA OCR | OCR |
| Naver Papago | 번역 |
| Kakao i Open Builder | 챗봇 |
| Kakao i Translation | 번역 |
| Kakao Brain Karlo | 이미지 생성 |
| Upstage Document Parse | 문서 파싱 (PDF→구조화) |

---

## 11. 관광 도메인 — 가능한 AI 활용 카탈로그 (사실 정리)

### 11.1 텍스트 생성

- 명소 설명 다국어 자동 생성 (12언어)
- 여행 일정 자동 추천 (RAG + 사용자 선호)
- 후기/리뷰 요약
- FAQ 챗봇
- 음성 챗봇 (오디오 가이드 대체)

### 11.2 이미지 생성

- 명소 홍보 이미지 자동 생성 (DALL·E, Imagen, FLUX)
- 가상 한복 체험 (이미지 편집)
- 지역별 캐릭터/굿즈 시안

### 11.3 음성 생성

- 명소 위치 기반 오디오 가이드 (CLOVA Voice + 위치 트리거)
- 다국어 안내 음성 (12언어 ElevenLabs)
- 음성 챗봇 (Realtime API)

### 11.4 멀티모달

- 사진 찍어 명소 인식 (Vision LLM)
- 메뉴 사진 → 다국어 번역 (OCR + 번역)
- 표지판 사진 → 길찾기

### 11.5 RAG / 검색

- 자연어 명소 검색 ("아이와 함께 갈만한 비오는 날 실내 명소")
- 관광공사 OpenAPI 데이터 + LLM 결합

### 11.6 추천

- 협업 필터링 + 임베딩 유사도 (vector DB)
- 사용자 임베딩 + 명소 임베딩 매칭
- 콜드스타트: 이미지/설명 임베딩

---

## 12. 출처

### LLM 가격
- Claude Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- OpenAI Pricing: https://openai.com/api/pricing/
- Gemini API Pricing: https://ai.google.dev/pricing
- Claude Opus 4.7 가격 분석: https://benchlm.ai/blog/posts/claude-api-pricing
- LLM 가격 비교 2026: https://www.cloudidr.com/llm-pricing
- AI API 가격 비교: https://intuitionlabs.ai/articles/ai-api-pricing-comparison-grok-gemini-openai-claude

### 한국 LLM
- Naver CLOVA Studio: https://clova.ai/clova-studio
- CLOVA Studio 가이드: https://api.ncloud-docs.com/docs/ai-naver-clovastudio-summary
- Upstage Solar: https://www.upstage.ai/
- LG EXAONE: https://www.lgresearch.ai/exaone

### SDK / 프레임워크
- Vercel AI SDK: https://ai-sdk.dev/
- LangChain: https://www.langchain.com/
- LlamaIndex: https://www.llamaindex.ai/
- Pydantic AI: https://ai.pydantic.dev/
- Anthropic Agent SDK: https://docs.claude.com/en/api/agent-sdk

### 임베딩 / RAG
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- Voyage AI: https://www.voyageai.com/
- Cohere Embed: https://cohere.com/embed
- BGE-M3: https://huggingface.co/BAAI/bge-m3

### 음성
- OpenAI Whisper: https://platform.openai.com/docs/guides/speech-to-text
- ElevenLabs: https://elevenlabs.io/pricing
- Naver CLOVA Voice: https://www.ncloud.com/product/aiService/clovaVoice
- Naver CLOVA Speech: https://www.ncloud.com/product/aiService/csr

### 번역
- Google Cloud Translation: https://cloud.google.com/translate/pricing
- DeepL API: https://www.deepl.com/pro-api
- Naver Papago: https://www.ncloud.com/product/aiService/papagoTranslation
- 번역 API 비교: https://www.buildmvpfast.com/api-costs/translation

### MCP
- Model Context Protocol: https://modelcontextprotocol.io/
- Anthropic MCP 발표: https://www.anthropic.com/news/model-context-protocol
