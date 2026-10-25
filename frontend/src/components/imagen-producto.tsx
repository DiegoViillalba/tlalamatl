import { useState } from 'react'
import { ShoppingBasket } from 'lucide-react'
import { imagenDeProducto, imagenesUsadas } from '@/lib/imagenes'
import { cn } from '@/lib/utils'

/** Leyenda reutilizable para las pantallas que muestran fotos de producto. */
export const LEYENDA_IMAGENES = 'Imágenes ilustrativas'

/**
 * Foto ilustrativa de un producto (cuadrada). Sin imagen o si falla la carga muestra un ícono.
 * El tamaño se da por `className`, p. ej. `size-16`. Todas las fotos salen de /productos/.
 */
export function ImagenProducto({ nombre, className }: { nombre: string; className?: string }) {
  const imagen = imagenDeProducto(nombre)
  const [fallo, setFallo] = useState(false)
  const base = 'aspect-square shrink-0 rounded-lg'

  if (!imagen || fallo) {
    return (
      <div
        role="img"
        aria-label={`Sin imagen de ${nombre}`}
        className={cn(base, 'flex size-12 items-center justify-center bg-muted text-muted-foreground', className)}
      >
        <ShoppingBasket className="size-1/2" aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={imagen.src}
      alt={`Imagen ilustrativa de ${nombre.toLowerCase()}`}
      title={`${LEYENDA_IMAGENES}. ${imagen.credito} · ${imagen.licencia}`}
      loading="lazy"
      onError={() => setFallo(true)}
      className={cn(base, 'size-12 bg-muted object-cover', className)}
    />
  )
}

/**
 * Pie de pantalla: lista colapsable con autor, licencia y fuente de las fotos usadas.
 * Pasa los nombres de los productos mostrados; solo se listan las fotos que de verdad aparecen.
 */
export function CreditosImagenes({ nombres, className }: { nombres: string[]; className?: string }) {
  const usadas = imagenesUsadas(nombres)
  if (usadas.length === 0) return null

  return (
    <details className={cn('text-xs text-muted-foreground', className)}>
      <summary className="cursor-pointer select-none">
        {LEYENDA_IMAGENES} · créditos ({usadas.length})
      </summary>
      <ul className="mt-2 space-y-1">
        {usadas.map((d) => (
          <li key={d.src}>
            <span className="font-medium text-foreground">{d.etiqueta}:</span> {d.autor} · {d.licencia} ·{' '}
            <a href={d.fuente} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              fuente
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
