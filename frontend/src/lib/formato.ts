// Etiquetas y formatos en español. Archivo COMPARTIDO.
import type { Categoria, Dia, EstadoPedido, Rol, TipoProveedor } from '@/api'

export const CATEGORIAS: Record<Categoria, string> = {
  central_abasto: 'Central de Abasto',
  mercado_fijo: 'Mercado fijo',
  mercado_sobre_ruedas: 'Mercado sobre ruedas',
  tianguis: 'Tianguis',
}

export const DIAS: Record<Dia, string> = {
  lun: 'Lun',
  mar: 'Mar',
  mie: 'Mié',
  jue: 'Jue',
  vie: 'Vie',
  sab: 'Sáb',
  dom: 'Dom',
}

export const ROLES: Record<Rol, string> = {
  cliente: 'Cliente',
  comerciante: 'Comerciante',
  proveedor: 'Proveedor',
}

export const TIPOS_PROVEEDOR: Record<TipoProveedor, string> = {
  productor: 'Productor',
  mayorista: 'Mayorista',
  almacen: 'Almacén',
}

// EstadoOrden se agrega aquí cuando algún endpoint la exponga en el cliente generado.
export const ESTADOS_PEDIDO: Record<EstadoPedido, string> = {
  creado: 'Nuevo',
  aceptado: 'Aceptado',
  listo: 'Listo para recoger',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

// Categorías de ProductoBase (dashboard de precios). Una categoría nueva sin etiqueta se muestra tal cual.
export const CATEGORIAS_PRODUCTO: Record<string, string> = {
  fruta: 'Frutas',
  verdura: 'Verduras',
  abarrote: 'Abarrotes',
  proteina: 'Carne y huevo',
}

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Mes actual (1-12) en horario de la CDMX. */
export function mesActual() {
  return Number(new Intl.DateTimeFormat('es-MX', { month: 'numeric', timeZone: 'America/Mexico_City' }).format(new Date()))
}

const pesosMx = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function pesos(cantidad: number) {
  return pesosMx.format(cantidad)
}

export function fechaCorta(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}
