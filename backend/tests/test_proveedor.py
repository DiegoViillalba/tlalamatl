"""Tests del rol proveedor. Dueña: rama rol/proveedor."""

from app.models import Rol


def test_mi_perfil(client, login):
    r = client.get("/proveedor/mi-perfil", headers=login(Rol.proveedor))
    assert r.status_code == 200
    assert r.json()["tipo"] == "mayorista"
