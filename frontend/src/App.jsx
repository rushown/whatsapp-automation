import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SendMessagePage from './pages/SendMessagePage';
import TemplatesPage from './pages/TemplatesPage';
import AutomationPage from './pages/AutomationPage';
import ContactsPage from './pages/ContactsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ApiKeysPage from './pages/ApiKeysPage';
import SettingsPage from './pages/SettingsPage';
import DocumentFlowsPage from './pages/DocumentFlowsPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--cream)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ borderColor: 'rgba(18,140,126,0.2)', borderTopColor: 'var(--green-wa-dark)', width: 40, height: 40, margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans' }}>Loading...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: 'white', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontFamily: 'DM Sans', fontSize: '0.9rem' },
            success: { iconTheme: { primary: 'var(--green-wa-dark)', secondary: 'white' } },
            error: { iconTheme: { primary: 'var(--red)', secondary: 'white' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="send" element={<SendMessagePage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="automation" element={<AutomationPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="document-flows" element={<DocumentFlowsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;