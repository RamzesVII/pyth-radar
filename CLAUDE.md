# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (localhost:5173)
npm run build     # tsc -b && vite build — always run before calling done
npm run lint      # eslint check
npm run preview   # preview production build locally
```

There are no tests. `npm run build` is the verification step — it runs TypeScript strict checks + Vite bundler.

## TypeScript rules

`verbatimModuleSyntax` is enabled — type-only imports **must** use `import type`:
```ts
import type { ExchangePrice } from './useCexPrices'  // ✓
import { ExchangePrice } from './useCexPrices'        // ✗ build error
```

Strict mode is on: `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`.

## Architecture

**Frontend-only app. No backend. All data via WebSocket.**

### Screen flow
```
App.tsx
  ├── FearIndex  (Screen 1 — Overview/deviation index + mini asset grid)
  ├── Heatmap    (Screen 2 — 30-asset deviation grid, click → Delta)
  └── Delta      (Screen 3 — per-asset benchmark vs exchange prices)
```

Navigation state lives entirely in `App.tsx` (`screen` + `selectedAsset`).

### Data layer — hooks

| Hook | Purpose | WebSocket endpoints |
|------|---------|---------------------|
| `usePythPrices` | All Pyth feeds — price + CI for 50+ assets | `wss://hermes.pyth.network/ws` |
| `useCexPrices(symbol)` | Crypto spot — per-asset, opens on symbol change | Binance spot, Bybit spot, Gate.io spot, OKX perp |
| `useTradFiPrices(symbol)` | Non-crypto — per-asset, opens on symbol change | Gate.io futures, Binance futures, OKX |
| `useDeviationHeatmap` | Batched market prices for all 30 shortlist assets | Binance combined stream, Gate.io futures, OKX, Gate.io spot (HYPE) |

`usePythPrices` is a singleton — one WS subscribes to all 50+ feed IDs at once. The other hooks are per-symbol and close/reopen connections on symbol change.

**`useDeviationHeatmap` opens only 3 WebSocket connections** (batched) for all 30 assets. `useCexPrices`/`useTradFiPrices` open 2–3 connections per call. Never call per-symbol hooks inside a loop.

### Key data concepts

- **Pyth price = benchmark**, not "oracle to be verified". Market prices are compared to Pyth.
- **Delta** = `((composite - pythPrice) / pythPrice) * 100`
- **CI ratio** = `|delta %| / CI %` — the core signal: is market outside Pyth's confidence band?
- **Composite** = arithmetic mean of available exchange prices (null if no exchange data yet)
- **`supported`** flag on `CexPrices`/`TradFiPrices` — false when the symbol has no mapped exchange symbols

### Asset routing

- `FEED_CATEGORY` (from `usePythPrices.ts`) maps symbol → `'Crypto' | 'Forex' | 'Commodities' | 'Equities'`
- `CEX_SUPPORTED` (in `useCexPrices.ts`) — crypto-only map, Pyth symbol → base token
- `TRADFI_MAP` (in `useTradFiPrices.ts`) — non-crypto map, Pyth symbol → `{ gate?, binanceF?, okx? }`
- `DEVIATION_SYMBOLS` (in `useDeviationHeatmap.ts`) — the 30-asset shortlist shown in Heatmap

### OKX specifics

OKX WebSocket (`wss://ws.okx.com:8443/ws/v5/public`) sends plain JSON. Subscribe with:
```ts
ws.send(JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId: 'BTC-USDT-SWAP' }] }))
```
Price field: `data[0].last`. No compression, no ping/pong required.

### Styling

Custom CSS classes in `src/index.css` (not Tailwind utilities):
- `.glass` / `.glass-strong` — frosted glass cards
- `.bg-mesh` — radial gradient background (use on root div)
- `.nav-glass` — fixed nav bar
- `.glow-purple` / `.glow-green` / `.glow-red` / `.glow-yellow` — box-shadow glows
- `.pulse-ring` — breathing animation for the deviation score ring
- `.fade-in` — entry animation for grid cells

## Security rules

- **No API keys, tokens, or secrets** in source files. All exchange WebSockets used here are public/unauthenticated endpoints.
- **No user input is ever executed or eval'd.** All incoming WebSocket data is parsed with `JSON.parse` inside try/catch; price values are cast with `parseFloat` and validated (`> 0 && !isNaN`).
- **WebSocket URLs are hardcoded constants** — never interpolate user-supplied strings into WebSocket URLs.
- **No external script loading.** Do not add `<script src="...">` tags or dynamic `import()` from untrusted URLs.
- **DecompressionStream is browser-native** — do not replace it with a third-party decompression library unless absolutely necessary (avoids supply-chain risk).
- **`// eslint-disable` comments** are acceptable only for `@typescript-eslint/no-explicit-any` on WebSocket message handlers where the data shape is unknown. Do not disable security-relevant rules.

## Playwright MCP (browser testing)

Playwright MCP is configured globally in `~/.claude/mcp.json`. It lets Claude control a real browser for UI testing.

**Rules:**
- **Only navigate to `localhost:5173`** (the Vite dev server). Never visit external URLs during tests.
- **No form submissions or destructive interactions** — testing is read-only observation of the running app.
- **Run `npm run dev` first** before invoking any Playwright tool — the server must be up.
- **Do not persist browser state** between sessions (no cookies/localStorage that would affect subsequent tests).
- Screenshots are fine for debugging — do not upload them to any external service.
