import asyncio
from datetime import datetime, timezone
from app.agents.state import AnalysisState
from app.agents.tools.rugcheck import fetch_rugcheck_data
from app.agents.tools.dexscreener import fetch_dexscreener_data
from app.agents.tools.helius import fetch_helius_data
from app.agents.utils.parser import parse_deterministic_metrics
from app.config import settings

async def fetch_token_data(state: AnalysisState) -> dict:
    token_address = state["token_address"]
    
    # Fetch in parallel from external APIs
    rugcheck_task = fetch_rugcheck_data(token_address)
    dexscreener_task = fetch_dexscreener_data(token_address)
    helius_task = fetch_helius_data(token_address, settings.helius_api_key)
    
    rugcheck_data, dexscreener_data, helius_data = await asyncio.gather(
        rugcheck_task, dexscreener_task, helius_task
    )
    
    # Extract exact facts deterministically
    deterministic_metrics = parse_deterministic_metrics(rugcheck_data, dexscreener_data, token_address)
    
    return {
        "rugcheck_data": rugcheck_data,
        "dexscreener_data": dexscreener_data,
        "helius_data": helius_data,
        "deterministic_metrics": deterministic_metrics,
        "agent_log": [{
            "agent": "data_fetcher",
            "status": "complete",
            "message": f"Extracted metrics for {deterministic_metrics.get('tokenName', 'token')} ({deterministic_metrics.get('tokenSymbol', '')})",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
