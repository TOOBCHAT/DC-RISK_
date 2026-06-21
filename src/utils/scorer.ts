import type {
  SecurityProfile,
  TradingMetrics,
  RiskCheckConfig,
  RiskLevel,
  ConfidenceLevel,
} from '../types';

export interface NormalizedSignals {
  mintEnabled: boolean;
  freezeEnabled: boolean;
  metadataMutable: boolean;
  hasHiddenTax: boolean;
  taxPct: number;
  cantSell: boolean;
  maybeCantSell: boolean;
  liqMcapRatio: number;
  rawLiquidityUSD: number;
  lpLocked: boolean;
  isLpRelevant: boolean;
  whaleConcentration: number;
  insiderNetworks: number;
  buyRatio: number;
  totalTxns: number;
  isBotPump: boolean;
  isCoordinatedDump: boolean;
  isGhostToken: boolean;
  priceCrash1h: number;
  ageMinutes: number;
  rugCheckScore: number;
  rugCheckDangerCount: number;
  rugCheckDangerReasons: string[];
  isConfirmedRug: boolean;
  hasApiData: boolean;
  hasReportData: boolean;
  hasTradingData: boolean;
}

/**
 * Weight multiplier. Converts a 1-3 weight value to a multiplier.
 */
function wMul(w: 1 | 2 | 3): number {
  return w === 1 ? 0.5 : w === 3 ? 1.5 : 1.0;
}

/**
 * Maps minutes into a human-readable duration string.
 */
function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${(mins / 60).toFixed(1)}h`;
  return `${(mins / 1440).toFixed(1)}d`;
}

/**
 * Normalizes raw security profile + trading metrics into deduped signals.
 */
export function normalizeSignals(sec: SecurityProfile, m: TradingMetrics): NormalizedSignals {
  const totalTxns = m.buys + m.sells;
  const buyRatio = totalTxns > 0 ? m.buys / totalTxns : 0.5;

  const isLpRelevant = sec.lpLockedPct > 0 || !sec.mintAuthorityRevoked;

  const cantSell = m.buys > 50 && m.sells === 0 && m.ageMinutes > 10;
  const maybeCantSell = m.buys > 5 && m.sells === 0 && m.ageMinutes <= 10;

  const dangerRisks = (sec.rugCheckRisks || []).filter((r) => r.level === 'danger');

  return {
    mintEnabled: !sec.mintAuthorityRevoked,
    freezeEnabled: !sec.freezeAuthorityRevoked,
    metadataMutable: !sec.metadataImmutable,
    hasHiddenTax: sec.transferFeePct > 5,
    taxPct: sec.transferFeePct,
    cantSell,
    maybeCantSell,
    liqMcapRatio: m.marketCapUSD > 0 ? m.liquidityUSD / m.marketCapUSD : 1,
    rawLiquidityUSD: m.liquidityUSD,
    lpLocked: sec.lpLockedPct > 50,
    isLpRelevant,
    whaleConcentration: sec.topHolderConcentration,
    insiderNetworks: sec.insidersDetected,
    buyRatio,
    totalTxns,
    isBotPump: totalTxns > 20 && buyRatio > 0.97,
    isCoordinatedDump: totalTxns > 20 && buyRatio < 0.03,
    isGhostToken: m.buys === 0 && m.sells === 0 && m.traders === 0,
    priceCrash1h: m.priceChange1h,
    ageMinutes: m.ageMinutes,
    rugCheckScore: sec.rugCheckScore,
    rugCheckDangerCount: dangerRisks.length,
    rugCheckDangerReasons: dangerRisks.slice(0, 3).map((r) => `${r.name}: ${r.description}`),
    isConfirmedRug: sec.isRugged,
    hasApiData: sec.rugCheckScore !== 50,
    hasReportData: sec.topHolderConcentration > 0 || sec.insidersDetected > 0,
    hasTradingData: totalTxns > 0 || m.traders > 0,
  };
}

/**
 * Scores liquidity risk.
 */
function scoreLiquidity(s: NormalizedSignals, cfg: RiskCheckConfig['liquidity']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (cfg.checkLiqMcapRatio) {
    if (s.liqMcapRatio < 0.005) {
      raw += 8;
      reasons.push(`📊 Liq/MCap ${(s.liqMcapRatio * 100).toFixed(2)}% — paper-thin, easy rug`);
    } else if (s.liqMcapRatio < 0.02) {
      raw += 4;
      reasons.push(`📊 Liq/MCap ${(s.liqMcapRatio * 100).toFixed(1)}% — thin liquidity`);
    }
  }

  if (cfg.checkLowLiquidity && s.rawLiquidityUSD > 0 && s.rawLiquidityUSD < 500) {
    raw += 4;
    reasons.push(`💧 Extremely low liquidity: $${Math.round(s.rawLiquidityUSD)}`);
  }

  if (cfg.checkLpLocked && s.isLpRelevant && !s.lpLocked && s.mintEnabled) {
    raw += 5;
    reasons.push('🔓 LP unlocked + mint authority active');
  }

  if (s.liqMcapRatio > 0.1) {
    raw -= 3;
    reasons.push(`✅ Strong liq/mcap ratio: ${(s.liqMcapRatio * 100).toFixed(0)}%`);
  }

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Scores smart contract risk.
 */
function scoreSmartContract(s: NormalizedSignals, cfg: RiskCheckConfig['smartContract']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (cfg.checkMintAuthority && s.mintEnabled) {
    raw += 15;
    reasons.push('🔓 Mint authority active — can inflate supply & dump');
  }

  if (cfg.checkFreezeAuthority && s.freezeEnabled) {
    raw += 10;
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

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Scores honeypot risk.
 */
function scoreHoneypot(s: NormalizedSignals, cfg: RiskCheckConfig['honeypot']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (cfg.checkCantSell && s.cantSell) {
    raw += 20;
    reasons.push(`🪤 Honeypot: buys but 0 sells after ${fmtDuration(s.ageMinutes)}`);
  }

  if (cfg.checkCantSell && s.maybeCantSell) {
    raw += 3;
    reasons.push('⏳ No sells yet — too early to confirm (watching)');
  }

  if (cfg.checkHiddenTax && s.hasHiddenTax) {
    if (s.taxPct > 20) {
      raw += 15;
      reasons.push(`💸 Predatory tax: ${s.taxPct}% — likely exit scam`);
    } else {
      raw += 7;
      reasons.push(`💸 Hidden tax: ${s.taxPct}%`);
    }
  }

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Scores holder distribution.
 */
function scoreHolders(s: NormalizedSignals, cfg: RiskCheckConfig['holderDistribution']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (cfg.checkWhaleConcentration && s.whaleConcentration > cfg.whaleThreshold) {
    const excess = s.whaleConcentration - cfg.whaleThreshold;
    if (excess > 30) {
      raw += 8;
      reasons.push(`🐋 Top holders own ${s.whaleConcentration.toFixed(0)}% (incl. LP/burn) — extreme`);
    } else if (excess > 15) {
      raw += 4;
      reasons.push(`🐋 Top holders own ${s.whaleConcentration.toFixed(0)}% — concentrated`);
    } else {
      raw += 2;
      reasons.push(`🐋 Top holders own ${s.whaleConcentration.toFixed(0)}% — above ${cfg.whaleThreshold}% threshold`);
    }
  }

  if (cfg.checkInsiders && s.insiderNetworks > 0) {
    raw += 7;
    reasons.push(`🕵️ ${s.insiderNetworks} insider network(s) — linked wallets`);
  }

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Scores trading patterns.
 */
function scoreTradingPatterns(s: NormalizedSignals, cfg: RiskCheckConfig['tradingPatterns']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (cfg.checkPumpDump) {
    if (s.priceCrash1h < -90) {
      raw += 12;
      reasons.push(`💥 Crashed ${s.priceCrash1h.toFixed(0)}% in 1h — active rug`);
    } else if (s.priceCrash1h < -70) {
      raw += 5;
      reasons.push(`📉 Dropped ${s.priceCrash1h.toFixed(0)}% in 1h`);
    }
  }

  if (cfg.checkBotActivity && s.isBotPump) {
    raw += 5;
    reasons.push(`🤖 ${(s.buyRatio * 100).toFixed(0)}% buys — bot-driven pump`);
  }

  if (cfg.checkCoordinatedDump && s.isCoordinatedDump) {
    raw += 7;
    reasons.push(`📉 ${((1 - s.buyRatio) * 100).toFixed(0)}% sells — coordinated dump`);
  }

  if (s.isGhostToken) {
    raw += 2;
    reasons.push('👻 Ghost token — zero activity');
  }

  if (s.totalTxns > 50 && s.buyRatio >= 0.25 && s.buyRatio <= 0.75) {
    raw -= 3;
    reasons.push('✅ Balanced buy/sell ratio');
  }

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Scores token age.
 */
function scoreTokenAge(s: NormalizedSignals, cfg: RiskCheckConfig['tokenAge']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (cfg.checkVeryNew && s.ageMinutes > 0 && s.ageMinutes < cfg.newTokenMinutes) {
    raw += 4;
    reasons.push(`⏰ Very new (${fmtDuration(s.ageMinutes)}) — most rugs happen early`);
  }

  if (s.ageMinutes > 1440) {
    raw -= 3;
    reasons.push(`✅ Survived 24h+ (${fmtDuration(s.ageMinutes)})`);
  }

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Scores RugCheck flags.
 */
function scoreRugCheckFlags(s: NormalizedSignals, cfg: RiskCheckConfig['rugcheckFlags']): { score: number; reasons: string[] } {
  if (!cfg.enabled) return { score: 0, reasons: [] };
  let raw = 0;
  const reasons: string[] = [];

  if (s.isConfirmedRug) {
    raw += 35;
    reasons.push('⛔ RUGGED — confirmed on-chain');
  }

  if (s.rugCheckDangerCount > 0) {
    raw += Math.min(s.rugCheckDangerCount, 3) * 2;
    s.rugCheckDangerReasons.forEach((r) => reasons.push(`🚨 ${r}`));
    if (s.rugCheckDangerCount > 3) {
      reasons.push(`🚨 +${s.rugCheckDangerCount - 3} more flags`);
    }
  }

  if (cfg.trustRugCheckScore && s.hasApiData) {
    if (s.rugCheckScore <= 5) {
      raw -= 5;
      reasons.push(`✅ RugCheck: ${s.rugCheckScore} (clean)`);
    } else if (s.rugCheckScore <= 20) {
      raw -= 3;
      reasons.push(`✅ RugCheck: ${s.rugCheckScore} (okay)`);
    } else if (s.rugCheckScore > 60) {
      raw += 3;
      reasons.push(`⚠️ RugCheck: ${s.rugCheckScore} (flagged)`);
    }
  }

  return { score: Math.max(0, Math.round(raw * wMul(cfg.weight))), reasons };
}

/**
 * Computes confidence in data.
 */
export function computeConfidence(s: NormalizedSignals): { confidence: number; level: ConfidenceLevel } {
  let c = 0;

  if (s.ageMinutes > 1440) c += 30;
  else if (s.ageMinutes > 60) c += 20;
  else if (s.ageMinutes > 10) c += 10;
  else c += 2;

  if (s.hasApiData) c += 15;
  if (s.hasReportData) c += 15;

  if (s.totalTxns > 100) c += 25;
  else if (s.totalTxns > 20) c += 15;
  else if (s.totalTxns > 5) c += 8;
  else if (s.hasTradingData) c += 3;

  if (s.rawLiquidityUSD > 10_000) c += 15;
  else if (s.rawLiquidityUSD > 1_000) c += 10;
  else if (s.rawLiquidityUSD > 0) c += 5;

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
  description: string;
  securityBreakdown: string;
  tradingBreakdown: string;
  securityReasons: string[];
  tradingReasons: string[];
}

/**
 * Main token scoring function.
 */
export function scoreToken(sec: SecurityProfile, m: TradingMetrics, config: RiskCheckConfig): ScoredResult {
  const signals = normalizeSignals(sec, m);

  const securityReasons: string[] = [];
  const tradingReasons: string[] = [];
  let totalScore = 0;

  const cats = [
    { ...scoreLiquidity(signals, config.liquidity), bucket: 'sec' },
    { ...scoreSmartContract(signals, config.smartContract), bucket: 'sec' },
    { ...scoreHoneypot(signals, config.honeypot), bucket: 'sec' },
    { ...scoreHolders(signals, config.holderDistribution), bucket: 'sec' },
    { ...scoreRugCheckFlags(signals, config.rugcheckFlags), bucket: 'sec' },
    { ...scoreTradingPatterns(signals, config.tradingPatterns), bucket: 'trade' },
    { ...scoreTokenAge(signals, config.tokenAge), bucket: 'trade' },
  ];

  for (const cat of cats) {
    totalScore += cat.score;
    if (cat.bucket === 'sec') securityReasons.push(...cat.reasons);
    else tradingReasons.push(...cat.reasons);
  }

  const finalScore = Math.max(0, Math.min(100, totalScore));
  const { confidence, level: confidenceLevel } = computeConfidence(signals);

  return {
    address: '',
    riskScore: finalScore,
    riskLevel: getRiskLevel(finalScore),
    confidence,
    confidenceLevel,
    description: '',
    securityBreakdown: '',
    tradingBreakdown: '',
    securityReasons,
    tradingReasons,
  };
}

export const DEFAULT_RISK_CHECKS: RiskCheckConfig = {
  liquidity: { enabled: true, checkLpLocked: true, checkLowLiquidity: true, checkLiqMcapRatio: true, weight: 2 },
  smartContract: { enabled: true, checkMintAuthority: true, checkFreezeAuthority: true, checkTransferFees: true, weight: 3 },
  honeypot: { enabled: true, checkCantSell: true, checkHiddenTax: true, weight: 3 },
  holderDistribution: { enabled: true, checkWhaleConcentration: true, checkInsiders: true, whaleThreshold: 50, weight: 2 },
  tradingPatterns: { enabled: true, checkPumpDump: true, checkBotActivity: true, checkCoordinatedDump: true, weight: 2 },
  tokenAge: { enabled: true, checkVeryNew: true, newTokenMinutes: 60, weight: 1 },
  rugcheckFlags: { enabled: true, trustRugCheckScore: true, weight: 2 },
};

export const NEUTRAL_METRICS: TradingMetrics = {
  marketCapUSD: 250000,
  ageMinutes: 1440,
  buys: 250,
  sells: 230,
  volumeUSD: 85000,
  traders: 180,
  priceChange5m: 0.5,
  priceChange1h: 1.2,
  priceChange6h: 4.5,
  priceChange24h: 12.0,
  liquidityUSD: 150000,
};
