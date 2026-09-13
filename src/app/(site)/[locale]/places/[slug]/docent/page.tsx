import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getDocent, getPois } from '@/lib/data';
import { Eyebrow } from '@/components/Eyebrow';
import { SnapshotProblem } from '@/components/SnapshotGate';
import { DocentView } from '@/components/docent/DocentView';
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
  if (!poi) {
    const tc = await getTranslations({ locale, namespace: 'common' });
    return { title: tc('error.notFoundTitle') };
  }
  const title = poi.i18n[locale as ContentLocale]?.title ?? poi.i18n.ko?.title ?? slug;
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
  const [pois, docent] = await Promise.all([getPois(), getDocent()]);
  if (!pois.ok) return <SnapshotProblem result={pois} />;
  // Same reason as the route guide: "이 관광지에는 오디오 가이드가 없습니다" is a claim
  // about the place, and a failed read is a claim about us.
  if (!docent.ok && docent.kind === 'error') return <SnapshotProblem result={docent} />;

  const poi = pois.data.find((p) => p.slug === slug);
  if (!poi) notFound();

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

