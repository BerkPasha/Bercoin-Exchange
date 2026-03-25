import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useExchange } from '../../context/ExchangeContext'
import { COINS } from '../../data/coins'
import { formatPrice, formatChange, formatNumber } from '../../utils/format'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg p-6 w-full max-w-sm" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base" style={{ color: '#F1F0F5' }}>{title}</h3>
          <button onClick={onClose} className="text-lg" style={{ color: '#8B849C' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const COLORS = ['#8B5CF6', '#627EEA', '#F7931A', '#9945FF', '#00AAE4', '#E84142', '#E6007A', '#22C55E', '#F87171', '#8B849C']

export default function Wallet() {
  const { balances, marketData, unrealizedPnL, futuresPositions } = useExchange()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null) // { type: 'deposit'|'withdraw', symbol }

  const assets = useMemo(() => {
    const list = []
    // USDT
    list.push({
      symbol: 'USDT',
      name: 'Tether USD',
      balance: balances.USDT || 0,
      price: 1,
      usdtValue: balances.USDT || 0,
      change24h: 0,
      color: '#26A17B',
    })
    // Coins
    COINS.forEach(coin => {
      const bal = balances[coin.symbol] || 0
      if (bal > 0) {
        const data = marketData[coin.id]
        const price = data?.current_price || 0
        list.push({
          symbol: coin.symbol,
          name: coin.name,
          balance: bal,
          price,
          usdtValue: bal * price,
          change24h: data?.price_change_percentage_24h || 0,
          color: coin.color,
        })
      }
    })
    return list.sort((a, b) => b.usdtValue - a.usdtValue)
  }, [balances, marketData])

  const totalValue = useMemo(() => assets.reduce((s, a) => s + a.usdtValue, 0), [assets])

  const pieData = useMemo(() => {
    if (!totalValue) return []
    return assets
      .filter(a => a.usdtValue > 0)
      .slice(0, 10)
      .map(a => ({
        name: a.symbol,
        value: a.usdtValue,
        pct: (a.usdtValue / totalValue) * 100,
        color: a.color,
      }))
  }, [assets, totalValue])

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="px-3 py-2 rounded text-xs" style={{ background: '#1E1B30' }}>
        <div style={{ color: '#F1F0F5' }}>{d.name}</div>
        <div style={{ color: '#8B5CF6' }}>${formatNumber(d.value, 2)} ({d.pct.toFixed(1)}%)</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F1F0F5' }}>Cüzdan</h1>
        <p className="text-sm mt-1" style={{ color: '#8B849C' }}>Demo portföyünüzü yönetin</p>
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-lg p-5" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
          <div className="text-xs mb-2" style={{ color: '#8B849C' }}>Toplam Portföy Değeri</div>
          <div className="text-4xl font-bold mb-1" style={{ color: '#F1F0F5' }}>
            ${formatNumber(totalValue + unrealizedPnL, 2)}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm" style={{ color: '#8B849C' }}>
              Spot: ${formatNumber(totalValue, 2)} USDT
            </span>
            {futuresPositions.length > 0 && (
              <span className="text-sm font-medium" style={{ color: unrealizedPnL >= 0 ? '#22C55E' : '#F87171' }}>
                Vadeli K/Z: {unrealizedPnL >= 0 ? '+' : ''}{formatNumber(unrealizedPnL, 2)} USDT
                <span style={{ color: '#8B849C', fontSize: 11 }}> ({futuresPositions.length} açık)</span>
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setModal({ type: 'deposit', symbol: 'USDT' })}
              className="px-5 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: '#8B5CF6', color: '#09080F' }}
            >
              Yatır
            </button>
            <button
              onClick={() => setModal({ type: 'withdraw', symbol: 'USDT' })}
              className="px-5 py-2 rounded text-sm font-semibold border transition-colors hover:bg-white/5"
              style={{ borderColor: '#1E1B30', color: '#F1F0F5' }}
            >
              Çek
            </button>
          </div>
        </div>

        {/* Pie chart */}
        <div className="rounded-lg p-4 flex flex-col" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
          <div className="text-xs mb-2" style={{ color: '#8B849C' }}>Varlık Dağılımı</div>
          {pieData.length > 0 ? (
            <div className="flex-1" style={{ minHeight: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color !== '#000000' ? entry.color : COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: '#8B849C' }}>
              Henüz varlık yok
            </div>
          )}
        </div>
      </div>

      {/* Assets table */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#110F1C', border: '1px solid #1E1B30' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#1E1B30' }}>
          <span className="font-semibold text-sm" style={{ color: '#F1F0F5' }}>Varlıklar ({assets.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: '#8B849C', fontSize: 11, borderBottom: '1px solid #1E1B30' }}>
              <th className="px-4 py-3 text-left font-medium">Varlık</th>
              <th className="px-4 py-3 text-right font-medium">Bakiye</th>
              <th className="px-4 py-3 text-right font-medium">Fiyat</th>
              <th className="px-4 py-3 text-right font-medium">USDT Değeri</th>
              <th className="px-4 py-3 text-right font-medium">24s Değişim</th>
              <th className="px-4 py-3 text-right font-medium">Dağılım</th>
              <th className="px-4 py-3 text-right font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => (
              <tr key={asset.symbol} className="border-t hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: asset.color !== '#000000' ? asset.color : '#333', color: '#fff' }}>
                      {asset.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: '#F1F0F5' }}>{asset.symbol}</div>
                      <div className="text-xs" style={{ color: '#8B849C' }}>{asset.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right" style={{ color: '#F1F0F5' }}>
                  {asset.balance.toFixed(asset.symbol === 'USDT' ? 2 : 6)}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: '#F1F0F5' }}>
                  ${formatPrice(asset.price)}
                </td>
                <td className="px-4 py-3 text-right font-medium" style={{ color: '#F1F0F5' }}>
                  ${formatNumber(asset.usdtValue, 2)}
                </td>
                <td className="px-4 py-3 text-right font-medium"
                  style={{ color: asset.change24h >= 0 ? '#22C55E' : '#F87171' }}>
                  {asset.symbol === 'USDT' ? '--' : formatChange(asset.change24h)}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: '#8B849C' }}>
                  {totalValue > 0 ? ((asset.usdtValue / totalValue) * 100).toFixed(1) : '0.0'}%
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setModal({ type: 'deposit', symbol: asset.symbol })}
                      className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                      style={{ background: 'rgba(2,192,118,0.15)', color: '#22C55E' }}
                    >
                      Yatır
                    </button>
                    <button
                      onClick={() => setModal({ type: 'withdraw', symbol: asset.symbol })}
                      className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                      style={{ background: 'rgba(246,70,93,0.15)', color: '#F87171' }}
                    >
                      Çek
                    </button>
                    {asset.symbol !== 'USDT' && (
                      <button
                        onClick={() => navigate(`/spot/${asset.symbol}-USDT`)}
                        className="text-xs px-2 py-1 rounded transition-colors hover:opacity-80"
                        style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}
                      >
                        İşlem
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Demo mode modal */}
      {modal && (
        <Modal
          title={`${modal.type === 'deposit' ? 'Yatır' : 'Çek'} ${modal.symbol}`}
          onClose={() => setModal(null)}
        >
          <div className="text-center py-6">
            <div className="text-4xl mb-4">🎮</div>
            <div className="font-semibold mb-2" style={{ color: '#F1F0F5' }}>Demo Mod</div>
            <div className="text-sm mb-6" style={{ color: '#8B849C' }}>
              Bu bir demo borsadır. {modal.type === 'deposit' ? 'Para yatırma' : 'Para çekme'} işlemleri demo modda kullanılamaz.
              Hesabınız işlem yapmak için $10.000 USDT ile başlar.
            </div>
            <button
              onClick={() => setModal(null)}
              className="px-6 py-2 rounded font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ background: '#8B5CF6', color: '#09080F' }}
            >
              Anladım
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
