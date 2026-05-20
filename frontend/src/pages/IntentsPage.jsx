import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, RefreshCw, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const WORKFLOW_TYPES = [
  { value: 'text', label: 'Plain text reply' },
  { value: 'voice', label: 'Voice reply (ElevenLabs)' },
  { value: 'collect_data', label: 'Collect data then respond' },
  { value: 'http', label: 'HTTP webhook' },
];

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  workflow_type: 'text',
  response_text: '',
  response_voice_script: '',
  threshold: 0.78,
  is_active: true,
  http_url: '',
  examples: '',
  collection_fields: [],
};

export default function IntentsPage() {
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [fieldDraft, setFieldDraft] = useState({ key: '', label: '', prompt: '', validation: 'text' });

  const load = () => {
    api.get('/intents')
      .then((r) => setIntents(r.data))
      .catch(() => toast.error('Failed to load intents'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModal(true);
  };

  const openEdit = (intent) => {
    setForm({
      ...intent,
      examples: (intent.intent_examples || []).map((e) => e.utterance).join('\n'),
      collection_fields: intent.collection_fields || [],
    });
    setEditingId(intent.id);
    setModal(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      threshold: parseFloat(form.threshold) || 0.78,
      examples: form.examples.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await api.put(`/intents/${editingId}`, payload);
        toast.success('Intent updated');
      } else {
        await api.post('/intents', payload);
        toast.success('Intent created');
      }
      setModal(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this intent?')) return;
    try {
      await api.delete(`/intents/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const refreshEmbedding = async (id) => {
    try {
      await api.post(`/intents/${id}/refresh-embedding`);
      toast.success('Embeddings refreshed');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Refresh failed');
    }
  };

  const addField = () => {
    if (!fieldDraft.key || !fieldDraft.label) return;
    setForm((f) => ({
      ...f,
      collection_fields: [...(f.collection_fields || []), { ...fieldDraft }],
    }));
    setFieldDraft({ key: '', label: '', prompt: '', validation: 'text' });
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Intents</h1>
          <p className="page-subtitle">Bot only replies when user messages match an intent above threshold. Otherwise: silence.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> New intent
        </button>
      </header>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : intents.length === 0 ? (
        <div className="empty-state card">
          <Target size={48} className="empty-icon" style={{ opacity: 0.3 }} />
          <p>No intents yet. Create one with example phrases for embedding matching.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Workflow</th>
                <th>Threshold</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.name}</strong><br /><small style={{ color: 'var(--text-muted)' }}>{i.slug}</small></td>
                  <td><span className="badge badge-blue">{i.workflow_type}</span></td>
                  <td>{i.threshold ?? 0.78}</td>
                  <td>{i.is_active ? <span className="badge badge-green">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(i)} aria-label="Edit"><Edit2 size={14} /></button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => refreshEmbedding(i.id)} aria-label="Refresh embeddings"><RefreshCw size={14} /></button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(i.id)} aria-label="Delete"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <header className="modal-header">
              <h2>{editingId ? 'Edit intent' : 'New intent'}</h2>
            </header>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Workflow type</label>
                <select className="form-input" value={form.workflow_type} onChange={(e) => setForm({ ...form, workflow_type: e.target.value })}>
                  {WORKFLOW_TYPES.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Match threshold (0–1)</label>
                <input type="number" step="0.01" min="0" max="1" className="form-input" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Example utterances (one per line)</label>
                <textarea className="form-textarea" rows={4} value={form.examples} onChange={(e) => setForm({ ...form, examples: e.target.value })} placeholder="book appointment&#10;I want to schedule&#10;make a booking" />
              </div>
              {(form.workflow_type === 'text' || form.workflow_type === 'collect_data') && (
                <div className="form-group">
                  <label className="form-label">Response text</label>
                  <textarea className="form-textarea" value={form.response_text || ''} onChange={(e) => setForm({ ...form, response_text: e.target.value })} />
                </div>
              )}
              {form.workflow_type === 'voice' && (
                <div className="form-group">
                  <label className="form-label">Voice script</label>
                  <textarea className="form-textarea" value={form.response_voice_script || ''} onChange={(e) => setForm({ ...form, response_voice_script: e.target.value })} />
                </div>
              )}
              {form.workflow_type === 'http' && (
                <div className="form-group">
                  <label className="form-label">Webhook URL</label>
                  <input className="form-input" value={form.http_url || ''} onChange={(e) => setForm({ ...form, http_url: e.target.value })} />
                </div>
              )}
              {form.workflow_type === 'collect_data' && (
                <div>
                  <p className="form-label">Collection fields</p>
                  {(form.collection_fields || []).map((f, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', marginBottom: 4 }}>{f.label} ({f.key})</div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <input className="form-input" placeholder="key" value={fieldDraft.key} onChange={(e) => setFieldDraft({ ...fieldDraft, key: e.target.value })} />
                    <input className="form-input" placeholder="label" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} />
                    <input className="form-input" placeholder="prompt question" style={{ gridColumn: '1 / -1' }} value={fieldDraft.prompt} onChange={(e) => setFieldDraft({ ...fieldDraft, prompt: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addField}>Add field</button>
                </div>
              )}
            </div>
            <footer className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save}>Save</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
