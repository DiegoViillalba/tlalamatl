import { useQuery } from '@tanstack/react-query'
import { clienteMisPedidosOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { EstadoPedidoBadge } from '@/components/estado-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { fechaCorta, pesos } from '@/lib/formato'

export function MisPedidos() {
  const pedidos = useQuery(clienteMisPedidosOptions())

  return (
    <>
      <Encabezado titulo="Mis pedidos" />
      <div className="space-y-3">
        {pedidos.isPending && <Skeleton className="h-20 w-full" />}
        {pedidos.data?.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes pedidos.</p>}
        {pedidos.data?.map((p) => (
          <Card key={p.id} size="sm">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium">Pedido #{p.id}</p>
                <p className="text-xs text-muted-foreground">{fechaCorta(p.creado_en)}</p>
                <p className="text-sm">{pesos(p.items.reduce((t, i) => t + i.cantidad * i.precio_unitario, 0))}</p>
              </div>
              <EstadoPedidoBadge estado={p.estado} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
