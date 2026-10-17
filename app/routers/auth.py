"""
Endpoints de autenticación: registro y login.

Medidas de seguridad aplicadas aquí:
- La contraseña nunca se guarda ni se compara en texto plano (hash_password /
  verify_password, definidas en app/security.py con bcrypt).
- El login está limitado a 5 intentos por minuto por IP (slowapi), para
  dificultar ataques de fuerza bruta contra contraseñas.
- El token de acceso (JWT) expira solo (ACCESS_TOKEN_EXPIRE_MINUTES en .env).
- La respuesta de la API nunca incluye password_hash (ver schemas.UsuarioOut).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app import models, schemas, security
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Autenticación"])

limiter = Limiter(key_func=get_remote_address)


@router.post("/registro", response_model=schemas.UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(datos: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    ya_existe = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    if ya_existe:
        raise HTTPException(status_code=400, detail="Ese correo ya está registrado")

    nuevo_usuario = models.Usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=security.hash_password(datos.password),
        rol=models.RolUsuario.cliente,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario


@router.post("/login", response_model=schemas.Token)
@limiter.limit("5/minute")
def iniciar_sesion(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # OAuth2PasswordRequestForm usa "username", aquí lo tratamos como el email
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()

    if not usuario or not security.verify_password(form_data.password, usuario.password_hash):
        # Mensaje genérico a propósito: no revela si el correo existe o no.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = security.create_access_token(
        data={"sub": str(usuario.id), "rol": usuario.rol.value}
    )
    return schemas.Token(access_token=access_token)
