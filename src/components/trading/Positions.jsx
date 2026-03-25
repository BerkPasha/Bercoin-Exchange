import React, { useState } from 'react'
import { useExchange } from '../../context/ExchangeContext'
import { formatPrice, formatNumber } from '../../utils/format'

function InlineStopLimit({ pos, currentPrice, dispatch, onClose }) {
  const livePrice = currentPrice || pos.entryPrice || 0
  const [size, setSize] = useState(String(pos.size))
  const [leverage, setLeverage] = useState(pos.leverage)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const infoColor = '#8B849C'
  const valueColor = '#F1F0F5'

  const handleSubmit = () => {
    const sizeVal = parseFloat(size)
    if (!sizeVal || sizeVal <= 0) { setError('Geçerli bir boyut girin'); return }
    setError('')

    dispatch({
      type: 'PLACE_FUTURES_PENDING_ORDER',
      payload: {
        symbol: pos.symbol,
        coinId: pos.coinId,
        side: pos.side,
        leverage,
        size: sizeVal,
        stopPrice: livePrice,
        limitPrice: livePrice,
        placedAtPrice: livePrice,
      },
    })

    setSuccess('Stop-Limit emir oluşturuldu!')
    setTimeout(() => { setSuccess(''); onClose() }, 1500)
  }

  return (
    <tr style={{ background: 'rgba(251,191,36,0.04)', borderBottom: '1px solid #1E1B30' }}>
      <td colSpan={10} className="px-3 py-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: '#FBBF24' }}>⚡ Stop-Limit — {pos.symbol}</span>
          <div className="flex items-center gap-1">
            <label className="text-xs" style={{ color: infoColor }}>Boyut (USDT)</label>
            <input
              type="number"
              value={size}
              onChange={e => setSize(e.target.value)}
              className="px-2 py-1 rounded text-xs outline-none"
              style={{ width: 90, background: '#1E1B30', color: valueColor, border: '1px solid #2C2840' }}
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-xs" style={{ color: infoColor }}>Kaldıraç</label>
            <input
              type="number"
              value={leverage}
              onChange={e => setLeverage(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              min="1" max="100"
              className="px-2 py-1 rounded text-xs outline-none text-center"
              style={{ width: 56, background: '#1E1B30', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)', fontWeight: 700 }}
            />
            <span className="text-xs font-bold" style={{ color: '#A78BFA' }}>×</span>
          </div>
          <div className="text-xs" style={{ color: '#8B849C' }}>
            Stop @ <span style={{ color: '#FBBF24' }}>{formatPrice(livePrice)}</span>
          </div>
          {error && <span className="text-xs" style={{ color: '#F87171' }}>⚠ {error}</span>}
          {success && <span className="text-xs" style={{ color: '#22C55E' }}>✓ {success}</span>}
          <button
            onClick={handleSubmit}
            className="px-3 py-1 rounded text-xs font-bold transition-all hover:opacity-90"
            style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}
          >
            Emir Ver
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
            style={{ color: '#8B849C' }}
          >
            İptal
          </button>
        </div>
      </td>
    </tr>
  )
}

export default function Positions({ baseSymbol, coinId, currentPrice }) {
  const { futuresPositions, futuresHistory, futuresPendingOrders, marketData, dispatch } = useExchange()
  const [tab, setTab] = useState('positions')
  const [stopLimitOpenId, setStopLimitOpenId] = useState(null)

  const getMarkPrice = (position) => {
    return marketData[position.coinId]?.current_price || position.entryPrice
  }

  const handleClose = (position) => {
    const closePrice = getMarkPrice(position)
    dispatch({ type: 'CLOSE_FUTURES_POSITION', payload: { positionId: position.id, closePrice } })
  }

  const handleCancelPending = (id) => {
    dispatch({ type: 'CANCEL_FUTURES_PENDING_ORDER', payload: id })
  }

  const calcPnl = (position) => {
    const markPrice = getMarkPrice(position)
    if (position.side === 'long') {
      return ((markPrice - position.entryPrice) / position.entryPrice) * position.size
    } else {
      return ((position.entryPrice - markPrice) / position.entryPrice) * position.size
    }
  }

  const calcPnlPct = (position) => {
    const pnl = calcPnl(position)
    return (pnl / position.margin) * 100
  }

  const tabStyle = (t) => ({
    color: tab === t ? '#8B5CF6' : '#8B849C',
    borderBottom: tab === t ? '2px solid #8B5CF6' : '2px solid transparent',
  })

  return (
    <div style={{ background: '#110F1C', borderTop: '1px solid #1E1B30' }} className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: '#1E1B30' }}>
        <button onClick={() => setTab('positions')} className="px-4 py-2.5 text-sm font-medium transition-colors" style={tabStyle('positions')}>
          Pozisyonlar ({futuresPositions.length})
        </button>
        <button onClick={() => setTab('history')} className="px-4 py-2.5 text-sm font-medium transition-colors" style={tabStyle('history')}>
          Geçmiş ({futuresHistory.length})
        </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">

        {/* Open Positions */}
        {tab === 'positions' && (
          futuresPositions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#8B849C' }}>
              Açık pozisyon yok
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#8B849C', borderBottom: '1px solid #1E1B30' }}>
                  <th className="px-3 py-2 text-left">Sembol</th>
                  <th className="px-3 py-2 text-left">Yön</th>
                  <th className="px-3 py-2 text-right">Büyüklük</th>
                  <th className="px-3 py-2 text-right">Kaldıraç</th>
                  <th className="px-3 py-2 text-right">Giriş Fiyatı</th>
                  <th className="px-3 py-2 text-right">İşaret Fiyatı</th>
                  <th className="px-3 py-2 text-right">Lik. Fiyatı</th>
                  <th className="px-3 py-2 text-right">Marjin</th>
                  <th className="px-3 py-2 text-right">K/Z (ROE%)</th>
                  <th className="px-3 py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {futuresPositions.map(pos => {
                  const markPrice = getMarkPrice(pos)
                  const pnl = calcPnl(pos)
                  const pnlPct = calcPnlPct(pos)
                  return (
                    <React.Fragment key={pos.id}>
                      <tr className="border-b hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                        <td className="px-3 py-2 font-medium" style={{ color: '#F1F0F5' }}>{pos.symbol}</td>
                        <td className="px-3 py-2" style={{ color: pos.side === 'long' ? '#22C55E' : '#F87171' }}>
                          {pos.side.toUpperCase()}
                        </td>
                        <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatNumber(pos.size, 2)} USDT</td>
                        <td className="px-3 py-2 text-right">
                          <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: '#1E1B30', color: '#8B5CF6', fontSize: 10 }}>
                            {pos.leverage}x
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatPrice(pos.entryPrice)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatPrice(markPrice)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#F87171' }}>{formatPrice(pos.liquidationPrice)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatNumber(pos.margin, 2)} USDT</td>
                        <td className="px-3 py-2 text-right">
                          <div style={{ color: pnl >= 0 ? '#22C55E' : '#F87171' }}>
                            <div>{pnl >= 0 ? '+' : ''}{formatNumber(pnl, 2)}</div>
                            <div style={{ fontSize: 10, opacity: 0.8 }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setStopLimitOpenId(stopLimitOpenId === pos.id ? null : pos.id)}
                              className="text-xs px-2 py-0.5 rounded transition-colors hover:opacity-80"
                              style={{
                                background: stopLimitOpenId === pos.id ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.1)',
                                color: '#FBBF24',
                                border: '1px solid rgba(251,191,36,0.3)',
                              }}
                            >
                              ⚡ SL
                            </button>
                            <button
                              onClick={() => handleClose(pos)}
                              className="text-xs px-2 py-0.5 rounded transition-colors hover:opacity-80"
                              style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}
                            >
                              Kapat
                            </button>
                          </div>
                        </td>
                      </tr>
                      {stopLimitOpenId === pos.id && (
                        <InlineStopLimit
                          pos={pos}
                          currentPrice={getMarkPrice(pos)}
                          dispatch={dispatch}
                          onClose={() => setStopLimitOpenId(null)}
                        />
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )
        )}

        {/* History */}
        {tab === 'history' && (
          futuresHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm" style={{ color: '#8B849C' }}>
              Vadeli işlem geçmişi yok
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: '#8B849C', borderBottom: '1px solid #1E1B30' }}>
                  <th className="px-3 py-2 text-left">Sembol</th>
                  <th className="px-3 py-2 text-left">Yön</th>
                  <th className="px-3 py-2 text-right">Büyüklük</th>
                  <th className="px-3 py-2 text-right">Kaldıraç</th>
                  <th className="px-3 py-2 text-right">Giriş Fiyatı</th>
                  <th className="px-3 py-2 text-right">Kapanış Fiyatı</th>
                  <th className="px-3 py-2 text-right">K/Z</th>
                  <th className="px-3 py-2 text-right">Durum</th>
                </tr>
              </thead>
              <tbody>
                {futuresHistory.map(pos => (
                  <tr key={pos.id} className="border-b hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: '#F1F0F5' }}>{pos.symbol}</td>
                    <td className="px-3 py-2" style={{ color: pos.side === 'long' ? '#22C55E' : '#F87171' }}>
                      {pos.side.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatNumber(pos.size, 2)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: '#8B5CF6' }}>{pos.leverage}x</td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatPrice(pos.entryPrice)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: '#F1F0F5' }}>{formatPrice(pos.closePrice || pos.entryPrice)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: (pos.pnl || 0) >= 0 ? '#22C55E' : '#F87171' }}>
                      {(pos.pnl || 0) >= 0 ? '+' : ''}{formatNumber(pos.pnl || 0, 2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="px-1.5 py-0.5 rounded"
                        style={{
                          background: pos.status === 'closed' ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
                          color: pos.status === 'closed' ? '#22C55E' : '#F87171',
                        }}
                      >
                        {pos.status === 'closed' ? 'kapandı' : pos.status === 'liquidated' ? 'tasfiye' : pos.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
