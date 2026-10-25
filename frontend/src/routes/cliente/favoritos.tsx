import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LocateFixed, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import type { Categoria } from '@/api'
import { clienteListarFavoritosOptions, publicoListarComerciosOptions } from '@/api/@tanstack/react-query.gen'
import { Encabezado } from '@/components/encabezado'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CATEGORIAS } from '@/lib/formato'
import { distanciaKm, fmtKm, ZOCALO } from '@/routes/publico/mapa/geometria'
import { BotonFavorito } from './boton-favorito'

export function Favoritos() {
  const [origen, setOrigen] = useState(ZOCALO)
  const [ubicacionReal, setUbicacionReal] = useState(false)
  const comercios = useQuery(publicoListarComerciosOptions())
  const favoritos = useQuery(clienteListarFavoritosOptions())

  function usarUbicacion() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setOrigen({ lat: posicion.coords.latitude, lon: posicion.coords.longitude })
        setUbicacionReal(true)
      },
      () => setUbicacionReal(false),
      { timeout: 8000 },
    )
  }

  const listaCercana = [...(comercios.data ?? [])]
    .map((comercio) => ({
      comercio,
      km: comercio.lat == null || comercio.lng == null ? null : distanciaKm(origen, { lat: comercio.lat, lon: comercio.lng }),
    }))
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))

  return (
    <>
      <Encabezado titulo="Favoritos">Tus mercados guardados y los más cercanos.</Encabezado>
      <Tabs defaultValue="cerca">
        <TabsList className="w-full">
          <TabsTrigger value="cerca">Cerca de mí</TabsTrigger>
          <TabsTrigger value="guardados">Mis favoritos</TabsTrigger>
        </TabsList>
        <TabsContent value="cerca" className="space-y-3 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Distancias desde {ubicacionReal ? 'tu ubicación' : 'el Zócalo'}.</p>
            <Button type="button" size="sm" variant="outline" onClick={usarUbicacion}>
              <LocateFixed /> Usar mi ubicación
            </Button>
          </div>
          {comercios.isPending && <Skeleton className="h-24 w-full" />}
          {comercios.isError && <p className="text-sm text-destructive">No pudimos cargar los comercios.</p>}
          {listaCercana.map(({ comercio, km }) => (
            <TarjetaComercio key={comercio.id} comercio={comercio} km={km} />
          ))}
        </TabsContent>
        <TabsContent value="guardados" className="space-y-3 pt-3">
          {favoritos.isPending && <Skeleton className="h-24 w-full" />}
          {favoritos.isError && <p className="text-sm text-destructive">No pudimos cargar tus favoritos.</p>}
          {favoritos.data?.length === 0 && <p className="text-sm text-muted-foreground">Aún no guardas comercios.</p>}
          {favoritos.data?.map((comercio) => (
            <TarjetaComercio
              key={comercio.id}
              comercio={comercio}
              km={comercio.lat == null || comercio.lng == null ? null : distanciaKm(origen, { lat: comercio.lat, lon: comercio.lng })}
            />
          ))}
        </TabsContent>
      </Tabs>
    </>
  )
}

type ComercioEnLista = {
  id: number
  nombre: string
  categoria: string
  alcaldia: string
  ubicacion: string
  lat?: number | null
  lng?: number | null
}

function TarjetaComercio({ comercio, km }: { comercio: ComercioEnLista; km: number | null }) {
  const categoria = CATEGORIAS[comercio.categoria as Categoria]

  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{comercio.nombre}</p>
            <p className="text-xs text-muted-foreground">{categoria} · {comercio.alcaldia}</p>
          </div>
          <BotonFavorito comercioId={comercio.id} />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> {comercio.ubicacion}
          <span className="ml-auto whitespace-nowrap">{km == null ? 'Distancia no disponible' : fmtKm(km)}</span>
        </p>
        <Button asChild size="sm" variant="link" className="h-auto px-0">
          <Link to={`/?comercio=${comercio.id}`}>Ver ficha</Link>
        </Button>
      </CardContent>
    </Card>
  )
}