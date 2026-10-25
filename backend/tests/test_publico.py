from tests.conftest import HOY
from app.models import Rol


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


def test_comentarios_publicos_sin_login(client, login):
    comercio = client.get("/publico/comercios").json()[0]
    creado = client.post(
        f"/cliente/comercios/{comercio['id']}/comentarios",
        headers=login(Rol.cliente),
        json={"texto": "Buen lugar"},
    ).json()

    respuesta = client.get(f"/publico/comercios/{comercio['id']}/comentarios")
    assert respuesta.status_code == 200
    comentario = next(item for item in respuesta.json() if item["id"] == creado["id"])
    assert comentario["texto"] == "Buen lugar"
    assert comentario["nombre_usuario"]
    assert client.get("/publico/comercios/9999/comentarios").status_code == 404
