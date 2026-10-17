"""
Conexión a la base de datos.

get_db() se usa como "dependencia" de FastAPI: abre una sesión de base de
datos por cada petición y la cierra automáticamente al terminar, incluso
si ocurre un error.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# check_same_thread solo es necesario para SQLite (no aplica a PostgreSQL/MySQL)
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
