import { describe, expect, it } from 'vitest';
import { BARRIER_FREE_FIELD_NAMES } from './schemas';
import { CAPABILITIES, KTO_PROSE_FIELDS } from '@/domain/capabilities';

/**
 * The 28 barrier-free wire keys are written down twice: once as the response schema
 * and once as the capability catalogue plus the prose fields. A misspelling in
 * either copy would not fail anything — the field would simply stay empty for ever,
 * on a screen whose whole purpose is to say whether a field is empty.
 *
 * This is the mirror comparison that makes that drift a red test.
 */
describe('barrier-free field names', () => {
  const fromCatalogue = [
    ...CAPABILITIES.map((capability) => capability.ktoField).filter(
      (field): field is string => field !== null,
    ),
    ...KTO_PROSE_FIELDS,
  ];

  it('the schema and the catalogue name the same 28 fields', () => {
    expect([...BARRIER_FREE_FIELD_NAMES].sort()).toEqual([...fromCatalogue].sort());
  });

  it('there are 23 scored fields and 5 prose ones', () => {
    expect(CAPABILITIES.filter((c) => c.ktoField !== null)).toHaveLength(23);
    // publictransport moved here from the catalogue: its values are directions, not a
    // state, so no capability row could answer from them.
    expect(KTO_PROSE_FIELDS).toHaveLength(5);
    expect(BARRIER_FREE_FIELD_NAMES).toHaveLength(28);
  });

  it('keeps the single-l spellings the manual actually uses', () => {
    expect(BARRIER_FREE_FIELD_NAMES).toContain('braileblock');
    expect(BARRIER_FREE_FIELD_NAMES).toContain('brailepromotion');
    expect(BARRIER_FREE_FIELD_NAMES).not.toContain('brailleblock');
    expect(BARRIER_FREE_FIELD_NAMES).not.toContain('braillepromotion');
  });
});
