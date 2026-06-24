import type { ContentTypeDef } from './types';

export const GAMING_STATUSES = ['completed', 'playing', 'backlog', 'dropped'];

// Field definitions per content type. These drive the typed editor; any document field NOT listed
// here is still shown via the generic (dynamic) editor and preserved on save.
export const CONTENT_TYPES: ContentTypeDef[] = [
  {
    slug: 'movies',
    label: 'Movies',
    icon: '🎬',
    partitionKeyField: 'category',
    fields: [
      { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
      { key: 'category', label: 'Category', type: 'string', partitionKey: true },
      { key: 'titleId', label: 'IMDb Title ID', type: 'string', help: 'e.g. tt0111161' },
      { key: 'myRating', label: 'My Rating (0–10)', type: 'number' },
      { key: 'order', label: 'Order', type: 'integer' },
      { key: 'review', label: 'Review', type: 'localized' },
    ],
    listColumns: [
      { key: 'title', label: 'Title' },
      { key: 'titleId', label: 'IMDb' },
      { key: 'category', label: 'Category' },
      { key: 'myRating', label: 'Rating' },
      { key: 'order', label: 'Order' },
    ],
  },
  {
    slug: 'series',
    label: 'Series',
    icon: '📺',
    partitionKeyField: 'category',
    fields: [
      { key: 'id', label: 'ID', type: 'string', readOnlyOnEdit: true, help: 'Auto-generated if left blank.' },
      { key: 'category', label: 'Category', type: 'string', partitionKey: true },
      { key: 'titleId', label: 'IMDb Title ID', type: 'string', help: 'e.g. tt0903747' },
      { key: 'myRating', label: 'My Rating (0–10)', type: 'number' },
      { key: 'order', label: 'Order', type: 'integer' },
      { key: 'review', label: 'Review', type: 'localized' },
    ],
    listColumns: [
      { key: 'title', label: 'Title' },
      { key: 'titleId', label: 'IMDb' },
      { key: 'category', label: 'Category' },
      { key: 'myRating', label: 'Rating' },
      { key: 'order', label: 'Order' },
    ],
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
      { key: 'order', label: 'Order', type: 'integer' },
    ],
    listColumns: [
      { key: 'title', label: 'Title' },
      { key: 'platform', label: 'Platform' },
      { key: 'section', label: 'Section' },
      { key: 'status', label: 'Status' },
      { key: 'order', label: 'Order' },
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
