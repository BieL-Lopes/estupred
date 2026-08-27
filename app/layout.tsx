import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'estupred — Cursos profissionalizantes para o sistema prisional',
  description:
    'Cursos profissionalizantes reconhecidos, com certificado emitido por instituição credenciada. Matrícula online pela família, acompanhamento em tempo real.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
