// BadgeFit: "Share to Community". After a win (a passed standard, a new best, a finished day), one tap
// posts it to the community feed (api/community.js), your followers get it on their bell, and the cheers start coming back (components/CheerBubble.jsx). The words are yours to
// change before it goes. Members only: guests have no account on the server.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { stageOf } from '../lib/police/community.js'
import { Button, TextArea } from './ui.jsx'
import HaydenBot from './HaydenBot.jsx'
import Icon from './Icon.jsx'
import { useTapHold } from './Reactions.jsx'

function ShareWinSheet({ close, text, topic }) {
  const [words, setWords] = useState(text)
  const [busy, setBusy] = useState(false)
  const post = async () => {
    if (!words.trim() || busy) return
    setBusy(true)
    try {
      await api('/api/community/post', { method: 'POST', body: JSON.stringify({ text: words, topic, stage: stageOf(useStore.getState().S.police) }) })
      close()
      useUI.getState().toast('Shared to Community. Your followers get it on their bell.')
    } catch (e) { useUI.getState().toast(e?.message || 'Could not share it right now') }
    finally { setBusy(false) }
  }
  return <div className="share-win">
    <div className="share-win-h"><HaydenBot size={56} eyes="happy" pose="cheer" /><h3>Share to Community?</h3></div>
    <p className="pf-sub">They will cheer you on. Change the words if you like.</p>
    <TextArea value={words} maxLength={1000} rows={3} onChange={e => setWords(e.target.value)} />
    <div className="share-win-acts">
      <Button variant="primary" onClick={post} disabled={!words.trim() || busy}>{busy ? 'Sharing…' : 'Share'}</Button>
      <Button onClick={close}>Not now</Button>
    </div>
  </div>
}

/** Offers to share `text` (a win by default). Does nothing for a guest. */
export function shareWin(text, topic = 'win') {
  if (!useStore.getState().user) return false
  useUI.getState().openSheet(close => <ShareWinSheet close={close} text={text} topic={topic} />)
  return true
}

/**
 * The end of a session: two round icons side by side. Community posts the win at once with the
 * words already written (no second sheet to fill in) and a toast to take it back; holding it opens
 * the words to change first. Share hands the picture card to the phone (Instagram, a chat).
 */
export function ShareIcons({ text, topic = 'win', onShare }) {
  const user = useStore(s => s.user)
  const [posted, setPosted] = useState(null)
  const [busy, setBusy] = useState(false)
  const post = async () => {
    if (busy) return
    if (posted) { useUI.getState().toast('Already on Community'); return }
    setBusy(true)
    try {
      const r = await api('/api/community/post', { method: 'POST', body: JSON.stringify({ text, topic, stage: stageOf(useStore.getState().S.police) }) })
      const id = r?.post?.id || true
      setPosted(id)
      useUI.getState().toast('Posted to Community', {
        action: 'Undo',
        onAction: async () => {
          try { if (typeof id === 'string') await api('/api/community/delete', { method: 'POST', body: JSON.stringify({ id }) }); setPosted(null) } catch { /* stays posted */ }
        },
      })
    } catch (e) { useUI.getState().toast(e?.message || 'Could not post it right now') }
    finally { setBusy(false) }
  }
  const press = useTapHold(post, () => { if (!posted) shareWin(text, topic) })
  return <div className="share-icons">
    {user && <button type="button" className={'share-ic' + (posted ? ' on' : '')} aria-label={posted ? 'Posted to Community' : 'Post to Community. Hold to change the words'} disabled={busy} {...press}>
      <span className="share-ic-c"><Icon name={posted ? 'check' : 'chat'} /></span><small>Community</small></button>}
    {onShare && <button type="button" className="share-ic" aria-label="Share" onClick={onShare}>
      <span className="share-ic-c"><Icon name="share" /></span><small>Share</small></button>}
  </div>
}
