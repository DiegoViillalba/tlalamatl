"""Modelo de datos de Tlalamatl: fuente única de verdad.

Archivo COMPARTIDO: los cambios se hacen en `main` y luego cada rama hace `git merge main`
(ver AGENTS.md, "Trabajo en ramas").
"""

from datetime import date, datetime
from enum import Enum
from zoneinfo import ZoneInfo

from sqlalchemy import DateTime, UniqueConstraint
from sqlalchemy.types import JSON, TypeDecorator
from sqlmodel import Column, Field, Relationship, SQLModel

ZONA_CDMX = ZoneInfo("America/Mexico_City")


def ahora() -> datetime:
    return datetime.now(ZONA_CDMX)


# Columnas de fecha-hora con zona horaria (timestamptz en Postgres; en SQLite no cambia nada).
FECHA_HORA = DateTime(timezone=True)


# --- Enums ---------------------------------------------------------------------------


class Rol(str, Enum):
    cliente = "cliente"
    comerciante = "comerciante"
    proveedor = "proveedor"


class Categoria(str, Enum):
    central_abasto = "central_abasto"
    mercado_fijo = "mercado_fijo"
    mercado_sobre_ruedas = "mercado_sobre_ruedas"
    tianguis = "tianguis"


class TipoProveedor(str, Enum):
    productor = "productor"
    mayorista = "mayorista"
    almacen = "almacen"


class Dia(str, Enum):
    lun = "lun"
    mar = "mar"
    mie = "mie"
    jue = "jue"
    vie = "vie"
    sab = "sab"
    dom = "dom"

    @classmethod
    def hoy(cls) -> "Dia":
        """Día de la semana actual en horario de la CDMX."""
        return list(cls)[ahora().weekday()]


class EstadoPedido(str, Enum):
    creado = "creado"
    aceptado = "aceptado"
    listo = "listo"
    entregado = "entregado"
    cancelado = "cancelado"


class EstadoOrden(str, Enum):
    solicitada = "solicitada"
    confirmada = "confirmada"
    enviada = "enviada"
    recibida = "recibida"
    rechazada = "rechazada"


class EstadoRuta(str, Enum):
    abierta = "abierta"  # acepta solicitudes de comercios para sumarse
    en_camino = "en_camino"
    completada = "completada"
    cancelada = "cancelada"


class EstadoSolicitudFlete(str, Enum):
    pendiente = "pendiente"
    aceptada = "aceptada"
    rechazada = "rechazada"


class ListaDias(TypeDecorator):
    """Guarda list[Dia] como JSON y la lee de vuelta como enums (no como strings sueltos)."""

    impl = JSON
    cache_ok = True

    def process_result_value(self, value, dialect):
        return [Dia(d) for d in value or []]


# --- Tablas --------------------------------------------------------------------------


class Usuario(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nombre: str
    email: str = Field(unique=True)
    rol: Rol
    alcaldia: str
    # `sub` del usuario en Supabase Auth; None para los usuarios demo que nunca entraron por correo.
    auth_id: str | None = Field(default=None, unique=True, index=True)


class Comercio(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    dueno_id: int = Field(foreign_key="usuario.id", index=True)
    nombre: str
    categoria: Categoria
    alcaldia: str
    ubicacion: str
    lat: float | None = None
    lng: float | None = None
    dias_operacion: list[Dia] = Field(default_factory=list, sa_column=Column(ListaDias))
    # Contacto directo que se muestra en la ficha pública. 10 dígitos, sin lada internacional.
    telefono: str | None = None
    whatsapp: str | None = None


class Proveedor(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", index=True)
    nombre: str
    tipo: TipoProveedor
    zona: str
    lat: float | None = None  # punto donde atiende en la CDMX (para el mapa)
    lng: float | None = None
    telefono: str | None = None
    whatsapp: str | None = None


class ProductoBase(SQLModel, table=True):
    """Catálogo común: "Jitomate" de un comercio y de un proveedor es el mismo producto base.

    Permite agrupar precios (dashboard `/publico/precios`), marcar la canasta básica y la temporada.
    """

    id: int | None = Field(default=None, primary_key=True)
    nombre: str = Field(unique=True)
    unidad: str  # unidad de referencia: kg, pieza, manojo...
    categoria: str  # fruta, verdura, abarrote, proteina
    canasta_basica: bool = False
    # Meses (1-12) en que es de temporada. Lista vacía = todo el año.
    meses_temporada: list[int] = Field(default_factory=list, sa_column=Column(JSON))


class PrecioHistorico(SQLModel, table=True):
    """Foto semanal de los precios de un producto base (historial del dashboard `/publico/precios`)."""

    id: int | None = Field(default=None, primary_key=True)
    producto_base_id: int = Field(foreign_key="productobase.id", index=True)
    fecha: date
    menudeo_promedio: float
    menudeo_minimo: float
    mayoreo_promedio: float | None = None  # None si esa semana no había ofertas de mayoreo
    mayoreo_minimo: float | None = None
    n_muestras: int  # precios de menudeo que entraron al promedio


class Producto(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    comercio_id: int = Field(foreign_key="comercio.id", index=True)
    producto_base_id: int | None = Field(default=None, foreign_key="productobase.id", index=True)
    nombre: str
    precio: float
    stock: float
    unidad: str  # kg, pieza, manojo, litro, caja...
    stock_minimo: float = 5  # por debajo de esto hay alerta de stock bajo


class OfertaProveedor(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    proveedor_id: int = Field(foreign_key="proveedor.id", index=True)
    producto_base_id: int | None = Field(default=None, foreign_key="productobase.id", index=True)
    producto: str  # producto genérico, p. ej. "Jitomate saladet"
    unidad: str
    precio_mayoreo: float
    cantidad_minima: float
    disponible: bool = True


class Pedido(SQLModel, table=True):
    """Pedido B2C: cliente -> comercio."""

    id: int | None = Field(default=None, primary_key=True)
    cliente_id: int = Field(foreign_key="usuario.id", index=True)
    comercio_id: int = Field(foreign_key="comercio.id", index=True)
    estado: EstadoPedido = EstadoPedido.creado
    creado_en: datetime = Field(default_factory=ahora, sa_type=FECHA_HORA)

    items: list["PedidoItem"] = Relationship(back_populates="pedido")


class PedidoItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    pedido_id: int = Field(foreign_key="pedido.id", index=True)
    producto_id: int = Field(foreign_key="producto.id")
    cantidad: float
    precio_unitario: float  # precio al momento de pedir

    pedido: Pedido = Relationship(back_populates="items")


class OrdenAbasto(SQLModel, table=True):
    """Orden B2B: comercio -> proveedor."""

    id: int | None = Field(default=None, primary_key=True)
    comercio_id: int = Field(foreign_key="comercio.id", index=True)
    proveedor_id: int = Field(foreign_key="proveedor.id", index=True)
    estado: EstadoOrden = EstadoOrden.solicitada
    creado_en: datetime = Field(default_factory=ahora, sa_type=FECHA_HORA)
    # Ruta de entrega compartida a la que pertenece la orden (None = entrega por separado).
    ruta_id: int | None = Field(default=None, foreign_key="rutaentrega.id", index=True)

    items: list["OrdenAbastoItem"] = Relationship(back_populates="orden")


class OrdenAbastoItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    orden_id: int = Field(foreign_key="ordenabasto.id", index=True)
    oferta_id: int = Field(foreign_key="ofertaproveedor.id")
    # Producto del comercio que se reabastece al recibir la orden.
    # Si es None, al recibir se busca/crea un producto con el nombre de la oferta.
    producto_id: int | None = Field(default=None, foreign_key="producto.id")
    cantidad: float
    precio_unitario: float

    orden: OrdenAbasto = Relationship(back_populates="items")


class RutaEntrega(SQLModel, table=True):
    """Flete compartido: un proveedor entrega las órdenes de varios comercios en un solo viaje.

    Las paradas son las `OrdenAbasto` con este `ruta_id`. El costo del flete se reparte en partes
    iguales entre los comercios distintos de la ruta (se calcula al leer; no se guarda).
    """

    id: int | None = Field(default=None, primary_key=True)
    proveedor_id: int = Field(foreign_key="proveedor.id", index=True)
    zona: str  # alcaldía o zona que cubre la ruta
    fecha: date  # día de salida
    costo_flete: float = 0  # costo total del viaje, en MXN
    nota: str | None = None
    estado: EstadoRuta = EstadoRuta.abierta
    creado_en: datetime = Field(default_factory=ahora, sa_type=FECHA_HORA)


class SolicitudFlete(SQLModel, table=True):
    """Un comercio pide que su orden (confirmada) viaje en una ruta abierta del proveedor."""

    id: int | None = Field(default=None, primary_key=True)
    ruta_id: int = Field(foreign_key="rutaentrega.id", index=True)
    comercio_id: int = Field(foreign_key="comercio.id", index=True)
    orden_id: int = Field(foreign_key="ordenabasto.id", index=True)
    estado: EstadoSolicitudFlete = EstadoSolicitudFlete.pendiente
    creado_en: datetime = Field(default_factory=ahora, sa_type=FECHA_HORA)


class Favorito(SQLModel, table=True):
    """Comercio que un usuario (cliente) guardó como favorito."""

    __table_args__ = (UniqueConstraint("usuario_id", "comercio_id"),)

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", index=True)
    comercio_id: int = Field(foreign_key="comercio.id", index=True)
    creado_en: datetime = Field(default_factory=ahora, sa_type=FECHA_HORA)


class Comentario(SQLModel, table=True):
    """Comentario de texto que un usuario deja en la ficha de un comercio (lectura pública)."""

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", index=True)
    comercio_id: int = Field(foreign_key="comercio.id", index=True)
    texto: str = Field(max_length=500)
    creado_en: datetime = Field(default_factory=ahora, sa_type=FECHA_HORA)


# --- Esquemas de lectura compartidos (respuestas con items anidados) -----------------


class PedidoItemLeer(SQLModel):
    id: int
    producto_id: int
    cantidad: float
    precio_unitario: float


class PedidoLeer(SQLModel):
    id: int
    cliente_id: int
    comercio_id: int
    estado: EstadoPedido
    creado_en: datetime
    items: list[PedidoItemLeer]


class OrdenAbastoItemLeer(SQLModel):
    id: int
    oferta_id: int
    producto_id: int | None
    cantidad: float
    precio_unitario: float


class OrdenAbastoLeer(SQLModel):
    id: int
    comercio_id: int
    proveedor_id: int
    estado: EstadoOrden
    creado_en: datetime
    ruta_id: int | None = None
    items: list[OrdenAbastoItemLeer]
