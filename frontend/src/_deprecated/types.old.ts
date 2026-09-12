/**
 * Shared Types — Solana Token Risk Analyzer
 * -----------------------------------------------
 * Uses RugCheck API (api.rugcheck.xyz) for on-chain security data
 */

// ─── Risk Levels ────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown' | 'error';

// ─── RugCheck API Types ─────────────────────────────────────────

/** Individual risk flag from RugCheck */
export interface RugCheckRisk {
  name: string;
  value: string;
  description: string;
  score: number;
  level: 'warn' | 'danger' | 'info' | 'good';
}

/** RugCheck /report/summary response */
export interface RugCheckSummary {
  tokenProgram: string;
  tokenType: string;
  risks: RugCheckRisk[];
  score: number;            // raw score (higher = riskier)
  score_normalised: number; // 0-100+ normalized (lower = safer: USDC=1, clean memecoin=16, risky=53)
  lpLockedPct: number;      // percentage of LP locked (0-100)
}

export interface RugCheckMarket {
  pubkey: string;
  marketType?: string;
  source?: string;
  liquidityA?: number;
  lp?: {
    usd: number;
    lpLockedPct: number;
  };
}

/** RugCheck /report response (key fields only) */
export interface RugCheckReport {
  mint: string;
  creator: string;
  creatorBalance: number;
  token: {
    mintAuthority: string | null;
    supply: number;
    decimals: number;
    isInitialized: boolean;
    freezeAuthority: string | null;
  };
  tokenMeta: {
    name: string;
    symbol: string;
    uri: string;
    mutable: boolean;
    updateAuthority: string;
  };
  topHolders: Array<{
    address: string;
    pct: number;
    owner: string;
    insider: boolean;
    amount: number;
  }> | null;
  freezeAuthority: string | null;
  mintAuthority: string | null;
  risks: RugCheckRisk[];
  score: number;
  score_normalised: number;
  totalMarketLiquidity: number;
  totalLPProviders: number;
  totalHolders: number;
  price: number;
  rugged: boolean;
  transferFee: {
    pct: number;
    maxAmount: number;
    authority: string;
  };
  graphInsidersDetected: number;
  markets: RugCheckMarket[] | null;
}


// ─── Combined Risk Assessment ───────────────────────────────────

/** Security attributes from on-chain analysis */
export interface SecurityProfile {
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  metadataImmutable: boolean;
  lpLockedPct: number;
  topHolderConcentration: number;  // top 10 holders % of supply
  insidersDetected: number;
  hasTransferFee: boolean;
  transferFeePct: number;
  isRugged: boolean;
  rugCheckScore: number;           // normalized 0-100+ from RugCheck (lower = safer)
  rugCheckRisks: RugCheckRisk[];
}

/** Confidence in the risk assessment */
export type ConfidenceLevel = 'very_low' | 'low' | 'moderate' | 'high';

