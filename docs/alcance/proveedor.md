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
4. **Rutas (`/proveedor/rutas`):** pestaña *Sugeridas* (órdenes confirmadas agrupadas por alcaldía, con "Armar ruta": elige órdenes, día y costo del flete, y ve el flete por comercio en vivo) y pestaña *Mis rutas* (paradas con su subtotal y su cuota de flete, contacto, solicitudes de comercios que quieren sumarse con Aceptar/Rechazar, y las acciones Salir en camino, Cancelar y Marcar completada). *Hecha.*

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
| GET | `/proveedor/rutas/sugeridas` | `proveedorSugerirRutas` | ✅ hecho: órdenes `confirmadas` sin ruta agrupadas por alcaldía (solo zonas con 2 o más comercios) |
| POST | `/proveedor/rutas` | `proveedorCrearRuta` | ✅ hecho; cuerpo `{ orden_ids, fecha, costo_flete, zona?, nota? }` |
| GET | `/proveedor/rutas?estado` | `proveedorListarRutas` | ✅ hecho: cada ruta con paradas, cuota de flete y solicitudes pendientes |
| POST | `/proveedor/rutas/{id}/estado` | `proveedorAvanzarRuta` | ✅ hecho; cuerpo `{ estado }` (`en_camino`, `completada` o `cancelada`), validado con `validar_ruta()` |
| POST | `/proveedor/rutas/solicitudes/{id}/estado` | `proveedorResponderSolicitudFlete` | ✅ hecho; cuerpo `{ estado }` (`aceptada` o `rechazada`) |

Notas del backend:
- `GET /proveedor/ordenes` devuelve cada orden con el contacto del comercio (`comercio`: nombre, categoría, alcaldía, teléfono, WhatsApp) y, en cada item, el nombre y la unidad del producto.
- `POST /proveedor/ordenes/{id}/estado` responde 409 si la transición es inválida y 403 si el proveedor intenta marcar `recibida` (la hace el comercio).
- `DELETE /proveedor/ofertas/{id}` responde 409 si la oferta ya está en órdenes de abasto; hay que marcarla como no disponible.
- `GET /proveedor/compradores` devuelve `{ comercio, ordenes, ultima_orden }`, del más reciente al más antiguo.
- Los recursos de otro proveedor responden 404.
- **Fletes compartidos:** el costo se reparte en partes iguales entre los comercios distintos de la ruta (`cuota_flete`), y se recalcula al entrar un comercio. Al pasar la ruta a `en_camino`, sus órdenes `confirmadas` pasan a `enviada` y las solicitudes pendientes se rechazan; al cancelarla, las órdenes quedan libres. Una ruta puede crearse con un solo comercio para que otros se sumen. El lado comercio (ver rutas abiertas y pedir sumarse) está documentado en `compartido.md`, sección "Fletes compartidos", y lo implementa `rol/comercio`.

## Criterios de aceptación

- [ ] Una oferta marcada como no disponible deja de aparecer en "Proveedores" del comercio.
- [x] Solo se ofrecen las acciones válidas para el estado de la orden; una inválida responde 409.
- [x] Un proveedor solo ve y modifica sus propias ofertas, órdenes y rutas (403/404 para las ajenas).
- [x] "Mis compradores" lista solo los comercios con órdenes activas de este proveedor.
- [x] Se puede crear una ruta con órdenes confirmadas de 2 o más comercios, y la ruta muestra sus paradas.
- [ ] Cambiar el precio de mayoreo de una oferta se refleja en el dashboard de precios.
- [ ] Paso 4 del flujo demo (`compartido.md`): el proveedor ve los comercios que le compran de manera activa.

## Preguntas abiertas

- Para las rutas, ¿basta con agrupar por alcaldía y mostrar la lista de paradas, o se espera dibujar la ruta en el mapa?
- ~~¿Cómo se reparte el costo de la ruta?~~ Resuelto: en partes iguales por comercio, con la cuota visible en cada parada y la que tocaría a quien pide sumarse.
- ¿Qué cuenta como comprador "activo": órdenes en los últimos 30 días u órdenes en curso?
