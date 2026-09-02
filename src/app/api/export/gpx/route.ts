import { z } from 'zod';

import { toGpx } from '@/domain/gpx';
import { diaryCoords } from '@/domain/diary';
import { PERSONA_IDS, type DiaryEntry } from '@/domain/types';

/**
 * The trip record as a GPX 1.1 file.
 *
 * The record arrives in the request body because it lives in the visitor's browser
 * and is never stored on a server (docs/spec/07_screens.md S9 rule 1). Nothing here
 * reads a cookie or a session: the body is the whole input.
 */
export const dynamic = 'force-dynamic';

/** Caps that bound the response. Six places exist today; the rest is headroom. */
const MAX_PLACES = 20;
const MAX_STEPS_PER_PLACE = 100;
const MAX_COORDS_PER_PLACE = 200;
const MAX_TITLE_LENGTH = 200;
const MAX_NOTE_LENGTH = 4000;

const FILE_STEM_ASCII = 'trip-record';
/** The name docs/spec/08_accessibility_legal.md section 1.1 gives this file. */
const FILE_STEM_KO = '여행기록';

/**
 * Same two origins as the S5 route export, and worded the same way: the place
 * coordinate comes from the KTO API, the step coordinates were written here. A GPX
 * file leaves the app, so it has to carry that inside it.
 */
const GPX_ATTRIBUTION = '출처: 한국관광공사 TourAPI · 경로 단계는 모두의 백제 작성';

const Body = z.object({
  schemaVersion: z.literal(1),
  date: z.iso.date(),
  personaIds: z.array(z.enum(PERSONA_IDS)),
  cognitiveOption: z.boolean(),
  places: z
    .array(
      z.object({
        poiSlug: z.string().min(1),
        title: z.string().min(1).max(MAX_TITLE_LENGTH),
        visited: z.boolean(),
        steps: z
          .array(
            z.object({
              seq: z.number(),
              title: z.string().max(MAX_TITLE_LENGTH),
              done: z.boolean(),
            }),
          )
          .max(MAX_STEPS_PER_PLACE),
        memo: z.string().max(MAX_NOTE_LENGTH),
        accessibilityNote: z.string().max(MAX_NOTE_LENGTH),
        coords: z
          .array(
            z.object({
              lat: z.number(),
              lng: z.number(),
              name: z.string().max(MAX_TITLE_LENGTH),
            }),
          )
          .max(MAX_COORDS_PER_PLACE),
      }),
    )
    .max(MAX_PLACES),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response(z.prettifyError(parsed.error), {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // Typed, so the compiler is what checks the request schema against the contract.
  const entry: DiaryEntry = parsed.data;
  const gpx = toGpx(diaryCoords(entry), {
    name: `${FILE_STEM_KO} ${entry.date}`,
    attribution: GPX_ATTRIBUTION,
  });

  const asciiName = `${FILE_STEM_ASCII}-${entry.date}.gpx`;
  const koreanName = `${FILE_STEM_KO}-${entry.date}.gpx`;
  return new Response(gpx, {
    headers: {
      'content-type': 'application/gpx+xml',
      // Some browsers mangle a non-ASCII filename, so both forms are sent: the
      // quoted one is the fallback, filename* is the one that survives.
      'content-disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(koreanName)}`,
      'cache-control': 'no-store',
    },
  });
}
