"""
Dependencias reutilizables de FastAPI para proteger endpoints.

get_current_user: exige un token JWT válido y devuelve el usuario dueño de
ese token. Úsalo en cualquier endpoint que requiera "estar logueado".

get_current_admin: además de estar logueado, exige que el rol sea admin.
Úsalo en los endpoints de administración (crear producto, ver todos los
pedidos, etc).
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import decode_access_token

# tokenUrl le dice a la documentación /docs en qué endpoint se pide el token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.Usuario:
    credenciales_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la sesión",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise credenciales_invalidas

    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(payload["sub"])).first()
    if usuario is None:
        raise credenciales_invalidas

    return usuario


def get_current_admin(usuario: models.Usuario = Depends(get_current_user)) -> models.Usuario:
    if usuario.rol != models.RolUsuario.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción requiere un usuario administrador",
        )
    return usuario
