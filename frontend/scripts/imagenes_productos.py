#!/usr/bin/env python3
"""Descarga las imágenes ilustrativas de productos desde Wikimedia Commons y genera
`src/lib/imagenes-productos.ts` (con autor, licencia y fuente de cada foto).

Uso (desde frontend/):  python3 scripts/imagenes_productos.py

- Solo se aceptan licencias abiertas: CC0, dominio público, CC BY y CC BY-SA.
- Las fotos se guardan en public/productos/<slug>.jpg (480 px de ancho, JPEG ~72, <= 60 KB).
- La app nunca pide imágenes a dominios externos: todo sale de /productos/.
- Para cambiar una foto, edita su "archivo" abajo y vuelve a correr el script.
- Requiere macOS (`sips`) o Pillow.
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA_IMG = RAIZ / "public" / "productos"
SALIDA_TS = RAIZ / "src" / "lib" / "imagenes-productos.ts"

UA = "TlalamatlHackathon/0.1 (prototipo educativo; villalbagonzalezdiegoantonio@gmail.com)"
API = "https://commons.wikimedia.org/w/api.php"
ANCHO = 480
MAX_BYTES = 60 * 1024
PAUSA = 2.0  # segundos entre peticiones, para respetar los límites de Wikimedia

# (slug, etiqueta, frases clave para emparejar por nombre, archivo en Commons)
# Una frase clave exige TODAS sus palabras en el nombre del producto (sin acentos, plural tolerado).
PRODUCTOS: list[tuple[str, str, list[str], str]] = [
    ("jitomate", "Jitomate", ["jitomate", "tomate rojo"], "Tomatoes (Plum Roma) - Arlingtin, MA.jpg"),
    ("cebolla", "Cebolla", ["cebolla"], "White onions.jpg"),
    ("chile-serrano", "Chile serrano", ["chile serrano"], "Serrano peppers.jpg"),
    ("papa", "Papa", ["papa"], "Kartoffeln (25783817312).jpg"),
    ("zanahoria", "Zanahoria", ["zanahoria"], "Carrot Picture.jpg"),
    ("calabacita", "Calabacita", ["calabacita", "calabacin"], "Cucurbita pepo zucchini group 'Green Tiger'.jpg"),
    ("lechuga", "Lechuga", ["lechuga"], "Romaine lettuce.jpg"),
    ("cilantro", "Cilantro", ["cilantro"], "Cilantro bunches in a stack.jpg"),
    ("nopal", "Nopal", ["nopal"], "Nopalito.jpg"),
    ("brocoli", "Brócoli", ["brocoli"], "Broccoli 3.jpg"),
    ("chayote", "Chayote", ["chayote"], "Chayote 1.jpg"),
    ("jicama", "Jícama", ["jicama"], "Jicama-Jakarta.JPG"),
    ("limon", "Limón", ["limon"], "Two limes.jpg"),
    ("platano", "Plátano", ["platano"], "Bunch of bananas on sale.jpg"),
    ("aguacate", "Aguacate", ["aguacate"], "Avocado Hass - single and halved.jpg"),
    ("papaya", "Papaya", ["papaya"], "Papaya - longitudinal section.jpg"),
    ("manzana", "Manzana", ["manzana"], "Red Apple.jpg"),
    ("naranja", "Naranja", ["naranja"], "Oranges - whole-halved-segment.jpg"),
    ("mandarina", "Mandarina", ["mandarina"], "Mandarins - whole and halved.jpg"),
    ("guayaba", "Guayaba", ["guayaba"], "Goiaba vermelha.jpg"),
    ("granada", "Granada", ["granada"], "Pomegranate fruit - whole and piece with arils.jpg"),
    ("mango", "Mango", ["mango"], "Mangos - single and halved.jpg"),
    ("fresa", "Fresa", ["fresa"], "Garden strawberry (Fragaria × ananassa) single2.jpg"),
    ("pina", "Piña", ["pina"], "Pineapple fruit 2.jpg"),
    ("frijol", "Frijol", ["frijol"], "BLACK TURTLE BEANS.jpg"),
    ("arroz", "Arroz", ["arroz"], "White rice on a brown table.jpg"),
    ("azucar", "Azúcar", ["azucar"], "Sugar on a blue plate (close up).jpg"),
    ("chile-guajillo", "Chile guajillo", ["chile guajillo", "guajillo"], "Capsicum annuum (Guajillo) - dried.jpg"),
    ("chile-ancho", "Chile ancho", ["chile ancho"], "Capsicum annuum ancho dried.jpg"),
    ("chile-de-arbol", "Chile de árbol", ["chile arbol"], "Chile de Árbol seco.JPG"),
    ("pimienta-gorda", "Pimienta gorda", ["pimienta gorda"], "Allspice 1.jpg"),
    ("pechuga-de-pollo", "Pechuga de pollo", ["pechuga"], "Raw chicken slices.jpg"),
    ("pierna-y-muslo", "Pierna y muslo", ["pierna", "muslo"], "Chicken drumsticks and legs.jpg"),
    ("huevo", "Huevo", ["huevo"], "6-Pack-Chicken-Eggs.jpg"),
]

LICENCIAS_OK = re.compile(r"^(CC0|Public domain|PD|CC BY(-SA)? \d\.\d)", re.I)


def pedir(url: str) -> bytes:
    for intento in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            print(f"   reintento {intento + 1}: {e}", file=sys.stderr)
            time.sleep(5 * (intento + 1))
    raise RuntimeError(f"no se pudo descargar {url}")


def limpiar(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def info(archivo: str) -> dict:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "format": "json",
            "titles": f"File:{archivo}",
            "prop": "imageinfo",
            "iiprop": "url|extmetadata",
            "iiurlwidth": ANCHO,
        }
    )
    pag = next(iter(json.loads(pedir(f"{API}?{q}"))["query"]["pages"].values()))
    ii = pag["imageinfo"][0]
    meta = ii["extmetadata"]
    return {
        "miniatura": ii["thumburl"],
        "fuente": ii["descriptionurl"],
        "autor": limpiar(meta.get("Artist", {}).get("value", "")) or "Autor desconocido",
        "licencia": limpiar(meta.get("LicenseShortName", {}).get("value", "")),
    }


def a_jpeg(origen: Path, destino: Path) -> None:
    """Redimensiona a ANCHO px, JPEG calidad 72; si pesa más de MAX_BYTES baja calidad y luego tamaño."""
    intentos = [(ANCHO, q) for q in (72, 66, 60, 54)] + [(w, 60) for w in (440, 400, 360)]
    for lado, calidad in intentos:
        if shutil.which("sips"):
            subprocess.run(
                ["sips", "-Z", str(lado), "-s", "format", "jpeg", "-s", "formatOptions", str(calidad),
                 str(origen), "--out", str(destino)],
                check=True, capture_output=True,
            )
        else:
            from PIL import Image

            im = Image.open(origen).convert("RGB")
            im.thumbnail((lado, lado * 2))
            im.save(destino, "JPEG", quality=calidad, optimize=True)
        if destino.stat().st_size <= MAX_BYTES:
            return
    print(f"   aviso: {destino.name} pesa {destino.stat().st_size // 1024} KB", file=sys.stderr)


def ts_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def main() -> None:
    SALIDA_IMG.mkdir(parents=True, exist_ok=True)
    filas = []
    with tempfile.TemporaryDirectory() as tmp:
        for slug, etiqueta, claves, archivo in PRODUCTOS:
            print(f"{slug}: {archivo}")
            d = info(archivo)
            if not LICENCIAS_OK.match(d["licencia"]):
                raise SystemExit(f"Licencia no permitida para {archivo}: {d['licencia']}")
            time.sleep(PAUSA)
            crudo = Path(tmp) / f"{slug}.src"
            crudo.write_bytes(pedir(d["miniatura"]))
            a_jpeg(crudo, SALIDA_IMG / f"{slug}.jpg")
            filas.append((slug, etiqueta, claves, d))
            time.sleep(PAUSA)

    lineas = [
        "// GENERADO por frontend/scripts/imagenes_productos.py: no se edita a mano.",
        "// Fotos ilustrativas de Wikimedia Commons con licencias abiertas (CC0, dominio público, CC BY, CC BY-SA).",
        "// Para regenerar o cambiar fotos: python3 scripts/imagenes_productos.py (desde frontend/).",
        "// Las imágenes viven en public/productos/ y se sirven desde /productos/ (sin dominios externos).",
        "",
        "export interface ImagenProductoDato {",
        "  slug: string",
        "  etiqueta: string",
        "  /** Frases clave: todas las palabras de una frase deben estar en el nombre del producto. */",
        "  claves: string[]",
        "  src: string",
        "  autor: string",
        "  licencia: string",
        "  fuente: string",
        "}",
        "",
        "export const IMAGENES_PRODUCTOS: ImagenProductoDato[] = [",
    ]
    for slug, etiqueta, claves, d in filas:
        lineas += [
            "  {",
            f"    slug: {ts_str(slug)},",
            f"    etiqueta: {ts_str(etiqueta)},",
            f"    claves: {json.dumps(claves, ensure_ascii=False)},",
            f"    src: {ts_str(f'/productos/{slug}.jpg')},",
            f"    autor: {ts_str(d['autor'])},",
            f"    licencia: {ts_str(d['licencia'])},",
            f"    fuente: {ts_str(d['fuente'])},",
            "  },",
        ]
    lineas += ["]", ""]
    SALIDA_TS.write_text("\n".join(lineas), encoding="utf-8")
    print(f"Listo: {len(filas)} imágenes -> {SALIDA_IMG}")


if __name__ == "__main__":
    main()
