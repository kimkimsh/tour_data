import { setRequestLocale } from 'next-intl/server';

import { getPois, getRoutes, orEmpty } from '@/lib/data';
import { DiaryPrint } from '@/components/diary/DiaryPrint';

export const revalidate = 3600;

/**
 * The snapshots are decoration here, not the document: the record is in the reader's
 * browser. A missing snapshot costs the photo and the route's evidence sentence, so
 * this page renders what it has rather than refusing to print the visitor's own
 * record. The .txt export gates instead, because the file it writes claims those
 * lines are present.
 */
export default async function DiaryPrintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [pois, routes] = await Promise.all([getPois(), getRoutes()]);
  return <DiaryPrint pois={orEmpty(pois)} routes={orEmpty(routes)} />;
}
