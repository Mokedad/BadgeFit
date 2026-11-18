// BadgeFit's pace sound on a run (components/PaceButton.jsx): a soft tick to step on, so each part
// of a run is run at the pace it asks for. Hayden sets the beat for each part from its effort zone
// (lib/police/runs.js): calm in the warm-up, quicker when "Go" starts, a touch slower to recover.
// The member can nudge it faster or slower for every part at once. Walking parts and the
// cool-down have no beat, except a brisk walk, which gets a walking one. Pure.

export const PACE_DEFAULTS = Object.freeze({ on: false, sound: 'tick', every: 1, adj: 0, vol: 0.35 })
export const ADJ_MAX = 20
export const ADJ_STEP = 2
// Steps a minute by effort zone. A guide, not a rule: the member's nudge moves all of them.
export const ZONE_SPM = Object.freeze({ z1: 160, z2: 164, z3: 168, z4: 172, z5: 176 })
export const WALK_SPM = 116

export const clampAdj = v => Math.max(-ADJ_MAX, Math.min(ADJ_MAX, Math.round(Number(v) || 0)))
export const clampVol = v => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0.05, Math.min(1, Math.round(n * 100) / 100)) : PACE_DEFAULTS.vol
}

/** The member's pace settings (S.police.pace), cleaned and with the defaults filled in. */
export function paceSettings(P) {
  const p = { ...PACE_DEFAULTS, ...(P?.pace || {}) }
  return {
    on: p.on === true,
    sound: p.sound === 'buzz' ? 'buzz' : 'tick',
    every: p.every === 2 ? 2 : 1,
    adj: clampAdj(p.adj),
    vol: clampVol(p.vol),
  }
}

const isWalk = seg => /walk/i.test(seg?.label || '')

/** Steps a minute for one part of a run, or null for a part with no beat. */
export function beatFor(seg, adj = 0) {
  if (!seg || seg.kind === 'cool') return null
  if (isWalk(seg)) return seg.kind === 'work' ? WALK_SPM + clampAdj(adj) : null
  const base = ZONE_SPM[seg.effort] ?? ZONE_SPM.z2
  return Math.max(100, Math.min(200, base - (seg.kind === 'rest' ? 2 : 0) + clampAdj(adj)))
}

/** Seconds between two ticks: one each step, or one every second step (the same foot each time). */
export const tickGap = (spm, every = 1) => (spm > 0 ? (60 / spm) * (every === 2 ? 2 : 1) : null)

/** The line under the clock while the pace sound is on. */
export function paceLine(seg, { adj = 0, every = 1, sound = 'tick' } = {}) {
  const spm = beatFor(seg, adj)
  if (!spm) return seg?.kind === 'cool' ? 'No beat on the cool-down' : 'No beat while you walk'
  const word = sound === 'buzz' ? 'buzz' : 'tick'
  return every === 2 ? `Same foot each ${word} · ${spm} a minute` : `Step on each ${word} · ${spm} a minute`
}
