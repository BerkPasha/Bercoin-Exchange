export const COINS = [
  { id: 'berk-coin', symbol: 'BRK', name: 'Berk Coin', color: '#7C3AED', isFake: true },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', color: '#8B5CF6' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#9945FF' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', color: '#00AAE4' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', color: '#0D1E2E' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', color: '#E84142' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', color: '#E6007A' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', color: '#C3A634' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', color: '#8247E5' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', color: '#2A5ADA' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', color: '#BFBBBB' },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', color: '#8DC351' },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar', color: '#14B6E7' },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', color: '#2E3148' },
  { id: 'algorand', symbol: 'ALGO', name: 'Algorand', color: '#000000' },
  { id: 'vechain', symbol: 'VET', name: 'VeChain', color: '#15BDFF' },
  { id: 'tron', symbol: 'TRX', name: 'TRON', color: '#FF0013' },
  { id: 'ethereum-classic', symbol: 'ETC', name: 'Ethereum Classic', color: '#328332' },
  { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', color: '#0090FF' },
  { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera', color: '#222222' },
  { id: 'quant-network', symbol: 'QNT', name: 'Quant', color: '#1A1A2E' },
  { id: 'theta-token', symbol: 'THETA', name: 'Theta Network', color: '#2AB8E6' },
  { id: 'internet-computer', symbol: 'ICP', name: 'Internet Computer', color: '#29ABE2' },
  { id: 'aave', symbol: 'AAVE', name: 'Aave', color: '#B6509E' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', color: '#FF007A' },
  { id: 'the-sandbox', symbol: 'SAND', name: 'The Sandbox', color: '#00ADEF' },
  { id: 'decentraland', symbol: 'MANA', name: 'Decentraland', color: '#FF2D55' },
  { id: 'axie-infinity', symbol: 'AXS', name: 'Axie Infinity', color: '#0055D5' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', color: '#000000' },
  { id: 'fantom', symbol: 'FTM', name: 'Fantom', color: '#1969FF' },
  { id: 'flow', symbol: 'FLOW', name: 'Flow', color: '#00EF8B' },
  { id: 'curve-dao-token', symbol: 'CRV', name: 'Curve DAO', color: '#FF0000' },
  { id: 'compound-governance-token', symbol: 'COMP', name: 'Compound', color: '#00D395' },
  { id: 'maker', symbol: 'MKR', name: 'Maker', color: '#1AAB9B' },
  { id: 'sushi', symbol: 'SUSHI', name: 'SushiSwap', color: '#FA52A0' },
  { id: '1inch', symbol: '1INCH', name: '1inch', color: '#94A6C3' },
  { id: 'enjincoin', symbol: 'ENJ', name: 'Enjin Coin', color: '#7866D5' },
  { id: 'chiliz', symbol: 'CHZ', name: 'Chiliz', color: '#CD0124' },
  { id: 'basic-attention-token', symbol: 'BAT', name: 'Basic Attention Token', color: '#FF5000' },
  { id: 'loopring', symbol: 'LRC', name: 'Loopring', color: '#1C42FF' },
  { id: 'ocean-protocol', symbol: 'OCEAN', name: 'Ocean Protocol', color: '#141414' },
  { id: 'render-token', symbol: 'RNDR', name: 'Render', color: '#D5551C' },
  { id: 'injective-protocol', symbol: 'INJ', name: 'Injective', color: '#00F2FE' },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', color: '#2D9CDB' },
  { id: 'sui', symbol: 'SUI', name: 'Sui', color: '#6FBCF0' },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', color: '#28A0F0' },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', color: '#FF0420' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', color: '#FFA409' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe', color: '#00A550' },
]

export const COIN_IDS = COINS.map(c => c.id).join(',')

export function getCoinBySymbol(symbol) {
  return COINS.find(c => c.symbol === symbol)
}

export function getCoinById(id) {
  return COINS.find(c => c.id === id)
}
