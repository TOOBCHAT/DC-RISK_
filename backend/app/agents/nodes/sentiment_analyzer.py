import json
from datetime import datetime, timezone
from app.agents.state import AnalysisState
from app.llm.factory import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage

async def analyze_sentiment(state: AnalysisState) -> dict:
    llm = get_llm()
    dex_data = state.get("dexscreener_data", {})
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content="""You are a Solana Memecoin Market Analyst. Analyze the market and sentiment data from DexScreener.
Output ONLY raw valid JSON (no markdown block). Return a dict with these keys:
- volume_liquidity_ratio_status (string)
- token_age_status (string)
- price_action (string)
- buy_sell_ratio (string)
- risk_summary (string)"""),
        ("user", "Analyze this market data: {data}")
    ])
    
    chain = prompt | llm
    result_str = (await chain.ainvoke({"data": json.dumps(dex_data)})).content
    
    try:
        clean_result = result_str.replace('```json', '').replace('```', '').strip()
        analysis = json.loads(clean_result)
    except Exception:
        analysis = {"error": "Failed to parse LLM output", "raw": result_str}
        
    return {
        "sentiment_analysis": analysis,
        "agent_log": [{
            "agent": "sentiment_analyzer",
            "status": "complete",
            "message": "Completed sentiment analysis",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
