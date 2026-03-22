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
  bingx:   ExchangePrice
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
  const [bingx,   setBingX]   = useState<ExchangePrice>({ price: null, connected: false })

  useEffect(() => {
    if (!supported || !base) return

    const sym   = `${base}USDT`
    const symLo = sym.toLowerCase()
    const gSym  = `${base}_USDT`
    const bxSym = `${base}-USDT`

    let cancelled = false
    let binanceWs: WebSocket | null = null
    let bybitWs:   WebSocket | null = null
    let gateWs:    WebSocket | null = null
    let bingxWs:   WebSocket | null = null
    let bD = 1000, byD = 1000, gD = 1000, bxD = 1000
    let bT: ReturnType<typeof setTimeout> | null = null
    let byT: ReturnType<typeof setTimeout> | null = null
    let gT:  ReturnType<typeof setTimeout> | null = null
    let bxT: ReturnType<typeof setTimeout> | null = null

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

    const connectBingX = () => {
      const ws = new WebSocket('wss://open-api-ws.bingx.com/market')
      bingxWs = ws
      ws.onopen = () => {
        bxD = 1000
        setBingX({ price: null, connected: true })
        ws.send(JSON.stringify({ id: Math.random().toString(36).slice(2), reqType: 'sub', dataType: `${bxSym}@lastPrice` }))
      }
      ws.onmessage = async (e) => {
        try {
          let text: string
          if (e.data instanceof Blob) {
            const buf = await e.data.arrayBuffer()
            const ds  = new DecompressionStream('gzip')
            const writer = ds.writable.getWriter()
            writer.write(new Uint8Array(buf)); writer.close()
            text = await new Response(ds.readable).text()
          } else { text = e.data as string }
          const d = JSON.parse(text)
          if (d.ping) { ws.send(JSON.stringify({ pong: d.ping })); return }
          const raw = d.data?.lastPrice ?? d.lastPrice ?? d.data?.c ?? d.c
          const price = raw ? parseFloat(raw) : null
          if (price != null && !isNaN(price) && price > 0) setBingX({ price, connected: true })
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        setBingX(prev => ({ ...prev, connected: false }))
        if (!cancelled) { bxT = setTimeout(connectBingX, bxD); bxD = Math.min(bxD * 2, 30_000) }
      }
    }

    connectBinance(); connectBybit(); connectGate(); connectBingX()

    return () => {
      cancelled = true
      ;[bT, byT, gT, bxT].forEach(t => t && clearTimeout(t))
      binanceWs?.close(); bybitWs?.close(); gateWs?.close(); bingxWs?.close()
    }
  }, [symbol, supported, base])

  const prices = [binance.price, bybit.price, gate.price, bingx.price]
    .filter((p): p is number => p !== null)
  const composite = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null

  return { binance, bybit, gate, bingx, composite, supported }
}
