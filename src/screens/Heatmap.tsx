import { useState } from 'react'
import { HISTORICAL_CI } from '../hooks/usePythPrices'
import type { PythPrice } from '../hooks/usePythPrices'
import { DEVIATION_TABS, filterByTab } from '../hooks/useDeviationHeatmap'

interface Props {
  prices:        Record<string, PythPrice>
  connected:     boolean
  marketPrices:  Record<string, number | null>
  onSelectAsset: (asset: string) => void
}

// Color by |delta| relative to live CI width
// ratio = |delta %| / CI %
function getCell(ratio: number) {
  if (ratio < 0.5) return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/25', text: 'text-emerald-400', label: 'In band' }
  if (ratio < 1.0) return { bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   text: 'text-slate-300',  label: 'Near edge' }
  if (ratio < 2.5) return { bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-400', label: 'Outside CI' }
  return             { bg: 'bg-red-500/20',      border: 'border-red-500/35',     text: 'text-red-400',    label: 'Far outside' }
}

export default function Heatmap({ prices, connected, marketPrices, onSelectAsset }: Props) {
  const [tab, setTab]          = useState('All')
  const [hovered, setHovered]  = useState<string | null>(null)

  const filtered = filterByTab(tab)

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Deviation Heatmap</h1>
            <p className="text-slate-500 text-sm mt-1">
              Market vs Pyth benchmark · colored by CI signal · click to inspect
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
              style={connected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}} />
            {connected ? `${Object.keys(prices).length} live` : 'Connecting…'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 w-fit mb-8">
          {DEVIATION_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                tab === t
                  ? 'bg-purple-600/50 text-white border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-6 text-xs text-slate-500">
          {[
            { color: 'bg-emerald-500', label: 'In CI band' },
            { color: 'bg-slate-500',   label: 'Near edge' },
            { color: 'bg-orange-500',  label: 'Outside CI' },
            { color: 'bg-red-500',     label: 'Far outside' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${l.color} opacity-70`} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
          {filtered.map(symbol => {
            const p         = prices[symbol]
            const composite = marketPrices[symbol] ?? null
            const delta     = (p && composite != null) ? ((composite - p.price) / p.price) * 100 : null
            const ciPct     = p ? (p.conf / p.price) * 100 : null
            const ratio     = (delta != null && ciPct != null && ciPct > 0)
              ? Math.abs(delta) / ciPct
              : null

            const cell  = ratio !== null
              ? getCell(ratio)
              : { bg: 'bg-slate-800/40', border: 'border-slate-700/20', text: 'text-slate-600', label: '–' }
            const isHov = hovered === symbol
            const hist  = HISTORICAL_CI[symbol] ?? 0.15
            const ciStress = ciPct !== null ? ciPct / hist : null

            return (
              <button
                key={symbol}
                onClick={() => onSelectAsset(symbol)}
                onMouseEnter={() => setHovered(symbol)}
                onMouseLeave={() => setHovered(null)}
                className={`relative glass fade-in flex flex-col items-center py-3 px-2 border transition-all duration-200 hover:scale-105 hover:z-10 ${cell.bg} ${cell.border}`}
              >
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {symbol.replace('/USD', '')}
                </span>
                {delta !== null ? (
                  <>
                    <span className={`text-[10px] font-mono mt-1 ${cell.text}`}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(3)}%
                    </span>
                    <span className={`text-[9px] mt-0.5 ${cell.text} opacity-70`}>
                      {ratio !== null ? `${ratio.toFixed(1)}× CI` : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-600 mt-1">loading…</span>
                )}

                {/* Tooltip */}
                {isHov && p && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 glass-strong text-left p-3 min-w-[190px] shadow-xl pointer-events-none">
                    <div className="text-xs font-semibold text-slate-200 mb-1.5">{symbol}</div>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div>Pyth: <span className="text-slate-200">${p.price.toLocaleString('en', { maximumFractionDigits: 4 })}</span></div>
                      {composite != null && (
                        <div>Market: <span className="text-slate-200">${composite.toLocaleString('en', { maximumFractionDigits: 4 })}</span></div>
                      )}
                      {delta != null && (
                        <div>Deviation: <span className={cell.text}>{delta > 0 ? '+' : ''}{delta.toFixed(4)}%</span></div>
                      )}
                      {ciPct != null && (
                        <div>CI width: <span className="text-yellow-400">±{ciPct.toFixed(4)}%</span></div>
                      )}
                      {ciStress != null && (
                        <div>CI stress: <span className="text-slate-300">{ciStress.toFixed(2)}× hist</span></div>
                      )}
                      <div className={`mt-1 font-medium ${cell.text}`}>{cell.label}</div>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          Click any asset to inspect deviation in Pyth Delta →
        </p>
      </div>
    </div>
  )
}
