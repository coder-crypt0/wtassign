import React, { useState } from 'react'
import { describeZone } from '../utils/time.js'
import { nextOccurrence } from '../hooks/useAlarms.js'

const REPEATS = [
  { id: 'once', label: 'Once' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekends', label: 'Weekends' }
]

function countdown(ms) {
  if (ms === null || ms < 0) return '—'
  const total = Math.floor(ms / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `in ${d}d ${h}h`
  if (h > 0) return `in ${h}h ${m}m`
  if (m > 0) return `in ${m}m ${s}s`
  return `in ${s}s`
}

export default function AlarmPanel({ zones, alarms, now, onAdd, onRemove, onToggle }) {
  const [time, setTime] = useState('07:30')
  const [zone, setZone] = useState(zones[0])
  const [label, setLabel] = useState('')
  const [repeat, setRepeat] = useState('daily')

  const submit = (e) => {
    e.preventDefault()
    if (!time) return
    onAdd({
      time,
      zone: zones.includes(zone) ? zone : zones[0],
      label: label.trim() || 'Alarm',
      repeat,
      enabled: true
    })
    setLabel('')
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Alarms</h2>
        <span className="badge">{alarms.filter((a) => a.enabled).length} active</span>
      </div>

      <form className="alarm-form" onSubmit={submit}>
        <div className="field-row">
          <label className="field">
            <span>Time</span>
            <input
              className="input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Zone</span>
            <select className="input" value={zone} onChange={(e) => setZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {describeZone(z).city}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Label</span>
          <input
            className="input"
            type="text"
            value={label}
            maxLength={40}
            placeholder="Stand-up with the Tokyo team"
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <div className="segmented" role="group" aria-label="Repeat">
          {REPEATS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`seg${repeat === r.id ? ' is-on' : ''}`}
              onClick={() => setRepeat(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button className="btn primary" type="submit">Set alarm</button>
      </form>

      <ul className="alarm-list">
        {alarms.map((a) => {
          const next = a.enabled ? nextOccurrence(a, now) : null
          return (
            <li key={a.id} className={`alarm-row${a.enabled ? '' : ' is-off'}`}>
              <div className="alarm-main">
                <strong>{a.time}</strong>
                <span className="alarm-label">{a.label}</span>
                <span className="alarm-meta">
                  {describeZone(a.zone).city} · {REPEATS.find((r) => r.id === a.repeat).label}
                  {a.enabled && ` · ${countdown(next === null ? null : next - now)}`}
                </span>
              </div>
              <div className="alarm-controls">
                <button
                  className={`switch${a.enabled ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={a.enabled}
                  aria-label={`Toggle ${a.label}`}
                  onClick={() => onToggle(a.id)}
                >
                  <span />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={`Delete ${a.label}`}
                  onClick={() => onRemove(a.id)}
                >
                  ×
                </button>
              </div>
            </li>
          )
        })}
        {alarms.length === 0 && <li className="empty">No alarms yet.</li>}
      </ul>
    </div>
  )
}
