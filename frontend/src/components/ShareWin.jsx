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
