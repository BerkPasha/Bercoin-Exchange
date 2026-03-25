import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExchange } from '../../context/ExchangeContext'
import { COINS } from '../../data/coins'
import { formatPrice, formatChange, formatNumber, formatVolume } from '../../utils/format'

function StatCard({ title, value, sub, color }) {
  return (
    <div className="rounded-lg p-4" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
      <div className="text-xs mb-2" style={{ color: '#8B849C' }}>{title}</div>
      <div className="text-xl font-bold" style={{ color: color || '#F1F0F5' }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: '#8B849C' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { marketData, balances, spotHistory, futuresPositions, futuresHistory } = useExchange()

  const portfolioValue = useMemo(() => {
    let total = balances.USDT || 0
    COINS.forEach(coin => {
      const bal = balances[coin.symbol] || 0
      if (bal > 0) {
        const data = marketData[coin.id]
        if (data?.current_price) {
          total += bal * data.current_price
        }
      }
    })
    return total
  }, [balances, marketData])

  const allCoins = useMemo(() => {
    return COINS.map(c => ({
      ...c,
      data: marketData[c.id],
      change: marketData[c.id]?.price_change_percentage_24h || 0,
      price: marketData[c.id]?.current_price || 0,
      volume: marketData[c.id]?.total_volume || 0,
    })).filter(c => c.data)
  }, [marketData])

  const topGainers = useMemo(() => {
    return [...allCoins].sort((a, b) => b.change - a.change).slice(0, 5)
  }, [allCoins])

  const topLosers = useMemo(() => {
    return [...allCoins].sort((a, b) => a.change - b.change).slice(0, 5)
  }, [allCoins])

  const openPositionsCount = futuresPositions.length
  const totalTrades = spotHistory.length + futuresHistory.length

  const pnl24h = useMemo(() => {
    const now = Date.now()
    const past24h = spotHistory.filter(o => o.filledAt && (now - o.filledAt) < 86400000)
    return past24h.reduce((acc, o) => {
      if (o.side === 'buy') return acc
      const costBasis = o.amount * (o.price || o.fillPrice)
      const proceeds = o.amount * (o.fillPrice || o.price)
      return acc + (proceeds - costBasis)
    }, 0)
  }, [spotHistory])

  const recentTrades = [...spotHistory].slice(0, 10)

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Welcome banner */}
      <div className="rounded-lg p-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #110F1C 0%, #1E1B30 100%)', border: '1px solid #1E1B30' }}>
        <div>
          <div className="text-xs mb-1" style={{ color: '#8B5CF6' }}>DEMO HESAP</div>
          <div className="text-2xl font-bold" style={{ color: '#F1F0F5' }}>BerCoin'a Hoş Geldiniz</div>
          <div className="text-sm mt-1" style={{ color: '#8B849C' }}>
            $10.000 USDT demo bakiyenizle işlem yapmaya başlayın
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/spot/BTC-USDT')}
            className="px-5 py-2 rounded font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: '#8B5CF6', color: '#09080F' }}
          >
            İşlem Başlat
          </button>
          <button
            onClick={() => navigate('/markets')}
            className="px-5 py-2 rounded font-semibold text-sm border transition-colors hover:bg-white/5"
            style={{ borderColor: '#1E1B30', color: '#F1F0F5' }}
          >
            Piyasaları Gör
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Portföy Değeri"
          value={`$${formatNumber(portfolioValue, 2)}`}
          sub="Toplam varlık USDT olarak"
          color="#F1F0F5"
        />
        <StatCard
          title="USDT Bakiye"
          value={`$${formatNumber(balances.USDT || 0, 2)}`}
          sub="Kullanılabilir"
          color="#8B5CF6"
        />
        <StatCard
          title="Açık Pozisyonlar"
          value={openPositionsCount}
          sub="Vadeli pozisyonlar"
          color={openPositionsCount > 0 ? '#8B5CF6' : '#8B849C'}
        />
        <StatCard
          title="Toplam İşlemler"
          value={totalTrades}
          sub="Spot + Vadeli"
          color="#F1F0F5"
        />
      </div>

      {/* Gainers & Losers */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div className="rounded-lg overflow-hidden" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#1E1B30' }}>
            <span className="font-semibold text-sm" style={{ color: '#F1F0F5' }}>En Çok Kazananlar (24s)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#8B849C', fontSize: 11 }}>
                <th className="px-4 py-2 text-left">Varlık</th>
                <th className="px-4 py-2 text-right">Fiyat</th>
                <th className="px-4 py-2 text-right">24s Değişim</th>
                <th className="px-4 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {topGainers.map(c => (
                <tr key={c.id} className="border-t hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: c.color, color: '#fff', fontSize: 9 }}>
                        {c.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#F1F0F5' }}>{c.symbol}</div>
                        <div style={{ color: '#8B849C', fontSize: 11 }}>{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#F1F0F5' }}>
                    ${formatPrice(c.price)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium" style={{ color: '#22C55E' }}>
                    {formatChange(c.change)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => navigate(`/spot/${c.symbol}-USDT`)}
                      className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                      style={{ background: 'rgba(2,192,118,0.15)', color: '#22C55E' }}
                    >
                      İşlem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Losers */}
        <div className="rounded-lg overflow-hidden" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#1E1B30' }}>
            <span className="font-semibold text-sm" style={{ color: '#F1F0F5' }}>En Çok Kaybedenler (24s)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#8B849C', fontSize: 11 }}>
                <th className="px-4 py-2 text-left">Varlık</th>
                <th className="px-4 py-2 text-right">Fiyat</th>
                <th className="px-4 py-2 text-right">24s Değişim</th>
                <th className="px-4 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {topLosers.map(c => (
                <tr key={c.id} className="border-t hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: c.color, color: '#fff', fontSize: 9 }}>
                        {c.symbol.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: '#F1F0F5' }}>{c.symbol}</div>
                        <div style={{ color: '#8B849C', fontSize: 11 }}>{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#F1F0F5' }}>
                    ${formatPrice(c.price)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium" style={{ color: '#F87171' }}>
                    {formatChange(c.change)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => navigate(`/spot/${c.symbol}-USDT`)}
                      className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                      style={{ background: 'rgba(246,70,93,0.15)', color: '#F87171' }}
                    >
                      İşlem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trade History */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1E1B30' }}>
          <span className="font-semibold text-sm" style={{ color: '#F1F0F5' }}>Son İşlem Geçmişi</span>
        </div>
        {recentTrades.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: '#8B849C' }}>
            Henüz işlem yok. Geçmişinizi görmek için işlem yapın.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#8B849C', fontSize: 11 }}>
                <th className="px-4 py-2 text-left">Parite</th>
                <th className="px-4 py-2 text-left">Tür</th>
                <th className="px-4 py-2 text-left">Yön</th>
                <th className="px-4 py-2 text-right">Fiyat</th>
                <th className="px-4 py-2 text-right">Miktar</th>
                <th className="px-4 py-2 text-right">Toplam</th>
                <th className="px-4 py-2 text-right">Durum</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map(order => (
                <tr key={order.id} className="border-t hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#F1F0F5' }}>
                    {order.baseSymbol}/{order.quoteSymbol}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: '#8B849C' }}>{order.orderType}</td>
                  <td className="px-4 py-2.5" style={{ color: order.side === 'buy' ? '#22C55E' : '#F87171' }}>
                    {order.side.toUpperCase()}
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#F1F0F5' }}>
                    ${formatPrice(order.fillPrice || order.price)}
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#F1F0F5' }}>
                    {order.amount.toFixed(6)}
                  </td>
                  <td className="px-4 py-2.5 text-right" style={{ color: '#F1F0F5' }}>
                    ${formatNumber((order.fillPrice || order.price) * order.amount, 2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        background: order.status === 'filled' ? 'rgba(2,192,118,0.15)' : 'rgba(132,142,156,0.15)',
                        color: order.status === 'filled' ? '#22C55E' : '#8B849C',
                      }}>
                      {order.status === 'filled' ? 'gerçekleşti' : order.status === 'cancelled' ? 'iptal' : order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
