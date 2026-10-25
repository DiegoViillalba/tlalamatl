// Datos y estado simulados del rol comerciante mientras no existen los endpoints de comercio
// (ver "Endpoints que consume" en docs/alcance/comercio.md). Los proveedores y ofertas copian el seed;
// lo que el comerciante cambia vive solo en memoria y se pierde al recargar.
import { FlaskConical, MessageCircle, Phone } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TipoProveedor } from '@/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { EstadoOrden } from '@/lib/formato'

export type OfertaDemo = { id: number; producto: string; unidad: string; precio: number; minimo: number }

export type ProveedorDemo = {
  id: number
  nombre: string
  tipo: TipoProveedor
  zona: string
  telefono: string
  whatsapp: string
  ofertas: OfertaDemo[] // solo las disponibles
}

export type ItemSolicitud = { producto: string; unidad: string; cantidad: number; precio: number }

export type SolicitudDemo = {
  id: number
  proveedor: ProveedorDemo
  items: ItemSolicitud[]
  estado: EstadoOrden
  creado_en: string
}

export const PROVEEDORES: ProveedorDemo[] = [
  {
    id: 1,
    nombre: 'Distribuidora Hortícola del Valle',
    tipo: 'mayorista',
    zona: 'Central de Abasto, Iztapalapa',
    telefono: '5500000201',
    whatsapp: '5500000201',
    ofertas: [
      { id: 101, producto: 'Jitomate saladet', unidad: 'kg', precio: 16, minimo: 20 },
      { id: 102, producto: 'Cebolla blanca', unidad: 'kg', precio: 13, minimo: 20 },
      { id: 103, producto: 'Chile serrano', unidad: 'kg', precio: 30, minimo: 10 },
      { id: 104, producto: 'Papa blanca', unidad: 'kg', precio: 14, minimo: 50 },
      { id: 105, producto: 'Zanahoria', unidad: 'kg', precio: 9, minimo: 50 },
      { id: 106, producto: 'Chayote', unidad: 'kg', precio: 14, minimo: 30 },
      { id: 107, producto: 'Plátano tabasco', unidad: 'kg', precio: 12, minimo: 50 },
    ],
  },
  {
    id: 2,
    nombre: 'Abarrotera Mayorista San Juan',
    tipo: 'mayorista',
    zona: 'Centro Histórico, Cuauhtémoc',
    telefono: '5500000202',
    whatsapp: '5500000202',
    ofertas: [
      { id: 201, producto: 'Frijol negro', unidad: 'kg', precio: 27, minimo: 50 },
      { id: 202, producto: 'Arroz súper extra', unidad: 'kg', precio: 21, minimo: 50 },
      { id: 203, producto: 'Chile guajillo', unidad: 'kg', precio: 130, minimo: 5 },
      { id: 204, producto: 'Azúcar estándar', unidad: 'kg', precio: 23, minimo: 50 },
      { id: 205, producto: 'Huevo blanco', unidad: 'kg', precio: 36, minimo: 30 },
    ],
  },
  {
    id: 3,
    nombre: 'Cooperativa Hortalizas de Xochimilco',
    tipo: 'productor',
    zona: 'Chinampas de Xochimilco',
    telefono: '5500000203',
    whatsapp: '5500000203',
    ofertas: [
      { id: 301, producto: 'Cilantro', unidad: 'manojo', precio: 5, minimo: 50 },
      { id: 302, producto: 'Lechuga romana', unidad: 'pieza', precio: 8, minimo: 40 },
      { id: 303, producto: 'Nopales limpios', unidad: 'kg', precio: 20, minimo: 20 },
      { id: 304, producto: 'Jícama', unidad: 'kg', precio: 12, minimo: 30 },
      { id: 305, producto: 'Brócoli', unidad: 'kg', precio: 24, minimo: 20 },
      { id: 306, producto: 'Zanahoria', unidad: 'kg', precio: 10, minimo: 40 },
    ],
  },
  {
    id: 4,
    nombre: 'Aguacateros de Uruapan',
    tipo: 'productor',
    zona: 'Uruapan, Michoacán',
    telefono: '5500000204',
    whatsapp: '5500000204',
    ofertas: [
      { id: 401, producto: 'Aguacate hass', unidad: 'kg', precio: 48, minimo: 30 },
      { id: 402, producto: 'Limón con semilla', unidad: 'kg', precio: 20, minimo: 30 },
      { id: 403, producto: 'Guayaba', unidad: 'kg', precio: 20, minimo: 30 },
      { id: 404, producto: 'Mandarina', unidad: 'kg', precio: 18, minimo: 30 },
      { id: 405, producto: 'Mango ataulfo', unidad: 'kg', precio: 26, minimo: 30 },
    ],
  },
]

const haceDias = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString()

const SOLICITUDES_INICIALES: SolicitudDemo[] = [
  {
    id: 2,
    proveedor: PROVEEDORES[0],
    items: [{ producto: 'Jitomate saladet', unidad: 'kg', cantidad: 40, precio: 16 }],
    estado: 'enviada',
    creado_en: haceDias(1),
  },
  {
    id: 1,
    proveedor: PROVEEDORES[1],
    items: [
      { producto: 'Frijol negro', unidad: 'kg', cantidad: 50, precio: 27 },
      { producto: 'Arroz súper extra', unidad: 'kg', cantidad: 50, precio: 21 },
    ],
    estado: 'confirmada',
    creado_en: haceDias(3),
  },
]

type Demo = {
  solicitudes: SolicitudDemo[]
  solicitar: (proveedor: ProveedorDemo, item: ItemSolicitud) => void
  recibir: (id: number) => void
}

const DemoContexto = createContext<Demo | null>(null)

export function DemoComercio({ children }: { children: ReactNode }) {
  const [solicitudes, setSolicitudes] = useState(SOLICITUDES_INICIALES)

  function solicitar(proveedor: ProveedorDemo, item: ItemSolicitud) {
    setSolicitudes((prev) => [
      {
        id: Math.max(0, ...prev.map((s) => s.id)) + 1,
        proveedor,
        items: [item],
        estado: 'solicitada',
        creado_en: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  function recibir(id: number) {
    setSolicitudes((prev) => prev.map((s) => (s.id === id && s.estado === 'enviada' ? { ...s, estado: 'recibida' } : s)))
  }

  return <DemoContexto.Provider value={{ solicitudes, solicitar, recibir }}>{children}</DemoContexto.Provider>
}

export function useDemoComercio() {
  const demo = useContext(DemoContexto)
  if (!demo) throw new Error('useDemoComercio va dentro de <DemoComercio>')
  return demo
}

/** Aviso fijo en las pantallas cuyos cambios todavía no se guardan en el backend. */
export function AvisoDemo({ children }: { children: ReactNode }) {
  return (
    <Alert>
      <FlaskConical />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

/** Botones Llamar y WhatsApp. */
export function Contacto({ telefono, whatsapp }: { telefono: string; whatsapp: string }) {
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm" className="flex-1">
        <a href={`tel:${telefono}`}>
          <Phone />
          Llamar
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="flex-1">
        <a href={`https://wa.me/52${whatsapp}`} target="_blank" rel="noreferrer">
          <MessageCircle />
          WhatsApp
        </a>
      </Button>
    </div>
  )
}
