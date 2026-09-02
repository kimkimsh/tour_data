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
export const revalidate = 3600;

export async function GET(request: Request) {
  const locale = (new URL(request.url).searchParams.get('locale') ?? 'ko') as ContentLocale;

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
  const csv = gapRowsToCsv(report.priorities, titles);

  const name = 'modu-baekje-gap-report';
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${name}.csv"; filename*=UTF-8''${encodeURIComponent('무장애정보-갭리포트.csv')}`,
    },
  });
}
