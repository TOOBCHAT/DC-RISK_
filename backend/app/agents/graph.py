from langgraph.graph import StateGraph, START, END
from app.agents.state import AnalysisState
from app.agents.nodes.data_fetcher import fetch_token_data
from app.agents.nodes.risk_synthesizer import synthesize_risk

def create_analysis_graph():
    workflow = StateGraph(AnalysisState)
    
    workflow.add_node("data_fetcher", fetch_token_data)
    workflow.add_node("risk_synthesizer", synthesize_risk)
    
    workflow.add_edge(START, "data_fetcher")
    workflow.add_edge("data_fetcher", "risk_synthesizer")
    workflow.add_edge("risk_synthesizer", END)
    
    return workflow.compile()

async def run_analysis(token_address: str):
    graph = create_analysis_graph()
    initial_state = {
        "token_address": token_address,
        "agent_log": []
    }
    
    async for output in graph.astream(initial_state):
        yield output
