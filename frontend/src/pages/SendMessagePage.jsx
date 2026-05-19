import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, Image, Wand2, Clock, CheckCircle, XCircle, Bot } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TAB_TYPES = [
  { id: 'text', label: 'Text', icon: MessageSquare },
  { id: 'template', label: 'Template', icon: Clock },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'ai', label: 'AI Reply', icon: Bot },
];

export default function SendMessagePage() {
  const [tab, setTab] = useState('text');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({ to: '', message: '', templateName: '', languageCode: 'en_US', mediaType: 'image', mediaUrl: '', caption: '', aiInput: '', aiContext: '' });
  const [aiReply, setAiReply] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    api.get('/whatsapp/messages').then(r => setMessages(r.data)).catch(() => {});
    api.get('/templates').then(r => setTemplates(r.data)).catch(() => {});
    api.get('/contacts').then(r => setContacts(r.data)).catch(() => {});
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handlePhoneInput = (val) => {
    const filtered = contacts.filter(c =>
      c.phone.includes(val) || c.name.toLowerCase().includes(val.toLowerCase())
    );
    setSuggestions(val.length > 1 ? filtered.slice(0, 5) : []);
    setForm(p => ({ ...p, to: val }));
  };

  const sendMessage = async () => {
    if (!form.to) { toast.error('Phone number is required'); return; }
    setLoading(true);
    try {
      if (tab === 'text') {
        if (!form.message) { toast.error('Message is required'); return; }
        await api.post('/whatsapp/send', { to: form.to, message: form.message, type: 'text' });
      } else if (tab === 'template') {
        if (!form.templateName) { toast.error('Template name is required'); return; }
        await api.post('/whatsapp/send-template', { to: form.to, templateName: form.templateName, languageCode: form.languageCode });
      } else if (tab === 'media') {
        if (!form.mediaUrl) { toast.error('Media URL is required'); return; }
        await api.post('/whatsapp/send-media', { to: form.to, mediaType: form.mediaType, mediaUrl: form.mediaUrl, caption: form.caption });
      }
      toast.success('Message sent successfully!');
      const msgs = await api.get('/whatsapp/messages');
      setMessages(msgs.data);
      setForm(p => ({ ...p, message: '', mediaUrl: '', caption: '' }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const generateAIReply = async () => {
    if (!form.aiInput) { toast.error('Enter an incoming message'); return; }
    setLoading(true);
    try {
      const res = await api.post('/whatsapp/ai-reply', { incomingMessage: form.aiInput, context: form.aiContext });
      setAiReply(res.data.reply);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate AI reply');
    } finally {
      setLoading(false);
    }
  };

  const sendAIReply = async () => {
    if (!form.to || !aiReply) { toast.error('Phone number and AI reply are required'); return; }
    setLoading(true);
    try {
      await api.post('/whatsapp/send', { to: form.to, message: aiReply, type: 'text' });
      toast.success('AI reply sent!');
      setAiReply('');
      const msgs = await api.get('/whatsapp/messages');
      setMessages(msgs.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Send Message</h1>
          <p className="page-subtitle">Send WhatsApp messages via Meta Business API</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Compose */}
        <div className="card">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            {TAB_TYPES.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.875rem',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                fontWeight: tab === id ? 600 : 400,
                background: tab === id ? 'var(--green-wa-dark)' : 'transparent',
                color: tab === id ? 'white' : 'var(--text-muted)',
                transition: 'all 0.2s ease'
              }}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Phone */}
            {tab !== 'ai' && (
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Recipient Phone Number</label>
                <input
                  className="form-input"
                  placeholder="e.g. 919876543210 (with country code, no +)"
                  value={form.to}
                  onChange={e => handlePhoneInput(e.target.value)}
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow)', zIndex: 10, marginTop: 2 }}>
                    {suggestions.map(c => (
                      <button key={c.id} onClick={() => { setForm(p => ({ ...p, to: c.phone })); setSuggestions([]); }}
                        style={{ width: '100%', textAlign: 'left', padding: '0.6rem 1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', gap: '0.5rem' }}>
                        <strong>{c.name}</strong> <span style={{ color: 'var(--text-muted)' }}>{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'text' && (
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" name="message" rows={5} placeholder="Type your message here..." value={form.message} onChange={handleChange} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>{form.message.length} chars</span>
              </div>
            )}

            {tab === 'template' && (
              <>
                <div className="form-group">
                  <label className="form-label">Template Name</label>
                  <input className="form-input" name="templateName" placeholder="e.g. hello_world" value={form.templateName} onChange={handleChange} list="template-list" />
                  <datalist id="template-list">
                    {templates.map(t => <option key={t.id} value={t.name} />)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label className="form-label">Language Code</label>
                  <select className="form-input" name="languageCode" value={form.languageCode} onChange={handleChange}>
                    <option value="en_US">English (US)</option>
                    <option value="en_GB">English (UK)</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ar">Arabic</option>
                    <option value="pt_BR">Portuguese (Brazil)</option>
                  </select>
                </div>
                <div className="alert alert-info">
                  Templates must be approved by Meta before use. Use exact template names from your Business Manager.
                </div>
              </>
            )}

            {tab === 'media' && (
              <>
                <div className="form-group">
                  <label className="form-label">Media Type</label>
                  <select className="form-input" name="mediaType" value={form.mediaType} onChange={handleChange}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="document">Document</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Media URL</label>
                  <input className="form-input" name="mediaUrl" placeholder="https://example.com/media.jpg" value={form.mediaUrl} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Caption (optional)</label>
                  <input className="form-input" name="caption" placeholder="Add a caption..." value={form.caption} onChange={handleChange} />
                </div>
              </>
            )}

            {tab === 'ai' && (
              <>
                <div className="alert alert-info">
                  Use Groq AI to generate intelligent replies. Configure your Groq API key in Settings first.
                </div>
                <div className="form-group">
                  <label className="form-label">Incoming Message</label>
                  <textarea className="form-textarea" name="aiInput" rows={3} placeholder="Paste the customer's message here..." value={form.aiInput} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Context (optional)</label>
                  <input className="form-input" name="aiContext" placeholder="e.g. We are a clothing store. Be friendly." value={form.aiContext} onChange={handleChange} />
                </div>
                <button onClick={generateAIReply} disabled={loading} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                  {loading ? <div className="spinner" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: 'var(--text-secondary)' }} /> : <Wand2 size={15} />}
                  Generate Reply
                </button>
                {aiReply && (
                  <>
                    <div style={{ background: 'var(--cream)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Generated Reply</p>
                      {aiReply}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Send To</label>
                      <input className="form-input" placeholder="Phone number (with country code)" value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} />
                    </div>
                    <button onClick={sendAIReply} disabled={loading} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                      <Send size={15} /> Send AI Reply
                    </button>
                  </>
                )}
              </>
            )}

            {tab !== 'ai' && (
              <button onClick={sendMessage} disabled={loading} className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start', minWidth: 160 }}>
                {loading ? <div className="spinner" /> : <Send size={16} />}
                Send Message
              </button>
            )}
          </div>
        </div>

        {/* Message History */}
        <div className="card" style={{ maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--espresso)' }}>Message History</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <MessageSquare size={36} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No messages yet</p>
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} style={{
                padding: '0.75rem',
                background: msg.direction === 'outbound' ? 'rgba(18,140,126,0.06)' : 'var(--cream)',
                borderRadius: 8,
                border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: msg.direction === 'outbound' ? 'var(--green-wa-dark)' : 'var(--text-secondary)' }}>
                    {msg.direction === 'outbound' ? `→ ${msg.to}` : `← ${msg.from || 'Unknown'}`}
                  </span>
                  {msg.status === 'sent' ? <CheckCircle size={12} color="var(--green-wa-dark)" /> : <XCircle size={12} color="var(--red)" />}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.25rem', wordBreak: 'break-word' }}>{msg.message}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}