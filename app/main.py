"""
Punto de entrada de la API.

Corre con:  uvicorn app.main:app --reload
Documentación interactiva en:  http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import Base, engine
from app.routers import auth, categorias
from app.routers.auth import limiter

# Crea las tablas en la base de datos si no existen todavía.
# (Para un proyecto en producción se usaría Alembic para migraciones,
# pero para este avance esto es suficiente).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Panadería IA - API", version="0.1.0")

# --- Seguridad: límite de peticiones (usado por /auth/login) ---
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Seguridad: solo el/los dominios del frontend pueden llamar a esta API ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categorias.router)


@app.get("/", tags=["Estado"])
def estado():
    return {"mensaje": "API de la panadería funcionando"}
