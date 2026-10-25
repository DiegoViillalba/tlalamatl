// Rutas y navegación del rol comerciante. Dueña: rama rol/comercio.
import { ClipboardList, LayoutDashboard, Package, Truck } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { Pendiente } from '@/components/pendiente'
import { RequiereRol } from '@/components/requiere-rol'
import { Inicio } from './inicio'

const DOC = 'docs/alcance/comercio.md'

const nav: ItemNav[] = [
  { a: '/comercio', etiqueta: 'Inicio', icono: LayoutDashboard, exacto: true },
  { a: '/comercio/inventario', etiqueta: 'Inventario', icono: Package },
  { a: '/comercio/pedidos', etiqueta: 'Pedidos', icono: ClipboardList },
  { a: '/comercio/abastecerme', etiqueta: 'Abastecerme', icono: Truck },
]

export const rutasComercio: RouteObject = {
  path: 'comercio',
  element: (
    <RequiereRol rol="comerciante">
      <LayoutRol nav={nav} />
    </RequiereRol>
  ),
  children: [
    { index: true, element: <Inicio /> },
    { path: 'inventario', element: <Pendiente titulo="Inventario" doc={DOC} /> },
    { path: 'pedidos', element: <Pendiente titulo="Pedidos recibidos" doc={DOC} /> },
    { path: 'abastecerme', element: <Pendiente titulo="Abastecerme" doc={DOC} /> },
  ],
}
