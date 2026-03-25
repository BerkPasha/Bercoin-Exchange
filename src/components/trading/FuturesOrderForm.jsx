import React, { useState, useCallback } from 'react'
import { useExchange } from '../../context/ExchangeContext'
import { formatPrice, formatNumber } from '../../utils/format'
import { COINS } from '../../data/coins'

const LEVERAGE_MARKS = [1, 2, 3, 5, 10, 20, 50, 100]

// Isolated margin liquidation price
// Long:  entry × (1 − 1/leverage + MMR)
// Short: entry × (1 + 1/leverage − MMR)
function calcLiqPrice(entryPrice, leverage, side) {
  if (!entryPrice || entryPrice <= 0 || !leverage || leverage <= 0) return null
  const mmr = 0.004 // 0.4% maintenance margin rate (standard)
  if (side === 'long') {
    const liq = entryPrice * (1 - 1 / leverage + mmr)
    return liq > 0 ? liq : null
  } else {
    return entryPrice * (1 + 1 / leverage - mmr)
  }
}

export default function FuturesOrderForm({ baseSymbol, coinId, currentPrice }) {
  const { dispatch, balances, marketData } = useExchange()
  const [side, setSide] = useState('long')
  const [orderType, setOrderType] = useState('Piyasa')
  const [leverage, setLeverage] = useState(10)
  const [price, setPrice] = useState('')
  const [size, setSize] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sliderActive, setSliderActive] = useState(false)

  const availableUSDT = balances.USDT || 0

  // Use currentPrice for market, or entered price for limit
  // Also try marketData directly as a fallback if prop hasn't propagated yet
  const livePrice = currentPrice > 0 ? currentPrice : (coinId ? marketData[coinId]?.current_price || 0 : 0)
  const effectivePrice = orderType === 'Piyasa' ? livePrice : (parseFloat(price) || 0)

  const sizeVal = parseFloat(size) || 0
  const margin = leverage > 0 && sizeVal > 0 ? sizeVal / leverage : 0
  const coinQty = effectivePrice > 0 && sizeVal > 0 ? sizeVal / effectivePrice : 0
  const liqPrice = calcLiqPrice(effectivePrice, leverage, side)

  // % distance from entry to liquidation
  const liqDistancePct = liqPrice && effectivePrice > 0
    ? Math.abs((liqPrice - effectivePrice) / effectivePrice * 100)
    : null

  // Est. PnL = 1% of notional; ROE = pnl / margin
  const pnlPotential = sizeVal > 0 ? sizeVal * 0.01 : 0
  const roe = margin > 0 && pnlPotential > 0 ? (pnlPotential / margin) * 100 : 0

  const handleLeverageChange = (e) => setLeverage(parseInt(e.target.value))

  const handlePctClick = (pct) => {
    // max position = available balance × leverage
    const maxNotional = availableUSDT * leverage * pct
    setSize(maxNotional.toFixed(2))
  }

  const validate = () => {
    if (!sizeVal || sizeVal <= 0) return 'Geçerli bir emir değeri girin'
    if (orderType === 'Limit' && (!parseFloat(price) || parseFloat(price) <= 0)) return 'Geçerli bir limit fiyatı girin'
    if (margin < 1) return 'Minimum marjin $1'
    return null
  }

  const handleSubmit = useCallback(() => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    dispatch({
      type: 'OPEN_FUTURES_POSITION',
      payload: {
        symbol: `${baseSymbol}USDT`,
        coinId,
        side,
        leverage,
        size: sizeVal,
        entryPrice: effectivePrice,
        orderType: orderType === 'Piyasa' ? 'market' : 'limit',
      },
    })

    setSuccess(`${side === 'long' ? '▲ Long' : '▼ Short'} pozisyon açıldı!`)
    setSize('')
    setPrice('')
    setTimeout(() => setSuccess(''), 3000)
  }, [side, orderType, leverage, price, size, baseSymbol, coinId, effectivePrice, dispatch])

  const priceLoaded = livePrice > 0
  const infoColor = '#8B849C'
  const valueColor = '#F1F0F5'

  return (
    <div style={{ background: '#110F1C' }} className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#1E1B30' }}>
        <span className="text-sm font-semibold" style={{ color: '#F1F0F5' }}>Pozisyon Aç</span>
        {priceLoaded && (
          <span className="text-xs font-medium" style={{ color: '#8B5CF6' }}>
            {formatPrice(livePrice)} USDT
          </span>
        )}
      </div>

      {/* Long / Short Toggle */}
      <div className="flex" style={{ borderBottom: '1px solid #1E1B30' }}>
        <button
          onClick={() => setSide('long')}
          className="flex-1 py-2.5 text-sm font-bold transition-all"
          style={{
            background: side === 'long' ? 'rgba(34,197,94,0.08)' : 'transparent',
            color: side === 'long' ? '#22C55E' : '#8B849C',
            borderBottom: side === 'long' ? '2px solid #22C55E' : '2px solid transparent',
          }}
        >
          ▲ Long
        </button>
        <button
          onClick={() => setSide('short')}
          className="flex-1 py-2.5 text-sm font-bold transition-all"
          style={{
            background: side === 'short' ? 'rgba(248,113,113,0.08)' : 'transparent',
            color: side === 'short' ? '#F87171' : '#8B849C',
            borderBottom: side === 'short' ? '2px solid #F87171' : '2px solid transparent',
          }}
        >
          ▼ Short
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Order Type */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#1E1B30' }}>
          {['Piyasa', 'Limit'].map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className="flex-1 py-1.5 text-xs rounded-md font-medium transition-all"
              style={{
                background: orderType === t ? '#2C2840' : 'transparent',
                color: orderType === t ? '#F1F0F5' : '#8B849C',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Available Balance */}
        <div className="flex justify-between text-xs px-1">
          <span style={{ color: infoColor }}>Kullanılabilir</span>
          <span style={{ color: valueColor }}>{formatNumber(availableUSDT, 2)} USDT</span>
        </div>

        {/* Limit Price (Limit orders) */}
        {orderType === 'Limit' && (
          <div>
            <label className="block text-xs mb-1 px-1" style={{ color: infoColor }}>Limit Fiyatı (USDT)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={priceLoaded ? formatPrice(livePrice) : '0.00'}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: '#1E1B30', color: valueColor, border: '1px solid #2C2840' }}
            />
          </div>
        )}

        {/* Leverage Selector */}
        <div className="rounded-lg p-3" style={{ background: '#1A1729', border: '1px solid #2C2840' }}>
          {/* Prominent leverage badge */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: infoColor }}>Kaldıraç</span>
            <div className="flex items-center justify-center rounded-xl px-4 py-1.5 font-black" style={{
              background: 'rgba(139,92,246,0.18)',
              color: '#A78BFA',
              border: '1.5px solid rgba(139,92,246,0.5)',
              boxShadow: '0 0 14px rgba(139,92,246,0.3)',
              fontSize: 20,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              minWidth: 64,
              textAlign: 'center',
            }}>
              {leverage}<span style={{ fontSize: 13, opacity: 0.75 }}>×</span>
            </div>
          </div>

          {/* Slider - expands on drag */}
          <div style={{
            padding: sliderActive ? '8px 0' : '3px 0',
            transition: 'padding 0.18s ease',
          }}>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={leverage}
              onChange={handleLeverageChange}
              onPointerDown={() => setSliderActive(true)}
              onPointerUp={() => setSliderActive(false)}
              onPointerLeave={() => setSliderActive(false)}
              className="w-full cursor-pointer"
              style={{
                accentColor: '#8B5CF6',
                height: sliderActive ? 8 : 5,
                transition: 'height 0.18s ease',
              }}
            />
          </div>

          <div className="flex justify-between mt-2">
            {LEVERAGE_MARKS.map(m => (
              <button
                key={m}
                onClick={() => setLeverage(m)}
                className="text-xs rounded px-1 py-0.5 transition-all"
                style={{
                  color: leverage === m ? '#A78BFA' : '#8B849C',
                  background: leverage === m ? 'rgba(139,92,246,0.15)' : 'transparent',
                  fontWeight: leverage === m ? '700' : '400',
                  border: leverage === m ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                }}
              >
                {m}×
              </button>
            ))}
          </div>
        </div>

        {/* Order Value */}
        <div>
          <div className="flex justify-between text-xs mb-1 px-1">
            <label style={{ color: infoColor }}>Emir Değeri (USDT)</label>
            {effectivePrice > 0 && (
              <span style={{ color: '#8B5CF6', fontSize: 10 }}>
                Maks: {formatNumber(availableUSDT * leverage, 0)} USDT
              </span>
            )}
          </div>
          <input
            type="number"
            value={size}
            onChange={e => setSize(e.target.value)}
            placeholder="USDT miktarını girin"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: '#1E1B30', color: valueColor, border: '1px solid #2C2840' }}
          />
        </div>

        {/* Quick % Buttons */}
        <div className="grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <button
              key={pct}
              onClick={() => handlePctClick(pct)}
              className="py-1.5 text-xs rounded-lg transition-all hover:opacity-90"
              style={{ background: '#1E1B30', color: '#8B849C', border: '1px solid #2C2840' }}
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        {/* Position Info Panel */}
        <div className="rounded-lg p-3 space-y-2 text-xs" style={{ background: '#0D0B1A', border: '1px solid #1E1B30' }}>
          <div className="flex justify-between">
            <span style={{ color: infoColor }}>Gereken Marjin</span>
            <span style={{ color: valueColor, fontWeight: 600 }}>
              {margin > 0 ? `${formatNumber(margin, 2)} USDT` : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: infoColor }}>Pozisyon Büyüklüğü</span>
            <span style={{ color: valueColor }}>
              {coinQty > 0 ? `${formatNumber(coinQty, 6)} ${baseSymbol}` : '--'}
            </span>
          </div>
          <div style={{ borderTop: '1px solid #1E1B30', paddingTop: 8, marginTop: 4 }}>
            <div className="flex justify-between items-start">
              <span style={{ color: infoColor }}>Likidasyon Fiyatı</span>
              <div className="text-right">
                {!priceLoaded ? (
                  <span style={{ color: '#8B849C', fontStyle: 'italic' }}>Fiyat yükleniyor…</span>
                ) : liqPrice !== null ? (
                  <>
                    <span style={{ color: '#F87171', fontWeight: 700 }}>
                      ${formatPrice(liqPrice)}
                    </span>
                    {liqDistancePct !== null && (
                      <div style={{ color: '#8B849C', fontSize: 10, marginTop: 1 }}>
                        {liqDistancePct.toFixed(2)}% giriş fiyatından
                        {' · '}{side === 'long' ? '↓' : '↑'}
                        {side === 'long' ? ' fiyat düşüşü' : ' fiyat artışı'}
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: '#8B849C' }}>--</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <span style={{ color: infoColor }}>Tahmini K/Z (%1 hareket)</span>
            <span style={{ color: '#22C55E', fontWeight: 600 }}>
              {pnlPotential > 0 ? `±$${formatNumber(pnlPotential, 4)}` : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: infoColor }}>ROE (%1 hareket)</span>
            <span style={{ color: '#22C55E' }}>
              {roe > 0 ? `±${formatNumber(roe, 2)}%` : '--'}
            </span>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
            ⚠ {error}
          </div>
        )}
        {success && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
            ✓ {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: side === 'long'
              ? 'linear-gradient(135deg, #16A34A, #22C55E)'
              : 'linear-gradient(135deg, #DC2626, #F87171)',
            color: 'white',
            boxShadow: side === 'long'
              ? '0 4px 14px rgba(34,197,94,0.3)'
              : '0 4px 14px rgba(248,113,113,0.3)',
          }}
        >
          {side === 'long' ? `▲ ${baseSymbol} Long Aç` : `▼ ${baseSymbol} Short Aç`}
        </button>

        <div className="text-xs text-center" style={{ color: '#8B849C' }}>
          Taker %0.05 · Maker %0.02 · İzole Marjin
        </div>
      </div>
    </div>
  )
}
