// "Tu canasta de temporada": canasta sugerida con gráfica de barras (más barato vs. promedio), total en vivo,
// productos para agregar y dónde comprar cada cosa. La selección se guarda en localStorage.
import { useQuery } from '@tanstack/react-query'
import { ChartNoAxesColumn, Minus, Plus, RotateCcw, ShoppingBasket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { publicoCanastaOptions } from '@/api/@tanstack/react-query.gen'
import type { ProductoCanasta } from '@/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeError } from '@/lib/api'
import { CATEGORIAS, MESES, pesos } from '@/lib/formato'
import { Contacto } from './comunes'

const CLAVE = 'tlalamatl.canasta'

function leerSeleccion(): number[] | null {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? 'null')
    return Array.isArray(valor) && valor.every((v) => typeof v === 'number') ? valor : null
  } catch {
    return null
  }
}

function guardarSeleccion(ids: number[] | null) {
  try {
    if (ids) localStorage.setItem(CLAVE, JSON.stringify(ids))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la canasta funciona igual, solo que no se recuerda.
  }
}

const subtotal = (p: ProductoCanasta, clave: 'precio_referencia' | 'precio_promedio') => p[clave] * p.cantidad_sugerida

/** Barras horizontales: por producto, el precio más barato (color de marca) frente al promedio (neutro). */
function GraficaCanasta({
  productos,
  alQuitar,
  alVerHistorial,
}: {
  productos: ProductoCanasta[]
  alQuitar: (id: number) => void
  alVerHistorial: (p: ProductoCanasta) => void
}) {
  const maximo = Math.max(...productos.map((p) => subtotal(p, 'precio_promedio')))
  const ancho = (valor: number) => `${Math.max(2, (valor / maximo) * 100).toFixed(1)}%`
  return (
    <>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Más barato
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted-foreground/50" /> Promedio
        </span>
      </div>
      <ul className="space-y-3" aria-label="Productos de tu canasta">
        {productos.map((p) => {
          const barato = subtotal(p, 'precio_referencia')
          const promedio = subtotal(p, 'precio_promedio')
          return (
            <li key={p.producto_base_id}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => alVerHistorial(p)}
                  className="flex min-w-0 items-center gap-1.5 text-left text-sm font-medium underline-offset-2 hover:underline"
                  aria-label={`Ver historial de ${p.nombre}`}
                >
                  <ChartNoAxesColumn className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{p.nombre}</span>
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">
                    {p.cantidad_sugerida} {p.unidad}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  {p.ahorro_pct > 0 && (
                    <span className="text-xs font-medium text-primary">−{Math.round(p.ahorro_pct)}%</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => alQuitar(p.producto_base_id)}
                    aria-label={`Quitar ${p.nombre} de la canasta`}
                  >
                    <Minus />
                  </Button>
                </div>
              </div>
              <div
                className="mt-0.5 space-y-1"
                role="img"
                aria-label={`${p.nombre}: más barato ${pesos(barato)}, promedio ${pesos(promedio)}`}
              >
                <Barra ancho={ancho(barato)} valor={pesos(barato)} clase="fill-primary" />
                <Barra ancho={ancho(promedio)} valor={pesos(promedio)} clase="fill-muted-foreground/50" />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** Una barra de 8 px (SVG, ancho en porcentaje) con su valor al final. */
function Barra({ ancho, valor, clase }: { ancho: string; valor: string; clase: string }) {
  return (
    <div className="flex items-center gap-2">
      <svg className="h-2 min-w-0 flex-1" aria-hidden="true">
        <rect height="8" rx="4" width={ancho} className={clase} />
      </svg>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{valor}</span>
    </div>
  )
}

export function Canasta({
  mes,
  esActual,
  alVerHistorial,
}: {
  mes: number
  esActual: boolean
  alVerHistorial: (p: { id: number; nombre: string }) => void
}) {
  const consulta = useQuery(publicoCanastaOptions({ query: { mes } }))
  // null = sin personalizar: se usa la canasta sugerida por el servidor.
  const [ids, setIds] = useState<number[] | null>(leerSeleccion)
  const candidatos = useMemo(() => consulta.data?.productos ?? [], [consulta.data])

  const seleccion = useMemo(() => {
    const elegidos = ids ?? candidatos.filter((p) => p.en_canasta).map((p) => p.producto_base_id)
    return new Set(elegidos)
  }, [ids, candidatos])
  const enCanasta = candidatos.filter((p) => seleccion.has(p.producto_base_id))
  const porAgregar = candidatos.filter((p) => !seleccion.has(p.producto_base_id))

  function cambiar(siguiente: number[] | null) {
    setIds(siguiente)
    guardarSeleccion(siguiente)
  }
  const agregar = (id: number) => cambiar([...seleccion, id])
  const quitar = (id: number) => cambiar([...seleccion].filter((x) => x !== id))

  const totalBarato = enCanasta.reduce((t, p) => t + subtotal(p, 'precio_referencia'), 0)
  const totalPromedio = enCanasta.reduce((t, p) => t + subtotal(p, 'precio_promedio'), 0)
  const ahorro = totalPromedio - totalBarato

  // Dónde comprar: los productos elegidos agrupados por comercio.
  const lugares = useMemo(() => {
    const porComercio = new Map<number, { comercio: ProductoCanasta['comercio']; productos: ProductoCanasta[] }>()
    for (const p of enCanasta) {
      const lugar = porComercio.get(p.comercio.id) ?? {
        comercio: p.comercio,
        productos: [],
      }
      lugar.productos.push(p)
      porComercio.set(p.comercio.id, lugar)
    }
    return [...porComercio.values()].sort((a, b) => b.productos.length - a.productos.length)
  }, [enCanasta])

  return (
    <Card className="bg-secondary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBasket className="size-4 text-primary" />
          Tu canasta de temporada
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {esActual ? 'Lo que conviene comprar ahora' : `Lo que conviene comprar en ${MESES[mes - 1].toLowerCase()}`}:
          canasta básica y productos de temporada, en el lugar donde salen más baratos. Agrega o quita lo que quieras.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {consulta.isPending && (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        )}
        {consulta.isError && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos armar la canasta</AlertTitle>
            <AlertDescription>{mensajeError(consulta.error)}</AlertDescription>
          </Alert>
        )}
        {consulta.isSuccess && candidatos.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay precios para sugerir una canasta.</p>
        )}

        {consulta.isSuccess && candidatos.length > 0 && (
          <>
            <div className="rounded-xl bg-background p-3" aria-live="polite">
              <p className="text-xs text-muted-foreground">
                Total de tu canasta ({enCanasta.length} {enCanasta.length === 1 ? 'producto' : 'productos'})
              </p>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold leading-tight">{pesos(totalBarato)}</p>
                <p className="text-sm text-muted-foreground line-through">{pesos(totalPromedio)} al promedio</p>
              </div>
              {ahorro > 0 ? (
                <p className="text-sm font-medium text-primary">
                  Ahorras {pesos(ahorro)} ({Math.round((ahorro / totalPromedio) * 100)}%) comprando en {lugares.length}{' '}
                  {lugares.length === 1 ? 'lugar' : 'lugares'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {enCanasta.length === 0
                    ? 'Agrega productos para armar tu canasta.'
                    : `Comprando en ${lugares.length} ${lugares.length === 1 ? 'lugar' : 'lugares'}.`}
                </p>
              )}
            </div>

            {enCanasta.length > 0 && (
              <GraficaCanasta
                productos={enCanasta}
                alQuitar={quitar}
                alVerHistorial={(p) => alVerHistorial({ id: p.producto_base_id, nombre: p.nombre })}
              />
            )}

            {porAgregar.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Agregar a tu canasta</h3>
                <ul className="flex flex-wrap gap-2">
                  {porAgregar.map((p) => (
                    <li key={p.producto_base_id}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => agregar(p.producto_base_id)}
                        aria-label={`Agregar ${p.nombre} a la canasta`}
                      >
                        <Plus />
                        {p.nombre}
                        <span className="text-xs text-muted-foreground">{pesos(p.precio_referencia)}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lugares.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Dónde comprar</h3>
                <ul className="space-y-2">
                  {lugares.map(({ comercio, productos }) => (
                    <li key={comercio.id} className="space-y-2 rounded-xl bg-background p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{comercio.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {comercio.alcaldia} · {CATEGORIAS[comercio.categoria]}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-sm">
                          <span className="font-semibold">
                            {pesos(productos.reduce((t, p) => t + subtotal(p, 'precio_referencia'), 0))}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                          </span>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">{productos.map((p) => p.nombre).join(', ')}</p>
                      <Contacto telefono={comercio.telefono} whatsapp={comercio.whatsapp} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ids !== null && (
              <Button variant="ghost" size="sm" onClick={() => cambiar(null)}>
                <RotateCcw />
                Volver a la canasta sugerida
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
