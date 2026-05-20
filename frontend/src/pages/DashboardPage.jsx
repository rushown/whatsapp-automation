import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, Zap, FileText, Send, TrendingUp, ArrowRight, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(res => setStats(res.data))
      .catch(() => setStats({ totalMessages: 0, messagesSent: 0, messagesReceived: 0, totalContacts: 0, activeAutomations: 0, totalAutomations: 0, totalTemplates: 0, automationRuns: 0, volumeByDay: [], deliveryRate: 0, openRate: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    { label: 'Messages Handled', value: stats?.totalMessages || 0, icon: MessageSquare, color: '#128c7e', bg: 'rgba(18,140,126,0.1)' },
    { label: 'Intents Matched', value: stats?.intentsMatched || 0, icon: TrendingUp, color: '#3182ce', bg: 'rgba(49,130,206,0.1)' },
    { label: 'Voice Messages', value: stats?.voiceMessagesSent || 0, icon: Send, color: '#c9a84c', bg: 'rgba(201,168,76,0.1)' },
    { label: 'Silent (no match)', value: stats?.silentIgnored || 0, icon: Activity, color: '#805ad5', bg: 'rgba(128,90,213,0.1)' },
  ];

  const quickActions = [
    { to: '/send', label: 'Send Message', desc: 'Send WhatsApp messages', icon: Send, color: 'var(--green-wa-dark)' },
    { to: '/contacts', label: 'Add Contacts', desc: 'Manage your contact list', icon: Users, color: '#3182ce' },
    { to: '/automation', label: 'New Automation', desc: 'Create workflow automations', icon: Zap, color: '#c9a84c' },
    { to: '/api-keys', label: 'Configure API', desc: 'Set up your API keys', icon: Activity, color: '#e53e3e' },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.875rem', color: 'var(--espresso)', marginBottom: '0.25rem' }}>
          {greeting()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Here's your WhatsApp automation overview for today, {format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ animation: 'fadeIn 0.4s ease' }}>
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div className="stat-value" style={{ color: 'var(--espresso)' }}>
                {loading ? <div style={{ width: 60, height: 28, background: 'var(--cream-darker)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} /> : value.toLocaleString()}
              </div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Quick Actions */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.125rem', color: 'var(--espresso)' }}>Message Volume</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 7 days</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 3, background: 'var(--green-wa-dark)', borderRadius: 2, display: 'inline-block' }} /> Sent</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 3, background: '#c9a84c', borderRadius: 2, display: 'inline-block' }} /> Received</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats?.volumeByDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: '0.85rem' }} />
              <Line type="monotone" dataKey="sent" stroke="var(--green-wa-dark)" strokeWidth={2} dot={{ r: 3, fill: 'var(--green-wa-dark)' }} name="Sent" />
              <Line type="monotone" dataKey="received" stroke="#c9a84c" strokeWidth={2} dot={{ r: 3, fill: '#c9a84c' }} name="Received" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Performance */}
        <div className="card">
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.125rem', color: 'var(--espresso)', marginBottom: '1.25rem' }}>Performance</h3>
          {[
            { label: 'Delivery Rate', value: stats?.deliveryRate || 0, color: 'var(--green-wa-dark)' },
            { label: 'Open Rate', value: stats?.openRate || 0, color: '#3182ce' },
            { label: 'Automation Runs', value: stats?.automationRuns || 0, color: '#c9a84c', isCount: true },
          ].map(({ label, value, color, isCount }) => (
            <div key={label} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{isCount ? value : `${value}%`}</span>
              </div>
              {!isCount && (
                <div style={{ height: 6, background: 'var(--cream-darker)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
              )}
            </div>
          ))}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Messages</span>
              <span style={{ fontWeight: 700 }}>{stats?.totalMessages || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.125rem', color: 'var(--espresso)' }}>Quick Actions</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {quickActions.map(({ to, label, desc, icon: Icon, color }) => (
            <Link key={to} to={to} style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)', textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}