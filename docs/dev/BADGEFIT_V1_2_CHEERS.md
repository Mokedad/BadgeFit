# BadgeFit 1.2: live cheers (after the PCT on 6 December 2026)

The idea, in the owner's words: see at the top that someone is training ("Moke · Running"), tap
and hold it, say something, and Hayden says it to them. Family and friends cheering you on in
your ear while you run or lift.

## What it is

- **Training now**: a row of bubbles at the top of Home, one per person in your circle who is in
  a run, a walk or a gym session right now ("Moke · Running · 12 min"). A bubble appears at Start
  and goes when the session ends.
- **Send a cheer**: tap and hold a bubble, then type or say a short message, or record a few
  seconds of your own voice.
- **Hear it**: a typed or spoken message is read out by Hayden ("Message from Sarah: you've got
  this"); a recording plays as it is. Either waits for a gap between Hayden's own cues, never
  over a step change or a countdown.
- **In every mode, Simple included**: cheers are heard during a run, a walk or a gym session
  whichever "how much app" was chosen. Simple hides the community screens, not the voices: the
  cheer arrives through Hayden, with nothing extra on the screen.
- **Mute**: a button on the run and workout screens blocks incoming cheers for that session, and
  a setting keeps them off by default.

## Rules that keep it safe

- Only people you approved see that you are training or can cheer you (a circle joined by invite
  link). Never public.
- You choose what is shared: just "Running" / "Gym", or the session name and time as well.
- Limits: message length, recording length (about 10 s), and cheers per person per session.
- Block and report, for when circles grow beyond family.
- Family without accounts: a family link that opens only the cheer page (no sign-up), tied to one
  member, revocable.

## What it needs

- Server: a "training now" presence list (start, heartbeat, end) and a cheer inbox per member;
  recordings stored briefly and deleted after they play or after a day. New routes in
  `api/server.js` with their `openapi.yaml` entries.
- Web: the bubbles on Home, the send sheet, playback in `RunPlayer` and `JarvisWorkout`, the mute
  switch. On the web, cheers only play while BadgeFit is open on screen.
- iPhone app: cheers arrive by push and play with the phone locked, through the same background
  audio as Hayden's run cues (see BADGEFIT_IPHONE_PLAN.md, step 4).

## Order

After the iPhone app is on TestFlight and the PCT is done. Roughly 3 to 4 days of work.

## After 1.2 (idea for 1.3): Instagram on the bubble

- A member adds their Instagram name to their profile; their bubble and profile show it, and a
  tap opens their Instagram. Just a link the member types: no Instagram login, so no Meta app
  review and nothing of theirs is read.
- A share card after a run or a session (distance, time, the route, the BadgeFit shield), sized
  for an Instagram story, sent through the phone's own share sheet.
- Off by default; only people in the member's circle see the name.

## Received tick (added 13 November 2026)

- The person training can answer a cheer without stopping: a ✓ on the run or workout screen while
  the cheer shows (one tap, big enough for a moving thumb), or just saying "thanks Hayden".
- The sender sees their message go from "Sent" to "Heard ✓" (and "Thanks ✓" when the tick was
  tapped), so they know it landed. Nothing else is sent back mid-session.
- A cheer that arrived while muted is marked "Delivered after the session" when it is shown at
  the end.

## Who sees whom: the circle (added 13 November 2026)

The owner's rule: people follow people they know or know of, never strangers. So there is no
list of everyone training, and nobody can be found by browsing.

- **Your circle** is the only place bubbles come from. Someone is in it only after a follow
  request was accepted. Nobody outside it can see that you are training, where, or at all.
- **Three ways to find someone**, each of which needs something they gave you:
  1. An invite link or QR code from their profile ("Add me on BadgeFit"), sent by message or
     shown on their phone. Opening it sends the follow request.
  2. Their exact BadgeFit username, typed in. No partial search, no suggestions.
  3. Their Instagram: a member who has added their Instagram name can put their BadgeFit link in
     their Instagram bio or a story. BadgeFit does not read anyone's Instagram followers.
- **Requests are approved**: the person followed gets "Sarah wants to follow your training" and
  taps Accept or Decline. Accepting can be one-way (she sees me) or both ways.
- **Notification when someone starts**: each person in the circle has a bell. Bell on: a push
  notification "Moke started a run" the moment he taps Start, which opens the app on his
  bubble. Bell off: the bubble still shows on Home, with no notification. Default on for the
  first five people followed, off after that, so a big circle does not flood a phone.
- **Privacy switches**: "Show when I am training" (on or off, and per session from the Start
  screen), "Who can send me follow requests" (anyone with my link or username, or nobody), and
  remove or block a follower at any time.
- **Later, for people you know of** (a public figure, a coach): a member can mark their profile
  Public, which accepts followers without approval and shows no route or location. Off by
  default; not in 1.2.

## Decisions from the owner (13 November 2026, later)

- **Following is both ways, automatically.** One accepted request and each sees the other's
  bubble. No one-way follows in 1.2.
- **The dumbbell is the follow button.** Every profile shows a dumbbell: tap to send a follow
  request, tap again to unfollow. Grey: not following; outlined: requested; filled gold: in each
  other's circle.
- **The bell is the circle.** The bell on Home opens "My circle": everyone followed, those
  training now at the top with their bubble, the rest below with when they last trained. Each row
  has its own small bell for the "started training" notification.
- **The other person always has the last word.** On a request: Accept or Decline. On someone
  already in the circle: Mute (they stay, but their cheers and notifications are silent, and they
  are not told) or Remove. Block stops further requests.

## What BadgeFit takes from Strava and Runna, and what it leaves

BadgeFit is live and private: it is about the session happening now, with people you know.
Strava and Runna are a feed of finished sessions for an audience. So no feed, no maps, no photos.

Taken:
- **Kudos, as a cheer or a ✓.** One tap on a finished session in the circle: "Good work". No
  comments thread.
- **The session card, without the map.** After a session the circle sees a small card: what it
  was (Hill repeats), how long, and one number that matters (distance, or sets done). Never a
  route, never a start or finish place.
- **Streaks and the week.** "4 of 5 sessions this week" on a profile, like Runna's plan
  progress: it shows commitment, not location.
- **A shared goal.** "23 days to the PCT" on a profile, and a circle that trains for the same
  test date sees each other's readiness percent (opt in).
- **Clubs, later.** A recruit intake or a gym as a closed group joined by code: the same circle
  rules, for a class of people who know of each other.

Left out on purpose:
- Maps, routes, segments and leaderboards (location, and strangers competing).
- Photos and a scrolling feed (an audience, not a training partner).
- Public profiles by default and "people you may know" suggestions.

Connecting accounts: a member may link Strava to send a finished run there (one way out, the
route only if they choose). Nothing is read from Strava or Instagram into BadgeFit.
