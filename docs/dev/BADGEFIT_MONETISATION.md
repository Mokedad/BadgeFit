# BadgeFit monetisation: the idea, pinned (13 November 2026)

## Revised by the owner, 18 November 2026 (replaces "the owner's rules" below)

Still for after the PCT on 6 December 2026. Nothing here charges money yet.

- **Prep Pass**, not a free-for-all app and not a trainer marketplace first. The owner paid $99 for
  a Facebook plan that was a basic PDF, with a coach in Messenger who had no time for them: the
  "coach" is Hayden, built in, and the human part is Mentors (below).
- **Prices to test:** $19 once for the 12-week PCT block (the plan is 12 weeks), or $9.99 a month
  (for a test further off, and the Academy). Monthly over 12 weeks is about $30, so the $19 is the
  obvious pick. Apple's price points may make it $18.99 or $19.99. Call it a founding price, test
  it with a "Notify me" button before charging, and test a higher price too.
- **14 days free, no card (a reverse trial):** a new account gets everything for 14 days, then
  chooses. Free keeps the whole habit; the Pass is what makes the plan fit you.
- **Guest, Free, Pass:**
  - Guest (no account, can stay forever, asked to sign up at good moments, once each): the Simple
    plan, today's session and runs with Hayden, a grey Hayden, Community to read.
  - Free: the plan to your test date, saved on every phone, the ready ring and test days, your
    Hayden in your colour with gear, Community, 3 Hayden questions a week, moving a day and
    swapping an exercise.
  - Prep Pass: the plan changes every week to fit you, any session any day and your own plan
    (plan from a photo), the easy week before the test, the pace sound on runs, saying your sets
    out loud, unlimited Hayden, the pass guarantee (train 3 days a week, fail: next block free).
- **Pass days, earned by helping, never by training:** bring a buddy who finishes a week (+14 days
  each), an answer picked as best (+7 days); someone who passed and helps one person a month
  (a Mentor) keeps the Pass free. Only things another person confirms earn days. Training earns
  gear for your Hayden instead (cosmetic, so a typed-in score only cheats yourself).
- **Stages:** PCT prep (Prep Pass), Academy (the Pass carries on), On the job (Probationary
  Constable, then Constable: free as a Mentor). Shown as "On the job", never a rank, since officers
  often have rules about saying they are police online.
- **Before any real payment:** the licences below (exercise media, openGym code), Apple's paid apps
  agreement, banking and tax in App Store Connect.

Built so far (build 180): the ready ring, the surprise after a workout, My Hayden (colour and gear)
and the pace sound. Every member gets everything until payments go on; guests are asked to sign up
for the pace sound.

## The owner's earlier rules (13 November 2026)

Pinned by the owner for the step after the PCT on 6 December 2026 and the first release. Nothing
here is built. Superseded by the section above where they differ.

- The app stays free. No subscription and no one-time price for the app.
- Freemium with in-app purchases.
- Ads: later, not part of this.
- The main idea: a marketplace. Trainers sell their own plans inside BadgeFit, users buy a plan
  once, BadgeFit charges for the service (a cut of each sale). Like openGym with a personal
  trainer, except what the trainer sells is the programme. A user who sees someone training on a
  plan can buy it too. BadgeFit helps the trainer make the plan engaging (Hayden runs it).

## How it would work

1. A trainer builds a plan in BadgeFit ("8-week beep test fix", "Academy prep, 12 weeks").
2. A user finds it on the trainer's profile, or because someone in their circle trains on it, and
   buys it once.
3. Hayden coaches that plan day by day: cues, countdown, check-ins. That is the pitch to
   trainers: a PDF plan is abandoned in week two, a coached plan gets finished and recommended.
4. BadgeFit keeps a percentage.

## What decides whether it makes money

- **Apple's cut comes first.** A plan is a digital product, so on iPhone it goes through Apple's
  in-app purchase: 15% in the small-business programme, 30% above US$1M a year. A $30 plan
  leaves $25.50; at a 20% BadgeFit cut that is about $5 to BadgeFit and $20 to the trainer.
- **Two sides.** Trainers will not list without users, users will not come to an empty shop.
  Start as the only seller, open it to trainers once there are buyers.
- **Responsibility.** A plan that injures someone or promises a pass lands on BadgeFit: approve
  trainers, cap claims, have a refund rule.
- **Licences, first.** The code is a fork of openGym (AGPL) and the exercise animations are
  licensed to openGym only. Selling anything needs BadgeFit's own media licence and the original
  author's agreement on the code. Settle this before building any of it.
- **Running costs.** Hayden's AI answers and voice cost money per use: keep the daily cap, or
  sell top-ups.

## Recommended order

1. **BadgeFit's own premium plans**, bought once in-app, no marketplace: Academy fit (see
   BADGEFIT_LEVELS.md), a beep-test specialist block, "failed once, retest in 6 weeks".
2. **Trainer plans**, once there are a few hundred active users.
3. **One-off extras:** more Hayden AI questions, a plan built by Hayden around the member, a mock
   test day pack.

Left out: trainers messaging users one to one (a coaching platform, a much bigger product), and
ads for now.

## Open questions for the owner

- Who are the first three trainers, and does the owner know them?
- Own plans first, before opening it to others?
- Police applicants only (small, motivated, will pay) or wider fitness (huge, crowded)?

## Needs when built

Apple in-app purchase products and receipts checked on the server; a plan format a trainer can
publish and a buyer can install (the programme shape in lib/police/programme.js is the start);
trainer payouts (a payments provider that pays sellers, GST and invoices); a review step for
plans; terms for sellers and buyers.
