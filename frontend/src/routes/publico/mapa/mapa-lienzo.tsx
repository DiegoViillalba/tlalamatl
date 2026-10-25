// Lienzo del mapa: alcaldías en SVG, pines de mercado, zoom y arrastre. Portado de m1.html.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as Puntero } from 'react'
import { Minus, Plus, Scan } from 'lucide-react'
import { CDMX } from './cdmx'
import { TINTES, VISTA_TODA, nombreCorto, proyecta } from './geometria'
import { FormaTipo, FormaTipoAnidada, TIPOS, type Tipo } from './tipos'

export type PinMapa = { id: string; tipo: Tipo; nombre: string; lat: number; lon: number }
type Vista = { x: number; y: number; w: number; h: number }
type Tam = { w: number; h: number }

type Props = {
  pines: PinMapa[]
  yo: { lat: number; lon: number }
  elegido: string | null
  /** Cambia `seq` para centrar el mapa en un pin (por ejemplo, al tocar la lista). */
  enfoque: { id: string; lat: number; lon: number; seq: number } | null
  onElegir: (id: string) => void
}

const ZOOM_MAX = VISTA_TODA.w * 1.4
const ZOOM_MIN = 120
/** Por debajo de este ancho de vista (unidades del mapa) los lugares se dibujan como pines y no como puntos. */
const VISTA_DETALLE = 420

/** Conserva el centro de la vista y ajusta su proporción al lienzo para que no se deforme. */
function ajustaAspecto(v: Vista, tam: Tam): Vista {
  const r = tam.w / Math.max(1, tam.h)
  const cx = v.x + v.w / 2
  const cy = v.y + v.h / 2
  let w = v.w
  let h = v.h
  if (w / h < r) w = h * r
  else h = w / r
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

export function MapaLienzo({ pines, yo, elegido, enfoque, onElegir }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [vista, setVista] = useState<Vista>(VISTA_TODA)
  const [tam, setTam] = useState<Tam>({ w: 1, h: 1 })
  // Refs para que los manejadores de puntero vean el valor actual sin reenlazarse en cada render
  const vistaRef = useRef(vista)
  const tamRef = useRef(tam)
  const punterosRef = useRef(new Map<number, { x: number; y: number }>())
  const distPinzaRef = useRef(0)
  const movidoRef = useRef(false)
  const [arrastrando, setArrastrando] = useState(false)

  function aplica(siguiente: Vista) {
    const ajustada = ajustaAspecto(siguiente, tamRef.current)
    vistaRef.current = ajustada
    setVista(ajustada)
  }
  const unidadesPorPx = () => vistaRef.current.w / Math.max(1, tamRef.current.w)

  // Medir el lienzo y mantener la proporción al cambiar de tamaño
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const medir = () => {
      const nuevo = { w: el.clientWidth, h: el.clientHeight }
      tamRef.current = nuevo
      setTam(nuevo)
      aplica(vistaRef.current)
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
    // aplica usa solo refs y setVista; el efecto debe correr una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function zoomEn(factor: number, px?: number, py?: number) {
    const k = unidadesPorPx()
    const v = vistaRef.current
    const ux = v.x + (px ?? tamRef.current.w / 2) * k
    const uy = v.y + (py ?? tamRef.current.h / 2) * k
    const w = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.w / factor))
    const f = w / v.w
    aplica({ x: ux - (ux - v.x) * f, y: uy - (uy - v.y) * f, w, h: v.h * f })
  }

  // Centrar en un pin al tocarlo en la lista
  useEffect(() => {
    if (!enfoque) return
    const p = proyecta(enfoque.lat, enfoque.lon)
    const w = 300
    const h = w * (tamRef.current.h / Math.max(1, tamRef.current.w))
    aplica({ x: p.x - w / 2, y: p.y - h / 2, w, h })
    // Solo cuando cambia la señal de enfoque, no con cada cambio de vista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enfoque?.seq])

  // La rueda necesita listener nativo no pasivo para poder cancelar el desplazamiento de la página
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const rueda = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomEn(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', rueda, { passive: false })
    return () => el.removeEventListener('wheel', rueda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function alPresionar(e: Puntero<SVGSVGElement>) {
    punterosRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    movidoRef.current = false
    if (punterosRef.current.size === 2) {
      const [a, b] = [...punterosRef.current.values()]
      distPinzaRef.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function alMover(e: Puntero<SVGSVGElement>) {
    const punteros = punterosRef.current
    if (!punteros.has(e.pointerId)) return
    const antes = punteros.get(e.pointerId)!
    const ahora = { x: e.clientX, y: e.clientY }
    punteros.set(e.pointerId, ahora)
    if (punteros.size === 1) {
      const dx = ahora.x - antes.x
      const dy = ahora.y - antes.y
      if (!movidoRef.current && Math.hypot(dx, dy) < 3) return
      if (!movidoRef.current) {
        movidoRef.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        setArrastrando(true)
      }
      const k = unidadesPorPx()
      const v = vistaRef.current
      aplica({ ...v, x: v.x - dx * k, y: v.y - dy * k })
    } else if (punteros.size === 2) {
      movidoRef.current = true
      const [a, b] = [...punteros.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const r = e.currentTarget.getBoundingClientRect()
      if (distPinzaRef.current) zoomEn(d / distPinzaRef.current, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top)
      distPinzaRef.current = d
    }
  }

  function alSoltar(e: Puntero<SVGSVGElement>) {
    punterosRef.current.delete(e.pointerId)
    if (punterosRef.current.size < 2) distPinzaRef.current = 0
    setArrastrando(false)
  }

  // Unidades del mapa por píxel de pantalla: pines y nombres conservan su tamaño al acercar
  const k = vista.w / Math.max(1, tam.w)
  const yoPos = useMemo(() => proyecta(yo.lat, yo.lon), [yo.lat, yo.lon])
  const pinesOrdenados = useMemo(
    () => [...pines].sort((a, b) => (a.id === elegido ? 1 : 0) - (b.id === elegido ? 1 : 0) || b.lat - a.lat),
    [pines, elegido],
  )

  return (
    <div className="mapa-caja">
      <svg
        ref={svgRef}
        className={`mapa-svg${arrastrando ? ' arrastrando' : ''}`}
        viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
        role="img"
        aria-label="Mapa de la Ciudad de México con sus alcaldías y los mercados"
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        <g>
          {CDMX.alcaldias.map((a) => (
            <path key={`c-${a.nombre}`} d={a.d} className="mapa-contorno" />
          ))}
        </g>
        <g>
          {CDMX.alcaldias.map((a, i) => (
            <path key={a.nombre} d={a.d} className="mapa-alcaldia" fill={TINTES[i % TINTES.length]}>
              <title>{a.nombre}</title>
            </path>
          ))}
        </g>
        <g>
          {CDMX.alcaldias.map((a) => (
            <text
              key={`t-${a.nombre}`}
              x={a.x}
              y={a.y}
              className="mapa-nombre-alc"
              style={{ fontSize: `${11 * k}px`, strokeWidth: `${3 * k}px` }}
            >
              {nombreCorto(a.nombre)}
            </text>
          ))}
        </g>
        <g>
          {pinesOrdenados.map((m) => {
            const p = proyecta(m.lat, m.lon)
            const activo = m.id === elegido
            // De lejos son muchos lugares: puntos de color; al acercar, pines con su forma
            if (!activo && vista.w > VISTA_DETALLE) {
              return (
                <circle
                  key={m.id}
                  cx={p.x}
                  cy={p.y}
                  r={4.5 * k}
                  className="mapa-punto"
                  style={{ '--c': TIPOS[m.tipo].color } as CSSProperties}
                  strokeWidth={1.2 * k}
                  onClick={() => {
                    if (!movidoRef.current) onElegir(m.id)
                  }}
                >
                  <title>{m.nombre}</title>
                </circle>
              )
            }
            const s = k * (activo ? 1.3 : 1)
            return (
              <g
                key={m.id}
                className={`mapa-pin${activo ? ' activo' : ''}`}
                transform={`translate(${p.x} ${p.y}) scale(${s})`}
                style={{ '--c': TIPOS[m.tipo].color } as CSSProperties}
                tabIndex={0}
                role="button"
                aria-label={`${m.nombre}, ${TIPOS[m.tipo].nombre}`}
                onClick={() => {
                  if (!movidoRef.current) onElegir(m.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onElegir(m.id)
                  }
                }}
              >
                <path className="gota" d="M0 0C-4-7-13-12-13-22a13 13 0 0 1 26 0C13-12 4-7 0 0Z" />
                <FormaTipoAnidada tipo={m.tipo} x={-6.5} y={-28.5} size={13} />
              </g>
            )
          })}
        </g>
        <g>
          <circle cx={yoPos.x} cy={yoPos.y} r={13 * k} className="mapa-yo-halo" strokeWidth={2 * k} />
          <circle cx={yoPos.x} cy={yoPos.y} r={7 * k} className="mapa-yo-punto" strokeWidth={3 * k} />
        </g>
      </svg>

      <div className="mapa-simbologia" aria-hidden="true">
        <b>Simbología</b>
        <ul>
          {(Object.keys(TIPOS) as Tipo[]).map((t) => (
            <li key={t}>
              <FormaTipo tipo={t} style={{ fill: TIPOS[t].color, width: 12, height: 12 }} />
              {TIPOS[t].corto}
            </li>
          ))}
          <li>
            <svg viewBox="0 0 16 16" style={{ width: 12, height: 12 }}>
              <circle cx="8" cy="8" r="5" fill="var(--foco, #1f6fd1)" stroke="#fff" strokeWidth="2" />
            </svg>
            Tu ubicación
          </li>
        </ul>
      </div>

      <div className="mapa-zoom">
        <button type="button" onClick={() => zoomEn(1.5)} aria-label="Acercar">
          <Plus className="ico" />
        </button>
        <button type="button" onClick={() => zoomEn(1 / 1.5)} aria-label="Alejar">
          <Minus className="ico" />
        </button>
        <button type="button" onClick={() => aplica(VISTA_TODA)} aria-label="Ver toda la ciudad">
          <Scan className="ico" />
        </button>
      </div>
    </div>
  )
}
