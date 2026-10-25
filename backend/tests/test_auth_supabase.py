"""Login por correo con Supabase. Los tokens se firman con una llave local en lugar del JWKS real."""

from datetime import timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app import auth
from app.models import Rol, ahora

EMISOR = "https://prueba.supabase.co/auth/v1"
LLAVE = ec.generate_private_key(ec.SECP256R1())
OTRA_LLAVE = ec.generate_private_key(ec.SECP256R1())


@pytest.fixture(autouse=True)
def supabase_configurado(monkeypatch):
    monkeypatch.setattr(auth, "EMISOR_SUPABASE", EMISOR)
    monkeypatch.setattr(auth, "llave_supabase", lambda token, algoritmo: LLAVE.public_key())


def token_supabase(sub: str, email: str | None, llave=LLAVE, emisor: str = EMISOR) -> dict[str, str]:
    claims = {"sub": sub, "aud": "authenticated", "iss": emisor, "exp": ahora() + timedelta(hours=1)}
    if email:
        claims["email"] = email
    return {"Authorization": f"Bearer {jwt.encode(claims, llave, algorithm='ES256')}"}


def test_primer_ingreso_crea_cliente(client):
    headers = token_supabase("uuid-nuevo", "Vecina@Correo.mx")
    assert client.get("/auth/yo", headers=headers).status_code == 401

    r = client.post("/auth/vincular", headers=headers)
    assert r.status_code == 200
    assert r.json()["rol"] == "cliente"
    assert r.json()["email"] == "vecina@correo.mx"

    assert client.get("/auth/yo", headers=headers).json()["id"] == r.json()["id"]
    assert client.get("/cliente/pedidos", headers=headers).status_code == 200


def test_vincular_es_idempotente(client):
    headers = token_supabase("uuid-repetido", "repite@correo.mx")
    primero = client.post("/auth/vincular", headers=headers).json()
    segundo = client.post("/auth/vincular", headers=headers).json()
    assert primero["id"] == segundo["id"]


def test_correo_existente_conserva_su_rol(client):
    headers = token_supabase("uuid-comerciante", "comerciante1@tlalamatl.demo")
    r = client.post("/auth/vincular", headers=headers)
    assert r.json()["rol"] == "comerciante"
    assert client.get("/comercio/mi-comercio", headers=headers).json()["nombre"] == "Verduras Doña Mary"


def test_correo_ligado_a_otra_cuenta(client):
    client.post("/auth/vincular", headers=token_supabase("uuid-a", "proveedor1@tlalamatl.demo"))
    r = client.post("/auth/vincular", headers=token_supabase("uuid-b", "proveedor1@tlalamatl.demo"))
    assert r.status_code == 409


def test_token_con_firma_ajena(client):
    headers = token_supabase("uuid-falso", "falso@correo.mx", llave=OTRA_LLAVE)
    assert client.post("/auth/vincular", headers=headers).status_code == 401


def test_token_de_otro_proyecto(client):
    headers = token_supabase("uuid-ajeno", "ajeno@correo.mx", emisor="https://otro.supabase.co/auth/v1")
    assert client.post("/auth/vincular", headers=headers).status_code == 401


def test_vincular_rechaza_token_demo(client, login):
    assert client.post("/auth/vincular", headers=login(Rol.cliente)).status_code == 400
