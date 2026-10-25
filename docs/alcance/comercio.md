# Alcance: interfaz del comercio

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/comercio`. También lee `docs/alcance/compartido.md`.

## Objetivo

Que quien atiende un puesto (tianguis, mercado sobre ruedas, mercado fijo o bodega de la Central) reciba y atienda pedidos, controle su inventario y se abastezca directo con proveedores cuando algo se le acaba.

## Usuario y contexto de uso

- Locatarias, locatarios y marchantes, muchas veces atendiendo el puesto mientras usan el celular.
- Necesitan ver de un vistazo qué hay pendiente y qué se está acabando.

## Funcionalidades incluidas (MVP)

- **Dashboard:** pedidos pendientes (`creado` y `aceptado`) y alertas de stock bajo (`stock < stock_minimo`).
- **Inventario:** CRUD de productos (nombre, precio, stock, unidad y stock mínimo).
- **Pedidos recibidos:** lista por estado, con acciones para avanzar (aceptar, listo, entregado, cancelar). Aceptar descuenta stock.
- **Abastecerme:** ver ofertas de proveedores (idealmente las que corresponden a productos con stock bajo), crear una orden de abasto, ver mis órdenes y marcar `recibida` (suma stock).

## Fuera de alcance

- Reportes de ventas e historial contable.
- Varios comercios por usuario: hoy es uno por comerciante.
- Negociar precios con el proveedor.
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

1. **Inicio / dashboard (`/comercio`):** tarjeta del puesto, pedidos pendientes y stock bajo. *Hecha la versión inicial con la tarjeta del puesto; las métricas están pendientes.*
2. **Inventario (`/comercio/inventario`):** lista y formulario de producto. *Por hacer.*
3. **Pedidos (`/comercio/pedidos`):** lista por estado con acciones. *Por hacer.*
4. **Abastecerme (`/comercio/abastecerme`):** ofertas, crear orden y mis órdenes. *Por hacer.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/comercio/mi-comercio` | `comercioMiComercio` | ✅ hecho |
| GET | `/comercio/productos` | `comercioListarProductos` | ⏳ por crear |
| POST | `/comercio/productos` | `comercioCrearProducto` | ⏳ por crear |
| PATCH | `/comercio/productos/{id}` | `comercioActualizarProducto` | ⏳ por crear |
| DELETE | `/comercio/productos/{id}` | `comercioEliminarProducto` | ⏳ por crear |
| GET | `/comercio/alertas-stock` | `comercioAlertasStock` | ⏳ por crear |
| GET | `/comercio/pedidos` | `comercioListarPedidos` | ⏳ por crear |
| POST | `/comercio/pedidos/{id}/estado` | `comercioAvanzarPedido` | ⏳ por crear |
| GET | `/comercio/ofertas` | `comercioListarOfertas` | ⏳ por crear |
| GET | `/comercio/ordenes` | `comercioListarOrdenes` | ⏳ por crear |
| POST | `/comercio/ordenes` | `comercioCrearOrden` | ⏳ por crear |
| POST | `/comercio/ordenes/{id}/recibir` | `comercioRecibirOrden` | ⏳ por crear |

## Criterios de aceptación

- [ ] El dashboard muestra el número de pedidos pendientes y la lista de productos con stock bajo.
- [ ] Aceptar un pedido descuenta el stock; si no alcanza, se muestra un error (409) y el pedido no cambia.
- [ ] Una acción inválida (p. ej. pasar de `creado` a `entregado`) no se ofrece en la UI, y si llega al backend responde 409.
- [ ] Desde una alerta de stock bajo se llega a las ofertas de ese producto.
- [ ] Marcar una orden como `recibida` suma la cantidad al stock del producto.
- [ ] Pasos 2, 3 y la mitad del 4 del flujo demo.

## Preguntas abiertas

- ¿El `stock_minimo` lo define el comerciante por producto o es fijo?
- ¿Las ofertas se filtran por cercanía o zona del proveedor?
- ¿La orden de abasto puede incluir productos de varios proveedores? (Hoy el modelo dice que no: una orden = un proveedor).
