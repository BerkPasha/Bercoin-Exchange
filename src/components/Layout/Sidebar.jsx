import React, { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useExchange } from '../../context/ExchangeContext'
import { COINS } from '../../data/coins'
import { formatPrice, formatChange } from '../../utils/format'

export default function Sidebar({ type = 'spot' }) {
  const { marketData } = useExchange()
  const navigate = useNavigate()
  const { pair } = useParams()
  const [search, setSearch] = useState('')

  const activePair = pair || 'BTC-USDT'

  const coins = useMemo(() => {
    return COINS
      .filter(c => {
        const q = search.toLowerCase()
        return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      })
      .map(c => {
        const data = marketData[c.id]
        return {
          ...c,
          price: data?.current_price || 0,
          change: data?.price_change_percentage_24h || 0,
        }
      })
  }, [marketData, search])

  const handleSelect = (symbol) => {
    const path = type === 'futures' ? `/futures/${symbol}-USDT` : `/spot/${symbol}-USDT`
    navigate(path)
  }

  return (
    <aside style={{ background: '#110F1C', borderRight: '1px solid #1E1B30', width: 200, minWidth: 200 }} className="flex flex-col overflow-hidden">
      <div className="p-2 border-b" style={{ borderColor: '#1E1B30' }}>
        <input
          type="text"
          placeholder="Ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded outline-none"
          style={{ background: '#1E1B30', color: '#F1F0F5', border: 'none' }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="text-xs px-3 py-1.5 font-medium" style={{ color: '#8B849C' }}>
          USDT Pariteler
        </div>
        {coins.map(coin => {
          const isActive = activePair === `${coin.symbol}-USDT`
          return (
            <button
              key={coin.id}
              onClick={() => handleSelect(coin.symbol)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-white/5"
              style={{ background: isActive ? 'rgba(139,92,246,0.1)' : 'transparent' }}
            >
              <div>
                <span className="text-xs font-medium" style={{ color: isActive ? '#8B5CF6' : '#F1F0F5' }}>
                  {coin.symbol}
                </span>
                <span className="text-xs ml-1" style={{ color: '#8B849C' }}>/USDT</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium" style={{ color: '#F1F0F5' }}>
                  {coin.price > 0 ? formatPrice(coin.price) : '--'}
                </div>
                <div className="text-xs" style={{ color: coin.change >= 0 ? '#22C55E' : '#F87171' }}>
                  {coin.price > 0 ? formatChange(coin.change) : '--'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
