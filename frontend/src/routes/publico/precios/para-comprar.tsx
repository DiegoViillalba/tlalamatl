// Vista del comprador: dónde está más barato cada producto y qué está de temporada.
import { Leaf, Sparkles } from 'lucide-react'
import type { PrecioProducto } from '@/api'
import { ImagenProducto } from '@/components/imagen-producto'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CATEGORIAS, CATEGORIAS_PRODUCTO, MESES, pesos } from '@/lib/formato'
import { BarraRango, BotonHistorial, Contacto } from './comunes'

/** Fracción que cuesta menos el mejor precio respecto al promedio (0 si solo hay un precio). */
function ahorro(p: PrecioProducto) {
  const { minimo, promedio } = p.menudeo
  return minimo != null && promedio ? (promedio - minimo) / promedio : 0
}

export function ResumenTemporada({
  productos,
  mes,
  esActual,
}: {
  productos: PrecioProducto[]
  mes: number
  esActual: boolean
}) {
  const mejores = productos
    .filter((p) => p.de_temporada && p.menudeo.n >= 2)
    .sort((a, b) => ahorro(b) - ahorro(a))
    .slice(0, 4)
  if (mejores.length === 0) return null
  return (
    <Card className="bg-secondary/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          {esActual ? 'Hoy de temporada' : `De temporada en ${MESES[mes - 1].toLowerCase()}`}
        </CardTitle>
        <p className="text-sm text-muted-foreground">Donde más ahorras frente al precio promedio.</p>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-2">
          {mejores.map((p) => (
            <li key={p.id} className="rounded-lg bg-background p-2.5">
              <ImagenProducto nombre={p.nombre} className="mb-2 aspect-video h-auto w-full" />
              <p className="text-sm font-medium">{p.nombre}</p>
              <p className="text-lg font-semibold leading-tight">
                {pesos(p.menudeo.minimo!)}
                <span className="text-xs font-normal text-muted-foreground">/{p.unidad}</span>
              </p>
              <p className="text-xs text-primary">Ahorras {Math.round(ahorro(p) * 100)}% vs. el promedio</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function TarjetaComprar({
  producto: p,
  alVerHistorial,
}: {
  producto: PrecioProducto
  alVerHistorial: () => void
}) {
  const { menudeo, mas_barato_en: comercio } = p
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <ImagenProducto nombre={p.nombre} className="size-14" />
            <div>
              <h3 className="text-base font-semibold">{p.nombre}</h3>
              <p className="text-xs text-muted-foreground">{CATEGORIAS_PRODUCTO[p.categoria] ?? p.categoria}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {p.de_temporada && (
              <Badge>
                <Leaf />
                De temporada
              </Badge>
            )}
            {p.canasta_basica && <Badge variant="outline">Canasta básica</Badge>}
          </div>
        </div>

        {menudeo.n > 0 && menudeo.minimo != null && menudeo.promedio != null && menudeo.maximo != null ? (
          <>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl font-semibold leading-none">
                {pesos(menudeo.minimo)}
                <span className="text-sm font-normal text-muted-foreground">/{p.unidad}</span>
              </p>
              <p className="text-sm text-muted-foreground">promedio {pesos(menudeo.promedio)}</p>
            </div>
            <BarraRango minimo={menudeo.minimo} promedio={menudeo.promedio} maximo={menudeo.maximo} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no hay precios de menudeo para este producto.</p>
        )}

        {comercio && (
          <div className="space-y-2 rounded-lg bg-muted/60 p-2.5">
            <p className="text-sm">
              Más barato en <span className="font-medium">{comercio.nombre}</span> ({comercio.alcaldia})
            </p>
            <p className="text-xs text-muted-foreground">{CATEGORIAS[comercio.categoria]}</p>
            <Contacto telefono={comercio.telefono} whatsapp={comercio.whatsapp} />
          </div>
        )}
        <BotonHistorial nombre={p.nombre} alTocar={alVerHistorial} />
      </CardContent>
    </Card>
  )
}
