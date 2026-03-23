import { useEffect, useRef, useState } from 'react'
import {
  createChart, BaselineSeries, LineSeries, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp, type IPriceLine,
} from 'lightweight-charts'
import { FEED_CATEGORY } from '../hooks/usePythPrices'
import type { PythPrice } from '../hooks/usePythPrices'
import { useCexPrices } from '../hooks/useCexPrices'
import { useTradFiPrices } from '../hooks/useTradFiPrices'

interface Props {
  asset:          string
  prices:         Record<string, PythPrice>
  pythConnected:  boolean
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d })
}

function fmtPrice(n: number) {
  const d = n >= 1000 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 6 : 8
  return n.toLocaleString('en', { minimumFractionDigits: d, maximumFractionDigits: d })
}

// ─── Main composite chart ────────────────────────────────────────────────────

interface MainChartProps {
  composite: number | null
  pythPrice: number | null
  ciPct:     number | null
}

function MainChart({ composite, pythPrice, ciPct }: MainChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Baseline'> | null>(null)
  const upperRef     = useRef<IPriceLine | null>(null)
  const lowerRef     = useRef<IPriceLine | null>(null)
  const dataRef      = useRef<{ time: UTCTimestamp; value: number }[]>([])

  const delta = composite != null && pythPrice != null
    ? ((composite - pythPrice) / pythPrice) * 100
    : null

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 200,
      layout: {
        background: { color: 'transparent' },
        textColor: '#64748b',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30,41,59,0.5)' },
        horzLines: { color: 'rgba(30,41,59,0.5)' },
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
      handleScroll: false,
      handleScale: false,
    })

    // Composite delta as baseline series (red above 0, green below 0)
    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: 0 },
      topFillColor1:    'rgba(34,197,94,0.18)',
      topFillColor2:    'rgba(34,197,94,0.03)',
      topLineColor:     '#22c55e',
      bottomFillColor1: 'rgba(239,68,68,0.03)',
      bottomFillColor2: 'rgba(239,68,68,0.18)',
      bottomLineColor:  '#ef4444',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // Zero = Pyth benchmark
    series.createPriceLine({
      price: 0,
      color: '#7c3aed',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Pyth',
    })

    chartRef.current  = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      upperRef.current  = null
      lowerRef.current  = null
    }
  }, [])

  // Update CI band lines
  useEffect(() => {
    const series = seriesRef.current
    if (!series || ciPct == null) return
    if (upperRef.current) series.removePriceLine(upperRef.current)
    if (lowerRef.current) series.removePriceLine(lowerRef.current)
    upperRef.current = series.createPriceLine({
      price: ciPct,
      color: 'rgba(245,158,11,0.6)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '+CI',
    })
    lowerRef.current = series.createPriceLine({
      price: -ciPct,
      color: 'rgba(245,158,11,0.6)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '-CI',
    })
  }, [ciPct])

  // Stream data
  useEffect(() => {
    if (delta == null || !seriesRef.current) return
    const now   = Math.floor(Date.now() / 1000) as UTCTimestamp
    const point = { time: now, value: delta }
    const data  = dataRef.current
    if (data.length > 0 && data[data.length - 1].time === now) {
      data[data.length - 1] = point
      seriesRef.current.update(point)
    } else {
      data.push(point)
      if (data.length > 300) {
        data.shift()
        seriesRef.current.setData([...data])
      } else {
        seriesRef.current.update(point)
      }
    }
  }, [delta])

  return <div ref={containerRef} />
}

// ─── Exchange sparkline row ───────────────────────────────────────────────────

interface SparklineProps {
  label:     string
  price:     number | null
  pythPrice: number | null
  ciPct:     number | null
  connected: boolean
}

function SparklineRow({ label, price, pythPrice, ciPct, connected }: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Line'> | null>(null)
  const upperRef     = useRef<IPriceLine | null>(null)
  const lowerRef     = useRef<IPriceLine | null>(null)
  const dataRef      = useRef<{ time: UTCTimestamp; value: number }[]>([])

  const delta     = price != null && pythPrice != null
    ? ((price - pythPrice) / pythPrice) * 100
    : null
  const isOutside = delta != null && ciPct != null && Math.abs(delta) > ciPct

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 52,
      layout: { background: { color: 'transparent' }, textColor: 'transparent' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale:  { visible: false },
      timeScale:       { visible: false },
      crosshair:       { mode: 0 },
      handleScroll: false,
      handleScale:  false,
    })

    const series = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    series.createPriceLine({
      price: 0,
      color: 'rgba(124,58,237,0.4)',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: false,
      title: '',
    })

    chartRef.current  = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      upperRef.current  = null
      lowerRef.current  = null
    }
  }, [])

  useEffect(() => {
    const series = seriesRef.current
    if (!series || ciPct == null) return
    if (upperRef.current) series.removePriceLine(upperRef.current)
    if (lowerRef.current) series.removePriceLine(lowerRef.current)
    upperRef.current = series.createPriceLine({
      price: ciPct,
      color: 'rgba(245,158,11,0.35)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    })
    lowerRef.current = series.createPriceLine({
      price: -ciPct,
      color: 'rgba(245,158,11,0.35)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    })
  }, [ciPct])

  useEffect(() => {
    if (delta == null || !seriesRef.current) return
    const now   = Math.floor(Date.now() / 1000) as UTCTimestamp
    const point = { time: now, value: delta }
    const data  = dataRef.current
    if (data.length > 0 && data[data.length - 1].time === now) {
      data[data.length - 1] = point
      seriesRef.current.update(point)
    } else {
      data.push(point)
      if (data.length > 300) {
        data.shift()
        seriesRef.current.setData([...data])
      } else {
        seriesRef.current.update(point)
      }
    }
  }, [delta])

  const deltaColor = delta == null ? 'text-slate-600'
    : isOutside
      ? delta > 0 ? 'text-emerald-400' : 'text-red-400'
      : 'text-slate-300'

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800/40 last:border-0">
      {/* Label */}
      <div className="flex items-center gap-2 w-28 flex-shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
          style={connected ? { boxShadow: '0 0 5px rgba(52,211,153,0.7)' } : {}}
        />
        <span className="text-slate-400 text-sm">{label}</span>
      </div>

      {/* Sparkline */}
      <div ref={containerRef} className="flex-1 min-w-0" />

      {/* Value + badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {delta != null ? (
          <>
            <span className={`text-sm font-mono tabular-nums w-[4.5rem] text-right ${deltaColor}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(4)}%
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium leading-none ${
              isOutside
                ? 'bg-orange-500/15 border border-orange-500/30 text-orange-400'
                : 'bg-slate-700/40 border border-slate-600/30 text-slate-500'
            }`}>
              {isOutside ? 'OUT' : 'IN'}
            </span>
          </>
        ) : (
          <span className="text-slate-700 text-xs w-[6rem] text-right">
            {connected ? 'loading…' : 'connecting…'}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Full exchange chart (compare mode) ──────────────────────────────────────

function ExchangeChart({ label, price, pythPrice, ciPct, connected }: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Line'> | null>(null)
  const upperRef     = useRef<IPriceLine | null>(null)
  const lowerRef     = useRef<IPriceLine | null>(null)
  const dataRef      = useRef<{ time: UTCTimestamp; value: number }[]>([])

  const delta     = price != null && pythPrice != null
    ? ((price - pythPrice) / pythPrice) * 100
    : null
  const isOutside = delta != null && ciPct != null && Math.abs(delta) > ciPct

  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 130,
      layout: {
        background: { color: 'transparent' },
        textColor: '#64748b',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(30,41,59,0.4)' },
        horzLines: { color: 'rgba(30,41,59,0.4)' },
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: { top: 0.25, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
      handleScroll: false,
      handleScale: false,
    })

    const series = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    })

    series.createPriceLine({
      price: 0,
      color: '#7c3aed',
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: '',
    })

    chartRef.current  = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
      upperRef.current  = null
      lowerRef.current  = null
    }
  }, [])

  useEffect(() => {
    const series = seriesRef.current
    if (!series || ciPct == null) return
    if (upperRef.current) series.removePriceLine(upperRef.current)
    if (lowerRef.current) series.removePriceLine(lowerRef.current)
    upperRef.current = series.createPriceLine({
      price: ciPct,
      color: 'rgba(245,158,11,0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    })
    lowerRef.current = series.createPriceLine({
      price: -ciPct,
      color: 'rgba(245,158,11,0.5)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: '',
    })
  }, [ciPct])

  useEffect(() => {
    if (delta == null || !seriesRef.current) return
    const now   = Math.floor(Date.now() / 1000) as UTCTimestamp
    const point = { time: now, value: delta }
    const data  = dataRef.current
    if (data.length > 0 && data[data.length - 1].time === now) {
      data[data.length - 1] = point
      seriesRef.current.update(point)
    } else {
      data.push(point)
      if (data.length > 300) {
        data.shift()
        seriesRef.current.setData([...data])
      } else {
        seriesRef.current.update(point)
      }
    }
  }, [delta])

  const deltaColor = delta == null ? 'text-slate-600'
    : isOutside
      ? delta > 0 ? 'text-emerald-400' : 'text-red-400'
      : 'text-slate-300'

  return (
    <div className="glass mb-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-green-400' : 'bg-slate-600'}`}
            style={connected ? { boxShadow: '0 0 5px rgba(52,211,153,0.7)' } : {}}
          />
          <span className="text-slate-300 text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-4">
          {price != null && (
            <span className="text-slate-500 text-xs font-mono">
              ${fmtPrice(price)}
            </span>
          )}
          {delta != null ? (
            <span className={`text-sm font-mono font-medium tabular-nums ${deltaColor}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(4)}%
            </span>
          ) : (
            <span className="text-slate-600 text-xs">{connected ? 'loading…' : 'connecting…'}</span>
          )}
        </div>
      </div>
      <div ref={containerRef} />
    </div>
  )
}

// ─── Divergence events log ────────────────────────────────────────────────────

interface DivergenceEvent {
  id:       number
  time:     number   // epoch ms
  exchange: string
  delta:    number
  type:     'out' | 'in'  // crossed outside CI or returned inside
}

function DivergenceLog({ events }: { events: DivergenceEvent[] }) {
  return (
    <div className="glass p-4 mb-4">
      <p className="text-slate-400 text-xs uppercase tracking-widest font-medium mb-3">Divergence Log</p>
      {events.length === 0 ? (
        <p className="text-slate-700 text-sm text-center py-4">No CI crossings yet · monitoring…</p>
      ) : (
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {events.map(ev => {
            const timeStr = new Date(ev.time).toTimeString().slice(0, 8)
            const isOut   = ev.type === 'out'
            return (
              <div key={ev.id} className="flex items-center gap-3 py-1 text-xs font-mono">
                <span className="text-slate-600 w-16 flex-shrink-0">{timeStr}</span>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOut ? 'bg-orange-400' : 'bg-emerald-400'}`} />
                <span className="text-slate-400 flex-1">{ev.exchange}</span>
                <span className={`tabular-nums font-medium ${isOut ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {ev.delta > 0 ? '+' : ''}{ev.delta.toFixed(4)}%
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  isOut
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  {isOut ? '→ OUT' : '→ IN'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Delta screen ─────────────────────────────────────────────────────────────

export default function Delta({ asset, prices, pythConnected }: Props) {
  const cex    = useCexPrices(asset)
  const tradfi = useTradFiPrices(asset)
  const p      = prices[asset]

  const category = FEED_CATEGORY[asset] ?? 'Crypto'
  const isCrypto = category === 'Crypto'

  const composite      = isCrypto ? cex.composite : tradfi.composite
  const compositeDelta = p && composite != null
    ? ((composite - p.price) / p.price) * 100
    : null

  const ciPct    = p ? (p.conf / p.price) * 100 : null
  const withinCI = compositeDelta != null && ciPct != null && Math.abs(compositeDelta) < ciPct

  const showCrypto = isCrypto && cex.supported
  const showTradFi = !isCrypto && tradfi.supported

  const [compareMode, setCompareMode] = useState(false)
  const [events,      setEvents]      = useState<DivergenceEvent[]>([])
  const prevOutside = useRef<Record<string, boolean>>({})
  const eventId     = useRef(0)

  const pythPrice = p?.price ?? null

  useEffect(() => {
    if (pythPrice == null || ciPct == null) return

    const toCheck: Array<{ key: string; price: number | null }> = isCrypto
      ? [
          { key: 'Composite',     price: composite },
          { key: 'Binance',       price: cex.binance.price },
          { key: 'Bybit',         price: cex.bybit.price },
          { key: 'Gate.io',       price: cex.gate.price },
          { key: 'OKX',           price: cex.okx.price },
        ]
      : [
          { key: 'Composite',       price: composite },
          { key: 'Gate.io',         price: tradfi.gate.price },
          { key: 'Binance Futures', price: tradfi.binanceF.price },
          { key: 'OKX',             price: tradfi.okx.price },
        ]

    const newEvents: DivergenceEvent[] = []
    for (const { key, price: px } of toCheck) {
      if (px == null) continue
      const d     = ((px - pythPrice) / pythPrice) * 100
      const isOut = Math.abs(d) > ciPct
      const prev  = prevOutside.current[key]
      if (prev !== undefined && prev !== isOut) {
        newEvents.push({ id: ++eventId.current, time: Date.now(), exchange: key, delta: d, type: isOut ? 'out' : 'in' })
      }
      prevOutside.current[key] = isOut
    }
    if (newEvents.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEvents(prev => [...newEvents, ...prev].slice(0, 50))
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    pythPrice, ciPct,
    composite,
    cex.binance.price, cex.bybit.price, cex.gate.price, cex.okx.price,
    tradfi.gate.price, tradfi.binanceF.price, tradfi.okx.price,
  ])

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-10">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">
              Pyth Delta — <span className="text-purple-400">{asset}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Pyth benchmark vs market prices · real-time deviation
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              className={`w-1.5 h-1.5 rounded-full ${pythConnected ? 'bg-green-400' : 'bg-slate-600'}`}
              style={pythConnected ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : {}}
            />
            {pythConnected ? 'Live' : 'Connecting…'}
          </div>
        </div>

        {/* Pyth benchmark card */}
        {p ? (
          <div className="glass-strong glow-purple p-6 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pyth Benchmark Price</p>
                <p className="text-4xl font-bold text-slate-100">${fmtPrice(p.price)}</p>
                <p className="text-slate-500 text-xs mt-2">Institutional aggregate · Citadel, Jane Street, Jump</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Confidence Interval</p>
                <p className="text-xl font-mono text-yellow-400">±${fmt(p.conf)}</p>
                <p className="text-slate-500 text-xs mt-0.5">{ciPct?.toFixed(4)}% of price</p>
              </div>
            </div>

            {compositeDelta != null && (
              <div className="mt-5 pt-5 border-t border-slate-700/50 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-0.5">Market Deviation</p>
                  <p className={`text-2xl font-bold font-mono ${
                    compositeDelta > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {compositeDelta > 0 ? '+' : ''}{compositeDelta.toFixed(4)}%
                  </p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  withinCI
                    ? 'bg-slate-700/40 border-slate-600/40 text-slate-400'
                    : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                }`}>
                  {withinCI ? 'Within CI · likely noise' : 'Outside CI · potential signal'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-strong p-6 mb-4 flex items-center justify-center h-32">
            <p className="text-slate-600 text-sm">Waiting for Pyth data…</p>
          </div>
        )}

        {/* Main composite chart */}
        <div className="glass p-4 mb-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">
              Composite Market Deviation
            </p>
            <p className="text-slate-600 text-xs">
              <span className="text-yellow-500/70">⋯ CI band</span>
              {' · '}
              <span className="text-purple-400/70">— Pyth (0%)</span>
            </p>
          </div>
          {p ? (
            <MainChart
              key={asset}
              composite={composite}
              pythPrice={p.price}
              ciPct={ciPct}
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-slate-700 text-sm">Waiting for Pyth data…</p>
            </div>
          )}
        </div>

        {/* Per-exchange breakdown */}
        {(showCrypto || showTradFi) && p ? (
          <div className={`mb-4 ${compareMode ? '' : 'glass px-4 py-2'}`}>
            {/* Section header with toggle */}
            <div className={`flex items-center justify-between ${compareMode ? 'glass px-4 py-3 mb-2' : 'pt-2 pb-3'}`}>
              <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                Exchange Breakdown
              </p>
              <button
                onClick={() => setCompareMode(m => !m)}
                className={`text-xs px-3 py-1 rounded-lg border transition-all duration-200 ${
                  compareMode
                    ? 'bg-purple-600/30 border-purple-500/40 text-purple-300'
                    : 'border-slate-700/60 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                {compareMode ? '← Overview' : 'Compare ↗'}
              </button>
            </div>

            {/* Sparkline rows (default) */}
            {!compareMode && (
              <>
                {showCrypto && (
                  <>
                    <SparklineRow key={asset + '-binance'} label="Binance" price={cex.binance.price} pythPrice={p.price} ciPct={ciPct} connected={cex.binance.connected} />
                    <SparklineRow key={asset + '-bybit'}   label="Bybit"   price={cex.bybit.price}   pythPrice={p.price} ciPct={ciPct} connected={cex.bybit.connected} />
                    <SparklineRow key={asset + '-gate'}    label="Gate.io" price={cex.gate.price}    pythPrice={p.price} ciPct={ciPct} connected={cex.gate.connected} />
                    <SparklineRow key={asset + '-okx'}   label="OKX"   price={cex.okx.price}   pythPrice={p.price} ciPct={ciPct} connected={cex.okx.connected} />
                  </>
                )}
                {showTradFi && (
                  <>
                    {tradfi.has.gate     && <SparklineRow key={asset + '-gate'}     label="Gate.io"         price={tradfi.gate.price}     pythPrice={p.price} ciPct={ciPct} connected={tradfi.gate.connected} />}
                    {tradfi.has.binanceF && <SparklineRow key={asset + '-binancef'} label="Binance Futures" price={tradfi.binanceF.price} pythPrice={p.price} ciPct={ciPct} connected={tradfi.binanceF.connected} />}
                    {tradfi.has.okx      && <SparklineRow key={asset + '-okx'}      label="OKX"             price={tradfi.okx.price}      pythPrice={p.price} ciPct={ciPct} connected={tradfi.okx.connected} />}
                  </>
                )}

                {/* Composite row */}
                {composite != null && compositeDelta != null && (
                  <div className="flex items-center gap-3 pt-3 mt-1 border-t border-slate-700/60">
                    <span className="text-slate-300 text-sm font-semibold w-28 flex-shrink-0">Composite</span>
                    <div className="flex-1" />
                    <span className="text-slate-300 text-sm font-mono">${fmt(composite)}</span>
                    <span className={`text-sm font-mono font-semibold tabular-nums w-[4.5rem] text-right ${
                      compositeDelta > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {compositeDelta > 0 ? '+' : ''}{compositeDelta.toFixed(4)}%
                    </span>
                    <div className="w-[2.5rem]" />
                  </div>
                )}
              </>
            )}

            {/* Full exchange charts (compare mode) */}
            {compareMode && (
              <>
                {showCrypto && (
                  <>
                    <ExchangeChart key={asset + '-binance'} label="Binance" price={cex.binance.price} pythPrice={p.price} ciPct={ciPct} connected={cex.binance.connected} />
                    <ExchangeChart key={asset + '-bybit'}   label="Bybit"   price={cex.bybit.price}   pythPrice={p.price} ciPct={ciPct} connected={cex.bybit.connected} />
                    <ExchangeChart key={asset + '-gate'}    label="Gate.io" price={cex.gate.price}    pythPrice={p.price} ciPct={ciPct} connected={cex.gate.connected} />
                    <ExchangeChart key={asset + '-okx'}   label="OKX"   price={cex.okx.price}   pythPrice={p.price} ciPct={ciPct} connected={cex.okx.connected} />
                  </>
                )}
                {showTradFi && (
                  <>
                    {tradfi.has.gate     && <ExchangeChart key={asset + '-gate'}     label="Gate.io"         price={tradfi.gate.price}     pythPrice={p.price} ciPct={ciPct} connected={tradfi.gate.connected} />}
                    {tradfi.has.binanceF && <ExchangeChart key={asset + '-binancef'} label="Binance Futures" price={tradfi.binanceF.price} pythPrice={p.price} ciPct={ciPct} connected={tradfi.binanceF.connected} />}
                    {tradfi.has.okx      && <ExchangeChart key={asset + '-okx'}      label="OKX"             price={tradfi.okx.price}      pythPrice={p.price} ciPct={ciPct} connected={tradfi.okx.connected} />}
                  </>
                )}
              </>
            )}

            {/* Market hours note for equities */}
            {category === 'Equities' && (
              <p className="text-slate-600 text-xs mt-3 pt-3 border-t border-slate-800">
                Equity prices update during market hours · Mon–Fri 09:30–16:00 ET
              </p>
            )}
          </div>
        ) : p ? (
          <div className="glass p-6 mb-4">
            <p className="text-slate-600 text-sm">No independent market data available for this asset.</p>
          </div>
        ) : null}

        {/* Divergence log */}
        {(showCrypto || showTradFi) && p && <DivergenceLog events={events} />}

      </div>
    </div>
  )
}
