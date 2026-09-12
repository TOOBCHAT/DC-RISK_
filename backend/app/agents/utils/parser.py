"""
Deterministic parser for RugCheck and DexScreener API payloads.
Extracts exact facts (Mint/Freeze status, LP Locked %, Top Holders, Markets, Supply, Liquidity)
directly from raw API responses without relying on LLM inference.
"""

def parse_deterministic_metrics(rugcheck_data: dict, dexscreener_data: dict, token_address: str) -> dict:
    if not isinstance(rugcheck_data, dict):
        rugcheck_data = {}
    if not isinstance(dexscreener_data, dict):
        dexscreener_data = {}

    # --- Token Metadata ---
    meta = rugcheck_data.get("tokenMeta", {})
    token_name = meta.get("name") or "Unknown Token"
    token_symbol = meta.get("symbol") or "TOKEN"
    mutable = meta.get("mutable", False)

    # --- Token Security Authorities ---
    token_info = rugcheck_data.get("token", {})
    mint_auth = token_info.get("mintAuthority")
    freeze_auth = token_info.get("freezeAuthority")

    mint_revoked = mint_auth is None or str(mint_auth).strip() == "" or str(mint_auth) == "11111111111111111111111111111111"
    freeze_revoked = freeze_auth is None or str(freeze_auth).strip() == "" or str(freeze_auth) == "11111111111111111111111111111111"

    total_supply = token_info.get("supply", 0)
    decimals = token_info.get("decimals", 6)
    if total_supply and decimals:
        formatted_supply = total_supply / (10 ** decimals)
    else:
        formatted_supply = total_supply

    # --- RugCheck Score & Risks ---
    # RugCheck returns raw risk penalty points (0 = good, >5000 = high risk)
    raw_rugcheck_score = rugcheck_data.get("score", 0) or 0
    rugcheck_risks = rugcheck_data.get("risks", [])
    
    risk_names = [r.get("name", "") for r in rugcheck_risks if isinstance(r, dict)]

    # --- Liquidity & LP Lock ---
    markets = rugcheck_data.get("markets", [])
    total_lp_locked_pct = 0.0
    parsed_markets = []

    if isinstance(markets, list):
        for m in markets:
            if not isinstance(m, dict):
                continue
            lp_info = m.get("lp", {})
            locked_pct = lp_info.get("lpLockedPct", 0.0) or 0.0
            burned_pct = lp_info.get("lpBurnedPct", 0.0) or 0.0
            combined_locked = min(100.0, float(locked_pct) + float(burned_pct))
            
            if combined_locked > total_lp_locked_pct:
                total_lp_locked_pct = combined_locked

            parsed_markets.append({
                "pubkey": m.get("pubkey", ""),
                "marketType": m.get("marketType", "DEX"),
                "liquidity": m.get("liquidity", 0),
                "lpLockedPct": round(combined_locked, 2)
            })

    # Fallback to DexScreener if RugCheck has no markets
    pairs = dexscreener_data.get("pairs", [])
    primary_pair = pairs[0] if isinstance(pairs, list) and len(pairs) > 0 else {}
    
    if not token_name or token_name == "Unknown Token":
        base_token = primary_pair.get("baseToken", {})
        token_name = base_token.get("name", token_name)
        token_symbol = base_token.get("symbol", token_symbol)

    liquidity_usd = primary_pair.get("liquidity", {}).get("usd", 0)

    # --- Top Holders & Insider Networks ---
    top_holders_raw = rugcheck_data.get("topHolders", [])
    parsed_holders = []
    top_10_pct_sum = 0.0
    insiders_count = 0

    if isinstance(top_holders_raw, list):
        for h in top_holders_raw[:10]:
            if not isinstance(h, dict):
                continue
            pct = float(h.get("pct", 0) or 0)
            is_insider = bool(h.get("insider", False))
            if is_insider:
                insiders_count += 1
            top_10_pct_sum += pct
            parsed_holders.append({
                "address": h.get("address", ""),
                "amount": h.get("uiAmount", h.get("amount", 0)),
                "pct": round(pct, 2),
                "isInsider": is_insider,
                "owner": h.get("owner", "")
            })

    creator_address = rugcheck_data.get("creator", "")
    creator_balance = rugcheck_data.get("creatorBalance", 0)

    return {
        "tokenName": token_name,
        "tokenSymbol": token_symbol,
        "tokenAddress": token_address,
        "rugcheckScore": raw_rugcheck_score,
        "mintAuthorityRevoked": mint_revoked,
        "freezeAuthorityRevoked": freeze_revoked,
        "metadataImmutable": not mutable,
        "lpLockedPct": round(total_lp_locked_pct, 2),
        "totalSupply": formatted_supply,
        "liquidityUsd": liquidity_usd,
        "creatorAddress": creator_address,
        "creatorBalance": creator_balance,
        "top10HoldersPct": round(top_10_pct_sum, 2),
        "insidersCount": insiders_count,
        "topHolders": parsed_holders,
        "markets": parsed_markets[:5],
        "riskFlags": risk_names
    }
