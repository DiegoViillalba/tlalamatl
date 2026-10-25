# Tlalamatl

*"Mapa de tierra"* en náhuatl. Es un prototipo de hackathon: un marketplace de dos niveles para la CDMX, pensado para vivir dentro de la App CDMX como webview.

- **Clientes** compran a **comerciantes** de la Central de Abasto, mercados fijos, mercados sobre ruedas y tianguis.
- **Comerciantes** se abastecen con **proveedores** (productores, mayoristas y almacenes).

Es una sola app con login demo por rol. Todo es mock. Antes de contribuir, lee **[AGENTS.md](AGENTS.md)**.

## Levantarlo en menos de 5 minutos

Requisitos: [uv](https://docs.astral.sh/uv/), Node 20+ y `make`.

```bash
make install   # dependencias + cliente API generado
make dev       # API en http://localhost:8000 (docs en /docs) y app en http://localhost:5173
```

`make dev` siembra la base la primera vez. Para reiniciar los datos demo en cualquier momento, usa `make seed`.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `make test` | Corre pytest |
| `make gen-api` | Regenera `frontend/src/api/` después de cambiar el backend |
| `make check` | Corre todo lo anterior más typecheck y build (antes de mergear) |

## Cómo trabajamos

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

## Editar el alcance de cada interfaz

El alcance vive en `docs/alcance/`:

- [cliente.md](docs/alcance/cliente.md)
- [comercio.md](docs/alcance/comercio.md)
- [proveedor.md](docs/alcance/proveedor.md)
- [compartido.md](docs/alcance/compartido.md)

Todos usan la misma plantilla: Objetivo, Usuario, MVP, Fuera de alcance, Pantallas, Endpoints, Criterios y Preguntas abiertas. **Estos documentos mandan:** los agentes de IA los leen antes de trabajar en cada rol. `frontend/src/routes/<rol>/CLAUDE.md` los importa automáticamente.

Edítalos en tu rama como cualquier archivo. Si un cambio de código altera el alcance, actualiza el doc en el mismo commit.

## Guion del flujo demo

Esto funciona de punta a punta cuando las 3 ramas estén integradas en `main`. La fuente es `docs/alcance/compartido.md`.

1. **Mapa:** al entrar se ve el mapa de la CDMX con comercios y proveedores. Tocar uno abre su ficha.
2. **Cliente:** *Entrar como cliente*, explorar comercios (p. ej. "abierto hoy") y marcar tianguis o mercados como **favoritos**.
3. **Proveedor:** entrar como *Distribuidora Hortícola del Valle* y ver los **comercios que le compran** de manera activa.
4. **Comerciante:** entrar como el comerciante de *Verduras Doña Mary* y ver a los **proveedores** y sus ofertas.
5. **Todos:** abrir el **dashboard de precios** con los productos de temporada y la canasta básica.

## Estado actual

El repo tiene el **andamiaje**: modelo de datos completo, auth demo, máquinas de estado, seed, catálogo público, login, layouts por rol y una pantalla de ejemplo por rol que consume la API. Lo que falta de cada interfaz aparece como ⏳ en su doc de alcance y como marcador "Pantalla por construir" en la app.
