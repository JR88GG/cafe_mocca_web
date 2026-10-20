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

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/", response_model=list[schemas.ProductoOut])
def listar_productos(db: Session = Depends(get_db)):
    return db.query(models.Producto).all()


@router.post("/", response_model=schemas.ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(
    datos: schemas.ProductoCreate,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_current_admin),
):
    ya_existe = db.query(models.Producto).filter(models.Producto.nombre == datos.nombre).first()
    if ya_existe:
        raise HTTPException(status_code=400, detail="Ese producto ya existe")

    nueva = models.Producto(nombre=datos.nombre, precio=datos.precio, stock=datos.stock)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.put("/{producto_id}", response_model=schemas.ProductoOut)
def actualizar_producto(
    producto_id: int,
    datos: schemas.ProductoCreate,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_current_admin),
):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    producto.nombre = datos.nombre
    producto.precio = datos.precio
    producto.stock = datos.stock
    db.commit()
    db.refresh(producto)
    return producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    admin: models.Usuario = Depends(get_current_admin),
):
    producto = db.query(models.Producto).filter(models.Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    db.delete(producto)
    db.commit()
