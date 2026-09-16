import type { ContentTypeDef } from './types';

export const GAMING_STATUSES = ['completed', 'playing', 'backlog', 'dropped'];

const MEDIA_FIELDS: ContentTypeDef['fields'] = [
  { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
  { key: 'category', label: 'Category', type: 'string', partitionKey: true },
  { key: 'titleId', label: 'IMDb Title ID', type: 'string', help: 'tt followed by 6–12 digits, e.g. tt0111161. Fetch Data fills English metadata only; nothing is stored until Save. Existing TMDB-only records remain supported.' },
  { key: 'title', label: 'Title', type: 'string', help: 'English fallback.' },
  { key: 'year', label: 'Year', type: 'integer' },
  { key: 'plot', label: 'Plot', type: 'text', help: 'Plain English fallback, not a personal review or translation.' },
  { key: 'director', label: 'Director', type: 'string' },
  { key: 'mediaType', label: 'Type', type: 'mediaType' },
  { key: 'imageUrl', label: 'Poster Image URL', type: 'string', help: 'Poster URL only; no image upload or storage.' },
  { key: 'imdbRating', label: 'IMDb Rating (0–10)', type: 'number' },
  { key: 'myRating', label: 'My Rating (0–10)', type: 'number', help: 'Personal rating; empty means unrated. Legacy TMDB records retain their 0.5–10 half-point validation.' },
  { key: 'genres', label: 'Genres', type: 'stringArray', help: 'English fallback. Localized genre arrays are preserved in Other fields.' },
  { key: 'order', label: 'Order', type: 'integer', help: 'Manual rank: 1 first. Legacy ordering metadata is preserved in Other fields.' },
  { key: 'review', label: 'Review', type: 'localized' },
  { key: 'titleTranslations', label: 'Localized title', type: 'localized', requireAllLocales: true, help: 'Optional translations. Leave absent to use Title. Fetch Data updates existing English text only.' },
  { key: 'overview', label: 'Overview', type: 'localized', requireAllLocales: true, help: 'Optional translated plot. Leave absent to use Plot. Fetch Data preserves non-English translations.' },
];

const MEDIA_COLUMNS: ContentTypeDef['listColumns'] = [
  { key: 'title', label: 'Title' },
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
