# Contexto del proyecto Tlalamatl

> Foto del repo al 2026-10-25 (rama `main`, commit `ff3ea35`). Resume qué hace el proyecto, cómo está armado y qué falta.
> Las reglas de trabajo viven en [`AGENTS.md`](../AGENTS.md) y el alcance de cada interfaz en [`docs/alcance/`](alcance/), que **mandan** sobre este documento. Si algo de aquí ya no coincide con el código, gana el código.

## 1. Qué es

**Tlalamatl** ("mapa de tierra" en náhuatl) es un prototipo de hackathon (Chilangatón) pensado para vivir dentro de la App CDMX como webview, mobile-first.

**No es un e-commerce, es una plataforma de contacto.** Muestra quién vende qué, dónde, qué días abre y a qué precio. La compra se hace en persona, en el puesto. La app no cobra ni intermedia la venta.

Conecta tres actores de la cadena de abasto de la CDMX:

| Rol (`Rol`) | Quién es | Qué hace en la app |
|---|---|---|
| `cliente` | Vecinas y vecinos que compran despensa | Explora el mapa y los precios; con sesión guarda favoritos y comenta |
| `comerciante` | Puesto de tianguis, mercado fijo, sobre ruedas o bodega de la Central | Publica su puesto y sus precios; se abastece con proveedores |
| `proveedor` | Productor, mayorista o almacén | Publica ofertas de mayoreo y atiende órdenes de abasto |

**Lo público (sin login):** el mapa con los lugares reales de la CDMX y su ficha, y el dashboard de precios.
**Lo que pide login (demo, sin contraseña):** favoritos, comentarios y la administración de datos y precios de comerciantes y proveedores.

Datos: los **lugares** del mapa son reales (Datos Abiertos CDMX y OpenStreetMap). Los **puestos, productos, precios, usuarios y teléfonos** son mock del seed.

## 2. Arquitectura general

```
┌──────────── Frontend (Vite · React 19 · TS) :5173 ────────────┐
│  MarcoTelefono (≤430 px)                                       │
│   ├─ /            mapa público (SVG propio + lugares estáticos)│
│   ├─ /precios     dashboard de precios (pendiente)             │
│   ├─ /entrar      login demo por rol                           │
│   └─ /cliente/* · /comercio/* · /proveedor/*  (guard por rol)  │
│                                                                │
│  src/api/  ← GENERADO desde OpenAPI (@hey-api/openapi-ts)      │
│  TanStack Query: ...Options() / ...Mutation()                  │
└───────────────┬────────────────────────────────────────────────┘
                │ HTTP + Bearer JWT (VITE_API_URL, por defecto :8000)
┌───────────────▼──────── Backend (FastAPI) :8000 ───────────────┐
│  routers: auth · publico · cliente · comercio · proveedor      │
│  auth.py (JWT demo + require_rol) · estados.py (máquinas)      │
│  models.py (SQLModel, fuente única de verdad)                  │
│  SQLite: backend/tlalamatl.db  ← seed.py                       │
└────────────────────────────────────────────────────────────────┘
```

El contrato entre ambos es el **OpenAPI** de FastAPI: `make gen-api` lo exporta (`backend/export_openapi.py` → `frontend/openapi.json`) y genera el cliente TS tipado en `frontend/src/api/`. Ninguno de los dos se versiona.

## 3. Stack

| Capa | Tecnología |
|---|---|
| Backend | Python 3.12, uv, FastAPI (`fastapi[standard]`), SQLModel, SQLite, PyJWT, Faker (`es_MX`), pytest |
| Frontend | Vite 8, React 19, TypeScript 6 (strict), Tailwind v4, shadcn/ui (radix-ui), TanStack Query 5, React Router 8, lucide-react, sonner, fuente Geist |
| Cliente API | `@hey-api/openapi-ts` (genera SDK + opciones de TanStack Query) |
| Lint | oxlint |
| Orquestación | `Makefile` |

Sin Docker, sin Postgres y sin auth real, por decisión del equipo.

## 4. Cómo levantarlo

Requisitos: [uv](https://docs.astral.sh/uv/), Node 20+ y `make`.

```bash
make install   # uv sync + npm install + gen-api
make dev       # backend :8000 (docs en /docs) + frontend :5173
```

| Comando | Qué hace |
|---|---|
| `make seed` | Borra y recrea `backend/tlalamatl.db` con los datos demo |
| `make dev-back` / `make dev-front` | Levanta cada lado por separado (`dev-back` siembra si no hay DB) |
| `make gen-api` | Regenera `frontend/src/api/` después de cambiar el backend |
| `make test` | pytest |
| `make check` | test + gen-api + typecheck + build; se corre antes de mergear |

Variables de entorno:

- `TLALAMATL_SECRET` (backend): clave del JWT. Tiene un valor de desarrollo por defecto.
- `VITE_API_URL` (frontend, ver `frontend/.env.example`): URL de la API; por defecto `http://localhost:8000`.

CORS acepta cualquier puerto de `localhost` o `127.0.0.1`.

## 5. Backend

### 5.1 Archivos

| Archivo | Responsabilidad |
|---|---|
| `app/main.py` | App FastAPI, CORS, registro de los 5 routers, `GET /salud`, crea tablas al arrancar. Define el `operationId` como `<tag>_<función>` |
| `app/models.py` | Enums, tablas y esquemas de lectura. **Fuente única de verdad** del dominio |
| `app/db.py` | Engine SQLite (`backend/tlalamatl.db`), `get_session`, alias `SessionDep` |
| `app/auth.py` | `crear_token`, `usuario_actual` (lee el Bearer) y `require_rol(*roles)` |
| `app/estados.py` | Transiciones válidas de `Pedido` y `OrdenAbasto`; `validar_pedido()` / `validar_orden()` responden **409** |
| `app/routers/*.py` | Un router por rol más `auth` y `publico` |
| `seed.py` | Datos demo idempotentes (`sembrar(session, hoy=None)`) |
| `export_openapi.py` | Escribe el OpenAPI a disco (lo usa `make gen-api`) |
| `tests/` | `conftest.py` (DB en memoria sembrada, "hoy" fijo en miércoles) y un archivo por rol |

### 5.2 Modelo de datos

Enums: `Rol`, `Categoria` (`central_abasto`, `mercado_fijo`, `mercado_sobre_ruedas`, `tianguis`), `TipoProveedor` (`productor`, `mayorista`, `almacen`), `Dia` (`lun`…`dom`, con `Dia.hoy()` en horario de la CDMX), `EstadoPedido` y `EstadoOrden`.

| Tabla | Campos | Notas |
|---|---|---|
| `Usuario` | nombre, email (único), rol, alcaldía | |
| `Comercio` | dueño → Usuario, nombre, categoría, alcaldía, ubicación (texto), lat/lng, `dias_operacion: list[Dia]`, teléfono, WhatsApp | Uno por comerciante. Los días se guardan como JSON (`ListaDias`) |
| `Proveedor` | usuario → Usuario, nombre, tipo, zona, lat/lng, teléfono, WhatsApp | |
| `Producto` | comercio, nombre, precio, stock, unidad, `stock_minimo` | Precio de **menudeo**. `stock` no se usa en el MVP |
| `OfertaProveedor` | proveedor, producto (texto genérico), unidad, `precio_mayoreo`, `cantidad_minima`, disponible | Precio de **mayoreo** |
| `Pedido` + `PedidoItem` | cliente → comercio; items con `precio_unitario` congelado | Andamiaje, **fuera del MVP** |
| `OrdenAbasto` + `OrdenAbastoItem` | comercio → proveedor; item con `oferta_id` y `producto_id` opcional | Pedido formal de mercancía al mayoreo |
| `Favorito` | usuario, comercio, fecha | Único por (usuario, comercio) |
| `Comentario` | usuario, comercio, texto (≤ 500), fecha | Lectura pública |

Esquemas de lectura con items anidados: `PedidoLeer` y `OrdenAbastoLeer`.

Cambios al modelo **pendientes** (se hacen en `main` antes de usarlos): `ProductoBase` (catálogo común para agregar precios, canasta básica y temporada) y `RutaEntrega` con `ruta_id` en `OrdenAbasto`.

### 5.3 Máquinas de estado

```
Pedido:      creado → aceptado → listo → entregado      (+ cancelado desde creado/aceptado)
OrdenAbasto: solicitada → confirmada → enviada → recibida (+ rechazada desde solicitada)
```

Ningún endpoint cambia `estado` todavía, pero cualquier cambio futuro debe pasar por `validar_*()`. Sin efectos en stock.

### 5.4 Autenticación demo

1. `GET /auth/usuarios-demo` lista los usuarios sembrados agrupados por rol, con un `detalle` (p. ej. "Tianguis · Verduras Doña Mary").
2. `POST /auth/demo-login {usuario_id}` emite un JWT HS256 con `sub` (id) y `rol`, válido 7 días.
3. Los routers de rol usan alias de dependencia: `ClienteActual`, `ComercianteActual`, `ProveedorActual`. Sin token responden 401; con otro rol, 403.

**Login por correo (Supabase Auth, opcional).** El frontend pide un código con `signInWithOtp` y lo verifica con `verifyOtp`. Después llama a `POST /auth/vincular` con el JWT de Supabase, que liga `Usuario.auth_id` al usuario con el mismo email o crea un cliente. `usuario_actual()` acepta los dos tipos de token: distingue el de Supabase por su `iss` y lo valida con el JWKS del proyecto (o con `SUPABASE_JWT_SECRET` en proyectos legacy). Configuración en `backend/.env` y `frontend/.env.local`.

### 5.5 Endpoints existentes

| Método | Ruta | operationId (TS) | Router |
|---|---|---|---|
| GET | `/salud` | `sistemaSalud` | main |
| GET | `/auth/usuarios-demo` | `authUsuariosDemo` | auth |
| POST | `/auth/demo-login` | `authDemoLogin` | auth |
| GET | `/auth/yo` | `authYo` | auth |
| GET | `/publico/comercios?categoria&alcaldia&abierto_hoy&dia` | `publicoListarComercios` | publico |
| GET | `/publico/comercios/{id}?dia` | `publicoObtenerComercio` | publico |
| GET | `/publico/comercios/{id}/productos` | `publicoListarProductos` | publico |
| GET | `/cliente/pedidos` | `clienteMisPedidos` | cliente (fuera del MVP) |
| GET | `/comercio/mi-comercio` | `comercioMiComercio` | comercio |
| GET | `/proveedor/mi-perfil` | `proveedorMiPerfil` | proveedor |

`ComercioPublico` agrega `abierto_hoy` (hoy ∈ `dias_operacion`). El parámetro `dia` fuerza el "hoy" para tests y demos.

Los endpoints por crear de cada rol están en las tablas "Endpoints que consume" de `docs/alcance/*.md`.

### 5.6 Datos del seed

`make seed` (o el arranque de `make dev-back` sin DB) crea:

- **3 clientes** en Iztapalapa, Coyoacán y Benito Juárez.
- **8 comercios**, dos por categoría, cada uno con su comerciante y de 3 a 5 productos:
  - Tianguis: *Verduras Doña Mary* (Iztapalapa; **siempre abre hoy**, para que la demo funcione cualquier día) y *Chiles Secos y Especias Rosita*.
  - Sobre ruedas: *Frutas y Verduras Don Chuy* y *Hortalizas Martínez*.
  - Mercado fijo: *Frutería La Güera* (diario) y *Pollería El Güero* (sin WhatsApp, para probar ese caso).
  - Central de Abasto: *Bodega Hermanos Ramírez* y *Abarrotes y Semillas La Ceiba*.
- **4 proveedores** con ofertas y coordenadas: *Distribuidora Hortícola del Valle*, *Abarrotera Mayorista San Juan*, *Cooperativa Hortalizas de Xochimilco* y *Aguacateros de Uruapan*.
- **5 pedidos** y **5 órdenes de abasto**, uno en cada estado.
- **Favoritos** de los 3 clientes y **5 comentarios**.

Los emails son `<rol><n>@tlalamatl.demo`. Los nombres de persona salen de Faker con semilla 42, así que son estables. Los teléfonos tienen la forma `5500xxxxxx`, un rango que no se asigna en la CDMX. Los días de los comercios se calculan relativos al día en que se siembra.

### 5.7 Tests

`conftest.py` monta una DB SQLite en memoria con el seed real y fija "hoy" en miércoles. Fixtures: `session`, `client` (TestClient) y `login(rol, n=0)`, que devuelve los headers con el token.

| Archivo | Cubre |
|---|---|
| `test_auth.py` | usuarios demo por rol, JWT, `/auth/yo`, protección por rol (401/403) |
| `test_estados.py` | transiciones válidas e inválidas de ambas máquinas |
| `test_publico.py` | filtros `abierto_hoy`, categoría y alcaldía; productos; contacto expuesto |
| `test_seed.py` | contacto ficticio, coordenadas de proveedores, favoritos y comentarios sin repetidos |
| `test_cliente.py` · `test_comercio.py` · `test_proveedor.py` | el endpoint de ejemplo de cada rol |

## 6. Frontend

### 6.1 Estructura

| Ruta | Contenido |
|---|---|
| `src/main.tsx` | Arranque: QueryClient, RouterProvider, Toaster |
| `src/router.tsx` | Árbol de rutas bajo `MarcoTelefono`; cualquier ruta desconocida va a `/` |
| `src/lib/api.ts` | Configura el cliente generado (baseUrl, token). Un **401** con sesión la borra. `mensajeError()` |
| `src/lib/sesion.ts` | Sesión `{token, usuario}` en `localStorage` (`tlalamatl.sesion`), `useSesion()` con `useSyncExternalStore`, `INICIO_POR_ROL` |
| `src/lib/formato.ts` | Etiquetas en español (categorías, días, roles, tipos, estados de pedido) y `pesos()` en MXN |
| `src/components/` | Shell compartido: `MarcoTelefono`, `LayoutRol` (encabezado, contenido y nav inferior), `RequiereRol` (guard), `Encabezado`, `Marca`/`Isotipo`, `Pendiente`, `EstadoPedidoBadge` |
| `src/components/ui/` | shadcn: button, card, badge, input, label, tabs, separator, dialog, sheet, select, skeleton, sonner, alert y avatar |
| `src/routes/entrada.tsx` | `/entrar`: una tarjeta por rol con sus usuarios demo |
| `src/routes/publico/` | Mapa y dashboard de precios |
| `src/routes/<rol>/` | `index.tsx` (rutas y nav del rol), pantallas y un `CLAUDE.md` que importa su doc de alcance |

### 6.2 Rutas y estado de cada pantalla

| Ruta | Pantalla | Estado |
|---|---|---|
| `/` | Mapa de mercados (público) | ✅ funcional |
| `/precios` | Dashboard de precios | ⏳ `Pendiente` |
| `/entrar` | Login demo | ✅ |
| `/cliente` | Mapa (el mismo componente que el público) | ✅ |
| `/cliente/lista` | Lista de comercios (`Explorar`) | ✅ básica; no está en la nav |
| `/cliente/carrito` | Carrito | ⏳ `Pendiente`; fuera del MVP, se va a quitar |
| `/cliente/pedidos` | Mis pedidos | ✅ andamiaje; fuera del MVP |
| `/comercio` | Mi puesto (tarjeta) | ✅ versión inicial |
| `/comercio/inventario` · `/pedidos` · `/abastecerme` | | ⏳ `Pendiente`; se reemplazan por Mis precios, Proveedores y Solicitudes |
| `/proveedor` | Órdenes (por ahora solo la tarjeta de perfil) | ✅ versión inicial |
| `/proveedor/ofertas` | Mis ofertas | ⏳ `Pendiente` |

La navegación pública muestra Mapa, Precios y Entrar (o "Mi espacio" si hay sesión). "Salir" borra la sesión, limpia la caché de Query y vuelve a `/`.

### 6.3 El mapa público (`src/routes/publico/mapa/`)

Es la pieza más trabajada del frontend. **No usa librería de mapas**: es un SVG propio, portado de un prototipo estático (`m1.html`).

| Archivo | Qué hace |
|---|---|
| `lugares-datos.ts` | **Generado** (no se edita a mano) por `herramientas/limpiar_datos.py`, que vive fuera del repo. Trae 1,518 lugares reales: 1,137 tianguis, 329 mercados públicos y 51 sobre ruedas (SEDECO, Datos Abiertos CDMX), más la Central de Abasto (OpenStreetMap) |
| `lugares.ts` | Tipo `Lugar`, la fuente de cada categoría, `cargarLugares()` (import dinámico para no inflar el arranque) y `diaHoy()` en `America/Mexico_City` |
| `cdmx.ts` | Contornos de las 16 alcaldías (INEGI 2020) y parámetros de proyección |
| `geometria.ts` | Proyección lat/lng → SVG, Haversine (`distanciaKm`), `fmtKm`, búsqueda sin acentos, Zócalo como origen por defecto |
| `tipos.tsx` | Color **y forma** por tipo (cuadro, círculo, rombo, triángulo), para no depender solo del color |
| `mapa-lienzo.tsx` | Zoom con rueda, botones y pellizco; arrastre; puntos de lejos y pines de cerca; marcador "tu ubicación" |
| `mapa.tsx` | Búsqueda, filtros por tipo y "Abierto hoy" (activo de inicio), lista ordenada por distancia y paginada de 25 en 25, ficha del lugar con "Cómo llegar" (Google Maps) y sus puestos demo |

Cómo se cruzan los datos reales con el backend: cada comercio del seed se asigna al **lugar real más cercano de su misma categoría** (`puestosPorLugar`). La ficha de ese lugar muestra el puesto y sus productos con precio (`publicoListarProductos`).

La geolocalización es opcional. Sin permiso, las distancias se miden desde el Zócalo.

### 6.4 Identidad visual

Paleta propia en `index.css`: barro como color primario, maíz y nopal. Fuente Geist. En desktop la app se dibuja dentro de un marco de teléfono de máximo 430 px; en móvil ocupa toda la pantalla. Por regla, no se usan logos ni identidad gráfica del Gobierno de la CDMX.

## 7. Flujo de trabajo del equipo

- Una rama por giro: `rol/cliente` (también es dueña de lo público), `rol/comercio` y `rol/proveedor`.
- La **zona compartida** (modelos, auth, seed, shell del frontend, shadcn, configuración, `AGENTS.md`, este directorio `docs/` salvo `docs/alcance/<rol>.md`) solo se cambia en `main`, con cambios **pequeños y aditivos**. Después, cada rama hace `git merge main`.
- Después de cada merge se corre `make gen-api`. Antes de mergear a `main` se corre `make check`.
- Los docs de alcance mandan. Si un cambio de código altera el alcance, el doc se actualiza en el mismo commit.

Detalle completo en [`AGENTS.md`](../AGENTS.md#trabajo-en-ramas-léelo-antes-de-tocar-código).

## 8. Qué falta (resumen por interfaz)

**Público y compartido**
- Dashboard de precios (`GET /publico/precios`). Depende de decidir `ProductoBase`.
- Proveedores en el mapa (`GET /publico/proveedores`).
- Comentarios en la ficha (`GET /publico/comercios/{id}/comentarios`).
- Botones Llamar y WhatsApp en la ficha del puesto. El backend ya expone `telefono` y `whatsapp`.
- Favorito y Comentar desde la ficha pidiendo sesión, y regresar a la misma ficha después de entrar.

**Cliente:** favoritos (listar, agregar, quitar), comentar y "Mis comentarios". Cambiar la nav a Mapa, Favoritos y Mis comentarios.

**Comercio:** editar el puesto, CRUD de productos y precios, ver proveedores y sus ofertas, crear órdenes y marcarlas como recibidas, y ver los comentarios de su puesto. Cambiar la nav a Inicio, Mis precios, Proveedores y Solicitudes.

**Proveedor:** editar el perfil, CRUD de ofertas, órdenes recibidas con avance de estado, "Mis compradores" y rutas compartidas de entrega (requiere `RutaEntrega`).

## 9. Guion de la demo

Funciona de punta a punta cuando las 3 ramas estén integradas:

1. **Sin cuenta:** se abre el mapa, se toca un tianguis, se ve su ficha y se consulta el dashboard de precios.
2. **Cliente:** entra, guarda comercios en favoritos y deja un comentario.
3. **Comerciante** (*Verduras Doña Mary*): actualiza un precio, que se refleja en el dashboard, y ve a los proveedores.
4. **Proveedor** (*Distribuidora Hortícola del Valle*): ve los comercios que le compran de manera activa.

## 10. Observaciones y desajustes detectados

Cosas que vale la pena resolver o aclarar en los docs de alcance:

- **Librería de mapas:** `compartido.md` la lista como pregunta abierta (Leaflet o MapLibre), pero el mapa ya está hecho con SVG propio y sin dependencias. La pregunta quedó resuelta en los hechos.
- **`cliente.md`** dice que `compartido.md` "todavía dice que las ubicaciones son mock". `compartido.md` ya dice que son reales, así que esa nota está desactualizada.
- **"Abierto hoy" del mapa** se calcula con los días del **lugar real** (`Lugar.dias`), no con `dias_operacion` del comercio. Un puesto demo puede aparecer dentro de un lugar cerrado hoy, o al revés.
- **Asignación puesto → lugar** por cercanía: si un comercio del seed queda lejos de cualquier lugar real de su categoría, igual se asigna al más cercano, aunque esté a kilómetros.
- **`formato.ts`** no tiene etiquetas para `EstadoOrden`. Se agregan cuando algún endpoint la exponga.
- **`/cliente/lista`** existe pero no aparece en la navegación. El mapa del cliente es el mismo componente que el público.
- **`OrdenAbastoItem.producto_id`** dice en su comentario que "al recibir se busca/crea un producto", pero los efectos en stock están fuera del MVP, así que hoy no aplica.
- `herramientas/limpiar_datos.py` (genera `lugares-datos.ts`) **no está en el repo**. Para regenerar los lugares hay que conseguirlo del prototipo.
