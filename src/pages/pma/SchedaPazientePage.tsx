import { useParams } from 'react-router-dom'
import { SchedaPaziente } from '../../components/scheda-paziente/SchedaPaziente'

export function SchedaPazientePage() {
  const { pazienteId: pazienteIdParam } = useParams<{ id: string; pazienteId: string }>()
  const pazienteId = pazienteIdParam ? decodeURIComponent(pazienteIdParam) : ''

  if (!pazienteId) {
    return (
      <div className="pma-dashboard px-4 py-6">
        <div
          className="pma-card border-amber-200 bg-amber-50 text-sm text-amber-950"
          role="alert"
        >
          ID paziente mancante nell’URL.
        </div>
      </div>
    )
  }

  return <SchedaPaziente pazienteId={pazienteId} />
}
