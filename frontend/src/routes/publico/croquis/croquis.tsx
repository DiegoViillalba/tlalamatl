// Croquis de un mercado público (sin login): plano con zonas por giro, locales, búsqueda de puestos y ficha
// del local. Portado de m2.html. El contorno del edificio es real (OpenStreetMap); zonas, locales y
// locatarios son ilustrativos. Se llega desde la ficha del mapa ("Ver croquis").
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, MessageCircle, Phone, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { pesos } from '@/lib/formato'
import { sinAcentos } from '../mapa/geometria'
import { CroquisLienzo } from './croquis-lienzo'
import { colorZona, fmtTel, generaLocales, planosQuery, type Local, type LocalDemo, type Plano } from './planos'
import '../mapa/mapa.css'
import './croquis.css'

export function Croquis() {
  const { mercadoId } = useParams()
  const planos = useQuery(planosQuery)
  const plano = mercadoId ? planos.data?.[mercadoId] : undefined
  const raiz = useRef<HTMLDivElement>(null)

  // El <main> del layout conserva el scroll de la pantalla anterior (el mapa): el croquis empieza arriba
  useEffect(() => {
    raiz.current?.closest('main')?.scrollTo({ top: 0 })
  }, [mercadoId])

  return (
    <div ref={raiz} className="mapa-raiz croquis-raiz space-y-4">
      {planos.isPending && <Skeleton className="h-96 w-full" />}
      {planos.isError && <p className="text-sm text-destructive">No pudimos cargar el croquis. Intenta de nuevo más tarde.</p>}
      {planos.data && !plano && <SinPlano planos={planos.data} />}
      {/* key: al cambiar de mercado se limpian la zona, la búsqueda y el local elegido */}
      {planos.data && plano && <CroquisMercado key={plano.id} plano={plano} planos={planos.data} />}
    </div>
  )
}

function Banda({ planos, actual, children }: { planos: Record<string, Plano>; actual?: string; children?: ReactNode }) {
  return (
    <nav className="croquis-banda" aria-label="Mercado">
      <div className="croquis-banda-fila">
        <Link to="/" className="croquis-volver">
          <ChevronLeft className="ico" />
          Mapa
        </Link>
        <div className="croquis-mercados" role="group" aria-label="Elegir mercado">
          {Object.values(planos).map((p) => (
            <Link key={p.id} to={`/croquis/${p.id}`} replace className="croquis-mercado" aria-current={p.id === actual ? 'page' : undefined}>
              {p.corto}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </nav>
  )
}

function SinPlano({ planos }: { planos: Record<string, Plano> }) {
  return (
    <>
      <Banda planos={planos} />
      <section className="mapa-ficha text-center">
        <h2 className="mb-1 text-lg font-bold">Este mercado todavía no tiene croquis</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Por ahora hay croquis de {Object.values(planos).map((p) => p.nombre).join(', ')}. Elige uno arriba o vuelve al mapa.
        </p>
        <Button asChild>
          <Link to="/">
            <ChevronLeft />
            Volver al mapa
          </Link>
        </Button>
      </section>
    </>
  )
}

function CroquisMercado({ plano, planos }: { plano: Plano; planos: Record<string, Plano> }) {
  const locales = useMemo(() => generaLocales(plano), [plano])
  const porNum = useMemo(() => new Map(locales.map((c) => [c.num, c])), [locales])
  const [zona, setZona] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [elegido, setElegido] = useState<number | null>(null)
  const [enfoque, setEnfoque] = useState<{ num: number; seq: number } | null>(null)
  const fichaRef = useRef<HTMLDivElement>(null)

  const busqueda = sinAcentos(q.trim())
  const coincide = (d: LocalDemo) =>
    !busqueda || sinAcentos([d.puesto, d.zona, ...d.inventario.map((i) => i.producto)].join(' ')).includes(busqueda)

  // Resalta en el plano la zona elegida o los puestos que coinciden con la búsqueda
  const apagados = new Set(
    locales.filter((c) => (zona !== null && c.zona !== zona) || (busqueda && !(c.demo && coincide(c.demo)))).map((c) => c.num),
  )
  const puestos = locales
    .filter((c) => c.demo && coincide(c.demo) && (zona === null || c.zona === zona))
    .sort((a, b) => (a.demoN ?? 0) - (b.demoN ?? 0))
  const cuentaZona = plano.zonas.map((_, i) => locales.filter((c) => c.zona === i).length)
  const local = elegido !== null ? porNum.get(elegido) : undefined

  function elegir(num: number, centrar: boolean) {
    setElegido(num)
    if (centrar) setEnfoque((prev) => ({ num, seq: (prev?.seq ?? 0) + 1 }))
    // Después de pintar la ficha
    requestAnimationFrame(() => fichaRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  return (
    <>
      <Banda planos={planos} actual={plano.id}>
        <label className="mapa-buscar mt-2">
          <Search className="ico" />
          <span className="sr">Buscar un producto o un puesto en este mercado</span>
          <input
            type="search"
            placeholder="¿Qué buscas? Rosa, camarón, tostada…"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </Banda>

      <header>
        <h2 className="text-xl leading-tight font-extrabold">{plano.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          {plano.alcaldia}
          {plano.colonia ? `, ${plano.colonia}` : ''}
        </p>
      </header>

      <div>
        <CroquisLienzo
          plano={plano}
          locales={locales}
          apagados={apagados}
          elegido={elegido}
          enfoque={enfoque}
          onElegir={(num) => elegir(num, false)}
        />
        <p className="croquis-aviso">
          Contorno real del edificio; zonas y locales ilustrativos. Se dibujan {locales.length.toLocaleString('es-MX')} de los{' '}
          {plano.locales.toLocaleString('es-MX')} locales que reporta SEDECO.
        </p>
      </div>

      <div ref={fichaRef} aria-live="polite">
        {local && <FichaLocal plano={plano} local={local} onCerrar={() => setElegido(null)} />}
      </div>

      <dl className="croquis-datos">
        {plano.ubicacion && (
          <>
            <dt>Ubicación</dt>
            <dd>{plano.ubicacion}</dd>
          </>
        )}
        <dt>Locales</dt>
        <dd>{plano.locales.toLocaleString('es-MX')}</dd>
        {plano.giro && (
          <>
            <dt>Giro</dt>
            <dd>{plano.giro}</dd>
          </>
        )}
        {plano.anio && (
          <>
            <dt>Inaugurado</dt>
            <dd>{plano.anio}</dd>
          </>
        )}
      </dl>

      <section>
        <h3 className="mb-2 text-base font-semibold">Zonas</h3>
        <ul className="croquis-zonas">
          {plano.zonas.map((z, i) => (
            <li key={z.nombre}>
              <button
                type="button"
                className="croquis-zona"
                style={{ '--c': colorZona(i) } as CSSProperties}
                aria-pressed={zona === i}
                onClick={() => setZona((actual) => (actual === i ? null : i))}
              >
                <span className="muestra" aria-hidden="true" />
                {z.nombre}
                <span className="n">{cuentaZona[i]} locales</span>
              </button>
            </li>
          ))}
          <li>
            <span className="croquis-zona fija">
              <span className="muestra demo" aria-hidden="true" />
              En Tlalamatl, con ficha
              <span className="n">{plano.localesDemo.length}</span>
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-base font-semibold">{q.trim() ? `Resultados para «${q.trim()}»` : 'Puestos en Tlalamatl'}</h3>
        {puestos.length === 0 ? (
          <p className="mapa-vacio">Ningún puesto de Tlalamatl coincide. Prueba con otro producto.</p>
        ) : (
          <ul className="mapa-lista">
            {puestos.map((c) => (
              <li key={c.num}>
                <button type="button" className="croquis-puesto" aria-current={elegido === c.num} onClick={() => elegir(c.num, true)}>
                  <span className="num" aria-hidden="true">
                    {c.demoN}
                  </span>
                  <span>
                    <b>{c.demo!.puesto}</b>
                    <span>
                      {c.demo!.zona}, local {c.num}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mapa-pie">
        Prototipo de hackathon; no es una aplicación oficial del Gobierno de la Ciudad de México. Contorno del edificio:
        OpenStreetMap. Datos del mercado: SEDECO, Datos Abiertos CDMX. La distribución de zonas y locales, los locatarios,
        los teléfonos (5500…, números que no existen) y los inventarios son ilustrativos.
      </p>
    </>
  )
}

function FichaLocal({ plano, local, onCerrar }: { plano: Plano; local: Local; onCerrar: () => void }) {
  const z = plano.zonas[local.zona]
  const d = local.demo

  return (
    <article className="mapa-ficha croquis-ficha" style={{ '--c': colorZona(local.zona) } as CSSProperties}>
      <button type="button" className="mapa-cerrar" onClick={onCerrar} aria-label="Cerrar ficha">
        <X className="size-5" />
      </button>
      <span className="etiqueta">{z.nombre}</span>
      {!d ? (
        <>
          <h3>Local {local.num}</h3>
          <p className="text-sm text-muted-foreground">Este local todavía no está en Tlalamatl.</p>
          <p className="mt-2 text-xs text-muted-foreground">Cuando su locatario se registre, aquí aparecerán su contacto y lo que vende.</p>
        </>
      ) : (
        <>
          <h3>{d.puesto}</h3>
          <p className="text-sm text-muted-foreground">{d.locatario}, locatario</p>
          <dl>
            <dt>Local</dt>
            <dd>{local.num}</dd>
            <dt>Horario</dt>
            <dd>{d.horario}</dd>
            <dt>Teléfono</dt>
            <dd>{fmtTel(d.telefono)}</dd>
          </dl>
          <div className="mapa-acciones mb-3">
            <a className="mapa-accion principal" href={`tel:${d.telefono}`}>
              <Phone className="size-4" /> Llamar
            </a>
            {d.whatsapp && (
              <a className="mapa-accion" href={`https://wa.me/52${d.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            )}
          </div>
          <table className="croquis-inventario">
            <thead>
              <tr>
                <th>Inventario</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {d.inventario.map((i) => (
                <tr key={i.producto}>
                  <td>{i.producto}</td>
                  <td className="precio">
                    {pesos(i.precio)} <span className="unidad">/ {i.unidad}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">
            Locatario, teléfono e inventario ilustrativos. La compra se hace en persona, en el puesto.
          </p>
        </>
      )}
    </article>
  )
}
