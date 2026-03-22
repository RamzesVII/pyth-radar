import { useEffect, useState } from 'react'
import type React from 'react'

export interface ExchangePrice {
  price: number | null
  connected: boolean
}

export interface CexPrices {
  binance: ExchangePrice
  bybit:   ExchangePrice
  gate:    ExchangePrice
  okx:     ExchangePrice
  composite: number | null
  supported: boolean // false for Forex/Commodities/Equities
}

// Crypto symbols available on CEX (Pyth symbol → CEX base)
const CEX_SUPPORTED: Record<string, string> = {
  'BTC/USD': 'BTC', 'ETH/USD': 'ETH', 'SOL/USD': 'SOL', 'BNB/USD': 'BNB',
  'XRP/USD': 'XRP', 'ADA/USD': 'ADA', 'AVAX/USD': 'AVAX', 'DOGE/USD': 'DOGE',
  'DOT/USD': 'DOT', 'LINK/USD': 'LINK', 'UNI/USD': 'UNI', 'ATOM/USD': 'ATOM',
  'LTC/USD': 'LTC', 'NEAR/USD': 'NEAR', 'APT/USD': 'APT', 'ARB/USD': 'ARB',
  'OP/USD': 'OP', 'SUI/USD': 'SUI', 'SEI/USD': 'SEI', 'TIA/USD': 'TIA',
  'INJ/USD': 'INJ', 'JTO/USD': 'JTO', 'WIF/USD': 'WIF', 'BONK/USD': 'BONK',
  'JUP/USD': 'JUP', 'PYTH/USD': 'PYTH', 'HYPE/USD': 'HYPE',
}

function makeWs(
  url: string,
  onOpen: (ws: WebSocket) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPrice: (data: any) => number | null,
  setState: React.Dispatch<React.SetStateAction<ExchangePrice>>,
  onClose: () => void,
): WebSocket {
  const ws = new WebSocket(url)
  ws.onopen = () => { setState({ price: null, connected: true }); onOpen(ws) }
  ws.onmessage = (e) => {
    try {
      const price = onPrice(JSON.parse(e.data))
      if (price != null && !isNaN(price) && price > 0) setState({ price, connected: true })
    } catch { /* ignore */ }
  }
  ws.onerror = () => ws.close()
  ws.onclose = () => { setState(prev => ({ ...prev, connected: false })); onClose() }
  return ws
}

export function useCexPrices(symbol: string): CexPrices {
  const base = CEX_SUPPORTED[symbol]
  const supported = !!base

  const [binance, setBinance] = useState<ExchangePrice>({ price: null, connected: false })
  const [bybit,   setBybit]   = useState<ExchangePrice>({ price: null, connected: false })
  const [gate,    setGate]    = useState<ExchangePrice>({ price: null, connected: false })
  const [okx,     setOkx]     = useState<ExchangePrice>({ price: null, connected: false })

  useEffect(() => {
    if (!supported || !base) return

    const sym    = `${base}USDT`
    const symLo  = sym.toLowerCase()
    const gSym   = `${base}_USDT`
    const okxSym = `${base}-USDT`

    let cancelled = false
    let binanceWs: WebSocket | null = null
    let bybitWs:   WebSocket | null = null
    let gateWs:    WebSocket | null = null
    let okxWs:     WebSocket | null = null
    let bD = 1000, byD = 1000, gD = 1000, oD = 1000
    let bT: ReturnType<typeof setTimeout> | null = null
    let byT: ReturnType<typeof setTimeout> | null = null
    let gT:  ReturnType<typeof setTimeout> | null = null
    let oT:  ReturnType<typeof setTimeout> | null = null

    const connectBinance = () => {
      binanceWs = makeWs(
        `wss://stream.binance.com/ws/${symLo}@ticker`,
        () => { bD = 1000 },
        (d) => d.c ? parseFloat(d.c) : null,
        setBinance,
        () => { if (!cancelled) { bT = setTimeout(connectBinance, bD); bD = Math.min(bD * 2, 30_000) } },
      )
    }

    const connectBybit = () => {
      bybitWs = makeWs(
        'wss://stream.bybit.com/v5/public/spot',
        (ws) => { byD = 1000; ws.send(JSON.stringify({ op: 'subscribe', args: [`tickers.${sym}`] })) },
        (d) => d.data?.lastPrice ? parseFloat(d.data.lastPrice) : null,
        setBybit,
        () => { if (!cancelled) { byT = setTimeout(connectBybit, byD); byD = Math.min(byD * 2, 30_000) } },
      )
    }

    const connectGate = () => {
      gateWs = makeWs(
        'wss://api.gateio.ws/ws/v4/',
        (ws) => {
          gD = 1000
          ws.send(JSON.stringify({ time: Math.floor(Date.now() / 1000), channel: 'spot.tickers', event: 'subscribe', payload: [gSym] }))
        },
        (d) => d.result?.last ? parseFloat(d.result.last) : null,
        setGate,
        () => { if (!cancelled) { gT = setTimeout(connectGate, gD); gD = Math.min(gD * 2, 30_000) } },
      )
    }

    const connectOkx = () => {
      okxWs = makeWs(
        'wss://ws.okx.com:8443/ws/v5/public',
        (ws) => { oD = 1000; ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId: okxSym }] })) },
        (d) => d.data?.[0]?.last ? parseFloat(d.data[0].last) : null,
        setOkx,
        () => { if (!cancelled) { oT = setTimeout(connectOkx, oD); oD = Math.min(oD * 2, 30_000) } },
      )
    }

    connectBinance(); connectBybit(); connectGate(); connectOkx()

    return () => {
      cancelled = true
      ;[bT, byT, gT, oT].forEach(t => t && clearTimeout(t))
      binanceWs?.close(); bybitWs?.close(); gateWs?.close(); okxWs?.close()
    }
  }, [symbol, supported, base])

  const prices = [binance.price, bybit.price, gate.price, okx.price]
    .filter((p): p is number => p !== null)
  const composite = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null

  return { binance, bybit, gate, okx, composite, supported }
}
