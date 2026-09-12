import json
from datetime import datetime, timezone
from app.agents.state import AnalysisState
from app.llm.factory import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage

async def analyze_holders(state: AnalysisState) -> dict:
    llm = get_llm()
    rugcheck_data = state.get("rugcheck_data", {})
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content="""You are a Solana Memecoin Holder Analyst. Analyze the holder distribution data.
Output ONLY raw valid JSON (no markdown block). Return a dict with these keys:
- top_10_concentration (float)
- insider_detection (string)
- creator_balance_status (string)
- wallet_clustering (string)
- risk_summary (string)"""),
        ("user", "Analyze this holder data: {data}")
    ])
    
    chain = prompt | llm
    result_str = (await chain.ainvoke({"data": json.dumps(rugcheck_data.get("topHolders", []))})).content
    
    try:
        clean_result = result_str.replace('```json', '').replace('```', '').strip()
        analysis = json.loads(clean_result)
    except Exception:
        analysis = {"error": "Failed to parse LLM output", "raw": result_str}
        
    return {
        "holder_analysis": analysis,
        "agent_log": [{
            "agent": "holder_analyzer",
            "status": "complete",
            "message": "Completed holder analysis",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
