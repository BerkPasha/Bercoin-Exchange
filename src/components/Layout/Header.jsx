import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useExchange } from '../../context/ExchangeContext'
import { formatNumber } from '../../utils/format'

export default function Header() {
  const { balances, unrealizedPnL, futuresPositions } = useExchange()
  const navigate = useNavigate()

  return (
    <header style={{ background: '#110F1C', borderBottom: '1px solid #1E1B30' }} className="flex items-center h-14 px-4 gap-6 flex-shrink-0 z-50">
      {/* Logo */}
      <div
        className="flex items-center cursor-pointer flex-shrink-0"
        onClick={() => navigate('/dashboard')}
      >
        <div className="flex flex-col leading-none">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: '#F1F0F5' }}>
            Ber<span style={{ color: '#A78BFA' }}>Coin</span>
          </span>
          <span className="text-sm font-semibold" style={{ color: '#8B849C', letterSpacing: '0.1em' }}>EXCHANGE</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-1 h-full">
        {[
          { to: '/markets', label: 'Piyasalar' },
          { to: '/spot/BTC-USDT', label: 'İşlem' },
          { to: '/futures/BTC-USDT', label: 'Vadeli' },
          { to: '/earn', label: '★ Kazan' },
          { to: '/wallet', label: 'Cüzdan' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-4 h-full flex items-center text-sm font-medium transition-colors ${isActive ? 'border-b-2' : 'hover:opacity-80'}`
            }
            style={({ isActive }) => isActive
              ? { color: '#A78BFA', borderBottomColor: '#8B5CF6' }
              : { color: '#8B849C' }
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.25)' }}>
          DEMO
        </span>
        <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg" style={{ background: '#1E1B30' }}>
          <span style={{ color: '#A78BFA', fontSize: 12 }}>BRK</span>
          <span className="font-bold" style={{ color: '#A78BFA' }}>
            {formatNumber(balances.BRK || 0, 2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg" style={{ background: '#1E1B30' }}>
          <span style={{ color: '#8B849C', fontSize: 12 }}>USDT</span>
          <span className="font-bold" style={{ color: '#F1F0F5' }}>
            {formatNumber((balances.USDT || 0) + unrealizedPnL, 2)}
          </span>
          {futuresPositions.length > 0 && unrealizedPnL !== 0 && (
            <span className="text-xs font-medium" style={{ color: unrealizedPnL >= 0 ? '#22C55E' : '#F87171', fontSize: 11 }}>
              ({unrealizedPnL >= 0 ? '+' : ''}{formatNumber(unrealizedPnL, 2)})
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
