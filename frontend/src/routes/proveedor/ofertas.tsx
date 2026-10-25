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
  publicoListarProductosBaseOptions,
} from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { CreditosImagenes, ImagenProducto } from '@/components/imagen-producto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
        {ofertas.data && <CreditosImagenes nombres={ofertas.data.map((o) => o.producto)} />}
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
        <div className="flex items-start gap-3">
          <ImagenProducto nombre={oferta.producto} className="size-16" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{oferta.producto}</p>
            <p className="text-sm text-muted-foreground">
              {pesos(oferta.precio_mayoreo)} por {oferta.unidad} · mínimo {oferta.cantidad_minima} {oferta.unidad}
            </p>
            {oferta.disponible && !oferta.producto_base_id && (
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                Fuera del dashboard de precios: elige un producto del catálogo al editarla.
              </p>
            )}
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
  const catalogo = useQuery({ ...publicoListarProductosBaseOptions(), staleTime: Infinity })
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('')
  // 'auto' = el backend lo busca por el nombre; 'ninguno' = quitar el enlace; si no, el id del producto base.
  const [base, setBase] = useState('auto')
  // Al abrir otra oferta (o una nueva), los campos parten de los datos de esa oferta.
  const [abierta, setAbierta] = useState<Edicion>(null)
  if (edicion !== abierta) {
    setAbierta(edicion)
    setNombre(oferta?.producto ?? '')
    setUnidad(oferta?.unidad ?? '')
    setBase(oferta?.producto_base_id ? String(oferta.producto_base_id) : 'auto')
  }

  function elegirBase(valor: string) {
    setBase(valor)
    const elegido = catalogo.data?.find((b) => String(b.id) === valor)
    if (!elegido) return
    // Solo rellena lo que todavía está vacío: no pisa lo que la persona ya escribió.
    if (!nombre.trim()) setNombre(elegido.nombre)
    if (!unidad.trim()) setUnidad(elegido.unidad)
  }

  const crear = useMutation(proveedorCrearOfertaMutation())
  const actualizar = useMutation(proveedorActualizarOfertaMutation())
  const guardando = crear.isPending || actualizar.isPending

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const body = {
      producto: nombre.trim(),
      unidad: unidad.trim(),
      precio_mayoreo: Number(datos.get('precio_mayoreo')),
      cantidad_minima: Number(datos.get('cantidad_minima')),
      disponible: datos.get('disponible') === 'on',
      ...(base === 'ninguno' ? { sin_catalogo: true } : base !== 'auto' ? { producto_base_id: Number(base) } : {}),
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
            <div className="flex items-center gap-3">
              <ImagenProducto nombre={nombre} className="size-12" />
              <Input
                id="producto"
                name="producto"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Jitomate saladet"
              />
            </div>
            <p className="text-xs text-muted-foreground">Foto ilustrativa que verán los comercios, según el nombre.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="catalogo">Producto del catálogo</Label>
            <Select value={base} onValueChange={elegirBase}>
              <SelectTrigger id="catalogo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (según el nombre)</SelectItem>
                {oferta && <SelectItem value="ninguno">Sin catálogo</SelectItem>}
                {catalogo.data?.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Así tu precio de mayoreo aparece en el dashboard de precios junto al de otros proveedores.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unidad">Unidad</Label>
              <Input id="unidad" required value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="kg" />
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
