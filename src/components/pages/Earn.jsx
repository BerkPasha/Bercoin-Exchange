import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useExchange } from '../../context/ExchangeContext'
import { formatNumber, formatPrice, formatVolume } from '../../utils/format'
import {
  STAKE_POOLS, BRK_ADVANTAGES, BRK_INFO,
  fetchBRKChartData, candlesToAreaData,
  apyPerSecond,
} from '../../data/berkCoin'

// ─── 5-hour threshold in ms ──────────────────────────────────────────────────
const BRK_UNLOCK_MS = 5 * 60 * 60 * 1000   // 5 hours

// ─── BRK Candlestick chart (SVG) ─────────────────────────────────────────────
function BRKCandleChart({ data }) {
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [hovered, setHovered] = useState(null)
  const ref = React.useRef(null)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect
      setDims({ w: Math.floor(width), h: Math.floor(height) })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const { w, h } = dims
  const pad = { top: 8, right: 70, bottom: 24, left: 4 }
  const cW = w - pad.left - pad.right
  const cH = h - pad.top - pad.bottom

  const cv = useMemo(() => {
    if (!data.length || cW < 20 || cH < 20) return null
    const maxP = Math.max(...data.map(d => d.high)) * 1.001
    const minP = Math.min(...data.map(d => d.low))  * 0.999
    const pr   = maxP - minP || 1
    const step = cW / data.length
    const cw   = Math.max(1, step * 0.68)
    const toX  = i => pad.left + step * i + step / 2
    const toY  = p => pad.top + cH - ((p - minP) / pr) * cH
    const yTks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
      price: minP + pr * pct,
      y: toY(minP + pr * pct),
    }))
    const xStep = Math.max(1, Math.ceil(data.length / 6))
    return { step, cw, toX, toY, yTks, xStep }
  }, [data, cW, cH])

  const handleMouseMove = useCallback(e => {
    if (!cv) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left - pad.left
    const i  = Math.max(0, Math.min(data.length - 1, Math.floor(mx / cv.step)))
    setHovered({ i, svgX: cv.toX(i), mx: e.clientX - rect.left, my: e.clientY - rect.top })
  }, [cv, data.length])

  const hovD = hovered ? data[hovered.i] : null

  const formatLabel = ts => {
    const d = new Date(ts)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {cv && (
        <>
          <svg width={w} height={h}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHovered(null)}
            style={{ display: 'block' }}
          >
            {cv.yTks.map(({ y, price }, idx) => (
              <g key={idx}>
                <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#1E1B30" strokeWidth={1} />
                <text x={w - pad.right + 5} y={y + 3.5} fontSize={9} fill="#8B849C">
                  ${formatPrice(price)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              if (i % cv.xStep !== 0) return null
              return (
                <text key={i} x={cv.toX(i)} y={h - 5} fontSize={8.5} fill="#8B849C" textAnchor="middle">
                  {formatLabel(d.time)}
                </text>
              )
            })}
            {data.map((d, i) => {
              const isUp = d.close >= d.open
              const color = isUp ? '#22C55E' : '#F87171'
              const cx = cv.toX(i)
              const yHi = cv.toY(d.high)
              const yLo = cv.toY(d.low)
              const yTop = cv.toY(Math.max(d.open, d.close))
              const yBot = cv.toY(Math.min(d.open, d.close))
              const bH  = Math.max(1, yBot - yTop)
              return (
                <g key={i}>
                  <line x1={cx} y1={yHi} x2={cx} y2={yLo} stroke={color} strokeWidth={1} />
                  <rect x={cx - cv.cw / 2} y={yTop} width={cv.cw} height={bH}
                    fill={isUp ? 'transparent' : color} stroke={color} strokeWidth={1} />
                </g>
              )
            })}
            {hovered && (
              <line x1={hovered.svgX} y1={pad.top} x2={hovered.svgX} y2={h - pad.bottom}
                stroke="#7C3AED" strokeWidth={1} strokeDasharray="3 3" pointerEvents="none" />
            )}
          </svg>
          {hovD && (() => {
            const isUp = hovD.close >= hovD.open
            const tipW = 150
            const tipL = hovered.mx + 16 + tipW > w ? hovered.mx - tipW - 8 : hovered.mx + 8
            return (
              <div style={{
                position: 'absolute', left: tipL, top: 8,
                background: '#14111F', border: '1px solid #2C2840',
                borderRadius: 6, padding: '6px 10px', fontSize: 10.5,
                pointerEvents: 'none', zIndex: 30, minWidth: tipW,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}>
                {[
                  { l: 'Açılış',  v: hovD.open,  c: '#F1F0F5' },
                  { l: 'Yüksek', v: hovD.high,  c: '#22C55E' },
                  { l: 'Düşük',  v: hovD.low,   c: '#F87171' },
                  { l: 'Kapanış',v: hovD.close, c: isUp ? '#22C55E' : '#F87171' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, lineHeight: 1.7 }}>
                    <span style={{ color: '#6B6580' }}>{l}</span>
                    <span style={{ color: c, fontWeight: 600 }}>${formatPrice(v)}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

// ─── Area tooltip ─────────────────────────────────────────────────────────────
const AreaTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1E1B30', border: '1px solid #2C2840', borderRadius: 6, padding: '5px 9px', fontSize: 11 }}>
      <div style={{ color: '#8B849C' }}>{label}</div>
      <div style={{ color: '#A78BFA', fontWeight: 700 }}>${formatPrice(payload[0]?.value)}</div>
    </div>
  )
}

// ─── BRK Price Chart — KuCoin primary, CoinGecko fallback ────────────────────
function BRKChart({ currentPrice }) {
  const [range,      setRange]      = useState('1D')
  const [chartType,  setChartType]  = useState('alan')
  const [areaData,   setAreaData]   = useState([])
  const [candleData, setCandleData] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const [source,     setSource]     = useState(null)   // 'KuCoin' | 'CoinGecko'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(false)
    setSource(null)
    fetchBRKChartData(range)
      .then(result => {
        if (cancelled) return
        if (!result) { setFetchError(true); return }
        setCandleData(result.candles)
        setAreaData(candlesToAreaData(result.candles, range))
        setSource(result.source)
      })
      .catch(() => { if (!cancelled) setFetchError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range])

  const firstPrice = areaData[0]?.price || 0
  const lastPrice  = areaData.at(-1)?.price || 0
  const isUp       = lastPrice >= firstPrice
  const changePct  = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0
  const color      = isUp ? '#22C55E' : '#F87171'
  const gradId     = isUp ? 'brk-up' : 'brk-dn'
  const minP       = areaData.length ? Math.min(...areaData.map(d => d.price)) : 0
  const maxP       = areaData.length ? Math.max(...areaData.map(d => d.price)) : 0

  return (
    <div style={{ background: '#110F1C', border: '1px solid #1E1B30', borderRadius: 10 }} className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#1E1B30' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: '#F1F0F5' }}>${formatPrice(currentPrice)}</span>
          <span className="text-sm font-medium" style={{ color: changePct >= 0 ? '#22C55E' : '#F87171' }}>
            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Chart type */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid #1E1B30', background: '#0D0B1A' }}>
            {[['alan','Alan'],['cubuk','Çubuk']].map(([t,l]) => (
              <button key={t} onClick={() => setChartType(t)}
                className="px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  background: chartType === t ? '#1E1B30' : 'transparent',
                  color: chartType === t ? '#F1F0F5' : '#8B849C',
                  borderLeft: t === 'cubuk' ? '1px solid #1E1B30' : 'none',
                }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 14, background: '#1E1B30' }} />
          {['1H','1D','1W','1M'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className="px-2 py-1 text-xs rounded font-medium transition-colors"
              style={{ background: range === r ? '#7C3AED' : 'transparent', color: range === r ? '#fff' : '#8B849C' }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      {/* Data source badge */}
      <div className="flex items-center gap-1.5 px-4 py-1 border-b" style={{ borderColor: '#1E1B30' }}>
        <span style={{ color: '#8B849C', fontSize: 10 }}>Veri kaynağı:</span>
        {loading && <span style={{ color: '#8B849C', fontSize: 10 }}>yükleniyor…</span>}
        {!loading && source === 'KuCoin' && (
          <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
            style={{ background: 'rgba(0,182,122,0.12)', color: '#00B67A', border: '1px solid rgba(0,182,122,0.25)' }}>
            ● KuCoin · KCS-USDT
          </span>
        )}
        {!loading && source === 'CoinGecko' && (
          <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>
            ● CoinGecko · KCS · yedek kaynak
          </span>
        )}
        {fetchError && !loading && (
          <span style={{ color: '#F87171', fontSize: 10 }}>⚠ Tüm kaynaklar başarısız</span>
        )}
      </div>

      {/* Chart */}
      <div style={{ height: 200, padding: 8 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div style={{ color: '#8B849C', fontSize: 12 }}>KuCoin verisi yükleniyor…</div>
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center h-full">
            <div style={{ color: '#F87171', fontSize: 12 }}>KuCoin API\'ye ulaşılamadı</div>
          </div>
        ) : chartType === 'alan' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1B30" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#8B849C', fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[minP * 0.998, maxP * 1.002]} tick={{ fill: '#8B849C', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => formatPrice(v)} width={55} />
              <Tooltip content={<AreaTip />} />
              <Area type="monotone" dataKey="price" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 3, fill: color }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <BRKCandleChart data={candleData} />
        )}
      </div>
    </div>
  )
}

// ─── Pool Card ────────────────────────────────────────────────────────────────
function PoolCard({ pool, balance, brkBonus, onStake }) {
  const effectiveApy = brkBonus ? pool.apy * 1.5 : pool.apy

  return (
    <div style={{
      background: '#110F1C',
      border: pool.isBRK ? '1px solid rgba(124,58,237,0.5)' : '1px solid #1E1B30',
      borderRadius: 12,
      boxShadow: pool.isBRK ? '0 0 20px rgba(124,58,237,0.15)' : 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {pool.isBRK && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #7C3AED, #A78BFA, #7C3AED)',
        }} />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: pool.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
              boxShadow: `0 0 10px ${pool.color}55`,
            }}>
              {pool.symbol.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: '#F1F0F5' }}>{pool.symbol}</div>
              <div className="text-xs" style={{ color: '#8B849C' }}>{pool.name}</div>
            </div>
          </div>
          {pool.isBRK && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.4)' }}>
              ★ Yerli
            </span>
          )}
        </div>

        {/* APY */}
        <div className="mb-3">
          <div className="text-xs mb-0.5" style={{ color: '#8B849C' }}>Tahmini APY</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black" style={{ color: pool.isBRK ? '#A78BFA' : '#22C55E' }}>
              {effectiveApy.toFixed(1)}%
            </span>
            {brkBonus && !pool.isBRK && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA' }}>
                +BRK %50
              </span>
            )}
          </div>
          {brkBonus && !pool.isBRK && (
            <div className="text-xs mt-0.5" style={{ color: '#8B849C' }}>
              Baz: {pool.apy}% → BRK bonus ile {effectiveApy.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-1.5 mb-4">
          {[
            { l: 'TVL', v: `$${(pool.tvl / 1_000_000).toFixed(1)}M` },
            { l: 'Min Stake', v: `${pool.minStake} ${pool.symbol}` },
            { l: 'Kilit', v: pool.lockDays === 0 ? 'Esnek' : `${pool.lockDays} Gün` },
            { l: 'Risk', v: pool.risk },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between text-xs">
              <span style={{ color: '#8B849C' }}>{l}</span>
              <span style={{ color: '#F1F0F5', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Balance */}
        <div className="text-xs mb-3 px-2 py-1.5 rounded" style={{ background: '#0D0B1A' }}>
          <span style={{ color: '#8B849C' }}>Bakiye: </span>
          <span style={{ color: '#F1F0F5', fontWeight: 600 }}>
            {formatNumber(balance || 0, pool.symbol === 'BTC' ? 6 : pool.symbol === 'ETH' ? 4 : 2)} {pool.symbol}
          </span>
        </div>

        <button onClick={() => onStake(pool)}
          className="w-full py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: pool.isBRK
              ? 'linear-gradient(135deg, #5B21B6, #7C3AED)'
              : 'rgba(34,197,94,0.12)',
            color: pool.isBRK ? '#fff' : '#22C55E',
            border: pool.isBRK ? 'none' : '1px solid rgba(34,197,94,0.3)',
          }}>
          {pool.isBRK ? '★ BRK Stake Yap' : 'Stake Yap'}
        </button>
      </div>
    </div>
  )
}

// ─── Stake Modal ──────────────────────────────────────────────────────────────
function StakeModal({ pool, balance, brkBonus, onConfirm, onClose }) {
  const [amount, setAmount] = useState('')
  const val = parseFloat(amount) || 0
  const effectiveApy = brkBonus && !pool.isBRK ? pool.apy * 1.5 : pool.apy
  const dailyReward = val > 0 ? val * (effectiveApy / 100 / 365) : 0
  const yearlyReward = val > 0 ? val * (effectiveApy / 100) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: '#110F1C', border: '1px solid #2C2840',
        borderRadius: 14, padding: 24, width: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: pool.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 12 }}>
              {pool.symbol.charAt(0)}
            </div>
            <span className="font-bold" style={{ color: '#F1F0F5' }}>{pool.symbol} Havuzuna Stake</span>
          </div>
          <button onClick={onClose} style={{ color: '#8B849C', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: '#8B849C' }}>Miktar ({pool.symbol})</span>
            <span style={{ color: '#8B5CF6', cursor: 'pointer' }} onClick={() => setAmount(String(balance || ''))}>
              Maks: {formatNumber(balance || 0, 4)}
            </span>
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={`Min: ${pool.minStake} ${pool.symbol}`}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: '#1E1B30', color: '#F1F0F5', border: '1px solid #2C2840' }}
            autoFocus
          />
        </div>

        {val > 0 && (
          <div className="rounded-lg p-3 space-y-1.5 text-xs mb-4" style={{ background: '#0D0B1A', border: '1px solid #1E1B30' }}>
            <div className="flex justify-between">
              <span style={{ color: '#8B849C' }}>APY</span>
              <span style={{ color: '#22C55E', fontWeight: 700 }}>{effectiveApy.toFixed(1)}%{brkBonus && !pool.isBRK ? ' (BRK bonus)' : ''}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#8B849C' }}>Günlük Getiri</span>
              <span style={{ color: '#F1F0F5' }}>~{formatNumber(dailyReward, 4)} {pool.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#8B849C' }}>Yıllık Getiri</span>
              <span style={{ color: '#A78BFA', fontWeight: 600 }}>~{formatNumber(yearlyReward, 4)} {pool.symbol}</span>
            </div>
            {pool.lockDays > 0 && (
              <div className="flex justify-between">
                <span style={{ color: '#8B849C' }}>Kilit Süresi</span>
                <span style={{ color: '#FBBF24' }}>{pool.lockDays} gün</span>
              </div>
            )}
          </div>
        )}

        {val < pool.minStake && val > 0 && (
          <div className="text-xs mb-3 px-2 py-1.5 rounded" style={{ background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
            ⚠ Minimum stake: {pool.minStake} {pool.symbol}
          </div>
        )}

        <button
          onClick={() => val >= pool.minStake && val <= (balance || 0) && onConfirm(val)}
          disabled={val < pool.minStake || val > (balance || 0)}
          className="w-full py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
          style={{
            background: val >= pool.minStake && val <= (balance || 0)
              ? 'linear-gradient(135deg, #5B21B6, #7C3AED)' : '#1E1B30',
            color: val >= pool.minStake ? '#fff' : '#8B849C',
            cursor: val >= pool.minStake ? 'pointer' : 'not-allowed',
          }}>
          Stake Onayla
        </button>
      </div>
    </div>
  )
}

// ─── BRK Advantage Card ───────────────────────────────────────────────────────
function AdvantageCard({ adv, unlocked }) {
  return (
    <div style={{
      background: unlocked ? 'rgba(124,58,237,0.08)' : '#0D0B1A',
      border: unlocked ? '1px solid rgba(124,58,237,0.4)' : '1px solid #1E1B30',
      borderRadius: 10,
      padding: '14px 16px',
      transition: 'all 0.3s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {unlocked && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
        }} />
      )}
      <div className="flex items-start gap-3">
        <div style={{
          fontSize: 20, minWidth: 28, marginTop: 1,
          filter: unlocked ? 'none' : 'grayscale(100%) opacity(0.4)',
        }}>
          {adv.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ color: unlocked ? '#F1F0F5' : '#8B849C' }}>
              {adv.title}
            </span>
            {unlocked ? (
              <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                ✓ AKTİF
              </span>
            ) : (
              <span className="text-xs" style={{ color: '#6B6580' }}>🔒 Kilitli</span>
            )}
          </div>
          <div className="text-xs" style={{ color: unlocked ? '#C4B5FD' : '#6B6580' }}>
            {adv.desc}
          </div>
          {unlocked && (
            <div className="text-xs mt-1.5 italic" style={{ color: '#8B849C' }}>
              {adv.detail}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Countdown display ────────────────────────────────────────────────────────
function formatCountdown(ms) {
  if (ms <= 0) return null
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${h}s ${String(m).padStart(2, '0')}d ${String(s).padStart(2, '0')}sn`
}

// ─── Main Earn Page ───────────────────────────────────────────────────────────
export default function Earn() {
  const { marketData, balances, stakes, dispatch } = useExchange()
  const [tab, setTab]         = useState('pools')
  const [stakeModal, setStakeModal] = useState(null)  // pool object
  const [now, setNow]         = useState(Date.now())
  const [brkStakeAmount, setBrkStakeAmount] = useState('')
  const [brkStakeError, setBrkStakeError]   = useState('')
  const [brkStakeSuccess, setBrkStakeSuccess] = useState('')
  const [notification, setNotification] = useState(null)

  // Tick every second for countdowns & rewards display
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const brkData = marketData['berk-coin']
  const brkPrice = brkData?.current_price || 0
  const brkChange = brkData?.price_change_percentage_24h || 0

  // Find oldest active BRK stake
  const brkStakes = useMemo(() => stakes.filter(s => s.symbol === 'BRK'), [stakes])
  const oldestBrkStake = useMemo(
    () => brkStakes.reduce((oldest, s) => (!oldest || s.stakedAt < oldest.stakedAt ? s : oldest), null),
    [brkStakes]
  )
  const brkStakedMs  = oldestBrkStake ? now - oldestBrkStake.stakedAt : 0
  const brkUnlocked  = brkStakedMs >= BRK_UNLOCK_MS
  const msUntilUnlock = oldestBrkStake && !brkUnlocked ? BRK_UNLOCK_MS - brkStakedMs : 0

  // BRK dividend (0.1 BRK/h after 5h unlock)
  const brkDividend = useMemo(() => {
    if (!brkUnlocked) return 0
    const unlockedMs = brkStakedMs - BRK_UNLOCK_MS
    return (unlockedMs / 3_600_000) * 0.1
  }, [brkUnlocked, brkStakedMs])

  // Per-stake accrued rewards
  const stakeRewards = useCallback((stake) => {
    const pool = STAKE_POOLS.find(p => p.id === stake.poolId)
    if (!pool) return 0
    const apy = brkUnlocked && stake.symbol !== 'BRK' ? pool.apy * 1.5 : pool.apy
    const secs = (now - stake.stakedAt) / 1000
    return stake.amount * apyPerSecond(apy) * secs
  }, [now, brkUnlocked])

  // ── Stake pool handler ───────────────────────────────────────────────────────
  const handleStakeConfirm = (pool, amount) => {
    dispatch({ type: 'STAKE_TO_POOL', payload: { poolId: pool.id, symbol: pool.symbol, amount } })
    setStakeModal(null)
    setNotification(`${amount} ${pool.symbol} stake edildi!`)
    setTimeout(() => setNotification(null), 3000)
  }

  // ── BRK quick stake handler ──────────────────────────────────────────────────
  const handleBRKStake = () => {
    const val = parseFloat(brkStakeAmount)
    if (!val || val <= 0) { setBrkStakeError('Geçerli bir miktar girin'); return }
    if (val < 10)         { setBrkStakeError('Minimum 10 BRK stake gerekli'); return }
    if (val > (balances.BRK || 0)) { setBrkStakeError('Yetersiz BRK bakiyesi'); return }
    setBrkStakeError('')
    dispatch({ type: 'STAKE_TO_POOL', payload: { poolId: 'brk-pool', symbol: 'BRK', amount: val } })
    setBrkStakeSuccess(`${val} BRK stake edildi! 5 saat sonra avantajlar aktif olacak.`)
    setBrkStakeAmount('')
    setTimeout(() => setBrkStakeSuccess(''), 5000)
  }

  // ── Unstake handler ──────────────────────────────────────────────────────────
  const handleUnstake = (stake) => {
    const rewards = stakeRewards(stake)
    dispatch({ type: 'UNSTAKE_FROM_POOL', payload: { stakeId: stake.id, rewardsAmount: rewards } })
    setNotification(`${formatNumber(stake.amount + rewards, 4)} ${stake.symbol} geri alındı!`)
    setTimeout(() => setNotification(null), 3000)
  }

  const tabStyle = t => ({
    color: tab === t ? '#A78BFA' : '#8B849C',
    borderBottom: tab === t ? '2px solid #7C3AED' : '2px solid transparent',
  })

  const totalStakedBRK = brkStakes.reduce((s, st) => s + st.amount, 0)

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

      {/* Notification toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: 72, right: 20, zIndex: 200,
          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 8, padding: '10px 16px', color: '#22C55E', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          ✓ {notification}
        </div>
      )}

      {/* ── BRK Hero Banner ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D0B1A 0%, #1A0F2E 50%, #110F1C 100%)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Purple glow */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="flex gap-6 p-5">
          {/* Left: Identity + stats */}
          <div style={{ minWidth: 260 }}>
            {/* Token identity */}
            <div className="flex items-center gap-3 mb-4">
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 900, color: '#fff',
                boxShadow: '0 0 20px rgba(124,58,237,0.6)',
                border: '2px solid rgba(167,139,250,0.4)',
              }}>
                B
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black" style={{ color: '#F1F0F5' }}>Berk Coin</span>
                  <span className="text-sm px-2 py-0.5 rounded font-bold"
                    style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.4)' }}>
                    BRK
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#8B849C' }}>
                  Nexus Exchange Yerel Tokeni — KCS benzeri borsa faydası
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="text-3xl font-black" style={{ color: '#F1F0F5' }}>
                ${formatPrice(brkPrice)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold"
                  style={{ color: brkChange >= 0 ? '#22C55E' : '#F87171' }}>
                  {brkChange >= 0 ? '+' : ''}{brkChange.toFixed(2)}% (24s)
                </span>
              </div>
            </div>

            {/* Market stats */}
            <div className="space-y-2">
              {[
                { l: 'Piyasa Değeri', v: `$${((brkData?.market_cap || 0) / 1_000_000).toFixed(1)}M` },
                { l: '24s Hacim',    v: formatVolume(brkData?.total_volume || 0) },
                { l: '24s Yüksek',   v: `$${formatPrice(brkData?.high_24h || 0)}` },
                { l: '24s Düşük',    v: `$${formatPrice(brkData?.low_24h || 0)}` },
                { l: 'Dolaşımdaki', v: `${(BRK_INFO.circulatingSupply / 1_000_000).toFixed(1)}M BRK` },
                { l: 'Bakiyeniz',   v: `${formatNumber(balances.BRK || 0, 2)} BRK`, bold: true },
              ].map(({ l, v, bold }) => (
                <div key={l} className="flex justify-between text-xs">
                  <span style={{ color: '#8B849C' }}>{l}</span>
                  <span style={{ color: bold ? '#A78BFA' : '#F1F0F5', fontWeight: bold ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: chart */}
          <div className="flex-1 min-w-0">
            <BRKChart currentPrice={brkPrice} />
          </div>
        </div>

        {/* KCS similarity note */}
        <div className="px-5 py-2.5 border-t text-xs flex items-center gap-2" style={{ borderColor: 'rgba(124,58,237,0.2)', color: '#8B849C' }}>
          <span style={{ color: '#A78BFA', fontWeight: 600 }}>ℹ</span>
          BRK, KuCoin'in KCS tokenine benzer şekilde çalışır: borsa gelirlerinden pay, işlem indirimi ve staking avantajları sunar.
        </div>
      </div>

      {/* ── BRK Stake status bar (if staking) ───────────────────────────────── */}
      {brkStakes.length > 0 && (
        <div style={{
          background: brkUnlocked
            ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(124,58,237,0.08))'
            : 'rgba(251,191,36,0.06)',
          border: brkUnlocked ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(251,191,36,0.25)',
          borderRadius: 10, padding: '12px 16px',
        }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div style={{ fontSize: 20 }}>{brkUnlocked ? '🔓' : '⏳'}</div>
              <div>
                <div className="text-sm font-bold" style={{ color: brkUnlocked ? '#22C55E' : '#FBBF24' }}>
                  {brkUnlocked ? 'BRK Avantajları Aktif!' : 'Avantajlar Bekleniyor'}
                </div>
                <div className="text-xs" style={{ color: '#8B849C' }}>
                  {totalStakedBRK.toFixed(2)} BRK stake · {brkStakes.length} pozisyon
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {!brkUnlocked && msUntilUnlock > 0 && (
                <div style={{ color: '#FBBF24', fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}>
                  {formatCountdown(msUntilUnlock)}
                </div>
              )}
              {brkUnlocked && brkDividend > 0 && (
                <div>
                  <div style={{ color: '#8B849C' }}>BRK Temettü</div>
                  <div style={{ color: '#A78BFA', fontWeight: 700 }}>+{brkDividend.toFixed(4)} BRK</div>
                </div>
              )}
              {brkUnlocked && (
                <div className="flex gap-2">
                  {['🎯','💰','🎁','⚡','🔓'].map(icon => (
                    <span key={icon} title="Aktif avantaj" style={{ fontSize: 14 }}>{icon}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {!brkUnlocked && (
            <div className="mt-2.5">
              <div style={{ background: '#1E1B30', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (brkStakedMs / BRK_UNLOCK_MS) * 100)}%`,
                  background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
                  borderRadius: 4,
                  transition: 'width 1s linear',
                }} />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: '#8B849C' }}>
                <span>0</span>
                <span style={{ color: '#FBBF24' }}>
                  {((brkStakedMs / BRK_UNLOCK_MS) * 100).toFixed(1)}% — 5 saatte avantajlar açılır
                </span>
                <span>5s</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #1E1B30' }}>
        <div className="flex gap-0">
          {[
            { k: 'pools',    l: 'Havuzlar' },
            { k: 'brk',      l: '★ BRK Stake' },
            { k: 'mystakes', l: `Pozisyonlarım (${stakes.length})` },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)}
              className="px-5 py-3 text-sm font-medium transition-colors"
              style={tabStyle(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── POOLS TAB ────────────────────────────────────────────────────────── */}
      {tab === 'pools' && (
        <div>
          {brkUnlocked && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', color: '#C4B5FD' }}>
              ★ BRK avantajları aktif — tüm havuz APY değerleri +%50 bonuslu gösteriliyor
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            {STAKE_POOLS.map(pool => (
              <PoolCard
                key={pool.id}
                pool={pool}
                balance={balances[pool.symbol] || 0}
                brkBonus={brkUnlocked}
                onStake={p => setStakeModal(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── BRK STAKE TAB ────────────────────────────────────────────────────── */}
      {tab === 'brk' && (
        <div className="space-y-5">
          {/* Explainer */}
          <div style={{ background: '#110F1C', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: 20 }}>
            <div className="flex items-start gap-4">
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 900, color: '#fff',
                boxShadow: '0 0 16px rgba(124,58,237,0.5)',
              }}>B</div>
              <div>
                <div className="font-bold text-base mb-1" style={{ color: '#F1F0F5' }}>BRK Stake Avantajları</div>
                <div className="text-sm" style={{ color: '#8B849C', lineHeight: 1.6 }}>
                  Berk Coin'i stake ederek Nexus Exchange'in yerel tokeni olarak 5 özel avantajdan yararlanın.
                  KuCoin'in KCS modelinden ilham alınarak tasarlanmıştır.
                  <strong style={{ color: '#FBBF24' }}> 5 saat</strong> kesintisiz stake sonrası tüm avantajlar otomatik açılır.
                </div>
              </div>
            </div>
          </div>

          {/* Stake input */}
          <div style={{ background: '#110F1C', border: '1px solid #1E1B30', borderRadius: 12, padding: 20 }}>
            <div className="font-semibold text-sm mb-4" style={{ color: '#F1F0F5' }}>BRK Stake Et</div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#8B849C' }}>Miktar (BRK)</span>
                  <span style={{ color: '#8B5CF6', cursor: 'pointer' }}
                    onClick={() => setBrkStakeAmount(String(balances.BRK || ''))}>
                    Maks: {formatNumber(balances.BRK || 0, 2)} BRK
                  </span>
                </div>
                <input
                  type="number"
                  value={brkStakeAmount}
                  onChange={e => setBrkStakeAmount(e.target.value)}
                  placeholder="Min 10 BRK"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: '#1E1B30', color: '#F1F0F5', border: '1px solid #2C2840' }}
                />
              </div>
              <button onClick={handleBRKStake}
                className="px-5 rounded-lg text-sm font-bold transition-all hover:opacity-90 self-end"
                style={{
                  background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
                  color: '#fff', height: 40,
                  boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                }}>
                Stake Et
              </button>
            </div>
            {brkStakeError && <div className="text-xs" style={{ color: '#F87171' }}>⚠ {brkStakeError}</div>}
            {brkStakeSuccess && <div className="text-xs" style={{ color: '#22C55E' }}>✓ {brkStakeSuccess}</div>}

            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { l: 'APY', v: '12.8%', c: '#A78BFA' },
                { l: 'Avantaj Kilidi', v: '5 Saat', c: '#FBBF24' },
                { l: 'Kâr Payı', v: '0.1 BRK/sa', c: '#22C55E' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: '#0D0B1A', border: '1px solid #1E1B30', borderRadius: 8, padding: '10px 12px' }}>
                  <div className="text-xs mb-1" style={{ color: '#8B849C' }}>{l}</div>
                  <div className="font-bold text-sm" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Advantages list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-sm" style={{ color: '#F1F0F5' }}>5 Saatlik Avantajlar</span>
              {!brkUnlocked && oldestBrkStake && (
                <span className="text-xs font-mono px-2 py-1 rounded"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.2)' }}>
                  ⏳ {formatCountdown(msUntilUnlock)} kaldı
                </span>
              )}
              {brkUnlocked && (
                <span className="text-xs px-2 py-1 rounded font-bold"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                  ✓ Tümü Aktif
                </span>
              )}
              {!oldestBrkStake && (
                <span className="text-xs" style={{ color: '#8B849C' }}>BRK stake edin →</span>
              )}
            </div>
            <div className="space-y-3">
              {BRK_ADVANTAGES.map(adv => (
                <AdvantageCard key={adv.id} adv={adv} unlocked={brkUnlocked} />
              ))}
            </div>
          </div>

          {/* Example scenario */}
          <div style={{ background: '#0D0B1A', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, padding: 16 }}>
            <div className="font-semibold text-sm mb-3" style={{ color: '#A78BFA' }}>
              📊 Örnek Senaryo: 500 BRK Stake, 5 Saat Sonra
            </div>
            <div className="space-y-2 text-xs" style={{ color: '#8B849C' }}>
              {[
                ['İşlem ücreti',   'Maker %0.02 → %0.01 · Taker %0.05 → %0.025'],
                ['SOL havuzu APY', '9.3% → 13.95% (BRK bonus ile)'],
                ['BRK kâr payı',   '0.1 BRK/saat otomatik → aylık ~72 BRK'],
                ['VIP kuyruk',     'Tüm emirlerde öncelikli eşleştirme'],
                ['Prim havuz',     '%18+ APY\'li özel havuzlara erişim'],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span style={{ color: '#22C55E', fontWeight: 700, minWidth: 100 }}>✓ {k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MY STAKES TAB ───────────────────────────────────────────────────── */}
      {tab === 'mystakes' && (
        <div>
          {stakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div style={{ fontSize: 36 }}>📭</div>
              <div className="text-sm" style={{ color: '#8B849C' }}>Henüz aktif stake pozisyonu yok</div>
              <button onClick={() => setTab('pools')}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>
                Havuzları Gör
              </button>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1E1B30' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#0D0B1A', color: '#8B849C', borderBottom: '1px solid #1E1B30' }}>
                    <th className="px-4 py-3 text-left">Havuz</th>
                    <th className="px-4 py-3 text-right">Stake Miktarı</th>
                    <th className="px-4 py-3 text-right">Stake Süresi</th>
                    <th className="px-4 py-3 text-right">Birikmiş Getiri</th>
                    <th className="px-4 py-3 text-right">APY</th>
                    <th className="px-4 py-3 text-right">BRK Avantajı</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {stakes.map(stake => {
                    const pool = STAKE_POOLS.find(p => p.id === stake.poolId)
                    if (!pool) return null
                    const rewards = stakeRewards(stake)
                    const isBRKPool = stake.symbol === 'BRK'
                    const hasBonus  = brkUnlocked && !isBRKPool
                    const effectiveApy = hasBonus ? pool.apy * 1.5 : pool.apy
                    const elapsedMs = now - stake.stakedAt
                    const elapsedH  = Math.floor(elapsedMs / 3_600_000)
                    const elapsedM  = Math.floor((elapsedMs % 3_600_000) / 60_000)
                    const elapsedS  = Math.floor((elapsedMs % 60_000) / 1000)

                    return (
                      <tr key={stake.id} className="border-b hover:bg-white/5" style={{ borderColor: '#1E1B30' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              background: pool.color, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff',
                            }}>
                              {pool.symbol.charAt(0)}
                            </div>
                            <div>
                              <div style={{ color: '#F1F0F5', fontWeight: 600 }}>{pool.symbol}</div>
                              <div style={{ color: '#8B849C', fontSize: 10 }}>{pool.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: '#F1F0F5', fontWeight: 600 }}>
                          {formatNumber(stake.amount, isBRKPool ? 2 : stake.symbol === 'BTC' ? 6 : 4)} {stake.symbol}
                        </td>
                        <td className="px-4 py-3 text-right font-mono" style={{ color: '#8B849C' }}>
                          {elapsedH}s {String(elapsedM).padStart(2,'0')}d {String(elapsedS).padStart(2,'0')}sn
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div style={{ color: '#22C55E', fontWeight: 600 }}>
                            +{formatNumber(rewards, 6)} {stake.symbol}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span style={{ color: isBRKPool ? '#A78BFA' : hasBonus ? '#22C55E' : '#8B849C', fontWeight: 700 }}>
                            {effectiveApy.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isBRKPool ? (
                            brkUnlocked ? (
                              <span className="px-1.5 py-0.5 rounded text-xs"
                                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                                ✓ Aktif
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: '#FBBF24' }}>
                                ⏳ {formatCountdown(Math.max(0, BRK_UNLOCK_MS - (now - stake.stakedAt)))}
                              </span>
                            )
                          ) : hasBonus ? (
                            <span className="px-1.5 py-0.5 rounded text-xs"
                              style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA' }}>
                              +%50
                            </span>
                          ) : (
                            <span style={{ color: '#6B6580', fontSize: 10 }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleUnstake(stake)}
                            className="text-xs px-2.5 py-1 rounded transition-all hover:opacity-80"
                            style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                            Çıkar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {/* Totals row */}
              <div className="flex items-center justify-between px-4 py-3 border-t text-xs" style={{ borderColor: '#1E1B30', background: '#0D0B1A' }}>
                <span style={{ color: '#8B849C' }}>{stakes.length} aktif pozisyon</span>
                <span style={{ color: '#22C55E' }}>
                  Getiriler her saniye birikir · Çıkar butonuyla ana para + getiri geri alınır
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stake modal ──────────────────────────────────────────────────────── */}
      {stakeModal && (
        <StakeModal
          pool={stakeModal}
          balance={balances[stakeModal.symbol] || 0}
          brkBonus={brkUnlocked}
          onConfirm={amount => handleStakeConfirm(stakeModal, amount)}
          onClose={() => setStakeModal(null)}
        />
      )}
    </div>
  )
}

