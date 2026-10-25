import { useQuery } from '@tanstack/react-query'
import { MapPin, MessageCircle, Phone } from 'lucide-react'
import { comercioMiComercioOptions, publicoListarComentariosOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORIAS, DIAS, fechaCorta } from '@/lib/formato'

const COMENTARIOS_RECIENTES = 5

export function Inicio() {
  const comercio = useQuery(comercioMiComercioOptions())

  return (
    <>
      <Encabezado titulo="Mi puesto">Así te ve la gente en el mapa.</Encabezado>
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
              {comercio.data.telefono && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {comercio.data.telefono}
                  {comercio.data.whatsapp && ' · con WhatsApp'}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        {comercio.data?.id != null && <Comentarios comercioId={comercio.data.id} />}
      </div>
    </>
  )
}

function Comentarios({ comercioId }: { comercioId: number }) {
  const comentarios = useQuery(publicoListarComentariosOptions({ path: { comercio_id: comercioId } }))

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 font-heading font-semibold">
        <MessageCircle className="size-4 text-primary" />
        Lo que dice la gente
      </h2>
      {comentarios.isPending && <Skeleton className="h-20 w-full" />}
      {comentarios.data?.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">Todavía nadie comenta tu puesto.</p>
      )}
      {comentarios.data?.slice(0, COMENTARIOS_RECIENTES).map((c) => (
        <Card key={c.id} size="sm">
          <CardContent className="space-y-1 text-sm">
            <p>{c.texto}</p>
            <p className="text-xs text-muted-foreground">
              {c.nombre_usuario} · {fechaCorta(c.creado_en)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
