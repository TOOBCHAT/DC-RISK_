import json
from datetime import datetime, timezone
from app.agents.state import AnalysisState
from app.llm.factory import get_llm
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage

async def analyze_security(state: AnalysisState) -> dict:
    llm = get_llm()
    rugcheck_data = state.get("rugcheck_data", {})
    
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content="""You are a Solana Memecoin Security Analyst. Analyze the raw token data and assess the security risks. 
Output ONLY raw valid JSON (no markdown block, no ```json). Return a dict with these keys:
- mint_authority_status (string: revoked or active)
- freeze_authority_status (string: revoked or active)
- lp_lock_status (string)
- honeypot_indicators (list of strings)
- token_program_type (string)
- is_pump_fun (boolean)
- risk_summary (string)"""),
        ("user", "Analyze this raw token data: {data}")
    ])
    
    chain = prompt | llm
    result_str = (await chain.ainvoke({"data": json.dumps(rugcheck_data)})).content
    
    try:
        # Strip potential markdown formatting if model didn't listen
        clean_result = result_str.replace('```json', '').replace('```', '').strip()
        analysis = json.loads(clean_result)
    except Exception:
        analysis = {"error": "Failed to parse LLM output", "raw": result_str}
        
    return {
        "security_analysis": analysis,
        "agent_log": [{
            "agent": "security_analyzer",
            "status": "complete",
            "message": "Completed security analysis",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
