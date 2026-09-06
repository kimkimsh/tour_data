# 02 — Supabase 프로젝트 만들기

> **끝나면:** 방문자 제보 기능이 동작하고, 관리자 화면에 로그인할 수 있다.
> **걸리는 시간:** 30분
> **돈:** 무료 (Free 플랜으로 충분하다)

---

## 무엇을 하는 것인가

**Supabase는 데이터베이스 한 개를 인터넷에 띄워 주는 서비스**다. 이 프로젝트에서 그 데이터베이스가 저장하는 건 두 가지뿐이다:

1. **방문자가 올린 제보** (「엘리베이터 고장」 같은 것)
2. **수집한 무장애 데이터의 사본** — 원본은 어차피 한국관광공사에서 오고, 여기엔 하루에 한 번 복사해 둔다

**Supabase가 없어도 나머지 화면은 전부 동작한다.** 지금 `content/generated/*.json` 파일을 대신 읽게 되어 있어서다. 제보 기능만 안 된다.

---

## 1단계 — 프로젝트 만들기

1. https://supabase.com 접속 → **Start your project**
2. GitHub 계정으로 로그인하는 게 제일 빠르다
3. **New project**
4. 입력할 것:

| 항목 | 넣을 값 | 이유 |
|---|---|---|
| **Name** | `modu-baekje` | 아무거나 상관없다 |
| **Database Password** | 자동생성 버튼을 누르고 **어딘가에 저장** | 나중에 직접 SQL 접속할 때 필요하다. 웹 화면만 쓸 거면 안 쓴다 |
| **Region** | **Northeast Asia (Seoul)** | 방문자가 전부 한국에 있다. 다른 지역을 고르면 화면이 매번 눈에 띄게 느려진다 |
| **Plan** | Free | 이 규모에서는 충분하다 |

만들어지는 데 **1–2분** 걸린다.

---

## 2단계 — 익명 로그인 켜기 ★ 빠뜨리기 쉬운 곳

**이걸 안 켜면 제보 버튼을 눌러도 아무 일도 안 일어난다.**

1. 왼쪽 메뉴 **Authentication** → **Sign In / Providers**
2. 아래로 내려서 **Anonymous sign-ins** 를 찾는다
3. **켠다(Enable)**
4. **Save**

### 왜 익명 로그인인가

이 서비스는 **회원가입이 없다.** 그런데 「같은 사람이 같은 날 같은 제보를 두 번 올리는 것」은 막아야 한다. 그러려면 이름은 몰라도 **「같은 사람」이라는 것만은 알아야 한다.**

익명 로그인이 그 역할이다. 제보 버튼을 누르는 순간 브라우저에 이름 없는 신분증(UUID) 하나가 발급되고, 그걸로만 구분한다. 이름도 이메일도 받지 않는다.

> `supabase/config.toml`에 `enable_anonymous_sign_ins = true`가 이미 있는데, **그건 로컬에서 `supabase start`로 띄울 때만 적용된다.** 실제 프로젝트는 위 웹 화면에서 따로 켜야 한다. 파일에 써 있으니 됐겠지 하고 넘어가기 쉬운 곳이다.

---

## 3단계 — 값 세 개 복사

**Project Settings**(왼쪽 아래 톱니바퀴) → **API Keys** / **Data API**

세 개를 `.env.local`에 옮긴다:

| 화면에 보이는 이름 | `.env.local`의 줄 | 공개돼도 되나 |
|---|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL=` | 된다 |
| **anon** / **public** | `NEXT_PUBLIC_SUPABASE_ANON_KEY=` | 된다 |
| **service_role** / **secret** | `SUPABASE_SERVICE_ROLE_KEY=` | ❌ **절대 안 된다** |

### 앞의 둘이 공개돼도 되는 이유

`NEXT_PUBLIC_`으로 시작하는 값은 **브라우저로 전송되는 코드 안에 그대로 들어간다.** 숨길 방법이 없고, 숨길 필요도 없다 — 이 두 값만으로는 「누구나 볼 수 있는 것」밖에 못 본다. 무엇을 볼 수 있는지는 데이터베이스 쪽 규칙(RLS)이 따로 정한다.

### 세 번째가 위험한 이유

**`service_role` 키는 그 규칙 전체를 무시한다.** 이 키를 가진 사람은 숨겨진 제보를 읽고, 남의 제보를 고치고, 테이블을 통째로 지울 수 있다.

그래서:
- **`NEXT_PUBLIC_`을 절대 붙이지 않는다.** 붙이는 순간 브라우저 코드에 들어가서 전 세계에 공개된다
- 이 프로젝트에서 이 키를 쓰는 건 `pnpm ingest` 하나뿐이고, 그건 내 컴퓨터나 GitHub Actions에서만 돈다

넣고 나면 이런 모양이 된다:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

> 두 키가 둘 다 `eyJ`로 시작해서 **헷갈리기 쉽다.** 화면에서 복사할 때 어느 쪽 버튼을 눌렀는지 확인하고, 붙여넣은 뒤에도 한 번 더 본다.

---

## 4단계 — 테이블 만들기

두 가지 방법이 있다. **웹에서 붙여넣는 쪽이 설치할 게 없어서 간단하다.**

### 방법 A — 웹에서 (권장)

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. `supabase/migrations/001_snapshots.sql` 파일 내용을 **전부** 복사해서 붙여넣고 **Run**
3. 새 쿼리를 열고 `supabase/migrations/002_reports.sql`도 똑같이 **Run**

**순서를 지켜야 한다.** 001 먼저, 002 나중.

`Success. No rows returned`가 나오면 된 것이다.

### 방법 B — 명령줄에서

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <프로젝트 ref>
pnpm dlx supabase db push
```

`<프로젝트 ref>`는 Project URL의 `https://` 다음 부분이다 (`abcdefgh.supabase.co`면 `abcdefgh`).

### ★ 여기서부터 되돌릴 수 없는 것이 하나 생긴다

**방법 B로 올리면 Supabase가 「001과 002는 적용됨」이라고 기록한다.** 그 뒤로는 그 파일들을 고쳐도 **실제 데이터베이스가 안 바뀐다.** 다시 실행하지 않기 때문이다.

즉 지금까지는 `002_reports.sql`을 몇 번이고 고칠 수 있었는데(실제로 이번 작업에서 네 번 고쳤다), **push하는 순간 그게 끝난다.** 이후에 고칠 게 생기면 `003_*.sql`을 새로 만들어야 한다.

방법 A(웹에 붙여넣기)는 그 기록을 남기지 않아서 이 제약이 없다. 대신 나중에 여러 환경을 쓰게 되면 어디에 무엇이 적용됐는지 사람이 기억해야 한다.

**지금은 프로젝트가 하나뿐이므로 방법 A로 충분하다.**

---

## 5단계 — 확인

```bash
pnpm dev
```

http://localhost:3000/ko/report 를 연다.

- 화면 위의 **「예시 데이터」 배너가 사라졌으면** Supabase에 연결된 것이다
- 제보를 하나 올려 보고, 관광지 화면의 「방문자 제보」 절에 바로 뜨는지 본다

### 여전히 배너가 보인다면

`.env.local`을 고친 뒤 **개발 서버를 껐다 켜야 한다.** 환경변수는 서버가 시작할 때 한 번만 읽는다.

### 제보 버튼을 눌러도 아무 일이 없다면

→ 2단계(익명 로그인)를 안 켰다. 제일 흔한 경우다.

---

## 6단계 — 관리자 계정 만들기

관리자 화면(`/admin/reports`)에 들어갈 계정을 만든다. **환경변수가 아니라 데이터베이스 테이블로 지정한다** — 관리자를 뺄 때 재배포가 아니라 한 줄 삭제로 끝나게 하려고 그렇게 했다.

### 6-1. 계정 만들기

**Authentication** → **Users** → **Add user** → **Create new user**

이메일과 비밀번호를 넣는다. **Auto Confirm User를 켠다** (안 켜면 인증 메일을 기다려야 한다).

만들어진 사용자의 **UID**를 복사한다 (`a1b2c3d4-...` 모양).

### 6-2. 관리자 명단에 넣기

**SQL Editor**에서:

```sql
insert into admin_users (user_id, email)
values ('여기에_복사한_UID', '여기에_이메일');
```

### 6-3. 확인

http://localhost:3000/admin/reports 에서 그 이메일과 비밀번호로 로그인한다.

- 로그인은 되는데 **「이 계정은 관리자가 아닙니다」**가 나오면 → 6-2를 안 했거나 UID를 잘못 넣었다
- 로그인 자체가 안 되면 → 6-1에서 Auto Confirm을 안 켰을 수 있다

---

## 데모용 예시 제보를 넣고 싶다면

심사용으로 관리자 화면에 제보가 3건 보이게 하려면 `supabase/seed.sql`을 SQL Editor에 붙여넣고 Run 한다. 신고된 것 1건, 일반 1건, 숨겨진 것 1건이 들어가서 화면의 모든 상태를 한 번에 보여줄 수 있다.

**실제 서비스로 쓸 거면 넣지 않는다.** 가짜 제보다.

---

## 끝났으면

→ [`03_first_run.md`](./03_first_run.md)
