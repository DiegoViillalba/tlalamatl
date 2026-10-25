# Alcance: interfaz del proveedor

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/proveedor`. También lee `docs/alcance/compartido.md`; el mapa y el dashboard de precios están definidos ahí.

## Objetivo

Que productores, mayoristas y almacenes publiquen sus ofertas de mayoreo, atiendan las órdenes de abasto de los comercios de la CDMX sin intermediarios innecesarios y abaraten sus entregas con rutas compartidas.

## Usuario y contexto de uso

- Productores (p. ej. cooperativas de Xochimilco o aguacateros de Michoacán) y mayoristas de la Central de Abasto.
- Revisan órdenes varias veces al día y actualizan precios y disponibilidad según la cosecha o el inventario.

## Funcionalidades incluidas (MVP)

- **Mis ofertas:** CRUD de ofertas (producto genérico, unidad, precio de mayoreo, cantidad mínima y disponible sí/no). **Sus precios de mayoreo alimentan el dashboard de precios** público.
- **Órdenes recibidas:** lista por estado con acciones: confirmar o rechazar una `solicitada` y enviar una `confirmada`.
- **Mis compradores:** comercios que le compran de manera activa, es decir, con órdenes recientes no rechazadas.
- **Rutas compartidas de entrega:** agrupar órdenes de varios comerciantes cercanos en una sola ruta de entrega para abaratar costos.
- **Perfil:** nombre, tipo (productor, mayorista o almacén), zona, **teléfono y WhatsApp**. Es lo que se ve en su ficha pública. *Tarjeta en Órdenes, solo lectura; el `PATCH` ya existe en el backend pero no hay pantalla para editarlo.*
- **Contactar al comercio:** botones Llamar y WhatsApp en cada orden y en "Mis compradores".

## Fuera de alcance

- Facturación y cobranza.
- Inventario detallado del proveedor (solo "disponible sí/no").
- Chat con el comercio.

## Pantallas

1. **Órdenes (`/proveedor`):** tarjeta de perfil (solo lectura, con Llamar y WhatsApp) y órdenes en pestañas Nuevas, Por enviar, Enviadas e Historial. Cada orden muestra items, total, contacto del comercio y solo las acciones válidas (confirmar o rechazar una nueva; enviar una confirmada). *Hecha.*
2. **Mis ofertas (`/proveedor/ofertas`):** lista, alta y edición en un diálogo, cambio rápido de disponible y eliminación con confirmación. *Hecha.*
3. **Mis compradores (`/proveedor/compradores`):** comercios activos con su categoría, alcaldía, número de órdenes, última orden y contacto. *Hecha.*
4. **Rutas (`/proveedor/rutas`):** rutas sugeridas (órdenes confirmadas agrupadas por cercanía) y rutas creadas. *Por hacer.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/proveedor/mi-perfil` | `proveedorMiPerfil` | ✅ hecho |
| PATCH | `/proveedor/mi-perfil` | `proveedorActualizarMiPerfil` | ✅ hecho (backend) (zona, teléfono, WhatsApp) |
| GET | `/proveedor/ofertas` | `proveedorListarOfertas` | ✅ hecho (backend) |
| POST | `/proveedor/ofertas` | `proveedorCrearOferta` | ✅ hecho (backend) |
| PATCH | `/proveedor/ofertas/{id}` | `proveedorActualizarOferta` | ✅ hecho (backend) |
| DELETE | `/proveedor/ofertas/{id}` | `proveedorEliminarOferta` | ✅ hecho (backend) |
| GET | `/proveedor/ordenes?estado` | `proveedorListarOrdenes` | ✅ hecho (backend) |
| POST | `/proveedor/ordenes/{id}/estado` | `proveedorAvanzarOrden` | ✅ hecho (backend); cuerpo `{ estado }`, validado con `validar_orden()` |
| GET | `/proveedor/compradores` | `proveedorListarCompradores` | ✅ hecho (backend): comercios con órdenes no rechazadas en los últimos 30 días |
| GET | `/proveedor/rutas/sugeridas` | `proveedorSugerirRutas` | ⏳ por crear: órdenes `confirmadas` agrupadas por alcaldía |
| POST | `/proveedor/rutas` | `proveedorCrearRuta` | ⏳ por crear; cuerpo `{ orden_ids }`. Requiere una tabla `RutaEntrega` y `ruta_id` en `OrdenAbasto` (cambio en `models.py`, en `main`). |
| GET | `/proveedor/rutas` | `proveedorListarRutas` | ⏳ por crear |

Notas del backend:
- `GET /proveedor/ordenes` devuelve cada orden con el contacto del comercio (`comercio`: nombre, categoría, alcaldía, teléfono, WhatsApp) y, en cada item, el nombre y la unidad del producto.
- `POST /proveedor/ordenes/{id}/estado` responde 409 si la transición es inválida y 403 si el proveedor intenta marcar `recibida` (la hace el comercio).
- `DELETE /proveedor/ofertas/{id}` responde 409 si la oferta ya está en órdenes de abasto; hay que marcarla como no disponible.
- `GET /proveedor/compradores` devuelve `{ comercio, ordenes, ultima_orden }`, del más reciente al más antiguo.
- Los recursos de otro proveedor responden 404.

## Criterios de aceptación

- [ ] Una oferta marcada como no disponible deja de aparecer en "Proveedores" del comercio.
- [x] Solo se ofrecen las acciones válidas para el estado de la orden; una inválida responde 409.
- [ ] Un proveedor solo ve y modifica sus propias ofertas, órdenes y rutas (ofertas y órdenes ✅ con tests; faltan rutas) (403/404 para las ajenas).
- [x] "Mis compradores" lista solo los comercios con órdenes activas de este proveedor.
- [ ] Se puede crear una ruta con órdenes confirmadas de 2 o más comercios, y la ruta muestra sus paradas.
- [ ] Cambiar el precio de mayoreo de una oferta se refleja en el dashboard de precios.
- [ ] Paso 4 del flujo demo (`compartido.md`): el proveedor ve los comercios que le compran de manera activa.

## Preguntas abiertas

- Para las rutas, ¿basta con agrupar por alcaldía y mostrar la lista de paradas, o se espera dibujar la ruta en el mapa?
- ¿Cómo se reparte el ahorro de la ruta compartida entre los comerciantes? ¿Se muestra un costo estimado?
- ¿Qué cuenta como comprador "activo": órdenes en los últimos 30 días u órdenes en curso?
