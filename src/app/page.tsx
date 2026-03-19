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
  lat: number | null
  lng: number | null
  tickers_affected: string[]
  market_impact: string
  llm_source: string
  created_at: string
}

interface PredictionSummary {
  total: number
  avg_score: number
  accuracy_3d: number
  accuracy_7d: number
  pending_review: number
}

interface PipelineArticle {
  id: string
  source: string
  title: string
  url: string
  summary: string
  stage3_score: number
  stage4_rank: number
  stage4_selected: boolean
}

const riskColor = (risk: string) => {
  switch (risk?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high':     return 'bg-orange-500 text-white'
    case 'medium':   return 'bg-yellow-500 text-black'
    case 'low':      return 'bg-green-500 text-white'
    default:         return 'bg-gray-500 text-white'
  }
}

const sentimentColor = (sentiment: string) => {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return 'text-red-500'
    case 'bullish': return 'text-green-500'
    default:        return 'text-gray-400'
  }
}

const sentimentIcon = (sentiment: string) => {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return '▼'
    case 'bullish': return '▲'
    default:        return '◆'
  }
}

function PredictionScorecard({ summary }: { summary: PredictionSummary | null }) {
  if (summary === null || summary.total === 0) return null
  return (
    <section className="mb-8">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-lg">🎯</span>
          <div>
            <div className="text-sm font-bold text-white">GPVS Prediction Scorecard</div>
            <div className="text-xs text-gray-400">GNI Prediction Validation Standard — {summary.total} reports verified</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${summary.avg_score >= 70 ? 'text-green-400' : summary.avg_score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {summary.avg_score}%
            </div>
            <div className="text-xs text-gray-500 mt-1">GPVS Score</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${summary.accuracy_3d >= 70 ? 'text-green-400' : summary.accuracy_3d >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {summary.accuracy_3d}%
            </div>
            <div className="text-xs text-gray-500 mt-1">3-Day Accuracy</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${summary.accuracy_7d >= 70 ? 'text-green-400' : summary.accuracy_7d >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {summary.accuracy_7d}%
            </div>
            <div className="text-xs text-gray-500 mt-1">7-Day Accuracy</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className={`text-2xl font-bold ${summary.pending_review === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {summary.pending_review}
            </div>
            <div className="text-xs text-gray-500 mt-1">Pending Review</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-600 text-center">
          Powered by GPVS v1.0 — GNI Prediction Validation Standard | SPY directional accuracy vs actual market movements
        </div>
        <div className="mt-2 text-xs text-yellow-600 text-center">
          ⚠️ Past accuracy does not guarantee future performance. Not financial advice.
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [latestArticles, setLatestArticles] = useState<PipelineArticle[]>([])
  const [showAIThinking, setShowAIThinking] = useState(false)
  const [predictionSummary, setPredictionSummary] = useState<PredictionSummary | null>(null)

  // Supabase Realtime — auto-refresh when new report arrives
  useEffect(() => {
    // Poll every 5 minutes for new reports instead of websocket
    const interval = setInterval(() => {
      fetch('/api/reports')
        .then(r => r.json())
        .then(data => {
          if (data.reports && data.reports.length > 0) {
            setReports(prev => {
              if (prev[0]?.id !== data.reports[0]?.id) {
                return data.reports
              }
              return prev
            })
          }
        })
        .catch(() => {})
    }, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setReports(data.reports || [])
      })
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false))

    // Fetch latest pipeline run articles
    fetch('/api/prediction-outcomes')
      .then(r => r.json())
      .then(data => setPredictionSummary(data.summary || null))
      .catch(() => {})

    fetch('/api/pipeline-runs')
      .then(r => r.json())
      .then(data => {
        const runs = data.runs || []
        if (runs.length > 0) {
          fetch(`/api/pipeline-articles?run_id=${runs[0].id}`)
            .then(r => r.json())
            .then(d => {
              const selected = (d.articles || []).filter((a: PipelineArticle) => a.stage4_selected === true)
              setLatestArticles(selected)
            })
        }
      })
      .catch(() => {})
  }, [])

  const latest = reports[0]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">🌐 Global Nexus Insights</h1>
              <p className="text-sm text-gray-400">Technology + Geopolitics + Financial Impact</p>
            </div>
            <div className="text-right text-sm text-gray-400">
              <div>Pipeline: <span className="text-green-400">● Active</span></div>
              <div>Reports: <span className="text-white font-bold">{reports.length}</span></div>
            </div>
          </div>

          {/* 4 Navigation Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="/map" className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-blue-700 border border-gray-700 hover:border-blue-500 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
              <span>🌍</span>
              <span>World Map</span>
            </a>
            <a href="/stocks" className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-green-700 border border-gray-700 hover:border-green-500 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
              <span>📈</span>
              <span>Stock Chart</span>
            </a>
            <a href="/transparency" className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-purple-700 border border-gray-700 hover:border-purple-500 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
              <span>🔍</span>
              <span>Transparency</span>
            </a>
            <a href="/history" className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-orange-700 border border-gray-700 hover:border-orange-500 rounded-lg px-4 py-3 text-sm font-medium transition-colors">
              <span>📅</span>
              <span>History</span>
            </a>
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
            <div className="text-4xl mb-4">📡</div>
            <p>No reports yet. Pipeline runs at 09:00 and 17:00 Myanmar time.</p>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <>
            {/* Latest Intelligence Report */}
            <section className="mb-8">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Latest Intelligence Report
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">

                {/* Title + Risk */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-xl font-bold text-white leading-tight">{latest.title}</h2>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${riskColor(latest.risk_level)}`}>
                    {latest.risk_level?.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-4">{latest.summary}</p>

                {/* Stats grid */}
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
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Market Impact Analysis</div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {latest.market_impact || 'Analysis will appear in next pipeline run.'}
                  </p>
                </div>

                {/* Disclaimer */}
                <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
                  <p className="text-yellow-200 text-xs">
                    ⚠️ <strong>Disclaimer:</strong> GNI reports are for informational purposes only and do not constitute financial advice. Always conduct your own research before making investment decisions.
                  </p>
                </div>
              </div>
            </section>

            {/* AI Thinking Transparency */}
            {latestArticles.length > 0 && (
              <section className="mb-8">
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowAIThinking(prev => !prev)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🧠</span>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white">AI Thinking Transparency</div>
                        <div className="text-xs text-gray-400">
                          How {latestArticles.length} articles were consolidated into 1 report
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400 text-sm">{showAIThinking ? '▲ Hide' : '▼ Show'}</span>
                  </button>

                  {showAIThinking && (
                    <div className="px-6 pb-6 border-t border-gray-700">
                      {/* Funnel steps */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 my-4">
                        {[
                          { label: 'Collected', value: '92', color: 'bg-gray-700' },
                          { label: 'Relevant', value: '74', color: 'bg-blue-900' },
                          { label: 'Deduped', value: '74', color: 'bg-indigo-900' },
                          { label: 'Scored', value: '74', color: 'bg-purple-900' },
                          { label: 'Selected', value: String(latestArticles.length), color: 'bg-green-900' },
                        ].map((step, i) => (
                          <div key={i} className={`${step.color} rounded-lg p-2 text-center`}>
                            <div className="text-xl font-bold text-white">{step.value}</div>
                            <div className="text-xs text-gray-400">{step.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Selected articles */}
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                        Top {latestArticles.length} Articles Fed to AI
                      </div>
                      <div className="space-y-2">
                        {latestArticles.map((art, i) => (
                          <div key={art.id} className="bg-gray-800 rounded-lg p-3 flex items-start gap-3">
                            <span className="text-xs font-bold text-blue-400 w-6 shrink-0">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-500 font-mono">{art.source}</span>
                                <span className="text-xs text-yellow-400">Score: {art.stage3_score}</span>
                              </div>
                              {art.url ? (
                                <a
                                  href={art.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-300 hover:text-blue-200 leading-tight"
                                >
                                  {art.title}
                                </a>
                              ) : (
                                <div className="text-sm text-white leading-tight">{art.title}</div>
                              )}
                              {art.summary && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{art.summary}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Prediction Scorecard */}
            <PredictionScorecard summary={predictionSummary} />

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
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-xs text-gray-600">
          GNI — Global Nexus Insights | Higher Diploma in Computer Science | Spring University Myanmar (SUM) | Pipeline runs 2x daily via GitHub Actions
        </div>
      </footer>
    </div>
  )
}
