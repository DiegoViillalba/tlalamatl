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
