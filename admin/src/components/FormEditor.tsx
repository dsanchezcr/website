import { useMemo, useState } from 'react';
import type { ContentTypeDef, Doc } from '../types';
import { DynamicField, FieldInput, localizedToText } from './fields';
import MediaPreview from './MediaPreview';
import AiGenerate from './AiGenerate';
import { validate } from '../validation';
import { getSample, type LocalizedText } from '../api';

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

  const knownKeys = useMemo(() => new Set(type.fields.map((f) => f.key)), [type]);
  const dynamicKeys = useMemo(() => Object.keys(doc).filter((k) => !knownKeys.has(k)), [doc, knownKeys]);

  const setField = (key: string, value: unknown) => {
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
    setDoc((prev) => {
      const existing = prev[key];
      const base = existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
      return { ...prev, [key]: { ...base, en: loc.en, es: loc.es, pt: loc.pt } };
    });
  };

  const switchToJson = () => {
    setJsonText(JSON.stringify(doc, null, 2));
    setJsonError(null);
    setTab('json');
  };

  const onJsonChange = (text: string) => {
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
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal-header">
          <h2>{isNew ? `New ${type.label}` : `Edit ${type.label}`}</h2>
          <div className="admin-tabs">
            <button className={tab === 'form' ? 'active' : ''} onClick={() => setTab('form')}>Form</button>
            <button className={tab === 'json' ? 'active' : ''} onClick={switchToJson}>Raw JSON</button>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="admin-modal-body">
          <div className="admin-editor">
            {tab === 'form' ? (
              <>
                {type.fields.map((f) => (
                  <div className="admin-field" key={f.key}>
                    <label className="admin-field-label">
                      {f.label}
                      {f.partitionKey && <span className="admin-pk-badge">partition key</span>}
                    </label>
                    <FieldInput field={f} value={doc[f.key]} isNew={isNew} onChange={(v) => setField(f.key, v)} />
                    {(f.type === 'localized' || f.type === 'localizedOrString') && (
                      <AiGenerate
                        typeSlug={type.slug}
                        field={f.key}
                        title={contextTitle}
                        onGenerated={(loc) => applyGenerated(f.key, loc)}
                      />
                    )}
                    {f.help && <div className="admin-field-help">{f.help}</div>}
                  </div>
                ))}

                {dynamicKeys.length > 0 && (
                  <div className="admin-dynamic">
                    <h3>Other fields</h3>
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
          </div>

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
            <button className="admin-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving || !!jsonError}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
