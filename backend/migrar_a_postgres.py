"""Copia la base SQLite local a la Postgres de `DATABASE_URL` (Supabase), tabla por tabla y conservando ids.

Uso (dentro de backend/, con DATABASE_URL en backend/.env):
    uv run python migrar_a_postgres.py            # copia backend/tlalamatl.db
    uv run python migrar_a_postgres.py otra.db    # copia otra SQLite

⚠️ Borra y recrea las tablas de la app en la Postgres destino antes de copiar.
"""

import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import DateTime, select, text
from sqlmodel import SQLModel, create_engine

from app.db import DATABASE_URL, DB_PATH, crear_engine
from app.models import ZONA_CDMX  # importar models registra las tablas en SQLModel.metadata


def con_zona(valor: object) -> object:
    """SQLite guarda las fechas sin zona (hora de la CDMX); Postgres la necesita para timestamptz."""
    if isinstance(valor, datetime) and valor.tzinfo is None:
        return valor.replace(tzinfo=ZONA_CDMX)
    return valor


def main() -> None:
    if not DATABASE_URL:
        sys.exit("Falta DATABASE_URL en backend/.env (cadena de conexión de Supabase).")
    origen_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DB_PATH
    if not origen_path.exists():
        sys.exit(f"No existe la SQLite de origen: {origen_path}")

    origen = create_engine(f"sqlite:///{origen_path}")
    destino = crear_engine(DATABASE_URL)
    print(f"Origen:  {origen_path}")
    print(f"Destino: {destino.url.render_as_string(hide_password=True)}")

    SQLModel.metadata.drop_all(destino)
    SQLModel.metadata.create_all(destino)

    with origen.connect() as lectura, destino.begin() as escritura:
        for tabla in SQLModel.metadata.sorted_tables:
            columnas_fecha = {c.name for c in tabla.columns if isinstance(c.type, DateTime)}
            filas = [dict(f._mapping) for f in lectura.execute(select(tabla))]
            for fila in filas:
                for nombre in columnas_fecha:
                    fila[nombre] = con_zona(fila[nombre])
            if filas:
                escritura.execute(tabla.insert(), filas)
                # Las secuencias de los ids deben continuar después del mayor id copiado.
                if "id" in tabla.columns:
                    escritura.execute(
                        text(
                            f"SELECT setval(pg_get_serial_sequence('{tabla.name}', 'id'), "
                            f"(SELECT MAX(id) FROM {tabla.name}))"
                        )
                    )
            print(f"  {tabla.name:<18} {len(filas):>4} filas")

    print("Listo: la base quedó copiada en Postgres.")


if __name__ == "__main__":
    main()
