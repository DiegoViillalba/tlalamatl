// Árbol de rutas. Archivo COMPARTIDO: lo público vive en src/routes/publico/index.tsx y cada rol define
// sus rutas en src/routes/<rol>/index.tsx, así que normalmente no hace falta tocar este archivo.
import { createBrowserRouter, Navigate } from 'react-router'
import { MarcoTelefono } from '@/components/marco-telefono'
import { rutasCliente } from '@/routes/cliente'
import { rutasComercio } from '@/routes/comercio'
import { Entrada } from '@/routes/entrada'
import { rutasProveedor } from '@/routes/proveedor'
import { rutasPublicas } from '@/routes/publico'

export const router = createBrowserRouter([
  {
    element: <MarcoTelefono />,
    children: [
      rutasPublicas, // "/" (mapa) y "/precios", sin login
      { path: 'entrar', element: <Entrada /> },
      rutasCliente,
      rutasComercio,
      rutasProveedor,
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
