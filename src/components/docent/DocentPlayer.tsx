'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
  const groupId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [speaking, setSpeaking] = useState(false);

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

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

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
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const audioMissing = story.audioUrl === null;

  return (
    <div className="grid gap-5">
      {audioMissing ? (
        <p className="blank-slot">{t('noAudio')}</p>
      ) : failed ? (
        <div className="blank-slot grid gap-2">
          <p className="font-bold">{t('audioFailed')}</p>
          <p className="text-[0.95rem]">{t('audioFailedHint')}</p>
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
              declared where a screen reader will read it. */}
          <span
            role="img"
            aria-label={t('ttsBadgeLabel')}
            className="rounded-full border border-[var(--color-rule-strong)] px-3 py-1 font-mono text-[0.75rem] uppercase tracking-[0.1em]"
          >
            {t('ttsBadge')}
          </span>
        </p>
      ) : null}

      {/* Not a <details>. The transcript is the accessible equivalent of the audio, and
          a disclosure lets it be collapsed out of the accessibility tree entirely —
          which removes the only form of this content that a deaf visitor can use. */}
      <section className="card" aria-labelledby={`${groupId}-script`}>
        <h2 id={`${groupId}-script`} className="subhead">
          {t('script')}
        </h2>
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
      </section>

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
