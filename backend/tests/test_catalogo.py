"""Tests del catálogo común de productos (enlace por nombre y endpoint público)."""

import pytest

from app.catalogo import buscar_producto_base


@pytest.mark.parametrize(
    "nombre,esperado",
    [
        ("Jitomate saladet", "Jitomate"),
        ("jitomates", "Jitomate"),
        ("  CEBOLLA morada ", "Cebolla"),
        ("Nopales limpios", "Nopal"),
        ("Limones", "Limón"),
        ("Limón con semilla", "Limón"),
        ("Papa blanca", "Papa"),
        ("Papaya maradol", "Papaya"),  # no confundir con Papa
        ("Chile guajillo seco", "Chile guajillo"),
        ("Chile de árbol", "Chile de árbol"),
        ("Brocoli", "Brócoli"),  # sin acento
        ("Arroz súper extra", "Arroz"),
    ],
)
def test_buscar_producto_base(session, nombre, esperado):
    assert buscar_producto_base(session, nombre).nombre == esperado


@pytest.mark.parametrize("nombre", ["Chile", "Chile poblano", "Sandía", "Tomate verde", ""])
def test_sin_producto_base_claro_devuelve_none(session, nombre):
    assert buscar_producto_base(session, nombre) is None


def test_listar_productos_base_es_publico(client):
    r = client.get("/publico/productos-base")
    assert r.status_code == 200
    bases = r.json()
    assert len(bases) == 34
    assert {"id", "nombre", "unidad", "categoria", "canasta_basica", "meses_temporada"} <= set(bases[0])
    assert "Jitomate" in {b["nombre"] for b in bases}
