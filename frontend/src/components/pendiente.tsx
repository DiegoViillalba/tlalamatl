import { Hammer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/** Marcador de pantalla aún no construida. Bórralo al implementar la pantalla. */
export function Pendiente({ titulo, doc }: { titulo: string; doc: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hammer className="size-4 text-primary" />
          {titulo}
        </CardTitle>
        <CardDescription>Pantalla por construir.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        El alcance está en <code className="rounded bg-muted px-1 py-0.5 text-xs">{doc}</code>.
      </CardContent>
    </Card>
  )
}
