'use client';

import { Fragment, useEffect, useId } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buildDiaryDocument } from '@/domain/diary';
import { diaryLabels } from '@/lib/diary-labels';
import type { Locale } from '@/domain/types';
import type { Poi, Route } from '@/domain/snapshot-schema';
import { useDiary } from './useDiary';

const PHOTO_WIDTH = 640;
const PHOTO_HEIGHT = 427;

/**
 * A CSS `<string>`, quotes included, because that is what a margin box's `content`
 * takes. The text is snapshot data, so the two characters that could end the string
 * early are escaped rather than assumed absent.
 */
function cssString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The printable record. A client component because the record lives in
 * localStorage: there is nothing on the server to render it from.
 *
 * The attribution list sits once at the end, which is where
 * docs/spec/08_accessibility_legal.md section 3.3 puts it for a printed document.
 * Chrome repeats a <thead> across pages and nothing else, so putting the credits on
 * every page would mean pouring the whole record — photo, prose, memo — into one
 * table, and that table would not be a real one. Each place instead starts its own
 * page, so no page carries a section without the heading it belongs to.
 */
export function DiaryPrint({ pois, routes }: { pois: Poi[]; routes: Route[] }) {
  const t = useTranslations('diary');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const { entry, loaded } = useDiary();
  const groupId = useId();

  const doc = buildDiaryDocument(entry, { pois, routes }, diaryLabels(t), locale);
  // The first entry, not the whole list. A margin box does not wrap: joined, the line
  // ran under the page number and both came out cut. This one names the rights holder
  // and points at the section that carries the rest.
  const runningAttribution = t('printRunningFooter', { source: doc.attributions[0] ?? '' });

  /**
   * The line every printed page carries, so a page torn out of the middle still names
   * where its data came from — the licence terms ask for that, and the full list at
   * the end cannot do it alone.
   *
   * Set on the root element because a @page margin box inherits from there and from
   * nowhere else. Declared above the loading branch: a hook after an early return is
   * a hook that does not run on every render.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--print-attrib', cssString(runningAttribution));
    return () => {
      root.style.removeProperty('--print-attrib');
    };
  }, [runningAttribution]);

  if (!loaded) {
    return <p role="status">{t('loading')}</p>;
  }

  const openPrintDialog = async () => {
    // A font that arrives after the dialog opens reflows the page mid-print and
    // splits blocks at the wrong lines.
    await document.fonts.ready;
    window.print();
  };

  return (
    <article className="grid gap-8">
      <header className="print-block grid gap-2">
        <h1>{doc.title}</h1>
        <p>
          <strong>{t('date')}</strong> <span className="tabular">{doc.dateLabel}</span>
        </p>
        <p>
          <strong>{t('companions')}</strong> {doc.personaLabels.join(' · ')}
        </p>
        <p className="no-print mt-3 flex flex-wrap gap-3">
          <button type="button" className="btn btn--filled" onClick={() => void openPrintDialog()}>
            {tc('print')}
          </button>
          <Link href="/diary" className="btn">
            {tc('back')}
          </Link>
        </p>
        <p className="no-print t-sm text-[var(--color-ink-2)]">{t('printHint')}</p>
      </header>

      {doc.sections.length === 0 ? <p className="blank-slot">{t('empty')}</p> : null}

      {doc.sections.map((section, index) => (
        <section
          key={`${index}-${section.heading}`}
          // Not on the first one: a break before section 1 leaves page 1 holding the
          // title and nothing else.
          className={index === 0 ? 'grid gap-4' : 'print-page-break grid gap-4'}
          aria-labelledby={`${groupId}-${index}`}
        >
          <h2 id={`${groupId}-${index}`}>{section.heading}</h2>

          {section.photoUrl === null ? null : (
            /* loading="eager" because next/image lazy-loads, and an image still below
               the fold when the print job starts prints as a blank box. unoptimized
               because a KOGL type 3 photo may not be resized or cropped and the
               document carries only the URL, not that flag — so none are touched. */
            <Image
              src={section.photoUrl}
              alt={t('photoAlt', { place: section.heading })}
              width={PHOTO_WIDTH}
              height={PHOTO_HEIGHT}
              loading="eager"
              unoptimized
              className="h-auto w-full max-w-[420px] object-contain"
            />
          )}

          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[9rem_1fr]">
            {section.lines.map((line) => (
              <Fragment key={line.label}>
                <dt className="font-bold">{line.label}</dt>
                <dd>{line.value}</dd>
              </Fragment>
            ))}
          </dl>

          {section.steps.length > 0 ? (
            /* Wrapped like the other four .data-table sites. The table carries a
               min-inline-size of 38rem, so at phone width an unwrapped one takes the
               document sideways instead of scrolling inside its own box. */
            <div
              className="scroll-x"
              tabIndex={0}
              role="region"
              aria-label={t('stepsCaption', { place: section.heading })}
            >
              <table className="data-table">
                <caption>{t('stepsCaption', { place: section.heading })}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('stepColumn')}</th>
                    <th scope="col">{t('stateColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.steps.map((step) => (
                    <tr key={step.seq}>
                      <th scope="row" className="font-normal">
                        <span className="tabular">{step.seq}.</span> {step.title}
                      </th>
                      <td>{step.done ? t('stateDone') : t('stateNotDone')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {section.memo === null ? null : (
            <div className="print-block grid gap-1">
              <h3>{t('memo')}</h3>
              <p className="whitespace-pre-wrap">{section.memo}</p>
            </div>
          )}
        </section>
      ))}

      <section className="print-block grid gap-2" aria-labelledby={`${groupId}-sources`}>
        <h2 id={`${groupId}-sources`}>{t('printSources')}</h2>
        <ul className="grid gap-1">
          {doc.attributions.map((line) => (
            <li key={line} className="evidence__provenance">
              {line}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
