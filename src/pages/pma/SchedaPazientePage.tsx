import { useParams } from 'react-router-dom'
import { SchedaPaziente } from '../../components/scheda-paziente/SchedaPaziente'

export function SchedaPazientePage() {
  const { pazienteId: pazienteIdParam } = useParams<{ id: string; pazienteId: string }>()
  const pazienteId = pazienteIdParam ? decodeURIComponent(pazienteIdParam) : ''

  if (!pazienteId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        ID paziente mancante nell’URL.
      </div>
    )
  }

  return <SchedaPaziente pazienteId={pazienteId} />
}
