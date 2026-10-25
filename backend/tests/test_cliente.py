"""Tests del rol cliente. Dueña: rama rol/cliente."""

from app.models import Rol


def test_mis_pedidos(client, login):
    r = client.get("/cliente/pedidos", headers=login(Rol.cliente))
    assert r.status_code == 200
    assert all(p["items"] for p in r.json())
