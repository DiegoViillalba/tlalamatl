# Alcance: interfaz del cliente

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/cliente`. También lee `docs/alcance/compartido.md`; el mapa y el dashboard de precios están definidos ahí.

## Objetivo

Que una persona en la CDMX encuentre rápido qué tianguis, mercado o bodega de la Central de Abasto está abierto hoy cerca de ella y vea sus productos (entregable mínimo).

## Usuario y contexto de uso

- Vecinas y vecinos que compran despensa semanal o del día, desde el celular y dentro de la App CDMX.
- Uso rápido, a veces en la calle y con conexión limitada. Necesita textos claros y botones grandes.

## Funcionalidades incluidas (MVP)

- **Explorar comercios**, con filtros por categoría (Central de Abasto, mercado fijo, sobre ruedas, tianguis), por alcaldía y por "abierto hoy".
- **Ver el detalle de un comercio:** ubicación, días de operación y productos con precio, unidad y disponibilidad.
- **Lista de favoritos:** marcar y desmarcar comercios como favoritos. Incluye dos vistas: "Cerca de mí" y "Mis favoritos".

## Fuera de alcance

- Carrito, pedidos y su seguimiento (a futuro). El andamiaje trae la pantalla "Mis pedidos" y el endpoint `GET /cliente/pedidos`; se quitan de la navegación del cliente o se dejan ocultos.
- Pagos en línea.
- Envío a domicilio.
- Reseñas o calificaciones de comercios.
- Comparar precios entre comercios.

## Pantallas

1. **Explorar (`/cliente`):** lista de comercios con filtros. *Versión inicial hecha: lista sin filtros.*
2. **Detalle de comercio (`/cliente/comercio/:id`):** información, productos y botón "Agregar a favoritos". *Por hacer.*
3. **Favoritos (`/cliente/favoritos`):** pestañas "Cerca de mí" y "Mis favoritos". *Por hacer.* Reemplaza a "Carrito" y "Mis pedidos" en la navegación inferior.

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/publico/comercios?categoria&alcaldia&abierto_hoy` | `publicoListarComercios` | ✅ hecho |
| GET | `/publico/comercios/{id}` | `publicoObtenerComercio` | ✅ hecho |
| GET | `/publico/comercios/{id}/productos` | `publicoListarProductos` | ✅ hecho |
| GET | `/cliente/favoritos` | `clienteListarFavoritos` | ⏳ por crear, solo si los favoritos se guardan en el backend (ver preguntas). Requiere una tabla `Favorito` (cambio en `models.py`, en `main`). |
| PUT | `/cliente/favoritos/{comercio_id}` | `clienteAgregarFavorito` | ⏳ ídem |
| DELETE | `/cliente/favoritos/{comercio_id}` | `clienteQuitarFavorito` | ⏳ ídem |
| GET | `/cliente/pedidos` | `clienteMisPedidos` | Existe en el andamiaje; fuera del MVP |

## Criterios de aceptación

- [ ] Con el filtro "abierto hoy" activo solo aparecen comercios cuyo `dias_operacion` incluye el día de hoy.
- [ ] Se puede filtrar por categoría y por alcaldía, y los filtros se combinan.
- [ ] Se pueden agregar mercados o tianguis a favoritos y quitarlos, y la lista sobrevive al recargar la página.
- [ ] "Cerca de mí" muestra primero los comercios más cercanos al cliente.
- [ ] Paso 2 del flujo demo (`compartido.md`): el cliente marca comercios como favoritos.

## Preguntas abiertas

- ¿La lista de favoritos se guarda en `localStorage` o en el backend? Si es en el backend, sobrevive al cambiar de dispositivo, pero requiere la tabla `Favorito`.
- ¿Qué significa "cerca de mí"? ¿Misma alcaldía que el usuario (`Usuario.alcaldia`, ya existe) o distancia por geolocalización del teléfono?
