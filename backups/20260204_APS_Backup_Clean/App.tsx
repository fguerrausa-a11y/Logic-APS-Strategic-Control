
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SchedulePage from './pages/Schedule';
import SimulationPage from './pages/Simulation';
import LoadAnalysisPage from './pages/LoadAnalysis';
import SettingsPage from './pages/Settings';
import DataExplorer from './pages/DataExplorer';
import OutputsPage from './pages/Outputs';
import BuffersPage from './pages/Buffers';
import AnalyticsPage from './pages/Analytics';
import AuthPage from './pages/Auth';
import { Session } from '@supabase/supabase-js';
import { LanguageProvider } from './services/languageService';

const App: React.FC = () => {
  // Mock session for development/debugging to bypass Login
  const [session, setSession] = useState<Session | null>({
    access_token: 'mock',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'mock',
    user: {
      id: 'mock-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'planner@logic-aps.com',
      app_metadata: {},
      user_metadata: { full_name: 'Jefe de Planta' },
      created_at: new Date().toISOString()
    }
  } as Session);

  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'sans-serif'
      }}>
        Cargando APS Logic...
      </div>
    );
  }

  return (
    <LanguageProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/load" element={<LoadAnalysisPage />} />
          <Route path="/data-explorer" element={<DataExplorer />} />
          <Route path="/outputs" element={<OutputsPage />} />
          <Route path="/buffers" element={<BuffersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </LanguageProvider>
  );
};

export default App;
