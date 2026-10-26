"""
Esquemas Pydantic: definen qué forma deben tener los datos que ENTRAN
(...Create) y qué forma tienen los datos que SALEN (...Out) de la API.

Solo están resueltos Usuario/Auth y Categoría — son el patrón para que
armes los del resto de tablas (Producto, Inventario, Pedido, etc).
Fíjate que UsuarioOut nunca incluye password_hash: es intencional, así
la contraseña (ni siquiera su hash) nunca sale en una respuesta de la API.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ---------- Usuario / Autenticación ----------

class UsuarioCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UsuarioOut(BaseModel):
    id: int
    nombre: str
    email: EmailStr
    rol: str
    creado_en: datetime

    class Config:
        from_attributes = True  # permite construir esto desde un objeto SQLAlchemy


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Categoría ----------

class CategoriaCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)


class CategoriaOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Producto ----------

class ProductoCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    categoria_id: int
    descripcion: str | None = Field(max_length=500, default=None)
    precio_base: float = Field(gt=0)
    imagen_url: str | None = Field(max_length=500, default=None)
    stock: int = Field(ge=0)


class ProductoOut(BaseModel):
    id: int
    nombre: str
    precio_base: float
    stock: int
    categoria_id: int
    descripcion: str | None = None
    imagen_url: str | None = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
