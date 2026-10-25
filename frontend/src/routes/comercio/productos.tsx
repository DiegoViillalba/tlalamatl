import { useQuery } from '@tanstack/react-query'
import { Check, Plus, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { comercioMiComercioOptions, publicoListarProductosOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { CreditosImagenes, ImagenProducto } from '@/components/imagen-producto'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { pesos } from '@/lib/formato'
import { AvisoDemo } from './demo'

type Fila = { clave: string; nombre: string; precio: number; unidad: string }

export function MisPrecios() {
  const comercio = useQuery(comercioMiComercioOptions())
  const comercioId = comercio.data?.id ?? 0
  const productos = useQuery({
    ...publicoListarProductosOptions({ path: { comercio_id: comercioId } }),
    enabled: comercioId > 0,
  })
  // Cambios locales encima de lo que trae el backend (demo: no se guardan).
  const [precios, setPrecios] = useState<Record<string, number>>({})
  const [borrados, setBorrados] = useState<Set<string>>(new Set())
  const [nuevos, setNuevos] = useState<Fila[]>([])

  const filas: Fila[] = [
    ...nuevos,
    ...(productos.data ?? []).map((p) => ({ clave: `p${p.id}`, nombre: p.nombre, precio: p.precio, unidad: p.unidad })),
  ]
    .filter((f) => !borrados.has(f.clave))
    .map((f) => ({ ...f, precio: precios[f.clave] ?? f.precio }))

  return (
    <>
      <Encabezado titulo="Mis precios">Lo que vendes y a cuánto. Estos precios salen en tu ficha del mapa.</Encabezado>
      <div className="space-y-4">
        <AvisoDemo>Modo demo: los cambios se ven aquí, pero todavía no se guardan ni llegan al mapa.</AvisoDemo>
        <FormularioNuevo
          onAgregar={(fila) => {
            setNuevos((prev) => [fila, ...prev])
            toast.success(`${fila.nombre} agregado`)
          }}
        />
        {(comercio.isPending || productos.isPending) && <Skeleton className="h-32 w-full" />}
        {productos.data && filas.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Aún no tienes productos.</p>
        )}
        {filas.map((f) => (
          <FilaPrecio
            key={f.clave}
            fila={f}
            onPrecio={(precio) => {
              setPrecios((prev) => ({ ...prev, [f.clave]: precio }))
              toast.success(`${f.nombre}: ${pesos(precio)} por ${f.unidad}`)
            }}
            onBorrar={() => {
              setBorrados((prev) => new Set(prev).add(f.clave))
              toast.success(`${f.nombre} eliminado`)
            }}
          />
        ))}
        <CreditosImagenes nombres={filas.map((f) => f.nombre)} />
      </div>
    </>
  )
}

function FilaPrecio({ fila, onPrecio, onBorrar }: { fila: Fila; onPrecio: (precio: number) => void; onBorrar: () => void }) {
  const [texto, setTexto] = useState(String(fila.precio))
  const precio = Number(texto)
  const cambio = texto !== '' && precio > 0 && precio !== fila.precio

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <ImagenProducto nombre={fila.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{fila.nombre}</p>
          <p className="text-xs text-muted-foreground">por {fila.unidad}</p>
        </div>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (cambio) onPrecio(precio)
          }}
        >
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            aria-label={`Precio de ${fila.nombre}`}
            inputMode="decimal"
            type="number"
            min="0.5"
            step="0.5"
            className="w-20"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <Button type="submit" size="icon" variant={cambio ? 'default' : 'ghost'} disabled={!cambio} aria-label="Guardar precio">
            <Check />
          </Button>
        </form>
        <Button size="icon" variant="ghost" onClick={onBorrar} aria-label={`Eliminar ${fila.nombre}`}>
          <Trash2 />
        </Button>
      </CardContent>
    </Card>
  )
}

function FormularioNuevo({ onAgregar }: { onAgregar: (fila: Fila) => void }) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [unidad, setUnidad] = useState('kg')

  if (!abierto) {
    return (
      <Button className="w-full" onClick={() => setAbierto(true)}>
        <Plus />
        Agregar producto
      </Button>
    )
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    onAgregar({ clave: `n${Date.now()}`, nombre: nombre.trim(), precio: Number(precio), unidad: unidad.trim() })
    setNombre('')
    setPrecio('')
    setAbierto(false)
  }

  return (
    <Card size="sm">
      <CardContent>
        <form className="space-y-3" onSubmit={enviar}>
          <div className="space-y-1">
            <Label htmlFor="nuevo-nombre">Producto</Label>
            <Input id="nuevo-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Jitomate saladet" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="nuevo-precio">Precio</Label>
              <Input id="nuevo-precio" required type="number" min="0.5" step="0.5" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </div>
            <div className="w-24 space-y-1">
              <Label htmlFor="nuevo-unidad">Unidad</Label>
              <Input id="nuevo-unidad" required value={unidad} onChange={(e) => setUnidad(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Agregar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
