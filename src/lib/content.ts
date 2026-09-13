import itinerariesRaw from '../../content/itineraries.json';
import safetyRaw from '../../content/safety-directory.json';
import poisRaw from '../../content/pois.json';
import { ItinerariesInput, PoisInput, SafetyDirectoryInput } from '@/domain/content-schema';

/**
 * Two content files are imported rather than read from a snapshot, because they
 * never change between ingest runs: the course templates and the emergency
 * numbers. Parsed once at module load — if either file is malformed the app
 * should refuse to start rather than render a course with no stops or a phone
 * button that dials nothing.
 */
export const itineraries = ItinerariesInput.parse(itinerariesRaw);
export const safetyDirectory = SafetyDirectoryInput.parse(safetyRaw);

/**
 * The places this service covers, as a set of slugs.
 *
 * Taken from the curated file rather than the snapshot so it is available without a
 * database round trip, and so a request cannot be admitted for a place that exists
 * in a stale snapshot but not in the catalogue. Writes that accept an arbitrary slug
 * land rows no screen can reach: the report form offers six places, the place pages
 * read six slugs, and a row filed under anything else is invisible to every reader
 * while still counting against the operator's queue.
 */
export const POI_SLUGS: ReadonlySet<string> = new Set(
  PoisInput.parse(poisRaw).map((poi) => poi.slug),
);

export function safetyForCity(cityKo: string | null) {
  return safetyDirectory.filter((c) => c.cityKo === null || c.cityKo === cityKo);
}
