"""Tests del rol cliente. Dueña: rama rol/cliente."""

from app.models import Rol


def test_mis_pedidos(client, login):
    r = client.get("/cliente/pedidos", headers=login(Rol.cliente))
    assert r.status_code == 200
    assert all(p["items"] for p in r.json())


def test_favoritos_se_agregan_una_sola_vez_y_son_privados(client, login):
    headers = login(Rol.cliente)
    iniciales = client.get("/cliente/favoritos", headers=headers).json()
    ids_iniciales = {comercio["id"] for comercio in iniciales}
    comercio_id = next(
        comercio["id"]
        for comercio in client.get("/publico/comercios").json()
        if comercio["id"] not in ids_iniciales
    )
    otro_headers = login(Rol.cliente, n=1)
    otros_iniciales = client.get("/cliente/favoritos", headers=otro_headers).json()
    assert client.put(f"/cliente/favoritos/{comercio_id}", headers=headers).status_code == 204
    assert client.put(f"/cliente/favoritos/{comercio_id}", headers=headers).status_code == 204
    favoritos = client.get("/cliente/favoritos", headers=headers).json()
    assert {comercio["id"] for comercio in favoritos} == ids_iniciales | {comercio_id}
    assert client.get("/cliente/favoritos", headers=otro_headers).json() == otros_iniciales


def test_quitar_favorito_es_idempotente(client, login):
    headers = login(Rol.cliente)
    iniciales = client.get("/cliente/favoritos", headers=headers).json()
    ids_iniciales = {comercio["id"] for comercio in iniciales}
    comercio_id = iniciales[0]["id"]
    client.put(f"/cliente/favoritos/{comercio_id}", headers=headers)

    assert client.delete(f"/cliente/favoritos/{comercio_id}", headers=headers).status_code == 204
    assert client.delete(f"/cliente/favoritos/{comercio_id}", headers=headers).status_code == 204
    restantes = client.get("/cliente/favoritos", headers=headers).json()
    assert {comercio["id"] for comercio in restantes} == ids_iniciales - {comercio_id}


def test_favoritos_requieren_cliente_y_comercio_existente(client, login):
    assert client.get("/cliente/favoritos").status_code == 401
    assert client.put("/cliente/favoritos/1", headers=login(Rol.comerciante)).status_code == 403
    assert client.put("/cliente/favoritos/9999", headers=login(Rol.cliente)).status_code == 404


def test_cliente_puede_comentar_y_ver_sus_comentarios(client, login):
    headers = login(Rol.cliente)
    comercio = client.get("/publico/comercios").json()[0]
    respuesta = client.post(
        f"/cliente/comercios/{comercio['id']}/comentarios",
        headers=headers,
        json={"texto": "  Buen surtido  "},
    )

    assert respuesta.status_code == 201
    comentario = respuesta.json()
    assert comentario["texto"] == "Buen surtido"
    assert comentario["comercio_nombre"] == comercio["nombre"]
    propios = client.get("/cliente/comentarios", headers=headers).json()
    assert any(item["id"] == comentario["id"] for item in propios)
    assert all("comercio_nombre" in item for item in propios)


def test_comentar_requiere_cliente_y_comercio_existente(client, login):
    assert client.post("/cliente/comercios/1/comentarios", json={"texto": "Hola"}).status_code == 401
    assert (
        client.post(
            "/cliente/comercios/1/comentarios",
            headers=login(Rol.proveedor),
            json={"texto": "Hola"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/cliente/comercios/9999/comentarios",
            headers=login(Rol.cliente),
            json={"texto": "Hola"},
        ).status_code
        == 404
    )


def test_comentario_valida_texto(client, login):
    headers = login(Rol.cliente)
    comercio_id = client.get("/publico/comercios").json()[0]["id"]
    assert client.post(
        f"/cliente/comercios/{comercio_id}/comentarios", headers=headers, json={"texto": "  "}
    ).status_code == 422
    assert client.post(
        f"/cliente/comercios/{comercio_id}/comentarios", headers=headers, json={"texto": "x" * 501}
    ).status_code == 422
