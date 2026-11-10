// Police Prep: what running does to the body, and what to do about it. Running lands 2.5-3 times
// your body weight on every stride, so most runners meet some of these. General information,
// not a diagnosis: `see` says when it is time for a physio or doctor instead.
// The same knowledge is in api/coach/prompts/ask.md, so Hayden can answer about it.

export const RUN_CARE_INTRO =
  'Running lands 2.5 to 3 times your body weight on every stride. Some aches on the way are normal: they are signs your body is changing, like a caterpillar becoming a butterfly. Listen to them, adjust, and keep going.'

export const RUN_CARE = [
  {
    group: 'Overuse and biomechanical stress', items: [
      { id: 'shins', name: 'Shin splints', what: 'Dull, aching pain along the inside front of the lower leg.', why: 'Repeated stress on the muscles and bone lining around the shin: hard heel strikes, too much too soon, hard surfaces.', do: ['Cut running volume by a third for 1-2 weeks; swap a run for bike or rowing', 'Ice 10-15 min after runs', 'Calf raises and tibialis raises every day', 'Shorter, quicker steps; land under your hips'], see: 'Pain in one small spot on the bone, pain at rest or at night: get checked for a stress fracture.' },
      { id: 'plantar', name: 'Plantar fasciitis', what: 'Sharp, stabbing pain at the base of the heel, worst on the first steps out of bed.', why: 'Overloading the thick band of tissue under the arch.', do: ['Roll the arch on a frozen bottle, 5 min morning and night', 'Calf and arch stretches before getting out of bed', 'Supportive shoes, never barefoot on hard floors', 'Reduce hills and speed work until the morning pain settles'], see: 'Still there after 3-4 weeks of care.' },
      { id: 'achilles', name: 'Achilles tendinopathy', what: 'Stiffness, swelling and burning pain at the back of the ankle above the heel.', why: 'Overworked calves, aggressive hill repeats, or a fast switch to lower-drop shoes.', do: ['Pause hills and sprints', 'Slow heavy calf raises: 3 × 15, lowering for 3 seconds', 'Keep your usual shoe drop'], see: 'A sudden snap or a gap you can feel: stop and see a doctor the same day.' },
      { id: 'knee', name: "Runner's knee", what: 'Dull ache behind or around the kneecap, worse down stairs or downhill.', why: 'The kneecap tracking poorly, often from weak glutes and hip muscles or tight quads.', do: ['Glute bridges, side-lying leg raises and band walks 3 times a week', 'Foam roll the quads', 'Avoid long downhills for now', 'A slightly shorter stride'], see: 'Swelling, locking or the knee giving way.' },
      { id: 'itb', name: 'IT band syndrome', what: 'Sharp, stinging pain on the outer side of the knee.', why: 'Friction where the IT band crosses the outside of the knee, often weak hips.', do: ['Hip strength: side planks, clamshells, single-leg work', 'Foam roll the outer thigh and glute (not the knee itself)', 'Run on flat ground; change direction on a track'], see: 'Not easing after 2-3 weeks of lighter running.' },
    ],
  },
  {
    group: 'Feet and nails', items: [
      { id: 'toenails', name: 'Black toenails', what: 'Blood under the nail; the nail may fall off.', why: 'Toes hitting the front of the shoe again and again.', do: ['Go up half a size: a thumb width in front of the longest toe', 'Heel-lock lacing (use the extra top eyelet)', 'Keep nails short and straight'], see: 'Throbbing pain, pus or redness: possible infection.' },
      { id: 'calluses', name: 'Corns and calluses', what: 'Thick, hard skin over pressure points.', why: 'Repeated pressure from the shoe in one spot.', do: ['Shoes that fit the shape of your foot', 'File gently after a shower; moisturise', 'Padding over the hot spot'], see: 'Painful corns, or if you have diabetes.' },
      { id: 'neuroma', name: "Morton's neuroma", what: 'Burning, tingling, like standing on a pebble between the 3rd and 4th toes.', why: 'A pinched nerve in a toe box that is too narrow.', do: ['Wider toe box shoes', 'Loosen the laces over the forefoot', 'A metatarsal pad behind the sore spot'], see: 'Numbness that stays, or pain that stops you running.' },
    ],
  },
  {
    group: 'Chafing', items: [
      { id: 'thigh', name: 'Inner thigh chafing', what: 'Raw, stinging skin between the thighs.', why: 'Skin on skin or wet fabric rubbing over distance.', do: ['Fitted compression shorts or liners', 'Anti-chafe balm before the run', 'Wash and dry well after'], see: 'Broken skin that gets red, hot or weeps.' },
      { id: 'nipple', name: 'Nipple chafing', what: 'Sore or bleeding nipples after longer runs.', why: 'A loose shirt rubbing in sweat.', do: ['A fitted technical top, never cotton', 'Tape or balm before long runs'], see: 'Rarely needed.' },
      { id: 'underarm', name: 'Underarm chafing', what: 'Raw skin under the arms.', why: 'Seams rubbing as the arms swing.', do: ['Seamless or flat-seam tops', 'Balm on the spot before running'], see: 'Rarely needed.' },
    ],
  },
  {
    group: 'Sudden muscle and joint injuries', items: [
      { id: 'strain', name: 'Calf or hamstring strain', what: 'A sudden sharp pull or pain in the muscle.', why: 'Sprinting or hill accelerations on muscles that were not warmed up or were tired.', do: ['Stop running straight away', 'First 2-3 days: protect, ice, compression, gentle walking if pain allows', 'Then easy stretching and light strength as pain settles', 'Always do the full warm-up before sprints and shuttles'], see: 'A pop, bruising, or you cannot walk normally.' },
      { id: 'ankle', name: 'Rolled ankle', what: 'Pain and swelling on the outside of the ankle.', why: 'Landing on a kerb, root or sloped road edge.', do: ['Rest, ice, compression and elevation for 48 hours', 'Balance work on one leg once you can walk', 'Return with flat, even surfaces'], see: 'You cannot take 4 steps, or the bone is tender: get an X-ray.' },
    ],
  },
  {
    group: 'Whole body', items: [
      { id: 'stitch', name: 'Side stitch', what: 'Sharp pain under the ribs.', why: 'Diaphragm spasm, fast breathing, or eating solid food too close to the run.', do: ['Slow down, breathe out hard as your opposite foot lands', 'Press into the sore spot and lean slightly forward', 'No solid meal in the 2 hours before running'], see: 'Chest pain, or pain spreading to the arm or jaw: stop and get urgent help.' },
      { id: 'gut', name: "Runner's trots", what: 'Cramping, urgent toilet stops or nausea while running.', why: 'Blood moves away from the gut to the legs, plus all the bouncing.', do: ['Low-fibre, low-fat food before runs (rice cakes, white bread)', 'Less caffeine and fewer sugar alcohols pre-run', 'Know your toilet stops on long routes'], see: 'Blood in your stool, or it keeps happening.' },
      { id: 'heat', name: 'Dehydration, low sodium and heat', what: 'Dizziness, cramps, headache, a big drop in pace.', why: 'Losing fluid and salt in heat, or drinking lots of plain water with no salt.', do: ['Drink to thirst; electrolytes on hot days and after sauna', 'Run early or late in summer', 'Weigh before and after: replace each kg lost with about 1.5 L'], see: 'Confusion, stopping sweating, vomiting, or fainting: emergency, call 000.' },
      { id: 'overtraining', name: 'Overtraining and fatigue', what: 'Heavy legs that do not recover, a higher resting heart rate, poor sleep, no progress.', why: 'More training load than your food and rest can repair.', do: ['Take an easy week: half the volume, no intervals', 'Eat enough, especially carbs around training', '8 hours of sleep', 'Track your morning resting heart rate'], see: 'Still exhausted after 2 easy weeks: get a blood test (iron, vitamin D).' },
    ],
  },
]

const ALL = RUN_CARE.flatMap(g => g.items)

/** Finds care topics by words in a question ("my shins hurt" → shin splints). */
const WORDS = {
  shins: ['shin'], plantar: ['heel', 'plantar', 'arch'], achilles: ['achilles', 'back of the ankle', 'back of my ankle'],
  knee: ['kneecap', 'knee cap', "runner's knee", 'front of my knee', 'knee'], itb: ['it band', 'itb', 'outside of my knee', 'outer knee'],
  toenails: ['toenail', 'black nail'], calluses: ['callus', 'corn'], neuroma: ['neuroma', 'pebble', 'tingling toes'],
  thigh: ['thigh', 'groin', 'chafe', 'chafing'], nipple: ['nipple'], underarm: ['underarm', 'armpit'],
  strain: ['calf', 'hamstring', 'pulled', 'strain'], ankle: ['rolled', 'sprain', 'ankle'],
  stitch: ['stitch', 'under my ribs'], gut: ['toilet', 'stomach', 'trots', 'nausea'],
  heat: ['dizzy', 'cramp', 'dehydrat', 'heat'], overtraining: ['tired', 'exhausted', 'heavy legs', 'overtrain', 'fatigue'],
}
export function findCare(text) {
  const t = String(text || '').toLowerCase()
  if (!t.trim()) return []
  return ALL.filter(it => (WORDS[it.id] || []).some(w => t.includes(w)) || t.includes(it.name.toLowerCase()))
}
