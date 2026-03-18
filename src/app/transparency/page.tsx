'use client'

import { useEffect, useState } from 'react'

interface PipelineRun {
  id: string
  run_at: string
  total_collected: number
  total_after_relevance: number
  total_after_dedup: number
  total_after_funnel: number
  llm_source: string
  status: string
  duration_seconds: number
  report_id: string
}

interface Article {
  id: string
  source: string
  bias: string
  title: string
  url: string
  summary: string
  published_at: string
  stage1_passed: boolean
  stage1_reason: string
  stage1b_passed: boolean
  stage1b_reason: string
  stage2_passed: boolean
  stage2_reason: string
  stage3_score: number
  stage4_selected: boolean
  stage4_rank: number | null
}

function stageLabel(article: Article) {
  if (article.stage4_selected === true) {
    return { label: 'Selected #' + article.stage4_rank, color: 'bg-green-900 text-green-300' }
  }
  if (article.stage1_passed === false) {
    return { label: 'Rejected: Relevance', color: 'bg-red-900 text-red-300' }
  }
  if (article.stage1b_passed === false) {
    return { label: 'Rejected: Injection', color: 'bg-purple-900 text-purple-300' }
  }
  if (article.stage2_passed === false) {
    return { label: 'Rejected: Duplicate', color: 'bg-yellow-900 text-yellow-300' }
  }
  return { label: 'Scored: ' + article.stage3_score, color: 'bg-blue-900 text-blue-300' }
}

export default function TransparencyPage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [stageFilter, setStageFilter] = useState<number>(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pipeline-runs')
      .then(r => r.json())
      .then(data => {
        setRuns(data.runs || [])
        if (data.runs && data.runs.length > 0) {
          setSelectedRun(data.runs[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedRun) return
    setLoadingArticles(true)
    fetch('/api/pipeline-articles?run_id=' + selectedRun.id)
      .then(r => r.json())
      .then(data => setArticles(data.articles || []))
      .finally(() => setLoadingArticles(false))
  }, [selectedRun])

  const filteredArticles = articles.filter(a => {
    if (stageFilter === 1) return a.stage1_passed === false
    if (stageFilter === 2) return a.stage1_passed === true && a.stage2_passed === false
    if (stageFilter === 3) return a.stage2_passed === true && a.stage4_selected === false
    if (stageFilter === 4) return a.stage4_selected === true
    return true
  })

  const countSelected = articles.filter(a => a.stage4_selected === true).length
  const countStage1Rejected = articles.filter(a => a.stage1_passed === false).length
  const countDupes = articles.filter(a => a.stage1_passed === true && a.stage2_passed === false).length
  const countScored = articles.filter(a => a.stage2_passed === true && a.stage4_selected === false).length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-white">🔍 GNI Transparency Engine</h1>
              <a href="/" className="text-sm text-blue-400 hover:text-blue-300">
                Back to Dashboard
              </a>
            </div>
            <p className="text-sm text-gray-400 mb-1">Explainable AI — Full Intelligence Funnel Trace</p>
            <p className="text-xs text-gray-500 max-w-3xl">
              This page shows exactly how GNI selects news articles and generates intelligence reports. 
              Every algorithmic decision is documented — from 93 collected articles down to the final report. 
              Built for accountability: you can verify why any article was selected or rejected.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {loading && (
          <div className="text-center py-20 text-gray-400">
            <p>Loading pipeline runs...</p>
          </div>
        )}

        {loading === false && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                  Pipeline Runs ({runs.length})
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {runs.map(run => (
                    <button
                      key={run.id}
                      onClick={() => setSelectedRun(run)}
                      className={`w-full text-left p-3 rounded-lg text-xs transition-colors ${
                        selectedRun && selectedRun.id === run.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-bold mb-1">
                        {new Date(run.run_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div className="flex justify-between">
                        <span>{run.total_collected} articles</span>
                        <span className={run.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                          {run.status}
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {run.llm_source} - {run.duration_seconds}s
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main */}
            <div className="lg:col-span-3 space-y-6">

              {/* Run Stats */}
              {selectedRun && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-4">
                    Pipeline Run - {new Date(selectedRun.run_at).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <div className="bg-gray-700 rounded-lg px-4 py-2 text-center min-w-24">
                      <div className="text-2xl font-bold text-white">{selectedRun.total_collected}</div>
                      <div className="text-xs text-gray-400">Collected</div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="bg-blue-900 rounded-lg px-4 py-2 text-center min-w-24">
                      <div className="text-2xl font-bold text-white">{selectedRun.total_after_relevance}</div>
                      <div className="text-xs text-gray-400">Relevant</div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="bg-indigo-900 rounded-lg px-4 py-2 text-center min-w-24">
                      <div className="text-2xl font-bold text-white">{selectedRun.total_after_dedup || selectedRun.total_after_relevance}</div>
                      <div className="text-xs text-gray-400">Deduped</div>
                    </div>
                    <div className="text-gray-600">→</div>
                    <div className="bg-green-900 rounded-lg px-4 py-2 text-center min-w-24">
                      <div className="text-2xl font-bold text-white">{selectedRun.total_after_funnel}</div>
                      <div className="text-xs text-gray-400">Selected</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-gray-500">LLM Engine</div>
                      <div className="text-white font-bold">{selectedRun.llm_source}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-gray-500">Duration</div>
                      <div className="text-white font-bold">{selectedRun.duration_seconds}s</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2">
                      <div className="text-gray-500">Status</div>
                      <div className={`font-bold ${selectedRun.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedRun.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStageFilter(0)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${stageFilter === 0 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  All ({articles.length})
                </button>
                <button
                  onClick={() => setStageFilter(4)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${stageFilter === 4 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Selected ({countSelected})
                </button>
                <button
                  onClick={() => setStageFilter(1)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${stageFilter === 1 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Stage 1 Rejected ({countStage1Rejected})
                </button>
                <button
                  onClick={() => setStageFilter(2)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${stageFilter === 2 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Duplicates ({countDupes})
                </button>
                <button
                  onClick={() => setStageFilter(3)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${stageFilter === 3 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                  Scored not selected ({countScored})
                </button>
              </div>

              {/* Articles */}
              {loadingArticles && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Loading article trace...
                </div>
              )}

              {loadingArticles === false && (
                <div className="space-y-2">
                  {filteredArticles.map(article => {
                    const status = stageLabel(article)
                    const isExpanded = expandedId === article.id
                    return (
                      <div
                        key={article.id}
                        className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
                      >
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : article.id)}
                          className="w-full text-left p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${status.color}`}>
                                  {status.label}
                                </span>
                                <span className="text-xs text-gray-500 font-mono">
                                  {article.source}
                                </span>
                                {article.stage3_score > 0 && (
                                  <span className="text-xs text-blue-400">
                                    Score: {article.stage3_score}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-white font-medium leading-tight">
                                {article.title}
                              </div>
                            </div>
                            <span className="text-gray-600 text-xs shrink-0">
                              {isExpanded ? 'Hide' : 'Show'}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">

                            {article.summary && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Summary</div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                  {article.summary}
                                </p>
                              </div>
                            )}

                            {article.url && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Original Article</div>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 break-all"
                                >
                                  {article.url}
                                </a>
                              </div>
                            )}

                            <div>
                              <div className="text-xs text-gray-500 mb-2">Funnel Decision Trace</div>
                              <div className="space-y-1">
                                <div className="flex items-start gap-2 text-xs">
                                  <span className={article.stage1_passed === true ? 'text-green-400' : 'text-red-400'}>
                                    {article.stage1_passed === true ? 'PASS' : 'FAIL'}
                                  </span>
                                  <span className="text-gray-500 w-40 shrink-0">Stage 1 - Relevance</span>
                                  <span className="text-gray-400">{article.stage1_reason}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                  <span className={article.stage1b_passed === true ? 'text-green-400' : 'text-red-400'}>
                                    {article.stage1b_passed === true ? 'PASS' : 'FAIL'}
                                  </span>
                                  <span className="text-gray-500 w-40 shrink-0">Stage 1b - Injection</span>
                                  <span className="text-gray-400">{article.stage1b_reason}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                  <span className={article.stage2_passed === true ? 'text-green-400' : 'text-red-400'}>
                                    {article.stage2_passed === true ? 'PASS' : 'FAIL'}
                                  </span>
                                  <span className="text-gray-500 w-40 shrink-0">Stage 2 - Dedup</span>
                                  <span className="text-gray-400">{article.stage2_reason}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                  <span className="text-blue-400">SCORE</span>
                                  <span className="text-gray-500 w-40 shrink-0">Stage 3 - Significance</span>
                                  <span className="text-gray-400">{article.stage3_score}</span>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                  <span className={article.stage4_selected === true ? 'text-green-400' : 'text-gray-500'}>
                                    {article.stage4_selected === true ? 'SELECTED' : 'SKIPPED'}
                                  </span>
                                  <span className="text-gray-500 w-40 shrink-0">Stage 4 - Final</span>
                                  <span className="text-gray-400">
                                    {article.stage4_selected === true ? 'Final rank: #' + article.stage4_rank : 'Not in top selection'}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    )
                  })}

                  {filteredArticles.length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                      No articles match this filter.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-xs text-gray-600">
          GNI Transparency Engine - Explainable AI | Every funnel decision documented
        </div>
      </footer>
    </div>
  )
}
