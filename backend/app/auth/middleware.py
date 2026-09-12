from fastapi import Header, HTTPException, Depends
from app.db.supabase import get_supabase_client

def get_current_user(authorization: str = Header(...)) -> str:
    """
    Extracts Bearer token and verifies JWT with Supabase.
    Returns the user ID (UUID).
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = authorization.split(" ")[1]
    supabase = get_supabase_client()
    
    try:
        user_res = supabase.auth.get_user(token)
        if user_res.user:
            return user_res.user.id
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
