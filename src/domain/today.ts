/**
 * Today in Asia/Seoul, as YYYY-MM-DD.
 *
 * Every date this service writes or compares is a Korean calendar date: the visitor
 * is standing in Gongju or Buyeo, the report form promises one report per day and
 * barrier_reports.created_day is generated `at time zone 'Asia/Seoul'`. The build
 * and the collector run on Vercel and GitHub Actions, both UTC, and a browser
 * carries whatever zone the device is set to.
 *
 * `new Date().toISOString().slice(0, 10)` is the expression this replaces. It is
 * UTC, so between 00:00 and 09:00 KST it names yesterday — which shifts a freshness
 * bucket boundary, dates a trip record a day early, and stamps a curated fact with
 * a check date that never happened.
 *
 * en-CA because it is the locale whose short date format is YYYY-MM-DD.
 */
export function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}
