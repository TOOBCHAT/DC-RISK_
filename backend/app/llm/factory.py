from __future__ import annotations
from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings

def get_llm(provider: Optional[str] = None, **kwargs) -> BaseChatModel:
    """
    Provider-agnostic LLM factory returning a LangChain BaseChatModel.
    """
    selected_provider = (provider or settings.llm_provider).lower()

    if selected_provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is not set.")
        model_name = getattr(settings, 'gemini_model', None) or 'gemini-3.6-flash'
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=settings.google_api_key,
            temperature=0,
            **kwargs
        )
    elif selected_provider == "openai":
        from langchain_openai import ChatOpenAI
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set.")
        return ChatOpenAI(
            model="gpt-4o",
            api_key=settings.openai_api_key,
            temperature=0,
            **kwargs
        )
    elif selected_provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set.")
        return ChatAnthropic(
            model="claude-3-5-sonnet-20240620",
            api_key=settings.anthropic_api_key,
            temperature=0,
            **kwargs
        )
    elif selected_provider == "deepseek":
        from langchain_openai import ChatOpenAI
        if not settings.deepseek_api_key:
            raise ValueError("DEEPSEEK_API_KEY is not set.")
        return ChatOpenAI(
            model="deepseek-chat",
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com",
            temperature=0,
            **kwargs
        )
    else:
        raise ValueError(f"Unknown LLM provider: {selected_provider}")
