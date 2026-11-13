# Hayden as a bot: gear, levels and training together (plan, 13 November 2026)

For after the PCT. Sketches: https://claude.ai/artifact/GdnAEE3C1cm1UoXBu9j22b (private to the owner).

## The owner's decisions

- Hayden becomes an animated coach bot in place of the sparkles: a coach in a headset, not a cute
  pet, and an original character (nothing like Astro or any game character, no real police
  insignia).
- Everyone starts with the same Hayden. He earns gear as the member trains and passes things:
  for example the academy cap once the PCT is passed. Like outfits in Pokémon GO or Fortnite.
- Only the owner designs the gear. Cosmetic gear can later be sold in the app (bought once);
  gear for passing the PCT or the academy is earned only, never sold.
- People who train together (in each other's circle, see BADGEFIT_V1_2_CHEERS.md) can let their
  bots meet on Home: side by side while both train, a high-five when both are done. Opt in.
- He is the member's trainer, not a pet: no hunger, no sulking, a missed week gets a calm "back at
  it today".

## The bot

Navy body, gold trim, a dark visor with two gold eye lights and a mouth line, a headset with a mic
boom, a chest plate where badges go. Built from simple parts so gear snaps on (head, arm, chest).

States, nothing more: hello (wave on open), idle (blink), listening (eyes wide, lean in), talking
(mouth lights move with his voice), session done (fist up, eyes smile). Calmer with Reduce Motion;
a setting keeps the plain mark for anyone who prefers it.

## First gear ladder (sketch)

| Earned by | Gear |
|---|---|
| Start | Recruit (no gear) |
| 4 weeks trained | Sweatband |
| A standard passed | Whistle (one per standard) |
| Beep test goal beaten | Lightning bolt |
| PCT passed | Gold shield badge, shoulder stripes |
| Academy | Academy cap and medal (earned only) |

## How it would be built

- Art and animation in Rive (one file, state machine with the five states and gear layers),
  played in the app with the Rive web runtime. The owner or a designer makes the file; the app
  switches states (listening, talking, done) and turns gear layers on.
- Gear earned is worked out on the phone from what is already recorded (weeks trained, test
  results, the PCT date passed), stored as a list on the profile.
- Gear for sale later goes through Apple's in-app purchase, with the monetisation plan
  (BADGEFIT_MONETISATION.md).
- Bots meeting needs the circle from 1.2 first.

## Next step

Show the sketches (cute, in between, serious) to the owner's wife and a few applicants before
commissioning final art. Build after the PCT on 6 December 2026, alongside 1.2.
