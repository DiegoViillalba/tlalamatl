import { defineConfig } from '@hey-api/openapi-ts'

// Genera src/api/ desde openapi.json (exportado por el backend con `make gen-api`).
// src/api/ es GENERADO: nunca se edita a mano y no se versiona.
export default defineConfig({
  input: 'openapi.json',
  output: 'src/api',
  plugins: ['@hey-api/client-fetch', '@tanstack/react-query'],
})
