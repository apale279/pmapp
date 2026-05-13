import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { defaultOperativePath } from '../lib/defaultOperativePath'

/**
 * Destinazione dopo tentativo di accesso a una rotta non consentita al rank corrente.
 */
export function UnauthorizedPage() {
  const { user } = useAuth()
  const back = user ? defaultOperativePath(user) : '/'

  return (
    <div className="pma-dashboard flex min-h-[50vh] flex-col items-center justify-center px-4 py-16">
      <div className="pma-card max-w-lg text-center">
        <div className="pma-card__hdr">Accesso non consentito</div>
        <p className="text-sm leading-relaxed text-slate-600">
          Il tuo ruolo non include l&apos;autorizzazione per questa sezione. Se credi sia un errore, contatta un
          amministratore.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={back}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white no-underline hover:bg-slate-800"
          >
            Area operativa
          </Link>
          <Link
            to="/"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-800 no-underline hover:bg-slate-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
