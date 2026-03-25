import React, { useState, useMemo } from 'react'
import { useExchange } from '../../context/ExchangeContext'
import { formatPrice, formatNumber, formatTime } from '../../utils/format'
import { COINS } from '../../data/coins'

export default function OpenOrders({ baseSymbol }) {
  const { spotOrders, spotHistory, marketData, balances, dispatch } = useExchange()
  const [tab, setTab] = useState('open')

  const filteredOrders = baseSymbol
    ? spotOrders.filter(o => o.baseSymbol === baseSymbol)
    : spotOrders
  const filteredHistory = baseSymbol
    ? spotHistory.filter(o => o.baseSymbol === baseSymbol)
    : spotHistory

  const handleCancel = (id) => {
    dispatch({ type: 'CANCEL_SPOT_ORDER', payload: id })
  }

  // Portfolio: all coins currently held with non-zero balance
  const portfolio = useMemo(() => {
    return COINS
      .filter(coin => (balances[coin.symbol] || 0) > 1e-10)
      .map(coin => {
        const balance = balances[coin.symbol] || 0
        const price = marketData[coin.id]?.current_price || 0
        const currentValue = balance * price

        // Weighted average buy price from filled buy orders in history
        const fills = spotHistory.filter(
          o => o.baseSymbol === coin.symbol && o.side === 'buy' && o.status === 'filled'
        )
        let totalCost = 0
        let totalBought = 0
        fills.forEach(o => {
          totalCost += (o.fillPrice || o.price) * o.amount
          totalBought += o.amount
        })
        const avgPrice = totalBought > 0 ? totalCost / totalBought : price
        const pnl = (price - avgPrice) * balance
        const pnlPct = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0

        return { coin, balance, price, currentValue, avgPrice, pnl, pnlPct }
      })
  }, [balances, marketData, spotHistory])

  const portfolioTotal = portfolio.reduce((s, p) => s + p.currentValue, 0)

  const tabStyle = (t) => ({
    color: tab === t ? '#8B5CF6' : '#8B849C',
    borderBottom: tab === t ? '2px solid #8B5CF6' : '2px solid transparent',
  })

  return (
    <div style={{ background: '#110F1C', borderTop: '1px solid #1E1B30' }} className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: '#1E1B30' }}>
        <button onClick={() => setTab('open')} className="px-4 py-2.5 text-sm font-medium transition-colors" style={tabStyle('open')}>
          Açık Emirler ({filteredOrders.length})
        </button>
        <button onClick={() => setTab('history')} className="px-4 py-2.5 text-sm font-medium transition-colors" style={tabStyle('history')}>
          İşlem Geçmişi ({filteredHistory.length})
        </button>
        <button onClick={() => setTab('portfolio')} className="px-4 py-2.5 text-sm font-medium transition-colors" style={tabStyle('portfolio')}>
          Portföy ({portfolio.length})
        </button>
      </div>

      {/* Table area */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">

        {/* Open Orders */}
        {tab === 'open' && (
          filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#8B849C' }}>
              Açık emir yok
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#8B849C', borderBottom: '1px solid #1E1B30' }}>
                  <th className="px-3 py-2 text-left font-medium">Zaman</th>
                  <th className="px-3 py-2 text-left font-medium">Parite</th>
                  <th className="px-3 py-2 text-left font-medium">Tür</th>
                  <th className="px-3 py-2 text-left font-medium">Yön</th>
                  <th className="px-3 py-2 text-right font-medium">Fiyat</th>
                  <th className="px-3 py-2 text-right font-medium">Miktar</th>
                  <th className="px-3 py-2 text-right font-medium">Toplam</th>
                  <th className="px-3 py-2 text-right font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className="border-b hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                    <td className="px-3 py-2" style={{ color: '#8B849C' }}>{formatTime(order.createdAt)}</td>
                    <td className="px-3 py-2" style={{ color: '#F1F0F5' }}>{order.baseSymbol}/{order.quoteSymbol}</td>
                    <td className="px-3 py-2" style={{ color: '#8B849C' }}>{order.orderType}</td>
                    <td className="px-3 py-2" style={{ color: order.side === 'buy' ? '#22C55E' : '#F87171' }}>
                      {order.side.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatPrice(order.price)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{order.amount.toFixed(6)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatNumber(order.price * order.amount, 2)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="text-xs px-2 py-0.5 rounded transition-colors hover:opacity-80"
                        style={{ background: 'rgba(246,70,93,0.15)', color: '#F87171' }}
                      >
                        İptal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Trade History */}
        {tab === 'history' && (
          filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#8B849C' }}>
              İşlem geçmişi yok
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#8B849C', borderBottom: '1px solid #1E1B30' }}>
                  <th className="px-3 py-2 text-left font-medium">Zaman</th>
                  <th className="px-3 py-2 text-left font-medium">Parite</th>
                  <th className="px-3 py-2 text-left font-medium">Tür</th>
                  <th className="px-3 py-2 text-left font-medium">Yön</th>
                  <th className="px-3 py-2 text-right font-medium">Gerçekleşme Fiyatı</th>
                  <th className="px-3 py-2 text-right font-medium">Miktar</th>
                  <th className="px-3 py-2 text-right font-medium">Toplam</th>
                  <th className="px-3 py-2 text-right font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(order => (
                  <tr key={order.id} className="border-b hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                    <td className="px-3 py-2" style={{ color: '#8B849C' }}>{formatTime(order.filledAt || order.cancelledAt || order.createdAt)}</td>
                    <td className="px-3 py-2" style={{ color: '#F1F0F5' }}>{order.baseSymbol}/{order.quoteSymbol}</td>
                    <td className="px-3 py-2" style={{ color: '#8B849C' }}>{order.orderType}</td>
                    <td className="px-3 py-2" style={{ color: order.side === 'buy' ? '#22C55E' : '#F87171' }}>
                      {order.side.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>
                      {formatPrice(order.fillPrice || order.price)}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{order.amount.toFixed(6)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>
                      {formatNumber((order.fillPrice || order.price) * order.amount, 2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          background: order.status === 'filled' ? 'rgba(2,192,118,0.15)' : 'rgba(132,142,156,0.15)',
                          color: order.status === 'filled' ? '#22C55E' : '#8B849C',
                        }}
                      >
                        {order.status === 'filled' ? 'gerçekleşti' : order.status === 'cancelled' ? 'iptal' : order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Portfolio */}
        {tab === 'portfolio' && (
          portfolio.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#8B849C' }}>
              Coin bakiyesi yok
            </div>
          ) : (
            <>
              {/* Total value row */}
              <div className="flex items-center justify-between px-4 py-2 text-xs flex-shrink-0" style={{ borderBottom: '1px solid #1E1B30', background: '#0D0B1A' }}>
                <span style={{ color: '#8B849C' }}>Toplam Portföy Değeri</span>
                <span className="font-bold" style={{ color: '#F1F0F5' }}>{formatNumber(portfolioTotal, 2)} USDT</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: '#8B849C', borderBottom: '1px solid #1E1B30' }}>
                    <th className="px-3 py-2 text-left font-medium">Varlık</th>
                    <th className="px-3 py-2 text-right font-medium">Miktar</th>
                    <th className="px-3 py-2 text-right font-medium">Güncel Fiyat</th>
                    <th className="px-3 py-2 text-right font-medium">Değer (USDT)</th>
                    <th className="px-3 py-2 text-right font-medium">Ort. Alış</th>
                    <th className="px-3 py-2 text-right font-medium">K/Z</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map(({ coin, balance, price, currentValue, avgPrice, pnl, pnlPct }) => (
                    <tr key={coin.id} className="border-b hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                            style={{ background: coin.color, color: '#fff', fontSize: 9 }}>
                            {coin.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium" style={{ color: '#F1F0F5' }}>{coin.symbol}</div>
                            <div style={{ color: '#8B849C', fontSize: 10 }}>{coin.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatNumber(balance, 6)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatPrice(price)}</td>
                      <td className="px-3 py-2 text-right font-medium" style={{ color: '#F1F0F5' }}>{formatNumber(currentValue, 2)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: '#8B849C' }}>{formatPrice(avgPrice)}</td>
                      <td className="px-3 py-2 text-right">
                        <div style={{ color: pnl >= 0 ? '#22C55E' : '#F87171' }}>
                          <div>{pnl >= 0 ? '+' : ''}{formatNumber(pnl, 2)} USDT</div>
                          <div style={{ fontSize: 10, opacity: 0.8 }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        )}
      </div>
    </div>
  )
}
