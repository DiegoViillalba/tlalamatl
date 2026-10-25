import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import type { OfertaProveedor } from '@/api'
import {
  proveedorActualizarOfertaMutation,
  proveedorCrearOfertaMutation,
  proveedorEliminarOfertaMutation,
  proveedorListarOfertasOptions,
  proveedorListarOfertasQueryKey,
} from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeError } from '@/lib/api'
import { pesos } from '@/lib/formato'

// null = formulario cerrado, 'nueva' = alta, una oferta = edición.
type Edicion = OfertaProveedor | 'nueva' | null

export function MisOfertas() {
  const ofertas = useQuery(proveedorListarOfertasOptions())
  const [edicion, setEdicion] = useState<Edicion>(null)

  return (
    <>
      <Encabezado titulo="Mis ofertas">
        Tus precios de mayoreo. Los comercios los ven al pedirte y alimentan el dashboard de precios.
      </Encabezado>
      <div className="space-y-4">
        <Button className="w-full" onClick={() => setEdicion('nueva')}>
          <Plus />
          Nueva oferta
        </Button>

        {ofertas.isPending && <Skeleton className="h-32 w-full" />}
        {ofertas.isError && <p className="text-sm text-destructive">{mensajeError(ofertas.error)}</p>}
        {ofertas.data?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aún no publicas ofertas.</p>
        )}
        {ofertas.data?.map((oferta) => (
          <TarjetaOferta key={oferta.id} oferta={oferta} onEditar={() => setEdicion(oferta)} />
        ))}
      </div>

      <FormularioOferta edicion={edicion} onCerrar={() => setEdicion(null)} />
    </>
  )
}

function useRefrescarOfertas() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: proveedorListarOfertasQueryKey() })
}

function TarjetaOferta({ oferta, onEditar }: { oferta: OfertaProveedor; onEditar: () => void }) {
  const refrescar = useRefrescarOfertas()
  const [confirmando, setConfirmando] = useState(false)
  const id = oferta.id!

  const cambiarDisponible = useMutation({
    ...proveedorActualizarOfertaMutation(),
    onError: (e) => toast.error(mensajeError(e)),
    onSettled: refrescar,
  })
  const eliminar = useMutation({
    ...proveedorEliminarOfertaMutation(),
    onSuccess: () => toast.success('Oferta eliminada'),
    onError: (e) => {
      toast.error(mensajeError(e))
      setConfirmando(false)
    },
    onSettled: refrescar,
  })

  return (
    <Card className={oferta.disponible ? undefined : 'opacity-70'}>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{oferta.producto}</p>
            <p className="text-sm text-muted-foreground">
              {pesos(oferta.precio_mayoreo)} por {oferta.unidad} · mínimo {oferta.cantidad_minima} {oferta.unidad}
            </p>
          </div>
          <Badge variant={oferta.disponible ? 'secondary' : 'outline'}>
            {oferta.disponible ? 'Disponible' : 'No disponible'}
          </Badge>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={cambiarDisponible.isPending}
            onClick={() => cambiarDisponible.mutate({ path: { oferta_id: id }, body: { disponible: !oferta.disponible } })}
          >
            {oferta.disponible ? 'Marcar no disponible' : 'Marcar disponible'}
          </Button>
          <Button variant="outline" size="sm" onClick={onEditar} aria-label={`Editar ${oferta.producto}`}>
            <Pencil />
          </Button>
          {confirmando ? (
            <Button
              variant="destructive"
              size="sm"
              disabled={eliminar.isPending}
              onClick={() => eliminar.mutate({ path: { oferta_id: id } })}
            >
              Confirmar
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmando(true)} aria-label={`Eliminar ${oferta.producto}`}>
              <Trash2 />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FormularioOferta({ edicion, onCerrar }: { edicion: Edicion; onCerrar: () => void }) {
  const oferta = edicion && edicion !== 'nueva' ? edicion : null
  const refrescar = useRefrescarOfertas()

  const crear = useMutation(proveedorCrearOfertaMutation())
  const actualizar = useMutation(proveedorActualizarOfertaMutation())
  const guardando = crear.isPending || actualizar.isPending

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const body = {
      producto: String(datos.get('producto')).trim(),
      unidad: String(datos.get('unidad')).trim(),
      precio_mayoreo: Number(datos.get('precio_mayoreo')),
      cantidad_minima: Number(datos.get('cantidad_minima')),
      disponible: datos.get('disponible') === 'on',
    }
    const opciones = {
      onSuccess: () => {
        toast.success(oferta ? 'Oferta actualizada' : 'Oferta publicada')
        refrescar()
        onCerrar()
      },
      onError: (err: unknown) => toast.error(mensajeError(err)),
    }
    if (oferta) actualizar.mutate({ path: { oferta_id: oferta.id! }, body }, opciones)
    else crear.mutate({ body }, opciones)
  }

  return (
    <Dialog open={edicion !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{oferta ? 'Editar oferta' : 'Nueva oferta'}</DialogTitle>
          <DialogDescription>Precio de mayoreo y cantidad mínima por pedido.</DialogDescription>
        </DialogHeader>
        {/* key: reinicia los campos al cambiar de oferta */}
        <form key={oferta?.id ?? 'nueva'} onSubmit={guardar} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="producto">Producto</Label>
            <Input id="producto" name="producto" required defaultValue={oferta?.producto} placeholder="Jitomate saladet" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unidad">Unidad</Label>
              <Input id="unidad" name="unidad" required defaultValue={oferta?.unidad} placeholder="kg" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="precio_mayoreo">Precio por unidad (MXN)</Label>
              <Input
                id="precio_mayoreo"
                name="precio_mayoreo"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                defaultValue={oferta?.precio_mayoreo}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cantidad_minima">Cantidad mínima</Label>
            <Input
              id="cantidad_minima"
              name="cantidad_minima"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              required
              defaultValue={oferta?.cantidad_minima}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="disponible" defaultChecked={oferta?.disponible ?? true} className="size-4" />
            Disponible ahora
          </label>
          <DialogFooter>
            <Button type="submit" disabled={guardando} className="w-full">
              {oferta ? 'Guardar cambios' : 'Publicar oferta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
