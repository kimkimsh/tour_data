import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Eyebrow } from '@/components/Eyebrow';
import { ConditionsForm } from '@/components/persona/ConditionsForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('metaTitle') };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const howTo = t.raw('howTo') as string[];

  return (
    <div className="grid gap-10">
      <section className="grid gap-4">
        {/* Names what this screen is. It used to read "Step 1" — English on a Korean
            screen, announcing a sequence with no step 2 anywhere in the interface. */}
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title')}</h1>
        <p className="max-w-[var(--container-prose)] text-[1.08rem] text-[var(--color-ink-2)]">
          {t('intro')}
        </p>
      </section>

      {/* The reviewer arrives with a link and no guide. If they never open the
          calculation section they never see what this service is for, so the
          route to it is stated here rather than left to be discovered. */}
      <section aria-labelledby="how-to" className="card max-w-[var(--container-prose)]">
        <h2 id="how-to" className="subhead">
          {t('howToTitle')}
        </h2>
        <ol className="mt-3 grid gap-2">
          {howTo.map((line, index) => (
            <li key={line} className="grid grid-cols-[2rem_1fr] gap-2">
              <span className="font-mono text-[0.8rem] text-[var(--color-gilt)]" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
      </section>

      <ConditionsForm />
    </div>
  );
}
