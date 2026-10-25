import { PackageCheck } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { EstadoOrdenBadge } from '@/components/estado-badge'
import { Encabezado } from '@/components/encabezado'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fechaCorta, pesos } from '@/lib/formato'
import { AvisoDemo, Contacto, useDemoComercio, type SolicitudDemo } from './demo'

export function Solicitudes() {
  const { solicitudes } = useDemoComercio()

  return (
    <>
      <Encabezado titulo="Mis solicitudes">Lo que pediste a tus proveedores y en qué va.</Encabezado>
      <div className="space-y-4">
        <AvisoDemo>Modo demo: son solicitudes de ejemplo y las que hagas en esta sesión.</AvisoDemo>
        {solicitudes.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no pides nada. Busca en <Link to="/comercio/proveedores" className="underline">Proveedores</Link>.
          </p>
        )}
        {solicitudes.map((s) => (
          <TarjetaSolicitud key={s.id} solicitud={s} />
        ))}
      </div>
    </>
  )
}

const QUE_SIGUE: Record<SolicitudDemo['estado'], string> = {
  solicitada: 'Esperando a que el proveedor la confirme.',
  confirmada: 'El proveedor la confirmó y la está preparando.',
  enviada: 'Va en camino. Márcala cuando llegue.',
  recibida: 'Recibida.',
  rechazada: 'El proveedor no la pudo surtir.',
}

function TarjetaSolicitud({ solicitud }: { solicitud: SolicitudDemo }) {
  const { recibir } = useDemoComercio()
  const total = solicitud.items.reduce((suma, i) => suma + i.cantidad * i.precio, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{solicitud.proveedor.nombre}</CardTitle>
          <EstadoOrdenBadge estado={solicitud.estado} />
        </div>
        <p className="text-xs text-muted-foreground">
          Solicitud #{solicitud.id} · {fechaCorta(solicitud.creado_en)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ul className="space-y-1">
          {solicitud.items.map((i) => (
            <li key={i.producto} className="flex justify-between gap-2">
              <span>
                {i.cantidad} {i.unidad} de {i.producto}
              </span>
              <span className="text-muted-foreground">{pesos(i.cantidad * i.precio)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t pt-2 font-medium">
          <span>Total</span>
          <span>{pesos(total)}</span>
        </p>
        <p className="text-muted-foreground">{QUE_SIGUE[solicitud.estado]}</p>
        {solicitud.estado === 'enviada' && (
          <Button
            className="w-full"
            onClick={() => {
              recibir(solicitud.id)
              toast.success('Marcada como recibida')
            }}
          >
            <PackageCheck />
            Ya la recibí
          </Button>
        )}
        <Contacto telefono={solicitud.proveedor.telefono} whatsapp={solicitud.proveedor.whatsapp} />
      </CardContent>
    </Card>
  )
}
