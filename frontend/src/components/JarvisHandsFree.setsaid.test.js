// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
vi.mock('../lib/police/voice.js', () => ({ say: async () => {}, isSpeaking: () => false, onSpeaking: () => () => {}, primeSpeech: () => {} }))
vi.mock('./jarvis-actions.js', () => ({ runCommand: async () => '' }))
const { isSetSaid } = await import('./JarvisHandsFree.jsx')

describe('a set said plainly, no name first', () => {
  it('takes a weight and reps', () => {
    for (const q of ['20kg, 10 reps', '20 kg 10 reps', 'twenty kilos ten reps', '20 by 10', '10 reps at 20 kg', '10 reps']) expect(isSetSaid(q)).toBe(true)
  })
  it('leaves everything else alone', () => {
    for (const q of ['I went to the shop for 10 minutes', 'see you at 10', 'how are you', '']) expect(isSetSaid(q)).toBe(false)
  })
})
