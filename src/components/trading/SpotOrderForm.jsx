import React, { useState, useCallback } from 'react'
import { useExchange } from '../../context/ExchangeContext'
import { formatPrice, formatNumber } from '../../utils/format'

const ORDER_TYPES = ['Piyasa', 'Limit', 'Stop-Limit']
const ORDER_TYPE_MAP = { 'Piyasa': 'Market', 'Limit': 'Limit', 'Stop-Limit': 'Stop-Limit' }

export default function SpotOrderForm({ baseSymbol, quoteSymbol = 'USDT', currentPrice }) {
  const { dispatch, balances } = useExchange()
  const [side, setSide] = useState('buy')
  const [orderType, setOrderType] = useState('Piyasa')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const availableBase = balances[baseSymbol] || 0
  const availableQuote = balances[quoteSymbol] || 0

  const effectivePrice = orderType === 'Piyasa' ? currentPrice : parseFloat(price) || 0
  const totalCost = (parseFloat(amount) || 0) * effectivePrice

  const handlePctClick = (pct) => {
    if (side === 'buy') {
      if (effectivePrice > 0) {
        const maxAmount = (availableQuote * pct) / effectivePrice
        setAmount(maxAmount.toFixed(6))
      }
    } else {
      setAmount((availableBase * pct).toFixed(6))
    }
  }

  const validate = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return 'Geçerli bir miktar girin'
    if (orderType !== 'Piyasa' && (!parseFloat(price) || parseFloat(price) <= 0)) return 'Geçerli bir fiyat girin'
    if (side === 'buy') {
      if (totalCost > availableQuote) return 'Yetersiz USDT bakiyesi'
    } else {
      if (amt > availableBase) return `Yetersiz ${baseSymbol} bakiyesi`
    }
    return null
  }

  const handleSubmit = useCallback(() => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    dispatch({
      type: 'PLACE_SPOT_ORDER',
      payload: {
        baseSymbol,
        quoteSymbol,
        side,
        orderType: ORDER_TYPE_MAP[orderType].toLowerCase().replace('-', '_'),
        price: parseFloat(price) || currentPrice,
        amount: parseFloat(amount),
      },
    })

    setSuccess(`${side === 'buy' ? 'Alım' : 'Satım'} emri verildi!`)
    setAmount('')
    setTimeout(() => setSuccess(''), 2000)
  }, [side, orderType, price, amount, baseSymbol, quoteSymbol, currentPrice, dispatch])

  return (
    <div style={{ background: '#110F1C' }} className="flex flex-col h-full">
      <div className="px-3 py-2 border-b" style={{ borderColor: '#1E1B30' }}>
        <span className="text-sm font-semibold" style={{ color: '#F1F0F5' }}>Emir Ver</span>
      </div>

      {/* Buy / Sell Toggle */}
      <div className="flex border-b" style={{ borderColor: '#1E1B30' }}>
        <button
          onClick={() => setSide('buy')}
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={{
            color: side === 'buy' ? '#22C55E' : '#8B849C',
            borderBottom: side === 'buy' ? '2px solid #22C55E' : '2px solid transparent',
          }}
        >
          Al
        </button>
        <button
          onClick={() => setSide('sell')}
          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
          style={{
            color: side === 'sell' ? '#F87171' : '#8B849C',
            borderBottom: side === 'sell' ? '2px solid #F87171' : '2px solid transparent',
          }}
        >
          Sat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Order type */}
        <div className="flex gap-1">
          {ORDER_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className="px-2 py-1 text-xs rounded transition-colors"
              style={{
                background: orderType === t ? '#1E1B30' : 'transparent',
                color: orderType === t ? '#F1F0F5' : '#8B849C',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Available */}
        <div className="flex justify-between text-xs">
          <span style={{ color: '#8B849C' }}>Kullanılabilir</span>
          <span style={{ color: '#F1F0F5' }}>
            {side === 'buy'
              ? `${formatNumber(availableQuote, 2)} USDT`
              : `${formatNumber(availableBase, 6)} ${baseSymbol}`}
          </span>
        </div>

        {/* Stop Price (Stop-Limit only) */}
        {orderType === 'Stop-Limit' && (
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8B849C' }}>Stop Fiyatı (USDT)</label>
            <input
              type="number"
              value={stopPrice}
              onChange={e => setStopPrice(e.target.value)}
              placeholder={currentPrice > 0 ? formatPrice(currentPrice) : '0.00'}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1E1B30', color: '#F1F0F5', border: '1px solid #2C2840' }}
            />
          </div>
        )}

        {/* Limit Price */}
        {orderType !== 'Piyasa' && (
          <div>
            <label className="block text-xs mb-1" style={{ color: '#8B849C' }}>Fiyat (USDT)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder={currentPrice > 0 ? formatPrice(currentPrice) : '0.00'}
              className="w-full px-3 py-2 rounded text-sm outline-none"
              style={{ background: '#1E1B30', color: '#F1F0F5', border: '1px solid #2C2840' }}
            />
          </div>
        )}

        {orderType === 'Piyasa' && (
          <div className="py-2 px-3 rounded text-xs" style={{ background: '#1E1B30', color: '#8B849C' }}>
            Piyasa Fiyatı: <span style={{ color: '#8B5CF6' }}>{currentPrice > 0 ? `$${formatPrice(currentPrice)}` : 'Yükleniyor...'}</span>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs mb-1" style={{ color: '#8B849C' }}>Miktar ({baseSymbol})</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{ background: '#1E1B30', color: '#F1F0F5', border: '1px solid #2C2840' }}
          />
        </div>

        {/* Percentage quick buttons */}
        <div className="grid grid-cols-4 gap-1">
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <button
              key={pct}
              onClick={() => handlePctClick(pct)}
              className="py-1 text-xs rounded transition-colors hover:opacity-80"
              style={{ background: '#1E1B30', color: '#8B849C' }}
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-between text-xs">
          <span style={{ color: '#8B849C' }}>Toplam (USDT)</span>
          <span style={{ color: '#F1F0F5' }}>{totalCost > 0 ? formatNumber(totalCost, 2) : '0.00'}</span>
        </div>

        {/* Error / Success */}
        {error && <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>{error}</div>}
        {success && <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>{success}</div>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full py-2.5 rounded text-sm font-semibold transition-opacity hover:opacity-90"
          style={{
            background: side === 'buy' ? '#22C55E' : '#F87171',
            color: '#fff',
          }}
        >
          {side === 'buy' ? `${baseSymbol} Al` : `${baseSymbol} Sat`}
        </button>

        {/* Fee note */}
        <div className="text-xs text-center" style={{ color: '#8B849C' }}>
          Maker/Taker Ücreti: %0.1 / %0.1
        </div>
      </div>
    </div>
  )
}
