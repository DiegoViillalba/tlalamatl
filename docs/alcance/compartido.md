# Alcance: reglas compartidas

> Estado: BORRADOR — editado por el equipo. Este archivo manda sobre cualquier suposición del agente.

Dueña: rama `main` (cambios por acuerdo del equipo; ver "Trabajo en ramas" en `AGENTS.md`).

## Objetivo

Definir lo que comparten las tres interfaces (cliente, comercio y proveedor) para que cada rama pueda avanzar sola y el merge final sea limpio. Incluye el login demo, la navegación, los estados de pedido y orden, y las reglas transversales.

## Usuario y contexto de uso

- Cualquier persona que abre Tlalamatl desde la App CDMX (webview móvil) o desde un navegador.
- Durante el hackathon, también quien presenta la demo y cambia de rol frente al jurado.

## Funcionalidades incluidas (MVP)

- **Login demo sin contraseña:** la pantalla de entrada lista los usuarios sembrados, agrupados por rol. Al elegir uno se obtiene un JWT (`sub`, `rol`) que se guarda en `localStorage`.
- **Guard por rol:** `/cliente/*`, `/comercio/*` y `/proveedor/*` solo los ve el rol correspondiente. Sin sesión se vuelve a la entrada; con otro rol se va al inicio de ese rol.
- **Layout común:** encabezado con la marca, el nombre del usuario y "Salir"; contenido con scroll; navegación inferior tipo app.
- **Simulación de teléfono:** en desktop la app ocupa como máximo 430 px de ancho con marco de teléfono. En móvil o webview ocupa toda la pantalla.
- **Máquinas de estado validadas en el backend** (`backend/app/estados.py`). Una transición inválida responde 409.

### Estados de Pedido (cliente → comercio)

```
creado ──► aceptado ──► listo ──► entregado
  │           │
  └──► cancelado ◄──┘
```

| Transición | Quién la hace | Efecto |
|---|---|---|
| (nuevo) → `creado` | cliente | — |
| `creado` → `aceptado` | comercio | **Descuenta stock** de cada producto; 409 si no alcanza |
| `aceptado` → `listo` | comercio | — |
| `listo` → `entregado` | comercio | — |
| `creado` → `cancelado` | cliente o comercio | — |
| `aceptado` → `cancelado` | comercio | Devuelve el stock descontado |

### Estados de OrdenAbasto (comercio → proveedor)

```
solicitada ──► confirmada ──► enviada ──► recibida
    │
    └──► rechazada
```

| Transición | Quién la hace | Efecto |
|---|---|---|
| (nueva) → `solicitada` | comercio | — |
| `solicitada` → `confirmada` / `rechazada` | proveedor | — |
| `confirmada` → `enviada` | proveedor | — |
| `enviada` → `recibida` | comercio | **Suma stock** al producto destino de cada item (si `producto_id` es nulo, busca por nombre o crea el producto) |

### Reglas transversales

- **Idioma y moneda:** todo en español de México, con pesos MXN (`pesos()` en `frontend/src/lib/formato.ts`).
- **"Abierto hoy":** el día de hoy aparece en `dias_operacion` del comercio, con la zona horaria `America/Mexico_City`.
- **Stock bajo:** `stock < stock_minimo`.
- **Identidad propia de Tlalamatl:** no se usan logos ni identidad gráfica oficial del Gobierno de la CDMX.
- **Datos:** todo es mock. `make seed` deja la base en un estado conocido, y el seed garantiza un tianguis abierto hoy.

## Fuera de alcance

- Contraseñas, registro de usuarios, recuperación de cuenta y auth real.
- Pagos en línea, facturación y envíos o logística real.
- Notificaciones push y tiempo real (websockets). Basta con refrescar o re-consultar.
- Integración real con la App CDMX: por ahora solo debe ser cargable como webview.
- Mapas interactivos: lat/lng existen en el modelo, pero no hay mapa.

## Pantallas

1. **Entrada (`/`):** marca Tlalamatl y una tarjeta "Entrar como…" por rol, con sus usuarios demo.
2. **Layout de rol:** encabezado, contenido y navegación inferior (lo usan las 3 interfaces).

## Endpoints que consume

| Método | Ruta | operationId (TS) | Estado |
|---|---|---|---|
| GET | `/auth/usuarios-demo` | `authUsuariosDemo` | ✅ hecho |
| POST | `/auth/demo-login` | `authDemoLogin` | ✅ hecho |
| GET | `/auth/yo` | `authYo` | ✅ hecho |
| GET | `/salud` | `sistemaSalud` | ✅ hecho |

## Criterios de aceptación

- [ ] La pantalla de entrada carga y muestra usuarios de los 3 roles.
- [ ] Elegir un usuario lleva al inicio de su rol, y recargar la página mantiene la sesión.
- [ ] Un cliente que entra a `/comercio` es redirigido a `/cliente`.
- [ ] "Salir" borra la sesión y vuelve a la entrada.
- [ ] Una transición de estado inválida responde 409 con un mensaje en español.
- [ ] **Flujo demo de punta a punta** (requiere las 3 ramas integradas):
  1. Un cliente pide productos a un puesto de tianguis abierto hoy.
  2. El comercio acepta el pedido; el stock baja y aparece una alerta de stock bajo.
  3. El comercio crea una orden de abasto a un proveedor mayorista.
  4. El proveedor la confirma y la envía; el comercio la marca recibida y su stock sube.

## Preguntas abiertas

- ¿El cliente puede cancelar un pedido ya aceptado?
- ¿Mostramos el total del pedido con costo de envío o solo el subtotal?
- ¿Hace falta un selector de alcaldía global (en el encabezado) o va solo en Explorar?
