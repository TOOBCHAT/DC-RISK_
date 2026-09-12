import json
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from app.auth.middleware import get_current_user
from app.agents.graph import run_analysis

logger = logging.getLogger("dc-risk.analyze")
logging.basicConfig(level=logging.INFO)

router = APIRouter()

class AnalyzeRequest(BaseModel):
    token_address: str

@router.post("")
async def analyze_endpoint(req: AnalyzeRequest, user_id: str = Depends(get_current_user)):
    logger.info(f"[ANALYZE] Starting analysis for {req.token_address} (user: {user_id})")
    
    async def event_generator():
        try:
            final_state = {}
            async for update in run_analysis(req.token_address):
                # Each update is {node_name: state_update}
                for node_name, state_update in update.items():
                    logger.info(f"[ANALYZE] Node completed: {node_name}")
                    
                    # Merge into final_state
                    if isinstance(state_update, dict):
                        final_state.update(state_update)
                    
                    # Stream agent log entries
                    logs = state_update.get("agent_log", []) if isinstance(state_update, dict) else []
                    for log_entry in logs:
                        yield {
                            "event": "agent_update",
                            "data": json.dumps({
                                "type": "agent_update",
                                "node": node_name,
                                "message": log_entry.get("message", f"{node_name} completed"),
                                "timestamp": log_entry.get("timestamp", "")
                            })
                        }

            logger.info(f"[ANALYZE] All nodes complete. Final state keys: {list(final_state.keys())}")
            logger.info(f"[ANALYZE] Has report: {bool(final_state.get('report'))}")
            logger.info(f"[ANALYZE] Risk score: {final_state.get('risk_score')}")

            # Save to supabase
            if final_state.get("report"):
                try:
                    from app.db.supabase import get_admin_client
                    supabase = get_admin_client()
                    
                    report = final_state.get("report", {})
                    
                    supabase.table("analyses").insert({
                        "user_id": user_id,
                        "token_address": req.token_address,
                        "token_name": report.get("tokenName"),
                        "token_symbol": report.get("tokenSymbol"),
                        "risk_score": final_state.get("risk_score"),
                        "risk_level": final_state.get("risk_level"),
                        "confidence": final_state.get("confidence"),
                        "report_data": report,
                        "agent_log": final_state.get("agent_log", []),
                        "raw_data": {
                            "rugcheck": final_state.get("rugcheck_data"),
                            "dexscreener": final_state.get("dexscreener_data"),
                            "helius": final_state.get("helius_data")
                        }
                    }).execute()
                    logger.info(f"[ANALYZE] Saved to DB successfully")
                except Exception as db_err:
                    logger.error(f"[ANALYZE] DB save error: {db_err}")

            # Send final complete event
            yield {
                "event": "complete",
                "data": json.dumps({
                    "type": "complete",
                    "data": final_state.get("report")
                })
            }
            logger.info(f"[ANALYZE] Sent complete event to client")

        except Exception as e:
            logger.error(f"[ANALYZE] Error during analysis: {e}", exc_info=True)
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "message": str(e)})
            }

    return EventSourceResponse(event_generator())
