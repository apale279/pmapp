import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSyncLive } from '../context/SyncLiveContext'
import { OperativePageGrid } from '../components/layout/OperativePageGrid'
import { useRankTheme } from '../hooks/useRankTheme'
import { useManifestazioneDoc } from '../hooks/useManifestazioneDoc'
import { usePmaDocNome, usePmaDocSnapshot } from '../hooks/usePmaDocNome'
import { ManifestazioneCard } from '../components/home/ManifestazioneCard'
import { NewManifestazioneModal } from '../components/home/NewManifestazioneModal'
import { useManifestazioni } from '../hooks/useManifestazioni'
import { opPrimaryBtn } from '../components/layout/operativeTokens'

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

  const { bumpSync } = useSyncLive()
  useEffect(() => {
    if (!loading) bumpSync()
  }, [loading, bumpSync])

  if (isSuperadmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <OperativePageGrid
      main={
    <div className="pma-dashboard space-y-8">
      <div className="pma-bar flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="pma-bar__id text-base">Homepage</div>
          <p className="mt-0.5 text-xs text-[#a8a8c8]">
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
            className={`${opPrimaryBtn} shrink-0 px-5`}
          >
            NUOVA MANIFESTAZIONE
          </button>
        ) : null}
      </div>

      {user && !isSuperadmin && isCentrale ? (
        <section
          aria-labelledby="centrale-hub-heading"
          className="pma-card"
        >
          <div className="pma-card__hdr" id="centrale-hub-heading">
            Centrale operativa
          </div>
          {centraleManId ? (
            <>
              <p className="mt-3 text-sm text-slate-600">
                Sei associato alla manifestazione{' '}
                <span className="font-medium">{manCentrale?.nome ?? centraleManId}</span>. Apri la
                dashboard per gestire i PMA e la postazione.
              </p>
              <Link
                to={`/manifestazione/${encodeURIComponent(centraleManId)}`}
                className={`${opPrimaryBtn} mt-4 px-5`}
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
          className="pma-card"
        >
          <div className="pma-card__hdr" id="pma-hub-heading">
            Il tuo PMA
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Ruolo {user.rank}: accedi alla dashboard del posto medico avanzato assegnato (
            {pmaNome ?? staffPmaId}).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/pma/${encodeURIComponent(staffPmaId)}`}
              className={`${opPrimaryBtn} shrink-0 px-5`}
            >
              Entra nel PMA
            </Link>
            {pmaManifestazioneId ? (
              <Link
                to={`/manifestazione/${encodeURIComponent(pmaManifestazioneId)}/impostazioni`}
                className="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#111827] shadow-sm hover:bg-slate-50"
              >
                Impostazioni generali manifestazione
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="pma-bar flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="pma-bar__id text-base">Manifestazioni</div>
          <p className="mt-0.5 text-xs text-[#a8a8c8]">
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
            <h2 id="aperte-heading" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Manifestazioni aperte
            </h2>
            {aperte.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nessuna manifestazione aperta.</p>
            ) : (
              <ul className="pma-metrics-grid mt-4">
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
                className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
              >
                Manifestazioni chiuse
              </h2>
              {chiuse.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Nessuna manifestazione chiusa.</p>
              ) : (
                <ul className="pma-metrics-grid mt-4">
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
      }
      aside={
        <div className="lg:sticky lg:top-4">
          <div className="pma-card">
            <div className="pma-card__hdr">Spazio operativo</div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              La barra emoji a sinistra è identica in tutta l&apos;app. Tooltip al passaggio del mouse sulle
              icone.
            </p>
          </div>
        </div>
      }
    />
  )
}
