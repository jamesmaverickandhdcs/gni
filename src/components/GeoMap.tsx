'use client'

import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'

interface Report {
  id: string
  title: string
  location_name: string
  lat: number | null
  lng: number | null
  sentiment: string
  risk_level: string
  created_at: string
  market_impact: string
}

function getRiskColor(risk: string): string {
  switch (risk?.toLowerCase()) {
    case 'critical': return '#dc2626'
    case 'high':     return '#ea580c'
    case 'medium':   return '#ca8a04'
    case 'low':      return '#16a34a'
    default:         return '#6b7280'
  }
}

function getRiskSymbol(risk: string): string {
  switch (risk?.toLowerCase()) {
    case 'critical': return '🔴'
    case 'high':     return '🟠'
    case 'medium':   return '🟡'
    case 'low':      return '🟢'
    default:         return '⚪'
  }
}

function getSentimentSymbol(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return '▼'
    case 'bullish': return '▲'
    default:        return '◆'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCustomIcon(L: any, risk: string, sentiment: string) {
  const color = getRiskColor(risk)
  const symbol = getSentimentSymbol(sentiment)
  
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        cursor: pointer;
      ">${symbol}</div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
  })
}

export default function GeoMap() {
  const [reports, setReports] = useState<Report[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => {
        const withCoords = (data.reports || []).filter(
          (r: Report) => r.lat !== null && r.lng !== null
        )
        setReports(withCoords)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    import('leaflet').then(L => {
      import('react-leaflet').then(RL => {
        setMapComponents({ L, RL })
      })
    })
  }, [])

  if (!MapComponents) {
    return (
      <div className="bg-gray-800 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    )
  }

  const { RL, L } = MapComponents
  const { MapContainer, TileLayer, Marker, Popup } = RL

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">🌍 Geopolitical Event Map</div>
          <div className="text-xs text-gray-600 mt-0.5">{reports.length} event{reports.length !== 1 ? 's' : ''} plotted</div>
        </div>
        {/* Legend */}
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span><span className="text-gray-400">Critical</span></span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span><span className="text-gray-400">High</span></span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span><span className="text-gray-400">Medium</span></span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span><span className="text-gray-400">Low</span></span>
        </div>
      </div>

      {/* Symbol legend */}
      <div className="px-4 py-2 border-b border-gray-700 flex gap-4 text-xs text-gray-500">
        <span>▼ Bearish market</span>
        <span>▲ Bullish market</span>
        <span>◆ Neutral</span>
      </div>

      <style>{`
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-container {
          background: #1f2937;
        }
        .leaflet-popup-content-wrapper {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
        }
        .leaflet-popup-tip {
          background: #111827;
        }
      `}</style>

      <MapContainer
        center={[25, 40]}
        zoom={2}
        style={{ height: '450px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map(report => (
          <Marker
            key={report.id}
            position={[report.lat!, report.lng!]}
            icon={createCustomIcon(L, report.risk_level, report.sentiment)}
          >
            <Popup>
              <div style={{ minWidth: '220px', fontFamily: 'Arial, sans-serif', padding: '4px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#f9fafb' }}>
                  {report.title}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px', color: '#9ca3af' }}>
                  📍 {report.location_name}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px', color: getRiskColor(report.risk_level) }}>
                  {getRiskSymbol(report.risk_level)} Risk: <strong>{report.risk_level}</strong>
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px', color: '#9ca3af' }}>
                  {getSentimentSymbol(report.sentiment)} Sentiment: <strong style={{color: report.sentiment === 'Bearish' ? '#ef4444' : report.sentiment === 'Bullish' ? '#22c55e' : '#eab308'}}>{report.sentiment}</strong>
                </div>
                {report.market_impact && (
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', borderTop: '1px solid #374151', paddingTop: '6px' }}>
                    {report.market_impact}
                  </div>
                )}
                <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>
                  {new Date(report.created_at).toLocaleDateString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}