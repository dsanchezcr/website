import type { FieldDef } from '../types';
import { GAMING_STATUSES } from '../contentTypes';

const LOCALES = ['en', 'es', 'pt'];

/** Resolve a localized value (or plain string) to display text. */
export function localizedToText(v: unknown, locale = 'en'): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const val = o[locale] ?? o.en ?? Object.values(o)[0];
    return typeof val === 'string' ? val : '';
  }
  return '';
}

/** Format an arbitrary value for a read-only grid cell. */
export function cellValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '✓' : '';
  if (Array.isArray(v)) return `${v.length} item(s)`;
  if (typeof v === 'object') return localizedToText(v);
  return String(v);
}

function isLocalizedLike(v: unknown): boolean {
  return (
    typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v as Record<string, unknown>).every((x) => x === null || typeof x === 'string')
  );
}

function asLocalizedObject(v: unknown): Record<string, string> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === 'string') out[k] = val;
    }
    return out;
  }
  return {};
}

function LocalizedInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const obj = asLocalizedObject(value);
  const set = (loc: string, text: string) => {
    const next = { ...obj };
    if (text === '') delete next[loc];
    else next[loc] = text;
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div className="admin-localized">
      {LOCALES.map((loc) => (
        <label key={loc} className="admin-localized-row">
          <span className="admin-localized-tag">{loc}</span>
          <textarea rows={2} value={obj[loc] ?? ''} onChange={(e) => set(loc, e.target.value)} />
        </label>
      ))}
    </div>
  );
}

function LocalizedOrStringInput({ label, value, onChange }: { label: string; value: unknown; onChange: (v: unknown) => void }) {
  const mode: 'string' | 'localized' = typeof value === 'string' || value == null ? 'string' : 'localized';
  const switchMode = (m: string) => {
    if (m === 'string') {
      onChange(localizedToText(value));
    } else {
      const text = typeof value === 'string' ? value : '';
      onChange(text ? { en: text } : {});
    }
  };
  return (
    <div className="admin-loc-or-string">
      <select className="admin-mode-select" aria-label={`${label} format`} value={mode} onChange={(e) => switchMode(e.target.value)}>
        <option value="string">Single text</option>
        <option value="localized">Localized (en/es/pt)</option>
      </select>
      {mode === 'string' ? (
        <textarea rows={2} aria-label={label} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <LocalizedInput value={value} onChange={onChange} />
      )}
    </div>
  );
}

function CoordsInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const arr = Array.isArray(value) ? (value as unknown[]) : [];
  const lat = (arr[0] ?? '') as number | string;
  const lng = (arr[1] ?? '') as number | string;
  const update = (la: number | string, lo: number | string) => {
    if ((la === '' || la == null) && (lo === '' || lo == null)) {
      onChange(undefined);
      return;
    }
    onChange([la === '' ? 0 : Number(la), lo === '' ? 0 : Number(lo)]);
  };
  return (
    <div className="admin-coords">
      <input type="number" step="any" placeholder="lat" value={lat} onChange={(e) => update(e.target.value, lng)} />
      <input type="number" step="any" placeholder="lng" value={lng} onChange={(e) => update(lat, e.target.value)} />
    </div>
  );
}

interface FieldProps {
  field: FieldDef;
  value: unknown;
  isNew: boolean;
  onChange: (value: unknown) => void;
}

/** Typed editor for a known field. */
export function FieldInput({ field, value, isNew, onChange }: FieldProps) {
  const readOnly = !!field.readOnlyOnEdit && !isNew;
  const aria = field.label;

  switch (field.type) {
    case 'boolean':
      return <input type="checkbox" aria-label={aria} checked={value === true} disabled={readOnly} onChange={(e) => onChange(e.target.checked)} />;
    case 'number':
    case 'integer':
      return (
        <input
          type="number"
          aria-label={aria}
          step={field.type === 'integer' ? '1' : 'any'}
          readOnly={readOnly}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      );
    case 'status':
      return (
        <select aria-label={aria} value={typeof value === 'string' ? value : ''} disabled={readOnly} onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}>
          <option value="">(none)</option>
          {GAMING_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      );
    case 'localized':
      return <LocalizedInput value={value} onChange={onChange} />;
    case 'localizedOrString':
      return <LocalizedOrStringInput label={aria} value={value} onChange={onChange} />;
    case 'coords':
      return <CoordsInput value={value} onChange={onChange} />;
    case 'string':
    default:
      return (
        <input
          type="text"
          aria-label={aria}
          readOnly={readOnly}
          value={typeof value === 'string' ? value : value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        />
      );
  }
}

/** Generic editor for a document field not represented in the typed form. */
export function DynamicField({ ariaLabel, value, onChange }: { ariaLabel: string; value: unknown; onChange: (v: unknown) => void }) {
  if (typeof value === 'boolean') {
    return <input type="checkbox" aria-label={ariaLabel} checked={value} onChange={(e) => onChange(e.target.checked)} />;
  }
  if (typeof value === 'number') {
    return <input type="number" aria-label={ariaLabel} step="any" value={value} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />;
  }
  if (typeof value === 'string') {
    return <input type="text" aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (isLocalizedLike(value)) {
    return <LocalizedInput value={value} onChange={onChange} />;
  }
  // Arrays / nested objects: shown read-only here; edit them via the Raw JSON tab.
  return <pre className="admin-readonly-json">{JSON.stringify(value, null, 2)}</pre>;
}
