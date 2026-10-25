import { useQuery } from '@tanstack/react-query'
import { proveedorMiPerfilOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Pendiente } from '@/components/pendiente'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TIPOS_PROVEEDOR } from '@/lib/formato'

export function Ordenes() {
  const perfil = useQuery(proveedorMiPerfilOptions())

  return (
    <>
      <Encabezado titulo="Órdenes de abasto" />
      <div className="space-y-4">
        {perfil.isPending && <Skeleton className="h-24 w-full" />}
        {perfil.data && (
          <Card>
            <CardHeader>
              <Badge variant="secondary">{TIPOS_PROVEEDOR[perfil.data.tipo]}</Badge>
              <CardTitle className="text-lg">{perfil.data.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{perfil.data.zona}</CardContent>
          </Card>
        )}
        <Pendiente titulo="Órdenes recibidas y avance de estado" doc="docs/alcance/proveedor.md" />
      </div>
    </>
  )
}
