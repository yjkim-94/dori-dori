import { describe, it, expect } from 'vitest'
import { createEnemy } from '../src/game/Enemy'

describe('Enemy', () => {
  it('normal enemy has hp 1 and score 10', () => {
    const e = createEnemy('normal', 100, 800)
    expect(e.hp).toBe(1)
    expect(e.scoreValue).toBe(10)
    expect(e.alive).toBe(true)
  })

  it('heavy enemy has hp 2 and score 25', () => {
    const e = createEnemy('heavy', 100, 800)
    expect(e.hp).toBe(2)
    expect(e.scoreValue).toBe(25)
  })

  it('boss enemy has hp 3 and score 50', () => {
    const e = createEnemy('boss', 100, 800)
    expect(e.hp).toBe(3)
    expect(e.scoreValue).toBe(50)
  })

  it('takeDamage reduces hp', () => {
    const e = createEnemy('heavy', 100, 800)
    const dead = e.takeDamage(1)
    expect(dead).toBe(false)
    expect(e.hp).toBe(1)
  })

  it('takeDamage returns true and sets alive=false when hp reaches 0', () => {
    const e = createEnemy('normal', 100, 800)
    const dead = e.takeDamage(1)
    expect(dead).toBe(true)
    expect(e.alive).toBe(false)
  })

  it('normal enemy moves down over time', () => {
    const e = createEnemy('normal', 100, 800)
    const initialY = e.y
    e.update(100)
    expect(e.y).toBeGreaterThan(initialY)
  })

  it('zigzag enemy oscillates horizontally', () => {
    const e = createEnemy('zigzag', 400, 800)
    const x0 = e.x
    e.update(300)
    const x1 = e.x
    e.update(300)
    const x2 = e.x
    expect(x0 !== x1 || x1 !== x2).toBe(true)
  })

  it('getBounds returns correct position', () => {
    const e = createEnemy('normal', 200, 800)
    const b = e.getBounds()
    expect(b.x).toBe(e.x - e.width / 2)
    expect(b.y).toBe(e.y - e.height / 2)
    expect(b.width).toBeGreaterThan(0)
    expect(b.height).toBeGreaterThan(0)
  })
})
