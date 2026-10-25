import jwt

from app.auth import ALGORITMO, SECRET
from app.models import Rol


def test_usuarios_demo_agrupados_por_rol(client):
    r = client.get("/auth/usuarios-demo")
    assert r.status_code == 200
    datos = r.json()
    assert len(datos["cliente"]) == 3
    assert len(datos["comerciante"]) == 8
    assert len(datos["proveedor"]) == 4
    assert all(u["detalle"] for u in datos["comerciante"] + datos["proveedor"])


def test_demo_login_emite_jwt_con_sub_y_rol(client):
    usuario = client.get("/auth/usuarios-demo").json()["proveedor"][0]
    r = client.post("/auth/demo-login", json={"usuario_id": usuario["id"]})
    assert r.status_code == 200
    claims = jwt.decode(r.json()["token"], SECRET, algorithms=[ALGORITMO])
    assert claims["sub"] == str(usuario["id"])
    assert claims["rol"] == "proveedor"


def test_demo_login_usuario_inexistente(client):
    assert client.post("/auth/demo-login", json={"usuario_id": 9999}).status_code == 404


def test_yo_requiere_token(client, login):
    assert client.get("/auth/yo").status_code == 401
    assert client.get("/auth/yo", headers={"Authorization": "Bearer basura"}).status_code == 401
    r = client.get("/auth/yo", headers=login(Rol.cliente))
    assert r.json()["rol"] == "cliente"


def test_routers_protegidos_por_rol(client, login):
    cliente = login(Rol.cliente)
    assert client.get("/comercio/mi-comercio", headers=cliente).status_code == 403
    assert client.get("/proveedor/mi-perfil", headers=cliente).status_code == 403
    assert client.get("/cliente/pedidos", headers=login(Rol.comerciante)).status_code == 403
    assert client.get("/cliente/pedidos").status_code == 401
