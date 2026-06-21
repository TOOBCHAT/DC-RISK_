import React from 'react';

export const HowItWorks: React.FC = () => {
  return (
    <section className="how-it-works" id="how-it-works">
      <h2 className="section__title">How It Works</h2>
      <p className="section__subtitle">Three steps to inspect token hazards</p>

      <div className="steps">
        {/* Step 1 */}
        <div className="step fade-in-up">
          <div className="step__number">01</div>
          <div className="step__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </div>
          <h3 className="step__title">Mint Address</h3>
          <p className="step__desc">Copy the token contract address from Solscan, Birdeye, or DexScreener.</p>
        </div>

        {/* Step 2 */}
        <div className="step fade-in-up">
          <div className="step__number">02</div>
          <div className="step__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <h3 className="step__title">On-Chain Check</h3>
          <p className="step__desc">We verify if creator permissions are revoked, LP tokens are burned, and top wallets are clean.</p>
        </div>

        {/* Step 3 */}
        <div className="step fade-in-up">
          <div className="step__number">03</div>
          <div className="step__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <h3 className="step__title">View Risk Score</h3>
          <p className="step__desc">Receive a 0-100 hazard value with confidence gauges and holder concentration summaries.</p>
        </div>
      </div>
    </section>
  );
};
