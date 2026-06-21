import React, { useState, useEffect } from 'react';
import type { SecurityProfile, RugCheckReport } from '../types';
import type { ScoredResult } from '../utils/scorer';
import { fmtUSD, fmtCompact, truncAddr } from '../utils/formatter';
import { IconShield, IconUsers, IconFlag, IconCheck, IconAlert, IconX } from '../utils/icons';
import { InfoTip } from './InfoTip';

interface ResultsPanelProps {
  secProfile: SecurityProfile;
  rawReport: RugCheckReport | null;
  scoredResult: ScoredResult;
}

const GAUGE_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#ef4444',
  critical: '#dc2626',
};

// ─── RISK GAUGE ──────────────────────────────────────────────────
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
      <div className="gauge__label">Risk Score</div>
      <div className={`gauge__risk-badge gauge__risk-badge--${riskLevel}`}>
        {riskLevel.toUpperCase()}
      </div>
    </div>
  );
};

// ─── CONFIDENCE BAR ──────────────────────────────────────────────
const ConfidenceBar: React.FC<{ confidence: number; level: string }> = ({ confidence, level }) => {
  const colors: Record<string, string> = {
    high: '#22c55e',
    moderate: '#eab308',
    low: '#f97316',
    very_low: '#ef4444',
  };
  const labels: Record<string, string> = {
    high: 'High',
    moderate: 'Moderate',
    low: 'Low',
    very_low: 'Very Low',
  };
  const color = colors[level] || colors.low;
  const label = labels[level] || level;

  return (
    <div className="confidence">
      <div className="confidence__text">
        {label} confidence ({confidence}%)
      </div>
      <div className="confidence__bar">
        <div
          className="confidence__fill"
          style={{ width: `${confidence}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
};

// ─── BREAKDOWN ITEM ──────────────────────────────────────────────
const BreakdownItem: React.FC<{
  label: string;
  status: 'safe' | 'warn' | 'danger';
  tooltip?: string;
}> = ({
  label,
  status,
  tooltip,
}) => {
  const statusIcons = {
    safe: <IconCheck />,
    warn: <IconAlert />,
    danger: <IconX />,
  };
  const statusIcon = statusIcons[status] || statusIcons.warn;

  return (
    <div className={`breakdown__item breakdown__item--${status}`}>
      <span className={`breakdown__status breakdown__status--${status}`}>{statusIcon}</span>
      <span className="breakdown__label">
        {label}
        {tooltip && <InfoTip content={tooltip} />}
      </span>
    </div>
  );
};

// ─── BREAKDOWN GRID ──────────────────────────────────────────────
const BreakdownGrid: React.FC<{ sec: SecurityProfile }> = ({ sec }) => {
  const lpPctVal = Number(sec.lpLockedPct);
  const lpPct = (isNaN(lpPctVal) ? 0 : lpPctVal).toFixed(0);

  const feePctVal = Number(sec.transferFeePct);
  const feePct = (isNaN(feePctVal) ? 0 : feePctVal).toFixed(1);

  const concPctVal = Number(sec.topHolderConcentration);
  const concPct = (isNaN(concPctVal) ? 0 : concPctVal).toFixed(1);
  let concStatus: 'safe' | 'warn' | 'danger' = 'safe';
  if (sec.topHolderConcentration > 80) concStatus = 'danger';
  else if (sec.topHolderConcentration > 50) concStatus = 'warn';

  let rcStatus: 'safe' | 'warn' | 'danger' = 'safe';
  if (sec.rugCheckScore > 60) rcStatus = 'danger';
  else if (sec.rugCheckScore > 20) rcStatus = 'warn';

  const dangerFlags = (sec.rugCheckRisks || []).filter((r) => r.level === 'danger');

  return (
    <div className="breakdown" id="breakdown-container">
      {/* Security */}
      <div className="breakdown__card" id="security-breakdown">
        <div className="breakdown__title">
          <IconShield style={{ width: '14px', height: '14px', marginRight: '6px' }} />
          Security
        </div>
        <div className="breakdown__items">
          <BreakdownItem
            label={sec.mintAuthorityRevoked ? 'Mint revoked' : 'Mint active'}
            status={sec.mintAuthorityRevoked ? 'safe' : 'danger'}
            tooltip={sec.mintAuthorityRevoked ? 'Mint authority is revoked: The creator cannot issue new tokens to dilute holders. Safe.' : 'Mint authority is active: The creator can mint new tokens at any time, diluting current holders. High Risk.'}
          />
          <BreakdownItem
            label={sec.freezeAuthorityRevoked ? 'Freeze revoked' : 'Freeze active'}
            status={sec.freezeAuthorityRevoked ? 'safe' : 'danger'}
            tooltip={sec.freezeAuthorityRevoked ? 'Freeze authority is revoked: The creator cannot freeze transfers or lock token trading. Safe.' : 'Freeze authority is active: The creator can freeze holder wallets at any time to block selling. High Risk.'}
          />
          <BreakdownItem
            label={sec.metadataImmutable ? 'Immutable metadata' : 'Mutable metadata'}
            status={sec.metadataImmutable ? 'safe' : 'warn'}
            tooltip={sec.metadataImmutable ? 'Metadata is immutable: Token name, symbol, logo, and social links cannot be altered. Safe.' : 'Metadata is mutable: The creator can rename the token or change the logo to trick buyers (warn).'}
          />
          <BreakdownItem
            label={`LP locked: ${lpPct}%`}
            status={sec.lpLockedPct > 50 ? 'safe' : 'warn'}
            tooltip="Liquidity Pool (LP) locked percentage. Locked or burned LP tokens prevent the creator from withdrawing the backing funds (rug pulling)."
          />
          {sec.hasTransferFee ? (
            <BreakdownItem
              label={`Transfer fee: ${feePct}%`}
              status={sec.transferFeePct > 5 ? 'danger' : 'warn'}
              tooltip="A tax charged on transfers. High fees (>5%) or variable fees that can be set to 100% (honeypot) are dangerous."
            />
          ) : (
            <BreakdownItem
              label="No transfer fee"
              status="safe"
              tooltip="No transfer tax detected. Users can buy and sell freely without extra fees. Safe."
            />
          )}
        </div>
      </div>

      {/* Holders */}
      <div className="breakdown__card" id="holder-breakdown">
        <div className="breakdown__title">
          <IconUsers style={{ width: '14px', height: '14px', marginRight: '6px' }} />
          Holders
        </div>
        <div className="breakdown__items">
          <BreakdownItem
            label={`Top 10 hold ${concPct}%`}
            status={concStatus}
            tooltip="The percentage of supply held by the top 10 wallets. High concentration increases the risk of whales dumping on retail."
          />
          {sec.insidersDetected > 0 ? (
            <BreakdownItem
              label={`${sec.insidersDetected} insider network(s)`}
              status="danger"
              tooltip="Groups of linked wallets that bought tokens before public launch or in suspicious patterns. Often used to dump on buyers."
            />
          ) : (
            <BreakdownItem
              label="No insider networks"
              status="safe"
              tooltip="No clustered, suspicious holder networks detected. Safe."
            />
          )}
        </div>
      </div>

      {/* RugCheck */}
      <div className="breakdown__card" id="rugcheck-breakdown">
        <div className="breakdown__title">
          <IconFlag style={{ width: '14px', height: '14px', marginRight: '6px' }} />
          RugCheck
        </div>
        <div className="breakdown__items">
          <BreakdownItem
            label={`Score: ${sec.rugCheckScore}/100`}
            status={rcStatus}
            tooltip="RugCheck safety rating based on all combined risk parameters. 0 is safest; 100 is critical risk."
          />
          {dangerFlags.length > 0 ? (
            <>
              {dangerFlags.slice(0, 4).map((flag, idx) => (
                <BreakdownItem
                  key={idx}
                  label={flag.name}
                  status="danger"
                  tooltip={`Specific vulnerability flagged: ${flag.description || flag.name}`}
                />
              ))}
              {dangerFlags.length > 4 && (
                <BreakdownItem
                  label={`+${dangerFlags.length - 4} more`}
                  status="danger"
                  tooltip="Additional risk warnings detected on RugCheck."
                />
              )}
            </>
          ) : (
            <BreakdownItem
              label="No danger flags"
              status="safe"
              tooltip="No critical issues or warnings flagged by RugCheck database."
            />
          )}
          {sec.isRugged && (
            <BreakdownItem
              label="CONFIRMED RUG"
              status="danger"
              tooltip="This token has been officially identified or verified as a scam or rug pull."
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── METADATA GRID ───────────────────────────────────────────────
const MetadataGrid: React.FC<{ report: RugCheckReport | null; sec: SecurityProfile }> = ({ report, sec }) => {
  if (!report) {
    return (
      <div className="meta-grid" id="meta-grid">
        <div className="meta__card">
          <div className="meta__empty">No data available</div>
        </div>
      </div>
    );
  }

  const supply = report.token?.supply ?? 0;
  const decimals = report.token?.decimals ?? 0;
  const realSupply = decimals > 0 ? supply / Math.pow(10, decimals) : supply;
  const creator = report.creator || '—';
  const creatorBal = report.creatorBalance ?? 0;
  const creatorBalDisplay = creatorBal === 0 ? 'SOLD' : fmtCompact(creatorBal / Math.pow(10, decimals));
  const holders = report.totalHolders ?? '—';
  const mcap = report.totalMarketLiquidity ? fmtUSD(report.totalMarketLiquidity) : '—';
  const name = report.tokenMeta?.name || '—';
  const symbol = report.tokenMeta?.symbol || '—';
  const mintAuth = sec.mintAuthorityRevoked ? '—' : 'Active';
  const freezeAuth = sec.freezeAuthorityRevoked ? '—' : 'Active';
  const lpVal = Number(sec.lpLockedPct);
  const lpPct = (isNaN(lpVal) ? 0 : lpVal).toFixed(2);

  const holderList = report.topHolders || [];
  const top5 = holderList.slice(0, 5);
  const totalPct = top5.reduce((s, h) => {
    const p = Number(h.pct || 0);
    return s + (isNaN(p) ? 0 : p);
  }, 0);

  const markets = report.markets || [];

  return (
    <div className="meta-grid" id="meta-grid">
      {/* Token Overview */}
      <div className="meta__card" id="token-overview">
        <div className="meta__header">
          <span>{name} <span className="meta__token-symbol">{symbol}</span></span>
        </div>
        <div className="meta__rows">
          <div className="meta__row">
            <span className="meta__key">Supply<InfoTip content="The total amount of this token created." /></span>
            <span className="meta__val">{fmtCompact(realSupply)}</span>
          </div>
          <div className="meta__row">
            <span className="meta__key">Holders<InfoTip content="The number of unique wallets holding this token." /></span>
            <span className="meta__val">{typeof holders === 'number' ? holders.toLocaleString() : holders}</span>
          </div>
          <div className="meta__row">
            <span className="meta__key">Liquidity<InfoTip content="Total funds in the token's trading pools, facilitating buy/sell orders." /></span>
            <span className="meta__val">{mcap}</span>
          </div>
          <div className="meta__row">
            <span className="meta__key">Creator</span>
            <span className="meta__val meta__val--mono">
              <a href={`https://solscan.io/account/${creator}`} target="_blank" rel="noopener noreferrer">{truncAddr(creator, 5)}</a>
            </span>
          </div>
          <div className="meta__row">
            <span className="meta__key">Creator Bal<InfoTip content="The current token balance of the creator wallet. SOLD indicates zero dumping risk." /></span>
            <span className={`meta__val ${creatorBal === 0 ? 'meta__val--safe' : 'meta__val--warn'}`}>
              {creatorBalDisplay}
            </span>
          </div>
          <div className="meta__row">
            <span className="meta__key">Mint Auth<InfoTip content="Mint authority status. Revoked prevents printing new supply; Active allows unlimited dilution." /></span>
            <span className={`meta__val ${mintAuth === '—' ? 'meta__val--safe' : 'meta__val--danger'}`}>{mintAuth === '—' ? 'Revoked' : mintAuth}</span>
          </div>
          <div className="meta__row">
            <span className="meta__key">Freeze Auth<InfoTip content="Freeze authority status. Revoked prevents freezing wallets; Active can halt trading." /></span>
            <span className={`meta__val ${freezeAuth === '—' ? 'meta__val--safe' : 'meta__val--danger'}`}>{freezeAuth === '—' ? 'Revoked' : freezeAuth}</span>
          </div>
          <div className="meta__row">
            <span className="meta__key">LP Locked<InfoTip content="Percentage of liquidity pool tokens locked/burned. Higher reduces rug pull risk." /></span>
            <span className="meta__val">{lpPct}%</span>
          </div>
        </div>
      </div>

      {/* Top Holders */}
      <div className="meta__card" id="top-holders">
        <div className="meta__header">
          <span>Top Holders</span>
          <span className="meta__header-value">{totalPct.toFixed(1)}%</span>
        </div>
        {top5.length === 0 ? (
          <div className="meta__empty">No holder data</div>
        ) : (
          <table className="meta__table">
            <thead>
              <tr>
                <th>Account</th>
                <th className="meta__td-right">Amnt</th>
                <th className="meta__td-right">%</th>
              </tr>
            </thead>
            <tbody>
              {top5.map((h, idx) => {
                const addr = h.owner || h.address || '—';
                const amt = h.amount != null ? fmtCompact(h.amount / Math.pow(10, decimals)) : '—';
                const pVal = Number(h.pct || 0);
                const pct = (isNaN(pVal) ? 0 : pVal).toFixed(2);
                return (
                  <tr key={idx}>
                    <td>
                      <a href={`https://solscan.io/account/${h.address || addr}`} target="_blank" rel="noopener noreferrer" className="meta__addr">
                        {truncAddr(addr, 4)}
                      </a>
                      {h.insider && <span className="meta__tag meta__tag--danger">Insider</span>}
                    </td>
                    <td className="meta__td-right">{amt}</td>
                    <td className="meta__td-right">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Markets */}
      <div className="meta__card meta__card--wide" id="markets-panel">
        <div className="meta__header">
          <span>Markets</span>
          <span className="meta__header-value">{markets.length}</span>
        </div>
        {markets.length === 0 ? (
          <div className="meta__empty">No market data</div>
        ) : (
          <table className="meta__table">
            <thead>
              <tr>
                <th>Address</th>
                <th>Type</th>
                <th className="meta__td-right">Liquidity</th>
                <th className="meta__td-right">LP Locked</th>
              </tr>
            </thead>
            <tbody>
              {markets.slice(0, 5).map((m: any, idx: number) => {
                const liq = m.lp?.usd != null ? fmtUSD(m.lp.usd) : (m.liquidityA != null ? fmtUSD(m.liquidityA) : '—');
                const lpVal = m.lp?.lpLockedPct != null ? Number(m.lp.lpLockedPct) : null;
                const lpLocked = (lpVal !== null && !isNaN(lpVal)) ? `${lpVal.toFixed(1)}%` : '—';
                const dexLabel = m.marketType || m.source || '—';
                return (
                  <tr key={idx}>
                    <td>
                      <a href={`https://solscan.io/account/${m.pubkey || ''}`} target="_blank" rel="noopener noreferrer" className="meta__addr">
                        {truncAddr(m.pubkey || '', 4)}
                      </a>
                    </td>
                    <td>{dexLabel}</td>
                    <td className="meta__td-right">{liq}</td>
                    <td className="meta__td-right">{lpLocked}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ─── MAIN RESULTS PANEL (SPLIT DASHBOARD) ────────────────────────
export const ResultsPanel: React.FC<ResultsPanelProps> = ({ secProfile, rawReport, scoredResult }) => {
  return (
    <>
      {/* Left column: gauge + overview */}
      <div className="dashboard-left">
        <RiskGauge score={scoredResult.riskScore} riskLevel={scoredResult.riskLevel} />
        <ConfidenceBar confidence={scoredResult.confidence} level={scoredResult.confidenceLevel} />

        <div className="results__note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>On-chain data only. Install the <a href="#extension">extension</a> for live metrics.</span>
        </div>

        {/* Token overview in left column */}
        {rawReport && (
          <div className="meta__card" id="token-overview-left">
            <div className="meta__header">
              <span>{rawReport.tokenMeta?.name || '—'} <span className="meta__token-symbol">{rawReport.tokenMeta?.symbol || ''}</span></span>
            </div>
            <div className="meta__rows">
              <div className="meta__row">
                <span className="meta__key">Supply<InfoTip content="The total amount of this token created." /></span>
                <span className="meta__val">{fmtCompact((rawReport.token?.supply ?? 0) / Math.pow(10, rawReport.token?.decimals ?? 0))}</span>
              </div>
              <div className="meta__row">
                <span className="meta__key">Holders<InfoTip content="The number of unique wallets holding this token." /></span>
                <span className="meta__val">{rawReport.totalHolders ? rawReport.totalHolders.toLocaleString() : '—'}</span>
              </div>
              <div className="meta__row">
                <span className="meta__key">Liquidity<InfoTip content="Total funds in the token's trading pools, facilitating buy/sell orders." /></span>
                <span className="meta__val">{rawReport.totalMarketLiquidity ? fmtUSD(rawReport.totalMarketLiquidity) : '—'}</span>
              </div>
              <div className="meta__row">
                <span className="meta__key">Creator</span>
                <span className="meta__val meta__val--mono">
                  <a href={`https://solscan.io/account/${rawReport.creator}`} target="_blank" rel="noopener noreferrer">{truncAddr(rawReport.creator || '', 4)}</a>
                </span>
              </div>
              <div className="meta__row">
                <span className="meta__key">Mint Auth<InfoTip content="Mint authority status. Revoked prevents printing new supply; Active allows unlimited dilution." /></span>
                <span className={`meta__val ${secProfile.mintAuthorityRevoked ? 'meta__val--safe' : 'meta__val--danger'}`}>
                  {secProfile.mintAuthorityRevoked ? 'Revoked' : 'Active'}
                </span>
              </div>
              <div className="meta__row">
                <span className="meta__key">Freeze Auth<InfoTip content="Freeze authority status. Revoked prevents freezing wallets; Active can halt trading." /></span>
                <span className={`meta__val ${secProfile.freezeAuthorityRevoked ? 'meta__val--safe' : 'meta__val--danger'}`}>
                  {secProfile.freezeAuthorityRevoked ? 'Revoked' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right column: breakdown + tables */}
      <div className="dashboard-right">
        <BreakdownGrid sec={secProfile} />
        <MetadataGrid report={rawReport} sec={secProfile} />
      </div>
    </>
  );
};
