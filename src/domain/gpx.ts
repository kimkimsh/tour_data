function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GPX 1.1. Every point becomes both a waypoint and a track point: map apps differ
 * in which of the two they will draw, and a route the visitor cannot see is useless.
 */
export function toGpx(
  points: ReadonlyArray<{ lat: number; lng: number; name: string }>,
  meta: { name: string; attribution: string },
): string {
  const waypoints = points
    .map(
      (p) =>
        `  <wpt lat="${p.lat}" lon="${p.lng}">\n    <name>${escapeXml(p.name)}</name>\n  </wpt>`,
    )
    .join('\n');
  const trackPoints = points
    .map((p) => `      <trkpt lat="${p.lat}" lon="${p.lng}"><name>${escapeXml(p.name)}</name></trkpt>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ModuBaekje" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(meta.name)}</name>
    <desc>${escapeXml(meta.attribution)}</desc>
  </metadata>
${waypoints}
  <trk>
    <name>${escapeXml(meta.name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;
}
