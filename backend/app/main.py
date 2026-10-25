"""App FastAPI. Archivo COMPARTIDO: los 4 routers de rol ya están registrados; no hace falta tocarlo."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute

from app.db import crear_tablas
from app.routers import auth, cliente, comercio, proveedor, publico


@asynccontextmanager
async def lifespan(_: FastAPI):
    crear_tablas()
    yield


def operation_id(route: APIRoute) -> str:
    # "<tag>_<nombre de la función>" -> en el cliente TS: publicoListarComercios, clienteMisPedidos...
    return f"{route.tags[0]}_{route.name}"


app = FastAPI(title="Tlalamatl API", version="0.1.0", lifespan=lifespan, generate_unique_id_function=operation_id)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(publico.router)
app.include_router(cliente.router)
app.include_router(comercio.router)
app.include_router(proveedor.router)


@app.get("/salud", tags=["sistema"])
def salud() -> dict[str, str]:
    return {"estado": "ok"}
