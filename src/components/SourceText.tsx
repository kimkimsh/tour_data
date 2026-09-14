import { Fragment } from 'react';

/**
 * A source note with its addresses turned into links.
 *
 * These strings are written by hand in content/*.json and read like a citation —
 * "2023년 열린관광지 지정 · 한국관광공사 https://… · 선정 보도자료 https://… (2022-11-29)".
 * Printed as text the address is the longest thing on the line and the one part a
 * reader cannot use, because following it means retyping ninety characters.
 *
 * The visible text is the address itself rather than a label. A citation names what
 * it points at, and a note that already reads as prose has no spare noun to borrow.
 */
const URL_IN_TEXT = /(https?:\/\/[^\s)]+)/g;

export function SourceText({ children }: { children: string }) {
  const parts = children.split(URL_IN_TEXT);
  return (
    <>
      {parts.map((part, index) =>
        // startsWith, not URL_IN_TEXT.test: a /g regex carries lastIndex between calls,
        // so testing the same pattern in a loop answers differently on alternate parts.
        part.startsWith('http') ? (
          <Link key={index} raw={part} />
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const TRAILING_PUNCTUATION = /[.,;·)\]]+$/;

/** A trailing full stop or comma belongs to the sentence, not to the address. */
function Link({ raw }: { raw: string }) {
  const trailing = TRAILING_PUNCTUATION.exec(raw)?.[0] ?? '';
  const href = trailing === '' ? raw : raw.slice(0, -trailing.length);
  return (
    <>
      <a href={href} target="_blank" rel="noreferrer" className="break-all">
        {href}
      </a>
      {trailing}
    </>
  );
}
