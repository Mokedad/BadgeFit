// Test day and the beep test from the Apple Watch's Now Playing or AirPods (lib/police/pocket.js
// pocketRemote): one press starts the clock, the next stops it (an AirPods click is a toggle).
import { useEffect, useRef } from 'react'
import { onPocketRemote } from '../lib/police/pocket.js'

/** A press on the Apple Watch's Now Playing or AirPods ('play', 'pause', 'toggle', 'next'). */
export function useRemote(fn) {
  const ref = useRef(fn); ref.current = fn
  useEffect(() => {
    let off = null, dead = false
    onPocketRemote(c => ref.current(c)).then(f => { if (dead) f(); else off = f })
    return () => { dead = true; off?.() }
  }, [])
}
