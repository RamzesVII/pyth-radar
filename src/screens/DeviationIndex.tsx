import { useMemo, useState } from 'react'
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

function getHexColor(score: number): string {
  if (score < 25) return '#34d399'
  if (score < 50) return '#fbbf24'
  if (score < 75) return '#fb923c'
  return '#f87171'
}

function getRadarColors(score: number) {
  if (score < 25) return { grad0: 'rgba(52,211,153,0.22)',  grad1: 'rgba(52,211,153,0.06)',  stroke: 'rgba(52,211,153,0.55)'  }
  if (score < 50) return { grad0: 'rgba(234,179,8,0.22)',   grad1: 'rgba(234,179,8,0.06)',   stroke: 'rgba(234,179,8,0.55)'   }
  if (score < 75) return { grad0: 'rgba(249,115,22,0.22)',  grad1: 'rgba(249,115,22,0.06)',  stroke: 'rgba(249,115,22,0.55)'  }
  return                  { grad0: 'rgba(239,68,68,0.22)',   grad1: 'rgba(239,68,68,0.06)',   stroke: 'rgba(239,68,68,0.55)'   }
}

// ─── Category card ────────────────────────────────────────────────────────────

const CATEGORIES: { key: string; icon: string }[] = [
  { key: 'Crypto',      icon: '⬡' },
  { key: 'Forex',       icon: '⇄' },
  { key: 'Commodities', icon: '◎' },
  { key: 'Equities',    icon: '△' },
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
      className={`glass text-left p-4 h-full flex flex-col hover:bg-white/5 hover:scale-[1.02] transition-all duration-200 border ${hasData ? level.ring : 'border-slate-700/20'}`}
    >
      {/* Header */}
      <div className="flex flex-col mb-3">
        <span className="text-slate-500 text-xs uppercase tracking-widest font-medium">
          {icon} {category}
        </span>
        {hasData && (
          <span className={`mt-1.5 self-start text-[10px] px-1.5 py-0.5 rounded font-medium leading-none border ${level.ring} ${level.bg} ${level.color}`}>
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
              : delta > 0 ? 'text-emerald-400' : 'text-red-400'
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
  const [radarView, setRadarView] = useState(false)

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

  // Radar geometry — center (250,250), max radius 130
  const catScore = (key: string) => categories.find(c => c.key === key)?.score ?? 0
  const cryptoScore      = catScore('Crypto')
  const equitiesScore    = catScore('Equities')
  const commoditiesScore = catScore('Commodities')
  const forexScore       = catScore('Forex')
  const topPt    = { x: 250,                           y: 250 - (cryptoScore / 100) * 130 }
  const rightPt  = { x: 250 + (equitiesScore / 100) * 130,  y: 250 }
  const bottomPt = { x: 250,                           y: 250 + (commoditiesScore / 100) * 130 }
  const leftPt   = { x: 250 - (forexScore / 100) * 130,     y: 250 }
  const polygonPoints = `${topPt.x},${topPt.y} ${rightPt.x},${rightPt.y} ${bottomPt.x},${bottomPt.y} ${leftPt.x},${leftPt.y}`
  const radarColors = getRadarColors(globalScore)

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center px-6 py-12 relative overflow-hidden">

      {/* Ambient glow */}
      <div className="absolute w-96 h-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col gap-2.5 w-full max-w-[960px]">

        {/* Layout header: hero spacer + section label + toggle */}
        <div className="flex items-center gap-5">
          <div className="flex-none w-[300px]" />
          <div className="flex-1 flex items-center justify-between">
            <p className="text-[10px] tracking-[0.15em] uppercase text-slate-700 font-medium">
              By Asset Class · Market Deviation from Pyth
            </p>
            <div
              className="flex gap-0.5 rounded-[10px] p-[3px] border border-white/[0.08]"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <button
                onClick={() => setRadarView(true)}
                className={`px-4 py-1.5 rounded-[7px] text-[11px] font-medium transition-all border ${
                  radarView
                    ? 'bg-white/[0.09] border-white/10 text-slate-300 shadow-sm'
                    : 'border-transparent text-slate-500'
                }`}
              >◈ Radar</button>
              <button
                onClick={() => setRadarView(false)}
                className={`px-4 py-1.5 rounded-[7px] text-[11px] font-medium transition-all border ${
                  !radarView
                    ? 'bg-white/[0.09] border-white/10 text-slate-300 shadow-sm'
                    : 'border-transparent text-slate-500'
                }`}
              >⊞ Cards</button>
            </div>
          </div>
        </div>

        {/* Main row: hero left | right panel — stretch so both match height */}
        <div className="flex gap-5 items-stretch">

          {/* Hero card */}
          <div className={`glass-strong ${globalLevel.glow} relative flex flex-col items-center flex-none w-[300px] px-8 py-10 overflow-hidden`}>
            <div
              className="absolute w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', top: '-80px', left: '50%', transform: 'translateX(-50%)' }}
            />
            <p className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-semibold mb-1">Deviation Index</p>
            <p className="text-slate-400 text-[13px] font-medium mb-0.5">Pyth price is the benchmark</p>
            <p className="text-[11px] text-slate-500 mb-6">{DEVIATION_SYMBOLS.length} assets · multi-source · live</p>

            <div className={`relative flex flex-col items-center justify-center w-[168px] h-[168px] rounded-full border-2 ${globalLevel.ring} ${globalLevel.bg} pulse-ring mb-5`}>
              <div className="absolute inset-[6px] rounded-full border border-white/5" />
              <span className={`text-[68px] font-bold tabular-nums leading-none ${dataLoaded ? globalLevel.color : 'text-slate-600'}`}>
                {dataLoaded ? globalScore : '—'}
              </span>
              <span className="text-slate-500 text-xs mt-1">/100</span>
            </div>

            <div className={`px-5 py-1.5 rounded-full border ${globalLevel.ring} ${globalLevel.bg} mb-5`}>
              <span className={`text-[13px] font-semibold ${globalLevel.color}`}>
                {dataLoaded ? globalLevel.label : 'Aggregating markets…'}
              </span>
            </div>

            <div className="flex items-center gap-[7px] text-[11px] text-slate-700">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
                style={connected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}}
              />
              {connected
                ? `${DEVIATION_SYMBOLS.filter(s => prices[s]).length}/${DEVIATION_SYMBOLS.length} assets · Pyth live`
                : 'Connecting to Pyth…'}
            </div>
          </div>

          {/* Right panel — cards or radar */}
          <div className="flex-none w-[580px] flex flex-col">
            {radarView ? (
              <div className="glass flex-1 flex items-center justify-center overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 80 500 340" style={{ minHeight: '300px' }}>
                  <defs>
                    <filter id="radar-glow" x="-60%" y="-60%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation="4" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="fill-grad" x1="0.5" y1="0" x2="0.5" y2="1">
                      <stop offset="0%" stopColor={radarColors.grad0} />
                      <stop offset="100%" stopColor={radarColors.grad1} />
                    </linearGradient>
                  </defs>

                  {/* Grid rings */}
                  <polygon points="250,218 282,250 250,282 218,250" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <polygon points="250,185 315,250 250,315 185,250" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
                  <polygon points="250,152 348,250 250,348 152,250" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <polygon points="250,120 380,250 250,380 120,250" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="5,4" />

                  {/* Axes */}
                  <line x1="250" y1="250" x2="250" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="250" y1="250" x2="380" y2="250" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="250" y1="250" x2="250" y2="380" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="250" y1="250" x2="120" y2="250" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                  {/* Data polygon */}
                  <polygon
                    points={polygonPoints}
                    fill="url(#fill-grad)"
                    stroke={radarColors.stroke}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    filter="url(#radar-glow)"
                  />

                  {/* Category dots */}
                  <circle cx={topPt.x}    cy={topPt.y}    r="5" fill={getHexColor(cryptoScore)}      stroke="#050507" strokeWidth="2.5" filter="url(#radar-glow)" />
                  <circle cx={rightPt.x}  cy={rightPt.y}  r="5" fill={getHexColor(equitiesScore)}    stroke="#050507" strokeWidth="2.5" filter="url(#radar-glow)" />
                  <circle cx={bottomPt.x} cy={bottomPt.y} r="5" fill={getHexColor(commoditiesScore)} stroke="#050507" strokeWidth="2.5" filter="url(#radar-glow)" />
                  <circle cx={leftPt.x}   cy={leftPt.y}   r="5" fill={getHexColor(forexScore)}       stroke="#050507" strokeWidth="2.5" filter="url(#radar-glow)" />
                  <circle cx="250" cy="250" r="3" fill="rgba(255,255,255,0.15)" />

                  {/* Labels — top */}
                  <text x="250" y="101" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing="0.12em">⬡ CRYPTO</text>
                  <text x="250" y="116" textAnchor="middle" fontSize="16" fontWeight="700" fill={getHexColor(cryptoScore)} fontFamily="system-ui,sans-serif">{cryptoScore}</text>

                  {/* Labels — right */}
                  <text x="394" y="245" textAnchor="start" fontSize="9" fill="#64748b" fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing="0.1em">△ EQUITIES</text>
                  <text x="394" y="261" textAnchor="start" fontSize="16" fontWeight="700" fill={getHexColor(equitiesScore)} fontFamily="system-ui,sans-serif">{equitiesScore}</text>

                  {/* Labels — bottom */}
                  <text x="250" y="400" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing="0.1em">◎ COMMODITIES</text>
                  <text x="250" y="416" textAnchor="middle" fontSize="16" fontWeight="700" fill={getHexColor(commoditiesScore)} fontFamily="system-ui,sans-serif">{commoditiesScore}</text>

                  {/* Labels — left */}
                  <text x="106" y="245" textAnchor="end" fontSize="9" fill="#64748b" fontFamily="system-ui,sans-serif" fontWeight="600" letterSpacing="0.1em">FOREX ⇄</text>
                  <text x="106" y="261" textAnchor="end" fontSize="16" fontWeight="700" fill={getHexColor(forexScore)} fontFamily="system-ui,sans-serif">{forexScore}</text>
                </svg>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2.5">
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
            )}
          </div>

        </div>

        {/* CTA */}
        <button
          onClick={onOpenHeatmap}
          className="self-center mt-6 flex items-center gap-2 text-sm text-slate-400 hover:text-purple-300 transition-colors group"
        >
          Scan {DEVIATION_SYMBOLS.length} Assets
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </button>

      </div>

      {/* Footer */}
      <p className="mt-6 text-slate-700 text-xs">
        Powered by{' '}
        <a href="https://www.pyth.network" target="_blank" rel="noopener noreferrer"
           className="hover:text-slate-500 transition-colors">
          Pyth Network
        </a>
      </p>
    </div>
  )
}
