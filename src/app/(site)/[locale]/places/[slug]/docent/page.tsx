import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getDocent, getPois } from '@/lib/data';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { DocentView } from '@/components/docent/DocentView';
import { Link } from '@/i18n/navigation';
import type { ContentLocale, Locale } from '@/domain/types';

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'docent' });
  // The place's name, not its slug — see the same call in the route-guide page.
  const pois = await getPois();
  const poi = pois.ok ? pois.data.find((p) => p.slug === slug) : undefined;
  const title = poi?.i18n[locale as ContentLocale]?.title ?? poi?.i18n.ko?.title ?? slug;
  return { title: `${title} · ${t('metaTitle')}` };
}

export default async function DocentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'docent' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const tPlace = await getTranslations({ locale, namespace: 'place' });

  const [pois, docent] = await Promise.all([getPois(), getDocent()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;

  const poi = pois.data.find((p) => p.slug === slug);
  if (!poi) return <MissingPlace message={tPlace('notFound')} backLabel={tc('nav.places')} />;

  const title = poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? poi.slug;
  const stories = docent.ok ? docent.data.filter((story) => story.poiSlug === slug) : [];

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1>{t('title', { place: title })}</h1>
      </header>

      {stories.length === 0 ? (
        <div className="grid gap-2">
          <p className="blank-slot">{t('none')}</p>
          <p className="text-[0.95rem] text-[var(--color-ink-2)]">{t('noneHint')}</p>
          <p>
            <a
              className="btn"
              href="https://www.heritage.go.kr/"
              rel="noreferrer noopener"
            >
              heritage.go.kr
            </a>
          </p>
        </div>
      ) : (
        <DocentView stories={stories} uiLocale={locale as Locale} />
      )}
    </div>
  );
}

/**
 * A slug that names no place in this service.
 *
 * Rendered here rather than through notFound(). Every route in this app sits under a
 * route group with its own root layout, so there is no app/layout.tsx for Next to
 * wrap a not-found render in, and the framework answers with a document that has no
 * lang attribute, no heading and no text. On this service that is the worst page in
 * the build. The cost is the status code: this answers 200 where 404 would be
 * correct. An address outside the route tree entirely still gets a real 404, from
 * src/app/not-found.tsx.
 */
function MissingPlace({ message, backLabel }: { message: string; backLabel: string }) {
  return (
    <div className="grid gap-4">
      <h1>{message}</h1>
      <p>
        <Link href="/places" className="btn btn--filled">
          {backLabel}
        </Link>
      </p>
    </div>
  );
}
