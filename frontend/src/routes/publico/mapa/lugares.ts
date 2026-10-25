// Lugares reales del mapa: tianguis, mercados públicos y sobre ruedas (SEDECO, Datos Abiertos CDMX)
// y la Central de Abasto (OpenStreetMap). Los datos viven en lugares-datos.ts, que se genera con
// herramientas/limpiar_datos.py y se carga aparte para no inflar el arranque de la app.
import type { Categoria, Dia } from '@/api'

export type Lugar = {
  id: string
  categoria: Categoria
  nombre: string
  alcaldia: string
  colonia?: string
  ubicacion?: string
  lat: number
  lng: number
  dias: Dia[]
  /** false cuando la fuente no publica días y se supone que abre diario (mercados públicos, Central de Abasto) */
  diasFuente: boolean
  horario?: string
  giro?: string
  /** Categorías de giro para filtrar (Abasto, Comida, Ropa y calzado…); `giro` conserva el texto de la fuente */
  giros?: string[]
  locales?: number
  oferentes?: number
  ruta?: string
}

export const FUENTE: Record<Categoria, string> = {
  central_abasto: 'OpenStreetMap',
  mercado_fijo: 'SEDECO, Datos Abiertos CDMX: Mercados públicos',
  mercado_sobre_ruedas: 'SEDECO, Datos Abiertos CDMX: Mercados sobre ruedas',
  tianguis: 'SEDECO, Datos Abiertos CDMX: Tianguis de la Ciudad de México',
}

export function cargarLugares(): Promise<Lugar[]> {
  return import('./lugares-datos').then((m) => m.LUGARES)
}

const DIA_DE: Record<string, Dia> = { Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab', Sun: 'dom' }

/** Día de hoy en la CDMX, igual que `Dia.hoy()` del backend. */
export function diaHoy(): Dia {
  const corto = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Mexico_City' }).format(new Date())
  return DIA_DE[corto]
}
