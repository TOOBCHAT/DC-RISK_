import React from 'react';
import { IconGithub } from '../utils/icons';

interface NavbarProps {
  onLinkClick: (targetId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLinkClick }) => {
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
      <a
        href="https://github.com/nextlevelbuilder/dex-risk-extension"
        target="_blank"
        rel="noopener noreferrer"
        className="navbar__github-btn"
        id="nav-github-btn"
      >
        <IconGithub style={{ verticalAlign: 'middle', marginRight: '4px' }} />
        GitHub
      </a>
    </nav>
  );
};
