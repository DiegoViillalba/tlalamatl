import { cn } from '@/lib/utils'

/** Isotipo de Tlalamatl: dos figuras que comparten un cuenco, en marco escalonado. Identidad propia, no oficial. */
export function Isotipo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="" aria-hidden="true" className={cn('size-8 rounded-md', className)} />
}

export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Isotipo />
      <span className="font-heading text-lg font-semibold tracking-tight">Tlalamatl</span>
    </span>
  )
}
