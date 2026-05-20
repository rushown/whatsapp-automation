import React, { useState, useEffect } from 'react';
import { Ban, Download, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/users/whatsapp', { params: search ? { search } : {} })
      .then((r) => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleBlock = async (id, blocked) => {
    try {
      await api.patch(`/users/whatsapp/${id}/block`, { blocked: !blocked });
      toast.success(blocked ? 'User unblocked' : 'User blocked');
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  const exportData = async (phone) => {
    try {
      const { data } = await api.get(`/users/whatsapp/${phone}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-${phone}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">WhatsApp users</h1>
          <p className="page-subtitle">View, block, or export end-user data</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 320 }} placeholder="Search phone or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="button" className="btn btn-primary" onClick={load}>Search</button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <div className="empty-state card">
          <Users size={40} style={{ opacity: 0.3 }} />
          <p>No WhatsApp users yet</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Phone</th>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.phone}</td>
                  <td>{u.display_name || '—'}</td>
                  <td>{u.blocked ? <span className="badge badge-red">Blocked</span> : <span className="badge badge-green">Active</span>}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleBlock(u.id, u.blocked)}>
                      <Ban size={14} /> {u.blocked ? 'Unblock' : 'Block'}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportData(u.phone)}>
                      <Download size={14} /> Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
