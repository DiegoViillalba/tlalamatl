"""Catálogo público de comercios y productos (sin login). Dueña: rama rol/cliente."""

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import SQLModel, select

from app.db import SessionDep
from app.models import (
    Categoria,
    Comercio,
    Dia,
    OfertaProveedor,
    Producto,
    ProductoBase,
    Proveedor,
    TipoProveedor,
    ahora,
)

router = APIRouter(prefix="/publico", tags=["publico"])


class ComercioPublico(SQLModel):
    id: int
    nombre: str
    categoria: Categoria
    alcaldia: str
    ubicacion: str
    lat: float | None
    lng: float | None
    dias_operacion: list[Dia]
    abierto_hoy: bool
    # Contacto directo para los botones Llamar y WhatsApp de la ficha pública.
    telefono: str | None
    whatsapp: str | None


def a_publico(comercio: Comercio, hoy: Dia) -> ComercioPublico:
    return ComercioPublico(**comercio.model_dump(), abierto_hoy=hoy in comercio.dias_operacion)


@router.get("/comercios")
def listar_comercios(
    session: SessionDep,
    categoria: Categoria | None = None,
    alcaldia: str | None = None,
    abierto_hoy: bool = False,
    dia: Dia | None = None,  # fuerza el "hoy" (útil en tests y demos)
) -> list[ComercioPublico]:
    hoy = dia or Dia.hoy()
    consulta = select(Comercio).order_by(Comercio.nombre)
    if categoria:
        consulta = consulta.where(Comercio.categoria == categoria)
    if alcaldia:
        consulta = consulta.where(Comercio.alcaldia == alcaldia)
    comercios = [a_publico(c, hoy) for c in session.exec(consulta)]
    if abierto_hoy:
        comercios = [c for c in comercios if c.abierto_hoy]
    return comercios


@router.get("/comercios/{comercio_id}")
def obtener_comercio(comercio_id: int, session: SessionDep, dia: Dia | None = None) -> ComercioPublico:
    comercio = session.get(Comercio, comercio_id)
    if comercio is None:
        raise HTTPException(404, "Comercio no encontrado")
    return a_publico(comercio, dia or Dia.hoy())


@router.get("/comercios/{comercio_id}/productos")
def listar_productos(comercio_id: int, session: SessionDep) -> list[Producto]:
    if session.get(Comercio, comercio_id) is None:
        raise HTTPException(404, "Comercio no encontrado")
    return list(
        session.exec(select(Producto).where(Producto.comercio_id == comercio_id).order_by(Producto.nombre))
    )


# --- Dashboard de precios --------------------------------------------------------------


class RangoPrecios(SQLModel):
    """Mínimo, promedio y máximo de un conjunto de precios. Con n = 0 los tres valores son None."""

    minimo: float | None
    promedio: float | None
    maximo: float | None
    n: int


class ComercioMasBarato(SQLModel):
    id: int
    nombre: str
    alcaldia: str
    categoria: Categoria
    telefono: str | None
    whatsapp: str | None
    precio: float


class ProveedorMasBarato(SQLModel):
    id: int
    nombre: str
    tipo: TipoProveedor
    zona: str
    telefono: str | None
    whatsapp: str | None
    precio_mayoreo: float
    cantidad_minima: float


class DemandaProducto(SQLModel):
    """Señal para proveedores y comerciantes: cuántos puestos venden el producto y cuántos andan cortos."""

    comercios: int  # comercios distintos que lo venden
    con_stock_bajo: int  # de esos, los que tienen stock <= stock_minimo (demanda por reabasto)


class PrecioProducto(SQLModel):
    id: int
    nombre: str
    unidad: str
    categoria: str
    canasta_basica: bool
    de_temporada: bool  # el mes consultado está en meses_temporada (los de todo el año no cuentan)
    meses_temporada: list[int]  # vacío = todo el año
    menudeo: RangoPrecios  # Producto.precio de los comercios
    mayoreo: RangoPrecios  # OfertaProveedor.precio_mayoreo (solo disponibles)
    mas_barato_en: ComercioMasBarato | None
    proveedor_mas_barato: ProveedorMasBarato | None
    demanda: DemandaProducto


def rango(precios: list[float]) -> RangoPrecios:
    if not precios:
        return RangoPrecios(minimo=None, promedio=None, maximo=None, n=0)
    return RangoPrecios(
        minimo=min(precios), promedio=round(sum(precios) / len(precios), 2), maximo=max(precios), n=len(precios)
    )


@router.get("/precios")
def precios(
    session: SessionDep,
    temporada: bool = False,  # solo productos de temporada en `mes`
    canasta: bool = False,  # solo canasta básica
    categoria: str | None = None,  # fruta, verdura, abarrote, proteina
    mes: int | None = Query(default=None, ge=1, le=12),  # por defecto, el mes actual en la CDMX
) -> list[PrecioProducto]:
    """Precios de menudeo y mayoreo por producto, dónde está más barato y señales de demanda."""
    mes = mes or ahora().month
    consulta = select(ProductoBase).order_by(ProductoBase.nombre)
    if canasta:
        consulta = consulta.where(ProductoBase.canasta_basica)
    if categoria:
        consulta = consulta.where(ProductoBase.categoria == categoria)

    comercios = {c.id: c for c in session.exec(select(Comercio))}
    proveedores = {p.id: p for p in session.exec(select(Proveedor))}
    en_comercios: dict[int, list[Producto]] = {}
    for producto in session.exec(select(Producto).where(Producto.producto_base_id.is_not(None))):  # type: ignore[union-attr]
        en_comercios.setdefault(producto.producto_base_id, []).append(producto)
    en_proveedores: dict[int, list[OfertaProveedor]] = {}
    for oferta in session.exec(
        select(OfertaProveedor).where(OfertaProveedor.producto_base_id.is_not(None), OfertaProveedor.disponible)  # type: ignore[union-attr]
    ):
        en_proveedores.setdefault(oferta.producto_base_id, []).append(oferta)

    resultado: list[PrecioProducto] = []
    for base in session.exec(consulta):
        de_temporada = mes in base.meses_temporada
        if temporada and not de_temporada:
            continue
        menudeo = en_comercios.get(base.id, [])
        mayoreo = en_proveedores.get(base.id, [])
        if not menudeo and not mayoreo:
            continue
        barato = min(menudeo, key=lambda p: (p.precio, p.id), default=None)
        oferta = min(mayoreo, key=lambda o: (o.precio_mayoreo, o.id), default=None)
        resultado.append(
            PrecioProducto(
                id=base.id,
                nombre=base.nombre,
                unidad=base.unidad,
                categoria=base.categoria,
                canasta_basica=base.canasta_basica,
                de_temporada=de_temporada,
                meses_temporada=base.meses_temporada,
                menudeo=rango([p.precio for p in menudeo]),
                mayoreo=rango([o.precio_mayoreo for o in mayoreo]),
                mas_barato_en=ComercioMasBarato(**comercios[barato.comercio_id].model_dump(), precio=barato.precio)
                if barato
                else None,
                proveedor_mas_barato=ProveedorMasBarato(
                    **proveedores[oferta.proveedor_id].model_dump(),
                    precio_mayoreo=oferta.precio_mayoreo,
                    cantidad_minima=oferta.cantidad_minima,
                )
                if oferta
                else None,
                demanda=DemandaProducto(
                    comercios=len({p.comercio_id for p in menudeo}),
                    con_stock_bajo=len({p.comercio_id for p in menudeo if p.stock <= p.stock_minimo}),
                ),
            )
        )
    resultado.sort(key=lambda r: (not r.de_temporada, r.nombre))
    return resultado
