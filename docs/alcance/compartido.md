# Alcance: reglas compartidas

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `main` (cambios por acuerdo del equipo; ver "Trabajo en ramas" en `AGENTS.md`).

## Objetivo

Definir lo que comparten las tres interfaces (cliente, comercio y proveedor) para que cada rama pueda avanzar sola y el merge final sea limpio. Incluye:

- El login demo, la navegación y las reglas transversales.
- El **mapa de bienvenida** con las ubicaciones de comercios y proveedores.
- El **dashboard de precios** (productos de temporada y canasta básica) que ven todos los roles.
- Los estados de pedido y orden.

## Usuario y contexto de uso

- Cualquier persona que abre Tlalamatl desde la App CDMX (webview móvil) o desde un navegador.
- Durante el hackathon, también quien presenta la demo y cambia de rol frente al jurado.

## Funcionalidades incluidas (MVP)

- **Login demo sin contraseña:** la pantalla de entrada lista los usuarios sembrados, agrupados por rol. Al elegir uno se obtiene un JWT (`sub`, `rol`) que se guarda en `localStorage`.
- **Mapa de bienvenida:** mapa interactivo de la CDMX con las ubicaciones de comercios, mercados y proveedores. Las ubicaciones son mock (coordenadas del seed) para el hackathon.
- **Ficha interactiva:** al tocar una ubicación del mapa se muestran los detalles del comercio o del proveedor.
- **Dashboard de precios (todos los roles):** productos de temporada (frutas y verduras) y precios de la canasta básica. Su uso cambia según el rol:
  - El **cliente** compra informado y más barato según la temporada.
  - El **comerciante** y el **productor** saben dónde hay demanda para colocar su producto.
- **Guard por rol:** `/cliente/*`, `/comercio/*` y `/proveedor/*` solo los ve el rol correspondiente. Sin sesión se vuelve a la entrada; con otro rol se va al inicio de ese rol.
- **Layout común:** encabezado con la marca, el nombre del usuario y "Salir"; contenido con scroll; navegación inferior tipo app.
- **Simulación de teléfono:** en desktop la app ocupa como máximo 430 px de ancho con marco de teléfono. En móvil o webview ocupa toda la pantalla.
- **Máquinas de estado validadas en el backend** (`backend/app/estados.py`). Una transición inválida responde 409.

### Estados de Pedido (cliente → comercio)

```
creado ──► aceptado ──► listo ──► entregado
  │           │
  └──► cancelado ◄──┘
```

| Transición | Quién la hace |
|---|---|
| (nuevo) → `creado` | cliente |
| `creado` → `aceptado` | comercio |
| `aceptado` → `listo` | comercio |
| `listo` → `entregado` | comercio |
| `creado` → `cancelado` | cliente o comercio |
| `aceptado` → `cancelado` | comercio |

### Estados de OrdenAbasto (comercio → proveedor)

```
solicitada ──► confirmada ──► enviada ──► recibida
    │
    └──► rechazada
```

| Transición | Quién la hace |
|---|---|
| (nueva) → `solicitada` | comercio |
| `solicitada` → `confirmada` / `rechazada` | proveedor |
| `confirmada` → `enviada` | proveedor |
| `enviada` → `recibida` | comercio |

**Efectos en stock (herramienta a futuro, fuera del MVP):** aceptar un pedido descontaría stock, y recibir una orden lo sumaría al comercio.

### Reglas transversales

- **Idioma y moneda:** todo en español de México, con pesos MXN (`pesos()` en `frontend/src/lib/formato.ts`).
- **"Abierto hoy":** el día de hoy aparece en `dias_operacion` del comercio, con la zona horaria `America/Mexico_City`.
- **Ubicaciones:** son mock. Salen de `lat`/`lng` del seed; no se usa geolocalización real del dispositivo salvo que se acuerde.
- **Identidad propia de Tlalamatl:** no se usan logos ni identidad gráfica oficial del Gobierno de la CDMX.
- **Datos:** todo es mock. `make seed` deja la base en un estado conocido, y el seed garantiza un tianguis abierto hoy.

## Fuera de alcance

- Contraseñas, registro de usuarios, recuperación de cuenta y auth real.
- Pagos en línea, facturación y envíos o logística real.
- Notificaciones push y tiempo real (websockets). Basta con refrescar o re-consultar.
- Integración real con la App CDMX: por ahora solo debe ser cargable como webview.

## Pantallas

1. **Entrada (`/`):** marca Tlalamatl y una tarjeta "Entrar como…" por rol, con sus usuarios demo.
2. **Mapa de bienvenida:** mapa interactivo con las ubicaciones mock de comercios, mercados y proveedores de la ciudad. *Por hacer.*
3. **Ficha interactiva:** detalle del comercio o proveedor al tocar una ubicación en el mapa (hoja inferior o diálogo). *Por hacer.*
4. **Dashboard de precios:** productos de temporada y canasta básica, accesible desde los 3 roles. *Por hacer.*
5. **Layout de rol:** encabezado, contenido y navegación inferior (lo usan las 3 interfaces). *Hecho.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/auth/usuarios-demo` | `authUsuariosDemo` | ✅ hecho |
| POST | `/auth/demo-login` | `authDemoLogin` | ✅ hecho |
| GET | `/auth/yo` | `authYo` | ✅ hecho |
| GET | `/salud` | `sistemaSalud` | ✅ hecho |
| GET | `/publico/mapa` | `publicoMapa` | ⏳ por crear: comercios y proveedores con coordenadas y tipo. Requiere `lat`/`lng` en `Proveedor` (cambio en `models.py` y en el seed, en `main`). |
| GET | `/publico/precios?temporada` | `publicoPrecios` | ⏳ por crear: canasta básica y productos de temporada. Requiere una tabla nueva de precios de referencia (cambio en `models.py` y en el seed, en `main`). |

## Criterios de aceptación

- [ ] La pantalla de entrada carga, muestra el mapa y muestra los usuarios de los 3 roles.
- [ ] El mapa muestra comercios y proveedores con su ubicación, y tocar uno abre su ficha.
- [ ] El dashboard de precios muestra los productos de temporada y la canasta básica con su precio, y lo ven los 3 roles.
- [ ] Elegir un usuario lleva al inicio de su rol, y recargar la página mantiene la sesión.
- [ ] Un cliente que entra a `/comercio` es redirigido a `/cliente`.
- [ ] "Salir" borra la sesión y vuelve a la entrada.
- [ ] Una transición de estado inválida responde 409 con un mensaje en español.
- [ ] **Flujo demo de punta a punta** (requiere las 3 ramas integradas):
  1. Un usuario entra y ve el mapa principal.
  2. Si es **cliente**, puede marcar comercios como favoritos.
  3. Si es **proveedor**, ve los comercios que le compran de manera activa.
  4. Si es **comerciante**, ve a los proveedores.
  5. **Todos** ven el dashboard de precios (temporada y canasta básica).

## Preguntas abiertas

- ¿Qué librería de mapas usamos? Leaflet o MapLibre con tiles de OpenStreetMap quedan fuera del stack acordado, así que hay que aprobarla antes de instalarla.
- ¿El mapa se ve **antes** del login (en `/`, junto a las tarjetas "Entrar como…") o como primera pantalla **después** de entrar?
- ¿De dónde salen los precios? ¿Mock inventado o mock basado en una fuente pública (p. ej. PROFECO o SNIIM)? ¿Cómo definimos "de temporada": por mes del año?
- ¿Los efectos en stock quedan fuera del MVP también para el comercio? `comercio.md` todavía incluye stock bajo, y aceptar pedidos y recibir órdenes con efecto en stock.
