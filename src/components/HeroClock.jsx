import React from 'react'
import AnalogClock from './AnalogClock.jsx'
import DigitalClock from './DigitalClock.jsx'
import { useNow } from '../hooks/useTicker.js'
import { getZonedParts, formatOffset, describeZone } from '../utils/time.js'

/** The large featured clock at the top of the dashboard. */
export default function HeroClock({ zoneId, settings }) {
  const now = useNow()
  const parts = getZonedParts(new Date(now), zoneId)
  const meta = describeZone(zoneId)

  const dayProgress = ((parts.hours * 3600 + parts.minutes * 60 + parts.seconds) / 86400) * 100

  return (
    <section className="hero" aria-label="Featured clock">
      <div className="hero-face">
        <AnalogClock
          parts={parts}
          size={236}
          smoothSweep={settings.smoothSweep}
          showSeconds={settings.showSeconds}
          accent={settings.accent}
          idSuffix="hero"
        />
      </div>

      <div className="hero-readout">
        <p className="hero-eyebrow">Featured city</p>
        <h2 className="hero-city">{meta.city}</h2>
        <DigitalClock
          parts={parts}
          use24Hour={settings.use24Hour}
          showSeconds={settings.showSeconds}
          size="xl"
        />
        <p className="hero-date">{parts.dateLabel}, {parts.year}</p>

        <div className="hero-meta">
          <span className="chip">{meta.country}</span>
          <span className="chip muted">{zoneId}</span>
          <span className="chip muted">{formatOffset(parts.offsetMinutes)}</span>
        </div>

        <div className="progress" title="Progress through the local day">
          <div className="progress-bar" style={{ width: `${dayProgress}%` }} />
        </div>
        <p className="hero-progress-label">{dayProgress.toFixed(2)}% of the day elapsed</p>
      </div>
    </section>
  )
}
