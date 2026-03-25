import React, { useState, useEffect, useRef } from 'react'
import { formatTime } from '../../utils/format'

const PRECISIONS = [0.1, 0.01, 0.001, 0.0001, 0.00001, 0.000001, 0.0000001, 0.00000001]

function generateTrade(basePrice) {
  const side = Math.random() > 0.5 ? 'buy' : 'sell'
  const priceVariance = basePrice * 0.001 * (Math.random() - 0.5)
  const price = basePrice + priceVariance
  const amount = Math.random() * 2 + 0.001
  return {
    id: Math.random().toString(36).slice(2),
    side,
    price,
    amount,
    time: Date.now() - Math.floor(Math.random() * 5000),
  }
}

export default function RecentTrades({ currentPrice, baseSymbol }) {
  const [trades, setTrades] = useState([])
  const [precisionIdx, setPrecisionIdx] = useState(2) // default 0.001
  const prevPriceRef = useRef(currentPrice)

  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return
    const initial = Array.from({ length: 30 }, (_, i) => ({
      ...generateTrade(currentPrice),
      time: Date.now() - i * 2000,
    }))
    setTrades(initial)
  }, [])

  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return
    prevPriceRef.current = currentPrice
    const id = setInterval(() => {
      const newTrade = generateTrade(currentPrice)
      setTrades(prev => [newTrade, ...prev.slice(0, 49)])
    }, 800 + Math.random() * 1200)
    return () => clearInterval(id)
  }, [currentPrice])

  const precision = PRECISIONS[precisionIdx]
  const priceDecimals = Math.max(0, -Math.floor(Math.log10(precision)))

  return (
    <div style={{ background: '#110F1C' }} className="flex flex-col h-full overflow-hidden">
      {/* Header with precision selector */}
      <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: '#1E1B30' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: '#F1F0F5' }}>Son İşlemler</span>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: '#8B849C' }}>Ölçek:</span>
            <select
              value={precisionIdx}
              onChange={e => setPrecisionIdx(parseInt(e.target.value))}
              className="text-xs rounded px-1 py-0.5 cursor-pointer outline-none"
              style={{ background: '#1E1B30', color: '#A78BFA', border: '1px solid #2C2840', maxWidth: 80 }}
            >
              {PRECISIONS.map((p, i) => (
                <option key={i} value={i}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-3 py-1 text-xs flex-shrink-0" style={{ color: '#8B849C' }}>
        <span>Fiyat (USDT)</span>
        <span className="text-right">Miktar ({baseSymbol})</span>
        <span className="text-right">Zaman</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.map(trade => (
          <div key={trade.id} className="grid grid-cols-3 px-3 py-0.5 text-xs hover:bg-white/5">
            <span style={{ color: trade.side === 'buy' ? '#22C55E' : '#F87171' }}>
              {trade.price.toFixed(priceDecimals)}
            </span>
            <span className="text-right" style={{ color: '#F1F0F5' }}>
              {trade.amount.toFixed(4)}
            </span>
            <span className="text-right" style={{ color: '#8B849C' }}>
              {formatTime(trade.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
