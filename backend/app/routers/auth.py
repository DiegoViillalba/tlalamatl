"""Login demo (sin contraseñas). Archivo COMPARTIDO."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import SQLModel, select

from app.auth import ClaimsActuales, crear_token, es_de_supabase, usuario_actual
from app.db import SessionDep
from app.models import Categoria, Comercio, Dia, Proveedor, Rol, TipoProveedor, Usuario

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


@router.post("/vincular")
def vincular_cuenta(claims: ClaimsActuales, session: SessionDep) -> Usuario:
    """Primer ingreso por correo: liga la cuenta de Supabase con el Usuario del mismo email o crea un cliente."""
    if not es_de_supabase(claims):
        raise HTTPException(400, "Solo aplica a cuentas que entraron por correo")
    usuario = session.exec(select(Usuario).where(Usuario.auth_id == claims["sub"])).first()
    if usuario:
        return usuario
    email = (claims.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "La cuenta no tiene correo")
    usuario = session.exec(select(Usuario).where(func.lower(Usuario.email) == email)).first()
    if usuario is None:
        usuario = Usuario(nombre=email.split("@")[0], email=email, rol=Rol.cliente, alcaldia="")
    elif usuario.auth_id is not None:
        raise HTTPException(409, "Ese correo ya está ligado a otra cuenta")
    usuario.auth_id = claims["sub"]
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


class CompletarPerfilEntrada(SQLModel):
    nombre: str
    alcaldia: str
    rol: Rol
    # Solo cuando rol == comerciante
    comercio_nombre: str | None = None
    comercio_categoria: Categoria | None = None
    comercio_ubicacion: str | None = None
    comercio_dias: list[Dia] = []
    comercio_telefono: str | None = None
    comercio_whatsapp: str | None = None
    # Solo cuando rol == proveedor
    proveedor_nombre: str | None = None
    proveedor_tipo: TipoProveedor | None = None
    proveedor_zona: str | None = None
    proveedor_telefono: str | None = None
    proveedor_whatsapp: str | None = None


@router.post("/completar-perfil")
def completar_perfil(
    entrada: CompletarPerfilEntrada,
    usuario: Annotated[Usuario, Depends(usuario_actual)],
    session: SessionDep,
) -> Usuario:
    """Completa el perfil de un usuario nuevo: asigna nombre, alcaldía y rol, y crea el Comercio o Proveedor si aplica."""
    usuario.nombre = entrada.nombre.strip()
    usuario.alcaldia = entrada.alcaldia
    usuario.rol = entrada.rol

    if entrada.rol == Rol.comerciante:
        if not entrada.comercio_nombre or not entrada.comercio_categoria:
            raise HTTPException(422, "Para comerciante se requiere nombre y categoría del comercio")
        session.add(
            Comercio(
                dueno_id=usuario.id,
                nombre=entrada.comercio_nombre.strip(),
                categoria=entrada.comercio_categoria,
                alcaldia=entrada.alcaldia,
                ubicacion=entrada.comercio_ubicacion or "",
                dias_operacion=entrada.comercio_dias,
                telefono=entrada.comercio_telefono or None,
                whatsapp=entrada.comercio_whatsapp or None,
            )
        )
    elif entrada.rol == Rol.proveedor:
        if not entrada.proveedor_nombre or not entrada.proveedor_tipo or not entrada.proveedor_zona:
            raise HTTPException(422, "Para proveedor se requiere nombre, tipo y zona")
        session.add(
            Proveedor(
                usuario_id=usuario.id,
                nombre=entrada.proveedor_nombre.strip(),
                tipo=entrada.proveedor_tipo,
                zona=entrada.proveedor_zona,
                telefono=entrada.proveedor_telefono or None,
                whatsapp=entrada.proveedor_whatsapp or None,
            )
        )

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario
