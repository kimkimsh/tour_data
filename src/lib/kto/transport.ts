/**
 * The single door to apis.data.go.kr/B551011 for this project. Every failure mode the
 * KTO manuals call out lives here rather than in the callers:
 *
 *   - the DECODING key is set raw and encoded exactly once by URLSearchParams
 *     (docs/spec/03_external_data.md 1.3 — an Encoding key becomes %252B and the
 *      gateway answers resultCode 30, which reads like a wrong key and is not one)
 *   - the body is read as text before any JSON.parse, because the manual documents the
 *     error envelope as XML even under _type=json (same doc, 1.4). Observed on
 *     2026-09-02 it can also arrive as JSON carrying the same cmmMsgHeader fields, so
 *     both forms are read; either way the code is `returnReasonCode`, not `resultCode`
 *   - result codes decide retry vs abort, and 03 is a success with zero rows (1.5)
 *
 * API-level failures are returned, never thrown: a probe run has to record
 * "resultCode=30 on the third POI" and carry on to the next check. A missing service
 * key is the one exception — that is a configuration bug and every later call would
 * report the same thing.
 *
 * Nothing here logs. Callers put `describeCall()` or `redactSecrets()` output in their
 * own messages; a full URL must never reach stdout because the key sits in it.
 */

const GATEWAY_BASE = 'https://apis.data.go.kr';

/**
 * The organisation segment of the path. Every provider on this gateway gets one, and
 * everything below it — the key parameter, the resultCode envelope, the XML-or-JSON
 * ambiguity, the retry rules — behaves identically, which is why one transport serves
 * both.
 */
export const ORG = {
  /** 한국관광공사 */
  kto: 'B551011',
  /** 기상청 */
  kma: '1360000',
} as const;

export type OrgCode = (typeof ORG)[keyof typeof ORG];

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 700;
const MAX_RAW_BODY_CHARS = 2_000;

/** What the spec's paging examples use. DataLabService overrides it with 1000. */
export const DEFAULT_PAGE_SIZE = 100;
/**
 * Ceiling on a fetchAllPages() walk. 100 pages covers the largest totalCount any
 * manual quotes (areaBasedSyncList2, 8,852 rows -> 89 pages at 100 per page) and stops
 * a misread totalCount from turning into an unbounded call loop against a quota of
 * 1,000 calls per operation per day.
 */
export const DEFAULT_MAX_PAGES = 100;

/** The manual spells success both ways. Any all-zero spelling is the same fact. */
export const SUCCESS_RESULT_CODES = ['0000', '00'] as const;
/** Not a failure: the query was valid and matched nothing. Callers get an empty item list. */
export const NO_DATA_RESULT_CODE = '03';
/** Transient. Retried with exponential backoff. docs/spec/03_external_data.md 1.5 */
export const RETRYABLE_RESULT_CODES = ['02', '04', '05', '21', '99'] as const;
/** Caller bugs and key problems. Retrying cannot change the answer. */
export const FATAL_RESULT_CODES = ['10', '11', '12', '20', '30', '31', '32', '33'] as const;
/** Daily traffic ceiling. The step aborts and publishes nothing; the next run retries. */
export const QUOTA_RESULT_CODE = '22';

/**
 * resultCode values this module invents for failures that never reached a KTO
 * response header. Prefixed so they cannot collide with the gateway's numeric codes.
 */
export const TRANSPORT_CODES = {
  network: 'transport/network',
  timeout: 'transport/timeout',
  http: 'transport/http',
  json: 'transport/json',
  xmlBody: 'transport/xml-body',
} as const;

export type KtoParamValue = string | number | undefined;
/** undefined values are dropped, so a caller can pass an optional filter inline. */
export type KtoParams = Readonly<Record<string, KtoParamValue>>;

export interface KtoOk<T = unknown> {
  ok: true;
  /** The header code that arrived, so a report can print 0000 and 03 alike. */
  resultCode: string;
  items: T[];
  totalCount: number;
  numOfRows: number;
  pageNo: number;
  /** Whole decoded envelope, so a probe can report a field no schema names yet. */
  raw: unknown;
}

export interface KtoFail {
  ok: false;
  /** A KTO resultCode / returnReasonCode, or one of TRANSPORT_CODES. */
  resultCode: string;
  message: string;
  httpStatus: number | null;
  /** Response body, redacted and truncated. Safe to print. */
  rawBody: string;
}

export type KtoResult<T = unknown> = KtoOk<T> | KtoFail;

export interface KtoPagesOk<T = unknown> {
  ok: true;
  items: T[];
  totalCount: number;
  pagesFetched: number;
  /** true when maxPages stopped the walk before totalCount was reached. */
  truncated: boolean;
}

export type KtoPagesResult<T = unknown> = KtoPagesOk<T> | KtoFail;

export interface KtoRequestOptions {
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface KtoPagingOptions extends KtoRequestOptions {
  numOfRows?: number;
  maxPages?: number;
}

/**
 * Lets a script state "the key is missing" and exit before any call, without naming the
 * environment variable a second time.
 */
export function hasServiceKey(): boolean {
  const key = process.env.KTO_SERVICE_KEY_DECODING;
  return key !== undefined && key.trim() !== '';
}

export const SERVICE_KEY_ENV_NAME = 'KTO_SERVICE_KEY_DECODING';

function requireServiceKey(): string {
  const key = process.env.KTO_SERVICE_KEY_DECODING;
  if (key === undefined || key.trim() === '') {
    throw new Error(
      `${SERVICE_KEY_ENV_NAME} is not set. Use the "일반 인증키(Decoding)" value — the Encoding key gets encoded twice and the gateway answers resultCode 30.`,
    );
  }
  return key;
}

/**
 * Removes the service key from anything about to be printed or written to a file.
 * Two passes on purpose: the query-string pattern catches a URL that slipped through a
 * third-party error message, the literal replacement catches the key on its own.
 */
export function redactSecrets(text: string): string {
  let out = text.replace(/([sS]erviceKey)=[^&\s"'<]*/g, '$1=***');
  const key = process.env.KTO_SERVICE_KEY_DECODING;
  if (key !== undefined && key.length > 0) {
    out = out.split(key).join('***');
    out = out.split(encodeURIComponent(key)).join('***');
  }
  return out;
}

/** Identifies a call in an error message. Carries the caller's parameters, never the key. */
export function describeCall(serviceId: string, operation: string, params: KtoParams): string {
  const shown = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => `${name}=${String(value)}`)
    .join('&');
  return shown === '' ? `${serviceId}/${operation}` : `${serviceId}/${operation}?${shown}`;
}

export function isSuccessResultCode(code: string): boolean {
  return /^0+$/.test(code.trim());
}

export function isQuotaExceeded(result: KtoResult | KtoPagesResult): boolean {
  return !result.ok && result.resultCode === QUOTA_RESULT_CODE;
}

/** '12' means the operation itself is gone. A person has to decide, so it never retries. */
export function isOperationRetired(result: KtoResult | KtoPagesResult): boolean {
  return !result.ok && result.resultCode === '12';
}

/**
 * The three shapes items arrives in: an array, a bare object when there is exactly one
 * row, and the empty string when there are none. docs/spec/03_external_data.md 1.4.
 */
export function normalizeItems(itemsNode: unknown): unknown[] {
  if (typeof itemsNode === 'string') return [];
  const container = asRecord(itemsNode);
  if (container === null) return [];
  const item = container.item;
  if (item === undefined || item === null || typeof item === 'string') return [];
  return Array.isArray(item) ? item : [item];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toCount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildUrl(
  org: OrgCode,
  serviceId: string,
  operation: string,
  params: KtoParams,
): string {
  const search = new URLSearchParams();
  // Raw, not pre-encoded: URLSearchParams encodes exactly once. See the file header.
  search.set('serviceKey', requireServiceKey());
  if (org === ORG.kto) {
    // KTO-only. The gateway drops unknown parameters silently rather than rejecting
    // them, so sending these to another provider would not error — it would just be
    // noise in a URL that already has to be read in a log.
    search.set('MobileOS', 'ETC');
    search.set('MobileApp', 'ModuBaekje');
    search.set('_type', 'json');
  } else {
    // Same request, different provider's spelling for it.
    search.set('dataType', 'JSON');
  }
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(name, String(value));
  }
  return `${GATEWAY_BASE}/${org}/${serviceId}/${operation}?${search.toString()}`;
}

function clipBody(body: string): string {
  const safe = redactSecrets(body);
  return safe.length <= MAX_RAW_BODY_CHARS
    ? safe
    : `${safe.slice(0, MAX_RAW_BODY_CHARS)}… (${safe.length} chars)`;
}

function xmlTag(body: string, tag: string): string | null {
  const found = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(body);
  const inner = found?.[1];
  if (inner === undefined) return null;
  const unwrapped = inner.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
  return unwrapped.trim();
}

/**
 * The error envelope names its code `returnReasonCode`, not `resultCode` — reading the
 * wrong name yields undefined and the failure gets reported as "unknown".
 */
function failFromXml(body: string, httpStatus: number, call: string): KtoFail {
  const reasonCode = xmlTag(body, 'returnReasonCode');
  const authMsg = xmlTag(body, 'returnAuthMsg');
  const errMsg = xmlTag(body, 'errMsg');
  const envelopeCode = xmlTag(body, 'resultCode');
  const envelopeMsg = xmlTag(body, 'resultMsg');

  const code = reasonCode ?? envelopeCode ?? TRANSPORT_CODES.xmlBody;
  const parts = [errMsg, authMsg, envelopeMsg].filter((part): part is string => part !== null);
  // An XML body whose own code says success is still a failure to us: this module carries
  // no XML parser, so there are no rows to hand back and saying "0 rows" would be a lie.
  const note =
    envelopeCode !== null && reasonCode === null && isSuccessResultCode(envelopeCode)
      ? 'XML success envelope, but _type=json was requested and no XML parser is carried'
      : 'XML error envelope';
  return {
    ok: false,
    resultCode: code,
    message: `${call}: ${note}${parts.length > 0 ? ` — ${parts.join(' / ')}` : ''}`,
    httpStatus,
    rawBody: clipBody(body),
  };
}

/**
 * The gateway's own fault envelope, as opposed to a service's response header. It names its
 * code `returnReasonCode`; reading `resultCode` here finds nothing and a double-encoded key
 * (code 30) then gets reported as "malformed body", which sends the reader looking for a
 * parsing bug instead of at their .env.local.
 *
 * Returns null when the body is a normal service response.
 */
function faultFromJson(decoded: unknown, httpStatus: number, call: string, body: string): KtoFail | null {
  const root = asRecord(decoded);
  if (root === null) return null;
  const envelope = asRecord(root.OpenAPI_ServiceResponse) ?? root;
  const header = asRecord(envelope.cmmMsgHeader);
  if (header === null) return null;
  const code = String(header.returnReasonCode ?? '').trim();
  const parts = [header.errMsg, header.returnAuthMsg]
    .map((part) => String(part ?? '').trim())
    .filter((part) => part !== '');
  return {
    ok: false,
    resultCode: code === '' ? TRANSPORT_CODES.json : code,
    message: `${call}: gateway fault envelope${parts.length > 0 ? ` — ${parts.join(' / ')}` : ''}`,
    httpStatus,
    rawBody: clipBody(body),
  };
}

function isRetryable(failure: KtoFail): boolean {
  const code = failure.resultCode;
  if ((RETRYABLE_RESULT_CODES as readonly string[]).includes(code)) return true;
  if (code === TRANSPORT_CODES.network || code === TRANSPORT_CODES.timeout) return true;
  // A gateway 5xx or a 429 is the same transient class as resultCode 04. Any other status
  // is a caller mistake and repeating it just spends quota.
  if (code === TRANSPORT_CODES.http) {
    return failure.httpStatus === 429 || (failure.httpStatus ?? 0) >= 500;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function attemptOnce(
  org: OrgCode,
  serviceId: string,
  operation: string,
  params: KtoParams,
  timeoutMs: number,
  call: string,
): Promise<KtoResult> {
  let response: Response;
  let body: string;
  try {
    // There is no default fetch timeout. Without this an unresponsive gateway hangs the
    // whole ingest run instead of failing one call.
    response = await fetch(buildUrl(org, serviceId, operation, params), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
    body = await response.text();
  } catch (cause) {
    const name = cause instanceof Error ? cause.name : '';
    const detail = redactSecrets(cause instanceof Error ? cause.message : String(cause));
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    return {
      ok: false,
      resultCode: timedOut ? TRANSPORT_CODES.timeout : TRANSPORT_CODES.network,
      message: `${call}: ${timedOut ? `no response within ${timeoutMs}ms` : `fetch failed — ${detail}`}`,
      httpStatus: null,
      rawBody: '',
    };
  }

  // String first. An error is XML even when _type=json asked for JSON.
  if (body.trimStart().startsWith('<')) {
    return failFromXml(body, response.status, call);
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(body);
  } catch {
    return {
      ok: false,
      resultCode: response.ok ? TRANSPORT_CODES.json : TRANSPORT_CODES.http,
      message: `${call}: body is neither XML nor JSON (HTTP ${response.status})`,
      httpStatus: response.status,
      rawBody: clipBody(body),
    };
  }

  const fault = faultFromJson(decoded, response.status, call, body);
  if (fault !== null) return fault;

  const envelope = asRecord(asRecord(decoded)?.response);
  const header = asRecord(envelope?.header);
  const bodyNode = asRecord(envelope?.body);
  const resultCode = String(header?.resultCode ?? '').trim();
  const resultMsg = String(header?.resultMsg ?? '').trim();

  if (resultCode === '') {
    return {
      ok: false,
      resultCode: response.ok ? TRANSPORT_CODES.json : TRANSPORT_CODES.http,
      message: `${call}: JSON without response.header.resultCode (HTTP ${response.status})`,
      httpStatus: response.status,
      rawBody: clipBody(body),
    };
  }

  const pageNo = toCount(bodyNode?.pageNo);
  const numOfRows = toCount(bodyNode?.numOfRows);

  if (resultCode === NO_DATA_RESULT_CODE) {
    return {
      ok: true,
      resultCode,
      items: [],
      totalCount: toCount(bodyNode?.totalCount),
      numOfRows,
      pageNo,
      raw: decoded,
    };
  }

  if (!isSuccessResultCode(resultCode)) {
    return {
      ok: false,
      resultCode,
      message: `${call}: resultCode=${resultCode}${resultMsg === '' ? '' : ` ${resultMsg}`}`,
      httpStatus: response.status,
      rawBody: clipBody(body),
    };
  }

  return {
    ok: true,
    resultCode,
    items: normalizeItems(bodyNode?.items),
    totalCount: toCount(bodyNode?.totalCount),
    numOfRows,
    pageNo,
    raw: decoded,
  };
}

/**
 * One call, with retries for the transient result codes only. Throws solely when the
 * service key is unset.
 */
export async function ktoRequest(
  serviceId: string,
  operation: string,
  params: KtoParams = {},
  options: KtoRequestOptions = {},
): Promise<KtoResult> {
  return gatewayRequest(ORG.kto, serviceId, operation, params, options);
}

/** Same gateway, another provider's organisation segment. See ORG. */
export async function gatewayRequest(
  org: OrgCode,
  serviceId: string,
  operation: string,
  params: KtoParams = {},
  options: KtoRequestOptions = {},
): Promise<KtoResult> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? MAX_ATTEMPTS);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const call = describeCall(serviceId, operation, params);

  let failure: KtoFail = {
    ok: false,
    resultCode: TRANSPORT_CODES.network,
    message: `${call}: no attempt was made`,
    httpStatus: null,
    rawBody: '',
  };
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await attemptOnce(org, serviceId, operation, params, timeoutMs, call);
    if (result.ok) return result;
    if (!isRetryable(result)) return result;
    failure = result;
    if (attempt < maxAttempts) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  return { ...failure, message: `${failure.message} (gave up after ${maxAttempts} attempts)` };
}

/**
 * Walks pageNo until totalCount is covered, capped by maxPages.
 *
 * Three operations default to numOfRows=10 and the spec names each place where the first
 * page silently omits our POIs — tatsCnctrRateList (30 rows per tourist site),
 * TarRlteTarService1 area lists (totalCount 800) and Odii themeBasedList (1,504). Reading
 * only page one there reports "no data" for data that exists, which is the worst failure
 * this project can have.
 */
export async function fetchAllPages(
  serviceId: string,
  operation: string,
  params: KtoParams = {},
  options: KtoPagingOptions = {},
): Promise<KtoPagesResult> {
  const numOfRows = options.numOfRows ?? DEFAULT_PAGE_SIZE;
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES);
  const items: unknown[] = [];
  let totalCount = 0;
  let pagesFetched = 0;
  let truncated = false;

  for (let pageNo = 1; ; pageNo += 1) {
    if (pageNo > maxPages) {
      truncated = items.length < totalCount;
      break;
    }
    const page = await ktoRequest(serviceId, operation, { ...params, numOfRows, pageNo }, options);
    if (!page.ok) return page;
    pagesFetched = pageNo;
    totalCount = page.totalCount;
    items.push(...page.items);
    // An empty page ends the walk whatever totalCount claims: the alternative is looping
    // to the cap against an operation that reports a count it will not serve.
    if (page.items.length === 0 || items.length >= totalCount) break;
  }

  return { ok: true, items, totalCount, pagesFetched, truncated };
}
