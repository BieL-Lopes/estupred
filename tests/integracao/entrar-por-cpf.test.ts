import { describe, expect, it } from 'vitest'
import { autenticarPorCpf } from '@/lib/auth-cpf'

// CPFs de exemplo (checksum válido, não pertencem a pessoa real):
// 390.533.447-05 = Ana Souza, seed.sql, role responsavel
// 529.982.247-25 = Administração, seed.sql, role admin
// 111.444.777-35 = usado nos internos do seed, nunca como profiles.cpf

describe('autenticarPorCpf', () => {
  it('rejeita CPF inválido sem consultar o banco', async () => {
    const r = await autenticarPorCpf('111.111.111-11', 'teste-cpf-invalido')
    expect(r).toEqual({
      ok: false,
      erro: 'CPF inválido. Confira os números digitados.',
    })
  })

  it('entra com o CPF de um responsável cadastrado', async () => {
    const r = await autenticarPorCpf('390.533.447-05', 'teste-cpf-ana')
    expect(r).toEqual({ ok: true })
  })

  it('recusa CPF de administrador — admin só entra com senha', async () => {
    const r = await autenticarPorCpf('529.982.247-25', 'teste-cpf-admin')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('não encontrado')
  })

  it('recusa CPF que não existe como responsável', async () => {
    const r = await autenticarPorCpf('111.444.777-35', 'teste-cpf-inexistente')
    expect(r).toEqual({
      ok: false,
      erro: 'CPF não encontrado. Confira o número ou fale com o suporte.',
    })
  })

  it('bloqueia depois de muitas tentativas da mesma origem', async () => {
    const origem = 'teste-cpf-limite'
    for (let i = 0; i < 12; i++) {
      await autenticarPorCpf('111.444.777-35', origem)
    }
    const r = await autenticarPorCpf('111.444.777-35', origem)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erro).toContain('Muitas tentativas')
  })
})
