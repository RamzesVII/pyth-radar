# Pyth Radar

**Pyth is the benchmark. The market is the variable.**

Pyth aggregates prices from institutional providers — Citadel, Jane Street, Jump Trading. When a CEX diverges from Pyth, it's a signal: arbitrage opportunity, liquidation hunt, latency lag, or manipulation.

Pyth Radar makes that signal visible in real time across 50+ assets: crypto, forex, commodities, and equities.

Built for the [Pyth Community Hackathon 2026](https://dev-forum.pyth.network/t/pyth-community-hackathon/548).

**Target audience:** HFT traders, arbitrageurs, DeFi risk managers, oracle researchers.

---

## Three screens

### 1. Fear Index
A 0–100 oracle stress score computed from Pyth confidence interval widths across all tracked assets vs historical baselines. One number answers: *is the benchmark under stress right now?*

### 2. Confidence Heatmap
A visual grid of 50+ assets colored by CI stress level — green (calm) to red (critical). Tabs: Crypto / Forex / Commodities / Equities. Click any asset to inspect the divergence.

### 3. Pyth Delta
Per-asset view: Pyth benchmark price vs composite of 4 exchanges (Binance, Bybit, Gate.io, MEXC). Shows *how much the market deviates from the institutional reference* — live delta %, CI band overlay, divergence event log.

---

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- TradingView Lightweight Charts
- Pyth Hermes WebSocket (`wss://hermes.pyth.network/ws`)
- Pyth Benchmarks API (historical baselines)

## Run locally

```bash
npm install
npm run dev
```
