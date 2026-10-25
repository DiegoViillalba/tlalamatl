"""Endpoints del rol comerciante. Dueña: rama rol/comercio.

Por implementar (ver docs/alcance/comercio.md): CRUD de productos, pedidos recibidos y su avance,
ofertas de proveedores, órdenes de abasto, alertas de stock bajo.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from app.auth import require_rol
from app.db import SessionDep
from app.models import Comercio, Rol, Usuario

router = APIRouter(prefix="/comercio", tags=["comercio"])

ComercianteActual = Annotated[Usuario, Depends(require_rol(Rol.comerciante))]


@router.get("/mi-comercio")
def mi_comercio(comerciante: ComercianteActual, session: SessionDep) -> Comercio:
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    if comercio is None:
        raise HTTPException(404, "Este usuario no tiene comercio")
    return comercio
