import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useExchange } from '../../context/ExchangeContext'
import { COINS } from '../../data/coins'
import Sidebar from '../Layout/Sidebar'
import TradingChart from '../trading/TradingChart'
import OrderBook from '../trading/OrderBook'
import RecentTrades from '../trading/RecentTrades'
import SpotOrderForm from '../trading/SpotOrderForm'
import OpenOrders from '../trading/OpenOrders'
import { formatPrice, formatChange, formatVolume } from '../../utils/format'

export default function SpotTrade() {
  const { pair = 'BTC-USDT' } = useParams()
  const { marketData, loading } = useExchange()

  const [baseSymbol, quoteSymbol] = pair.split('-')
  const coin = COINS.find(c => c.symbol === baseSymbol)

  const coinData = useMemo(() => {
    if (!coin) return null
    return marketData[coin.id] || null
  }, [marketData, coin])

  const currentPrice = coinData?.current_price || 0
  const change24h = coinData?.price_change_percentage_24h || 0
  const high24h = coinData?.high_24h || 0
  const low24h = coinData?.low_24h || 0
  const volume24h = coinData?.total_volume || 0

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar */}
      <Sidebar type="spot" />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Pair header */}
        <div className="flex items-center gap-6 px-4 py-2.5 border-b flex-shrink-0" style={{ background: '#110F1C', borderColor: '#1E1B30' }}>
          <div className="flex items-center gap-2">
            {coin && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: coin.color, color: '#fff' }}>
                {coin.symbol.charAt(0)}
              </div>
            )}
            <span className="font-bold text-base" style={{ color: '#F1F0F5' }}>{pair}</span>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: change24h >= 0 ? '#22C55E' : '#F87171' }}>
              {currentPrice > 0 ? `$${formatPrice(currentPrice)}` : loading ? 'Yükleniyor...' : '--'}
            </div>
          </div>
          <div className="text-sm">
            <div style={{ color: '#8B849C', fontSize: 11 }}>24s Değişim</div>
            <div style={{ color: change24h >= 0 ? '#22C55E' : '#F87171' }}>{formatChange(change24h)}</div>
          </div>
          <div className="text-sm">
            <div style={{ color: '#8B849C', fontSize: 11 }}>24s Yüksek</div>
            <div style={{ color: '#F1F0F5' }}>{high24h > 0 ? formatPrice(high24h) : '--'}</div>
          </div>
          <div className="text-sm">
            <div style={{ color: '#8B849C', fontSize: 11 }}>24s Düşük</div>
            <div style={{ color: '#F1F0F5' }}>{low24h > 0 ? formatPrice(low24h) : '--'}</div>
          </div>
          <div className="text-sm">
            <div style={{ color: '#8B849C', fontSize: 11 }}>24s Hacim</div>
            <div style={{ color: '#F1F0F5' }}>{volume24h > 0 ? formatVolume(volume24h) : '--'}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Center: Chart + Bottom row */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Chart */}
            <div style={{ flex: '0 0 52%' }}>
              {coin && (
                <TradingChart coinId={coin.id} currentPrice={currentPrice} />
              )}
            </div>

            {/* Order book + Recent trades */}
            <div className="flex flex-1 overflow-hidden border-t" style={{ borderColor: '#1E1B30' }}>
              <div className="flex-1 overflow-hidden border-r" style={{ borderColor: '#1E1B30' }}>
                <OrderBook coinId={coin?.id} currentPrice={currentPrice} baseSymbol={baseSymbol} />
              </div>
              <div style={{ width: 220 }} className="overflow-hidden">
                <RecentTrades currentPrice={currentPrice} baseSymbol={baseSymbol} />
              </div>
            </div>
          </div>

          {/* Right: Order form */}
          <div style={{ width: 280, borderLeft: '1px solid #1E1B30' }} className="flex-shrink-0 overflow-hidden">
            <SpotOrderForm
              baseSymbol={baseSymbol}
              quoteSymbol={quoteSymbol}
              currentPrice={currentPrice}
            />
          </div>
        </div>

        {/* Bottom: Open Orders — explicit height so it's always visible */}
        <div style={{ height: 240, flexShrink: 0, borderTop: '1px solid #1E1B30' }} className="flex flex-col overflow-hidden">
          <OpenOrders baseSymbol={baseSymbol} />
        </div>
      </div>
    </div>
  )
}
