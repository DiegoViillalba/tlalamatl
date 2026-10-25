"""Tests del rol comerciante. Dueña: rama rol/comercio."""

from app.models import Rol


def test_mi_comercio(client, login):
    r = client.get("/comercio/mi-comercio", headers=login(Rol.comerciante))
    assert r.status_code == 200
    assert r.json()["categoria"] == "tianguis"
