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
