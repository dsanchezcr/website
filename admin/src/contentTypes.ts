import type { ContentTypeDef } from './types';

export const GAMING_STATUSES = ['completed', 'playing', 'backlog', 'dropped'];

const MEDIA_FIELDS: ContentTypeDef['fields'] = [
  { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
  { key: 'category', label: 'Category', type: 'string', partitionKey: true },
  { key: 'tmdbId', label: 'TMDB ID', type: 'integer', help: 'Positive TMDB title ID. IMDb ID is optional when this is present.' },
  { key: 'mediaType', label: 'Media type', type: 'string', help: 'movie for Movies, tv for Series.' },
  { key: 'titleId', label: 'IMDb Title ID', type: 'string', help: 'e.g. tt0111161. Required only for legacy entries without a TMDB ID.' },
  { key: 'title', label: 'Title', type: 'string', help: 'English fallback.' },
  { key: 'titleTranslations', label: 'Localized title', type: 'localized', requireAllLocales: true },
  { key: 'overview', label: 'Overview', type: 'localized', requireAllLocales: true },
  { key: 'imageUrl', label: 'Poster Image URL', type: 'string' },
  { key: 'posterPath', label: 'TMDB poster path', type: 'string', help: 'e.g. /poster.jpg, not a full URL.' },
  { key: 'year', label: 'Year', type: 'integer' },
  { key: 'genres', label: 'Genres', type: 'stringArray', help: 'English fallback. Localized genre arrays are preserved in Other fields.' },
  { key: 'tmdbRating', label: 'TMDB Rating (0–10)', type: 'number' },
  { key: 'imdbRating', label: 'IMDb Rating (0–10)', type: 'number', help: 'Legacy IMDb score, separate from TMDB.' },
  { key: 'myRating', label: 'My Rating (0–10)', type: 'number', help: 'TMDB entries: 0.5–10 in half-point increments; empty means unrated.' },
  { key: 'order', label: 'Order', type: 'integer', help: 'Top lists: 1 first. Other TMDB imports: managed by sync.' },
  { key: 'review', label: 'Review', type: 'localized' },
  { key: 'syncSource', label: 'Sync source', type: 'string', readOnlyOnEdit: true },
  { key: 'syncAccountId', label: 'Sync account ID', type: 'integer', readOnlyOnEdit: true },
  { key: 'syncedAt', label: 'Sync snapshot', type: 'string', readOnlyOnEdit: true, help: 'Refresh snapshot, not the date the title was added.' },
];

const MEDIA_COLUMNS: ContentTypeDef['listColumns'] = [
  { key: 'title', label: 'Title' },
  { key: 'tmdbId', label: 'TMDB ID' },
  { key: 'titleId', label: 'IMDb Title' },
  { key: 'category', label: 'Category' },
  { key: 'myRating', label: 'Rating' },
  { key: 'order', label: 'Order' },
];

// Field definitions per content type. These drive the typed editor; any document field NOT listed
// here is still shown via the generic (dynamic) editor and preserved on save.
export const CONTENT_TYPES: ContentTypeDef[] = [
  {
    slug: 'movies',
    label: 'Movies',
    icon: '🎬',
    partitionKeyField: 'category',
    fields: MEDIA_FIELDS,
    listColumns: MEDIA_COLUMNS,
  },
  {
    slug: 'series',
    label: 'Series',
    icon: '📺',
    partitionKeyField: 'category',
    fields: MEDIA_FIELDS,
    listColumns: MEDIA_COLUMNS,
  },
  {
    slug: 'gaming',
    label: 'Gaming',
    icon: '🎮',
    partitionKeyField: 'platform',
    fields: [
      { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
      { key: 'platform', label: 'Platform', type: 'string', partitionKey: true, help: 'e.g. xbox, playstation, nintendo-switch' },
      { key: 'section', label: 'Section', type: 'string' },
      { key: 'type', label: 'Type', type: 'string', help: 'e.g. card' },
      { key: 'title', label: 'Title', type: 'localizedOrString' },
      { key: 'status', label: 'Status', type: 'status' },
      { key: 'imageUrl', label: 'Image URL', type: 'string' },
      { key: 'url', label: 'External URL', type: 'string' },
      { key: 'description', label: 'Description', type: 'localizedOrString' },
      { key: 'recommendation', label: 'Recommendation', type: 'localizedOrString' },
      { key: 'coOp', label: 'Co-Op', type: 'boolean' },
      { key: 'online', label: 'Online', type: 'boolean' },
      { key: 'manualOrder', label: 'Manual rank (optional)', type: 'integer', help: '1 first, then 2, etc., ahead of automatic entries. Leave empty for newest-added. Not used in Top Games.' },
      { key: 'createdAt', label: 'Added at', type: 'string', readOnlyOnEdit: true, help: 'Set by the server on creation; preserved on edits. Legacy entries may have no date.' },
      { key: 'order', label: 'Order (Top Games / legacy)', type: 'integer', help: 'Top Games: 1 first. Other lists: legacy fallback only; no need to set for new games.' },
    ],
    listColumns: [
      { key: 'title', label: 'Title' },
      { key: 'platform', label: 'Platform' },
      { key: 'section', label: 'Section' },
      { key: 'status', label: 'Status' },
      { key: 'manualOrder', label: 'Manual rank' },
      { key: 'createdAt', label: 'Added at' },
      { key: 'order', label: 'Top / legacy rank' },
    ],
  },
  {
    slug: 'parks',
    label: 'Parks',
    icon: '🏰',
    partitionKeyField: 'provider',
    fields: [
      { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
      { key: 'provider', label: 'Provider', type: 'string', partitionKey: true, help: 'e.g. disney, universal' },
      { key: 'parkId', label: 'Park ID', type: 'string' },
      { key: 'name', label: 'Name', type: 'localized' },
      { key: 'description', label: 'Description', type: 'localized' },
      { key: 'mapCenter', label: 'Map Center (lat, lng)', type: 'coords' },
      { key: 'mapZoom', label: 'Map Zoom', type: 'number' },
      { key: 'imageUrl', label: 'Image URL', type: 'string' },
    ],
    listColumns: [
      { key: 'provider', label: 'Provider' },
      { key: 'parkId', label: 'Park ID' },
      { key: 'name', label: 'Name' },
      { key: 'items', label: 'Items' },
    ],
  },
  {
    slug: 'monthly-updates',
    label: 'Monthly Updates',
    icon: '📅',
    partitionKeyField: 'month',
    fields: [
      { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
      { key: 'month', label: 'Month (YYYY-MM)', type: 'string', partitionKey: true },
      { key: 'title', label: 'Title', type: 'localizedOrString' },
      { key: 'category', label: 'Category', type: 'string', help: 'e.g. upcoming' },
      { key: 'releaseDate', label: 'Release Date', type: 'string' },
      { key: 'platforms', label: 'Platforms', type: 'string' },
      { key: 'description', label: 'Description', type: 'localizedOrString' },
      { key: 'youtubeVideoId', label: 'YouTube Video ID', type: 'string' },
      { key: 'youtubeTitle', label: 'YouTube Title', type: 'localizedOrString' },
      { key: 'imageUrl', label: 'Image URL', type: 'string' },
      { key: 'heroImageUrl', label: 'Hero Image URL', type: 'string' },
      { key: 'introText', label: 'Intro Text', type: 'localizedOrString' },
      { key: 'order', label: 'Order', type: 'integer' },
    ],
    listColumns: [
      { key: 'month', label: 'Month' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'releaseDate', label: 'Release' },
      { key: 'order', label: 'Order' },
    ],
  },
];

export function getContentType(slug: string): ContentTypeDef | undefined {
  return CONTENT_TYPES.find((t) => t.slug === slug);
}
