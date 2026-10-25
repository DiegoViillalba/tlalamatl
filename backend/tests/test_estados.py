import pytest
from fastapi import HTTPException

from app.estados import validar_orden, validar_pedido
from app.models import EstadoOrden as O
from app.models import EstadoPedido as P


@pytest.mark.parametrize(
    "actual,nuevo",
    [(P.creado, P.aceptado), (P.aceptado, P.listo), (P.listo, P.entregado), (P.creado, P.cancelado), (P.aceptado, P.cancelado)],
)
def test_transiciones_validas_pedido(actual, nuevo):
    validar_pedido(actual, nuevo)


@pytest.mark.parametrize(
    "actual,nuevo",
    [(P.creado, P.listo), (P.creado, P.entregado), (P.listo, P.cancelado), (P.entregado, P.creado), (P.cancelado, P.aceptado)],
)
def test_transiciones_invalidas_pedido(actual, nuevo):
    with pytest.raises(HTTPException) as e:
        validar_pedido(actual, nuevo)
    assert e.value.status_code == 409


@pytest.mark.parametrize(
    "actual,nuevo",
    [(O.solicitada, O.confirmada), (O.solicitada, O.rechazada), (O.confirmada, O.enviada), (O.enviada, O.recibida)],
)
def test_transiciones_validas_orden(actual, nuevo):
    validar_orden(actual, nuevo)


@pytest.mark.parametrize(
    "actual,nuevo",
    [(O.solicitada, O.enviada), (O.solicitada, O.recibida), (O.confirmada, O.rechazada), (O.recibida, O.solicitada), (O.rechazada, O.confirmada)],
)
def test_transiciones_invalidas_orden(actual, nuevo):
    with pytest.raises(HTTPException) as e:
        validar_orden(actual, nuevo)
    assert e.value.status_code == 409
