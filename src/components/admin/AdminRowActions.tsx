type Props = {
  onEdit: () => void
  onDelete: () => void
  editDisabled?: boolean
  editTitle?: string
  deleteDisabled?: boolean
  deleteTitle?: string
}

function IconPencil() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.83L17.33 5a2 2 0 0 0-2.83 0L4 15.5V20z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13 6l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 14a1 1 0 0 0 1 .94h8a1 1 0 0 0 1-.94L18 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Azioni riga standard admin: modifica (matita), elimina (cestino rosso). */
export function AdminRowActions({
  onEdit,
  onDelete,
  editDisabled,
  editTitle,
  deleteDisabled,
  deleteTitle,
}: Props) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <button
        type="button"
        onClick={onEdit}
        disabled={editDisabled}
        title={editTitle ?? 'Modifica'}
        className="pma-theme-skip inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconPencil />
        <span className="sr-only">Modifica</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteTitle ?? 'Elimina'}
        className="pma-theme-skip inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconTrash />
        <span className="sr-only">Elimina</span>
      </button>
    </div>
  )
}
