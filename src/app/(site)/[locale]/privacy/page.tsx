import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Eyebrow } from '@/components/Eyebrow';

export const revalidate = 3600;

const UPDATED = '2026-09-02';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('metaTitle') };
}

/**
 * The policy body is Korean only, and that is deliberate rather than unfinished:
 * a translated privacy policy creates a second text that can drift from the one
 * with legal effect. The English route gets a note saying which text governs.
 *
 * Every row below is a commitment something in the codebase actually keeps. Nothing
 * is listed that no code enforces — a retention period nobody deletes against is
 * worse than no retention period.
 */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'privacy' });

  return (
    <article className="grid max-w-[var(--container-prose)] gap-6">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="text-[0.95rem] text-[var(--color-ink-2)]">{t('updated', { date: UPDATED })}</p>
      </header>

      {locale === 'en' ? (
        <p role="note" className="card">
          This policy is published in Korean, and the Korean text is the one with legal effect.
          In summary: the service stores an anonymous identifier and the text of any report you
          post. It never asks for your name or your location, and it has no accounts.
        </p>
      ) : null}

      <Section n={1} title="처리 목적">
        <p>현장 접근성 정보를 다음 방문자에게 공유하기 위해 방문자 제보를 처리합니다.</p>
      </Section>

      <Section n={2} title="처리하는 개인정보 항목">
        <ul className="grid list-disc gap-1 pl-5">
          <li>익명 식별자(UUID) — 제보를 올릴 때 자동으로 만들어지는 익명 세션의 식별자입니다.</li>
          <li>제보 내용 — 관광지, 분류, 목격한 날짜, 설명(선택).</li>
        </ul>
        <p className="mt-2">
          회원가입이 없고, 이름·연락처·이메일을 받지 않습니다. <strong>사진을 받지 않습니다.</strong>{' '}
          <strong>위치 정보를 수집하지 않습니다</strong> — 브라우저 위치 기능을 호출하는 코드가 서비스
          전체에 없고, 제보에 좌표를 저장하지 않습니다.
        </p>
      </Section>

      <Section n={3} title="보유 기간과 파기">
        <ul className="grid list-disc gap-1 pl-5">
          <li>공개된 제보 — 서비스 운영 기간 동안 보관합니다.</li>
          <li>
            <strong>숨김 처리된 제보 — 숨긴 날부터 90일 뒤 실제로 삭제합니다.</strong> 수집
            스크립트가 실행될 때마다 이 삭제를 수행합니다.
          </li>
          <li>익명 식별자 — 그 식별자를 참조하는 제보가 모두 삭제되면 남지 않습니다.</li>
        </ul>
      </Section>

      <Section n={4} title="제3자 제공">
        <p>없습니다.</p>
      </Section>

      <Section n={5} title="처리 위탁">
        <ul className="grid list-disc gap-1 pl-5">
          <li>Supabase Inc. — 데이터베이스. 리전은 서울(ap-northeast-2)입니다.</li>
          <li>Vercel Inc. — 웹 호스팅.</li>
        </ul>
        <p className="mt-2">
          본문 서체는 이 사이트에서 직접 제공하므로 외부 서체 서비스로 요청이 나가지 않습니다. 지도
          기능은 이번 범위에 없으므로 지도 사업자에게 위탁하는 처리도 없습니다.
        </p>
      </Section>

      <Section n={6} title="국외 이전">
        <ul className="grid list-disc gap-1 pl-5">
          <li>Vercel Inc.(미국) — 이전 항목은 공개된 관광 정보와 요청 로그입니다.</li>
          <li>개인정보(익명 식별자·제보 내용)는 서울 리전 Supabase에만 저장됩니다.</li>
        </ul>
      </Section>

      <Section n={7} title="정보주체의 권리와 행사 방법">
        <p>
          열람·삭제·처리정지를 요구할 수 있습니다. 아래 연락처로 요청하시면 처리합니다. 별도의 자가
          조회·삭제 화면은 두지 않았습니다 — 계정이 없어 본인 확인 수단이 없기 때문입니다.
        </p>
      </Section>

      <Section n={8} title="안전성 확보 조치">
        <ul className="grid list-disc gap-1 pl-5">
          <li>전송 구간 TLS.</li>
          <li>저장 시 암호화(위탁사 제공).</li>
          <li>
            행 수준 보안(RLS) — 본인이 올린 제보만 쓸 수 있고, 숨겨진 제보는 작성자와 관리자에게만
            보입니다. 애플리케이션 코드가 아니라 데이터베이스가 강제합니다.
          </li>
          <li>최소 권한 — 서버 전용 키는 수집 스크립트만 사용합니다.</li>
        </ul>
      </Section>

      <Section n={9} title="자동수집장치의 설치·운영">
        <p>
          익명 인증 세션 쿠키 하나만 사용합니다. 분석 도구(SDK)를 설치하지 않았습니다.
        </p>
      </Section>

      <Section n={10} title="행태정보의 처리·제3자 제공">
        <p>행태정보를 수집하지 않습니다.</p>
      </Section>

      <Section n={11} title="가명정보 처리">
        <p>가명정보를 처리하지 않습니다.</p>
      </Section>

      <Section n={12} title="개인정보 보호책임자">
        <p>
          이름과 연락처는 배포 시 이 자리에 기재합니다. 기재 전에는 서비스를 공개하지 않습니다.
        </p>
      </Section>

      <Section n={13} title="처리방침 변경 고지">
        <p>변경하는 경우 이 페이지에 변경 내용과 시행일을 함께 게시합니다.</p>
      </Section>

      <Section n={14} title="파기 절차와 방법">
        <p>
          보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 파기합니다. 숨김 처리된 제보의 90일 후
          삭제는 수집 스크립트가 실행합니다.
        </p>
      </Section>

      <section className="card">
        <h2 className="subhead">동의에 관하여</h2>
        <p className="mt-2">
          제보 화면의 동의 항목은 <strong>「위 내용이 즉시 공개되는 것에 동의합니다」 하나뿐</strong>
          입니다. 필수와 선택을 묶지 않습니다. 실제로 검수 없이 바로 공개되므로 「검수를 거쳐」라고
          쓰지 않습니다.
        </p>
      </section>
    </article>
  );
}

/**
 * lang="ko" is not decoration here. The notice is published in Korean because the
 * Korean text is the one with legal effect, and it is served under <html lang="en">
 * on /en — an English screen-reader voice reading Korean characters produces
 * phonemes, not words.
 */
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section lang="ko" aria-labelledby={`privacy-${n}`} className="grid gap-2">
      <h2 id={`privacy-${n}`} className="subhead">
        <span className="mr-2 font-mono text-[0.8rem] text-[var(--color-gilt)]">
          {String(n).padStart(2, '0')}
        </span>
        {title}
      </h2>
      <div className="grid gap-2">{children}</div>
    </section>
  );
}
