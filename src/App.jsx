import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ExchangeProvider } from './context/ExchangeContext'
import Header from './components/Layout/Header'
import Dashboard from './components/pages/Dashboard'
import Markets from './components/pages/Markets'
import SpotTrade from './components/pages/SpotTrade'
import FuturesTrade from './components/pages/FuturesTrade'
import Wallet from './components/pages/Wallet'
import Earn from './components/pages/Earn'

export default function App() {
  return (
    <ExchangeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-ex-bg text-ex-tp flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/markets" element={<Markets />} />
              <Route path="/spot/:pair" element={<SpotTrade />} />
              <Route path="/spot" element={<Navigate to="/spot/BTC-USDT" replace />} />
              <Route path="/futures/:pair" element={<FuturesTrade />} />
              <Route path="/futures" element={<Navigate to="/futures/BTC-USDT" replace />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/earn"   element={<Earn />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ExchangeProvider>
  )
}
