"""Conexión a la base de datos. Archivo COMPARTIDO.

Sin `DATABASE_URL` se usa la SQLite local (`backend/tlalamatl.db`, o la ruta de `TLALAMATL_DB_PATH`).
Con `DATABASE_URL` (Postgres de Supabase) todos los entornos comparten la misma base.
Configuración en backend/.env (ver backend/.env.example).
"""

import os
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()

DB_PATH = Path(os.getenv("TLALAMATL_DB_PATH") or Path(__file__).resolve().parent.parent / "tlalamatl.db")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def crear_engine(url: str = "") -> Engine:
    """Engine para la Postgres de `url` o, si viene vacía, para la SQLite local."""
    if not url:
        return create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    # Supabase entrega "postgresql://"; SQLAlchemy necesita el driver explícito (psycopg 3).
    url = url.replace("postgres://", "postgresql://", 1).replace("postgresql://", "postgresql+psycopg://", 1)
    connect_args: dict[str, object] = {}
    # El pooler de Supabase en modo transacción (puerto 6543) no soporta prepared statements.
    if ":6543/" in url:
        connect_args["prepare_threshold"] = None
    return create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=3, connect_args=connect_args)


engine = crear_engine(DATABASE_URL)


def crear_tablas() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
