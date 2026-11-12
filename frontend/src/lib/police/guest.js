// BadgeFit guests (no account): the way from anywhere in the app to the sign-in screen, and back
// out of a guest session. A guest's training lives on this device only; signing in keeps it
// (the account takes it over) and logging out just returns to the first screen.
import { useStore } from '../../store/useStore.js'
import { MOBILE } from '../mobile.js'
import { DEMO } from '../demo.js'
import { setBrand } from '../i18n-core.js'
import { BRAND } from './brand.js'

const APP = MOBILE && import.meta.env?.MODE !== 'test'
/** The BadgeFit phone app (it has no pairing codes: every way to an account is the sign-in screen). */
export const BADGEFIT_APP = APP
// The app's name in every translated line: the phone app from the start, the website once its
// server says it is BadgeFit's.
if (APP) setBrand(BRAND.name)
useStore.subscribe?.(st => { if (st.config?.passkeys === false) setBrand(BRAND.name) })

/** Whether this is a BadgeFit app (the phone app, the BadgeFit server, or a BadgeFit profile). */
export const isBadgeFit = (S, config) => APP || config?.passkeys === false || !!S?.police?.level

/** Whether the person using a BadgeFit app has no account. */
export const isBadgeFitGuest = (S, config, user) => !user && !DEMO && isBadgeFit(S, config)

/** Opens the sign-in screen: the phone app's first screen, or the website's sign-in page. */
export function toSignIn(nav) {
  if (MOBILE) useStore.setState({ needsMobileOnboarding: true, permSteps: false })
  else useStore.getState().setGuest(false)
  nav?.('/home')
}
