import { ImageResponse } from 'next/og'

// Mesmo monograma do Cabecalho/Rodape: "C" escuro sobre fundo laranja.
// Cores hardcoded porque o Satori (motor do ImageResponse) não lê variáveis
// CSS — precisam bater com --color-acento e --color-fundo do globals.css.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f97316',
          borderRadius: 7,
          color: '#0f172a',
          fontSize: 22,
          fontWeight: 800,
        }}
      >
        C
      </div>
    ),
    { ...size },
  )
}
