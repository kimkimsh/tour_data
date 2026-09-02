import itinerariesRaw from '../../content/itineraries.json';
import safetyRaw from '../../content/safety-directory.json';
import { ItinerariesInput, SafetyDirectoryInput } from '@/domain/content-schema';

/**
 * Two content files are imported rather than read from a snapshot, because they
 * never change between ingest runs: the course templates and the emergency
 * numbers. Parsed once at module load — if either file is malformed the app
 * should refuse to start rather than render a course with no stops or a phone
 * button that dials nothing.
 */
export const itineraries = ItinerariesInput.parse(itinerariesRaw);
export const safetyDirectory = SafetyDirectoryInput.parse(safetyRaw);

export function safetyForCity(cityKo: string | null) {
  return safetyDirectory.filter((c) => c.cityKo === null || c.cityKo === cityKo);
}
