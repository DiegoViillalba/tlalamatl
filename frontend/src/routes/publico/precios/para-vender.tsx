// Vista del proveedor y del comerciante: dónde hay demanda y cómo colocar el producto.
import { Flame, Leaf, Store } from 'lucide-react'
import type { PrecioProducto } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CATEGORIAS_PRODUCTO, pesos, TIPOS_PROVEEDOR } from '@/lib/formato'
import { Contacto } from './comunes'

/** Alta demanda: al menos un comercio del producto anda con stock en o por debajo de su mínimo. */
export function altaDemanda(p: PrecioProducto) {
  return p.demanda.con_stock_bajo >= 1
}

/** Primero lo que más urge ofrecer: alta demanda, luego temporada, luego más puestos que lo venden. */
export function ordenarParaVender(productos: PrecioProducto[]) {
  return [...productos].sort(
    (a, b) =>
      Number(altaDemanda(b)) - Number(altaDemanda(a)) ||
      b.demanda.con_stock_bajo - a.demanda.con_stock_bajo ||
      Number(b.de_temporada) - Number(a.de_temporada) ||
      b.demanda.comercios - a.demanda.comercios ||
      a.nombre.localeCompare(b.nombre, 'es'),
  )
}

function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className="text-base font-semibold leading-tight">{valor}</p>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  )
}

export function TarjetaVender({ producto: p }: { producto: PrecioProducto }) {
  const { mayoreo, menudeo, demanda, proveedor_mas_barato: proveedor } = p
  const brecha =
    mayoreo.promedio != null && menudeo.promedio != null ? menudeo.promedio - mayoreo.promedio : null
  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">{p.nombre}</h3>
            <p className="text-xs text-muted-foreground">
              {CATEGORIAS_PRODUCTO[p.categoria] ?? p.categoria} · por {p.unidad}
            </p>
          </div>
          {altaDemanda(p) && (
            <Badge variant="destructive">
              <Flame />
              Alta demanda
            </Badge>
          )}
        </div>
        {p.de_temporada && (
          <p className="flex items-center gap-1.5 text-sm text-primary">
            <Leaf className="size-4 shrink-0" />
            En temporada: buen momento para ofrecer
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Dato
            etiqueta="Mayoreo (mín. / prom.)"
            valor={mayoreo.n > 0 ? `${pesos(mayoreo.minimo!)} / ${pesos(mayoreo.promedio!)}` : 'Sin ofertas'}
            nota={mayoreo.n > 0 ? `${mayoreo.n} ${mayoreo.n === 1 ? 'oferta' : 'ofertas'}` : undefined}
          />
          <Dato
            etiqueta="Menudeo (promedio)"
            valor={menudeo.n > 0 ? pesos(menudeo.promedio!) : 'Sin precios'}
            nota={brecha != null ? `Brecha ${pesos(brecha)}/${p.unidad} vs. mayoreo` : undefined}
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Store className="size-4 shrink-0 text-muted-foreground" />
          <span>
            {demanda.comercios} {demanda.comercios === 1 ? 'comercio lo vende' : 'comercios lo venden'}
            {demanda.con_stock_bajo > 0 && (
              <>
                {' · '}
                <span className="font-medium">{demanda.con_stock_bajo} con stock bajo</span>
              </>
            )}
          </span>
        </div>

        {proveedor && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm">
                Mayoreo más barato: <span className="font-medium">{pesos(proveedor.precio_mayoreo)}</span>/{p.unidad} en{' '}
                <span className="font-medium">{proveedor.nombre}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {TIPOS_PROVEEDOR[proveedor.tipo]} · {proveedor.zona} · desde {proveedor.cantidad_minima} {p.unidad}
              </p>
              <Contacto telefono={proveedor.telefono} whatsapp={proveedor.whatsapp} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
