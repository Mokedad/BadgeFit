// The community rules (BadgeFit): agreed once, before a first post or comment, as App Review asks
// of any app where people post for others to read. The server answers a post or a comment with 428
// until they are agreed (api/server.js needsRules); communityPost shows the rules then, and posts
// again once agreed. Swiping the sheet away is a no.
import { api } from '../lib/api.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

export const RULES = [
  ['heart', 'Be kind. Everyone here is working towards the same badge.'],
  ['chat', 'No swearing, slurs, bullying or anything sexual.'],
  ['shield', 'Keep it about training. No ads or spam.'],
  ['lock', 'Never post anyone’s personal details.'],
  ['flag', 'Report what breaks these. Breaking them gets posts removed and accounts closed.'],
]

function RulesSheet({ agree }) {
  return <div className="cr">
    <h3>Community rules</h3>
    <ul className="cr-list">{RULES.map(([icon, text]) => <li key={icon}><span className="cr-i" aria-hidden="true"><Icon name={icon} /></span>{text}</li>)}</ul>
    <button type="button" className="calm-go cr-go" onClick={agree}>I agree</button>
  </div>
}

/** Shows the rules; true once agreed (and saved on the server), false when swiped away. */
export function askRules() {
  return new Promise(resolve => {
    let settled = false
    const settle = ok => { if (settled) return; settled = true; stop(); resolve(ok) }
    const { id } = useUI.getState().openSheet(close => <RulesSheet agree={() => { settle(true); close() }} />)
    // Swiped away: the sheet is gone without an answer.
    const stop = useUI.subscribe(st => { if (!st.sheets.some(x => x.id === id)) settle(false) })
  }).then(async ok => {
    if (!ok) return false
    try { await api('/api/community/rules', { method: 'POST', body: '{}' }); return true } catch { return false }
  })
}

/** POSTs to the community; on a first post, asks for the rules and then posts again. */
export async function communityPost(path, body) {
  const send = () => api(path, { method: 'POST', body: JSON.stringify(body || {}) })
  try { return await send() } catch (e) {
    if (e?.status !== 428) throw e
    if (!(await askRules())) throw Object.assign(new Error('Agree to the community rules to post'), { status: 428 })
    return send()
  }
}
