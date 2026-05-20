import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function UserPortalLoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/portal/otp/request', { phone });
      if (data.devCode) toast.success(`Dev OTP: ${data.devCode}`);
      else toast.success('OTP sent');
      setStep('code');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/portal/otp/verify', { phone, code });
      localStorage.setItem('wa_portal_token', data.token);
      localStorage.setItem('wa_portal_phone', data.phone);
      navigate('/portal/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--cream)' }}>
      <main className="card fade-in" style={{ width: '100%', maxWidth: 420 }} role="main">
        <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 1rem', background: 'var(--green-wa-dark)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare color="white" size={28} />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.5rem' }}>User portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View your WhatsApp conversation history</p>
        </header>

        {step === 'phone' ? (
          <form onSubmit={requestOtp}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">WhatsApp phone number</label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="977981234567" required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Enter 6-digit code</label>
              <input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & login'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <Link to="/login" style={{ color: 'var(--green-wa-dark)' }}>Admin login</Link>
        </p>
      </main>
    </div>
  );
}
