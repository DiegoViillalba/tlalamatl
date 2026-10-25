import { IMAGENES_PRODUCTOS, type ImagenProductoDato } from '@/lib/imagenes-productos'

export interface ImagenDeProducto {
  src: string
  credito: string
  licencia: string
  fuente: string
}

/** Minúsculas, sin acentos ni signos: "Limón con semilla" -> ["limon", "con", "semilla"]. */
function palabras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** La palabra del nombre coincide con la clave, también en plural ("nopales" ~ "nopal"). */
function coincide(palabra: string, clave: string): boolean {
  return palabra === clave || palabra === `${clave}s` || palabra === `${clave}es`
}

function aImagen(d: ImagenProductoDato): ImagenDeProducto {
  return { src: d.src, credito: d.autor, licencia: d.licencia, fuente: d.fuente }
}

function buscarDato(nombre: string): ImagenProductoDato | null {
  const pal = palabras(nombre)
  let mejor: { dato: ImagenProductoDato; puntos: number } | null = null
  for (const dato of IMAGENES_PRODUCTOS) {
    for (const frase of dato.claves) {
      const claves = palabras(frase)
      if (claves.length === 0 || !claves.every((c) => pal.some((p) => coincide(p, c)))) continue
      if (!mejor || claves.length > mejor.puntos) mejor = { dato, puntos: claves.length }
    }
  }
  return mejor ? mejor.dato : null
}

/**
 * Imagen ilustrativa de un producto por palabras clave del nombre
 * ("Jitomate saladet" y "Jitomate bola" -> jitomate; "Nopales limpios" -> nopal).
 * Cada imagen define frases clave; se exigen TODAS las palabras de la frase, y gana la frase más
 * específica. Si no hay coincidencia clara devuelve null (mejor sin imagen que con una equivocada).
 */
export function imagenDeProducto(nombre: string): ImagenDeProducto | null {
  const dato = buscarDato(nombre)
  return dato ? aImagen(dato) : null
}

/** Imágenes únicas realmente usadas por una lista de nombres de producto (para los créditos). */
export function imagenesUsadas(nombres: string[]): ImagenProductoDato[] {
  const vistas = new Map<string, ImagenProductoDato>()
  for (const nombre of nombres) {
    const dato = buscarDato(nombre)
    if (dato) vistas.set(dato.src, dato)
  }
  return [...vistas.values()]
}
