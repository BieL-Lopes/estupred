export function normalizarCpf(valor: string): string {
  return valor.replace(/\D/g, '')
}

function digitoVerificador(digitos: string, pesoInicial: number): number {
  let soma = 0
  for (let i = 0; i < digitos.length; i++) {
    soma += Number(digitos[i]) * (pesoInicial - i)
  }
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

export function cpfValido(valor: string): boolean {
  const cpf = normalizarCpf(valor)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const primeiro = digitoVerificador(cpf.slice(0, 9), 10)
  if (primeiro !== Number(cpf[9])) return false

  const segundo = digitoVerificador(cpf.slice(0, 10), 11)
  return segundo === Number(cpf[10])
}

export function formatarCpf(valor: string): string {
  const cpf = normalizarCpf(valor)
  if (cpf.length !== 11) return valor
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}
