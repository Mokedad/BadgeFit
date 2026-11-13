// Hayden, the coach bot (BadgeFit): off-white, a navy visor, big eyes and body language, no mouth.
// The design is docs/dev/BADGEFIT_HAYDEN_BOT.md. His line colour is the member's own and his gear
// is what they earned (lib/police/bot-look.js); a guest's Hayden is grey with no gear.
//   eyes: open | happy | wide | determined | closed | look
//   pose: idle | wave | cheer | listen | think | fist | rest
//   talking: the eyes pulse with his voice; head: only his head (small places: the bar, a card)
import { useMemo } from 'react'
import { useStore } from '../store/useStore.js'
import { DEMO } from '../lib/demo.js'
import { lineColour, earnedGear } from '../lib/police/bot-look.js'

const SHELL = '#eef0ec', SHADE = '#d3d8d4', EDGE = '#8f99aa', VISOR = '#0b1a36', VISOR2 = '#16294f', NAVY = '#16305c', GOLD = '#f2b81a'

export function botSvg({ eyes = 'open', pose = 'idle', gear = [], tilt = 0, line = GOLD, talking = false, head: headOnly = false, act = null } = {}) {
  if (act && ACTS[act]) { eyes = ACTS[act].eyes; tilt = ACTS[act].tilt || 0 }
  const g = new Set(gear)
  const eye = x => ({
    open: `<rect x="${x - 7}" y="74" width="14" height="24" rx="7" fill="${line}"/>`,
    look: `<rect x="${x - 3}" y="72" width="14" height="22" rx="7" fill="${line}"/>`,
    wide: `<rect x="${x - 9}" y="70" width="18" height="30" rx="9" fill="${line}"/>`,
    happy: `<path d="M${x - 9} 90 Q${x} 74 ${x + 9} 90" fill="none" stroke="${line}" stroke-width="6" stroke-linecap="round"/>`,
    determined: `<path d="M${x - 8} ${x < 100 ? 76 : 81} L${x + 8} ${x < 100 ? 81 : 76} L${x + 8} 96 Q${x} 101 ${x - 8} 96 Z" fill="${line}"/>`,
    closed: `<path d="M${x - 9} 86 Q${x} 92 ${x + 9} 86" fill="none" stroke="${line}" stroke-width="5" stroke-linecap="round"/>`,
  })[eyes] || ''
  const arm = (side, kind) => {
    const sx = side === 'l' ? 60 : 140, flip = side === 'l' ? 1 : -1
    const rot = { down: 14, up: 155, ear: 140, chin: 120, fist: 165, droop: 6, wave: 140 }[kind] * flip
    const lift = kind === 'down' || kind === 'droop' ? 0 : -6
    return `<g transform="translate(${side === 'l' ? -4 : 4} ${lift}) rotate(${rot} ${sx} 146)"><g${kind === 'wave' ? ' class="hb-wave"' : ''}>`
      + `<rect x="${sx - 11}" y="144" width="22" height="46" rx="11" fill="${SHELL}" stroke="${EDGE}" stroke-width="1.5"/>`
      + `<rect x="${sx - 11}" y="174" width="22" height="16" rx="8" fill="${SHADE}"/>`
      + (g.has('stripes') && side === 'l' ? `<path d="M${sx - 7} 154 l7 5 7-5 M${sx - 7} 161 l7 5 7-5" fill="none" stroke="${GOLD}" stroke-width="2.5" stroke-linejoin="round"/>` : '')
      + `</g></g>`
  }
  const low = k => k === 'down' || k === 'droop'
  const P = { idle: ['down', 'down', 0], wave: ['down', 'wave', -7], cheer: ['up', 'up', 0], listen: ['down', 'ear', 11],
    think: ['down', 'chin', -8], fist: ['down', 'fist', -4], rest: ['droop', 'droop', 9] }[pose] || ['down', 'down', 0]
  const body = headOnly ? '' : `
    <ellipse cx="100" cy="240" rx="${pose === 'rest' ? 44 : 34}" ry="6" fill="${EDGE}" opacity=".35"/>
    ${low(P[0]) ? arm('l', P[0]) : ''}
    <path d="M64 150 Q64 132 100 132 Q136 132 136 150 L132 194 Q126 220 100 222 Q74 220 68 194 Z" fill="${SHELL}" stroke="${EDGE}" stroke-width="1.5"/>
    <path d="M71 198 Q100 212 129 198 Q125 218 100 220 Q75 218 71 198 Z" fill="${SHADE}"/>
    <circle cx="100" cy="166" r="11" fill="none" stroke="${line}" stroke-width="3"/>
    ${g.has('badge') ? `<path d="M100 155 l10 4v7c0 7-4.5 11-10 13-5.5-2-10-6-10-13v-7z" fill="${GOLD}"/><path d="M100 160 l1.8 3.6 4 .5-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.5z" fill="${VISOR}"/>` : ''}
    ${g.has('whistle') ? `<path d="M82 136 L96 154 M118 136 L104 154" stroke="${NAVY}" stroke-width="2"/><rect x="93" y="152" width="14" height="8" rx="4" fill="${NAVY}"/>` : ''}
    ${g.has('medal') ? `<path d="M78 140 L84 186 M92 138 L84 186" stroke="${NAVY}" stroke-width="3"/><circle cx="84" cy="192" r="8" fill="${GOLD}" stroke="#b8860b" stroke-width="1.5"/>` : ''}
    ${low(P[1]) ? arm('r', P[1]) : ''}`
  const head = `
    <g transform="rotate(${tilt || P[2]} 100 90)">
      <line x1="140" y1="58" x2="148" y2="34" stroke="${EDGE}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="148" cy="32" r="5" fill="${line}"/>
      <rect x="30" y="66" width="16" height="44" rx="8" fill="${VISOR2}"/><rect x="154" y="66" width="16" height="44" rx="8" fill="${VISOR2}"/>
      <rect x="33" y="82" width="10" height="12" rx="3" fill="${line}" opacity=".85"/><rect x="157" y="82" width="10" height="12" rx="3" fill="${line}" opacity=".85"/>
      <rect x="40" y="38" width="120" height="100" rx="44" fill="${SHELL}" stroke="${EDGE}" stroke-width="1.5"/>
      <path d="M48 114 Q100 140 152 114 Q150 134 100 138 Q50 134 48 114 Z" fill="${SHADE}"/>
      <rect x="54" y="56" width="92" height="62" rx="28" fill="${VISOR}"/>
      <path d="M66 64 Q80 59 94 61" fill="none" stroke="${VISOR2}" stroke-width="5" stroke-linecap="round"/>
      <g class="hb-eyes${talking ? ' hb-talk' : ''}" style="filter:drop-shadow(0 0 5px ${line}99)">${eye(82)}${eye(118)}</g>
      ${g.has('cap') ? `<path d="M46 60 Q100 4 154 60 Z" fill="${VISOR}"/><path d="M40 60 Q100 72 160 60 L160 66 Q100 80 40 66 Z" fill="${NAVY}" stroke="${GOLD}" stroke-width="1.5"/><path d="M100 24 l3 6 6.5.9-4.7 4.6 1.1 6.5L100 39l-5.9 3 1.1-6.5-4.7-4.6 6.5-.9z" fill="${GOLD}"/>` : ''}
      ${g.has('headband') && !g.has('cap') ? `<rect x="42" y="47" width="116" height="9" rx="4" fill="${GOLD}"/>` : ''}
      ${g.has('bolt') ? `<path d="M168 34 l-10 16 h8 l-4 14 12-18 h-8 l6-12z" fill="${GOLD}"/>` : ''}
    </g>`
  if (act && ACTS[act]) return actSvg(act, { head, line })
  const front = headOnly ? '' : (low(P[0]) ? '' : arm('l', P[0])) + (low(P[1]) ? '' : arm('r', P[1]))
  return `<svg viewBox="${headOnly ? '24 18 156 126' : '0 0 200 250'}" xmlns="http://www.w3.org/2000/svg"><g class="${headOnly ? '' : 'hb-float'}">${body}${head}${front}</g></svg>`
}

// Hayden doing the exercise (lib/police/bot-emotes.js exerciseAct): run, bench, squat, curl,
// pull (pulldown, row) and press, each a short loop. Drawn front on, except the bench (side on).
const ACTS = { run: { eyes: 'determined', tilt: 6 }, bench: { eyes: 'determined' }, squat: { eyes: 'determined' },
  curl: { eyes: 'determined' }, pull: { eyes: 'determined' }, press: { eyes: 'determined' } }
const TORSO = `<path d="M64 150 Q64 132 100 132 Q136 132 136 150 L132 194 Q126 220 100 222 Q74 220 68 194 Z" fill="${SHELL}" stroke="${EDGE}" stroke-width="1.5"/>
  <path d="M71 198 Q100 212 129 198 Q125 218 100 220 Q75 218 71 198 Z" fill="${SHADE}"/>`
const limb = (sx, rot, len = 46, cls = '', hand = '') => `<g class="${cls}" style="transform-origin:${sx}px 146px"><g transform="rotate(${rot} ${sx} 146)">`
  + `<rect x="${sx - 11}" y="144" width="22" height="${len}" rx="11" fill="${SHELL}" stroke="${EDGE}" stroke-width="1.5"/>`
  + `<rect x="${sx - 11}" y="${144 + len - 16}" width="22" height="16" rx="8" fill="${SHADE}"/>${hand.replace(/HY/g, 144 + len - 4)}</g></g>`
const BELL = `<rect x="-20" y="-5" width="40" height="10" rx="3" fill="${NAVY}"/><rect x="-24" y="-11" width="8" height="22" rx="2" fill="${NAVY}"/><rect x="16" y="-11" width="8" height="22" rx="2" fill="${NAVY}"/>`
const dumbbell = sx => `<g transform="translate(${sx} HY) rotate(90)">${BELL}</g>`
const barAt = (y, cable) => (cable ? `<line x1="100" y1="0" x2="100" y2="${y}" stroke="${EDGE}" stroke-width="2"/>` : '')
  + `<rect x="12" y="${y - 3}" width="176" height="6" rx="3" fill="${NAVY}"/><rect x="14" y="${y - 18}" width="12" height="36" rx="3" fill="${NAVY}"/><rect x="174" y="${y - 18}" width="12" height="36" rx="3" fill="${NAVY}"/>`
function actSvg(act, { head, line }) {
  const ring = `<circle cx="100" cy="166" r="11" fill="none" stroke="${line}" stroke-width="3"/>`
  const shadow = w => `<ellipse cx="100" cy="240" rx="${w}" ry="6" fill="${EDGE}" opacity=".35"/>`
  const svg = (inner, cls) => `<svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg"><g class="hb-act hb-${cls}">${inner}</g></svg>`
  if (act === 'run') return svg(`${shadow(30)}
    <path d="M14 158h30M6 176h34M16 194h26" stroke="${EDGE}" stroke-width="4" stroke-linecap="round" opacity=".5"/>
    <g class="hb-runbob" style="transform-origin:100px 150px">
      ${limb(60, 30, 46, 'hb-swing-a')}${TORSO}${ring}${head}${limb(140, -30, 46, 'hb-swing-b')}</g>`, 'run')
  if (act === 'bench') return svg(`
    <rect x="70" y="190" width="124" height="10" rx="4" fill="${NAVY}"/><rect x="84" y="198" width="8" height="40" fill="${NAVY}"/><rect x="176" y="198" width="8" height="40" fill="${NAVY}"/>
    <ellipse cx="132" cy="240" rx="56" ry="5" fill="${EDGE}" opacity=".35"/>
    <g transform="translate(0 4) rotate(-90 100 150)">${TORSO}${ring}${head}</g>
    <g class="hb-benchpress" style="transform-origin:116px 110px">
      <rect x="106" y="66" width="20" height="50" rx="10" fill="${SHELL}" stroke="${EDGE}" stroke-width="1.5"/>
      <rect x="106" y="66" width="20" height="16" rx="8" fill="${SHADE}"/>
      <circle cx="116" cy="60" r="20" fill="${NAVY}"/><circle cx="116" cy="60" r="5" fill="${EDGE}"/></g>`, 'bench')
  if (act === 'curl') return svg(`${shadow(34)}${TORSO}${ring}${head}
    ${limb(60, 8, 46, 'hb-curl-a', dumbbell(60))}${limb(140, -8, 46, 'hb-curl-b', dumbbell(140))}`, 'curl')
  const y = act === 'squat' ? 128 : 78
  const len = act === 'squat' ? 26 : 68
  const rot = act === 'squat' ? 150 : 168
  return svg(`${shadow(34)}<g class="hb-${act}-move">${barAt(y, act === 'pull')}${limb(60, rot, len)}${limb(140, -rot, len)}${TORSO}${ring}${head}</g>`, act)
}

/** This member's look: their line colour and earned gear (a guest: grey, none). */
export function useBotLook() {
  const user = useStore(s => s.user)
  const S = useStore(s => s.S)
  const guest = !user && !DEMO
  return useMemo(() => ({ line: lineColour(guest ? null : user?.id || 'demo'), gear: earnedGear(S, { guest }) }), [user?.id, guest, S.workouts, S.police]) // eslint-disable-line react-hooks/exhaustive-deps
}

export default function HaydenBot({ size = 120, className = '', label = '', ...look }) {
  const mine = useBotLook()
  const svg = botSvg({ line: mine.line, gear: mine.gear, ...look })
  return <span className={'hb ' + className} style={{ width: size }} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}
    dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Hayden's head, small, wherever his mark goes (cards, bubbles, the bar). */
export const HaydenMark = ({ size = 26, ...look }) => <HaydenBot size={size} head {...look} className="hb-mark" />
