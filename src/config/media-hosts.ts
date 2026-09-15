/**
 * The hosts a browser is allowed to play audio from, and the hosts ingest will accept
 * an Odii audioUrl from. One list, two readers, on purpose.
 *
 * The docent player shipped for a week with no sound. Content-Security-Policy named
 * the two image hosts under media-src because that is where the pictures come from,
 * and Odii serves its guide audio from somewhere else entirely — a KT CDN bucket whose
 * name carries the tenant id. Every mp3 was refused before the request left the page,
 * and an <audio> element whose fetch the policy blocks fires no error the code can see,
 * so nothing anywhere said so.
 *
 * The bucket name is observed, not documented, and it can be reissued. That is the
 * reason ingest stops on a host outside this list instead of warning: a warning in a
 * nightly cron log reproduces exactly the silence this list exists to end.
 */
export const AUDIO_HOSTS = ['sfj608538-sfj608538.ktcdn.co.kr'] as const;
