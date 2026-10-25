import type { LucideIcon } from 'lucide-react'
import { LogIn, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Marca } from '@/components/marca'
import { Button } from '@/components/ui/button'
import { guardarSesion, useSesion } from '@/lib/sesion'
import { ROLES } from '@/lib/formato'
import { cn } from '@/lib/utils'

export type ItemNav = { a: string; etiqueta: string; icono: LucideIcon; exacto?: boolean }

/** Layout común (rutas públicas y de los 3 roles): encabezado + contenido con scroll + navegación inferior tipo app. */
export function LayoutRol({ nav }: { nav: ItemNav[] }) {
  const sesion = useSesion()
  const navegar = useNavigate()
  const queryClient = useQueryClient()

  function salir() {
    guardarSesion(null)
    queryClient.clear()
    navegar('/')
  }

  return (
    <>
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Marca />
        {sesion ? (
          <div className="flex items-center gap-2">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{sesion.usuario.nombre}</p>
              <p className="text-xs text-muted-foreground">{ROLES[sesion.usuario.rol]}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={salir} aria-label="Salir">
              <LogOut />
            </Button>
          </div>
        ) : (
          // Solo en las rutas públicas: sin sesión se puede explorar, y "Entrar" es opcional.
          <Button asChild size="sm">
            <Link to="/entrar">
              <LogIn />
              Entrar
            </Link>
          </Button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <Outlet />
      </main>

      <nav className="grid border-t bg-card" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
        {nav.map(({ a, etiqueta, icono: Icono, exacto }) => (
          <NavLink
            key={a}
            to={a}
            end={exacto}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground transition-colors',
                isActive && 'font-medium text-primary',
              )
            }
          >
            <Icono className="size-5" />
            {etiqueta}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
