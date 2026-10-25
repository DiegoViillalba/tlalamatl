# Alcance: reglas compartidas

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `main` (cambios por acuerdo del equipo; ver "Trabajo en ramas" en `AGENTS.md`).

## Objetivo

Definir lo que comparten las tres interfaces (cliente, comercio y proveedor) para que cada rama pueda avanzar sola y el merge final sea limpio.

Tlalamatl **no es un e-commerce, es una plataforma de contacto entre personas**: muestra quién vende qué, dónde, cuándo y a qué precio, y la compra se hace en persona. Este documento cubre:

- La **exploración pública**: el mapa, la ficha de cada lugar y el dashboard de precios, sin login.
- El login demo, la navegación y las reglas transversales.
- Los estados de pedido y orden que trae el modelo.

## Usuario y contexto de uso

- Cualquier persona que abre Tlalamatl desde la App CDMX (webview móvil) o desde un navegador, **con o sin cuenta**.
- Durante el hackathon, también quien presenta la demo y cambia de rol frente al jurado.

## Funcionalidades incluidas (MVP)

### Exploración pública (sin login)

- **Mapa de bienvenida (`/`):** es lo primero que ve cualquier persona. Es un mapa interactivo de la CDMX con las ubicaciones de mercados, tianguis, la Central de Abasto y proveedores. Las ubicaciones son mock (coordenadas del seed) para el hackathon.
- **Ficha interactiva:** al tocar una ubicación se muestran los detalles del comercio o del proveedor: categoría, días de operación, productos, precios y comentarios.
- **Contacto directo en la ficha:** botones **Llamar** (`tel:`) y **WhatsApp** (`https://wa.me/52…`) para hablar con el comerciante o el proveedor. Es la forma principal de conectar personas; la app no intermedia la venta.
- **Dashboard de precios (`/precios`):** productos de temporada (frutas y verduras) y precios de la canasta básica. Su uso cambia según quién lo consulta:
  - El **comprador** compra informado y más barato según la temporada.
  - El **comerciante** y el **productor** saben dónde hay demanda para colocar su producto.

### Con sesión (login demo)

- **Login solo para acciones personales:**
  - El cliente guarda favoritos y deja comentarios.
  - El comerciante y el proveedor administran sus datos y **sus precios**.
  Al intentar una acción personal sin sesión, se pide entrar y luego se regresa al mismo lugar.
- **Login demo sin contraseña (`/entrar`):** lista los usuarios sembrados, agrupados por rol. Al elegir uno se obtiene un JWT (`sub`, `rol`) que se guarda en `localStorage`.
- **Guard por rol:** `/cliente/*`, `/comercio/*` y `/proveedor/*` solo los ve el rol correspondiente. Sin sesión se va a `/entrar`; con otro rol se va al inicio de ese rol.

### Origen de los precios

- **Hoy (hackathon):** mock con base en precios reales existentes. Los cargamos en el seed como precios de los productos de los comercios y de las ofertas de los proveedores.
- **La idea:** los precios **los ponen los comerciantes** (menudeo, `Producto.precio`) **y los proveedores** (mayoreo, `OfertaProveedor.precio_mayoreo`). El dashboard los agrega por producto (p. ej. mínimo, promedio y dónde está más barato). No hay una tabla aparte de "precios oficiales".

### Abasto entre comerciante y proveedor

- Se mantienen las **órdenes de abasto** (`OrdenAbasto`) como la forma formal de pedir mercancía al mayoreo, con los estados de abajo y sin efecto en stock.
- El teléfono y WhatsApp de la ficha sirven para el contacto informal: dudas, negociar o coordinar la entrega.

### Cambios al modelo (se hacen en `main`, antes de que las ramas los usen)

| Cambio | Para qué | Lo usa | Estado |
|---|---|---|---|
| `telefono` y `whatsapp` (opcionales) en `Comercio` y `Proveedor` | Contacto directo en la ficha | Todos | ✅ en modelo y seed |
| `lat`/`lng` en `Proveedor` | Mostrar proveedores en el mapa | Público | ✅ en modelo y seed |
| Tabla `Favorito` (usuario, comercio; sin repetidos) | Favoritos del cliente | `rol/cliente` | ✅ en modelo y seed |
| Tabla `Comentario` (usuario, comercio, texto ≤ 500, fecha) | Comentarios en la ficha | `rol/cliente`, `rol/comercio` | ✅ en modelo y seed |
| Tabla `ProductoBase` (por confirmar, ver preguntas) | Agrupar precios por producto, canasta básica y temporada | Público, `rol/comercio`, `rol/proveedor` | ⏳ después |
| `RutaEntrega` y `ruta_id` en `OrdenAbasto` | Rutas compartidas | `rol/proveedor` | ⏳ después |

En el seed, los teléfonos son **ficticios**: tienen la forma `5500xxxxxx`, un rango que en la CDMX no se asigna. Nunca se usan números reales. Un puesto (Pollería El Güero) no tiene WhatsApp, para probar ese caso en la ficha.

### Comunes

- **Layout común:** encabezado con la marca, el nombre del usuario (o "Entrar" si no hay sesión) y "Salir"; contenido con scroll; navegación inferior tipo app.
- **Simulación de teléfono:** en desktop la app ocupa como máximo 430 px de ancho con marco de teléfono. En móvil o webview ocupa toda la pantalla.
- **Máquinas de estado validadas en el backend** (`backend/app/estados.py`). Una transición inválida responde 409.

### Estados de Pedido (cliente → comercio)

> El modelo `Pedido` viene del andamiaje. Los pedidos de clientes están **fuera del MVP** porque la compra es en persona. Se conservan por si se retoman.

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

- **No es e-commerce:** nada de carrito, pagos ni checkout. La app conecta; la compra es en persona.
- **Lectura pública:** todo lo que se puede leer (mapa, fichas, precios, comentarios) se lee sin sesión. Solo escribir requiere login.
- **Idioma y moneda:** todo en español de México, con pesos MXN (`pesos()` en `frontend/src/lib/formato.ts`).
- **"Abierto hoy":** el día de hoy aparece en `dias_operacion` del comercio, con la zona horaria `America/Mexico_City`.
- **Ubicaciones:** son mock. Salen de `lat`/`lng` del seed; no se usa geolocalización real del dispositivo salvo que se acuerde.
- **Identidad propia de Tlalamatl:** no se usan logos ni identidad gráfica oficial del Gobierno de la CDMX.
- **Datos:** todo es mock. `make seed` deja la base en un estado conocido, y el seed garantiza un tianguis abierto hoy.

## Fuera de alcance

- Carrito, pagos en línea, checkout y facturación.
- Contraseñas, registro de usuarios, recuperación de cuenta y auth real.
- Envíos o logística real.
- Notificaciones push y tiempo real (websockets). Basta con refrescar o re-consultar.
- Integración real con la App CDMX: por ahora solo debe ser cargable como webview.

## Pantallas

1. **Mapa (`/`, público):** mapa con filtros (categoría, "abierto hoy") y botón "Entrar". *Por hacer.* Hoy `/` es la pantalla de login, que se mueve a `/entrar`.
2. **Ficha interactiva (público):** hoja inferior sobre el mapa con los detalles del comercio o proveedor, sus productos con precio, sus comentarios y los botones **Llamar** y **WhatsApp**. Los botones "Favorito" y "Comentar" piden sesión. *Por hacer.*
3. **Dashboard de precios (`/precios`, público):** productos de temporada y canasta básica, con precio mínimo y promedio por producto y dónde encontrarlo. *Por hacer.*
4. **Entrar (`/entrar`):** marca Tlalamatl y una tarjeta "Entrar como…" por rol, con sus usuarios demo. *Hecha en `/`; falta moverla.*
5. **Layout de rol:** encabezado, contenido y navegación inferior (lo usan las 3 interfaces). *Hecho.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/auth/usuarios-demo` | `authUsuariosDemo` | ✅ hecho |
| POST | `/auth/demo-login` | `authDemoLogin` | ✅ hecho |
| GET | `/auth/yo` | `authYo` | ✅ hecho |
| GET | `/salud` | `sistemaSalud` | ✅ hecho |
| GET | `/publico/comercios?categoria&alcaldia&abierto_hoy` | `publicoListarComercios` | ✅ hecho |
| GET | `/publico/comercios/{id}/productos` | `publicoListarProductos` | ✅ hecho |
| GET | `/publico/mapa` | `publicoMapa` | ⏳ por crear: comercios y proveedores con coordenadas, tipo y contacto (teléfono, WhatsApp). Los campos ya existen en el modelo y en el seed. |
| GET | `/publico/precios?temporada` | `publicoPrecios` | ⏳ por crear: agrega `Producto.precio` y `OfertaProveedor.precio_mayoreo` por producto. Requiere un catálogo común de productos (ver preguntas). |
| GET | `/publico/comercios/{id}/comentarios` | `publicoListarComentarios` | ⏳ por crear (la tabla `Comentario` ya existe). |

## Criterios de aceptación

- [ ] Sin sesión, `/` muestra el mapa con mercados, tianguis y proveedores, y tocar uno abre su ficha.
- [ ] Desde la ficha, "Llamar" abre el marcador y "WhatsApp" abre un chat con el número del comercio o proveedor.
- [ ] Sin sesión se puede abrir el dashboard de precios y leer los comentarios de un comercio.
- [ ] Al tocar "Favorito" o "Comentar" sin sesión, se pide entrar. Después de entrar, la persona regresa a la misma ficha.
- [ ] Si un comerciante cambia el precio de un producto, el cambio se refleja en el dashboard de precios.
- [ ] Elegir un usuario en `/entrar` lleva al inicio de su rol, y recargar la página mantiene la sesión.
- [ ] Un cliente que entra a `/comercio` es redirigido a `/cliente`.
- [ ] "Salir" borra la sesión y vuelve al mapa.
- [ ] Una transición de estado inválida responde 409 con un mensaje en español.
- [ ] **Flujo demo de punta a punta** (requiere las 3 ramas integradas):
  1. **Sin cuenta:** se abre el mapa, se toca un tianguis, se ve su ficha y se consulta el dashboard de precios.
  2. **Cliente:** entra, guarda comercios en favoritos y deja un comentario.
  3. **Comerciante:** entra, actualiza el precio de un producto (se refleja en el dashboard) y ve a los proveedores.
  4. **Proveedor:** entra y ve los comercios que le compran de manera activa.

## Preguntas abiertas

- ¿Qué librería de mapas usamos? Leaflet o MapLibre con tiles de OpenStreetMap quedan fuera del stack acordado, así que hay que aprobarla antes de instalarla.
- **Catálogo común de productos:** para agregar precios, "Jitomate saladet" de un comercio y de un proveedor tiene que ser el mismo producto. ¿Creamos una tabla `ProductoBase` (nombre, unidad, ¿es canasta básica?, meses de temporada) a la que apunten `Producto` y `OfertaProveedor`?
- ¿Cómo definimos "de temporada"? ¿Por meses del año en `ProductoBase`?
- ¿Mostramos en el dashboard el precio de menudeo (comercios) y el de mayoreo (proveedores) por separado?
- ¿Quién puede comentar: solo clientes sobre comercios, o también comerciantes sobre proveedores? ¿Hace falta moderación o borrar comentarios propios?
- ¿Los proveedores también aparecen en el mapa público, o solo los ven los comerciantes con sesión?
