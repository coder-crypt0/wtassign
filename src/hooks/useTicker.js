import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * One requestAnimationFrame loop drives the whole dashboard. Every clock
 * subscribes to the same store, so twenty cards cost one timer rather than
 * twenty, and the loop parks itself when nothing is listening or the tab is
 * hidden.
 */
function createTicker() {
  const listeners = new Set()
  let snapshot = Date.now()
  let frame = null
  let paused = false
  let frozenAt = null
  let precision = 'smooth' // 'smooth' (per frame) | 'coarse' (per second)
  let lastEmit = 0

  function emit() {
    for (const fn of listeners) fn()
  }

  function loop() {
    frame = requestAnimationFrame(loop)
    if (paused) return
    const now = Date.now()
    if (precision === 'coarse') {
      // Only publish when the wall-clock second actually rolls over.
      if (Math.floor(now / 1000) === Math.floor(lastEmit / 1000)) return
    }
    lastEmit = now
    snapshot = now
    emit()
  }

  function start() {
    if (frame === null && listeners.size > 0 && !document.hidden) {
      lastEmit = 0
      frame = requestAnimationFrame(loop)
    }
  }

  function stop() {
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop()
    else {
      // Catch up immediately so the clock is never wrong on return.
      snapshot = Date.now()
      emit()
      start()
    }
  })

  return {
    subscribe(fn) {
      listeners.add(fn)
      start()
      return () => {
        listeners.delete(fn)
        if (listeners.size === 0) stop()
      }
    },
    getSnapshot() {
      return paused ? frozenAt : snapshot
    },
    setPaused(value) {
      paused = value
      frozenAt = value ? Date.now() : null
      emit()
    },
    setPrecision(value) {
      precision = value
      lastEmit = 0
    }
  }
}

const ticker = createTicker()

/** Current epoch milliseconds, re-rendering the caller on every tick. */
export function useNow() {
  return useSyncExternalStore(ticker.subscribe, ticker.getSnapshot, ticker.getSnapshot)
}

// Truncating to the second means useSyncExternalStore sees an unchanged
// snapshot on most frames and skips the re-render entirely.
function getSecondSnapshot() {
  return Math.floor(ticker.getSnapshot() / 1000) * 1000
}

/**
 * Like useNow, but only re-renders when the wall-clock second rolls over.
 * Used by anything that doesn't need sub-second motion (shell, lists, alarms).
 */
export function useNowSecond() {
  return useSyncExternalStore(ticker.subscribe, getSecondSnapshot, getSecondSnapshot)
}

/** Wires the global ticker to the user's motion + pause preferences. */
export function useTickerControls({ paused, smoothSweep }) {
  useEffect(() => {
    ticker.setPaused(paused)
  }, [paused])

  useEffect(() => {
    ticker.setPrecision(smoothSweep ? 'smooth' : 'coarse')
  }, [smoothSweep])
}

/** Persisted state helper — settings survive a reload. */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : JSON.parse(raw)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage unavailable (private mode) — settings just won't persist */
    }
  }, [key, value])

  return [value, setValue]
}
