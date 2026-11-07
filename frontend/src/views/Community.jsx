// The BadgeFit community (api/community.js): one feed for everyone on this server. People post
// wins, questions and their journey; others cheer and reply. "You become who you hang out with."
// English only, like the rest of BadgeFit. Text is shown as text (React escapes it, nothing is
// rendered as HTML or as a link).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { BRAND } from '../lib/police/brand.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, TextArea, TextField } from '../components/ui.jsx'
import '../police.css'

const TOPICS = [
  { value: 'win', label: 'Win', emoji: '🏆' },
  { value: 'question', label: 'Question', emoji: '❓' },
  { value: 'journey', label: 'Journey', emoji: '🛣️' },
  { value: 'motivation', label: 'Fire', emoji: '🔥' },
]
const topicOf = id => TOPICS.find(x => x.value === id) || TOPICS[2]
const toast = m => useUI.getState().toast(m)

function ago(at) {
  const s = Math.max(0, (Date.now() - at) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return Math.floor(s / 60) + ' min ago'
  if (s < 86400) return Math.floor(s / 3600) + ' h ago'
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago'
  return new Date(at).toLocaleDateString()
}

function Post({ p, onChange, admin }) {
  const [reply, setReply] = useState('')
  const [open, setOpen] = useState(false)
  const call = async (path, body) => {
    try { return await api(path, { method: 'POST', body: JSON.stringify(body) }) }
    catch (e) { toast(e.message || 'Something went wrong'); return null }
  }
  const cheer = async () => { const r = await call('/api/community/cheer', { id: p.id }); if (r) onChange({ ...p, cheers: r.cheers, cheered: r.cheered }) }
  const send = async () => {
    if (!reply.trim()) return
    const r = await call('/api/community/reply', { id: p.id, text: reply })
    if (r) { onChange({ ...p, replies: [...p.replies, r.reply] }); setReply('') }
  }
  const del = async replyId => {
    if (!window.confirm(replyId ? 'Delete this reply?' : 'Delete this post?')) return
    const r = await call('/api/community/delete', { id: p.id, replyId })
    if (r) onChange(replyId ? { ...p, replies: p.replies.filter(x => x.id !== replyId) } : null)
  }
  const reportIt = async () => {
    if (!window.confirm('Report this post as abusive or spam?')) return
    const r = await call('/api/community/report', { id: p.id })
    if (r) { toast('Thanks. We will take a look.'); if (r.hidden) onChange(null) }
  }
  const t = topicOf(p.topic)
  return <article className={'card cm-post' + (p.hidden ? ' cm-hidden' : '')}>
    <header className="cm-h">
      <span className="cm-av" aria-hidden="true">{(p.name || '?').charAt(0).toUpperCase()}</span>
      <div className="cm-who"><b>{p.name}</b><span>{t.emoji} {t.label} · {ago(p.at)}</span></div>
      {(p.mine || admin) && <button className="cm-x" aria-label="Delete post" onClick={() => del()}>✕</button>}
    </header>
    {p.hidden && <p className="pf-warn">Hidden after reports{admin ? ` (${p.reports})` : ''}.{admin && <button className="pf-link" onClick={async () => { const r = await call('/api/community/delete', { id: p.id, restore: true }); if (r) onChange({ ...p, hidden: false }) }}> Show it again</button>}</p>}
    <p className="cm-text">{p.text}</p>
    <div className="cm-acts">
      <button className={'cm-cheer' + (p.cheered ? ' on' : '')} onClick={cheer} aria-pressed={p.cheered}>💪 {p.cheers || ''} {p.cheered ? 'Cheered' : 'Cheer'}</button>
      <button onClick={() => setOpen(!open)}>💬 {p.replies.length || ''} Reply</button>
      {!p.mine && <button className="cm-rep" onClick={reportIt}>Report</button>}
    </div>
    {(open || p.replies.length > 0) && <div className="cm-replies">
      {p.replies.map(r => <div key={r.id} className="cm-reply">
        <b>{r.name}</b> <span className="pf-sub">{ago(r.at)}</span>
        {(r.mine || p.mine || admin) && <button className="cm-x" aria-label="Delete reply" onClick={() => del(r.id)}>✕</button>}
        <p>{r.text}</p>
      </div>)}
      {open && <div className="mb-row">
        <TextField value={reply} maxLength={500} placeholder="Encourage, answer, share…" onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        <Button size="sm" variant="primary" onClick={send}>Send</Button>
      </div>}
    </div>}
  </article>
}

export default function Community() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('win')
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(true)

  const load = async before => {
    try {
      const r = await api('/api/community' + (before ? '?before=' + before : ''))
      setPosts(prev => (before ? [...(prev || []), ...r.posts] : r.posts))
      setMore(r.posts.length >= 50)
      setError(null)
    } catch (e) { setError(e.status === 401 ? 'signin' : e.message || 'offline') }
  }
  useEffect(() => { if (user) load() }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const post = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const r = await api('/api/community/post', { method: 'POST', body: JSON.stringify({ text, topic }) })
      setPosts(prev => [r.post, ...(prev || [])])
      setText('')
      toast('Posted. Thanks for showing up for the team.')
    } catch (e) { toast(e.message || 'Could not post') }
    finally { setBusy(false) }
  }

  const update = (id, next) => setPosts(prev => (next ? prev.map(p => (p.id === id ? next : p)) : prev.filter(p => p.id !== id)))

  return <div className="narrow pf cm">
    <div className="hdr">
      <button className="iconbtn" data-back="/police" onClick={() => nav('/police')} aria-label="Back"><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, margin: '0 12px', minWidth: 0 }}><h1>Community</h1>
        <div className="sub">You become who you train with.</div></div>
    </div>

    {!user || error === 'signin'
      ? <div className="card"><h3>Sign in to join the {BRAND.name} community</h3><p className="pf-sub">The community lives on the server, so you need an account there. Sign in, or pair this phone with your server in Settings.</p></div>
      : <>
        <div className="card cm-new">
          <Segmented options={TOPICS.map(x => ({ value: x.value, label: x.emoji + ' ' + x.label }))} value={topic} onChange={setTopic} />
          <TextArea value={text} maxLength={1000} rows={3} placeholder={topic === 'win' ? 'Hit a PB? Passed a standard? Tell us!' : topic === 'question' ? 'Ask the people who have been there' : topic === 'motivation' ? 'Something that keeps you going' : 'Where you are on the road to the badge'} onChange={e => setText(e.target.value)} />
          <div className="row between"><span className="pf-sub">{text.length}/1000 · Be kind. No personal details.</span>
            <Button variant="primary" size="sm" disabled={!text.trim() || busy} onClick={post}>Post</Button></div>
        </div>
        {error && error !== 'signin' && <p className="pf-warn pf-pad">Could not load the feed: {error}</p>}
        {posts === null && !error && <p className="pf-sub pf-pad">Loading…</p>}
        {posts?.length === 0 && <div className="card"><h3>Be the first</h3><p className="pf-sub">Share where you are starting from. Someone reading it is starting too.</p></div>}
        {posts?.map(p => <Post key={p.id} p={p} admin={!!user?.admin} onChange={next => update(p.id, next)} />)}
        {posts?.length > 0 && more && <Button onClick={() => load(posts.at(-1).at)}>Older posts</Button>}
      </>}
    <p className="pf-sub pf-pad">Posts are visible to everyone on this server. Report anything abusive: three reports hide a post until an admin checks it.</p>
  </div>
}
