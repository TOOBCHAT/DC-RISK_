import type {
  SecurityProfile,
  RiskLevel,
  ConfidenceLevel,
} from '../types';

export interface NormalizedSignals {
  mintEnabled: boolean;
  freezeEnabled: boolean;
  metadataMutable: boolean;
  hasHiddenTax: boolean;
  taxPct: number;
  lpLocked: boolean;
  isLpRelevant: boolean;
  whaleConcentration: number;
  insiderNetworks: number;
  rugCheckScore: number;
  rugCheckDangerCount: number;
  rugCheckDangerReasons: string[];
  isConfirmedRug: boolean;
  hasApiData: boolean;
  hasReportData: boolean;
}

/**
 * Normalizes raw security profile into deduped signals.
 */
export function normalizeSignals(sec: SecurityProfile): NormalizedSignals {
  const isLpRelevant = sec.lpLockedPct > 0 || !sec.mintAuthorityRevoked;
  const dangerRisks = (sec.rugCheckRisks || []).filter((r) => r.level === 'danger');

  return {
    mintEnabled: !sec.mintAuthorityRevoked,
    freezeEnabled: !sec.freezeAuthorityRevoked,
    metadataMutable: !sec.metadataImmutable,
    hasHiddenTax: sec.transferFeePct > 5,
    taxPct: sec.transferFeePct,
    lpLocked: sec.lpLockedPct > 50,
    isLpRelevant,
    whaleConcentration: sec.topHolderConcentration,
    insiderNetworks: sec.insidersDetected,
    rugCheckScore: sec.rugCheckScore,
    rugCheckDangerCount: dangerRisks.length,
    rugCheckDangerReasons: dangerRisks.slice(0, 3).map((r) => `${r.name}: ${r.description}`),
    isConfirmedRug: sec.isRugged,
    hasApiData: sec.rugCheckScore !== 50,
    hasReportData: sec.topHolderConcentration > 0 || sec.insidersDetected > 0,
  };
}

/**
 * Scores liquidity risk based on on-chain data.
 */
function scoreLiquidity(s: NormalizedSignals): { score: number; reasons: string[] } {
  let raw = 0;
  const reasons: string[] = [];

  if (s.isLpRelevant && !s.lpLocked && s.mintEnabled) {
    raw += 10;
    reasons.push('🔓 LP unlocked + mint authority active');
  }

  return { score: raw, reasons };
}

/**
 * Scores smart contract risk.
 */
function scoreSmartContract(s: NormalizedSignals): { score: number; reasons: string[] } {
  let raw = 0;
  const reasons: string[] = [];

  if (s.mintEnabled) {
    raw += 45;
    reasons.push('🔓 Mint authority active — can inflate supply & dump');
  }

  if (s.freezeEnabled) {
    raw += 30;
    reasons.push('🧊 Freeze authority active — can freeze wallets');
  }

  if (!s.mintEnabled && !s.freezeEnabled) {
    raw -= 5;
    reasons.push('✅ Mint & freeze both revoked');
  }
  if (!s.metadataMutable) {
    raw -= 2;
    reasons.push('✅ Immutable metadata');
  }

  return { score: Math.max(0, raw), reasons };
}

/**
 * Scores honeypot risk (on-chain taxes).
 */
function scoreHoneypot(s: NormalizedSignals): { score: number; reasons: string[] } {
  let raw = 0;
  const reasons: string[] = [];

  if (s.hasHiddenTax) {
    if (s.taxPct > 20) {
      raw += 45;
      reasons.push(`💸 Predatory tax: ${s.taxPct}% — likely exit scam`);
    } else {
      raw += 21;
      reasons.push(`💸 Hidden tax: ${s.taxPct}%`);
    }
  }

  return { score: Math.max(0, raw), reasons };
}

/**
 * Scores holder distribution.
 */
function scoreHolders(s: NormalizedSignals): { score: number; reasons: string[] } {
  let raw = 0;
  const reasons: string[] = [];

  if (s.whaleConcentration > 50) {
    const excess = s.whaleConcentration - 50;
    if (excess > 30) {
      raw += 16;
      reasons.push(`🐋 Top holders own ${s.whaleConcentration.toFixed(0)}% (incl. LP/burn) — extreme`);
    } else if (excess > 15) {
      raw += 8;
      reasons.push(`🐋 Top holders own ${s.whaleConcentration.toFixed(0)}% — concentrated`);
    } else {
      raw += 4;
      reasons.push(`🐋 Top holders own ${s.whaleConcentration.toFixed(0)}% — above 50% threshold`);
    }
  }

  if (s.insiderNetworks > 0) {
    raw += 14;
    reasons.push(`🕵️ ${s.insiderNetworks} insider network(s) — linked wallets`);
  }

  return { score: Math.max(0, raw), reasons };
}

/**
 * Scores RugCheck flags.
 */
function scoreRugCheckFlags(s: NormalizedSignals): { score: number; reasons: string[] } {
  let raw = 0;
  const reasons: string[] = [];

  if (s.isConfirmedRug) {
    raw += 70;
    reasons.push('⛔ RUGGED — confirmed on-chain');
  }

  if (s.rugCheckDangerCount > 0) {
    raw += Math.min(s.rugCheckDangerCount, 3) * 4;
    s.rugCheckDangerReasons.forEach((r) => reasons.push(`🚨 ${r}`));
    if (s.rugCheckDangerCount > 3) {
      reasons.push(`🚨 +${s.rugCheckDangerCount - 3} more flags`);
    }
  }

  if (s.hasApiData) {
    if (s.rugCheckScore <= 5) {
      raw -= 10;
      reasons.push(`✅ RugCheck: ${s.rugCheckScore} (clean)`);
    } else if (s.rugCheckScore <= 20) {
      raw -= 6;
      reasons.push(`✅ RugCheck: ${s.rugCheckScore} (okay)`);
    } else if (s.rugCheckScore > 60) {
      raw += 6;
      reasons.push(`⚠️ RugCheck: ${s.rugCheckScore} (flagged)`);
    }
  }

  return { score: Math.max(0, raw), reasons };
}

/**
 * Computes confidence in data.
 */
export function computeConfidence(s: NormalizedSignals): { confidence: number; level: ConfidenceLevel } {
  let c = 20;

  if (s.hasApiData) c += 40;
  if (s.hasReportData) c += 40;

  const confidence = Math.min(100, c);
  let level: ConfidenceLevel;
  if (confidence >= 70) level = 'high';
  else if (confidence >= 45) level = 'moderate';
  else if (confidence >= 25) level = 'low';
  else level = 'very_low';

  return { confidence, level };
}

/**
 * Maps score to risk level label.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 65) return 'critical';
  if (score >= 41) return 'high';
  if (score >= 16) return 'medium';
  return 'low';
}

export interface ScoredResult {
  address: string;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  securityReasons: string[];
}

/**
 * Main token scoring function.
 */
export function scoreToken(sec: SecurityProfile): ScoredResult {
  const signals = normalizeSignals(sec);

  const securityReasons: string[] = [];
  let totalScore = 0;

  const cats = [
    scoreLiquidity(signals),
    scoreSmartContract(signals),
    scoreHoneypot(signals),
    scoreHolders(signals),
    scoreRugCheckFlags(signals),
  ];

  for (const cat of cats) {
    totalScore += cat.score;
    securityReasons.push(...cat.reasons);
  }

  const finalScore = Math.max(0, Math.min(100, totalScore));
  const { confidence, level: confidenceLevel } = computeConfidence(signals);

  return {
    address: '',
    riskScore: finalScore,
    riskLevel: getRiskLevel(finalScore),
    confidence,
    confidenceLevel,
    securityReasons,
  };
}
