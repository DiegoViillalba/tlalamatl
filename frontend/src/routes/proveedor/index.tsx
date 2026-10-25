// Rutas y navegación del rol proveedor. Dueña: rama rol/proveedor.
import { Inbox, Store, Tags, Truck } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { RequiereRol } from '@/components/requiere-rol'
import { Compradores } from './compradores'
import { MisOfertas } from './ofertas'
import { Ordenes } from './ordenes'
import { Rutas } from './rutas'

const nav: ItemNav[] = [
  { a: '/proveedor', etiqueta: 'Órdenes', icono: Inbox, exacto: true },
  { a: '/proveedor/ofertas', etiqueta: 'Mis ofertas', icono: Tags },
  { a: '/proveedor/compradores', etiqueta: 'Compradores', icono: Store },
  { a: '/proveedor/rutas', etiqueta: 'Rutas', icono: Truck },
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
    { path: 'ofertas', element: <MisOfertas /> },
    { path: 'compradores', element: <Compradores /> },
    { path: 'rutas', element: <Rutas /> },
  ],
}
