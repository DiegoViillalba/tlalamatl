"""Tests del rol proveedor. Dueña: rama rol/proveedor."""

from datetime import timedelta

from sqlmodel import select

from app.models import Comercio, EstadoOrden, EstadoSolicitudFlete, OrdenAbasto, Rol, SolicitudFlete, ahora

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


def _crear(client, h, **datos):
    base = {"producto": "Calabacita", "unidad": "kg", "precio_mayoreo": 18, "cantidad_minima": 25}
    return client.post("/proveedor/ofertas", json={**base, **datos}, headers=h)


def test_oferta_se_enlaza_al_catalogo_por_el_nombre(client, login):
    h = login(Rol.proveedor)
    assert _crear(client, h, producto="Calabacitas tiernas").json()["producto_base_id"] is not None
    assert _crear(client, h, producto="Sandía").json()["producto_base_id"] is None


def test_oferta_enlazada_aparece_en_el_dashboard_de_precios(client, login):
    h = login(Rol.proveedor, XOCHIMILCO)
    calabacita = next(b for b in client.get("/publico/productos-base").json() if b["nombre"] == "Calabacita")
    antes = next((p for p in client.get("/publico/precios", params={"mes": 6}).json() if p["nombre"] == "Calabacita"), None)
    assert antes is None or antes["mayoreo"]["n"] == 0 or antes["mayoreo"]["n"] >= 0
    oferta = _crear(client, h, producto="Calabacita italiana", precio_mayoreo=11).json()
    assert oferta["producto_base_id"] == calabacita["id"]
    despues = next(p for p in client.get("/publico/precios", params={"mes": 6}).json() if p["nombre"] == "Calabacita")
    assert despues["mayoreo"]["minimo"] <= 11
    # Cambiar el precio de mayoreo se refleja.
    client.patch(f"/proveedor/ofertas/{oferta['id']}", json={"precio_mayoreo": 7}, headers=h)
    nuevo = next(p for p in client.get("/publico/precios", params={"mes": 6}).json() if p["nombre"] == "Calabacita")
    assert nuevo["mayoreo"]["minimo"] == 7
    # Y si se marca no disponible deja de contar.
    client.patch(f"/proveedor/ofertas/{oferta['id']}", json={"disponible": False}, headers=h)
    final = next((p for p in client.get("/publico/precios", params={"mes": 6}).json() if p["nombre"] == "Calabacita"), None)
    assert final is None or final["mayoreo"] is None or final["mayoreo"]["minimo"] != 7


def test_oferta_con_producto_base_explicito(client, login):
    h = login(Rol.proveedor)
    sandia_no_existe = _crear(client, h, producto="Sandía", producto_base_id=99999)
    assert sandia_no_existe.status_code == 422
    mango = next(b for b in client.get("/publico/productos-base").json() if b["nombre"] == "Mango")
    r = _crear(client, h, producto="Sandía", producto_base_id=mango["id"])
    assert r.status_code == 201 and r.json()["producto_base_id"] == mango["id"]


def test_actualizar_enlace_al_catalogo(client, login):
    h = login(Rol.proveedor)
    oferta = _crear(client, h, producto="Sandía").json()
    assert oferta["producto_base_id"] is None
    url = f"/proveedor/ofertas/{oferta['id']}"
    # Al renombrarla a algo del catálogo se enlaza sola.
    assert client.patch(url, json={"producto": "Papaya maradol"}, headers=h).json()["producto_base_id"] is not None
    # Se puede quitar el enlace a propósito.
    assert client.patch(url, json={"sin_catalogo": True}, headers=h).json()["producto_base_id"] is None
    assert client.patch(url, json={"producto_base_id": 99999}, headers=h).status_code == 422


# --- Órdenes -------------------------------------------------------------------------


def _ordenes(client, h, estado=None):
    r = client.get("/proveedor/ordenes", params={"estado": estado} if estado else None, headers=h)
    assert r.status_code == 200
    return r.json()


def test_listar_ordenes_con_contacto_del_comercio(client, login):
    ordenes = _ordenes(client, login(Rol.proveedor, SAN_JUAN))
    assert {o["estado"] for o in ordenes} == {"confirmada", "rechazada"}
    orden = next(o for o in ordenes if o["comercio"]["nombre"] == "Abarrotes y Semillas La Ceiba")
    assert orden["estado"] == "confirmada"
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
    # San Juan tiene dos órdenes confirmadas (Mary y La Ceiba) y una rechazada (Rosita): esta no cuenta.
    compradores = r.json()
    assert len(compradores) == 2
    assert {c["comercio"]["nombre"] for c in compradores} == {"Verduras Doña Mary", "Abarrotes y Semillas La Ceiba"}
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


# --- Rutas compartidas de entrega ----------------------------------------------------

MAÑANA = lambda: (ahora().date() + timedelta(days=1)).isoformat()  # noqa: E731


def _orden_de(client, h, comercio: str) -> dict:
    return next(o for o in _ordenes(client, h) if o["comercio"]["nombre"] == comercio)


def _ordenes_iztapalapa(client, h) -> list[int]:
    """Ids de las órdenes confirmadas de La Ceiba y Mary (ambas en Iztapalapa)."""
    return [_orden_de(client, h, n)["id"] for n in ("Abarrotes y Semillas La Ceiba", "Verduras Doña Mary")]


def _crear_ruta(client, h, ids, costo=300, **extra):
    return client.post(
        "/proveedor/rutas", json={"orden_ids": ids, "fecha": MAÑANA(), "costo_flete": costo, **extra}, headers=h
    )


def test_rutas_exigen_rol_proveedor(client, login):
    for rol in (Rol.cliente, Rol.comerciante):
        h = login(rol)
        assert client.get("/proveedor/rutas", headers=h).status_code == 403
        assert client.get("/proveedor/rutas/sugeridas", headers=h).status_code == 403
        assert client.post("/proveedor/rutas", json={}, headers=h).status_code == 403


def test_rutas_sugeridas_agrupa_por_alcaldia(client, login):
    sugeridas = client.get("/proveedor/rutas/sugeridas", headers=login(Rol.proveedor, SAN_JUAN)).json()
    assert len(sugeridas) == 1
    assert sugeridas[0]["zona"] == "Iztapalapa"
    assert sugeridas[0]["comercios"] == 2
    assert {o["estado"] for o in sugeridas[0]["ordenes"]} == {"confirmada"}
    # Un proveedor sin órdenes confirmadas no tiene sugerencias.
    assert client.get("/proveedor/rutas/sugeridas", headers=login(Rol.proveedor, XOCHIMILCO)).json() == []


def test_crear_ruta_reparte_el_flete_por_comercio(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    ids = _ordenes_iztapalapa(client, h)
    r = _crear_ruta(client, h, ids, costo=300, nota="Salgo a las 7")
    assert r.status_code == 201
    ruta = r.json()
    assert ruta["estado"] == "abierta"
    assert ruta["zona"] == "Iztapalapa"
    assert ruta["comercios"] == 2
    assert ruta["cuota_flete"] == 150
    assert [p["cuota_flete"] for p in ruta["paradas"]] == [150, 150]
    assert all(p["comercio"]["telefono"] for p in ruta["paradas"])
    assert ruta["total_mercancia"] == sum(p["subtotal"] for p in ruta["paradas"]) > 0
    # Las órdenes ya no se sugieren y quedan ligadas a la ruta.
    assert client.get("/proveedor/rutas/sugeridas", headers=h).json() == []
    assert {o["ruta_id"] for o in _ordenes(client, h, "confirmada")} == {ruta["id"]}
    assert [x["id"] for x in client.get("/proveedor/rutas", headers=h).json()] == [ruta["id"]]


def test_cuota_redondea_a_centavos(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta = _crear_ruta(client, h, _ordenes_iztapalapa(client, h), costo=100.01).json()
    assert ruta["cuota_flete"] == 50.01  # 100.01 / 2 = 50.005


def test_crear_ruta_con_una_orden_queda_abierta(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta = _crear_ruta(client, h, [_ordenes_iztapalapa(client, h)[0]], costo=200).json()
    assert ruta["comercios"] == 1
    assert ruta["cuota_flete"] == 200


def test_crear_ruta_valida(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    ceiba, mary = _ordenes_iztapalapa(client, h)
    # Orden rechazada: no se puede enviar.
    rechazada = _ordenes(client, h, "rechazada")[0]["id"]
    assert _crear_ruta(client, h, [ceiba, rechazada]).status_code == 409
    # Orden de otro proveedor.
    ajena = _ordenes(client, login(Rol.proveedor, XOCHIMILCO))[0]["id"]
    assert _crear_ruta(client, h, [ceiba, ajena]).status_code == 404
    # Fecha pasada y lista vacía.
    ayer = (ahora().date() - timedelta(days=1)).isoformat()
    assert client.post("/proveedor/rutas", json={"orden_ids": [ceiba], "fecha": ayer}, headers=h).status_code == 422
    assert client.post("/proveedor/rutas", json={"orden_ids": [], "fecha": MAÑANA()}, headers=h).status_code == 422
    assert _crear_ruta(client, h, [ceiba], costo=-1).status_code == 422
    # Nada de lo anterior dejó órdenes ligadas.
    assert client.get("/proveedor/rutas", headers=h).json() == []
    # Una orden que ya está en una ruta no entra a otra.
    assert _crear_ruta(client, h, [ceiba, mary]).status_code == 201
    assert _crear_ruta(client, h, [ceiba]).status_code == 409


def test_despachar_y_completar_ruta(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta = _crear_ruta(client, h, _ordenes_iztapalapa(client, h)).json()
    r = client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "en_camino"}, headers=h)
    assert r.status_code == 200
    assert r.json()["estado"] == "en_camino"
    assert {o["estado"] for o in _ordenes(client, h) if o["ruta_id"] == ruta["id"]} == {"enviada"}
    r = client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "completada"}, headers=h)
    assert r.json()["estado"] == "completada"
    # Ya no hay a dónde avanzar.
    assert client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "en_camino"}, headers=h).status_code == 409


def test_estado_de_ruta_invalido_responde_409(client, login):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta = _crear_ruta(client, h, _ordenes_iztapalapa(client, h)).json()
    assert client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "completada"}, headers=h).status_code == 409


def test_cancelar_ruta_libera_las_ordenes(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    ceiba, mary = _ordenes_iztapalapa(client, h)
    ruta = _crear_ruta(client, h, [ceiba]).json()
    sol = SolicitudFlete(ruta_id=ruta["id"], comercio_id=_orden_de(client, h, "Verduras Doña Mary")["comercio_id"], orden_id=mary)
    session.add(sol)
    session.commit()
    r = client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "cancelada"}, headers=h)
    assert r.status_code == 200
    assert r.json()["estado"] == "cancelada"
    assert r.json()["paradas"] == []
    assert {o["ruta_id"] for o in _ordenes(client, h, "confirmada")} == {None}
    session.refresh(sol)
    assert sol.estado == EstadoSolicitudFlete.rechazada
    assert len(client.get("/proveedor/rutas/sugeridas", headers=h).json()) == 1


def _ruta_con_solicitud(client, h, session, costo=300):
    """Ruta con La Ceiba y una solicitud pendiente de Mary para sumarse."""
    ceiba, mary = _ordenes_iztapalapa(client, h)
    ruta = _crear_ruta(client, h, [ceiba], costo=costo).json()
    comercio_mary = _orden_de(client, h, "Verduras Doña Mary")["comercio_id"]
    sol = SolicitudFlete(ruta_id=ruta["id"], comercio_id=comercio_mary, orden_id=mary)
    session.add(sol)
    session.commit()
    session.refresh(sol)
    return ruta, sol, mary


def test_ruta_muestra_solicitudes_pendientes_con_la_cuota_que_les_tocaria(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta, sol, mary = _ruta_con_solicitud(client, h, session, costo=300)
    leida = client.get("/proveedor/rutas", headers=h).json()[0]
    assert leida["cuota_flete"] == 300
    [pedida] = leida["solicitudes"]
    assert pedida["id"] == sol.id
    assert pedida["orden_id"] == mary
    assert pedida["comercio"]["nombre"] == "Verduras Doña Mary"
    assert pedida["cuota_si_se_suma"] == 150


def test_aceptar_solicitud_suma_la_orden_y_reparte_el_flete(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta, sol, mary = _ruta_con_solicitud(client, h, session, costo=300)
    r = client.post(f"/proveedor/rutas/solicitudes/{sol.id}/estado", json={"estado": "aceptada"}, headers=h)
    assert r.status_code == 200
    asignada = r.json()
    assert asignada["comercios"] == 2
    assert [p["cuota_flete"] for p in asignada["paradas"]] == [150, 150]
    assert asignada["solicitudes"] == []
    assert session.get(OrdenAbasto, mary).ruta_id == ruta["id"]
    # Ya fue atendida.
    assert client.post(f"/proveedor/rutas/solicitudes/{sol.id}/estado", json={"estado": "rechazada"}, headers=h).status_code == 409


def test_rechazar_solicitud_deja_la_orden_libre(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta, sol, mary = _ruta_con_solicitud(client, h, session)
    r = client.post(f"/proveedor/rutas/solicitudes/{sol.id}/estado", json={"estado": "rechazada"}, headers=h)
    assert r.status_code == 200
    assert r.json()["comercios"] == 1
    assert session.get(OrdenAbasto, mary).ruta_id is None
    session.refresh(sol)
    assert sol.estado == EstadoSolicitudFlete.rechazada


def test_solicitud_no_puede_volver_a_pendiente(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    _, sol, _ = _ruta_con_solicitud(client, h, session)
    r = client.post(f"/proveedor/rutas/solicitudes/{sol.id}/estado", json={"estado": "pendiente"}, headers=h)
    assert r.status_code == 409


def test_no_se_acepta_en_una_ruta_que_ya_salio(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta, _, mary = _ruta_con_solicitud(client, h, session)
    client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "en_camino"}, headers=h)
    # Despachar rechaza lo pendiente; una solicitud tardía que se cuele tampoco se puede aceptar.
    tardia = SolicitudFlete(ruta_id=ruta["id"], comercio_id=1, orden_id=mary)
    session.add(tardia)
    session.commit()
    r = client.post(f"/proveedor/rutas/solicitudes/{tardia.id}/estado", json={"estado": "aceptada"}, headers=h)
    assert r.status_code == 409
    assert session.get(OrdenAbasto, mary).ruta_id is None


def test_rutas_ajenas_responden_404(client, login, session):
    h = login(Rol.proveedor, SAN_JUAN)
    ruta, sol, _ = _ruta_con_solicitud(client, h, session)
    otro = login(Rol.proveedor, VALLE)
    assert client.get("/proveedor/rutas", headers=otro).json() == []
    assert client.post(f"/proveedor/rutas/{ruta['id']}/estado", json={"estado": "cancelada"}, headers=otro).status_code == 404
    assert client.post(f"/proveedor/rutas/solicitudes/{sol.id}/estado", json={"estado": "aceptada"}, headers=otro).status_code == 404
    assert client.post("/proveedor/rutas/99999/estado", json={"estado": "cancelada"}, headers=otro).status_code == 404
    assert client.post("/proveedor/rutas/solicitudes/99999/estado", json={"estado": "aceptada"}, headers=otro).status_code == 404
    # Y no puede meter en su ruta las órdenes de otro proveedor.
    assert _crear_ruta(client, otro, [_orden_de(client, h, "Abarrotes y Semillas La Ceiba")["id"]]).status_code == 404
