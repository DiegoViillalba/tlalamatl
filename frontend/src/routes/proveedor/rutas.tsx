import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Truck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import type { EstadoRuta, OrdenRecibida, RutaLeer, RutaSugerida } from '@/api'
import {
  proveedorAvanzarRutaMutation,
  proveedorCrearRutaMutation,
  proveedorListarOrdenesQueryKey,
  proveedorListarRutasOptions,
  proveedorListarRutasQueryKey,
  proveedorResponderSolicitudFleteMutation,
  proveedorSugerirRutasOptions,
  proveedorSugerirRutasQueryKey,
} from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mensajeError } from '@/lib/api'
import { fechaCorta, pesos } from '@/lib/formato'
import { Contacto } from './contacto'

const ESTADOS_RUTA: Record<EstadoRuta, string> = {
  abierta: 'Abierta',
  en_camino: 'En camino',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const VARIANTE_RUTA: Record<EstadoRuta, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  abierta: 'default',
  en_camino: 'secondary',
  completada: 'outline',
  cancelada: 'destructive',
}

/** "2026-10-26" -> "lun 26 oct" (la fecha de la ruta no trae hora, así que no se pasa por Date en UTC). */
function fechaRuta(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}

function subtotal(orden: OrdenRecibida) {
  return orden.items.reduce((suma, i) => suma + i.cantidad * i.precio_unitario, 0)
}

/** Fecha local como "AAAA-MM-DD", dentro de `dias` días. */
function enDias(dias: number) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function useRefrescarRutas() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: proveedorListarRutasQueryKey() }),
      queryClient.invalidateQueries({ queryKey: proveedorSugerirRutasQueryKey() }),
      queryClient.invalidateQueries({ queryKey: proveedorListarOrdenesQueryKey() }),
    ])
}

type Pestana = 'sugeridas' | 'mis-rutas'

export function Rutas() {
  const sugeridas = useQuery(proveedorSugerirRutasOptions())
  const rutas = useQuery(proveedorListarRutasOptions())
  const [pestana, setPestana] = useState<Pestana>('sugeridas')
  const [armando, setArmando] = useState<RutaSugerida | null>(null)

  const abiertas = (rutas.data ?? []).filter((r) => r.estado === 'abierta')
  const pendientes = abiertas.reduce((n, r) => n + r.solicitudes.length, 0)

  return (
    <>
      <Encabezado titulo="Fletes compartidos">
        Entrega a varios comercios cercanos en un solo viaje. El costo del flete se reparte entre los comercios de la ruta.
      </Encabezado>
      <div className="space-y-4">
        <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
          <TabsList className="w-full">
            <TabsTrigger value="sugeridas" className="flex-1">
              Sugeridas
              {sugeridas.data && sugeridas.data.length > 0 && (
                <span className="ml-1 text-xs text-primary">{sugeridas.data.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mis-rutas" className="flex-1">
              Mis rutas
              {pendientes > 0 && <span className="ml-1 text-xs text-primary">{pendientes}</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {pestana === 'sugeridas' && (
          <>
            {sugeridas.isPending && <Skeleton className="h-40 w-full" />}
            {sugeridas.isError && <p className="text-sm text-destructive">{mensajeError(sugeridas.error)}</p>}
            {sugeridas.data?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay sugerencias. Aparecen cuando tienes órdenes confirmadas de 2 o más comercios de la misma alcaldía.
              </p>
            )}
            {sugeridas.data?.map((sugerida) => (
              <TarjetaSugerida key={sugerida.zona} sugerida={sugerida} onCrear={() => setArmando(sugerida)} />
            ))}
          </>
        )}

        {pestana === 'mis-rutas' && (
          <>
            {rutas.isPending && <Skeleton className="h-40 w-full" />}
            {rutas.isError && <p className="text-sm text-destructive">{mensajeError(rutas.error)}</p>}
            {rutas.data?.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Todavía no has creado rutas.</p>
            )}
            {rutas.data?.map((ruta) => <TarjetaRuta key={ruta.id} ruta={ruta} />)}
          </>
        )}
      </div>

      <FormularioRuta sugerida={armando} onCerrar={() => setArmando(null)} onCreada={() => setPestana('mis-rutas')} />
    </>
  )
}

function TarjetaSugerida({ sugerida, onCrear }: { sugerida: RutaSugerida; onCrear: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="size-4 text-primary" />
          {sugerida.zona}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {sugerida.comercios} comercios · {sugerida.ordenes.length} {sugerida.ordenes.length === 1 ? 'orden' : 'órdenes'} confirmadas
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1 text-sm">
          {sugerida.ordenes.map((orden) => (
            <li key={orden.id} className="flex justify-between gap-2">
              <span>{orden.comercio.nombre}</span>
              <span className="text-muted-foreground">{pesos(subtotal(orden))}</span>
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={onCrear}>
          Armar ruta
        </Button>
      </CardContent>
    </Card>
  )
}

function FormularioRuta({
  sugerida,
  onCerrar,
  onCreada,
}: {
  sugerida: RutaSugerida | null
  onCerrar: () => void
  onCreada: () => void
}) {
  const refrescar = useRefrescarRutas()
  const crear = useMutation(proveedorCrearRutaMutation())
  // Órdenes desmarcadas; por defecto va toda la sugerencia.
  const [fuera, setFuera] = useState<Set<number>>(new Set())
  const [costo, setCosto] = useState('')

  const ordenes = sugerida?.ordenes ?? []
  const incluidas = ordenes.filter((o) => !fuera.has(o.id))
  const comercios = new Set(incluidas.map((o) => o.comercio_id)).size
  const costoNum = Number(costo) || 0

  function alternar(id: number) {
    setFuera((anterior) => {
      const nuevo = new Set(anterior)
      if (!nuevo.delete(id)) nuevo.add(id)
      return nuevo
    })
  }

  function cerrar() {
    setFuera(new Set())
    setCosto('')
    onCerrar()
  }

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const nota = String(datos.get('nota')).trim()
    crear.mutate(
      {
        body: {
          orden_ids: incluidas.map((o) => o.id),
          fecha: String(datos.get('fecha')),
          costo_flete: costoNum,
          zona: sugerida?.zona,
          nota: nota || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Ruta creada. Los comercios ya pueden pedir sumarse.')
          refrescar()
          cerrar()
          onCreada()
        },
        onError: (err) => toast.error(mensajeError(err)),
      },
    )
  }

  return (
    <Dialog open={sugerida !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Armar ruta en {sugerida?.zona}</DialogTitle>
          <DialogDescription>Elige las órdenes que van en este viaje y cuánto cuesta el flete.</DialogDescription>
        </DialogHeader>
        <form key={sugerida?.zona ?? 'cerrada'} onSubmit={guardar} className="space-y-3">
          <ul className="space-y-1.5 text-sm">
            {ordenes.map((orden) => (
              <li key={orden.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={!fuera.has(orden.id)}
                    onChange={() => alternar(orden.id)}
                  />
                  <span className="flex-1">{orden.comercio.nombre}</span>
                  <span className="text-muted-foreground">{pesos(subtotal(orden))}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Día de salida</Label>
              <Input id="fecha" name="fecha" type="date" required min={enDias(0)} defaultValue={enDias(1)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costo_flete">Costo del flete (MXN)</Label>
              <Input
                id="costo_flete"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" name="nota" placeholder="Salgo a las 7 am de la nave 4" />
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            {comercios > 0
              ? `${pesos(costoNum / comercios)} de flete por comercio (${comercios} ${comercios === 1 ? 'comercio' : 'comercios'}).`
              : 'Elige al menos una orden.'}
            <span className="block text-xs text-muted-foreground">
              Si otro comercio se suma, el flete se vuelve a repartir.
            </span>
          </p>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={crear.isPending || incluidas.length === 0}>
              Crear ruta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TarjetaRuta({ ruta }: { ruta: RutaLeer }) {
  const refrescar = useRefrescarRutas()
  const avanzar = useMutation({
    ...proveedorAvanzarRutaMutation(),
    onSuccess: (r) =>
      toast.success(
        r.estado === 'en_camino' ? 'Ruta en camino: las órdenes pasaron a enviadas' : r.estado === 'completada' ? 'Ruta completada' : 'Ruta cancelada',
      ),
    onError: (e) => toast.error(mensajeError(e)),
    onSettled: refrescar,
  })
  const responder = useMutation({
    ...proveedorResponderSolicitudFleteMutation(),
    onSuccess: (_r, v) => toast.success(v.body.estado === 'aceptada' ? 'Comercio sumado a la ruta' : 'Solicitud rechazada'),
    onError: (e) => toast.error(mensajeError(e)),
    onSettled: refrescar,
  })
  const [cancelando, setCancelando] = useState(false)
  const ocupado = avanzar.isPending || responder.isPending

  return (
    <Card className={ruta.estado === 'cancelada' ? 'opacity-70' : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {ruta.zona} · {fechaRuta(ruta.fecha)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ruta #{ruta.id} · creada {fechaCorta(ruta.creado_en)}
            </p>
          </div>
          <Badge variant={VARIANTE_RUTA[ruta.estado]}>{ESTADOS_RUTA[ruta.estado]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {ruta.nota && <p className="text-sm text-muted-foreground">{ruta.nota}</p>}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted px-3 py-2 text-center text-xs">
          <div>
            <p className="text-sm font-medium">{pesos(ruta.costo_flete)}</p>
            <p className="text-muted-foreground">Flete total</p>
          </div>
          <div>
            <p className="text-sm font-medium">{ruta.comercios}</p>
            <p className="text-muted-foreground">{ruta.comercios === 1 ? 'Comercio' : 'Comercios'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{pesos(ruta.cuota_flete)}</p>
            <p className="text-muted-foreground">Por comercio</p>
          </div>
        </div>

        {ruta.paradas.length > 0 && (
          <ul className="space-y-3">
            {ruta.paradas.map((parada, i) => (
              <li key={parada.comercio.id} className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {i + 1}. {parada.comercio.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">{parada.comercio.ubicacion}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{pesos(parada.subtotal)}</p>
                    <p>Flete {pesos(parada.cuota_flete)}</p>
                  </div>
                </div>
                {ruta.estado !== 'completada' && (
                  <Contacto telefono={parada.comercio.telefono} whatsapp={parada.comercio.whatsapp} />
                )}
              </li>
            ))}
          </ul>
        )}

        {ruta.solicitudes.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">Quieren sumarse</p>
            {ruta.solicitudes.map((sol) => (
              <div key={sol.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-between gap-2 text-sm">
                  <span>{sol.comercio.nombre}</span>
                  <span className="text-muted-foreground">{pesos(sol.subtotal)}</span>
                </div>
                {sol.cuota_si_se_suma !== null && (
                  <p className="text-xs text-muted-foreground">
                    Con este comercio, el flete baja a {pesos(sol.cuota_si_se_suma)} por comercio.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={ocupado}
                    onClick={() => responder.mutate({ path: { solicitud_id: sol.id }, body: { estado: 'aceptada' } })}
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={ocupado}
                    onClick={() => responder.mutate({ path: { solicitud_id: sol.id }, body: { estado: 'rechazada' } })}
                  >
                    Rechazar
                  </Button>
                </div>
                <Contacto telefono={sol.comercio.telefono} whatsapp={sol.comercio.whatsapp} />
              </div>
            ))}
          </div>
        )}

        {ruta.estado === 'abierta' && (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={ocupado}
              onClick={() => avanzar.mutate({ path: { ruta_id: ruta.id }, body: { estado: 'en_camino' } })}
            >
              Salir en camino
            </Button>
            {cancelando ? (
              <Button
                variant="destructive"
                disabled={ocupado}
                onClick={() => avanzar.mutate({ path: { ruta_id: ruta.id }, body: { estado: 'cancelada' } })}
              >
                Confirmar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setCancelando(true)}>
                Cancelar
              </Button>
            )}
          </div>
        )}
        {ruta.estado === 'en_camino' && (
          <Button
            className="w-full"
            disabled={ocupado}
            onClick={() => avanzar.mutate({ path: { ruta_id: ruta.id }, body: { estado: 'completada' } })}
          >
            Marcar como completada
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
