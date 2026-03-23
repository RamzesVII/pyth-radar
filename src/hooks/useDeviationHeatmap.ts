import { useEffect, useRef, useState } from 'react'
import { FEED_CATEGORY } from './usePythPrices'

// Curated shortlist — assets with independent market data for deviation
export const DEVIATION_SYMBOLS: string[] = [
  // Crypto (18)
  'BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD',
  'ADA/USD', 'AVAX/USD', 'DOGE/USD', 'LINK/USD', 'LTC/USD',
  'NEAR/USD', 'APT/USD', 'ARB/USD', 'OP/USD', 'SUI/USD',
  'INJ/USD', 'PYTH/USD', 'HYPE/USD',
  // Forex (2)
  'EUR/USD', 'GBP/USD',
  // Commodities (3)
  'XAU/USD', 'XAG/USD', 'WTI/USD',
  // Equities (7)
  'AAPL/USD', 'MSFT/USD', 'NVDA/USD', 'TSLA/USD',
  'AMZN/USD', 'GOOGL/USD', 'META/USD',
]

export const DEVIATION_TABS = ['All', 'Crypto', 'Forex', 'Commodities', 'Equities']
export function filterByTab(tab: string) {
  return DEVIATION_SYMBOLS.filter(s => tab === 'All' || FEED_CATEGORY[s] === tab)
}

// ── Binance spot combined stream (crypto) ────────────────────────────────────
const BINANCE_MAP: Record<string, string> = {
  btcusdt: 'BTC/USD', ethusdt: 'ETH/USD', solusdt: 'SOL/USD',
  bnbusdt: 'BNB/USD', xrpusdt: 'XRP/USD', adausdt: 'ADA/USD',
  avaxusdt: 'AVAX/USD', dogeusdt: 'DOGE/USD', linkusdt: 'LINK/USD',
  ltcusdt: 'LTC/USD', nearusdt: 'NEAR/USD', aptusdt: 'APT/USD',
  arbusdt: 'ARB/USD', opusdt: 'OP/USD', suiusdt: 'SUI/USD',
  injusdt: 'INJ/USD', pythusdt: 'PYTH/USD',
}

// ── Binance futures (metals + equities with futures coverage) ─────────────────
const BINANCE_FUT_MAP: Record<string, string> = {
  xauusdt:  'XAU/USD',
  xagusdt:  'XAG/USD',
  tslausdt: 'TSLA/USD',
  amznusdt: 'AMZN/USD',
}

// ── Gate.io futures (TradFi) ─────────────────────────────────────────────────
const GATE_FUT_MAP: Record<string, string> = {
  XAU_USDT: 'XAU/USD', XAG_USDT: 'XAG/USD',
  EURUSD_USDT: 'EUR/USD', GBPUSD_USDT: 'GBP/USD',
  AAPLX_USDT: 'AAPL/USD', MSFT_USDT: 'MSFT/USD',
  NVDAX_USDT: 'NVDA/USD', TSLAX_USDT: 'TSLA/USD',
  AMZNX_USDT: 'AMZN/USD', GOOGLX_USDT: 'GOOGL/USD',
  METAX_USDT: 'META/USD',
}

// ── OKX (WTI crude oil + metals) ─────────────────────────────────────────────
const OKX_MAP: Record<string, string> = {
  'CL-USDT-SWAP':  'WTI/USD',
  'XAU-USDT-SWAP': 'XAU/USD',
  'XAG-USDT-SWAP': 'XAG/USD',
}

// Returns composite market price per symbol (null = not yet received)
// Composite = average of all available sources for each symbol.
export function useDeviationHeatmap(): Record<string, number | null> {
  const [prices, setPrices] = useState<Record<string, number | null>>({})
  // Per-symbol, per-source latest price (ref — no re-render on update)
  const sourcePrices = useRef<Record<string, Record<string, number>>>({})

  useEffect(() => {
    const setSource = (symbol: string, source: string, price: number) => {
      if (!sourcePrices.current[symbol]) sourcePrices.current[symbol] = {}
      sourcePrices.current[symbol][source] = price
      const vals = Object.values(sourcePrices.current[symbol])
      const composite = vals.reduce((a, b) => a + b, 0) / vals.length
      setPrices(prev => ({ ...prev, [symbol]: composite }))
    }

    let cancelled = false
    let binWs:      WebSocket | null = null
    let binFWs:     WebSocket | null = null
    let gateWs:     WebSocket | null = null
    let okxWs:      WebSocket | null = null
    let gateSpotWs: WebSocket | null = null
    let binD = 1000, bfD = 1000, gD = 1000, oD = 1000, gsD = 1000
    let binT: ReturnType<typeof setTimeout> | null = null
    let bfT:  ReturnType<typeof setTimeout> | null = null
    let gT:   ReturnType<typeof setTimeout> | null = null
    let oT:   ReturnType<typeof setTimeout> | null = null
    let gsT:  ReturnType<typeof setTimeout> | null = null

    // ── 1. Binance spot (crypto) ──────────────────────────────────────────────
    const connectBinance = () => {
      const streams = Object.keys(BINANCE_MAP).map(s => `${s}@ticker`).join('/')
      const ws = new WebSocket(`wss://stream.binance.com/stream?streams=${streams}`)
      binWs = ws
      ws.onopen = () => { binD = 1000 }
      ws.onmessage = (e) => {
        try {
          const msg    = JSON.parse(e.data)
          const name   = (msg.stream as string)?.replace('@ticker', '')
          const symbol = name ? BINANCE_MAP[name] : null
          const price  = msg.data?.c ? parseFloat(msg.data.c) : null
          if (symbol && price && price > 0) setSource(symbol, 'binance', price)
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => { if (!cancelled) { binT = setTimeout(connectBinance, binD); binD = Math.min(binD * 2, 30_000) } }
    }

    // ── 2. Binance futures (metals + TSLA/AMZN) ───────────────────────────────
    const connectBinanceF = () => {
      const streams = Object.keys(BINANCE_FUT_MAP).map(s => `${s}@ticker`).join('/')
      const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${streams}`)
      binFWs = ws
      ws.onopen = () => { bfD = 1000 }
      ws.onmessage = (e) => {
        try {
          const msg    = JSON.parse(e.data)
          const name   = (msg.stream as string)?.replace('@ticker', '')
          const symbol = name ? BINANCE_FUT_MAP[name] : null
          const price  = msg.data?.c ? parseFloat(msg.data.c) : null
          if (symbol && price && price > 0) setSource(symbol, 'binanceF', price)
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => { if (!cancelled) { bfT = setTimeout(connectBinanceF, bfD); bfD = Math.min(bfD * 2, 30_000) } }
    }

    // ── 3. Gate.io futures (TradFi) ───────────────────────────────────────────
    const connectGate = () => {
      const ws = new WebSocket('wss://fx-ws.gateio.ws/v4/ws/usdt')
      gateWs = ws
      ws.onopen = () => {
        gD = 1000
        ws.send(JSON.stringify({ time: Math.floor(Date.now() / 1000), channel: 'futures.tickers', event: 'subscribe', payload: Object.keys(GATE_FUT_MAP) }))
      }
      ws.onmessage = (e) => {
        try {
          const d        = JSON.parse(e.data)
          const item     = Array.isArray(d.result) ? d.result[0] : d.result
          const contract = item?.contract as string | undefined
          const symbol   = contract ? GATE_FUT_MAP[contract] : null
          const price    = item?.last ? parseFloat(item.last) : null
          if (symbol && price && price > 0) setSource(symbol, 'gate', price)
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => { if (!cancelled) { gT = setTimeout(connectGate, gD); gD = Math.min(gD * 2, 30_000) } }
    }

    // ── 4. OKX (WTI + metals) ────────────────────────────────────────────────
    const connectOkx = () => {
      const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')
      okxWs = ws
      ws.onopen = () => {
        oD = 1000
        ws.send(JSON.stringify({ op: 'subscribe', args: Object.keys(OKX_MAP).map(instId => ({ channel: 'tickers', instId })) }))
      }
      ws.onmessage = (e) => {
        try {
          const d      = JSON.parse(e.data as string)
          const instId = d.data?.[0]?.instId as string | undefined
          const symbol = instId ? OKX_MAP[instId] : null
          const price  = d.data?.[0]?.last ? parseFloat(d.data[0].last) : null
          if (symbol && price && price > 0) setSource(symbol, 'okx', price)
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => { if (!cancelled) { oT = setTimeout(connectOkx, oD); oD = Math.min(oD * 2, 30_000) } }
    }

    // ── 5. Gate.io spot (HYPE/USD) ────────────────────────────────────────────
    const connectGateSpot = () => {
      const ws = new WebSocket('wss://api.gateio.ws/ws/v4/')
      gateSpotWs = ws
      ws.onopen = () => {
        gsD = 1000
        ws.send(JSON.stringify({ time: Math.floor(Date.now() / 1000), channel: 'spot.tickers', event: 'subscribe', payload: ['HYPE_USDT'] }))
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          const price = d.result?.last ? parseFloat(d.result.last) : null
          if (price && price > 0) setSource('HYPE/USD', 'gateSpot', price)
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => { if (!cancelled) { gsT = setTimeout(connectGateSpot, gsD); gsD = Math.min(gsD * 2, 30_000) } }
    }

    connectBinance(); connectBinanceF(); connectGate(); connectOkx(); connectGateSpot()

    return () => {
      cancelled = true
      ;[binT, bfT, gT, oT, gsT].forEach(t => t && clearTimeout(t))
      binWs?.close(); binFWs?.close(); gateWs?.close(); okxWs?.close(); gateSpotWs?.close()
    }
  }, [])

  return prices
}
