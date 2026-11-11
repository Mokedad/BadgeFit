# BadgeFit iPhone app: the plan

Goal: BadgeFit on the iPhone as a real app, installed through TestFlight and built in the cloud
(GitHub Actions' Mac runners), so no Mac is needed. Same code as the web app (`frontend/`), same
server (`app.badgefit.com.au`), same account and data on both.

## Already in the repo (from openGym)

- The Capacitor iPhone shell (`frontend/ios/`), with native plugins: RestAlertPlugin (speech,
  rest alerts), AppleHealthPlugin (write workouts, read heart rate and weight), LiveActivityPlugin,
  widgets and the Apple Watch app.
- `npm run build:mobile` (the mobile build) and `.github/workflows/ios.yml`, which already compiles
  the app on a GitHub Mac (unsigned, simulator only).
- Phone pairing to a self-hosted server: a paired phone is an ordinary signed-in profile.
- Hayden's native voice path: `lib/police/voice.js` calls `speakNative` (RestAlertPlugin.speak)
  first in the phone app.

## To do

1. **Brand it BadgeFit.** App name, bundle id (`au.com.badgefit.app`), icon and splash in navy and
   gold, the permission texts (Info.plist) reworded for BadgeFit.
2. **Point it at the server.** The app opens on `https://app.badgefit.com.au` with no pairing step.
3. **Sign in with Apple and Google in the app.** Today `views/Login.jsx` hides them on the phone
   (`MOBILE ? []`). Use ASWebAuthenticationSession (or the Capacitor Browser plugin) so the
   `/api/auth/*` flow returns to the app with a session. Apple sign-in is required by the App Store
   once Google is offered (guideline 4.8). Facebook is left out (see below). Password sign-in stays
   as a fallback.
4. **Hayden in the pocket during runs and walks.** Add the `audio` background mode, an audio
   session that mixes with and ducks other audio (Spotify dips, then comes back), and a native
   run-cue scheduler: the run's spoken cues and their times go to the plugin at Start, so they play
   with the screen locked even while the web view is asleep. Lock-screen controls (pause and end)
   through the media session.
5. **Apple Health on by default for BadgeFit** (asked once): runs, walks and gym sessions written,
   heart rate read back after a session.
6. **Signed build to TestFlight.** A new workflow (`ios-testflight.yml`): build with
   `npm run build:mobile`, archive, sign with an App Store Connect API key (GitHub secrets
   `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID`), upload to TestFlight. Started by
   hand (workflow_dispatch) so the free Mac minutes go further.

## What the owner provides

- An Apple Developer account (individual, about AUD 149 a year), approved.
- The Team ID, and an App Store Connect API key (App Manager role) saved as the GitHub secrets
  above. Never in chat, never in the repo.
- In App Store Connect: the app record for the bundle id, and the owner's Apple ID as a TestFlight
  internal tester.

## Decisions

- **Accounts:** sign-in is Apple, Google or a password, with no e-mail or SMS check. The server
  keeps the training data (workouts, plan, Hayden settings). Apple and Google only say who you
  are; they do not store anyone's training, so the server's database stays.
- **Facebook:** not for now. Apple and Google cover nearly every phone, and Facebook login means
  a Meta app review.
- **Updates:** one codebase. Web changes go live with `setup.sh` as now; the app picks up a change
  with a new TestFlight build (about 30 minutes, started from GitHub).
