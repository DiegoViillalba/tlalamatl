"""Endpoints del rol cliente. Dueña: rama rol/cliente.

Por implementar (ver docs/alcance/cliente.md): crear pedido, detalle de pedido, cancelar.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import select

from app.auth import require_rol
from app.db import SessionDep
from app.models import Pedido, PedidoLeer, Rol, Usuario

router = APIRouter(prefix="/cliente", tags=["cliente"])

ClienteActual = Annotated[Usuario, Depends(require_rol(Rol.cliente))]


@router.get("/pedidos")
def mis_pedidos(cliente: ClienteActual, session: SessionDep) -> list[PedidoLeer]:
    pedidos = session.exec(
        select(Pedido).where(Pedido.cliente_id == cliente.id).order_by(Pedido.creado_en.desc())
    )
    return [PedidoLeer.model_validate(p, from_attributes=True) for p in pedidos]
