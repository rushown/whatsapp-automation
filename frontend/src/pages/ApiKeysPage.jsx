import React, { useState, useEffect } from 'react';
import { Key, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const ApiKeysPage = () => {
  const [keys, setKeys] = useState({
    whatsappToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    groqApiKey: '',
    webhookVerifyToken: '',
  });
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/keys').then(res => setKeys(res.data)).catch(() => {});
  }, []);

  const toggle = (k) => setShow(p => ({ ...p, [k]: !p[k] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/keys', keys);
      toast.success('API keys saved!');
    } catch {
      toast.error('Failed to save keys');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'whatsappToken', label: 'WhatsApp Access Token' },
    { key: 'phoneNumberId', label: 'Phone Number ID' },
    { key: 'businessAccountId', label: 'Business Account ID' },
    { key: 'groqApiKey', label: 'Groq API Key' },
    { key: 'webhookVerifyToken', label: 'Webhook Verify Token' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Key size={24} color="var(--green-wa-dark)" />
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.8rem', margin: 0 }}>API Keys</h1>
      </div>
      <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border-light)' }}>
        {fields.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>{label}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type={show[key] ? 'text' : 'password'}
                value={keys[key] || ''}
                onChange={e => setKeys(p => ({ ...p, [key]: e.target.value }))}
                placeholder={`Enter ${label}`}
                style={{ flex: 1, padding: '0.6rem 0.9rem', border: '1px solid var(--border-light)', borderRadius: 8, fontFamily: 'DM Mono', fontSize: '0.85rem', background: 'var(--cream)' }}
              />
              <button onClick={() => toggle(key)} style={{ padding: '0.6rem 0.9rem', border: '1px solid var(--border-light)', borderRadius: 8, background: 'white', cursor: 'pointer' }}>
                {show[key] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'var(--green-wa-dark)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 500, marginTop: '0.5rem' }}
        >
          {saving ? <Save size={16} /> : <CheckCircle size={16} />}
          {saving ? 'Saving...' : 'Save Keys'}
        </button>
      </div>
    </div>
  );
};

export default ApiKeysPage;