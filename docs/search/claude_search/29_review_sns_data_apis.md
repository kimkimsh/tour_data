# 29. 리뷰 / SNS 데이터 API — 수집 가능성 / 제약 / 대안

> 본 문서는 관광 도메인에서 자주 쓰이는 리뷰·SNS·POI 데이터 소스(네이버/카카오/구글/인스타그램/유튜브/틱톡/트립어드바이저 등)의 공식 API, 정책, 크롤링 가능성, 대체 수단을 사실 기준으로 정리한다. 각 정책은 시점에 따라 변동되므로 본문에 명시된 조항·가격·한도는 2025~2026년 초 기준으로 작성되었으며, 실제 사용 전 각 플랫폼 약관 최신본 재확인이 필수다.

---

## A. 한국 지도/플레이스 — 네이버 / 카카오

### A-1. 네이버 지도 / 플레이스
**공식 API 카탈로그 (NAVER Cloud Platform AI·NAVER API):**

| API | 용도 | 공식 URL |
|---|---|---|
| Maps JavaScript API v3 | 지도 표출 | https://navermaps.github.io/maps.js.ncp/ |
| Maps Static Map | 정적 지도 이미지 | https://api.ncloud-docs.com/docs/ai-naver-mapsstaticmap |
| Geocoding / Reverse Geocoding | 주소↔좌표 | https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding |
| Directions 5 / Directions 15 | 경로(자동차) | https://api.ncloud-docs.com/docs/ai-naver-mapsdirections |
| **Search API — 지역(local)** | "맛집/관광지" 키워드 검색 | https://developers.naver.com/docs/serviceapi/search/local/local.md |
| **Search API — 블로그/카페/뉴스/책/쇼핑** | 일반 검색 | https://developers.naver.com/docs/serviceapi/search/ |
| Datalab API | 검색어 트렌드 | https://developers.naver.com/docs/serviceapi/datalab/search/search.md |
| Papago Translation | 번역 | https://api.ncloud-docs.com/docs/ai-naver-papagonmt |

**리뷰 데이터 정책 — 핵심 사실:**
- **네이버 플레이스/Map의 「방문자 리뷰」, 「블로그 리뷰」 본문 자체를 제공하는 공식 Open API는 존재하지 않는다.**
- 「검색 API → 지역(local)」은 상호/주소/카테고리/전화/좌표만 반환하며, 별점·리뷰 본문·사진은 미포함. (응답 필드: `title, link, category, telephone, address, roadAddress, mapx, mapy`).
- 「검색 API → 블로그」는 네이버 블로그 검색 결과 메타(제목/URL/요약 200자/블로거ID/날짜)만 반환. 본문 전체는 별도 크롤링 필요.
- 네이버 검색 API 일일 호출 한도: 기본 25,000회/일 (애플리케이션당), 초과는 별도 신청.

**네이버 약관·robots — 크롤링 관련 사실:**
- 네이버 통합 robots.txt(https://www.naver.com/robots.txt)는 다수 경로를 `Disallow`로 막고 있고, 검색 결과 페이지·플레이스 상세 페이지를 비공식적으로 크롤링하는 것은 네이버 「서비스 이용약관」 위반 소지가 있다.
- 「네이버 콘텐츠 보호정책」 및 저작권법(데이터베이스 제작자의 권리, 저작권법 제93조) 위반 가능성.
- 영리 목적 대량 수집 시 민·형사 리스크. 과거 사례: 2017 「잡코리아 vs 사람인」 DB권 침해 판결, 「코비카·다나와」 등.

**실무 대안:**
1. 네이버 자체 위젯/링크: 「상세 페이지로 이동」 형태로 외부 링크만 제공.
2. 인플루언서/제휴 콘텐츠를 자체 CMS에 수집.
3. 사용자 생성 리뷰(자체 서비스 내 작성)를 수집.

### A-2. 카카오맵 / 카카오 로컬
**공식 API:**

| API | 용도 | 공식 URL |
|---|---|---|
| 카카오맵 Web API | 지도 표출 | https://apis.map.kakao.com |
| Kakao Local API — 키워드/카테고리/좌표 검색 | POI 검색 | https://developers.kakao.com/docs/latest/ko/local/dev-guide |
| Kakao Local — 주소 검색 / 좌표→주소 | 지오코딩 | (위와 동일 가이드) |
| Kakao Map URL Scheme (place_url) | 카카오맵 상세 페이지 링크 | (Local API 응답에 포함) |
| 카카오모빌리티 Navi API | 길찾기/택시 | https://developers.kakaomobility.com |

**Kakao Local 응답 필드 (place 검색):**
`place_name, category_name, category_group_code, phone, address_name, road_address_name, x(경도), y(위도), place_url, distance` — **별점·리뷰·사진 미포함**.

**리뷰 정책 사실:**
- 카카오맵 「방문자 리뷰」, 「장소 추천」 본문/별점을 제공하는 공식 Open API는 없다.
- `place_url`로 카카오맵 상세 페이지(https://place.map.kakao.com/{id})를 외부 링크할 수 있으나, 페이지 내 리뷰 데이터를 자동 파싱하는 것은 「카카오 서비스 약관」 위반 가능.

**일일 호출 한도 (Kakao REST API 일반):**
- 앱 단위 쿼터, 기본 무료 한도 존재. 카카오 디벨로퍼스 콘솔에서 확인.

### A-3. SK텔레콤 TMAP — POI
- TMAP Open API (https://openapi.sk.com/products/detail?prodKey=tmap) — POI 검색, 경로, 자동차/도보/대중교통.
- 응답에 별점/리뷰 없음. POI 마스터(상호/주소/카테고리)만 제공.

### A-4. VWorld
- 정부 표준 공간정보 — POI 일부, 행정경계, 지형/항공/위성 영상.
- https://www.vworld.kr/dev/v4dv_geocoderguide_s001.do

---

## B. 글로벌 지도/리뷰 플랫폼

### B-1. Google Maps Platform
**Places API (New) — 2024년 리뉴얼 후 사실:**
- Endpoint: `https://places.googleapis.com/v1/places/...`, `searchText`, `nearbySearch`.
- 응답 필드(가용): `displayName, formattedAddress, location, types, rating, userRatingCount, priceLevel, currentOpeningHours, photos, websiteUri, googleMapsUri, **reviews**`.
- **리뷰 5건까지** (`reviews` 필드, `Place.reviews`) — 작성자, 별점, 텍스트(원문/번역), 작성시간, 상대시간 표기 제공. https://developers.google.com/maps/documentation/places/web-service/place-details
- **표시 의무**: 구글 리뷰는 「Google 어트리뷰션」(작성자 사진/이름/Google 로고) 표시 필수. 임의 가공·재정렬·익명화·요약 후 단독 노출 금지(약관 §3.2.3, https://cloud.google.com/maps-platform/terms/).
- **저장 제한 (Caching)**: Place ID는 무기한 캐싱 가능. 다른 필드(주소/이름/평점 등)는 30일 캐시 한도. 단, ID는 변동 가능하니 주기적 refresh 요구.
- **요금**: SKU 단위 과금. 매월 $200 무료 크레딧(과거) → 2024년 변경, 모니터링 필요. https://mapsplatform.google.com/pricing/
- **이용 금지**: 구글 컨텐츠를 다른 지도(예: 네이버맵, 카카오맵, OSM) 위에 표시 금지.

### B-2. TripAdvisor Content API
- 공식: https://developer-tripadvisor.com (구 TripAdvisor for Developers).
- **Content API** — Location Search, Location Details, Location Photos, **Location Reviews**.
- 응답: 상호, 주소, 좌표, 평점, 리뷰 5건(스니펫), 사진 5장(다양성 한정).
- 사용 조건:
  - **TripAdvisor 로고 + 평점/리뷰 출처 링크 의무 표시**.
  - 리뷰/평점만 단독 추출 금지, 항상 "View on TripAdvisor" CTA 동반.
  - 호출 한도: 무료 50,000 calls/month, 초과는 상용 협상.
- 가입: 비즈니스/제휴 검토 후 키 발급.

### B-3. Yelp Fusion API
- https://docs.developer.yelp.com/docs/fusion-intro
- Business Search, Business Details, **Reviews (3개 발췌, 원문 일부 토큰 truncate)**.
- 한국 데이터 매우 빈약 → 한국 관광에는 활용도 낮음.
- 무료 한도: 5,000 calls/day, 출처 표기 의무.

### B-4. Foursquare Places API
- https://docs.foursquare.com/developer/reference/places-api-overview
- POI 마스터, **Tips (간단 리뷰)**, 사진, 카테고리(거의 1,000여 종).
- 한국 커버리지: 주요 도시는 OK이나 시골/소상공인은 빈약.
- 무료 티어 + 사용량 과금.

### B-5. OpenStreetMap (OSM)
- POI: `amenity`, `tourism`, `historic`, `natural`, `leisure` 등 태그.
- 공식 API: Overpass API (https://overpass-api.de), Nominatim (지오코딩).
- ODbL 라이선스 — 출처 표기 + share-alike (가공 데이터 공개).
- 한국 커버리지: 도시 중심부는 양호, 소상공인·관광지 메타는 한국 상용 지도(네이버/카카오) 대비 부족.
- **OSM에는 별점/리뷰 자체가 없다.**

### B-6. Wikivoyage / Wikipedia
- 위키미디어 API (https://en.wikipedia.org/w/api.php).
- CC BY-SA 4.0 라이선스. 출처 표시 + 동일 라이선스 공유.
- Wikivoyage는 여행 가이드 위키. 한국어판 빈약, 영어판이 활성.

### B-7. Booking / Expedia / Agoda / Klook
- **Booking.com Demand API** — B2B 제휴(Affiliate Partner Program 가입). 호텔 콘텐츠+리뷰 일부.
- **Expedia Group EPS Rapid API** — 마찬가지로 제휴 가입.
- **Agoda Affiliate** — 제한적.
- **Klook Partner API** — 액티비티/투어 인벤토리.
- **Hotelbeds, RateHawk, Travelport, Sabre, Amadeus** — 글로벌 호텔/항공 GDS.
- 일반 개발자/스타트업은 가입 심사 필요. 리뷰 단독 추출은 약관 위반 다수.

### B-8. GetYourGuide / Viator / Tiqets
- 액티비티 마켓플레이스. 제휴(Affiliate) 또는 파트너 API.
- Viator (TripAdvisor 자회사) Partner API: https://www.viator.com/partner/

---

## C. 소셜 미디어 — 공식 API

### C-1. Instagram
**현황 (2025 기준):**
- **Instagram Basic Display API**는 2024년 9월에 **deprecated/종료**.
- 대체: **Instagram API with Instagram Login** (Meta), 또는 **Instagram Graph API** (비즈니스/크리에이터 계정용).
- 공식: https://developers.facebook.com/docs/instagram-platform

**가능한 작업:**
- 비즈니스/크리에이터 계정 본인 미디어 조회.
- **Hashtag Search**: 30일 내 인기 해시태그 게시물 50개 (rate-limited, 7일 30개 해시태그 한도).
- **Mentions**: 본인 계정 멘션.
- **User Insights, Media Insights** — 본인 계정 분석.
- Stories/Reels는 일부만.

**금지/제약:**
- 일반 사용자 게시물 무차별 수집 불가.
- 위치 기반(location_id)으로 게시물 검색은 일부 가능했으나 점진적으로 축소.
- "스크래핑" 명시적 금지 (META 플랫폼 약관, https://www.facebook.com/legal/terms).
- 2024년 Bright Data v Meta 판결 등 법적 다툼 진행형.

### C-2. Facebook (Meta)
- **Facebook Graph API** — 페이지/그룹 본인 데이터, 광고/마케팅.
- 일반 사용자 타임라인은 비접근.

### C-3. TikTok
**공식 API:**
- **TikTok for Developers** — https://developers.tiktok.com
  - Login Kit (OAuth)
  - Content Posting API (본인 계정에 업로드)
  - Display API — 본인 게시물 조회
  - **Research API** — 학술 연구자용, 미국·EU만 신청 가능, 게시물·해시태그·사용자 메타 조회 가능. 한국 연구자 신청 가능 여부 제한적. https://developers.tiktok.com/products/research-api
  - **Commercial Content API** — 광고/마케팅 데이터 (브랜드/에이전시).
- **TikTok Embed**: https://www.tiktok.com/embed/v2/{video_id} — oEmbed 표준 https://www.tiktok.com/oembed?url=...

**제약:**
- 일반 비즈니스/마케팅 용도의 콘텐츠 수집 API는 없음.
- 스크래핑은 ToS 위반.

### C-4. YouTube
**공식 — YouTube Data API v3:** https://developers.google.com/youtube/v3
- **search.list** — 키워드/지역/언어/날짜로 영상 검색 (한 호출 100 quota units).
- **videos.list** — 영상 메타, 통계(조회수/좋아요/댓글수).
- **commentThreads.list / comments.list** — **공개 영상 댓글 수집 가능** (1 quota unit).
- **channels.list, playlists.list, captions.list (자막은 채널 소유자만 다운 가능)**.
- 일일 quota: 기본 10,000 units/day (애플리케이션). 증액은 신청.
- 무료, 단 어트리뷰션 의무.

**자막 (다운로드):**
- 공개 자막은 `captions.list`로 메타만 가능, 본문 다운은 채널 소유자 인증 필요.
- 비공식적으로 `youtube-transcript-api` 등 라이브러리 존재(타임텍스트 엔드포인트) — 약관상 회색지대.

### C-5. X (Twitter)
- **X API v2** — https://developer.x.com
  - 무료/Basic/Pro/Enterprise 티어 (가격 큰폭 인상, 2023~).
  - 무료: read 매우 제한, 본인 계정 위주.
  - Basic ($200/월), Pro ($5,000/월), Enterprise는 협상.
- 한국 관광 컨텍스트에서는 비용 대비 효용 낮음.

### C-6. 네이버 블로그 / 카페
- **네이버 검색 API → 블로그** — 메타+요약 200자만. https://developers.naver.com/docs/serviceapi/search/blog/blog.md
- 본문 전체 수집은 robots/약관 위반 소지.
- 「네이버 블로그 SDK」는 본인 블로그용.
- 카페는 비공개·로그인 필수 영역이 많아 공식 API 없음.

### C-7. 다음 / Daum (Kakao)
- **Kakao Search API** — https://developers.kakao.com/docs/latest/ko/daum-search/dev-guide
- 웹/이미지/동영상/블로그/카페/책 검색. 본문은 일부만.

### C-8. 위챗 / 웨이보 / 더우인 / 샤오훙슈 (중국 인바운드 관광)
- 중국 SNS는 **공식 Open API가 사실상 없거나 외국 개발자 접근이 어렵다.**
- **WeChat Open Platform / 위챗 미니프로그램 API** — 가입 후 미니프로그램 단위 데이터 일부.
- **Weibo API** — 2017 이후 외국 개발자 신규 가입 거의 차단.
- **샤오훙슈(小红书, RED)** — 공식 Open API 없음, 광고 자체 플랫폼만.
- **더우인(抖音)** — TikTok 본가, 중국 내수용 별도, 외국 접근 어려움.
- 한국 인바운드 인사이트는 보통 **상용 SaaS(Dataeum, Kantar, Brandwatch, Talkwalker, Resemble.ai 등)** 또는 **국내 마케팅 에이전시 제휴**로 우회.

### C-9. 핀터레스트 / 스냅 / 스레드
- Pinterest API: https://developers.pinterest.com — 본인 보드/핀.
- Snap Marketing API.
- Threads API: https://developers.facebook.com/docs/threads — 본인 계정.

---

## D. 리뷰 의미 검색 / 임베딩 / 벡터DB

### D-1. 임베딩 모델 (한국어 + 다국어)
| 모델 | 차원 | 한국어 | 비고 |
|---|---|---|---|
| OpenAI `text-embedding-3-large` | 3072 (축소 가능) | 우수 | https://platform.openai.com/docs/models/embeddings |
| OpenAI `text-embedding-3-small` | 1536 | 우수 | 저비용 |
| Cohere Embed v3 (multilingual-light) | 384/1024 | 우수 | https://docs.cohere.com/docs/embeddings |
| Voyage AI `voyage-3` | 1024 | 양호 | https://docs.voyageai.com |
| Google Vertex AI `text-embedding-004` | 768 | 양호 | https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings |
| **BGE-M3** (BAAI) | 1024 | 우수, 다국어, sparse+dense | https://huggingface.co/BAAI/bge-m3 |
| **KURE-v1** (NLP-AI Lab) | 1024 | 한국어 특화 | https://huggingface.co/nlpai-lab/KURE-v1 |
| **ko-sroberta-multitask** | 768 | 한국어 sentence-BERT | https://huggingface.co/jhgan/ko-sroberta-multitask |
| **multilingual-e5-large-instruct** | 1024 | 다국어 | https://huggingface.co/intfloat/multilingual-e5-large-instruct |
| Naver HyperCLOVA-X Embedding | n/a | 한국어 최적 | CLOVA Studio API |
| Upstage Solar Embeddings | 4096 | 한국어 우수 | https://developers.upstage.ai |

### D-2. 벡터 DB
| DB | 모델 | 특징 | URL |
|---|---|---|---|
| **Pinecone** | SaaS | 매니지드, 표준 | https://www.pinecone.io |
| **Weaviate** | OSS / SaaS | 모듈화, GraphQL | https://weaviate.io |
| **Qdrant** | OSS / Cloud | Rust, 빠름 | https://qdrant.tech |
| **Milvus / Zilliz** | OSS / Cloud | 대규모 분산 | https://milvus.io |
| **Chroma** | OSS | 로컬 친화 | https://www.trychroma.com |
| **pgvector** | Postgres 확장 | 익숙한 SQL | https://github.com/pgvector/pgvector |
| **Vespa** | OSS / Cloud | Yahoo 검색 엔진 베이스, BM25+벡터 하이브리드 | https://vespa.ai |
| **Elasticsearch / OpenSearch (k-NN)** | OSS | 검색+벡터 | https://opensearch.org |
| **Typesense** | OSS | 가벼움 | https://typesense.org |
| **Marqo** | OSS | 텐서 검색 | https://www.marqo.ai |
| **MongoDB Atlas Vector Search** | SaaS | 통합 | https://www.mongodb.com/products/platform/atlas-vector-search |
| **Redis Stack (RediSearch)** | OSS / Cloud | 실시간 | https://redis.io/docs/stack/search/ |
| **LanceDB** | OSS | Embedded, 컬럼 | https://lancedb.com |
| **TurboPuffer** | SaaS | 서버리스 벡터 | https://turbopuffer.com |
| **Supabase Vector (pgvector)** | SaaS | Postgres 기반 | https://supabase.com/vector |

### D-3. 하이브리드 검색
- BM25 (lexical) + Dense embedding(semantic) 점수 결합 (Reciprocal Rank Fusion 등).
- Cross-encoder Rerank: `bge-reranker-v2-m3`, Cohere Rerank, Voyage rerank.
- LLM-as-Reranker: GPT-4o-mini / Claude Haiku로 top-K 재정렬.

### D-4. 리뷰 → 의미 검색 파이프라인
1. 리뷰 수집(자체 작성/제휴/공공데이터) → 정규화 (HTML 제거, 이모지 제거, 형태소).
2. 청킹 (50~200자 권장, 리뷰는 통째로도 OK).
3. 임베딩 → 벡터DB.
4. 사용자 자연어 쿼리("아이와 갈만한 조용한 카페") → 임베딩 → ANN 검색.
5. (옵션) 리랭킹 → LLM 합성/요약.

---

## E. 텍스트 전처리 / 가공

### E-1. 한국어 전처리
- 토큰화: Mecab-ko (가장 빠름), Kiwi (https://github.com/bab2min/Kiwi), Khaiii(카카오), Komoran, Okt.
- 정규화: `soynlp.normalizer` (반복 글자 축약), `kss` (한국어 문장 분리, https://github.com/hyunwoongko/kss).
- 욕설/혐오: KoSentiLex, Korean Hate Speech Dataset, KOLD.
- 띄어쓰기 교정: `pykospacing`, Kiwi.

### E-2. 감성/측면 분석
- 일반 감성: NSMC fine-tuned KoBERT/KoELECTRA.
- ABSA (Aspect-based): KOSAC, KSAE 데이터셋 + KLUE-RoBERTa fine-tune.
- LLM zero-shot: GPT-4o, HyperCLOVA-X로 리뷰별 측면 추출.

### E-3. 토픽 모델 / 키워드
- BERTopic + Kiwi tokenizer + multilingual-e5/KURE 임베딩.
- KeyBERT (한국어).
- LDA (gensim).

---

## F. 라이선스 / 약관 / 법적 사실

### F-1. 한국 저작권법 — 데이터베이스 제작자의 권리
- 저작권법 제93조 — 데이터베이스 제작자는 그 DB의 전부 또는 상당한 부분의 복제·배포·방송·전송에 관한 권리를 가짐. 보호기간 5년(갱신 가능).
- 즉, 네이버/카카오/구글 등의 「리뷰·플레이스 DB」 자체를 상당량 복제 시 권리 침해 소지.
- 「공정이용」(저작권법 제35조의5), 「데이터마이닝 면책」(제35조의5 제2항, 2023 신설) 조항이 있으나 영리 목적·시장 대체 용도는 면책 어려움.

### F-2. 정보통신망법 / 개인정보보호법
- 리뷰 작성자 식별정보(닉네임, 프로필) 수집 시 「개인정보」에 해당할 수 있음.
- 자동수집(스크래핑) 시 「정보통신망법 제48조」(정보통신망 침해 금지) 적용 가능.

### F-3. 플랫폼별 약관 핵심
| 플랫폼 | 자동수집 금지 명시 |
|---|---|
| 네이버 | 「네이버 운영정책」 — 자동화된 수단으로 콘텐츠 수집·복제 금지 |
| 카카오 | 「카카오 서비스 약관」 — 동일 취지 |
| 구글 | Maps Platform Terms §3.2.3 — 캐싱·재배포 제한 |
| 인스타그램/페이스북 | Platform Policy — 스크래핑 명시적 금지 |
| X/Twitter | Developer Agreement — 비공식 수집 금지 |
| TripAdvisor | Content API ToU — 출처/링크 의무, 단독 추출 금지 |

### F-4. 합법적 대안 정리
1. **공식 API 사용** — 한도/약관 준수.
2. **사용자 자체 작성 리뷰** — 본 서비스 내에서 직접 수집(별도 동의·이용약관).
3. **공공 데이터** — TourAPI, 공공누리 콘텐츠, 공공데이터포털 리뷰성 데이터셋(드물지만 일부 지자체 보유).
4. **제휴 / 라이선싱** — TripAdvisor Content API, Booking 제휴, Klook 파트너.
5. **상용 데이터 마켓** — Bright Data, Apify, Oxylabs (자기 책임 — 데이터별 라이선스 재확인 필수).
6. **인플루언서 협업** — 합의된 콘텐츠 게재.
7. **KOCIS, 한국관광 데이터랩 「소셜 분석」** — 공공기관이 가공한 SNS 트렌드 보고서 활용.

---

## G. 리뷰/SNS 데이터를 가공해주는 SaaS / 솔루션

### G-1. 글로벌 소셜 리스닝
| 도구 | 한국어 지원 | URL |
|---|---|---|
| Brandwatch | 양호 | https://www.brandwatch.com |
| Talkwalker (Hootsuite) | 양호 | https://www.talkwalker.com |
| Meltwater | 양호 | https://www.meltwater.com |
| Sprinklr | 양호 | https://www.sprinklr.com |
| Crimson Hexagon (Brandwatch에 흡수) | - | - |
| Sprout Social | 보통 | https://sproutsocial.com |
| YouScan | 보통 | https://youscan.io |

### G-2. 한국 소셜 분석
| 도구 | 특징 | URL |
|---|---|---|
| **썸트렌드 (Sometrend)** by 바이브컴퍼니 | 한국 블로그/뉴스/커뮤니티/SNS 키워드 분석, 무료 일부 | https://some.co.kr |
| **소셜메트릭스 인사이트** by 데이블 | 키워드 트렌드, 연관어, 감성 | https://www.socialmetrics.co.kr |
| **버즈박스 / TrendUp** by 잡플래닛 (구) | 트렌드 | (서비스별 확인) |
| **데이터스토리** | 마이크로 인플루언서 분석 | https://datastories.co.kr |
| **TINT analytics**, **Konec**, **빅카인즈** (뉴스 기반) | 뉴스 빅데이터 | https://www.bigkinds.or.kr |
| **네이버 데이터랩** | 검색 트렌드 무료 | https://datalab.naver.com |
| **카카오 데이터트렌드** | 다음 검색 트렌드 | https://datatrend.kakao.com |
| **구글 트렌드** | 글로벌+한국 | https://trends.google.com |

### G-3. 리뷰 통합 SaaS (호스피탈리티)
- **TrustYou, ReviewPro (Shiji), Revinate, Customer Alliance** — 호텔용. 다채널 리뷰 통합 + 감성.
- 한국: **HOM(호텔다와) 리뷰 매니저, 야놀자/여기어때 자체 리뷰 시스템**.

---

## H. 인플루언서 / UGC

### H-1. 인플루언서 마켓플레이스
- **Aspire (구 AspireIQ)**, **CreatorIQ**, **Grin**, **Upfluence** — 글로벌.
- 한국: **클레보(Klevr)**, **레뷰(Revu)**, **블로그봐(Blogbwa)**, **공팔리터(0.8L)**, **태그바이**, **세이큐피드** — 인플루언서·체험단.

### H-2. UGC 위젯
- **Bazaarvoice, Yotpo, PowerReviews** — 리뷰 위젯.
- **Stamped, Loox, Okendo** (Shopify 친화).
- **Flowbox, Photoslurp, Stackla (Nosto)** — 인스타그램 UGC 갤러리(권한 동의 워크플로우 포함).

---

## I. 한국 관광 컨텍스트 — 활용 가능 데이터 종합

| 카테고리 | 한국 활용 가능 채널 | 비용/제약 |
|---|---|---|
| POI 마스터 (이름/주소/카테고리) | TourAPI 4.0, Kakao Local, Naver Local, VWorld, OSM | 무료 / API 키 |
| 별점·리뷰 본문 | **공식 무료 API 없음** — Google Places(5건/월 한도 제약), TripAdvisor Content API(제휴), 자체 작성, 썸트렌드/소셜메트릭스 | 비공식 수집 금지 |
| 검색 트렌드 | 네이버 데이터랩, 카카오 데이터트렌드, 구글 트렌드, KTO 데이터랩 | 무료 |
| 블로그/뉴스 메타 | 네이버 검색 API, 카카오 검색 API, 빅카인즈 | 무료 한도 |
| 유튜브 영상/댓글 | YouTube Data API v3 | 10k quota/일 |
| 인스타그램 본인+해시태그(제한) | Instagram Graph API (비즈니스) | 7일 30 hashtag |
| 틱톡 | Display(본인), Research(연구자) | 매우 제한적 |
| 공공 SNS 분석 보고서 | KTO 데이터랩 「관광 빅데이터 분석」, KCTI 보고서 | 무료 PDF |
| 상용 소셜 리스닝 | 썸트렌드, 소셜메트릭스, Brandwatch, Talkwalker | 월 수십~수백만원 |

---

## J. 핵심 사실 요약

1. **네이버/카카오 모두 「플레이스 리뷰 본문」을 외부에 공식 제공하는 Open API는 없다.** 검색 API는 메타(이름/주소/좌표)만 반환.
2. **Google Places API는 리뷰 5건까지 제공**하되, 「Google 어트리뷰션」 표시 의무 + 30일 캐싱 한도 + 다른 지도 위 표시 금지.
3. **TripAdvisor Content API**는 제휴 가입 후 무료 50,000 calls/월, 출처 링크 의무.
4. **YouTube Data API v3**는 공개 영상 댓글 수집이 합법적으로 가능 (10,000 quota/일 무료).
5. **Instagram Basic Display API는 2024년 9월 종료**, 후속 API는 비즈니스 계정 본인+해시태그 제한적 검색만.
6. **TikTok**는 일반 마케팅 용도 콘텐츠 수집 API 없음. Research API는 미·EU 학술 용도.
7. **한국 저작권법 제93조**(DB 제작자 권리)와 **각 플랫폼 약관**으로 인해 **무차별 스크래핑은 민·형사 리스크**가 있다.
8. **사용자 자체 생성 리뷰 + 공공 트렌드 데이터(데이터랩) + 제휴 콘텐츠** 조합이 현실적인 합법 경로.
9. **임베딩+벡터DB** 기반 의미 검색은 자체 보유 텍스트(리뷰/블로그 발췌/관광지 설명)에 적용 가능. 한국어는 KURE-v1, BGE-M3, OpenAI text-embedding-3-large가 표준.
10. **상용 소셜 리스닝(썸트렌드/Brandwatch)** 또는 **KTO 데이터랩 가공 통계** 활용이 콘텐츠 약관 리스크를 우회하는 안전 경로.

---
*문서 끝.*
