import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <p className="footer__text">
        DC-RISK &mdash; On-chain security analysis for Solana tokens
      </p>
      <div className="footer__links">
        <a 
          href="https://github.com/TOOBCHAT/dex-risk-extension" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
};
