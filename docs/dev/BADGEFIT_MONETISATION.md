# BadgeFit monetisation: the idea, pinned (13 November 2026)

Pinned by the owner for the step after the PCT on 6 December 2026 and the first release. Nothing
here is built. Read this first when monetisation comes up again.

## The owner's rules

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
