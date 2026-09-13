import { getFacts, getPois } from '@/lib/data';
import { computeGapReport, gapRowsToCsv } from '@/domain/gap';
import type { GapFact } from '@/domain/gap';
import type { ContentLocale } from '@/domain/types';

/**
 * The gap report as a file a municipal officer can open in a spreadsheet.
 *
 * Same computation as the screen, from the same snapshot array, so the numbers in
 * the file and the numbers on the page cannot diverge.
 */
// Not cached: the handler reads a search parameter, so Next renders it per request
// whatever a revalidate value would claim. Saying so here beats a number that does
// nothing.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get('locale');
  const locale: ContentLocale = requested === 'en' ? 'en' : 'ko';

  const [pois, facts] = await Promise.all([getPois(), getFacts()]);
  if (!pois.ok || !facts.ok) {
    return new Response('snapshot unavailable', { status: 503 });
  }

  const titles = Object.fromEntries(
    pois.data.map((poi) => [poi.slug, poi.i18n[locale]?.title ?? poi.i18n.ko?.title ?? poi.slug]),
  );
  const report = computeGapReport(
    facts.data as GapFact[],
    pois.data.map((poi) => poi.slug),
  );
  const csv = gapRowsToCsv(report.priorities, titles, locale);

  const name = 'modu-baekje-gap-report';
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${name}.csv"; filename*=UTF-8''${encodeURIComponent('무장애정보-갭리포트.csv')}`,
    },
  });
}
