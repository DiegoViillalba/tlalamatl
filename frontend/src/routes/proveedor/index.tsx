// Rutas y navegación del rol proveedor. Dueña: rama rol/proveedor.
import { Inbox, Tags } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { Pendiente } from '@/components/pendiente'
import { RequiereRol } from '@/components/requiere-rol'
import { Ordenes } from './ordenes'

const nav: ItemNav[] = [
  { a: '/proveedor', etiqueta: 'Órdenes', icono: Inbox, exacto: true },
  { a: '/proveedor/ofertas', etiqueta: 'Mis ofertas', icono: Tags },
]

export const rutasProveedor: RouteObject = {
  path: 'proveedor',
  element: (
    <RequiereRol rol="proveedor">
      <LayoutRol nav={nav} />
    </RequiereRol>
  ),
  children: [
    { index: true, element: <Ordenes /> },
    { path: 'ofertas', element: <Pendiente titulo="Mis ofertas" doc="docs/alcance/proveedor.md" /> },
  ],
}
