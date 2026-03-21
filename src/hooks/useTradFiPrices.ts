import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { ExchangePrice } from './useCexPrices'

interface TradFiSymbols {
  gate?:     string  // Gate.io futures
  binanceF?: string  // Binance futures (lowercase symbol)
  bingx?:    string  // BingX perpetual
}

// Pyth symbol → per-exchange symbol mappings
const TRADFI_MAP: Record<string, TradFiSymbols> = {
  'XAU/USD':   { gate: 'XAU_USDT',    binanceF: 'xauusdt',  bingx: 'NCCOGOLD2USD-USDT' },
  'XAG/USD':   { gate: 'XAG_USDT',    binanceF: 'xagusdt',  bingx: 'NCCOXAG2USD-USDT' },
  'EUR/USD':   { gate: 'EURUSD_USDT' },
  'GBP/USD':   { gate: 'GBPUSD_USDT' },
  // BRENT/WTI: BingX commodity WS not supported (100400), no reliable real-time source
  'AAPL/USD':  { gate: 'AAPLX_USDT',  bingx: 'AAPLX-USDT' },
  'MSFT/USD':  { gate: 'MSFT_USDT' },
  'NVDA/USD':  { gate: 'NVDAX_USDT',  bingx: 'NVDAX-USDT' },
  'TSLA/USD':  { gate: 'TSLAX_USDT',  binanceF: 'tslausdt', bingx: 'NCSKTSLA2USD-USDT' },
  'AMZN/USD':  { gate: 'AMZNX_USDT',  binanceF: 'amznusdt' },
  'GOOGL/USD': { gate: 'GOOGLX_USDT' },
  'META/USD':  { gate: 'METAX_USDT',  bingx: 'METAX-USDT' },
}

export interface TradFiPrices {
  gate:      ExchangePrice
  binanceF:  ExchangePrice
  bingx:     ExchangePrice
  composite: number | null
  supported: boolean
  // which exchanges actually cover this symbol
  has: { gate: boolean; binanceF: boolean; bingx: boolean }
}

// ── Gate.io futures ───────────────────────────────────────────────────────────
function makeGateFutWs(
  symbol: string,
  setState: React.Dispatch<React.SetStateAction<ExchangePrice>>,
): WebSocket {
  const ws = new WebSocket('wss://fx-ws.gateio.ws/v4/ws/usdt')
  ws.onopen = () => {
    setState({ price: null, connected: true })
    ws.send(JSON.stringify({
      time:    Math.floor(Date.now() / 1000),
      channel: 'futures.tickers',
      event:   'subscribe',
      payload: [symbol],
    }))
  }
  ws.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data)
      const item  = Array.isArray(d.result) ? d.result[0] : d.result
      const price = item?.last ? parseFloat(item.last) : null
      if (price != null && !isNaN(price) && price > 0) setState({ price, connected: true })
    } catch { /* ignore */ }
  }
  ws.onerror = () => ws.close()
  ws.onclose = () => setState(prev => ({ ...prev, connected: false }))
  return ws
}

// ── Binance futures ───────────────────────────────────────────────────────────
function makeBinanceFutWs(
  symbol: string,
  setState: React.Dispatch<React.SetStateAction<ExchangePrice>>,
): WebSocket {
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol}@ticker`)
  ws.onopen = () => setState({ price: null, connected: true })
  ws.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data)
      const price = d.c ? parseFloat(d.c) : null
      if (price != null && !isNaN(price) && price > 0) setState({ price, connected: true })
    } catch { /* ignore */ }
  }
  ws.onerror = () => ws.close()
  ws.onclose = () => setState(prev => ({ ...prev, connected: false }))
  return ws
}

// ── BingX (GZIP-compressed messages) ─────────────────────────────────────────
function makeBingXWs(
  symbol: string,
  setState: React.Dispatch<React.SetStateAction<ExchangePrice>>,
): WebSocket {
  const ws = new WebSocket('wss://open-api-ws.bingx.com/market')
  ws.onopen = () => {
    setState({ price: null, connected: true })
    ws.send(JSON.stringify({
      id:       Math.random().toString(36).slice(2),
      reqType:  'sub',
      dataType: `${symbol}@lastPrice`,
    }))
  }
  ws.onmessage = async (e) => {
    try {
      let text: string
      if (e.data instanceof Blob) {
        const buf = await e.data.arrayBuffer()
        const ds  = new DecompressionStream('gzip')
        const writer = ds.writable.getWriter()
        writer.write(new Uint8Array(buf))
        writer.close()
        text = await new Response(ds.readable).text()
      } else {
        text = e.data as string
      }
      const d = JSON.parse(text)
      // respond to keepalive ping
      if (d.ping) { ws.send(JSON.stringify({ pong: d.ping })); return }
      // price can be nested or at root depending on stream type
      const raw = d.data?.lastPrice ?? d.lastPrice ?? d.data?.c ?? d.c
      const price = raw ? parseFloat(raw) : null
      if (price != null && !isNaN(price) && price > 0) setState({ price, connected: true })
    } catch { /* ignore */ }
  }
  ws.onerror = () => ws.close()
  ws.onclose = () => setState(prev => ({ ...prev, connected: false }))
  return ws
}

const EMPTY: ExchangePrice = { price: null, connected: false }

export function useTradFiPrices(symbol: string): TradFiPrices {
  const syms      = TRADFI_MAP[symbol]
  const supported = !!syms

  const [gate,     setGate]     = useState<ExchangePrice>(EMPTY)
  const [binanceF, setBinanceF] = useState<ExchangePrice>(EMPTY)
  const [bingx,    setBingX]    = useState<ExchangePrice>(EMPTY)
  const refs = useRef<WebSocket[]>([])

  useEffect(() => {
    refs.current.forEach(ws => ws.close())
    refs.current = []

    if (!syms) return

    if (syms.gate)     refs.current.push(makeGateFutWs   (syms.gate,     setGate))
    if (syms.binanceF) refs.current.push(makeBinanceFutWs(syms.binanceF, setBinanceF))
    if (syms.bingx)    refs.current.push(makeBingXWs     (syms.bingx,    setBingX))

    return () => { refs.current.forEach(ws => ws.close()) }
  }, [symbol, supported]) // eslint-disable-line react-hooks/exhaustive-deps

  const prices = [gate.price, binanceF.price, bingx.price]
    .filter((p): p is number => p !== null)
  const composite = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null

  return {
    gate, binanceF, bingx, composite, supported,
    has: {
      gate:     !!syms?.gate,
      binanceF: !!syms?.binanceF,
      bingx:    !!syms?.bingx,
    },
  }
}
