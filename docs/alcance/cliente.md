# Alcance: interfaz del cliente

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/cliente`. También lee `docs/alcance/compartido.md`.

## Objetivo

Que una persona en la CDMX encuentre rápido qué tianguis, mercado o bodega de la Central de Abasto está abierto hoy cerca de ella, vea sus productos y precios y haga un pedido para recoger.

## Usuario y contexto de uso

- Vecinas y vecinos que compran despensa semanal o del día, desde el celular y dentro de la App CDMX.
- Uso rápido, a veces en la calle y con conexión limitada. Necesita textos claros y botones grandes.

## Funcionalidades incluidas (MVP)

- **Explorar comercios**, con filtros por categoría (Central de Abasto, mercado fijo, sobre ruedas, tianguis), por alcaldía y por "abierto hoy".
- **Ver el detalle de un comercio:** ubicación, días de operación y productos con precio, unidad y disponibilidad.
- **Carrito:** agregar y quitar productos y cambiar cantidades. Un carrito por comercio.
- **Confirmar pedido**, que se crea en estado `creado`.
- **Mis pedidos:** lista con estado (creado, aceptado, listo, entregado, cancelado) y detalle de items.

## Fuera de alcance

- Pagos en línea; se paga al recoger.
- Envío a domicilio.
- Reseñas o calificaciones de comercios.
- Comparar precios entre comercios.
- Mapa interactivo.

## Pantallas

1. **Explorar (`/cliente`):** lista de comercios con filtros. *Versión inicial hecha: lista sin filtros.*
2. **Detalle de comercio (`/cliente/comercio/:id`):** info y productos con "Agregar". *Por hacer.*
3. **Carrito (`/cliente/carrito`):** items, total y "Confirmar pedido". *Por hacer (hoy es un marcador `Pendiente`).*
4. **Mis pedidos (`/cliente/pedidos`):** lista con estado. *Versión inicial hecha.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/publico/comercios?categoria&alcaldia&abierto_hoy` | `publicoListarComercios` | ✅ hecho |
| GET | `/publico/comercios/{id}` | `publicoObtenerComercio` | ✅ hecho |
| GET | `/publico/comercios/{id}/productos` | `publicoListarProductos` | ✅ hecho |
| GET | `/cliente/pedidos` | `clienteMisPedidos` | ✅ hecho |
| POST | `/cliente/pedidos` | `clienteCrearPedido` | ⏳ por crear |
| POST | `/cliente/pedidos/{id}/cancelar` | `clienteCancelarPedido` | ⏳ por crear |

## Criterios de aceptación

- [ ] Con el filtro "abierto hoy" activo solo aparecen comercios cuyo `dias_operacion` incluye el día de hoy.
- [ ] Se puede filtrar por categoría y por alcaldía, y los filtros se combinan.
- [ ] El carrito sobrevive a navegar entre pantallas y se vacía al confirmar.
- [ ] Al confirmar, el pedido aparece en "Mis pedidos" con estado "Nuevo".
- [ ] Crear un pedido a un comercio cerrado hoy o con productos de otro comercio responde con un error claro.
- [ ] Paso 1 del flujo demo: el cliente pide a un tianguis abierto hoy.

## Preguntas abiertas

- ¿Validamos stock al crear el pedido o solo cuando el comercio lo acepta?
- ¿Permitimos pedir a un comercio que hoy está cerrado (para recoger otro día)?
- ¿El carrito se guarda en `localStorage` o solo en memoria?
