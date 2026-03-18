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

interface LocationGroup {
  lat: number
  lng: number
  location_name: string
  articles: ArticleEvent[]
  maxScore: number
}

function getScoreColor(score: number): string {
  if (score >= 15) return '#dc2626'
  if (score >= 10) return '#ea580c'
  if (score >= 7)  return '#ca8a04'
  return '#16a34a'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLocationIcon(L: any, count: number, maxScore: number) {
  const color = getScoreColor(maxScore)
  const size = count > 1 ? 48 : 40
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${count > 1 ? '13px' : '14px'};
        font-weight: bold;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        cursor: pointer;
        position: relative;
      ">
        ${count > 1 ? count + ' 📰' : '📰'}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 5],
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

  // Group events by location (lat+lng key)
  const locationMap: Record<string, LocationGroup> = {}
  events.forEach(event => {
    if (event.lat === null || event.lng === null) return
    const key = `${event.lat.toFixed(4)}_${event.lng.toFixed(4)}`
    if (locationMap[key] === undefined) {
      locationMap[key] = {
        lat: event.lat,
        lng: event.lng,
        location_name: event.location_name,
        articles: [],
        maxScore: 0,
      }
    }
    locationMap[key].articles.push(event)
    if (event.stage3_score > locationMap[key].maxScore) {
      locationMap[key].maxScore = event.stage3_score
    }
  })

  const locationGroups = Object.values(locationMap)

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
          width: 320px;
        }
        .leaflet-popup-tip { background: #111827; }
        .leaflet-popup-close-button { color: #9ca3af !important; }
        .leaflet-popup-content { margin: 10px 12px; }
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

        {locationGroups.map((group, idx) => (
          <Marker
            key={idx}
            position={[group.lat, group.lng]}
            icon={createLocationIcon(L, group.articles.length, group.maxScore)}
          >
            <Popup>
              <div style={{ fontFamily: 'Arial, sans-serif' }}>

                {/* Location header */}
                <div style={{
                  fontWeight: 'bold', fontSize: '13px', color: '#60a5fa',
                  marginBottom: '8px', paddingBottom: '6px',
                  borderBottom: '1px solid #374151'
                }}>
                  📍 {group.location_name} — {group.articles.length} article{group.articles.length !== 1 ? 's' : ''}
                </div>

                {/* Article list */}
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {group.articles.map((article, i) => (
                    <div key={article.id} style={{
                      marginBottom: '10px',
                      paddingBottom: '10px',
                      borderBottom: i < group.articles.length - 1 ? '1px solid #1f2937' : 'none'
                    }}>
                      {/* Source + Score */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
                          {article.source}
                        </span>
                        <span style={{ fontSize: '10px', color: '#ca8a04' }}>
                          Score: {article.stage3_score}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{
                        fontSize: '12px', color: '#f9fafb', fontWeight: 'bold',
                        lineHeight: '1.4', marginBottom: '4px'
                      }}>
                        {article.title}
                      </div>

                      {/* Summary */}
                      {article.summary && (
                        <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.4', marginBottom: '6px' }}>
                          {article.summary.length > 80 ? article.summary.substring(0, 80) + '...' : article.summary}
                        </div>
                      )}

                      {/* Read button */}
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#1d4ed8',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                          }}
                        >
                          Read Article →
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Date */}
                <div style={{ fontSize: '10px', color: '#4b5563', textAlign: 'center', marginTop: '6px' }}>
                  {new Date(group.articles[0].created_at).toLocaleDateString('en-US', {
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
