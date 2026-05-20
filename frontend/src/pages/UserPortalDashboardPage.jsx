import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';

export default function UserPortalDashboardPage() {
  const navigate = useNavigate();
  const phone = localStorage.getItem('wa_portal_phone');
  const [messages, setMessages] = useState([]);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem('wa_portal_token')) {
      navigate('/portal');
      return;
    }
    Promise.all([
      api.get('/portal/me/conversations'),
      api.get('/portal/me/data'),
    ]).then(([m, d]) => {
      setMessages(m.data);
      setData(d.data);
    });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('wa_portal_token');
    localStorage.removeItem('wa_portal_phone');
    navigate('/portal');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <header style={{ background: 'white', borderBottom: '1px solid var(--border-light)', padding: '1rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.25rem' }}>My conversations</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{phone}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </header>

      <main className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
        <section className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Messages</h2>
          <ul style={{ listStyle: 'none' }}>
            {messages.map((m) => (
              <li key={m.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                <span className={`badge ${m.direction === 'inbound' ? 'badge-gold' : 'badge-green'}`}>{m.direction}</span>
                <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {m.created_at && format(new Date(m.created_at), 'PPp')}
                </span>
                <p style={{ marginTop: 4 }}>{m.content}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Your saved data</h2>
          {data.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No saved data</p> : (
            <table>
              <thead><tr><th>Field</th><th>Value</th></tr></thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}><td>{row.field_label}</td><td>{row.value}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
