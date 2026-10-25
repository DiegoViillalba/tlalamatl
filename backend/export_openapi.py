"""Escribe el esquema OpenAPI de la app en el archivo indicado (lo usa `make gen-api`)."""

import json
import sys

from app.main import app

destino = sys.argv[1] if len(sys.argv) > 1 else "openapi.json"
with open(destino, "w", encoding="utf-8") as f:
    json.dump(app.openapi(), f, ensure_ascii=False, indent=2)
print(f"OpenAPI escrito en {destino}")
