import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { ExtensionCTA } from './components/ExtensionCTA';
import { Footer } from './components/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { useAuth } from './components/auth/AuthProvider';
import { useAnalysis } from './hooks/useAnalysis';
import { AIResultsPanel } from './components/dashboard/AIResultsPanel';
import { AgentStream } from './components/dashboard/AgentStream';
import { SearchHistory } from './components/history/SearchHistory';
import type { RiskReport, AgentLogEntry } from './types';

// ─── Landing Page ───────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const { status, error, analyzeToken, reset } = useAnalysis();

  const handleScan = (address: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    // Navigate to dashboard with the address
    navigate(`/dashboard?token=${encodeURIComponent(address)}`);
  };

  const handleLinkClick = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="app app--idle">
      <Navbar onLinkClick={handleLinkClick} onAuthClick={() => setShowAuth(true)} />
      <main>
        <Hero
          status={status}
          error={error}
          onScan={handleScan}
          onClearError={() => reset()}
        />
        <HowItWorks />
        <ExtensionCTA />
      </main>
      <Footer />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

// ─── Dashboard Page ─────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    status,
    error,
    agentLogs,
    report,
    analyzeToken,
    loadFromHistory,
    reset,
  } = useAnalysis();

  // Auto-analyze if token was passed via URL
  React.useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token && status === 'idle') {
      analyzeToken(token);
    }
  }, [user]);

  const handleScan = (address: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    analyzeToken(address);
  };

  const handleLoadHistory = (reportData: RiskReport, logs: AgentLogEntry[]) => {
    loadFromHistory(reportData, logs);
    setHistoryOpen(false);
  };

  const clearAndReset = () => {
    reset();
    navigate('/');
  };

  const isActive = status === 'success' || status === 'loading' || status === 'streaming';

  // If not logged in, redirect to landing
  if (!user) {
    return (
      <div className="app app--idle">
        <Navbar onLinkClick={() => {}} onAuthClick={() => setShowAuth(true)} />
        <section className="hero" id="hero">
          <h1 className="hero__title">Sign in to continue</h1>
          <p className="hero__subtitle">
            Create an account or sign in to analyze tokens with AI.
          </p>
          <button className="scanner__btn" onClick={() => setShowAuth(true)} style={{ margin: '0 auto' }}>
            Sign In to Analyze
          </button>
        </section>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

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
              onScan={handleScan}
              onClearError={() => reset()}
              compact
            />

            {/* History toggle */}
            <SearchHistory
              onLoadAnalysis={handleLoadHistory}
              isOpen={historyOpen}
              onToggle={() => setHistoryOpen(!historyOpen)}
            />

            {/* User menu */}
            <div className="dashboard-header__user">
              <span className="dashboard-header__email">
                {user.email?.split('@')[0] || 'User'}
              </span>
            </div>
          </div>

          <div className="dashboard-body">
            {(status === 'loading' || status === 'streaming') && (
              <div className="dashboard-loading">
                <div className="loading loading--visible">
                  <div className="loading__container">
                    <AgentStream logs={agentLogs} isStreaming={true} />
                    <div className="loading__cards" style={{ marginTop: '1.5rem' }}>
                      <div className="skeleton skeleton--card"></div>
                      <div className="skeleton skeleton--card"></div>
                      <div className="skeleton skeleton--card"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'success' && report && (
              <AIResultsPanel report={report} />
            )}
          </div>
        </>
      ) : (
        <>
          {/* ── IDLE / LANDING MODE ── */}
          <Navbar onLinkClick={() => {}} onAuthClick={() => {}} />
          <main>
            <Hero
              status={status}
              error={error}
              onScan={handleScan}
              onClearError={() => reset()}
            />
            <HowItWorks />
            <ExtensionCTA />
          </main>
          <Footer />
        </>
      )}

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

// ─── Root App ───────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
};

export default App;
