// After the test date has passed (BadgeFit): Hayden asks how it went, once, and the plan carries
// on for what comes next: the Academy, a re-test, or the member's own training. Pure.
import { planStart } from './programme.js'

export const AFTER_CHOICES = [
  { id: 'passed', icon: 'trophy', label: 'I passed', sub: 'Get ready for the Academy' },
  { id: 'retest', icon: 'repeat', label: 'Not yet', sub: 'Go again, stronger' },
  { id: 'own', icon: 'dumbbell', label: 'Just training', sub: 'Keep fit my own way' },
]

/** Whether to ask: a test date that has gone by, not yet answered for that date. */
export const needsAfterTest = (P, today) => !!P?.start && !!P?.testDate && P.testDate < today && P.afterAsked !== P.testDate

/**
 * The police patch for an answer. Each starts a fresh 12 weeks from now (the old test date is
 * cleared so the countdown stops; a new date can be set on the PCT page).
 *   passed: the goal is the Academy (the countdown and Hayden name it).
 *   retest: the same test again, date to be set.
 *   own:    no test, no countdown.
 */
export function afterPatch(choice, P, today) {
  const base = { afterAsked: P?.testDate, afterTest: choice, testDate: undefined, start: planStart(null, today), planV: 3 }
  if (choice === 'passed') return { ...base, testName: 'Academy', passedOn: P?.testDate }
  if (choice === 'own') return { ...base, testName: undefined }
  return base
}
