// Sesión demo (token + usuario) guardada en localStorage. Archivo COMPARTIDO.
import { useSyncExternalStore } from 'react'
import type { Rol, Usuario } from '@/api'

export type Sesion = { token: string; usuario: Usuario }

const CLAVE = 'tlalamatl.sesion'
const oyentes = new Set<() => void>()

function leer(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as Sesion) : null
  } catch {
    return null
  }
}

let actual = leer()

export function obtenerSesion() {
  return actual
}

export function guardarSesion(sesion: Sesion | null) {
  actual = sesion
  try {
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin localStorage (webview restringida): la sesión vive solo en memoria.
  }
  oyentes.forEach((avisar) => avisar())
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar)
  return () => oyentes.delete(avisar)
}

export function useSesion() {
  return useSyncExternalStore(suscribir, obtenerSesion)
}

/** Ruta de inicio de cada rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  cliente: '/cliente',
  comerciante: '/comercio',
  proveedor: '/proveedor',
}
