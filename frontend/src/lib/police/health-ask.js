// BadgeFit phone app: Apple Health (or Health Connect on Android) is offered once, when the plan
// is set up, instead of waiting to be found in Settings. Yes switches it on (the phone then asks
// its own permission question); no is remembered, and Settings still has the switch.
import { BADGEFIT_APP } from './guest.js'

const KEY = 'badgefit_health_asked'

/** Asks once. `confirm` is sheets.jsx confirmSheet; `toast` shows a line. */
export async function offerHealthOnce(S, confirm, toast) {
  if (!BADGEFIT_APP || !S?.police?.start) return false
  try { if (localStorage.getItem(KEY)) return false; localStorage.setItem(KEY, '1') } catch { return false }
  const { healthStatus, loadHealth, enableHealth } = await import('../health-sync.js')
  const st = await healthStatus()
  if (st.status !== 'available' || (await loadHealth())?.on) return false
  const name = st.platform === 'android' ? 'Health Connect' : 'Apple Health'
  confirm({
    title: `Save your training to ${name}?`,
    message: `Your runs, walks and gym sessions go into ${name}, next to your steps and heart rate. You can switch it off in Settings.`,
    confirmText: 'Yes, switch it on', cancelText: 'Not now',
    onConfirm: async () => {
      const r = await enableHealth(S).catch(() => ({ ok: false }))
      toast?.(r.ok ? `${name} is on` : r.reason === 'denied' ? `No problem. Switch it on any time in Settings.` : `${name} could not be switched on. Try in Settings.`)
    },
  })
  return true
}
