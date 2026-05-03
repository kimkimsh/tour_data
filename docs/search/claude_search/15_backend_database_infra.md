# 15. 백엔드 / DB / 검색 / 캐시 / 호스팅 인프라

> 조사 기준일: 2026-05-03
> 출처: 공식 문서, 2026년 비교 글
> **본 문서는 사실 비교만 다룸**

---

## 1. 백엔드 프레임워크

### 1.1 Node.js 진영

| 프레임워크 | 주간 다운로드 (2026Q1) | 처리량 (req/s) | 학습 곡선 | 특징 |
|---|---|---|---|---|
| Express | ~30M+ | 10K-15K | 낮음 | 가장 많이 쓰임, 미들웨어 생태계 광대 |
| NestJS | ~4M | 20K-30K | 높음 | 의존성 주입, 모듈 시스템, Spring 풍 |
| Fastify | ~3.5M | 30K-76K | 중 | 스키마 검증 내장, 가장 빠른 Node 프레임워크 |
| Hono | ~600K | 60K+ | 낮음 | Edge 런타임 (Cloudflare/Vercel/Deno/Bun) |
| Koa | ~2M | 12K-18K | 낮음 | Express 후속 (TJ Holowaychuk) |

#### 라우팅 비교 코드

```ts
// Hono (Edge native)
import { Hono } from 'hono';
const app = new Hono();
app.get('/attractions/:id', (c) => c.json({ id: c.req.param('id') }));

// Fastify (with schema)
import Fastify from 'fastify';
const f = Fastify();
f.get('/attractions/:id', {
  schema: { params: { id: { type: 'string' } } }
}, async (req) => ({ id: req.params.id }));
```

### 1.2 Python

| 프레임워크 | 처리량 (req/s) | 응답 시간 | 특징 |
|---|---|---|---|
| FastAPI | 30K-40K | ~25ms | async-first, Pydantic, 자동 OpenAPI |
| Django + DRF | 8K-12K | ~100ms | 배터리 포함, ORM, Admin |
| Flask | 5K-8K | ~50ms | 마이크로프레임워크 |
| Litestar | 25K-35K | ~30ms | FastAPI 대안, 더 빠름 |

### 1.3 Java/Kotlin

| 프레임워크 | 특징 | 한국 채택 |
|---|---|---|
| Spring Boot 3.x | 표준, JVM 17+ 요구, GraalVM 네이티브 지원 | 우아한형제들, 토스, 카카오 (대부분) |
| Quarkus | Cloud-native, 빠른 부팅 | 일부 |
| Ktor | Kotlin 네이티브 | 일부 |
| Micronaut | DI 컴파일 타임 | 소수 |

### 1.4 Go / Rust

| 언어 | 프레임워크 | 특징 |
|---|---|---|
| Go | Gin, Echo, Fiber, Chi | 동시성, 단순한 배포 |
| Rust | Actix-web, Axum, Rocket | 메모리 안전, 최고 성능 |

---

## 2. 서버리스 / Edge

### 2.1 가격 비교 (2026)

| 서비스 | 무료 티어 | 유료 시작 | 청구 단위 |
|---|---|---|---|
| AWS Lambda | 1M req + 400K GB-s/월 (영구) | $0.20/1M req + $0.0000167/GB-s | 호출 + 메모리·시간 |
| Cloudflare Workers | 100K req/일, 10ms CPU/호출 | $5/월 (10M req + 30M CPU-ms 포함) | CPU time |
| Vercel Functions | Hobby 100GB/100h | Pro $20/월 | 실행 시간 + 메모리 |
| Netlify Functions | 125K req/월 | Pro $19/월 | 실행 시간 |
| Deno Deploy | 1M req/월 | $20/월 | request count |
| Supabase Edge Functions | 500K invoke/월 | Pro $25/월 | invocations |

### 2.2 Edge 런타임 차이

| 런타임 | Node 호환 | Web Standards | 콜드 스타트 |
|---|---|---|---|
| Cloudflare Workers | 부분 (nodejs_compat) | 풀 | <5ms (V8 isolate) |
| Vercel Edge Functions | 부분 | 풀 | <10ms |
| Deno Deploy | 부분 | 풀 | <10ms |
| AWS Lambda@Edge | 풀 (Node 20) | - | 50-200ms |

---

## 3. 데이터베이스

### 3.1 RDB

| DB | 라이선스 | 특징 | 관광 적합성 |
|---|---|---|---|
| PostgreSQL 16/17 | Open (PostgreSQL) | JSONB, PostGIS, pg_vector, 확장성 | 위치 검색, 추천(벡터) 통합 |
| MySQL 8 | GPL/Commercial | 익숙함, 성숙 | 일반 CRUD |
| MariaDB | GPL | MySQL fork | 일반 CRUD |
| SQLite | PD | 임베디드, 매우 가벼움 | 모바일 캐시, edge |
| TiDB | Apache | NewSQL, MySQL 호환, 분산 | 대규모 |
| CockroachDB | BSL | NewSQL, PostgreSQL 호환, 글로벌 분산 | 멀티리전 |

### 3.2 NoSQL

| DB | 모델 | 특징 |
|---|---|---|
| MongoDB | Document | 유연 스키마, 집계 파이프라인 |
| Redis | Key-Value/Stream | 인메모리, pub/sub, vector search |
| DynamoDB | Key-Value | AWS, 무한 확장, 단순 키 패턴 |
| Cassandra | Wide-column | 쓰기 우선 |
| ScyllaDB | Wide-column | C++ 재구현, Cassandra 호환 |

### 3.3 BaaS / Managed PostgreSQL

| 서비스 | 시작 가격 | 무료 티어 | PostGIS | pgvector | 특징 |
|---|---|---|---|---|---|
| Supabase | $25/월 (Pro) | O (500MB DB, 5GB BW) | O | O | Postgres + Auth + Storage + Realtime + Edge Functions |
| Firebase | 무료 (Spark) → Blaze 종량제 | O | X (Firestore NoSQL) | X | NoSQL, mobile-first |
| Neon | $5/월 최소 | O (100 CU-h) | O | O | Serverless Postgres, branching |
| PlanetScale | $5/월 시작 | X (2026.2 무료 제거) | X (MySQL) | X | Vitess 기반, branching |
| Convex | $25/월 | O | X (proprietary) | X | Reactive, document |
| Xata | $0 | O | X | O | Postgres + 검색 통합 |

#### 2026 가격 동향
- Neon: 2025년 Databricks 인수 후 컴퓨트 15-25%↓, 스토리지 $1.75 → $0.35/GB-month
- PlanetScale: 무료 티어 제거 (2026.2)
- Supabase: 프로덕션 워크로드에서 Firebase 대비 40-60% 저렴 (2026 비교 기준)
- Convex: 5,000 동시연결 시 sub-50ms 지연, Supabase는 100-200ms p99

### 3.4 PostGIS — 위치 데이터 핵심

```sql
-- WGS84 좌표 컬럼
ALTER TABLE attractions ADD COLUMN geom geography(POINT, 4326);
UPDATE attractions SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
CREATE INDEX idx_attractions_geom ON attractions USING GIST (geom);

-- 반경 5km 내 명소
SELECT id, name, ST_Distance(geom, ST_MakePoint(127.0, 37.5)::geography) AS dist
FROM attractions
WHERE ST_DWithin(geom, ST_MakePoint(127.0, 37.5)::geography, 5000)
ORDER BY dist;
```

---

## 4. 캐시 / 큐

| 서비스 | 종류 | 가격 (2026) |
|---|---|---|
| Redis (self) | KV/cache | OSS 무료 (라이선스 변경 SSPL/RSALv2) |
| Valkey | Redis fork | BSD-3 (Linux Foundation) |
| Upstash Redis | Serverless Redis | Free 10K/일, 종량제 $0.2/100K req |
| Upstash Kafka | Kafka serverless | 종량제 |
| AWS ElastiCache | Managed Redis | 인스턴스 시간 기반 |
| Memcached | KV | OSS |

---

## 5. 검색 엔진

### 5.1 비교표

| 엔진 | 라이선스 | 언어 | 무료 (Self) | 클라우드 시작 가격 | 한국어 형태소 |
|---|---|---|---|---|---|
| Elasticsearch | SSPL/Elastic v2 | Java (JVM) | O | Elastic Cloud $16/월 | nori 플러그인 |
| OpenSearch | Apache 2 (Elastic fork) | Java | O | AWS OpenSearch | nori |
| Meilisearch | MIT | Rust | O | Cloud $59/월 (250K records) | 내장 |
| Typesense | GPL-3 | C++ | O | Cloud ~$30/월 | 내장 |
| Algolia | Proprietary | - | X | $0.50-1/1K searches, free 10K/M | O |
| Solr | Apache 2 | Java | O | - | nori (Lucene) |

### 5.2 가격 — 100K 레코드, 1M 검색/월

| 엔진 | 월 비용 |
|---|---|
| Algolia | ~$1,000 |
| Meilisearch Cloud | ~$59 |
| Typesense Cloud | ~$50 |
| Self-host (VPS) | ~$20 |

### 5.3 한국어 검색 — Nori 분석기

```json
PUT /attractions
{
  "settings": {
    "analysis": {
      "analyzer": {
        "korean": {
          "type": "custom",
          "tokenizer": "nori_tokenizer",
          "filter": ["nori_part_of_speech", "lowercase"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "korean" }
    }
  }
}
```

---

## 6. 벡터 DB (AI 추천/RAG용)

### 6.1 가격 (10M vectors 기준)

| DB | 자체 호스팅 | 매니지드 |
|---|---|---|
| pgvector | $0 (기존 PG 활용) | RDS ~$45/월 |
| Qdrant | $30-50/월 (8GB VPS) | Cloud $100-300/월 |
| Weaviate | $50-100/월 (16GB) | Cloud $135-400/월 |
| Pinecone | (없음, 관리형 only) | Serverless ~$70/월 |
| Milvus | $30+/월 | Zilliz Cloud $99+/월 |
| Chroma | $0 (Python 임베디드) | Cloud (베타) |
| LanceDB | $0 (임베디드) | - |

### 6.2 가격 (100M vectors)

| DB | 월 비용 |
|---|---|
| Pinecone Serverless | $700+ |
| pgvector / Milvus self-host | <$100 |

### 6.3 Pinecone 단가 상세
- Storage: $0.33/GB·월
- Reads: $8.25/1M Read Units
- Writes: $2.00/1M Write Units

---

## 7. 호스팅 / 배포

### 7.1 글로벌 PaaS

| 서비스 | 시작 가격 | 무료 티어 | 특징 |
|---|---|---|---|
| Vercel | $20/월/시트 (Pro) | Hobby (100GB BW, 100h) | Next.js 1급, AI Gateway |
| Netlify | $19/월 (Pro) | Free (100GB BW) | JAMstack, Edge Functions |
| Cloudflare Pages | $5/월 (Workers Paid) | 무제한 BW + Workers 100K req/일 | Workers 통합 |
| Render | $7/월 (Web Service) | Free (sleep) | Heroku 대안 |
| Railway | $5/월 (Hobby) | $5 크레딧 | 단순한 배포 |
| Fly.io | $5/월 minimum | small VM 무료 (3개) | 글로벌 엣지 |

### 7.2 IaaS

| 서비스 | 위치 | 한국 리전 |
|---|---|---|
| AWS | 글로벌 | 서울 (ap-northeast-2), 부산 |
| GCP | 글로벌 | 서울 (asia-northeast3) |
| Azure | 글로벌 | 한국 중부/남부 |

### 7.3 한국 클라우드

| 서비스 | 운영사 | 정부 GPU 할당 (2026) | 특징 |
|---|---|---|---|
| Naver Cloud Platform | NAVER | H200 3,056장 | 국내 1위, 공공 인증 다수 (CSAP) |
| NHN Cloud | NHN | B200 7,656장 | 국내 2위, GPU 최대 |
| Kakao Cloud | Kakao Enterprise | B200 2,424장 | 신생, 카카오 생태계 |
| KT Cloud | KT | - | 국내, 토종 |
| Samsung SDS Cloud | 삼성 | - | 그룹 중심 |

#### CSAP (Cloud Security Assurance Program)
- 공공기관 도입 시 필수
- NCloud / NHN Cloud / Kakao Cloud 모두 인증 보유
- AWS/GCP/Azure는 일부 서비스만 (CSAP-하)

---

## 8. CI/CD

| 서비스 | 무료 분/월 | 특징 |
|---|---|---|
| GitHub Actions | Public 무제한, Private 2,000분 | YAML, 마켓플레이스 |
| GitLab CI/CD | 400분 (Free) | 통합 |
| CircleCI | 6,000 build min | Docker 1급 |
| Vercel CI | Git 통합 자동 | preview deploy |
| Netlify CI | 300 build min | JAMstack |
| Bitrise | 200 build min | 모바일 1급 |
| Codemagic | 500 build min | Flutter 1급 |

### 8.1 GitHub Actions 워크플로 예제

```yaml
name: Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 9. 컨테이너 / 오케스트레이션

| 도구 | 용도 |
|---|---|
| Docker | 컨테이너 |
| Docker Compose | 로컬 다중 컨테이너 |
| Kubernetes | 오케스트레이션 |
| K3s / k0s | 경량 K8s |
| Nomad | HashiCorp 오케스트레이션 |
| Podman | Docker 대체 (rootless) |

---

## 10. 출처

### 백엔드
- NestJS vs Fastify vs Hono 2026: https://encore.dev/articles/nestjs-vs-fastify-vs-hono
- Hono Benchmarks: https://hono.dev/docs/concepts/benchmarks
- FastAPI vs Django: https://www.lastingdynamics.com/blog/fastapi-vs-django/
- Spring Boot: https://spring.io/projects/spring-boot

### DB
- Supabase Pricing: https://supabase.com/pricing
- Neon Pricing: https://neon.com/pricing
- PlanetScale: https://planetscale.com/docs/postgres/pricing
- Convex: https://www.convex.dev/pricing
- Supabase vs Firebase: https://www.weweb.io/blog/supabase-vs-firebase-comparison-for-web-apps
- PostGIS: https://postgis.net/

### 검색
- Typesense vs Algolia vs Meilisearch: https://typesense.org/typesense-vs-algolia-vs-elasticsearch-vs-meilisearch/
- Elastic Nori: https://www.elastic.co/guide/en/elasticsearch/plugins/current/analysis-nori.html

### 벡터 DB
- Vector DB 가격 비교: https://leanopstech.com/blog/vector-database-cost-comparison-2026/
- pgvector: https://github.com/pgvector/pgvector
- Pinecone: https://www.pinecone.io/pricing/

### 서버리스
- Cloudflare Workers Pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Vercel Pricing: https://vercel.com/pricing
- AWS Lambda Pricing: https://aws.amazon.com/lambda/pricing/

### 한국 클라우드
- NCloud: https://www.ncloud.com/
- NHN Cloud: https://www.nhncloud.com/
- Kakao Cloud: https://www.kakaocloud.com/
- 정부 GPU 할당 (2026): https://www.digitaltoday.co.kr/en/view/49417/
