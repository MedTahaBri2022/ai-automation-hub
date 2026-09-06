from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.automations import router as automation_router
from app.routes.ai import router as ai_router
from app.routes.files import router as files_router
from app.routes.analysis import router as analysis_router
from app.routes.history import router as history_router


app = FastAPI(
    title="AI Automation Hub",
    description="AI-powered automation and business data analysis platform",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTES
# =========================================================

app.include_router(automation_router)
app.include_router(ai_router)
app.include_router(files_router)
app.include_router(analysis_router)
app.include_router(history_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "name": "AI Automation Hub",
        "version": "1.0.0",
        "status": "running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }