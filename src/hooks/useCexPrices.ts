import { useEffect, useRef, useState } from 'react'
import React from 'react'

export interface ExchangePrice {
  price: number | null
  connected: boolean
}

export interface CexPrices {
  binance: ExchangePrice
  bybit:   ExchangePrice
  gate:    ExchangePrice
  mexc:    ExchangePrice
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
  'JUP/USD': 'JUP', 'PYTH/USD': 'PYTH',
}

function makeWs(
  url: string,
  onOpen: (ws: WebSocket) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPrice: (data: any) => number | null,
  setState: React.Dispatch<React.SetStateAction<ExchangePrice>>,
): WebSocket {
  const ws = new WebSocket(url)
  ws.onopen = () => {
    setState({ price: null, connected: true })
    onOpen(ws)
  }
  ws.onmessage = (e) => {
    try {
      const price = onPrice(JSON.parse(e.data))
      if (price != null && !isNaN(price) && price > 0) {
        setState({ price, connected: true })
      }
    } catch { /* ignore */ }
  }
  ws.onerror = () => { ws.close() }
  ws.onclose = () => setState(prev => ({ ...prev, connected: false }))
  return ws
}

export function useCexPrices(symbol: string): CexPrices {
  const base = CEX_SUPPORTED[symbol]
  const supported = !!base

  const [binance, setBinance] = useState<ExchangePrice>({ price: null, connected: false })
  const [bybit,   setBybit]   = useState<ExchangePrice>({ price: null, connected: false })
  const [gate,    setGate]    = useState<ExchangePrice>({ price: null, connected: false })
  const [mexc,    setMexc]    = useState<ExchangePrice>({ price: null, connected: false })
  const refs = useRef<WebSocket[]>([])

  useEffect(() => {
    refs.current.forEach(ws => ws.close())
    refs.current = []
    setBinance({ price: null, connected: false })
    setBybit({ price: null, connected: false })
    setGate({ price: null, connected: false })
    setMexc({ price: null, connected: false })

    if (!supported || !base) return

    const sym   = `${base}USDT`
    const symLo = sym.toLowerCase()
    const gSym  = `${base}_USDT`

    // Binance
    refs.current.push(makeWs(
      `wss://stream.binance.com/ws/${symLo}@ticker`,
      () => {},
      (d) => d.c ? parseFloat(d.c) : null,
      setBinance,
    ))

    // Bybit
    refs.current.push(makeWs(
      'wss://stream.bybit.com/v5/public/spot',
      (ws) => ws.send(JSON.stringify({ op: 'subscribe', args: [`tickers.${sym}`] })),
      (d) => d.data?.lastPrice ? parseFloat(d.data.lastPrice) : null,
      setBybit,
    ))

    // Gate.io
    refs.current.push(makeWs(
      'wss://api.gateio.ws/ws/v4/',
      (ws) => ws.send(JSON.stringify({
        time: Math.floor(Date.now() / 1000),
        channel: 'spot.tickers',
        event: 'subscribe',
        payload: [gSym],
      })),
      (d) => d.result?.last ? parseFloat(d.result.last) : null,
      setGate,
    ))

    // MEXC
    refs.current.push(makeWs(
      'wss://wbs.mexc.com/ws',
      (ws) => ws.send(JSON.stringify({
        method: 'SUBSCRIPTION',
        params: [`spot@public.miniTicker.v3.api@${sym}`],
      })),
      (d) => d.d?.p ? parseFloat(d.d.p) : null,
      setMexc,
    ))

    return () => { refs.current.forEach(ws => ws.close()) }
  }, [symbol, supported, base])

  const prices = [binance.price, bybit.price, gate.price, mexc.price]
    .filter((p): p is number => p !== null)
  const composite = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null

  return { binance, bybit, gate, mexc, composite, supported }
}
