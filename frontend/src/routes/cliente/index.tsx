// Rutas y navegación del rol cliente. Dueña: rama rol/cliente.
import { Heart, MapPin, MessageSquareText } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { RequiereRol } from '@/components/requiere-rol'
import { Favoritos } from './favoritos'
import { MisComentarios } from './mis-comentarios'

const nav: ItemNav[] = [
  { a: '/', etiqueta: 'Mapa', icono: MapPin },
  { a: '/cliente', etiqueta: 'Favoritos', icono: Heart, exacto: true },
  { a: '/cliente/comentarios', etiqueta: 'Mis comentarios', icono: MessageSquareText },
]

export const rutasCliente: RouteObject = {
  path: 'cliente',
  element: (
    <RequiereRol rol="cliente">
      <LayoutRol nav={nav} />
    </RequiereRol>
  ),
  children: [
    { index: true, element: <Favoritos /> },
    { path: 'comentarios', element: <MisComentarios /> },
  ],
}
