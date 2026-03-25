import React, { useMemo, useEffect, useState } from 'react'
import { formatPrice, formatNumber } from '../../utils/format'

const PRECISIONS = [0.1, 0.01, 0.001, 0.0001, 0.00001, 0.000001, 0.0000001, 0.00000001]

function generateOrders(basePrice, side, count = 20) {
  if (!basePrice || basePrice <= 0) return []
  const orders = []
  const spread = basePrice * 0.0003
  for (let i = 0; i < count; i++) {
    let price
    if (side === 'ask') {
      price = basePrice + spread + (i * basePrice * 0.0002 * (1 + Math.random() * 0.3))
    } else {
      price = basePrice - spread - (i * basePrice * 0.0002 * (1 + Math.random() * 0.3))
    }
    const amount = (Math.random() * 3 + 0.1) * (1 / Math.max(1, i * 0.3 + 1))
    orders.push({ price, amount })
  }
  return orders
}

function groupOrders(rawOrders, side, precision, priceDecimals) {
  const map = new Map()
  rawOrders.forEach(o => {
    const key = parseFloat((Math.round(o.price / precision) * precision).toFixed(priceDecimals))
    if (!map.has(key)) map.set(key, { price: key, amount: 0 })
    map.get(key).amount += o.amount
  })
  const sorted = Array.from(map.values())
    .sort((a, b) => side === 'ask' ? a.price - b.price : b.price - a.price)
  let cum = 0
  sorted.forEach(o => { cum += o.amount; o.cum = cum; o.total = o.price * o.amount })
  const maxCum = cum || 1
  sorted.forEach(o => { o.pct = (o.cum / maxCum) * 100 })
  return sorted
}

export default function OrderBook({ coinId, currentPrice, baseSymbol }) {
  const [seed, setSeed] = useState(0)
  const [precisionIdx, setPrecisionIdx] = useState(2) // default 0.001

  useEffect(() => {
    const id = setInterval(() => setSeed(s => s + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const precision = PRECISIONS[precisionIdx]
  const priceDecimals = Math.max(0, -Math.floor(Math.log10(precision)))

  const { asks, bids, spread, spreadPct } = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return { asks: [], bids: [], spread: 0, spreadPct: 0 }

    const rawAsks = generateOrders(currentPrice, 'ask', 20)
    const rawBids = generateOrders(currentPrice, 'bid', 20)

    const groupedAsks = groupOrders(rawAsks, 'ask', precision, priceDecimals)
    const groupedBids = groupOrders(rawBids, 'bid', precision, priceDecimals)

    const lowestAsk = groupedAsks[0]?.price || currentPrice
    const highestBid = groupedBids[0]?.price || currentPrice
    const spread = lowestAsk - highestBid
    const spreadPct = (spread / currentPrice) * 100

    return {
      asks: [...groupedAsks].reverse(), // highest ask at top for display
      bids: groupedBids,
      spread,
      spreadPct,
    }
  }, [currentPrice, seed, precision, priceDecimals])

  return (
    <div style={{ background: '#110F1C' }} className="flex flex-col h-full overflow-hidden">
      {/* Header with precision selector */}
      <div className="px-3 py-2 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: '#1E1B30' }}>
        <span className="text-sm font-semibold" style={{ color: '#F1F0F5' }}>Emir Defteri</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: '#8B849C' }}>Ölçek:</span>
          <select
            value={precisionIdx}
            onChange={e => setPrecisionIdx(parseInt(e.target.value))}
            className="text-xs rounded px-1.5 py-0.5 cursor-pointer outline-none"
            style={{ background: '#1E1B30', color: '#A78BFA', border: '1px solid #2C2840' }}
          >
            {PRECISIONS.map((p, i) => (
              <option key={i} value={i}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-1 text-xs flex-shrink-0" style={{ color: '#8B849C' }}>
        <span>Fiyat (USDT)</span>
        <span className="text-right">Miktar ({baseSymbol})</span>
        <span className="text-right">Toplam</span>
      </div>

      {/* Asks */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse">
        {asks.map((o, i) => (
          <div key={i} className="relative grid grid-cols-3 px-3 py-0.5 text-xs hover:bg-white/5 cursor-pointer">
            <div className="absolute right-0 top-0 bottom-0 opacity-15" style={{ width: `${o.pct}%`, background: '#F87171' }} />
            <span style={{ color: '#F87171' }}>{o.price.toFixed(priceDecimals)}</span>
            <span className="text-right" style={{ color: '#F1F0F5' }}>{o.amount.toFixed(4)}</span>
            <span className="text-right" style={{ color: '#8B849C' }}>{formatNumber(o.total, 2)}</span>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ background: '#161A1E', borderTop: '1px solid #1E1B30', borderBottom: '1px solid #1E1B30' }}>
        <span className="text-sm font-bold" style={{ color: '#F1F0F5' }}>
          {currentPrice > 0 ? formatPrice(currentPrice) : '--'}
        </span>
        <span className="text-xs" style={{ color: '#8B849C' }}>
          Aralık: {spread > 0 ? formatPrice(spread) : '--'} ({spreadPct.toFixed(3)}%)
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-y-auto">
        {bids.map((o, i) => (
          <div key={i} className="relative grid grid-cols-3 px-3 py-0.5 text-xs hover:bg-white/5 cursor-pointer">
            <div className="absolute right-0 top-0 bottom-0 opacity-15" style={{ width: `${o.pct}%`, background: '#22C55E' }} />
            <span style={{ color: '#22C55E' }}>{o.price.toFixed(priceDecimals)}</span>
            <span className="text-right" style={{ color: '#F1F0F5' }}>{o.amount.toFixed(4)}</span>
            <span className="text-right" style={{ color: '#8B849C' }}>{formatNumber(o.total, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
