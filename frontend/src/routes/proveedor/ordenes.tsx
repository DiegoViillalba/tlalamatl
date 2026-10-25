import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { OrdenRecibida } from '@/api'
import {
  proveedorAvanzarOrdenMutation,
  proveedorListarOrdenesOptions,
  proveedorListarOrdenesQueryKey,
  proveedorMiPerfilOptions,
} from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { EstadoOrdenBadge } from '@/components/estado-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mensajeError } from '@/lib/api'
import { CATEGORIAS, fechaCorta, type EstadoOrden, pesos, TIPOS_PROVEEDOR } from '@/lib/formato'
import { Contacto } from './contacto'
import { useState } from 'react'

// Pestañas por lo que el proveedor tiene que hacer: nuevas por responder, confirmadas por enviar, el resto.
const PESTANAS = [
  { valor: 'nuevas', etiqueta: 'Nuevas', estados: ['solicitada'] },
  { valor: 'por-enviar', etiqueta: 'Por enviar', estados: ['confirmada'] },
  { valor: 'en-camino', etiqueta: 'Enviadas', estados: ['enviada'] },
  { valor: 'historial', etiqueta: 'Historial', estados: ['recibida', 'rechazada'] },
] as const satisfies readonly { valor: string; etiqueta: string; estados: readonly EstadoOrden[] }[]

type Pestana = (typeof PESTANAS)[number]['valor']

export function Ordenes() {
  const perfil = useQuery(proveedorMiPerfilOptions())
  const ordenes = useQuery(proveedorListarOrdenesOptions())
  const [pestana, setPestana] = useState<Pestana>('nuevas')

  const actual = PESTANAS.find((p) => p.valor === pestana)!
  const visibles = (ordenes.data ?? []).filter((o) => (actual.estados as readonly EstadoOrden[]).includes(o.estado))
  const cuenta = (estados: readonly EstadoOrden[]) =>
    (ordenes.data ?? []).filter((o) => estados.includes(o.estado)).length

  return (
    <>
      <Encabezado titulo="Órdenes de abasto">Los comercios que te piden mercancía.</Encabezado>
      <div className="space-y-4">
        {perfil.isPending && <Skeleton className="h-24 w-full" />}
        {perfil.data && (
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                {TIPOS_PROVEEDOR[perfil.data.tipo]}
              </Badge>
              <CardTitle className="text-lg">{perfil.data.nombre}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{perfil.data.zona}</p>
              <Contacto telefono={perfil.data.telefono ?? null} whatsapp={perfil.data.whatsapp ?? null} />
            </CardContent>
          </Card>
        )}

        <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
          <TabsList className="w-full">
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.valor} value={p.valor} className="flex-1">
                {p.etiqueta}
                {ordenes.data && p.valor !== 'historial' && cuenta(p.estados) > 0 && (
                  <span className="ml-1 text-xs text-primary">{cuenta(p.estados)}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {ordenes.isPending && <Skeleton className="h-40 w-full" />}
        {ordenes.isError && <p className="text-sm text-destructive">{mensajeError(ordenes.error)}</p>}
        {ordenes.data && visibles.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay órdenes en esta lista.</p>
        )}
        {visibles.map((orden) => (
          <TarjetaOrden key={orden.id} orden={orden} />
        ))}
      </div>
    </>
  )
}

function TarjetaOrden({ orden }: { orden: OrdenRecibida }) {
  const queryClient = useQueryClient()
  const avanzar = useMutation({
    ...proveedorAvanzarOrdenMutation(),
    onSuccess: (r) => {
      toast.success(
        r.estado === 'confirmada' ? 'Orden confirmada' : r.estado === 'enviada' ? 'Orden marcada como enviada' : 'Orden rechazada',
      )
    },
    onError: (e) => toast.error(mensajeError(e)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: proveedorListarOrdenesQueryKey() }),
  })

  function cambiar(estado: EstadoOrden) {
    avanzar.mutate({ path: { orden_id: orden.id }, body: { estado } })
  }

  const total = orden.items.reduce((suma, i) => suma + i.cantidad * i.precio_unitario, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{orden.comercio.nombre}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {CATEGORIAS[orden.comercio.categoria]} · {orden.comercio.alcaldia}
            </p>
          </div>
          <EstadoOrdenBadge estado={orden.estado} />
        </div>
        <p className="text-xs text-muted-foreground">
          Orden #{orden.id} · {fechaCorta(orden.creado_en)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {orden.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span>
                {item.producto} · {item.cantidad} {item.unidad}
              </span>
              <span className="text-muted-foreground">{pesos(item.cantidad * item.precio_unitario)}</span>
            </li>
          ))}
          <li className="flex justify-between border-t pt-1 font-medium">
            <span>Total</span>
            <span>{pesos(total)}</span>
          </li>
        </ul>

        {orden.estado === 'solicitada' && (
          <div className="flex gap-2">
            <Button className="flex-1" disabled={avanzar.isPending} onClick={() => cambiar('confirmada')}>
              Confirmar
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={avanzar.isPending}
              onClick={() => cambiar('rechazada')}
            >
              Rechazar
            </Button>
          </div>
        )}
        {orden.estado === 'confirmada' && (
          <Button className="w-full" disabled={avanzar.isPending} onClick={() => cambiar('enviada')}>
            Marcar como enviada
          </Button>
        )}
        {orden.estado === 'enviada' && (
          <p className="text-xs text-muted-foreground">En camino. El comercio la marca como recibida.</p>
        )}

        <Contacto telefono={orden.comercio.telefono} whatsapp={orden.comercio.whatsapp} />
      </CardContent>
    </Card>
  )
}
