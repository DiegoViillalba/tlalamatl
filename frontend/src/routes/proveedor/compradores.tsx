import { useQuery } from '@tanstack/react-query'
import { proveedorListarCompradoresOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeError } from '@/lib/api'
import { CATEGORIAS, fechaCorta } from '@/lib/formato'
import { Contacto } from './contacto'

export function Compradores() {
  const compradores = useQuery(proveedorListarCompradoresOptions())

  return (
    <>
      <Encabezado titulo="Mis compradores">Comercios con órdenes tuyas (no rechazadas) en los últimos 30 días.</Encabezado>
      <div className="space-y-4">
        {compradores.isPending && <Skeleton className="h-32 w-full" />}
        {compradores.isError && <p className="text-sm text-destructive">{mensajeError(compradores.error)}</p>}
        {compradores.data?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no tienes compradores activos. Cuando un comercio te haga una orden, aparecerá aquí.
          </p>
        )}
        {compradores.data?.map(({ comercio, ordenes, ultima_orden }) => (
          <Card key={comercio.id}>
            <CardHeader>
              <CardTitle className="text-base">{comercio.nombre}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {CATEGORIAS[comercio.categoria]} · {comercio.alcaldia}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{comercio.ubicacion}</p>
              <p className="text-xs text-muted-foreground">
                {ordenes} {ordenes === 1 ? 'orden' : 'órdenes'} · Última: {fechaCorta(ultima_orden)}
              </p>
              <Contacto telefono={comercio.telefono} whatsapp={comercio.whatsapp} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
