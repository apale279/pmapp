import { useCallback, useId, useMemo, useState } from 'react'
import type { LesioneMarker, LesioneVista } from '../../types/lesioni'

const VB_W = 200
const VB_H = 480

type Props = {
  lesioni: LesioneMarker[]
  disabled?: boolean
  onLesioniChange: (next: LesioneMarker[]) => void
}

function nextNum(list: LesioneMarker[]): number {
  let m = 0
  for (const x of list) m = Math.max(m, x.n)
  return m + 1
}

function svgPointFromEvent(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

/**
 * Omino stilizzato (fronte / retro): clic per aggiungere marker numerati; coordinate in viewBox.
 */
export function LesioniBodyMap({ lesioni, disabled, onLesioniChange }: Props) {
  const gid = useId()
  const [activeVista, setActiveVista] = useState<LesioneVista>('front')

  const byVista = useMemo(() => {
    const f: LesioneMarker[] = []
    const b: LesioneMarker[] = []
    for (const L of lesioni) {
      if (L.vista === 'front') f.push(L)
      else b.push(L)
    }
    return { front: f, back: b }
  }, [lesioni])

  const onSvgClick = useCallback(
    (vista: LesioneVista, ev: React.MouseEvent<SVGSVGElement>) => {
      if (disabled) return
      const svg = ev.currentTarget
      const { x, y } = svgPointFromEvent(svg, ev.clientX, ev.clientY)
      if (x < 0 || x > VB_W || y < 0 || y > VB_H) return
      const n = nextNum(lesioni)
      onLesioniChange([...lesioni, { n, vista, x, y, descrizione: '' }])
    },
    [disabled, lesioni, onLesioniChange],
  )

  function updateDescrizione(n: number, text: string) {
    onLesioniChange(lesioni.map((L) => (L.n === n ? { ...L, descrizione: text } : L)))
  }

  function removeMarker(n: number) {
    onLesioniChange(lesioni.filter((L) => L.n !== n).map((L, i) => ({ ...L, n: i + 1 })))
  }

  const FigureSvg = ({
    vista,
    markers,
  }: {
    vista: LesioneVista
    markers: LesioneMarker[]
  }) => (
    <svg
      role="img"
      aria-label={vista === 'front' ? 'Vista frontale corpo' : 'Vista posteriore corpo'}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-[min(52vh,420px)] w-full max-w-[220px] cursor-crosshair touch-none select-none rounded-lg border border-slate-300 bg-sky-50/40 shadow-inner"
      onClick={(e) => onSvgClick(vista, e)}
    >
      <title>{vista === 'front' ? 'Fronte' : 'Retro'}</title>
      <g fill="#e2e8f0" stroke="#64748b" strokeWidth={1.2}>
        <ellipse cx={100} cy={42} rx={22} ry={26} />
        <rect x={92} y={64} width={16} height={18} rx={4} />
        <path
          d="M 52 88 Q 100 78 148 88 L 155 175 Q 100 185 45 175 Z"
          fill="#f1f5f9"
        />
        <path d="M 58 175 L 142 175 L 138 230 L 62 230 Z" fill="#f1f5f9" />
        <path d="M 62 228 L 78 228 L 82 400 L 68 405 Z" />
        <path d="M 122 228 L 138 228 L 132 405 L 118 400 Z" />
        <path d="M 52 95 L 28 165 L 38 172 L 58 115 Z" />
        <path d="M 148 95 L 172 165 L 162 172 L 142 115 Z" />
      </g>
      <text x={100} y={24} textAnchor="middle" className="fill-slate-500 text-xs font-semibold">
        {vista === 'front' ? 'Fronte' : 'Retro'}
      </text>
      <defs>
        <filter id={`${gid}-shadow-${vista}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.25" />
        </filter>
      </defs>
      {markers.map((m) => (
        <g key={`${vista}-${m.n}`} transform={`translate(${m.x} ${m.y})`} style={{ pointerEvents: 'none' }}>
          <circle r={14} fill="#dc2626" opacity={0.92} filter={`url(#${gid}-shadow-${vista})`} />
          <text
            x={0}
            y={5}
            textAnchor="middle"
            className="fill-white text-sm font-bold"
            style={{ pointerEvents: 'none' }}
          >
            {m.n}
          </text>
        </g>
      ))}
    </svg>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveVista('front')}
          className={`pma-theme-skip ${
            activeVista === 'front'
              ? 'rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white'
              : 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800'
          }`}
        >
          Vista frontale
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setActiveVista('back')}
          className={`pma-theme-skip ${
            activeVista === 'back'
              ? 'rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white'
              : 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800'
          }`}
        >
          Vista posteriore
        </button>
      </div>
      <p className="text-xs text-slate-600">
        Clicca sul corpo per aggiungere un marker numerato. Su schermo piccolo usa i pulsanti per
        scegliere la vista.
      </p>
      <div className="hidden flex-wrap items-start justify-center gap-6 sm:flex">
        <div className={activeVista === 'front' ? 'opacity-100' : 'opacity-45'}>
          <FigureSvg vista="front" markers={byVista.front} />
        </div>
        <div className={activeVista === 'back' ? 'opacity-100' : 'opacity-45'}>
          <FigureSvg vista="back" markers={byVista.back} />
        </div>
      </div>
      <div className="flex justify-center sm:hidden">
        {activeVista === 'front' ? (
          <FigureSvg vista="front" markers={byVista.front} />
        ) : (
          <FigureSvg vista="back" markers={byVista.back} />
        )}
      </div>

      {lesioni.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800">Descrizioni lesioni</h4>
          {[...lesioni].sort((a, b) => a.n - b.n).map((m) => (
            <div
              key={m.n}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-start"
            >
              <label className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-slate-700">
                  {m.n}. ({m.vista === 'front' ? 'Fronte' : 'Retro'})
                </span>
                <textarea
                  disabled={disabled}
                  rows={2}
                  key={`les-desc-${m.n}-${m.descrizione}`}
                  defaultValue={m.descrizione}
                  onBlur={(e) => updateDescrizione(m.n, e.target.value)}
                  placeholder="Descrizione lesione…"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              {!disabled ? (
                <button type="button" onClick={() => removeMarker(m.n)}>
                  Rimuovi
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nessun marker: clicca sul corpo per iniziare.</p>
      )}
    </div>
  )
}
