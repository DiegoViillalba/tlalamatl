import type { EstadoPedido } from '@/api'
import { Badge } from '@/components/ui/badge'
import { ESTADOS_ORDEN, ESTADOS_PEDIDO, type EstadoOrden } from '@/lib/formato'

const VARIANTE: Record<EstadoPedido, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  creado: 'default',
  aceptado: 'secondary',
  listo: 'secondary',
  entregado: 'outline',
  cancelado: 'destructive',
}

export function EstadoPedidoBadge({ estado }: { estado: EstadoPedido }) {
  return <Badge variant={VARIANTE[estado]}>{ESTADOS_PEDIDO[estado]}</Badge>
}

const VARIANTE_ORDEN: Record<EstadoOrden, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  solicitada: 'default',
  confirmada: 'secondary',
  enviada: 'secondary',
  recibida: 'outline',
  rechazada: 'destructive',
}

export function EstadoOrdenBadge({ estado }: { estado: EstadoOrden }) {
  return <Badge variant={VARIANTE_ORDEN[estado]}>{ESTADOS_ORDEN[estado]}</Badge>
}
