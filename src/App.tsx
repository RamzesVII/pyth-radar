import { useState } from 'react'
import FearIndex from './screens/FearIndex'
import Heatmap from './screens/Heatmap'
import Delta from './screens/Delta'
import pythLogo from './assets/pyth-logo-dark.svg'
import pythSymbol from './assets/pyth-logo-symbol-dark.svg'

export type Screen = 'fear' | 'heatmap' | 'delta'

const NAV_ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: 'fear',    label: 'Fear Index', icon: '◎' },
  { id: 'heatmap', label: 'Heatmap',    icon: '▦' },
  { id: 'delta',   label: 'Delta',      icon: '∆' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('fear')
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC/USD')

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
            <img src={pythLogo} alt="Pyth" className="h-4 opacity-90" />
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
              <span className="text-xs opacity-70">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Status dot */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          Live
        </div>
      </nav>

      {/* Content */}
      <div className="pt-14">
        {screen === 'fear'    && <FearIndex onOpenHeatmap={() => setScreen('heatmap')} />}
        {screen === 'heatmap' && <Heatmap onSelectAsset={openDelta} />}
        {screen === 'delta'   && <Delta asset={selectedAsset} />}
      </div>
    </div>
  )
}

export default App
