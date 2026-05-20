import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await register(form.name, form.email, form.password);
        toast.success('Account created!');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const fillAdmin = () => {
    setForm({ name: '', email: 'admin@example.com', password: 'Admin@1234' });
    setMode('login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, background: 'radial-gradient(circle, rgba(37,211,102,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', top: '40%', left: '10%', width: 6, height: 6, background: 'var(--parchment)', borderRadius: '50%', opacity: 0.8 }} />
      <div style={{ position: 'absolute', top: '20%', right: '15%', width: 4, height: 4, background: 'var(--green-wa)', borderRadius: '50%', opacity: 0.4 }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--green-wa-dark), var(--green-wa))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(18,140,126,0.25)' }}>
            <MessageSquare size={30} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: '2rem', color: 'var(--espresso)', marginBottom: '0.25rem' }}>WAutomate</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>WhatsApp Automation Platform</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius-lg)' }}>
          {/* Tab */}
          <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: 3, marginBottom: '1.5rem' }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 6,
                  border: 'none',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: mode === m ? 600 : 400,
                  fontSize: '0.9rem',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? <div className="spinner" /> : null}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && import.meta.env.DEV && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dev login</p>
              <button type="button" onClick={fillAdmin} style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem', background: 'white', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                Fill admin@example.com
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Local: admin@example.com / Admin@1234</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}