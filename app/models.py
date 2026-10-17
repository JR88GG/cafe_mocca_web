"""
Modelos de base de datos (SQLAlchemy), uno por cada tabla del diseño
normalizado que está en roadmap_concepto_panaderia_ia.md.

Esto reemplaza tener que escribir SQL a mano: SQLAlchemy genera las tablas
reales a partir de estas clases (ver Base.metadata.create_all en main.py).
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class RolUsuario(str, enum.Enum):
    cliente = "cliente"
    admin = "admin"


class EstadoPedido(str, enum.Enum):
    recibido = "recibido"
    en_preparacion = "en_preparacion"
    listo = "listo"
    entregado = "entregado"


class TipoEntrega(str, enum.Enum):
    recoger = "recoger"
    domicilio = "domicilio"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(Enum(RolUsuario, native_enum=False), default=RolUsuario.cliente, nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow)

    pedidos = relationship("Pedido", back_populates="usuario")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

    productos = relationship("Producto", back_populates="categoria")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio_base = Column(Numeric(10, 2), nullable=False)
    imagen_url = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True)

    categoria = relationship("Categoria", back_populates="productos")
    inventario = relationship("Inventario", back_populates="producto", uselist=False)
    detalles_pedido = relationship("DetallePedido", back_populates="producto")
    historial_ventas = relationship("HistorialVenta", back_populates="producto")
    sugerencias_ia = relationship("SugerenciaIA", back_populates="producto")


class Inventario(Base):
    __tablename__ = "inventario"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), unique=True, nullable=False)
    cantidad_disponible = Column(Integer, default=0, nullable=False)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    producto = relationship("Producto", back_populates="inventario")


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow)
    estado = Column(
        Enum(EstadoPedido, native_enum=False), default=EstadoPedido.recibido, nullable=False
    )
    total = Column(Numeric(10, 2), default=0)
    tipo_entrega = Column(Enum(TipoEntrega, native_enum=False), nullable=False)
    direccion_entrega = Column(String(255), nullable=True)

    usuario = relationship("Usuario", back_populates="pedidos")
    detalles = relationship("DetallePedido", back_populates="pedido")


class DetallePedido(Base):
    __tablename__ = "detalle_pedido"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_aplicado = Column(Numeric(10, 2), nullable=False)

    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_pedido")
    personalizacion = relationship(
        "Personalizacion", back_populates="detalle_pedido", uselist=False
    )


class Personalizacion(Base):
    __tablename__ = "personalizacion"

    id = Column(Integer, primary_key=True, index=True)
    detalle_pedido_id = Column(
        Integer, ForeignKey("detalle_pedido.id"), unique=True, nullable=False
    )
    sabor = Column(String(100), nullable=True)
    tamano = Column(String(50), nullable=True)
    mensaje = Column(String(255), nullable=True)
    fecha_entrega_deseada = Column(DateTime, nullable=True)
    notas = Column(Text, nullable=True)

    detalle_pedido = relationship("DetallePedido", back_populates="personalizacion")


class HistorialVenta(Base):
    __tablename__ = "historial_ventas"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    cantidad_vendida = Column(Integer, nullable=False)
    precio_vendido = Column(Numeric(10, 2), nullable=False)

    producto = relationship("Producto", back_populates="historial_ventas")


class SugerenciaIA(Base):
    __tablename__ = "sugerencias_ia"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    fecha_calculo = Column(DateTime, default=datetime.utcnow)
    precio_sugerido = Column(Numeric(10, 2), nullable=True)
    cantidad_sugerida = Column(Integer, nullable=True)

    producto = relationship("Producto", back_populates="sugerencias_ia")
