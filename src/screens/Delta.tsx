import { usePythPrices } from '../hooks/usePythPrices'

interface Props {
  asset: string
}

export default function Delta({ asset }: Props) {
  const { prices, connected } = usePythPrices()
  const p = prices[asset]

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Pyth Delta — <span className="text-purple-400">{asset}</span></h1>
            <p className="text-slate-500 text-sm mt-1">Pyth benchmark vs market prices · real-time deviation</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
              style={connected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}} />
            {connected ? 'Live' : 'Connecting…'}
          </div>
        </div>

        {/* Pyth price card */}
        {p && (
          <div className="glass-strong glow-purple p-6 mb-6 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pyth Benchmark Price</p>
              <p className="text-4xl font-bold text-slate-100">
                ${p.price.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Confidence Interval</p>
              <p className="text-xl font-mono text-yellow-400">
                ±${p.conf.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {((p.conf / p.price) * 100).toFixed(4)}% of price
              </p>
            </div>
          </div>
        )}

        {/* Exchange comparison placeholder */}
        <div className="glass p-6 mb-6">
          <p className="text-slate-400 text-sm font-medium mb-4">Exchange Comparison</p>
          <div className="space-y-3">
            {['Binance', 'Bybit', 'Gate.io', 'MEXC'].map(ex => (
              <div key={ex} className="flex items-center justify-between py-2 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-300 text-sm">{ex}</span>
                <span className="text-slate-600 text-sm font-mono">Connecting…</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Composite</span>
            <span className="text-slate-600 text-sm font-mono">—</span>
          </div>
        </div>

        {/* Charts placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Price + CI Band', 'Delta %'].map(title => (
            <div key={title} className="glass p-6 h-48 flex flex-col">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-3">{title}</p>
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-700 text-sm">Charts coming in next step</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
