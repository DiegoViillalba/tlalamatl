// Mapa público de mercados (sin login). Lee los comercios del backend y los muestra en el lienzo y en una lista.
// Portado de m1.html. Ver docs/alcance/compartido.md, "Mapa de bienvenida".
import { useQuery } from '@tanstack/react-query'
import { LocateFixed, MapPin, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { publicoListarComerciosOptions, publicoListarProductosOptions } from '@/api/@tanstack/react-query.gen'
import type { ComercioPublico } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CATEGORIAS, DIAS, pesos } from '@/lib/formato'
import { distanciaKm, fmtKm, sinAcentos, ZOCALO } from './geometria'
import { MapaLienzo, type PinMapa } from './mapa-lienzo'
import { FormaTipo, ORDEN_TIPOS, TIPO_DE_CATEGORIA, TIPOS, type Tipo } from './tipos'
import './mapa.css'

type Yo = { lat: number; lon: number; real: boolean }
type Enfoque = { id: string; lat: number; lon: number; seq: number }
type Visible = ComercioPublico & { tipo: Tipo; km: number }

const ALL_DAYS = Object.keys(DIAS).length

function diasTexto(c: ComercioPublico) {
  if (c.dias_operacion.length >= ALL_DAYS) return 'Todos los días'
  return c.dias_operacion.map((d) => DIAS[d]).join(' · ')
}

export function MapaMercados() {
  const comercios = useQuery(publicoListarComerciosOptions())

  const [tipos, setTipos] = useState<Set<Tipo>>(() => new Set(ORDEN_TIPOS))
  const [soloAbiertos, setSoloAbiertos] = useState(false)
  const [q, setQ] = useState('')
  const [yo, setYo] = useState<Yo>({ ...ZOCALO, real: false })
  const [mensajeUbicacion, setMensajeUbicacion] = useState<string | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)
  const [enfoque, setEnfoque] = useState<Enfoque | null>(null)

  // Solo los comercios con coordenadas aparecen en el mapa
  const conCoords = (comercios.data ?? []).filter((c) => c.lat != null && c.lng != null)
  const conDistancia = conCoords.map((c) => ({
    ...c,
    tipo: TIPO_DE_CATEGORIA[c.categoria],
    km: distanciaKm(yo, { lat: c.lat!, lon: c.lng! }),
  }))

  const busqueda = sinAcentos(q.trim())
  const visibles: Visible[] = conDistancia
    .filter((c) => tipos.has(c.tipo))
    .filter((c) => !soloAbiertos || c.abierto_hoy)
    .filter((c) => !busqueda || sinAcentos(`${c.nombre} ${c.alcaldia}`).includes(busqueda))
    .sort((a, b) => a.km - b.km)

  const pines: PinMapa[] = visibles.map((c) => ({
    id: String(c.id),
    tipo: c.tipo,
    nombre: c.nombre,
    lat: c.lat!,
    lon: c.lng!,
  }))

  const seleccionado = elegido ? conDistancia.find((c) => String(c.id) === elegido) ?? null : null

  const conteoPorTipo = ORDEN_TIPOS.reduce<Record<Tipo, number>>(
    (acc, t) => ({ ...acc, [t]: conCoords.filter((c) => TIPO_DE_CATEGORIA[c.categoria] === t).length }),
    { ca: 0, mp: 0, tq: 0, mr: 0 },
  )

  function alternarTipo(t: Tipo) {
    setTipos((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(t)) siguiente.delete(t)
      else siguiente.add(t)
      return siguiente
    })
  }

  function elegir(id: string, centrar: boolean) {
    setElegido(id)
    const c = conCoords.find((x) => String(x.id) === id)
    if (centrar && c) setEnfoque((prev) => ({ id, lat: c.lat!, lon: c.lng!, seq: (prev?.seq ?? 0) + 1 }))
  }

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
          <span className="sr">Buscar por nombre o alcaldía</span>
          <input
            type="search"
            placeholder="Buscar por nombre o alcaldía"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="button" className="mapa-ubicar" onClick={usarUbicacion} aria-label="Usar mi ubicación" title="Usar mi ubicación">
            <LocateFixed className="ico" />
          </button>
        </label>
        <div className="mapa-filtros" role="group" aria-label="Tipos de mercado">
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
              <span className="n">{conteoPorTipo[t]}</span>
            </button>
          ))}
          <button type="button" className="mapa-chip" style={{ '--c': '#771a31' } as CSSProperties} aria-pressed={soloAbiertos} onClick={() => setSoloAbiertos((v) => !v)}>
            <span>Abierto hoy</span>
          </button>
        </div>
      </section>

      {comercios.isPending && <Skeleton className="h-72 w-full" />}
      {comercios.isError && <p className="text-sm text-destructive">No pudimos cargar los mercados. Intenta de nuevo más tarde.</p>}

      {comercios.data && (
        <>
          <MapaLienzo
            pines={pines}
            yo={yo}
            elegido={elegido}
            enfoque={enfoque}
            onElegir={(id) => elegir(id, false)}
          />

          <div className="mapa-resumen" aria-live="polite">
            {cerca ? (
              <>
                <strong>El más cercano: {cerca.nombre}, a {fmtKm(cerca.km)}</strong>
                <span>Distancia en línea recta desde {dondeYo}.</span>
              </>
            ) : (
              <>
                <strong>Sin resultados</strong>
                <span>Prueba con otro nombre o activa más tipos de mercado.</span>
              </>
            )}
            {mensajeUbicacion && <span className="block">{mensajeUbicacion}</span>}
          </div>

          {seleccionado && (
            <Ficha
              comercio={seleccionado}
              tipo={seleccionado.tipo}
              km={distanciaKm(yo, { lat: seleccionado.lat!, lon: seleccionado.lng! })}
              onCerrar={() => setElegido(null)}
            />
          )}

          <h2 className="text-base font-semibold">Cerca de ti</h2>
          {visibles.length === 0 ? (
            <p className="mapa-vacio">No hay mercados con esos filtros.</p>
          ) : (
            <ul className="mapa-lista">
              {visibles.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="mapa-item"
                    style={{ '--c': TIPOS[c.tipo].color } as CSSProperties}
                    aria-current={elegido === String(c.id)}
                    onClick={() => {
                      elegir(String(c.id), true)
                    }}
                  >
                    <span className="icono-tipo" aria-hidden="true">
                      <FormaTipo tipo={c.tipo} />
                    </span>
                    <span>
                      <span className="nombre block">{c.nombre}</span>
                      <span className="meta">
                        {c.alcaldia} · {diasTexto(c)}
                      </span>
                    </span>
                    <span className="km">{fmtKm(c.km)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mapa-pie">
            Prototipo de hackathon; no es una aplicación oficial del Gobierno de la Ciudad de México. Ubicaciones de los
            comercios de demostración. Límites de alcaldías: INEGI 2020.
          </p>
        </>
      )}
    </div>
  )
}

function Ficha({ comercio, tipo, km, onCerrar }: { comercio: ComercioPublico & { lat: number | null; lng: number | null }; tipo: Tipo; km: number; onCerrar: () => void }) {
  const productos = useQuery({
    ...publicoListarProductosOptions({ path: { comercio_id: comercio.id } }),
  })
  const ruta = `https://www.google.com/maps/dir/?api=1&destination=${comercio.lat},${comercio.lng}`

  return (
    <article className="mapa-ficha" style={{ '--c': TIPOS[tipo].color } as CSSProperties} aria-live="polite">
      <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar detalle">
        <X className="size-5" />
      </button>
      <span className="etiqueta">{TIPOS[tipo].nombre}</span>
      <h3>{comercio.nombre}</h3>
      {comercio.abierto_hoy ? <Badge>Abierto hoy</Badge> : <Badge variant="outline">Cerrado hoy</Badge>}
      <dl>
        <dt>Alcaldía</dt>
        <dd>{comercio.alcaldia}</dd>
        <dt>Distancia</dt>
        <dd>{fmtKm(km)}</dd>
        <dt>Días</dt>
        <dd>{diasTexto(comercio)}</dd>
        <dt>Ubicación</dt>
        <dd>{comercio.ubicacion}</dd>
      </dl>

      <h4 className="mb-1 text-sm font-semibold">Productos</h4>
      {productos.isPending && <Skeleton className="mb-3 h-12 w-full" />}
      {productos.data && productos.data.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Sin productos publicados.</p>}
      {productos.data && productos.data.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
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

      <div className="mapa-acciones">
        <a className="mapa-accion principal" href={ruta} target="_blank" rel="noopener">
          <MapPin className="size-4" />
          Cómo llegar
        </a>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{CATEGORIAS[comercio.categoria]}</p>
    </article>
  )
}
