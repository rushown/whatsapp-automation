import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard',       icon: '📊', label: 'Dashboard'       },
  { path: '/send',            icon: '💬', label: 'Send Message'    },
  { path: '/templates',       icon: '📋', label: 'Templates'       },
  { path: '/automation',      icon: '⚡', label: 'Automation'      },
  { path: '/contacts',        icon: '👥', label: 'Contacts'        },
  { path: '/analytics',       icon: '📈', label: 'Analytics'       },
  { path: '/document-flows',  icon: '📄', label: 'Document Flows'  },
];

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>💬</span>
        <span style={styles.logoText}>WA Platform</span>
      </div>

      {/* Nav links */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
            })}
          >
            <span style={styles.linkIcon}>{icon}</span>
            <span style={styles.linkLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: user + logout */}
      <div style={styles.footer}>
        {user && (
          <div style={styles.userRow}>
            <div style={styles.avatar}>
              {(user.email?.[0] || 'A').toUpperCase()}
            </div>
            <span style={styles.userEmail} title={user.email}>
              {user.email}
            </span>
          </div>
        )}
        <button onClick={handleLogout} style={styles.logoutBtn}>
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
    flexShrink: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 20px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoIcon: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: 0.3,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 10px',
    gap: 2,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    background: 'rgba(37,211,102,0.15)',
    color: '#25d366',
  },
  linkIcon: {
    fontSize: 17,
    width: 22,
    textAlign: 'center',
  },
  linkLabel: {
    whiteSpace: 'nowrap',
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    padding: '14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#25d366',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  userEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    padding: '7px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
};