// Form cues Jarvis says before a set (BadgeFit): two short cues and the mistake that hurts
// joints or wastes the set, by movement pattern, matched from the exercise's name. General
// coaching, not medical advice; pain that is sharp or stays means stop and get it checked.
// First match wins, so the specific patterns come before the general ones.
const CUES = [
  [/push ?up/, ['Hands under shoulders, body one straight line.', 'Chest to fist height, lock out at the top.'], 'Do not let the hips sag: that is your lower back taking the load.'],
  [/incline.*(press|bench)|(press|bench).*incline/, ['Bench at about 30 degrees, shoulder blades pinned back.', 'Lower to the upper chest, elbows about 45 degrees from your body.'], 'Flared elbows put your shoulders at risk.'],
  [/bench press|chest press|floor press/, ['Shoulder blades squeezed together and down, feet planted.', 'Touch mid chest, press up and slightly back.'], 'Elbows flared to 90 degrees is how shoulders get sore. Keep them tucked about 45.'],
  [/dip/, ['Lean slightly forward, shoulders down away from your ears.', 'Go down until your upper arm is level, no deeper.'], 'Dropping too deep strains the front of the shoulder.'],
  [/fly|flye|pec deck/, ['Soft bend in the elbows, and keep it fixed.', 'Hug a big tree, squeeze at the top.'], 'Going too low with straight arms stretches the shoulder joint, not the chest.'],
  [/overhead press|shoulder press|military press|arnold/, ['Brace your abs and squeeze your glutes.', 'Press straight up, head through at the top.'], 'Leaning back turns it into a lower back exercise.'],
  [/lateral raise|side raise/, ['Lead with the elbows, slight bend in the arms.', 'Raise to shoulder height, no higher.'], 'Swinging the weight up takes it off the shoulders.'],
  [/deadlift|rdl|romanian|good morning/, ['Bar close to the legs, back flat, chest proud.', 'Push the floor away, hips and shoulders rise together.'], 'A rounded lower back is the big one to avoid. Lighter is fine.'],
  [/hip thrust|glute bridge/, ['Chin tucked, ribs down.', 'Drive through the heels, squeeze the glutes hard at the top.'], 'Arching the lower back at the top steals the work from your glutes.'],
  [/front squat|back squat|goblet squat|\bsquat|hack squat/, ['Brace like someone is about to punch your stomach.', 'Knees track over your toes, sit between your heels.'], 'Knees caving in is what hurts them. Push them out.'],
  [/leg press/, ['Feet shoulder width, lower back pressed into the pad.', 'Lower until your knees are at about 90 degrees.'], 'Do not lock the knees hard at the top, and do not let your hips lift off the seat.'],
  [/lunge|split squat|step ?up/, ['Long stride, torso tall.', 'Front knee over the middle of the foot, drive through the front heel.'], 'Front knee caving in strains it. Keep it in line with your toes.'],
  [/leg extension/, ['Pad just above the ankles, grip the handles.', 'Squeeze at the top for a second, lower slow.'], 'Kicking the weight up loads the knee joint. Control it.'],
  [/leg curl/, ['Hips pressed into the pad.', 'Curl all the way, lower slow.'], 'Lifting the hips off the pad takes it off the hamstrings.'],
  [/calf/, ['Full stretch at the bottom, pause.', 'Up onto the big toe, squeeze at the top.'], 'Bouncing does nothing. Slow and full range.'],
  [/pull ?up|chin ?up/, ['Start from a dead hang, shoulders down first.', 'Pull your elbows to your back pockets, chin over the bar.'], 'Kipping and half reps will not build the strength. Full range.'],
  [/pulldown/, ['Lean back slightly, chest up.', 'Pull to the upper chest, elbows down and back.'], 'Pulling behind the neck hurts shoulders. Always in front.'],
  [/\brow\b|rowing/, ['Flat back, brace your abs.', 'Pull to the belly button, squeeze the shoulder blades.'], 'Jerking the weight with your lower back is how it gets tweaked.'],
  [/face pull|reverse fly|rear delt/, ['Elbows high, pull to your forehead.', 'Squeeze the back of the shoulders.'], 'Too heavy and the traps take over. Go light, go slow.'],
  [/shrug/, ['Straight up to the ears, hold a second.', 'Arms long, no bending the elbows.'], 'Rolling the shoulders adds nothing and strains the neck.'],
  [/hammer curl|curl/, ['Elbows pinned to your sides.', 'Squeeze at the top, lower for a slow two seconds.'], 'Swinging with the back takes it off the arms and loads the spine.'],
  [/tricep|triceps|skull ?crusher|pushdown|pressdown|kickback/, ['Elbows stay still, only the forearms move.', 'Lock out fully and squeeze.'], 'Elbows drifting out takes it off the triceps and strains the elbow.'],
  [/farmer|carry/, ['Stand tall, shoulders back and down.', 'Short quick steps, crush the handles.'], 'Leaning to one side loads the spine unevenly.'],
  [/plank|bridge|hollow|dead bug/, ['Squeeze glutes and abs, breathe.', 'Head, hips and heels in one line.'], 'Hips sagging is your lower back holding you up. Reset.'],
  [/crunch|sit ?up|leg raise|ab /, ['Ribs to hips, exhale as you come up.', 'Control the way down.'], 'Pulling on your neck does not work the abs.'],
  [/jump|box/, ['Swing the arms, explode up.', 'Land soft and quiet, knees bent.'], 'Landing stiff legged jars the knees. Absorb it.'],
  [/swing/, ['Hinge at the hips, not a squat.', 'Snap the hips forward, the bell floats.'], 'Lifting with the arms or the back is how it goes wrong.'],
]

/** { cues: [two short lines], mistake } for an exercise name, or null. */
export function formCuesFor(name) {
  const n = ` ${String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  const hit = CUES.find(([re]) => re.test(n))
  return hit ? { cues: hit[1], mistake: hit[2] } : null
}

/** One spoken cue for set `setNo` (1-based): the cues take turns, and the mistake comes on set 1. */
export function cueLine(name, setNo = 1) {
  const c = formCuesFor(name)
  if (!c) return ''
  if (setNo <= 1) return `${c.cues[0]} ${c.mistake}`
  return c.cues[(setNo - 1) % c.cues.length]
}
