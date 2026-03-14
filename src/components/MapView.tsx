'use client'

import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'

interface ArticleEvent {
  id: string
  source: string
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

function getScoreColor(score: number): string {
  if (score >= 15) return '#dc2626'
  if (score >= 10) return '#ea580c'
  if (score >= 7)  return '#ca8a04'
  return '#16a34a'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createArticleIcon(L: any, score: number, rank: number) {
  const color = getScoreColor(score)
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        cursor: pointer;
      ">📰</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -25],
  })
}

export default function MapView({ events }: { events: ArticleEvent[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    import('leaflet').then(L => {
      import('react-leaflet').then(RL => {
        setMapComponents({ L, RL })
      })
    })
  }, [])

  if (!MapComponents) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>Loading map...</p>
      </div>
    )
  }

  const { RL, L } = MapComponents
  const { MapContainer, TileLayer, Marker, Popup } = RL

  const validEvents = events.filter(e => e.lat !== null && e.lng !== null)

  return (
    <>
      <style>{`
        .leaflet-tile {
          filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .leaflet-container { background: #1f2937; }
        .leaflet-popup-content-wrapper {
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          width: 300px;
          max-height: none !important;
          overflow: visible !important;
        }
        .leaflet-popup-tip { background: #111827; }
        .leaflet-popup-close-button { color: #9ca3af !important; }
        .leaflet-popup-content { 
          margin: 8px 12px; 
          overflow: visible !important;
          max-height: none !important;
        }
      `}</style>

      <MapContainer
        center={[25, 40]}
        zoom={2}
        style={{ height: 'calc(100vh - 140px)', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validEvents.map(event => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={createArticleIcon(L, event.stage3_score, event.stage4_rank)}
          >
            <Popup>
              <div style={{ fontFamily: 'Arial, sans-serif', padding: '4px' }}>
                {/* Rank + Source */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#60a5fa', fontWeight: 'bold' }}>
                    #{event.stage4_rank} — {event.source}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    Score: {event.stage3_score}
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f9fafb', marginBottom: '6px', lineHeight: '1.4' }}>
                  {event.title}
                </div>

                {/* Location */}
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                  📍 {event.location_name}
                </div>

                {/* Summary */}
                {event.summary && (
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', lineHeight: '1.5' }}>
                    {event.summary.length > 100 ? event.summary.substring(0, 100) + '...' : event.summary}
                  </div>
                )}

                {/* Source link */}
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      backgroundColor: '#1d4ed8',
                      color: 'white',
                      textAlign: 'center',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      marginBottom: '4px'
                    }}
                  >
                    Read Full Article →
                  </a>
                )}

                {/* Date */}
                <div style={{ fontSize: '10px', color: '#4b5563', textAlign: 'center' }}>
                  {new Date(event.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}