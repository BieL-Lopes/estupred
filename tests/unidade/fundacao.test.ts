import { describe, expect, it } from 'vitest'
import tsconfig from '@/tsconfig.json'

describe('fundação do projeto', () => {
  it('mantém o TypeScript em modo strict', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true)
  })

  it('resolve o alias @ para a raiz do projeto', async () => {
    const mod = await import('@/package.json')
    expect(mod.default.name).toBeDefined()
  })
})
