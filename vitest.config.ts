import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// Os testes de integração falam com o Supabase local e leem as chaves de
// process.env. O Vitest não carrega .env.local sozinho, então carregamos
// aqui, sem filtro de prefixo.
const env = loadEnv('test', process.cwd(), '')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Precisa vir antes do alias de '@', senão o prefixo não casa primeiro.
      'server-only': fileURLToPath(
        new URL('./tests/stubs/server-only.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    env,
    environment: 'node',
    include: ['tests/unidade/**/*.test.ts', 'tests/integracao/**/*.test.ts'],
    globals: true,
  },
})
