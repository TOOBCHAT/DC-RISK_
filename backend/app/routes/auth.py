from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.auth.wallet import generate_nonce, verify_solana_signature
from app.db.supabase import get_admin_client

router = APIRouter()

class VerifyRequest(BaseModel):
    public_key: str
    signature: str
    nonce: str

@router.post("/wallet/nonce")
async def get_nonce():
    nonce = generate_nonce()
    # In a real system, you would store this nonce associated with the IP or session temporarily
    # For simplicity, returning the nonce
    return {"nonce": nonce}

@router.post("/wallet/verify")
async def verify_wallet(req: VerifyRequest):
    # The frontend signs a formatted message, not just the nonce
    expected_message = f"DC-RISK Authentication\nNonce: {req.nonce}"
    
    print(f"DEBUG - Verifying Wallet:")
    print(f"Public Key: {req.public_key}")
    print(f"Signature: {req.signature}")
    print(f"Expected Message: {repr(expected_message)}")
    
    # Verify the signature
    is_valid = verify_solana_signature(req.public_key, req.signature, expected_message)
    print(f"DEBUG - Is Valid? {is_valid}")
    
    if not is_valid:
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid signature. PK: {req.public_key[:8]}..., Expected Msg: {repr(expected_message)}"
        )
    
    admin_client = get_admin_client()
    email = f"{req.public_key}@wallet.local"
    
    try:
        dummy_password = "Wallet-Auth-Password-123!"
        initial_sign_in_error = None
        
        # 1. Try to sign in first
        try:
            sign_in_res = admin_client.auth.sign_in_with_password({
                "email": email,
                "password": dummy_password
            })
            return {
                "access_token": sign_in_res.session.access_token,
                "refresh_token": sign_in_res.session.refresh_token
            }
        except Exception as sign_in_err:
            initial_sign_in_error = str(sign_in_err)
            print(f"DEBUG - Sign in failed: {initial_sign_in_error}")
            # It failed. Let's try to create the user instead.
            
        # 2. If we reach here, sign in failed. Try to create the user.
        try:
            sign_up_res = admin_client.auth.admin.create_user({
                "email": email,
                "password": dummy_password,
                "email_confirm": True
            })
            
            # Now sign in again
            sign_in_res = admin_client.auth.sign_in_with_password({
                "email": email,
                "password": dummy_password
            })
            return {
                "access_token": sign_in_res.session.access_token,
                "refresh_token": sign_in_res.session.refresh_token
            }
        except Exception as sign_up_err:
            print(f"DEBUG - Sign up failed: {sign_up_err}")
            raise HTTPException(status_code=400, detail=f"Sign in error: {initial_sign_in_error}. Sign up error: {sign_up_err}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.auth.middleware import get_current_user
from fastapi import Depends

@router.delete("/account")
async def delete_account(user_id: str = Depends(get_current_user)):
    """Deletes the user's account and all their data."""
    admin_client = get_admin_client()
    try:
        # Delete user from auth.users (this triggers cascade deletes for tables tied to user_id if setup correctly in SQL)
        admin_client.auth.admin.delete_user(user_id)
        return {"message": "Account successfully deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")
