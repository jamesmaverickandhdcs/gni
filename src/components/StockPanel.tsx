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
  chartData: { date: string; close: number; volume: number }[]
}

const RANGES = ['1m', '6m', '1y', '5y', '10y']

const TICKERS = [
  { ticker: 'SPY',  label: 'S&P 500' },
  { ticker: 'GLD',  label: 'Gold' },
  { ticker: 'USO',  label: 'Oil' },
  { ticker: 'LMT',  label: 'Lockheed' },
  { ticker: 'XOM',  label: 'ExxonMobil' },
  { ticker: 'TLT',  label: 'US Bonds' },
  { ticker: 'DX-Y.NYB', label: 'USD Index' },
  { ticker: 'FXI',  label: 'China ETF' },
]

function formatPrice(price: number, currency: string) {
  if (!price) return '—'
  return `${currency === 'USD' ? '$' : ''}${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string, range: string) {
  const date = new Date(dateStr)
  if (range === '1m') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (range === '6m') return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function StockPanel() {
  const [selectedTicker, setSelectedTicker] = useState('SPY')
  const [selectedRange, setSelectedRange] = useState('10y')
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/stocks?ticker=${selectedTicker}&range=${selectedRange}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setStockData(data)
      })
      .catch(() => setError('Failed to load stock data'))
      .finally(() => setLoading(false))
  }, [selectedTicker, selectedRange])

  const isPositive = stockData ? parseFloat(stockData.changePercent) >= 0 : true
  const chartColor = isPositive ? '#22c55e' : '#ef4444'

  // Thin out chart data for display
  const chartData = stockData?.chartData?.map(d => ({
    ...d,
    date: formatDate(d.date, selectedRange)
  })) || []

  // Show fewer x-axis ticks
  const tickCount = selectedRange === '1m' ? 6 : selectedRange === '6m' ? 6 : 8

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div className="text-xs text-gray-500 uppercase tracking-wider">
          📈 Market Intelligence — Stock Price History
        </div>
        <div className="text-xs text-gray-600">
          Yahoo Finance • Unofficial
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Ticker Sidebar */}
        <div className="md:w-48 border-b md:border-b-0 md:border-r border-gray-700 p-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
            Instruments
          </div>
          <div className="flex md:flex-col gap-1 flex-wrap">
            {TICKERS.map(({ ticker, label }) => (
              <button
                key={ticker}
                onClick={() => setSelectedTicker(ticker)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedTicker === ticker
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="font-mono font-bold text-xs">{ticker}</div>
                <div className="text-xs opacity-70">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-4">
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
            <>
              {/* Price Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-white font-bold text-lg">{stockData.ticker}</div>
                  <div className="text-gray-400 text-xs">{stockData.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-2xl">
                    {formatPrice(stockData.price, stockData.currency)}
                  </div>
                  <div className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '▲' : '▼'} {stockData.change} ({stockData.changePercent}%)
                  </div>
                </div>
              </div>

              {/* Range Selector */}
              <div className="flex gap-1 mb-4">
                {RANGES.map(range => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                      selectedRange === range
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <ResponsiveContainer width="100%" height={280}>
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
                    width={65}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}