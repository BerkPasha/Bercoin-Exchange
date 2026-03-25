import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import axios from 'axios'
import { fetchChartData } from '../../hooks/useCoinGecko'
import { COINS } from '../../data/coins'
import { formatPrice, formatDate, formatTime, formatVolume } from '../../utils/format'

// ─── Zaman Aralıkları ────────────────────────────────────────────────────────
const TIME_RANGES = [
  { label: '1H', days: 1,  interval: 'minutely', binanceInterval: '1m',  binanceLimit: 60,  intraday: true  },
  { label: '1D', days: 7,  interval: 'hourly',   binanceInterval: '15m', binanceLimit: 96,  intraday: true  },
  { label: '1W', days: 30, interval: 'daily',    binanceInterval: '4h',  binanceLimit: 42,  intraday: true  },
  { label: '1M', days: 90, interval: 'daily',    binanceInterval: '1d',  binanceLimit: 30,  intraday: false },
]

// ─── Binance API'den mum verisi çek ─────────────────────────────────────────
async function fetchBinanceKlines(symbol, interval, limit) {
  try {
    const res = await axios.get('https://api.binance.com/api/v3/klines', {
      params: { symbol, interval, limit },
      timeout: 10000,
    })
    return res.data.map(k => ({
      time:   k[0],
      open:   parseFloat(k[1]),
      high:   parseFloat(k[2]),
      low:    parseFloat(k[3]),
      close:  parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
  } catch (err) {
    console.error('Binance klines hatası:', err)
    return []
  }
}

// ─── Zaman formatlayıcılar ────────────────────────────────────────────────────
function candleLabel(ts, intraday) {
  const d = new Date(ts)
  return intraday
    ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })
}
function candleTooltipTime(ts) {
  return new Date(ts).toLocaleString('tr-TR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Alan grafiği tooltip ─────────────────────────────────────────────────────
const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1E1B30', border: '1px solid #2C2840', borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
      <div style={{ color: '#8B849C' }}>{label}</div>
      <div style={{ color: '#F1F0F5', fontWeight: 600, marginTop: 2 }}>
        ${formatPrice(payload[0]?.value)}
      </div>
    </div>
  )
}

// ─── Mum (Candlestick) SVG Bileşeni ──────────────────────────────────────────
function CandlestickCanvas({ data, intraday }) {
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = dims
  const pad = { top: 10, right: 74, bottom: 26, left: 6 }
  const cW = w - pad.left - pad.right
  const cH = h - pad.top - pad.bottom
  const canDraw = data.length > 0 && cW >= 20 && cH >= 20

  // Hesaplama değişkenleri
  let cv = null
  if (canDraw) {
    const maxP = Math.max(...data.map(d => d.high)) * 1.001
    const minP = Math.min(...data.map(d => d.low))  * 0.999
    const priceRange = maxP - minP || 1
    const step = cW / data.length
    const candleW = Math.max(1, step * 0.68)
    const toX = i => pad.left + step * i + step / 2
    const toY = p => pad.top + cH - ((p - minP) / priceRange) * cH
    const xStep = Math.max(1, Math.ceil(data.length / 6))
    const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map(pct => ({
      price: minP + priceRange * pct,
      y: toY(minP + priceRange * pct),
    }))
    cv = { step, candleW, toX, toY, xStep, yTicks }
  }

  const handleMouseMove = useCallback((e) => {
    if (!cv) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left - pad.left
    const i = Math.max(0, Math.min(data.length - 1, Math.floor(mx / cv.step)))
    setHovered({ i, svgX: cv.toX(i), mx: e.clientX - rect.left, my: e.clientY - rect.top })
  }, [cv, data.length])

  const hovD = hovered ? data[hovered.i] : null

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {canDraw && cv && (
        <>
          <svg
            width={w} height={h}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'block' }}
          >
            {/* Y ızgarası + fiyat etiketleri */}
            {cv.yTicks.map(({ y, price }, idx) => (
              <g key={idx}>
                <line x1={pad.left} y1={y} x2={w - pad.right} y2={y}
                  stroke="#1E1B30" strokeWidth={1} />
                <text x={w - pad.right + 5} y={y + 3.5} fontSize={9.5} fill="#8B849C">
                  {formatPrice(price)}
                </text>
              </g>
            ))}

            {/* X ekseni zaman etiketleri */}
            {data.map((d, i) => {
              if (i % cv.xStep !== 0) return null
              return (
                <text key={i} x={cv.toX(i)} y={h - 5}
                  fontSize={9} fill="#8B849C" textAnchor="middle">
                  {candleLabel(d.time, intraday)}
                </text>
              )
            })}

            {/* Mum çubukları */}
            {data.map((d, i) => {
              const isUp  = d.close >= d.open
              const color = isUp ? '#22C55E' : '#F87171'
              const cx    = cv.toX(i)
              const yHigh = cv.toY(d.high)
              const yLow  = cv.toY(d.low)
              const yTop  = cv.toY(Math.max(d.open, d.close))
              const yBot  = cv.toY(Math.min(d.open, d.close))
              const bH    = Math.max(1, yBot - yTop)
              return (
                <g key={i}>
                  {/* Üst/alt fitil */}
                  <line x1={cx} y1={yHigh} x2={cx} y2={yLow}
                    stroke={color} strokeWidth={1} />
                  {/* Gövde */}
                  <rect
                    x={cx - cv.candleW / 2} y={yTop}
                    width={cv.candleW} height={bH}
                    fill={isUp ? 'transparent' : color}
                    stroke={color} strokeWidth={1}
                  />
                </g>
              )
            })}

            {/* Dikey crosshair */}
            {hovered && (
              <line
                x1={hovered.svgX} y1={pad.top}
                x2={hovered.svgX} y2={h - pad.bottom}
                stroke="#8B5CF6" strokeWidth={1}
                strokeDasharray="3 3" pointerEvents="none"
              />
            )}
          </svg>

          {/* Hover tooltip */}
          {hovD && (() => {
            const isUp = hovD.close >= hovD.open
            const tipW = 160
            const tipL = hovered.mx + 16 + tipW > w
              ? hovered.mx - tipW - 16
              : hovered.mx + 16
            const rows = [
              { label: 'Açılış',  val: formatPrice(hovD.open),  clr: '#F1F0F5'                      },
              { label: 'Yüksek', val: formatPrice(hovD.high),  clr: '#22C55E'                       },
              { label: 'Düşük',  val: formatPrice(hovD.low),   clr: '#F87171'                       },
              { label: 'Kapanış',val: formatPrice(hovD.close), clr: isUp ? '#22C55E' : '#F87171'    },
            ]
            return (
              <div style={{
                position: 'absolute', left: tipL, top: 8,
                background: '#14111F', border: '1px solid #2C2840',
                borderRadius: 7, padding: '7px 11px',
                fontSize: 11, pointerEvents: 'none', zIndex: 30,
                minWidth: tipW, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}>
                <div style={{ color: '#8B849C', marginBottom: 5, fontSize: 10 }}>
                  {candleTooltipTime(hovD.time)}
                </div>
                {rows.map(({ label, val, clr }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, lineHeight: 1.7 }}>
                    <span style={{ color: '#6B6580' }}>{label}</span>
                    <span style={{ color: clr, fontWeight: 600 }}>${val}</span>
                  </div>
                ))}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', gap: 14,
                  marginTop: 5, paddingTop: 5, borderTop: '1px solid #2C2840',
                }}>
                  <span style={{ color: '#6B6580' }}>Hacim</span>
                  <span style={{ color: '#8B5CF6', fontWeight: 600 }}>
                    {formatVolume(hovD.volume)}
                  </span>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ─── Ana TradingChart Bileşeni ────────────────────────────────────────────────
export default function TradingChart({ coinId, currentPrice }) {
  const [range,      setRange]      = useState('1D')
  const [chartType,  setChartType]  = useState('alan')  // 'alan' | 'cubuk'
  const [chartData,  setChartData]  = useState([])
  const [candleData, setCandleData] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [isUp,       setIsUp]       = useState(true)

  // coinId → Binance sembolü (örn. 'bitcoin' → 'BTCUSDT')
  const coin          = COINS.find(c => c.id === coinId)
  const binanceSymbol = coin ? `${coin.symbol}USDT` : null
  const rc            = TIME_RANGES.find(r => r.label === range) || TIME_RANGES[1]

  // Alan grafiği yükle — CoinGecko
  const loadArea = useCallback(async () => {
    if (!coinId) return
    setLoading(true)
    const rangeConf = TIME_RANGES.find(r => r.label === range) || TIME_RANGES[1]
    const data = await fetchChartData(coinId, rangeConf.days)
    if (data?.prices && Array.isArray(data.prices)) {
      const formatted = data.prices.map(([ts, price]) => ({
        time: rangeConf.days <= 1 ? formatTime(ts) : formatDate(ts),
        price,
      }))
      setChartData(formatted)
      if (formatted.length >= 2)
        setIsUp(formatted.at(-1).price >= formatted[0].price)
    }
    setLoading(false)
  }, [coinId, range])

  // Mum grafiği yükle — Binance
  const loadCandle = useCallback(async () => {
    if (!binanceSymbol) return
    setLoading(true)
    const rangeConf = TIME_RANGES.find(r => r.label === range) || TIME_RANGES[1]
    const data = await fetchBinanceKlines(
      binanceSymbol,
      rangeConf.binanceInterval,
      rangeConf.binanceLimit,
    )
    setCandleData(data)
    if (data.length >= 2)
      setIsUp(data.at(-1).close >= data[0].open)
    setLoading(false)
  }, [binanceSymbol, range])

  useEffect(() => {
    if (chartType === 'alan') loadArea()
    else                       loadCandle()
  }, [chartType, loadArea, loadCandle])

  // Değişim yüzdesi
  const areaChange = chartData.length >= 2
    ? ((chartData.at(-1).price - chartData[0].price) / chartData[0].price) * 100 : 0
  const candleChange = candleData.length >= 2
    ? ((candleData.at(-1).close - candleData[0].open) / candleData[0].open) * 100 : 0
  const displayChange = chartType === 'alan' ? areaChange : candleChange

  const color      = isUp ? '#22C55E' : '#F87171'
  const gradId     = `cgr-${isUp ? 'up' : 'dn'}`
  const minP       = chartData.length ? Math.min(...chartData.map(d => d.price)) : 0
  const maxP       = chartData.length ? Math.max(...chartData.map(d => d.price)) : 0
  const priceDomain = [minP * 0.998, maxP * 1.002]

  return (
    <div style={{ background: '#110F1C' }} className="flex flex-col h-full">

      {/* ── Başlık çubuğu ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: '#1E1B30' }}>

        {/* Sol: fiyat + değişim */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: '#F1F0F5' }}>
            ${formatPrice(currentPrice)}
          </span>
          <span className="text-sm font-medium"
            style={{ color: displayChange >= 0 ? '#22C55E' : '#F87171' }}>
            {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}%
          </span>
          {chartType === 'cubuk' && (
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'rgba(139,92,246,0.14)', color: '#8B5CF6', fontSize: 10 }}>
              Binance
            </span>
          )}
        </div>

        {/* Sağ: grafik türü + zaman aralığı */}
        <div className="flex items-center gap-1.5">

          {/* Grafik türü toggle */}
          <div className="flex items-center rounded-md overflow-hidden"
            style={{ border: '1px solid #1E1B30', background: '#0D0B1A' }}>

            {/* Alan butonu */}
            <button
              onClick={() => setChartType('alan')}
              title="Alan Grafiği (CoinGecko)"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: chartType === 'alan' ? '#1E1B30' : 'transparent',
                color:      chartType === 'alan' ? '#F1F0F5' : '#8B849C',
              }}
            >
              <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
                <path d="M1 9.5 L4 5 L6.5 6.5 L10 2 L12 3.5"
                  stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 9.5 L4 5 L6.5 6.5 L10 2 L12 3.5 L12 11 L1 11 Z"
                  fill="currentColor" fillOpacity="0.18"/>
              </svg>
              Alan
            </button>

            {/* Çubuk / Mum butonu */}
            <button
              onClick={() => setChartType('cubuk')}
              title="Çubuk Grafiği (Binance)"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background:  chartType === 'cubuk' ? '#1E1B30' : 'transparent',
                color:       chartType === 'cubuk' ? '#F1F0F5' : '#8B849C',
                borderLeft: '1px solid #1E1B30',
              }}
            >
              <svg width="13" height="12" viewBox="0 0 13 12" fill="none">
                <line x1="2.5" y1="0.5" x2="2.5" y2="11.5"
                  stroke="currentColor" strokeWidth="1"/>
                <rect x="1" y="3" width="3" height="5"
                  fill="currentColor" rx="0.5"/>
                <line x1="7" y1="1.5" x2="7" y2="11.5"
                  stroke="currentColor" strokeWidth="1"/>
                <rect x="5.5" y="4" width="3" height="4"
                  fill="transparent" stroke="currentColor" rx="0.5" strokeWidth="1"/>
                <line x1="11.5" y1="2" x2="11.5" y2="10"
                  stroke="currentColor" strokeWidth="1"/>
                <rect x="10" y="4.5" width="3" height="3"
                  fill="currentColor" rx="0.5"/>
              </svg>
              Çubuk
            </button>
          </div>

          {/* Ayırıcı */}
          <div style={{ width: 1, height: 16, background: '#1E1B30', margin: '0 2px' }} />

          {/* Zaman aralığı butonları */}
          {TIME_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.label)}
              className="px-2.5 py-1 text-xs rounded font-medium transition-colors"
              style={{
                background: range === r.label ? '#8B5CF6' : 'transparent',
                color:      range === r.label ? '#09080F' : '#8B849C',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grafik alanı ── */}
      <div className="flex-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm" style={{ color: '#8B849C' }}>
              {chartType === 'cubuk' ? 'Binance verisi yükleniyor…' : 'Grafik verisi yükleniyor…'}
            </div>
          </div>

        ) : chartType === 'alan' ? (
          chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm" style={{ color: '#8B849C' }}>Veri bulunamadı</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E1B30" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#8B849C', fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={priceDomain}
                  tick={{ fill: '#8B849C', fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => formatPrice(v)}
                  width={70}
                />
                <Tooltip content={<AreaTooltip />} />
                <Area
                  type="monotone" dataKey="price"
                  stroke={color} strokeWidth={1.5}
                  fill={`url(#${gradId})`}
                  dot={false}
                  activeDot={{ r: 3, fill: color }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )

        ) : (
          // ── Çubuk / Mum Grafiği ──
          candleData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-sm" style={{ color: '#8B849C' }}>
                {binanceSymbol ? 'Binance verisi alınamadı' : 'Sembol bulunamadı'}
              </div>
            </div>
          ) : (
            <CandlestickCanvas data={candleData} intraday={rc.intraday} />
          )
        )}
      </div>
    </div>
  )
}
