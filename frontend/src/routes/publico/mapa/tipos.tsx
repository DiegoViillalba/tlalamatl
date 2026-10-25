// Tipos de mercado del mapa: color y forma. La forma va junto al color para no depender solo del color.
import type { CSSProperties } from 'react'
import type { Categoria } from '@/api'

export type Tipo = 'ca' | 'mp' | 'tq' | 'mr'

export const TIPOS: Record<Tipo, { nombre: string; corto: string; color: string }> = {
  ca: { nombre: 'Central de Abasto', corto: 'Central de Abasto', color: '#e8203a' },
  mp: { nombre: 'Mercado fijo', corto: 'Mercados fijos', color: '#3f8a46' },
  tq: { nombre: 'Tianguis', corto: 'Tianguis', color: '#1f6fd1' },
  mr: { nombre: 'Mercado sobre ruedas', corto: 'Sobre ruedas', color: '#e2780c' },
}

export const TIPO_DE_CATEGORIA: Record<Categoria, Tipo> = {
  central_abasto: 'ca',
  mercado_fijo: 'mp',
  tianguis: 'tq',
  mercado_sobre_ruedas: 'mr',
}

export const ORDEN_TIPOS = Object.keys(TIPOS) as Tipo[]

function Dibujo({ tipo }: { tipo: Tipo }) {
  switch (tipo) {
    case 'ca':
      return <rect x="2" y="2" width="12" height="12" rx="1" />
    case 'mp':
      return <circle cx="8" cy="8" r="6.5" />
    case 'tq':
      return <path d="M8 1 15 8 8 15 1 8z" />
    case 'mr':
      return <path d="M8 1.5 15 14.5H1z" />
  }
}

/** Forma del tipo dentro de un svg de 16 × 16. Se pinta con `fill` (o con el color del texto si no se da). */
export function FormaTipo({ tipo, className, style }: { tipo: Tipo; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} style={style}>
      <Dibujo tipo={tipo} />
    </svg>
  )
}

/** Forma anidada dentro de otro svg (pines del mapa). */
export function FormaTipoAnidada({ tipo, x, y, size }: { tipo: Tipo; x: number; y: number; size: number }) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 16 16" className="mapa-pin-simbolo">
      <g fill="#fff">
        <Dibujo tipo={tipo} />
      </g>
    </svg>
  )
}
