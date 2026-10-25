import { MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Botones Llamar y WhatsApp. Sin WhatsApp no se muestra ese botón; sin teléfono, ninguno. */
export function Contacto({ telefono, whatsapp }: { telefono: string | null; whatsapp: string | null }) {
  if (!telefono && !whatsapp) return null
  return (
    <div className="flex gap-2">
      {telefono && (
        <Button asChild variant="outline" size="sm" className="flex-1">
          <a href={`tel:${telefono}`}>
            <Phone />
            Llamar
          </a>
        </Button>
      )}
      {whatsapp && (
        <Button asChild variant="outline" size="sm" className="flex-1">
          <a href={`https://wa.me/52${whatsapp}`} target="_blank" rel="noreferrer">
            <MessageCircle />
            WhatsApp
          </a>
        </Button>
      )}
    </div>
  )
}
