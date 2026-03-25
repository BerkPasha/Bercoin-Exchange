import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { COIN_IDS } from '../data/coins'

const BASE_URL = 'https://api.coingecko.com/api/v3'
const REFRESH_INTERVAL = 30000

export function useCoinGecko(onDataUpdate) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)
  const onDataUpdateRef = useRef(onDataUpdate)

  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate
  }, [onDataUpdate])

  const fetchMarkets = useCallback(async () => {
    try {
      const response = await axios.get(`${BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: COIN_IDS,
          order: 'market_cap_desc',
          per_page: 50,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h,7d',
        },
        timeout: 10000,
      })
      if (response.data && Array.isArray(response.data)) {
        onDataUpdateRef.current(response.data)
        setError(null)
      }
    } catch (err) {
      console.error('CoinGecko fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarkets()
    intervalRef.current = setInterval(fetchMarkets, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchMarkets])

  return { loading, error, refetch: fetchMarkets }
}

export async function fetchChartData(coinId, days) {
  try {
    const response = await axios.get(`${BASE_URL}/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
      },
      timeout: 15000,
    })
    return response.data
  } catch (err) {
    console.error('Chart data fetch error:', err)
    return null
  }
}
