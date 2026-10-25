"""Máquinas de estado de Pedido y OrdenAbasto. Archivo COMPARTIDO."""

from fastapi import HTTPException, status

from app.models import EstadoOrden, EstadoPedido

TRANSICIONES_PEDIDO: dict[EstadoPedido, set[EstadoPedido]] = {
    EstadoPedido.creado: {EstadoPedido.aceptado, EstadoPedido.cancelado},
    EstadoPedido.aceptado: {EstadoPedido.listo, EstadoPedido.cancelado},
    EstadoPedido.listo: {EstadoPedido.entregado},
    EstadoPedido.entregado: set(),
    EstadoPedido.cancelado: set(),
}

TRANSICIONES_ORDEN: dict[EstadoOrden, set[EstadoOrden]] = {
    EstadoOrden.solicitada: {EstadoOrden.confirmada, EstadoOrden.rechazada},
    EstadoOrden.confirmada: {EstadoOrden.enviada},
    EstadoOrden.enviada: {EstadoOrden.recibida},
    EstadoOrden.recibida: set(),
    EstadoOrden.rechazada: set(),
}


def validar_pedido(actual: EstadoPedido, nuevo: EstadoPedido) -> None:
    """Lanza 409 si el pedido no puede pasar de `actual` a `nuevo`."""
    if nuevo not in TRANSICIONES_PEDIDO[actual]:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Un pedido no puede pasar de '{actual.value}' a '{nuevo.value}'"
        )


def validar_orden(actual: EstadoOrden, nuevo: EstadoOrden) -> None:
    """Lanza 409 si la orden de abasto no puede pasar de `actual` a `nuevo`."""
    if nuevo not in TRANSICIONES_ORDEN[actual]:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Una orden no puede pasar de '{actual.value}' a '{nuevo.value}'"
        )
