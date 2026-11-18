// The BadgeFit community (api/community.js): one place for applicants, recruits and graduates.
// The people you follow stand at the top as their bots (a green ring while they train); under
// them one feed, Everyone or Following. A post is words, today's session, or a plan to follow.
// Text is shown as text (React escapes it; nothing is rendered as HTML or as a link). No photos.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { BRAND } from '../lib/police/brand.js'
import { toSignIn } from '../lib/police/guest.js'
import { todayISO } from '../lib/format.js'
import { todayNow } from '../lib/police/today-now.js'
import { gymRoutines } from '../lib/police/train-types.js'
import { STAGES, AREAS, stageLabel, stageOf, planFromRoutines, planLine, addFollowedPlan, ago } from '../lib/police/community.js'
import { cheerLine, cheerSym } from '../lib/police/cheer-text.js'
import Icon from '../components/Icon.jsx'
import { Thumb } from '../components/Media.jsx'
import { EXIDX } from '../lib/exercises.js'
import { exerciseNameFor } from '../lib/i18n.js'
import { Button, Segmented, TextArea, TextField } from '../components/ui.jsx'
import { useNearby, toggleFollow, sendCheer, hideBot } from '../components/NearbyBots.jsx'
import { botSvg } from '../components/HaydenBot.jsx'
import { myColour, earnedGear } from '../lib/police/bot-look.js'
import { confirmSheet, menuSheet } from '../sheets.jsx'
import '../police.css'

const toast = m => useUI.getState().toast(m)
const sheet = render => useUI.getState().openSheet(render)
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) })
const call = async (path, body) => { try { return await post(path, body) } catch (e) { toast(e?.message || 'Something went wrong'); return null } }
const Bot = ({ b, size = 52, eyes = 'open' }) => <span className="cm-bot" style={{ width: size, height: size }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ line: b?.colour, gear: b?.gear || [], head: true, eyes }) }} />

/** Today's session, as shared: a small card, done or still to do. */
function SessionCard({ s }) {
  return <div className={'cm-session' + (s.done ? ' done' : '')}>
    <span className="cm-session-i" aria-hidden="true"><Icon name="figureRun" /></span>
    <span className="cm-session-m"><b>{s.title}</b><small>{s.done ? 'Session done' : 'Today, still to do'}{s.minutes ? ` · ${s.minutes} min` : ''}</small></span>
    {s.done && <span className="cm-session-ok"><Icon name="check" /></span>}
  </div>
}

/** A shared plan: its name, one line about it, and Follow plan (its sessions join your workouts). */
function PlanCard({ p, onChange }) {
  const follow = async () => {
    const r = await call('/api/community/plan-follow', { id: p.id })
    if (!r) return
    if (r.planFollowed) { useStore.getState().update(s => { addFollowedPlan(s, p.id, r.plan) }); toast('Added to your workouts. Pick it from Start.') }
    onChange({ ...p, planFollowers: r.planFollowers, planFollowed: r.planFollowed })
  }
  // The exercises as pictures: a row of the first ones, and the whole plan, session by session.
  const [open, setOpen] = useState(false)
  const exs = [...new Map(p.plan.routines.flatMap(r => r.ex).map(e => [e.id, EXIDX[e.id]]).filter(([, x]) => x)).values()]
  const amount = e => (e.mode === 'time' ? `${e.sets} × ${e.sec} s` : e.mode === 'cardio' ? `${e.min} min` : `${e.sets} × ${e.repsMin && e.repsMin !== e.reps ? e.repsMin + '-' : ''}${e.reps}`)
  return <div className="cm-plan">
    <div className="cm-plan-top">
      <div className="cm-plan-m"><b>{p.plan.name}{p.planNew && <span className="cm-new">New</span>}</b><small>{planLine(p.plan, p.planFollowers)}</small></div>
      {!p.mine && <button type="button" className={'cm-follow' + (p.planFollowed ? ' on' : '')} onClick={follow}>{p.planFollowed ? 'Following' : 'Follow plan'}</button>}
    </div>
    {!open && exs.length > 0 && <button type="button" className="cm-plan-pics" onClick={() => setOpen(true)} aria-label="See the whole plan">
      {exs.slice(0, 5).map(x => <Thumb key={x.id} ex={x} />)}
      {exs.length > 5 && <span className="cm-plan-more">+{exs.length - 5}</span>}
    </button>}
    {open && <div className="cm-plan-days">
      {p.plan.routines.map((r, i) => <div key={i} className="cm-plan-day">
        <b>{r.name}</b>
        {r.ex.map((e, j) => { const x = EXIDX[e.id]; return x ? <div key={j} className="cm-plan-ex"><Thumb ex={x} /><span>{exerciseNameFor(x)}</span><small>{amount(e)}</small></div> : null })}
      </div>)}
      <button type="button" className="pf-link" onClick={() => setOpen(false)}>Show less</button>
    </div>}
  </div>
}

function Post({ p, onChange, admin, openPerson }) {
  const [reply, setReply] = useState('')
  const [open, setOpen] = useState(false)
  const cheer = async () => { const r = await call('/api/community/cheer', { id: p.id }); if (r) onChange({ ...p, cheers: r.cheers, cheered: r.cheered }) }
  const send = async () => {
    if (!reply.trim()) return
    const r = await call('/api/community/reply', { id: p.id, text: reply })
    if (r) { onChange({ ...p, replies: [...p.replies, r.reply] }); setReply('') }
  }
  const best = async replyId => { const r = await call('/api/community/best', { id: p.id, replyId }); if (r) onChange({ ...p, replies: p.replies.map(x => ({ ...x, best: x.id === r.best })) }) }
  const del = replyId => confirmSheet({ title: replyId ? 'Delete this reply?' : 'Delete this post?', confirmText: 'Delete', danger: true, onConfirm: async () => {
    const r = await call('/api/community/delete', { id: p.id, replyId })
    if (r) onChange(replyId ? { ...p, replies: p.replies.filter(x => x.id !== replyId) } : null)
  } })
  const more = () => menuSheet({ title: p.name, sections: [{ items: [
    ...(p.mine || admin ? [{ icon: 'trash', danger: true, label: 'Delete post', onClick: () => del() }] : []),
    ...(!p.mine ? [
      { icon: 'warning', label: 'Report this post', onClick: async () => { const r = await call('/api/community/report', { id: p.id }); if (r) { toast('Thanks. We will take a look.'); if (r.hidden) onChange(null) } } },
      ...(p.who ? [{ icon: 'xmark', danger: true, label: `Block ${p.name}`, onClick: () => hideBot({ id: p.who, name: p.name }) }] : []),
    ] : []),
  ] }, { items: [{ icon: 'xmark', label: 'Cancel', onClick: () => {} }] }] })
  const top = p.replies.find(r => r.best)
  return <article className={'card cm-post' + (p.hidden ? ' cm-hidden' : '')}>
    <header className="cm-h">
      <button type="button" className="cm-person" disabled={!p.who} onClick={() => openPerson(p.who)} aria-label={p.who ? `${p.name}: their page` : p.name}>
        <span className="cm-av" aria-hidden="true">{(p.name || '?').charAt(0).toUpperCase()}</span>
        <span className="cm-who"><b>{p.name}</b><span>{[stageLabel(p.stage), ago(p.at)].filter(Boolean).join(' · ')}</span></span>
      </button>
      <button className="cm-x" aria-label="More" onClick={more}><Icon name="more" /></button>
    </header>
    {p.hidden && <p className="pf-warn">Hidden after reports{admin ? ` (${p.reports})` : ''}.{admin && <button className="pf-link" onClick={async () => { const r = await call('/api/community/delete', { id: p.id, restore: true }); if (r) onChange({ ...p, hidden: false }) }}> Show it again</button>}</p>}
    {p.text && <p className="cm-text">{p.text}</p>}
    {p.session && <SessionCard s={p.session} />}
    {p.plan && <PlanCard p={p} onChange={onChange} />}
    {top && !open && <div className="cm-best"><p>{top.text}</p><small>{top.name}</small></div>}
    <div className="cm-acts">
      <button className={'cm-cheer' + (p.cheered ? ' on' : '')} onClick={cheer} aria-pressed={p.cheered} disabled={p.mine} aria-label={p.mine ? `${p.cheers || 0} cheers` : p.cheered ? 'Cheered' : 'Cheer'}><Icon name="sparkles" /> {p.cheers || (p.mine ? 0 : 'Cheer')}</button>
      <button onClick={() => setOpen(!open)} aria-label="Replies"><Icon name="chat" /> {p.replies.length || 'Reply'}</button>
    </div>
    {open && <div className="cm-replies">
      {p.replies.map(r => <div key={r.id} className={'cm-reply' + (r.best ? ' best' : '')}>
        {r.who ? <button type="button" className="cm-rname" onClick={() => openPerson(r.who)}>{r.name}</button> : <b>{r.name}</b>} <span className="pf-sub">{ago(r.at)}{r.best ? ' · Best answer' : ''}</span>
        <p>{r.text}</p>
        <div className="cm-reply-a">
          {p.mine && !r.mine && <button type="button" onClick={() => best(r.id)}>{r.best ? 'Unmark' : 'This helped'}</button>}
          {(r.mine || p.mine || admin) && <button type="button" onClick={() => del(r.id)}>Delete</button>}
        </div>
      </div>)}
      <div className="mb-row">
        <TextField value={reply} maxLength={500} placeholder="Encourage, answer, share" onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        <Button size="sm" variant="primary" onClick={send}>Send</Button>
      </div>
    </div>}
  </article>
}

/** One member's page: bot, stage, the numbers, today, shared plans, and posts five at a time. */
function PersonSheet({ id, close }) {
  const [d, setD] = useState(null)
  const [shown, setShown] = useState(1)
  const load = () => api('/api/community/person?id=' + encodeURIComponent(id)).then(setD).catch(() => setD({ error: true }))
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="pf-sub">Loading</p>
  if (d.error) return <p className="pf-sub">Could not open their page right now.</p>
  const b = d.person
  const plans = d.posts.filter(p => p.plan), posts = d.posts.filter(p => !p.plan)
  const tile = (n, label) => <div className="nb-tile"><b>{n}</b><span>{label}</span></div>
  const setPost = next => setD(x => ({ ...x, posts: x.posts.map(p => (p.id === next.id ? next : p)) }))
  return <div className="cm-page">
    <button type="button" className="cm-x cm-page-x" aria-label="More" onClick={() => menuSheet({ title: b.name, sections: [{ items: [{ icon: 'xmark', danger: true, label: `Block ${b.name}`, onClick: () => { close(); hideBot(b) } }] }, { items: [{ icon: 'xmark', label: 'Cancel', onClick: () => {} }] }] })}><Icon name="more" /></button>
    <span className="nb-card-bot" dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], eyes: 'happy', pose: 'wave', act: b.training ? 'run' : null }) }} />
    <h3>{b.name}</h3>
    <p className="pf-sub">{[b.training ? 'Training now' : stageLabel(b.stage), `following ${b.following}`, `${b.followers} ${b.followers === 1 ? 'follower' : 'followers'}`].filter(Boolean).join(' · ')}</p>
    <div className="cm-page-acts">
      <button className="pf-go" onClick={() => sendCheer(b, 'love')}><Icon name="sparkles" /> Cheer</button>
      <button className="btn" onClick={async () => { const on = await toggleFollow(b); setD(x => ({ ...x, person: { ...x.person, followed: on, followers: x.person.followers + (on === b.followed ? 0 : on ? 1 : -1) } })) }}>{b.followed ? 'Following' : b.followsYou ? 'Follow back' : 'Follow'}</button>
    </div>
    {b.today && <SessionCard s={b.today} />}
    {b.stats && <div className="nb-tiles">{tile(b.stats.week, 'this week')}{tile(b.stats.ready + '%', 'PCT ready')}{tile(b.stats.streak, b.stats.streak === 1 ? 'week in a row' : 'weeks in a row')}</div>}
    {plans.length > 0 && <><div className="menu-sec">Shared plans</div>{plans.map(p => <PlanCard key={p.id} p={p} onChange={setPost} />)}</>}
    {posts.length > 0 && <><div className="menu-sec">Posts</div>
      {posts.slice(0, shown).map(p => <div key={p.id} className="cm-mini">{p.text && <p>{p.text}</p>}{p.session && <SessionCard s={p.session} />}<small>{p.cheers} cheers · {p.replies.length} replies · {ago(p.at)}</small></div>)}
      {posts.length > shown && <button type="button" className="pf-link" onClick={() => setShown(n => n + 5)}>Show more posts</button>}</>}
  </div>
}
export const openPerson = id => id && sheet(close => <PersonSheet id={id} close={close} />)

/** The bell: every cheer, reply and follow lately, newest first, each with Follow back. */
function BellSheet({ close }) {
  const [list, setList] = useState(null)
  useEffect(() => { api('/api/cheers/history').then(r => setList(r?.cheers || [])).catch(() => setList([])) }, [])
  const back = async c => { const on = await toggleFollow({ id: c.who, name: c.from, followed: false }); if (on) setList(l => l.map(x => (x.who === c.who ? { ...x, followed: true } : x))) }
  // Blocked by mistake? They are listed here to unblock (then follow again from their page).
  const [blocked, setBlocked] = useState(null)
  const showBlocked = () => api('/api/nearby/hidden').then(r => setBlocked(r?.people || [])).catch(() => setBlocked([]))
  const unblock = async b => { if (await call('/api/nearby/unhide', { id: b.id })) { setBlocked(l => l.filter(x => x.id !== b.id)); toast(`${b.name} unblocked. Follow them again from their page.`) } }
  return <div className="cm-bell">
    <h3>Your bell</h3>
    {list == null ? <p className="pf-sub">Loading</p> : !list.length ? <p className="pf-sub">Cheers, replies and new followers show up here.</p>
      : list.map(c => <div key={c.id} className="cm-bell-row">
        <button type="button" className="cm-bell-m" onClick={() => { if (c.who) { close(); openPerson(c.who) } }}>
          <Bot b={c} size={38} eyes="happy" />
          <span><b>{cheerSym(c.kind)} {cheerLine(c)}</b><small>{ago(c.at)}</small></span>
        </button>
        {c.who && !c.followed && <button type="button" className="cm-follow" onClick={() => back(c)}>Follow back</button>}
      </div>)}
    {blocked == null ? <button type="button" className="pf-link cm-blocked-l" onClick={showBlocked}>People you blocked</button>
      : <div className="cm-blocked"><div className="menu-sec">People you blocked</div>
        {!blocked.length ? <p className="pf-sub">Nobody.</p> : blocked.map(b => <div key={b.id} className="cm-bell-row">
          <span className="cm-bell-m"><Bot b={b} size={34} /><span><b>{b.name}</b></span></span>
          <button type="button" className="cm-follow" onClick={() => unblock(b)}>Unblock</button>
        </div>)}</div>}
  </div>
}

/** Making a post: today's session, a question, a win, or a plan of your own to share. */
function Compose({ close, onPosted }) {
  const S = useStore(s => s.S)
  const P = S.police || {}
  const [kind, setKind] = useState(null)
  const [text, setText] = useState('')
  const [area, setArea] = useState('pct')
  const [picked, setPicked] = useState([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const now = todayNow(S, todayISO())
  const routines = gymRoutines(S, todayISO())
  const setStage = id => useStore.getState().update(s => { s.police = { ...(s.police || {}), stage: id } })
  const send = async () => {
    const body = { text, stage: stageOf(P), topic: kind === 'question' ? 'question' : kind === 'win' ? 'win' : 'journey' }
    if (kind === 'question') body.area = area
    if (kind === 'session') body.session = { title: now.name, minutes: now.minutes || 0, done: !!now.done }
    if (kind === 'plan') body.plan = planFromRoutines(routines.filter(r => picked.includes(r.id)), name || undefined, P.level)
    setBusy(true)
    const r = await call('/api/community/post', body)
    setBusy(false)
    if (r) { onPosted(r.post); close(); toast('Posted') }
  }
  const ready = kind === 'session' ? !!now.name : kind === 'plan' ? picked.length > 0 : !!text.trim()
  const opt = (id, icon, title, sub, off) => <button key={id} type="button" className="cm-opt" disabled={off} onClick={() => setKind(id)}>
    <span className="cm-opt-i" aria-hidden="true"><Icon name={icon} /></span><span><b>{title}</b><small>{sub}</small></span></button>
  if (!kind) return <div className="cm-compose">
    <h3>Share with the community</h3>
    {opt('session', 'figureRun', "Today's session", now.name ? `${now.name} · ${now.done ? 'Done' : 'To do'}` : 'Rest day today', !now.name)}
    {opt('question', 'chat', 'Ask a question', 'Applicants, recruits and grads answer')}
    {opt('win', 'trophy', 'Share a win', 'A PB, a pass, a milestone')}
    {opt('plan', 'clipboard', 'Share a plan', routines.length ? 'A workout or program that works for you' : 'Add a workout of your own first', !routines.length)}
    <div className="menu-sec" style={{ marginTop: 12 }}>You are</div>
    <Segmented options={STAGES.map(s => ({ value: s.id, label: s.label }))} value={stageOf(P)} onChange={setStage} />
  </div>
  return <div className="cm-compose">
    <h3>{kind === 'session' ? "Today's session" : kind === 'question' ? 'Ask a question' : kind === 'win' ? 'Share a win' : 'Share a plan'}</h3>
    {kind === 'session' && <SessionCard s={{ title: now.name, minutes: now.minutes || 0, done: !!now.done }} />}
    {kind === 'question' && <Segmented options={AREAS.map(a => ({ value: a.id, label: a.label }))} value={area} onChange={setArea} />}
    {kind === 'plan' && <>
      <p className="pf-sub">Pick the sessions to share. Others get the exercises, sets and reps, not your weights.</p>
      <div className="list menu-list">{routines.map(r => { const on = picked.includes(r.id); return <div key={r.id} className="item menu-item" role="checkbox" aria-checked={on} tabIndex={0} onClick={() => setPicked(on ? picked.filter(x => x !== r.id) : [...picked, r.id].slice(0, 7))}>
        <div className="grow"><div className="tt">{r.name}</div><div className="ss">{r.ex.length} exercises</div></div>
        <span className={'menu-on' + (on ? ' is-on' : '')}><Icon name="check" /></span></div> })}</div>
      <TextField value={name} maxLength={60} placeholder="Name your plan" onChange={e => setName(e.target.value)} />
      <p className="pf-sub">Only share a plan you wrote or are free to share.</p>
    </>}
    <TextArea value={text} maxLength={1000} rows={3} placeholder={kind === 'question' ? 'Ask the people who have been there' : kind === 'win' ? 'Hit a PB? Passed a standard?' : 'Add a few words (optional)'} onChange={e => setText(e.target.value)} />
    <p className="pf-sub">Be kind. No personal details.</p>
    <div className="cm-compose-a"><Button onClick={() => setKind(null)}>Back</Button><Button variant="primary" disabled={!ready || busy} onClick={send}>Post</Button></div>
  </div>
}

/** A guest: how busy the community was this week (numbers only), and the way in. */
function GuestTeaser() {
  const nav = useNavigate()
  const [n, setN] = useState(null)
  useEffect(() => { api('/api/community/teaser').then(setN).catch(() => setN(null)) }, [])
  const tile = (v, label) => <div><b>{v}</b><span>{label}</span></div>
  return <div className="card cm-guest">
    <span className="cm-guest-bot" aria-hidden="true" dangerouslySetInnerHTML={{ __html: botSvg({ eyes: 'happy', pose: 'cheer' }) }} />
    <h3>Train with the community</h3>
    {n && n.posts > 0 && <div className="pf-strip pf-strip3">{tile(n.wins, n.wins === 1 ? 'win shared' : 'wins shared')}{tile(n.cheers, 'cheers given')}{tile(n.people, n.people === 1 ? 'recruit' : 'recruits')}</div>}
    <p className="pf-sub">{n && n.posts > 0 ? 'This week. ' : ''}Recruits share their wins and cheer each other on. Sign in to join them.</p>
    <Button variant="primary" onClick={() => toSignIn(nav)}>Sign in to join</Button>
  </div>
}

export default function Community() {
  const user = useStore(s => s.user)
  const S = useStore(s => s.S)
  const live = useNearby(s => s.live)
  const [people, setPeople] = useState([])
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(null)
  const [more, setMore] = useState(true)
  const [tab, setTab] = useState('all')
  const [area, setArea] = useState(null)
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')

  const load = async before => {
    try {
      const qs = [before && 'before=' + before, tab === 'following' && 'following=1', area && 'area=' + area, q.trim() && 'q=' + encodeURIComponent(q.trim())].filter(Boolean).join('&')
      const r = await api('/api/community' + (qs ? '?' + qs : ''))
      setPosts(prev => (before ? [...(prev || []), ...r.posts] : r.posts))
      setMore(r.posts.length >= 50)
      setError(null)
    } catch (e) { setError(e.status === 401 ? 'signin' : e.message || 'offline') }
  }
  // Typing in the search waits a moment before asking.
  useEffect(() => { if (!user) return; const t = setTimeout(() => { setPosts(null); load() }, q ? 350 : 0); return () => clearTimeout(t) }, [user, tab, area, q]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) api('/api/bell').then(r => setPeople(r?.people || [])).catch(() => {}) }, [user, live.length])
  const update = (id, next) => setPosts(prev => (next ? prev.map(p => (p.id === id ? next : p)) : prev.filter(p => p.id !== id)))
  const pickArea = () => menuSheet({ title: 'Show', sections: [{ items: [{ icon: 'list', label: 'Everything', on: !area, onClick: () => setArea(null) }, ...AREAS.map(a => ({ icon: 'dot', label: a.label, on: area === a.id, onClick: () => setArea(a.id) }))] }] })
  const me = { colour: myColour(S.police, user?.id), gear: earnedGear(S) }
  const training = id => live.some(l => l.id === id && l.training)

  return <div className="narrow pf cm">
    <div className="calm-head cm-head">
      <h1>Community</h1>
      {user && <div className="cm-tools">
        <button type="button" className={searching ? 'on' : ''} onClick={() => { setSearching(!searching); setQ('') }} aria-label="Search"><Icon name="magnifier" /></button>
        <button type="button" className={area ? 'on' : ''} onClick={pickArea} aria-label="Topics"><Icon name="slider" /></button>
        <button type="button" onClick={() => sheet(close => <BellSheet close={close} />)} aria-label="Your bell"><Icon name="bell" /></button>
      </div>}
    </div>
    {!user ? <GuestTeaser />
      : error === 'signin' ? <div className="card"><h3>Sign in to join the {BRAND.name} community</h3><p className="pf-sub">The community lives on the server, so you need an account there.</p></div>
        : <>
          {searching && <TextField value={q} autoFocus placeholder="Find a question, an answer or a person" onChange={e => setQ(e.target.value)} />}
          <div className="cm-bubbles" data-noswipe>
            <button type="button" className="cm-bub" onClick={() => sheet(close => <Compose close={close} onPosted={p => setPosts(prev => [p, ...(prev || [])])} />)} aria-label="Share with the community">
              <span className="cm-ring"><Bot b={me} eyes="happy" /><i className="cm-plus" aria-hidden="true">+</i></span><small>You</small></button>
            {people.map(b => { const on = b.training || training(b.id); return <button key={b.id} type="button" className={'cm-bub' + (on ? ' live' : '')} onClick={() => openPerson(b.id)} aria-label={`${b.name}${on ? ', training now' : ''}`}>
              <span className="cm-ring"><Bot b={b} eyes={on ? 'determined' : 'open'} /></span><small>{b.name}</small>{on && <em>Training</em>}</button> })}
          </div>
          <div className="cm-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Everyone</button>
            <button role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'on' : ''} onClick={() => setTab('following')}>Following</button>
            {area && <button className="cm-tab-area" onClick={() => setArea(null)}>{AREAS.find(a => a.id === area)?.label} <Icon name="xmark" /></button>}
          </div>
          {error && <p className="pf-warn pf-pad">Could not load the feed: {error}</p>}
          {posts === null && !error && <p className="pf-sub pf-pad">Loading</p>}
          {posts?.length === 0 && <div className="card"><h3>{q ? 'Nothing found' : tab === 'following' ? 'Nobody you follow has posted yet' : 'Be the first'}</h3><p className="pf-sub">{tab === 'following' && !q ? 'Tap a name in Everyone to follow someone.' : 'Tap You at the top to share where you are starting from.'}</p></div>}
          {posts?.map(p => <Post key={p.id} p={p} admin={!!user?.admin} openPerson={openPerson} onChange={next => update(p.id, next)} />)}
          {posts?.length > 0 && more && <Button onClick={() => load(posts.at(-1).at)}>Older posts</Button>}
        </>}
    <p className="pf-sub pf-pad">Posts are seen by everyone on {BRAND.name}. Not affiliated with any police service. Report anything abusive from a post's menu.</p>
  </div>
}
