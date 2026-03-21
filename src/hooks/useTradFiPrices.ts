import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import type { ExchangePrice } from './useCexPrices'

interface TradFiSymbols {
  gate?:     string  // Gate.io futures
  binanceF?: string  // Binance futures (lowercase symbol)
  okx?:      string  // OKX perpetual swap (instId)
}

// Pyth symbol → per-exchange symbol mappings
const TRADFI_MAP: Record<string, TradFiSymbols> = {
  'XAU/USD':   { gate: 'XAU_USDT',    binanceF: 'xauusdt',  okx: 'XAU-USDT-SWAP' },
  'XAG/USD':   { gate: 'XAG_USDT',    binanceF: 'xagusdt',  okx: 'XAG-USDT-SWAP' },
  'WTI/USD':   { okx: 'CL-USDT-SWAP' },
  'EUR/USD':   { gate: 'EURUSD_USDT' },
  'GBP/USD':   { gate: 'GBPUSD_USDT' },
  'AAPL/USD':  { gate: 'AAPLX_USDT',  okx: 'AAPL-USDT-SWAP' },
  'MSFT/USD':  { gate: 'MSFT_USDT',   okx: 'MSFT-USDT-SWAP' },
  'NVDA/USD':  { gate: 'NVDAX_USDT',  okx: 'NVDA-USDT-SWAP' },
  'TSLA/USD':  { gate: 'TSLAX_USDT',  binanceF: 'tslausdt', okx: 'TSLA-USDT-SWAP' },
  'AMZN/USD':  { gate: 'AMZNX_USDT',  binanceF: 'amznusdt', okx: 'AMZN-USDT-SWAP' },
  'GOOGL/USD': { gate: 'GOOGLX_USDT', okx: 'GOOGL-USDT-SWAP' },
  'META/USD':  { gate: 'METAX_USDT',  okx: 'META-USDT-SWAP' },
}

export interface TradFiPrices {
  gate:      ExchangePrice
  binanceF:  ExchangePrice
  okx:       ExchangePrice
  composite: number | null
  supported: boolean
  // which exchanges actually cover this symbol
  has: { gate: boolean; binanceF: boolean; okx: boolean }
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

// ── OKX perpetual swaps ────────────────────────────────────────────────────────
function makeOkxWs(
  instId: string,
  setState: React.Dispatch<React.SetStateAction<ExchangePrice>>,
): WebSocket {
  const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')
  ws.onopen = () => {
    setState({ price: null, connected: true })
    ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId }] }))
  }
  ws.onmessage = (e) => {
    try {
      const d = JSON.parse(e.data as string)
      const price = d.data?.[0]?.last ? parseFloat(d.data[0].last) : null
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
  const [okx,      setOkx]      = useState<ExchangePrice>(EMPTY)
  const refs = useRef<WebSocket[]>([])

  useEffect(() => {
    refs.current.forEach(ws => ws.close())
    refs.current = []

    if (!syms) return

    if (syms.gate)     refs.current.push(makeGateFutWs   (syms.gate,     setGate))
    if (syms.binanceF) refs.current.push(makeBinanceFutWs(syms.binanceF, setBinanceF))
    if (syms.okx)      refs.current.push(makeOkxWs       (syms.okx,      setOkx))

    return () => { refs.current.forEach(ws => ws.close()) }
  }, [symbol, supported]) // eslint-disable-line react-hooks/exhaustive-deps

  const prices = [gate.price, binanceF.price, okx.price]
    .filter((p): p is number => p !== null)
  const composite = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null

  return {
    gate, binanceF, okx, composite, supported,
    has: {
      gate:     !!syms?.gate,
      binanceF: !!syms?.binanceF,
      okx:      !!syms?.okx,
    },
  }
}
