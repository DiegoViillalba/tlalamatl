"""Tests del rol proveedor. Dueña: rama rol/proveedor."""

from sqlmodel import select

from app.models import EstadoOrden, OrdenAbasto, Rol

# Proveedores sembrados (n del login): 0 Hortícola del Valle, 1 San Juan, 2 Xochimilco, 3 Uruapan.
VALLE, SAN_JUAN, XOCHIMILCO, URUAPAN = 0, 1, 2, 3


def test_mi_perfil(client, login):
    r = client.get("/proveedor/mi-perfil", headers=login(Rol.proveedor))
    assert r.status_code == 200
    assert r.json()["tipo"] == "mayorista"


def test_endpoints_exigen_rol_proveedor(client, login):
    assert client.get("/proveedor/ofertas").status_code == 401
    for rol in (Rol.cliente, Rol.comerciante):
        h = login(rol)
        assert client.get("/proveedor/ofertas", headers=h).status_code == 403
        assert client.get("/proveedor/ordenes", headers=h).status_code == 403
        assert client.get("/proveedor/compradores", headers=h).status_code == 403
        assert client.patch("/proveedor/mi-perfil", json={}, headers=h).status_code == 403


# --- Perfil --------------------------------------------------------------------------


def test_actualizar_perfil(client, login):
    h = login(Rol.proveedor)
    r = client.patch(
        "/proveedor/mi-perfil",
        json={"zona": " Nave 4, Central de Abasto ", "telefono": "5500111222", "whatsapp": ""},
        headers=h,
    )
    assert r.status_code == 200
    datos = r.json()
    assert datos["zona"] == "Nave 4, Central de Abasto"
    assert datos["telefono"] == "5500111222"
    assert datos["whatsapp"] is None
    assert client.get("/proveedor/mi-perfil", headers=h).json()["zona"] == "Nave 4, Central de Abasto"


def test_actualizar_perfil_parcial_no_toca_lo_demas(client, login):
    h = login(Rol.proveedor)
    antes = client.get("/proveedor/mi-perfil", headers=h).json()
    r = client.patch("/proveedor/mi-perfil", json={"telefono": "5500999888"}, headers=h)
    assert r.status_code == 200
    assert r.json()["zona"] == antes["zona"]
    assert r.json()["whatsapp"] == antes["whatsapp"]


def test_actualizar_perfil_valida(client, login):
    h = login(Rol.proveedor)
    assert client.patch("/proveedor/mi-perfil", json={"telefono": "123"}, headers=h).status_code == 422
    assert client.patch("/proveedor/mi-perfil", json={"zona": "  "}, headers=h).status_code == 422
    assert client.patch("/proveedor/mi-perfil", json={"zona": None}, headers=h).status_code == 422


# --- Ofertas -------------------------------------------------------------------------


def test_listar_ofertas_solo_las_propias(client, login):
    ofertas = client.get("/proveedor/ofertas", headers=login(Rol.proveedor, VALLE)).json()
    # El seed puede agregar ofertas al final; las originales conservan su orden al inicio.
    assert [o["producto"] for o in ofertas[:4]] == ["Jitomate saladet", "Cebolla blanca", "Chile serrano", "Papa blanca"]
    otro = client.get("/proveedor/ofertas", headers=login(Rol.proveedor, URUAPAN)).json()
    assert {o["id"] for o in ofertas}.isdisjoint(o["id"] for o in otro)


def test_crear_oferta(client, login):
    h = login(Rol.proveedor)
    r = client.post(
        "/proveedor/ofertas",
        json={"producto": "Calabacita", "unidad": "kg", "precio_mayoreo": 18.5, "cantidad_minima": 25},
        headers=h,
    )
    assert r.status_code == 201
    assert r.json()["disponible"] is True
    assert "Calabacita" in [o["producto"] for o in client.get("/proveedor/ofertas", headers=h).json()]


def test_crear_oferta_valida(client, login):
    h = login(Rol.proveedor)
    base = {"producto": "Calabacita", "unidad": "kg", "precio_mayoreo": 18, "cantidad_minima": 25}
    for malo in ({"precio_mayoreo": 0}, {"cantidad_minima": -1}, {"producto": ""}, {"unidad": ""}):
        assert client.post("/proveedor/ofertas", json={**base, **malo}, headers=h).status_code == 422


def test_actualizar_oferta(client, login):
    h = login(Rol.proveedor)
    oferta = client.get("/proveedor/ofertas", headers=h).json()[0]
    r = client.patch(f"/proveedor/ofertas/{oferta['id']}", json={"precio_mayoreo": 17, "disponible": False}, headers=h)
    assert r.status_code == 200
    assert r.json()["precio_mayoreo"] == 17
    assert r.json()["disponible"] is False
    assert r.json()["producto"] == oferta["producto"]


def test_actualizar_oferta_ignora_null_y_valida(client, login):
    h = login(Rol.proveedor)
    oferta = client.get("/proveedor/ofertas", headers=h).json()[0]
    url = f"/proveedor/ofertas/{oferta['id']}"
    r = client.patch(url, json={"precio_mayoreo": None}, headers=h)
    assert r.status_code == 200
    assert r.json()["precio_mayoreo"] == oferta["precio_mayoreo"]
    assert client.patch(url, json={"precio_mayoreo": -5}, headers=h).status_code == 422


def test_eliminar_oferta_sin_ordenes(client, login):
    h = login(Rol.proveedor)
    nueva = client.post(
        "/proveedor/ofertas",
        json={"producto": "Epazote", "unidad": "manojo", "precio_mayoreo": 4, "cantidad_minima": 30},
        headers=h,
    ).json()
    assert client.delete(f"/proveedor/ofertas/{nueva['id']}", headers=h).status_code == 204
    assert nueva["id"] not in [o["id"] for o in client.get("/proveedor/ofertas", headers=h).json()]


def test_eliminar_oferta_con_ordenes_responde_409(client, login):
    h = login(Rol.proveedor, VALLE)
    # La primera oferta del proveedor ya está en una orden sembrada.
    oferta = client.get("/proveedor/ofertas", headers=h).json()[0]
    assert client.delete(f"/proveedor/ofertas/{oferta['id']}", headers=h).status_code == 409


def test_ofertas_ajenas_responden_404(client, login):
    ajena = client.get("/proveedor/ofertas", headers=login(Rol.proveedor, URUAPAN)).json()[0]["id"]
    h = login(Rol.proveedor, VALLE)
    assert client.patch(f"/proveedor/ofertas/{ajena}", json={"precio_mayoreo": 1}, headers=h).status_code == 404
    assert client.delete(f"/proveedor/ofertas/{ajena}", headers=h).status_code == 404
    assert client.patch("/proveedor/ofertas/99999", json={"disponible": False}, headers=h).status_code == 404
    # Y la oferta ajena quedó intacta.
    intacta = client.get("/proveedor/ofertas", headers=login(Rol.proveedor, URUAPAN)).json()[0]
    assert intacta["id"] == ajena and intacta["precio_mayoreo"] != 1


# --- Órdenes -------------------------------------------------------------------------


def _ordenes(client, h, estado=None):
    r = client.get("/proveedor/ordenes", params={"estado": estado} if estado else None, headers=h)
    assert r.status_code == 200
    return r.json()


def test_listar_ordenes_con_contacto_del_comercio(client, login):
    ordenes = _ordenes(client, login(Rol.proveedor, SAN_JUAN))
    assert {o["estado"] for o in ordenes} == {"confirmada", "rechazada"}
    orden = next(o for o in ordenes if o["estado"] == "confirmada")
    assert orden["comercio"]["nombre"]
    assert orden["comercio"]["telefono"]
    assert orden["items"][0]["producto"] == "Frijol negro"
    assert orden["items"][0]["unidad"] == "kg"


def test_listar_ordenes_filtra_por_estado(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    assert [o["estado"] for o in _ordenes(client, h, "rechazada")] == ["rechazada"]
    assert _ordenes(client, h, "solicitada") == []
    assert client.get("/proveedor/ordenes", params={"estado": "inventado"}, headers=h).status_code == 422


def test_confirmar_y_enviar_orden(client, login):
    h = login(Rol.proveedor, XOCHIMILCO)
    orden = _ordenes(client, h)[0]
    assert orden["estado"] == "solicitada"
    r = client.post(f"/proveedor/ordenes/{orden['id']}/estado", json={"estado": "confirmada"}, headers=h)
    assert r.status_code == 200
    assert r.json()["estado"] == "confirmada"
    assert "comercio" not in r.json()
    r = client.post(f"/proveedor/ordenes/{orden['id']}/estado", json={"estado": "enviada"}, headers=h)
    assert r.status_code == 200
    assert r.json()["estado"] == "enviada"
    assert _ordenes(client, h)[0]["estado"] == "enviada"


def test_rechazar_orden_solicitada(client, login):
    h = login(Rol.proveedor, XOCHIMILCO)
    orden = _ordenes(client, h)[0]
    r = client.post(f"/proveedor/ordenes/{orden['id']}/estado", json={"estado": "rechazada"}, headers=h)
    assert r.status_code == 200
    assert r.json()["estado"] == "rechazada"


def test_transicion_invalida_responde_409(client, login):
    h = login(Rol.proveedor, XOCHIMILCO)
    orden = _ordenes(client, h)[0]
    # solicitada -> enviada se salta la confirmación.
    r = client.post(f"/proveedor/ordenes/{orden['id']}/estado", json={"estado": "enviada"}, headers=h)
    assert r.status_code == 409
    # Una rechazada ya no avanza.
    h2 = login(Rol.proveedor, SAN_JUAN)
    rechazada = _ordenes(client, h2, "rechazada")[0]
    assert client.post(f"/proveedor/ordenes/{rechazada['id']}/estado", json={"estado": "confirmada"}, headers=h2).status_code == 409


def test_el_proveedor_no_marca_recibida(client, login, session):
    h = login(Rol.proveedor, URUAPAN)
    enviada = _ordenes(client, h, "enviada")[0]
    r = client.post(f"/proveedor/ordenes/{enviada['id']}/estado", json={"estado": "recibida"}, headers=h)
    assert r.status_code == 403
    assert session.get(OrdenAbasto, enviada["id"]).estado == EstadoOrden.enviada


def test_orden_ajena_responde_404(client, login, session):
    ajena = session.exec(select(OrdenAbasto).where(OrdenAbasto.estado == EstadoOrden.solicitada)).first()
    h = login(Rol.proveedor, VALLE)
    assert ajena.id not in [o["id"] for o in _ordenes(client, h)]
    r = client.post(f"/proveedor/ordenes/{ajena.id}/estado", json={"estado": "confirmada"}, headers=h)
    assert r.status_code == 404
    assert client.post("/proveedor/ordenes/99999/estado", json={"estado": "confirmada"}, headers=h).status_code == 404
    assert session.get(OrdenAbasto, ajena.id).estado == EstadoOrden.solicitada


# --- Compradores ---------------------------------------------------------------------


def test_compradores_son_comercios_con_ordenes_no_rechazadas(client, login):
    r = client.get("/proveedor/compradores", headers=login(Rol.proveedor, SAN_JUAN))
    assert r.status_code == 200
    # San Juan tiene una orden confirmada (La Ceiba) y una rechazada (Rosita): solo cuenta la primera.
    compradores = r.json()
    assert len(compradores) == 1
    assert compradores[0]["ordenes"] == 1
    assert compradores[0]["comercio"]["telefono"]
    assert compradores[0]["ultima_orden"]


def test_compradores_ignora_ordenes_de_hace_mas_de_30_dias(client, login, session):
    h = login(Rol.proveedor, VALLE)
    assert len(client.get("/proveedor/compradores", headers=h).json()) == 1
    orden = session.exec(select(OrdenAbasto).where(OrdenAbasto.proveedor_id == _id_proveedor(client, h))).one()
    orden.creado_en = orden.creado_en.replace(year=orden.creado_en.year - 1)
    session.add(orden)
    session.commit()
    assert client.get("/proveedor/compradores", headers=h).json() == []


def test_compradores_agrupa_por_comercio(client, login, session):
    h = login(Rol.proveedor, VALLE)
    proveedor_id = _id_proveedor(client, h)
    base = session.exec(select(OrdenAbasto).where(OrdenAbasto.proveedor_id == proveedor_id)).one()
    session.add(OrdenAbasto(comercio_id=base.comercio_id, proveedor_id=proveedor_id, estado=EstadoOrden.solicitada))
    session.commit()
    compradores = client.get("/proveedor/compradores", headers=h).json()
    assert len(compradores) == 1
    assert compradores[0]["ordenes"] == 2


def _id_proveedor(client, h) -> int:
    return client.get("/proveedor/mi-perfil", headers=h).json()["id"]
