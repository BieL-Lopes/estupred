function exigirCentavos(...valores: number[]): void {
  for (const valor of valores) {
    if (!Number.isInteger(valor)) {
      throw new Error('Valores monetários devem ser centavos inteiros')
    }
    if (valor < 0) {
      throw new Error('Valores monetários não podem ser negativos')
    }
  }
}

export function calcularTotal(
  precoCentavos: number,
  freteCentavos: number,
): number {
  exigirCentavos(precoCentavos, freteCentavos)
  return precoCentavos + freteCentavos
}

const FORMATADOR = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// O Intl separa "R$" do número com espaço não-quebrável (U+00A0). Escrito
// como código de caractere para não deixar um byte invisível no fonte.
const ESPACO_NAO_QUEBRAVEL = new RegExp(String.fromCharCode(0x00a0), 'g')

export function formatarBRL(centavos: number): string {
  exigirCentavos(centavos)
  return FORMATADOR.format(centavos / 100).replace(ESPACO_NAO_QUEBRAVEL, ' ')
}
