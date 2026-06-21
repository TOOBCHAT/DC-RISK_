import React, { useState } from 'react';
import type { ScanStatus } from '../hooks/useTokenScan';
import { IconSearch, IconLoader } from '../utils/icons';

interface HeroProps {
  status: ScanStatus;
  error: string | null;
  onScan: (address: string) => void;
  onClearError: () => void;
  compact?: boolean;
}

export const Hero: React.FC<HeroProps> = ({ status, error, onScan, onClearError, compact = false }) => {
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    onScan(address);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    if (error) {
      onClearError();
    }
  };

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
            disabled={status === 'loading'}
          />
          <button
            className="scanner__btn"
            type="submit"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
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
        Analyze mint authorities, holder distributions, and freeze risks in seconds.
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
              disabled={status === 'loading'}
            />
            <button
              id="scan-btn"
              className="scanner__btn"
              type="submit"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <>
                  <IconLoader style={{ marginRight: '6px' }} />
                  Scanning…
                </>
              ) : (
                <>
                  <IconSearch style={{ marginRight: '6px' }} />
                  Scan
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

      {/* Loading Skeleton */}
      {status === 'loading' && (
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
      )}
    </section>
  );
};
