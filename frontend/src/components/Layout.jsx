import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Send, FileText, Zap, Users, BarChart3,
  Key, Settings, LogOut, MessageSquare, Menu, X, ChevronRight,
  FileOutput, Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/intents', icon: Target, label: 'Intents', admin: true },
  { path: '/conversations', icon: MessageSquare, label: 'Conversations', admin: true },
  { path: '/users', icon: Users, label: 'Users', admin: true },
  { path: '/bot-settings', icon: Settings, label: 'Bot settings', admin: true },
  { path: '/send', icon: Send, label: 'Send Message' },
  { path: '/templates', icon: FileText, label: 'Templates' },
  { path: '/automation', icon: Zap, label: 'Automation' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/api-keys', icon: Key, label: 'API Keys' },
  { path: '/document-flows', icon: FileOutput, label: 'Document Flows' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99, display: 'none' }}
          className="mobile-overlay"
        />
      )}

      {/* Mobile Header */}
      <header style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'white', borderBottom: '1px solid var(--border-light)',
        padding: '0.875rem 1rem', alignItems: 'center', justifyContent: 'space-between'
      }} className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 32, height: 32, background: 'var(--green-wa-dark)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="white" />
          </div>
          <span style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: '1.1rem' }}>WAutomate</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', padding: 4 }}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)',
        background: 'white',
        borderRight: '1px solid var(--border-light)',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--green-wa-dark), var(--green-wa))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(18,140,126,0.3)' }}>
              <MessageSquare size={22} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Playfair Display', fontWeight: 700, fontSize: '1.125rem', color: 'var(--espresso)' }}>WAutomate</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>WhatsApp Platform</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.filter((item) => !item.admin || user?.role === 'admin').map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9375rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--green-wa-dark)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(18,140,126,0.08)' : 'transparent',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <ChevronRight size={14} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-sm)', background: 'var(--cream)', marginBottom: '0.5rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brown), var(--brown-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="page-container" style={{ maxWidth: '100%' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
          .mobile-overlay { display: block !important; }
          aside {
            transform: translateX(${mobileOpen ? '0' : '-100%'});
            transition: transform 0.3s ease;
            top: 0 !important;
          }
          .main-content { margin-left: 0 !important; padding-top: 56px; }
        }
      `}</style>
    </div>
  );
}