import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { comercioMiComercioOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Pendiente } from '@/components/pendiente'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORIAS, DIAS } from '@/lib/formato'

export function Inicio() {
  const comercio = useQuery(comercioMiComercioOptions())

  return (
    <>
      <Encabezado titulo="Mi puesto" />
      <div className="space-y-4">
        {comercio.isPending && <Skeleton className="h-28 w-full" />}
        {comercio.data && (
          <Card>
            <CardHeader>
              <Badge variant="secondary">{CATEGORIAS[comercio.data.categoria]}</Badge>
              <CardTitle className="text-lg">{comercio.data.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5" />
                {comercio.data.ubicacion}
              </p>
              <p>Abre: {(comercio.data.dias_operacion ?? []).map((d) => DIAS[d]).join(' · ')}</p>
            </CardContent>
          </Card>
        )}
        <Pendiente titulo="Dashboard: pedidos pendientes y stock bajo" doc="docs/alcance/comercio.md" />
      </div>
    </>
  )
}
