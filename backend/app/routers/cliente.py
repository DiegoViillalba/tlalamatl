"""Endpoints del rol cliente. Dueña: rama rol/cliente."""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import field_validator
from sqlmodel import Field, SQLModel, select

from app.auth import require_rol
from app.db import SessionDep
from app.models import Comentario, Comercio, Dia, Favorito, Pedido, PedidoLeer, Rol, Usuario

router = APIRouter(prefix="/cliente", tags=["cliente"])

ClienteActual = Annotated[Usuario, Depends(require_rol(Rol.cliente))]


class ComercioFavorito(SQLModel):
    id: int
    nombre: str
    categoria: str
    alcaldia: str
    ubicacion: str
    lat: float | None
    lng: float | None
    dias_operacion: list[Dia]


class ComentarioCrear(SQLModel):
    texto: str = Field(min_length=1, max_length=500)

    @field_validator("texto")
    @classmethod
    def limpiar_texto(cls, texto: str) -> str:
        texto = texto.strip()
        if not texto:
            raise ValueError("El comentario no puede estar vacío")
        return texto


class ComentarioClienteLeer(SQLModel):
    id: int
    comercio_id: int
    comercio_nombre: str
    texto: str
    creado_en: datetime


@router.get("/favoritos", response_model=list[ComercioFavorito])
def listar_favoritos(cliente: ClienteActual, session: SessionDep) -> list[ComercioFavorito]:
    comercios = session.exec(
        select(Comercio)
        .join(Favorito, Favorito.comercio_id == Comercio.id)
        .where(Favorito.usuario_id == cliente.id)
        .order_by(Comercio.nombre)
    ).all()
    return [ComercioFavorito.model_validate(comercio, from_attributes=True) for comercio in comercios]


@router.put("/favoritos/{comercio_id}", status_code=204)
def agregar_favorito(comercio_id: int, cliente: ClienteActual, session: SessionDep) -> None:
    if session.get(Comercio, comercio_id) is None:
        raise HTTPException(404, "Comercio no encontrado")
    favorito = session.exec(
        select(Favorito).where(Favorito.usuario_id == cliente.id, Favorito.comercio_id == comercio_id)
    ).first()
    if favorito is None:
        session.add(Favorito(usuario_id=cliente.id, comercio_id=comercio_id))
        session.commit()


@router.delete("/favoritos/{comercio_id}", status_code=204)
def quitar_favorito(comercio_id: int, cliente: ClienteActual, session: SessionDep) -> None:
    favorito = session.exec(
        select(Favorito).where(Favorito.usuario_id == cliente.id, Favorito.comercio_id == comercio_id)
    ).first()
    if favorito is not None:
        session.delete(favorito)
        session.commit()


@router.post("/comercios/{comercio_id}/comentarios", response_model=ComentarioClienteLeer, status_code=201)
def comentar(
    comercio_id: int,
    datos: ComentarioCrear,
    cliente: ClienteActual,
    session: SessionDep,
) -> ComentarioClienteLeer:
    comercio = session.get(Comercio, comercio_id)
    if comercio is None:
        raise HTTPException(404, "Comercio no encontrado")
    comentario = Comentario(usuario_id=cliente.id, comercio_id=comercio_id, texto=datos.texto)
    session.add(comentario)
    session.commit()
    session.refresh(comentario)
    return ComentarioClienteLeer(
        id=comentario.id,
        comercio_id=comercio_id,
        comercio_nombre=comercio.nombre,
        texto=comentario.texto,
        creado_en=comentario.creado_en,
    )


@router.get("/comentarios", response_model=list[ComentarioClienteLeer])
def mis_comentarios(cliente: ClienteActual, session: SessionDep) -> list[ComentarioClienteLeer]:
    filas = session.exec(
        select(Comentario, Comercio.nombre)
        .join(Comercio, Comercio.id == Comentario.comercio_id)
        .where(Comentario.usuario_id == cliente.id)
        .order_by(Comentario.creado_en.desc(), Comentario.id.desc())
    ).all()
    return [
        ComentarioClienteLeer(
            id=comentario.id,
            comercio_id=comentario.comercio_id,
            comercio_nombre=nombre,
            texto=comentario.texto,
            creado_en=comentario.creado_en,
        )
        for comentario, nombre in filas
    ]


@router.get("/pedidos")
def mis_pedidos(cliente: ClienteActual, session: SessionDep) -> list[PedidoLeer]:
    pedidos = session.exec(
        select(Pedido).where(Pedido.cliente_id == cliente.id).order_by(Pedido.creado_en.desc())
    )
    return [PedidoLeer.model_validate(p, from_attributes=True) for p in pedidos]
