import React, { useState, useEffect } from 'react';
import { Plus, FileText, Edit2, Trash2, Send, X, Check } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['UTILITY', 'MARKETING', 'AUTHENTICATION'];

function TemplateModal({ template, onClose, onSave }) {
  const [form, setForm] = useState(template || {
    name: '', category: 'UTILITY', language: 'en_US',
    content: '', headerText: '', footerText: '', variables: []
  });
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  
  const extractVars = (text) => {
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches)];
  };

  const handleSave = async () => {
    if (!form.name || !form.content) { toast.error('Name and content are required'); return; }
    setLoading(true);
    try {
      await onSave({ ...form, variables: extractVars(form.content) });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save template');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem' }}>{template ? 'Edit Template' : 'New Template'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Template Name</label>
              <input className="form-input" name="name" placeholder="e.g. order_confirmation" value={form.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" name="category" value={form.category} onChange={handleChange}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-input" name="language" value={form.language} onChange={handleChange}>
              <option value="en_US">English (US)</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Header Text (optional)</label>
            <input className="form-input" name="headerText" placeholder="Optional header..." value={form.headerText} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Body Content</label>
            <textarea className="form-textarea" name="content" rows={5} placeholder="Hello {{1}}, your order {{2}} has been confirmed!" value={form.content} onChange={handleChange} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Use {'{{1}}'}, {'{{2}}'} etc. for variables</span>
          </div>
          <div className="form-group">
            <label className="form-label">Footer Text (optional)</label>
            <input className="form-input" name="footerText" placeholder="Optional footer..." value={form.footerText} onChange={handleChange} />
          </div>
          {extractVars(form.content).length > 0 && (
            <div className="alert alert-info">
              Detected variables: {extractVars(form.content).join(', ')}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">
            {loading ? <div className="spinner" /> : <Check size={15} />}
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    api.get('/templates').then(r => { setTemplates(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (data) => {
    if (editing) {
      const res = await api.put(`/templates/${editing.id}`, data);
      setTemplates(p => p.map(t => t.id === editing.id ? res.data : t));
      toast.success('Template updated!');
    } else {
      const res = await api.post('/templates', data);
      setTemplates(p => [res.data, ...p]);
      toast.success('Template created!');
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`);
    setTemplates(p => p.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fade-in">
      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Message Templates</h1>
          <p className="page-subtitle">Manage your WhatsApp message templates</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input className="form-input" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 180, background: 'var(--cream-dark)', borderRadius: 'var(--radius)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FileText size={48} />
            <h3 style={{ fontFamily: 'Playfair Display' }}>No templates yet</h3>
            <p>Create reusable message templates for faster sending</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create First Template
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.name}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-green">{t.category}</span>
                    <span className="badge badge-gray">{t.language}</span>
                    {t.status === 'approved' && <span className="badge badge-blue">Approved</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button onClick={() => { setEditing(t); setShowModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {t.headerText && (
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px dashed var(--border)', paddingBottom: '0.5rem' }}>
                  {t.headerText}
                </div>
              )}

              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                {t.content.length > 120 ? t.content.slice(0, 120) + '...' : t.content}
              </p>

              {t.footerText && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                  {t.footerText}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '0.625rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Used {t.usageCount || 0} times
                </span>
                {t.variables?.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t.variables.length} variable{t.variables.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}