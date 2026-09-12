import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { IconLoader } from '../../utils/icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'email' | 'google' | 'wallet';
type AuthMode = 'signin' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signUpWithEmail, signInWithEmail, signInWithWallet } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authMode === 'signup') {
        const { error: err } = await signUpWithEmail(email, password);
        if (err) { setError(err); }
        else { setSuccessMessage('Check your email for a confirmation link!'); }
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) { setError(err); }
        else { onClose(); }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWallet = async (type: 'phantom' | 'solflare') => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await signInWithWallet(type);
      if (err) { setError(err); }
      else { onClose(); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal__header">
          <h2 className="auth-modal__title">
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button className="auth-modal__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tabs__tab ${activeTab === 'email' ? 'auth-tabs__tab--active' : ''}`}
            onClick={() => { setActiveTab('email'); setError(null); }}
          >
            Email
          </button>
          <button
            className={`auth-tabs__tab ${activeTab === 'wallet' ? 'auth-tabs__tab--active' : ''}`}
            onClick={() => { setActiveTab('wallet'); setError(null); }}
          >
            Wallet
          </button>
        </div>

        {/* Error / Success */}
        {error && <div className="auth-modal__error">{error}</div>}
        {successMessage && <div className="auth-modal__success">{successMessage}</div>}

        {/* Tab Content */}
        <div className="auth-modal__body">
          {/* ── Email Tab ── */}
          {activeTab === 'email' && (
            <form className="auth-form" onSubmit={handleEmailSubmit}>
              <div className="auth-form__field">
                <label className="auth-form__label" htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  className="auth-form__input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="auth-form__field">
                <label className="auth-form__label" htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  className="auth-form__input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
              <button className="auth-form__submit" type="submit" disabled={loading}>
                {loading ? (
                  <><IconLoader style={{ width: '16px', height: '16px', marginRight: '6px' }} />Processing…</>
                ) : (
                  authMode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </button>
              <p className="auth-form__toggle">
                {authMode === 'signin' ? (
                  <>Don't have an account?{' '}
                    <button type="button" className="auth-form__toggle-btn" onClick={() => { setAuthMode('signup'); setError(null); setSuccessMessage(null); }}>
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button type="button" className="auth-form__toggle-btn" onClick={() => { setAuthMode('signin'); setError(null); setSuccessMessage(null); }}>
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </form>
          )}

          {/* ── Wallet Tab ── */}
          {activeTab === 'wallet' && (
            <div className="auth-social">
              <button
                className="auth-social__btn auth-social__btn--phantom"
                onClick={() => handleWallet('phantom')}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
                  <rect width="128" height="128" rx="26" fill="#AB9FF2"/>
                  <path d="M110.584 64.914H99.142c-1.474-23.676-21.14-42.476-45.157-42.476C29.672 22.438 10 42.682 10 67.59c0 24.908 19.672 45.152 43.985 45.152h49.339c6.552 0 11.862-5.483 11.862-12.246 0-6.763-5.31-12.247-11.862-12.247H99.57" fill="#FFFDF8"/>
                  <circle cx="42" cy="62" r="7" fill="#AB9FF2"/>
                  <circle cx="67" cy="62" r="7" fill="#AB9FF2"/>
                </svg>
                Connect Phantom
              </button>
              <button
                className="auth-social__btn auth-social__btn--solflare"
                onClick={() => handleWallet('solflare')}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#FC822B"/>
                  <path d="M12 4l2.5 5.5L20 12l-5.5 2.5L12 20l-2.5-5.5L4 12l5.5-2.5z" fill="#FFF"/>
                </svg>
                Connect Solflare
              </button>
              <p className="auth-social__hint">
                Sign a message with your Solana wallet to authenticate
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
