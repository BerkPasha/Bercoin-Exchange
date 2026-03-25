import React, { createContext, useContext, useReducer, useCallback, useMemo, useEffect } from 'react'
import { COINS } from '../data/coins'
import { useCoinGecko } from '../hooks/useCoinGecko'
import { tickBRKPrice, getBRKPrice, apyPerSecond } from '../data/berkCoin'

const ExchangeContext = createContext(null)

const initialBalances = {
  USDT: 10000,
  BRK: 1000,   // start with 1000 BRK to demo staking
  ...Object.fromEntries(COINS.filter(c => c.symbol !== 'BRK').map(c => [c.symbol, 0])),
}

const defaultState = {
  marketData: {},
  balances: initialBalances,
  spotOrders: [],
  spotHistory: [],
  futuresPositions: [],
  futuresHistory: [],
  futuresPendingOrders: [],
  stakes: [],          // { id, poolId, symbol, amount, stakedAt }
  stakeIdCounter: 1,
}

const STORAGE_KEY = 'nexus_exchange_state'

function loadPersistedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultState
    const parsed = JSON.parse(saved)
    return {
      ...defaultState,
      ...parsed,
      marketData: {}, // always start fresh, market data comes from API
    }
  } catch {
    return defaultState
  }
}

function getPersistedCounters() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + '_counters')
    if (!saved) return { orderIdCounter: 1, positionIdCounter: 1 }
    return JSON.parse(saved)
  } catch {
    return { orderIdCounter: 1, positionIdCounter: 1 }
  }
}

const { orderIdCounter: savedOrderId, positionIdCounter: savedPositionId } = getPersistedCounters()

let orderIdCounter = savedOrderId
let positionIdCounter = savedPositionId

const initialState = loadPersistedState()

function calcLiquidationPrice(entryPrice, leverage, side) {
  const maintenanceMarginRate = 0.005
  if (side === 'long') {
    return entryPrice * (1 - 1 / leverage + maintenanceMarginRate)
  } else {
    return entryPrice * (1 + 1 / leverage - maintenanceMarginRate)
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_MARKET_DATA': {
      const newMarketData = { ...state.marketData }
      action.payload.forEach(coin => {
        newMarketData[coin.id] = coin
      })

      // Auto-fill spot market orders
      let newSpotOrders = [...state.spotOrders]
      let newSpotHistory = [...state.spotHistory]
      let newBalances = { ...state.balances }

      newSpotOrders = newSpotOrders.filter(order => {
        if (order.orderType !== 'market') return true
        const coin = Object.values(newMarketData).find(d => d.symbol?.toUpperCase() === order.baseSymbol)
        if (!coin) return true
        const price = coin.current_price
        if (!price) return true

        const filled = { ...order, status: 'filled', fillPrice: price, filledAt: Date.now() }
        newSpotHistory = [filled, ...newSpotHistory]

        if (order.side === 'buy') {
          const cost = order.amount * price
          newBalances['USDT'] = (newBalances['USDT'] || 0) - cost
          newBalances[order.baseSymbol] = (newBalances[order.baseSymbol] || 0) + order.amount
        } else {
          const proceeds = order.amount * price
          newBalances['USDT'] = (newBalances['USDT'] || 0) + proceeds
          newBalances[order.baseSymbol] = (newBalances[order.baseSymbol] || 0) - order.amount
        }
        return false
      })

      // Check spot limit orders
      newSpotOrders = newSpotOrders.filter(order => {
        if (order.orderType !== 'limit') return true
        const coin = Object.values(newMarketData).find(d => d.symbol?.toUpperCase() === order.baseSymbol)
        if (!coin) return true
        const price = coin.current_price
        if (!price) return true

        const shouldFill = order.side === 'buy' ? price <= order.price : price >= order.price
        if (!shouldFill) return true

        const filled = { ...order, status: 'filled', fillPrice: order.price, filledAt: Date.now() }
        newSpotHistory = [filled, ...newSpotHistory]

        if (order.side === 'buy') {
          newBalances[order.baseSymbol] = (newBalances[order.baseSymbol] || 0) + order.amount
        } else {
          newBalances['USDT'] = (newBalances['USDT'] || 0) + order.amount * order.price
        }
        return false
      })

      // Check futures stop-limit pending orders
      let newPendingOrders = [...state.futuresPendingOrders]
      let newFuturesPositions = [...state.futuresPositions]

      newPendingOrders = newPendingOrders.filter(order => {
        const coinData = newMarketData[order.coinId]
        if (!coinData) return true
        const currentPrice = coinData.current_price
        if (!currentPrice) return true

        // Trigger direction: if stopPrice was above price at placement → wait for rise; else → wait for drop
        const triggerDirection = order.stopPrice >= order.placedAtPrice ? 'up' : 'down'
        const triggered = triggerDirection === 'up'
          ? currentPrice >= order.stopPrice
          : currentPrice <= order.stopPrice

        if (!triggered) return true

        // Open position at limit price (no margin deduction — see OPEN_FUTURES_POSITION)
        const fillPrice = order.limitPrice
        const liqPrice = calcLiquidationPrice(fillPrice, order.leverage, order.side)
        const margin = order.size / order.leverage

        const position = {
          id: positionIdCounter++,
          symbol: order.symbol,
          coinId: order.coinId,
          side: order.side,
          leverage: order.leverage,
          size: order.size,
          margin,
          entryPrice: fillPrice,
          liquidationPrice: liqPrice,
          openedAt: Date.now(),
          status: 'open',
        }
        newFuturesPositions = [position, ...newFuturesPositions]
        return false // remove from pending
      })

      return {
        ...state,
        marketData: newMarketData,
        balances: newBalances,
        spotOrders: newSpotOrders,
        spotHistory: newSpotHistory,
        futuresPendingOrders: newPendingOrders,
        futuresPositions: newFuturesPositions,
      }
    }

    case 'PLACE_SPOT_ORDER': {
      const { baseSymbol, quoteSymbol, side, orderType, price, amount } = action.payload
      const newOrder = {
        id: orderIdCounter++,
        baseSymbol,
        quoteSymbol,
        side,
        orderType,
        price: price || 0,
        amount,
        status: 'open',
        createdAt: Date.now(),
      }

      let newBalances = { ...state.balances }

      if (orderType === 'limit') {
        if (side === 'buy') {
          const cost = amount * price
          newBalances['USDT'] = Math.max(0, (newBalances['USDT'] || 0) - cost)
        } else {
          newBalances[baseSymbol] = Math.max(0, (newBalances[baseSymbol] || 0) - amount)
        }
        return { ...state, balances: newBalances, spotOrders: [newOrder, ...state.spotOrders] }
      }

      // Market orders — fill immediately
      const coinData = Object.values(state.marketData).find(d => d.symbol?.toUpperCase() === baseSymbol)
      const fillPrice = coinData?.current_price || price || 0

      if (fillPrice > 0) {
        const filled = { ...newOrder, status: 'filled', fillPrice, filledAt: Date.now() }
        if (side === 'buy') {
          const cost = amount * fillPrice
          newBalances['USDT'] = Math.max(0, (newBalances['USDT'] || 0) - cost)
          newBalances[baseSymbol] = (newBalances[baseSymbol] || 0) + amount
        } else {
          const proceeds = amount * fillPrice
          newBalances['USDT'] = (newBalances['USDT'] || 0) + proceeds
          newBalances[baseSymbol] = Math.max(0, (newBalances[baseSymbol] || 0) - amount)
        }
        return { ...state, balances: newBalances, spotHistory: [filled, ...state.spotHistory] }
      }

      return { ...state, spotOrders: [newOrder, ...state.spotOrders] }
    }

    case 'CANCEL_SPOT_ORDER': {
      const order = state.spotOrders.find(o => o.id === action.payload)
      if (!order) return state
      let newBalances = { ...state.balances }
      if (order.orderType === 'limit') {
        if (order.side === 'buy') {
          newBalances['USDT'] = (newBalances['USDT'] || 0) + order.amount * order.price
        } else {
          newBalances[order.baseSymbol] = (newBalances[order.baseSymbol] || 0) + order.amount
        }
      }
      const cancelled = { ...order, status: 'cancelled', cancelledAt: Date.now() }
      return {
        ...state,
        balances: newBalances,
        spotOrders: state.spotOrders.filter(o => o.id !== action.payload),
        spotHistory: [cancelled, ...state.spotHistory],
      }
    }

    case 'OPEN_FUTURES_POSITION': {
      // NOTE: Margin is NOT deducted from balance. P&L is shown dynamically.
      const { symbol, coinId, side, leverage, size, entryPrice, orderType } = action.payload
      const fillPrice = entryPrice
      const margin = size / leverage
      const liqPrice = calcLiquidationPrice(fillPrice, leverage, side)

      const position = {
        id: positionIdCounter++,
        symbol,
        coinId,
        side,
        leverage,
        size,
        margin,
        entryPrice: fillPrice,
        liquidationPrice: liqPrice,
        openedAt: Date.now(),
        status: 'open',
      }

      return {
        ...state,
        futuresPositions: [position, ...state.futuresPositions],
      }
    }

    case 'CLOSE_FUTURES_POSITION': {
      const { positionId, closePrice } = action.payload
      const position = state.futuresPositions.find(p => p.id === positionId)
      if (!position) return state

      let pnl = 0
      if (position.side === 'long') {
        pnl = ((closePrice - position.entryPrice) / position.entryPrice) * position.size
      } else {
        pnl = ((position.entryPrice - closePrice) / position.entryPrice) * position.size
      }

      // Only add the realized PnL (margin was never deducted)
      const newBalances = { ...state.balances }
      newBalances['USDT'] = (newBalances['USDT'] || 0) + pnl

      const closed = { ...position, status: 'closed', closePrice, pnl, closedAt: Date.now() }

      return {
        ...state,
        balances: newBalances,
        futuresPositions: state.futuresPositions.filter(p => p.id !== positionId),
        futuresHistory: [closed, ...state.futuresHistory],
      }
    }

    case 'LIQUIDATE_POSITION': {
      // Margin was never deducted at open, so liquidation must deduct it now
      const position = state.futuresPositions.find(p => p.id === action.payload)
      if (!position) return state
      const newBalances = { ...state.balances }
      newBalances['USDT'] = Math.max(0, (newBalances['USDT'] || 0) - position.margin)
      const liquidated = { ...position, status: 'liquidated', pnl: -position.margin, closedAt: Date.now() }
      return {
        ...state,
        balances: newBalances,
        futuresPositions: state.futuresPositions.filter(p => p.id !== action.payload),
        futuresHistory: [liquidated, ...state.futuresHistory],
      }
    }

    case 'PLACE_FUTURES_PENDING_ORDER': {
      const { symbol, coinId, side, leverage, size, stopPrice, limitPrice, placedAtPrice } = action.payload
      const order = {
        id: positionIdCounter++,
        symbol,
        coinId,
        side,
        leverage,
        size,
        stopPrice,
        limitPrice,
        placedAtPrice,
        orderType: 'stop_limit',
        status: 'pending',
        createdAt: Date.now(),
      }
      return { ...state, futuresPendingOrders: [order, ...state.futuresPendingOrders] }
    }

    case 'CANCEL_FUTURES_PENDING_ORDER': {
      return {
        ...state,
        futuresPendingOrders: state.futuresPendingOrders.filter(o => o.id !== action.payload),
      }
    }

    case 'SET_BRK_MARKET_DATA': {
      return {
        ...state,
        marketData: { ...state.marketData, 'berk-coin': action.payload },
      }
    }

    case 'STAKE_TO_POOL': {
      const { poolId, symbol, amount } = action.payload
      const bal = state.balances[symbol] || 0
      if (bal < amount) return state
      const stake = {
        id: state.stakeIdCounter,
        poolId,
        symbol,
        amount,
        stakedAt: Date.now(),
      }
      return {
        ...state,
        stakeIdCounter: state.stakeIdCounter + 1,
        balances: { ...state.balances, [symbol]: bal - amount },
        stakes: [stake, ...state.stakes],
      }
    }

    case 'UNSTAKE_FROM_POOL': {
      const { stakeId, rewardsAmount } = action.payload
      const stake = state.stakes.find(s => s.id === stakeId)
      if (!stake) return state
      const returnAmount = stake.amount + (rewardsAmount || 0)
      return {
        ...state,
        balances: {
          ...state.balances,
          [stake.symbol]: (state.balances[stake.symbol] || 0) + returnAmount,
        },
        stakes: state.stakes.filter(s => s.id !== stakeId),
      }
    }

    case 'CLAIM_BRK_DIVIDEND': {
      const { amount } = action.payload
      return {
        ...state,
        balances: {
          ...state.balances,
          BRK: (state.balances.BRK || 0) + amount,
        },
      }
    }

    default:
      return state
  }
}

export function ExchangeProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Persist state to localStorage on every change (excluding live market data)
  useEffect(() => {
    try {
      const { marketData: _, ...persistable } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
      localStorage.setItem(STORAGE_KEY + '_counters', JSON.stringify({ orderIdCounter, positionIdCounter }))
    } catch {
      // storage quota exceeded or unavailable — ignore
    }
  }, [state])

  const handleMarketData = useCallback((data) => {
    dispatch({ type: 'UPDATE_MARKET_DATA', payload: data })
  }, [])

  const { loading, error } = useCoinGecko(handleMarketData)

  // BRK live price tick every 5s
  useEffect(() => {
    const injectBRK = () => {
      const price = tickBRKPrice()
      dispatch({
        type: 'SET_BRK_MARKET_DATA',
        payload: {
          id: 'berk-coin',
          symbol: 'brk',
          name: 'Berk Coin',
          current_price: price,
          price_change_percentage_24h: 3.47 + Math.sin(Date.now() * 0.000001) * 4,
          market_cap: price * 85_400_000,
          total_volume: 2_800_000 + Math.sin(Date.now() * 0.0000005) * 400_000,
          high_24h: price * 1.052,
          low_24h: price * 0.961,
          circulating_supply: 85_400_000,
        },
      })
    }
    injectBRK()
    const timer = setInterval(injectBRK, 5000)
    return () => clearInterval(timer)
  }, [])

  // Compute unrealized P&L from all open futures positions
  const unrealizedPnL = useMemo(() => {
    return state.futuresPositions.reduce((total, pos) => {
      const markPrice = state.marketData[pos.coinId]?.current_price || pos.entryPrice
      const pnl = pos.side === 'long'
        ? ((markPrice - pos.entryPrice) / pos.entryPrice) * pos.size
        : ((pos.entryPrice - markPrice) / pos.entryPrice) * pos.size
      return total + pnl
    }, 0)
  }, [state.futuresPositions, state.marketData])

  const value = {
    state,
    dispatch,
    loading,
    error,
    marketData: state.marketData,
    balances: state.balances,
    spotOrders: state.spotOrders,
    spotHistory: state.spotHistory,
    futuresPositions: state.futuresPositions,
    futuresHistory: state.futuresHistory,
    futuresPendingOrders: state.futuresPendingOrders,
    stakes: state.stakes,
    unrealizedPnL,
  }

  return (
    <ExchangeContext.Provider value={value}>
      {children}
    </ExchangeContext.Provider>
  )
}

export function useExchange() {
  const ctx = useContext(ExchangeContext)
  if (!ctx) throw new Error('useExchange must be used within ExchangeProvider')
  return ctx
}
