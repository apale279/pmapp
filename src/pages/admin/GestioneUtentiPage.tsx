import { useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { useRankTheme } from '../../hooks/useRankTheme'
import { db } from '../../lib/firebase'
import {
  IdentityToolkitDeleteUserError,
  identityToolkitDeleteUserByLocalId,
} from '../../lib/identityToolkitDeleteUser'
import { useManifestazioniSelectOptions } from '../../hooks/useManifestazioniSelectOptions'
import { usePmaLookup } from '../../hooks/usePmaLookup'
import { useUtentiRealtime } from '../../hooks/useUtentiRealtime'
import type { UtenteListRow } from '../../types/utenteList'
import { AddUserModal } from '../../components/admin/AddUserModal'
import { EditUserModal } from '../../components/admin/EditUserModal'
import { AdminTableToolbar } from '../../components/admin/AdminTableToolbar'
import { AdminRowActions } from '../../components/admin/AdminRowActions'
import { opPrimaryBtn } from '../../components/layout/operativeTokens'

function cellMuted(value: string | undefined, emptyLabel: string) {
  if (!value || value.trim() === '') {
    return <span className="text-slate-400">{emptyLabel}</span>
  }
  return <span className="text-slate-800">{value}</span>
}

function firmaMedicoCell(u: UtenteListRow) {
  if (u.rank !== 'Medico') {
    return <span className="text-xs text-slate-300">n/d</span>
  }
  const src = u.firmaMedicoBase64 ?? u.firmaUrl
  if (src) {
    return (
      <img
        src={src}
        alt={`Firma di ${u.nome}`}
        className="h-12 w-auto max-w-[100px] rounded border border-slate-200 bg-white object-contain p-0.5"
      />
    )
  }
  return <span className="text-xs text-amber-800">Firma non configurata</span>
}

function AmbitoCell({ u, pmaNomeById }: { u: UtenteListRow; pmaNomeById: Record<string, string> }) {
  if (u.rank === 'Centrale') {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-900 ring-1 ring-indigo-600/15">
        Tutto l'evento
      </span>
    )
  }
  if (u.id_pma) {
    const label = pmaNomeById[u.id_pma] ?? u.id_pma
    return (
      <span className="text-slate-800" title={u.id_pma}>
        PMA: {label}
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-600/20">
      Manifestazione (senza PMA)
    </span>
  )
}

export function GestioneUtentiPage() {
  const { user, refreshProfile } = useAuth()
  const theme = useRankTheme()
  const { items: utenti, loading: utentiLoading, error: utentiError } = useUtentiRealtime()
  const { items: manifestazioni, loading: manLoading, error: manError } =
    useManifestazioniSelectOptions()
  const { nomeById: pmaNomeById } = usePmaLookup()

  const centraleMid = user?.rank === 'Centrale' ? user.id_manifestazione?.trim() ?? '' : ''

  const manifestazioniForForms = useMemo(
    () => (centraleMid ? manifestazioni.filter((m) => m.id === centraleMid) : manifestazioni),
    [manifestazioni, centraleMid],
  )

  const visibili = useMemo(() => {
    let rows = utenti.filter((u) => u.rank !== 'Superadmin')
    if (centraleMid) {
      rows = rows.filter((u) => (u.id_manifestazione ?? '').trim() === centraleMid)
    }
    return rows
  }, [utenti, centraleMid])

  const manLabelById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const x of manifestazioni) {
      m[x.id] = x.nome
    }
    return m
  }, [manifestazioni])

  const [nuovoOpen, setNuovoOpen] = useState(false)
  const [nuovoKey, setNuovoKey] = useState(0)
  const [editUtente, setEditUtente] = useState<UtenteListRow | null>(null)
  const [editKey, setEditKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<UtenteListRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const filteredVisibili = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return visibili
    return visibili.filter((u) => {
      const manId = u.id_manifestazione
      const manDisp = (manId && manLabelById[manId] ? manLabelById[manId] : manId ?? '').toString()
      const pmaLabel = u.id_pma ? (pmaNomeById[u.id_pma] ?? u.id_pma) : ''
      return (
        u.nome.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.email_contatto ?? '').toLowerCase().includes(s) ||
        (u.telefono ?? '').toLowerCase().includes(s) ||
        (u.note_utente ?? '').toLowerCase().includes(s) ||
        u.rank.toLowerCase().includes(s) ||
        manDisp.toLowerCase().includes(s) ||
        (u.id_manifestazione ?? '').toLowerCase().includes(s) ||
        (u.id_pma ?? '').toLowerCase().includes(s) ||
        pmaLabel.toLowerCase().includes(s)
      )
    })
  }, [visibili, q, manLabelById, pmaNomeById])

  async function confirmDelete() {
    if (!deleteTarget || !db) return
    setDeleteBusy(true)
    setDeleteError(null)
    const uid = deleteTarget.uid
    try {
      try {
        await identityToolkitDeleteUserByLocalId(uid)
      } catch (e) {
        if (
          e instanceof IdentityToolkitDeleteUserError &&
          (e.rawMessage.includes('USER_NOT_FOUND') || e.message.includes('USER_NOT_FOUND'))
        ) {
          // Account già assente in Auth: procedi con pulizia Firestore
        } else {
          throw e
        }
      }
      await deleteDoc(doc(db, 'utenti', uid))
      setDeleteTarget(null)
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : 'Eliminazione non riuscita.',
      )
    } finally {
      setDeleteBusy(false)
    }
  }

  const listError = utentiError ?? manError

  return (
    <>
      <div className="pma-dashboard w-full max-w-[min(100%,1800px)] space-y-6">
        <AdminTableToolbar
          title="Utenti"
          subtitle={
            centraleMid
              ? 'Elenco operatori della tua manifestazione (creazione e modifica con ambito evento e PMA).'
              : 'Elenco in tempo reale dalla collection `utenti`. Gli account Superadmin non compaiono in questa vista.'
          }
          searchPlaceholder="Filtra per nome, email, rank, manifestazione, PMA…"
          searchValue={q}
          onSearchChange={setQ}
          actions={
            <button
              type="button"
              onClick={() => {
                setNuovoKey((k) => k + 1)
                setNuovoOpen(true)
              }}
              className={`${opPrimaryBtn} shrink-0 px-5 text-sm`}
            >
              Nuovo operatore
            </button>
          }
        />

        {listError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {listError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-5">
                    Nome
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-5">
                    Email login
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 sm:px-5">
                    Telefono
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-5">
                    Email contatto
                  </th>
                  <th scope="col" className="max-w-[140px] px-4 py-3 sm:px-5">
                    Note
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 sm:px-5">
                    Rank
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-5">
                    Manifestazione
                  </th>
                  <th scope="col" className="px-4 py-3 sm:px-5">
                    Ambito operativo
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 sm:px-5">
                    Firma
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {utentiLoading || manLoading ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-10 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`h-5 w-5 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
                          aria-hidden
                        />
                        Caricamento…
                      </span>
                    </td>
                  </tr>
                ) : visibili.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                      Nessun operatore da mostrare (solo account non Superadmin).
                    </td>
                  </tr>
                ) : filteredVisibili.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                      Nessun operatore corrisponde al filtro di ricerca.
                    </td>
                  </tr>
                ) : (
                  filteredVisibili.map((u) => {
                    const manId = u.id_manifestazione
                    const manLabel = manId && manLabelById[manId] ? manLabelById[manId] : manId

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900 sm:px-5">{u.nome}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-slate-700 sm:max-w-xs sm:px-5">
                          {u.email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 sm:px-5">
                          {cellMuted(u.telefono, '—')}
                        </td>
                        <td className="max-w-[160px] truncate px-4 py-3 text-slate-700 sm:px-5" title={u.email_contatto}>
                          {cellMuted(u.email_contatto, '—')}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-3 text-slate-600 sm:px-5" title={u.note_utente}>
                          {cellMuted(u.note_utente, '—')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                            {u.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 sm:px-5">{cellMuted(manLabel, 'Non assegnata')}</td>
                        <td className="max-w-[220px] px-4 py-3 sm:px-5">
                          <AmbitoCell u={u} pmaNomeById={pmaNomeById} />
                        </td>
                        <td className="px-4 py-3 sm:px-5">{firmaMedicoCell(u)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                          <AdminRowActions
                            onEdit={() => {
                              setEditKey((k) => k + 1)
                              setEditUtente(u)
                            }}
                            onDelete={() => {
                              setDeleteError(null)
                              setDeleteTarget(u)
                            }}
                            deleteDisabled={u.uid === user?.uid}
                            deleteTitle={u.uid === user?.uid ? 'Operazione non disponibile' : undefined}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddUserModal
        key={nuovoKey}
        open={nuovoOpen}
        onClose={() => setNuovoOpen(false)}
        fixedManifestazioneId={centraleMid || undefined}
      />

      <EditUserModal
        key={editKey}
        open={editUtente !== null}
        utente={editUtente}
        manifestazioni={manifestazioniForForms}
        manifestazioniLoading={manLoading}
        fixedManifestazioneId={centraleMid || undefined}
        onClose={() => setEditUtente(null)}
        onSaved={() => {
          void refreshProfile()
        }}
      />

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          role="presentation"
          onMouseDown={(ev) => {
            if (!deleteBusy && ev.target === ev.currentTarget) setDeleteTarget(null)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-title"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <h2 id="del-title" className="text-lg font-semibold text-slate-900">
              Conferma eliminazione
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Sei sicuro di voler eliminare questo utente? Verrà rimosso da Firebase Authentication e
              dalla collection <code className="rounded bg-slate-100 px-1">utenti</code>.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {deleteTarget.nome}{' '}
              <span className="font-normal text-slate-500">({deleteTarget.email})</span>
            </p>

            {deleteError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium uppercase text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void confirmDelete()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium uppercase text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy ? 'Eliminazione…' : 'Elimina utente'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
