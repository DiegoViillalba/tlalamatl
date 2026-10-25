// Piezas compartidas del dashboard de precios: contacto directo y barra de rango.
import { MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pesos } from '@/lib/formato'

/** Botones Llamar y WhatsApp. Sin WhatsApp no se muestra ese botón; sin teléfono, ninguno. */
export function Contacto({ telefono, whatsapp }: { telefono: string | null; whatsapp: string | null }) {
  if (!telefono && !whatsapp) return null
  return (
    <div className="flex gap-2">
      {telefono && (
        <Button asChild variant="outline" size="sm" className="flex-1">
          <a href={`tel:${telefono}`}>
            <Phone />
            Llamar
          </a>
        </Button>
      )}
      {whatsapp && (
        <Button asChild variant="outline" size="sm" className="flex-1">
          <a href={`https://wa.me/52${whatsapp}`} target="_blank" rel="noreferrer">
            <MessageCircle />
            WhatsApp
          </a>
        </Button>
      )}
    </div>
  )
}

/** Barra de rango mínimo-máximo con una marca en el promedio. Con un solo precio no hay rango que dibujar. */
export function BarraRango({ minimo, promedio, maximo }: { minimo: number; promedio: number; maximo: number }) {
  if (maximo <= minimo) {
    return <p className="text-xs text-muted-foreground">Un solo precio registrado: {pesos(minimo)}</p>
  }
  const marca = Math.min(100, Math.max(0, ((promedio - minimo) / (maximo - minimo)) * 100))
  return (
    <div>
      <div
        role="img"
        aria-label={`Precio de ${pesos(minimo)} a ${pesos(maximo)}, promedio ${pesos(promedio)}`}
        className="relative h-2 rounded-full bg-gradient-to-r from-primary/25 to-primary"
      >
        <span
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${marca}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Mín. {pesos(minimo)}</span>
        <span>Prom. {pesos(promedio)}</span>
        <span>Máx. {pesos(maximo)}</span>
      </div>
    </div>
  )
}
