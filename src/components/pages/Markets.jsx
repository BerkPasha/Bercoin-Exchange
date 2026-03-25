import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExchange } from '../../context/ExchangeContext'
import { COINS } from '../../data/coins'
import { formatPrice, formatChange, formatVolume, formatMarketCap } from '../../utils/format'

const SORT_OPTIONS = ['rank', 'name', 'price', 'change24h', 'change7d', 'volume', 'marketCap']

export default function Markets() {
  const { marketData, loading } = useExchange()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')

  const coins = useMemo(() => {
    return COINS.map((coin, idx) => {
      const data = marketData[coin.id]
      return {
        ...coin,
        rank: data?.market_cap_rank || idx + 1,
        price: data?.current_price || 0,
        change24h: data?.price_change_percentage_24h || 0,
        change7d: data?.price_change_percentage_7d_in_currency || 0,
        volume: data?.total_volume || 0,
        marketCap: data?.market_cap || 0,
        hasData: !!data,
      }
    })
  }, [marketData])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return coins.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    )
  }, [coins, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortBy] ?? 0
      let valB = b[sortBy] ?? 0
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortBy, sortDir])

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'rank' || field === 'name' ? 'asc' : 'desc')
    }
  }

  const SortHeader = ({ field, label, align = 'right' }) => (
    <th
      className={`px-4 py-3 font-medium cursor-pointer select-none hover:opacity-80 text-${align}`}
      onClick={() => handleSort(field)}
      style={{ color: sortBy === field ? '#8B5CF6' : '#8B849C', fontSize: 12 }}
    >
      {label} {sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F1F0F5' }}>Piyasalar</h1>
          <p className="text-sm mt-1" style={{ color: '#8B849C' }}>
            {filtered.length} kripto para · CoinGecko canlı veri
          </p>
        </div>
        <input
          type="text"
          placeholder="İsim veya sembol ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 rounded text-sm outline-none w-64"
          style={{ background: '#110F1C', color: '#F1F0F5', border: '1px solid #1E1B30' }}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid #1E1B30' }}>
            <tr>
              <SortHeader field="rank" label="#" align="left" />
              <SortHeader field="name" label="İsim" align="left" />
              <SortHeader field="price" label="Fiyat" />
              <SortHeader field="change24h" label="24s %" />
              <SortHeader field="change7d" label="7g %" />
              <SortHeader field="volume" label="24s Hacim" />
              <SortHeader field="marketCap" label="Piyasa Değeri" />
              <th className="px-4 py-3 text-right" style={{ color: '#8B849C', fontSize: 12 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && sorted.every(c => !c.hasData) && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-sm" style={{ color: '#8B849C' }}>
                  Piyasa verisi yükleniyor...
                </td>
              </tr>
            )}
            {sorted.map((coin, idx) => (
              <tr
                key={coin.id}
                className="border-t hover:bg-white/5 transition-colors cursor-pointer"
                style={{ borderColor: '#1E1B30' }}
                onClick={() => navigate(`/spot/${coin.symbol}-USDT`)}
              >
                <td className="px-4 py-3" style={{ color: '#8B849C' }}>{coin.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: coin.color, color: '#fff' }}>
                      {coin.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#F1F0F5' }}>{coin.name}</div>
                      <div className="text-xs" style={{ color: '#8B849C' }}>{coin.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: '#F1F0F5' }}>
                  {coin.price > 0 ? `$${formatPrice(coin.price)}` : '--'}
                </td>
                <td className="px-4 py-3 text-right font-medium"
                  style={{ color: coin.change24h >= 0 ? '#22C55E' : '#F87171' }}>
                  {coin.hasData ? formatChange(coin.change24h) : '--'}
                </td>
                <td className="px-4 py-3 text-right font-medium"
                  style={{ color: coin.change7d >= 0 ? '#22C55E' : '#F87171' }}>
                  {coin.hasData ? formatChange(coin.change7d) : '--'}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: '#F1F0F5' }}>
                  {coin.hasData ? formatVolume(coin.volume) : '--'}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: '#F1F0F5' }}>
                  {coin.hasData ? formatMarketCap(coin.marketCap) : '--'}
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/spot/${coin.symbol}-USDT`)}
                      className="text-xs px-3 py-1 rounded font-medium transition-opacity hover:opacity-80"
                      style={{ background: '#8B5CF6', color: '#09080F' }}
                    >
                      İşlem
                    </button>
                    <button
                      onClick={() => navigate(`/futures/${coin.symbol}-USDT`)}
                      className="text-xs px-3 py-1 rounded font-medium transition-opacity hover:opacity-80 border"
                      style={{ borderColor: '#1E1B30', color: '#8B849C' }}
                    >
                      Vadeli
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
