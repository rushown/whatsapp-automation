import React, { useState, useEffect } from 'react';
import { Save, Bot, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function BotSettingsPage() {
  const [cfg, setCfg] = useState({
    default_intent_threshold: 0.78,
    ai_provider: 'groq',
    ai_system_prompt: '',
    elevenlabs_voice_id: '',
    elevenlabs_stability: 0.5,
    elevenlabs_similarity_boost: 0.75,
    meta_phone_number_id: '',
  });
  const [secrets, setSecrets] = useState({
    metaToken: '',
    groqApiKey: '',
    deepseekApiKey: '',
    openaiApiKey: '',
    elevenlabsApiKey: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/bot-config').then((r) => setCfg((c) => ({ ...c, ...r.data }))).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/bot-config', { ...cfg, ...secrets });
      toast.success('Settings saved');
      setSecrets({ metaToken: '', groqApiKey: '', deepseekApiKey: '', openaiApiKey: '', elevenlabsApiKey: '' });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Bot settings</h1>
          <p className="page-subtitle">AI provider, voice, thresholds, and API credentials</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </header>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Bot size={18} /> AI & matching</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Default intent threshold</label>
            <input type="number" step="0.01" className="form-input" value={cfg.default_intent_threshold} onChange={(e) => setCfg({ ...cfg, default_intent_threshold: parseFloat(e.target.value) })} />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">AI provider (Groq / DeepSeek)</label>
            <select className="form-input" value={cfg.ai_provider} onChange={(e) => setCfg({ ...cfg, ai_provider: e.target.value })}>
              <option value="groq">Groq</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Human-like system prompt</label>
            <textarea className="form-textarea" rows={5} value={cfg.ai_system_prompt || ''} onChange={(e) => setCfg({ ...cfg, ai_system_prompt: e.target.value })} placeholder="Warm, natural WhatsApp assistant..." />
          </div>
        </section>

        <section className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Mic size={18} /> ElevenLabs voice</h3>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Voice ID</label>
            <input className="form-input" value={cfg.elevenlabs_voice_id || ''} onChange={(e) => setCfg({ ...cfg, elevenlabs_voice_id: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Stability</label>
            <input type="number" step="0.05" className="form-input" value={cfg.elevenlabs_stability} onChange={(e) => setCfg({ ...cfg, elevenlabs_stability: parseFloat(e.target.value) })} />
          </div>
          <div className="form-group">
            <label className="form-label">Similarity boost</label>
            <input type="number" step="0.05" className="form-input" value={cfg.elevenlabs_similarity_boost} onChange={(e) => setCfg({ ...cfg, elevenlabs_similarity_boost: parseFloat(e.target.value) })} />
          </div>
        </section>

        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1rem' }}>API keys (leave blank to keep existing)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {[
              ['metaToken', 'Meta WhatsApp token'],
              ['openaiApiKey', 'OpenAI (embeddings)'],
              ['groqApiKey', 'Groq API key'],
              ['deepseekApiKey', 'DeepSeek API key'],
              ['elevenlabsApiKey', 'ElevenLabs API key'],
            ].map(([key, label]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input type="password" className="form-input" value={secrets[key]} onChange={(e) => setSecrets({ ...secrets, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="form-group" style={{ marginTop: '1rem', maxWidth: 400 }}>
            <label className="form-label">Meta phone number ID</label>
            <input className="form-input" value={cfg.meta_phone_number_id || ''} onChange={(e) => setCfg({ ...cfg, meta_phone_number_id: e.target.value })} />
          </div>
        </section>
      </div>
    </div>
  );
}
