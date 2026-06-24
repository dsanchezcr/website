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
 * Visual preview of a document's media. Uses only sources permitted by the site's CSP:
 * images (img-src https:), a YouTube embed (frame-src youtube-nocookie), and external links
 * for IMDb and OpenStreetMap (opened in a new tab — no iframe needed).
 */
export default function MediaPreview({ doc }: { doc: Doc }) {
  const image = firstString(doc, IMAGE_KEYS);
  const youtubeId = typeof doc.youtubeVideoId === 'string' ? doc.youtubeVideoId.trim() : '';
  const titleId = typeof doc.titleId === 'string' ? doc.titleId.trim() : '';
  const mapCenter = Array.isArray(doc.mapCenter) ? (doc.mapCenter as unknown[]) : null;
  const mapZoom = typeof doc.mapZoom === 'number' ? doc.mapZoom : 12;
  const hasMap = !!mapCenter && mapCenter.length === 2 && typeof mapCenter[0] === 'number' && typeof mapCenter[1] === 'number';

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

      {hasMap && mapCenter && (
        <div className="admin-media-block">
          <div className="admin-media-label">Map</div>
          <a
            className="admin-link"
            href={`https://www.openstreetmap.org/?mlat=${mapCenter[0]}&mlon=${mapCenter[1]}#map=${Math.round(mapZoom)}/${mapCenter[0]}/${mapCenter[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            Open map at {String(mapCenter[0])}, {String(mapCenter[1])} ↗
          </a>
        </div>
      )}
    </div>
  );
}
