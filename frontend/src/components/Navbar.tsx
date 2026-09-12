import React from 'react';
import { useAuth } from './auth/AuthProvider';

interface NavbarProps {
  onLinkClick: (targetId: string) => void;
  onAuthClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLinkClick, onAuthClick }) => {
  const { user, signOut } = useAuth();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    onLinkClick(targetId);
  };

  return (
    <nav className="navbar" id="navbar">
      <a href="#" className="navbar__logo" onClick={(e) => handleClick(e, 'hero')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, verticalAlign: 'middle', marginRight: '6px' }}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        DC-RISK
      </a>
      <ul className="navbar__links">
        <li>
          <a href="#how-it-works" onClick={(e) => handleClick(e, 'how-it-works')}>
            How It Works
          </a>
        </li>
        <li>
          <a href="#extension" onClick={(e) => handleClick(e, 'extension')}>
            Extension
          </a>
        </li>
      </ul>

      {user ? (
        <div className="navbar__user" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user.email && user.email.endsWith('@wallet.local') ? (
            <span className="navbar__user-email" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              Connected
            </span>
          ) : (
            <span className="navbar__user-email">
              {user.email || 'Connected'}
            </span>
          )}
          <button className="navbar__auth-btn" onClick={signOut}>
            Sign Out
          </button>
          <button 
            className="navbar__auth-btn" 
            style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}
            onClick={async () => {
              if (window.confirm('WARNING: This will permanently delete your account, history, and all data. Are you sure?')) {
                try {
                  const { deleteAccount } = await import('../lib/api');
                  await deleteAccount();
                  await signOut();
                  window.location.reload();
                } catch (err) {
                  console.error('Failed to delete account', err);
                  alert('Failed to delete account. See console for details.');
                }
              }
            }}
          >
            Delete Account
          </button>
        </div>
      ) : (
        <button className="navbar__auth-btn" onClick={onAuthClick}>
          Sign In
        </button>
      )}
    </nav>
  );
};
