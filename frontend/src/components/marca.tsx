import { cn } from '@/lib/utils'

/** Isotipo de Tlalamatl: surcos de tierra y un grano de maíz. Identidad propia, no oficial. */
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M6 13c3.5-3 7-3 10 0s6.5 3 10 0" stroke="var(--primary-foreground)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M6 20c3.5-3 7-3 10 0s6.5 3 10 0" stroke="var(--maiz)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="23.5" cy="7.5" r="2.2" fill="var(--maiz)" />
    </svg>
  )
}

export function Marca({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Isotipo />
      <span className="font-heading text-lg font-semibold tracking-tight">Tlalamatl</span>
    </span>
  )
}
