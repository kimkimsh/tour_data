/**
 * How far back a sighting may be dated.
 *
 * The bound lives here rather than inside the route because the form has to show it
 * too: an input whose `min` disagrees with the server turns a mistyped year into a
 * generic "could not post" the visitor has nothing to act on. One definition, two
 * consumers — the route handler that refuses, and the date input that never offers it.
 *
 * A year, because 현장 상황 제보 is about a condition somebody could still meet, and the
 * place page prints the sighting date next to the report where an older one reads as
 * current unless a reader checks it.
 */
export const REPORT_MAX_AGE_DAYS = 365;

const MS_PER_DAY = 86_400_000;

/**
 * The oldest sighting date the service accepts, given today's Korean calendar date.
 *
 * `today` is passed in rather than read here so the caller decides when it is
 * evaluated: the route recomputes it per request, and the form takes it from the same
 * seoulToday() its `max` uses, so the two ends of the range cannot disagree by a day.
 */
export function oldestReportableDate(today: string): string {
  return new Date(Date.parse(`${today}T00:00:00Z`) - REPORT_MAX_AGE_DAYS * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}
