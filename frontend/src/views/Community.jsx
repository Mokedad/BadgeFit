// The BadgeFit community (api/community.js): one place for applicants, recruits and graduates.
// The people you follow stand at the top as their bots (a green ring while they train); under
// them one feed, Everyone, Following or Crew (the people testing on your date, components/Crew.jsx). A post is words, today's session, or a plan to follow.
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
import { ReactIcon, ReactBar, ReactSummary, REACTIONS, useTapHold } from '../components/Reactions.jsx'
import { buildBell } from '../lib/police/bell.js'
import SwipeAway from '../components/SwipeAway.jsx'
import { communityPost } from '../components/CommunityRules.jsx'
import { useCrew, CrewStrip } from '../components/Crew.jsx'
import '../police.css'

const toast = m => useUI.getState().toast(m)
const sheet = render => useUI.getState().openSheet(render)
const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body || {}) })
const call = async (path, body) => { try { return await (path === '/api/community/post' || path === '/api/community/reply' ? communityPost(path, body) : post(path, body)) } catch (e) { toast(e?.message || 'Something went wrong'); return null } }
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
  // Only the person who wrote a comment can delete it (not the post's author, not an admin).
  const canDelete = r.mine
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
    <CommentHeart r={r} onLike={onLike} />
  </div>
}

/** A comment's heart: a tap is Love, a hold opens the five. Your reaction shows in its place. */
function CommentHeart({ r, onLike }) {
  const [pick, setPick] = useState(false)
  const press = useTapHold(() => onLike(r, 'love'), () => setPick(true))
  // The heart has its own tap and hold: they stop here, not at the comment's hold menu.
  return <div className="cm-like-w" onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()}>
    <button type="button" className={'cm-like' + (r.liked ? ' on' : '')} aria-pressed={!!r.liked} aria-label={r.liked ? 'Your reaction. Tap to take it off, hold for more' : 'Love. Hold for more'} {...press}>
      {r.myReact && r.myReact !== 'love' ? <ReactIcon id={r.myReact} size={20} /> : <Icon name="heart" />}{r.likes ? <small>{r.likes}</small> : null}
    </button>
    {pick && <div className="cm-like-pick" onClick={e => e.stopPropagation()}><ReactBar mine={r.myReact} onPick={k => { setPick(false); onLike(r, k) }} /><button type="button" className="cm-like-x" aria-label="Close" onClick={() => setPick(false)} /></div>}
  </div>
}

function Post({ p, onChange, admin, openPerson, me }) {
  const [reply, setReply] = useState('')
  const [editing, setEditing] = useState(null)
  const [answering, setAnswering] = useState(null)
  const [open, setOpen] = useState(false)
  const input = useRef(null)
  const [picking, setPicking] = useState(false)
  const reactWith = async kind => { setPicking(false); const r = await call('/api/community/react', { id: p.id, kind }); if (r) onChange({ ...p, reacts: r.reacts, cheers: r.cheers, myReact: r.myReact, cheered: r.cheered }) }
  // A heart on a comment shows at once; the server's count follows.
  const like = async (c, kind = 'love') => {
    // Shown at once: the same kind again takes it off, another kind replaces it.
    const off = c.myReact === kind || (kind === 'love' && c.liked && !c.myReact)
    const flip = x => ({ ...x, liked: !off, myReact: off ? null : kind, likes: Math.max(0, (c.likes || 0) + (off ? -1 : c.liked ? 0 : 1)) })
    onChange({ ...p, replies: p.replies.map(x => (x.id === c.id ? flip(x) : x)) })
    const r = await call('/api/community/reply-like', { id: p.id, replyId: c.id, kind })
    if (r) onChange({ ...p, replies: p.replies.map(x => (x.id === c.id ? { ...x, likes: r.likes, liked: r.liked, myReact: r.myReact } : x)) })
  }
  const send = async () => {
    if (!reply.trim()) return
    if (editing) {
      const r = await call('/api/community/reply-edit', { id: p.id, replyId: editing, text: reply })
      if (r) { onChange({ ...p, replies: p.replies.map(x => (x.id === editing ? { ...x, text: r.reply.text, edited: true } : x)) }); setReply(''); setEditing(null) }
      return
    }
    const r = await call('/api/community/reply', { id: p.id, text: reply, ...(answering && reply.startsWith('@' + answering.name) && { to: answering.id }) })
    if (r) { onChange({ ...p, replies: [...p.replies, r.reply] }); setReply(''); setAnswering(null) }
  }
  const focus = () => setTimeout(() => input.current?.focus?.(), 50)
  const onReply = r => { setOpen(true); setEditing(null); setAnswering(r); setReply(`@${r.name} `); focus() }
  const onEdit = r => { setOpen(true); setEditing(r.id); setAnswering(null); setReply(r.text); focus() }
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
  // Comments stay folded until you open them (just for you, on this phone).
  const shown = open ? p.replies : []
  const one = r => <Comment key={r.id} r={r} p={p} admin={admin} openPerson={openPerson} onReply={onReply} onEdit={onEdit} onDelete={del} onBest={best} onLike={like} />
  // Instagram style: each answer sits under the comment it answers, a step in.
  const ids = new Set(shown.map(r => r.id))
  const tops = shown.filter(r => !r.to || !ids.has(r.to))
  const thread = r => [one(r), ...shown.filter(x => x.to === r.id).map(x => <div key={x.id} className="cm-sub">{one(x)}</div>)]
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
    {p.replies.length > 0 && !open && <button type="button" className="cm-viewall" onClick={() => setOpen(true)}>View {p.replies.length === 1 ? '1 comment' : `all ${p.replies.length} comments`}</button>}
    {open && p.replies.length > 0 && <button type="button" className="cm-viewall" onClick={() => setOpen(false)}>Hide comments</button>}
    {shown.length > 0 && <div className="cm-replies">{tops.flatMap(thread)}</div>}
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
  const [pops, setPops] = useState([])
  const [jump, setJump] = useState(0)
  const load = () => api('/api/community/person?id=' + encodeURIComponent(id)).then(setD).catch(() => setD({ error: true }))
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <p className="pf-sub">Loading</p>
  if (d.error) return <p className="pf-sub">Could not open their page right now.</p>
  const b = d.person
  const plans = d.posts.filter(p => p.plan), posts = d.posts.filter(p => !p.plan)
  const setPost = next => setD(x => ({ ...x, posts: x.posts.map(p => (p.id === next.id ? next : p)) }))
  const follow = async () => { const on = await toggleFollow(b); setD(x => ({ ...x, person: { ...x.person, followed: on, followers: x.person.followers + (on === b.followed ? 0 : on ? 1 : -1) } })) }
  // The answer shows here under the buttons, never as a toast over their name.
  // Each tap pops the reaction up out of its button and makes their Hayden jump: sent.
  const pop = (kind, i) => {
    const key = Date.now() + Math.random()
    setPops(list => [...list.slice(-6), { key, kind, i }])
    setJump(n => n + 1)
    setTimeout(() => setPops(list => list.filter(x => x.key !== key)), 1100)
    try { navigator.vibrate?.(8) } catch { /* none */ }
  }
  const cheerThem = async (kind = 'love', i = 0) => {
    pop(kind, i)
    // The pop says it was sent; no words for it.
    try { await post('/api/nearby/cheer', { id: b.id, kind }); setNote('') }
    catch (e) { if (e?.status !== 429) setNote(`Could not reach ${b.name} right now`) }
  }
  return <div className="cm-page">
    <button type="button" className="cm-x cm-page-x" aria-label="More" onClick={() => menuSheet({ title: b.name, sections: [{ items: [{ icon: 'xmark', danger: true, label: `Block ${b.name}`, onClick: () => { close(); hideBot(b) } }] }, { items: [{ icon: 'xmark', label: 'Cancel', onClick: () => {} }] }] })}><Icon name="more" /></button>
    <span key={'j' + jump} className={'nb-card-bot' + (jump ? ' cm-jump' : '')} dangerouslySetInnerHTML={{ __html: botSvg({ line: b.colour, gear: b.gear || [], eyes: 'happy', pose: jump ? 'cheer' : 'wave', act: b.training ? 'run' : null }) }} />
    <h3>{b.name}</h3>
    {/* Only chips that say something: no zero tiles. */}
    <div className="cm-chips">
      {b.training && <span className="live"><Icon name="figureRun" /> Training now</span>}
      {stageLabel(b.stage) && <span>{stageLabel(b.stage)}</span>}
      {b.stats?.streak > 0 && <span><Icon name="flame" /> {b.stats.streak} wk streak</span>}
      {b.stats?.week > 0 && <span>{b.stats.week} this week</span>}
    </div>
    {/* Two buttons: Follow first (Cheer waits); once followed, a tick (tap to unfollow) and Cheer. */}
    <div className="cm-fc">
      {b.followed
        ? <button type="button" className="cm-tick" aria-label={`Following ${b.name}. Tap to unfollow`} onClick={() => confirmSheet({ title: `Unfollow ${b.name}?`, confirmText: 'Unfollow', danger: true, onConfirm: follow })}><Icon name="check" /></button>
        : <button type="button" className="cm-fbtn gold" onClick={follow}>{b.followsYou ? 'Follow back' : 'Follow'}</button>}
      {b.followed && <div className="cm-fc-rx" role="group" aria-label={`React to ${b.name}`}>
        {REACTIONS.map((x, i) => <button key={x.id} type="button" aria-label={x.label} onClick={() => cheerThem(x.id, i)}><ReactIcon id={x.id} size={38} /></button>)}
        {pops.map(p2 => <span key={p2.key} className="cm-pop" style={{ left: `calc(${(p2.i + 0.5) * 20}% - 19px)` }} aria-hidden="true"><ReactIcon id={p2.kind} size={38} /></span>)}
      </div>}
    </div>
    <p className="cm-fc-note" aria-live="polite">{note}</p>
    {b.today && <SessionCard s={b.today} />}
    {/* Their last post on one line; more on a tap. */}
    {posts.slice(0, shown).map((p, i) => <div key={p.id} className="cm-last"><Icon name="chat" /><span><b>{p.text || p.session?.title || (p.week ? p.week.label : 'Shared their week')}</b><small>{i === 0 ? 'Last post · ' : ''}{ago(p.at)}</small></span></div>)}
    {posts.length > shown && <button type="button" className="pf-link" onClick={() => setShown(n => n + 5)}>More posts</button>}
    {plans.length > 0 && <><div className="menu-sec">Shared plans</div>{plans.map(p => <PlanCard key={p.id} p={p} onChange={setPost} />)}</>}
    <p className="cm-fcount">{b.following} following · {b.followers} {b.followers === 1 ? 'follower' : 'followers'}</p>
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

/** The owner's numbers (admins): are testers coming back? Plain tiles, then what they said. */
function NumbersSheet() {
  const [d, setD] = useState(null)
  useEffect(() => { api('/api/admin/stats').then(setD).catch(() => setD({ error: true })) }, [])
  if (!d) return <p className="pf-sub">Loading</p>
  if (d.error) return <p className="pf-sub">Could not load the numbers right now.</p>
  const tile = (n, label, good) => <div className={good ? 'good' : ''}><b>{n}</b><small>{label}</small></div>
  const back = d.weekTwo.joined ? `${d.weekTwo.cameBack} of ${d.weekTwo.joined}` : '–'
  return <div className="cm-nums">
    <h3>Your numbers</h3>
    <p className="pf-sub">The one that matters: testers training twice a week.</p>
    <div className="cm-nums-g">
      {tile(d.testers, 'testers')}{tile('+' + d.newThisWeek, 'new this week', d.newThisWeek > 0)}{tile(d.trainedThisWeek, 'trained this week')}
      {tile(d.trainedTwice, 'trained 2+ times', d.trainedTwice > 0)}{tile(back, 'back in week 2')}{tile(d.sessionsThisWeek, 'sessions')}
    </div>
    <div className="menu-sec">Community this week</div>
    <div className="cm-nums-r"><span><Icon name="chat" /> {d.community.posts} posts</span><span>{d.community.comments} comments</span><span><Icon name="heart" /> {d.community.reacted}</span><span><Icon name="calendar" /> {d.community.sharedWeeks} weeks shared</span></div>
    <div className="menu-sec">What nearly made them stop</div>
    {!d.answers.length ? <p className="pf-sub">No answers yet. Hayden asks each tester a week after they start.</p>
      : d.answers.map((a, i) => <div key={i} className="cm-nums-a"><p>{a.text}</p><small>{a.name} · {ago(Date.parse(a.at))}</small></div>)}
  </div>
}

/** The bell: every cheer, reply and follow lately, newest first, each with Follow back. */
/** The bell from anywhere (Home's top row too): the same sheet as Community's bell. */
export const openBell = () => useUI.getState().openSheet(close => <BellSheet close={close} />)

function BellSheet({ close }) {
  const [list, setList] = useState(null)
  useEffect(() => { api('/api/cheers/history').then(r => setList(r?.cheers || [])).catch(() => setList([])) }, [])
  const back = async c => { const on = await toggleFollow({ id: c.who, name: c.from, followed: false }); if (on) setList(l => l.map(x => (x.who === c.who ? { ...x, followed: true } : x))) }
  // Blocked by mistake? They are listed here to unblock (then follow again from their page).
  const [blocked, setBlocked] = useState(null)
  const showBlocked = () => api('/api/nearby/hidden').then(r => setBlocked(r?.people || [])).catch(() => setBlocked([]))
  const unblock = async b => { if (await call('/api/nearby/unhide', { id: b.id })) { setBlocked(l => l.filter(x => x.id !== b.id)); toast(`${b.name} unblocked. Follow them again from their page.`) } }
  // Instagram's way (lib/police/bell.js): Featured, then Today, This week, Earlier.
  const bell = buildBell(list || [])
  const go = who => { if (who) { close(); openPerson(who) } }
  const what = c => (c.what || '').replace(/^your (post|comment|win|question): .*/, 'your $1')
  const row = c => {
    if (c.kind === 'follows') return <div key={c.id} className="cm-bell-row">
      <button type="button" className="cm-bell-m" onClick={() => go(c.people[0].who)}>
        <span className="cm-bell-av">{c.people.slice(0, 2).map(x => <Bot key={x.id} b={x} size={30} />)}</span>
        <span><b>{c.people.slice(0, 2).map(x => x.from).join(', ')}</b>{c.people.length > 2 ? ` and ${c.people.length - 2} others` : ''} followed you <small>· {ago(c.at)}</small></span>
      </button>
    </div>
    return <div key={c.id} className="cm-bell-row">
      <button type="button" className="cm-bell-m" onClick={() => go(c.who)}>
        <Bot b={c} size={40} eyes="happy" />
        {c.kinds
          ? <span><b>{c.from}</b><span className="cm-bell-rx">{c.kinds.slice(0, 4).map(k => <ReactIcon key={k} id={k} size={20} />)}</span>{c.n > 1 ? <> ×{c.n}</> : what(c) ? <> {what(c)}</> : null} <small>· {ago(c.at)}</small></span>
          : c.kind === 'reply' ? <span><b>{c.from}</b> replied{c.what ? `: ${c.what.replace(/^your (post|comment|win|question):\s*/, '')}` : ''} <small>· {ago(c.at)}</small></span>
            : <span>{cheerLine(c)} <small>· {ago(c.at)}</small></span>}
      </button>
      {c.who && !c.followed && c.kind === 'follow' && <button type="button" className="cm-follow" onClick={() => back(c)}>Follow back</button>}
    </div>
  }
  const f = bell.featured
  return <div className="cm-bell">
    <h3>Bell</h3>
    {list == null ? <p className="pf-sub">Loading</p> : !list.length ? <p className="pf-sub">Nothing yet.</p> : <>
      {f && <><div className="cm-bell-sec">Featured</div>
        <div className="cm-bell-row cm-bell-f">
          <button type="button" className="cm-bell-m" onClick={() => { close(); window.location.hash = '#/community' }}>
            <span className="cm-bell-av">{f.people.slice(0, 2).map(x => <Bot key={x.who} b={x} size={30} />)}</span>
            <span><b>{f.people.slice(0, 2).map(x => x.from).join(', ')}</b>{f.people.length > 2 ? ` and ${f.people.length - 2} others` : ''} reacted to {what(f)}<span className="cm-bell-rx">{f.kinds.slice(0, 4).map(k => <ReactIcon key={k} id={k} size={20} />)}</span>
              <small className="cm-bell-q">{f.what.replace(/^your (post|comment|win|question):\s*/, '')}</small></span>
          </button>
        </div></>}
      {bell.sections.map(sec => <div key={sec.title}><div className="cm-bell-sec">{sec.title}</div>{sec.rows.map(row)}</div>)}
    </>}
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

/** Send a reaction through someone's Hayden: it floats up their screen if they are training. */
async function sendReact(b, kind = 'love') {
  try { await post('/api/nearby/cheer', { id: b.id, kind }) }
  catch (e) { if (e?.status !== 429) toast(`Could not reach ${b.name} right now`) }
}

/** Someone you follow, at the top. Training now: tap sends Love, hold picks one of the five.
 *  Not training: tap opens their page, hold still picks one. */
function PersonBubble({ b, live, onPick }) {
  const [burst, setBurst] = useState(0)
  const press = useTapHold(() => { if (live) { sendReact(b, 'love'); setBurst(n => n + 1) } else openPerson(b.id) }, () => onPick({ ...b, live }))
  return <button type="button" className={'cm-bub' + (live ? ' live' : '')} aria-label={`${b.name}${live ? ', training now. Tap to send love, hold for more' : '. Hold to react'}`} {...press}>
    <span className="cm-ring"><Bot b={b} eyes={live ? 'determined' : 'open'} />{burst > 0 && <span key={burst} className="cm-burst" aria-hidden="true"><ReactIcon id="love" size={26} /></span>}</span>
    <small>{b.name}</small>{live && <em>Training</em>}</button>
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
  // The crew sheet's "Crew posts" opens straight on the Crew feed (components/Crew.jsx).
  const [tab, setTab] = useState(() => { try { const t = sessionStorage.getItem('cm_tab'); sessionStorage.removeItem('cm_tab'); return t === 'crew' ? 'crew' : 'all' } catch { return 'all' } })
  const [area, setArea] = useState(null)
  const [searching, setSearching] = useState(false)
  const [q, setQ] = useState('')
  const [pickFor, setPickFor] = useState(null)

  const load = async before => {
    try {
      const qs = [before && 'before=' + before, tab === 'following' && 'following=1', tab === 'crew' && 'crew=1', area && 'area=' + area, q.trim() && 'q=' + encodeURIComponent(q.trim())].filter(Boolean).join('&')
      const r = await api('/api/community' + (qs ? '?' + qs : ''))
      setPosts(prev => (before ? [...(prev || []), ...r.posts] : r.posts))
      setMore(r.posts.length >= 50)
      setError(null)
    } catch (e) { setError(e.status === 401 ? 'signin' : e.message || 'offline') }
  }
  // Typing in the search waits a moment before asking.
  useEffect(() => { if (!user) return; const t = setTimeout(() => { setPosts(null); load() }, q ? 350 : 0); return () => clearTimeout(t) }, [user, tab, area, q]) // eslint-disable-line react-hooks/exhaustive-deps
  // The crew (components/Crew.jsx): its own feed here, the same people as Home's strip.
  const crewN = useCrew(c => (c.off || !c.test ? 0 : c.crew.length))
  useEffect(() => { if (user && !useCrew.getState().test) api('/api/crew').then(r => r && useCrew.setState({ test: r.test, off: !!r.off, crew: r.crew || [], at: Date.now() })).catch(() => {}) }, [user])
  useEffect(() => { if (tab === 'crew' && !crewN) setTab('all') }, [tab, crewN])
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
            {user.admin && <button type="button" className="cm-bub" onClick={() => sheet(() => <NumbersSheet />)} aria-label="Your numbers">
              <span className="cm-ring cm-ring-f"><Icon name="chart" /></span><small>Numbers</small></button>}
            {people.map(b => <PersonBubble key={b.id} b={b} live={b.training || training(b.id)} onPick={setPickFor} />)}
          </div>
          {pickFor && <SwipeAway key={pickFor.id} className="cm-bub-pick" label="Close" onAway={() => setPickFor(null)}><b>{pickFor.name}{pickFor.live ? ' is training. Send them' : ''}</b><ReactBar onPick={k => { const x = pickFor; setPickFor(null); sendReact(x, k) }} /></SwipeAway>}
          <div className="cm-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>Everyone</button>
            <button role="tab" aria-selected={tab === 'following'} className={tab === 'following' ? 'on' : ''} onClick={() => setTab('following')}>Following</button>
            {crewN > 0 && <button role="tab" aria-selected={tab === 'crew'} className={tab === 'crew' ? 'on' : ''} onClick={() => setTab('crew')}>Crew <span className="cm-tab-n">{crewN + 1}</span></button>}
            {area && <button className="cm-tab-area" onClick={() => setArea(null)}>{AREAS.find(a => a.id === area)?.label} <Icon name="xmark" /></button>}
          </div>
          {tab === 'crew' && <CrewStrip />}
          {error && <p className="pf-warn pf-pad">Could not load the feed: {error}</p>}
          {posts === null && !error && <p className="pf-sub pf-pad">Loading</p>}
          {posts?.length === 0 && <div className="card"><h3>{q ? 'Nothing found' : tab === 'following' ? 'Nobody you follow has posted yet' : tab === 'crew' ? 'Your crew is quiet' : 'Be the first'}</h3><p className="pf-sub">{tab === 'following' && !q ? 'Tap a name in Everyone to follow someone.' : tab === 'crew' ? 'Same test date, same goal. Tap + to say hi.' : 'Tap + Post to share where you are starting from.'}</p></div>}
          {posts?.map(p => <Post key={p.id} p={p} me={me} admin={!!user?.admin} openPerson={openPerson} onChange={next => update(p.id, next)} />)}
          {posts?.length > 0 && more && <Button onClick={() => load(posts.at(-1).at)}>Older posts</Button>}
        </>}
    {/* Small, at the foot of the screen above the tab bar, away from the posts. */}
    <p className="cm-foot">Public · Not affiliated with any police service · Report via ⋯</p>
  </div>
}
