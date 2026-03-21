# Pyth Radar

**Oracle health intelligence dashboard for Pyth Network.**

Real-time monitoring of oracle stress, confidence interval anomalies, and price divergence across 50+ assets — crypto, forex, commodities, and equities.

Built for the [Pyth Community Hackathon 2026](https://dev-forum.pyth.network/t/pyth-community-hackathon/548).

---

## Three screens

### 1. Fear Index
A 0–100 oracle stress score computed from confidence interval widths across all tracked assets relative to their historical averages. One number that tells you if the oracle network is under stress.

### 2. Confidence Heatmap
A visual grid of 50+ Pyth assets colored by CI stress level. Green = calm, red = critical. One glance shows where stress is concentrated — click any asset to drill down.

### 3. Pyth Delta
Per-asset comparison of the Pyth oracle price vs a composite price from 4 major exchanges (Binance, Bybit, Gate.io, MEXC) in real time. Detects divergence events with configurable thresholds.

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
