'use client';

import { Dialog } from 'radix-ui';
import { useLocale, useTranslations } from 'next-intl';
import type { SafetyContact } from '@/domain/content-schema';

/**
 * Fixed on every screen, in the same place, because a person who needs it is not
 * going to go looking. Radix Dialog rather than a hand-rolled sheet: the focus
 * trap, Escape, and returning focus to the trigger are exactly what gets written
 * wrong by hand.
 *
 * The sheet itself carries no coloured border. Elevation and the corner radius
 * separate it from the page; the red rule sits under the title, where it marks what
 * the sheet is for instead of outlining the box it arrived in.
 */
export function EmergencyContacts({ contacts }: { contacts: SafetyContact[] }) {
  const t = useTranslations('common.emergency');
  const tc = useTranslations('common');
  const locale = useLocale();

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="no-print fixed bottom-4 right-4 z-40 inline-flex min-h-[48px] items-center gap-2 rounded-full border-2 border-[var(--color-state-bad)] bg-[var(--color-paper)] px-4 font-bold text-[var(--color-state-bad)] shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
        >
          <span aria-hidden="true">☎</span>
          {t('trigger')}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-lg bg-[var(--color-paper)] p-5 shadow-[0_-2px_16px_rgba(0,0,0,0.22)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(30rem,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-[var(--color-rule-strong)] sm:shadow-[0_8px_32px_rgba(0,0,0,0.28)]">
          {/* The state lives under the title, not around the frame. A coloured border on
              a rounded sheet steps at every corner where its width changes, and it says
              "urgent" about the container rather than about the thing being named. */}
          <Dialog.Title className="border-b-2 border-[var(--color-state-bad)] pb-2">
            {t('title')}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[0.95rem] text-[var(--color-ink-2)]">
            {t('hint')}
          </Dialog.Description>

          <ul className="mt-4 grid gap-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <a
                  href={`tel:${contact.tel.replace(/[^+\d]/g, '')}`}
                  className="btn btn--filled w-full !justify-between !text-left"
                >
                  <span>{locale === 'ko' ? contact.labelKo : contact.labelEn}</span>
                  <span className="font-mono tabular">{contact.tel}</span>
                </a>
                {contact.note ? (
                  <p lang="ko" className="mt-1 text-[0.88rem] text-[var(--color-ink-2)]">
                    {contact.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <Dialog.Close asChild>
            <button type="button" className="btn mt-5 w-full">
              {tc('close')}
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
