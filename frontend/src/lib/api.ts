// Configuración del cliente generado (src/api/). Archivo COMPARTIDO.
import { client } from '@/api/client.gen'
import { guardarSesion, obtenerSesion } from '@/lib/sesion'

client.setConfig({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  auth: () => obtenerSesion()?.token,
})

// Token vencido o usuario borrado (p. ej. tras `make seed`): volver a la pantalla de entrada.
client.interceptors.response.use((respuesta) => {
  if (respuesta.status === 401 && obtenerSesion()) guardarSesion(null)
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
