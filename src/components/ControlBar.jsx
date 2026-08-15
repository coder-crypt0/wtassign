import React from 'react'

const ACCENTS = ['#5eead4', '#818cf8', '#f472b6', '#fbbf24', '#38bdf8', '#a3e635']

function Toggle({ label, value, onChange, hint }) {
  return (
    <button
      className={`toggle${value ? ' is-on' : ''}`}
      role="switch"
      aria-checked={value}
      title={hint}
      onClick={() => onChange(!value)}
    >
      <span className="toggle-dot" />
      {label}
    </button>
  )
}

/** Dynamic UI controls: format, motion, layout, theme accent, master pause. */
export default function ControlBar({ settings, update }) {
  return (
    <div className="controls">
      <div className="control-group">
        <span className="control-label">Format</span>
        <div className="segmented">
          <button
            className={`seg${settings.use24Hour ? '' : ' is-on'}`}
            onClick={() => update({ use24Hour: false })}
          >
            12 h
          </button>
          <button
            className={`seg${settings.use24Hour ? ' is-on' : ''}`}
            onClick={() => update({ use24Hour: true })}
          >
            24 h
          </button>
        </div>
      </div>

      <div className="control-group">
        <span className="control-label">Density</span>
        <div className="segmented">
          <button
            className={`seg${settings.density === 'compact' ? ' is-on' : ''}`}
            onClick={() => update({ density: 'compact' })}
          >
            Compact
          </button>
          <button
            className={`seg${settings.density === 'comfortable' ? ' is-on' : ''}`}
            onClick={() => update({ density: 'comfortable' })}
          >
            Comfortable
          </button>
        </div>
      </div>

      <div className="control-group">
        <span className="control-label">Display</span>
        <div className="toggle-row">
          <Toggle
            label="Analog"
            value={settings.showAnalog}
            onChange={(v) => update({ showAnalog: v })}
            hint="Show analog faces on the city cards"
          />
          <Toggle
            label="Seconds"
            value={settings.showSeconds}
            onChange={(v) => update({ showSeconds: v })}
            hint="Show the second hand and digits"
          />
          <Toggle
            label="Sweep"
            value={settings.smoothSweep}
            onChange={(v) => update({ smoothSweep: v })}
            hint="Smooth 60fps sweep vs. a once-per-second tick"
          />
          <Toggle
            label="Mute"
            value={settings.muted}
            onChange={(v) => update({ muted: v })}
            hint="Silence the alarm tone"
          />
          <Toggle
            label={settings.paused ? 'Paused' : 'Running'}
            value={settings.paused}
            onChange={(v) => update({ paused: v })}
            hint="Freeze every clock on the board"
          />
        </div>
      </div>

      <div className="control-group">
        <span className="control-label">Accent</span>
        <div className="swatches">
          {ACCENTS.map((c) => (
            <button
              key={c}
              className={`swatch${settings.accent === c ? ' is-on' : ''}`}
              style={{ '--swatch': c }}
              aria-label={`Accent ${c}`}
              onClick={() => update({ accent: c })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
