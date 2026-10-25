"""Auth mock: JWT sin contraseñas, emitido para usuarios sembrados."""

import os
from datetime import timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import SessionDep
from app.models import Rol, Usuario, ahora

SECRET = os.getenv("TLALAMATL_SECRET", "tlalamatl-secreto-de-desarrollo-no-usar-en-prod")
ALGORITMO = "HS256"
DURACION = timedelta(days=7)

bearer = HTTPBearer(auto_error=False)


def crear_token(usuario: Usuario) -> str:
    claims = {"sub": str(usuario.id), "rol": usuario.rol.value, "exp": ahora() + DURACION}
    return jwt.encode(claims, SECRET, algorithm=ALGORITMO)


def usuario_actual(
    session: SessionDep,
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Usuario:
    if credenciales is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el token")
    try:
        claims = jwt.decode(credenciales.credentials, SECRET, algorithms=[ALGORITMO])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")
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
