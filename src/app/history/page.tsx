'use client'

import { useEffect, useState } from 'react'

interface PipelineRun {
  id: string
  run_at: string
  total_collected: number
  total_after_relevance: number
  total_after_funnel: number
  llm_source: string
  status: string
  duration_seconds: number
  report_id: string
}

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

interface Article {
  id: string
  source: string
  title: string
  url: string
  summary: string
  stage3_score: number
  stage4_rank: number
  stage4_selected: boolean
}

function riskColor(risk: string) {
  switch (risk?.toLowerCase()) {
    case 'critical': return 'bg-red-600 text-white'
    case 'high':     return 'bg-orange-500 text-white'
    case 'medium':   return 'bg-yellow-500 text-black'
    case 'low':      return 'bg-green-500 text-white'
    default:         return 'bg-gray-500 text-white'
  }
}

function sentimentColor(sentiment: string) {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return 'text-red-400'
    case 'bullish': return 'text-green-400'
    default:        return 'text-gray-400'
  }
}

function RunCard({ run, reports }: { run: PipelineRun, reports: Report[] }) {
  const [expanded, setExpanded] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [loadingArticles, setLoadingArticles] = useState(false)

  const report = reports.find(r => r.id === run.report_id)

  const handleExpand = () => {
    if (expanded === false && articles.length === 0) {
      setLoadingArticles(true)
      fetch('/api/pipeline-articles?run_id=' + run.id)
        .then(r => r.json())
        .then(data => {
          const selected = (data.articles || []).filter((a: Article) => a.stage4_selected === true)
          setArticles(selected)
        })
        .catch(() => {})
        .finally(() => setLoadingArticles(false))
    }
    setExpanded(expanded === false)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full text-left px-6 py-4 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm font-bold text-blue-400">
                {new Date(run.run_at).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                run.status === 'success' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
              }`}>
                {run.status}
              </span>
              <span className="text-xs text-gray-600">
                {run.llm_source} - {run.duration_seconds}s - {run.total_collected} articles to {run.total_after_funnel} selected
              </span>
            </div>
            {report ? (
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-white font-semibold text-sm">{report.title}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskColor(report.risk_level)}`}>
                  {report.risk_level?.toUpperCase()}
                </span>
                <span className={`text-xs font-bold ${sentimentColor(report.sentiment)}`}>
                  {report.sentiment}
                </span>
              </div>
            ) : (
              <div className="text-xs text-gray-600">No report linked to this run</div>
            )}
          </div>
          <span className="text-gray-600 text-xs shrink-0">
            {expanded ? 'Hide' : 'Show'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-6 py-4 space-y-4">

          {report && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Consolidated Intelligence Report
              </div>
              <p className="text-gray-300 text-sm leading-relaxed mb-2">{report.summary}</p>
              {report.market_impact && (
                <p className="text-gray-400 text-xs leading-relaxed mb-2">
                  <span className="text-gray-500">Market Impact: </span>
                  {report.market_impact}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500">Location: {report.location_name}</span>
                {report.tickers_affected?.map(t => (
                  <span key={t} className="text-xs font-mono text-blue-400 bg-blue-900 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Top Articles Fed to AI ({articles.length})
            </div>

            {loadingArticles && (
              <div className="text-xs text-gray-500 py-2">Loading articles...</div>
            )}

            <div className="space-y-2">
              {articles.map((art, i) => (
                <div key={art.id} className="flex items-start gap-3 bg-gray-800 rounded-lg p-3">
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
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/pipeline-runs').then(r => r.json()),
      fetch('/api/reports').then(r => r.json()),
    ]).then(([runsData, reportsData]) => {
      setRuns(runsData.runs || [])
      setReports(reportsData.reports || [])
    }).finally(() => setLoading(false))
  }, [])

  const grouped: Record<string, PipelineRun[]> = {}
  runs.forEach(run => {
    const date = new Date(run.run_at).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    if (grouped[date] === undefined) grouped[date] = []
    grouped[date].push(run)
  })

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Intelligence History</h1>
            <p className="text-sm text-gray-400">
              {runs.length} pipeline runs - each with consolidated report + top articles
            </p>
          </div>
          <a href="/" className="text-sm text-blue-400 hover:text-blue-300">
            Back to Dashboard
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <p>Loading history...</p>
          </div>
        )}

        {loading === false && runs.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>No pipeline runs yet.</p>
          </div>
        )}

        {loading === false && Object.entries(grouped).map(([date, dateRuns]) => (
          <div key={date} className="mb-8">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-3">
              <span>{date}</span>
              <span className="text-gray-700">({dateRuns.length} run{dateRuns.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="space-y-3">
              {dateRuns.map(run => (
                <RunCard key={run.id} run={run} reports={reports} />
              ))}
            </div>
          </div>
        ))}
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 text-center text-xs text-gray-600">
          GNI History - Pipeline runs 2x daily | Each run: 92 articles to AI analysis to 1 report
        </div>
      </footer>
    </div>
  )
}
