'use client'

import { useEffect, useState } from 'react'

interface Report {
  id: string
  title: string
  summary: string
  sentiment: string
  sentiment_score: number
  risk_level: string
  location_name: string
  tickers_affected: string[]
  market_impact: string
  llm_source: string
  created_at: string
}

interface WatchlistItem {
  id: string
  symbol: string
  name: string
  sector: string
  region: string
}

const riskColor = (risk: string) => {
  switch (risk?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high': return 'bg-orange-500 text-white'
    case 'medium': return 'bg-yellow-500 text-black'
    case 'low': return 'bg-green-500 text-white'
    default: return 'bg-gray-500 text-white'
  }
}

const sentimentColor = (sentiment: string) => {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return 'text-red-500'
    case 'bullish': return 'text-green-500'
    default: return 'text-gray-400'
  }
}

const sentimentIcon = (sentiment: string) => {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return '▼'
    case 'bullish': return '▲'
    default: return '●'
  }
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setReports(data.reports || [])
      })
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false))

    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => setWatchlist(data.watchlist || []))
      .catch(() => {})
  }, [])

  const latest = reports[0]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🌐 Global Nexus Insights</h1>
            <p className="text-sm text-gray-400">Macro-Economic & Geopolitical Intelligence</p>
          </div>
          <div className="text-right text-sm text-gray-400">
            <div>Pipeline: <span className="text-green-400">● Active</span></div>
            <div>Reports: <span className="text-white font-bold">{reports.length}</span></div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">⏳</div>
            <p>Loading intelligence reports...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-red-400">
            <div className="text-4xl mb-4">⚠️</div>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-4">📭</div>
            <p>No reports yet. Pipeline runs at 09:00 and 17:00 Myanmar time.</p>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <>
            {/* Latest Report Hero */}
            <section className="mb-8">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Latest Intelligence Report</div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold text-white leading-tight">{latest.title}</h2>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${riskColor(latest.risk_level)}`}>
                    {latest.risk_level?.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-4">{latest.summary}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                    <div className={`font-bold ${sentimentColor(latest.sentiment)}`}>
                      {sentimentIcon(latest.sentiment)} {latest.sentiment}
                    </div>
                    <div className="text-xs text-gray-400">{latest.sentiment_score?.toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="font-bold text-white text-sm">📍 {latest.location_name || 'Global'}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">LLM Engine</div>
                    <div className="font-bold text-blue-400 text-sm">
                      {latest.llm_source === 'ollama' ? '🧠 Llama 3 Local' : '☁️ Groq API'}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Generated</div>
                    <div className="font-bold text-white text-sm">
                      {new Date(latest.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Tickers */}
                {latest.tickers_affected?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {latest.tickers_affected.map(ticker => (
                      <span key={ticker} className="bg-blue-900 text-blue-300 text-xs font-mono font-bold px-2 py-1 rounded">
                        {ticker}
                      </span>
                    ))}
                  </div>
                )}

                {/* Market Impact */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Market Impact Analysis</div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {latest.market_impact || 'Analysis will appear in next pipeline run.'}
                  </p>
                </div>
              </div>
            </section>

            {/* Previous Reports */}
            {reports.length > 1 && (
              <section className="mb-8">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Previous Reports</div>
                <div className="space-y-3">
                  {reports.slice(1).map(report => (
                    <div key={report.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-sm mb-1 truncate">{report.title}</h3>
                          <p className="text-gray-400 text-xs line-clamp-2">{report.summary}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskColor(report.risk_level)}`}>
                            {report.risk_level?.toUpperCase()}
                          </span>
                          <span className={`text-xs font-bold ${sentimentColor(report.sentiment)}`}>
                            {sentimentIcon(report.sentiment)} {report.sentiment}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500">📍 {report.location_name || 'Global'}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(report.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                        {report.tickers_affected?.slice(0, 3).map(t => (
                          <span key={t} className="text-xs font-mono text-blue-400">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Watchlist */}
            {watchlist.length > 0 && (
              <section className="mt-8">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  Market Watchlist — {watchlist.length} Instruments
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {watchlist.map(item => (
                    <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-600 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-blue-400 text-sm">{item.symbol}</span>
                        <span className="text-xs text-gray-500">{item.region}</span>
                      </div>
                      <div className="text-xs text-gray-300 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.sector}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-xs text-gray-600">
          GNI — Global Nexus Insights | Diploma in Computer Science | Pipeline runs 2x daily via GitHub Actions
        </div>
      </footer>
    </div>
  )
}
