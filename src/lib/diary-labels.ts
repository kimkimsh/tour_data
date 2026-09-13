import type { DiaryLabels } from '@/domain/diary';

/**
 * Fills the trip record's label set from the `diary` message namespace.
 *
 * One function rather than two literal objects, because the print page and the text
 * export render the same document and a label that differed between them would be
 * two records of one trip. Takes the translator itself so it works the same from a
 * client component (useTranslations) and from a route handler (getTranslations).
 */
export function diaryLabels(t: (key: string) => string): DiaryLabels {
  return {
    title: t('title'),
    notSelected: t('notSelected'),
    cognitive: t('cognitive'),
    visited: t('visited'),
    notVisited: t('notVisited'),
    designation: t('designation'),
    address: t('address'),
    routeGuide: t('routeGuide'),
    evidenceLevel: t('evidenceLevel'),
    accessibilityNote: t('accessibilityNote'),
    date: t('date'),
    companions: t('companions'),
    memo: t('memo'),
    sources: t('printSources'),
    done: t('stateDone'),
    notDone: t('stateNotDone'),
  };
}
