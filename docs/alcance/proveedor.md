# Alcance: interfaz del proveedor

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `rol/proveedor`. También lee `docs/alcance/compartido.md`.

## Objetivo

Que productores, mayoristas y almacenes publiquen sus ofertas de mayoreo y atiendan las órdenes de abasto de los comercios de la CDMX sin intermediarios innecesarios.

## Usuario y contexto de uso

- Productores (p. ej. cooperativas de Xochimilco o aguacateros de Michoacán) y mayoristas de la Central de Abasto.
- Revisan órdenes varias veces al día y actualizan precios y disponibilidad según la cosecha o el inventario.

## Funcionalidades incluidas (MVP)

- **Mis ofertas:** CRUD de ofertas (producto genérico, unidad, precio de mayoreo, cantidad mínima y disponible sí/no).
- **Órdenes recibidas:** lista por estado con acciones: confirmar o rechazar una `solicitada` y enviar una `confirmada`.
- **Perfil:** nombre, tipo (productor, mayorista o almacén) y zona. *Hecho como tarjeta en Órdenes.*

## Fuera de alcance

- Logística, rutas o rastreo de envíos.
- Facturación y cobranza.
- Inventario detallado del proveedor (solo "disponible sí/no").
- Chat con el comercio.

## Pantallas

1. **Órdenes (`/proveedor`):** tarjeta de perfil y lista de órdenes por estado con acciones. *Versión inicial hecha solo con el perfil.*
2. **Detalle de orden (`/proveedor/ordenes/:id`):** comercio, items, total y acciones. *Por hacer.*
3. **Mis ofertas (`/proveedor/ofertas`):** lista y formulario. *Por hacer (hoy es un marcador `Pendiente`).*

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/proveedor/mi-perfil` | `proveedorMiPerfil` | ✅ hecho |
| GET | `/proveedor/ofertas` | `proveedorListarOfertas` | ⏳ por crear |
| POST | `/proveedor/ofertas` | `proveedorCrearOferta` | ⏳ por crear |
| PATCH | `/proveedor/ofertas/{id}` | `proveedorActualizarOferta` | ⏳ por crear |
| DELETE | `/proveedor/ofertas/{id}` | `proveedorEliminarOferta` | ⏳ por crear |
| GET | `/proveedor/ordenes` | `proveedorListarOrdenes` | ⏳ por crear |
| POST | `/proveedor/ordenes/{id}/estado` | `proveedorAvanzarOrden` | ⏳ por crear |

## Criterios de aceptación

- [ ] Una oferta marcada como no disponible deja de aparecer en "Abastecerme" del comercio.
- [ ] Solo se ofrecen las acciones válidas para el estado de la orden; una inválida responde 409.
- [ ] Un proveedor solo ve y modifica sus propias ofertas y órdenes (403/404 para las ajenas).
- [ ] Paso 4 del flujo demo: confirmar y enviar la orden del comercio.

## Preguntas abiertas

- ¿El proveedor puede ajustar la cantidad o el precio al confirmar?
- ¿Mostramos datos de contacto del comercio en el detalle de orden?
- ¿Las órdenes rechazadas piden un motivo?
