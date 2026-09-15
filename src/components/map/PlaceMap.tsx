'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  loadNaverMaps,
  naverClientId,
  onAuthFailure,
  type MapLoadState,
  type NaverMap,
  type NaverMapsApi,
  type NaverMarker,
} from './naver';

export interface MapPin {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  /** Verdict word as the list already prints it, or null where the list prints none. */
  verdict: string | null;
  /**
   * Fill and shape. The four verdict tones are the list's own badge values; `subject`
   * is the place a single-place map is about, and `facility` is something beside it.
   * Those last two carry no verdict, so they must not borrow a verdict's colour or its
   * glyph — a grey question mark over the place you are reading about says 정보 없음.
   */
  tone: 'visitable' | 'caution' | 'blocked' | 'unknown' | 'subject' | 'facility';
  href: string | null;
}

const PAN_STEP_PX = 120;
const MIN_ZOOM = 7;
const MAX_ZOOM = 18;

/** Mark, fill and word together, so the marker never carries its verdict in colour alone. */
const TONE_MARK: Record<MapPin['tone'], string> = {
  visitable: '✓',
  caution: '⚠',
  blocked: '✕',
  unknown: '?',
  subject: '●',
  facility: '▪',
};

/**
 * The map that sits under the list, never instead of it.
 *
 * Three rules from docs/spec/07_screens.md S2 and 08_accessibility_legal.md §1.2 shape
 * every decision here, and none of them is optional:
 *
 *  - The list above is the whole service. This block adds nothing the list lacks, so
 *    a failure here is an empty box and a sentence, not a degraded screen.
 *  - Nothing may be reachable by drag or pinch alone. Zoom and pan have buttons, and
 *    the buttons are ordinary DOM outside the tile surface, where an automated
 *    accessibility scan can still see them.
 *  - A marker is a real element with a name that reads the way its list row reads —
 *    place and verdict, and no score, because the list hides the score wherever the
 *    verdict is 정보없음. A raster pin is invisible to a screen reader and unreachable
 *    from a keyboard; a pin that leads somewhere is an <a>, and one that does not is
 *    a span with an image role.
 *
 * NAVER's own zoom, map-type and scale widgets are switched off for the same reason:
 * they are the provider's DOM, they arrive without accessible names, and the controls
 * above replace them. The logo and the attribution stay — the terms require them.
 */
export function PlaceMap({
  pins,
  center,
  zoom = 11,
  labelledBy,
}: {
  pins: MapPin[];
  center: { lat: number; lng: number };
  zoom?: number;
  labelledBy: string;
}) {
  const t = useTranslations('map');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const apiRef = useRef<NaverMapsApi | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const clientId = naverClientId();
  // A deployment with no client id never had a map to load, so that is the initial
  // state rather than something an effect discovers and then sets.
  const [state, setState] = useState<MapLoadState>(clientId === null ? 'script_error' : 'loading');
  /**
   * The view the map opens at. Held in a ref so the effect below depends on the client
   * id alone: rebuilding the map when a parent re-renders with the same coordinates
   * would throw away whatever the reader had panned to.
   */
  const initialView = useRef({ center, zoom });

  useEffect(() => {
    if (clientId === null) return;
    let cancelled = false;
    const unsubscribe = onAuthFailure(() => {
      if (!cancelled) setState('auth_error');
    });
    loadNaverMaps(clientId)
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        apiRef.current = maps;
        const view = initialView.current;
        mapRef.current = new maps.Map(canvasRef.current, {
          center: new maps.LatLng(view.center.lat, view.center.lng),
          zoom: view.zoom,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          logoControlOptions: { position: 3 },
          mapDataControl: true,
          // Scroll over a map that is not the reader's focus steals the page scroll.
          scrollWheel: false,
          keyboardShortcuts: false,
        });
        setState('ready');
      })
      .catch((cause: Error) => {
        if (!cancelled) setState(cause.message === 'auth_error' ? 'auth_error' : 'script_error');
      });
    return () => {
      cancelled = true;
      unsubscribe();
      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [clientId]);

  useEffect(() => {
    const maps = apiRef.current;
    const map = mapRef.current;
    if (state !== 'ready' || !maps || !map) return;

    for (const marker of markersRef.current) marker.setMap(null);
    markersRef.current = pins.map((pin, index) => {
      const name = pin.verdict === null ? pin.title : `${pin.title} — ${pin.verdict}`;
      return new maps.Marker({
        position: new maps.LatLng(pin.lat, pin.lng),
        map,
        // The SDK takes the overlay as markup. Every value interpolated into it is
        // escaped in markerHtml, because a place title is upstream data.
        icon: { content: markerHtml(pin, index + 1, name), anchor: new maps.Point(16, 16) },
        title: name,
        // List order, so where two places sit on top of each other — 백제역사문화관 is
        // inside 백제문화단지 and shares its coordinate to seven decimal places — the one
        // the list puts first is the one on top.
        zIndex: pins.length - index,
      });
    });

    if (pins.length > 1) {
      const lats = pins.map((p) => p.lat);
      const lngs = pins.map((p) => p.lng);
      map.fitBounds(
        new maps.LatLngBounds(
          new maps.LatLng(Math.min(...lats), Math.min(...lngs)),
          new maps.LatLng(Math.max(...lats), Math.max(...lngs)),
        ),
        { top: 48, right: 48, bottom: 48, left: 48 },
      );
    }
  }, [pins, state]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, map.getZoom() + delta)), true);
  }, []);

  const pan = useCallback((x: number, y: number) => {
    mapRef.current?.panBy(x * PAN_STEP_PX, y * PAN_STEP_PX);
  }, []);

  if (state === 'auth_error' || state === 'script_error') {
    return (
      <div className="blank-slot">
        <p>{t('unavailable')}</p>
        <p className="t-xs">{state === 'auth_error' ? t('authHint') : t('scriptHint')}</p>
      </div>
    );
  }

  return (
    <div className="map">
      {/* The controls come before the tiles in source order, so a keyboard reaches the
          way to move the map before it reaches the thing being moved. */}
      <div className="map__controls" role="group" aria-label={t('controlsLabel')}>
        <button type="button" className="map__btn" onClick={() => zoomBy(1)}>
          <span aria-hidden="true">＋</span>
          <span className="sr-only">{t('zoomIn')}</span>
        </button>
        <button type="button" className="map__btn" onClick={() => zoomBy(-1)}>
          <span aria-hidden="true">−</span>
          <span className="sr-only">{t('zoomOut')}</span>
        </button>
        <button type="button" className="map__btn" onClick={() => pan(0, -1)}>
          <span aria-hidden="true">↑</span>
          <span className="sr-only">{t('panUp')}</span>
        </button>
        <button type="button" className="map__btn" onClick={() => pan(0, 1)}>
          <span aria-hidden="true">↓</span>
          <span className="sr-only">{t('panDown')}</span>
        </button>
        <button type="button" className="map__btn" onClick={() => pan(-1, 0)}>
          <span aria-hidden="true">←</span>
          <span className="sr-only">{t('panLeft')}</span>
        </button>
        <button type="button" className="map__btn" onClick={() => pan(1, 0)}>
          <span aria-hidden="true">→</span>
          <span className="sr-only">{t('panRight')}</span>
        </button>
      </div>

      <div
        ref={canvasRef}
        className="map-canvas"
        role="application"
        aria-labelledby={labelledBy}
        aria-describedby={`${labelledBy}-hint`}
      />
      <p id={`${labelledBy}-hint`} className="t-xs text-[var(--color-ink-2)]">
        {t('hint')}
      </p>
    </div>
  );
}

/**
 * A marker is a link where the pin has a page and a plain mark where it does not.
 * NAVER takes the overlay as an HTML string, so the text is escaped here rather than
 * trusted: a place title is upstream data.
 */
function markerHtml(pin: MapPin, index: number, name: string): string {
  const label = escapeHtml(name);
  const inner = `<span aria-hidden="true">${TONE_MARK[pin.tone]}</span><span class="sr-only">${label}</span>`;
  return pin.href === null
    ? `<span class="map-pin map-pin--${pin.tone}" role="img" aria-label="${label}">${inner}</span>`
    : `<a class="map-pin map-pin--${pin.tone}" href="${escapeHtml(pin.href)}" aria-label="${label}">` +
        `<span aria-hidden="true">${index}</span></a>`;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}
