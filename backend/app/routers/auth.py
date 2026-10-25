"""Login demo (sin contraseñas). Archivo COMPARTIDO."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import SQLModel, select

from app.auth import crear_token, usuario_actual
from app.db import SessionDep
from app.models import Comercio, Proveedor, Rol, Usuario

router = APIRouter(prefix="/auth", tags=["auth"])

ETIQUETA_CATEGORIA = {
    "central_abasto": "Central de Abasto",
    "mercado_fijo": "Mercado fijo",
    "mercado_sobre_ruedas": "Mercado sobre ruedas",
    "tianguis": "Tianguis",
}


class UsuarioDemo(SQLModel):
    id: int
    nombre: str
    rol: Rol
    alcaldia: str
    detalle: str | None = None  # p. ej. "Tianguis · Verduras Mary"


class UsuariosDemo(SQLModel):
    cliente: list[UsuarioDemo]
    comerciante: list[UsuarioDemo]
    proveedor: list[UsuarioDemo]


class DemoLoginEntrada(SQLModel):
    usuario_id: int


class DemoLoginRespuesta(SQLModel):
    token: str
    usuario: Usuario


@router.get("/usuarios-demo")
def usuarios_demo(session: SessionDep) -> UsuariosDemo:
    comercios = {c.dueno_id: c for c in session.exec(select(Comercio))}
    proveedores = {p.usuario_id: p for p in session.exec(select(Proveedor))}
    grupos: dict[Rol, list[UsuarioDemo]] = {rol: [] for rol in Rol}
    for u in session.exec(select(Usuario).order_by(Usuario.id)):
        detalle = None
        if u.id in comercios:
            c = comercios[u.id]
            detalle = f"{ETIQUETA_CATEGORIA[c.categoria]} · {c.nombre}"
        elif u.id in proveedores:
            p = proveedores[u.id]
            detalle = f"{p.tipo.value.capitalize()} · {p.nombre}"
        grupos[u.rol].append(
            UsuarioDemo(id=u.id, nombre=u.nombre, rol=u.rol, alcaldia=u.alcaldia, detalle=detalle)
        )
    return UsuariosDemo(
        cliente=grupos[Rol.cliente],
        comerciante=grupos[Rol.comerciante],
        proveedor=grupos[Rol.proveedor],
    )


@router.post("/demo-login")
def demo_login(entrada: DemoLoginEntrada, session: SessionDep) -> DemoLoginRespuesta:
    usuario = session.get(Usuario, entrada.usuario_id)
    if usuario is None:
        raise HTTPException(404, "Usuario demo no encontrado")
    return DemoLoginRespuesta(token=crear_token(usuario), usuario=usuario)


@router.get("/yo")
def yo(usuario: Annotated[Usuario, Depends(usuario_actual)]) -> Usuario:
    return usuario
