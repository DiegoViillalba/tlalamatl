import os
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, SQLModel, create_engine

# TLALAMATL_DB_PATH permite mover la base (p. ej. a /tmp en Vercel, cuyo disco es efímero).
DB_PATH = Path(os.getenv("TLALAMATL_DB_PATH") or Path(__file__).resolve().parent.parent / "tlalamatl.db")

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})


def crear_tablas() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
