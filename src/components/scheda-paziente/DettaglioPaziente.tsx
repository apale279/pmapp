import type { ReactNode } from 'react'
import type { Paziente } from '../../types/paziente'
import { PAZIENTE_STATO_LABEL } from '../../types/paziente'
import type { SchedaPazienteTabId } from './schedaPazienteTabs'
import { TriageColorBadge } from './TriageColorBadge'

export type DettaglioPazienteProps = {
  p: Paziente
  tabs: { id: SchedaPazienteTabId; label: string }[]
  activeTab: SchedaPazienteTabId
  onTabChange: (tab: SchedaPazienteTabId) => void
  saveError: ReactNode
  panels: Record<SchedaPazienteTabId, ReactNode>
}

function displayNomeCognome(p: Paziente): string {
  const cognome = p.cognome?.trim() ?? ''
  const nome = p.nome?.trim() ?? ''
  if (!cognome && !nome) return 'Nominativo non ancora compilato'
  return [cognome, nome].filter(Boolean).join(' ')
}

export function DettaglioPaziente({ p, tabs, activeTab, onTabChange, saveError, panels }: DettaglioPazienteProps) {
  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {displayNomeCognome(p)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-mono font-semibold text-slate-800">{p.id_paziente_visibile}</span>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <TriageColorBadge codice={p.codice_colore} variant="pill" />
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800">
                {PAZIENTE_STATO_LABEL[p.stato]}
              </span>
              {!p.aperto ? (
                <>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-amber-800">Chiusa</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
            <span className="font-mono text-[11px] text-slate-400">ID {p.id}</span>
          </div>
        </div>

        <nav
          className="border-t border-slate-100 bg-white"
          aria-label="Sezioni scheda paziente"
          role="tablist"
        >
          <div className="mx-auto flex max-w-6xl overflow-x-auto overscroll-x-contain px-2 sm:px-4">
            <div className="flex min-w-min gap-1 pb-0 pt-1">
              {tabs.map((tab) => {
                const selected = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`scheda-panel-${tab.id}`}
                    id={`scheda-tab-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onTabChange(tab.id)}
                    className={[
                      'shrink-0 rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                      selected
                        ? 'border-slate-900 bg-slate-50 text-slate-900'
                        : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {saveError}
        {tabs.map((tab) => {
          const visible = activeTab === tab.id
          return (
            <div
              key={tab.id}
              id={`scheda-panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`scheda-tab-${tab.id}`}
              hidden={!visible}
              className={visible ? 'block min-h-[min(40vh,320px)]' : 'hidden'}
            >
              {panels[tab.id]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
