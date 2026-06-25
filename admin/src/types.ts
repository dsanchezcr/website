// The authenticated user, as returned by the Static Web Apps /.auth/me endpoint.
export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

// A Cosmos document is an arbitrary JSON object. We keep it loosely typed so that fields not
// represented in the typed editor are preserved and round-tripped unchanged.
export type Doc = Record<string, unknown>;

export type FieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'localized'
  | 'localizedOrString'
  | 'status'
  | 'coords';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  partitionKey?: boolean;
  readOnlyOnEdit?: boolean;
  help?: string;
}

export interface ListColumn {
  key: string;
  label: string;
}

export interface ContentTypeDef {
  slug: string;
  label: string;
  icon: string;
  partitionKeyField: string;
  fields: FieldDef[];
  listColumns: ListColumn[];
}
