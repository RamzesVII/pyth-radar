import { useState } from 'react'
import AboutModal from './components/AboutModal'
import { usePythPrices } from './hooks/usePythPrices'
import { useDeviationHeatmap } from './hooks/useDeviationHeatmap'
import DeviationIndex from './screens/DeviationIndex'
import Heatmap from './screens/Heatmap'
import Delta from './screens/Delta'
import pythLogo from './assets/pyth-logo-dark.svg'
import pythSymbol from './assets/pyth-logo-symbol-dark.svg'

export type Screen = 'overview' | 'heatmap' | 'delta'

const NAV_ITEMS: { id: Screen; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'heatmap',  label: 'Heatmap'  },
  { id: 'delta',    label: 'Delta'    },
]

function App() {
  const [screen, setScreen]               = useState<Screen>('overview')
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC/USD')
  const [showAbout, setShowAbout]         = useState(false)

  // Single instances — shared across all screens
  const { prices, connected } = usePythPrices()
  const marketPrices          = useDeviationHeatmap()

  const openDelta = (asset: string) => {
    setSelectedAsset(asset)
    setScreen('delta')
  }

  return (
    <div className="min-h-screen bg-mesh">
      {/* Nav */}
      <nav className="nav-glass fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-14">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={pythSymbol} alt="Pyth" className="h-7 w-7" />
          <div className="flex items-center gap-1.5">
            <img src={pythLogo} alt="Pyth" className="h-4" style={{ filter: 'invert(1) opacity(0.9)' }} />
            <span className="text-slate-400 text-sm font-light tracking-widest uppercase">Radar</span>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                screen === item.id
                  ? 'bg-purple-600/50 text-white shadow-lg shadow-purple-900/30 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status dot + About */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <button
            onClick={() => setShowAbout(true)}
            className="w-5 h-5 rounded-full border border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-colors flex items-center justify-center text-[10px] font-semibold"
          >
            ?
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
              style={connected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}} />
            {connected ? 'Pyth live' : 'Connecting…'}
          </div>
        </div>
      </nav>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {/* Content */}
      <div className="pt-14">
        {screen === 'overview' && <DeviationIndex prices={prices} connected={connected} marketPrices={marketPrices} onOpenHeatmap={() => setScreen('heatmap')} />}
        {screen === 'heatmap' && <Heatmap   prices={prices} connected={connected} marketPrices={marketPrices} onSelectAsset={openDelta} />}
        {screen === 'delta'   && <Delta key={selectedAsset} asset={selectedAsset} prices={prices} pythConnected={connected} />}
      </div>
    </div>
  )
}

export default App
