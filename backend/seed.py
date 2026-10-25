"""Datos demo de la CDMX. Idempotente: borra y recrea todas las tablas.

Uso: `make seed` (o `uv run python seed.py` dentro de backend/).
Archivo COMPARTIDO: si tu rol necesita más datos, agrégalos en `main` (ver AGENTS.md).
"""

import math
from datetime import timedelta

from faker import Faker
from sqlmodel import Session, SQLModel

from app.db import engine
from app.models import (
    Categoria,
    Comentario,
    Comercio,
    Dia,
    EstadoOrden,
    EstadoPedido,
    Favorito,
    OfertaProveedor,
    OrdenAbasto,
    OrdenAbastoItem,
    Pedido,
    PedidoItem,
    PrecioHistorico,
    Producto,
    ProductoBase,
    Proveedor,
    Rol,
    TipoProveedor,
    Usuario,
    ahora,
)

TODOS_LOS_DIAS = list(Dia)
DIAS = list(Dia)


# Catálogo común de productos: (nombre, unidad, categoría, canasta básica, meses de temporada).
# Lista de meses vacía = todo el año. Temporadas aproximadas para México central.
PRODUCTOS_BASE = [
    ("Jitomate", "kg", "verdura", True, []),
    ("Cebolla", "kg", "verdura", True, []),
    ("Chile serrano", "kg", "verdura", True, []),
    ("Papa", "kg", "verdura", True, []),
    ("Zanahoria", "kg", "verdura", True, []),
    ("Calabacita", "kg", "verdura", True, [5, 6, 7, 8, 9, 10]),
    ("Lechuga", "pieza", "verdura", False, []),
    ("Cilantro", "manojo", "verdura", False, []),
    ("Nopal", "kg", "verdura", False, [3, 4, 5, 6, 7, 8, 9, 10]),
    ("Brócoli", "kg", "verdura", False, [10, 11, 12, 1, 2, 3]),
    ("Chayote", "kg", "verdura", False, [8, 9, 10, 11, 12]),
    ("Jícama", "kg", "verdura", False, [10, 11, 12, 1, 2, 3, 4]),
    ("Limón", "kg", "fruta", True, []),
    ("Plátano", "kg", "fruta", True, []),
    ("Aguacate", "kg", "fruta", True, []),
    ("Papaya", "kg", "fruta", False, []),
    ("Manzana", "kg", "fruta", True, [9, 10, 11, 12]),
    ("Naranja", "kg", "fruta", True, [10, 11, 12, 1, 2, 3]),
    ("Mandarina", "kg", "fruta", False, [10, 11, 12, 1]),
    ("Guayaba", "kg", "fruta", False, [9, 10, 11, 12, 1, 2]),
    ("Granada", "kg", "fruta", False, [8, 9, 10, 11]),
    ("Mango", "kg", "fruta", False, [3, 4, 5, 6, 7, 8]),
    ("Fresa", "kg", "fruta", False, [12, 1, 2, 3, 4, 5]),
    ("Piña", "pieza", "fruta", False, [3, 4, 5, 6, 7]),
    ("Frijol", "kg", "abarrote", True, []),
    ("Arroz", "kg", "abarrote", True, []),
    ("Azúcar", "kg", "abarrote", True, []),
    ("Chile guajillo", "kg", "abarrote", False, []),
    ("Chile ancho", "kg", "abarrote", False, []),
    ("Chile de árbol", "kg", "abarrote", False, []),
    ("Pimienta gorda", "kg", "abarrote", False, []),
    ("Pechuga de pollo", "kg", "proteina", True, []),
    ("Pierna y muslo", "kg", "proteina", True, []),
    ("Huevo", "kg", "proteina", True, []),
]

# Nombre del producto de un comercio u oferta -> producto base. Si no está aquí, se busca el mismo nombre.
ALIAS_BASE = {
    "Jitomate saladet": "Jitomate",
    "Cebolla blanca": "Cebolla",
    "Nopales limpios": "Nopal",
    "Papaya maradol": "Papaya",
    "Plátano tabasco": "Plátano",
    "Limón con semilla": "Limón",
    "Lechuga romana": "Lechuga",
    "Mango ataulfo": "Mango",
    "Piña miel": "Piña",
    "Aguacate hass": "Aguacate",
    "Huevo blanco": "Huevo",
    "Papa blanca": "Papa",
    "Frijol negro": "Frijol",
    "Arroz súper extra": "Arroz",
    "Azúcar estándar": "Azúcar",
}


SEMANAS_HISTORIAL = 12


def factor_temporada(meses: list[int], mes: int) -> float:
    """Cuánto cuesta el producto ese mes respecto a un precio base: más barato en temporada, más caro fuera."""
    if not meses:
        return 1 + 0.03 * math.sin(mes / 12 * 2 * math.pi)  # casi plano todo el año
    if mes in meses:
        return 0.82
    vecino = {(m % 12) + 1 for m in meses} | {((m - 2) % 12) + 1 for m in meses}
    return 1.0 if mes in vecino else 1.18


def ruido(producto_base_id: int, semana: int) -> float:
    """Ruido pequeño (±2%) pero determinista: depende solo del producto y de la semana."""
    x = math.sin(producto_base_id * 12.9898 + semana * 78.233) * 43758.5453
    return (x - math.floor(x) - 0.5) * 0.04


def telefono_ficticio(n: int) -> str:
    """Número de 10 dígitos claramente falso: en la CDMX ningún número local empieza con 0 (55 00xx xxxx)."""
    return f"5500{n:06d}"


def dia_relativo(hoy: Dia, desplazamiento: int) -> Dia:
    return DIAS[(DIAS.index(hoy) + desplazamiento) % 7]


def sembrar(session: Session, hoy: Dia | None = None) -> None:
    """Llena la sesión con datos demo. `hoy` permite fijar el día (tests)."""
    hoy = hoy or Dia.hoy()
    fake = Faker("es_MX")
    Faker.seed(42)

    def usuario(rol: Rol, n: int, alcaldia: str) -> Usuario:
        u = Usuario(nombre=fake.name(), email=f"{rol.value}{n}@tlalamatl.demo", rol=rol, alcaldia=alcaldia)
        session.add(u)
        session.flush()
        return u

    # --- Clientes ---------------------------------------------------------------------
    clientes = [
        usuario(Rol.cliente, 1, "Iztapalapa"),
        usuario(Rol.cliente, 2, "Coyoacán"),
        usuario(Rol.cliente, 3, "Benito Juárez"),
    ]

    # --- Catálogo común de productos --------------------------------------------------
    bases: dict[str, ProductoBase] = {}
    for nombre, unidad, categoria, canasta, meses in PRODUCTOS_BASE:
        base = ProductoBase(
            nombre=nombre, unidad=unidad, categoria=categoria, canasta_basica=canasta, meses_temporada=meses
        )
        session.add(base)
        bases[nombre] = base
    session.flush()

    def base_id(nombre: str) -> int | None:
        base = bases.get(ALIAS_BASE.get(nombre, nombre))
        return base.id if base else None

    # --- Comercios (2 por categoría) --------------------------------------------------
    # (categoría, nombre, alcaldía, ubicación, lat, lng, días, productos)
    # Producto: (nombre, precio, stock, unidad, stock_minimo)
    comercios_def = [
        (
            Categoria.tianguis,
            "Verduras Doña Mary",
            "Iztapalapa",
            "Tianguis de Santa Cruz Meyehualco, calle 79, puesto 23",
            19.3720, -99.0560,
            # Siempre incluye hoy para que el flujo demo funcione cualquier día.
            sorted({hoy, dia_relativo(hoy, 3)}, key=DIAS.index),
            [
                ("Jitomate saladet", 28, 8, "kg", 5),
                ("Cebolla blanca", 24, 15, "kg", 5),
                ("Chile serrano", 45, 6, "kg", 2),
                ("Cilantro", 10, 20, "manojo", 5),
                ("Nopales limpios", 35, 10, "kg", 3),
                ("Chayote", 22, 3, "kg", 4),
                ("Jícama", 20, 12, "kg", 4),
            ],
        ),
        (
            Categoria.tianguis,
            "Chiles Secos y Especias Rosita",
            "Gustavo A. Madero",
            "Tianguis de la Lindavista, Av. Montevideo, puesto 8",
            19.4880, -99.1290,
            [dia_relativo(hoy, 2)],
            [
                ("Chile guajillo", 160, 12, "kg", 3),
                ("Chile ancho", 180, 9, "kg", 3),
                ("Chile de árbol", 150, 5, "kg", 2),
                ("Pimienta gorda", 220, 4, "kg", 1),
            ],
        ),
        (
            Categoria.mercado_sobre_ruedas,
            "Frutas y Verduras Don Chuy",
            "Benito Juárez",
            "Mercado sobre ruedas ruta Narvarte, calle Pitágoras",
            19.3960, -99.1540,
            [dia_relativo(hoy, 1), dia_relativo(hoy, 4)],
            [
                ("Papaya maradol", 30, 25, "kg", 5),
                ("Plátano tabasco", 22, 30, "kg", 8),
                ("Limón con semilla", 32, 18, "kg", 5),
                ("Zanahoria", 18, 20, "kg", 5),
                ("Naranja", 14, 40, "kg", 10),
                ("Mandarina", 28, 4, "kg", 5),
                ("Guayaba", 30, 15, "kg", 5),
                ("Manzana", 45, 20, "kg", 6),
            ],
        ),
        (
            Categoria.mercado_sobre_ruedas,
            "Hortalizas Martínez",
            "Tlalpan",
            "Mercado sobre ruedas ruta Villa Coapa, calle Calzada del Hueso",
            19.3020, -99.1270,
            [dia_relativo(hoy, 2), dia_relativo(hoy, 5)],
            [
                ("Lechuga romana", 15, 30, "pieza", 8),
                ("Brócoli", 38, 12, "kg", 4),
                ("Calabacita", 26, 14, "kg", 4),
                ("Chayote", 24, 10, "kg", 4),
                ("Jícama", 18, 15, "kg", 4),
            ],
        ),
        (
            Categoria.mercado_fijo,
            "Frutería La Güera",
            "Coyoacán",
            "Mercado de Coyoacán, local 112",
            19.3500, -99.1620,
            TODOS_LOS_DIAS,
            [
                ("Mango ataulfo", 40, 30, "kg", 8),
                ("Fresa", 60, 10, "kg", 3),
                ("Piña miel", 35, 15, "pieza", 4),
                ("Aguacate hass", 70, 12, "kg", 4),
                ("Granada", 55, 8, "kg", 3),
                ("Guayaba", 38, 3, "kg", 4),
                ("Manzana", 52, 10, "kg", 4),
                ("Mandarina", 32, 12, "kg", 4),
                ("Plátano tabasco", 25, 4, "kg", 8),
                ("Limón con semilla", 36, 9, "kg", 4),
            ],
        ),
        (
            Categoria.mercado_fijo,
            "Pollería El Güero",
            "Venustiano Carranza",
            "Mercado de Jamaica, local 45",
            19.4100, -99.1220,
            [Dia.mar, Dia.mie, Dia.jue, Dia.vie, Dia.sab, Dia.dom],
            [
                ("Pechuga de pollo", 120, 20, "kg", 5),
                ("Pierna y muslo", 85, 18, "kg", 5),
                ("Huevo blanco", 48, 40, "kg", 10),
            ],
        ),
        (
            Categoria.central_abasto,
            "Bodega Hermanos Ramírez",
            "Iztapalapa",
            "Central de Abasto, pasillo I-J, bodega 45",
            19.3740, -99.0910,
            TODOS_LOS_DIAS,
            [
                ("Jitomate saladet", 19, 300, "kg", 50),
                ("Papa blanca", 17, 400, "kg", 80),
                ("Cebolla blanca", 15, 250, "kg", 50),
                ("Naranja", 9, 600, "kg", 100),
                ("Manzana", 32, 200, "kg", 40),
                ("Zanahoria", 11, 300, "kg", 60),
                ("Limón con semilla", 22, 150, "kg", 40),
                ("Plátano tabasco", 16, 350, "kg", 70),
            ],
        ),
        (
            Categoria.central_abasto,
            "Abarrotes y Semillas La Ceiba",
            "Iztapalapa",
            "Central de Abasto, sector abarrotes, bodega 112",
            19.3710, -99.0880,
            [Dia.lun, Dia.mar, Dia.mie, Dia.jue, Dia.vie, Dia.sab],
            [
                ("Frijol negro", 32, 500, "kg", 100),
                ("Arroz súper extra", 26, 450, "kg", 100),
                ("Azúcar estándar", 28, 300, "kg", 60),
                ("Huevo blanco", 38, 20, "kg", 100),
            ],
        ),
    ]

    comercios: list[Comercio] = []
    productos: dict[int, list[Producto]] = {}
    for i, (categoria, nombre, alcaldia, ubicacion, lat, lng, dias, prods) in enumerate(comercios_def, 1):
        dueno = usuario(Rol.comerciante, i, alcaldia)
        comercio = Comercio(
            dueno_id=dueno.id,
            nombre=nombre,
            categoria=categoria,
            alcaldia=alcaldia,
            ubicacion=ubicacion,
            lat=lat,
            lng=lng,
            dias_operacion=dias,
            telefono=telefono_ficticio(100 + i),
            # Un puesto sin WhatsApp, para que la ficha contemple ese caso.
            whatsapp=None if nombre == "Pollería El Güero" else telefono_ficticio(100 + i),
        )
        session.add(comercio)
        session.flush()
        comercios.append(comercio)
        productos[comercio.id] = []
        for p_nombre, precio, stock, unidad, minimo in prods:
            p = Producto(
                comercio_id=comercio.id,
                producto_base_id=base_id(p_nombre),
                nombre=p_nombre,
                precio=precio,
                stock=stock,
                unidad=unidad,
                stock_minimo=minimo,
            )
            session.add(p)
            productos[comercio.id].append(p)
    session.flush()

    # --- Proveedores ------------------------------------------------------------------
    # (nombre, tipo, zona, alcaldía del usuario, ofertas)
    # Oferta: (producto, unidad, precio_mayoreo, cantidad_minima[, disponible])
    proveedores_def = [
        (
            "Distribuidora Hortícola del Valle",
            TipoProveedor.mayorista,
            "Central de Abasto, Iztapalapa",
            "Iztapalapa",
            [
                ("Jitomate saladet", "kg", 16, 20),
                ("Cebolla blanca", "kg", 13, 20),
                ("Chile serrano", "kg", 30, 10),
                ("Papa blanca", "kg", 14, 50),
                ("Zanahoria", "kg", 9, 50),
                ("Chayote", "kg", 14, 30),
                ("Plátano tabasco", "kg", 12, 50),
            ],
        ),
        (
            "Abarrotera Mayorista San Juan",
            TipoProveedor.mayorista,
            "Centro Histórico, Cuauhtémoc",
            "Cuauhtémoc",
            [
                ("Frijol negro", "kg", 27, 50),
                ("Arroz súper extra", "kg", 21, 50),
                ("Chile guajillo", "kg", 130, 5),
                ("Azúcar estándar", "kg", 23, 50),
                ("Huevo blanco", "kg", 36, 30),
            ],
        ),
        (
            "Cooperativa Hortalizas de Xochimilco",
            TipoProveedor.productor,
            "Chinampas de Xochimilco",
            "Xochimilco",
            [
                ("Cilantro", "manojo", 5, 50),
                ("Lechuga romana", "pieza", 8, 40),
                ("Nopales limpios", "kg", 20, 20),
                ("Jícama", "kg", 12, 30),
                ("Brócoli", "kg", 24, 20),
                ("Zanahoria", "kg", 10, 40),
            ],
        ),
        (
            "Aguacateros de Uruapan",
            TipoProveedor.productor,
            "Uruapan, Michoacán",
            "Cuauhtémoc",
            [
                ("Aguacate hass", "kg", 48, 30),
                ("Limón con semilla", "kg", 20, 30),
                ("Guayaba", "kg", 20, 30),
                ("Mandarina", "kg", 18, 30),
                ("Mango ataulfo", "kg", 26, 30),
                # Sin disponibilidad: no debe contar en el dashboard.
                ("Fresa", "kg", 38, 20, False),
            ],
        ),
    ]

    # Punto donde cada proveedor atiende o entrega en la CDMX (para el mapa).
    coordenadas_proveedor = {
        "Distribuidora Hortícola del Valle": (19.3748, -99.0918),  # Central de Abasto
        "Abarrotera Mayorista San Juan": (19.4295, -99.1430),  # Centro Histórico
        "Cooperativa Hortalizas de Xochimilco": (19.2640, -99.0960),  # zona chinampera
        "Aguacateros de Uruapan": (19.3705, -99.0865),  # punto de venta en la Central de Abasto
    }

    proveedores: list[Proveedor] = []
    ofertas: dict[int, list[OfertaProveedor]] = {}
    for i, (nombre, tipo, zona, alcaldia, ofs) in enumerate(proveedores_def, 1):
        u = usuario(Rol.proveedor, i, alcaldia)
        lat, lng = coordenadas_proveedor[nombre]
        prov = Proveedor(
            usuario_id=u.id,
            nombre=nombre,
            tipo=tipo,
            zona=zona,
            lat=lat,
            lng=lng,
            telefono=telefono_ficticio(200 + i),
            whatsapp=telefono_ficticio(200 + i),
        )
        session.add(prov)
        session.flush()
        proveedores.append(prov)
        ofertas[prov.id] = []
        for producto, unidad, precio, minimo, *resto in ofs:
            o = OfertaProveedor(
                proveedor_id=prov.id,
                producto_base_id=base_id(producto),
                producto=producto,
                unidad=unidad,
                precio_mayoreo=precio,
                cantidad_minima=minimo,
                disponible=resto[0] if resto else True,
            )
            session.add(o)
            ofertas[prov.id].append(o)
    session.flush()

    # --- Historial semanal de precios --------------------------------------------------
    # La última semana coincide con los precios actuales; hacia atrás se aplica la temporada y algo de ruido.
    hoy_fecha = ahora().date()
    for base in bases.values():
        menudeo = [p.precio for ps in productos.values() for p in ps if p.producto_base_id == base.id]
        mayoreo = [
            o.precio_mayoreo for os in ofertas.values() for o in os if o.producto_base_id == base.id and o.disponible
        ]
        if not menudeo:
            continue
        prom, minimo = sum(menudeo) / len(menudeo), min(menudeo)
        for atras in range(SEMANAS_HISTORIAL - 1, -1, -1):
            fecha = hoy_fecha - timedelta(weeks=atras)
            # Factor relativo al mes actual: 1.0 en la semana de hoy, sin ruido.
            k = 1.0
            if atras:
                k = factor_temporada(base.meses_temporada, fecha.month) / factor_temporada(
                    base.meses_temporada, hoy_fecha.month
                ) * (1 + ruido(base.id, atras))
            k_min = k * (1 + ruido(base.id, atras + 100) / 2) if atras else 1.0
            session.add(
                PrecioHistorico(
                    producto_base_id=base.id,
                    fecha=fecha,
                    menudeo_promedio=round(prom * k, 2),
                    menudeo_minimo=round(min(minimo * k_min, prom * k), 2),
                    mayoreo_promedio=round(sum(mayoreo) / len(mayoreo) * k, 2) if mayoreo else None,
                    mayoreo_minimo=round(min(mayoreo) * k, 2) if mayoreo else None,
                    n_muestras=len(menudeo),
                )
            )
    session.flush()

    # --- Pedidos en distintos estados -------------------------------------------------
    def pedido(cliente: Usuario, comercio: Comercio, estado: EstadoPedido, items, hace_horas: int) -> None:
        p = Pedido(
            cliente_id=cliente.id,
            comercio_id=comercio.id,
            estado=estado,
            creado_en=ahora() - timedelta(hours=hace_horas),
        )
        session.add(p)
        session.flush()
        for producto, cantidad in items:
            session.add(
                PedidoItem(pedido_id=p.id, producto_id=producto.id, cantidad=cantidad, precio_unitario=producto.precio)
            )

    mary, rosita, chuy, martinez, guera, guero, ramirez, ceiba = comercios
    pedido(clientes[1], guera, EstadoPedido.entregado, [(productos[guera.id][0], 2), (productos[guera.id][1], 1)], 50)
    pedido(clientes[0], guero, EstadoPedido.listo, [(productos[guero.id][0], 1.5)], 3)
    pedido(clientes[2], chuy, EstadoPedido.aceptado, [(productos[chuy.id][1], 2), (productos[chuy.id][2], 1)], 5)
    pedido(clientes[1], mary, EstadoPedido.creado, [(productos[mary.id][3], 2)], 1)
    pedido(clientes[0], ceiba, EstadoPedido.cancelado, [(productos[ceiba.id][0], 5)], 30)

    # --- Órdenes de abasto en distintos estados ---------------------------------------
    def orden(comercio: Comercio, prov: Proveedor, estado: EstadoOrden, items, hace_horas: int) -> None:
        o = OrdenAbasto(
            comercio_id=comercio.id,
            proveedor_id=prov.id,
            estado=estado,
            creado_en=ahora() - timedelta(hours=hace_horas),
        )
        session.add(o)
        session.flush()
        for oferta, cantidad in items:
            destino = next((p for p in productos[comercio.id] if p.nombre == oferta.producto), None)
            session.add(
                OrdenAbastoItem(
                    orden_id=o.id,
                    oferta_id=oferta.id,
                    producto_id=destino.id if destino else None,
                    cantidad=cantidad,
                    precio_unitario=oferta.precio_mayoreo,
                )
            )

    hortivalle, sanjuan, xochimilco, uruapan = proveedores
    orden(ramirez, hortivalle, EstadoOrden.recibida, [(ofertas[hortivalle.id][0], 100)], 72)
    orden(guera, uruapan, EstadoOrden.enviada, [(ofertas[uruapan.id][0], 30)], 20)
    orden(ceiba, sanjuan, EstadoOrden.confirmada, [(ofertas[sanjuan.id][0], 80)], 10)
    orden(martinez, xochimilco, EstadoOrden.solicitada, [(ofertas[xochimilco.id][1], 40)], 2)
    orden(rosita, sanjuan, EstadoOrden.rechazada, [(ofertas[sanjuan.id][2], 2)], 48)
    # Segunda orden confirmada en Iztapalapa (junto a la de La Ceiba): sirve para sugerir una ruta compartida.
    orden(mary, sanjuan, EstadoOrden.confirmada, [(ofertas[sanjuan.id][1], 60)], 6)

    # --- Favoritos y comentarios de clientes ------------------------------------------
    for cliente, favoritos in [(clientes[0], [mary, ramirez]), (clientes[1], [guera, mary]), (clientes[2], [chuy])]:
        for comercio in favoritos:
            session.add(Favorito(usuario_id=cliente.id, comercio_id=comercio.id, creado_en=ahora() - timedelta(days=3)))

    comentarios = [
        (clientes[1], mary, "La verdura siempre fresca y Doña Mary te aparta el cilantro si le avisas.", 30),
        (clientes[0], mary, "Buen precio en jitomate, llegar temprano porque se acaba.", 8),
        (clientes[1], guera, "El mango ataulfo está buenísimo esta temporada.", 26),
        (clientes[2], chuy, "Don Chuy da probadita de papaya. Los miércoles hay más variedad.", 50),
        (clientes[0], ramirez, "Precios de mayoreo aunque compres poquito, pero hay que llevar efectivo.", 72),
    ]
    for cliente, comercio, texto, hace_horas in comentarios:
        session.add(
            Comentario(
                usuario_id=cliente.id,
                comercio_id=comercio.id,
                texto=texto,
                creado_en=ahora() - timedelta(hours=hace_horas),
            )
        )

    session.commit()


def main() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        sembrar(session)
    print(f"Base de datos sembrada. Hoy es '{Dia.hoy().value}'.")


if __name__ == "__main__":
    main()
