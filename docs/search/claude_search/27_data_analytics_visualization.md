# 27. 관광 데이터 분석 / 시각화 기법 — 기술/라이브러리 카탈로그

> 본 문서는 관광 데이터 분석·시각화에 사용 가능한 주요 기법, 알고리즘, 라이브러리를 사실 중심으로 정리한다. 한국관광공사(KTO) TourAPI, 한국관광 데이터랩(datalab.visitkorea.or.kr), 통신사 유동인구 데이터, KT/SKT/LGU+ 빅데이터 플랫폼 등 한국 관광 컨텍스트에서 활용 가능한 도구를 우선한다.

---

## A. 시계열 분석 (Time-Series Analysis)

### A-1. 관광 수요 예측에 사용되는 모델 계열
관광 수요(방문객 수, 검색량, 예약량, 카드 결제 건수 등)는 강한 계절성/주기성을 가진 시계열로, 학계·산업계에서 다음 모델군이 표준적으로 사용된다.

| 모델군 | 대표 알고리즘 | 라이브러리 / 패키지 | 비고 |
|---|---|---|---|
| 통계 기반 | ARIMA / SARIMA / SARIMAX | `statsmodels` (Python), `forecast` (R) | 단변량·외생변수 결합 |
| 지수평활 | ETS, Holt-Winters | `statsmodels.tsa.holtwinters`, `forecast::ets` | 추세+계절성 분해 |
| 분해 기반 | STL (Seasonal-Trend Loess), MSTL | `statsmodels.tsa.seasonal.STL` | 다중 계절성 분해 |
| 베이지안 구조 시계열 | Prophet, Orbit | `prophet` (Meta), `orbit-ml` (Uber) | 휴일/이벤트 효과 명시적 모델링 |
| 딥러닝 | LSTM, GRU, Temporal Fusion Transformer (TFT), N-BEATS, N-HiTS | `pytorch-forecasting`, `darts`, `neuralforecast` (Nixtla) | 다변량·다중수평선 |
| 글로벌 트리 | LightGBM-time, XGBoost-time | `mlforecast` (Nixtla), `lightgbm` | 메타피처(lag/rolling) 활용 |
| 자동 ML | AutoGluon-TimeSeries, AutoTS | `autogluon.timeseries`, `autots` | 모델 선택 자동화 |

공식 URL:
- statsmodels: https://www.statsmodels.org
- Meta Prophet: https://facebook.github.io/prophet/
- Nixtla 생태계 (StatsForecast / NeuralForecast / MLForecast): https://nixtlaverse.nixtla.io
- Darts (Unit8): https://unit8co.github.io/darts/
- AutoGluon-TimeSeries: https://auto.gluon.ai/stable/tutorials/timeseries/index.html

### A-2. 계절성 분해 기법
- **고전적 분해 (Classical Decomposition)**: additive / multiplicative 모델로 추세-계절-잔차 분리. `statsmodels.tsa.seasonal.seasonal_decompose`.
- **STL (Seasonal and Trend decomposition using Loess)**: Cleveland 외 1990. 비모수적, 이상치에 강건. `statsmodels.tsa.seasonal.STL`.
- **MSTL (Multiple STL)**: 일·주·연 다중 계절성 분리. 관광 일별 방문객처럼 주간 패턴(주말↑)과 연간 패턴(여름·연말↑)이 공존하는 데이터에 적합.
- **X-13ARIMA-SEATS**: 미국 통계청 표준 계절조정. R 패키지 `seasonal`.
- **Wavelet decomposition**: 다중 해상도 시간-주파수 분석. `PyWavelets` (https://pywavelets.readthedocs.io).

### A-3. 변화점/이벤트 탐지
- `ruptures` (Python) — Pelt/Binseg/Window 기반 changepoint detection. https://centre-borelli.github.io/ruptures-docs/
- Prophet 내장 `changepoint_prior_scale` 파라미터.
- Bayesian Online Changepoint Detection (BOCPD).

### A-4. 한국 컨텍스트 활용 시계열 변수
- 한국관광 데이터랩 → 외래관광객 입국 통계, 내국인 국내여행 통계 (월별).
- KT 빅데이터 플랫폼(bdp.kt.co.kr) → 통신사 유동인구 시계열 (시군구·읍면동·격자 단위, 시간대별).
- 한국문화관광연구원(KCTI) 관광지식정보시스템 → 관광지 입장객 수(월별/연별).
- 카드 결제 데이터 (BC카드/신한카드 빅데이터 플랫폼) → 외국인·내국인 카드 매출 시계열.

---

## B. 공간 / 지리 (GIS) 분석

### B-1. 핫스팟 / 클러스터링 알고리즘
| 알고리즘 | 설명 | 라이브러리 |
|---|---|---|
| **Getis-Ord Gi*** | 지역적 핫스팟·콜드스팟 통계량 | PySAL `esda.G_Local` |
| **Local Moran's I (LISA)** | 국지적 공간 자기상관 | PySAL `esda.Moran_Local` |
| **DBSCAN / HDBSCAN** | 밀도 기반 클러스터링, 잡음 자동 분리 | scikit-learn, `hdbscan` |
| **OPTICS** | 가변 밀도 클러스터링 | scikit-learn |
| **K-Means (with haversine)** | 구형 좌표용 변형 | scikit-learn (커스텀 거리) |
| **ST-DBSCAN** | 시공간 DBSCAN | 다수 오픈 구현 |
| **Kernel Density Estimation (KDE)** | 히트맵 생성 | `scipy.stats.gaussian_kde`, `kde-2d` |
| **Voronoi Tessellation** | 영향권 분할 | `scipy.spatial.Voronoi`, `geovoronoi` |
| **H3 / S2 / Geohash** | 격자 인덱싱 | Uber `h3-py`, Google `s2geometry` |
| **Quadtree** | 적응형 격자 분할 | `pyqtree` 외 |

PySAL 공식: https://pysal.org
H3: https://h3geo.org / https://github.com/uber/h3-py

### B-2. 공간 자기상관 / 통계
- Global Moran's I, Geary's C
- Spatial Lag/Error Model (SAR/SEM) — `pysal.spreg`
- Geographically Weighted Regression (GWR) — `mgwr` (https://mgwr.readthedocs.io)

### B-3. 지오코딩 / 역지오코딩 (한국)
- **카카오맵 로컬 API** (https://developers.kakao.com/docs/latest/ko/local/dev-guide) — 주소·키워드 검색, 좌표 ↔ 행정구역 변환. 무료 한도 존재.
- **네이버 클라우드 플랫폼 Geocoding/Reverse Geocoding** (https://api.ncloud-docs.com/docs/ai-naver-mapsgeocoding)
- **VWorld (국토지리정보원)** Geocoder 2.0 (https://www.vworld.kr/dev/v4dv_geocoderguide2_s001.do)
- **국토교통부 도로명주소 API** (https://www.juso.go.kr/addrlink/devCenterEventBoardList.do)
- **OpenStreetMap Nominatim** (글로벌, 사용 정책 준수 필요).

### B-4. 라우팅 / 거리행렬
- **OSRM** (Open Source Routing Machine) — http://project-osrm.org
- **GraphHopper** — https://www.graphhopper.com
- **Valhalla** — https://valhalla.github.io/valhalla/
- **카카오모빌리티 길찾기 API** — https://developers.kakao.com/docs/latest/ko/kakaonavi/common
- **TMap API (SK)** — https://tmapapi.sktelecom.com
- **Google Directions / Distance Matrix API** — 한국 도보·대중교통은 제한적.

### B-5. 기초 GIS 라이브러리 (Python)
- `geopandas` — 벡터 GIS의 표준. https://geopandas.org
- `shapely` — 기하 연산. https://shapely.readthedocs.io
- `pyproj` — 좌표계 변환 (EPSG:4326 ↔ EPSG:5179 한국 중부원점 등).
- `rasterio` — 래스터.
- `folium` — Leaflet 래퍼. https://python-visualization.github.io/folium/
- `keplergl` — Uber Kepler 노트북 통합. https://docs.kepler.gl
- `pydeck` — Deck.gl 래퍼. https://deckgl.readthedocs.io

---

## C. OD (Origin-Destination) / 이동 패턴 분석

### C-1. OD 데이터 형태
- 행: 출발지(Origin), 열: 목적지(Destination), 값: 통행량/체류시간/매출.
- 한국 컨텍스트:
  - **국가교통DB (KTDB) OD** — https://www.ktdb.go.kr (전국 권역 통행량).
  - **통신사 유동인구 OD** — KT/SKT/LGU+ 데이터 플랫폼.
  - **신한카드/BC카드 거주지-소비지 매트릭스** (금융데이터거래소 FinDX https://www.findatamall.or.kr).

### C-2. 기법
| 기법 | 설명 | 도구 |
|---|---|---|
| OD Matrix Heatmap | 단순 히트맵 | seaborn, ECharts |
| Flow Map / Arc Map | 호(arc) 또는 곡선으로 흐름 표현 | deck.gl `ArcLayer`, kepler.gl, `flowmap.blue` |
| Sankey Diagram | 단계별 이동 흐름 | D3 sankey, ECharts sankey, Plotly |
| Chord Diagram | 양방향 OD | D3 chord, ECharts |
| OD Bundling / Edge Bundling | 시각적 혼잡 완화 | `datashader`, custom D3 |
| Trajectory Clustering | 궤적 군집화 | `scikit-mobility`, `MOVE` |
| Sequence Mining | 방문 순서 패턴 | PrefixSpan, SPMF |
| Markov Chain | 다음 방문지 확률 | 직접 구현, `pomegranate` |

flowmap.blue: https://flowmap.blue
scikit-mobility: https://scikit-mobility.github.io

### C-3. 체류시간 / 동선 분석
- **Stay-point detection**: 일정 반경 내 일정 시간 머무르면 stay로 정의 (Li et al. 2008 알고리즘).
- **Trajectory similarity**: DTW(Dynamic Time Warping), Frechet distance, Hausdorff distance, EDR.
- **Mobility metrics**: radius of gyration, entropy of visited locations, predictability (Song et al. 2010).

---

## D. 추천 알고리즘

### D-1. 알고리즘 분류
| 분류 | 알고리즘 | 라이브러리 |
|---|---|---|
| 협업 필터링 (CF) | User/Item-KNN, Matrix Factorization (SVD/ALS), BPR | `Surprise`, `implicit`, Spark MLlib |
| 콘텐츠 기반 (CB) | TF-IDF, Word2Vec, BERT 임베딩 + Cosine | scikit-learn, sentence-transformers |
| 하이브리드 | Wide & Deep, DeepFM, xDeepFM, AutoInt | `DeepCTR`, `RecBole` |
| 시퀀셜 | GRU4Rec, SASRec, BERT4Rec | `RecBole`, `Microsoft Recommenders` |
| 그래프 | LightGCN, NGCF, PinSAGE | `RecBole`, PyG |
| LLM 기반 | GPT/Claude prompt-based, RAG-rerank, LLM-as-Reranker | LangChain, LlamaIndex |
| 컨텍스트 인식 | Factorization Machines, Field-aware FM | `xLearn`, `pyFM` |
| Two-Tower (Embedding Retrieval) | Google two-tower, YouTube DNN | TensorFlow Recommenders |
| Bandit | LinUCB, Thompson Sampling | `mab`, `Vowpal Wabbit` |

대표 라이브러리:
- Surprise: https://surpriselib.com
- implicit: https://benfred.github.io/implicit/
- Microsoft Recommenders: https://github.com/recommenders-team/recommenders
- RecBole (RUC): https://recbole.io
- TensorFlow Recommenders (TFRS): https://www.tensorflow.org/recommenders

### D-2. 관광 도메인 특수성
- **콜드스타트 심함**: 사용자별 여행 빈도 낮음 → CB/하이브리드 또는 LLM 기반이 유리.
- **컨텍스트 의존성**: 동행자(가족/연인/혼자), 계절, 날씨, 예산, 체류시간이 추천 결과에 큰 영향 → Contextual recommender (Adomavicius & Tuzhilin 2011) 계열.
- **공간 제약**: 거리·이동시간 페널티 결합 — `score = relevance - α * travel_cost`.
- **순서 추천 (Itinerary Planning)**: Orienteering Problem 변형 (TOP, TDOP), MIP/유전 알고리즘 / OR-Tools (https://developers.google.com/optimization).

### D-3. LLM 기반 추천 / RAG
- 사용자 쿼리("아이와 함께 갈 부산 1박2일 비 오는 날 코스") → 임베딩 검색(관광지/리뷰) → LLM이 일정으로 합성.
- 임베딩: OpenAI `text-embedding-3-large`, Cohere Embed v3, `BGE-M3` (다국어), `KURE-v1`(한국어), `ko-sroberta-multitask`.
- 벡터DB: Pinecone, Weaviate, Qdrant, Milvus, pgvector, Vespa.
- Reranker: `bge-reranker-v2-m3`, Cohere Rerank, Cross-encoder.

---

## E. 클러스터링 — 관광객 세분화 / 페르소나

### E-1. 알고리즘
| 데이터 형태 | 알고리즘 |
|---|---|
| 수치형 다변량 | K-Means, Mini-Batch K-Means, GMM (Gaussian Mixture) |
| 비수치 혼합 | K-Prototypes (k-means + k-modes) — `kmodes` |
| 밀도 기반 | DBSCAN, HDBSCAN |
| 계층적 | Agglomerative, Ward linkage |
| 차원축소 → 군집 | UMAP/t-SNE + HDBSCAN |
| 잠재변수 | LDA(토픽), Latent Class Analysis |
| 딥러닝 | DEC (Deep Embedded Clustering), VaDE |

검증 지표: Silhouette, Davies-Bouldin, Calinski-Harabasz, Gap statistic.

### E-2. 한국 관광객 세분화 표준 변수
- 인구통계 (연령/성별/거주지)
- 동행유형 (혼자/연인/가족/친구)
- 여행목적 (휴식/체험/맛집/쇼핑/문화)
- 결제 패턴 (객단가, 카테고리 비중)
- 이동범위 (radius of gyration)
- 체류 일수, 방문지 수
- 외국인의 경우 국적, 입국 횟수

KCTI / 한국문화관광연구원이 매년 발행하는 「국민여행조사」, 「외래관광객조사」가 표준 변수 정의 참조점.

---

## F. 이상탐지 / 혼잡도 예측

### F-1. 이상탐지 알고리즘
- 통계: Z-score, IQR, MAD, Grubbs' test
- 시계열: STL 잔차 + threshold, Twitter AnomalyDetection, Prophet 잔차, ESD
- 머신러닝: Isolation Forest, One-Class SVM, LOF, COPOD, HBOS — `PyOD` (https://pyod.readthedocs.io)
- 딥러닝: AutoEncoder reconstruction error, LSTM-AE, USAD, Anomaly Transformer
- Microsoft `merlion` (https://opensource.salesforce.com/Merlion), Linkedin `luminol`

### F-2. 혼잡도(과관광 / 저관광) 정의
- **Crowding Index** = 실제 방문객 / 수용능력(capacity).
- 한국관광공사 「한국관광 데이터랩」은 주요 관광지 혼잡도 지표를 시범 제공.
- 통신사 유동인구 + 격자(H3/Geohash) → 시간대별 밀도 → percentile 기반 혼잡 등급.

### F-3. 혼잡도 예측 모델
- 단기: Gradient Boosting (LightGBM/XGBoost) + 시계열 lag/rolling + 외생변수(날씨/요일/공휴일/이벤트).
- 중기: Prophet/SARIMA + holiday regressor.
- 장기: Sequence-to-Sequence (Transformer/Informer/PatchTST).

---

## G. NLP / 감성·리뷰 분석 (한국어 우선)

### G-1. 한국어 사전학습 모델
| 모델 | 제공 | 특징 | URL |
|---|---|---|---|
| **KoBERT** | SK텔레콤 | BERT-base 한국어 | https://github.com/SKTBrain/KoBERT |
| **KoELECTRA** | 박장원 | ELECTRA 한국어 | https://github.com/monologg/KoELECTRA |
| **KoBigBird** | 박장원 | 4096 토큰 long-context | https://github.com/monologg/KoBigBird |
| **KLUE-RoBERTa** | KLUE 컨소시엄 | 표준 벤치마크 | https://huggingface.co/klue |
| **KoGPT / KoGPT-2 / KoGPT-Trinity** | SKT, Kakao | 생성 모델 | https://huggingface.co/skt |
| **EXAONE** | LG AI 연구원 | 다국어 LLM | https://huggingface.co/LGAI-EXAONE |
| **HyperCLOVA X** | 네이버 | 폐쇄 LLM API | https://clova.ai |
| **Solar / Upstage** | 업스테이지 | Solar-10.7B | https://huggingface.co/upstage |
| **Polyglot-Ko** | EleutherAI Korea | 1.3B~12.8B | https://github.com/EleutherAI/polyglot |
| **KURE-v1** | 카카오 | 한국어 임베딩 | https://huggingface.co/nlpai-lab |

형태소/토큰화: `konlpy` (Mecab/Komoran/Okt/Kkma/Hannanum), `soynlp`, `kiwipiepy` (Kiwi), `khaiii` (카카오).

### G-2. 감성 분석
- 이진/다중 분류: KoBERT/KoELECTRA fine-tuning (NSMC 벤치마크).
- Aspect-Based Sentiment Analysis (ABSA): 음식/서비스/가격/위치 등 측면별. KLUE-TC 기반 fine-tune.
- Zero/Few-shot: GPT-4o, Claude, HyperCLOVA-X로 직접 분류.

### G-3. 토픽 모델링
- **LDA** — `gensim.models.LdaModel`, MALLET. https://radimrehurek.com/gensim/
- **NMF** (Non-negative Matrix Factorization).
- **BERTopic** — 임베딩 + UMAP + HDBSCAN + c-TF-IDF. https://maartengr.github.io/BERTopic/
- **Top2Vec**, **CTM (Contextualized Topic Model)**.
- **KeyBERT** — 키워드 추출. https://maartengr.github.io/KeyBERT/

### G-4. 개체명 인식 / 키워드
- KLUE-NER, Pororo (카카오브레인), `transformers` ner pipeline.
- 관광 도메인 entity: 관광지명, 음식명, 지역명, 시설/액티비티.

### G-5. 요약 / Q&A
- 추출형 요약: `sumy`, `LexRank`, `KoBERTSum`.
- 추상형 요약: `KoBART` (SKT), `T5`, GPT-4o, Claude.
- RAG 기반 Q&A: LangChain/LlamaIndex + 벡터DB.

---

## H. 시각화 라이브러리 (Web)

### H-1. 차트 / 통계 시각화
| 라이브러리 | 언어 | 라이선스 | 강점 | URL |
|---|---|---|---|---|
| **D3.js** | JS | ISC | 완전 커스터마이즈, SVG/Canvas 저수준 | https://d3js.org |
| **ECharts** | JS | Apache-2.0 | Apache 인큐베이션, 30+ 차트, 지도, 한글 친화 | https://echarts.apache.org |
| **Chart.js** | JS | MIT | 가벼움, 8 차트 표준 | https://www.chartjs.org |
| **Recharts** | React | MIT | React 컴포저블, D3 위 래퍼 | https://recharts.org |
| **Visx** (Airbnb) | React | MIT | D3 + React, 저수준 building block | https://airbnb.io/visx |
| **Nivo** | React | MIT | 서버사이드 SVG, 접근성 | https://nivo.rocks |
| **Plotly.js / Plotly Dash** | JS / Python | MIT (JS) | 인터랙티브, 과학적 | https://plotly.com/javascript/ |
| **Highcharts** | JS | 상용/무료(비상업) | 완성도, 접근성 | https://www.highcharts.com |
| **Apache Superset Charts** | (서버) | Apache-2.0 | 대시보드 통합 | https://superset.apache.org |
| **Vega / Vega-Lite** | JSON 선언적 | BSD-3 | grammar of graphics | https://vega.github.io |
| **Observable Plot** | JS | ISC | Vega-Lite 대안, D3 진영 | https://observablehq.com/plot |
| **AntV G2 / G6 / L7** | JS | MIT | Alibaba, 그래프/지도 통합 | https://antv.vision |

### H-2. 지리/지도 시각화
| 라이브러리 | 강점 | URL |
|---|---|---|
| **Leaflet** | 가장 가벼운 오픈 지도, 플러그인 풍부 | https://leafletjs.com |
| **Mapbox GL JS** | WebGL 벡터 타일, 3D 지형/건물 | https://docs.mapbox.com/mapbox-gl-js/ |
| **MapLibre GL JS** | Mapbox GL의 OSS fork | https://maplibre.org |
| **deck.gl** | WebGL 대용량 레이어 (HexagonLayer, GridLayer, ArcLayer, TripsLayer) | https://deck.gl |
| **kepler.gl** | Uber 시각화 도구, deck.gl 기반 노코드 | https://kepler.gl |
| **OpenLayers** | OGC 표준(WMS/WFS), 정통 GIS | https://openlayers.org |
| **Cesium / CesiumJS** | 3D 글로브, 지형 | https://cesium.com |
| **AntV L7** | 중국 진영 GIS, 한국어 약함 | https://l7.antv.vision |
| **Carto** | 클라우드 GIS, 분석 + 시각화 SaaS | https://carto.com |
| **Tangram** | Mapzen 출신, 벡터 타일 | https://tangrams.readthedocs.io |
| **Folium** | Python → Leaflet HTML 출력 | https://python-visualization.github.io/folium/ |

### H-3. 한국 지도 SDK
- **카카오맵 JavaScript API** — https://apis.map.kakao.com (한국 도로/지번 정확)
- **네이버 지도 JavaScript API v3** — https://navermaps.github.io/maps.js.ncp/
- **VWorld 지도 API** — https://map.vworld.kr (정부 표준)
- **TMap Web JS API** (SKT) — https://openapi.sk.com/tmap

### H-4. 대용량 / 빅데이터 시각화
- `datashader` (HoloViz) — Python, 수억 포인트를 픽셀로 래스터화. https://datashader.org
- `vaex` — out-of-core 데이터프레임 + 시각화. https://vaex.io
- deck.gl `ScatterplotLayer` (수백만 점 GPU 렌더).

---

## I. 대시보드 / BI 도구

| 도구 | 라이선스 | 셀프호스트 | 한국어 UI | 비고 |
|---|---|---|---|---|
| **Apache Superset** | Apache-2.0 | O | O | https://superset.apache.org , Preset Cloud SaaS도 존재 |
| **Metabase** | AGPL / 상용 | O | O | https://www.metabase.com , 비기술자 친화 |
| **Grafana** | AGPL-3.0 / 상용 | O | O | https://grafana.com , 시계열·관측성 강함 |
| **Redash** | BSD-2 (현재 정체) | O | 부분 | https://redash.io |
| **Lightdash** | MIT | O | 부분 | https://www.lightdash.com , dbt 통합 |
| **Evidence.dev** | MIT | O | 부분 | https://evidence.dev , 코드 기반 BI |
| **Observable Framework** | ISC | O | 부분 | https://observablehq.com/framework |
| **Tableau** | 상용 | O / Cloud | O | https://www.tableau.com |
| **Looker (Google Cloud)** | 상용 | Cloud | O | https://cloud.google.com/looker |
| **Looker Studio** (구 Data Studio) | 무료 | Cloud | O | https://lookerstudio.google.com |
| **Microsoft Power BI** | 상용 | O / Cloud | O | https://powerbi.microsoft.com |
| **Qlik Sense** | 상용 | O / Cloud | O | https://www.qlik.com |
| **AWS QuickSight** | 상용 (per-session 가격) | Cloud | O | https://aws.amazon.com/quicksight/ |
| **Streamlit** | Apache-2.0 | O | O | https://streamlit.io , Python 데이터 앱 |
| **Plotly Dash** | MIT / 상용 | O | O | https://plotly.com/dash/ |
| **Gradio** | Apache-2.0 | O | O | https://gradio.app , ML 데모 친화 |
| **Hex** | 상용 | Cloud | O | https://hex.tech , notebook+BI |

### I-1. 한국 관광 데이터랩 자체 대시보드 참고
- **한국관광 데이터랩** (https://datalab.visitkorea.or.kr) — KTO 운영. 외래관광객, 내국인 여행, 관심관광지 분석, 카드/통신 데이터, 검색량 트렌드, 관광지 기반/배후/유동인구 등 시각화 제공.
- **관광지식정보시스템** (https://know.tour.go.kr) — KCTI 운영, 통계·정책 데이터.

---

## J. 기초 데이터 처리 스택 (참고)

| 영역 | 표준 도구 |
|---|---|
| 분산 처리 | Apache Spark, Dask, Ray |
| OLAP | DuckDB, ClickHouse, Apache Druid, Apache Pinot, StarRocks |
| 컬럼 저장 | Parquet, ORC, Apache Iceberg, Delta Lake, Apache Hudi |
| 스트리밍 | Apache Kafka, Apache Flink, Spark Streaming, Redpanda |
| 워크플로우 | Apache Airflow, Prefect, Dagster, Kestra |
| 피처 스토어 | Feast, Tecton, Hopsworks |
| 실험 추적 | MLflow, Weights & Biases, Neptune |
| 모델 서빙 | BentoML, KServe, Triton, TorchServe, vLLM |
| 노트북/IDE | Jupyter, JupyterLab, Marimo, VSCode, Hex, Deepnote |

---

## K. 한국 관광 데이터 소스 (분석 입력)

| 소스 | URL | 데이터 유형 |
|---|---|---|
| 한국관광공사 TourAPI 4.0 | https://api.visitkorea.or.kr | 관광지/축제/숙박/음식 마스터 |
| 한국관광 데이터랩 | https://datalab.visitkorea.or.kr | 가공 통계 (외래/내국인/카드/통신) |
| 관광지식정보시스템 | https://know.tour.go.kr | 정책/연구/통계 |
| 공공데이터포털 | https://www.data.go.kr | 부처별 관광 데이터셋 |
| KT 빅데이터 플랫폼 | https://bdp.kt.co.kr | 통신 유동인구 |
| SKT 빅데이터 허브 | https://www.bigdatahub.co.kr | 통신/카드 융합 |
| 금융데이터거래소 (FinDX) | https://www.findatamall.or.kr | BC/신한 카드 매출 |
| 통계청 KOSIS | https://kosis.kr | 기초 통계 |
| 국가통계포털 MDIS | https://mdis.kostat.go.kr | 마이크로데이터 |
| 서울 열린데이터광장 | https://data.seoul.go.kr | 서울 관광/문화 |
| 경기데이터드림 | https://data.gg.go.kr | 경기 관광 |
| LOCALDATA | https://www.localdata.go.kr | 지방행정 인허가(숙박/음식점) |

---

## L. 시각화 표현 패턴 — 관광 데이터에 자주 쓰이는 차트 유형

| 분석 목적 | 대표 차트 |
|---|---|
| 시계열 트렌드 | Line, Area, Stream graph, Calendar heatmap |
| 비중/구성 | Stacked Bar, Treemap, Sunburst, Pie (제한적) |
| 비교 | Grouped Bar, Bullet, Radar |
| 분포 | Histogram, Box plot, Violin, ECDF, Ridgeline |
| 상관 | Scatter, Hexbin, 2D KDE, Correlation matrix heatmap |
| 흐름/이동 | Sankey, Chord, Arc map, Flow map, Trip animation |
| 지리 | Choropleth, Symbol map, Heatmap, Hex/H3 grid, 3D extrusion |
| 네트워크 | Force-directed, Adjacency matrix |
| 다차원 | Parallel coordinates, Scatterplot matrix, t-SNE/UMAP scatter |
| 텍스트 | Word cloud(주의), Bar of top-n, BERTopic intertopic distance map |
| 이벤트/달력 | Gantt, Calendar heatmap, Timeline |

칼튼 D3 / FT Chart Doctor / Andy Kirk 등 표준 데이터 저널리즘 가이드라인 참조.

---

## M. 참고 — 관광 분석 학술 표준 / 표준 변수

- UNWTO **Tourism Satellite Account (TSA)** — 관광위성계정 표준.
- UNWTO **Tourism Statistics** — 입국·지출·숙박 표준 분류.
- ISO 18065 (관광 서비스 표준).
- KCTI 「관광 빅데이터 활용 가이드라인」.
- 한국문화관광연구원 「관광 행태 분석 표준 변수집」.

---

## N. 핵심 요약 표

| 카테고리 | 한국 관광에서 가장 많이 쓰이는 표준 |
|---|---|
| 지오코딩 | 카카오 로컬 / VWorld / 도로명주소 API |
| 지도 시각화 | 카카오맵 / 네이버 지도 / Mapbox + deck.gl |
| 시계열 예측 | Prophet / SARIMA / LightGBM-time |
| 공간 핫스팟 | Getis-Ord Gi*, H3 grid + KDE |
| 유동인구 OD | KT/SKT 빅데이터 + flowmap.blue / deck.gl ArcLayer |
| 추천 | content-based + LLM RAG (콜드스타트 강함) |
| NLP | KoELECTRA / KoBigBird / HyperCLOVA-X / GPT-4o |
| 토픽 모델 | BERTopic + Kiwi 토크나이저 |
| 대시보드 | Superset / Metabase / 한국관광 데이터랩 |
| 빅데이터 처리 | DuckDB (소·중) / Spark (대) |

---
*문서 끝.*
