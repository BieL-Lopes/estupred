import { Cabecalho } from '@/components/site/Cabecalho'
import { Rodape } from '@/components/site/Rodape'

export default function LayoutSite({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho />
      <div className="flex-1">{children}</div>
      <Rodape />
    </div>
  )
}
