// Pantalla de registro para usuarios nuevos (alcaldia === "").
// Se muestra después del primer login por correo; los usuarios demo ya tienen perfil completo.
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, ShoppingBasket, Store, Truck } from 'lucide-react'
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { authCompletarPerfil } from '@/api'
import type { Categoria, Dia, Rol, TipoProveedor } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CATEGORIAS, DIAS, TIPOS_PROVEEDOR } from '@/lib/formato'
import { mensajeError } from '@/lib/api'
import { guardarSesion, INICIO_POR_ROL, useSesion } from '@/lib/sesion'

const ALCALDIAS = [
  'Álvaro Obregón',
  'Azcapotzalco',
  'Benito Juárez',
  'Coyoacán',
  'Cuajimalpa de Morelos',
  'Cuauhtémoc',
  'Gustavo A. Madero',
  'Iztacalco',
  'Iztapalapa',
  'La Magdalena Contreras',
  'Miguel Hidalgo',
  'Milpa Alta',
  'Tláhuac',
  'Tlalpan',
  'Venustiano Carranza',
  'Xochimilco',
]

const ROLES: { valor: Rol; titulo: string; desc: string; Icono: typeof ShoppingBasket; color: string }[] = [
  { valor: 'cliente', titulo: 'Soy cliente', desc: 'Busco dónde comprar en mercados y tianguis.', Icono: ShoppingBasket, color: '#1f6fd1' },
  { valor: 'comerciante', titulo: 'Soy comerciante', desc: 'Tengo un puesto o local y quiero publicarlo.', Icono: Store, color: '#3f8a46' },
  { valor: 'proveedor', titulo: 'Soy proveedor', desc: 'Produzco o distribuyo al mayoreo para comercios.', Icono: Truck, color: '#e2780c' },
]

const ORDEN_DIAS: Dia[] = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']

export function Registro() {
  const sesion = useSesion()
  const navegar = useNavigate()

  // Guard: sin sesión → entrar; perfil ya completo → home del rol
  useEffect(() => {
    if (!sesion) {
      navegar('/entrar', { replace: true })
    } else if (sesion.usuario.alcaldia !== '') {
      navegar(INICIO_POR_ROL[sesion.usuario.rol], { replace: true })
    }
  }, [sesion, navegar])

  const nombreInicial = sesion?.usuario.nombre ?? ''

  // Campos comunes
  const [nombre, setNombre] = useState(nombreInicial)
  const [rol, setRol] = useState<Rol | null>(null)
  const [alcaldia, setAlcaldia] = useState('')

  // Campos de comercio
  const [cNombre, setCNombre] = useState('')
  const [cCategoria, setCCategoria] = useState<Categoria | ''>('')
  const [cUbicacion, setCUbicacion] = useState('')
  const [cDias, setCDias] = useState<Dia[]>([])
  const [cTelefono, setCTelefono] = useState('')
  const [cWhatsapp, setCWhatsapp] = useState('')

  // Campos de proveedor
  const [pNombre, setPNombre] = useState('')
  const [pTipo, setPTipo] = useState<TipoProveedor | ''>('')
  const [pZona, setPZona] = useState('')
  const [pTelefono, setPTelefono] = useState('')

  function toggleDia(d: Dia) {
    setCDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const completar = useMutation({
    mutationFn: () =>
      authCompletarPerfil({
        body: {
          nombre: nombre.trim(),
          alcaldia,
          rol: rol!,
          comercio_nombre: rol === 'comerciante' ? cNombre : undefined,
          comercio_categoria: rol === 'comerciante' && cCategoria ? cCategoria : undefined,
          comercio_ubicacion: rol === 'comerciante' ? cUbicacion : undefined,
          comercio_dias: rol === 'comerciante' ? cDias : [],
          comercio_telefono: rol === 'comerciante' && cTelefono ? cTelefono : undefined,
          comercio_whatsapp: rol === 'comerciante' && cWhatsapp ? cWhatsapp : undefined,
          proveedor_nombre: rol === 'proveedor' ? pNombre : undefined,
          proveedor_tipo: rol === 'proveedor' && pTipo ? pTipo : undefined,
          proveedor_zona: rol === 'proveedor' ? pZona : undefined,
          proveedor_telefono: rol === 'proveedor' && pTelefono ? pTelefono : undefined,
        },
        throwOnError: true,
      }).then((r) => r.data!),
    onSuccess: (usuario) => {
      guardarSesion({ ...sesion!, usuario })
      navegar(INICIO_POR_ROL[usuario.rol], { replace: true })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  function alEnviar(e: FormEvent) {
    e.preventDefault()
    if (!rol) return toast.error('Elige tu rol para continuar.')
    if (!alcaldia) return toast.error('Elige tu alcaldía.')
    if (rol === 'comerciante' && (!cNombre.trim() || !cCategoria)) {
      return toast.error('Escribe el nombre y categoría de tu comercio.')
    }
    if (rol === 'proveedor' && (!pNombre.trim() || !pTipo || !pZona.trim())) {
      return toast.error('Completa los datos de tu negocio.')
    }
    completar.mutate()
  }

  if (!sesion) return null

  return (
    <div className="flex-1 overflow-y-auto">
      <section className="bg-primary px-6 pt-6 pb-8 text-primary-foreground">
        <Link to="/entrar" className="mb-4 inline-flex items-center gap-1 text-sm opacity-90 hover:opacity-100">
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Completa tu perfil</h1>
        <p className="mt-1 text-sm opacity-90">Solo toma un momento.</p>
      </section>

      <form onSubmit={alEnviar} className="space-y-6 px-4 py-5">
        {/* Nombre */}
        <div className="space-y-1.5">
          <Label htmlFor="nombre">¿Cómo te llamas?</Label>
          <Input
            id="nombre"
            required
            autoComplete="name"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        {/* Rol */}
        <div className="space-y-2">
          <p className="text-sm font-medium leading-none">¿Cuál es tu rol?</p>
          <div className="space-y-2">
            {ROLES.map(({ valor, titulo, desc, Icono, color }) => (
              <button
                key={valor}
                type="button"
                onClick={() => setRol(valor)}
                className="flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors"
                style={
                  rol === valor
                    ? ({ '--c': color, borderColor: color, backgroundColor: `${color}14` } as CSSProperties)
                    : { borderColor: 'transparent', backgroundColor: 'var(--card)' }
                }
              >
                <span className="mt-0.5 rounded-lg p-2" style={{ backgroundColor: `${color}20` }}>
                  <Icono className="size-5" style={{ color }} />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{titulo}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                {rol === valor && (
                  <Badge className="mt-0.5 shrink-0" style={{ backgroundColor: color }}>
                    Elegido
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Alcaldía */}
        <div className="space-y-1.5">
          <Label htmlFor="alcaldia">¿De qué alcaldía eres?</Label>
          <Select value={alcaldia} onValueChange={setAlcaldia}>
            <SelectTrigger id="alcaldia">
              <SelectValue placeholder="Elige tu alcaldía" />
            </SelectTrigger>
            <SelectContent>
              {ALCALDIAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Datos del comercio */}
        {rol === 'comerciante' && (
          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Tu comercio</legend>

            <div className="space-y-1.5">
              <Label htmlFor="c-nombre">Nombre del puesto o local</Label>
              <Input id="c-nombre" required value={cNombre} onChange={(e) => setCNombre(e.target.value)} placeholder="Ej. Verduras Mary" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-cat">Tipo de comercio</Label>
              <Select value={cCategoria} onValueChange={(v) => setCCategoria(v as Categoria)}>
                <SelectTrigger id="c-cat">
                  <SelectValue placeholder="Elige el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIAS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-ubic">Ubicación (opcional)</Label>
              <Input id="c-ubic" value={cUbicacion} onChange={(e) => setCUbicacion(e.target.value)} placeholder="Ej. Local 24, Pasillo B" />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Días que abres (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {ORDEN_DIAS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDia(d)}
                    className="rounded-md border px-3 py-1 text-sm transition-colors"
                    style={
                      cDias.includes(d)
                        ? { borderColor: '#3f8a46', backgroundColor: '#3f8a4620', color: '#3f8a46' }
                        : {}
                    }
                  >
                    {DIAS[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-tel">Teléfono (opcional)</Label>
                <Input id="c-tel" inputMode="tel" value={cTelefono} onChange={(e) => setCTelefono(e.target.value)} placeholder="10 dígitos" maxLength={10} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-wa">WhatsApp (opcional)</Label>
                <Input id="c-wa" inputMode="tel" value={cWhatsapp} onChange={(e) => setCWhatsapp(e.target.value)} placeholder="10 dígitos" maxLength={10} />
              </div>
            </div>
          </fieldset>
        )}

        {/* Datos del proveedor */}
        {rol === 'proveedor' && (
          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-semibold">Tu negocio</legend>

            <div className="space-y-1.5">
              <Label htmlFor="p-nombre">Nombre del negocio</Label>
              <Input id="p-nombre" required value={pNombre} onChange={(e) => setPNombre(e.target.value)} placeholder="Ej. Distribuidora Morelos" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-tipo">¿Qué tipo de proveedor eres?</Label>
              <Select value={pTipo} onValueChange={(v) => setPTipo(v as TipoProveedor)}>
                <SelectTrigger id="p-tipo">
                  <SelectValue placeholder="Elige el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPOS_PROVEEDOR) as TipoProveedor[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TIPOS_PROVEEDOR[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-zona">Zona donde atiendes</Label>
              <Input id="p-zona" required value={pZona} onChange={(e) => setPZona(e.target.value)} placeholder="Ej. Iztapalapa, Central de Abasto" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-tel">Teléfono (opcional)</Label>
              <Input id="p-tel" inputMode="tel" value={pTelefono} onChange={(e) => setPTelefono(e.target.value)} placeholder="10 dígitos" maxLength={10} />
            </div>
          </fieldset>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={completar.isPending}>
          {completar.isPending ? 'Guardando…' : 'Entrar a Tlalamatl'}
        </Button>
      </form>
    </div>
  )
}
