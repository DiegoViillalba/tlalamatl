import type { ReactNode } from 'react'

/** Título de pantalla con descripción opcional. */
export function Encabezado({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="font-heading text-xl font-semibold tracking-tight">{titulo}</h1>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </div>
  )
}
