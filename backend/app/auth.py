"""Auth: acepta el JWT demo (sin contraseñas) y el JWT de Supabase Auth (login por código de correo).

Archivo COMPARTIDO. Configuración en backend/.env (ver backend/.env.example).
"""

import os
from datetime import timedelta
from typing import Annotated, Any

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func
from sqlmodel import select

from app.db import SessionDep
from app.models import Rol, Usuario, ahora

load_dotenv()

SECRET = os.getenv("TLALAMATL_SECRET") or "tlalamatl-secreto-de-desarrollo-no-usar-en-prod"
ALGORITMO = "HS256"
DURACION = timedelta(days=7)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
# Solo para proyectos de Supabase que todavía firman con el "JWT secret" legacy (HS256).
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
EMISOR_SUPABASE = f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else None
ALGORITMOS_SUPABASE = {"ES256", "RS256", "HS256"}

_jwks = jwt.PyJWKClient(f"{EMISOR_SUPABASE}/.well-known/jwks.json") if EMISOR_SUPABASE else None

bearer = HTTPBearer(auto_error=False)
Claims = dict[str, Any]


def crear_token(usuario: Usuario) -> str:
    claims = {"sub": str(usuario.id), "rol": usuario.rol.value, "exp": ahora() + DURACION}
    return jwt.encode(claims, SECRET, algorithm=ALGORITMO)


def es_de_supabase(claims: Claims) -> bool:
    return EMISOR_SUPABASE is not None and claims.get("iss") == EMISOR_SUPABASE


def llave_supabase(token: str, algoritmo: str):
    """Llave pública del JWKS del proyecto o, en proyectos legacy, el secreto compartido."""
    if algoritmo == "HS256":
        if not SUPABASE_JWT_SECRET:
            raise jwt.InvalidTokenError("Falta SUPABASE_JWT_SECRET para validar tokens HS256")
        return SUPABASE_JWT_SECRET
    if _jwks is None:
        raise jwt.InvalidTokenError("Supabase no está configurado")
    return _jwks.get_signing_key_from_jwt(token).key


def decodificar(token: str) -> Claims:
    """Valida un token demo o de Supabase y devuelve sus claims. Lanza 401 si no es válido."""
    try:
        sin_verificar = jwt.decode(token, options={"verify_signature": False})
        if not es_de_supabase(sin_verificar):
            return jwt.decode(token, SECRET, algorithms=[ALGORITMO])
        algoritmo = jwt.get_unverified_header(token).get("alg")
        if algoritmo not in ALGORITMOS_SUPABASE:
            raise jwt.InvalidAlgorithmError(f"Algoritmo no permitido: {algoritmo}")
        return jwt.decode(
            token,
            llave_supabase(token, algoritmo),
            algorithms=[algoritmo],
            audience="authenticated",
            issuer=EMISOR_SUPABASE,
        )
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")


def claims_actuales(
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Claims:
    if credenciales is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token")
    return decodificar(credenciales.credentials)


ClaimsActuales = Annotated[Claims, Depends(claims_actuales)]


def usuario_actual(session: SessionDep, claims: ClaimsActuales) -> Usuario:
    if es_de_supabase(claims):
        usuario = session.exec(select(Usuario).where(Usuario.auth_id == claims["sub"])).first()
        if usuario is None:
            # Cold start on a different serverless instance: re-link by email so the user isn't logged out.
            email = (claims.get("email") or "").strip().lower()
            if not email:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no existe")
            usuario = session.exec(select(Usuario).where(func.lower(Usuario.email) == email)).first()
            if usuario is None:
                usuario = Usuario(nombre=email.split("@")[0], email=email, rol=Rol.cliente, alcaldia="")
                session.add(usuario)
            usuario.auth_id = claims["sub"]
            session.add(usuario)
            session.commit()
            session.refresh(usuario)
    else:
        usuario = session.get(Usuario, int(claims["sub"]))
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no existe")
    return usuario


def require_rol(*roles: Rol):
    """Dependencia que exige que el usuario autenticado tenga alguno de los roles dados."""

    def dependencia(usuario: Annotated[Usuario, Depends(usuario_actual)]) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes acceso a esta sección")
        return usuario

    return dependencia
