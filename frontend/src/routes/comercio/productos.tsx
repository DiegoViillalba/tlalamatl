import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Plus, ScanLine, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { ProductoDetectado } from '@/api'
import {
  comercioActualizarProductoMutation,
  comercioCrearProductoMutation,
  comercioEliminarProductoMutation,
  comercioEscanearFotoInventarioMutation,
  comercioImportarProductosMutation,
  comercioListarProductosOptions,
} from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { ImagenProducto } from '@/components/imagen-producto'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeError } from '@/lib/api'
import { pesos } from '@/lib/formato'

type Fila = { id: number; nombre: string; precio: number; unidad: string }

export function MisPrecios() {
  const queryClient = useQueryClient()
  const productos = useQuery(comercioListarProductosOptions())
  const [abrirEscaneo, setAbrirEscaneo] = useState(false)

  const crearProducto = useMutation({
    ...comercioCrearProductoMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comercioListarProductosOptions().queryKey })
      toast.success('Producto agregado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const actualizarPrecio = useMutation({
    ...comercioActualizarProductoMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comercioListarProductosOptions().queryKey })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const eliminarProducto = useMutation({
    ...comercioEliminarProductoMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comercioListarProductosOptions().queryKey })
      toast.success('Producto eliminado')
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const filas: Fila[] = (productos.data ?? []).map((p) => ({
    id: p.id!,
    nombre: p.nombre,
    precio: p.precio,
    unidad: p.unidad,
  }))

  return (
    <>
      <Encabezado titulo="Mis precios">Lo que vendes y a cuánto. Estos precios salen en tu ficha del mapa.</Encabezado>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => setAbrirEscaneo(true)}
          >
            <ScanLine />
            Escanear con IA
          </Button>
          <AgregarProductoInline
            onAgregar={(nombre, precio, unidad) =>
              crearProducto.mutate({ body: { nombre, precio, unidad } })
            }
            cargando={crearProducto.isPending}
          />
        </div>

        {productos.isPending && <Skeleton className="h-32 w-full" />}
        {productos.data && filas.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no tienes productos. Agrega uno manualmente o escanea una foto.
          </p>
        )}
        {filas.map((f) => (
          <FilaPrecio
            key={f.id}
            fila={f}
            guardando={actualizarPrecio.isPending}
            borrando={eliminarProducto.isPending}
            onPrecio={(precio) => {
              actualizarPrecio.mutate({ path: { producto_id: f.id }, body: { precio } })
              toast.success(`${f.nombre}: ${pesos(precio)} por ${f.unidad}`)
            }}
            onBorrar={() => eliminarProducto.mutate({ path: { producto_id: f.id } })}
          />
        ))}
      </div>

      <EscanearSheet
        abierto={abrirEscaneo}
        onCerrar={() => setAbrirEscaneo(false)}
        onImportado={() => {
          queryClient.invalidateQueries({ queryKey: comercioListarProductosOptions().queryKey })
          setAbrirEscaneo(false)
        }}
      />
    </>
  )
}

// ─── Fila de precio ─────────────────────────────────────────────────────────

function FilaPrecio({
  fila,
  guardando,
  borrando,
  onPrecio,
  onBorrar,
}: {
  fila: Fila
  guardando: boolean
  borrando: boolean
  onPrecio: (precio: number) => void
  onBorrar: () => void
}) {
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
          <Button
            type="submit"
            size="icon"
            variant={cambio ? 'default' : 'ghost'}
            disabled={!cambio || guardando}
            aria-label="Guardar precio"
          >
            <Check />
          </Button>
        </form>
        <Button
          size="icon"
          variant="ghost"
          disabled={borrando}
          onClick={onBorrar}
          aria-label={`Eliminar ${fila.nombre}`}
        >
          <Trash2 />
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Botón + formulario inline para agregar un producto ─────────────────────

function AgregarProductoInline({
  onAgregar,
  cargando,
}: {
  onAgregar: (nombre: string, precio: number, unidad: string) => void
  cargando: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [unidad, setUnidad] = useState('kg')

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)} disabled={cargando}>
        <Plus />
      </Button>
    )
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    onAgregar(nombre.trim(), Number(precio), unidad.trim())
    setNombre('')
    setPrecio('')
    setAbierto(false)
  }

  return (
    <Card size="sm" className="w-full">
      <CardContent>
        <form className="space-y-3" onSubmit={enviar}>
          <div className="space-y-1">
            <Label htmlFor="nuevo-nombre">Producto</Label>
            <Input
              id="nuevo-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Jitomate saladet"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="nuevo-precio">Precio</Label>
              <Input
                id="nuevo-precio"
                required
                type="number"
                min="0.5"
                step="0.5"
                inputMode="decimal"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <div className="w-24 space-y-1">
              <Label htmlFor="nuevo-unidad">Unidad</Label>
              <Input
                id="nuevo-unidad"
                required
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setAbierto(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={cargando}>
              {cargando ? 'Guardando…' : 'Agregar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Sheet de escaneo con Gemini ─────────────────────────────────────────────

type Paso = 'seleccionar' | 'analizando' | 'revisar' | 'importando'

function EscanearSheet({
  abierto,
  onCerrar,
  onImportado,
}: {
  abierto: boolean
  onCerrar: () => void
  onImportado: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [paso, setPaso] = useState<Paso>('seleccionar')
  const [detectados, setDetectados] = useState<ProductoDetectado[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())

  const escanear = useMutation({
    ...comercioEscanearFotoInventarioMutation(),
    onMutate: () => setPaso('analizando'),
    onSuccess: (resultado) => {
      setDetectados(resultado.productos)
      setSeleccionados(new Set(resultado.productos.map((_, i) => i)))
      setPaso('revisar')
    },
    onError: (e) => {
      toast.error(mensajeError(e))
      setPaso('seleccionar')
    },
  })

  const importar = useMutation({
    ...comercioImportarProductosMutation(),
    onMutate: () => setPaso('importando'),
    onSuccess: (creados) => {
      toast.success(`${creados.length} producto${creados.length !== 1 ? 's' : ''} agregado${creados.length !== 1 ? 's' : ''} al inventario`)
      onImportado()
      resetear()
    },
    onError: (e) => {
      toast.error(mensajeError(e))
      setPaso('revisar')
    },
  })

  function resetear() {
    setArchivo(null)
    setPreview(null)
    setPaso('seleccionar')
    setDetectados([])
    setSeleccionados(new Set())
  }

  function alSeleccionarArchivo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setArchivo(f)
    setPreview(URL.createObjectURL(f))
    setPaso('seleccionar')
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function toggleSeleccion(idx: number) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function alCerrar() {
    if (paso === 'analizando' || paso === 'importando') return
    onCerrar()
    resetear()
  }

  const productosSeleccionados = detectados.filter((_, i) => seleccionados.has(i))

  return (
    <Sheet open={abierto} onOpenChange={(v) => { if (!v) alCerrar() }}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            Escanear inventario con IA
          </SheetTitle>
          <SheetDescription>
            Toma una foto de tu carrito o menú y Gemini detectará los productos automáticamente.
          </SheetDescription>
        </SheetHeader>

        {/* Paso 1: seleccionar foto */}
        {(paso === 'seleccionar') && (
          <div className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={alSeleccionarArchivo}
            />

            {preview ? (
              <div className="relative overflow-hidden rounded-xl">
                <img src={preview} alt="Vista previa" className="w-full object-cover" style={{ maxHeight: '40dvh' }} />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white"
                >
                  Cambiar foto
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-10 text-muted-foreground transition-colors hover:border-primary hover:text-primary active:bg-accent"
              >
                <Camera className="size-10" />
                <span className="text-sm font-medium">Tomar foto o elegir imagen</span>
                <span className="text-xs opacity-70">JPG, PNG, WebP</span>
              </button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={alCerrar}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!archivo}
                onClick={() => archivo && escanear.mutate({ body: { foto: archivo } })}
              >
                <Upload className="size-4" />
                Analizar con Gemini
              </Button>
            </div>
          </div>
        )}

        {/* Paso 2: analizando */}
        {paso === 'analizando' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-sm font-medium">Analizando con Gemini…</p>
            <p className="text-xs text-muted-foreground">Esto puede tardar unos segundos.</p>
          </div>
        )}

        {/* Paso 3: revisar productos detectados */}
        {paso === 'revisar' && (
          <div className="space-y-4">
            {detectados.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm font-medium">No se detectaron productos</p>
                <p className="mt-1 text-xs text-muted-foreground">Intenta con una foto más clara o bien iluminada.</p>
                <Button variant="outline" className="mt-4" onClick={() => setPaso('seleccionar')}>
                  Intentar de nuevo
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Gemini detectó <strong>{detectados.length} producto{detectados.length !== 1 ? 's' : ''}</strong>. Elige cuáles agregar.
                </p>
                <div className="space-y-2">
                  {detectados.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSeleccion(i)}
                      className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
                      style={seleccionados.has(i) ? { borderColor: 'var(--primary)', backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)' } : {}}
                    >
                      <span
                        className="flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
                        style={seleccionados.has(i) ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary)' } : {}}
                      >
                        {seleccionados.has(i) && <Check className="size-3 text-primary-foreground" />}
                      </span>
                      <ImagenProducto nombre={p.nombre} className="size-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">por {p.unidad}</p>
                      </div>
                      {p.precio != null ? (
                        <Badge variant="secondary">{pesos(p.precio)}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Sin precio</Badge>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPaso('seleccionar')}>
                    Nueva foto
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={seleccionados.size === 0}
                    onClick={() => importar.mutate({ body: { productos: productosSeleccionados } })}
                  >
                    Agregar {seleccionados.size > 0 ? seleccionados.size : ''} al inventario
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Paso 4: importando */}
        {paso === 'importando' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-sm font-medium">Guardando productos…</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
