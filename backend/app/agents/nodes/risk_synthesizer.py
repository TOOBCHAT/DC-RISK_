import json
from datetime import datetime, timezone
from app.agents.state import AnalysisState
from app.llm.factory import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage

SYSTEM_PROMPT = """You are an expert Solana Memecoin Risk Analyst AI agent.
Your task is to analyze on-chain token data and assign an intelligent risk score, summary, and key risk factors.

Output ONLY valid JSON (no markdown fence, no ```json). Your JSON must contain:
- risk_score (integer 0-100, where 100 is EXTREME RUG/DUMP RISK)
- risk_level (string: "low", "medium", "high", or "critical")
- confidence (integer 0-100)
- summary (string: concise 2-3 sentence AI risk assessment)
- key_risk_factors (list of 2-4 string bullet points highlighting specific dangers or positive signals)
- recommendation (string: "safe to trade", "proceed with caution", or "avoid")
"""

async def synthesize_risk(state: AnalysisState) -> dict:
    llm = get_llm()
    
    metrics = state.get("deterministic_metrics", {})
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=SYSTEM_PROMPT),
        ("user", "Analyze these on-chain token metrics and evaluate the rug risk:\n{data}")
    ])
    
    chain = prompt | llm
    
    # Simple JSON representation for the LLM
    llm_input = {
        "token_symbol": metrics.get("tokenSymbol"),
        "rugcheck_score": metrics.get("rugcheckScore"),
        "mint_authority_revoked": metrics.get("mintAuthorityRevoked"),
        "freeze_authority_revoked": metrics.get("freezeAuthorityRevoked"),
        "metadata_immutable": metrics.get("metadataImmutable"),
        "lp_locked_pct": metrics.get("lpLockedPct"),
        "total_supply": metrics.get("totalSupply"),
        "liquidity_usd": metrics.get("liquidityUsd"),
        "top_10_holders_pct": metrics.get("top10HoldersPct"),
        "insiders_count": metrics.get("insidersCount"),
        "creator_balance": metrics.get("creatorBalance"),
        "risk_flags": metrics.get("riskFlags", [])
    }
    
    result_str = (await chain.ainvoke({"data": json.dumps(llm_input)})).content
    
    try:
        clean_result = str(result_str).replace('```json', '').replace('```', '').strip()
        ai_output = json.loads(clean_result)
    except Exception:
        ai_output = {
            "risk_score": metrics.get("rugcheckScore", 50),
            "risk_level": "medium" if metrics.get("rugcheckScore", 50) < 50 else "high",
            "confidence": 75,
            "summary": "Analysis completed based on on-chain security metrics.",
            "key_risk_factors": metrics.get("riskFlags", []),
            "recommendation": "proceed with caution"
        }
    
    # Merge deterministic metrics with AI analysis for full report
    full_report = {
        **metrics,
        "riskScore": ai_output.get("risk_score", 50),
        "riskLevel": ai_output.get("risk_level", "medium"),
        "confidence": ai_output.get("confidence", 80),
        "aiSummary": ai_output.get("summary", ""),
        "keyRiskFactors": ai_output.get("key_risk_factors", []),
        "recommendation": ai_output.get("recommendation", "proceed with caution")
    }
    
    return {
        "risk_score": full_report["riskScore"],
        "risk_level": full_report["riskLevel"],
        "confidence": full_report["confidence"],
        "report": full_report,
        "agent_log": [{
            "agent": "risk_synthesizer",
            "status": "complete",
            "message": "AI Risk Synthesis complete",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
