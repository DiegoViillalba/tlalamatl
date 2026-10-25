"""Endpoints del rol proveedor. Dueña: rama rol/proveedor.

Por implementar (ver docs/alcance/proveedor.md): CRUD de ofertas, órdenes de abasto recibidas y su avance.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select

from app.auth import require_rol
from app.db import SessionDep
from app.models import Proveedor, Rol, Usuario

router = APIRouter(prefix="/proveedor", tags=["proveedor"])

ProveedorActual = Annotated[Usuario, Depends(require_rol(Rol.proveedor))]


@router.get("/mi-perfil")
def mi_perfil(usuario: ProveedorActual, session: SessionDep) -> Proveedor:
    proveedor = session.exec(select(Proveedor).where(Proveedor.usuario_id == usuario.id)).first()
    if proveedor is None:
        raise HTTPException(404, "Este usuario no tiene perfil de proveedor")
    return proveedor
