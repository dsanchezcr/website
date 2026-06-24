import type { Doc } from '../types';

const IMAGE_KEYS = ['imageUrl', 'heroImageUrl', 'posterUrl', 'coverImageUrl', 'thumbnailUrl'];

function firstString(doc: Doc, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = doc[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return undefined;
}

/**
 * Returns the value only when it is an absolute http(s) URL. Document values come from the
 * raw-JSON editor and are therefore untrusted: this blocks dangerous schemes (e.g. javascript:,
 * data:) from ever reaching an href/src and being reinterpreted by the browser.
 */
function safeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Keep only characters valid for the id, neutralizing any injected URL/HTML syntax. */
function sanitizeId(value: unknown, disallowed: RegExp): string {
  return typeof value === 'string' ? value.replace(disallowed, '') : '';
}

/**
 * Visual preview of a document's media. Uses only sources permitted by the site's CSP:
 * images (img-src https:), a YouTube embed (frame-src youtube-nocookie), and external links
 * for IMDb and OpenStreetMap (opened in a new tab — no iframe needed).
 */
export default function MediaPreview({ doc }: { doc: Doc }) {
  const image = safeHttpUrl(firstString(doc, IMAGE_KEYS));
  const youtubeId = sanitizeId(doc.youtubeVideoId, /[^A-Za-z0-9_-]/g);
  const titleId = sanitizeId(doc.titleId, /[^A-Za-z0-9]/g);
  const mapCenter = Array.isArray(doc.mapCenter) ? (doc.mapCenter as unknown[]) : null;
  const hasMap = !!mapCenter && mapCenter.length === 2 && typeof mapCenter[0] === 'number' && typeof mapCenter[1] === 'number';
  const mapLat = hasMap ? Number(mapCenter![0]) : 0;
  const mapLng = hasMap ? Number(mapCenter![1]) : 0;
  const mapZoom = typeof doc.mapZoom === 'number' ? doc.mapZoom : 12;

  const nothing = !image && !youtubeId && !titleId && !hasMap;

  return (
    <div className="admin-media">
      <h3>Preview</h3>
      {nothing && <p className="admin-muted">No previewable media (image, YouTube, IMDb, or map).</p>}

      {image && (
        <div className="admin-media-block">
          <div className="admin-media-label">Image</div>
          <img
            className="admin-media-img"
            src={image}
            alt="preview"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <a className="admin-link" href={image} target="_blank" rel="noreferrer">Open image ↗</a>
        </div>
      )}

      {youtubeId && (
        <div className="admin-media-block">
          <div className="admin-media-label">YouTube</div>
          <iframe
            className="admin-media-yt"
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`}
            title="YouTube preview"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <a className="admin-link" href={`https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`} target="_blank" rel="noreferrer">
            Open on YouTube ↗
          </a>
        </div>
      )}

      {titleId && (
        <div className="admin-media-block">
          <div className="admin-media-label">IMDb</div>
          <a className="admin-link" href={`https://www.imdb.com/title/${encodeURIComponent(titleId)}/`} target="_blank" rel="noreferrer">
            Open {titleId} on IMDb ↗
          </a>
        </div>
      )}

      {hasMap && (
        <div className="admin-media-block">
          <div className="admin-media-label">Map</div>
          <a
            className="admin-link"
            href={`https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLng}#map=${Math.round(mapZoom)}/${mapLat}/${mapLng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open map at {mapLat}, {mapLng} ↗
          </a>
        </div>
      )}
    </div>
  );
}
