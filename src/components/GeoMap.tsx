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

function getSentimentEmoji(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'bearish': return '🔴'
    case 'bullish': return '🟢'
    default:        return '🟡'
  }
}

export default function GeoMap() {
  const [reports, setReports] = useState<Report[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    // Fetch reports with coordinates
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => {
        const withCoords = (data || []).filter(
          (r: Report) => r.lat !== null && r.lng !== null
        )
        setReports(withCoords)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    // Dynamic import — fixes Next.js SSR window error
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

  const { RL } = MapComponents
  const { MapContainer, TileLayer, CircleMarker, Popup } = RL

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <div className="text-xs text-gray-500 uppercase tracking-wider">
          🌍 Geopolitical Event Map
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {reports.length} event{reports.length !== 1 ? 's' : ''} plotted
        </div>
      </div>

      <style>{`
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-container {
          background: #1f2937;
        }
      `}</style>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '400px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {reports.map(report => (
          <CircleMarker
            key={report.id}
            center={[report.lat!, report.lng!]}
            radius={10}
            pathOptions={{
              color: getRiskColor(report.risk_level),
              fillColor: getRiskColor(report.risk_level),
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px', fontFamily: 'Arial, sans-serif' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '13px' }}>
                  {report.title}
                </div>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>
                  📍 {report.location_name}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  {getSentimentEmoji(report.sentiment)} {report.sentiment}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  ⚠️ Risk: <strong>{report.risk_level}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {new Date(report.created_at).toLocaleDateString()}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}