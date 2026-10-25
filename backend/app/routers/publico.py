"""Catálogo público de comercios y productos (sin login). Dueña: rama rol/cliente."""

from fastapi import APIRouter, HTTPException
from sqlmodel import SQLModel, select

from app.db import SessionDep
from app.models import Categoria, Comercio, Dia, Producto

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
