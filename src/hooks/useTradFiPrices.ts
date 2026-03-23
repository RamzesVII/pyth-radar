import { useEffect, useState } from 'react'
import type { ExchangePrice } from './useCexPrices'

interface TradFiSymbols {
  gate?:     string  // Gate.io futures
  binanceF?: string  // Binance futures (lowercase symbol)
  okx?:      string  // OKX perpetual swap (instId)
  bitfinex?: string  // Bitfinex ticker symbol (e.g. "tEURUSD")
}

// Pyth symbol → per-exchange symbol mappings
const TRADFI_MAP: Record<string, TradFiSymbols> = {
  'XAU/USD':   { gate: 'XAU_USDT',    binanceF: 'xauusdt',  okx: 'XAU-USDT-SWAP' },
  'XAG/USD':   { gate: 'XAG_USDT',    binanceF: 'xagusdt',  okx: 'XAG-USDT-SWAP' },
  'WTI/USD':   { okx: 'CL-USDT-SWAP' },
  'EUR/USD':   { gate: 'EURUSD_USDT', bitfinex: 'tEURUSD' },
  'GBP/USD':   { gate: 'GBPUSD_USDT', bitfinex: 'tGBPUSD' },
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
  bitfinex:  ExchangePrice
  composite: number | null
  supported: boolean
  has: { gate: boolean; binanceF: boolean; okx: boolean; bitfinex: boolean }
}

const EMPTY: ExchangePrice = { price: null, connected: false }

export function useTradFiPrices(symbol: string): TradFiPrices {
  const syms      = TRADFI_MAP[symbol]
  const supported = !!syms

  const [gate,     setGate]     = useState<ExchangePrice>(EMPTY)
  const [binanceF, setBinanceF] = useState<ExchangePrice>(EMPTY)
  const [okx,      setOkx]      = useState<ExchangePrice>(EMPTY)
  const [bitfinex, setBitfinex] = useState<ExchangePrice>(EMPTY)

  useEffect(() => {
    if (!syms) return

    let cancelled = false
    let gateWs:     WebSocket | null = null
    let binanceFWs: WebSocket | null = null
    let okxWs:      WebSocket | null = null
    let bitfinexWs: WebSocket | null = null
    let gD = 1000, bD = 1000, oD = 1000, fD = 1000
    let gT: ReturnType<typeof setTimeout> | null = null
    let bT: ReturnType<typeof setTimeout> | null = null
    let oT: ReturnType<typeof setTimeout> | null = null
    let fT: ReturnType<typeof setTimeout> | null = null

    const connectGate = (sym: string) => {
      const ws = new WebSocket('wss://fx-ws.gateio.ws/v4/ws/usdt')
      gateWs = ws
      ws.onopen = () => {
        gD = 1000
        setGate({ price: null, connected: true })
        ws.send(JSON.stringify({ time: Math.floor(Date.now() / 1000), channel: 'futures.tickers', event: 'subscribe', payload: [sym] }))
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          const item = Array.isArray(d.result) ? d.result[0] : d.result
          const price = item?.last ? parseFloat(item.last) : null
          if (price != null && !isNaN(price) && price > 0) setGate({ price, connected: true })
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        setGate(prev => ({ ...prev, connected: false }))
        if (!cancelled) { gT = setTimeout(() => connectGate(sym), gD); gD = Math.min(gD * 2, 30_000) }
      }
    }

    const connectBinanceF = (sym: string) => {
      const ws = new WebSocket(`wss://fstream.binance.com/ws/${sym}@ticker`)
      binanceFWs = ws
      ws.onopen = () => { bD = 1000; setBinanceF({ price: null, connected: true }) }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data)
          const price = d.c ? parseFloat(d.c) : null
          if (price != null && !isNaN(price) && price > 0) setBinanceF({ price, connected: true })
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        setBinanceF(prev => ({ ...prev, connected: false }))
        if (!cancelled) { bT = setTimeout(() => connectBinanceF(sym), bD); bD = Math.min(bD * 2, 30_000) }
      }
    }

    const connectOkx = (instId: string) => {
      const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public')
      okxWs = ws
      ws.onopen = () => {
        oD = 1000
        setOkx({ price: null, connected: true })
        ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId }] }))
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string)
          const price = d.data?.[0]?.last ? parseFloat(d.data[0].last) : null
          if (price != null && !isNaN(price) && price > 0) setOkx({ price, connected: true })
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        setOkx(prev => ({ ...prev, connected: false }))
        if (!cancelled) { oT = setTimeout(() => connectOkx(instId), oD); oD = Math.min(oD * 2, 30_000) }
      }
    }

    const connectBitfinex = (sym: string) => {
      const ws = new WebSocket('wss://api-pub.bitfinex.com/ws/2')
      bitfinexWs = ws
      ws.onopen = () => {
        fD = 1000
        setBitfinex({ price: null, connected: true })
        ws.send(JSON.stringify({ event: 'subscribe', channel: 'ticker', symbol: sym }))
      }
      ws.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string)
          if (d.event === 'subscribed') return
          // [chanId, [bid,bidSz,ask,askSz,chg,chgPct,LAST,vol,hi,lo]] or [chanId, "hb"]
          if (Array.isArray(d) && typeof d[0] === 'number' && Array.isArray(d[1]) && d[1].length >= 7) {
            const price = parseFloat(d[1][6])
            if (!isNaN(price) && price > 0) setBitfinex({ price, connected: true })
          }
        } catch { /* ignore */ }
      }
      ws.onerror = () => ws.close()
      ws.onclose = () => {
        setBitfinex(prev => ({ ...prev, connected: false }))
        if (!cancelled) { fT = setTimeout(() => connectBitfinex(sym), fD); fD = Math.min(fD * 2, 30_000) }
      }
    }

    if (syms.gate)     connectGate(syms.gate)
    if (syms.binanceF) connectBinanceF(syms.binanceF)
    if (syms.okx)      connectOkx(syms.okx)
    if (syms.bitfinex) connectBitfinex(syms.bitfinex)

    return () => {
      cancelled = true
      ;[gT, bT, oT, fT].forEach(t => t && clearTimeout(t))
      gateWs?.close(); binanceFWs?.close(); okxWs?.close(); bitfinexWs?.close()
    }
  }, [symbol, supported]) // eslint-disable-line react-hooks/exhaustive-deps

  const prices = [gate.price, binanceF.price, okx.price, bitfinex.price]
    .filter((p): p is number => p !== null)
  const composite = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : null

  return {
    gate, binanceF, okx, bitfinex, composite, supported,
    has: { gate: !!syms?.gate, binanceF: !!syms?.binanceF, okx: !!syms?.okx, bitfinex: !!syms?.bitfinex },
  }
}
