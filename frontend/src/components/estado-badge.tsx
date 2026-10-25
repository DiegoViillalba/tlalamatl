import type { EstadoPedido } from '@/api'
import { Badge } from '@/components/ui/badge'
import { ESTADOS_PEDIDO } from '@/lib/formato'

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
