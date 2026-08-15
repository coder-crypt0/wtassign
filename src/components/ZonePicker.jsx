import React, { useMemo, useState } from 'react'
import { ZONE_CATALOG, getZonedParts, formatOffset } from '../utils/time.js'
import { useNowSecond } from '../hooks/useTicker.js'

/** Search-driven picker for adding cities to the board. */
export default function ZonePicker({ selected, onAdd }) {
  const [query, setQuery] = useState('')
  const now = useNowSecond()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ZONE_CATALOG.filter((z) => {
      if (selected.includes(z.id)) return false
      if (!q) return true
      return (
        z.city.toLowerCase().includes(q) ||
        z.country.toLowerCase().includes(q) ||
        z.id.toLowerCase().includes(q)
      )
    }).slice(0, 60)
  }, [query, selected])

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Time zones</h2>
        <span className="badge">{selected.length} on board</span>
      </div>

      <input
        className="input"
        type="search"
        value={query}
        placeholder="Search city, country or IANA zone…"
        aria-label="Search time zones"
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="zone-list">
        {results.map((z) => {
          const p = getZonedParts(new Date(now), z.id)
          return (
            <li key={z.id}>
              <button className="zone-row" onClick={() => onAdd(z.id)}>
                <span className="zone-city">
                  {z.city}
                  <small>{z.country}</small>
                </span>
                <span className="zone-time">
                  {String(p.hours).padStart(2, '0')}:{String(p.minutes).padStart(2, '0')}
                  <small>{formatOffset(p.offsetMinutes)}</small>
                </span>
                <span className="zone-add">+</span>
              </button>
            </li>
          )
        })}
        {results.length === 0 && <li className="empty">No matching zone.</li>}
      </ul>
    </div>
  )
}
