from sqlmodel import select

from app.models import Producto
from tests.conftest import HOY


def test_filtro_abierto_hoy(client):
    todos = client.get("/publico/comercios", params={"dia": HOY.value}).json()
    abiertos = client.get("/publico/comercios", params={"abierto_hoy": True, "dia": HOY.value}).json()
    assert 0 < len(abiertos) < len(todos)
    assert all(HOY.value in c["dias_operacion"] and c["abierto_hoy"] for c in abiertos)
    cerrados = {c["id"] for c in todos} - {c["id"] for c in abiertos}
    assert all(HOY.value not in c["dias_operacion"] for c in todos if c["id"] in cerrados)


def test_siempre_hay_un_tianguis_abierto_hoy(client):
    r = client.get("/publico/comercios", params={"categoria": "tianguis", "abierto_hoy": True, "dia": HOY.value})
    assert len(r.json()) >= 1


def test_filtros_categoria_y_alcaldia(client):
    r = client.get("/publico/comercios", params={"categoria": "central_abasto", "alcaldia": "Iztapalapa"})
    comercios = r.json()
    assert len(comercios) == 2
    assert all(c["categoria"] == "central_abasto" and c["alcaldia"] == "Iztapalapa" for c in comercios)


def test_productos_de_un_comercio(client):
    comercio = client.get("/publico/comercios").json()[0]
    productos = client.get(f"/publico/comercios/{comercio['id']}/productos").json()
    assert productos and all(p["comercio_id"] == comercio["id"] for p in productos)
    assert client.get("/publico/comercios/9999/productos").status_code == 404


def test_comercios_exponen_contacto(client):
    comercios = client.get("/publico/comercios").json()
    assert all(c["telefono"] for c in comercios)
    assert any(c["whatsapp"] is None for c in comercios)
    unico = client.get(f"/publico/comercios/{comercios[0]['id']}").json()
    assert unico["telefono"] == comercios[0]["telefono"]


# --- Dashboard de precios ---------------------------------------------------------------


def precios(client, **params):
    r = client.get("/publico/precios", params=params)
    assert r.status_code == 200
    return {p["nombre"]: p for p in r.json()}


def test_precios_es_publico_y_agrega_minimo_promedio_maximo(client):
    jitomate = precios(client)["Jitomate"]  # Doña Mary $28 y Hermanos Ramírez $19
    assert jitomate["menudeo"] == {"minimo": 19, "promedio": 23.5, "maximo": 28, "n": 2}
    assert jitomate["mayoreo"] == {"minimo": 16, "promedio": 16, "maximo": 16, "n": 1}
    assert jitomate["unidad"] == "kg" and jitomate["canasta_basica"] is True


def test_mas_barato_en_comercio_y_proveedor_con_contacto(client):
    jitomate = precios(client)["Jitomate"]
    comercio = jitomate["mas_barato_en"]
    assert comercio["nombre"] == "Bodega Hermanos Ramírez" and comercio["precio"] == 19
    assert comercio["telefono"] and comercio["whatsapp"] and comercio["alcaldia"] == "Iztapalapa"
    proveedor = jitomate["proveedor_mas_barato"]
    assert proveedor["nombre"] == "Distribuidora Hortícola del Valle" and proveedor["precio_mayoreo"] == 16
    assert proveedor["telefono"] and proveedor["cantidad_minima"] == 20


def test_mas_barato_sin_whatsapp(client):
    pechuga = precios(client)["Pechuga de pollo"]
    assert pechuga["mas_barato_en"]["nombre"] == "Pollería El Güero"
    assert pechuga["mas_barato_en"]["whatsapp"] is None
    assert pechuga["proveedor_mas_barato"] is None and pechuga["mayoreo"]["n"] == 0


def test_ofertas_no_disponibles_se_excluyen(client):
    fresa = precios(client)["Fresa"]  # solo hay una oferta de mayoreo y está no disponible
    assert fresa["mayoreo"] == {"minimo": None, "promedio": None, "maximo": None, "n": 0}
    assert fresa["proveedor_mas_barato"] is None
    assert fresa["menudeo"]["n"] == 1


def test_filtro_de_temporada_por_mes(client):
    octubre = precios(client, temporada=True, mes=10)
    assert {"Mandarina", "Guayaba", "Manzana"} <= set(octubre)
    assert "Fresa" not in octubre and "Mango" not in octubre
    assert all(p["de_temporada"] and 10 in p["meses_temporada"] for p in octubre.values())
    enero = precios(client, temporada=True, mes=1)
    assert "Fresa" in enero and "Mango" not in enero and "Granada" not in enero


def test_productos_de_todo_el_anio_no_son_de_temporada(client):
    todos = precios(client, mes=10)
    assert todos["Jitomate"]["meses_temporada"] == [] and todos["Jitomate"]["de_temporada"] is False
    assert "Jitomate" not in precios(client, temporada=True, mes=10)


def test_de_temporada_va_primero_y_luego_por_nombre(client):
    lista = client.get("/publico/precios", params={"mes": 10}).json()
    banderas = [p["de_temporada"] for p in lista]
    assert banderas == sorted(banderas, reverse=True) and any(banderas)
    for grupo in (True, False):
        nombres = [p["nombre"] for p in lista if p["de_temporada"] is grupo]
        assert nombres == sorted(nombres)


def test_filtro_canasta_y_categoria(client):
    canasta = precios(client, canasta=True)
    assert canasta and all(p["canasta_basica"] for p in canasta.values())
    assert "Frijol" in canasta and "Mandarina" not in canasta
    frutas = precios(client, categoria="fruta")
    assert frutas and all(p["categoria"] == "fruta" for p in frutas.values())
    assert precios(client, categoria="fruta", canasta=True, temporada=True, mes=10).keys() <= frutas.keys()


def test_mes_invalido_responde_422(client):
    assert client.get("/publico/precios", params={"mes": 13}).status_code == 422


def test_demanda_por_reabasto(client):
    platano = precios(client)["Plátano"]  # 3 comercios; solo Frutería La Güera tiene stock <= mínimo
    assert platano["demanda"] == {"comercios": 3, "con_stock_bajo": 1}
    assert precios(client)["Chayote"]["demanda"]["con_stock_bajo"] == 1


def test_el_cambio_de_precio_se_refleja(client, session):
    producto = session.exec(select(Producto).where(Producto.nombre == "Jitomate saladet")).first()
    producto.precio = 5
    session.add(producto)
    session.commit()
    assert precios(client)["Jitomate"]["menudeo"]["minimo"] == 5


# --- Canasta sugerida e historial -------------------------------------------------------


def canasta(client, **params):
    r = client.get("/publico/canasta", params=params)
    assert r.status_code == 200
    return r.json()


def test_canasta_es_publica_y_se_compone_de_canasta_basica_y_temporada(client):
    c = canasta(client, mes=10)
    nombres = {p["nombre"] for p in c["productos"]}
    assert {"Jitomate", "Frijol", "Mandarina", "Guayaba"} <= nombres  # básica y/o de temporada
    assert "Fresa" not in nombres and "Mango" not in nombres  # ni básica ni de temporada en octubre
    assert all(p["canasta_basica"] or p["de_temporada"] for p in c["productos"])
    elegidos = [p for p in c["productos"] if p["en_canasta"]]
    assert 0 < len(elegidos) <= 8
    # Los que son canasta básica Y de temporada van primero.
    ambos = [p["canasta_basica"] and p["de_temporada"] for p in c["productos"]]
    assert ambos == sorted(ambos, reverse=True)
    manzana = next(p for p in c["productos"] if p["nombre"] == "Manzana")
    assert manzana["motivos"][:2] == ["De temporada", "Canasta básica"]


def test_canasta_cambia_con_el_mes(client):
    octubre = {p["nombre"] for p in canasta(client, mes=10)["productos"] if p["de_temporada"]}
    mayo = {p["nombre"] for p in canasta(client, mes=5)["productos"] if p["de_temporada"]}
    assert "Mandarina" in octubre and "Mandarina" not in mayo
    assert "Mango" in mayo and "Mango" not in octubre
    assert client.get("/publico/canasta", params={"mes": 0}).status_code == 422


def test_canasta_ahorro_y_totales(client):
    c = canasta(client, mes=10)
    elegidos = [p for p in c["productos"] if p["en_canasta"]]
    for p in c["productos"]:
        assert p["precio_referencia"] <= p["precio_promedio"]
        esperado = round((p["precio_promedio"] - p["precio_referencia"]) / p["precio_promedio"] * 100, 1)
        assert p["ahorro_pct"] == esperado
        assert p["comercio"]["precio"] == p["precio_referencia"] and p["cantidad_sugerida"] == 1
    assert c["total_mas_barato"] == round(sum(p["precio_referencia"] for p in elegidos), 2)
    assert c["total_promedio"] == round(sum(p["precio_promedio"] for p in elegidos), 2)
    assert c["ahorro_total"] == round(c["total_promedio"] - c["total_mas_barato"], 2) > 0
    assert c["lugares_a_visitar"] == len({p["comercio"]["id"] for p in elegidos})
    jitomate = next(p for p in c["productos"] if p["nombre"] == "Jitomate")  # $19 vs promedio $23.50
    assert jitomate["precio_referencia"] == 19 and jitomate["ahorro_pct"] == 19.1
    assert jitomate["comercio"]["nombre"] == "Bodega Hermanos Ramírez"


def test_canasta_trae_contacto_y_no_usa_mayoreo(client):
    c = canasta(client, mes=10)
    pechuga = next(p for p in c["productos"] if p["nombre"] == "Pechuga de pollo")
    assert pechuga["comercio"]["whatsapp"] is None and pechuga["comercio"]["telefono"]
    # El precio de referencia es de menudeo: nunca baja al mayoreo (Jitomate mayoreo = 16).
    assert next(p for p in c["productos"] if p["nombre"] == "Jitomate")["precio_referencia"] == 19


def test_historial_ordenado_con_doce_semanas(client):
    base = precios(client)["Jitomate"]
    h = client.get(f"/publico/precios/{base['id']}/historial").json()
    fechas = [p["fecha"] for p in h["puntos"]]
    assert len(fechas) == 12 and fechas == sorted(fechas) and len(set(fechas)) == 12
    assert h["nombre"] == "Jitomate" and h["unidad"] == "kg"
    assert all(p["menudeo_minimo"] <= p["menudeo_promedio"] for p in h["puntos"])
    cinco = client.get(f"/publico/precios/{base['id']}/historial", params={"semanas": 5}).json()["puntos"]
    assert cinco == h["puntos"][-5:]


def test_historial_termina_en_el_precio_actual(client):
    for nombre, p in precios(client).items():
        h = client.get(f"/publico/precios/{p['id']}/historial").json()["puntos"][-1]
        assert h["menudeo_promedio"] == p["menudeo"]["promedio"], nombre
        assert h["menudeo_minimo"] == p["menudeo"]["minimo"], nombre
        assert h["mayoreo_promedio"] == p["mayoreo"]["promedio"], nombre  # None si no hay ofertas disponibles
        assert h["mayoreo_minimo"] == p["mayoreo"]["minimo"], nombre


def test_historial_excluye_ofertas_no_disponibles(client):
    fresa = precios(client)["Fresa"]  # su única oferta de mayoreo no está disponible
    puntos = client.get(f"/publico/precios/{fresa['id']}/historial").json()["puntos"]
    assert all(p["mayoreo_promedio"] is None and p["mayoreo_minimo"] is None for p in puntos)


def test_historial_producto_inexistente(client):
    assert client.get("/publico/precios/9999/historial").status_code == 404
    assert client.get("/publico/precios/1/historial", params={"semanas": 0}).status_code == 422
