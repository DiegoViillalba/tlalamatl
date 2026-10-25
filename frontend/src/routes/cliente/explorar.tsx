import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { publicoListarComerciosOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORIAS, DIAS } from '@/lib/formato'

// Versión inicial: solo lista. Filtros, detalle y carrito según docs/alcance/cliente.md.
export function Explorar() {
  const comercios = useQuery(publicoListarComerciosOptions())

  return (
    <>
      <Encabezado titulo="Explorar">Tianguis, mercados y la Central de Abasto cerca de ti.</Encabezado>
      <div className="space-y-3">
        {comercios.isPending && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        {comercios.data?.map((c) => (
          <Card key={c.id} size="sm">
            <CardContent className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{c.nombre}</p>
                {c.abierto_hoy ? <Badge>Abierto hoy</Badge> : <Badge variant="outline">Cerrado hoy</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{CATEGORIAS[c.categoria]} · {c.alcaldia}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {c.ubicacion}
              </p>
              <p className="text-xs">{c.dias_operacion.map((d) => DIAS[d]).join(' · ')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
