/**
 * The slice of the NAVER Maps JavaScript API v3 this app touches, and the loader that
 * brings it in once per document.
 *
 * Typed by hand rather than pulled from a package: the published types are a large
 * ambient declaration for an API surface of which six classes are used here, and an
 * ambient `naver` global would let any file reach the SDK without going through the
 * one component that owns its lifecycle.
 *
 * The key is the NCP application's Client ID. It is public by construction — it
 * travels in a script URL the browser fetches — and what actually restricts it is the
 * Web 서비스 URL list registered against that application in the NCP console. The
 * Client Secret belongs to server-to-server APIs and must never reach this file.
 */

const SDK_SRC = 'https://oapi.map.naver.com/openapi/v3/maps.js';

export interface NaverLatLng {
  lat(): number;
  lng(): number;
}

export interface NaverMap {
  setCenter(latlng: NaverLatLng): void;
  setZoom(zoom: number, effect?: boolean): void;
  getZoom(): number;
  getCenter(): NaverLatLng;
  panBy(x: number, y: number): void;
  fitBounds(bounds: unknown, margin?: { top: number; right: number; bottom: number; left: number }): void;
  destroy(): void;
}

export interface NaverMarker {
  setMap(map: NaverMap | null): void;
}

export interface NaverMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMap;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  LatLngBounds: new (sw: NaverLatLng, ne: NaverLatLng) => unknown;
  Marker: new (options: Record<string, unknown>) => NaverMarker;
  Point: new (x: number, y: number) => unknown;
  Size: new (width: number, height: number) => unknown;
}

declare global {
  interface Window {
    naver?: { maps?: NaverMapsApi };
    /**
     * The SDK calls this by name when the key is rejected, and it must exist before
     * the script runs. Authentication failure is silent otherwise: the tiles render
     * a Korean error message of NAVER's own and nothing in the page is told.
     */
    navermap_authFailure?: () => void;
  }
}

export type MapLoadState = 'loading' | 'ready' | 'script_error' | 'auth_error';

let pending: Promise<NaverMapsApi> | null = null;
let authFailed = false;
const authListeners = new Set<() => void>();

/**
 * Authentication is checked after the script has loaded and after the map has been
 * constructed, so it cannot be reported by rejecting the load promise: by the time
 * NAVER answers, that promise has already resolved and the map is on screen drawing
 * NAVER's own Korean error image into every tile. A subscriber is told whenever the
 * answer arrives, and a subscriber that arrives after the answer is told at once.
 */
export function onAuthFailure(listener: () => void): () => void {
  if (authFailed) {
    listener();
    return () => {};
  }
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

/**
 * Resolves with the API once, however many maps ask for it.
 *
 * Rejects with the reason, because the three failures need different words on screen:
 * a blocked or unreachable script is an outage, and a rejected key is a registration
 * this deployment's origin is missing from.
 */
export function loadNaverMaps(clientId: string): Promise<NaverMapsApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('script_error'));
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (pending) return pending;

  pending = new Promise<NaverMapsApi>((resolve, reject) => {
    window.navermap_authFailure = () => {
      authFailed = true;
      reject(new Error('auth_error'));
      for (const listener of authListeners) listener();
      authListeners.clear();
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SDK_SRC}"]`);
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = `${SDK_SRC}?ncpKeyId=${encodeURIComponent(clientId)}`;
      script.async = true;
      document.head.append(script);
    }
    script.addEventListener('load', () => {
      const maps = window.naver?.maps;
      if (maps) resolve(maps);
      else reject(new Error('script_error'));
    });
    script.addEventListener('error', () => reject(new Error('script_error')));
  });

  // A rejected promise is not cached: a second visit to the screen after a transient
  // network failure gets a fresh attempt rather than the old rejection.
  pending.catch(() => {
    pending = null;
  });
  return pending;
}

export function naverClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  return id && id.length > 0 ? id : null;
}
