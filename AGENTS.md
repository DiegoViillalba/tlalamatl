# AGENTS.md — Tlalamatl

> ⚠️ **Este archivo debe ser IDÉNTICO en todas las ramas.** Igual que todo lo marcado como
> "zona compartida" más abajo, solo se cambia en `main`, y después cada rama hace `git merge main`.
> Si las ramas tienen versiones distintas de los archivos compartidos, el merge final se rompe.

## Qué es

**Tlalamatl** ("mapa de tierra" en náhuatl) es un prototipo (PoC de hackathon) de marketplace de dos niveles pensado para vivir dentro de la App CDMX (mobile-first, cargable como webview):

- **B2C:** clientes → comerciantes (Central de Abasto, mercados fijos, mercados sobre ruedas y tianguis).
- **B2B:** comerciantes → proveedores (productores, mayoristas, almacenes).

Es una sola app con login demo diferenciado por rol. Es un mock: importan más la velocidad, la claridad y un flujo demo convincente que la robustez de producción. Usa identidad propia de Tlalamatl, nunca logos ni identidad gráfica oficial del Gobierno de la CDMX.

## Dominio

**Roles:**
- `cliente`: compra.
- `comerciante`: vende a clientes y compra a proveedores.
- `proveedor`: vende al mayoreo a comerciantes.

**Categorías de comercio:**

| Categoría | Días de operación típicos |
|---|---|
| `central_abasto` | Diario |
| `mercado_fijo` | Casi diario |
| `mercado_sobre_ruedas` | Rota; 1 días fijos por ubicación |
| `tianguis` | Rota; 1–2 días fijos por ubicación |

**Entidades** (`backend/app/models.py` es la fuente única de verdad):

| Entidad | Campos clave |
|---|---|
| `Usuario` | nombre, email, rol, alcaldía |
| `Comercio` | dueño, nombre, categoría, alcaldía, ubicación, lat/lng, `dias_operacion: list[Dia]` |
| `Proveedor` | usuario, nombre, tipo (`productor`/`mayorista`/`almacen`), zona |
| `Producto` | comercio, nombre, precio, stock, unidad, `stock_minimo` |
| `OfertaProveedor` | proveedor, producto genérico, unidad, precio de mayoreo, cantidad mínima, disponible |
| `Pedido` + `PedidoItem` | cliente → comercio |
| `OrdenAbasto` + `OrdenAbastoItem` | comercio → proveedor; el item puede apuntar al `producto_id` del comercio que reabastece |

**Máquinas de estado** (`backend/app/estados.py`; una transición inválida responde **409**):

```
Pedido:      creado → aceptado → listo → entregado     (+ cancelado desde creado/aceptado)
OrdenAbasto: solicitada → confirmada → enviada → recibida   (+ rechazada desde solicitada)
```

**Efectos en stock:**
- Herramienta a futuro

Quién hace cada transición está en `docs/alcance/compartido.md`.

## Estructura del repo

```
tlalamatl/
├── AGENTS.md / CLAUDE.md        # este archivo (CLAUDE.md solo hace @AGENTS.md)
├── Makefile                     # install, seed, dev, gen-api, test, check
├── docs/alcance/                # alcance por interfaz: cliente, comercio, proveedor, compartido
├── backend/                     # Python 3.12 · uv · FastAPI · SQLModel · SQLite · pytest
│   ├── app/
│   │   ├── main.py              # app + registro de routers (ya están los 5)
│   │   ├── models.py            # modelo de datos (fuente única de verdad)
│   │   ├── db.py · auth.py      # sesión SQLite · JWT demo + require_rol()
│   │   ├── estados.py           # máquinas de estado
│   │   └── routers/             # auth, publico, cliente, comercio, proveedor
│   ├── seed.py                  # datos demo CDMX (idempotente)
│   ├── export_openapi.py        # usado por make gen-api
│   └── tests/                   # conftest (DB en memoria sembrada) + un test_<rol>.py por rol
└── frontend/                    # Vite · React · TS strict · Tailwind v4 · shadcn/ui · TanStack Query · React Router
    └── src/
        ├── api/                 # GENERADO por @hey-api/openapi-ts (no se edita ni se versiona)
        ├── components/          # shell compartido (marca, layout de rol, guard, Pendiente…)
        ├── components/ui/       # componentes shadcn
        ├── lib/                 # api.ts (config del cliente), sesion.ts, formato.ts, utils.ts
        ├── router.tsx           # árbol de rutas (ya incluye los 3 roles)
        └── routes/
            ├── entrada.tsx      # pantalla de entrada / login demo
            └── <rol>/           # index.tsx (rutas + nav del rol), pantallas, CLAUDE.md → alcance
```

## Trabajo en ramas (léelo antes de tocar código)

Cada integrante trabaja **un giro** en **su propia rama**, y todas se integran en `main`:

| Rama | Giro | Es dueña de |
|---|---|---|
| `rol/cliente` | Clientes (compradores) | `backend/app/routers/cliente.py`, `backend/app/routers/publico.py`, `backend/tests/test_cliente.py`, `backend/tests/test_publico.py`, `frontend/src/routes/cliente/**`, `docs/alcance/cliente.md` |
| `rol/comercio` | Comerciantes | `backend/app/routers/comercio.py`, `backend/tests/test_comercio.py`, `frontend/src/routes/comercio/**`, `docs/alcance/comercio.md` |
| `rol/proveedor` | Proveedores | `backend/app/routers/proveedor.py`, `backend/tests/test_proveedor.py`, `frontend/src/routes/proveedor/**`, `docs/alcance/proveedor.md` |

### Zona compartida: debe ser idéntica en todas las ramas

Todo lo que no aparece en la tabla anterior es **compartido**. En particular:

- `AGENTS.md`, `CLAUDE.md`, `Makefile`, `README.md`, `docs/alcance/compartido.md`.
- `backend/app/models.py`, `db.py`, `auth.py`, `estados.py`, `main.py`, `routers/auth.py`, `backend/seed.py`, `backend/tests/conftest.py`, `backend/pyproject.toml`, `backend/uv.lock`.
- `frontend/src/{main.tsx,router.tsx,index.css}`, `frontend/src/lib/**`, `frontend/src/components/**` (incluye `components/ui/`), `frontend/package.json`, `frontend/package-lock.json` y los archivos de configuración de `frontend/`.

**Reglas para la zona compartida:**

1. **No se edita dentro de una rama de rol.** Si necesitas cambiar algo compartido (un campo nuevo en `models.py`, datos en el seed, un componente shadcn nuevo, una dependencia):
   1. Haz el cambio en `main` (o en una rama corta `compartido/<tema>` que se mergea a `main` de inmediato).
   2. Que sea **pequeño y aditivo**: agregar campos con valor por defecto, no renombrar ni borrar.
   3. Avisa al equipo.
   4. **Todas** las ramas de rol hacen `git merge main`.
2. **Sincroniza seguido:** `git merge main` en tu rama al empezar el día y cada vez que alguien avise de un cambio compartido. Así las copias de la zona compartida se mantienen iguales y el merge final no tiene conflictos.
3. **Componentes shadcn:** se agregan en `main` (`npx shadcn@latest add <componente>` dentro de `frontend/`). Ya vienen: button, card, badge, input, label, tabs, separator, dialog, sheet, select, skeleton, sonner, alert y avatar.
4. **Componentes propios de un solo rol** van en `frontend/src/routes/<rol>/`, no en `src/components/`.
5. **Archivos generados** (`frontend/src/api/`, `frontend/openapi.json`) están en `.gitignore`. Nunca generan conflictos: después de cada merge corre `make gen-api`.
6. **Antes de mergear a `main`:** `git merge main` en tu rama → `make check` en verde → merge. Si `make check` falla en `main` después del merge, se arregla de inmediato.

Para comprobar que tu rama no tocó la zona compartida:

```bash
git diff main --stat -- . ':!backend/app/routers/<rol>.py' ':!backend/tests/test_<rol>.py' ':!frontend/src/routes/<rol>' ':!docs/alcance/<rol>.md'
```

Debe salir vacío. En la rama `rol/cliente` excluye también `publico.py` y `test_publico.py`.

## Reglas para agentes y personas

- **Antes de trabajar en un rol**, lee `docs/alcance/<rol>.md` y `docs/alcance/compartido.md`. No implementes nada listado en "Fuera de alcance", ni funcionalidades que no aparezcan ahí, sin preguntar primero.
- **Si un cambio de código altera el alcance**, actualiza el doc correspondiente en el mismo commit (por ejemplo, marca el endpoint como ✅ en la tabla "Endpoints que consume").
- **Cada endpoint va en el router de su rol.** El catálogo sin login va en `routers/publico.py`.
- **El operationId** se genera solo como `<tag>_<nombre_de_función>`, y en TS queda en camelCase (`comercio_listar_pedidos` → `comercioListarPedidos`). Nombra las funciones con verbos claros en español.
- **Protege los endpoints** con el alias del router (`ClienteActual`, `ComercianteActual`, `ProveedorActual`), que usa `require_rol(...)`.
- **Valida transiciones** con `validar_pedido()` / `validar_orden()` de `estados.py`; nunca cambies `estado` sin validar.
- **No edites `frontend/src/api/`.** Después de cambiar el backend, corre `make gen-api` y usa las funciones y `...Options()`/`...Mutation()` generadas con TanStack Query.
- **Usa componentes shadcn** (`@/components/ui/*`) antes de crear propios.
- **Tests:** cada rol agrega los suyos en `backend/tests/test_<rol>.py`, usando las fixtures `client` y `login` de `conftest.py`.
- **Simplicidad:** sin Docker, Postgres, auth real ni librerías fuera del stack sin acordarlo. Código simple y legible, sin abstracciones prematuras. UI en español y mobile-first.

## Comandos

```bash
make install    # dependencias de backend y frontend + genera el cliente API
make seed       # borra y recrea backend/tlalamatl.db con datos demo
make dev        # backend :8000 + frontend :5173
make gen-api    # exporta OpenAPI y regenera frontend/src/api/
make test       # pytest
make check      # pytest + gen-api + typecheck + build (correr antes de mergear)
```
