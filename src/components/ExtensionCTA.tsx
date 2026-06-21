import React from 'react';
import { IconGithub } from '../utils/icons';

export const ExtensionCTA: React.FC = () => {
  return (
    <section className="extension-cta" id="extension">
      <div className="extension-cta__card">
        <div className="extension-cta__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <h2 className="extension-cta__title">Analyze directly on DexScreener</h2>
        <p className="extension-cta__desc">
          Get risk indicators directly inside the DexScreener UI. Inspect LP percentages, mint authorities, and whale transactions without leaving your charts.
        </p>
        <a
          href="https://github.com/nextlevelbuilder/dex-risk-extension"
          target="_blank"
          rel="noopener noreferrer"
          className="extension-cta__btn"
          id="extension-github-btn"
        >
          <IconGithub style={{ width: '18px', height: '18px' }} />
          View on GitHub
        </a>
      </div>
    </section>
  );
};
