import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'estupred — Cursos profissionalizantes para o sistema prisional',
  description:
    'Cursos profissionalizantes com certificado emitido por instituição credenciada. A família matricula online em minutos e acompanha cada etapa até o certificado.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
