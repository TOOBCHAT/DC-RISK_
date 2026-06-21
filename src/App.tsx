import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ResultsPanel } from './components/ResultsPanel';
import { HowItWorks } from './components/HowItWorks';
import { ExtensionCTA } from './components/ExtensionCTA';
import { Footer } from './components/Footer';
import { useTokenScan } from './hooks/useTokenScan';

const App: React.FC = () => {
  const {
    status,
    error,
    secProfile,
    rawReport,
    scoredResult,
    scanToken,
    reset,
  } = useTokenScan();

  const isActive = status === 'success' || status === 'loading';

  const handleLinkClick = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const clearAndReset = () => {
    reset();
  };

  return (
    <div className={`app ${isActive ? 'app--active' : 'app--idle'}`}>
      {isActive ? (
        <>
          {/* ── DASHBOARD MODE ── */}
          <div className="dashboard-header">
            <a href="#" className="dashboard-header__logo" onClick={(e) => { e.preventDefault(); clearAndReset(); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', opacity: 0.5 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              DC-RISK
            </a>

            <Hero
              status={status}
              error={error}
              onScan={scanToken}
              onClearError={() => reset()}
              compact
            />

            <a
              href="https://github.com/nextlevelbuilder/dex-risk-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-header__github"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>

          <div className="dashboard-body">
            {status === 'loading' && (
              <div className="dashboard-loading">
                <div className="loading loading--visible" id="loading-state">
                  <div className="loading__container">
                    <div className="skeleton skeleton--gauge"></div>
                    <div className="skeleton skeleton--text" style={{ width: '40%', margin: '0 auto 2rem' }}></div>
                    <div className="loading__cards">
                      <div className="skeleton skeleton--card"></div>
                      <div className="skeleton skeleton--card"></div>
                      <div className="skeleton skeleton--card"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'success' && secProfile && scoredResult && (
              <ResultsPanel
                secProfile={secProfile}
                rawReport={rawReport}
                scoredResult={scoredResult}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── IDLE / LANDING MODE ── */}
          <Navbar onLinkClick={handleLinkClick} />

          <main>
            <Hero
              status={status}
              error={error}
              onScan={scanToken}
              onClearError={() => reset()}
            />

            <HowItWorks />
            <ExtensionCTA />
          </main>

          <Footer />
        </>
      )}
    </div>
  );
};

export default App;
