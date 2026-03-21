import { useEffect, useRef, useState } from 'react'
import { FEED_CATEGORY } from './usePythPrices'

// Curated shortlist — assets with independent market data for deviation
export const DEVIATION_SYMBOLS: string[] = [
  // Crypto (17)
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD',
  'ADA/USD', 'AVAX/USD', 'DOGE/USD', 'LINK/USD', 'LTC/USD',
  'NEAR/USD', 'APT/USD', 'ARB/USD', 'OP/USD', 'SUI/USD',
  'INJ/USD', 'PYTH/USD',
  // Forex (2)
  'EUR/USD', 'GBP/USD',
  // Commodities (2) — BRENT/WTI excluded: no reliable real-time WS source
  'XAU/USD', 'XAG/USD',
  // Equities (7)
  'AAPL/USD', 'MSFT/USD', 'NVDA/USD', 'TSLA/USD',
  'AMZN/USD', 'GOOGL/USD', 'META/USD',
]

export const DEVIATION_TABS = ['All', 'Crypto', 'Forex', 'Commodities', 'Equities']
export function filterByTab(tab: string) {
  return DEVIATION_SYMBOLS.filter(s => tab === 'All' || FEED_CATEGORY[s] === tab)
}

// ── Binance combined stream (crypto spot) ────────────────────────────────────
// stream name (lowercase) → Pyth symbol
const BINANCE_MAP: Record<string, string> = {
  btcusdt: 'BTC/USD', ethusdt: 'ETH/USD', solusdt: 'SOL/USD',
  bnbusdt: 'BNB/USD', xrpusdt: 'XRP/USD', adausdt: 'ADA/USD',
  avaxusdt: 'AVAX/USD', dogeusdt: 'DOGE/USD', linkusdt: 'LINK/USD',
  ltcusdt: 'LTC/USD', nearusdt: 'NEAR/USD', aptusdt: 'APT/USD',
  arbusdt: 'ARB/USD', opusdt: 'OP/USD', suiusdt: 'SUI/USD',
  injusdt: 'INJ/USD', pythusdt: 'PYTH/USD',
}

// ── Gate.io futures (TradFi) ─────────────────────────────────────────────────
// contract name → Pyth symbol
const GATE_FUT_MAP: Record<string, string> = {
  XAU_USDT: 'XAU/USD', XAG_USDT: 'XAG/USD',
  EURUSD_USDT: 'EUR/USD', GBPUSD_USDT: 'GBP/USD',
  AAPLX_USDT: 'AAPL/USD', MSFT_USDT: 'MSFT/USD',
  NVDAX_USDT: 'NVDA/USD', TSLAX_USDT: 'TSLA/USD',
  AMZNX_USDT: 'AMZN/USD', GOOGLX_USDT: 'GOOGL/USD',
  METAX_USDT: 'META/USD',
}


// Returns composite market price per symbol (null = not yet received)
export function useDeviationHeatmap(): Record<string, number | null> {
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  const refs = useRef<WebSocket[]>([])

  useEffect(() => {
    const set = (symbol: string, price: number) =>
      setPrices(prev => ({ ...prev, [symbol]: price }))

    // ── 1. Binance combined stream ────────────────────────────────────────────
    const streams = Object.keys(BINANCE_MAP).map(s => `${s}@ticker`).join('/')
    const binWs = new WebSocket(`wss://stream.binance.com/stream?streams=${streams}`)
    binWs.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        const name   = (msg.stream as string)?.replace('@ticker', '')
        const symbol = name ? BINANCE_MAP[name] : null
        const price  = msg.data?.c ? parseFloat(msg.data.c) : null
        if (symbol && price && price > 0) set(symbol, price)
      } catch { /* ignore */ }
    }
    binWs.onerror = () => binWs.close()
    refs.current.push(binWs)

    // ── 2. Gate.io futures (single WS, 11 TradFi symbols) ────────────────────
    const gateFutWs = new WebSocket('wss://fx-ws.gateio.ws/v4/ws/usdt')
    gateFutWs.onopen = () => {
      gateFutWs.send(JSON.stringify({
        time:    Math.floor(Date.now() / 1000),
        channel: 'futures.tickers',
        event:   'subscribe',
        payload: Object.keys(GATE_FUT_MAP),
      }))
    }
    gateFutWs.onmessage = (e) => {
      try {
        const d        = JSON.parse(e.data)
        const item     = Array.isArray(d.result) ? d.result[0] : d.result
        const contract = item?.contract as string | undefined
        const symbol   = contract ? GATE_FUT_MAP[contract] : null
        const price    = item?.last ? parseFloat(item.last) : null
        if (symbol && price && price > 0) set(symbol, price)
      } catch { /* ignore */ }
    }
    gateFutWs.onerror = () => gateFutWs.close()
    refs.current.push(gateFutWs)

    return () => {
      refs.current.forEach(ws => ws.close())
      refs.current = []
    }
  }, [])

  return prices
}
