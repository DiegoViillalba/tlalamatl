import { useMutation, useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, ShoppingBasket, Store, Truck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { Rol, UsuarioDemo } from '@/api'
import { authDemoLoginMutation, authUsuariosDemoOptions } from '@/api/@tanstack/react-query.gen'
import { Isotipo } from '@/components/marca'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { mensajeError } from '@/lib/api'
import { guardarSesion, INICIO_POR_ROL } from '@/lib/sesion'

const TARJETAS: { rol: Rol; titulo: string; descripcion: string; icono: LucideIcon }[] = [
  { rol: 'cliente', titulo: 'Entrar como cliente', descripcion: 'Compra en tianguis, mercados y la Central.', icono: ShoppingBasket },
  { rol: 'comerciante', titulo: 'Entrar como comerciante', descripcion: 'Vende, recibe pedidos y abastece tu puesto.', icono: Store },
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
      <section className="bg-primary px-6 pt-10 pb-8 text-primary-foreground">
        <Isotipo className="size-12 rounded-xl ring-2 ring-primary-foreground/30" />
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">Tlalamatl</h1>
        <p className="mt-1 text-sm opacity-90">
          <em>“Mapa de tierra”</em>. Del productor al mercado, del mercado a tu mesa.
        </p>
      </section>

      <div className="space-y-4 px-4 py-5">
        <p className="text-sm text-muted-foreground">Prototipo demo: elige un usuario sembrado para entrar.</p>

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
