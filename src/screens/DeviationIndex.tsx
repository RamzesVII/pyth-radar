import { useMemo } from 'react'
import { FEED_CATEGORY } from '../hooks/usePythPrices'
import type { PythPrice } from '../hooks/usePythPrices'
import { DEVIATION_SYMBOLS } from '../hooks/useDeviationHeatmap'

interface Props {
  prices:        Record<string, PythPrice>
  connected:     boolean
  marketPrices:  Record<string, number | null>
  onOpenHeatmap: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcScore(
  symbols:      string[],
  prices:       Record<string, PythPrice>,
  marketPrices: Record<string, number | null>,
): number {
  const ratios: number[] = []
  for (const symbol of symbols) {
    const market = marketPrices[symbol]
    if (market == null) continue
    const p = prices[symbol]
    if (!p || p.price <= 0 || p.conf <= 0) continue
    const delta = Math.abs((market - p.price) / p.price) * 100
    const ciPct = (p.conf / p.price) * 100
    ratios.push(Math.min(delta / ciPct, 5))
  }
  if (ratios.length === 0) return 0
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length
  return Math.round(Math.min((avg / 2) * 100, 100))
}

function topMovers(
  symbols:      string[],
  prices:       Record<string, PythPrice>,
  marketPrices: Record<string, number | null>,
  n = 2,
): { symbol: string; delta: number }[] {
  const items: { symbol: string; delta: number }[] = []
  for (const symbol of symbols) {
    const market = marketPrices[symbol]
    if (market == null) continue
    const p = prices[symbol]
    if (!p || p.price <= 0) continue
    items.push({ symbol, delta: ((market - p.price) / p.price) * 100 })
  }
  return items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, n)
}

function getLevel(score: number) {
  if (score < 25) return { label: 'Calm',     color: 'text-emerald-400', ring: 'border-emerald-500/25', bg: 'bg-emerald-500/10', glow: 'glow-green'  }
  if (score < 50) return { label: 'Elevated', color: 'text-yellow-400',  ring: 'border-yellow-500/25',  bg: 'bg-yellow-500/10',  glow: 'glow-yellow' }
  if (score < 75) return { label: 'Stressed', color: 'text-orange-400',  ring: 'border-orange-500/25',  bg: 'bg-orange-500/10',  glow: 'glow-yellow' }
  return              { label: 'Critical',  color: 'text-red-400',     ring: 'border-red-500/25',     bg: 'bg-red-500/10',     glow: 'glow-red'    }
}

// ─── Category card ────────────────────────────────────────────────────────────

const CATEGORIES: { key: string; icon: string }[] = [
  { key: 'Crypto',      icon: '◈' },
  { key: 'Forex',       icon: '↔' },
  { key: 'Commodities', icon: '◆' },
  { key: 'Equities',    icon: '▸' },
]

interface CardProps {
  category: string
  icon:     string
  score:    number
  movers:   { symbol: string; delta: number }[]
  hasData:  boolean
  onClick:  () => void
}

function CategoryCard({ category, icon, score, movers, hasData, onClick }: CardProps) {
  const level = getLevel(score)
  return (
    <button
      onClick={onClick}
      className={`glass text-left p-4 flex flex-col hover:bg-white/5 hover:scale-[1.02] transition-all duration-200 border ${hasData ? level.ring : 'border-slate-700/20'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 text-xs uppercase tracking-widest font-medium">
          {icon} {category}
        </span>
        {hasData && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium leading-none border ${level.ring} ${level.bg} ${level.color}`}>
            {level.label}
          </span>
        )}
      </div>

      {/* Score */}
      <span className={`text-4xl font-bold tabular-nums mb-4 ${hasData ? level.color : 'text-slate-600'}`}>
        {hasData ? score : '—'}
      </span>

      {/* Top movers */}
      <div className="mt-auto space-y-1.5">
        {movers.length > 0 ? movers.map(({ symbol, delta }) => (
          <div key={symbol} className="flex items-center justify-between gap-2">
            <span className="text-slate-400 text-xs truncate">
              {symbol.replace('/USD', '')}
            </span>
            <span className={`text-xs font-mono tabular-nums flex-shrink-0 ${
              Math.abs(delta) < 0.005 ? 'text-slate-500'
              : delta > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(3)}%
            </span>
          </div>
        )) : (
          <p className="text-slate-700 text-xs">loading…</p>
        )}
      </div>
    </button>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DeviationIndex({ prices, connected, marketPrices, onOpenHeatmap }: Props) {
  const globalScore = useMemo(
    () => calcScore(DEVIATION_SYMBOLS, prices, marketPrices),
    [prices, marketPrices],
  )
  const globalLevel = getLevel(globalScore)
  const dataLoaded  = DEVIATION_SYMBOLS.some(s => marketPrices[s] != null)

  const categories = useMemo(() =>
    CATEGORIES.map(({ key, icon }) => {
      const symbols = DEVIATION_SYMBOLS.filter(s => FEED_CATEGORY[s] === key)
      const hasData = symbols.some(s => marketPrices[s] != null)
      return {
        key, icon,
        score:  calcScore(symbols, prices, marketPrices),
        movers: topMovers(symbols, prices, marketPrices),
        hasData,
      }
    }),
    [prices, marketPrices],
  )

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center px-6 py-12 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute w-96 h-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      {/* Global score card */}
      <div className={`glass-strong ${globalLevel.glow} relative flex flex-col items-center px-16 py-10 mb-8 min-w-[340px]`}>
        <p className="text-slate-400 text-xs uppercase tracking-widest mb-2 font-medium">
          Deviation Index
        </p>
        <p className="text-slate-200 text-sm font-medium mb-1">Pyth price is the benchmark</p>
        <p className="text-slate-600 text-xs mb-4">29 assets · 4 exchanges · live</p>

        <div className={`relative flex items-center justify-center w-44 h-44 rounded-full border-2 ${globalLevel.ring} ${globalLevel.bg} pulse-ring mb-5`}>
          <div className="absolute inset-2 rounded-full border border-white/5" />
          <div className="flex flex-col items-center">
            <span className={`text-7xl font-bold tabular-nums ${dataLoaded ? globalLevel.color : 'text-slate-600'}`}>
              {dataLoaded ? globalScore : '—'}
            </span>
            <span className="text-slate-500 text-xs mt-1">/100</span>
          </div>
        </div>

        <div className={`px-4 py-1.5 rounded-full border ${globalLevel.ring} ${globalLevel.bg} mb-4`}>
          <span className={`text-sm font-semibold ${globalLevel.color}`}>
            {dataLoaded ? globalLevel.label : 'Aggregating markets…'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
            style={connected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}}
          />
          {connected
            ? `${Object.keys(prices).length} assets · Pyth Hermes live`
            : 'Connecting to Pyth…'}
        </div>
      </div>

      {/* 4 Category cards */}
      <div className="w-full max-w-3xl">
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-3 text-center">
          By Asset Class · Market Deviation from Pyth
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map(cat => (
            <CategoryCard
              key={cat.key}
              category={cat.key}
              icon={cat.icon}
              score={cat.score}
              movers={cat.movers}
              hasData={cat.hasData}
              onClick={onOpenHeatmap}
            />
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onOpenHeatmap}
        className="mt-8 flex items-center gap-2 text-sm text-slate-400 hover:text-purple-300 transition-colors group"
      >
        Scan 29 Assets
        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
      </button>

      {/* Footer */}
      <p className="absolute bottom-4 text-slate-700 text-xs">
        Powered by{' '}
        <a href="https://pyth.network" target="_blank" rel="noopener noreferrer"
           className="hover:text-slate-500 transition-colors">
          Pyth Network
        </a>
      </p>
    </div>
  )
}
