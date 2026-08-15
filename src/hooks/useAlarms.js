import { useCallback, useEffect, useRef, useState } from 'react'
import { getZonedParts } from '../utils/time.js'

const WEEKEND = new Set(['Sat', 'Sun'])

function repeatAllows(repeat, weekday) {
  if (repeat === 'weekdays') return !WEEKEND.has(weekday)
  if (repeat === 'weekends') return WEEKEND.has(weekday)
  return true
}

/** Stable "which minute is this, in this zone" key used for dedupe. */
function minuteKey(parts) {
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hours}:${parts.minutes}`
}

/**
 * Next time this alarm should sound, in epoch ms. Uses the zone's current
 * offset, which is accurate except across the DST boundary itself.
 */
export function nextOccurrence(alarm, now) {
  const [hh, mm] = alarm.time.split(':').map(Number)
  const here = getZonedParts(new Date(now), alarm.zone)
  const base = Date.UTC(here.year, here.month - 1, here.day, hh, mm, 0)

  for (let i = 0; i < 14; i++) {
    const candidate = base + i * 86400000 - here.offsetMinutes * 60000
    if (candidate <= now) continue
    const weekday = getZonedParts(new Date(candidate), alarm.zone).weekday
    if (repeatAllows(alarm.repeat, weekday)) return candidate
  }
  return null
}

function beep(ctx, at, freq) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.28, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + 0.35)
}

/**
 * Owns the alarm list, evaluates it against every tick, and rings.
 * `now` is passed in so this shares the dashboard's single ticker.
 */
// Shipped on a fresh board so the panel demonstrates itself.
const SAMPLE_ALARMS = [
  {
    id: 'sample-tokyo',
    label: 'Stand-up with the Tokyo team',
    time: '09:30',
    zone: 'Asia/Tokyo',
    repeat: 'weekdays',
    enabled: true
  },
  {
    id: 'sample-nyse',
    label: 'NYSE opening bell',
    time: '09:30',
    zone: 'America/New_York',
    repeat: 'weekdays',
    enabled: true
  }
]

export function useAlarms(now, { muted, storageKey = 'chronosphere.alarms' }) {
  const [alarms, setAlarms] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : SAMPLE_ALARMS
    } catch {
      return SAMPLE_ALARMS
    }
  })
  const [ringing, setRinging] = useState(null)

  const firedRef = useRef(new Map()) // alarm id -> last minute key handled
  const audioRef = useRef(null)
  const loopRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(alarms))
    } catch {
      /* ignore */
    }
  }, [alarms, storageKey])

  // Evaluate every alarm against the current instant.
  useEffect(() => {
    if (ringing) return
    for (const alarm of alarms) {
      if (!alarm.enabled) continue
      const parts = getZonedParts(new Date(now), alarm.zone)
      const [hh, mm] = alarm.time.split(':').map(Number)
      if (parts.hours !== hh || parts.minutes !== mm) continue
      if (!repeatAllows(alarm.repeat, parts.weekday)) continue

      const key = minuteKey(parts)
      if (firedRef.current.get(alarm.id) === key) continue
      firedRef.current.set(alarm.id, key)

      setRinging({ ...alarm, firedAt: now })
      if (alarm.repeat === 'once') {
        setAlarms((list) =>
          list.map((a) => (a.id === alarm.id ? { ...a, enabled: false } : a))
        )
      }
      break
    }
  }, [now, alarms, ringing])

  // Ring tone: a short two-note chirp repeated while the alarm is active.
  useEffect(() => {
    if (!ringing || muted) return
    let ctx
    try {
      ctx = audioRef.current || new (window.AudioContext || window.webkitAudioContext)()
      audioRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()
    } catch {
      return
    }

    const chirp = () => {
      const t = ctx.currentTime
      beep(ctx, t, 880)
      beep(ctx, t + 0.4, 1174)
    }
    chirp()
    loopRef.current = setInterval(chirp, 1600)
    return () => clearInterval(loopRef.current)
  }, [ringing, muted])

  const addAlarm = useCallback((alarm) => {
    setAlarms((list) => [
      ...list,
      { ...alarm, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
    ])
  }, [])

  const removeAlarm = useCallback((id) => {
    setAlarms((list) => list.filter((a) => a.id !== id))
    firedRef.current.delete(id)
  }, [])

  const toggleAlarm = useCallback((id) => {
    setAlarms((list) =>
      list.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )
  }, [])

  const dismiss = useCallback(() => setRinging(null), [])

  const snooze = useCallback(
    (minutes = 5) => {
      if (!ringing) return
      const target = new Date(Date.now() + minutes * 60000)
      const p = getZonedParts(target, ringing.zone)
      const time = `${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')}`
      setAlarms((list) => [
        ...list,
        {
          id: `${Date.now()}-snooze`,
          label: `${ringing.label} (snoozed)`,
          time,
          zone: ringing.zone,
          repeat: 'once',
          enabled: true
        }
      ])
      setRinging(null)
    },
    [ringing]
  )

  return { alarms, ringing, addAlarm, removeAlarm, toggleAlarm, dismiss, snooze }
}
