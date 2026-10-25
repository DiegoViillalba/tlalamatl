import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Rol } from '@/api'
import { INICIO_POR_ROL, useSesion } from '@/lib/sesion'

/** Guard de ruta: sin sesión manda a /entrar; con otro rol, a su propio inicio. */
export function RequiereRol({ rol, children }: { rol: Rol; children: ReactNode }) {
  const sesion = useSesion()
  if (!sesion) return <Navigate to="/entrar" replace />
  if (sesion.usuario.rol !== rol) return <Navigate to={INICIO_POR_ROL[sesion.usuario.rol]} replace />
  return children
}
