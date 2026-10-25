"""Datos demo de la CDMX. Idempotente: borra y recrea todas las tablas.

Uso: `make seed` (o `uv run python seed.py` dentro de backend/).
Archivo COMPARTIDO: si tu rol necesita más datos, agrégalos en `main` (ver AGENTS.md).
"""

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
    Producto,
    Proveedor,
    Rol,
    TipoProveedor,
    Usuario,
    ahora,
)

TODOS_LOS_DIAS = list(Dia)
DIAS = list(Dia)


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
    # Oferta: (producto, unidad, precio_mayoreo, cantidad_minima)
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
        for producto, unidad, precio, minimo in ofs:
            o = OfertaProveedor(
                proveedor_id=prov.id,
                producto=producto,
                unidad=unidad,
                precio_mayoreo=precio,
                cantidad_minima=minimo,
            )
            session.add(o)
            ofertas[prov.id].append(o)
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
