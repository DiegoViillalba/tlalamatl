// Cliente de Supabase Auth (login por código de correo). Archivo COMPARTIDO.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const llave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** null si faltan las variables de entorno: la app sigue funcionando solo con el login demo. */
export const supabase = url && llave ? createClient(url, llave) : null
