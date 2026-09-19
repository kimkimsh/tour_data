'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Docent } from '@/domain/snapshot-schema';

/**
 * Audio plus a transcript that is always on the page.
 *
 * The controls are the browser's own. A hand-built player would have to reproduce
 * keyboard operation, the volume control and the seek bar, and every one of those is
 * something the platform already gets right for a screen reader.
 *
 * Nothing autoplays. Arriving on this screen is the intent to listen, not the act.
 */
export function DocentPlayer({ story, easyMode }: { story: Docent; easyMode: boolean }) {
  const t = useTranslations('docent');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /**
   * The transcript the device voice is currently reading, or null.
   *
   * The text rather than a boolean, so that switching to 쉬운 글 — which replaces the
   * transcript without remounting this component — makes `speaking` false by
   * derivation instead of leaving a stop button pointed at words nobody can see.
   */
  const [spokenText, setSpokenText] = useState<string | null>(null);

  const text = (easyMode ? story.easyScript : story.script) ?? story.script ?? '';
  const paragraphs = useMemo(
    () => text.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean),
    [text],
  );

  // Even split across the run time. The spec accepts the approximation; the
  // alternative is a per-sentence timing file that nobody produced.
  const captionsUrl = useMemo(() => {
    const body = paragraphs.length > 0 ? paragraphs : [''];
    // With a run time, split it evenly across paragraphs. Without one, emit a single
    // cue that spans the item: "this text applies throughout" is true, whereas
    // inventing per-paragraph timings would not be.
    const cues = story.playTimeS
      ? body.map((paragraph, index) => {
          const slice = story.playTimeS! / body.length;
          return `${index + 1}\n${vttTime(index * slice)} --> ${vttTime((index + 1) * slice)}\n${paragraph.replace(/\n/g, ' ')}\n`;
        })
      : [`1\n00:00:00.000 --> 99:59:59.000\n${body.join(' ').replace(/\n/g, ' ')}\n`];
    return `data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n${cues.join('\n')}`)}`;
  }, [paragraphs, story.playTimeS]);

  // Keyed on the text, not on mount. The 쉬운 글 switch replaces the transcript without
  // remounting this component, so a voice started on the original carried on reading it
  // while the screen showed the plain version and the button still offered to stop
  // something that no longer matched anything visible.
  // Keyed on the text, not on mount: a voice started on the original script kept
  // reading it after the switch to 쉬운 글 put different words on screen.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, [text]);

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || paragraphs.length === 0 || !audio.duration) return;
    setActiveIndex(
      Math.min(paragraphs.length - 1, Math.floor((audio.currentTime / audio.duration) * paragraphs.length)),
    );
  };

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(paragraphs.join('\n'));
    utterance.lang = story.locale === 'en' ? 'en-US' : 'ko-KR';
    utterance.onend = () => setSpokenText(null);
    // A voice that fails never fires onend, and without this the button stayed on
    // "stop" with nothing left to stop.
    utterance.onerror = () => setSpokenText(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpokenText(text);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpokenText(null);
  };

  const audioMissing = story.audioUrl === null;
  const speaking = spokenText === text;
  // The switch is one control over a whole page of stories, and only some of them have
  // a plain-language version. Falling back without saying so made the switch assert
  // that every story on screen had one.
  const easyMissing = easyMode && story.easyScript === null;

  return (
    <div className="grid gap-5">
      {audioMissing ? (
        <p className="blank-slot">{t('noAudio')}</p>
      ) : failed ? (
        <div className="blank-slot grid gap-2">
          <p className="font-bold">{t('audioFailed')}</p>
          <p className="t-sm">{t('audioFailedHint')}</p>
        </div>
      ) : (
        <audio
          ref={audioRef}
          src={story.audioUrl ?? undefined}
          controls
          preload="none"
          className="w-full"
          onError={() => setFailed(true)}
          onTimeUpdate={onTimeUpdate}
        >
          {/* Chrome renders no caption surface for <audio>, so this track is not what
              delivers the words — the transcript below is, and it is always visible and
              tracks the playhead. The track stays because it is valid, costs nothing,
              and some players do expose it. */}
          <track
            kind="captions"
            src={captionsUrl}
            srcLang={story.locale}
            label={t('script')}
            default
          />
        </audio>
      )}

      {audioMissing || failed ? (
        <p className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn" onClick={speaking ? stopSpeaking : speak}>
            {speaking ? t('stopSpeak') : t('speak')}
          </button>
          {/* Real DOM text, not a CSS pseudo-element: a synthesised voice has to be
              declared where a screen reader will read it. The visible word is the short
              form and the sentence after it is the whole statement, which is why the
              longer text is a sibling rather than an aria-label — an aria-label would
              replace what is on screen instead of extending it. */}
          <span className="rounded-full border border-[var(--color-rule-strong)] px-3 py-1 t-xs">
            {t('ttsBadge')}
            <span className="sr-only"> — {t('ttsBadgeLabel')}</span>
          </span>
        </p>
      ) : null}

      {/* Not a <details>. The transcript is the accessible equivalent of the audio, and
          a disclosure lets it be collapsed out of the accessibility tree entirely —
          which removes the only form of this content that a deaf visitor can use. */}
      {/* h3, under the story's own h2, so the heading list a screen reader offers says
          which story each 대본 belongs to. A div, not a section: `section` with an accessible name is a `region`
          `section` with an accessible name is a `region` landmark, and a dozen stories
          published a dozen landmarks all named 대본 — a landmark list that cannot tell
          its entries apart is worse than no landmark. */}
      <div className="card">
        <h3 className="subhead">{t('script')}</h3>
        {easyMissing ? <p className="mt-2 t-sm text-[var(--color-ink-2)]">{t('easyMissing')}</p> : null}
        <div className="mt-3 grid gap-3">
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 12)}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              className={
                index === activeIndex
                  ? 'border-l-4 border-[var(--color-gilt)] pl-3 font-medium'
                  : 'border-l-4 border-transparent pl-3'
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <p className="evidence__provenance">{t('source')}</p>
    </div>
  );
}

function vttTime(seconds: number): string {
  const whole = Math.floor(seconds);
  const ms = Math.round((seconds - whole) * 1000);
  const h = String(Math.floor(whole / 3600)).padStart(2, '0');
  const m = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const s = String(whole % 60).padStart(2, '0');
  return `${h}:${m}:${s}.${String(ms).padStart(3, '0')}`;
}
