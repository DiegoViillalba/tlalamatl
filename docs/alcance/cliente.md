# Alcance: interfaz del cliente

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/cliente`, que también es dueña de la exploración pública (mapa, ficha y dashboard de precios). Lee también `docs/alcance/compartido.md`.

## Objetivo

Que una persona en la CDMX encuentre rápido qué tianguis, mercado o bodega de la Central de Abasto está abierto hoy cerca de ella y vea sus productos y precios (entregable mínimo). Esto lo puede hacer **sin cuenta**; con sesión, además guarda sus lugares favoritos y deja comentarios.

## Usuario y contexto de uso

- Vecinas y vecinos que compran despensa semanal o del día, desde el celular y dentro de la App CDMX.
- Uso rápido, a veces en la calle y con conexión limitada. Necesita textos claros y botones grandes.
- La mayoría solo va a explorar sin cuenta; el login es para quien quiere guardar o comentar.

## Funcionalidades incluidas (MVP)

**Lugares reales en el mapa:** tianguis (1,137), mercados públicos (329) y mercados sobre ruedas (51) de SEDECO, Datos Abiertos CDMX, y la Central de Abasto de OpenStreetMap. Viven como datos estáticos en `frontend/src/routes/publico/mapa/lugares-datos.ts`, generado con `herramientas/limpiar_datos.py` del prototipo (fuera del repo). Los comercios del seed son puestos de demostración y aparecen en la ficha del lugar real más cercano de su categoría. Pendiente en `main`: ajustar `compartido.md`, que todavía dice que las ubicaciones son mock.

**Sin login** (exploración pública, definida en `compartido.md`):
- **Explorar comercios** en el mapa o en una lista, con filtros por categoría (Central de Abasto, mercado fijo, sobre ruedas, tianguis), por alcaldía y por "abierto hoy".
- **Ver el detalle de un comercio:** ubicación, días de operación, productos con precio y unidad, y comentarios.

**Con login de cliente:**
- **Lista de favoritos:** marcar y desmarcar comercios como favoritos. Incluye dos vistas: "Cerca de mí" y "Mis favoritos".
- **Comentarios:** dejar un comentario en un comercio y ver mis comentarios.

## Fuera de alcance

- Carrito, pedidos y su seguimiento: la compra es en persona. El andamiaje trae la pantalla "Mis pedidos" y el endpoint `GET /cliente/pedidos`; se quitan de la navegación del cliente.
- Pagos en línea.
- Envío a domicilio.
- Calificaciones con estrellas o rankings de comercios (solo comentarios de texto).
- Comparar precios entre comercios. El dashboard de precios de `compartido.md` ya muestra dónde está más barato cada producto.

## Pantallas

1. **Mapa, ficha y dashboard de precios (públicas):** ver `compartido.md`. Viven en `frontend/src/routes/publico/`. *Dashboard de precios hecho* (`/precios`, en `routes/publico/precios/`): pestañas "Para comprar" y "Para vender", filtros de temporada, canasta, categoría, mes y búsqueda, y contacto directo (Llamar / WhatsApp) del comercio más barato. Incluye la canasta de temporada interactiva (agregar/quitar productos, total y ahorro en vivo, dónde comprar) y el historial de precios por producto.
2. **Favoritos (`/cliente`):** pestañas "Cerca de mí" y "Mis favoritos". Es el inicio del cliente con sesión. *Por hacer.*
3. **Mis comentarios (`/cliente/comentarios`):** lista de comentarios que dejé, con enlace a la ficha. *Por hacer.*

La navegación inferior del cliente queda así: Mapa (`/`), Favoritos, Mis comentarios. Reemplaza a "Explorar", "Carrito" y "Mis pedidos" del andamiaje.

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/publico/comercios?categoria&alcaldia&abierto_hoy` | `publicoListarComercios` | ✅ hecho |
| GET | `/publico/comercios/{id}` | `publicoObtenerComercio` | ✅ hecho |
| GET | `/publico/comercios/{id}/productos` | `publicoListarProductos` | ✅ hecho |
| GET | `/publico/precios?temporada&canasta&categoria&mes` | `publicoPrecios` | ✅ hecho (dashboard de precios) |
| GET | `/publico/canasta?mes` | `publicoCanasta` | ✅ hecho (canasta sugerida) |
| GET | `/publico/precios/{producto_base_id}/historial?semanas` | `publicoHistorialPrecios` | ✅ hecho (historial) |
| GET | `/publico/comercios/{id}/comentarios` | `publicoListarComentarios` | ⏳ por crear (ver `compartido.md`) |
| GET | `/cliente/favoritos` | `clienteListarFavoritos` | ⏳ por crear (la tabla `Favorito` ya existe). |
| PUT | `/cliente/favoritos/{comercio_id}` | `clienteAgregarFavorito` | ⏳ por crear |
| DELETE | `/cliente/favoritos/{comercio_id}` | `clienteQuitarFavorito` | ⏳ por crear |
| POST | `/cliente/comercios/{comercio_id}/comentarios` | `clienteComentar` | ⏳ por crear; cuerpo `{ texto }` (la tabla `Comentario` ya existe). |
| GET | `/cliente/comentarios` | `clienteMisComentarios` | ⏳ por crear |
| GET | `/cliente/pedidos` | `clienteMisPedidos` | Existe en el andamiaje; fuera del MVP |

## Criterios de aceptación

- [ ] Sin sesión se pueden explorar comercios, abrir su ficha y leer sus productos, precios y comentarios.
- [ ] Con el filtro "abierto hoy" activo solo aparecen comercios cuyo `dias_operacion` incluye el día de hoy.
- [ ] Se puede filtrar por categoría y por alcaldía, y los filtros se combinan.
- [ ] Con sesión de cliente se pueden agregar mercados o tianguis a favoritos y quitarlos, y la lista sobrevive al recargar.
- [ ] "Cerca de mí" muestra primero los comercios más cercanos al cliente.
- [ ] Un cliente puede dejar un comentario en un comercio, y el comentario aparece en la ficha pública.
- [ ] Paso 2 del flujo demo (`compartido.md`): el cliente entra, guarda favoritos y deja un comentario.

## Preguntas abiertas

- ¿Qué significa "cerca de mí"? ¿Misma alcaldía que el usuario (`Usuario.alcaldia`, ya existe) o distancia por geolocalización del teléfono?
- ¿Un cliente puede editar o borrar sus comentarios?
- ¿Hay límite de largo en los comentarios?
