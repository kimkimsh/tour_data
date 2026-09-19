/**
 * A word boundary that exists only for speech.
 *
 * Wherever two values sit side by side separated by flex or grid `gap`, by a margin,
 * or by being stacked blocks, the space between them is drawn by CSS and is not in
 * the document text. Accessible-name computation and a screen reader's line building
 * both concatenate the text they find, so the two values arrive as one word:
 * 「방문 가능」 next to 「휠체어 이용 기준」 is spoken as 「방문 가능휠체어 이용 기준」.
 *
 * Measured with NVDA 2026.2 and Chrome, reading the same row five ways:
 *
 *   nothing between            방문 가능휠체어 이용 기준
 *   {' '} between the two      방문 가능휠체어 이용 기준
 *   .sr-only holding a space   방문 가능휠체어 이용 기준
 *   .sr-only holding U+00A0    방문 가능\xa0휠체어 이용 기준
 *   .sr-only holding a comma   방문 가능,휠체어 이용 기준
 *
 * So an ordinary space cannot fix this in any of its three forms — Chrome leaves
 * whitespace-only text nodes out of the accessibility tree, and a written {' '} goes
 * with them. Only a non-breaking space or a punctuation mark survives.
 *
 * The comma is chosen over U+00A0 because the pause carries the meaning: these are
 * two separate facts, and 「방문 가능 휠체어 이용 기준」 read as one breath is a
 * noun phrase — the same ambiguity, only quieter. In NVDA's Korean symbol table the
 * comma is level `most` with `preserve always`, and the default level is `some`, so
 * it reaches the synthesiser as a pause and is not spoken as a word. A reader who
 * has raised their symbol level hears 「콤마」, which is the cost.
 *
 * .sr-only is position:absolute, so this is out of flow: it never becomes a flex or
 * grid item and the row it sits in does not move.
 */
export function SpokenGap() {
  return <span className="sr-only">, </span>;
}
