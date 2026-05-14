import { useState, type FormEvent, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { manifestazioneTenantIdForFirestore } from '../../lib/manifestazioneTenantId'
import { opPrimaryBtn, opToolbarBtnSm } from '../../components/layout/operativeTokens'
import { OperativePageGrid } from '../../components/layout/OperativePageGrid'
import { RUBRICA_CONTATTI_COLLECTION, useManifestazioneRubrica } from '../../hooks/useManifestazioneRubrica'
import type { RubricaContattoDoc } from '../../types/manifestazioneShared'
import { useOperativeChrome } from '../../context/OperativeChromeContext'

function telHref(numero: string): string {
  const compact = numero.replace(/[^\d+]/g, '')
  if (!compact) return '#'
  return `tel:${compact}`
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d="M6.6 10.8c1.4 2.8 3.4 4.9 6.2 6.2l2-2c.3-.3.8-.4 1.2-.2 1 .4 2.1.6 3.2.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.1.2 2.2.6 3.2.1.4 0 .9-.2 1.2l-2 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ManifestazioneRubricaPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const routeManId = idParam ? decodeURIComponent(idParam) : ''
  const { user } = useAuth()
  const tenantId = user ? manifestazioneTenantIdForFirestore(user, routeManId) : ''

  const { items, loading, error } = useManifestazioneRubrica(tenantId || undefined)

  const [nome, setNome] = useState('')
  const [numero, setNumero] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftNome, setDraftNome] = useState('')
  const [draftNumero, setDraftNumero] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  const canUse = Boolean(db && tenantId.trim())

  const { setSlots, clearSlots } = useOperativeChrome()
  useLayoutEffect(() => {
    setSlots({
      titleOverride: (
        <h1 className="truncate text-xs font-bold uppercase tracking-wider text-[#e8e8f8] sm:text-sm">RUBRICA</h1>
      ),
    })
    return () => clearSlots()
  }, [setSlots, clearSlots])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!db || !tenantId.trim()) return
    const n = nome.trim()
    const num = numero.trim()
    if (!n || !num) {
      setFormErr('Nome e numero sono obbligatori.')
      return
    }
    setFormErr(null)
    setSaving(true)
    try {
      await addDoc(collection(db, RUBRICA_CONTATTI_COLLECTION), {
        id_manifestazione: tenantId.trim(),
        nome: n,
        numero: num,
        descrizione: descrizione.trim(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
      setNome('')
      setNumero('')
      setDescrizione('')
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(row: RubricaContattoDoc) {
    setEditingId(row.id)
    setDraftNome(row.nome)
    setDraftNumero(row.numero)
    setDraftDesc(row.descrizione)
  }

  async function saveEdit(id: string) {
    if (!db) return
    const n = draftNome.trim()
    const num = draftNumero.trim()
    if (!n || !num) {
      setFormErr('Nome e numero sono obbligatori.')
      return
    }
    setFormErr(null)
    setRowBusy(id)
    try {
      await updateDoc(doc(db, RUBRICA_CONTATTI_COLLECTION, id), {
        nome: n,
        numero: num,
        descrizione: draftDesc.trim(),
        updated_at: serverTimestamp(),
      })
      setEditingId(null)
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Aggiornamento non riuscito.')
    } finally {
      setRowBusy(null)
    }
  }

  async function handleDelete(id: string) {
    if (!db || !window.confirm('Eliminare questo contatto?')) return
    setRowBusy(id)
    try {
      await deleteDoc(doc(db, RUBRICA_CONTATTI_COLLECTION, id))
    } finally {
      setRowBusy(null)
    }
  }

  async function copyNumero(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopyMsg('Numero copiato.')
      window.setTimeout(() => setCopyMsg(null), 2000)
    } catch {
      setCopyMsg('Copia non disponibile su questo dispositivo.')
      window.setTimeout(() => setCopyMsg(null), 2500)
    }
  }

  const main = (
    <div className="pma-dashboard space-y-6">
      <p className="text-xs text-slate-600">Contatti condivisi per manifestazione.</p>

      {!canUse ? (
        <p className="text-sm text-amber-800">Manifestazione non disponibile per il profilo corrente.</p>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {formErr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          {formErr}
        </div>
      ) : null}
      {copyMsg ? (
        <p className="text-sm text-slate-600" role="status">
          {copyMsg}
        </p>
      ) : null}

      <section className="overflow-hidden pma-card p-0">
        <div className="pma-card__hdr">Nuovo contatto</div>
        <form onSubmit={(e) => void handleAdd(e)} className="space-y-0">
          <div className="pma-row pma-row--2">
            <label className="pma-field pma-field--br">
              <span className="pma-field__label">Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="pma-field">
              <span className="pma-field__label">Numero</span>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>
          <div className="pma-row">
            <label className="pma-field">
              <span className="pma-field__label">Descrizione</span>
              <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
            </label>
          </div>
          <div className="border-t border-slate-100 p-3">
            <button type="submit" disabled={saving || !canUse} className={opPrimaryBtn}>
              {saving ? 'Salvataggio…' : 'Aggiungi contatto'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden pma-card p-0">
        <div className="pma-card__hdr">Elenco contatti</div>
        {loading ? (
          <p className="px-3 py-4 text-sm text-slate-600">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-600">Nessun contatto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="sr-only">
                    ID
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Nome
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Numero
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Descrizione
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {items.map((row) => (
                  <tr key={row.id} className="align-middle">
                    <td className="sr-only font-mono text-xs">{row.id}</td>
                    {editingId === row.id ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            value={draftNome}
                            onChange={(e) => setDraftNome(e.target.value)}
                            className="w-full min-w-[8rem] rounded border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={draftNumero}
                            onChange={(e) => setDraftNumero(e.target.value)}
                            className="w-full min-w-[8rem] rounded border border-slate-200 px-2 py-1.5 text-sm"
                            inputMode="tel"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={draftDesc}
                            onChange={(e) => setDraftDesc(e.target.value)}
                            className="w-full min-w-[10rem] rounded border border-slate-200 px-2 py-1.5 text-sm"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={rowBusy === row.id}
                            onClick={() => void saveEdit(row.id)}
                            className={`${opToolbarBtnSm} mr-2`}
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            disabled={rowBusy === row.id}
                            onClick={() => setEditingId(null)}
                            className={opToolbarBtnSm}
                          >
                            Annulla
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2.5 font-semibold">{row.nome}</td>
                        <td className="px-3 py-2.5 font-mono text-sm">{row.numero}</td>
                        <td className="max-w-xs px-3 py-2.5 text-slate-700">{row.descrizione || '—'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              title="Chiama"
                              aria-label={`Chiama ${row.nome}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                              onClick={() => {
                                const href = telHref(row.numero)
                                if (href === '#') return
                                const ok = window.confirm(
                                  `Avviare la chiamata verso ${row.numero.trim()} (${row.nome})?`,
                                )
                                if (ok) window.location.assign(href)
                              }}
                            >
                              <IconPhone />
                            </button>
                            <button
                              type="button"
                              onClick={() => void copyNumero(row.numero)}
                              className={opToolbarBtnSm}
                            >
                              Copia
                            </button>
                            <button type="button" onClick={() => startEdit(row)} className={opToolbarBtnSm}>
                              Modifica
                            </button>
                            <button
                              type="button"
                              disabled={rowBusy === row.id}
                              onClick={() => void handleDelete(row.id)}
                              className={opToolbarBtnSm}
                            >
                              Elimina
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )

  const aside = (
    <div className="pma-card text-sm text-slate-600">
      <div className="pma-card__hdr">Dati</div>
      <p className="leading-relaxed">
        Rubrica e file utili sono condivisi da tutti gli utenti della stessa manifestazione. I documenti Firestore
        usano solo il campo <code className="rounded bg-slate-100 px-1 text-xs">id_manifestazione</code>, senza{' '}
        <code className="rounded bg-slate-100 px-1 text-xs">id_pma</code>.
      </p>
    </div>
  )

  return <OperativePageGrid main={main} aside={aside} />
}
