import { useCallback, useEffect, useState } from 'react';
import type { ContentTypeDef, Doc } from '../types';
import { createDoc, deleteDoc, getPartitions, listDocs, updateDoc } from '../api';
import { cellValue } from './fields';
import FormEditor from './FormEditor';

export default function ContentManager({ type }: { type: ContentTypeDef }) {
  const [partitions, setPartitions] = useState<string[]>([]);
  const [partition, setPartition] = useState<string>('');
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ doc: Doc; isNew: boolean } | null>(null);

  const refreshPartitions = useCallback(() => {
    getPartitions(type.slug).then(setPartitions).catch(() => setPartitions([]));
  }, [type.slug]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDocs(type.slug, partition || undefined);
      setItems(data);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type.slug, partition]);

  // Reset filter/partitions when switching content type.
  useEffect(() => {
    setPartition('');
    setItems([]);
    setError(null);
    refreshPartitions();
  }, [type.slug, refreshPartitions]);

  useEffect(() => {
    load();
  }, [load]);

  const onNew = () => {
    const doc: Doc = {};
    if (partition) doc[type.partitionKeyField] = partition;
    setEditing({ doc, isNew: true });
  };

  const onDelete = async (doc: Doc) => {
    const id = String(doc.id ?? '');
    const pk = String(doc[type.partitionKeyField] ?? '');
    if (!id || !pk) {
      setError('Missing id or partition key for delete.');
      return;
    }
    const label = cellValue(doc[type.listColumns[0].key]) || id;
    if (!window.confirm(`Delete ${type.label} "${label}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(type.slug, id, pk);
      await load();
      refreshPartitions();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onSave = async (doc: Doc) => {
    if (editing?.isNew) {
      await createDoc(type.slug, doc);
    } else {
      await updateDoc(type.slug, String(doc.id ?? ''), doc);
    }
    setEditing(null);
    await load();
    refreshPartitions();
  };

  return (
    <div className="admin-manager">
      <div className="admin-toolbar">
        <div className="admin-filter">
          <label>{type.partitionKeyField}:</label>
          <select aria-label={`Filter by ${type.partitionKeyField}`} value={partition} onChange={(e) => setPartition(e.target.value)}>
            <option value="">All</option>
            {partitions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className="admin-btn admin-btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Reload'}
          </button>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={onNew}>+ New {type.label}</button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {type.listColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
              <th className="admin-actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={type.listColumns.length + 1} className="admin-muted">No documents.</td>
              </tr>
            )}
            {items.map((doc, index) => (
              <tr key={String(doc.id ?? index)}>
                {type.listColumns.map((c) => (
                  <td key={c.key}>{cellValue(doc[c.key])}</td>
                ))}
                <td className="admin-actions-col">
                  <button className="admin-btn admin-btn-xs" onClick={() => setEditing({ doc, isNew: false })}>Edit</button>
                  <button className="admin-btn admin-btn-xs admin-btn-danger" onClick={() => onDelete(doc)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <FormEditor
          type={type}
          initialDoc={editing.doc}
          isNew={editing.isNew}
          onSave={onSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
