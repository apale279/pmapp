import type { ReactNode } from 'react'
import type { Paziente } from '../../types/paziente'
import { CODICE_COLORE_LABEL, PAZIENTE_STATO_LABEL } from '../../types/paziente'
import type { CodiceColorePaziente } from '../../types/paziente'
import type { SchedaPazienteTabId } from './schedaPazienteTabs'

const TRI_EMOJI: Record<CodiceColorePaziente, string> = {
  bianco: '⚪',
  verde: '🟢',
  giallo: '🟡',
  rosso: '🔴',
}

export type DettaglioPazienteProps = {
  p: Paziente
  tabs: { id: SchedaPazienteTabId; label: string }[]
  activeTab: SchedaPazienteTabId
  onTabChange: (tab: SchedaPazienteTabId) => void
  saveError: ReactNode
  panels: Record<SchedaPazienteTabId, ReactNode>
}

export function DettaglioPaziente({ p, tabs, activeTab, onTabChange, saveError, panels }: DettaglioPazienteProps) {
  return (
    <div className="flex w-full min-w-0 flex-col bg-white">
      <div className="border-b border-slate-200 bg-white py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-[#111827]">
            <span aria-hidden>{TRI_EMOJI[p.codice_colore]}</span>
            <span>
              {CODICE_COLORE_LABEL[p.codice_colore]} • {PAZIENTE_STATO_LABEL[p.stato]}
            </span>
          </div>
          <code className="font-mono text-[12px] text-slate-600">{p.id_paziente_visibile}</code>
        </div>
      </div>

      <nav
        className="border-b border-slate-200 bg-white"
        aria-label="Sezioni scheda paziente"
        role="tablist"
      >
        <div className="mx-auto flex max-w-5xl gap-8 overflow-x-auto px-0">
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
                  'shrink-0 border-b-[3px] pb-3 pt-3 text-sm transition-colors',
                  selected
                    ? 'border-[#3b82f6] font-semibold text-[#111827]'
                    : 'border-transparent font-medium text-slate-500 hover:text-[#111827]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl flex-1 pt-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]">Scheda Paziente</h2>
          <code className="hidden font-mono text-[11px] text-slate-500 sm:block">ID {p.id}</code>
        </div>
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
              className={visible ? 'block min-h-[min(40vh,280px)]' : 'hidden'}
            >
              {panels[tab.id]}
            </div>
          )
        })}
      </div>
    </div>
  )
}
