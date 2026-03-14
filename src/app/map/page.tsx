'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

interface ArticleEvent {
  id: string
  source: string
  bias: string
  title: string
  url: string
  summary: string
  stage3_score: number
  stage4_rank: number
  location_name: string
  lat: number
  lng: number
  created_at: string
}

export default function MapPage() {
  const [events, setEvents] = useState<ArticleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [daysFilter, setDaysFilter] = useState(7)

  useEffect(() => {
    fetch(`/api/article-events?days=${daysFilter}`)
      .then(r => r.json())
      .then(data => setEvents(data.events || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [daysFilter])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🌍 Geopolitical Event Map</h1>
            <p className="text-sm text-gray-400">
              {events.length} events from {daysFilter} days — each pin = 1 news article
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Days filter */}
            <div className="flex gap-2">
              {[1, 3, 7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => setDaysFilter(d)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    daysFilter === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <a href="/" className="text-sm text-blue-400 hover:text-blue-300">
              ← Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-2 flex gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
          Bearish / High Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
          Neutral / Medium Risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
          Bullish / Low Risk
        </span>
        <span className="text-gray-600">📰 = news article | Click pin for details + source link</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-96 text-gray-400">
          <p>Loading events...</p>
        </div>
      )}

      {!loading && (
        <MapView events={events} />
      )}

      <footer className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center text-xs text-gray-600">
          GNI Geopolitical Event Map | {events.length} articles plotted | Data updates 2x daily
        </div>
      </footer>
    </div>
  )
}