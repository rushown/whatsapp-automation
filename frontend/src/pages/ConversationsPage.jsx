import React, { useState, useEffect } from 'react';
import { Search, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';

export default function ConversationsPage() {
  const [messages, setMessages] = useState([]);
  const [collected, setCollected] = useState([]);
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (phone) params.phone = phone;
    if (search) params.search = search;
    Promise.all([
      api.get('/conversations/messages', { params }),
      api.get('/conversations/collected-data', { params: phone ? { phone } : {} }),
    ])
      .then(([m, c]) => {
        setMessages(m.data);
        setCollected(c.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Conversations</h1>
          <p className="page-subtitle">Message log and collected user data</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: '1 1 200px' }}>
          <label className="form-label">Phone filter</label>
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="97798..." />
        </div>
        <div className="form-group" style={{ flex: '2 1 240px' }}>
          <label className="form-label">Search content</label>
          <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." />
        </div>
        <button type="button" className="btn btn-primary" onClick={load}>
          <Search size={16} /> Search
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <section className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={18} /> Messages
          </h3>
          {loading ? <p>Loading...</p> : messages.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No messages</p>
          ) : (
            <ul style={{ listStyle: 'none', maxHeight: 480, overflow: 'auto' }}>
              {messages.map((m) => (
                <li key={m.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span className={m.direction === 'inbound' ? 'badge badge-gold' : 'badge badge-green'}>{m.direction}</span>
                    <span>{m.created_at && format(new Date(m.created_at), 'MMM d HH:mm')}</span>
                  </div>
                  <p style={{ marginTop: 4 }}>{m.content}</p>
                  {m.intents && <small>Intent: {m.intents.name} ({m.intent_score?.toFixed?.(2)})</small>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3 style={{ marginBottom: '1rem' }}>Collected data</h3>
          {collected.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No collected fields</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Phone</th><th>Field</th><th>Value</th></tr>
                </thead>
                <tbody>
                  {collected.map((row) => (
                    <tr key={row.id}>
                      <td>{row.phone}</td>
                      <td>{row.field_label || row.field_key}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
