// Rutas y navegación del rol comerciante. Dueña: rama rol/comercio.
import { ClipboardList, LayoutDashboard, Tag, Truck } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { RequiereRol } from '@/components/requiere-rol'
import { DemoComercio } from './demo'
import { Inicio } from './inicio'
import { MisPrecios } from './productos'
import { Proveedores } from './proveedores'
import { Solicitudes } from './solicitudes'

const nav: ItemNav[] = [
  { a: '/comercio', etiqueta: 'Inicio', icono: LayoutDashboard, exacto: true },
  { a: '/comercio/productos', etiqueta: 'Mis precios', icono: Tag },
  { a: '/comercio/proveedores', etiqueta: 'Proveedores', icono: Truck },
  { a: '/comercio/solicitudes', etiqueta: 'Solicitudes', icono: ClipboardList },
]

export const rutasComercio: RouteObject = {
  path: 'comercio',
  element: (
    <RequiereRol rol="comerciante">
      <DemoComercio>
        <LayoutRol nav={nav} />
      </DemoComercio>
    </RequiereRol>
  ),
  children: [
    { index: true, element: <Inicio /> },
    { path: 'productos', element: <MisPrecios /> },
    { path: 'proveedores', element: <Proveedores /> },
    { path: 'solicitudes', element: <Solicitudes /> },
  ],
}
