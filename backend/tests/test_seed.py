"""Tests COMPARTIDOS del seed y de los datos de contacto."""

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import select

from app.models import Comentario, Comercio, Favorito, Proveedor


def test_comercios_y_proveedores_tienen_contacto_ficticio(session):
    for lugar in [*session.exec(select(Comercio)), *session.exec(select(Proveedor))]:
        assert lugar.telefono and lugar.telefono.startswith("5500") and len(lugar.telefono) == 10
    assert any(c.whatsapp is None for c in session.exec(select(Comercio)))


def test_proveedores_tienen_coordenadas(session):
    assert all(p.lat and p.lng for p in session.exec(select(Proveedor)))


def test_favoritos_y_comentarios_sembrados(session):
    assert session.exec(select(Favorito)).all()
    assert session.exec(select(Comentario)).all()


def test_favorito_no_se_repite(session):
    favorito = session.exec(select(Favorito)).first()
    session.add(Favorito(usuario_id=favorito.usuario_id, comercio_id=favorito.comercio_id))
    with pytest.raises(IntegrityError):
        session.commit()
