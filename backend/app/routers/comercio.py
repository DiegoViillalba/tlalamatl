"""Endpoints del rol comerciante. Dueña: rama rol/comercio.

Por implementar (ver docs/alcance/comercio.md): pedidos recibidos y su avance,
órdenes de abasto, alertas de stock bajo.
"""

import json
import os
import re
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import SQLModel, select

from app.auth import require_rol
from app.db import SessionDep
from app.models import Comercio, Producto, Rol, Usuario

router = APIRouter(prefix="/comercio", tags=["comercio"])

ComercianteActual = Annotated[Usuario, Depends(require_rol(Rol.comerciante))]

PROMPT_ESCANEO = """\
Analiza esta imagen de un puesto de mercado, carrito de compras o menú de precios.
Identifica TODOS los productos visibles con la información que puedas leer.
Responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "productos": [
    {
      "nombre": "nombre del producto en singular en español, ej: Jitomate saladet",
      "precio": precio en pesos mexicanos como número sin símbolo $ (null si no es visible),
      "unidad": "unidad de medida: kg, g, pieza, manojo, litro, docena, caja…",
      "cantidad": cantidad disponible como número entero (0 si no es visible)
    }
  ]
}"""


class ProductoEntrada(SQLModel):
    nombre: str
    precio: float
    unidad: str
    stock: float = 0


class ProductoActualizacion(SQLModel):
    nombre: str | None = None
    precio: float | None = None
    unidad: str | None = None
    stock: float | None = None


class ProductoDetectado(SQLModel):
    nombre: str
    precio: float | None = None
    unidad: str
    cantidad: float = 0


class EscaneoResultado(SQLModel):
    productos: list[ProductoDetectado]


class ImportarProductosEntrada(SQLModel):
    productos: list[ProductoDetectado]


@router.get("/mi-comercio")
def mi_comercio(comerciante: ComercianteActual, session: SessionDep) -> Comercio:
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    if comercio is None:
        raise HTTPException(404, "Este usuario no tiene comercio")
    return comercio


@router.get("/productos")
def listar_productos(comerciante: ComercianteActual, session: SessionDep) -> list[Producto]:
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    if comercio is None:
        return []
    return list(session.exec(select(Producto).where(Producto.comercio_id == comercio.id)))


@router.post("/productos")
def crear_producto(entrada: ProductoEntrada, comerciante: ComercianteActual, session: SessionDep) -> Producto:
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    if comercio is None:
        raise HTTPException(404, "Este usuario no tiene comercio")
    producto = Producto(
        comercio_id=comercio.id,
        nombre=entrada.nombre.strip(),
        precio=entrada.precio,
        stock=entrada.stock,
        unidad=entrada.unidad.strip(),
    )
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


@router.post("/productos/escanear")
async def escanear_foto_inventario(
    comerciante: ComercianteActual,
    session: SessionDep,
    foto: UploadFile = File(description="Foto del carrito o menú"),
) -> EscaneoResultado:
    """Analiza una foto con Gemini Vision y devuelve los productos detectados para revisión."""
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    if comercio is None:
        raise HTTPException(404, "Este usuario no tiene comercio")
    if not foto.content_type or not foto.content_type.startswith("image/"):
        raise HTTPException(422, "El archivo debe ser una imagen (jpg, png, webp, etc.)")

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(503, "El análisis de fotos no está configurado (falta GEMINI_API_KEY)")

    try:
        from google import genai as google_genai  # noqa: PLC0415
        from google.genai import types as genai_types  # noqa: PLC0415

        cliente = google_genai.Client(api_key=api_key)
        datos_imagen = await foto.read()

        respuesta = cliente.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
            contents=[
                genai_types.Part.from_bytes(data=datos_imagen, mime_type=foto.content_type),
                PROMPT_ESCANEO,
            ],
        )

        texto = (respuesta.text or "").strip()
        match = re.search(r"\{.*\}", texto, re.DOTALL)
        if not match:
            raise HTTPException(422, "No se pudieron detectar productos en la imagen")

        data = json.loads(match.group())
        detectados = [
            ProductoDetectado(
                nombre=p.get("nombre", "").strip(),
                precio=p.get("precio"),
                unidad=(p.get("unidad") or "pieza").strip(),
                cantidad=float(p.get("cantidad") or 0),
            )
            for p in data.get("productos", [])
            if p.get("nombre")
        ]
        return EscaneoResultado(productos=detectados)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, f"Error al analizar la imagen: {exc}") from exc


@router.post("/productos/importar")
def importar_productos(
    entrada: ImportarProductosEntrada,
    comerciante: ComercianteActual,
    session: SessionDep,
) -> list[Producto]:
    """Guarda en el inventario los productos revisados del escaneo."""
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    if comercio is None:
        raise HTTPException(404, "Este usuario no tiene comercio")

    creados: list[Producto] = []
    for p in entrada.productos:
        producto = Producto(
            comercio_id=comercio.id,
            nombre=p.nombre.strip(),
            precio=p.precio or 0.0,
            stock=p.cantidad,
            unidad=(p.unidad.strip() or "pieza"),
        )
        session.add(producto)
        creados.append(producto)
    session.commit()
    for p in creados:
        session.refresh(p)
    return creados


@router.patch("/productos/{producto_id}")
def actualizar_producto(
    producto_id: int,
    cambios: ProductoActualizacion,
    comerciante: ComercianteActual,
    session: SessionDep,
) -> Producto:
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    producto = session.get(Producto, producto_id)
    if producto is None or (comercio is None) or producto.comercio_id != comercio.id:
        raise HTTPException(404, "Producto no encontrado")
    if cambios.nombre is not None:
        producto.nombre = cambios.nombre.strip()
    if cambios.precio is not None:
        producto.precio = cambios.precio
    if cambios.unidad is not None:
        producto.unidad = cambios.unidad.strip()
    if cambios.stock is not None:
        producto.stock = cambios.stock
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


@router.delete("/productos/{producto_id}", status_code=204)
def eliminar_producto(producto_id: int, comerciante: ComercianteActual, session: SessionDep) -> None:
    comercio = session.exec(select(Comercio).where(Comercio.dueno_id == comerciante.id)).first()
    producto = session.get(Producto, producto_id)
    if producto is None or (comercio is None) or producto.comercio_id != comercio.id:
        raise HTTPException(404, "Producto no encontrado")
    session.delete(producto)
    session.commit()
