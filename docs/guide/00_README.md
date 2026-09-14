# 00 — 안내서 (읽는 법)

> **이 폴더가 무엇인가**
> **설정은 끝났다.** 키도 들어왔고, Supabase도 붙었고, 배포도 됐고, 야간 수집도 돈다.
>
> 그래서 이 폴더는 이제 두 가지를 한다 — **지금 무엇을 어떻게 돌리는가**(05번)와, **처음에 어떻게 붙였는가**(01–03번). 두 번째는 다시 할 일이 생겼을 때 보는 것이다: 키가 만료됐을 때, Supabase 프로젝트를 새로 팔 때, 관광지를 늘릴 때.

---

## 지금 상태

| | |
|---|---|
| **주소** | https://modu-baekje.vercel.app |
| **데이터** | 공공데이터포털 API 11종 + 기상청, Supabase `data_snapshots` 6개 스냅샷 |
| **야간 수집** | GitHub Actions, 매일 04:00 KST. 스냅샷을 `main`에 커밋하고 Vercel이 이어서 배포한다 |
| **결정 5가지** | 전부 결정됨 (04번) |

한 번에 확인하는 법:

```bash
pnpm validate:content
```

```
content validation passed: 6 places, 20 facilities, 1 certifications, 54 curated facts
```

이 파일이 빨간불이 되는 건 **누가 `content/` 안의 사실을 손으로 고쳤을 때**다.

---

## 문서 순서

| # | 문서 | 언제 보는가 |
|---|---|---|
| 05 | [`05_operations.md`](./05_operations.md) | **평소에 보는 것.** 수집을 돌리고, 배포하고, 데이터가 이상할 때 |
| 01 | [`01_kto_api_key.md`](./01_kto_api_key.md) | 한국관광공사 키를 다시 받을 때 |
| 02 | [`02_supabase.md`](./02_supabase.md) | Supabase 프로젝트를 새로 만들 때, 관리자를 추가할 때 |
| 03 | [`03_first_run.md`](./03_first_run.md) | 관광지를 늘려서 `ktoContentId`를 새로 찾아야 할 때 |
| 04 | [`04_decisions.md`](./04_decisions.md) | 왜 그렇게 정했는지 되짚을 때 |

---

## 걸리는 함정 네 개

실제로 사람들이 걸린 곳이고, 각 문서에서 다시 나온다.

**1. 한국관광공사 키는 두 가지 형태로 준다. 틀린 쪽을 넣으면 조용히 안 된다.**
「일반 인증키(Encoding)」와 「일반 인증키(Decoding)」가 나란히 보이는데, **Decoding 쪽을 써야 한다.** Encoding 쪽을 넣으면 서버가 `resultCode 30 (등록되지 않은 서비스키)`를 돌려주는데, 이 메시지가 「키가 잘못됐다」로 읽혀서 키를 다시 발급받으러 가게 된다. 키는 멀쩡하고 형태만 틀린 것이다.

**2. Supabase의 익명 로그인은 두 군데서 따로 켜야 한다.**
`supabase/config.toml`에 켜 둔 것은 **로컬 개발용**이다. 실제 프로젝트는 웹 대시보드에서 **따로 한 번 더** 켜야 한다. 안 켜면 제보 버튼을 눌러도 아무 일도 안 일어난다.

**3. 마이그레이션은 한 번 올리면 그 파일을 못 고친다.**
`supabase db push`를 하는 순간 Supabase가 「이 파일은 적용됨」이라고 기록하고 다시 실행하지 않는다. 그 뒤로 `002_reports.sql`을 고쳐도 **실제 데이터베이스는 안 바뀐다.** 고칠 게 생기면 `003_*.sql`을 새로 만들어야 한다.

**4. 야간 수집 봇이 `main`에 직접 커밋한다. 푸시 전에 rebase한다.**
`chore(ingest): daily snapshot`이 `content/generated/*`를 건드리므로, 로컬에서 `pnpm ingest`를 돌린 뒤 그냥 푸시하면 거절당한다. **충돌은 로컬 쪽을 택한다** — 그 파일은 같은 실행이 Supabase에 쓴 것과 같아야 하기 때문이다. 05번 §4에 있다.

---

## 이 문서들이 다루지 않는 것

- **도메인 연결** — 아직 `*.vercel.app`을 쓴다
- **NVDA 수동 접근성 점검** — Windows가 필요하다. `../work_log/04_open_items.md` §4b
