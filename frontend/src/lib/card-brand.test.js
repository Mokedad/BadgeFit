import { describe, it, expect, afterEach } from 'vitest'
import { drawBrand } from './card-draw.js'
import { setBrand } from './i18n-core.js'

const ctx = () => {
  const said = []
  const c = new Proxy({ said }, { get: (o, k) => (k in o ? o[k] : k === 'measureText' ? t => ({ width: t.length * 10 }) : k === 'fillText' ? t => said.push(t) : () => {}), set: () => true })
  return c
}
const colors = { label: '#fff', label2: '#999', acc: '#f2b81a', surface: '#1c1c1e' }
afterEach(() => setBrand(null))

describe('the brand at the foot of a shared card', () => {
  it('is BadgeFit in BadgeFit', () => {
    setBrand('BadgeFit')
    const c = ctx(); drawBrand(c, { x: 0, y: 100, width: 900, colors, family: 'x' })
    expect(c.said).toEqual(['Badge', 'Fit', 'badgefit.com.au'])
  })
  it('stays openGym elsewhere', () => {
    const c = ctx(); drawBrand(c, { x: 0, y: 100, width: 900, colors, family: 'x' })
    expect(c.said).toEqual(['open', 'Gym', 'opengym.ch'])
  })
})
