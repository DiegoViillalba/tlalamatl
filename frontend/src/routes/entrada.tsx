import { isAuthError, type SupabaseClient } from '@supabase/supabase-js'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ChevronRight, Mail, ShoppingBasket, Store, Truck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { authVincularCuenta, type Rol, type Usuario, type UsuarioDemo } from '@/api'
import { authDemoLoginMutation, authUsuariosDemoOptions } from '@/api/@tanstack/react-query.gen'
import { Isotipo } from '@/components/marca'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeError } from '@/lib/api'
import { guardarSesion, INICIO_POR_ROL } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'

const TARJETAS: { rol: Rol; titulo: string; descripcion: string; icono: LucideIcon }[] = [
  { rol: 'cliente', titulo: 'Entrar como cliente', descripcion: 'Compra en tianguis, mercados y la Central.', icono: ShoppingBasket },
  { rol: 'comerciante', titulo: 'Entrar como comerciante', descripcion: 'Publica tus precios y abastece tu puesto.', icono: Store },
  { rol: 'proveedor', titulo: 'Entrar como proveedor', descripcion: 'Publica ofertas de mayoreo y surte comercios.', icono: Truck },
]

export function Entrada() {
  const navegar = useNavigate()
  const usuarios = useQuery(authUsuariosDemoOptions())
  const login = useMutation({
    ...authDemoLoginMutation(),
    onSuccess: (datos) => {
      guardarSesion(datos)
      navegar(INICIO_POR_ROL[datos.usuario.rol])
    },
    onError: (error) => toast.error(mensajeError(error)),
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <section className="bg-primary px-6 pt-6 pb-8 text-primary-foreground">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm opacity-90 hover:opacity-100">
          <ArrowLeft className="size-4" />
          Volver al mapa
        </Link>
        <Isotipo className="block size-12 rounded-xl ring-2 ring-primary-foreground/30" />
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">Tlalamatl</h1>
        <p className="mt-1 text-sm opacity-90">
          <em>“Mapa de tierra”</em>. Del productor al mercado, del mercado a tu mesa.
        </p>
      </section>

      <div className="space-y-4 px-4 py-5">
        <p className="text-sm text-muted-foreground">No necesitas cuenta para ver el mapa y los precios. Entra para guardar favoritos, comentar o administrar tu puesto u ofertas.</p>

        {supabase && <EntrarConCorreo cliente={supabase} />}

        <p className="pt-2 text-sm font-medium">{supabase ? 'O entra con un usuario demo' : 'Prototipo demo: elige un usuario sembrado.'}</p>

        {usuarios.isError && (
          <Alert variant="destructive">
            <AlertTitle>No se pudo conectar con la API</AlertTitle>
            <AlertDescription>¿Está corriendo el backend? Prueba con <code>make dev</code>.</AlertDescription>
          </Alert>
        )}

        {TARJETAS.map(({ rol, titulo, descripcion, icono: Icono }) => (
          <Card key={rol}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icono className="size-5 text-primary" />
                {titulo}
              </CardTitle>
              <CardDescription>{descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {usuarios.isPending &&
                Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              {usuarios.data?.[rol].map((u: UsuarioDemo) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={login.isPending}
                  onClick={() => login.mutate({ body: { usuario_id: u.id } })}
                  className="flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{u.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">{u.detalle ?? u.alcaldia}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function mensajeAuth(error: unknown, generico: string) {
  if (isAuthError(error) && error.status === 429) return 'Espera un momento antes de pedir otro código.'
  return isAuthError(error) ? generico : mensajeError(error)
}

/** Login sin contraseña: Supabase manda un código al correo y aquí se escribe (sirve dentro de la webview). */
function EntrarConCorreo({ cliente }: { cliente: SupabaseClient }) {
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [codigoEnviado, setCodigoEnviado] = useState(false)

  const enviar = useMutation({
    mutationFn: async () => {
      const { error } = await cliente.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
      if (error) throw error
    },
    onSuccess: () => {
      setCodigoEnviado(true)
      toast.success('Te enviamos un código a tu correo.')
    },
    onError: (error) => toast.error(mensajeAuth(error, 'No pudimos enviar el código. Revisa tu correo e intenta de nuevo.')),
  })

  const verificar = useMutation({
    mutationFn: async (): Promise<Usuario> => {
      const { data, error } = await cliente.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: 'email' })
      if (error) throw error
      const token = data.session?.access_token
      if (!token) throw new Error('No se pudo iniciar sesión. Intenta de nuevo.')
      try {
        const { data: usuario } = await authVincularCuenta({ headers: { Authorization: `Bearer ${token}` }, throwOnError: true })
        return usuario
      } catch (e) {
        await cliente.auth.signOut()
        throw e
      }
    },
    onSuccess: (usuario) => {
      guardarSesion({ origen: 'supabase', usuario })
      // alcaldia vacía = usuario nuevo que aún no completó su perfil
      navegar(usuario.alcaldia === '' ? '/registro' : INICIO_POR_ROL[usuario.rol])
    },
    onError: (error) => toast.error(mensajeAuth(error, 'El código no es válido o ya venció.')),
  })

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    if (codigoEnviado) verificar.mutate()
    else enviar.mutate()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5 text-primary" />
          Entrar con tu correo
        </CardTitle>
        <CardDescription>Te mandamos un código de un solo uso. Sin contraseñas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={alEnviar} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={codigoEnviado}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {codigoEnviado && (
            <div className="space-y-1.5">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={enviar.isPending || verificar.isPending}>
            {codigoEnviado ? 'Entrar' : 'Enviarme un código'}
          </Button>
          {codigoEnviado && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setCodigoEnviado(false)
                setCodigo('')
              }}
            >
              Cambiar correo
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
