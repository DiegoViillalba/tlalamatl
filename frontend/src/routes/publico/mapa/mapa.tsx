// Mapa público de mercados (sin login). Los lugares son reales (SEDECO, Datos Abiertos CDMX); los comercios
// del backend son puestos de demostración que aparecen dentro de la ficha del lugar real más cercano.
// Portado de m1.html. Ver docs/alcance/compartido.md, "Mapa de bienvenida".
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LocateFixed, MapPin, MessageCircle, Phone, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  clienteComentarMutation,
  clienteMisComentariosQueryKey,
  publicoListarComentariosOptions,
  publicoListarComentariosQueryKey,
  publicoListarComerciosOptions,
  publicoListarProductosOptions,
} from '@/api/@tanstack/react-query.gen'
import type { ComercioPublico } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DIAS, pesos } from '@/lib/formato'
import { mensajeError } from '@/lib/api'
import { useSesion } from '@/lib/sesion'
import { toast } from 'sonner'
import { BotonFavorito } from '@/routes/cliente/boton-favorito'
import { distanciaKm, fmtKm, sinAcentos, ZOCALO } from './geometria'
import { cargarLugares, diaHoy, FUENTE, type Lugar } from './lugares'
import { MapaLienzo, type PinMapa } from './mapa-lienzo'
import { FormaTipo, ORDEN_TIPOS, TIPO_DE_CATEGORIA, TIPOS, type Tipo } from './tipos'
import './mapa.css'

type Yo = { lat: number; lon: number; real: boolean }
type Enfoque = { id: string; lat: number; lon: number; seq: number }
type Visible = Lugar & { tipo: Tipo; km: number; abierto: boolean }

const TODOS_LOS_DIAS = Object.keys(DIAS).length
const POR_PAGINA = 25

function diasTexto(l: Lugar) {
  if (l.dias.length >= TODOS_LOS_DIAS) return 'Todos los días'
  if (l.dias.length === 0) return 'Días sin registrar'
  return l.dias.map((d) => DIAS[d]).join(', ')
}

/** Cada puesto demo queda dentro del lugar real más cercano de su misma categoría. */
function puestosPorLugar(lugares: Lugar[], comercios: ComercioPublico[]) {
  const mapa = new Map<string, ComercioPublico[]>()
  for (const c of comercios) {
    if (c.lat == null || c.lng == null) continue
    let mejor: Lugar | null = null
    let mejorKm = Infinity
    for (const l of lugares) {
      if (l.categoria !== c.categoria) continue
      const km = distanciaKm({ lat: c.lat, lon: c.lng }, { lat: l.lat, lon: l.lng })
      if (km < mejorKm) {
        mejor = l
        mejorKm = km
      }
    }
    if (mejor) mapa.set(mejor.id, [...(mapa.get(mejor.id) ?? []), c])
  }
  return mapa
}

export function MapaMercados() {
  const lugares = useQuery({ queryKey: ['lugares-cdmx'], queryFn: cargarLugares, staleTime: Infinity })
  const comercios = useQuery(publicoListarComerciosOptions())

  const [tipos, setTipos] = useState<Set<Tipo>>(() => new Set(ORDEN_TIPOS))
  // Abre con "abierto hoy" activo: es la pregunta principal del cliente y quita ruido al mapa
  const [soloAbiertos, setSoloAbiertos] = useState(true)
  const [q, setQ] = useState('')
  const [yo, setYo] = useState<Yo>({ ...ZOCALO, real: false })
  const [mensajeUbicacion, setMensajeUbicacion] = useState<string | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)
  const [enfoque, setEnfoque] = useState<Enfoque | null>(null)
  const [mostrar, setMostrar] = useState(POR_PAGINA)
  const [searchParams] = useSearchParams()

  const hoy = diaHoy()
  const todos = useMemo(() => lugares.data ?? [], [lugares.data])
  const puestos = useMemo(() => puestosPorLugar(todos, comercios.data ?? []), [todos, comercios.data])

  const conDistancia: Visible[] = useMemo(
    () =>
      todos.map((l) => ({
        ...l,
        tipo: TIPO_DE_CATEGORIA[l.categoria],
        km: distanciaKm(yo, { lat: l.lat, lon: l.lng }),
        abierto: l.dias.includes(hoy),
      })),
    [todos, yo, hoy],
  )

  const busqueda = sinAcentos(q.trim())
  const visibles = useMemo(
    () =>
      conDistancia
        .filter((l) => tipos.has(l.tipo))
        .filter((l) => !soloAbiertos || l.abierto)
        .filter((l) => !busqueda || sinAcentos(`${l.nombre} ${l.alcaldia} ${l.colonia ?? ''}`).includes(busqueda))
        .sort((a, b) => a.km - b.km),
    [conDistancia, tipos, soloAbiertos, busqueda],
  )

  const pines: PinMapa[] = useMemo(
    () => visibles.map((l) => ({ id: l.id, tipo: l.tipo, nombre: l.nombre, lat: l.lat, lon: l.lng })),
    [visibles],
  )

  const seleccionado = elegido ? conDistancia.find((l) => l.id === elegido) ?? null : null

  const conteoPorTipo = ORDEN_TIPOS.reduce<Record<Tipo, number>>(
    (acc, t) => ({ ...acc, [t]: conDistancia.filter((l) => l.tipo === t && (!soloAbiertos || l.abierto)).length }),
    { ca: 0, mp: 0, tq: 0, mr: 0 },
  )

  function alternarTipo(t: Tipo) {
    setTipos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(t)) siguiente.delete(t)
      else siguiente.add(t)
      return siguiente
    })
    setMostrar(POR_PAGINA)
  }

  function elegir(id: string, centrar: boolean) {
    setElegido(id)
    const l = todos.find((x) => x.id === id)
    if (centrar && l) setEnfoque((prev) => ({ id, lat: l.lat, lon: l.lng, seq: (prev?.seq ?? 0) + 1 }))
  }

  useEffect(() => {
    const comercioId = Number(searchParams.get('comercio'))
    if (!Number.isInteger(comercioId) || comercioId <= 0) return
    const lugarId = [...puestos.entries()].find(([, lista]) => lista.some((p) => p.id === comercioId))?.[0]
    if (!lugarId) return
    setElegido(lugarId)
    const lugar = todos.find((l) => l.id === lugarId)
    if (lugar) setEnfoque((prev) => ({ id: lugarId, lat: lugar.lat, lon: lugar.lng, seq: (prev?.seq ?? 0) + 1 }))
  }, [puestos, searchParams, todos])

  function usarUbicacion() {
    if (!navigator.geolocation) {
      setMensajeUbicacion('Tu navegador no permite obtener la ubicación.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setYo({ lat: p.coords.latitude, lon: p.coords.longitude, real: true })
        setMensajeUbicacion(null)
      },
      () => setMensajeUbicacion('No pudimos obtener tu ubicación. Seguimos midiendo desde el Zócalo.'),
      { timeout: 8000 },
    )
  }

  const cerca = visibles[0]
  const dondeYo = yo.real ? 'tu ubicación' : 'el Zócalo (activa tu ubicación para afinar)'

  return (
    <div className="mapa-raiz space-y-4">
      <section className="mapa-banda" aria-label="Buscar mercados">
        <h2>Encuentra el mercado más cerca de ti</h2>
        <label className="mapa-buscar">
          <span className="sr">Buscar por nombre, colonia o alcaldía</span>
          <input
            type="search"
            placeholder="Buscar por nombre, colonia o alcaldía"
            autoComplete="off"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setMostrar(POR_PAGINA)
            }}
          />
          <button type="button" className="mapa-ubicar" onClick={usarUbicacion} aria-label="Usar mi ubicación" title="Usar mi ubicación">
            <LocateFixed className="ico" />
          </button>
        </label>
        <div className="mapa-filtros" role="group" aria-label="Tipos de mercado">
          <button type="button" className="mapa-chip" style={{ '--c': '#771a31' } as CSSProperties} aria-pressed={soloAbiertos} onClick={() => setSoloAbiertos((v) => !v)}>
            <span>Abierto hoy</span>
          </button>
          {ORDEN_TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              className="mapa-chip"
              style={{ '--c': TIPOS[t].color } as CSSProperties}
              aria-pressed={tipos.has(t)}
              onClick={() => alternarTipo(t)}
            >
              <FormaTipo tipo={t} className="forma" />
              <span>{TIPOS[t].corto}</span>
              <span className="n">{conteoPorTipo[t].toLocaleString('es-MX')}</span>
            </button>
          ))}
        </div>
      </section>

      {lugares.isPending && <Skeleton className="h-72 w-full" />}
      {lugares.isError && <p className="text-sm text-destructive">No pudimos cargar los mercados. Intenta de nuevo más tarde.</p>}

      {lugares.data && (
        <>
          <MapaLienzo pines={pines} yo={yo} elegido={elegido} enfoque={enfoque} onElegir={(id) => elegir(id, false)} />

          <div className="mapa-resumen" aria-live="polite">
            {cerca ? (
              <>
                <strong>
                  El más cercano{soloAbiertos ? ' abierto hoy' : ''}: {cerca.nombre}, a {fmtKm(cerca.km)}
                </strong>
                <span>Distancia en línea recta desde {dondeYo}.</span>
              </>
            ) : (
              <>
                <strong>Sin resultados</strong>
                <span>Prueba con otro nombre, activa más tipos de mercado o quita «Abierto hoy».</span>
              </>
            )}
            {mensajeUbicacion && <span className="block">{mensajeUbicacion}</span>}
          </div>

          {seleccionado && (
            <FichaLugar lugar={seleccionado} puestos={puestos.get(seleccionado.id) ?? []} onCerrar={() => setElegido(null)} />
          )}

          <h2 className="text-base font-semibold">
            Cerca de ti <span className="font-normal text-muted-foreground">({visibles.length.toLocaleString('es-MX')})</span>
          </h2>
          {visibles.length === 0 ? (
            <p className="mapa-vacio">No hay mercados con esos filtros.</p>
          ) : (
            <>
              <ul className="mapa-lista">
                {visibles.slice(0, mostrar).map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className="mapa-item"
                      style={{ '--c': TIPOS[l.tipo].color } as CSSProperties}
                      aria-current={elegido === l.id}
                      onClick={() => elegir(l.id, true)}
                    >
                      <span className="icono-tipo" aria-hidden="true">
                        <FormaTipo tipo={l.tipo} />
                      </span>
                      <span>
                        <span className="nombre block">{l.nombre}</span>
                        <span className="meta">
                          {l.alcaldia}, {diasTexto(l).toLowerCase()}
                        </span>
                      </span>
                      <span className="km">{fmtKm(l.km)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {visibles.length > mostrar && (
                <button type="button" className="mapa-accion" onClick={() => setMostrar((n) => n + POR_PAGINA)}>
                  Ver {Math.min(POR_PAGINA, visibles.length - mostrar)} más
                </button>
              )}
            </>
          )}

          <p className="mapa-pie">
            Prototipo de hackathon; no es una aplicación oficial del Gobierno de la Ciudad de México. Tianguis, mercados
            públicos y mercados sobre ruedas: SEDECO, Datos Abiertos CDMX. Central de Abasto: OpenStreetMap. Límites de
            alcaldías: INEGI 2020. Los puestos con productos y precios son de demostración.
          </p>
        </>
      )}
    </div>
  )
}

function FichaLugar({ lugar, puestos, onCerrar }: { lugar: Visible; puestos: ComercioPublico[]; onCerrar: () => void }) {
  const ruta = `https://www.google.com/maps/dir/?api=1&destination=${lugar.lat},${lugar.lng}`

  return (
    <article className="mapa-ficha" style={{ '--c': TIPOS[lugar.tipo].color } as CSSProperties} aria-live="polite">
      <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar detalle">
        <X className="size-5" />
      </button>
      <span className="etiqueta">{TIPOS[lugar.tipo].nombre}</span>
      <h3>{lugar.nombre}</h3>
      {lugar.abierto ? <Badge>Abierto hoy</Badge> : <Badge variant="outline">Cerrado hoy</Badge>}
      <dl>
        <dt>Alcaldía</dt>
        <dd>{lugar.alcaldia}</dd>
        {lugar.colonia && (
          <>
            <dt>Colonia</dt>
            <dd>{lugar.colonia}</dd>
          </>
        )}
        {lugar.ubicacion && (
          <>
            <dt>Ubicación</dt>
            <dd>{lugar.ubicacion}</dd>
          </>
        )}
        <dt>Distancia</dt>
        <dd>{fmtKm(lugar.km)}</dd>
        <dt>Días</dt>
        <dd>
          {diasTexto(lugar)}
          {!lugar.diasFuente && <span className="block text-xs text-muted-foreground">La fuente no publica días; suele abrir diario.</span>}
        </dd>
        {lugar.horario && (
          <>
            <dt>Horario</dt>
            <dd>{lugar.horario}</dd>
          </>
        )}
        {lugar.locales != null && (
          <>
            <dt>Locales</dt>
            <dd>{lugar.locales.toLocaleString('es-MX')}</dd>
          </>
        )}
        {lugar.oferentes != null && (
          <>
            <dt>Oferentes</dt>
            <dd>
              {lugar.oferentes.toLocaleString('es-MX')}
              {lugar.ruta ? ` (${lugar.ruta})` : ''}
            </dd>
          </>
        )}
        {lugar.giro && (
          <>
            <dt>Giro</dt>
            <dd>{lugar.giro}</dd>
          </>
        )}
      </dl>

      <div className="mapa-acciones mb-3">
        <a className="mapa-accion principal" href={ruta} target="_blank" rel="noopener">
          <MapPin className="size-4" />
          Cómo llegar
        </a>
      </div>

      <h4 className="mb-1 text-sm font-semibold">Puestos en Tlalamatl</h4>
      {puestos.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">Todavía no hay puestos registrados aquí.</p>
      ) : (
        puestos.map((p) => <Puesto key={p.id} comercio={p} />)
      )}

      <p className="mt-3 text-xs text-muted-foreground">Fuente del lugar: {FUENTE[lugar.categoria]}.</p>
    </article>
  )
}

function Puesto({ comercio }: { comercio: ComercioPublico }) {
  const sesion = useSesion()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const [texto, setTexto] = useState('')
  const productos = useQuery(publicoListarProductosOptions({ path: { comercio_id: comercio.id } }))
  const comentarios = useQuery(publicoListarComentariosOptions({ path: { comercio_id: comercio.id } }))
  const esCliente = sesion?.usuario.rol === 'cliente'
  const comentar = useMutation({
    ...clienteComentarMutation(),
    onSuccess: async () => {
      setTexto('')
      await queryClient.invalidateQueries({ queryKey: publicoListarComentariosQueryKey({ path: { comercio_id: comercio.id } }) })
      await queryClient.invalidateQueries({ queryKey: clienteMisComentariosQueryKey() })
      toast.success('Comentario publicado')
    },
    onError: (error) => toast.error(mensajeError(error)),
  })

  function enviarComentario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!esCliente) {
      navegar('/entrar')
      return
    }
    const limpio = texto.trim()
    if (limpio) comentar.mutate({ path: { comercio_id: comercio.id }, body: { texto: limpio } })
  }

  const numero = comercio.whatsapp?.replace(/\D/g, '')
  const destinoWhatsapp = numero
    ? numero.length === 12 && numero.startsWith('52') ? numero : `52${numero}`
    : null

  return (
    <section className="mb-3 border-t pt-2">
      <p className="text-sm font-semibold">{comercio.nombre}</p>
      <p className="mb-1 text-xs text-muted-foreground">{comercio.ubicacion}</p>
      <div className="mb-2 flex flex-wrap gap-2">
        {comercio.telefono && (
          <a className="mapa-accion" href={`tel:${comercio.telefono}`}>
            <Phone className="size-4" /> Llamar
          </a>
        )}
        {destinoWhatsapp && (
          <a className="mapa-accion" href={`https://wa.me/${destinoWhatsapp}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
        <BotonFavorito comercioId={comercio.id} />
      </div>
      {productos.isPending && <Skeleton className="h-10 w-full" />}
      {productos.data && productos.data.length === 0 && <p className="text-sm text-muted-foreground">Sin productos publicados.</p>}
      {productos.data && productos.data.length > 0 && (
        <ul className="space-y-1 text-sm">
          {productos.data.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span>{p.nombre}</span>
              <span className="font-medium">
                {pesos(p.precio)} <span className="text-muted-foreground">/ {p.unidad}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
        <div className="mt-3 border-t pt-2">
          <h5 className="mb-2 text-sm font-semibold">Comentarios</h5>
          {comentarios.isPending && <Skeleton className="h-12 w-full" />}
          {comentarios.isError && <p className="text-sm text-destructive">No pudimos cargar los comentarios.</p>}
          {comentarios.data?.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Aún no hay comentarios.</p>}
          {comentarios.data && comentarios.data.length > 0 && (
            <ul className="mb-3 space-y-2">
              {comentarios.data.map((comentario) => (
                <li key={comentario.id} className="border-l-2 pl-3">
                  <p className="text-sm">{comentario.texto}</p>
                  <p className="text-xs text-muted-foreground">
                    {comentario.nombre_usuario} · {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(comentario.creado_en))}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {esCliente ? (
            <form className="space-y-2" onSubmit={enviarComentario}>
              <label className="sr" htmlFor={`comentario-${comercio.id}`}>Escribe un comentario</label>
              <textarea
                id={`comentario-${comercio.id}`}
                className="min-h-20 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Comparte tu experiencia"
                maxLength={500}
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{texto.length}/500</span>
                <Button type="submit" size="sm" disabled={!texto.trim() || comentar.isPending}>
                  <Send /> Comentar
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => navegar('/entrar')}>
              <Send /> Comentar
            </Button>
          )}
        </div>
    </section>
  )
}
