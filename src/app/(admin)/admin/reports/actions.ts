'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { LOCALES } from '@/domain/types';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Hiding is the only moderation action, and it is after the fact: a report is
 * already public by the time an operator sees it.
 *
 * Authorisation is not checked here. The update policy on the table is what allows
 * or refuses it, so a caller who is not in admin_users gets zero rows changed even
 * if they reach this action directly.
 */
const HideInput = z.object({
  id: z.uuid(),
  hidden: z.boolean(),
  reason: z.string().max(120).nullable(),
});

export async function setReportHidden(raw: unknown): Promise<{ ok: boolean; message?: string }> {
  const parsed = HideInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: 'invalid' };

  const supabase = await createServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, message: 'no_session' };

  // .select() is what makes the refusal visible. Without it an update that the RLS
  // policy blocked returns no error and no rows, and the screen announces "hidden"
  // for a row that did not change.
  const { data, error } = await supabase
    .from('barrier_reports')
    .update({
      is_hidden: parsed.data.hidden,
      hidden_reason: parsed.data.hidden ? parsed.data.reason : null,
      hidden_by: parsed.data.hidden ? auth.user.id : null,
      hidden_at: parsed.data.hidden ? new Date().toISOString() : null,
    })
    .eq('id', parsed.data.id)
    .select('id');

  if (error) return { ok: false, message: error.message };
  if ((data ?? []).length === 0) return { ok: false, message: 'not_permitted' };

  // The place page renders its reports from the browser, but the cached layout
  // still holds counts, so both locales are dropped.
  for (const locale of LOCALES) revalidatePath(`/${locale}`, 'layout');
  revalidatePath('/admin/reports');
  return { ok: true };
}
