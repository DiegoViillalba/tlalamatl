// Historial de precios de un producto: línea de 12 semanas con promedio y mínimo, menudeo o mayoreo.
// SVG inline sin librerías. Los colores salen de los tokens de shadcn, así que siguen el tema claro/oscuro.
import { useQuery } from '@tanstack/react-query'
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { publicoHistorialPreciosOptions } from '@/api/@tanstack/react-query.gen'
import type { PuntoHistorial } from '@/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mensajeError } from '@/lib/api'
import { MESES, pesos } from '@/lib/formato'

type Modo = 'menudeo' | 'mayoreo'
type Punto = { fecha: string; promedio: number; minimo: number }

const ANCHO = 360
const ALTO = 210
const M = { izq: 44, der: 16, arriba: 14, abajo: 28 }

const fechaCorta = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  })
const mesDe = (iso: string) => Number(iso.slice(5, 7))

function serie(puntos: PuntoHistorial[], modo: Modo): Punto[] {
  return puntos.flatMap((p) => {
    const promedio = modo === 'menudeo' ? p.menudeo_promedio : p.mayoreo_promedio
    const minimo = modo === 'menudeo' ? p.menudeo_minimo : p.mayoreo_minimo
    return promedio == null || minimo == null ? [] : [{ fecha: p.fecha, promedio, minimo }]
  })
}

/** 3-5 marcas del eje en números redondos (1, 2, 5 por potencia de 10) dentro de [bajo, alto]. */
function marcasRedondas(bajo: number, alto: number) {
  const crudo = (alto - bajo) / 3
  const potencia = 10 ** Math.floor(Math.log10(crudo))
  const paso = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= crudo) ?? crudo
  const marcas: number[] = []
  for (let v = Math.ceil(bajo / paso) * paso; v <= alto; v += paso) marcas.push(Math.round(v * 100) / 100)
  return marcas
}

export function GraficaLineas({
  datos,
  mesesTemporada,
  unidad,
}: {
  datos: Punto[]
  mesesTemporada: number[]
  unidad: string
}) {
  const [activo, setActivo] = useState<number | null>(null)
  const n = datos.length
  const valores = datos.flatMap((d) => [d.promedio, d.minimo])
  let bajo = Math.min(...valores)
  let alto = Math.max(...valores)
  // Rango mínimo del eje (20% del precio) para que el ruido de unos centavos no parezca una gran variación.
  const rangoMinimo = Math.max(1, alto * 0.2)
  if (alto - bajo < rangoMinimo) {
    const medio = (alto + bajo) / 2
    bajo = medio - rangoMinimo / 2
    alto = medio + rangoMinimo / 2
  }
  const holgura = (alto - bajo) * 0.12
  bajo = Math.max(0, bajo - holgura)
  alto += holgura

  const x = (i: number) => M.izq + (n === 1 ? (ANCHO - M.izq - M.der) / 2 : (i / (n - 1)) * (ANCHO - M.izq - M.der))
  const y = (v: number) => M.arriba + (1 - (v - bajo) / (alto - bajo)) * (ALTO - M.arriba - M.abajo)
  const paso = n > 1 ? (ANCHO - M.izq - M.der) / (n - 1) : 40
  const ticks = marcasRedondas(bajo, alto)
  const decimales = ticks.every((t) => Number.isInteger(t)) ? 0 : 1
  const etiquetaTick = (v: number) => `$${v.toFixed(decimales)}`
  const linea = (clave: 'promedio' | 'minimo') =>
    datos.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d[clave]).toFixed(1)}`).join(' ')
  const hoy = datos[n - 1]

  function enPuntero(e: PointerEvent<SVGSVGElement>) {
    const caja = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - caja.left) / caja.width) * ANCHO
    setActivo(Math.min(n - 1, Math.max(0, Math.round((px - M.izq) / paso))))
  }
  function enTecla(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowLeft') setActivo((a) => Math.max(0, (a ?? n) - 1))
    else if (e.key === 'ArrowRight') setActivo((a) => Math.min(n - 1, (a ?? -1) + 1))
    else if (e.key === 'Escape') setActivo(null)
  }

  const d = activo != null ? datos[activo] : null
  const tx = d && activo != null ? Math.min(Math.max(x(activo) - 55, M.izq), ANCHO - M.der - 110) : 0

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-muted-foreground" /> Promedio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-primary" /> Mínimo
        </span>
        {mesesTemporada.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-chart-2/20" /> Temporada
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
        role="img"
        tabIndex={0}
        aria-label={`Historial de precios por ${unidad}, ${n} semanas. Hoy: promedio ${pesos(hoy.promedio)}, mínimo ${pesos(hoy.minimo)}. Usa las flechas para recorrer las semanas.`}
        onPointerMove={enPuntero}
        onPointerDown={enPuntero}
        onPointerLeave={() => setActivo(null)}
        onBlur={() => setActivo(null)}
        onKeyDown={enTecla}
      >
        {datos.map(
          (p, i) =>
            mesesTemporada.includes(mesDe(p.fecha)) && (
              <rect
                key={p.fecha}
                x={x(i) - paso / 2}
                y={M.arriba}
                width={paso}
                height={ALTO - M.arriba - M.abajo}
                className="fill-chart-2/15"
              />
            ),
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.izq} x2={ANCHO - M.der} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
            <text x={M.izq - 6} y={y(t) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px]">
              {etiquetaTick(t)}
            </text>
          </g>
        ))}
        {[0, Math.floor((n - 1) / 2), n - 1]
          .filter((i, k, arr) => arr.indexOf(i) === k)
          .map((i) => (
            <text
              key={i}
              x={x(i)}
              y={ALTO - 8}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="fill-muted-foreground text-[10px]"
            >
              {fechaCorta(datos[i].fecha)}
            </text>
          ))}

        <path
          d={linea('promedio')}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-muted-foreground"
        />
        <path
          d={linea('minimo')}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary"
        />

        {/* Precio actual resaltado: punto con anillo del color de la superficie. */}
        <circle
          cx={x(n - 1)}
          cy={y(hoy.promedio)}
          r={4}
          strokeWidth={2}
          className="fill-muted-foreground stroke-card"
        />
        <circle cx={x(n - 1)} cy={y(hoy.minimo)} r={5} strokeWidth={2} className="fill-primary stroke-card" />

        {d && activo != null && (
          <g pointerEvents="none">
            <line
              x1={x(activo)}
              x2={x(activo)}
              y1={M.arriba}
              y2={ALTO - M.abajo}
              className="stroke-foreground/40"
              strokeWidth={1}
            />
            <circle
              cx={x(activo)}
              cy={y(d.promedio)}
              r={4}
              strokeWidth={2}
              className="fill-muted-foreground stroke-card"
            />
            <circle cx={x(activo)} cy={y(d.minimo)} r={4} strokeWidth={2} className="fill-primary stroke-card" />
            <g transform={`translate(${tx} ${M.arriba})`}>
              <rect width={110} height={50} rx={6} className="fill-popover stroke-border" />
              <text x={8} y={14} className="fill-muted-foreground text-[10px]">
                {fechaCorta(d.fecha)}
              </text>
              <text x={8} y={29} className="fill-foreground text-[11px] font-semibold">
                Prom. {pesos(d.promedio)}
              </text>
              <text x={8} y={43} className="fill-foreground text-[11px] font-semibold">
                Mín. {pesos(d.minimo)}
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}

/** Hoja con el historial de un producto base. `producto` es null cuando está cerrada. */
export function HistorialPrecios({
  producto,
  alCerrar,
}: {
  producto: { id: number; nombre: string } | null
  alCerrar: () => void
}) {
  const [modo, setModo] = useState<Modo>('menudeo')
  const consulta = useQuery({
    ...publicoHistorialPreciosOptions({
      path: { producto_base_id: producto?.id ?? 0 },
      query: { semanas: 12 },
    }),
    enabled: producto != null,
  })
  const h = consulta.data
  const menudeo = h ? serie(h.puntos, 'menudeo') : []
  const mayoreo = h ? serie(h.puntos, 'mayoreo') : []
  const modoEfectivo: Modo = modo === 'mayoreo' && mayoreo.length === 0 ? 'menudeo' : modo
  const datos = modoEfectivo === 'menudeo' ? menudeo : mayoreo
  const cambio =
    datos.length > 1 ? ((datos[datos.length - 1].promedio - datos[0].promedio) / datos[0].promedio) * 100 : null

  return (
    <Dialog open={producto != null} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Historial de {producto?.nombre}</DialogTitle>
          <DialogDescription>Últimas 12 semanas, por {h?.unidad ?? 'unidad'}.</DialogDescription>
        </DialogHeader>

        <Tabs value={modoEfectivo} onValueChange={(v) => setModo(v as Modo)}>
          <TabsList className="w-full">
            <TabsTrigger value="menudeo">Menudeo</TabsTrigger>
            <TabsTrigger value="mayoreo" disabled={h != null && mayoreo.length === 0}>
              Mayoreo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {consulta.isPending && <Skeleton className="h-52 w-full rounded-lg" />}
        {consulta.isError && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos cargar el historial</AlertTitle>
            <AlertDescription>{mensajeError(consulta.error)}</AlertDescription>
          </Alert>
        )}
        {h && datos.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Todavía no hay historial de precios de este producto.
          </p>
        )}
        {h && datos.length > 0 && (
          <>
            <GraficaLineas datos={datos} mesesTemporada={h.meses_temporada} unidad={h.unidad} />
            <p className="text-sm">
              Hoy: promedio <strong>{pesos(datos[datos.length - 1].promedio)}</strong>, mínimo{' '}
              <strong>{pesos(datos[datos.length - 1].minimo)}</strong>
              {cambio != null && Math.abs(cambio) >= 1 && (
                <span className="text-muted-foreground">
                  {' '}
                  · {cambio < 0 ? 'bajó' : 'subió'} {Math.abs(Math.round(cambio))}% en {datos.length} semanas
                </span>
              )}
              .
            </p>
            {h.meses_temporada.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Temporada: {h.meses_temporada.map((m) => MESES[m - 1].slice(0, 3)).join(', ')}. Las franjas verdes
                marcan esas semanas.
              </p>
            )}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
              <table className="mt-2 w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 font-medium">Semana</th>
                    <th className="py-1 text-right font-medium">Promedio</th>
                    <th className="py-1 text-right font-medium">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((p) => (
                    <tr key={p.fecha} className="border-t">
                      <td className="py-1">{fechaCorta(p.fecha)}</td>
                      <td className="py-1 text-right">{pesos(p.promedio)}</td>
                      <td className="py-1 text-right">{pesos(p.minimo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
