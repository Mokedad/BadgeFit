// My Hayden (BadgeFit): your Hayden in the colour you pick, wearing the gear he has earned, and
// every piece of gear with what earns it and how close the next one is (lib/police/my-hayden.js).
// Gear is earned by training and passing things, never sold (docs/dev/BADGEFIT_HAYDEN_BOT.md).
// A guest's Hayden is grey with no gear: signing up gives him a colour.
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { DEMO } from '../lib/demo.js'
import HaydenBot from '../components/HaydenBot.jsx'
import Icon from '../components/Icon.jsx'
import { gearShelf } from '../lib/police/my-hayden.js'
import { LINE_COLOURS, myColour } from '../lib/police/bot-look.js'
import { toSignIn } from '../lib/police/guest.js'
import { shareWin } from '../components/ShareWin.jsx'
import '../police.css'

const COLOUR_NAMES = {
  '#f2b81a': 'Gold', '#3fb6ff': 'Sky blue', '#2fd39a': 'Green', '#ff7a59': 'Coral', '#b48cff': 'Purple',
  '#ff5fa2': 'Pink', '#20c3c3': 'Teal', '#9ccc3c': 'Lime', '#ff9f1c': 'Orange', '#6c8cff': 'Blue',
}
const list = names => (names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1])

export default function MyHayden() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const guest = !user && !DEMO
  const shelf = gearShelf(S, { guest })
  const colour = myColour(S.police, guest ? null : user?.id || 'demo')
  const earned = shelf.filter(i => i.earned)
  const pick = c => useStore.getState().update(s => { s.police = { ...(s.police || {}), botColour: c } })
  const showOff = () => shareWin(`My Hayden has earned the ${list(earned.map(i => i.name.toLowerCase()))}. Training for the badge.`)
  return <div className="narrow mh">
    <div className="mh-top">
      <button type="button" className="iconbtn" aria-label="Back" data-back="/police?tab=more" onClick={() => nav(-1)}><Icon name="chevronLeft" /></button>
      <h1>My Hayden</h1>
      {!guest && earned.length > 0 ? <button type="button" className="mh-pill" onClick={showOff}><Icon name="share" /> Show off</button> : <span />}
    </div>
    <div className="mh-hero"><HaydenBot size={150} eyes="happy" pose={earned.length ? 'cheer' : 'wave'} /></div>
    {guest
      ? <div className="mh-guest">
        <b>Make Hayden yours</b>
        <p>Sign up free: pick his colour, and he earns gear as you train.</p>
        <button type="button" className="mh-pill gold" onClick={() => toSignIn(nav)}>Sign up free</button>
      </div>
      : <div className="mh-cols" role="radiogroup" aria-label="Hayden's colour">
        {LINE_COLOURS.map(c => <button key={c} type="button" role="radio" aria-checked={c === colour} aria-label={COLOUR_NAMES[c] || c}
          className={'mh-col' + (c === colour ? ' on' : '')} onClick={() => pick(c)}><HaydenBot size={34} head line={c} gear={[]} /></button>)}
      </div>}
    <h2 className="mh-h">Gear <small>{earned.length} of {shelf.length}</small></h2>
    <div className="mh-gear">
      {shelf.map(i => <div key={i.id} className={'mh-gi' + (i.earned ? ' got' : i.next ? ' next' : ' off')}>
        <div className="mh-gi-b"><HaydenBot size={60} gear={i.gear} line={colour} /></div>
        <b>{i.name}{i.earned && <Icon name="check" />}</b>
        <small>{i.earned ? i.how : i.progress ? i.progress.text : i.how}</small>
        {i.progress && <span className="mh-bar" aria-hidden="true"><i style={{ width: i.progress.pct + '%' }} /></span>}
      </div>)}
    </div>
    <p className="mh-note">Gear is earned, never sold. Everyone sees it on your Hayden.</p>
  </div>
}
