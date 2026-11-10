// How a line is said, not how it is written (BadgeFit voice): Hayden's lines are written out in
// full ("Let us go", "That is the pass mark"), which a voice reads stiffly. Spoken, people use
// contractions, so the voice gets "Let's go", "That's the pass mark". Only what is heard changes;
// the screen keeps the written line. Pure.
const PAIRS = [
  [/\blet us\b/gi, "let's"], [/\bthat is\b/gi, "that's"], [/\bit is\b/gi, "it's"], [/\bwhat is\b/gi, "what's"],
  [/\bthere is\b/gi, "there's"], [/\bhere is\b/gi, "here's"], [/\byou are\b/gi, "you're"], [/\bwe are\b/gi, "we're"],
  [/\bthey are\b/gi, "they're"], [/\bi am\b/gi, "I'm"], [/\byou have\b(?! (?:to|a|an|the|\d))/gi, "you've"], [/\bi have\b(?! (?:to|a|an|the|\d))/gi, "I've"],
  [/\bdo not\b/gi, "don't"], [/\bdoes not\b/gi, "doesn't"], [/\bdid not\b/gi, "didn't"], [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"], [/\bwill not\b/gi, "won't"], [/\bis not\b/gi, "isn't"], [/\bare not\b/gi, "aren't"],
  [/\bwould not\b/gi, "wouldn't"], [/\byou will\b/gi, "you'll"], [/\bwe will\b/gi, "we'll"], [/\bi will\b/gi, "I'll"],
]
const keepCase = (from, to) => (from[0] === from[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to)

/** The line as Hayden says it. */
export function spoken(text) {
  let s = String(text || '')
  for (const [re, to] of PAIRS) s = s.replace(re, m => keepCase(m, to))
  return s
}
