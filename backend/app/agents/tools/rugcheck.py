import httpx

async def fetch_rugcheck_data(token_address: str) -> dict:
    url = f"https://api.rugcheck.xyz/v1/tokens/{token_address}/report"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        return {"error": str(e)}
