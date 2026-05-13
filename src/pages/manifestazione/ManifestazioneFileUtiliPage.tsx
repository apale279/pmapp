import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../../context/AuthContext'
import { db } from '../../lib/firebase'
import { manifestazioneTenantIdForFirestore } from '../../lib/manifestazioneTenantId'
import { cloudinaryUnsignedUpload } from '../../lib/cloudinaryUnsignedUpload'
import { opPrimaryBtn, opToolbarBtnSm } from '../../components/layout/operativeTokens'
import { OperativePageGrid } from '../../components/layout/OperativePageGrid'
import {
  FILE_UTILI_MANIFESTAZIONE_COLLECTION,
  useManifestazioneFileUtili,
} from '../../hooks/useManifestazioneFileUtili'

function formatCaricato(ts: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return '—'
  try {
    return ts.toDate().toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function ManifestazioneFileUtiliPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const routeManId = idParam ? decodeURIComponent(idParam) : ''
  const { user } = useAuth()
  const tenantId = user ? manifestazioneTenantIdForFirestore(user, routeManId) : ''
  const manSeg = routeManId.trim() ? encodeURIComponent(routeManId.trim()) : ''

  const { items, loading, error } = useManifestazioneFileUtili(tenantId || undefined)

  const [nomeFile, setNomeFile] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [rowBusy, setRowBusy] = useState<string | null>(null)

  const canUse = Boolean(db && tenantId.trim())
  const dashHref = useMemo(() => `/manifestazione/${manSeg}`, [manSeg])

  function onPickFile(next: File | null) {
    setFile(next)
    if (next && !nomeFile.trim()) {
      setNomeFile(next.name)
    }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    if (!db || !tenantId.trim() || !file) {
      setFormErr('Seleziona un file.')
      return
    }
    const nome = nomeFile.trim() || file.name
    setFormErr(null)
    setUploadBusy(true)
    try {
      const { secure_url } = await cloudinaryUnsignedUpload(file)
      await addDoc(collection(db, FILE_UTILI_MANIFESTAZIONE_COLLECTION), {
        id_manifestazione: tenantId.trim(),
        nome_file: nome,
        descrizione: descrizione.trim(),
        cloudinary_url: secure_url,
        caricato_at: serverTimestamp(),
      })
      setNomeFile('')
      setDescrizione('')
      setFile(null)
      const input = document.getElementById('file-utili-input') as HTMLInputElement | null
      if (input) input.value = ''
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Caricamento non riuscito.')
    } finally {
      setUploadBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!db || !window.confirm('Rimuovere questo file dall’elenco? (Il file resta su Cloudinary.)')) return
    setRowBusy(id)
    try {
      await deleteDoc(doc(db, FILE_UTILI_MANIFESTAZIONE_COLLECTION, id))
    } finally {
      setRowBusy(null)
    }
  }

  const main = (
    <div className="pma-dashboard space-y-6">
      <div className="pma-bar flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="pma-bar__id text-base">File utili</div>
          <p className="mt-0.5 text-xs text-[#a8a8c8]">Allegati condivisi per manifestazione</p>
        </div>
        {manSeg ? (
          <Link to={dashHref} className={`${opToolbarBtnSm} no-underline`}>
            Dashboard manifestazione
          </Link>
        ) : null}
      </div>

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

      <section className="overflow-hidden pma-card p-0">
        <div className="pma-card__hdr">Carica file</div>
        <form onSubmit={(e) => void handleUpload(e)} className="space-y-0">
          <label className="pma-field">
            <span className="pma-field__label">File</span>
            <input
              id="file-utili-input"
              type="file"
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-800 hover:file:bg-slate-200"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="pma-field">
            <span className="pma-field__label">Nome</span>
            <input
              value={nomeFile}
              onChange={(e) => setNomeFile(e.target.value)}
              placeholder="Nome visualizzato"
            />
          </label>
          <label className="pma-field">
            <span className="pma-field__label">Descrizione</span>
            <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
          </label>
          <div className="border-t border-slate-100 p-3">
            <button type="submit" disabled={uploadBusy || !canUse || !file} className={opPrimaryBtn}>
              {uploadBusy ? 'Caricamento…' : 'Carica e salva'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden pma-card p-0">
        <div className="pma-card__hdr">File caricati</div>
        {loading ? (
          <p className="px-3 py-4 text-sm text-slate-600">Caricamento…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-600">Nessun file.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-3 py-2.5">
                    Nome
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    Descrizione
                  </th>
                  <th scope="col" className="px-3 py-2.5 whitespace-nowrap">
                    Data caricamento
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {items.map((row) => (
                  <tr key={row.id} className="align-middle">
                    <td className="px-3 py-2.5 font-semibold">{row.nome_file}</td>
                    <td className="max-w-xs px-3 py-2.5 text-slate-700">{row.descrizione || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatCaricato(row.caricato_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <a
                          href={row.cloudinary_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={opToolbarBtnSm}
                        >
                          Scarica / Apri
                        </a>
                        <button
                          type="button"
                          disabled={rowBusy === row.id}
                          onClick={() => void handleDelete(row.id)}
                          className={opToolbarBtnSm}
                        >
                          Rimuovi
                        </button>
                      </div>
                    </td>
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
    <div className="space-y-4">
      <div className="pma-card text-sm text-slate-600">
        <div className="pma-card__hdr">Cloudinary</div>
        <p className="mt-2 leading-relaxed">
          Definisci nel file d’ambiente <code className="rounded bg-slate-100 px-1 text-xs">VITE_CLOUDINARY_CLOUD_NAME</code> e{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">VITE_CLOUDINARY_UPLOAD_PRESET</code> (upload preset di tipo
          unsigned nel pannello Cloudinary).
        </p>
      </div>
      <div className="pma-card text-sm text-slate-600">
        <div className="pma-card__hdr">Dati</div>
        <p className="mt-2 leading-relaxed">
          Solo <code className="rounded bg-slate-100 px-1 text-xs">id_manifestazione</code> su Firestore; nessun{' '}
          <code className="rounded bg-slate-100 px-1 text-xs">id_pma</code>.
        </p>
      </div>
    </div>
  )

  return <OperativePageGrid main={main} aside={aside} />
}
