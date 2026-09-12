from fastapi import APIRouter, Depends, HTTPException, Query
from app.auth.middleware import get_current_user
from app.db.supabase import get_supabase_client

router = APIRouter()

@router.get("")
async def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_current_user)
):
    supabase = get_supabase_client()
    try:
        res = supabase.table("analyses").select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        return {"data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{analysis_id}")
async def get_analysis_by_id(
    analysis_id: str,
    user_id: str = Depends(get_current_user)
):
    supabase = get_supabase_client()
    try:
        res = supabase.table("analyses").select("*")\
            .eq("id", analysis_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Analysis not found")
            
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("")
async def clear_all_history(user_id: str = Depends(get_current_user)):
    supabase = get_supabase_client()
    try:
        supabase.table("analyses").delete().eq("user_id", user_id).execute()
        return {"message": "All history cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{analysis_id}")
async def delete_history_item(
    analysis_id: str,
    user_id: str = Depends(get_current_user)
):
    supabase = get_supabase_client()
    try:
        supabase.table("analyses").delete().eq("id", analysis_id).eq("user_id", user_id).execute()
        return {"message": "History item deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
