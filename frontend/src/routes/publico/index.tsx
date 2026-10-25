// Rutas públicas (sin login): mapa y dashboard de precios. Dueña: rama rol/cliente.
import { ChartColumn, CircleUser, Heart, LogIn, MapPin, MessageSquareText } from 'lucide-react'
import type { RouteObject } from 'react-router'
import { LayoutRol, type ItemNav } from '@/components/layout-rol'
import { INICIO_POR_ROL, useSesion } from '@/lib/sesion'
import { MapaMercados } from './mapa/mapa'
import { Precios } from './precios/precios'

function LayoutPublico() {
  const sesion = useSesion()
  const nav: ItemNav[] = sesion?.usuario.rol === 'cliente'
    ? [
        { a: '/', etiqueta: 'Mapa', icono: MapPin, exacto: true },
        { a: '/cliente', etiqueta: 'Favoritos', icono: Heart },
        { a: '/cliente/comentarios', etiqueta: 'Mis comentarios', icono: MessageSquareText },
      ]
    : [
        { a: '/', etiqueta: 'Mapa', icono: MapPin, exacto: true },
        { a: '/precios', etiqueta: 'Precios', icono: ChartColumn },
        sesion
          ? { a: INICIO_POR_ROL[sesion.usuario.rol], etiqueta: 'Mi espacio', icono: CircleUser }
          : { a: '/entrar', etiqueta: 'Entrar', icono: LogIn },
      ]
  return <LayoutRol nav={nav} />
}

export const rutasPublicas: RouteObject = {
  element: <LayoutPublico />,
  children: [
    { index: true, element: <MapaMercados /> },
    { path: 'precios', element: <Precios /> },
  ],
}
