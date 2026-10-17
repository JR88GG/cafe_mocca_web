"""
Configuración central del proyecto.

Toda credencial o valor sensible (claves, cadenas de conexión) se lee de
variables de entorno (.env), nunca se escribe directamente en el código.
Así evitamos que terminen subidas al repositorio de GitHub.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./panaderia.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    CORS_ORIGINS: list[str] = [
        origen.strip()
        for origen in os.getenv("CORS_ORIGINS", "http://localhost:5500").split(",")
        if origen.strip()
    ]


settings = Settings()

# Falla rápido y con un mensaje claro si falta la clave de seguridad,
# en lugar de arrancar la API con una clave vacía (inseguro).
if not settings.SECRET_KEY:
    raise RuntimeError(
        "Falta SECRET_KEY en tu archivo .env. Genera una con:\n"
        '  python -c "import secrets; print(secrets.token_hex(32))"\n'
        "y pégala en .env como SECRET_KEY=..."
    )
