import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Trash2, Edit2, Upload, X, Check, Tag } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

function ContactModal({ contact, onClose, onSave }) {
  const [form, setForm] = useState(contact || { name: '', phone: '', email: '', tags: [], notes: '' });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(p => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };
  const removeTag = t => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }));

  const handleSave = async () => {
    if (!form.name || !form.phone) { toast.error('Name and phone are required'); return; }
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem' }}>{contact ? 'Edit Contact' : 'New Contact'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input className="form-input" name="phone" placeholder="919876543210" value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" name="email" placeholder="john@example.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Tags</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="form-input" placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} style={{ flex: 1 }} />
              <button onClick={addTag} className="btn btn-secondary btn-sm"><Plus size={14} /></button>
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {form.tags.map(t => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.2rem 0.6rem', background: 'rgba(18,140,126,0.1)', color: 'var(--green-wa-dark)', borderRadius: 20, fontSize: '0.8rem', fontWeight: 500 }}>
                    <Tag size={10} />{t}
                    <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'inherit', padding: 0 }}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-textarea" name="notes" rows={2} placeholder="Any notes about this contact..." value={form.notes} onChange={handleChange} style={{ minHeight: 60 }} />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">
            {loading ? <div className="spinner" /> : <Check size={15} />} Save Contact
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');

  const load = (s = '') => {
    api.get(`/contacts${s ? `?search=${s}` : ''}`).then(r => { setContacts(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 300); return () => clearTimeout(t); }, [search]);

  const handleSave = async (data) => {
    if (editing) {
      const res = await api.put(`/contacts/${editing.id}`, data);
      setContacts(p => p.map(c => c.id === editing.id ? res.data : c));
      toast.success('Contact updated!');
    } else {
      const res = await api.post('/contacts', data);
      setContacts(p => [res.data, ...p]);
      toast.success('Contact added!');
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    await api.delete(`/contacts/${id}`);
    setContacts(p => p.filter(c => c.id !== id));
    toast.success('Deleted');
  };

  const initials = name => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const avatarColors = ['#128c7e','#3182ce','#c9a84c','#805ad5','#e53e3e','#dd6b20'];
  const getColor = (name) => avatarColors[name?.charCodeAt(0) % avatarColors.length] || avatarColors[0];

  return (
    <div className="fade-in">
      {showModal && (
        <ContactModal
          contact={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">{contacts.length} contact{contacts.length !== 1 ? 's' : ''} in your list</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem', width: 220 }} />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 72, background: 'var(--cream-dark)', borderRadius: 'var(--radius)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : contacts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={48} />
            <h3 style={{ fontFamily: 'Playfair Display' }}>No contacts yet</h3>
            <p>Add contacts to send targeted WhatsApp messages</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add First Contact
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Tags</th>
                <th>Messages</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: getColor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                        {c.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}
                      </div>
                    </div>
                  </td>
                  <td><code style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.phone}</code></td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c.email || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {c.tags?.slice(0, 3).map(t => (
                        <span key={t} className="badge badge-green" style={{ fontSize: '0.7rem' }}>{t}</span>
                      ))}
                      {c.tags?.length > 3 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{c.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{c.messageCount || 0}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => { setEditing(c); setShowModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}