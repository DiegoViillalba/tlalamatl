"""Endpoints del rol proveedor. Dueña: rama rol/proveedor.

Rutas compartidas de entrega (fletes): el proveedor agrupa órdenes confirmadas de varios comercios en un
solo viaje; los comercios piden sumarse (su lado vive en rol/comercio, ver docs/alcance/compartido.md).
"""

from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import field_validator
from sqlmodel import Field, SQLModel, col, func, select

from app.auth import require_rol
from app.catalogo import buscar_producto_base
from app.db import SessionDep
from app.estados import validar_orden, validar_ruta
from app.models import (
    Categoria,
    Comercio,
    EstadoOrden,
    EstadoRuta,
    EstadoSolicitudFlete,
    OfertaProveedor,
    OrdenAbasto,
    OrdenAbastoItem,
    OrdenAbastoItemLeer,
    OrdenAbastoLeer,
    ProductoBase,
    Proveedor,
    Rol,
    RutaEntrega,
    SolicitudFlete,
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
    # Producto del catálogo común (`/publico/productos-base`). Si no se manda, se busca por el nombre.
    producto_base_id: int | None = None


class OfertaActualizar(SQLModel):
    producto: str | None = Field(default=None, min_length=1)
    unidad: str | None = Field(default=None, min_length=1)
    precio_mayoreo: float | None = Field(default=None, gt=0)
    cantidad_minima: float | None = Field(default=None, gt=0)
    disponible: bool | None = None
    # Con un id se enlaza a ese producto base; con `sin_catalogo` se quita el enlace.
    producto_base_id: int | None = None
    sin_catalogo: bool = False


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


def _base_existente(producto_base_id: int, session: SessionDep) -> ProductoBase:
    base = session.get(ProductoBase, producto_base_id)
    if base is None:
        raise HTTPException(422, "El producto del catálogo no existe")
    return base


@router.post("/ofertas", status_code=201)
def crear_oferta(datos: OfertaCrear, usuario: ProveedorActual, session: SessionDep) -> OfertaProveedor:
    proveedor = _mi_proveedor(usuario, session)
    oferta = OfertaProveedor(**datos.model_dump(), proveedor_id=proveedor.id)
    if datos.producto_base_id is not None:
        _base_existente(datos.producto_base_id, session)
    elif (base := buscar_producto_base(session, datos.producto)) is not None:
        oferta.producto_base_id = base.id
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
    datos = cambios.model_dump(exclude_unset=True, exclude_none=True, exclude={"sin_catalogo"})
    if cambios.sin_catalogo:
        datos["producto_base_id"] = None
    elif "producto_base_id" in datos:
        _base_existente(datos["producto_base_id"], session)
    elif "producto" in datos and oferta.producto_base_id is None:
        # Si cambió el nombre y la oferta no estaba enlazada, se intenta de nuevo con el nombre nuevo.
        base = buscar_producto_base(session, datos["producto"])
        datos["producto_base_id"] = base.id if base else None
    oferta.sqlmodel_update(datos)
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


# --- Rutas compartidas de entrega ----------------------------------------------------


class RutaCrear(SQLModel):
    orden_ids: list[int] = Field(min_length=1)
    fecha: date
    costo_flete: float = Field(default=0, ge=0)
    zona: str | None = Field(default=None, min_length=1)
    nota: str | None = None


class CambioEstadoRuta(SQLModel):
    estado: EstadoRuta


class CambioEstadoSolicitud(SQLModel):
    estado: EstadoSolicitudFlete


class Parada(SQLModel):
    comercio: ComercioContacto
    orden_ids: list[int]
    subtotal: float  # mercancía que recibe este comercio en la ruta
    cuota_flete: float  # su parte del flete


class SolicitudRecibida(SQLModel):
    id: int
    estado: EstadoSolicitudFlete
    creado_en: datetime
    comercio: ComercioContacto
    orden_id: int
    subtotal: float
    cuota_si_se_suma: float | None  # parte del flete que le tocaría si se acepta (None si ya es parada)


class RutaLeer(SQLModel):
    id: int
    zona: str
    fecha: date
    costo_flete: float
    nota: str | None
    estado: EstadoRuta
    creado_en: datetime
    comercios: int
    cuota_flete: float  # costo_flete entre los comercios de la ruta
    total_mercancia: float
    paradas: list[Parada]
    solicitudes: list[SolicitudRecibida]  # solo las pendientes


class RutaSugerida(SQLModel):
    zona: str
    comercios: int
    ordenes: list[OrdenRecibida]


def _subtotal(orden: OrdenAbasto) -> float:
    return round(sum(i.cantidad * i.precio_unitario for i in orden.items), 2)


def _cuota(costo_flete: float, comercios: int) -> float:
    return round(costo_flete / comercios, 2) if comercios else 0


def _mi_ruta(ruta_id: int, proveedor: Proveedor, session: SessionDep) -> RutaEntrega:
    ruta = session.get(RutaEntrega, ruta_id)
    if ruta is None or ruta.proveedor_id != proveedor.id:
        raise HTTPException(404, "Ruta no encontrada")
    return ruta


def _ruta_leer(ruta: RutaEntrega, session: SessionDep) -> RutaLeer:
    ordenes = session.exec(select(OrdenAbasto).where(OrdenAbasto.ruta_id == ruta.id).order_by(OrdenAbasto.id)).all()
    por_comercio: dict[int, list[OrdenAbasto]] = {}
    for orden in ordenes:
        por_comercio.setdefault(orden.comercio_id, []).append(orden)
    cuota = _cuota(ruta.costo_flete, len(por_comercio))
    paradas = [
        Parada(
            comercio=_contacto(session.get(Comercio, comercio_id)),
            orden_ids=[o.id for o in lista],
            subtotal=round(sum(_subtotal(o) for o in lista), 2),
            cuota_flete=cuota,
        )
        for comercio_id, lista in por_comercio.items()
    ]
    pendientes = session.exec(
        select(SolicitudFlete)
        .where(SolicitudFlete.ruta_id == ruta.id, SolicitudFlete.estado == EstadoSolicitudFlete.pendiente)
        .order_by(SolicitudFlete.id)
    ).all()
    solicitudes = [
        SolicitudRecibida(
            id=sol.id,
            estado=sol.estado,
            creado_en=sol.creado_en,
            comercio=_contacto(session.get(Comercio, sol.comercio_id)),
            orden_id=sol.orden_id,
            subtotal=_subtotal(session.get(OrdenAbasto, sol.orden_id)),
            cuota_si_se_suma=None
            if sol.comercio_id in por_comercio
            else _cuota(ruta.costo_flete, len(por_comercio) + 1),
        )
        for sol in pendientes
    ]
    return RutaLeer(
        **ruta.model_dump(exclude={"proveedor_id"}),
        comercios=len(por_comercio),
        cuota_flete=cuota,
        total_mercancia=round(sum(p.subtotal for p in paradas), 2),
        paradas=paradas,
        solicitudes=solicitudes,
    )


def _resolver_solicitudes_pendientes(ruta: RutaEntrega, session: SessionDep) -> None:
    """Al despachar o cancelar la ruta, lo que quedó pendiente se rechaza."""
    pendientes = session.exec(
        select(SolicitudFlete).where(
            SolicitudFlete.ruta_id == ruta.id, SolicitudFlete.estado == EstadoSolicitudFlete.pendiente
        )
    ).all()
    for sol in pendientes:
        sol.estado = EstadoSolicitudFlete.rechazada
        session.add(sol)


@router.get("/rutas/sugeridas")
def sugerir_rutas(usuario: ProveedorActual, session: SessionDep) -> list[RutaSugerida]:
    """Órdenes confirmadas y sin ruta, agrupadas por alcaldía; solo zonas con 2 o más comercios."""
    proveedor = _mi_proveedor(usuario, session)
    ordenes = session.exec(
        select(OrdenAbasto)
        .where(
            OrdenAbasto.proveedor_id == proveedor.id,
            OrdenAbasto.estado == EstadoOrden.confirmada,
            col(OrdenAbasto.ruta_id).is_(None),
        )
        .order_by(OrdenAbasto.creado_en, OrdenAbasto.id)
    ).all()
    por_zona: dict[str, list[OrdenAbasto]] = {}
    for orden in ordenes:
        por_zona.setdefault(session.get(Comercio, orden.comercio_id).alcaldia, []).append(orden)
    sugeridas = []
    for zona, lista in sorted(por_zona.items()):
        comercios = {o.comercio_id for o in lista}
        if len(comercios) >= 2:
            sugeridas.append(
                RutaSugerida(zona=zona, comercios=len(comercios), ordenes=[_orden_recibida(o, session) for o in lista])
            )
    return sugeridas


@router.post("/rutas", status_code=201)
def crear_ruta(datos: RutaCrear, usuario: ProveedorActual, session: SessionDep) -> RutaLeer:
    proveedor = _mi_proveedor(usuario, session)
    ids = set(datos.orden_ids)
    ordenes = [_mi_orden(orden_id, proveedor, session) for orden_id in sorted(ids)]
    for orden in ordenes:
        if orden.estado != EstadoOrden.confirmada:
            raise HTTPException(409, f"La orden {orden.id} no está confirmada")
        if orden.ruta_id is not None:
            raise HTTPException(409, f"La orden {orden.id} ya está en una ruta")
    if datos.fecha < ahora().date():
        raise HTTPException(422, "La fecha de salida no puede ser pasada")
    zona = datos.zona.strip() if datos.zona else session.get(Comercio, ordenes[0].comercio_id).alcaldia
    ruta = RutaEntrega(
        proveedor_id=proveedor.id, zona=zona, fecha=datos.fecha, costo_flete=datos.costo_flete, nota=datos.nota
    )
    session.add(ruta)
    session.flush()
    for orden in ordenes:
        orden.ruta_id = ruta.id
        session.add(orden)
    session.commit()
    session.refresh(ruta)
    return _ruta_leer(ruta, session)


@router.get("/rutas")
def listar_rutas(
    usuario: ProveedorActual, session: SessionDep, estado: Annotated[EstadoRuta | None, Query()] = None
) -> list[RutaLeer]:
    proveedor = _mi_proveedor(usuario, session)
    consulta = select(RutaEntrega).where(RutaEntrega.proveedor_id == proveedor.id)
    if estado is not None:
        consulta = consulta.where(RutaEntrega.estado == estado)
    rutas = session.exec(consulta.order_by(col(RutaEntrega.fecha).desc(), col(RutaEntrega.id).desc())).all()
    return [_ruta_leer(r, session) for r in rutas]


@router.post("/rutas/{ruta_id}/estado")
def avanzar_ruta(
    ruta_id: int, cambio: CambioEstadoRuta, usuario: ProveedorActual, session: SessionDep
) -> RutaLeer:
    ruta = _mi_ruta(ruta_id, _mi_proveedor(usuario, session), session)
    validar_ruta(ruta.estado, cambio.estado)
    ordenes = session.exec(select(OrdenAbasto).where(OrdenAbasto.ruta_id == ruta.id)).all()
    if cambio.estado == EstadoRuta.en_camino:
        if not ordenes:
            raise HTTPException(409, "La ruta no tiene órdenes")
        for orden in ordenes:
            if orden.estado == EstadoOrden.confirmada:
                validar_orden(orden.estado, EstadoOrden.enviada)
                orden.estado = EstadoOrden.enviada
                session.add(orden)
        _resolver_solicitudes_pendientes(ruta, session)
    elif cambio.estado == EstadoRuta.cancelada:
        for orden in ordenes:
            orden.ruta_id = None
            session.add(orden)
        _resolver_solicitudes_pendientes(ruta, session)
    ruta.estado = cambio.estado
    session.add(ruta)
    session.commit()
    session.refresh(ruta)
    return _ruta_leer(ruta, session)


@router.post("/rutas/solicitudes/{solicitud_id}/estado")
def responder_solicitud_flete(
    solicitud_id: int, cambio: CambioEstadoSolicitud, usuario: ProveedorActual, session: SessionDep
) -> RutaLeer:
    """Acepta o rechaza la solicitud de un comercio para sumarse a una de mis rutas."""
    proveedor = _mi_proveedor(usuario, session)
    solicitud = session.get(SolicitudFlete, solicitud_id)
    if solicitud is None:
        raise HTTPException(404, "Solicitud no encontrada")
    ruta = _mi_ruta(solicitud.ruta_id, proveedor, session)
    if solicitud.estado != EstadoSolicitudFlete.pendiente:
        raise HTTPException(409, "La solicitud ya fue atendida")
    if cambio.estado == EstadoSolicitudFlete.pendiente:
        raise HTTPException(409, "Una solicitud solo puede pasar a 'aceptada' o 'rechazada'")
    if cambio.estado == EstadoSolicitudFlete.aceptada:
        orden = session.get(OrdenAbasto, solicitud.orden_id)
        if ruta.estado != EstadoRuta.abierta:
            raise HTTPException(409, "La ruta ya no está abierta")
        if orden.estado != EstadoOrden.confirmada or orden.ruta_id is not None:
            raise HTTPException(409, "La orden ya no puede sumarse a la ruta")
        orden.ruta_id = ruta.id
        session.add(orden)
    solicitud.estado = cambio.estado
    session.add(solicitud)
    session.commit()
    session.refresh(ruta)
    return _ruta_leer(ruta, session)
