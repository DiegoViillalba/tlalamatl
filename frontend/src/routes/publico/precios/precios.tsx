// Dashboard público de precios (sin login). Dos vistas del mismo dato (`GET /publico/precios`):
// "Para comprar" (cliente) y "Para vender" (proveedor y comerciante). Ver docs/alcance/compartido.md.
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { publicoPreciosOptions } from '@/api/@tanstack/react-query.gen'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CreditosImagenes } from '@/components/imagen-producto'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CATEGORIAS_PRODUCTO, mesActual, MESES } from '@/lib/formato'
import { mensajeError } from '@/lib/api'
import { Canasta } from './canasta'
import { HistorialPrecios } from './historial'
import { ResumenTemporada, TarjetaComprar } from './para-comprar'
import { ordenarParaVender, TarjetaVender } from './para-vender'

type Vista = 'comprar' | 'vender'
type Filtro = 'temporada' | 'canasta' | 'todo'

const sinAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function Precios() {
  const [vista, setVista] = useState<Vista>('comprar')
  const [filtro, setFiltro] = useState<Filtro>('temporada')
  const [categoria, setCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const hoy = mesActual()
  const [mes, setMes] = useState(hoy)
  const [historial, setHistorial] = useState<{
    id: number
    nombre: string
  } | null>(null)

  const consulta = useQuery(publicoPreciosOptions({ query: { mes } }))
  const productos = useMemo(() => consulta.data ?? [], [consulta.data])

  const visibles = useMemo(() => {
    const texto = sinAcentos(busqueda.trim())
    const lista = productos.filter(
      (p) =>
        (filtro === 'todo' || (filtro === 'temporada' ? p.de_temporada : p.canasta_basica)) &&
        (categoria === 'todas' || p.categoria === categoria) &&
        (!texto || sinAcentos(p.nombre).includes(texto)),
    )
    return vista === 'vender' ? ordenarParaVender(lista) : lista
  }, [productos, filtro, categoria, busqueda, vista])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Precios</h1>
          <p className="text-sm text-muted-foreground">
            {vista === 'comprar'
              ? 'Compra más barato: productos de temporada y canasta básica, y dónde encontrarlos.'
              : 'Dónde hay demanda y qué está de temporada para colocar tu producto.'}
          </p>
        </div>
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="shrink-0" aria-label="Mes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MESES.map((nombre, i) => (
              <SelectItem key={nombre} value={String(i + 1)}>
                {nombre}
                {i + 1 === hoy ? ' (actual)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)}>
        <TabsList className="w-full">
          <TabsTrigger value="comprar">Para comprar</TabsTrigger>
          <TabsTrigger value="vender">Para vender</TabsTrigger>
        </TabsList>
      </Tabs>

      {vista === 'comprar' && <Canasta mes={mes} esActual={mes === hoy} alVerHistorial={setHistorial} />}

      {vista === 'comprar' && !consulta.isPending && (
        <ResumenTemporada productos={productos} mes={mes} esActual={mes === hoy} />
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto (jitomate, mango…)"
            aria-label="Buscar producto"
            className="h-9 pl-8"
          />
        </div>
        <div>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-full" aria-label="Categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {Object.entries(CATEGORIAS_PRODUCTO).map(([clave, nombre]) => (
                <SelectItem key={clave} value={clave}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <TabsList className="w-full">
            <TabsTrigger value="temporada">De temporada</TabsTrigger>
            <TabsTrigger value="canasta">Canasta básica</TabsTrigger>
            <TabsTrigger value="todo">Todo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {consulta.isPending && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      )}

      {consulta.isError && (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar los precios</AlertTitle>
          <AlertDescription>{mensajeError(consulta.error)}</AlertDescription>
        </Alert>
      )}

      {consulta.isSuccess && visibles.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No hay productos con estos filtros
          {filtro === 'temporada' ? ` de temporada en ${MESES[mes - 1].toLowerCase()}` : ''}. Prueba con “Todo” u otro
          mes.
        </p>
      )}

      {consulta.isSuccess && (
        <div className="space-y-3">
          {visibles.map((p) => {
            const verHistorial = () => setHistorial({ id: p.id, nombre: p.nombre })
            return vista === 'comprar' ? (
              <TarjetaComprar key={p.id} producto={p} alVerHistorial={verHistorial} />
            ) : (
              <TarjetaVender key={p.id} producto={p} alVerHistorial={verHistorial} />
            )
          })}
        </div>
      )}
      {consulta.isSuccess && <CreditosImagenes nombres={visibles.map((p) => p.nombre)} />}
      <HistorialPrecios producto={historial} alCerrar={() => setHistorial(null)} />
    </div>
  )
}
