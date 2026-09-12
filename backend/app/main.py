from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import analyze, history, auth

app = FastAPI(title="DC-RISK Solana Memecoin Risk Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(history.router, prefix="/api/history", tags=["history"])

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "ok", "service": "dc-risk-backend"}
