import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentTypeDef, Doc } from '../types';
import { DynamicField, FieldInput, localizedToText } from './fields';
import MediaPreview from './MediaPreview';
import AiGenerate from './AiGenerate';
import { validate } from '../validation';
import { fetchTmdbMetadata, getSample, type LocalizedText } from '../api';
import { mergeTmdbMetadata, normalizeTmdbId, TmdbLookupError } from '../tmdb';

interface Props {
  type: ContentTypeDef;
  initialDoc: Doc;
  isNew: boolean;
  onSave: (doc: Doc) => Promise<void>;
  onClose: () => void;
}

export default function FormEditor({ type, initialDoc, isNew, onSave, onClose }: Props) {
  const [doc, setDoc] = useState<Doc>(() => ({ ...initialDoc }));
  const [tab, setTab] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [sample, setSample] = useState<Doc | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = useState('');
  const lookup = useRef<AbortController | null>(null);
  const isMedia = type.slug === 'movies' || type.slug === 'series';

  useEffect(() => {
    setDoc({ ...initialDoc });
    setTab('form');
    setJsonError(null);
    setErrors([]);
    setLookupError(null);
    setLookupStatus('');
    setFetching(false);
    return () => {
      lookup.current?.abort();
      lookup.current = null;
    };
  }, [initialDoc, type.slug]);

  const handleClose = () => {
    lookup.current?.abort();
    lookup.current = null;
    setFetching(false);
    onClose();
  };

  const fetchMetadata = async () => {
    if (!isMedia || lookup.current || saving) return;
    const tmdbId = normalizeTmdbId(doc.tmdbId);
    setLookupError(null);
    setLookupStatus('');
    if (!tmdbId) {
      setLookupError('Enter a positive TMDB ID between 1 and 2147483647.');
      return;
    }
    const controller = new AbortController();
    lookup.current = controller;
    setFetching(true);
    setLookupStatus('Fetching metadata…');
    try {
      const metadata = await fetchTmdbMetadata(tmdbId, type.slug === 'movies' ? 'movie' : 'tv', controller.signal);
      if (lookup.current !== controller || controller.signal.aborted) return;
      setDoc(previous => mergeTmdbMetadata(previous, metadata));
      setLookupStatus('Metadata fetched from TMDB. Review the fields and translations, then Save to store changes.');
    } catch (error) {
      if (lookup.current !== controller || controller.signal.aborted) return;
      setLookupStatus('');
      setLookupError(error instanceof TmdbLookupError ? error.message : 'Unable to fetch metadata. Please try again.');
    } finally {
      if (lookup.current === controller) {
        lookup.current = null;
        setFetching(false);
      }
    }
  };

  const knownKeys = useMemo(() => new Set(type.fields.map((f) => f.key)), [type]);
  const dynamicKeys = useMemo(() => Object.keys(doc).filter((k) => !knownKeys.has(k)), [doc, knownKeys]);

  const setField = (key: string, value: unknown) => {
    if (lookup.current || saving) return;
    if (key === 'tmdbId') {
      setLookupError(null);
      setLookupStatus('');
    }
    setDoc((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  // A short human reference for the item, passed to the AI generator for context.
  const contextTitle = useMemo(() => {
    const raw = doc.title ?? doc.name ?? doc.titleId ?? doc.parkId ?? doc.month;
    return localizedToText(raw) || undefined;
  }, [doc]);

  // Merge AI-generated localized text into a field. `localizedOrString` fields become a
  // localized object; `localized` fields merge over any existing locale values.
  const applyGenerated = (key: string, loc: LocalizedText) => {
    if (lookup.current || saving) return;
    setDoc((prev) => {
      const existing = prev[key];
      const base = existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
      return { ...prev, [key]: { ...base, en: loc.en, es: loc.es, pt: loc.pt } };
    });
  };

  const switchToJson = () => {
    if (lookup.current || saving) return;
    setJsonText(JSON.stringify(doc, null, 2));
    setJsonError(null);
    setTab('json');
  };

  const onJsonChange = (text: string) => {
    if (lookup.current || saving) return;
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setDoc(parsed as Doc);
        setJsonError(null);
      } else {
        setJsonError('JSON must be an object.');
      }
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const fetchSample = async () => {
    try {
      setSample(await getSample(type.slug));
    } catch (e) {
      setSample({ error: (e as Error).message });
    }
  };

  const handleSave = async () => {
    if (lookup.current || saving) return;
    const v = validate(type, doc);
    setErrors(v);
    if (v.length > 0 || jsonError) return;
    setSaving(true);
    try {
      await onSave(doc);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={handleClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal-header">
          <h2>{isNew ? `New ${type.label}` : `Edit ${type.label}`}</h2>
          <div className="admin-tabs">
            <button className={tab === 'form' ? 'active' : ''} disabled={fetching || saving} onClick={() => setTab('form')}>Form</button>
            <button className={tab === 'json' ? 'active' : ''} disabled={fetching || saving} onClick={switchToJson}>Raw JSON</button>
          </div>
          <button className="admin-modal-close" onClick={handleClose} aria-label="Close">×</button>
        </header>

        <div className="admin-modal-body">
          <fieldset className="admin-editor" aria-label="Content fields" disabled={fetching || saving}>
            {tab === 'form' ? (
              <>
                {type.fields.map((f) => (
                  <div className="admin-field" key={f.key}>
                    <label className="admin-field-label">
                      {f.label}
                      {f.partitionKey && <span className="admin-pk-badge">partition key</span>}
                    </label>
                    <div className={isMedia && f.key === 'tmdbId' ? 'admin-tmdb-lookup' : undefined}>
                      <FieldInput field={f} value={doc[f.key]} isNew={isNew} onChange={(v) => setField(f.key, v)} />
                      {isMedia && f.key === 'tmdbId' && (
                        <button type="button" className="admin-btn" onClick={fetchMetadata} disabled={fetching || saving}>
                          Fetch Data
                        </button>
                      )}
                    </div>
                    {isMedia && f.key === 'tmdbId' && (
                      <>
                        <div role="status" aria-live="polite">{lookupStatus}</div>
                        {lookupError && <div className="admin-error" role="alert">{lookupError}</div>}
                      </>
                    )}
                    {(f.type === 'localized' || f.type === 'localizedOrString') &&
                      ['review', 'description', 'recommendation', 'name', 'title', 'introText'].includes(f.key) && (
                      <AiGenerate
                        typeSlug={type.slug}
                        field={f.key}
                        title={contextTitle}
                        onGenerated={(loc) => applyGenerated(f.key, loc)}
                      />
                    )}
                    {f.help && <div className="admin-field-help">{f.help}</div>}
                    {type.slug === 'gaming' && f.key === 'manualOrder' && (
                      <button className="admin-btn admin-btn-xs" type="button"
                        disabled={doc.manualOrder == null}
                        onClick={() => setField('manualOrder', undefined)}>
                        Use automatic ordering
                      </button>
                    )}
                  </div>
                ))}

                {dynamicKeys.length > 0 && (
                  <div className="admin-dynamic">
                    <h3>Other fields</h3>
                    {isMedia && (
                      <p className="admin-field-help">
                        Ownership metadata and other stored fields remain editable and are preserved.
                        Use Raw JSON for nested objects or arrays. Fetch Data does not remove these values.
                      </p>
                    )}
                    {dynamicKeys.map((k) => (
                      <div className="admin-field" key={k}>
                        <label className="admin-field-label">{k}</label>
                        <DynamicField ariaLabel={k} value={doc[k]} onChange={(v) => setField(k, v)} />
                      </div>
                    ))}
                  </div>
                )}

                <details
                  className="admin-sample"
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open && !sample) fetchSample();
                  }}
                >
                  <summary>Fetch a sample document (schema reference)</summary>
                  <pre className="admin-readonly-json">{sample ? JSON.stringify(sample, null, 2) : 'Loading…'}</pre>
                </details>
              </>
            ) : (
              <div className="admin-json-tab">
                <textarea
                  className="admin-json-editor"
                  aria-label="Raw JSON document"
                  value={jsonText}
                  onChange={(e) => onJsonChange(e.target.value)}
                  spellCheck={false}
                />
                {jsonError && <div className="admin-error">Invalid JSON: {jsonError}</div>}
              </div>
            )}
          </fieldset>

          <aside className="admin-side">
            <MediaPreview doc={doc} />
          </aside>
        </div>

        <footer className="admin-modal-footer">
          {errors.length > 0 && (
            <ul className="admin-error-list">
              {errors.map((er, i) => (
                <li key={i}>{er}</li>
              ))}
            </ul>
          )}
          <div className="admin-modal-actions">
            <button className="admin-btn" onClick={handleClose} disabled={saving}>Cancel</button>
            <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={fetching || saving || !!jsonError}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
