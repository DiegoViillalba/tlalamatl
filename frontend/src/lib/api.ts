// Configuración del cliente generado (src/api/). Archivo COMPARTIDO.
import { client } from '@/api/client.gen'
import { cerrarSesion, obtenerSesion, tokenActual } from '@/lib/sesion'

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  auth: tokenActual,
})

// Token vencido o usuario borrado (p. ej. tras `make seed`): volver a la pantalla de entrada.
// Para sesiones Supabase el SDK gestiona la expiración vía onAuthStateChange; no cerrar sesión aquí.
client.interceptors.response.use((respuesta) => {
  const sesion = obtenerSesion()
  if (respuesta.status === 401 && sesion && sesion.origen !== 'supabase') cerrarSesion()
  return respuesta
})

/** Texto legible de un error del backend ({ detail: "..." }) o de red. */
export function mensajeError(error: unknown): string {
  if (error && typeof error === 'object' && 'detail' in error && typeof error.detail === 'string') {
    return error.detail
  }
  if (error instanceof Error) return error.message
  return 'Algo salió mal. Intenta de nuevo.'
}
