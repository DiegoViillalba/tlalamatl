// Rutas y navegación del rol cliente. Dueña: rama rol/cliente.
import { ReceiptText, ShoppingBasket, Store } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { Pendiente } from '@/components/pendiente'
import { RequiereRol } from '@/components/requiere-rol'
import { Explorar } from './explorar'
import { MisPedidos } from './mis-pedidos'

const nav: ItemNav[] = [
  { a: '/cliente', etiqueta: 'Explorar', icono: Store, exacto: true },
  { a: '/cliente/carrito', etiqueta: 'Carrito', icono: ShoppingBasket },
  { a: '/cliente/pedidos', etiqueta: 'Mis pedidos', icono: ReceiptText },
]

export const rutasCliente: RouteObject = {
  path: 'cliente',
  element: (
    <RequiereRol rol="cliente">
      <LayoutRol nav={nav} />
    </RequiereRol>
  ),
  children: [
    { index: true, element: <Explorar /> },
    { path: 'carrito', element: <Pendiente titulo="Carrito" doc="docs/alcance/cliente.md" /> },
    { path: 'pedidos', element: <MisPedidos /> },
  ],
}
