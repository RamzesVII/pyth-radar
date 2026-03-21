import { usePythPrices, FEED_CATEGORY } from '../hooks/usePythPrices'
import { useCexPrices } from '../hooks/useCexPrices'
import { useTradFiPrices } from '../hooks/useTradFiPrices'

interface Props {
  asset: string
}

interface ExchangeRowProps {
  name: string
  price: number | null
  pythPrice: number
  connected: boolean
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ExchangeRow({ name, price, pythPrice, connected }: ExchangeRowProps) {
  const delta = price != null ? ((price - pythPrice) / pythPrice) * 100 : null
  const isPos = delta != null && delta > 0
  const isNeg = delta != null && delta < 0

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800/60 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
          connected ? 'bg-green-400' : 'bg-slate-600'
        }`} style={connected ? { boxShadow: '0 0 5px rgba(52,211,153,0.7)' } : {}} />
        <span className="text-slate-300 text-sm font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-6">
        <span className="text-slate-200 text-sm font-mono">
          {price != null ? `$${fmt(price)}` : (connected ? '—' : 'Connecting…')}
        </span>
        {delta != null ? (
          <span className={`text-sm font-mono w-20 text-right ${
            isPos ? 'text-red-400' : isNeg ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            {isPos ? '+' : ''}{delta.toFixed(4)}%
          </span>
        ) : (
          <span className="text-slate-600 text-sm w-20 text-right">—</span>
        )}
      </div>
    </div>
  )
}

export default function Delta({ asset }: Props) {
  const { prices, connected: pythConnected } = usePythPrices()
  const cex    = useCexPrices(asset)
  const tradfi = useTradFiPrices(asset)
  const p      = prices[asset]

  const category = FEED_CATEGORY[asset] ?? 'Crypto'
  const isCrypto = category === 'Crypto'

  // Use the right composite depending on asset class
  const composite      = isCrypto ? cex.composite : tradfi.composite
  const compositeDelta = p && composite != null
    ? ((composite - p.price) / p.price) * 100
    : null

  const ciPct    = p ? (p.conf / p.price) * 100 : null
  const withinCI = compositeDelta != null && ciPct != null && Math.abs(compositeDelta) < ciPct

  // Which exchanges have rows to show for this asset
  const showCrypto  = isCrypto && cex.supported
  const showTradFi  = !isCrypto && tradfi.supported
  const hasAnyMarket = showCrypto || showTradFi

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              Pyth Delta — <span className="text-purple-400">{asset}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Pyth benchmark vs market prices · real-time deviation
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${pythConnected ? 'bg-green-400' : 'bg-slate-600'}`}
              style={pythConnected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}} />
            {pythConnected ? 'Live' : 'Connecting…'}
          </div>
        </div>

        {/* Pyth benchmark card */}
        {p ? (
          <div className="glass-strong glow-purple p-6 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pyth Benchmark Price</p>
                <p className="text-4xl font-bold text-slate-100">${fmt(p.price)}</p>
                <p className="text-slate-500 text-xs mt-2">Institutional aggregate · Citadel, Jane Street, Jump</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Confidence Interval</p>
                <p className="text-xl font-mono text-yellow-400">±${fmt(p.conf)}</p>
                <p className="text-slate-500 text-xs mt-0.5">{ciPct?.toFixed(4)}% of price</p>
              </div>
            </div>

            {/* Composite delta summary */}
            {compositeDelta != null && (
              <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-0.5">Market Deviation</p>
                  <p className={`text-2xl font-bold font-mono ${
                    Math.abs(compositeDelta) < 0.05 ? 'text-slate-300'
                    : compositeDelta > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {compositeDelta > 0 ? '+' : ''}{compositeDelta.toFixed(4)}%
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  withinCI
                    ? 'bg-slate-700/40 border-slate-600/40 text-slate-400'
                    : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                }`}>
                  {withinCI ? 'Within CI · likely noise' : 'Outside CI · potential signal'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-strong p-6 mb-4 flex items-center justify-center h-32">
            <p className="text-slate-600 text-sm">Waiting for Pyth data…</p>
          </div>
        )}

        {/* Exchange comparison */}
        {hasAnyMarket ? (
          <div className="glass p-6 mb-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-1 font-medium">Exchange Prices</p>
            <p className="text-slate-600 text-xs mb-4">Δ = deviation from Pyth benchmark · green = market below benchmark</p>

            {/* Crypto rows */}
            {showCrypto && p && (
              <div>
                <ExchangeRow name="Binance" price={cex.binance.price} pythPrice={p.price} connected={cex.binance.connected} />
                <ExchangeRow name="Bybit"   price={cex.bybit.price}   pythPrice={p.price} connected={cex.bybit.connected} />
                <ExchangeRow name="Gate.io" price={cex.gate.price}    pythPrice={p.price} connected={cex.gate.connected} />
                <ExchangeRow name="BingX"   price={cex.bingx.price}   pythPrice={p.price} connected={cex.bingx.connected} />
              </div>
            )}

            {/* TradFi rows — only show exchanges that cover this specific asset */}
            {showTradFi && p && (
              <div>
                {tradfi.has.gate     && <ExchangeRow name="Gate.io" price={tradfi.gate.price}     pythPrice={p.price} connected={tradfi.gate.connected} />}
                {tradfi.has.binanceF && <ExchangeRow name="Binance" price={tradfi.binanceF.price} pythPrice={p.price} connected={tradfi.binanceF.connected} />}
                {tradfi.has.bingx    && <ExchangeRow name="BingX"   price={tradfi.bingx.price}    pythPrice={p.price} connected={tradfi.bingx.connected} />}
              </div>
            )}

            {/* Composite row */}
            {p && composite != null && compositeDelta != null && (
              <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-slate-300 text-sm font-semibold">Composite</span>
                <div className="flex items-center gap-6">
                  <span className="text-slate-200 text-sm font-mono font-semibold">${fmt(composite)}</span>
                  <span className={`text-sm font-mono font-semibold w-20 text-right ${
                    compositeDelta > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {compositeDelta > 0 ? '+' : ''}{compositeDelta.toFixed(4)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass p-6 mb-4">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-2 font-medium">Exchange Prices</p>
            <p className="text-slate-600 text-sm">
              No independent market data available for this asset.
            </p>
          </div>
        )}

        {/* Charts placeholder */}
        <div className="glass p-6 h-56 flex flex-col">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-3">
            Price + CI Band / Delta % — Charts coming in next step
          </p>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-700 text-sm">Overlaid chart: Pyth CI band · CEX composite · Delta histogram</p>
          </div>
        </div>

      </div>
    </div>
  )
}
