import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRankTheme } from '../hooks/useRankTheme'
import { useManifestazioneDoc } from '../hooks/useManifestazioneDoc'
import { usePmaDocNome, usePmaDocSnapshot } from '../hooks/usePmaDocNome'
import { ManifestazioneCard } from '../components/home/ManifestazioneCard'
import { NewManifestazioneModal } from '../components/home/NewManifestazioneModal'
import { useManifestazioni } from '../hooks/useManifestazioni'

export function HomePage() {
  const { user } = useAuth()
  const theme = useRankTheme()
  const { aperte, chiuse, loading, error } = useManifestazioni()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalKey, setModalKey] = useState(0)

  const isSuperadmin = user?.rank === 'Superadmin'
  const isCentrale = user?.rank === 'Centrale'
  const centraleManId = isCentrale && user?.id_manifestazione?.trim() ? user.id_manifestazione.trim() : undefined
  const staffPmaId =
    user &&
    user.rank !== 'Superadmin' &&
    user.rank !== 'Centrale' &&
    user.id_pma?.trim()
      ? user.id_pma.trim()
      : undefined

  const { data: manCentrale } = useManifestazioneDoc(centraleManId)
  const pmaNome = usePmaDocNome(staffPmaId)
  const pmaManifestazioneId = usePmaDocSnapshot(staffPmaId).idManifestazione

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Homepage</h1>
          <p className="mt-1 text-sm text-slate-600">
            Centro PMApp: manifestazioni e accesso rapido in base al tuo ruolo.
          </p>
        </div>
        {isSuperadmin ? (
          <button
            type="button"
            onClick={() => {
              setModalKey((k) => k + 1)
              setModalOpen(true)
            }}
            className={`inline-flex shrink-0 items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium shadow-sm ${theme.primaryCta} ${theme.primaryCtaHover}`}
          >
            Nuova manifestazione
          </button>
        ) : null}
      </div>

      {user && !isSuperadmin && isCentrale ? (
        <section
          aria-labelledby="centrale-hub-heading"
          className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm"
        >
          <h2 id="centrale-hub-heading" className="text-base font-semibold text-emerald-950">
            Centrale operativa
          </h2>
          {centraleManId ? (
            <>
              <p className="mt-2 text-sm text-emerald-900">
                Sei associato alla manifestazione{' '}
                <span className="font-medium">{manCentrale?.nome ?? centraleManId}</span>. Apri la
                dashboard per gestire i PMA e la postazione.
              </p>
              <Link
                to={`/manifestazione/${encodeURIComponent(centraleManId)}`}
                className={`mt-4 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm ${theme.primaryCta} ${theme.primaryCtaHover}`}
              >
                Vai alla dashboard manifestazione
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-amber-900">
              Profilo senza <code className="rounded bg-white/60 px-1">id_manifestazione</code>. Chiedi a un
              amministratore di collegare la tua utenza alla manifestazione corretta.
            </p>
          )}
        </section>
      ) : null}

      {user && !isSuperadmin && staffPmaId ? (
        <section
          aria-labelledby="pma-hub-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="pma-hub-heading" className="text-base font-semibold text-slate-900">
            Il tuo PMA
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Ruolo {user.rank}: accedi alla dashboard del posto medico avanzato assegnato (
            {pmaNome ?? staffPmaId}).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/pma/${encodeURIComponent(staffPmaId)}`}
              className={`inline-flex shrink-0 items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-sm ${theme.primaryCta} ${theme.primaryCtaHover}`}
            >
              Entra nel PMA
            </Link>
            {pmaManifestazioneId ? (
              <Link
                to={`/manifestazione/${encodeURIComponent(pmaManifestazioneId)}/impostazioni`}
                className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Impostazioni generali manifestazione
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Manifestazioni</h2>
          <p className="mt-1 text-sm text-slate-600">
            Eventi PMApp: stato in tempo reale. Le manifestazioni chiuse sono visibili solo al Superadmin.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-600">
          <div
            className={`h-9 w-9 animate-spin rounded-full border-2 ${theme.spinnerAccent}`}
            aria-hidden
          />
          <p className="text-sm">Caricamento elenco…</p>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <section aria-labelledby="aperte-heading">
            <h2 id="aperte-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Manifestazioni aperte
            </h2>
            {aperte.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nessuna manifestazione aperta.</p>
            ) : (
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {aperte.map((m) => (
                  <li key={m.nome}>
                    <ManifestazioneCard manifestazione={m} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isSuperadmin ? (
            <section aria-labelledby="chiuse-heading">
              <h2
                id="chiuse-heading"
                className="text-sm font-semibold uppercase tracking-wide text-slate-500"
              >
                Manifestazioni chiuse
              </h2>
              {chiuse.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Nessuna manifestazione chiusa.</p>
              ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {chiuse.map((m) => (
                    <li key={m.nome}>
                      <ManifestazioneCard manifestazione={m} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      <NewManifestazioneModal
        key={modalKey}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
