"""Endpoints del rol proveedor. Dueña: rama rol/proveedor.

Por implementar (ver docs/alcance/proveedor.md): rutas compartidas de entrega (necesitan `RutaEntrega` en main).
"""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import field_validator
from sqlmodel import Field, SQLModel, col, func, select

from app.auth import require_rol
from app.db import SessionDep
from app.estados import validar_orden
from app.models import (
    Categoria,
    Comercio,
    EstadoOrden,
    OfertaProveedor,
    OrdenAbasto,
    OrdenAbastoItem,
    OrdenAbastoItemLeer,
    OrdenAbastoLeer,
    Proveedor,
    Rol,
    Usuario,
    ahora,
)

router = APIRouter(prefix="/proveedor", tags=["proveedor"])

ProveedorActual = Annotated[Usuario, Depends(require_rol(Rol.proveedor))]

DIAS_COMPRADOR_ACTIVO = 30
# Lo que el proveedor puede hacer con una orden; `recibida` la marca el comercio.
ESTADOS_DEL_PROVEEDOR = {EstadoOrden.confirmada, EstadoOrden.rechazada, EstadoOrden.enviada}


def _telefono(valor: str | None) -> str | None:
    """Teléfono de 10 dígitos sin lada internacional; vacío equivale a quitarlo."""
    if valor is None:
        return None
    valor = valor.strip()
    if not valor:
        return None
    if not (valor.isascii() and valor.isdigit() and len(valor) == 10):
        raise ValueError("Debe tener 10 dígitos, sin lada internacional")
    return valor


# --- Esquemas ------------------------------------------------------------------------


class PerfilActualizar(SQLModel):
    zona: str | None = None
    telefono: str | None = None
    whatsapp: str | None = None

    _validar_telefono = field_validator("telefono", "whatsapp")(_telefono)


class OfertaCrear(SQLModel):
    producto: str = Field(min_length=1)
    unidad: str = Field(min_length=1)
    precio_mayoreo: float = Field(gt=0)
    cantidad_minima: float = Field(gt=0)
    disponible: bool = True


class OfertaActualizar(SQLModel):
    producto: str | None = Field(default=None, min_length=1)
    unidad: str | None = Field(default=None, min_length=1)
    precio_mayoreo: float | None = Field(default=None, gt=0)
    cantidad_minima: float | None = Field(default=None, gt=0)
    disponible: bool | None = None


class CambioEstadoOrden(SQLModel):
    estado: EstadoOrden


class ComercioContacto(SQLModel):
    id: int
    nombre: str
    categoria: Categoria
    alcaldia: str
    ubicacion: str
    telefono: str | None
    whatsapp: str | None


class OrdenRecibidaItem(OrdenAbastoItemLeer):
    producto: str
    unidad: str


class OrdenRecibida(OrdenAbastoLeer):
    """Orden de abasto con el contacto del comercio que la pidió."""

    comercio: ComercioContacto
    items: list[OrdenRecibidaItem]


class Comprador(SQLModel):
    comercio: ComercioContacto
    ordenes: int
    ultima_orden: datetime


# --- Utilidades ----------------------------------------------------------------------


def _mi_proveedor(usuario: Usuario, session: SessionDep) -> Proveedor:
    proveedor = session.exec(select(Proveedor).where(Proveedor.usuario_id == usuario.id)).first()
    if proveedor is None:
        raise HTTPException(404, "Este usuario no tiene perfil de proveedor")
    return proveedor


def _mi_oferta(oferta_id: int, proveedor: Proveedor, session: SessionDep) -> OfertaProveedor:
    oferta = session.get(OfertaProveedor, oferta_id)
    if oferta is None or oferta.proveedor_id != proveedor.id:
        raise HTTPException(404, "Oferta no encontrada")
    return oferta


def _mi_orden(orden_id: int, proveedor: Proveedor, session: SessionDep) -> OrdenAbasto:
    orden = session.get(OrdenAbasto, orden_id)
    if orden is None or orden.proveedor_id != proveedor.id:
        raise HTTPException(404, "Orden no encontrada")
    return orden


def _contacto(comercio: Comercio) -> ComercioContacto:
    return ComercioContacto.model_validate(comercio, from_attributes=True)


def _orden_recibida(orden: OrdenAbasto, session: SessionDep) -> OrdenRecibida:
    items = []
    for item in orden.items:
        oferta = session.get(OfertaProveedor, item.oferta_id)
        items.append(
            OrdenRecibidaItem(
                **item.model_dump(exclude={"orden_id"}),
                producto=oferta.producto,
                unidad=oferta.unidad,
            )
        )
    return OrdenRecibida(
        **orden.model_dump(),
        comercio=_contacto(session.get(Comercio, orden.comercio_id)),
        items=items,
    )


# --- Perfil --------------------------------------------------------------------------


@router.get("/mi-perfil")
def mi_perfil(usuario: ProveedorActual, session: SessionDep) -> Proveedor:
    return _mi_proveedor(usuario, session)


@router.patch("/mi-perfil")
def actualizar_mi_perfil(cambios: PerfilActualizar, usuario: ProveedorActual, session: SessionDep) -> Proveedor:
    proveedor = _mi_proveedor(usuario, session)
    datos = cambios.model_dump(exclude_unset=True)
    if "zona" in datos and not (datos["zona"] and datos["zona"].strip()):
        raise HTTPException(422, "La zona no puede estar vacía")
    if "zona" in datos:
        datos["zona"] = datos["zona"].strip()
    proveedor.sqlmodel_update(datos)
    session.add(proveedor)
    session.commit()
    session.refresh(proveedor)
    return proveedor


# --- Ofertas -------------------------------------------------------------------------


@router.get("/ofertas")
def listar_ofertas(usuario: ProveedorActual, session: SessionDep) -> list[OfertaProveedor]:
    proveedor = _mi_proveedor(usuario, session)
    consulta = select(OfertaProveedor).where(OfertaProveedor.proveedor_id == proveedor.id).order_by(OfertaProveedor.id)
    return list(session.exec(consulta).all())


@router.post("/ofertas", status_code=201)
def crear_oferta(datos: OfertaCrear, usuario: ProveedorActual, session: SessionDep) -> OfertaProveedor:
    proveedor = _mi_proveedor(usuario, session)
    oferta = OfertaProveedor(**datos.model_dump(), proveedor_id=proveedor.id)
    session.add(oferta)
    session.commit()
    session.refresh(oferta)
    return oferta


@router.patch("/ofertas/{oferta_id}")
def actualizar_oferta(
    oferta_id: int, cambios: OfertaActualizar, usuario: ProveedorActual, session: SessionDep
) -> OfertaProveedor:
    oferta = _mi_oferta(oferta_id, _mi_proveedor(usuario, session), session)
    # Un null explícito no borra nada: ningún campo de la oferta es opcional.
    oferta.sqlmodel_update(cambios.model_dump(exclude_unset=True, exclude_none=True))
    session.add(oferta)
    session.commit()
    session.refresh(oferta)
    return oferta


@router.delete("/ofertas/{oferta_id}", status_code=204)
def eliminar_oferta(oferta_id: int, usuario: ProveedorActual, session: SessionDep) -> None:
    oferta = _mi_oferta(oferta_id, _mi_proveedor(usuario, session), session)
    en_ordenes = session.exec(select(func.count()).select_from(OrdenAbastoItem).where(OrdenAbastoItem.oferta_id == oferta.id)).one()
    if en_ordenes:
        raise HTTPException(409, "Esta oferta ya está en órdenes de abasto; márcala como no disponible")
    session.delete(oferta)
    session.commit()


# --- Órdenes -------------------------------------------------------------------------


@router.get("/ordenes")
def listar_ordenes(
    usuario: ProveedorActual, session: SessionDep, estado: Annotated[EstadoOrden | None, Query()] = None
) -> list[OrdenRecibida]:
    proveedor = _mi_proveedor(usuario, session)
    consulta = select(OrdenAbasto).where(OrdenAbasto.proveedor_id == proveedor.id)
    if estado is not None:
        consulta = consulta.where(OrdenAbasto.estado == estado)
    ordenes = session.exec(consulta.order_by(col(OrdenAbasto.creado_en).desc(), col(OrdenAbasto.id).desc())).all()
    return [_orden_recibida(o, session) for o in ordenes]


@router.post("/ordenes/{orden_id}/estado")
def avanzar_orden(
    orden_id: int, cambio: CambioEstadoOrden, usuario: ProveedorActual, session: SessionDep
) -> OrdenAbastoLeer:
    orden = _mi_orden(orden_id, _mi_proveedor(usuario, session), session)
    validar_orden(orden.estado, cambio.estado)
    if cambio.estado not in ESTADOS_DEL_PROVEEDOR:
        raise HTTPException(403, "Solo el comercio puede marcar la orden como recibida")
    orden.estado = cambio.estado
    session.add(orden)
    session.commit()
    session.refresh(orden)
    return OrdenAbastoLeer.model_validate(orden, from_attributes=True)


# --- Compradores ---------------------------------------------------------------------


@router.get("/compradores")
def listar_compradores(usuario: ProveedorActual, session: SessionDep) -> list[Comprador]:
    """Comercios con órdenes no rechazadas en los últimos 30 días, del más reciente al más antiguo."""
    proveedor = _mi_proveedor(usuario, session)
    desde = ahora() - timedelta(days=DIAS_COMPRADOR_ACTIVO)
    filas = session.exec(
        select(Comercio, func.count(OrdenAbasto.id), func.max(OrdenAbasto.creado_en))
        .join(OrdenAbasto, OrdenAbasto.comercio_id == Comercio.id)
        .where(
            OrdenAbasto.proveedor_id == proveedor.id,
            OrdenAbasto.estado != EstadoOrden.rechazada,
            OrdenAbasto.creado_en >= desde,
        )
        .group_by(Comercio.id)
        .order_by(func.max(OrdenAbasto.creado_en).desc())
    ).all()
    return [
        Comprador(comercio=_contacto(comercio), ordenes=total, ultima_orden=ultima)
        for comercio, total, ultima in filas
    ]
