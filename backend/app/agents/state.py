from __future__ import annotations
import operator
from typing import TypedDict, List, Optional, Annotated

class AnalysisState(TypedDict):
    token_address: str
    # Raw data from APIs
    rugcheck_data: Optional[dict]
    dexscreener_data: Optional[dict]
    helius_data: Optional[dict]
    deterministic_metrics: Optional[dict]
    # Agent analysis results
    security_analysis: Optional[dict]
    holder_analysis: Optional[dict]
    sentiment_analysis: Optional[dict]
    # Final output
    risk_score: Optional[int]
    risk_level: Optional[str]
    confidence: Optional[int]
    report: Optional[dict]
    # Streaming log — uses operator.add reducer
    agent_log: Annotated[list, operator.add]
    # Error tracking
    error: Optional[str]
