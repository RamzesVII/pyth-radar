import { useMemo } from 'react'
import { usePythPrices, HISTORICAL_CI } from '../hooks/usePythPrices'

interface Props {
  onOpenHeatmap: () => void
}

function calcFearIndex(prices: ReturnType<typeof usePythPrices>['prices']): number {
  const assets = Object.values(prices)
  if (assets.length === 0) return 0

  const stresses = assets.map(p => {
    const ciPct = (p.conf / p.price) * 100
    const hist = HISTORICAL_CI[p.symbol] ?? 0.15
    return Math.min(ciPct / hist, 5) // cap at 5x
  })

  const avg = stresses.reduce((a, b) => a + b, 0) / stresses.length
  // avg ~1.0 = normal (score ~30), ~2.0 = elevated (~60), ~3.0+ = critical (~90)
  return Math.round(Math.min((avg / 3) * 100, 100))
}

function getLevel(score: number) {
  if (score < 25) return { label: 'Calm',     color: 'text-emerald-400', glow: 'glow-green',  ring: 'border-emerald-400/30', bg: 'bg-emerald-500/10' }
  if (score < 50) return { label: 'Elevated', color: 'text-yellow-400',  glow: 'glow-yellow', ring: 'border-yellow-400/30',  bg: 'bg-yellow-500/10' }
  if (score < 75) return { label: 'Stressed', color: 'text-orange-400',  glow: 'glow-yellow', ring: 'border-orange-400/30',  bg: 'bg-orange-500/10' }
  return              { label: 'Critical',  color: 'text-red-400',     glow: 'glow-red',    ring: 'border-red-400/30',     bg: 'bg-red-500/10' }
}

export default function FearIndex({ onOpenHeatmap }: Props) {
  const { prices, connected } = usePythPrices()
  const score = useMemo(() => calcFearIndex(prices), [prices])
  const level = getLevel(score)
  const assets = Object.values(prices)

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">

      {/* Ambient glow behind gauge */}
      <div className="absolute w-96 h-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      {/* Main gauge card */}
      <div className={`glass-strong ${level.glow} relative flex flex-col items-center px-16 py-12 mb-8 min-w-[340px]`}>
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-6 font-medium">
          Deviation Index
        </p>

        {/* Score ring */}
        <div className={`relative flex items-center justify-center w-48 h-48 rounded-full border-2 ${level.ring} ${level.bg} pulse-ring mb-6`}>
          <div className="absolute inset-2 rounded-full border border-white/5" />
          <div className="flex flex-col items-center">
            <span className={`text-7xl font-bold tabular-nums ${assets.length > 0 ? level.color : 'text-slate-600'}`}>
              {assets.length > 0 ? score : '—'}
            </span>
            <span className="text-slate-500 text-xs mt-1">/100</span>
          </div>
        </div>

        {/* Level badge */}
        <div className={`px-4 py-1.5 rounded-full border ${level.ring} ${level.bg} mb-4`}>
          <span className={`text-sm font-semibold ${level.color}`}>{level.label}</span>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
            style={connected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}} />
          {connected
            ? `${assets.length} assets · Pyth Hermes live`
            : 'Connecting to Pyth…'}
        </div>
      </div>

      {/* Asset mini-grid */}
      {assets.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="text-slate-600 text-xs uppercase tracking-widest mb-3 text-center">Oracle Confidence · CI Stress</p>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {assets.slice(0, 14).map(p => {
              const ciPct = (p.conf / p.price) * 100
              const hist = HISTORICAL_CI[p.symbol] ?? 0.15
              const stress = ciPct / hist
              const cellLevel = stress < 0.8 ? 'border-emerald-500/20 text-emerald-400'
                              : stress < 1.2 ? 'border-slate-500/20 text-slate-400'
                              : stress < 2.0 ? 'border-orange-500/30 text-orange-400'
                              :                'border-red-500/30 text-red-400'

              return (
                <button
                  key={p.symbol}
                  onClick={onOpenHeatmap}
                  className={`glass fade-in flex flex-col items-center py-2 px-1 border hover:bg-white/5 transition-all cursor-pointer ${cellLevel}`}
                >
                  <span className="text-[10px] font-medium text-slate-300 leading-tight">
                    {p.symbol.replace('/USD', '')}
                  </span>
                  <span className={`text-[10px] font-mono mt-0.5 ${cellLevel.split(' ')[1]}`}>
                    ±{ciPct.toFixed(3)}%
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={onOpenHeatmap}
        className="mt-8 flex items-center gap-2 text-sm text-slate-400 hover:text-purple-300 transition-colors group"
      >
        View Deviation Heatmap
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>
    </div>
  )
}
