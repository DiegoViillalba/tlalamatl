# Alcance: interfaz del comercio

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/comercio`. También lee `docs/alcance/compartido.md`.

## Objetivo

Que quien atiende un puesto (tianguis, mercado sobre ruedas, mercado fijo o bodega de la Central) tenga su puesto **visible en el mapa** con ubicación, días y **precios actualizados**, para que la gente llegue a comprarle en persona. Además, que encuentre proveedores para abastecerse directo.

## Usuario y contexto de uso

- Locatarias, locatarios y marchantes, muchas veces atendiendo el puesto mientras usan el celular.
- Actualizan precios rápido (cambian con el día y la temporada) y quieren saber qué opina la gente de su puesto.

## Funcionalidades incluidas (MVP)

- **Mi puesto:** ver y editar los datos que salen en la ficha pública (nombre, ubicación en texto, días de operación, **teléfono y WhatsApp**).
- **Mis productos y precios:** CRUD de productos (nombre, precio y unidad). **Estos precios alimentan el dashboard de precios** público.
- **Proveedores:** ver proveedores y sus ofertas de mayoreo (producto, precio, cantidad mínima, zona).
- **Solicitar abasto:** enviar una orden de abasto a un proveedor y ver en qué estado va (`solicitada` → `confirmada` → `enviada` → `recibida`). Sin efecto en stock.
- **Contactar al proveedor:** botones Llamar y WhatsApp en cada proveedor, para dudas o para coordinar la entrega.
- **Comentarios de mi puesto:** leer lo que la gente comentó en mi ficha.

## Fuera de alcance

- Pedidos de clientes: la compra es en persona.
- Inventario con stock y alertas de stock bajo (herramienta a futuro). El campo `stock` sigue en el modelo, pero la UI no lo usa.
- Reportes de ventas e historial contable.
- Varios comercios por usuario: hoy es uno por comerciante.
- Negociar precios con el proveedor dentro de la app.
- Programar abastos recurrentes.

## Diferencias por categoría

Definan aquí si alguna categoría necesita algo distinto. Si una subsección queda vacía, esa categoría usa el comportamiento general.

### Central de Abasto

_(por definir)_

### Mercados fijos

_(por definir)_

### Mercados sobre ruedas

_(por definir)_

### Tianguis

_(por definir)_

## Pantallas

1. **Inicio (`/comercio`):** tarjeta del puesto (como se ve en el mapa) con "Editar" y comentarios recientes. *Hecha: tarjeta del puesto y comentarios recientes (reales, vía `publicoListarComentarios`); falta "Editar".*
2. **Mis precios (`/comercio/productos`):** lista de productos con precio editable rápido y formulario para agregar. *Mock: lista los productos reales (`publicoListarProductos`); editar, agregar y borrar solo cambian el estado local.*
3. **Proveedores (`/comercio/proveedores`):** proveedores con sus ofertas y botones "Solicitar abasto", Llamar y WhatsApp. *Mock: proveedores y ofertas copiados del seed en `routes/comercio/demo.tsx`.*
4. **Mis solicitudes (`/comercio/solicitudes`):** órdenes de abasto enviadas con su estado; marcar `recibida`. *Mock: solicitudes de ejemplo más las creadas en la sesión, en memoria.*

La navegación inferior queda así: Inicio, Mis precios, Proveedores, Solicitudes. Reemplaza a "Inventario", "Pedidos" y "Abastecerme" del andamiaje.

> Las pantallas mock muestran un aviso "Modo demo". Al crear cada endpoint de la tabla siguiente, cambia la pantalla para usarlo y quita su parte de `demo.tsx`.

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/comercio/mi-comercio` | `comercioMiComercio` | ✅ hecho |
| PATCH | `/comercio/mi-comercio` | `comercioActualizarMiComercio` | ⏳ por crear |
| GET | `/comercio/productos` | `comercioListarProductos` | ⏳ por crear |
| POST | `/comercio/productos` | `comercioCrearProducto` | ⏳ por crear |
| PATCH | `/comercio/productos/{id}` | `comercioActualizarProducto` | ⏳ por crear |
| DELETE | `/comercio/productos/{id}` | `comercioEliminarProducto` | ⏳ por crear |
| GET | `/comercio/proveedores` | `comercioListarProveedores` | ⏳ por crear: proveedores con sus ofertas disponibles |
| POST | `/comercio/ordenes` | `comercioCrearOrden` | ⏳ por crear; cuerpo `{ proveedor_id, items: [{ oferta_id, cantidad }] }` |
| GET | `/comercio/ordenes` | `comercioListarOrdenes` | ⏳ por crear |
| POST | `/comercio/ordenes/{id}/recibir` | `comercioRecibirOrden` | ⏳ por crear; solo cambia el estado (sin stock) |
| GET | `/comercio/comentarios` | `comercioListarComentarios` | ⏳ por crear (la tabla `Comentario` ya existe). |

## Criterios de aceptación

- [ ] Editar los datos del puesto (incluidos teléfono y WhatsApp) se refleja en la ficha pública del mapa.
- [ ] Cambiar el precio de un producto se refleja en el dashboard de precios.
- [ ] El comerciante ve a los proveedores con sus ofertas disponibles (las no disponibles no aparecen).
- [ ] Puede enviar una solicitud de abasto, y ve cuando el proveedor la confirma o la envía.
- [ ] Una acción inválida sobre una orden no se ofrece en la UI, y si llega al backend responde 409.
- [ ] Paso 3 del flujo demo (`compartido.md`): actualizar un precio y ver a los proveedores.

## Preguntas abiertas

- ¿Los proveedores se filtran por cercanía o por zona?
- ¿El comerciante puede responder comentarios?
- ¿Agregamos un campo "disponible hoy sí/no" al producto, en lugar del stock?
