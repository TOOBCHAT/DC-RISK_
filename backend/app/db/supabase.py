from __future__ import annotations
from typing import Optional
from supabase import create_client, Client
from app.config import settings

_supabase_client: Optional[Client] = None
_admin_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """Returns the singleton Supabase client with anon key."""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _supabase_client

def get_admin_client() -> Client:
    """Returns the singleton Supabase admin client with service_role_key."""
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _admin_client
