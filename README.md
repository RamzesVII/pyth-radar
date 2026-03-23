# Pyth Radar

**Pyth is the benchmark. The market is the variable.**

Pyth aggregates prices from institutional providers — Citadel, Jane Street, Jump Trading. When a CEX diverges from Pyth, it's a signal: arbitrage opportunity, liquidation hunt, latency lag, or manipulation.

Pyth Radar makes that signal visible in real time across **30 assets**: crypto, forex, commodities, and equities.

Built for the [Pyth Community Hackathon 2026](https://dev-forum.pyth.network/t/pyth-community-hackathon/548).

**Target audience:** HFT traders, arbitrageurs, DeFi risk managers, oracle researchers.

---

## Three screens

### 1. Deviation Index
A 0–100 oracle stress score computed from Pyth confidence intervals vs real market prices. Broken down by asset class (Crypto / Forex / Commodities / Equities) with top movers. One number answers: *how much is the market diverging from the institutional benchmark right now?*

### 2. Deviation Heatmap
A visual grid of 30 assets colored by deviation magnitude — green (in line) to red (diverging). Border color shows CI stress independently. Tabs: All / Crypto / Forex / Commodities / Equities. Click any asset to inspect.

### 3. Pyth Delta
Per-asset deep dive: Pyth benchmark price vs live exchange prices. Shows delta % per exchange, composite market price, CI band signal (Inside CI = noise / Outside CI = potential signal), divergence event log, sparkline charts per exchange, and compare mode with full chart history.

---

## Exchange coverage

| Exchange | Crypto | Metals | Forex | Oil | Equities |
|---|---|---|---|---|---|
| Binance spot | ✅ | — | — | — | — |
| Bybit spot | ✅ | — | — | — | — |
| Gate.io spot | ✅ (HYPE) | — | — | — | — |
| Gate.io futures | — | ✅ | ✅ | — | ✅ |
| Binance futures | — | ✅ XAU/XAG | — | — | ✅ TSLA/AMZN |
| OKX | ✅ | ✅ XAU/XAG | — | ✅ WTI | — |

**Composite price** = arithmetic mean of all available sources per asset. Metals (XAU/XAG) use 3-source composite for higher confidence.

---

## Asset shortlist (30 total)

- **Crypto (18):** BTC, ETH, SOL, BNB, XRP, ADA, AVAX, DOGE, LINK, LTC, NEAR, APT, ARB, OP, SUI, INJ, PYTH, HYPE
- **Forex (2):** EUR/USD, GBP/USD
- **Commodities (3):** XAU/USD, XAG/USD, WTI/USD
- **Equities (7):** AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META

---

## Notes on data availability

**Equity prices** update only during market trading hours (Mon–Fri 09:30–16:00 ET). Outside those hours, exchange prices may be unavailable or stale — the Delta screen will show no market data until trading resumes.

**Forex and commodities** via exchange futures have limited liquidity compared to institutional FX markets. Gate.io futures are the primary source for EUR/USD and GBP/USD.

**Crypto** data is 24/7 from spot markets.

---

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- TradingView Lightweight Charts v5
- Pyth Hermes WebSocket (`wss://hermes.pyth.network/ws`) — live prices + confidence intervals
- All exchange data via public unauthenticated WebSocket endpoints

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:5173
```

## Build

```bash
npm run build   # TypeScript check + Vite bundle
npm run lint    # ESLint
```
