// What Hayden does when he is told to do something (BadgeFit Home's Hayden): "start", "let's go",
// "let's do my workout" start today's session at once; "show my plan" and "the test" open those
// pages. Anything else is a question (components/HaydenQuick.jsx). Pure.

const START = /\b(start|begin|let'?s go|lets go|let us go|go time|do (my|the|today'?s) (workout|session|training)|let'?s (do|train|work ?out|get (it|started|going))|start (my|the) (workout|session|run)|i'?m ready|ready to (go|train))\b/
// "I want to upload my own program", "upload my plan", "import my programme", "add my own workout plan".
const UPLOAD = /\b(upload|import|send|load|bring in|use|add|put in)\b.*\b(my|own|a|the|this)\b.*\b(program|programme|plan|routine|workouts?|training)\b|\b(my own|own) (program|programme|plan)\b/
const PLAN = /\b(show|open|see)\b.*\b(plan|week|schedule)\b|^(my )?(plan|week)$/
const TEST = /\b(show|open|see)\b.*\b(test|pct|standards)\b|^(the )?(test|pct)$/

/** 'upload' | 'start' | 'plan' | 'tests' | null for what was said (or tapped). */
export function haydenCommand(text) {
  const q = String(text || '').toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!q) return null
  // Uploading a program is asked for any way ("can I upload my program?" too).
  if (UPLOAD.test(q)) return 'upload'
  // A question about starting is a question ("when do I start running?"), not an order.
  if (/^(when|how|why|what|should|can|do i|is)\b/.test(q)) return null
  if (START.test(q)) return 'start'
  if (PLAN.test(q)) return 'plan'
  if (TEST.test(q)) return 'tests'
  return null
}
