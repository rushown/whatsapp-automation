import React, { useState, useEffect } from 'react';
import { Zap, Plus, Play, Trash2, X, Check, Clock, MessageSquare, Users, Calendar } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TRIGGERS = [
  { value: 'scheduled', label: 'Scheduled (Cron)', icon: Calendar },
  { value: 'keyword', label: 'Keyword Match', icon: MessageSquare },
  { value: 'new_contact', label: 'New Contact Added', icon: Users },
  { value: 'manual', label: 'Manual Trigger', icon: Play },
];

const CRON_PRESETS = [
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday 10 AM', value: '0 10 * * 1' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
];

function AutomationModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', trigger: 'scheduled', schedule: '0 9 * * *',
    action: { type: 'send_message', message: '', to: '', templateName: '' },
    conditions: [], isActive: true
  });
  const [loading, setLoading] = useState(false);
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleActionChange = e => setForm(p => ({ ...p, action: { ...p.action, [e.target.name]: e.target.value } }));

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem' }}>New Automation</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Automation Name</label>
            <input className="form-input" name="name" placeholder="e.g. Daily Good Morning" value={form.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label">Trigger</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {TRIGGERS.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setForm(p => ({ ...p, trigger: value }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem',
                    border: `1.5px solid ${form.trigger === value ? 'var(--green-wa-dark)' : 'var(--border)'}`,
                    borderRadius: 8, background: form.trigger === value ? 'rgba(18,140,126,0.06)' : 'white',
                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: form.trigger === value ? 600 : 400,
                    color: form.trigger === value ? 'var(--green-wa-dark)' : 'var(--text-secondary)'
                  }}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>

          {form.trigger === 'scheduled' && (
            <div className="form-group">
              <label className="form-label">Cron Schedule</label>
              <input className="form-input" name="schedule" value={form.schedule} onChange={handleChange} placeholder="0 9 * * *" />
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                {CRON_PRESETS.map(p => (
                  <button key={p.value} onClick={() => setForm(prev => ({ ...prev, schedule: p.value }))}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--cream)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.trigger === 'keyword' && (
            <div className="form-group">
              <label className="form-label">Keyword</label>
              <input className="form-input" name="keyword" placeholder="e.g. HELP, ORDER, INFO" onChange={e => setForm(p => ({ ...p, conditions: [{ type: 'keyword', value: e.target.value }] }))} />
            </div>
          )}

          <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Action — Send Message</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Recipient</label>
                <input className="form-input" name="to" placeholder="Phone number or contact tag" value={form.action.to} onChange={handleActionChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" name="message" rows={3} placeholder="Your automated message..." value={form.action.message} onChange={handleActionChange} style={{ minHeight: 80 }} />
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn btn-primary">
            {loading ? <div className="spinner" /> : <Check size={15} />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationPage() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    api.get('/automation').then(r => { setAutomations(r.data); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (data) => {
    const res = await api.post('/automation', data);
    setAutomations(p => [res.data, ...p]);
    toast.success('Automation created!');
  };

  const handleToggle = async (id) => {
    const res = await api.patch(`/automation/${id}/toggle`);
    setAutomations(p => p.map(a => a.id === id ? res.data : a));
    toast.success(res.data.isActive ? 'Automation enabled' : 'Automation paused');
  };

  const handleRun = async (id) => {
    await api.post(`/automation/${id}/run`);
    toast.success('Automation triggered manually!');
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this automation?')) return;
    await api.delete(`/automation/${id}`);
    setAutomations(p => p.filter(a => a.id !== id));
    toast.success('Deleted');
  };

  const getTriggerIcon = (trigger) => {
    const t = TRIGGERS.find(t => t.value === trigger);
    const Icon = t?.icon || Zap;
    return <Icon size={14} />;
  };

  return (
    <div className="fade-in">
      {showModal && <AutomationModal onClose={() => setShowModal(false)} onSave={handleSave} />}

      <div className="page-header">
        <div>
          <h1 className="page-title">Automation</h1>
          <p className="page-subtitle">Create and manage automated WhatsApp workflows</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Automation
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: automations.length, color: 'var(--brown)' },
          { label: 'Active', value: automations.filter(a => a.isActive).length, color: 'var(--green-wa-dark)' },
          { label: 'Total Runs', value: automations.reduce((s, a) => s + (a.runCount || 0), 0), color: '#3182ce' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.75rem', fontFamily: 'Playfair Display', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2].map(i => <div key={i} style={{ height: 100, background: 'var(--cream-dark)', borderRadius: 'var(--radius)', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : automations.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Zap size={48} />
            <h3 style={{ fontFamily: 'Playfair Display' }}>No automations yet</h3>
            <p>Automate repetitive WhatsApp messaging tasks</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create First Automation
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {automations.map(a => (
            <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: a.isActive ? 'rgba(18,140,126,0.1)' : 'var(--cream-darker)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.isActive ? 'var(--green-wa-dark)' : 'var(--text-muted)', flexShrink: 0 }}>
                <Zap size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span className={`badge ${a.isActive ? 'badge-green' : 'badge-gray'}`}>{a.isActive ? 'Active' : 'Paused'}</span>
                  <span className="badge badge-gold" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {getTriggerIcon(a.trigger)} {a.trigger}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {a.schedule && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {a.schedule}</span>}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Runs: {a.runCount || 0}</span>
                  {a.lastRun && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last: {new Date(a.lastRun).toLocaleString()}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={() => handleRun(a.id)} className="btn btn-secondary btn-sm" title="Run now">
                  <Play size={13} /> Run
                </button>
                <label className="toggle" title={a.isActive ? 'Pause' : 'Activate'}>
                  <input type="checkbox" checked={a.isActive} onChange={() => handleToggle(a.id)} />
                  <span className="toggle-slider" />
                </label>
                <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}