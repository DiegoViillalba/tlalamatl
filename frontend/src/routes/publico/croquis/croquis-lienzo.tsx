// Lienzo del croquis: contorno del mercado en SVG, locales por zona, zoom y arrastre. Portado de m2.html;
// el manejo de la vista sigue al de mapa/mapa-lienzo.tsx, con medidas en metros del edificio.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as Puntero } from 'react'
import { Minus, Plus, Scan } from 'lucide-react'
import type { Vista } from '../mapa/mapa-lienzo'
import { colorZona, type Local, type Plano } from './planos'

type Tam = { w: number; h: number }

type Props = {
  plano: Plano
  locales: Local[]
  /** Locales fuera de la zona elegida o de la búsqueda: se dibujan tenues */
  apagados: Set<number>
  elegido: number | null
  /** Cambia `seq` para centrar el plano en un local (por ejemplo, al tocar la lista de puestos). */
  enfoque: { num: number; seq: number } | null
  onElegir: (num: number) => void
}

function ajustaAspecto(v: Vista, tam: Tam): Vista {
  const r = tam.w / Math.max(1, tam.h)
  if (!(r > 0) || !(v.w > 0) || !(v.h > 0) || !Number.isFinite(v.w + v.h)) return v
  const cx = v.x + v.w / 2
  const cy = v.y + v.h / 2
  let w = v.w
  let h = v.h
  if (w / h < r) w = h * r
  else h = w / r
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}

/** El edificio completo con un margen; arriba y abajo hay más espacio para los letreros de acceso. */
function vistaCompleta(p: Plano): Vista {
  const m = Math.max(p.ancho, p.alto) * 0.06
  return { x: -m, y: -m * 1.4, w: p.ancho + 2 * m, h: p.alto + 2.8 * m }
}

export function CroquisLienzo({ plano, locales, apagados, elegido, enfoque, onElegir }: Props) {
  const todo = useMemo(() => vistaCompleta(plano), [plano])
  const svgRef = useRef<SVGSVGElement>(null)
  const [vista, setVista] = useState<Vista>(todo)
  const vistaRef = useRef(vista)
  const tamRef = useRef<Tam>({ w: 1, h: 1 })
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

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const medir = () => {
      if (!el.clientWidth || !el.clientHeight) return
      tamRef.current = { w: el.clientWidth, h: el.clientHeight }
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
    const w = Math.min(todo.w * 1.5, Math.max(todo.w / 12, v.w / factor))
    const f = w / v.w
    aplica({ x: ux - (ux - v.x) * f, y: uy - (uy - v.y) * f, w, h: v.h * f })
  }

  // Centrar en un local al elegirlo desde la lista
  useEffect(() => {
    if (!enfoque) return
    const c = locales.find((l) => l.num === enfoque.num)
    if (!c) return
    const w = todo.w / 4
    aplica({ x: c.cx - w / 2, y: c.cy - w / 2, w, h: w })
    // Solo cuando cambia la señal de enfoque
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

  // Letreros de acceso (ilustrativos) a media fachada en los dos lados largos
  const fs = Math.max(plano.ancho, plano.alto) * 0.022

  return (
    <div className="croquis-caja" style={{ '--aspecto': todo.w / todo.h } as CSSProperties}>
      <svg
        ref={svgRef}
        className={`croquis-svg${arrastrando ? ' arrastrando' : ''}`}
        viewBox={`${vista.x} ${vista.y} ${vista.w} ${vista.h}`}
        role="img"
        aria-label={`Plano del ${plano.nombre} con sus locales por zona`}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        <polygon points={plano.contorno.map((p) => p.join(',')).join(' ')} className="croquis-muro" />
        <g>
          {locales.map((c) => {
            const clases = ['croquis-local', c.demo && 'demo', apagados.has(c.num) && 'apagado', c.num === elegido && 'elegido']
            return (
              <rect
                key={c.num}
                x={c.x + 0.15}
                y={c.y + 0.15}
                width={c.w - 0.3}
                height={c.w - 0.3}
                className={clases.filter(Boolean).join(' ')}
                fill={c.demo ? 'var(--guinda)' : colorZona(c.zona)}
                onClick={() => {
                  if (!movidoRef.current) onElegir(c.num)
                }}
              >
                <title>{c.demo ? `${c.demo.puesto}, local ${c.num}` : `Local ${c.num}, ${plano.zonas[c.zona].nombre}`}</title>
              </rect>
            )
          })}
          {locales
            .filter((c) => c.demo)
            .map((c) => (
              <text key={`n-${c.num}`} x={c.cx} y={c.cy} className="croquis-num-demo" fontSize={c.w * 0.55}>
                {c.demoN}
              </text>
            ))}
        </g>
        {[-fs * 0.6, plano.alto + fs * 1.4].map((y) => (
          <text key={y} x={plano.ancho / 2} y={y} className="croquis-acceso" fontSize={fs}>
            Acceso
          </text>
        ))}
      </svg>

      <div className="mapa-zoom">
        <button type="button" onClick={() => zoomEn(1.5)} aria-label="Acercar">
          <Plus className="ico" />
        </button>
        <button type="button" onClick={() => zoomEn(1 / 1.5)} aria-label="Alejar">
          <Minus className="ico" />
        </button>
        <button type="button" onClick={() => aplica(todo)} aria-label="Ver todo el mercado">
          <Scan className="ico" />
        </button>
      </div>
    </div>
  )
}
