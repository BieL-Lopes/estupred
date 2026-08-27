import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Esconde o indicador de dev tools do Next no canto da tela. Ele só
  // aparece em desenvolvimento, mas atrapalha ao mostrar as telas ao cliente.
  devIndicators: false,
}

export default nextConfig
