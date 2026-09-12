from __future__ import annotations
from typing import Optional
import httpx

async def fetch_helius_data(token_address: str, api_key: Optional[str] = None) -> dict:
    if not api_key:
        return {}
    url = f"https://mainnet.helius-rpc.com/?api-key={api_key}"
    payload = {
        "jsonrpc": "2.0",
        "id": "1",
        "method": "getAsset",
        "params": {
            "id": token_address
        }
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return {"error": str(e)}
