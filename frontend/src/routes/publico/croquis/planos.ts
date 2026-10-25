// Planos de mercados públicos: contorno real del edificio (OpenStreetMap) y datos de SEDECO; zonas, locales y
// locatarios ilustrativos. Los datos viven en planos-datos.ts y se cargan aparte, como lugares-datos.ts.
// La generación de locales está portada de m2.html.
import { queryOptions } from '@tanstack/react-query'

export type Punto = [number, number]

export type ProductoLocal = { producto: string; precio: number; unidad: string }

export type LocalDemo = {
  zona: string
  puesto: string
  locatario: string
  horario: string
  telefono: string
  /** null cuando el puesto no tiene WhatsApp */
  whatsapp: string | null
  inventario: ProductoLocal[]
}

export type Plano = {
  /** Mismo id que el lugar del mapa (`mp-NN`) */
  id: string
  corto: string
  nombre: string
  alcaldia: string
  colonia?: string
  ubicacion?: string
  /** Locales que reporta SEDECO */
  locales: number
  giro?: string
  anio?: string
  lat: number
  lng: number
  osm: string
  /** Contorno del edificio en metros, con el origen arriba a la izquierda */
  contorno: Punto[]
  ancho: number
  alto: number
  /** Zonas por giro; `parte` es la fracción de locales de cada una */
  zonas: { nombre: string; parte: number }[]
  localesDemo: LocalDemo[]
}

/** Un local dibujado en el plano; `demo` es el puesto de Tlalamatl que lo ocupa, si hay. */
export type Local = {
  num: number
  x: number
  y: number
  w: number
  cx: number
  cy: number
  zona: number
  demo?: LocalDemo
  demoN?: number
}

/** Los planos no cambian: se cargan una vez y los comparten el croquis y la ficha del mapa. */
export const planosQuery = queryOptions({
  queryKey: ['planos-mercados'],
  queryFn: (): Promise<Record<string, Plano>> => import('./planos-datos').then((m) => m.PLANOS),
  staleTime: Infinity,
})

// Un color por zona: el color dice el giro del local
export const COLORES_ZONA = ['#f4b6c8', '#b9dcae', '#ffd98a', '#b3d3f2', '#d8c2ee', '#ffc29e']

export function colorZona(i: number) {
  return COLORES_ZONA[i % COLORES_ZONA.length]
}

const PASILLO = 2.4
const MARGEN_MURO = 1.6

function dentro([x, y]: Punto, poli: Punto[]) {
  let si = false
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i]
    const [xj, yj] = poli[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) si = !si
  }
  return si
}

function area(poli: Punto[]) {
  let a = 0
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) a += (poli[j][0] + poli[i][0]) * (poli[j][1] - poli[i][1])
  return Math.abs(a / 2)
}

/**
 * Bandas de dos locales de fondo separadas por pasillos a lo largo del edificio, y un pasillo transversal
 * cada 12 locales. El tamaño del local se calcula para que quepan los locales que reporta SEDECO.
 */
export function generaLocales(p: Plano): Local[] {
  const A = area(p.contorno) * 0.92
  const N = p.locales
  const w = (-PASILLO + Math.sqrt(PASILLO ** 2 + (16 * A) / N)) / 4
  const celdas: Local[] = []
  for (let y = MARGEN_MURO + PASILLO; y + 2 * w <= p.alto - MARGEN_MURO; y += 2 * w + PASILLO) {
    for (let fila = 0; fila < 2; fila++) {
      const y0 = y + fila * w
      let col = 0
      for (let x = MARGEN_MURO; x + w <= p.ancho - MARGEN_MURO; x += w) {
        if (col > 0 && col % 12 === 0) {
          x += PASILLO
          if (x + w > p.ancho - MARGEN_MURO) break
        }
        col++
        const esquinas: Punto[] = [[x, y0], [x + w, y0], [x, y0 + w], [x + w, y0 + w]]
        if (esquinas.every((e) => dentro(e, p.contorno))) celdas.push({ num: 0, x, y: y0, w, cx: x + w / 2, cy: y0 + w / 2, zona: 0 })
      }
    }
  }
  // Zonas por franjas a lo largo del edificio, en proporción a su parte
  celdas.sort((a, b) => a.cx - b.cx || a.cy - b.cy)
  const lista = celdas.slice(0, N)
  // Cada zona termina en una columna completa para que no se mezclen colores dentro de una columna
  let zona = 0
  let acumulado = p.zonas[0].parte * lista.length
  let xPrev: number | null = null
  lista.forEach((c, i) => {
    const otraColumna = xPrev !== null && Math.abs(c.cx - xPrev) > 1e-6
    if (otraColumna && i >= acumulado && zona < p.zonas.length - 1) {
      zona++
      acumulado += p.zonas[zona].parte * lista.length
    }
    c.zona = zona
    xPrev = c.cx
  })
  // Número de local: de arriba abajo y de izquierda a derecha, como se recorre el mercado
  ;[...lista].sort((a, b) => a.cy - b.cy || a.cx - b.cx).forEach((c, n) => {
    c.num = n + 1
  })
  // Los puestos demo van repartidos dentro de su zona
  const usados = new Set<Local>()
  p.localesDemo.forEach((d, k) => {
    const zi = p.zonas.findIndex((z) => z.nombre === d.zona)
    const deZona = lista.filter((c) => c.zona === zi && !usados.has(c))
    const c = deZona[Math.floor((((k * 7 + 3) % 11) / 11) * deZona.length)] ?? deZona[0]
    if (c) {
      c.demo = d
      c.demoN = k + 1
      usados.add(c)
    }
  })
  return lista
}

/** 5500000301 → 55 0000 0301 */
export function fmtTel(t: string) {
  return `${t.slice(0, 2)} ${t.slice(2, 6)} ${t.slice(6)}`
}
