"""Catálogo común de productos: enlaza el nombre libre que escribe una persona con un `ProductoBase`.

Archivo COMPARTIDO: lo usan `rol/comercio` (productos) y `rol/proveedor` (ofertas) para que sus precios
aparezcan en el dashboard de precios (que solo agrega los que tienen `producto_base_id`).
"""

import unicodedata

from sqlmodel import Session, select

from app.models import ProductoBase


def _palabras(texto: str) -> list[str]:
    sin_acentos = unicodedata.normalize("NFD", texto.lower())
    limpio = "".join(c for c in sin_acentos if unicodedata.category(c) != "Mn")
    return limpio.replace(",", " ").replace("-", " ").split()


def _coincide(palabra_base: str, palabra: str) -> bool:
    """Misma palabra o su plural simple: nopal/nopales, limón/limones; pero papa no es papaya."""
    return palabra == palabra_base or palabra in (palabra_base + "s", palabra_base + "es")


def buscar_producto_base(session: Session, nombre: str) -> ProductoBase | None:
    """El producto base cuyas palabras aparecen todas en `nombre` (la coincidencia más específica gana).

    "Jitomate saladet" -> Jitomate; "Chile guajillo seco" -> Chile guajillo; "Papaya maradol" -> Papaya;
    "Chile" o "Sandía" -> None (no hay un producto base claro).
    """
    palabras = _palabras(nombre)
    mejor: tuple[int, ProductoBase] | None = None
    for base in session.exec(select(ProductoBase)).all():
        palabras_base = _palabras(base.nombre)
        if all(any(_coincide(pb, p) for p in palabras) for pb in palabras_base):
            if mejor is None or len(palabras_base) > mejor[0]:
                mejor = (len(palabras_base), base)
    return mejor[1] if mejor else None
