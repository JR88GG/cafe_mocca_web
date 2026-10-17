"""
CRUD de categorías — este es el ejemplo más simple del proyecto.

Úsalo como plantilla para construir Productos e Inventario: la estructura
(listar público, crear/editar/eliminar solo admin) se repite igual.

Nota de seguridad: leer categorías es público (cualquiera puede ver el
catálogo), pero crear/editar/eliminar exige get_current_admin, es decir,
un token JWT válido de un usuario con rol admin.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_admin

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.get("/", response_model=list[schemas.CategoriaOut])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()


@router.post("/", response_model=schemas.CategoriaOut, status_code=status.HTTP_201_CREATED)
def crear_categoria(
    datos: schemas.CategoriaCreate,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_current_admin),
):
    ya_existe = db.query(models.Categoria).filter(models.Categoria.nombre == datos.nombre).first()
    if ya_existe:
        raise HTTPException(status_code=400, detail="Esa categoría ya existe")

    nueva = models.Categoria(nombre=datos.nombre)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.put("/{categoria_id}", response_model=schemas.CategoriaOut)
def actualizar_categoria(
    categoria_id: int,
    datos: schemas.CategoriaCreate,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_current_admin),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    categoria.nombre = datos.nombre
    db.commit()
    db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_current_admin),
):
    categoria = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    db.delete(categoria)
    db.commit()
