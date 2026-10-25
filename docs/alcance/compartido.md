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

- **Mapa de bienvenida (`/`):** es lo primero que ve cualquier persona. Es un mapa interactivo de la CDMX con las ubicaciones de mercados, tianguis, la Central de Abasto y proveedores. Los **lugares son reales**: tianguis, mercados públicos y mercados sobre ruedas de SEDECO (Datos Abiertos CDMX), más la Central de Abasto de OpenStreetMap. Los comercios del seed aparecen como puestos de demostración dentro del lugar real más cercano de su categoría.
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
- **Login demo sin contraseña (`/entrar`):** lista los usuarios sembrados, agrupados por rol. Al elegir uno se obtiene un JWT (`sub`, `rol`) que se guarda en `localStorage`. Se mantiene para la demo frente al jurado.
- **Login por correo (`/entrar`, Supabase Auth, opcional):** sin contraseña, con un código de un solo uso que llega al correo. Se usa código y no magic link porque un link se abre fuera de la webview de la App CDMX. Supabase solo autentica: los usuarios y su rol viven en nuestra base. Al primer ingreso, `POST /auth/vincular` liga la cuenta (`Usuario.auth_id`) al usuario con el mismo email o crea un cliente. El backend valida el JWT de Supabase con el JWKS del proyecto. Si no están las variables de entorno, solo aparece el login demo.
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
| Tabla `ProductoBase` (nombre único, unidad, categoría, `canasta_basica`, `meses_temporada`) y `producto_base_id` opcional en `Producto` y `OfertaProveedor` | Agrupar precios por producto, canasta básica y temporada | Público, `rol/comercio`, `rol/proveedor` | ✅ en modelo y seed |
| Tabla `PrecioHistorico` (producto base, fecha, menudeo promedio/mínimo, mayoreo promedio/mínimo, n de muestras) | Historial semanal de precios y canasta sugerida | Público | ✅ en modelo y seed (12 semanas por producto, con patrón de temporada y ruido determinista; la última semana coincide con los precios actuales) |
| `RutaEntrega`, `SolicitudFlete` y `ruta_id` en `OrdenAbasto` | Fletes compartidos | `rol/proveedor`, `rol/comercio` | ✅ en modelo y seed (ver "Fletes compartidos") |
| `auth_id` (opcional, único) en `Usuario` | Ligar la cuenta de Supabase Auth | Todos | ✅ en modelo (requiere `make seed`) |

En el seed, los teléfonos son **ficticios**: tienen la forma `5500xxxxxx`, un rango que en la CDMX no se asigna. Nunca se usan números reales. Un puesto (Pollería El Güero) no tiene WhatsApp, para probar ese caso en la ficha.

### Comunes

- **Layout común:** encabezado con la marca, el nombre del usuario (o "Entrar" si no hay sesión) y "Salir"; contenido con scroll; navegación inferior tipo app.
- **Simulación de teléfono:** en desktop la app ocupa como máximo 430 px de ancho con marco de teléfono. En móvil o webview ocupa toda la pantalla.
- **Máquinas de estado validadas en el backend** (`backend/app/estados.py`). Una transición inválida responde 409.
- **Imágenes de producto:** `<ImagenProducto nombre="Jitomate saladet" className="size-16" />` (`components/imagen-producto.tsx`) muestra una foto ilustrativa o, si no hay (o falla), un ícono sobre fondo neutro. `imagenDeProducto(nombre)` (`lib/imagenes.ts`) empareja por palabras clave sin acentos y devuelve `{ src, credito, licencia, fuente }` o `null`; no confunde chiles distintos. Pon `<CreditosImagenes nombres={...} />` al pie de la pantalla (y `LEYENDA_IMAGENES`, "Imágenes ilustrativas") para mostrar los créditos de las fotos usadas. Las fotos son **ilustrativas**, de Wikimedia Commons con licencias abiertas (CC0, dominio público, CC BY, CC BY-SA), viven en `frontend/public/productos/` (nada se pide a dominios externos) y sus créditos están en `lib/imagenes-productos.ts`. Se regeneran con `python3 scripts/imagenes_productos.py` desde `frontend/` (el script tiene la lista de productos y archivos de Commons).

### Fletes compartidos (proveedor ↔ comercios)

Un proveedor agrupa las órdenes **confirmadas** de varios comercios cercanos en una `RutaEntrega` (un solo viaje) y los comercios pueden **pedir sumarse** a una ruta abierta.

- **Ruta:** `proveedor`, `zona`, `fecha` de salida, `costo_flete` (total, MXN), `nota` y `estado`. Las paradas son las `OrdenAbasto` con ese `ruta_id`.
- **Costo repartido por comercio:** `cuota_flete = costo_flete / comercios distintos de la ruta`, en partes iguales y redondeado a centavos. No se guarda: se calcula al leer, así que cambia cuando entra o sale un comercio.
- **Estados de la ruta** (`validar_ruta()` en `estados.py`; inválida = 409): `abierta → en_camino → completada`, y `abierta → cancelada`. Solo una ruta `abierta` acepta solicitudes. Al pasar a `en_camino`, las órdenes de la ruta pasan de `confirmada` a `enviada`; al cancelar, las órdenes quedan libres (`ruta_id = null`).
- **Solicitud de flete (`SolicitudFlete`):** el comercio ofrece una orden suya `confirmada` y sin ruta; nace `pendiente` y el proveedor la `aceptada` (la orden entra a la ruta) o `rechazada`.

| Quién | Transición |
|---|---|
| proveedor | crea la ruta con órdenes `confirmadas` suyas y sin ruta; `abierta → en_camino` / `cancelada`; `en_camino → completada` |
| comercio | crea una solicitud `pendiente` sobre una ruta `abierta` |
| proveedor | `pendiente → aceptada` / `rechazada` |

**Lado comercio (a implementar en `rol/comercio`; el modelo ya existe):**

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/comercio/rutas-abiertas` | Rutas `abiertas` de los proveedores con los que el comercio tiene órdenes `confirmadas` sin ruta; con proveedor, zona, fecha, costo, número de comercios y la cuota estimada si se suma. |
| POST | `/comercio/rutas/{id}/solicitudes` | Cuerpo `{ orden_id }`. 404 si la ruta u orden no son del caso; 409 si la ruta no está `abierta`, la orden no está `confirmada` o ya tiene ruta o solicitud pendiente. |
| GET | `/comercio/solicitudes-flete` | Sus solicitudes con estado y la ruta. |
| DELETE | `/comercio/solicitudes-flete/{id}` | Retira una solicitud `pendiente`. |

Cuota estimada si se suma un comercio nuevo: `costo_flete / (comercios actuales + 1)`. Un comercio que ya está en la ruta no cambia el reparto.

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
- **Ubicaciones:** los lugares del mapa son reales. Salen de Datos Abiertos CDMX (SEDECO) y de OpenStreetMap, y viven como datos estáticos en `frontend/src/routes/publico/mapa/lugares-datos.ts`, generado por `limpiar_datos.py` (no se edita a mano). La ficha siempre cita la fuente. Los puestos, productos, precios y contactos siguen siendo mock del seed. La geolocalización del dispositivo es opcional ("cerca de mí"); sin permiso, se toma el Zócalo como referencia.
- **Identidad propia de Tlalamatl:** no se usan logos ni identidad gráfica oficial del Gobierno de la CDMX.
- **Datos:** salvo los lugares del mapa, todo es mock. `make seed` deja la base en un estado conocido, y el seed garantiza un tianguis abierto hoy.

## Fuera de alcance

- Carrito, pagos en línea, checkout y facturación.
- Contraseñas y recuperación de cuenta (el login real es solo por código de correo).
- Registro de comerciantes y proveedores desde la app: se dan de alta en la base y luego entran con su correo.
- Envíos o logística real.
- Notificaciones push y tiempo real (websockets). Basta con refrescar o re-consultar.
- Integración real con la App CDMX: por ahora solo debe ser cargable como webview.

## Pantallas

1. **Mapa (`/`, público):** mapa con búsqueda, filtros (categoría, "abierto hoy") y lista por distancia. La navegación inferior tiene Mapa, Precios y Entrar (o "Mi espacio" si hay sesión). *Hecho: sin sesión muestra "Entrar" en el encabezado.*
2. **Ficha interactiva (público):** hoja inferior sobre el mapa con los detalles del comercio o proveedor, sus productos con precio, sus comentarios y los botones **Llamar** y **WhatsApp**. Los botones "Favorito" y "Comentar" piden sesión. *Por hacer.*
3. **Dashboard de precios (`/precios`, público):** productos de temporada y canasta básica, con precio mínimo y promedio por producto y dónde encontrarlo. Pestañas "Para comprar" y "Para vender" (proveedores y comerciantes). Arriba, en "Para comprar", la **canasta de temporada**: gráfica de barras (más barato vs. promedio) con total en vivo, productos para agregar y quitar (se guarda en `localStorage`), y "Dónde comprar" agrupado por comercio con Llamar/WhatsApp. Al tocar un producto se abre su **historial** de 12 semanas (promedio y mínimo, menudeo o mayoreo, con la temporada marcada). *Hecha.*
4. **Entrar (`/entrar`):** marca Tlalamatl y una tarjeta "Entrar como…" por rol, con sus usuarios demo y "Volver al mapa". *Hecha.* Las rutas de rol sin sesión redirigen aquí.
5. **Layout de rol:** encabezado, contenido y navegación inferior (lo usan las 3 interfaces). *Hecho.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/auth/usuarios-demo` | `authUsuariosDemo` | ✅ hecho |
| POST | `/auth/demo-login` | `authDemoLogin` | ✅ hecho |
| GET | `/auth/yo` | `authYo` | ✅ hecho |
| POST | `/auth/vincular` | `authVincularCuenta` | ✅ hecho; requiere el JWT de Supabase |
| GET | `/salud` | `sistemaSalud` | ✅ hecho |
| GET | `/publico/comercios?categoria&alcaldia&abierto_hoy` | `publicoListarComercios` | ✅ hecho; incluye `telefono` y `whatsapp` |
| GET | `/publico/comercios/{id}` | `publicoObtenerComercio` | ✅ hecho; incluye `telefono` y `whatsapp` |
| GET | `/publico/comercios/{id}/productos` | `publicoListarProductos` | ✅ hecho |
| GET | `/publico/proveedores` | `publicoListarProveedores` | ⏳ por crear: proveedores con coordenadas, tipo y contacto, para mostrarlos en el mapa. Los lugares reales ya no necesitan endpoint, porque son estáticos en el frontend. |
| GET | `/publico/precios?temporada&canasta&categoria&mes` | `publicoPrecios` | ✅ hecho: por `ProductoBase`, menudeo y mayoreo (mín/promedio/máx/n), dónde está más barato (comercio y proveedor, con contacto) y demanda por reabasto. Sin login. |
| GET | `/publico/canasta?mes` | `publicoCanasta` | ✅ hecho: canasta sugerida del mes (canasta básica y de temporada), con precio más barato vs. promedio, comercio donde comprarlo, totales, ahorro y lugares a visitar. Los 8 mejores vienen con `en_canasta`; el resto son candidatos para agregar. |
| GET | `/publico/precios/{producto_base_id}/historial?semanas=12` | `publicoHistorialPrecios` | ✅ hecho: serie semanal (más antigua primero) de menudeo y mayoreo, promedio y mínimo. 404 si el producto no existe. |
| GET | `/publico/comercios/{id}/comentarios` | `publicoListarComentarios` | ⏳ por crear (la tabla `Comentario` ya existe). |

## Criterios de aceptación

- [ ] Sin sesión, `/` muestra el mapa con mercados, tianguis y proveedores, y tocar uno abre su ficha.
- [ ] Desde la ficha, "Llamar" abre el marcador y "WhatsApp" abre un chat con el número del comercio o proveedor.
- [ ] Sin sesión se puede abrir el dashboard de precios y leer los comentarios de un comercio.
- [ ] Al tocar "Favorito" o "Comentar" sin sesión, se pide entrar. Después de entrar, la persona regresa a la misma ficha.
- [ ] Si un comerciante cambia el precio de un producto, el cambio se refleja en el dashboard de precios.
- [x] Elegir un usuario en `/entrar` lleva al inicio de su rol, y recargar la página mantiene la sesión.
- [x] Un cliente que entra a `/comercio` es redirigido a `/cliente`; sin sesión, a `/entrar`.
- [x] "Salir" borra la sesión y vuelve al mapa.
- [ ] Una transición de estado inválida responde 409 con un mensaje en español.
- [ ] **Flujo demo de punta a punta** (requiere las 3 ramas integradas):
  1. **Sin cuenta:** se abre el mapa, se toca un tianguis, se ve su ficha y se consulta el dashboard de precios.
  2. **Cliente:** entra, guarda comercios en favoritos y deja un comentario.
  3. **Comerciante:** entra, actualiza el precio de un producto (se refleja en el dashboard) y ve a los proveedores.
  4. **Proveedor:** entra y ve los comercios que le compran de manera activa.

## Preguntas abiertas

- ¿Qué librería de mapas usamos? Leaflet o MapLibre con tiles de OpenStreetMap quedan fuera del stack acordado, así que hay que aprobarla antes de instalarla.
- ~~**Catálogo común de productos**~~ Resuelta: tabla `ProductoBase` (nombre, unidad, categoría, `canasta_basica`, `meses_temporada`) a la que apuntan `Producto` y `OfertaProveedor` con `producto_base_id` (opcional). El seed enlaza por nombre; un producto nuevo de un comercio sin `producto_base_id` no aparece en el dashboard.
- ~~¿Cómo definimos "de temporada"?~~ Resuelta: por meses (1–12) en `ProductoBase.meses_temporada`. Un producto es "de temporada" si el mes consultado está en la lista; lista vacía = todo el año y **no** se marca de temporada.
- ~~¿Menudeo y mayoreo?~~ Resuelta: se muestran por separado (`menudeo` de `Producto.precio`, `mayoreo` de ofertas con `disponible=True`). La "demanda por reabasto" cuenta los comercios que venden el producto y cuántos tienen `stock <= stock_minimo`.
- ¿Quién puede comentar: solo clientes sobre comercios, o también comerciantes sobre proveedores? ¿Hace falta moderación o borrar comentarios propios?
- ¿Los proveedores también aparecen en el mapa público, o solo los ven los comerciantes con sesión?
