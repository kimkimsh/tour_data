import { describe, expect, it } from 'vitest';
import {
  TRANSPORT_CODES,
  fetchAllPages,
  gatewayCallStats,
  isRetryable,
  isTransientStatus,
  ktoRequest,
} from './transport';

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

/**
 * The gateway counters and the paging walk, driven through a stubbed fetch.
 *
 * Both are read as safety gates rather than statistics: ingest refuses to publish when
 * `unreachable` is non-zero, and listBarrierFreeSync refuses to call a place
 * unregistered when `truncated` is set. A gate that cannot go red is the shape this
 * project treats as worse than no gate, so each case below drives the failure it names.
 */
describe('gateway counters and paging', () => {
  const ok = (items: unknown[], totalCount: number) =>
    new Response(
      JSON.stringify({
        response: {
          header: { resultCode: '0000', resultMsg: 'OK' },
          body: { items: { item: items }, totalCount, numOfRows: items.length, pageNo: 1 },
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const answered = (resultCode: string) =>
    new Response(
      JSON.stringify({ response: { header: { resultCode, resultMsg: 'test' }, body: {} } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  function withStubbedFetch<T>(reply: () => Response, run: () => Promise<T>): Promise<T> {
    const real = globalThis.fetch;
    const realKey = process.env.KTO_SERVICE_KEY_DECODING;
    process.env.KTO_SERVICE_KEY_DECODING = 'test-key';
    globalThis.fetch = (async () => reply()) as typeof fetch;
    return run().finally(() => {
      globalThis.fetch = real;
      if (realKey === undefined) delete process.env.KTO_SERVICE_KEY_DECODING;
      else process.env.KTO_SERVICE_KEY_DECODING = realKey;
    });
  }

  it('books a retry-exhausted transient result code as unreachable, not as contact', async () => {
    const before = gatewayCallStats();
    // 05 is SERVICETIMEOUT. It is an answer about the gateway, not about the data, and
    // counting it as contact let a stage publish an empty snapshot over a full one.
    await withStubbedFetch(
      () => answered('05'),
      () => ktoRequest('TestService', 'testOperation', {}, { maxAttempts: 1 }),
    );
    const after = gatewayCallStats();
    expect(after.unreachable - before.unreachable).toBe(1);
    expect(after.reached - before.reached).toBe(0);
  });

  it('books a substantive answer as contact even when it is unwelcome', async () => {
    const before = gatewayCallStats();
    // 03 is "no rows", 30 is "bad key". Both say something about the request, so a run
    // that got them is a run that may still decide what to publish.
    await withStubbedFetch(
      () => answered('30'),
      () => ktoRequest('TestService', 'testOperation', {}, { maxAttempts: 1 }),
    );
    const after = gatewayCallStats();
    expect(after.reached - before.reached).toBe(1);
    expect(after.unreachable - before.unreachable).toBe(0);
  });

  it('keeps retrying long enough for a batch job to outlast a bad answer', async () => {
    // The budget is the point, not the number, and it is for a gateway that answers
    // badly — a RETRYABLE_RESULT_CODES fault — rather than one that refuses the
    // connection. A refused connection is bound to the run's source address and no
    // number of redials inside that run reaches past it.
    let attempts = 0;
    const real = globalThis.fetch;
    const realKey = process.env.KTO_SERVICE_KEY_DECODING;
    process.env.KTO_SERVICE_KEY_DECODING = 'test-key';
    // Fails five times, answers on the sixth. Three attempts cannot reach it.
    globalThis.fetch = (async () => {
      attempts += 1;
      if (attempts < 6) throw new TypeError('fetch failed');
      return new Response(
        JSON.stringify({
          response: { header: { resultCode: '0000', resultMsg: 'OK' }, body: { items: { item: [] }, totalCount: 0 } },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    try {
      const result = await ktoRequest('TestService', 'testOperation', {}, { timeoutMs: 100 });
      expect(attempts).toBe(6);
      expect(result.ok).toBe(true);
    } finally {
      globalThis.fetch = real;
      if (realKey === undefined) delete process.env.KTO_SERVICE_KEY_DECODING;
      else process.env.KTO_SERVICE_KEY_DECODING = realKey;
    }
  }, 60_000);

  it('names what the fetch actually failed on, not the word fetch failed', async () => {
    // undici's TypeError carries the constant string "fetch failed" and puts the reason
    // on .cause. Logging the message alone produced two nights of a failing cron whose
    // log said "fetch failed — fetch failed" and named neither DNS, the connection, nor
    // the handshake.
    const withCause = () => {
      const error: Error & { cause?: unknown } = new TypeError('fetch failed');
      error.cause = Object.assign(new Error('getaddrinfo ENOTFOUND apis.data.go.kr'), {
        code: 'ENOTFOUND',
      });
      throw error;
    };
    const real = globalThis.fetch;
    const realKey = process.env.KTO_SERVICE_KEY_DECODING;
    process.env.KTO_SERVICE_KEY_DECODING = 'test-key';
    globalThis.fetch = withCause as unknown as typeof fetch;
    try {
      const result = await ktoRequest('TestService', 'testOperation', {}, { maxAttempts: 1 });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.message).toContain('ENOTFOUND');
      expect(result.message).toContain('apis.data.go.kr');
    } finally {
      globalThis.fetch = real;
      if (realKey === undefined) delete process.env.KTO_SERVICE_KEY_DECODING;
      else process.env.KTO_SERVICE_KEY_DECODING = realKey;
    }
  });

  it('books an unreadable body as unreachable whatever the status line said', async () => {
    const before = gatewayCallStats();
    // The gateway's own holding page, served with 200. The body sniffer reads it as an
    // XML fault envelope with no code in it, isRetryable declines to repeat a 200, and
    // booking that as contact let a stage publish a snapshot built from a page that
    // said nothing about the data.
    await withStubbedFetch(
      () => new Response('<html>Temporarily unavailable</html>', { status: 200 }),
      () => ktoRequest('TestService', 'testOperation', {}, { maxAttempts: 1 }),
    );
    const after = gatewayCallStats();
    expect(after.unreachable - before.unreachable).toBe(1);
    expect(after.reached - before.reached).toBe(0);
  });

  it('keeps the largest totalCount a page reported', async () => {
    // resultCode 03 answers with an empty body and totalCount 0. Taking the last page's
    // figure let that erase the first page's 500 and report the short walk complete.
    let page = 0;
    const result = await withStubbedFetch(
      () => (page++ === 0 ? ok([{ a: 1 }], 500) : ok([], 0)),
      () => fetchAllPages('TestService', 'testOperation', {}, { numOfRows: 1, maxAttempts: 1 }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalCount).toBe(500);
    expect(result.truncated).toBe(true);
  });

  it('reports a walk that ended short of totalCount as truncated', async () => {
    // The gateway claims 500 rows and serves an empty second page. Reading the result
    // as a complete list is how "not in the list" becomes "not registered".
    let page = 0;
    const result = await withStubbedFetch(
      () => (page++ === 0 ? ok([{ a: 1 }], 500) : ok([], 500)),
      () =>
        fetchAllPages('TestService', 'testOperation', {}, { numOfRows: 1, maxAttempts: 1 }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });

  it('reports a walk that covered totalCount as complete', async () => {
    const result = await withStubbedFetch(
      () => ok([{ a: 1 }, { a: 2 }], 2),
      () => fetchAllPages('TestService', 'testOperation', {}, { maxAttempts: 1 }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.truncated).toBe(false);
  });

  it('reports a walk stopped by the page cap as truncated', async () => {
    const result = await withStubbedFetch(
      () => ok([{ a: 1 }], 99),
      () =>
        fetchAllPages(
          'TestService',
          'testOperation',
          {},
          { numOfRows: 1, maxPages: 2, maxAttempts: 1 },
        ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });
});
