import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConditionsForm } from '@/components/persona/ConditionsForm';
import { getFacts, getPois, orEmpty } from '@/lib/data';
import { CAPABILITIES } from '@/domain/capabilities';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  // Composed here rather than left to the layout's title template. The template applies
  // to child segments, and this page is in the same segment as the layout that defines
  // it — so the one page most likely to be bookmarked was the only one whose tab did
  // not carry the site's name.
  return { title: { absolute: `${t('metaTitle')} · ${tc('siteName')}` } };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const howTo = t.raw('howTo') as string[];

  // Measured rather than written down: a figure typed into a heading is the one number
  // on the page nothing can contradict. orEmpty because the picker still works with no
  // snapshot at all — the panel beside it goes quiet, the form does not.
  const pois = orEmpty(await getPois());
  const facts = orEmpty(await getFacts());
  const known = facts.filter((f) => f.status !== 'unknown').length;

  return (
    <div className="grid gap-9">
      <header className="grid gap-3">
        <h1>{t('title')}</h1>
        <p className="lede">{t('intro')}</p>
      </header>

      <div className="page-split">
        <ConditionsForm />

        <aside className="page-split__aside" aria-labelledby="how-to">
          <h2 id="how-to" className="subhead">
            {t('howToTitle')}
          </h2>
          {/* The browser's own numbers. They were zero-padded monospaced gilt badges in
              a two-column grid, which is a lot of apparatus for three sentences that
              are simply in order. */}
          <ol className="grid list-decimal gap-2 ps-5 t-sm">
            {howTo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>

          {facts.length > 0 ? (
            <dl className="grid gap-2 border-t border-[var(--color-rule)] pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="t-sm">{t('statPlaces')}</dt>
                <dd className="tabular font-bold">{pois.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="t-sm">{t('statItems')}</dt>
                <dd className="tabular font-bold">{CAPABILITIES.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="t-sm">{t('statChecked')}</dt>
                <dd className="tabular font-bold">
                  {known} / {facts.length}
                </dd>
              </div>
            </dl>
          ) : null}

          <p className="t-xs text-[var(--color-ink-2)]">{t('statNote')}</p>
        </aside>
      </div>
    </div>
  );
}
