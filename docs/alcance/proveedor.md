# Alcance: interfaz del proveedor

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/proveedor`. También lee `docs/alcance/compartido.md`; el mapa y el dashboard de precios están definidos ahí.

## Objetivo

Que productores, mayoristas y almacenes publiquen sus ofertas de mayoreo, atiendan las órdenes de abasto de los comercios de la CDMX sin intermediarios innecesarios y abaraten sus entregas con rutas compartidas.

## Usuario y contexto de uso

- Productores (p. ej. cooperativas de Xochimilco o aguacateros de Michoacán) y mayoristas de la Central de Abasto.
- Revisan órdenes varias veces al día y actualizan precios y disponibilidad según la cosecha o el inventario.

## Funcionalidades incluidas (MVP)

- **Mis ofertas:** CRUD de ofertas (producto genérico, unidad, precio de mayoreo, cantidad mínima y disponible sí/no).
- **Órdenes recibidas:** lista por estado con acciones: confirmar o rechazar una `solicitada` y enviar una `confirmada`.
- **Mis compradores:** comercios que le compran de manera activa, es decir, con órdenes recientes no rechazadas.
- **Rutas compartidas de entrega:** agrupar órdenes de varios comerciantes cercanos en una sola ruta de entrega para abaratar costos.
- **Perfil:** nombre, tipo (productor, mayorista o almacén) y zona. *Hecho como tarjeta en Órdenes.*

## Fuera de alcance

- Facturación y cobranza.
- Inventario detallado del proveedor (solo "disponible sí/no").
- Chat con el comercio.

## Pantallas

1. **Órdenes (`/proveedor`):** tarjeta de perfil y lista de órdenes por estado con acciones. *Versión inicial hecha solo con el perfil.*
2. **Mis ofertas (`/proveedor/ofertas`):** lista y formulario. *Por hacer (hoy es un marcador `Pendiente`).*
3. **Mis compradores (`/proveedor/compradores`):** comercios activos con su categoría, alcaldía y última orden. *Por hacer.*
4. **Rutas (`/proveedor/rutas`):** rutas sugeridas (órdenes confirmadas agrupadas por cercanía) y rutas creadas. *Por hacer.*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/proveedor/mi-perfil` | `proveedorMiPerfil` | ✅ hecho |
| GET | `/proveedor/ofertas` | `proveedorListarOfertas` | ⏳ por crear |
| POST | `/proveedor/ofertas` | `proveedorCrearOferta` | ⏳ por crear |
| PATCH | `/proveedor/ofertas/{id}` | `proveedorActualizarOferta` | ⏳ por crear |
| DELETE | `/proveedor/ofertas/{id}` | `proveedorEliminarOferta` | ⏳ por crear |
| GET | `/proveedor/ordenes?estado` | `proveedorListarOrdenes` | ⏳ por crear |
| POST | `/proveedor/ordenes/{id}/estado` | `proveedorAvanzarOrden` | ⏳ por crear; cuerpo `{ estado }`, validado con `validar_orden()` |
| GET | `/proveedor/compradores` | `proveedorListarCompradores` | ⏳ por crear: comercios con órdenes no rechazadas en los últimos 30 días |
| GET | `/proveedor/rutas/sugeridas` | `proveedorSugerirRutas` | ⏳ por crear: órdenes `confirmadas` agrupadas por alcaldía |
| POST | `/proveedor/rutas` | `proveedorCrearRuta` | ⏳ por crear; cuerpo `{ orden_ids }`. Requiere una tabla `RutaEntrega` y `ruta_id` en `OrdenAbasto` (cambio en `models.py`, en `main`). |
| GET | `/proveedor/rutas` | `proveedorListarRutas` | ⏳ por crear |

## Criterios de aceptación

- [ ] Una oferta marcada como no disponible deja de aparecer en "Abastecerme" del comercio.
- [ ] Solo se ofrecen las acciones válidas para el estado de la orden; una inválida responde 409.
- [ ] Un proveedor solo ve y modifica sus propias ofertas, órdenes y rutas (403/404 para las ajenas).
- [ ] "Mis compradores" lista solo los comercios con órdenes activas de este proveedor.
- [ ] Se puede crear una ruta con órdenes confirmadas de 2 o más comercios, y la ruta muestra sus paradas.
- [ ] Paso 3 del flujo demo (`compartido.md`): el proveedor ve los comercios que le compran de manera activa.

## Preguntas abiertas

- Para las rutas, ¿basta con agrupar por alcaldía y mostrar la lista de paradas, o se espera dibujar la ruta en el mapa?
- ¿Cómo se reparte el ahorro de la ruta compartida entre los comerciantes? ¿Se muestra un costo estimado?
- ¿Qué cuenta como comprador "activo": órdenes en los últimos 30 días u órdenes en curso?
