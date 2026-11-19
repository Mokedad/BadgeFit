// The BadgeFit community (api/community.js): one place for applicants, recruits and graduates.
// The people you follow stand at the top as their bots (a green ring while they train); under
// them one feed, Everyone or Following. A post is words, today's session, or a plan to follow.
// Text is shown as text (React escapes it; nothing is rendered as HTML or as a link). No photos.
import { useEffect, useRef, useState } from 'react'
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
import { useNearby, toggleFollow, hideBot } from '../components/NearbyBots.jsx'
import { botSvg } from '../components/HaydenBot.jsx'
import { myColour, earnedGear } from '../lib/police/bot-look.js'
import { confirmSheet, menuSheet } from '../sheets.jsx'
import { WeekStrip, shareWeekSheet } from '../components/ShareWeek.jsx'
import { ReactIcon, ReactBar, ReactSummary } from '../components/Reactions.jsx'
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

/** A hold (half a second) on a comment opens its menu; a right-click does too. */
function useHold(onHold) {
  const t = useRef(null), at = useRef(null)
  const clear = () => { clearTimeout(t.current); t.current = null }
  return {
    onPointerDown: e => { at.current = { x: e.clientX, y: e.clientY }; clear(); t.current = setTimeout(() => { t.current = null; try { navigator.vibrate?.(10) } catch { /* none */ } onHold() }, 500) },
    onPointerMove: e => { if (at.current && Math.hypot(e.clientX - at.current.x, e.clientY - at.current.y) > 10) clear() },
    onPointerUp: clear, onPointerCancel: clear, onPointerLeave: clear,
    onContextMenu: e => { e.preventDefault(); clear(); onHold() },
  }
}

/** One comment, the way Instagram shows it: name and words on one line, then time · Reply · Edit. */
function Comment({ r, p, admin, openPerson, onReply, onEdit, onDelete, onBest, onLike }) {
  const canDelete = r.mine || p.mine || admin
  const hold = useHold(() => menuSheet({ title: r.name, sections: [{ items: [
    { icon: 'chat', label: 'Reply', onClick: () => onReply(r) },
    ...(r.mine ? [{ icon: 'pencil', label: 'Edit', onClick: () => onEdit(r) }] : []),
    ...(p.mine && !r.mine ? [{ icon: 'check', label: r.best ? 'Unmark as helpful' : 'This helped', onClick: () => onBest(r.id) }] : []),
    ...(canDelete ? [{ icon: 'trash', danger: true, label: 'Delete', onClick: () => onDelete(r.id) }] : []),
  ] }, { items: [{ icon: 'xmark', label: 'Cancel', onClick: () => {} }] }] }))
  return <div className={'cm-reply' + (r.best ? ' best' : '')} {...hold}>
    <div className="cm-reply-m">
    <p>{r.who ? <button type="button" className="cm-rname" onClick={() => openPerson(r.who)}>{r.name}</button> : <b>{r.name}</b>} {r.text}</p>
    <div className="cm-reply-a">
      <span>{ago(r.at)}{r.edited ? ' · edited' : ''}{r.best ? ' · Helped' : ''}</span>
      <button type="button" onClick={() => onReply(r)}>Reply</button>
      {r.mine && <button type="button" onClick={() => onEdit(r)}>Edit</button>}
    </div>
    </div>
    <button type="button" className={'cm-like' + (r.liked ? ' on' : '')} aria-pressed={!!r.liked} aria-label={r.liked ? 'Unlike' : 'Like'} onClick={() => onLike(r)}>
      <Icon name="heart" />{r.likes ? <small>{r.likes}</small> : null}
    </button>
  </div>
}

function Post({ p, onChange, admin, openPerson, me }) {
  const [reply, setReply] = useState('')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const input = useRef(null)
  const [picking, setPicking] = useState(false)
  const reactWith = async kind => { setPicking(false); const r = await call('/api/community/react', { id: p.id, kind }); if (r) onChange({ ...p, reacts: r.reacts, cheers: r.cheers, myReact: r.myReact, cheered: r.cheered }) }
  // A heart on a comment shows at once; the server's count follows.
  const like = async c => {
    const flip = x => ({ ...x, liked: !c.liked, likes: Math.max(0, (c.likes || 0) + (c.liked ? -1 : 1)) })
    onChange({ ...p, replies: p.replies.map(x => (x.id === c.id ? flip(x) : x)) })
    const r = await call('/api/community/reply-like', { id: p.id, replyId: c.id })
    if (r) onChange({ ...p, replies: p.replies.map(x => (x.id === c.id ? { ...x, likes: r.likes, liked: r.liked } : x)) })
  }
  const send = async () => {
    if (!reply.trim()) return
    if (editing) {
      const r = await call('/api/community/reply-edit', { id: p.id, replyId: editing, text: reply })
      if (r) { onChange({ ...p, replies: p.replies.map(x => (x.id === editing ? { ...x, text: r.reply.text, edited: true } : x)) }); setReply(''); setEditing(null) }
      return
    }
    const r = await call('/api/community/reply', { id: p.id, text: reply })
    if (r) { onChange({ ...p, replies: [...p.replies, r.reply] }); setReply('') }
  }
  const focus = () => setTimeout(() => input.current?.focus?.(), 50)
  const onReply = r => { setOpen(true); setEditing(null); setReply(`@${r.name} `); focus() }
  const onEdit = r => { setOpen(true); setEditing(r.id); setReply(r.text); focus() }
  const best = async replyId => { const r = await call('/api/community/best', { id: p.id, replyId }); if (r) onChange({ ...p, replies: p.replies.map(x => ({ ...x, best: x.id === r.best })) }) }
  const del = replyId => confirmSheet({ title: replyId ? 'Delete this comment?' : 'Delete this post?', confirmText: 'Delete', danger: true, onConfirm: async () => {
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
  // Instagram's way: the last two comments under the post, "View all" for the rest.
  const shown = open ? p.replies : p.replies.slice(-2)
  const one = r => <Comment key={r.id} r={r} p={p} admin={admin} openPerson={openPerson} onReply={onReply} onEdit={onEdit} onDelete={del} onBest={best} onLike={like} />
  return <article className={'card cm-post' + (p.hidden ? ' cm-hidden' : '')}>
    <header className="cm-h">
      <button type="button" className="cm-person" disabled={!p.who} onClick={() => openPerson(p.who)} aria-label={p.who ? `${p.name}: their page` : p.name}>
        <span className="cm-av-bot"><Bot b={p.mine ? me : { colour: p.colour }} size={40} eyes="happy" /></span>
        <span className="cm-who"><b>{p.name}</b><span>{[stageLabel(p.stage), ago(p.at)].filter(Boolean).join(' · ')}</span></span>
      </button>
      <button className="cm-x" aria-label="More" onClick={more}><Icon name="more" /></button>
    </header>
    {p.hidden && <p className="pf-warn">Hidden after reports{admin ? ` (${p.reports})` : ''}.{admin && <button className="pf-link" onClick={async () => { const r = await call('/api/community/delete', { id: p.id, restore: true }); if (r) onChange({ ...p, hidden: false }) }}> Show it again</button>}</p>}
    {p.text && <p className="cm-text">{p.text}</p>}
    {p.session && <SessionCard s={p.session} />}
    {p.week && <WeekStrip week={p.week} />}
    {p.plan && <PlanCard p={p} onChange={onChange} />}
    <div className="cm-acts">
      {!p.mine && <button type="button" className={'cm-react' + (p.myReact ? ' on' : '')} aria-expanded={picking} aria-label={p.myReact ? 'Your reaction. Tap to change' : 'React'} onClick={() => setPicking(v => !v)}>
        {p.myReact ? <ReactIcon id={p.myReact} size={24} /> : <Icon name="heart" />}</button>}
      <button type="button" className="cm-cmt" onClick={() => { setOpen(true); focus() }} aria-label="Comment"><Icon name="chat" />{p.replies.length ? <small>{p.replies.length}</small> : null}</button>
      <ReactSummary reacts={p.reacts} total={p.cheers} />
    </div>
    {picking && <ReactBar mine={p.myReact} onPick={reactWith} />}
    {p.replies.length > 2 && !open && <button type="button" className="cm-viewall" onClick={() => setOpen(true)}>View all {p.replies.length} comments</button>}
    {shown.length > 0 && <div className="cm-replies">{shown.map(one)}</div>}
    {open && <div className="cm-add">
      {editing && <div className="cm-editing">Editing your comment <button type="button" onClick={() => { setEditing(null); setReply('') }} aria-label="Stop editing"><Icon name="xmark" /></button></div>}
      <div className="mb-row">
        <TextField ref={input} value={reply} maxLength={500} placeholder="Add a comment…" onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        <button type="button" className="cm-send" disabled={!reply.trim()} onClick={send}>{editing ? 'Save' : 'Post'}</button>
      </div>
    </div>}
  </article>
}

/** One member's page: bot, stage, the numbers, today, shared plans, and posts five at a time. */
function PersonSheet({ id, close }) {
  const [d, setD] = useState(null)
  const [shown, setShown] = useState(1)
  const [note, setNote] = useState('')
  const load = () => api('/api/community/person?id=' + encodeURIComponent(id)).then(setD).catch(() => setD({ error: true }))
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="pf-sub">Loading</p>
  if (d.error) return <p className="pf-sub">Could not open their page right now.</p>
  const b = d.person
  const plans = d.posts.filter(p => p.plan), posts = d.posts.filter(p => !p.plan)
  const tile = (n, label) => <div className="nb-tile"><b>{n}</b><span>{label}</span></div>
  const setPost = next => setD(x => ({ ...x, posts: x.posts.map(p => (p.id === next.id ? next : p)) }))
  const follow = async () => { const on = await toggleFollow(b); setD(x => ({ ...x, person: { ...x.person, followed: on, followers: x.person.followers + (on === b.followed ? 0 : on ? 1 : -1) } })) }
  // The answer shows here under the buttons, never as a toast over their name.
  const cheerThem = async () => {
    try { await post('/api/nearby/cheer', { id: b.id, kind: 'love' }); setNote(`Cheer sent to ${b.name}`) }
    catch (e) { setNote(e?.status === 429 ? 'One cheer at a time. Try again in a minute' : `Could not reach ${b.name} right now`) }
  }
  return <div className="cm-page">
    <button type="button" className="cm-x cm-page-x" aria-label="More" onClick={() => menuSheet({ title: b.name, sections: [{ items: [{ icon: 'xmark', danger: true, label: `Block ${b.name}`, onClick: () => { close(); hideBot(b) } }] }, { items: [{ icon: 'xmark', label: 'Cancel', onClick: () => {} }] }] })}><Icon name="more" /></button>
    <span className="nb-card-bot" dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], eyes: 'happy', pose: 'wave', act: b.training ? 'run' : null }) }} />
    <h3>{b.name}</h3>
    <p className="pf-sub">{[b.training ? 'Training now' : stageLabel(b.stage), `following ${b.following}`, `${b.followers} ${b.followers === 1 ? 'follower' : 'followers'}`].filter(Boolean).join(' · ')}</p>
    {/* Two buttons: Follow first (Cheer waits); once followed, a tick (tap to unfollow) and Cheer. */}
    <div className="cm-fc">
      {b.followed
        ? <button type="button" className="cm-tick" aria-label={`Following ${b.name}. Tap to unfollow`} onClick={() => confirmSheet({ title: `Unfollow ${b.name}?`, confirmText: 'Unfollow', danger: true, onConfirm: follow })}><Icon name="check" /></button>
        : <button type="button" className="cm-fbtn gold" onClick={follow}>{b.followsYou ? 'Follow back' : 'Follow'}</button>}
      <button type="button" className={'cm-fbtn' + (b.followed ? ' gold' : ' off')} disabled={!b.followed} onClick={cheerThem}><Icon name="sparkles" /> Cheer</button>
    </div>
    <p className="cm-fc-note" aria-live="polite">{note || (b.followed ? '' : 'Follow first, then cheer them on')}</p>
    {b.today && <SessionCard s={b.today} />}
    {b.stats && <div className="nb-tiles">{tile(b.stats.week, 'this week')}{tile(b.stats.ready + '%', 'PCT ready')}{tile(b.stats.streak, b.stats.streak === 1 ? 'week in a row' : 'weeks in a row')}</div>}
    {plans.length > 0 && <><div className="menu-sec">Shared plans</div>{plans.map(p => <PlanCard key={p.id} p={p} onChange={setPost} />)}</>}
    {posts.length > 0 && <><div className="menu-sec">Posts</div>
      {posts.slice(0, shown).map(p => <div key={p.id} className="cm-mini">{p.text && <p>{p.text}</p>}{p.session && <SessionCard s={p.session} />}<small>{p.cheers} cheers · {p.replies.length} replies · {ago(p.at)}</small></div>)}
      {posts.length > shown && <button type="button" className="pf-link" onClick={() => setShown(n => n + 5)}>Show more posts</button>}</>}
  </div>
}
export const openPerson = id => id && sheet(close => <PersonSheet id={id} close={close} />)

/** The admin's followers: everyone who follows you, newest first, NEW for this week. */
function FollowersSheet({ close }) {
  const [d, setD] = useState(null)
  useEffect(() => { api('/api/community/followers').then(setD).catch(() => setD({ error: true })) }, [])
  if (!d) return <p className="pf-sub">Loading</p>
  if (d.error) return <p className="pf-sub">Could not load your followers right now.</p>
  const setAuto = async on => { const r = await call('/api/community/followers/auto', { on }); if (r) setD(x => ({ ...x, auto: r.auto })) }
  const back = async f => { const on = await toggleFollow({ id: f.who, name: f.name, followed: f.followed }); setD(x => ({ ...x, people: x.people.map(y => (y.who === f.who ? { ...y, followed: on } : y)), following: x.following + (on === f.followed ? 0 : on ? 1 : -1) })) }
  const joined = iso => { if (!iso) return ''; const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000); return days < 1 ? 'Joined today' : days < 2 ? 'Joined yesterday' : 'Joined ' + new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) }
  return <div className="cm-folls">
    <h3>Followers</h3>
    {d.owner && <label className="cm-auto"><span><b>Follow new members automatically</b><small>Every sign-up, you follow back</small></span>
      <input type="checkbox" role="switch" checked={!!d.auto} onChange={e => setAuto(e.target.checked)} /></label>}
    <div className="cm-folls-n"><div><b>{d.count}</b><small>followers</small></div><div className="new"><b>+{d.thisWeek}</b><small>this week</small></div><div><b>{d.following}</b><small>you follow</small></div></div>
    <div className="menu-sec">Newest first</div>
    {!d.people.length ? <p className="pf-sub">Nobody yet. Everyone who signs up shows here.</p> : d.people.map(f => <div key={f.who} className="cm-bell-row">
      <button type="button" className="cm-bell-m" onClick={() => { close(); openPerson(f.who) }}><Bot b={f} size={38} /><span><b>{f.name}{f.isNew && <span className="cm-new">New</span>}</b><small>{joined(f.joined)}</small></span></button>
      {f.followed ? <span className="cm-on"><Icon name="check" /> Following</span> : <button type="button" className="cm-follow" onClick={() => back(f)}>Follow back</button>}
    </div>)}
    <p className="pf-sub">Only admins see this.</p>
  </div>
}

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
    <button type="button" className="cm-opt" onClick={() => { close(); shareWeekSheet() }}><span className="cm-opt-i" aria-hidden="true"><Icon name="calendar" /></span><span><b>Share my week</b><small>Your week as a card. Others can try it</small></span></button>
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
  const compose = () => sheet(close => <Compose close={close} onPosted={p => setPosts(prev => [p, ...(prev || [])])} />)
  const training = id => live.some(l => l.id === id && l.training)

  return <div className="narrow pf cm">
    <div className="calm-head cm-head">
      <h1>Community</h1>
      {user && <div className="cm-tools">
        <button type="button" className="cm-newpost" onClick={compose} aria-label="New post"><Icon name="plus" /></button>
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
            <button type="button" className="cm-bub" onClick={compose} aria-label="Share with the community">
              <span className="cm-ring"><Bot b={me} eyes="happy" /><i className="cm-plus" aria-hidden="true">+</i></span><small>You</small></button>
            {user.admin && <button type="button" className="cm-bub" onClick={() => sheet(close => <FollowersSheet close={close} />)} aria-label="Your followers">
              <span className="cm-ring cm-ring-f"><Icon name="person" /></span><small>Followers</small></button>}
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
          {posts?.length === 0 && <div className="card"><h3>{q ? 'Nothing found' : tab === 'following' ? 'Nobody you follow has posted yet' : 'Be the first'}</h3><p className="pf-sub">{tab === 'following' && !q ? 'Tap a name in Everyone to follow someone.' : 'Tap + Post to share where you are starting from.'}</p></div>}
          {posts?.map(p => <Post key={p.id} p={p} me={me} admin={!!user?.admin} openPerson={openPerson} onChange={next => update(p.id, next)} />)}
          {posts?.length > 0 && more && <Button onClick={() => load(posts.at(-1).at)}>Older posts</Button>}
        </>}
    {/* Small, at the foot of the screen above the tab bar, away from the posts. */}
    <p className="cm-foot">Seen by everyone on {BRAND.name} · Not affiliated with any police service · Report from a post's ⋯</p>
  </div>
}
