import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  clienteAgregarFavoritoMutation,
  clienteListarFavoritosOptions,
  clienteListarFavoritosQueryKey,
  clienteQuitarFavoritoMutation,
} from '@/api/@tanstack/react-query.gen'
import { Button } from '@/components/ui/button'
import { mensajeError } from '@/lib/api'
import { useSesion } from '@/lib/sesion'

export function BotonFavorito({ comercioId }: { comercioId: number }) {
  const sesion = useSesion()
  const navegar = useNavigate()
  const queryClient = useQueryClient()
  const esCliente = sesion?.usuario.rol === 'cliente'
  const favoritos = useQuery({ ...clienteListarFavoritosOptions(), enabled: esCliente })
  const actualizar = {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clienteListarFavoritosQueryKey() }),
    onError: (error: unknown) => toast.error(mensajeError(error)),
  }
  const agregar = useMutation({ ...clienteAgregarFavoritoMutation(), ...actualizar })
  const quitar = useMutation({ ...clienteQuitarFavoritoMutation(), ...actualizar })
  const guardado = favoritos.data?.some((comercio) => comercio.id === comercioId) ?? false
  const pendiente = agregar.isPending || quitar.isPending

  function alternar() {
    if (!esCliente) {
      navegar('/entrar')
      return
    }
    const variables = { path: { comercio_id: comercioId } }
    if (guardado) quitar.mutate(variables)
    else agregar.mutate(variables)
  }

  return (
    <Button type="button" size="sm" variant="outline" aria-pressed={guardado} disabled={pendiente} onClick={alternar}>
      <Heart className={guardado ? 'fill-current' : undefined} />
      {guardado ? 'Quitar favorito' : 'Favorito'}
    </Button>
  )
}