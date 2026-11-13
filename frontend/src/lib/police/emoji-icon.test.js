import { describe, it, expect } from 'vitest'
import { iconFor } from './emoji-icon.js'
import { ICON_NAMES } from '../../components/Icon.jsx'
import { STANDARDS } from './standards.js'
import { MEALS } from './meal-reminders.js'

describe('BadgeFit icons for old emoji', () => {
  it('maps the emoji BadgeFit stores onto real icons', () => {
    expect(iconFor('🏋️')).toBe('dumbbell')
    expect(iconFor('📣')).toBe('speaker')
    expect(iconFor('target')).toBe('target')
    for (const s of STANDARDS) expect(ICON_NAMES).toContain(iconFor(s.icon))
    for (const m of MEALS) expect(ICON_NAMES).toContain(iconFor(m.emoji))
  })
})
