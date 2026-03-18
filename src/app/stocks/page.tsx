'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

interface StockData {
  ticker: string
  name: string
  price: number
  change: string
  changePercent: string
  currency: string
  chartData: { date: string; close: number }[]
}

const RANGES = ['3d', '7d', '1m', '1y', '10y']

const WATCHLIST_TICKERS = [
  { ticker: 'SPY',      label: 'S&P 500',    category: 'US Equity' },
  { ticker: 'GLD',      label: 'Gold',        category: 'Commodity' },
  { ticker: 'USO',      label: 'Oil',         category: 'Energy' },
  { ticker: 'XOM',      label: 'ExxonMobil',  category: 'Energy' },
  { ticker: 'LMT',      label: 'Lockheed',    category: 'Defence' },
  { ticker: 'TLT',      label: 'US Bonds',    category: 'Fixed Income' },
  { ticker: 'DX-Y.NYB', label: 'USD Index',   category: 'Currency' },
  { ticker: 'FXI',      label: 'China ETF',   category: 'Emerging' },
  { ticker: 'AAPL',     label: 'Apple',       category: 'Tech' },
  { ticker: 'JPM',      label: 'JP Morgan',   category: 'Finance' },
  { ticker: 'EWJ',      label: 'Japan ETF',   category: 'Asia' },
  { ticker: 'EWT',      label: 'Taiwan ETF',  category: 'Asia' },
]

function formatPrice(price: number) {
  if (!price) return '—'
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string, range: string) {
  const date = new Date(dateStr)
  if (range === '3d' || range === '7d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (range === '1m') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function StocksPage() {
  const [selectedTicker, setSelectedTicker] = useState('SPY')
  const [selectedRange, setSelectedRange] = useState('10y')
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [priceCache, setPriceCache] = useState<Record<string, { price: number, changePercent: string }>>({})

  // Load chart data when ticker or range changes
  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/stocks?ticker=${selectedTicker}&range=${selectedRange}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else {
          setStockData(data)
          // Cache price data
          setPriceCache(prev => ({
            ...prev,
            [data.ticker]: { price: data.price, changePercent: data.changePercent }
          }))
        }
      })
      .catch(() => setError('Failed to load stock data'))
      .finally(() => setLoading(false))
  }, [selectedTicker, selectedRange])

  // Pre-load prices for sidebar cards
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    WATCHLIST_TICKERS.forEach(({ ticker }) => {
      if (!priceCache[ticker]) {
        fetch(`/api/stocks?ticker=${ticker}&range=7d`)
          .then(r => r.json())
          .then(data => {
            if (!data.error) {
              setPriceCache(prev => ({
                ...prev,
                [ticker]: { price: data.price, changePercent: data.changePercent }
              }))
            }
          })
          .catch(() => {})
      }
    })
  }, [])

  const isPositive = stockData ? parseFloat(stockData.changePercent) >= 0 : true
  const chartColor = isPositive ? '#22c55e' : '#ef4444'

  const chartData = stockData?.chartData?.map(d => ({
    ...d,
    date: formatDate(d.date, selectedRange)
  })) || []

  const tickCount = selectedRange === '3d' ? 3 : selectedRange === '7d' ? 7 : 8

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">📈 Market Intelligence</h1>
            <p className="text-sm text-gray-400">Stock Price History — Geopolitically Relevant Instruments</p>
          </div>
          <a href="/" className="text-sm text-blue-400 hover:text-blue-300">
            ← Dashboard
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">

        {/* Left — Watchlist Cards */}
        <div className="w-64 shrink-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 100px)' }}>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            12 Instruments
          </div>
          <div className="space-y-2">
            {WATCHLIST_TICKERS.map(({ ticker, label, category }) => {
              const cached = priceCache[ticker]
              const isUp = cached ? parseFloat(cached.changePercent) >= 0 : null
              return (
                <button
                  key={ticker}
                  onClick={() => setSelectedTicker(ticker)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedTicker === ticker
                      ? 'bg-blue-900 border-blue-500'
                      : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-blue-400 text-sm">{ticker}</span>
                    {cached && (
                      <span className={`text-xs font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {isUp ? '▲' : '▼'} {Math.abs(parseFloat(cached.changePercent)).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-300">{label}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-600">{category}</span>
                    {cached && (
                      <span className="text-xs text-white font-bold">
                        {formatPrice(cached.price)}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Disclaimer */}
          <div className="mt-4 bg-yellow-900 border border-yellow-700 rounded-lg p-3">
            <p className="text-yellow-200 text-xs">
              ⚠️ For informational purposes only. Not financial advice.
            </p>
          </div>
        </div>

        {/* Right — Chart */}
        <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-6 sticky top-6 self-start">

          {/* Price header */}
          {stockData && !loading && (
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-white font-bold text-2xl">{stockData.ticker}</div>
                <div className="text-gray-400 text-sm">{stockData.name}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-3xl">
                  {formatPrice(stockData.price)}
                </div>
                <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? '▲' : '▼'} {stockData.change} ({stockData.changePercent}%)
                </div>
              </div>
            </div>
          )}

          {/* Range selector */}
          <div className="flex gap-2 mb-6">
            {RANGES.map(range => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Chart */}
          {loading && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm">Loading {selectedTicker}...</div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && stockData && (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(chartData.length / tickCount)}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v.toLocaleString()}`}
                  width={70}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Price']}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={chartColor}
                  strokeWidth={2}
                  fill="url(#colorClose)"
                  dot={false}
                  activeDot={{ r: 4, fill: chartColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Yahoo Finance attribution */}
          <div className="mt-4 text-center text-xs text-gray-600">
            Data: Yahoo Finance (Unofficial) • Updates every hour
          </div>
        </div>
      </div>
    </div>
  )
}
