import { type ReactNode } from 'react'

export type OperativePageGridProps = {
  main: ReactNode
  aside?: ReactNode
}

/** Griglia 75% / 25% (stile DNA dashboard PMA): contenuto principale + pannello secondario. */
export function OperativePageGrid({ main, aside }: OperativePageGridProps) {
  if (aside == null) {
    return <div className="mx-auto w-full max-w-6xl">{main}</div>
  }
  return (
    <div className="mx-auto grid w-full max-w-[1920px] gap-6 lg:grid-cols-12 lg:gap-8">
      <div className="min-w-0 lg:col-span-9">{main}</div>
      <aside className="min-w-0 border-t border-[#e2e8f0] pt-6 lg:col-span-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        {aside}
      </aside>
    </div>
  )
}
