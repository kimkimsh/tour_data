import { describe, expect, it } from 'vitest';
import { TRANSPORT_CODES, isRetryable, isTransientStatus } from './transport';

/**
 * The classifier the retry loop and the reached/unreachable counters both run on.
 *
 * The counters decide whether an ingest run is allowed to publish at all: a run that
 * never reached the gateway must write nothing, because "we asked and were told
 * nothing is there" and "we never got an answer" are the same empty payload otherwise.
 * The case below is the one that slipped through — the gateway's own HTML error page
 * begins with '<', so the body was read as a fault envelope before anything looked at
 * the status, and a 503 was booked as contact.
 */
describe('isRetryable', () => {
  const fail = (resultCode: string, httpStatus: number | null) => ({
    ok: false as const,
    resultCode,
    message: 'test',
    httpStatus,
    rawBody: '',
  });

  it('retries a gateway error page whatever shape its body took', () => {
    for (const code of [TRANSPORT_CODES.xmlBody, TRANSPORT_CODES.json, TRANSPORT_CODES.http]) {
      expect(isRetryable(fail(code, 503)), `${code} 503`).toBe(true);
      expect(isRetryable(fail(code, 429)), `${code} 429`).toBe(true);
    }
  });

  it('does not retry a 4xx the caller caused', () => {
    expect(isRetryable(fail(TRANSPORT_CODES.http, 400))).toBe(false);
    expect(isRetryable(fail(TRANSPORT_CODES.xmlBody, 404))).toBe(false);
  });

  it('leaves an upstream verdict alone whatever the status was', () => {
    // 30 is "unregistered service key". Repeating it three times spends quota and
    // changes nothing.
    expect(isRetryable(fail('30', 500))).toBe(false);
    expect(isRetryable(fail('03', 200))).toBe(false);
  });

  it('retries the result codes KTO itself marks transient', () => {
    expect(isRetryable(fail('04', 200))).toBe(true);
    expect(isRetryable(fail(TRANSPORT_CODES.network, null))).toBe(true);
    expect(isRetryable(fail(TRANSPORT_CODES.timeout, null))).toBe(true);
  });
});

describe('isTransientStatus', () => {
  it('is true for 429 and every 5xx, false otherwise', () => {
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(500)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(400)).toBe(false);
    expect(isTransientStatus(200)).toBe(false);
    expect(isTransientStatus(null)).toBe(false);
  });
});
