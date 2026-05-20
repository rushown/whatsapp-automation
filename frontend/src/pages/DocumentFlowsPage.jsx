/**
 * frontend/src/pages/DocumentFlowsPage.jsx
 * Admin UI for configuring WhatsApp document collection flows.
 * Styled to match the existing WAutomate cream/white theme.
 */

import { useState, useEffect } from 'react';
import {
  FileOutput, Plus, Pencil, Trash2, RefreshCw,
  ChevronUp, ChevronDown, X, Download, FileText,
  Users, FlaskConical, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../lib/api';

// ── Design tokens — mirrors your CSS variables ────────────────────────────────
const T = {
  greenDark:  '#128C7E',
  green:      '#25D366',
  cream:      '#faf8f5',
  espresso:   '#2c1a0e',
  border:     '#e8e4dc',
  borderLight:'#f0ece4',
  textPrimary:'#1a1209',
  textSecond: '#6b7280',
  textMuted:  '#9ca3af',
  white:      '#ffffff',
  danger:     '#dc2626',
  dangerBg:   '#fef2f2',
  success:    '#16a34a',
  successBg:  '#f0fdf4',
  blue:       '#1d4ed8',
  blueBg:     '#eff6ff',
  radius:     '10px',
  radiusSm:   '7px',
  shadow:     '0 1px 4px rgba(0,0,0,.07)',
  shadowMd:   '0 4px 16px rgba(0,0,0,.10)',
};

// ── Shared style objects ──────────────────────────────────────────────────────
const S = {
  page: {
    padding: '2rem',
    background: T.cream,
    minHeight: '100vh',
    fontFamily: "'Lato', 'Segoe UI', system-ui, sans-serif",
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.75rem',
  },
  pageTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.6rem',
    fontWeight: 700,
    color: T.espresso,
    margin: 0,
    lineHeight: 1.2,
  },
  pageSubtitle: {
    fontSize: '0.8rem',
    color: T.textSecond,
    marginTop: '4px',
    letterSpacing: '.01em',
  },

  // Tabs
  tabBar: {
    display: 'flex',
    gap: '2px',
    background: T.borderLight,
    padding: '4px',
    borderRadius: T.radius,
    width: 'fit-content',
    marginBottom: '1.5rem',
    border: `1px solid ${T.border}`,
  },
  tab: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 16px',
    borderRadius: T.radiusSm,
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 500,
    background: active ? T.white : 'transparent',
    color: active ? T.greenDark : T.textSecond,
    boxShadow: active ? T.shadow : 'none',
    transition: 'all .15s ease',
  }),

  // Cards
  card: {
    background: T.white,
    borderRadius: T.radius,
    border: `1px solid ${T.border}`,
    padding: '1.25rem',
    marginBottom: '1rem',
    boxShadow: T.shadow,
  },
  emptyCard: {
    background: T.white,
    borderRadius: T.radius,
    border: `1.5px dashed ${T.border}`,
    padding: '3rem',
    textAlign: 'center',
    color: T.textMuted,
  },

  // Buttons
  btn: (variant = 'primary', size = 'md') => {
    const pad = size === 'sm' ? '5px 10px' : size === 'icon' ? '6px' : '9px 18px';
    const fs = size === 'sm' ? '0.8rem' : '0.875rem';
    const base = {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: pad, borderRadius: T.radiusSm, border: 'none',
      cursor: 'pointer', fontWeight: 600, fontSize: fs,
      transition: 'all .15s ease', whiteSpace: 'nowrap',
    };
    const variants = {
      primary: { background: T.greenDark, color: T.white },
      ghost:   { background: T.white, color: T.textSecond, border: `1px solid ${T.border}` },
      danger:  { background: T.dangerBg, color: T.danger, border: `1px solid #fecaca` },
      success: { background: T.successBg, color: T.success, border: `1px solid #bbf7d0` },
      dashed:  { background: 'transparent', color: T.textSecond, border: `1.5px dashed ${T.border}`, width: '100%', justifyContent: 'center' },
    };
    return { ...base, ...variants[variant] };
  },

  // Form
  input: {
    width: '100%',
    padding: '8px 12px',
    border: `1.5px solid ${T.border}`,
    borderRadius: T.radiusSm,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: T.cream,
    color: T.textPrimary,
    fontFamily: 'inherit',
    transition: 'border-color .15s',
  },
  label: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 700,
    color: T.textSecond,
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
  },
  fieldGroup: { marginBottom: '1rem' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },

  // Section divider inside modal
  sectionDivider: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: T.textSecond,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    margin: '1.25rem 0 .75rem',
    paddingBottom: '6px',
    borderBottom: `1px solid ${T.border}`,
  },

  // Question card inside modal
  questionCard: {
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
    padding: '1rem',
    marginBottom: '10px',
    background: T.cream,
  },

  // Badges
  badge: (active) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 700,
    background: active ? T.successBg : T.dangerBg,
    color: active ? T.success : T.danger,
    border: `1px solid ${active ? '#bbf7d0' : '#fecaca'}`,
  }),
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: T.blueBg, color: T.blue,
    borderRadius: '6px', padding: '2px 8px',
    fontSize: '0.7rem', fontWeight: 600,
    marginRight: '4px', marginBottom: '4px',
    border: `1px solid #bfdbfe`,
  },
  questionPill: {
    background: T.blueBg, color: T.blue,
    borderRadius: '6px', padding: '3px 10px',
    fontSize: '0.75rem', fontWeight: 500,
    border: `1px solid #bfdbfe`,
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(44,26,14,.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem',
    backdropFilter: 'blur(2px)',
  },
  modalBox: {
    background: T.white,
    borderRadius: '14px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '2rem',
    boxShadow: '0 24px 64px rgba(0,0,0,.18)',
    border: `1px solid ${T.border}`,
  },

  // Alert
  alert: (type) => ({
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    background: type === 'error' ? T.dangerBg : T.successBg,
    border: `1px solid ${type === 'error' ? '#fecaca' : '#bbf7d0'}`,
    color: type === 'error' ? T.danger : T.success,
    borderRadius: T.radiusSm,
    padding: '10px 14px',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  }),

  // Session pre
  pre: {
    background: T.cream,
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusSm,
    padding: '10px',
    fontSize: '0.7rem',
    fontFamily: 'monospace',
    overflow: 'auto',
    margin: '6px 0 0',
  },
};

const VALIDATION_TYPES = ['text', 'date', 'phone', 'number', 'email'];
const DOC_TYPES = ['citizenship', 'application_letter', 'certificate', 'generic'];

const emptyFlow = () => ({
  name: '', nameNp: '',
  documentType: 'citizenship',
  language: 'bilingual',
  active: true,
  triggerKeywords: [],
  questions: [{
    id: 'full_name', field: 'full_name',
    label: 'Full Name', labelNp: 'पूरा नाम',
    questionEn: 'What is your full name?',
    questionNp: 'तपाईंको पूरा नाम के हो?',
    validationType: 'text', required: true,
  }],
  confirmationMessageEn: '',
  confirmationMessageNp: '',
});

// ── Main Component ────────────────────────────────────────────────────────────
export default function DocumentFlowsPage() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [formData, setFormData] = useState(emptyFlow());
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('flows');
  const [sessions, setSessions] = useState([]);
  const [generateData, setGenerateData] = useState({ flowId: '', data: '{}' });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchFlows(); }, []);

  async function fetchFlows() {
    try {
      const res = await api.get('/document-flows');
      setFlows(res.data.flows || []);
    } catch {
      setError('Failed to load flows');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessions() {
    try {
      const res = await api.get('/document-flows/sessions/active');
      setSessions(res.data.sessions || []);
    } catch { /* ignore */ }
  }

  function openCreate() {
    setEditingFlow(null); setFormData(emptyFlow()); setKeywordInput(''); setShowModal(true);
  }

  function openEdit(flow) {
    setEditingFlow(flow.id); setFormData({ ...flow }); setKeywordInput(''); setShowModal(true);
  }

  async function saveFlow() {
    if (!formData.name || !formData.documentType) return setError('Name and document type are required');
    setSaving(true); setError('');
    try {
      if (editingFlow) {
        await api.put(`/document-flows/${editingFlow}`, formData);
      } else {
        await api.post('/document-flows', formData);
      }
      await fetchFlows();
      setShowModal(false);
      setSuccess(editingFlow ? 'Flow updated successfully' : 'Flow created successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteFlow(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/document-flows/${id}`);
      fetchFlows();
      setSuccess('Flow deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Delete failed');
    }
  }

  async function generateDocument() {
    setGenerating(true); setError('');
    try {
      let data;
      try { data = JSON.parse(generateData.data); }
      catch { return setError('Invalid JSON — check your data field'); }
      const res = await api.post('/document-flows/generate',
        { flowId: generateData.flowId, data },
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `document-${Date.now()}.pdf`; a.click();
      URL.revokeObjectURL(url);
      setSuccess('PDF downloaded!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('PDF generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // Question helpers
  function addQuestion() {
    setFormData(f => ({
      ...f,
      questions: [...f.questions, {
        id: `field_${Date.now()}`,
        field: `field_${f.questions.length + 1}`,
        label: '', labelNp: '',
        questionEn: '', questionNp: '',
        validationType: 'text', required: true,
      }],
    }));
  }

  function updateQuestion(idx, key, val) {
    setFormData(f => {
      const questions = [...f.questions];
      questions[idx] = { ...questions[idx], [key]: val };
      return { ...f, questions };
    });
  }

  function removeQuestion(idx) {
    setFormData(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  }

  function moveQuestion(idx, dir) {
    setFormData(f => {
      const questions = [...f.questions];
      const t = idx + dir;
      if (t < 0 || t >= questions.length) return f;
      [questions[idx], questions[t]] = [questions[t], questions[idx]];
      return { ...f, questions };
    });
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (!kw) return;
    setFormData(f => ({ ...f, triggerKeywords: [...(f.triggerKeywords || []), kw] }));
    setKeywordInput('');
  }

  function removeKeyword(kw) {
    setFormData(f => ({ ...f, triggerKeywords: f.triggerKeywords.filter(k => k !== kw) }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>

      {/* Page header */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>Document Flows</h1>
          <p style={S.pageSubtitle}>Configure WhatsApp bots that collect information and generate PDFs</p>
        </div>
        <button style={S.btn('primary')} onClick={openCreate}>
          <Plus size={15} /> New Flow
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div style={S.alert('error')}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div style={S.alert('success')}>
          <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={S.tabBar}>
        {[
          { id: 'flows',    label: 'Flows',           Icon: FileOutput   },
          { id: 'test',     label: 'Test Generate',   Icon: FlaskConical },
          { id: 'sessions', label: 'Active Sessions', Icon: Users        },
        ].map(({ id, label, Icon }) => (
          <button key={id} style={S.tab(activeTab === id)}
            onClick={() => { setActiveTab(id); if (id === 'sessions') fetchSessions(); }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── FLOWS TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'flows' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: T.textMuted }}>
              <FileText size={32} style={{ opacity: .3, marginBottom: 8 }} />
              <div>Loading flows...</div>
            </div>
          ) : flows.length === 0 ? (
            <div style={S.emptyCard}>
              <FileOutput size={40} style={{ opacity: .25, marginBottom: 12 }} />
              <div style={{ fontWeight: 600, marginBottom: 6, color: T.textSecond }}>No flows configured yet</div>
              <div style={{ fontSize: '0.8rem', marginBottom: 16 }}>Create your first document flow to get started</div>
              <button style={S.btn('primary')} onClick={openCreate}><Plus size={14} /> Create Flow</button>
            </div>
          ) : (
            flows.map(flow => (
              <div key={flow.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: T.espresso }}>
                        {flow.name}
                      </span>
                      {flow.nameNp && (
                        <span style={{ color: T.textSecond, fontSize: '0.875rem' }}>{flow.nameNp}</span>
                      )}
                      <span style={S.badge(flow.active)}>{flow.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style={{ fontSize: '0.775rem', color: T.textMuted, marginBottom: '10px' }}>
                      Type: <strong style={{ color: T.textSecond }}>{flow.documentType}</strong>
                      {' · '}Language: <strong style={{ color: T.textSecond }}>{flow.language}</strong>
                      {' · '}{flow.questions?.length || 0} questions
                    </div>
                    <div>
                      {(flow.triggerKeywords || []).map(kw => (
                        <span key={kw} style={S.tag}>#{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                    <button style={S.btn('ghost', 'sm')} onClick={() => openEdit(flow)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button style={S.btn('danger', 'sm')} onClick={() => deleteFlow(flow.id, flow.name)}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

                {/* Questions preview */}
                {(flow.questions?.length > 0) && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${T.borderLight}` }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '8px' }}>
                      Questions ({flow.questions.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {flow.questions.map((q, i) => (
                        <span key={q.id} style={S.questionPill}>{i + 1}. {q.label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* ── TEST GENERATE TAB ──────────────────────────────────────────────── */}
      {activeTab === 'test' && (
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <FlaskConical size={16} color={T.greenDark} />
            <span style={{ fontWeight: 700, color: T.espresso, fontFamily: "'Playfair Display', serif" }}>
              Manual PDF Generation
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: T.textSecond, marginBottom: '1.25rem', marginTop: 0 }}>
            Test your flows by providing sample data and downloading the generated PDF.
          </p>

          <div style={S.fieldGroup}>
            <label style={S.label}>Select Flow</label>
            <select style={{ ...S.input, height: '38px' }}
              value={generateData.flowId}
              onChange={e => {
                const flow = flows.find(f => f.id === e.target.value);
                const template = {};
                if (flow) (flow.questions || []).forEach(q => { template[q.field] = `Sample ${q.label}`; });
                setGenerateData({ flowId: e.target.value, data: flow ? JSON.stringify(template, null, 2) : '{}' });
              }}>
              <option value="">— Select a flow —</option>
              {flows.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div style={S.fieldGroup}>
            <label style={S.label}>Data (JSON)</label>
            <textarea
              style={{ ...S.input, height: '180px', fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
              value={generateData.data}
              onChange={e => setGenerateData(d => ({ ...d, data: e.target.value }))}
              placeholder='{"full_name": "Ram Bahadur Thapa", "date_of_birth": "1988-06-29"}'
            />
          </div>

          <button
            style={S.btn(generating || !generateData.flowId ? 'ghost' : 'success')}
            disabled={!generateData.flowId || generating}
            onClick={generateDocument}
          >
            <Download size={14} />
            {generating ? 'Generating...' : 'Generate & Download PDF'}
          </button>
        </div>
      )}

      {/* ── SESSIONS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '0.8rem', color: T.textSecond }}>
              {sessions.length} active conversation{sessions.length !== 1 ? 's' : ''}
            </div>
            <button style={S.btn('ghost', 'sm')} onClick={fetchSessions}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {sessions.length === 0 ? (
            <div style={S.emptyCard}>
              <Users size={36} style={{ opacity: .25, marginBottom: 10 }} />
              <div style={{ fontWeight: 600, color: T.textSecond }}>No active sessions right now</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Sessions appear here when users are mid-conversation</div>
            </div>
          ) : sessions.map(s => (
            <div key={s.phoneNumber} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: T.espresso, marginBottom: '2px' }}>
                    📱 {s.phoneNumber}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: T.textMuted }}>
                    Flow: <strong style={{ color: T.textSecond }}>{s.flowId}</strong>
                    {' · '}Step {s.currentStep}
                    {' · '}Status: <strong style={{ color: T.textSecond }}>{s.status}</strong>
                  </div>
                </div>
                <span style={S.badge(s.status === 'active')}>{s.status}</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                  Collected data
                </div>
                <pre style={S.pre}>{JSON.stringify(s.collectedData, null, 2)}</pre>
              </div>
              <div style={{ fontSize: '0.7rem', color: T.textMuted, marginTop: '8px', display: 'flex', gap: '16px' }}>
                <span>Started: {new Date(s.startedAt).toLocaleString()}</span>
                <span>Last activity: {new Date(s.lastActivityAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── MODAL: Create / Edit Flow ──────────────────────────────────────── */}
      {showModal && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div style={S.modalBox}>

            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', color: T.espresso }}>
                {editingFlow ? 'Edit Flow' : 'Create New Flow'}
              </h2>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 4, borderRadius: 6, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={S.alert('error')}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* Basic info */}
            <div style={S.sectionDivider}>Basic Information</div>
            <div style={S.grid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Flow Name (English)</label>
                <input style={S.input} value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Citizenship Application" />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Flow Name (नेपाली)</label>
                <input style={S.input} value={formData.nameNp}
                  onChange={e => setFormData(f => ({ ...f, nameNp: e.target.value }))}
                  placeholder="नागरिकता आवेदन" />
              </div>
            </div>
            <div style={S.grid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Document Type</label>
                <select style={{ ...S.input, height: '38px' }} value={formData.documentType}
                  onChange={e => setFormData(f => ({ ...f, documentType: e.target.value }))}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Language</label>
                <select style={{ ...S.input, height: '38px' }} value={formData.language}
                  onChange={e => setFormData(f => ({ ...f, language: e.target.value }))}>
                  <option value="bilingual">Bilingual (EN + NP)</option>
                  <option value="en">English Only</option>
                  <option value="ne">Nepali Only</option>
                </select>
              </div>
            </div>
            <div style={{ ...S.fieldGroup, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" id="active-toggle" checked={formData.active}
                onChange={e => setFormData(f => ({ ...f, active: e.target.checked }))}
                style={{ accentColor: T.greenDark, width: 15, height: 15 }} />
              <label htmlFor="active-toggle" style={{ fontSize: '0.875rem', color: T.textSecond, cursor: 'pointer' }}>
                Flow is active (responds to trigger keywords)
              </label>
            </div>

            {/* Keywords */}
            <div style={S.sectionDivider}>Trigger Keywords</div>
            <p style={{ fontSize: '0.78rem', color: T.textMuted, marginBottom: '10px', marginTop: 0 }}>
              Users send one of these words on WhatsApp to start this flow.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input style={{ ...S.input, flex: 1 }} value={keywordInput}
                onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addKeyword()}
                placeholder="e.g. citizenship, नागरिकता" />
              <button style={S.btn('primary', 'sm')} onClick={addKeyword}>Add</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
              {(formData.triggerKeywords || []).map(kw => (
                <span key={kw} style={{ ...S.tag, cursor: 'pointer' }} onClick={() => removeKeyword(kw)}>
                  #{kw} <X size={10} />
                </span>
              ))}
            </div>

            {/* Questions */}
            <div style={S.sectionDivider}>Questions ({formData.questions.length})</div>
            {formData.questions.map((q, idx) => (
              <div key={q.id || idx} style={S.questionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: T.textSecond }}>Question {idx + 1}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button style={S.btn('ghost', 'icon')} onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}><ChevronUp size={13} /></button>
                    <button style={S.btn('ghost', 'icon')} onClick={() => moveQuestion(idx, 1)} disabled={idx === formData.questions.length - 1}><ChevronDown size={13} /></button>
                    <button style={S.btn('danger', 'icon')} onClick={() => removeQuestion(idx)}><X size={13} /></button>
                  </div>
                </div>
                <div style={S.grid2}>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Field Key</label>
                    <input style={S.input} value={q.field}
                      onChange={e => updateQuestion(idx, 'field', e.target.value)} placeholder="full_name" />
                  </div>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Validation</label>
                    <select style={{ ...S.input, height: '36px' }} value={q.validationType}
                      onChange={e => updateQuestion(idx, 'validationType', e.target.value)}>
                      {VALIDATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={S.grid2}>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Label (EN)</label>
                    <input style={S.input} value={q.label}
                      onChange={e => updateQuestion(idx, 'label', e.target.value)} placeholder="Full Name" />
                  </div>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Label (NP)</label>
                    <input style={S.input} value={q.labelNp}
                      onChange={e => updateQuestion(idx, 'labelNp', e.target.value)} placeholder="पूरा नाम" />
                  </div>
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Question (English)</label>
                  <input style={S.input} value={q.questionEn}
                    onChange={e => updateQuestion(idx, 'questionEn', e.target.value)}
                    placeholder="What is your full name?" />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Question (Nepali)</label>
                  <input style={S.input} value={q.questionNp}
                    onChange={e => updateQuestion(idx, 'questionNp', e.target.value)}
                    placeholder="तपाईंको पूरा नाम के हो?" />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: T.textSecond }}>
                  <input type="checkbox" checked={q.required}
                    onChange={e => updateQuestion(idx, 'required', e.target.checked)}
                    style={{ accentColor: T.greenDark }} />
                  Required field
                </label>
              </div>
            ))}

            <button style={{ ...S.btn('dashed'), marginBottom: '1rem' }} onClick={addQuestion}>
              <Plus size={14} /> Add Question
            </button>

            {/* Confirmation messages */}
            <div style={S.sectionDivider}>Confirmation Messages</div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Confirmation (English)</label>
              <input style={S.input} value={formData.confirmationMessageEn}
                onChange={e => setFormData(f => ({ ...f, confirmationMessageEn: e.target.value }))}
                placeholder="Thank you! All details collected. Generating your document..." />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Confirmation (Nepali)</label>
              <input style={S.input} value={formData.confirmationMessageNp}
                onChange={e => setFormData(f => ({ ...f, confirmationMessageNp: e.target.value }))}
                placeholder="धन्यवाद! सबै विवरणहरू संकलन गरिएका छन्..." />
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${T.border}` }}>
              <button style={S.btn('ghost')} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={S.btn('primary')} onClick={saveFlow} disabled={saving}>
                {saving ? 'Saving...' : editingFlow ? 'Save Changes' : 'Create Flow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}