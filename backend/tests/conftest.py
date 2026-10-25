"""Fixtures COMPARTIDAS: DB en memoria sembrada con el seed real, con 'hoy' fijo en miércoles."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.db import get_session
from app.main import app
from app.models import Dia, Rol, Usuario
from seed import sembrar

HOY = Dia.mie


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        sembrar(session, hoy=HOY)
        yield session


@pytest.fixture
def client(session: Session):
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def login(client: TestClient, session: Session):
    """login(Rol.cliente) -> headers con el token del primer usuario sembrado de ese rol."""

    def _login(rol: Rol, n: int = 0) -> dict[str, str]:
        usuario = session.exec(select(Usuario).where(Usuario.rol == rol).order_by(Usuario.id)).all()[n]
        r = client.post("/auth/demo-login", json={"usuario_id": usuario.id})
        assert r.status_code == 200
        return {"Authorization": f"Bearer {r.json()['token']}"}

    return _login
