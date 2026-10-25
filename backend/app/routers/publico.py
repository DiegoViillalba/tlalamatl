"""Catálogo público de comercios y productos (sin login). Dueña: rama rol/cliente."""

from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import Session, SQLModel, select

from app.db import SessionDep
from app.models import (
    Categoria,
    Comentario,
    Comercio,
    Dia,
    OfertaProveedor,
    PrecioHistorico,
    Producto,
    ProductoBase,
    Proveedor,
    TipoProveedor,
    Usuario,
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


class ComentarioPublico(SQLModel):
    id: int
    nombre_usuario: str
    texto: str
    creado_en: datetime


def a_publico(comercio: Comercio, hoy: Dia) -> ComercioPublico:
    return ComercioPublico(**comercio.model_dump(), abierto_hoy=hoy in comercio.dias_operacion)


class ProductoBaseLeer(SQLModel):
    id: int
    nombre: str
    unidad: str
    categoria: str
    canasta_basica: bool
    meses_temporada: list[int]


@router.get("/productos-base")
def listar_productos_base(session: SessionDep) -> list[ProductoBaseLeer]:
    """Catálogo común de productos. Un precio solo llega al dashboard si su producto apunta a uno de estos."""
    bases = session.exec(select(ProductoBase).order_by(ProductoBase.categoria, ProductoBase.nombre)).all()
    return [ProductoBaseLeer.model_validate(b, from_attributes=True) for b in bases]


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


def calcular_precios(
    session: Session, mes: int, temporada: bool = False, canasta: bool = False, categoria: str | None = None
) -> list[PrecioProducto]:
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


@router.get("/precios")
def precios(
    session: SessionDep,
    temporada: bool = False,  # solo productos de temporada en `mes`
    canasta: bool = False,  # solo canasta básica
    categoria: str | None = None,  # fruta, verdura, abarrote, proteina
    mes: int | None = Query(default=None, ge=1, le=12),  # por defecto, el mes actual en la CDMX
) -> list[PrecioProducto]:
    """Precios de menudeo y mayoreo por producto, dónde está más barato y señales de demanda."""
    return calcular_precios(session, mes or ahora().month, temporada, canasta, categoria)


# --- Canasta sugerida e historial --------------------------------------------------------

PRODUCTOS_EN_CANASTA = 8  # cuántos productos vienen preseleccionados en la canasta sugerida


class ProductoCanasta(SQLModel):
    producto_base_id: int
    nombre: str
    unidad: str
    categoria: str
    canasta_basica: bool
    de_temporada: bool
    precio_referencia: float  # el menudeo más barato
    precio_promedio: float
    ahorro_pct: float  # cuánto más barato es el precio de referencia que el promedio
    variacion_historica_pct: float | None  # promedio de hoy vs. el promedio de las semanas anteriores (negativo = baja)
    cantidad_sugerida: float  # en la unidad del producto
    motivos: list[str]
    en_canasta: bool  # preseleccionado en la canasta sugerida
    comercio: ComercioMasBarato  # dónde comprarlo más barato


class CanastaSugerida(SQLModel):
    mes: int
    productos: list[ProductoCanasta]  # candidatos; los `en_canasta` forman la canasta sugerida
    total_mas_barato: float  # costo de la canasta comprando en el lugar más barato de cada producto
    total_promedio: float  # costo al precio promedio
    ahorro_total: float
    ahorro_pct: float
    lugares_a_visitar: int  # comercios distintos de la canasta sugerida


class PuntoHistorial(SQLModel):
    fecha: date
    menudeo_promedio: float
    menudeo_minimo: float
    mayoreo_promedio: float | None
    mayoreo_minimo: float | None
    n_muestras: int


class HistorialPrecios(SQLModel):
    producto_base_id: int
    nombre: str
    unidad: str
    meses_temporada: list[int]
    puntos: list[PuntoHistorial]  # de la semana más antigua a la más reciente


def pct(parte: float, total: float) -> float:
    return round(parte / total * 100, 1) if total else 0.0


@router.get("/canasta")
def canasta(session: SessionDep, mes: int | None = Query(default=None, ge=1, le=12)) -> CanastaSugerida:
    """Canasta sugerida del mes: canasta básica y productos de temporada, con dónde comprarlos más barato.

    Orden de los candidatos: primero los que son canasta básica y de temporada a la vez, luego los de una
    sola condición, y a igual condición, mayor ahorro (mejor precio vs. promedio más la baja frente a semanas anteriores).
    """
    mes = mes or ahora().month
    historial: dict[int, list[float]] = {}
    for h in session.exec(select(PrecioHistorico).order_by(PrecioHistorico.fecha)):
        historial.setdefault(h.producto_base_id, []).append(h.menudeo_promedio)

    candidatos: list[ProductoCanasta] = []
    for p in calcular_precios(session, mes):
        if not (p.canasta_basica or p.de_temporada) or p.mas_barato_en is None:
            continue
        minimo, promedio = p.menudeo.minimo, p.menudeo.promedio
        previos = historial.get(p.id, [])[:-1]  # sin la semana actual
        variacion = pct(promedio - sum(previos) / len(previos), sum(previos) / len(previos)) if previos else None
        motivos = (["De temporada"] if p.de_temporada else []) + (["Canasta básica"] if p.canasta_basica else [])
        if variacion is not None and variacion <= -5:
            motivos.append("Más barato que en semanas anteriores")
        candidatos.append(
            ProductoCanasta(
                producto_base_id=p.id,
                nombre=p.nombre,
                unidad=p.unidad,
                categoria=p.categoria,
                canasta_basica=p.canasta_basica,
                de_temporada=p.de_temporada,
                precio_referencia=minimo,
                precio_promedio=promedio,
                ahorro_pct=pct(promedio - minimo, promedio),
                variacion_historica_pct=variacion,
                cantidad_sugerida=1,
                motivos=motivos,
                en_canasta=False,
                comercio=p.mas_barato_en,
            )
        )
    def ahorro_total_pct(c: ProductoCanasta) -> float:
        # Ahorro frente al promedio de hoy + cuánto bajó frente a las semanas anteriores (la rebaja de temporada).
        return c.ahorro_pct + max(0.0, -(c.variacion_historica_pct or 0.0))

    candidatos.sort(key=lambda c: (-(c.canasta_basica + c.de_temporada), -ahorro_total_pct(c), c.nombre))
    for c in candidatos[:PRODUCTOS_EN_CANASTA]:
        c.en_canasta = True

    elegidos = [c for c in candidatos if c.en_canasta]
    barato = round(sum(c.precio_referencia * c.cantidad_sugerida for c in elegidos), 2)
    promedio = round(sum(c.precio_promedio * c.cantidad_sugerida for c in elegidos), 2)
    return CanastaSugerida(
        mes=mes,
        productos=candidatos,
        total_mas_barato=barato,
        total_promedio=promedio,
        ahorro_total=round(promedio - barato, 2),
        ahorro_pct=pct(promedio - barato, promedio),
        lugares_a_visitar=len({c.comercio.id for c in elegidos}),
    )


@router.get("/precios/{producto_base_id}/historial")
def historial_precios(
    producto_base_id: int, session: SessionDep, semanas: int = Query(default=12, ge=1, le=52)
) -> HistorialPrecios:
    """Serie semanal de precios de menudeo y mayoreo (promedio y mínimo) de un producto base."""
    base = session.get(ProductoBase, producto_base_id)
    if base is None:
        raise HTTPException(404, "Producto no encontrado")
    recientes = session.exec(
        select(PrecioHistorico)
        .where(PrecioHistorico.producto_base_id == producto_base_id)
        .order_by(PrecioHistorico.fecha.desc())  # type: ignore[attr-defined]
        .limit(semanas)
    ).all()
    return HistorialPrecios(
        producto_base_id=base.id,
        nombre=base.nombre,
        unidad=base.unidad,
        meses_temporada=base.meses_temporada,
        puntos=[PuntoHistorial(**h.model_dump()) for h in reversed(recientes)],
    )


@router.get("/comercios/{comercio_id}/comentarios", response_model=list[ComentarioPublico])
def listar_comentarios(comercio_id: int, session: SessionDep) -> list[ComentarioPublico]:
    if session.get(Comercio, comercio_id) is None:
        raise HTTPException(404, "Comercio no encontrado")
    filas = session.exec(
        select(Comentario, Usuario.nombre)
        .join(Usuario, Usuario.id == Comentario.usuario_id)
        .where(Comentario.comercio_id == comercio_id)
        .order_by(Comentario.creado_en.desc(), Comentario.id.desc())
    ).all()
    return [
        ComentarioPublico(
            id=comentario.id,
            nombre_usuario=nombre,
            texto=comentario.texto,
            creado_en=comentario.creado_en,
        )
        for comentario, nombre in filas
    ]
