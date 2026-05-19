import React, { useState } from 'react';
import { Settings, User, Lock, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name, email });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return toast.error('Fill in both password fields');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--border-light)', borderRadius: 8, fontFamily: 'DM Sans', fontSize: '0.9rem', background: 'var(--cream)', boxSizing: 'border-box' };
  const cardStyle = { background: 'white', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--border-light)', marginBottom: '1.5rem' };

  return (
    <div style={{ padding: '2rem', maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <Settings size={24} color="var(--green-wa-dark)" />
        <h1 style={{ fontFamily: 'Playfair Display', fontSize: '1.8rem', margin: 0 }}>Settings</h1>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <User size={18} color="var(--green-wa-dark)" />
          <h2 style={{ fontFamily: 'DM Sans', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Profile</h2>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={handleSaveProfile} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', background: 'var(--green-wa-dark)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 500 }}>
          <Save size={15} /> Save Profile
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Lock size={18} color="var(--green-wa-dark)" />
          <h2 style={{ fontFamily: 'DM Sans', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Change Password</h2>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>Current Password</label>
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={handleChangePassword} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem', background: 'var(--green-wa-dark)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 500 }}>
          <Lock size={15} /> Change Password
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;