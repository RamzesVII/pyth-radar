import { useEffect, useState } from 'react'

export interface PythPrice {
  id: string
  symbol: string
  price: number
  conf: number
  expo: number
  publishTime: number
}

// Official Pyth feed IDs — https://pyth.network/developers/price-feed-ids
export const PYTH_FEEDS: Record<string, string> = {
  // Crypto — Major
  'BTC/USD':   'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD':   'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD':   'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BNB/USD':   '2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  'XRP/USD':   'ec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  'ADA/USD':   '2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  'AVAX/USD':  '93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'DOGE/USD':  'dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  'DOT/USD':   'ca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  'LINK/USD':  '8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  'UNI/USD':   '78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  'LTC/USD':   '6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892e73874e19a54',
  'NEAR/USD':  'c415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750',
  'APT/USD':   '03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  'ARB/USD':   '3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5',
  'OP/USD':    '385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf',
  'SUI/USD':   '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  'SEI/USD':   '53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb',
  'TIA/USD':   '09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723',
  'INJ/USD':   '7a5bc1d2b56ad029048cd63964b3ad2776eadf812edc1a43a31406cb54bff592',
  'HYPE/USD':  '4279e31cc369bbcc2faf022b382b080e32a8e689ff20fbc530d2a603eb6cd98b',
  'JTO/USD':   'b43660a5f790c69354b0729a5ef9d50d68f1df92107540210b9cccba1f947cc2',
  'WIF/USD':   '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  'BONK/USD':  '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  'JUP/USD':   '0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'PYTH/USD':  '0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff',

  // Forex
  'EUR/USD':   'a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b',
  'GBP/USD':   '84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1',
  'CHF/USD':   '0b1e3297e69f162877b577b0d6a47a0d63b2392bc8499e6540da4187a63e28f8',
  'CAD/USD':   '3112b03a41c910ed446852aacf67118cb1bec67b2cd0b9a214c58cc0eaa2ecca',
  'AUD/USD':   '67a6f93030420c1c9e3fe37c1ab6b77966af82f995944a9fefce357a22854a80',

  // Commodities — Spot
  'XAU/USD':     '765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2',
  'XAG/USD':     'f2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e',
  'BRENT/USD':   '27f0d5e09a830083e5491795cac9ca521399c8f7fd56240d09484b14e614d57a', // UKOILSPOT
  'WTI/USD':     '925ca92ff005ae943c158e3563f59698ce7e75c5a8c8dd43303a0a154887b3e6', // USOILSPOT
  // Commodities — Futures (nearest active contract)
  'NATGAS/USD':  'fbc11c7e9e320d833ee90ebc2002c36cf1bf6f501786c8cf1730ee85cc1705d9', // HH Natural Gas May 2026
  'COPPER/USD':  'd6a6755e89a16800a66dbc1a62356e5aaaba575c85fc4a86d787a84b5efe5fc4', // Copper May 2026
  'PLAT/USD':    '8ecd88da6dc67b6385d9f8afbea0aebc85db89a9c93a24804c6b327da4bf95b5', // Platinum Apr 2026
  'PALL/USD':    '340362ee9ecc049e80627b050f45694d39d8f85b04de24798f70af41a3a16986', // Palladium Mar 2026
  'CORN/USD':    '2cf5cd9186761a0c667f50ff7bd345ce87ff3de91803dda8613398378c3aa97b', // Corn May 2026
  'SUGAR/USD':   '5f042335ca301fd60937721c36d5f1e320155f7a8e65958d49102b342761ec96', // Raw Sugar Apr 2026
  'ALUM/USD':    '2f99b6f1fc74227b450e091484b0418fdeae5b8976198b88b8e2035137058d6d', // Aluminium Mar 2026

  // Equities — US Stocks (verified IDs from Pyth API)
  'NVDA/USD':    'b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593',
  'TSLA/USD':    '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1',
  'AMZN/USD':    'b5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a',
  'INTC/USD':    'c1751e085ee292b8b3b9dd122a135614485a201c35dfc653553f0e28c1baf3ff',
  'PYPL/USD':    '773c3b11f6be58e8151966a9f5832696d8cd08884ccc43ac8965a7ebea911533',
  'BAC/USD':     '21debc1718a4b76ff74dadf801c261d76c46afaafb74d9645b65e00b80f5ee3e',
  'V/USD':       'c719eb7bab9b2bc060167f1d1680eb34a29c490919072513b545b9785b73ee90',
  'MA/USD':      '639db3fe6951d2465bd722768242e68eb0285f279cb4fa97f677ee8f80f1f1c0',
  'MSFT/USD':    '8f98f8267ddddeeb61b4fd11f21dc0c2842c417622b4d685243fa73b5830131f',
  'AAPL/USD':    '241b9a5ce1c3e4bfc68e377158328628f1b478afaa796c4b1760bd3713c2d2d2',
  'GOOGL/USD':   '07d24bb76843496a45bce0add8b51555f2ea02098cb04f4c6d61f7b5720836b4',
  'META/USD':    '783a457c2fe5642c96a66ba9a2fe61f511e9a0b539e0ed2a443321978e4d65a1',
  'NFLX/USD':    'a68f6030142bf1370f0963cd2d33b8aef33e4777a0331a63b383b88b2fd92dd7',
  'AMD/USD':     '7178689d88cdd76574b64438fc57f4e57efaf0bf5f9593ee19c10e46a3c5b5cf',
}

export const HISTORICAL_CI: Record<string, number> = {
  'BTC/USD': 0.08, 'ETH/USD': 0.10, 'SOL/USD': 0.15,
  'BNB/USD': 0.12, 'XRP/USD': 0.12, 'ADA/USD': 0.20,
  'AVAX/USD': 0.20, 'DOGE/USD': 0.25, 'DOT/USD': 0.22,
  'LINK/USD': 0.18, 'UNI/USD': 0.20,
  'LTC/USD': 0.15, 'NEAR/USD': 0.25,
  'APT/USD': 0.25, 'ARB/USD': 0.28, 'OP/USD': 0.28,
  'SUI/USD': 0.30, 'SEI/USD': 0.35, 'TIA/USD': 0.35,
  'INJ/USD': 0.30, 'JTO/USD': 0.40, 'WIF/USD': 0.50,
  'BONK/USD': 0.60, 'JUP/USD': 0.35, 'PYTH/USD': 0.30, 'HYPE/USD': 0.35,
  'EUR/USD': 0.004, 'GBP/USD': 0.005,
  'CHF/USD': 0.004, 'CAD/USD': 0.004, 'AUD/USD': 0.005,
  'XAU/USD': 0.06, 'XAG/USD': 0.10, 'BRENT/USD': 0.08, 'WTI/USD': 0.08,
  'NATGAS/USD': 0.20, 'COPPER/USD': 0.12, 'PLAT/USD': 0.10, 'PALL/USD': 0.15,
  'CORN/USD': 0.18, 'SUGAR/USD': 0.20, 'ALUM/USD': 0.12,
  'NVDA/USD': 0.08, 'TSLA/USD': 0.12, 'AMZN/USD': 0.06, 'INTC/USD': 0.10,
  'PYPL/USD': 0.12, 'BAC/USD': 0.08, 'V/USD': 0.05, 'MA/USD': 0.05,
  'MSFT/USD': 0.05, 'AAPL/USD': 0.04, 'GOOGL/USD': 0.06, 'META/USD': 0.07,
  'NFLX/USD': 0.10, 'AMD/USD': 0.10,
}

export const FEED_CATEGORY: Record<string, string> = {
  'BTC/USD': 'Crypto', 'ETH/USD': 'Crypto', 'SOL/USD': 'Crypto',
  'BNB/USD': 'Crypto', 'XRP/USD': 'Crypto', 'ADA/USD': 'Crypto',
  'AVAX/USD': 'Crypto', 'DOGE/USD': 'Crypto', 'DOT/USD': 'Crypto',
  'LINK/USD': 'Crypto', 'UNI/USD': 'Crypto',
  'LTC/USD': 'Crypto', 'NEAR/USD': 'Crypto',
  'APT/USD': 'Crypto', 'ARB/USD': 'Crypto', 'OP/USD': 'Crypto',
  'SUI/USD': 'Crypto', 'SEI/USD': 'Crypto', 'TIA/USD': 'Crypto',
  'INJ/USD': 'Crypto', 'JTO/USD': 'Crypto', 'WIF/USD': 'Crypto',
  'HYPE/USD': 'Crypto',
  'BONK/USD': 'Crypto', 'JUP/USD': 'Crypto', 'PYTH/USD': 'Crypto',
  'EUR/USD': 'Forex', 'GBP/USD': 'Forex',
  'CHF/USD': 'Forex', 'CAD/USD': 'Forex', 'AUD/USD': 'Forex',
  'XAU/USD': 'Commodities', 'XAG/USD': 'Commodities',
  'BRENT/USD': 'Commodities', 'WTI/USD': 'Commodities', 'NATGAS/USD': 'Commodities',
  'COPPER/USD': 'Commodities', 'PLAT/USD': 'Commodities', 'PALL/USD': 'Commodities',
  'CORN/USD': 'Commodities', 'SUGAR/USD': 'Commodities', 'ALUM/USD': 'Commodities',
  'NVDA/USD': 'Equities', 'TSLA/USD': 'Equities', 'AMZN/USD': 'Equities',
  'INTC/USD': 'Equities', 'PYPL/USD': 'Equities', 'BAC/USD': 'Equities',
  'V/USD': 'Equities', 'MA/USD': 'Equities', 'MSFT/USD': 'Equities',
  'AAPL/USD': 'Equities', 'GOOGL/USD': 'Equities', 'META/USD': 'Equities',
  'NFLX/USD': 'Equities', 'AMD/USD': 'Equities',
}

const HERMES_WS = 'wss://hermes.pyth.network/ws'

// O(1) reverse lookup built once at module load
const ID_TO_SYMBOL: Record<string, string> = Object.fromEntries(
  Object.entries(PYTH_FEEDS).map(([sym, id]) => [id, sym])
)

export function usePythPrices() {
  const [prices, setPrices] = useState<Record<string, PythPrice>>({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const feedIds = Object.values(PYTH_FEEDS).filter(id => /^[0-9a-f]{64}$/.test(id))
    let delay    = 1000
    let timer:   ReturnType<typeof setTimeout> | null = null
    let ws:      WebSocket | null = null
    let cancelled = false

    const connect = () => {
      ws = new WebSocket(HERMES_WS)
      ws.onopen = () => {
        delay = 1000
        setConnected(true)
        ws!.send(JSON.stringify({ ids: feedIds, type: 'subscribe', parsed: true }))
      }
      ws.onerror = () => ws!.close()
      ws.onclose = () => {
        setConnected(false)
        if (!cancelled) {
          timer = setTimeout(connect, delay)
          delay = Math.min(delay * 2, 30_000)
        }
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type !== 'price_update') return
          const feed = data.price_feed
          if (!feed) return
          const id     = feed.id as string
          const symbol = ID_TO_SYMBOL[id]
          if (!symbol) return
          const p     = feed.price
          const expo  = p.expo as number
          const price = parseFloat(p.price) * Math.pow(10, expo)
          const conf  = parseFloat(p.conf)  * Math.pow(10, expo)
          if (!price || price <= 0) return
          setPrices(prev => ({
            ...prev,
            [symbol]: { id, symbol, price, conf, expo, publishTime: p.publish_time as number },
          }))
        } catch { /* ignore */ }
      }
    }

    connect()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      ws?.close()
    }
  }, [])

  return { prices, connected }
}
