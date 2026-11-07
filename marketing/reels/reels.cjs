// The reels: each is a list of slides rendered at 1080×1920 and cut into an MP4.
// sec: how long the slide stays up. img: an app screenshot from badgefit-site/img.
// Keep text short: a slide is read in about 2 seconds while scrolling.
module.exports = [
  {
    id: '01-six-standards',
    caption: 'The 6 police fitness standards you have to pass, and the numbers to hit. Save this and test yourself this week. Full 12-week plan: link in bio. #policefitness #policeapplicant #beeptest #nswpolice #policerecruit #fitnesstest',
    slides: [
      { kicker: 'Police applicant?', title: 'Can you pass all 6?', body: 'The physical test, in 20 seconds.', sec: 2.4 },
      { kicker: 'Standard 1', title: 'Handgrip', big: '30 kg', body: 'each hand. Academy wants 35.', sec: 2.2 },
      { kicker: 'Standard 2', title: 'Prone bridge', big: '90 s', body: 'Hips drop, clock stops.', sec: 2.2 },
      { kicker: 'Standard 3', title: 'Vertical jump', big: '30 cm', body: 'Reach to jump height.', sec: 2.2 },
      { kicker: 'Standard 4', title: 'Push-ups', big: '25', body: 'Strict form. One attempt.', sec: 2.2 },
      { kicker: 'Standard 5', title: 'Illinois agility', big: '≤ 20 s', body: 'From lying face down.', sec: 2.2 },
      { kicker: 'Standard 6', title: 'Beep test', big: '7.1', body: 'Train to 7.2+ so it feels easy.', sec: 2.4 },
      { kicker: 'Track every one', title: 'BadgeFit', body: 'Free 12-week plan. Link in bio.', img: 'tests.jpg', sec: 3.2 },
    ],
  },
  {
    id: '02-rep-range-rule',
    caption: 'The only progression rule you need: 3 [4-6] 8. Below the range, drop it. In the range, stay. Top of the range, add 2.5 kg next set. Write it down every week. #gymtips #progressiveoverload #policefitness #strengthtraining',
    slides: [
      { kicker: 'Stop guessing your weights', title: 'The rep range rule', sec: 2.4 },
      { kicker: 'Range: 4-6 reps', title: 'Got 3?', big: 'Move down', body: 'Drop the weight next set.', tone: 'down', sec: 2.4 },
      { kicker: 'Range: 4-6 reps', title: 'Got 4 or 5?', big: 'Stay', body: 'Same weight. Chase one more rep.', tone: 'stay', sec: 2.4 },
      { kicker: 'Range: 4-6 reps', title: 'Got 6 or more?', big: '+2.5 kg', body: 'You earned it. Load it up.', tone: 'up', sec: 2.4 },
      { kicker: 'Week 1 bench', title: '60 × 8 → 62.5 × 5 → 62.5 × 4', body: 'Week 2 starts at 62.5. Beat it.', sec: 3 },
      { kicker: 'The app does the maths', title: 'BadgeFit', body: 'Log the set. It tells you the next one.', img: 'reps.jpg', sec: 3.2 },
    ],
  },
  {
    id: '03-beep-test-week',
    caption: 'How I train for the beep test every week. Pass mark 7.1, but train to 7.2+ so test day is comfortable. Intervals, easy runs and 20 m shuttles. Plan in bio. #beeptest #policefitness #vo2max #runningtraining #policerecruit',
    slides: [
      { kicker: 'Beep test pass: 7.1', title: 'Train for 7.2+', body: 'So the pass feels easy.', sec: 2.4 },
      { kicker: 'Tuesday', title: 'VO2 max intervals', body: '4 × 4 min hard, 3 min easy.', sec: 2.4 },
      { kicker: 'Thursday', title: 'Easy zone 2 run', body: 'You can just hold a conversation.', sec: 2.4 },
      { kicker: 'Saturday', title: 'Beep focus', body: '400-300-200 m repeats or 20 m shuttles.', sec: 2.4 },
      { kicker: 'Every rep counts', title: 'Turn on the line,', body: 'not around it.', sec: 2.4 },
      { kicker: '12 weeks. 3 phases.', title: 'BadgeFit', body: 'Your plan, built into the app.', img: 'plan.jpg', sec: 3.2 },
    ],
  },
  {
    id: '04-jarvis',
    caption: 'Meet Jarvis, the AI coach that knows your test results and tells you exactly what to work on. "Every rep you press into that bar is you pressing into the life you want." #aicoach #policefitness #motivation #policeapplicant',
    slides: [
      { kicker: 'Your AI recruit coach', title: 'Meet Jarvis', sec: 2.4 },
      { kicker: '"What should I work on?"', title: 'Your push-ups:', big: '22 / 25', body: 'Three reps short. We fix that this week.', sec: 3 },
      { kicker: 'Jarvis', title: '"Every rep you press into that bar', body: 'is you pressing into the life you want."', sec: 3.4 },
      { kicker: 'Daily briefing, read aloud', title: 'BadgeFit', body: 'Train for the test. Earn the badge.', img: 'today.jpg', sec: 3.4 },
    ],
  },
]
