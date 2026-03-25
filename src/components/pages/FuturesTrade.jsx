import React, { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useExchange } from '../../context/ExchangeContext'
import { COINS } from '../../data/coins'
import Sidebar from '../Layout/Sidebar'
import TradingChart from '../trading/TradingChart'
import OrderBook from '../trading/OrderBook'
import RecentTrades from '../trading/RecentTrades'
import FuturesOrderForm from '../trading/FuturesOrderForm'
import Positions from '../trading/Positions'
import { formatPrice, formatChange, formatVolume } from '../../utils/format'

export default function FuturesTrade() {
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

  // Simulated futures-specific data
  const fundingRate = 0.0001 + Math.random() * 0.0003
  const markPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.001)
  const indexPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.0005)
  const openInterest = volume24h * 0.15

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar */}
      <Sidebar type="futures" />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Pair header */}
        <div className="flex items-center gap-5 px-4 py-2.5 border-b flex-shrink-0" style={{ background: '#110F1C', borderColor: '#1E1B30' }}>
          <div className="flex items-center gap-2">
            {coin && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: coin.color, color: '#fff' }}>
                {coin.symbol.charAt(0)}
              </div>
            )}
            <span className="font-bold text-base" style={{ color: '#F1F0F5' }}>{pair}</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}>
              PERP
            </span>
          </div>
          <div>
            <div className="text-lg font-bold" style={{ color: change24h >= 0 ? '#22C55E' : '#F87171' }}>
              {currentPrice > 0 ? `$${formatPrice(currentPrice)}` : loading ? 'Loading...' : '--'}
            </div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>Mark Price</div>
            <div style={{ color: '#F1F0F5' }}>{markPrice > 0 ? formatPrice(markPrice) : '--'}</div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>Index Price</div>
            <div style={{ color: '#F1F0F5' }}>{indexPrice > 0 ? formatPrice(indexPrice) : '--'}</div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>Funding Rate</div>
            <div style={{ color: '#22C55E' }}>{(fundingRate * 100).toFixed(4)}%</div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>24h Change</div>
            <div style={{ color: change24h >= 0 ? '#22C55E' : '#F87171' }}>{formatChange(change24h)}</div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>24h High</div>
            <div style={{ color: '#F1F0F5' }}>{high24h > 0 ? formatPrice(high24h) : '--'}</div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>24h Low</div>
            <div style={{ color: '#F1F0F5' }}>{low24h > 0 ? formatPrice(low24h) : '--'}</div>
          </div>
          <div className="text-xs">
            <div style={{ color: '#8B849C' }}>24h Volume</div>
            <div style={{ color: '#F1F0F5' }}>{volume24h > 0 ? formatVolume(volume24h) : '--'}</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Center */}
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

          {/* Right: Futures Order Form */}
          <div style={{ width: 280, borderLeft: '1px solid #1E1B30' }} className="flex-shrink-0 overflow-hidden">
            <FuturesOrderForm
              baseSymbol={baseSymbol}
              coinId={coin?.id}
              currentPrice={currentPrice}
            />
          </div>
        </div>

        {/* Bottom: Positions — explicit height so it's always visible */}
        <div style={{ height: 260, flexShrink: 0, borderTop: '1px solid #1E1B30' }} className="flex flex-col overflow-hidden">
          <Positions baseSymbol={baseSymbol} coinId={coin?.id} currentPrice={currentPrice} />
        </div>
      </div>
    </div>
  )
}
