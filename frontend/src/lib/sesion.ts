// Sesión (demo o Supabase) guardada en localStorage. Archivo COMPARTIDO.
import { useSyncExternalStore } from 'react'
import type { Rol, Usuario } from '@/api'
import { supabase } from '@/lib/supabase'

/** Demo: guardamos nuestro JWT. Supabase: su SDK guarda y refresca el token, aquí solo va el usuario. */
export type Sesion = { usuario: Usuario } & ({ origen?: 'demo'; token: string } | { origen: 'supabase' })

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

/** Token para la API. El de Supabase vence cada hora; `getSession()` lo devuelve ya refrescado. */
export async function tokenActual() {
  const sesion = actual
  if (sesion?.origen !== 'supabase') return sesion?.token
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
  return data.session?.access_token
}

export function cerrarSesion() {
  if (actual?.origen === 'supabase') void supabase?.auth.signOut()
  guardarSesion(null)
}

// Si Supabase cierra la sesión por su cuenta (refresh token revocado o vencido), también se cierra aquí.
supabase?.auth.onAuthStateChange((evento) => {
  if (evento === 'SIGNED_OUT' && actual?.origen === 'supabase') guardarSesion(null)
})

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
