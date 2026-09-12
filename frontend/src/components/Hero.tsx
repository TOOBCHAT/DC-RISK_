import React, { useState } from 'react';
import type { AnalysisStatus } from '../hooks/useAnalysis';
import { IconSearch, IconLoader } from '../utils/icons';

interface HeroProps {
  status: AnalysisStatus;
  error: string | null;
  onScan: (address: string) => void;
  onClearError: () => void;
  compact?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ status, error, onScan, onClearError, compact = false }) => {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading' || status === 'streaming') return;
    onScan(address);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    if (error) {
      onClearError();
    }
  };

  const isProcessing = status === 'loading' || status === 'streaming';

  // ── Compact mode: inline search bar for the dashboard header ──
  if (compact) {
    return (
      <form className="scanner scanner--compact" onSubmit={handleSubmit}>
        <div className="scanner__input-group">
          <input
            type="text"
            className="scanner__input"
            placeholder="Paste token address..."
            spellCheck="false"
            autoComplete="off"
            aria-label="Solana token mint address"
            value={address}
            onChange={handleInputChange}
            disabled={isProcessing}
          />
          <button
            className="scanner__btn"
            type="submit"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <IconLoader style={{ width: '16px', height: '16px' }} />
            ) : (
              <IconSearch style={{ width: '16px', height: '16px' }} />
            )}
          </button>
        </div>
        {error && (
          <div className="scanner__error scanner__error--visible">{error}</div>
        )}
      </form>
    );
  }

  // ── Full landing mode: centered hero ──
  return (
    <section className="hero" id="hero">
      <h1 className="hero__title">Is your token safe?</h1>
      <p className="hero__subtitle">
        AI agents analyze mint authorities, holder distributions, and rug pull signals in seconds.
      </p>

      <div className="scanner">
        <form className="scanner__card" onSubmit={handleSubmit}>
          <div className="scanner__input-group">
            <input
              type="text"
              id="scanner-input"
              className="scanner__input"
              placeholder="Paste Solana token mint address..."
              spellCheck="false"
              autoComplete="off"
              aria-label="Solana token mint address"
              value={address}
              onChange={handleInputChange}
              disabled={isProcessing}
            />
            <button
              id="scan-btn"
              className="scanner__btn"
              type="submit"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <IconLoader style={{ marginRight: '6px' }} />
                  Analyzing…
                </>
              ) : (
                <>
                  <IconSearch style={{ marginRight: '6px' }} />
                  Analyze
                </>
              )}
            </button>
          </div>

          <div className={`scanner__error ${error ? 'scanner__error--visible' : ''}`} id="scanner-error">
            {error}
          </div>

          <p className="scanner__hint">
            Supports any SPL token — pump.fun, Raydium, Jupiter
          </p>
        </form>
      </div>
    </section>
  );
};
