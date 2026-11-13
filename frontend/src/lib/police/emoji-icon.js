// BadgeFit draws icons, not emoji: the old emoji kept in data (a tab's sym, a meal's emoji, a
// standard's icon, a focus item's icon) map onto the app's own line icons (components/Icon.jsx).
// An icon name passes through; anything unknown falls back to routines' glyphOf.
import { glyphOf } from '../glyphs.js'
import { ICON_NAMES } from '../../components/Icon.jsx'

const MAP = {
  '⭐': 'star', '📅': 'calendar', '🎯': 'target', '➕': 'plus', '🏃': 'figureRun', '🚶': 'figureRun',
  '🏋': 'dumbbell', '🍽': 'flame', '🩹': 'heart', '😴': 'moon', '🛌': 'moon', '🧪': 'clipboard',
  '🧖': 'flame', '🦵': 'legs', '🔔': 'bell', '🔊': 'speaker', '🎵': 'speaker', '📣': 'speaker',
  '⚖': 'scale', '📏': 'ruler', '📸': 'camera', '🥩': 'arm', '🔥': 'flame', '🍚': 'bolt', '🥑': 'dot',
  '💧': 'cloud', '🏆': 'trophy', '✅': 'checkCircle', '❌': 'xmark', '💪': 'arm', '✊': 'grip',
  '🧱': 'abs', '⬆': 'arrowUp', '🔀': 'shuffle', '🧘': 'stretch', '⚡': 'bolt', '🍳': 'sunrise',
  '🥗': 'sun', '🟢': 'figureRun', '🔴': 'flame', '🟠': 'bolt', '🟡': 'gauge', '🔵': 'heart',
  '🏠': 'house', '📈': 'chartLine', '💬': 'chat', '👥': 'person', '🎤': 'speaker', '🎧': 'speaker',
}

export function iconFor(v) {
  if (!v) return 'dot'
  if (ICON_NAMES.includes(v)) return v
  const base = [...String(v)].filter(c => c !== '️' && c !== '‍')[0]
  return MAP[base] || glyphOf(v)
}
