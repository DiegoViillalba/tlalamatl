// Proyección y medidas del mapa de mercados. Portado de m1.html (decisiones de la versión estática).
import { CDMX } from './cdmx'

export const ZOCALO = { lat: 19.4326, lon: -99.1332 }

// Margen alrededor de la ciudad para que los pines del borde no queden pegados al encuadre
const MARGEN = 30
export const VISTA_TODA = {
  x: -MARGEN,
  y: -MARGEN,
  w: CDMX.ancho + MARGEN * 2,
  h: CDMX.alto + MARGEN * 2,
}

// Tintes claros para las alcaldías; los pines van en color pleno encima
export const TINTES = ['#fde2ec', '#e4f2df', '#fff3c4', '#ffe4c9', '#d9f2f4', '#ffdbe0', '#efe3f7', '#e9f5d9']

export function proyecta(lat: number, lon: number) {
  return {
    x: (lon - CDMX.lon0) * CDMX.kx * CDMX.escala,
    y: (CDMX.lat1 - lat) * CDMX.escala,
  }
}

/** Distancia en línea recta (fórmula de Haversine), en kilómetros. */
export function distanciaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371
  const r = (x: number) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat)
  const dLon = r(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function fmtKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

/** Para comparar texto de búsqueda sin importar mayúsculas ni acentos. */
export function sinAcentos(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

const NOMBRE_CORTO: Record<string, string> = {
  'Cuajimalpa de Morelos': 'Cuajimalpa',
  'La Magdalena Contreras': 'Magdalena Contreras',
}

export function nombreCorto(alcaldia: string) {
  return NOMBRE_CORTO[alcaldia] ?? alcaldia
}
