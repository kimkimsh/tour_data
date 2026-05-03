# 28. 이미지 / 영상 / 360° / AR — 미디어·콘텐츠 인프라

> 본 문서는 관광 웹·앱에서 자주 사용되는 미디어 콘텐츠(이미지·영상·360°/VR·AR) 처리·전달 인프라와 라이브러리를 사실 기준으로 정리한다. 한국관광공사 사진 갤러리, 한국문화정보원 「공공누리」 이미지, VR Korea 등 한국 컨텍스트도 함께 명시한다.

---

## A. 이미지 CDN / 저장소 / 변환 서비스

### A-1. 이미지 전용 CDN
| 서비스 | 모델 | 핵심 기능 | URL |
|---|---|---|---|
| **Cloudinary** | SaaS | URL 변환 파라미터(`w_400,c_fill,f_auto,q_auto`), AI 자르기, 비디오, DAM | https://cloudinary.com |
| **Imgix** | SaaS | URL 기반 변환, 빠른 엣지, 디자인 시스템 친화 | https://imgix.com |
| **Cloudflare Images** | SaaS | 저장+변환+CDN 일체, $5/100k | https://www.cloudflare.com/products/cloudflare-images/ |
| **Cloudflare R2 + Polish** | SaaS | S3 호환 + 자동 최적화 | https://developers.cloudflare.com/r2/ |
| **Vercel Image Optimization** | SaaS (Next.js) | `next/image` 통합, 빌드 시·온디맨드 최적화 | https://vercel.com/docs/image-optimization |
| **Netlify Image CDN** | SaaS | `/.netlify/images/` 변환 파라미터 | https://docs.netlify.com/image-cdn/overview/ |
| **AWS CloudFront + Lambda@Edge** | IaaS | S3 + 동적 리사이즈 람다 | https://aws.amazon.com/cloudfront/ |
| **AWS Serverless Image Handler** | 솔루션 | Sharp + API Gateway 표준 패턴 | https://aws.amazon.com/solutions/implementations/serverless-image-handler/ |
| **GCP Cloud CDN + Cloud Storage** | IaaS | Cloud Run으로 변환 람다화 | https://cloud.google.com/cdn |
| **Bunny.net Optimizer** | SaaS | 가격 저렴, WebP/AVIF | https://bunny.net/optimizer/ |
| **KeyCDN Image Processing** | SaaS | URL 파라미터 | https://www.keycdn.com/support/image-processing |
| **ImageKit** | SaaS | 자동 포맷, AI 변환 | https://imagekit.io |
| **Fastly Image Optimizer (IO)** | SaaS | Fastly POP에서 변환 | https://www.fastly.com/products/image-optimization |
| **uploadcare** | SaaS | 업로드 위젯 + 변환 | https://uploadcare.com |
| **Sirv** | SaaS | 360° 스피너 지원 | https://sirv.com |

### A-2. 한국 클라우드/CDN
- **NAVER Cloud Platform CDN+ / Image Optimizer** — https://www.ncloud.com/product/networking/cdnPlus
- **NAVER Cloud Object Storage** — S3 호환.
- **카카오엔터프라이즈 카카오i 클라우드 Object Storage / CDN** — https://www.kakaocloud.com
- **NHN Cloud (Toast) CDN / Image** — https://www.nhncloud.com
- **KT Cloud CDN, Object Storage**
- **삼성 SDS, LG U+ CDN**

### A-3. 셀프호스트 이미지 처리
- **Sharp** (Node.js, libvips 기반) — https://sharp.pixelplumbing.com
- **libvips** — https://www.libvips.org
- **ImageMagick / GraphicsMagick** — 클래식, 메모리 비용 큼.
- **Pillow / Pillow-SIMD** (Python).
- **imgproxy** (Go) — URL 서명 기반 변환 마이크로서비스. https://imgproxy.net
- **thumbor** (Python) — 오픈소스 이미지 프록시. https://github.com/thumbor/thumbor
- **picfit** (Go) — https://github.com/thoas/picfit

---

## B. 이미지 포맷 / 최적화

### B-1. 포맷
| 포맷 | 압축 효율(평균) | 손실/무손실 | 브라우저 지원(2025 기준) | 비고 |
|---|---|---|---|---|
| **JPEG** | 기준 | 손실 | 100% | 사진 표준 |
| **PNG** | -30% (큼) | 무손실 | 100% | 알파, UI |
| **WebP** | JPEG 대비 -25~35% | 손실/무손실 | 사실상 100% (IE 제외) | Google |
| **AVIF** | JPEG 대비 -50% | 손실/무손실 | Chrome/Edge/Firefox/Safari 16.4+ | AV1 기반 |
| **JPEG XL (jxl)** | JPEG 대비 -55% | 손실/무손실/lossless 변환 | Safari 17+, Chrome flag, Firefox flag | 차세대 |
| **HEIC/HEIF** | JPEG 대비 -50% | 손실 | Safari/iOS 네이티브, 웹 미지원 | 라이선스 이슈 |
| **GIF** | 매우 비효율 | 무손실 | 100% | 애니메이션은 WebP/AVIF/MP4로 대체 |
| **SVG** | 벡터 | 무손실 | 100% | UI/아이콘 |

### B-2. 반응형 이미지
- `<img srcset="img-400.jpg 400w, img-800.jpg 800w" sizes="(max-width: 600px) 100vw, 50vw">`
- `<picture>` 요소 + `<source type="image/avif">` → AVIF → WebP → JPEG 폴백.
- `loading="lazy"`, `decoding="async"`, `fetchpriority="high"` (LCP 후보).
- W3C: https://html.spec.whatwg.org/multipage/images.html

### B-3. Next.js Image
- `next/image` 컴포넌트가 `srcset`, `sizes`, AVIF/WebP 협상, blur placeholder, lazy 로딩, priority 옵션 자동 처리. https://nextjs.org/docs/app/api-reference/components/image
- `next.config.js`의 `images.remotePatterns`에 외부 도메인(예: KTO 이미지 호스트) 등록 필수.
- Loader는 기본 Vercel, 또는 Cloudinary/Imgix loader로 교체 가능.

### B-4. LQIP / Placeholder
- **BlurHash** (Wolt) — 짧은 문자열로 흐림 미리보기. https://blurha.sh
- **ThumbHash** (Evan Wallace) — BlurHash 개선판, 알파/색 보존. https://github.com/evanw/thumbhash
- **SQIP** (SVG Quality Image Placeholder) — 벡터 placeholder.
- **Plaiceholder** (Next.js) — base64/blurhash/css. https://plaiceholder.co
- LQIP / dominant color / progressive JPEG.

### B-5. 이미지 메타데이터 / EXIF
- `exiftool` — 표준 CLI.
- `exifr` (JS) — https://github.com/MikeKovarik/exifr
- IPTC / XMP / ICC — 저작권·색공간 정보.
- 한국 KOPS(공공누리) 라이선스는 메타에 별도 표기 권장.

---

## C. 360° / 파노라마 / VR

### C-1. 360° 이미지(Equirectangular) 뷰어
| 라이브러리 | 라이선스 | 특징 | URL |
|---|---|---|---|
| **Pannellum** | MIT | 가벼움, hot spot, 다중 씬 | https://pannellum.org |
| **Marzipano** (Google) | Apache-2.0 | 큐브맵/equirect, 멀티해상도 타일 | https://www.marzipano.net |
| **Photo Sphere Viewer (PSV)** | MIT | Three.js 기반, 플러그인(VR/마커/지도) | https://photo-sphere-viewer.js.org |
| **A-Frame** | MIT | WebVR/WebXR 선언적 HTML | https://aframe.io |
| **Three.js** | MIT | 저수준 WebGL, 모든 3D | https://threejs.org |
| **Babylon.js** | Apache-2.0 | MS, 게임/VR 엔진 | https://www.babylonjs.com |
| **Krpano** | 상용 | 대형 파노라마 산업 표준 | https://krpano.com |
| **Panolens.js** | MIT | Three.js 래퍼 | https://pchen66.github.io/Panolens/ |
| **ForgePanorama / Marzipano Tool** | - | 큐브 타일 변환 도구 | (각 사이트) |

### C-2. 360° 영상
- 형식: equirectangular MP4 / Spatial Metadata (Google Spatial Media v2.1 spec, https://github.com/google/spatial-media).
- 재생: Three.js `VideoTexture` + Sphere, Video.js VR plugin (https://github.com/videojs/videojs-vr), JW Player VR.
- YouTube / Vimeo는 360° 영상 자동 인식.

### C-3. 거리 뷰 / 스트리트뷰 유사
- **Mapillary** — 사용자 기여 거리 사진, JS API 제공. https://www.mapillary.com
- **KartaView** (구 OpenStreetCam) — OSM 진영. https://kartaview.org
- **Google Street View Static API / JS API** — 한국 일부 지역 제한.
- **카카오맵 로드뷰** — 카카오맵 JS SDK 내 Roadview 객체.
- **네이버 지도 Pano(거리뷰)** — 네이버 지도 JS API.

### C-4. WebXR (브라우저 VR/AR)
- W3C 표준 https://www.w3.org/TR/webxr/
- `THREE.WebXRManager`, A-Frame `<a-scene xr-mode-ui>`.
- 지원: Quest Browser, Chrome (Android), iOS Safari는 AR Quick Look 별도 사용.

### C-5. 한국 VR/360° 관광 콘텐츠
- **VR Korea (한국관광공사)** — 한국관광공사가 운영하는 360°/VR 관광지 콘텐츠 페이지. https://kto.visitkorea.or.kr
- **국립중앙박물관 VR / 디지털 헤리티지** — https://www.museum.go.kr
- **문화재청 디지털 헤리티지** — https://www.cha.go.kr → 국가유산포털.
- **공공누리 4유형** 라이선스 이미지/360° 다수.

---

## D. 영상 / 비디오

### D-1. 동영상 호스팅 / 스트리밍 SaaS
| 서비스 | 모델 | 특징 | URL |
|---|---|---|---|
| **YouTube IFrame Embed** | 무료 | 가장 광범위, 자막 자동 | https://developers.google.com/youtube/iframe_api_reference |
| **Vimeo Player + API** | 무료/Pro | 광고 없음, privacy 옵션 | https://developer.vimeo.com |
| **Mux Video / Mux Player** | 사용량 | API-first, HLS/DASH, 데이터 분석 | https://www.mux.com |
| **Cloudflare Stream** | 사용량 | 업로드→HLS 자동, 저렴 | https://www.cloudflare.com/products/cloudflare-stream/ |
| **AWS IVS / MediaConvert / MediaLive** | IaaS | 라이브/VOD 풀 스택 | https://aws.amazon.com/ivs/ |
| **Bunny Stream** | 사용량 | 가성비 | https://bunny.net/stream/ |
| **api.video** | 사용량 | API-first 대안 | https://api.video |
| **Gumlet** | 사용량 | 비디오+이미지 | https://www.gumlet.com |
| **Brightcove** | 상용 | 엔터프라이즈 OVP | https://www.brightcove.com |
| **JW Player** | 상용 | 미디어 산업 표준 | https://www.jwplayer.com |
| **Wowza** | 상용 | 라이브 인코더/서버 | https://www.wowza.com |
| **Kaltura** | 상용/오픈코어 | 교육·기업 | https://corp.kaltura.com |
| **Bitmovin** | 상용 | 인코더+플레이어+분석 | https://bitmovin.com |
| **Akamai Adaptive Media Delivery** | 상용 | CDN+VOD | https://www.akamai.com |

### D-2. 한국 동영상 인프라
- **NAVER Cloud Video Player Enhancement / Live Station** — https://www.ncloud.com/product/media
- **NHN Cloud Video Streaming**
- **카카오 PlayLive (구 카카오TV 인프라)** — 일부 서비스 종료.
- **AfreecaTV / SOOP API** — 라이브 스트리밍 SDK 별도.
- 국내 KOLAS 인증 OVP(Online Video Platform) 사업자: 마이씨앗tv, 라이브플레이 등.

### D-3. 영상 포맷 / 코덱
| 코덱 | 컨테이너 | 라이선스 | 비고 |
|---|---|---|---|
| H.264 / AVC | MP4, MOV, TS | 특허 (MPEG-LA) | 보편 호환 |
| H.265 / HEVC | MP4, MOV | 특허 비용 부담 | iOS/Apple, 웹은 제한적 |
| VP9 | WebM, MP4 | 무료 | YouTube 표준 |
| **AV1** | MP4, WebM | 로열티 프리 (AOMedia) | 차세대, Chrome/FF/Edge/Safari 17+ |
| AVC1 → HLS | TS/fMP4 | - | iOS 표준 |
| DASH (MPEG-DASH) | fMP4 | - | 웹 적응형 표준 |

### D-4. 적응형 스트리밍
- **HLS** (Apple) — `.m3u8`, iOS 필수.
- **MPEG-DASH** — `.mpd`, Chrome/FF.
- 패키저: `shaka-packager`, `bento4`, `ffmpeg` + `gpac`.
- 플레이어: `hls.js` (https://github.com/video-dev/hls.js), `dash.js`, `Shaka Player` (Google), `Video.js`, `Plyr`, `Mux Player`, `Vime.js`, `Theoplayer`.

### D-5. 비디오 처리
- **FFmpeg** — 사실상 표준. https://ffmpeg.org
- **GStreamer** — 파이프라인 기반.
- **AWS Elemental MediaConvert / Elastic Transcoder**.
- **GCP Transcoder API**.
- **Cloud Run / Lambda + ffmpeg layer** 패턴.
- 서비스: Mux, Coconut, Bitmovin Encoding, Zencoder, api.video.

### D-6. 영상 자막 / 더빙 (관광 다국어용)
- **OpenAI Whisper / WhisperX / Faster-Whisper** — STT, 한국어 포함 다국어. https://github.com/openai/whisper
- **NVIDIA Riva** — 실시간 STT/TTS.
- **Deepgram Nova-2** — STT API.
- **AssemblyAI** — STT + 화자분리.
- **DeepL / Google Cloud Translation / Papago Translation API** — 번역.
- **ElevenLabs / OpenAI TTS / Google Cloud TTS / Microsoft Azure Speech / Naver Clova Voice** — TTS.
- WebVTT / SRT 자막 표준.

---

## E. AR (증강현실)

### E-1. 웹 기반 AR
| 라이브러리 | 라이선스 | 특징 | URL |
|---|---|---|---|
| **AR.js** | MIT | 마커/위치 기반, jsartoolkit | https://ar-js-org.github.io/AR.js-Docs/ |
| **MindAR** | MIT | 이미지 추적/얼굴 추적, 가벼움 | https://hiukim.github.io/mind-ar-js-doc/ |
| **8th Wall** | 상용 (Niantic) | WebAR 산업 표준, 마커리스 SLAM | https://www.8thwall.com |
| **Zappar Universal AR** | 상용 | 웹/앱 통합 SDK | https://zap.works/universal-ar/ |
| **A-Frame + AR.js** | MIT | 선언적 WebAR | (조합) |
| **Three.js + WebXR AR** | MIT | 저수준 | https://threejs.org/examples/?q=ar |
| **Onirix** | 상용/Free | 노코드 WebAR | https://www.onirix.com |
| **Blippar WebAR** | 상용 | 캠페인 WebAR | https://www.blippar.com |

### E-2. 모바일 AR (네이티브)
- **ARKit** (Apple iOS) — https://developer.apple.com/augmented-reality/arkit/
- **ARCore** (Google Android) — https://developers.google.com/ar
- **RealityKit / SceneKit** (iOS), **Sceneform / Filament** (Android, deprecated/community).
- 크로스플랫폼: **Unity AR Foundation**, **Unreal Engine AR Framework**.
- **Niantic Lightship ARDK** — 멀티플레이/메시 AR. https://lightship.dev
- **Snap Lens Studio / TikTok Effect House** — 소셜 AR.

### E-3. AR Quick Look / Scene Viewer
- **iOS AR Quick Look**: `<a rel="ar" href="model.usdz">` — USDZ 포맷.
- **Android Scene Viewer**: `intent://arvr.google.com/scene-viewer/...` — glTF/glb 포맷.
- **`<model-viewer>`** (Google) — `<model-viewer src="x.glb" ar>` 한 줄로 양 플랫폼 AR. https://modelviewer.dev

### E-4. 위치 기반 AR (GPS AR / Geo-AR)
- AR.js `gps-camera`, `gps-entity-place` — 위경도 기반 POI 표시.
- 8th Wall **VPS** (Visual Positioning System), Niantic Lightship VPS, Google **Geospatial API** (ARCore).
- Apple **RealityKit Object Capture / RoomPlan** — 공간 캡처.

### E-5. 한국 관광 AR 사례 컨텍스트
- 문화재청·지자체의 「AR 관광 가이드」 사업 다수 (경복궁, 수원화성, 백제역사유적지구 등) — 자체 앱 또는 Unity 기반.
- 한국관광공사 **K-Festival AR 스탬프** 등 지자체 협업.
- Naver **AR거리뷰** — 네이버 지도 앱 내 AR Walk.

---

## F. 3D / 모델 포맷

| 포맷 | 용도 | 비고 |
|---|---|---|
| **glTF / GLB** | 웹 표준 3D | Khronos 표준 https://www.khronos.org/gltf/ |
| **USDZ** | iOS AR Quick Look | Apple/Pixar |
| **FBX** | DCC 교환 | Autodesk |
| **OBJ + MTL** | 정적 모델 | 단순 |
| **3D Tiles** | 대규모 도시 3D 스트리밍 | Cesium/OGC |
| **NeRF / Gaussian Splatting** | 신경 렌더링 | 360° 캡처에서 3D 복원 |

3D 뷰어: `<model-viewer>`, Three.js GLTFLoader, Babylon.js, Sketchfab embed (https://sketchfak.com), PlayCanvas, Polycam.

캡처: **Polycam**, **Luma AI**, **KIRI Engine**, **RealityCapture**, **Apple Object Capture API** — 사진/LiDAR로 3D 모델 생성.

---

## G. DAM (Digital Asset Management) / CMS

| 도구 | 분류 | URL |
|---|---|---|
| **Cloudinary DAM** | 클라우드 DAM | https://cloudinary.com/products/digital_asset_management |
| **Bynder** | DAM | https://www.bynder.com |
| **Frontify** | 브랜드+DAM | https://www.frontify.com |
| **Brandfolder (Smartsheet)** | DAM | https://brandfolder.com |
| **Strapi** | Headless CMS (오픈소스) | https://strapi.io |
| **Directus** | Headless CMS+DAM | https://directus.io |
| **Sanity.io** | Headless CMS, 이미지 파이프라인 통합 | https://www.sanity.io |
| **Contentful** | Headless CMS | https://www.contentful.com |
| **Storyblok** | Visual CMS | https://www.storyblok.com |
| **Payload** | Headless CMS (Node) | https://payloadcms.com |
| **Hygraph** | GraphQL CMS | https://hygraph.com |
| **WordPress + ACF** | 전통 CMS | https://wordpress.org |
| **Prismic** | Slice 기반 | https://prismic.io |
| **Builder.io** | 비주얼 빌더 | https://www.builder.io |

---

## H. 이미지 / 영상 AI

### H-1. 비전 모델
- **CLIP / OpenCLIP** — 이미지-텍스트 임베딩 (관광지 사진 의미 검색).
- **BLIP / BLIP-2 / LLaVA / Qwen-VL / GPT-4o vision / Claude Vision** — 캡션 생성.
- **Segment Anything (SAM, SAM2)** — Meta. 자동 분할.
- **YOLO v8/v9/v10/v11** — 객체 탐지 (Ultralytics, https://docs.ultralytics.com).
- **DINOv2** — 자기지도 비전 임베딩.
- **DETR / Grounding DINO** — open-set 탐지.
- **MiDaS, Depth Anything v2** — 단안 깊이.

### H-2. 이미지 생성 / 편집
- **Stable Diffusion XL / SD3 / Flux.1** (Black Forest Labs).
- **DALL·E 3 (OpenAI), Imagen 3 (Google), Midjourney v6** — 상용.
- **ControlNet, IP-Adapter, LoRA** — 조건부 생성.
- **Inpainting / Outpainting** — Adobe Firefly, Photoshop Generative Fill.

### H-3. 영상 생성 / 편집
- **Runway Gen-3, Pika 1.5, Luma Dream Machine, Sora, Kling, Veo 2** — text-to-video.
- **D-ID / HeyGen / Synthesia** — 아바타/립싱크.
- **CapCut API / Descript** — 편집 자동화.

### H-4. 한국어 OCR / 메뉴판/표지판
- **Naver Clova OCR** — https://www.ncloud.com/product/aiService/ocr
- **카카오 OCR** (다음OCR 후신).
- **Google Cloud Vision API**, **Azure AI Vision (구 Computer Vision)**, **AWS Textract**.
- **EasyOCR**, **PaddleOCR**, **Tesseract 5** — 오픈소스.

---

## I. 저작권 / 라이선스 (한국 관광 컨텍스트)

### I-1. 공공누리 (KOGL)
- 한국 정부·공공기관 저작물 라이선스. https://www.kogl.or.kr
- 4가지 유형:
  1. 출처 표시
  2. 출처 표시 + 상업적 이용 금지
  3. 출처 표시 + 변경 금지
  4. 출처 표시 + 상업적 이용 금지 + 변경 금지
- 한국관광공사 사진 갤러리 「대한민국 구석구석」, 한국문화정보원 「e뮤지엄」 다수 KOGL 적용.

### I-2. 한국관광공사 사진 / 영상
- **「한국관광공사 사진 갤러리」** (https://kto.visitkorea.or.kr 또는 한국관광 데이터랩 부속) — 회원가입 후 다운로드, 공공누리 표시.
- **TourAPI 4.0**의 `firstImage`, `firstImage2` 필드는 KTO 또는 지자체/사업자 제공 이미지 URL. 라이선스는 콘텐츠별 상이 — 상업적 사용 시 개별 확인 필요.
- 「Korea.net 사진뉴스」 (해외문화홍보원 KOCIS) — 일부 KOGL.

### I-3. 글로벌 라이선스
- Creative Commons (CC BY / CC BY-SA / CC0 등).
- Unsplash, Pexels, Pixabay — 자체 라이선스(상업적 OK, 출처 권장).
- Getty Images / Shutterstock / Adobe Stock — 상용.

---

## J. 성능 / 측정

### J-1. Web Vitals
- **LCP (Largest Contentful Paint)** — 이미지가 LCP 후보일 때 우선 로딩 (`fetchpriority="high"`, preload).
- **CLS (Cumulative Layout Shift)** — `width`/`height` 또는 `aspect-ratio` 명시.
- **INP (Interaction to Next Paint)** — 영상/AR 인터랙션.

### J-2. 측정 도구
- **Lighthouse / PageSpeed Insights** — https://pagespeed.web.dev
- **WebPageTest** — https://www.webpagetest.org
- **Chrome DevTools Performance** / **Coverage**.
- **SpeedCurve / Calibre / DebugBear** — RUM/synthetic SaaS.
- **Cloudflare Web Analytics**, **Vercel Speed Insights**.

### J-3. 이미지 압축 측정
- **butteraugli, SSIMULACRA2** — Google 시각 품질 메트릭.
- **DSSIM, MS-SSIM, PSNR**.
- **Squoosh** (Google) — 브라우저 비교 도구. https://squoosh.app

---

## K. 업로드 / 처리 파이프라인 (사용자 생성 콘텐츠 UGC)

### K-1. 업로드 SaaS
- **Uploadcare**, **Filestack**, **Transloadit**, **uppy.io** (오픈소스 클라이언트).
- **Cloudflare Direct Creator Upload** (Stream/Images).
- **Tus** — 재개 가능 업로드 표준 https://tus.io

### K-2. 콘텐츠 모더레이션
- **AWS Rekognition Content Moderation**.
- **Google Cloud Vision SafeSearch**.
- **Azure AI Content Safety**.
- **Hive Moderation**.
- **Sightengine**.
- 한국어 욕설/혐오: **Naver Clova Toxicity** (CLOVA Studio), Kakao 내부, 또는 자체 fine-tuned KoBERT.

### K-3. EXIF 위치 기반 자동 분류
- 업로드 이미지의 GPS EXIF → 역지오코딩 → 관광지 마스터 매핑.
- 모델: CLIP + 관광지 임베딩으로 cross-check.

---

## L. 한국 관광 관련 미디어 데이터셋 / 공공 카탈로그

| 데이터셋 / 카탈로그 | URL | 비고 |
|---|---|---|
| 대한민국 구석구석 (KTO) | https://korean.visitkorea.or.kr | 공식 사진/영상 |
| KOGL 공공누리 | https://www.kogl.or.kr | 라이선스 검색 |
| e뮤지엄 (한국문화정보원) | https://www.emuseum.go.kr | 박물관 유물 이미지 |
| 국가유산청 (구 문화재청) | https://www.cha.go.kr | 문화재 사진/영상/3D |
| 디지털 헤리티지 | https://www.heritage.go.kr | 디지털화 콘텐츠 |
| KOCIS Korea.net | https://www.korea.net | 해외홍보용 사진 |
| K-pop / 콘텐츠 KOCCA | https://www.kocca.kr | 한국콘텐츠진흥원 |
| 공공데이터포털 미디어 | https://www.data.go.kr | 부처별 미디어 데이터 |

---

## M. 오디오 (관광 가이드 / BGM)

### M-1. 오디오 호스팅
- **SoundCloud API**, **Spotify Web Playback SDK**, **Apple Music API**, **YouTube Music**.
- 셀프호스트: S3 + signed URL + HTML5 `<audio>`, 또는 HLS audio-only.

### M-2. TTS (관광 오디오 가이드용)
- **Naver Clova Voice / CLOVA Dubbing** (한국어 자연성 우수, 다국어).
- **Kakao i Voice (Newtone)**.
- **Google Cloud Text-to-Speech (Neural2, Studio voices)**.
- **Amazon Polly (Neural)**.
- **Microsoft Azure Speech (Neural)**.
- **OpenAI TTS (gpt-4o-mini-tts)**.
- **ElevenLabs Multilingual v2** — 다국어 합성, 음성 클로닝.

### M-3. 오디오 비주얼라이저 / 인터랙션
- Web Audio API + Canvas/WebGL.
- Howler.js — 크로스브라우저 오디오 https://howlerjs.com
- Wavesurfer.js — 파형 시각화 https://wavesurfer.xyz

---

## N. 핵심 요약

| 영역 | 한국 관광 컨텍스트 표준 / 추천 |
|---|---|
| 이미지 CDN | Cloudinary / Cloudflare Images / NAVER Cloud CDN+ |
| Next.js 이미지 | `next/image` + `remotePatterns`에 KTO 이미지 도메인 등록 |
| 360° 뷰어 | Pannellum / Photo Sphere Viewer / Marzipano |
| 동영상 임베드 | YouTube / Vimeo (한국 관광 홍보 영상은 KTO YouTube 활용) |
| 동영상 셀프호스트 | Mux / Cloudflare Stream / NAVER Cloud Live Station |
| 웹 AR | MindAR / 8th Wall / `<model-viewer>` |
| 모바일 AR | ARKit / ARCore + Unity AR Foundation |
| 음성 가이드 | Clova Voice (한국어) + ElevenLabs (다국어) |
| OCR (메뉴/표지판) | Clova OCR / Google Vision |
| 라이선스 표기 | 공공누리(KOGL) 출처 표기, TourAPI 이미지는 콘텐츠별 확인 |

---
*문서 끝.*
