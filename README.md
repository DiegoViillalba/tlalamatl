# Tlalamatl

*"Mapa de tierra"* en náhuatl. Es un prototipo de hackathon para la CDMX, pensado para vivir dentro de la App CDMX como webview.

### 👉 Demo en vivo: **[tlalamatl.vercel.app](https://tlalamatl.vercel.app/)**

Se abre en el celular o en el navegador, sin instalar nada y sin cuenta. En desktop la app se muestra dentro de un marco de teléfono.

## El problema y la idea

En la CDMX hay más de 1,500 tianguis, mercados públicos y mercados sobre ruedas, además de la Central de Abasto. Aun así, es difícil saber cuál abre hoy cerca de ti, cuánto cuesta lo que necesitas o dónde está más barato. Quien vende tampoco sabe dónde hay demanda, y quien produce al mayoreo depende de intermediarios.

**Tlalamatl no es una tienda en línea, es una plataforma de contacto.** Conecta a quienes compran, a quienes venden en tianguis y mercados, y a quienes producen o surten al mayoreo. La app muestra quién vende qué, dónde, cuándo y a qué precio. La compra se hace en persona, y el contacto es directo por **Llamar** o **WhatsApp**.

## Qué puedes probar (guion de 3 minutos)

1. **Sin cuenta, el mapa (`/`):** el mapa de la CDMX con **1,518 lugares reales** (1,137 tianguis, 329 mercados públicos, 51 mercados sobre ruedas y la Central de Abasto). Puedes buscar, filtrar por tipo o por "Abierto hoy" y centrar el mapa en tu ubicación. Al tocar un lugar se abre su ficha con puestos, productos, precios y botones de contacto.
2. **Sin cuenta, los precios (`/precios`):** el dashboard de precios.
   - *Para comprar:* productos de temporada y canasta básica, con precio mínimo y promedio y el comercio más barato.
   - **Canasta de temporada interactiva:** agregas o quitas productos y ves el total, el ahorro y a dónde ir a comprar.
   - **Historial de 12 semanas** de cada producto.
   - *Para vender:* precios de mayoreo y demanda, para comerciantes y productores.
3. **Cliente:** toca *Entrar* y elige un cliente demo. Puedes guardar mercados en **favoritos** (con la vista "Cerca de mí") y **dejar comentarios** que aparecen en la ficha pública.
4. **Proveedor:** entra como *Distribuidora Hortícola del Valle*.
   - **Órdenes de abasto:** confírmalas, recházalas o envíalas.
   - **Mis ofertas:** administra tus ofertas de mayoreo, que alimentan el dashboard de precios.
   - **Mis compradores:** consulta los comercios activos.
   - **Fletes compartidos:** junta pedidos de varios comercios cercanos en una sola ruta de entrega, y el costo del flete se reparte entre ellos.

El login es un **demo sin contraseña**: eliges un usuario sembrado por rol. Solo hace falta para favoritos y comentarios, y para que comerciantes y proveedores administren sus datos.

## Estado

| Parte | Estado |
|---|---|
| Mapa público con lugares reales, búsqueda, filtros, "abierto hoy" y ubicación | ✅ Hecho |
| Ficha del lugar con puestos, precios y contacto (Llamar / WhatsApp) | ✅ Hecho |
| Dashboard de precios: temporada, canasta básica, canasta interactiva e historial | ✅ Hecho |
| Cliente: favoritos ("Cerca de mí" y "Mis favoritos") y comentarios | ✅ Hecho |
| Proveedor: órdenes, ofertas, compradores y fletes compartidos | ✅ Hecho |
| Comerciante: tarjeta de "Mi puesto" | ✅ Hecho |
| Comerciante: editar precios, ver proveedores, pedir abasto y sumarse a fletes | 🚧 En construcción (el modelo y las reglas ya existen) |
| Login por correo sin contraseña (código de un solo uso, Supabase Auth), además del login demo | ✅ Hecho |
| Backend: 136 pruebas automatizadas | ✅ Pasan |

## Datos

- **Lugares reales:** tianguis, mercados públicos y mercados sobre ruedas de SEDECO ([Datos Abiertos CDMX](https://datos.cdmx.gob.mx/)), más la Central de Abasto de OpenStreetMap. La ficha cita la fuente.
- **Mock de demostración:** los puestos, productos, precios y contactos. Los precios se basan en precios reales y el historial de 12 semanas sigue un patrón de temporada. Los teléfonos son ficticios (`5500xxxxxx`, un rango que la CDMX no asigna).
- **Fotos ilustrativas** de productos de Wikimedia Commons con licencias abiertas. Sus créditos aparecen en cada pantalla que las usa.
- Tlalamatl tiene identidad propia: no usa logos ni la identidad gráfica oficial del Gobierno de la CDMX.

## Stack

- **Backend:** Python, FastAPI, SQLModel, Postgres (Supabase) o SQLite local, y pytest. Las máquinas de estado de órdenes y rutas se validan en el servidor; una transición inválida responde 409.
- **Frontend:** Vite, React, TypeScript estricto, Tailwind v4, shadcn/ui, TanStack Query y React Router. Es mobile-first, todo en español de México y con pesos MXN. El cliente de la API se genera desde OpenAPI.
- **Despliegue:** Vercel ([tlalamatl.vercel.app](https://tlalamatl.vercel.app/)).

## Equipo

Diego Villalba, Fernanda Pineda, Sebastián Díaz y Rick Hernández.

---

## Para desarrollar

Antes de contribuir, lee **[AGENTS.md](AGENTS.md)**.

### Levantarlo en menos de 5 minutos

Requisitos: [uv](https://docs.astral.sh/uv/), Node 20+ y `make`.

```bash
make install   # dependencias + cliente API generado
make dev       # API en http://localhost:8000 (docs en /docs) y app en http://localhost:5173
```

`make dev` siembra la base la primera vez. Para reiniciar los datos demo en cualquier momento, usa `make seed`.

| Comando | Qué hace |
|---|---|
| `make test` | Corre pytest |
| `make gen-api` | Regenera `frontend/src/api/` después de cambiar el backend |
| `make check` | Corre todo lo anterior más typecheck y build (antes de mergear) |
| `make deploy` | Despliega a producción en Vercel (ver abajo) |

### Desplegar en Vercel

Un solo proyecto de Vercel sirve las dos partes, configurado en `vercel.json`:

- **Frontend:** `frontend/dist` como sitio estático. El build genera el cliente API en el servidor de Vercel (exporta el OpenAPI con `uv run` y corre `npm run gen-api`), igual que `make gen-api`.
- **Backend:** `api/index.py` monta la app de FastAPI bajo `/api` como función Python. El frontend la consume con `VITE_API_URL=/api`, así que no hay CORS.
- **Base de datos:** la Postgres de Supabase, con `DATABASE_URL` en las variables de Vercel. Si falta, el disco de Vercel es efímero y se siembra una SQLite demo en `/tmp` en cada arranque en frío, perdiendo favoritos y comentarios.

Variables de entorno en Vercel (Production): `VITE_API_URL=/api` y `TLALAMATL_SECRET`. Para el login por correo se agregan `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_URL`.

```bash
make deploy   # con la CLI de Vercel ya autenticada (npx vercel@latest login) y el proyecto enlazado (.vercel/)
```

`make deploy` despliega desde una copia del repo sin `.git`. Hace falta porque en el plan Hobby Vercel bloquea los despliegues cuyo autor del commit no es el dueño de la cuenta, y el equipo hace commits con varias cuentas.

Al cambiar dependencias del backend, regenera `requirements.txt` (lo lee Vercel):

```bash
cd backend && uv export --no-dev --no-hashes --no-emit-project --no-editable -o ../requirements.txt
```

### Login por correo (opcional)

Sin configurar nada funciona el login demo. Para activar el login sin contraseña (código de un solo uso por correo, con Supabase Auth):

1. Copia `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env.local`, y llena las variables de Supabase.
2. En Supabase, edita las plantillas de correo **Confirm signup** (primer ingreso) y **Magic Link** (los siguientes) en *Authentication → Emails → Templates* para que muestren el código `{{ .Token }}`.
3. Configura un SMTP propio en *Authentication → Emails → SMTP Settings*. El que trae Supabase tiene un límite muy bajo de envíos.

Al primer ingreso, el correo se liga al usuario que ya tenga ese email. Si no existe, se crea como cliente.

### Cómo trabajamos

Cada integrante tiene un giro y su propia rama:

| Rama | Giro |
|---|---|
| `rol/cliente` | Clientes |
| `rol/comercio` | Comerciantes |
| `rol/proveedor` | Proveedores |

La **zona compartida** (modelos, auth, seed, shell del frontend, componentes shadcn, AGENTS.md…) debe ser **idéntica en todas las ramas**. Solo se cambia en `main`, y luego cada quien hace `git merge main`. Los detalles están en [AGENTS.md → Trabajo en ramas](AGENTS.md#trabajo-en-ramas-léelo-antes-de-tocar-código).

```bash
git switch rol/comercio   # tu rama
git merge main            # sincroniza la zona compartida
make gen-api              # regenera el cliente API (no se versiona)
```

### Alcance de cada interfaz

El alcance vive en `docs/alcance/` y **manda** sobre cualquier suposición. Los agentes de IA lo leen antes de trabajar en cada rol.

- [cliente.md](docs/alcance/cliente.md)
- [comercio.md](docs/alcance/comercio.md)
- [proveedor.md](docs/alcance/proveedor.md)
- [compartido.md](docs/alcance/compartido.md): mapa, dashboard de precios, login, estados y fletes compartidos

Todos usan la misma plantilla: Objetivo, Usuario, MVP, Fuera de alcance, Pantallas, Endpoints, Criterios y Preguntas abiertas. Si un cambio de código altera el alcance, actualiza el doc en el mismo commit.
