import { MapPin, Truck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Encabezado } from '@/components/encabezado'
import { CreditosImagenes, ImagenProducto } from '@/components/imagen-producto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { pesos, TIPOS_PROVEEDOR } from '@/lib/formato'
import { AvisoDemo, Contacto, PROVEEDORES, useDemoComercio, type OfertaDemo, type ProveedorDemo } from './demo'

type Eleccion = { proveedor: ProveedorDemo; oferta: OfertaDemo } | null

export function Proveedores() {
  const [eleccion, setEleccion] = useState<Eleccion>(null)

  return (
    <>
      <Encabezado titulo="Proveedores">Precios de mayoreo para abastecer tu puesto.</Encabezado>
      <div className="space-y-4">
        <AvisoDemo>Modo demo: las solicitudes se ven en "Solicitudes", pero todavía no le llegan al proveedor.</AvisoDemo>
        {PROVEEDORES.map((p) => (
          <TarjetaProveedor key={p.id} proveedor={p} onSolicitar={(oferta) => setEleccion({ proveedor: p, oferta })} />
        ))}
        <CreditosImagenes nombres={PROVEEDORES.flatMap((p) => p.ofertas.map((o) => o.producto))} />
      </div>
      <SolicitarAbasto eleccion={eleccion} onCerrar={() => setEleccion(null)} />
    </>
  )
}

function TarjetaProveedor({ proveedor, onSolicitar }: { proveedor: ProveedorDemo; onSolicitar: (oferta: OfertaDemo) => void }) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="secondary">{TIPOS_PROVEEDOR[proveedor.tipo]}</Badge>
        <CardTitle className="text-lg">{proveedor.nombre}</CardTitle>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {proveedor.zona}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y">
          {proveedor.ofertas.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-2">
              <ImagenProducto nombre={o.producto} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.producto}</p>
                <p className="text-xs text-muted-foreground">
                  {pesos(o.precio)} por {o.unidad} · mínimo {o.minimo} {o.unidad}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onSolicitar(o)}>
                Pedir
              </Button>
            </li>
          ))}
        </ul>
        <Contacto telefono={proveedor.telefono} whatsapp={proveedor.whatsapp} />
      </CardContent>
    </Card>
  )
}

function SolicitarAbasto({ eleccion, onCerrar }: { eleccion: Eleccion; onCerrar: () => void }) {
  const { solicitar } = useDemoComercio()
  const navegar = useNavigate()
  const [cantidad, setCantidad] = useState('')
  const oferta = eleccion?.oferta
  const n = Number(cantidad || oferta?.minimo)
  const valida = oferta != null && n >= oferta.minimo

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!eleccion || !valida) return
    solicitar(eleccion.proveedor, { producto: eleccion.oferta.producto, unidad: eleccion.oferta.unidad, cantidad: n, precio: eleccion.oferta.precio })
    toast.success(`Solicitud enviada a ${eleccion.proveedor.nombre}`)
    setCantidad('')
    onCerrar()
    navegar('/comercio/solicitudes')
  }

  return (
    <Dialog
      open={eleccion != null}
      onOpenChange={(abierto) => {
        if (!abierto) {
          setCantidad('')
          onCerrar()
        }
      }}
    >
      <DialogContent>
        {eleccion && oferta && (
          <form onSubmit={enviar} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="size-4 text-primary" />
                Solicitar abasto
              </DialogTitle>
              <DialogDescription>
                {oferta.producto} a {pesos(oferta.precio)} por {oferta.unidad} con {eleccion.proveedor.nombre}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="cantidad">Cantidad ({oferta.unidad})</Label>
              <Input
                id="cantidad"
                type="number"
                inputMode="decimal"
                min={oferta.minimo}
                placeholder={String(oferta.minimo)}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo {oferta.minimo} {oferta.unidad}. Total aproximado: {valida ? pesos(n * oferta.precio) : '—'}
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!valida} className="w-full">
                Enviar solicitud
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
