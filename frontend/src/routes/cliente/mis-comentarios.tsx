import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { clienteMisComentariosOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MisComentarios() {
  const comentarios = useQuery(clienteMisComentariosOptions())

  return (
    <>
      <Encabezado titulo="Mis comentarios" />
      <div className="space-y-3">
        {comentarios.isPending && <Skeleton className="h-24 w-full" />}
        {comentarios.isError && <p className="text-sm text-destructive">No pudimos cargar tus comentarios.</p>}
        {comentarios.data?.length === 0 && <p className="text-sm text-muted-foreground">Aún no has dejado comentarios.</p>}
        {comentarios.data?.map((comentario) => (
          <Card key={comentario.id} size="sm">
            <CardContent className="space-y-2">
              <div>
                <p className="font-medium">{comentario.comercio_nombre}</p>
                <time className="text-xs text-muted-foreground" dateTime={comentario.creado_en}>
                  {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(comentario.creado_en))}
                </time>
              </div>
              <p className="whitespace-pre-wrap">{comentario.texto}</p>
              <Button asChild size="sm" variant="link" className="h-auto px-0">
                <Link to={`/?comercio=${comentario.comercio_id}`}>
                  Ver ficha <ArrowUpRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}