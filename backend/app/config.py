import json
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    supabase_url: str = Field(default='', env='SUPABASE_URL')
    supabase_anon_key: str = Field(default='', env='SUPABASE_ANON_KEY')
    supabase_service_role_key: str = Field(default='', env='SUPABASE_SERVICE_ROLE_KEY')
    
    llm_provider: str = Field(default='gemini', env='LLM_PROVIDER')
    gemini_model: str = Field(default='gemini-3.6-flash', env='GEMINI_MODEL')
    google_api_key: Optional[str] = Field(None, env='GOOGLE_API_KEY')
    openai_api_key: Optional[str] = Field(None, env='OPENAI_API_KEY')
    anthropic_api_key: Optional[str] = Field(None, env='ANTHROPIC_API_KEY')
    deepseek_api_key: Optional[str] = Field(None, env='DEEPSEEK_API_KEY')
    
    helius_api_key: Optional[str] = Field(None, env='HELIUS_API_KEY')
    
    host: str = Field(default='0.0.0.0', env='HOST')
    port: int = Field(default=8000, env='PORT')
    cors_origins: List[str] = Field(default=["*"], env='CORS_ORIGINS')
    
    @field_validator('cors_origins', mode='before')
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [i.strip() for i in v.split(',') if i.strip()]
        return v

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
