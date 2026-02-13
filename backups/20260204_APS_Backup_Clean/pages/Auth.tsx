
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from '../services/languageService';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        alert(t('registration_success'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-section">
            <div className="logo-icon">APS</div>
            <h1>APS Logic</h1>
          </div>
          <p>{isLogin ? t('welcome_back') : t('create_account')}</p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {!isLogin && (
            <div className="input-group">
              <label>{t('full_name')}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            </div>
          )}

          <div className="input-group">
            <label>{t('email_address')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </div>

          <div className="input-group">
            <label>{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? t('processing') : isLogin ? t('login') : t('signup')}
          </button>
        </form>

        <div className="auth-footer">
          <button onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
            {isLogin ? t('no_account_signup') : t('have_account_login')}
          </button>
        </div>
      </div>

      <style>{`
        .auth-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top left, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          font-family: 'Inter', sans-serif;
        }

        .auth-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          padding: 3rem;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
          max-width: 440px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 0.5rem;
        }

        .logo-icon {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          padding: 8px 12px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 1.2rem;
          box-shadow: 0 0 20px rgba(79, 70, 229, 0.4);
        }

        h1 {
          color: white;
          font-size: 1.8rem;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .auth-header p {
          color: rgba(255, 255, 255, 0.5);
          margin-top: 0.5rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          font-weight: 500;
          margin-left: 4px;
        }

        .input-group input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.8rem 1rem;
          color: white;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .input-group input:focus {
          outline: none;
          border-color: #4f46e5;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        }

        .auth-button {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
        }

        .auth-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .auth-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .error-message {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          padding: 0.8rem;
          border-radius: 8px;
          font-size: 0.85rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .auth-footer {
          margin-top: 2rem;
          text-align: center;
        }

        .toggle-auth {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          cursor: pointer;
          transition: color 0.2s;
        }

        .toggle-auth:hover {
          color: white;
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
