# BadgeFit levels: from first session to the academy (plan, 13 November 2026)

The owner's idea: Hayden is a personal coach who wants you to pass, and when you do, he keeps
going. The app's "how much do you want" choice becomes a ladder of four levels instead of
Simple / Plus body / The lot.

| Level | Who it is for | What Hayden does |
|---|---|---|
| **Simple** | Guests and anyone new to training | The simple plan, short sessions, the common questions. No account needed. |
| **PCT** | Members with a test to pass | The full plan to the test date, the countdown, test days, runs with Hayden, gap by gap. |
| **Academy fit** | Members who have passed | Opens after the test: harder intervals, heavier lifting, longer runs, pack and circuit days, the standards recruits are held to in training. |
| **The lot** | Members who want everything | Academy fit plus the community (cheers), body tracking and every tool. |

## How someone moves up

- Simple to PCT: signing up and booking a test date (or choosing "I train regularly").
- PCT to Academy fit: after the test date, Hayden asks how it went. Passed: he says so, and offers
  the academy block. Not yet: he rebuilds the plan around the standards that were short, to the
  next test date.
- Academy fit to The lot: a choice, any time.

## What it needs

- An academy programme in `lib/police/programme.js` (a fourth phase set after the test weeks),
  with its own run formats and rep ranges, and unit tests beside it.
- The after-test conversation: `brief.afterTest` already exists; the opening already has words
  for it (`lib/police/hayden-opening.js`). Add "How did it go?" with Passed / Not yet.
- The intro's three choices renamed and re-pointed to the four levels (`components/BadgeFitIntro.jsx`),
  and guests held at Simple (already so).
- Academy standards need a source: which academy, which tests. To be given by the owner.

## Order

After the PCT on 6 December 2026, with the result of the owner's own test as the first run of
the "How did it go?" conversation.
