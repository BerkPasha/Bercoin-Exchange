// ─── Berk Coin (BRK) — Nexus Exchange Native Token ──────────────────────────
// Modelled after KuCoin Shares (KCS): exchange utility token with staking perks.

export const BRK_INFO = {
  id: 'berk-coin',
  symbol: 'BRK',
  name: 'Berk Coin',
  color: '#7C3AED',
  totalSupply: 200_000_000,
  circulatingSupply: 85_400_000,
  launchPrice: 0.50,
  category: 'Exchange Token',
  description:
    'Nexus Exchange\'s native utility token. Stake BRK for 5+ hours to unlock ' +
    'exclusive trading fee discounts, bonus pool yields, hourly dividends, and VIP privileges.',
}

// ─── BRK chart data — KuCoin primary, CoinGecko fallback ────────────────────
// Both line and candle chart use the same candle array.
// KuCoin candle format : [time(s), open, close, high, low, volume, amount]
// CoinGecko OHLC format: [time(ms), open, high, low, close]

import axios from 'axios'

const KUCOIN_BASE  = 'https://api.kucoin.com/api/v1'
const CG_BASE      = 'https://api.coingecko.com/api/v3'
const KCS_CG_ID    = 'kucoin-token'
const KUCOIN_SYM   = 'KCS-USDT'

const RANGE_CFG = {
  '1H': { kuType: '1min',  kuSecs: 3_600,        cgDays: 1  },
  '1D': { kuType: '15min', kuSecs: 86_400,        cgDays: 1  },
  '1W': { kuType: '4hour', kuSecs: 7  * 86_400,   cgDays: 7  },
  '1M': { kuType: '1day',  kuSecs: 30 * 86_400,   cgDays: 30 },
}

// ── KuCoin fetch ─────────────────────────────────────────────────────────────
async function fromKuCoin(range) {
  const cfg     = RANGE_CFG[range] || RANGE_CFG['1D']
  const endAt   = Math.floor(Date.now() / 1000)
  const startAt = endAt - cfg.kuSecs

  const { data } = await axios.get(`${KUCOIN_BASE}/market/candles`, {
    params:  { symbol: KUCOIN_SYM, type: cfg.kuType, startAt, endAt },
    timeout: 8000,
  })

  if (data.code !== '200000' || !Array.isArray(data.data) || !data.data.length)
    throw new Error('KuCoin empty response')

  // newest-first → reverse; format: [time_s, open, close, high, low, vol, amt]
  return [...data.data].reverse().map(d => ({
    time:   parseInt(d[0]) * 1000,
    open:   parseFloat(d[1]),
    close:  parseFloat(d[2]),
    high:   parseFloat(d[3]),
    low:    parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }))
}

// ── CoinGecko fallback ───────────────────────────────────────────────────────
async function fromCoinGecko(range) {
  const cfg = RANGE_CFG[range] || RANGE_CFG['1D']

  const { data } = await axios.get(`${CG_BASE}/coins/${KCS_CG_ID}/ohlc`, {
    params:  { vs_currency: 'usd', days: cfg.cgDays },
    timeout: 8000,
  })

  if (!Array.isArray(data) || !data.length)
    throw new Error('CoinGecko empty response')

  // format: [time_ms, open, high, low, close]
  return data.map(d => ({
    time:   d[0],
    open:   d[1],
    high:   d[2],
    low:    d[3],
    close:  d[4],
    volume: 0,
  }))
}

// ── Public: fetch BRK chart data, KuCoin first → CoinGecko fallback ──────────
export async function fetchBRKChartData(range = '1D') {
  try {
    const candles = await fromKuCoin(range)
    return { candles, source: 'KuCoin' }
  } catch (e) {
    console.warn('[BRK chart] KuCoin failed, trying CoinGecko:', e.message)
  }

  try {
    const candles = await fromCoinGecko(range)
    return { candles, source: 'CoinGecko' }
  } catch (e) {
    console.warn('[BRK chart] CoinGecko also failed:', e.message)
  }

  return null
}

// ── Convert candle array → { time label, price } for the line/area chart ─────
export function candlesToAreaData(candles, range) {
  const intraday = range === '1H' || range === '1D'
  return candles.map(c => {
    const d = new Date(c.time)
    const label = intraday
      ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })
    return { time: label, price: c.close }
  })
}

// ─── Seeded PRNG (deterministic so charts look the same on every render) ─────
function seededRand(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1)
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61)
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff
  }
}

// ─── OHLCV candle generator ───────────────────────────────────────────────────
export function generateBRKCandles(range = '1D') {
  const cfg = {
    '1H': { count: 60, ms: 60_000,      base: 8.82, vol: 0.0025, seed: 1001 },
    '1D': { count: 96, ms: 900_000,     base: 8.50, vol: 0.005,  seed: 2002 },
    '1W': { count: 42, ms: 14_400_000,  base: 7.70, vol: 0.012,  seed: 3003 },
    '1M': { count: 30, ms: 86_400_000,  base: 6.40, vol: 0.022,  seed: 4004 },
  }[range] || { count: 96, ms: 900_000, base: 8.50, vol: 0.005, seed: 2002 }

  const rand = seededRand(cfg.seed)
  const now  = Date.now()
  let price  = cfg.base
  const out  = []

  for (let i = cfg.count; i >= 0; i--) {
    const t = now - i * cfg.ms
    price = Math.max(0.05, price + (rand() - 0.48) * cfg.vol * price)
    const sp   = cfg.vol * price
    const open = price + (rand() - 0.5) * sp * 0.5
    const high = Math.max(open, price) + rand() * sp * 0.5
    const low  = Math.min(open, price) - rand() * sp * 0.5
    out.push({ time: t, open, high, low, close: price, volume: 20000 + rand() * 600000 })
  }
  return out
}

// ─── Area chart data generator ────────────────────────────────────────────────
export function generateBRKAreaData(range = '1D') {
  const cfg = {
    '1H': { count: 60, ms: 60_000,      base: 8.82, vol: 0.0025, seed: 5001 },
    '1D': { count: 96, ms: 900_000,     base: 8.50, vol: 0.005,  seed: 6002 },
    '1W': { count: 42, ms: 14_400_000,  base: 7.70, vol: 0.012,  seed: 7003 },
    '1M': { count: 30, ms: 86_400_000,  base: 6.40, vol: 0.022,  seed: 8004 },
  }[range] || { count: 96, ms: 900_000, base: 8.50, vol: 0.005, seed: 6002 }

  const rand = seededRand(cfg.seed)
  const now  = Date.now()
  let price  = cfg.base
  const out  = []
  const intraday = range === '1H' || range === '1D'

  for (let i = cfg.count; i >= 0; i--) {
    const t = now - i * cfg.ms
    price = Math.max(0.05, price + (rand() - 0.48) * cfg.vol * price)
    const d = new Date(t)
    const label = intraday
      ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('tr-TR', { month: 'short', day: 'numeric' })
    out.push({ time: label, price })
  }
  return out
}

// ─── BRK live price state (module-level, updates between renders) ─────────────
let _brkPrice    = 8.82
let _brkSeed     = 9999
let _brkRand     = seededRand(_brkSeed)
let _brkTick     = 0

export function tickBRKPrice() {
  _brkTick++
  // Small mean-reverting walk with sine drift (looks like live chart)
  const drift  = Math.sin(_brkTick * 0.07) * 0.0008
  const noise  = (_brkRand() - 0.499) * 0.004
  _brkPrice = Math.max(0.10, _brkPrice * (1 + drift + noise))
  return _brkPrice
}

export function getBRKPrice() { return _brkPrice }

// ─── Staking pool definitions ─────────────────────────────────────────────────
export const STAKE_POOLS = [
  {
    id: 'btc-pool',
    symbol: 'BTC',
    name: 'Bitcoin',
    color: '#F7931A',
    apy: 4.5,
    lockDays: 7,
    minStake: 0.0005,
    tvl: 45_200_000,
    risk: 'Düşük',
  },
  {
    id: 'eth-pool',
    symbol: 'ETH',
    name: 'Ethereum',
    color: '#627EEA',
    apy: 6.2,
    lockDays: 7,
    minStake: 0.005,
    tvl: 28_600_000,
    risk: 'Düşük',
  },
  {
    id: 'brk-pool',
    symbol: 'BRK',
    name: 'Berk Coin',
    color: '#7C3AED',
    apy: 12.8,
    lockDays: 0,
    minStake: 10,
    tvl: 5_400_000,
    risk: 'Orta',
    isBRK: true,
  },
  {
    id: 'xrp-pool',
    symbol: 'XRP',
    name: 'XRP',
    color: '#00AAE4',
    apy: 8.1,
    lockDays: 14,
    minStake: 10,
    tvl: 12_100_000,
    risk: 'Düşük',
  },
  {
    id: 'xlm-pool',
    symbol: 'XLM',
    name: 'Stellar',
    color: '#14B6E7',
    apy: 7.4,
    lockDays: 14,
    minStake: 100,
    tvl: 3_800_000,
    risk: 'Orta',
  },
  {
    id: 'sol-pool',
    symbol: 'SOL',
    name: 'Solana',
    color: '#9945FF',
    apy: 9.3,
    lockDays: 7,
    minStake: 0.05,
    tvl: 18_900_000,
    risk: 'Orta',
  },
]

// ─── BRK Advantages (unlock after 5 hours of active BRK stake) ───────────────
export const BRK_ADVANTAGES = [
  {
    id: 'fee_discount',
    icon: '🎯',
    title: 'İşlem Ücreti İndirimi',
    desc: 'Tüm Spot & Vadeli işlemlerinde %50 indirim. Maker %0.01 / Taker %0.025.',
    detail: 'Normal ücretlerin yarısı — aktif BRK stake süresi boyunca geçerli.',
  },
  {
    id: 'bonus_apy',
    icon: '💰',
    title: 'Bonus Havuz Getirisi',
    desc: 'Tüm havuzlarda +%50 ek APY. BTC havuzu 4.5% → 6.75% olur.',
    detail: 'BRK stake tutarınız arttıkça bonus katsayısı da artar.',
  },
  {
    id: 'brk_dividend',
    icon: '🎁',
    title: 'BRK Günlük Kâr Payı',
    desc: 'Saatte 0.1 BRK protokol geliri payı. Günlük 2.4 BRK otomatik.',
    detail: '5. saatten itibaren birikmeye başlar ve dilediğinizde çekilebilir.',
  },
  {
    id: 'vip_priority',
    icon: '⚡',
    title: 'VIP Emir Önceliği',
    desc: 'Tüm emirleriniz öncelikli eşleştirme kuyruğuna alınır.',
    detail: 'Yoğun piyasa koşullarında daha hızlı dolum oranı.',
  },
  {
    id: 'exclusive_pools',
    icon: '🔓',
    title: 'Premium Havuz Erişimi',
    desc: 'Sadece BRK staker\'larına özel %18+ APY havuzlara erişim.',
    detail: 'Yeni premium havuzlar her hafta eklenir.',
  },
]

// APY per-second rate helper
export function apyPerSecond(apy) {
  return apy / 100 / (365 * 24 * 3600)
}
