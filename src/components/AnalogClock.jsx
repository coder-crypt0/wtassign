import React, { memo, useMemo } from 'react'

// Tick marks never change, so build them once for the whole app.
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 5 === 0
  const angle = i * 6
  const rad = (angle - 90) * (Math.PI / 180)
  const outer = 46
  const inner = major ? 39 : 43
  return {
    i,
    major,
    x1: 50 + Math.cos(rad) * inner,
    y1: 50 + Math.sin(rad) * inner,
    x2: 50 + Math.cos(rad) * outer,
    y2: 50 + Math.sin(rad) * outer
  }
})

const NUMERALS = Array.from({ length: 12 }, (_, i) => {
  const n = i === 0 ? 12 : i
  const rad = (i * 30 - 90) * (Math.PI / 180)
  return { n, x: 50 + Math.cos(rad) * 32, y: 50 + Math.sin(rad) * 32 }
})

function AnalogClock({
  parts,
  size = 200,
  smoothSweep = true,
  showSeconds = true,
  showNumerals = true,
  accent = '#5eead4',
  idSuffix = 'main'
}) {
  const { hours, minutes, seconds, ms } = parts

  const secondValue = smoothSweep ? seconds + ms / 1000 : seconds
  const minuteValue = minutes + secondValue / 60
  const hourValue = (hours % 12) + minuteValue / 60

  const secondAngle = secondValue * 6
  const minuteAngle = minuteValue * 6
  const hourAngle = hourValue * 30

  const faceId = `face-${idSuffix}`
  const glowId = `glow-${idSuffix}`

  const ticks = useMemo(() => TICKS, [])

  return (
    <svg
      className="analog"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Analog clock showing ${hours}:${String(minutes).padStart(2, '0')}`}
    >
      <defs>
        <radialGradient id={faceId} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#1c2333" />
          <stop offset="70%" stopColor="#121724" />
          <stop offset="100%" stopColor="#0a0e17" />
        </radialGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="50" cy="50" r="48.5" fill={`url(#${faceId})`} stroke="rgba(255,255,255,0.09)" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={accent} strokeOpacity="0.16" strokeWidth="0.4" />

      {ticks.map((t) => (
        <line
          key={t.i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={t.major ? accent : 'rgba(226,232,240,0.32)'}
          strokeOpacity={t.major ? 0.85 : 1}
          strokeWidth={t.major ? 1.3 : 0.5}
          strokeLinecap="round"
        />
      ))}

      {showNumerals &&
        NUMERALS.map((p) => (
          <text
            key={p.n}
            x={p.x}
            y={p.y}
            className="analog-numeral"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {p.n}
          </text>
        ))}

      {/* Hands are rotated as a group so only a transform changes per frame. */}
      <g transform={`rotate(${hourAngle} 50 50)`}>
        <line x1="50" y1="56" x2="50" y2="27" stroke="#e2e8f0" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${minuteAngle} 50 50)`}>
        <line x1="50" y1="58" x2="50" y2="17" stroke="#f8fafc" strokeWidth="2.1" strokeLinecap="round" />
      </g>
      {showSeconds && (
        <g transform={`rotate(${secondAngle} 50 50)`} filter={`url(#${glowId})`}>
          <line x1="50" y1="62" x2="50" y2="13" stroke={accent} strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="50" cy="17" r="1.6" fill={accent} />
        </g>
      )}

      <circle cx="50" cy="50" r="2.4" fill="#0a0e17" stroke={accent} strokeWidth="1" />
    </svg>
  )
}

// Cards re-render every frame; memo keeps the diff cheap when nothing moved.
export default memo(AnalogClock)
