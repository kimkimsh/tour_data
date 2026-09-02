'use client';

import { useTranslations } from 'next-intl';
import { toGpx } from '@/domain/gpx';
import type { Route } from '@/domain/snapshot-schema';

const KAKAO_WAYPOINT_LIMIT = 5;
const GOOGLE_WAYPOINT_LIMIT = 3;

/**
 * GPX and the two map-app hand-offs.
 *
 * The GPX is built in the browser from the route snapshot the page already holds:
 * a server round-trip would add a route handler that recomputes what is on screen.
 *
 * Waypoint limits differ per app and silently truncate above them, so the links cap
 * explicitly instead of handing over a route the app will quietly shorten.
 */
export function RouteExports({ route, fileName }: { route: Route; fileName: string }) {
  const t = useTranslations('routeGuide');
  const points = route.steps
    .filter((step) => step.coord !== null)
    .map((step) => ({ lat: step.coord!.lat, lng: step.coord!.lng, name: step.title }));

  if (points.length === 0) return null;

  const gpx = toGpx(points, {
    name: route.title,
    attribution: '출처: 한국관광공사 TourAPI · 경로 단계는 모두의 백제 작성',
  });
  const sizeKb = Math.max(1, Math.round(new Blob([gpx]).size / 1024));

  const download = () => {
    const url = URL.createObjectURL(new Blob([gpx], { type: 'application/gpx+xml' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.gpx`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const middle = points.slice(1, -1);

  // kakao.maps.LatLng and these scheme parameters both take lat first. KTO's mapx is
  // longitude, so a value copied from there has to be swapped before it gets here.
  const kakaoWaypoints = middle
    .slice(0, KAKAO_WAYPOINT_LIMIT)
    .map((point, index) => `${index === 0 ? 'vp' : `vp${index + 1}`}=${point.lat},${point.lng}`)
    .join('&');
  const kakaoUrl =
    `https://m.map.kakao.com/scheme/route?sp=${first.lat},${first.lng}` +
    `&ep=${last.lat},${last.lng}${kakaoWaypoints ? `&${kakaoWaypoints}` : ''}&by=foot`;

  const googleWaypoints = middle
    .slice(0, GOOGLE_WAYPOINT_LIMIT)
    .map((point) => `${point.lat}%2C${point.lng}`)
    .join('%7C');
  const googleUrl =
    `https://www.google.com/maps/dir/?api=1&origin=${first.lat},${first.lng}` +
    `&destination=${last.lat},${last.lng}&travelmode=walking` +
    (googleWaypoints ? `&waypoints=${googleWaypoints}` : '');

  return (
    <p className="flex flex-wrap gap-3">
      <button type="button" className="btn" onClick={download}>
        {t('downloadGpx')}
        <span className="font-normal text-[0.85rem]">{t('gpxFileNote', { size: sizeKb })}</span>
      </button>
      <a className="btn" href={kakaoUrl} rel="noreferrer noopener">
        {t('openInKakao')}
      </a>
      <a className="btn" href={googleUrl} rel="noreferrer noopener">
        {t('openInGoogle')}
      </a>
    </p>
  );
}
