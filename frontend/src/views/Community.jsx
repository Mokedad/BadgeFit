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
import { toSignIn } from '../lib/police/guest.js'
import { GUEST_COLOUR as GREY } from '../lib/police/bot-look.js'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, TextArea, TextField } from '../components/ui.jsx'
import { useNearby, openBotCard } from '../components/NearbyBots.jsx'
import { botSvg } from '../components/HaydenBot.jsx'
import '../police.css'

/** The bell: everyone you follow (active ones first, a green dot), and the bots nearby now. */
function Bell() {
  const [people, setPeople] = useState(null)
  const near = useNearby(s => s.near)
  const on = useStore(s => !!s.S.police?.nearbyOn)
  const load = () => api('/api/bell').then(r => setPeople(r?.people || [])).catch(() => setPeople([]))
  useEffect(() => { load() }, [])
  const row = (b, live) => <button key={b.id} type="button" className="nb-person" onClick={() => openBotCard(b, load)}>
    <span className="nb-svg" dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], head: true }) }} />
    <b>{b.name}</b>{live ? <span className="nb-dot" aria-label="Active now" /> : <small>away</small>}
  </button>
  const nearOnly = near.filter(b => !(people || []).some(p => p.id === b.id))
  // Nobody yet: one quiet line, not a whole card.
  if (people != null && !people.length && !nearOnly.length) return <p className="cm-bell-hint"><Icon name="bell" /> Tap a name to follow someone. They show up here, and you can cheer them any time.</p>
  return <div className="card">
    <h3><Icon name="bell" /> Your bell</h3>
    {people == null ? <p className="pf-sub">Loading</p>
      : <div className="nb-bell-list">
        {people.map(b => row(b, b.active))}
        {nearOnly.length > 0 && <p className="muted small" style={{ margin: '6px 0 0' }}>Nearby now</p>}
        {nearOnly.map(b => row(b, true))}
      </div>}
  </div>
}

const TOPICS = [
  { value: 'win', label: 'Win', icon: 'trophy' },
  { value: 'question', label: 'Question', icon: 'chat' },
  { value: 'journey', label: 'Journey', icon: 'map' },
  { value: 'motivation', label: 'Fire', icon: 'flame' },
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
  // Someone else's post: tap their name for their card, where you can follow or send a love.
  const card = who => who && openBotCard({ id: who.who, name: who.name, colour: GREY, gear: [], followed: false })
  return <article className={'card cm-post' + (p.hidden ? ' cm-hidden' : '')}>
    <header className="cm-h">
      <button type="button" className="cm-person" disabled={!p.who} onClick={() => card(p)} aria-label={p.who ? `${p.name}: follow or send a love` : p.name}>
        <span className="cm-av" aria-hidden="true">{(p.name || '?').charAt(0).toUpperCase()}</span>
        <span className="cm-who"><b>{p.name}</b><span><Icon name={t.icon} /> {t.label} · {ago(p.at)}</span></span>
      </button>
      {(p.mine || admin) && <button className="cm-x" aria-label="Delete post" onClick={() => del()}>✕</button>}
    </header>
    {p.hidden && <p className="pf-warn">Hidden after reports{admin ? ` (${p.reports})` : ''}.{admin && <button className="pf-link" onClick={async () => { const r = await call('/api/community/delete', { id: p.id, restore: true }); if (r) onChange({ ...p, hidden: false }) }}> Show it again</button>}</p>}
    <p className="cm-text">{p.text}</p>
    <div className="cm-acts">
      <button className={'cm-cheer' + (p.cheered ? ' on' : '')} onClick={cheer} aria-pressed={p.cheered} disabled={p.mine}><Icon name="sparkles" /> {p.mine ? `${p.cheers || 0} ${p.cheers === 1 ? 'cheer' : 'cheers'}` : p.cheered ? `Cheered${p.cheers > 1 ? ' · ' + p.cheers : ''}` : `Cheer${p.cheers ? ' · ' + p.cheers : ''}`}</button>
      <button onClick={() => setOpen(!open)}><Icon name="chat" /> {p.replies.length || ''} Reply</button>
      {!p.mine && <button className="cm-rep" onClick={reportIt}>Report</button>}
    </div>
    {(open || p.replies.length > 0) && <div className="cm-replies">
      {p.replies.map(r => <div key={r.id} className="cm-reply">
        {r.who ? <button type="button" className="cm-rname" onClick={() => card(r)}>{r.name}</button> : <b>{r.name}</b>} <span className="pf-sub">{ago(r.at)}</span>
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

/** A guest: how busy the crew was this week (numbers only), and the way in. */
function GuestTeaser() {
  const nav = useNavigate()
  const [n, setN] = useState(null)
  useEffect(() => { api('/api/community/teaser').then(setN).catch(() => setN(null)) }, [])
  const tile = (v, label) => <div><b>{v}</b><span>{label}</span></div>
  return <div className="card cm-guest">
    <span className="cm-guest-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ eyes: 'happy', pose: 'cheer' }) }} />
    <h3>Train with the crew</h3>
    {n && n.posts > 0 && <div className="pf-strip pf-strip3">{tile(n.wins, n.wins === 1 ? 'win shared' : 'wins shared')}{tile(n.cheers, 'cheers given')}{tile(n.people, n.people === 1 ? 'recruit' : 'recruits')}</div>}
    <p className="pf-sub">{n && n.posts > 0 ? 'This week. ' : ''}Recruits share their wins and cheer each other on. Sign in to join them.</p>
    <Button variant="primary" onClick={() => toSignIn(nav)}>Sign in to join</Button>
  </div>
}

export default function Community() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const testDate = useStore(s => s.S.police?.testDate || '')
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('win')
  const [busy, setBusy] = useState(false)
  const [more, setMore] = useState(true)
  const [writing, setWriting] = useState(false)
  // Everyone, or my crew: the people training for the same test date.
  const [crew, setCrew] = useState(false)

  const load = async before => {
    try {
      const q = [before && 'before=' + before, crew && testDate && 'crew=' + testDate].filter(Boolean).join('&')
      const r = await api('/api/community' + (q ? '?' + q : ''))
      setPosts(prev => (before ? [...(prev || []), ...r.posts] : r.posts))
      setMore(r.posts.length >= 50)
      setError(null)
    } catch (e) { setError(e.status === 401 ? 'signin' : e.message || 'offline') }
  }
  useEffect(() => { if (user) { setPosts(null); load() } }, [user, crew]) // eslint-disable-line react-hooks/exhaustive-deps

  const post = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      const r = await api('/api/community/post', { method: 'POST', body: JSON.stringify({ text, topic, ...(testDate && { crew: testDate }) }) })
      setPosts(prev => [r.post, ...(prev || [])])
      setText(''); setWriting(false)
      toast('Posted. Thanks for showing up for the team.')
    } catch (e) { toast(e.message || 'Could not post') }
    finally { setBusy(false) }
  }

  const update = (id, next) => setPosts(prev => (next ? prev.map(p => (p.id === id ? next : p)) : prev.filter(p => p.id !== id)))
  const crewName = testDate ? new Date(testDate + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''

  return <div className="narrow pf cm">
    <div className="calm-head">
      <button className="calm-back" data-back="/police?tab=more" onClick={() => nav('/police?tab=more')} aria-label="Back to More"><Icon name="chevronLeft" /></button>
      <h1>Community</h1>
    </div>

    {!user ? <GuestTeaser />
      : error === 'signin'
        ? <div className="card"><h3>Sign in to join the {BRAND.name} community</h3><p className="pf-sub">The community lives on the server, so you need an account there.</p></div>
        : <>
          <Bell />
          {testDate && <Segmented options={[{ value: 'all', label: 'Everyone' }, { value: 'crew', label: `My crew · ${crewName}` }]} value={crew ? 'crew' : 'all'} onChange={v => setCrew(v === 'crew')} />}
          {!writing
            ? <button type="button" className="card cm-write" onClick={() => setWriting(true)}><Icon name="plus" /> Share a win, a question or your journey</button>
            : <div className="card cm-new">
              <Segmented options={TOPICS.map(x => ({ value: x.value, label: x.label, icon: x.icon }))} value={topic} onChange={setTopic} />
              <TextArea value={text} maxLength={1000} rows={3} autoFocus placeholder={topic === 'win' ? 'Hit a PB? Passed a standard? Tell us!' : topic === 'question' ? 'Ask the people who have been there' : topic === 'motivation' ? 'Something that keeps you going' : 'Where you are on the road to the badge'} onChange={e => setText(e.target.value)} />
              <div className="row between"><span className="pf-sub">Be kind. No personal details.</span>
                <span className="row" style={{ gap: 8 }}><Button size="sm" onClick={() => { setWriting(false); setText('') }}>Cancel</Button><Button variant="primary" size="sm" disabled={!text.trim() || busy} onClick={post}>Post</Button></span></div>
            </div>}
          {error && <p className="pf-warn pf-pad">Could not load the feed: {error}</p>}
          {posts === null && !error && <p className="pf-sub pf-pad">Loading…</p>}
          {posts?.length === 0 && <div className="card"><h3>{crew ? 'Your crew is quiet so far' : 'Be the first'}</h3><p className="pf-sub">Share where you are starting from. Someone reading it is starting too.</p></div>}
          {posts?.map(p => <Post key={p.id} p={p} admin={!!user?.admin} onChange={next => update(p.id, next)} />)}
          {posts?.length > 0 && more && <Button onClick={() => load(posts.at(-1).at)}>Older posts</Button>}
        </>}
    <p className="pf-sub pf-pad">Posts are seen by everyone on {BRAND.name}. Report anything abusive: three reports hide a post until an admin checks it.</p>
  </div>
}
