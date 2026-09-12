/**
 * Type definitions for the DC-RISK application.
 * These types are used across the frontend for auth, analysis, and history.
 */

// ─── Risk Levels ────────────────────────────────────────────────
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'unknown';

// ─── AI Agent Log Entry ─────────────────────────────────────────
export interface AgentLogEntry {
  agent: string;
  status: 'running' | 'complete' | 'error';
  message: string;
  timestamp: string;
}

// ─── Security Breakdown ─────────────────────────────────────────
export interface SecurityBreakdown {
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  metadataImmutable: boolean;
  lpLockedPct: number;
  lpBurned: boolean;
  hasTransferFee: boolean;
  transferFeePct: number;
  isPumpFun: boolean;
  tokenProgram: string;
  riskFactors: string[];
  safeFactors: string[];
}

// ─── Holder Breakdown ───────────────────────────────────────────
export interface HolderBreakdown {
  topHolderConcentration: number;
  insidersDetected: number;
  sniperWalletsDetected: number;
  creatorBalanceSold: boolean;
  riskFactors: string[];
  safeFactors: string[];
  topHolders: Array<{
    address: string;
    pct: number;
    isInsider: boolean;
    label?: string;
  }>;
}

// ─── Sentiment Breakdown ────────────────────────────────────────
export interface SentimentBreakdown {
  volumeToLiquidityRatio: number;
  tokenAgeMinutes: number;
  priceChangePercent: number;
  buyCount: number;
  sellCount: number;
  riskFactors: string[];
  safeFactors: string[];
}

// ─── Full AI Risk Report ────────────────────────────────────────
export interface RiskReport {
  riskScore: number;
  riskLevel: RiskLevel;
  confidence: number;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
  security: SecurityBreakdown;
  holders: HolderBreakdown;
  sentiment: SentimentBreakdown;
  aiSummary: string;
  recommendation: 'safe' | 'caution' | 'avoid';
  keyRiskFactors: string[];
  rawData?: {
    rugcheck?: Record<string, unknown>;
    dexscreener?: Record<string, unknown>;
    helius?: Record<string, unknown>;
  };
}

// ─── SSE Event Types ────────────────────────────────────────────
export type SSEEventType = 'agent_update' | 'complete' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: AgentLogEntry | RiskReport | { message: string };
}

// ─── Analysis History ───────────────────────────────────────────
export interface AnalysisHistoryItem {
  id: string;
  token_address: string;
  token_name: string | null;
  token_symbol: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  created_at: string;
}

export interface AnalysisDetail extends AnalysisHistoryItem {
  report_data: RiskReport;
  agent_log: AgentLogEntry[];
  raw_data: Record<string, unknown>;
}

// ─── Confidence Level ───────────────────────────────────────────
export type ConfidenceLevel = 'very_low' | 'low' | 'moderate' | 'high';

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 70) return 'high';
  if (confidence >= 45) return 'moderate';
  if (confidence >= 25) return 'low';
  return 'very_low';
}
