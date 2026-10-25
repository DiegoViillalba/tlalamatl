import { Outlet } from 'react-router'

/** En desktop simula el ancho de un teléfono; en móvil/webview ocupa toda la pantalla. */
export function MarcoTelefono() {
  return (
    <div className="min-h-dvh bg-muted md:flex md:items-center md:justify-center md:py-6">
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background md:h-[min(860px,calc(100dvh-3rem))] md:rounded-[2.25rem] md:border md:shadow-xl">
        <Outlet />
      </div>
    </div>
  )
}
