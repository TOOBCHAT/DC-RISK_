import secrets
import base58
import nacl.signing
import nacl.exceptions

def generate_nonce() -> str:
    """Generates a secure random nonce for wallet signing."""
    return secrets.token_hex(16)

def verify_solana_signature(public_key: str, signature: str, message: str) -> bool:
    """
    Verifies an ed25519 signature from a Solana wallet.
    public_key and signature should be base58 encoded strings.
    """
    try:
        # Decode base58 strings
        pk_bytes = base58.b58decode(public_key)
        sig_bytes = base58.b58decode(signature)
        msg_bytes = message.encode('utf-8')

        # Create verify key
        verify_key = nacl.signing.VerifyKey(pk_bytes)
        
        # Verify message
        verify_key.verify(msg_bytes, sig_bytes)
        return True
    except (ValueError, nacl.exceptions.BadSignatureError, Exception):
        return False
