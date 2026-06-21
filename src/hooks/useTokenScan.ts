import { useState } from 'react';
import type { SecurityProfile, RugCheckReport, RugCheckRisk } from '../types';
import { scoreToken, DEFAULT_RISK_CHECKS, NEUTRAL_METRICS } from '../utils/scorer';
import type { ScoredResult } from '../utils/scorer';

const API_BASE = 'https://api.rugcheck.xyz/v1';

export type ScanStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Validates a Solana address (base58 encoding, 32-44 chars).
 */
export function isValidSolanaAddress(address: string): boolean {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  for (let i = 0; i < address.length; i++) {
    if (!BASE58_CHARS.includes(address[i])) return false;
  }
  return true;
}

async function fetchRugCheckSummary(mint: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/tokens/${mint}/report/summary`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[DEX Risk] RugCheck summary failed for ${mint}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.error || data.score_normalised === undefined) {
      console.warn(`[DEX Risk] RugCheck summary error response for ${mint}:`, data.error);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`[DEX Risk] RugCheck summary error for ${mint}:`, err);
    return null;
  }
}

async function fetchRugCheckReport(mint: string): Promise<RugCheckReport | null> {
  try {
    const res = await fetch(`${API_BASE}/tokens/${mint}/report`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`[DEX Risk] RugCheck report failed for ${mint}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.error || !data.mint) {
      console.warn(
        `[DEX Risk] RugCheck report error response for ${mint}:`,
        data.error || 'missing mint field',
      );
      return null;
    }
    return data as RugCheckReport;
  } catch (err) {
    console.error(`[DEX Risk] RugCheck report error for ${mint}:`, err);
    return null;
  }
}

async function buildSecurityProfile(mint: string): Promise<{ profile: SecurityProfile; report: RugCheckReport | null }> {
  const [summary, report] = await Promise.all([
    fetchRugCheckSummary(mint),
    fetchRugCheckReport(mint),
  ]);
  if (!summary && !report) {
    throw new Error('Token not found on RugCheck or unable to generate report. Please verify the address on Solscan and try again.');
  }

  const rawLp = Number(summary?.lpLockedPct ?? 0);
  const lpLockedPct = isNaN(rawLp) ? 0 : rawLp;

  const rawScore = Number(summary?.score_normalised ?? report?.score_normalised ?? 50);
  const rugCheckScore = isNaN(rawScore) ? 50 : rawScore;
  const risks: RugCheckRisk[] = summary?.risks ?? report?.risks ?? [];

  const mintAuth = report?.mintAuthority ?? report?.token?.mintAuthority;
  const freezeAuth = report?.freezeAuthority ?? report?.token?.freezeAuthority;
  const mutable = report?.tokenMeta?.mutable ?? true;

  let topHolderConcentration = 0;
  const holders = report?.topHolders;
  if (Array.isArray(holders) && holders.length > 0) {
    const top10 = holders.slice(0, 10);
    topHolderConcentration = top10.reduce((sum, h) => {
      const pct = Number(h.pct || 0);
      return sum + (isNaN(pct) ? 0 : pct);
    }, 0);
  }

  const rawInsiders = Number(report?.graphInsidersDetected ?? 0);
  const insidersDetected = isNaN(rawInsiders) ? 0 : rawInsiders;

  const rawFee = Number(report?.transferFee?.pct ?? 0);
  const transferFeePct = isNaN(rawFee) ? 0 : rawFee;

  const profile: SecurityProfile = {
    mintAuthorityRevoked: mintAuth === null || mintAuth === undefined,
    freezeAuthorityRevoked: freezeAuth === null || freezeAuth === undefined,
    metadataImmutable: !mutable,
    lpLockedPct: Math.min(100, Math.max(0, lpLockedPct)),
    topHolderConcentration: Math.min(100, Math.max(0, topHolderConcentration)),
    insidersDetected,
    hasTransferFee: transferFeePct > 0,
    transferFeePct,
    isRugged: report?.rugged ?? false,
    rugCheckScore,
    rugCheckRisks: Array.isArray(risks) ? risks : [],
  };

  return { profile, report };
}

export function useTokenScan() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secProfile, setSecProfile] = useState<SecurityProfile | null>(null);
  const [rawReport, setRawReport] = useState<RugCheckReport | null>(null);
  const [scoredResult, setScoredResult] = useState<ScoredResult | null>(null);
  const [scannedAddress, setScannedAddress] = useState<string>('');

  const scanToken = async (address: string) => {
    const trimmed = address.trim();
    setError(null);

    if (!isValidSolanaAddress(trimmed)) {
      setStatus('error');
      setError('Please enter a valid Solana token address (32-44 base58 characters)');
      return;
    }

    setStatus('loading');
    setScannedAddress(trimmed);

    try {
      const { profile, report } = await buildSecurityProfile(trimmed);
      const scored = scoreToken(profile, NEUTRAL_METRICS, DEFAULT_RISK_CHECKS);
      scored.address = trimmed;

      setSecProfile(profile);
      setRawReport(report);
      setScoredResult(scored);
      setStatus('success');
    } catch (err: any) {
      console.error('[DEX Risk] Scan hook failed:', err);
      setStatus('error');
      setError(err.message || 'Failed to analyze token. Please try again.');
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
    setSecProfile(null);
    setRawReport(null);
    setScoredResult(null);
    setScannedAddress('');
  };

  return {
    status,
    error,
    secProfile,
    rawReport,
    scoredResult,
    scannedAddress,
    scanToken,
    reset,
  };
}
