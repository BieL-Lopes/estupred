import { ImageResponse } from 'next/og'

// Versão maior do mesmo monograma, para "Adicionar à Tela de Início" no iOS.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          color: '#0f172a',
          fontSize: 108,
          fontWeight: 800,
        }}
      >
        C
      </div>
    ),
    { ...size },
  )
}
