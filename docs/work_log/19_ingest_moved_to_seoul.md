# 19 — 수집이 서울에서 돕니다

18번 뒤에 야간 수집이 이틀째 실패하고 있었습니다. 이 회차는 그 원인을 끝까지 따라가서, **수집을 GitHub 러너에서 Vercel 함수(icn1)로 옮긴** 기록입니다.

**한 줄:** 게이트웨이가 러너의 IP에서 TCP 연결을 안 받아 줬습니다. 재시도로는 못 넘습니다 — 벽이 런에 묶여 있습니다.

---

## 1. 로그가 아무것도 말하지 않았다

```
warn  ldongCode2 failed: …: fetch failed — fetch failed (gave up after 3 attempts)
ingest: 2 call(s) never reached the gateway (0 did). Nothing was published…
```

**중단 자체는 옳았습니다.** 16번에서 막은 게이트가 빈 스냅샷을 덮어쓰는 대신 아무것도 발행하지 않았습니다.

문제는 그다음입니다. `fetch failed — fetch failed`는 DNS인지, 연결인지, 핸드셰이크인지 한 글자도 말하지 않습니다. undici는 TypeError의 `message`를 **상수 문자열 `"fetch failed"`**로 두고 진짜 이유를 `.cause`에 넣는데, 우리는 `message`만 찍고 있었습니다.

cause 체인을 따라가게 고쳤습니다. **다음 실패에서 바로 값을 했습니다.**

```
fetch failed — TypeError: fetch failed
             <- ConnectTimeoutError(UND_ERR_CONNECT_TIMEOUT):
                Connect Timeout Error (attempted address: apis.data.go.kr:443, timeout: 10000ms)
```

DNS는 풀렸고(주소가 찍힙니다), 소켓에 한 바이트도 안 쓰였습니다. `10000ms`는 우리 `DEFAULT_TIMEOUT_MS = 15_000`이 아니라 **undici 자체의 connect timeout**입니다.

---

## 2. 재시도로는 안 되는 이유 — 실측

8번 실행을 셌습니다.

```
성공 4  ·  실패 4
실패한 런 안의 성공 콜: 0건   (12번 연결 시도 / 80초)
이 컴퓨터에서:               403 in 0.09초
```

**런 하나가 통째로 되거나 통째로 안 됩니다.** 일시적 혼잡이었다면 80초에 걸친 12번 중 한 번은 뚫렸을 겁니다. 런 내내 고정이면서 런마다 바뀌는 변수는 **러너의 출발지 주소** 하나입니다.

### 2.1 그래서 앞 커밋 하나는 근거가 틀렸다

`MAX_ATTEMPTS`를 3 → 6으로 올리면서 「짧은 blip을 기다린다」고 적었습니다. **그 모델이 반증됐습니다.** 숫자는 6으로 뒀습니다 — `RETRYABLE_RESULT_CODES`(서버가 나쁘게 **답하는** 경우)에는 맞는 값입니다. 고친 것은 주석의 근거입니다. 파일 안의 틀린 이유는 이유 없는 것보다 나쁩니다.

---

## 3. icn1은 되는가 — 200줄 쓰기 전에 10줄로 물었다

운영에서 이미지 프록시가 `tong.visitkorea.or.kr`을 200으로 가져오는 건 알고 있었습니다. **그건 답이 아닙니다** — `apis.data.go.kr`는 다른 호스트이고 다른 방화벽 뒤일 수 있습니다. 거기가 막혀 있으면 이전(移轉) 전체가 헛일입니다.

두 호스트를 한 번의 호출에서 재는 임시 라우트를 배포했습니다. 서비스 키는 안 넣었습니다 — **4xx면 연결과 핸드셰이크가 성공했다는 뜻**이고, 그게 질문의 전부입니다.

```
icn1  gateway ok 401  11ms   images ok 200  62ms
icn1  gateway ok 401  54ms   images ok 200  52ms
…
13/13 성공, 27~54ms
```

러너의 10,000ms 타임아웃과 대조됩니다. 확인 뒤 라우트는 지웠습니다.

> **첫 배포는 404였습니다.** 폴더 이름을 `_gateway-probe`로 지었는데, **밑줄로 시작하는 폴더는 App Router의 private folder**라 라우팅에서 통째로 빠집니다. 배포는 성공하고 경로만 없었습니다.

---

## 4. 옮기면서 드러난 것 — 파이프라인이 디스크로 대화하고 있었다

함수의 파일시스템은 `/tmp` 밖이 읽기 전용입니다. 그래서 `writeFiles: false`로 돌려 봤더니 `accessibility` 단계가 깨졌습니다.

`readGenerated('routes')` · `readGenerated('context')` · `readGenerated('pois')` — **한 프로세스가 파일을 쓰고, 같은 프로세스가 그 파일을 다시 읽고 있었습니다.** 디스크를 못 쓰는 곳에서 이 파이프라인이 돌 수 없었던 이유가 이것입니다.

`publish()`가 payload를 Map에 남기고 `readGenerated()`가 그것을 먼저 봅니다. 파일은 CLI에서만 씁니다.

한 군데를 놓쳤다가 실측으로 잡았습니다 — **bootstrap의 `codes.json`은 `publish()`를 안 거치고 직접 씁니다.** 라우트 실행 뒤 `git status`에 파일 1개가 떠서 알았습니다.

---

## 5. 진입점 감지는 잘못된 도구였다

처음에는 한 파일에 두고 `require.main === module`로 자동 실행을 막으려 했습니다. **Turbopack의 ESM 컨텍스트에는 `module`이 없어서** 라우트가 임포트하는 순간 `ReferenceError`가 났습니다.

`typeof module !== 'undefined'`로 두 단어만 고칠 수도 있었지만 그러지 않았습니다. **이 가드가 잘못 걸렸을 때의 결과는 `next build` 도중 실제 게이트웨이에 대한 전체 수집**입니다. 양방향으로 틀릴 수 있는 검사가 그것과 배포 사이에 서 있으면 안 됩니다.

`scripts/ingest-cli.ts`로 분리했습니다. **자기를 실행하지 않는 모듈은 잘못 걸릴 수가 없습니다.** 프로덕션 빌드로 확인했습니다 — 빌드 로그에 단계 실행 0건, 파일 변경 0건.

---

## 6. 무엇이 어디서 도는가

| | 어디서 | 언제 | 무엇을 |
|---|---|---|---|
| 수집 | **Vercel cron, icn1** | 매일 04:00~04:59 KST | KTO·기상청 → Supabase, 캐시 무효화 |
| 스냅샷 커밋 | GitHub Actions | 매일 04:30 KST | Supabase → `content/generated` → commit |

`.github/workflows/ingest.yml`은 지웠고 `snapshot.yml`이 대신합니다. **후자는 Supabase만 보고 `apis.data.go.kr`을 안 건드리므로** 주소 벽과 무관합니다.

**git 이력을 남긴 이유.** 워크플로 주석이 「`git diff`가 어제와 뭐가 달라졌나를 답한다, 이게 ingest 이력 테이블을 대신한다」고 적어 뒀습니다. 함수는 커밋을 못 하므로, 옮기면서 조용히 버리는 대신 그 절반만 남겼습니다. 같은 파일들이 `pnpm build:fixtures`와 e2e가 쓰는 픽스처이기도 합니다.

---

## 7. Hobby로 충분한가 — 문서 확인

| 필요 | Hobby 한도 | 우리 |
|---|---|---|
| cron 개수 | 100개 | 1개 |
| cron 주기 | 하루 1회 | 하루 1회 |
| 함수 최대 실행 | **300초(기본이자 최대, 못 늘림)** | **33초** |
| 메모리 | 2 GB / 1 vCPU | 무관 |
| 리전 | 단일 리전 변경 가능 | `icn1` |

**Pro 필요 없습니다.**

리전은 문서가 아니라 응답 헤더로 확인했습니다 — `x-vercel-id: icn1::icn1::…`.

두 가지는 알고 둡니다.

1. **시각이 ±59분입니다**(Hobby). `0 19 * * *`는 04:00~04:59 KST 사이에 뜹니다. 하루치 관광 데이터에 무관합니다.
2. **Vercel은 실패한 cron을 재시도하지 않습니다.** 그리고 전달은 best effort라 **중복 호출도 가능**합니다. 수집은 key 기준 upsert라 멱등이고, 33초짜리가 하루 한 번이라 겹칠 일은 사실상 없습니다.

실행이 300초에 닿기 시작하면 `runIngest({ stages })`가 단계 부분집합을 받고 cron은 100개까지 쓸 수 있습니다. 지금 할 일은 아닙니다.

---

## 8. 사람이 해야 할 것 하나

**Vercel 프로젝트 환경변수에 `CRON_SECRET`을 넣어야 합니다.** 자동으로 생기지 않습니다.

Vercel은 그 값을 `Authorization: Bearer …`로 보내고, 라우트가 그것과 대조합니다. 없으면 **503으로 닫힙니다** — 인증 없는 수집 엔드포인트가 공개 배포에 서 있는 일은 없습니다.

16자 이상 무작위 문자열이면 됩니다. 넣은 뒤 재배포하면 cron이 붙습니다.

---

## 9. 게이트

```
typecheck · lint · validate:content · check:contrast      통과
test                                                      271 통과
build (production)                                        통과 · 수집 실행 0건 · 파일 변경 0건
라우트 실전 실행                                           33초, 6개 스냅샷 발행, 파일 0개
CLI (pnpm ingest)                                          그대로 동작
pull:snapshots                                             6개 파일 기록
```
