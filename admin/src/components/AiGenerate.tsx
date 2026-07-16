import { useState } from 'react';
import { generateLocalizedText, type LocalizedText } from '../api';

interface Props {
  /** Content-type slug (e.g. "gaming"). */
  typeSlug: string;
  /** Logical field name being generated (e.g. "description"). */
  field: string;
  /** Optional item title/reference passed to the model for context. */
  title?: string;
  /** Called with the localized result so the parent can merge it into the field value. */
  onGenerated: (loc: LocalizedText) => void;
}

/**
 * Inline "Generate with AI" affordance for localized fields. The admin types a brief prompt and the
 * admin-only Foundry endpoint expands it into en/es/pt text in the site's tone. Manual editing of
 * the field is unchanged — this only pre-fills the three locale inputs for review.
 */
export default function AiGenerate({ typeSlug, field, title, onGenerated }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const loc = await generateLocalizedText(typeSlug, field, prompt.trim(), title);
      onGenerated(loc);
      setOpen(false);
      setPrompt('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="admin-ai-btn" onClick={() => setOpen(true)}>
        ✨ Generate with AI
      </button>
    );
  }

  return (
    <div className="admin-ai-panel">
      <textarea
        className="admin-ai-prompt"
        rows={2}
        placeholder="Brief prompt (e.g. co-op looter shooter, loved the endgame grind, great with friends)…"
        aria-label={`AI prompt for ${field}`}
        value={prompt}
        disabled={busy}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
        }}
      />
      {error && <div className="admin-ai-error">{error}</div>}
      <div className="admin-ai-actions">
        <button type="button" className="admin-btn admin-btn-xs" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-xs"
          onClick={run}
          disabled={busy || !prompt.trim()}
        >
          {busy ? 'Generating…' : 'Generate en/es/pt'}
        </button>
      </div>
    </div>
  );
}
