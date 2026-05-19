import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, MessageSquare, Users, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../lib/api';

const COLORS = ['#128c7e', '#c9a84c', '#3182ce', '#805ad5', '#e53e3e'];

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Analytics</h1></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: 100, background: 'var(--cream-dark)', borderRadius: 'var(--radius)', animation: 'pulse 1.5s infinite' }} />)}
      </div>
    </div>
  );

  const kpis = [
    { label: 'Messages Sent', value: stats?.messagesSent || 0, icon: MessageSquare, color: 'var(--green-wa-dark)', bg: 'rgba(18,140,126,0.1)' },
    { label: 'Total Contacts', value: stats?.totalContacts || 0, icon: Users, color: '#3182ce', bg: 'rgba(49,130,206,0.1)' },
    { label: 'Automation Runs', value: stats?.automationRuns || 0, icon: Zap, color: '#c9a84c', bg: 'rgba(201,168,76,0.1)' },
    { label: 'Delivery Rate', value: `${stats?.deliveryRate || 0}%`, icon: TrendingUp, color: '#805ad5', bg: 'rgba(128,90,213,0.1)' },
  ];

  const pieData = [
    { name: 'Sent', value: stats?.messagesSent || 0 },
    { name: 'Received', value: stats?.messagesReceived || 0 },
  ].filter(d => d.value > 0);

  const rateData = [
    { name: 'Delivery', value: stats?.deliveryRate || 0, fill: 'var(--green-wa-dark)' },
    { name: 'Open Rate', value: stats?.openRate || 0, fill: '#3182ce' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track your WhatsApp messaging performance</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div className="stat-value" style={{ color: 'var(--espresso)' }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Bar chart - messages per day */}
        <div className="card">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem', color: 'var(--espresso)', marginBottom: '1.25rem' }}>Daily Message Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.volumeByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.85rem' }} />
              <Bar dataKey="sent" name="Sent" fill="var(--green-wa-dark)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Received" fill="#c9a84c" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem', color: 'var(--espresso)', marginBottom: '1.25rem' }}>Message Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ height: 220 }}>
              <BarChart3 size={36} style={{ opacity: 0.3 }} />
              <p>No message data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Trend line */}
        <div className="card">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem', color: 'var(--espresso)', marginBottom: '1.25rem' }}>7-Day Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats?.volumeByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="sent" stroke="var(--green-wa-dark)" strokeWidth={2.5} dot={{ r: 4 }} name="Sent" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rates */}
        <div className="card">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.1rem', color: 'var(--espresso)', marginBottom: '1.5rem' }}>Engagement Rates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rateData.map(r => (
              <div key={r.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{r.name}</span>
                  <span style={{ fontWeight: 700, color: r.fill }}>{r.value}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--cream-darker)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.value}%`, background: r.fill, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Total Templates', value: stats?.totalTemplates || 0 },
                { label: 'Active Automations', value: stats?.activeAutomations || 0 },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontFamily: 'Playfair Display', fontSize: '1.5rem', fontWeight: 700, color: 'var(--espresso)' }}>{value}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}