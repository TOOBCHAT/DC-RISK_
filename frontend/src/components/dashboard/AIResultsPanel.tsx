import React, { useState, useEffect } from 'react';

interface AIResultsPanelProps {
  report: any;
}

// ─── Gauge colors ───────────────────────────────────────────────
const GAUGE_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
  critical: '#dc2626',
  unknown: '#71717a',
};

// Helper for formatting large numbers
function fmtCompact(val: number): string {
  if (!val || isNaN(val)) return '0';
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toLocaleString();
}

function truncAddr(addr: string, chars = 4): string {
  if (!addr || addr.length < chars * 2 + 2) return addr || '';
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

// ─── RISK GAUGE ─────────────────────────────────────────────────
const RiskGauge: React.FC<{ score: number; riskLevel: string }> = ({ score, riskLevel }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [score]);

  const color = GAUGE_COLORS[riskLevel] || GAUGE_COLORS.medium;
  const gaugeStyle = {
    '--gauge-pct': `${score}%`,
    '--gauge-color': color,
  } as React.CSSProperties;

  return (
    <div className="gauge">
      <div className="gauge__circle" style={gaugeStyle}>
        <span className="gauge__score">{displayScore}</span>
      </div>
      <div className="gauge__label">AI Risk Score</div>
      <div className={`gauge__risk-badge gauge__risk-badge--${riskLevel}`}>
        {riskLevel.toUpperCase()}
      </div>
    </div>
  );
};

// ─── CONFIDENCE BAR ─────────────────────────────────────────────
const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
  let level = 'High';
  let color = '#22c55e';
  if (confidence < 25) { level = 'Very Low'; color = '#ef4444'; }
  else if (confidence < 45) { level = 'Low'; color = '#f97316'; }
  else if (confidence < 70) { level = 'Moderate'; color = '#eab308'; }

  return (
    <div className="confidence">
      <div className="confidence__text">
        {level} confidence ({confidence}%)
      </div>
      <div className="confidence__bar">
        <div
          className="confidence__fill"
          style={{ width: `${confidence}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── MAIN RESULTS PANEL ─────────────────────────────────────────
export const AIResultsPanel: React.FC<AIResultsPanelProps> = ({ report }) => {
  const r = report || {};

  const tokenName = r.tokenName || 'Unknown Token';
  const tokenSymbol = r.tokenSymbol || 'TOKEN';
  const tokenAddress = r.tokenAddress || '';
  const riskScore = r.riskScore ?? r.risk_score ?? 50;
  const riskLevel = r.riskLevel ?? r.risk_level ?? 'medium';
  const confidence = r.confidence ?? 80;
  const rugcheckScore = r.rugcheckScore ?? 0;

  const mintRevoked = r.mintAuthorityRevoked ?? true;
  const freezeRevoked = r.freezeAuthorityRevoked ?? true;
  const immutableMeta = r.metadataImmutable ?? false;
  const lpLockedPct = r.lpLockedPct ?? 0;

  const totalSupply = r.totalSupply ?? 0;
  const liquidityUsd = r.liquidityUsd ?? 0;
  const creatorAddress = r.creatorAddress || '';
  const creatorBalance = r.creatorBalance ?? 0;

  const topHolders = Array.isArray(r.topHolders) ? r.topHolders : [];
  const markets = Array.isArray(r.markets) ? r.markets : [];
  const top10Pct = r.top10HoldersPct ?? 0;
  const insidersCount = r.insidersCount ?? 0;

  const aiSummary = r.aiSummary ?? r.summary ?? 'On-chain security analysis complete.';
  const keyRiskFactors = Array.isArray(r.keyRiskFactors) ? r.keyRiskFactors : (Array.isArray(r.key_risk_factors) ? r.key_risk_factors : []);
  const recommendation = r.recommendation || 'proceed with caution';

  const recColors: Record<string, string> = {
    safe: '#22c55e',
    caution: '#eab308',
    avoid: '#ef4444',
  };

  return (
    <>
      {/* Left Column: Gauge + Token Info */}
      <div className="dashboard-left">
        <RiskGauge score={riskScore} riskLevel={riskLevel} />
        <ConfidenceBar confidence={confidence} />

        {/* RugCheck Badge */}
        <div className="meta__card" style={{ marginTop: '1rem' }}>
          <div className="meta__header">
            <span>RugCheck Risk Penalty</span>
            <span className="meta__header-value" style={{ color: rugcheckScore > 1000 ? '#ef4444' : rugcheckScore > 100 ? '#eab308' : '#22c55e' }}>
              {rugcheckScore > 100 ? `${rugcheckScore.toLocaleString()} pts` : `${rugcheckScore} / 100`}
            </span>
          </div>
        </div>

        {/* Token Details */}
        <div className="meta__card">
          <div className="meta__header">
            <span>{tokenName} <span className="meta__token-symbol">{tokenSymbol}</span></span>
          </div>
          <div className="meta__rows">
            <div className="meta__row">
              <span className="meta__key">Supply</span>
              <span className="meta__val">{fmtCompact(totalSupply)}</span>
            </div>
            <div className="meta__row">
              <span className="meta__key">Liquidity</span>
              <span className="meta__val">${fmtCompact(liquidityUsd)}</span>
            </div>
            <div className="meta__row">
              <span className="meta__key">Creator</span>
              <span className="meta__val meta__val--mono">
                {creatorAddress ? (
                  <a href={`https://solscan.io/account/${creatorAddress}`} target="_blank" rel="noopener noreferrer">
                    {truncAddr(creatorAddress, 4)}
                  </a>
                ) : 'N/A'}
              </span>
            </div>
            <div className="meta__row">
              <span className="meta__key">Creator Bal</span>
              <span className="meta__val">{fmtCompact(creatorBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: On-Chain Data + AI Analysis */}
      <div className="dashboard-right">
        {/* Security + Holders Cards */}
        <div className="breakdown">
          {/* Security Card */}
          <div className="breakdown__card">
            <div className="breakdown__title">🛡️ Security Facts</div>
            <div className="breakdown__items">
              <div className={`breakdown__item breakdown__item--${mintRevoked ? 'safe' : 'danger'}`}>
                <span className={`breakdown__status breakdown__status--${mintRevoked ? 'safe' : 'danger'}`}>
                  {mintRevoked ? '✅' : '❌'}
                </span>
                <span className="breakdown__label">
                  {mintRevoked ? 'Mint authority revoked' : 'Mint authority active'}
                </span>
              </div>

              <div className={`breakdown__item breakdown__item--${freezeRevoked ? 'safe' : 'danger'}`}>
                <span className={`breakdown__status breakdown__status--${freezeRevoked ? 'safe' : 'danger'}`}>
                  {freezeRevoked ? '✅' : '❌'}
                </span>
                <span className="breakdown__label">
                  {freezeRevoked ? 'Freeze authority revoked' : 'Freeze authority active'}
                </span>
              </div>

              <div className={`breakdown__item breakdown__item--${immutableMeta ? 'safe' : 'warn'}`}>
                <span className={`breakdown__status breakdown__status--${immutableMeta ? 'safe' : 'warn'}`}>
                  {immutableMeta ? '✅' : '⚠️'}
                </span>
                <span className="breakdown__label">
                  {immutableMeta ? 'Immutable metadata' : 'Mutable metadata'}
                </span>
              </div>

              <div className={`breakdown__item breakdown__item--${lpLockedPct > 50 ? 'safe' : 'warn'}`}>
                <span className={`breakdown__status breakdown__status--${lpLockedPct > 50 ? 'safe' : 'warn'}`}>
                  {lpLockedPct > 50 ? '✅' : '⚠️'}
                </span>
                <span className="breakdown__label">
                  LP locked: {lpLockedPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Holders Card */}
          <div className="breakdown__card">
            <div className="breakdown__title">👥 Holder Facts</div>
            <div className="breakdown__items">
              <div className={`breakdown__item breakdown__item--${top10Pct > 30 ? 'warn' : 'safe'}`}>
                <span className={`breakdown__status breakdown__status--${top10Pct > 30 ? 'warn' : 'safe'}`}>
                  {top10Pct > 30 ? '⚠️' : '✅'}
                </span>
                <span className="breakdown__label">Top 10 hold {top10Pct}%</span>
              </div>

              <div className={`breakdown__item breakdown__item--${insidersCount > 0 ? 'danger' : 'safe'}`}>
                <span className={`breakdown__status breakdown__status--${insidersCount > 0 ? 'danger' : 'safe'}`}>
                  {insidersCount > 0 ? '❌' : '✅'}
                </span>
                <span className="breakdown__label">
                  {insidersCount > 0 ? `${insidersCount} insider network(s)` : 'No insider networks'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Analysis Summary */}
        <div className="meta__card meta__card--wide" style={{ marginBottom: '1.5rem' }}>
          <div className="meta__header">
            <span>AI Risk Assessment</span>
            <span className="meta__header-value" style={{ color: recColors[recommendation.toLowerCase()] || '#eab308' }}>
              {recommendation.toUpperCase()}
            </span>
          </div>
          <p className="ai-summary__text">{aiSummary}</p>
          {keyRiskFactors.length > 0 && (
            <div className="ai-summary__risks">
              <div className="ai-summary__risks-title">Key Risk Factors:</div>
              <ul className="ai-summary__risks-list">
                {keyRiskFactors.map((factor: string, idx: number) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Top Holders Table */}
        {topHolders.length > 0 && (
          <div className="meta__card" style={{ marginBottom: '1.5rem' }}>
            <div className="meta__header">
              <span>Top Holders</span>
              <span className="meta__header-value">{top10Pct}% Total</span>
            </div>
            <table className="meta__table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="meta__td-right">Amount</th>
                  <th className="meta__td-right">%</th>
                </tr>
              </thead>
              <tbody>
                {topHolders.map((h: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <a href={`https://solscan.io/account/${h.address}`} target="_blank" rel="noopener noreferrer" className="meta__addr">
                        {truncAddr(h.address, 4)}
                      </a>
                      {h.isInsider && <span className="meta__tag meta__tag--danger" style={{ marginLeft: '6px' }}>Insider</span>}
                    </td>
                    <td className="meta__td-right">{fmtCompact(h.amount)}</td>
                    <td className="meta__td-right">{h.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Markets Table */}
        {markets.length > 0 && (
          <div className="meta__card">
            <div className="meta__header">
              <span>Markets / Liquidity Pools</span>
            </div>
            <table className="meta__table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Type</th>
                  <th className="meta__td-right">LP Locked</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <a href={`https://solscan.io/account/${m.pubkey}`} target="_blank" rel="noopener noreferrer" className="meta__addr">
                        {truncAddr(m.pubkey, 4)}
                      </a>
                    </td>
                    <td>{m.marketType}</td>
                    <td className="meta__td-right">{m.lpLockedPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
