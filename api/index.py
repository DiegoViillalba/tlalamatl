"""Punto de entrada para Vercel: expone la API de FastAPI bajo /api como función serverless.

Con `DATABASE_URL` (Postgres de Supabase) la base es compartida y persistente. Sin ella, el disco de
Vercel es efímero y de solo lectura salvo /tmp, así que se siembra una SQLite demo en /tmp en cada
arranque en frío (favoritos y comentarios se pierden al reciclarse la función).
"""

import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BACKEND = RAIZ / "backend"
sys.path.insert(0, str(BACKEND))

DB_PATH = Path(os.getenv("TLALAMATL_DB_PATH") or "/tmp/tlalamatl.db")
os.environ["TLALAMATL_DB_PATH"] = str(DB_PATH)

from fastapi import FastAPI  # noqa: E402

from app.main import app as api  # noqa: E402


def sembrar_si_hace_falta() -> None:
    if os.getenv("DATABASE_URL") or DB_PATH.exists():
        return
    import seed

    seed.main()


sembrar_si_hace_falta()

# Vercel reescribe /api/* hacia esta función; montar bajo /api quita el prefijo antes de llegar a los routers.
app = FastAPI()
app.mount("/api", api)
